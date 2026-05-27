// ProfitRules.jsx — قواعد الربحية والإعدادات
import { useState } from "react";
import { S, fm } from "./constants.js";

const DEFAULT_RULES = {
  minMargin:        15,   // أقل هامش مسموح %
  maxDiscount:      40,   // أعلى خصم مسموح %
  minPrice:         3,    // أقل سعر بيع مسموح ﷼
  blockedBarcodes:  [],   // باركودات ممنوعة من الخصم
  seasonalBarcodes: [],   // باركودات موسمية
  comboAllowed:     true, // السماح بالكومبو
  autoAlerts:       true, // تنبيهات تلقائية
  alertThreshold:   14,   // أيام قبل النفاد للتنبيه
};

export function ProfitRules({ rules, onSave }) {
  const [r, setR] = useState({ ...DEFAULT_RULES, ...rules });
  const [saved, setSaved] = useState(false);
  const [newBlock, setNewBlock] = useState("");

  const update = (key, val) => setR(p=>({...p, [key]:val}));

  const addBlocked = () => {
    if (!newBlock.trim()) return;
    update("blockedBarcodes", [...r.blockedBarcodes, newBlock.trim()]);
    setNewBlock("");
  };

  const removeBlocked = (bc) => update("blockedBarcodes", r.blockedBarcodes.filter(b=>b!==bc));

  const save = () => {
    onSave(r);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const slider = (key, min, max, step, label, unit, color) => (
    <div style={{marginBottom:"16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
        <div style={{fontSize:"13px",color:"rgba(255,255,255,0.6)"}}>{label}</div>
        <div style={{fontSize:"15px",fontWeight:"900",color}}>{r[key]}{unit}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={r[key]}
        onChange={e=>update(key, Number(e.target.value))}
        style={{width:"100%",accentColor:color}} />
      <div style={{display:"flex",justifyContent:"space-between",marginTop:"3px"}}>
        <span style={{fontSize:"10px",color:"rgba(255,255,255,0.2)"}}>{min}{unit}</span>
        <span style={{fontSize:"10px",color:"rgba(255,255,255,0.2)"}}>{max}{unit}</span>
      </div>
    </div>
  );

  const toggle = (key, label, desc) => (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"13px",marginBottom:"8px"}}>
      <div>
        <div style={{fontSize:"13px",fontWeight:"700",color:S.white}}>{label}</div>
        <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",marginTop:"2px"}}>{desc}</div>
      </div>
      <button onClick={()=>update(key,!r[key])} style={{
        width:"48px",height:"26px",borderRadius:"100px",border:"none",cursor:"pointer",
        background:r[key]?"#8aab8e":"rgba(255,255,255,0.1)",
        position:"relative",transition:"background 0.3s",
      }}>
        <div style={{
          width:"20px",height:"20px",borderRadius:"50%",background:"white",
          position:"absolute",top:"3px",transition:"left 0.3s",
          left:r[key]?"25px":"3px",
        }} />
      </button>
    </div>
  );

  return (
    <div>
      <div style={{fontSize:"16px",fontWeight:"900",color:S.white,marginBottom:"18px"}}>⚙️ قواعد الربحية</div>

      {/* الحدود */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"16px",padding:"16px",marginBottom:"14px"}}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"rgba(212,168,83,0.6)",marginBottom:"14px"}}>📊 حدود العروض</div>
        {slider("minMargin",   5,  50, 5,  "أقل هامش مسموح",  "%", "#8aab8e")}
        {slider("maxDiscount", 10, 60, 5,  "أعلى خصم مسموح",  "%", "#e8855a")}
        {slider("minPrice",    1,  20, 1,  "أقل سعر بيع",      " ﷼", "#d4a853")}
        {slider("alertThreshold", 7, 30, 1, "تنبيه قبل النفاد", " يوم", "#a89fc4")}
      </div>

      {/* Toggle */}
      <div style={{marginBottom:"14px"}}>
        {toggle("comboAllowed", "السماح بالكومبو", "تفعيل دمج المنتجات في عروض")}
        {toggle("autoAlerts",   "التنبيهات التلقائية", "تنبيهات عند تغير المخزون والترند")}
      </div>

      {/* باركودات ممنوعة */}
      <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"16px",padding:"16px",marginBottom:"14px"}}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"rgba(232,133,90,0.7)",marginBottom:"12px"}}>🚫 منتجات ممنوعة من الخصم</div>
        <div style={{display:"flex",gap:"8px",marginBottom:"10px"}}>
          <input value={newBlock} onChange={e=>setNewBlock(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addBlocked()}
            placeholder="أدخل الباركود…"
            style={{flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",padding:"9px 12px",color:S.white,fontSize:"12px",fontFamily:"Cairo,sans-serif",outline:"none"}} />
          <button onClick={addBlocked} style={{padding:"9px 14px",borderRadius:"10px",border:"none",background:"rgba(232,133,90,0.2)",color:"#e8855a",fontSize:"13px",cursor:"pointer",fontFamily:"Cairo,sans-serif",fontWeight:"700"}}>➕</button>
        </div>
        {r.blockedBarcodes.length === 0 ? (
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.25)",textAlign:"center",padding:"8px"}}>لا توجد قيود حالياً</div>
        ) : (
          <div style={{display:"flex",flexWrap:"wrap",gap:"6px"}}>
            {r.blockedBarcodes.map(bc=>(
              <div key={bc} style={{display:"inline-flex",alignItems:"center",gap:"6px",background:"rgba(232,133,90,0.1)",border:"1px solid rgba(232,133,90,0.2)",borderRadius:"100px",padding:"5px 11px"}}>
                <span style={{fontSize:"12px",color:"#e8855a",fontFamily:"monospace"}}>{bc}</span>
                <button onClick={()=>removeBlocked(bc)} style={{width:"16px",height:"16px",borderRadius:"50%",border:"none",background:"rgba(232,133,90,0.3)",color:"#e8855a",fontSize:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Cairo,sans-serif"}}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ملخص القواعد */}
      <div style={{background:"rgba(138,171,142,0.06)",border:"1px solid rgba(138,171,142,0.2)",borderRadius:"14px",padding:"14px",marginBottom:"16px"}}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"#8aab8e",marginBottom:"8px"}}>✅ ملخص القواعد الحالية</div>
        {[
          [`أي عرض يقل هامشه عن ${r.minMargin}% سيُرفض تلقائياً`],
          [`الخصم لا يتجاوز ${r.maxDiscount}%`],
          [`السعر لا يقل عن ${r.minPrice} ﷼`],
          [`تنبيه قبل ${r.alertThreshold} يوم من النفاد`],
        ].map(([t],i)=>(
          <div key={i} style={{fontSize:"12px",color:"rgba(255,255,255,0.5)",marginBottom:"4px"}}>• {t}</div>
        ))}
      </div>

      <button onClick={save} style={{
        width:"100%",padding:"14px",borderRadius:"14px",border:"none",
        background:saved?"#8aab8e":"linear-gradient(135deg,#d4a853,#b8935a)",
        color:"#0a0804",fontSize:"14px",fontWeight:"900",cursor:"pointer",
        fontFamily:"Cairo,sans-serif",transition:"background 0.3s",
      }}>
        {saved ? "✅ تم الحفظ" : "💾 حفظ القواعد"}
      </button>
    </div>
  );
}
