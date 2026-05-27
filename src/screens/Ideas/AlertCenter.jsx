// AlertCenter.jsx — مركز التنبيهات الذكي
import { useState, useMemo } from "react";
import { S, fm, fp, fpm, TYPES } from "./constants.js";

function buildAlerts(products, periods) {
  const sorted = [...periods].sort((a,b) =>
    (a.uploadDate??a.label) > (b.uploadDate??b.label) ? 1 : -1
  );

  const alerts = [];

  products.forEach(p => {
    const monthly = sorted.map(per => ({
      label: per.label,
      qty: Object.values(per.sales??{}).reduce((s,b)=>s+Number(b[p.barcode]?.qty??0),0),
    }));

    const nonZero   = monthly.filter(m=>m.qty>0);
    const lastQ     = monthly[monthly.length-1]?.qty ?? 0;
    const prevQ     = monthly[monthly.length-2]?.qty ?? 0;
    const growth    = prevQ>0 ? ((lastQ-prevQ)/prevQ)*100 : 0;
    const avgSales  = nonZero.length>0 ? nonZero.reduce((s,m)=>s+m.qty,0)/nonZero.length : 0;
    const closing   = p.closing ?? 0;
    const frozenVal = closing * (p.buyPrice??0);
    const daysLeft  = avgSales>0 ? Math.round((closing/avgSales)*30) : 999;
    const margin    = p.buyPrice>0 ? ((p.sellPrice-p.buyPrice)/p.buyPrice)*100 : 0;

    // 🔴 نفد من المخزون
    if (closing === 0 && avgSales > 0) {
      alerts.push({ type:"empty", priority:"critical", icon:"🚨", color:"#e8855a",
        title:"نفد المخزون", product:p.name, barcode:p.barcode,
        message:`${p.name} نفد تماماً — أعد الطلب فوراً`,
        detail:`كان يُباع ${Math.round(avgSales)} وحدة/شهر`, action:"reorder" });
    }
    // 🔴 مخزون حرج (أقل من 14 يوم)
    else if (daysLeft <= 14 && closing > 0 && avgSales > 0) {
      alerts.push({ type:"lowstock", priority:"high", icon:"⚠️", color:"#e8855a",
        title:"مخزون حرج", product:p.name, barcode:p.barcode,
        message:`يكفي ${daysLeft} يوم فقط`,
        detail:`${fm(closing)} قطعة · معدل ${Math.round(avgSales)}/شهر`, action:"reorder" });
    }
    // 📈 صاعد قوي
    if (growth > 50 && lastQ > 0) {
      alerts.push({ type:"rising", priority:"high", icon:"📈", color:"#8aab8e",
        title:"صعود قوي", product:p.name, barcode:p.barcode,
        message:`ارتفع ${Math.round(growth)}% — ركّز عليه`,
        detail:`آخر فترة: ${fm(lastQ)} · السابقة: ${fm(prevQ)}`, action:"campaign" });
    }
    // 📉 هابط حاد
    if (growth < -40 && prevQ > 5) {
      alerts.push({ type:"falling", priority:"medium", icon:"📉", color:"#f59e0b",
        title:"هبوط حاد", product:p.name, barcode:p.barcode,
        message:`انخفض ${Math.round(Math.abs(growth))}% — راجع التسعير`,
        detail:`من ${fm(prevQ)} إلى ${fm(lastQ)}`, action:"discount" });
    }
    // 💨 راكد + قيمة مجمدة كبيرة
    if (p.soldPct < 25 && frozenVal > 500) {
      alerts.push({ type:"stuck", priority:"medium", icon:"💨", color:"#d4a853",
        title:"مخزون مجمّد", product:p.name, barcode:p.barcode,
        message:`${fp(p.soldPct)} مباع · ${fpm(frozenVal)} مجمّدة`,
        detail:`يحتاج تصريف — خصم أو كومبو`, action:"clear" });
    }
    // 🌟 يتحول لترند
    if (growth > 80 && nonZero.length >= 3) {
      const last3 = nonZero.slice(-3).map(m=>m.qty);
      const isConsistent = last3[0]<last3[1] && last3[1]<last3[2];
      if (isConsistent) {
        alerts.push({ type:"trend", priority:"high", icon:"🌟", color:"#a89fc4",
          title:"يتحول لترند", product:p.name, barcode:p.barcode,
          message:`نمو متصاعد لـ 3 فترات متتالية`,
          detail:`ابدأ حملة تسويقية الآن`, action:"campaign" });
      }
    }
    // 💰 ربحية عالية + مبيعات ضعيفة
    if (margin > 40 && p.soldPct < 40 && closing > 20) {
      alerts.push({ type:"opportunity", priority:"low", icon:"💰", color:"#6366f1",
        title:"فرصة مخفية", product:p.name, barcode:p.barcode,
        message:`هامش ${Math.round(margin)}% لكن مبيعاته ضعيفة`,
        detail:`يستحق حملة إعلانية`, action:"campaign" });
    }
  });

  // ترتيب: حرج → عالي → متوسط → منخفض
  const order = { critical:0, high:1, medium:2, low:3 };
  return alerts.sort((a,b)=>(order[a.priority]??4)-(order[b.priority]??4));
}

export function AlertCenter({ products, periods, onBuildCard, onAddToIdeas }) {
  const [filter,   setFilter]   = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [tick,     setTick]     = useState(0);

  const alerts = useMemo(() => buildAlerts(products, periods), [products, periods]);

  const filtered = filter==="all" ? alerts
    : alerts.filter(a=>a.type===filter||a.priority===filter);

  const counts = {
    critical: alerts.filter(a=>a.priority==="critical").length,
    high:     alerts.filter(a=>a.priority==="high").length,
    medium:   alerts.filter(a=>a.priority==="medium").length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"16px",padding:"16px",marginBottom:"14px"}}>
        <div style={{fontSize:"16px",fontWeight:"900",color:S.white,marginBottom:"12px"}}>🔔 مركز التنبيهات</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
          {[
            ["🚨 حرج",   counts.critical, "#e8855a"],
            ["⚠️ عالي",  counts.high,     "#f59e0b"],
            ["💡 متوسط", counts.medium,   "#d4a853"],
          ].map(([l,v,c])=>(
            <div key={l} style={{background:`${c}10`,border:`1px solid ${c}25`,borderRadius:"11px",padding:"9px",textAlign:"center"}}>
              <div style={{fontSize:"20px",fontWeight:"900",color:c}}>{v}</div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"2px"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* فلتر */}
      <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"12px"}}>
        {[
          ["all","الكل"],["critical","حرج"],["rising","صاعد"],
          ["stuck","راكد"],["trend","ترند"],["opportunity","فرصة"],
        ].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{
            padding:"5px 11px",borderRadius:"100px",cursor:"pointer",
            fontFamily:"Cairo,sans-serif",fontSize:"11px",fontWeight:"700",
            background:filter===k?"rgba(212,168,83,0.2)":"rgba(255,255,255,0.04)",
            color:filter===k?S.gold:"rgba(255,255,255,0.35)",
            border:filter===k?"1px solid rgba(212,168,83,0.4)":"1px solid rgba(255,255,255,0.07)",
          }}>{l}</button>
        ))}
      </div>

      {/* التنبيهات */}
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px",color:"rgba(255,255,255,0.3)"}}>
          <div style={{fontSize:"36px",marginBottom:"10px"}}>✅</div>
          <div>{alerts.length===0?"ارفع بيانات أولاً":"لا توجد تنبيهات بهذا الفلتر"}</div>
        </div>
      ) : (
        filtered.map((a,i) => (
          <div key={i} style={{borderRadius:"14px",overflow:"hidden",border:`1px solid ${a.color}25`,marginBottom:"8px"}}>
            <div onClick={(e)=>{e.stopPropagation();setExpanded(p=>p===i?null:i);}} style={{
              padding:"12px 14px",background:`${a.color}08`,cursor:"pointer",
              display:"flex",alignItems:"center",gap:"11px",
            }}>
              <span style={{fontSize:"20px",flexShrink:0}}>{a.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"14px",fontWeight:"900",color:S.white,marginBottom:"2px"}}>{a.product}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",fontFamily:"monospace",marginBottom:"2px"}}>{a.barcode} · 🏭 {a.barcode?.match(/^(\d{5})/)?.[1]??""}</div>
                <div style={{fontSize:"12px",color:a.color,fontWeight:"700"}}>{a.message}</div>
              </div>
              <div style={{fontSize:"12px",color:a.color,fontWeight:"700",flexShrink:0}}>{expanded===i?"▲":"▼"}</div>
            </div>

            {expanded===i && (
              <div style={{padding:"12px 14px",borderTop:`1px solid ${a.color}15`,background:"rgba(0,0,0,0.25)"}}>
                <div style={{fontSize:"12px",color:S.dim,marginBottom:"10px"}}>{a.detail}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px"}}>
                  <button onClick={()=>onBuildCard({type:a.action,product:a.product,barcode:a.barcode,title:a.title,reason:a.message})}
                    style={{padding:"10px",borderRadius:"11px",border:`1px solid ${a.color}30`,background:`${a.color}12`,color:S.white,fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
                    🎨 أنشئ البطاقة
                  </button>
                  <button onClick={()=>onAddToIdeas({id:Date.now().toString(),title:a.title,reason:a.message,type:a.action,status:"pending",source:"تنبيه ذكي",createdAt:new Date().toLocaleDateString("ar-SA")})}
                    style={{padding:"10px",borderRadius:"11px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.6)",fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
                    💾 أضف للأفكار
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
