// DecisionEngine.jsx — محرّك القرارات التنفيذية (مدير مشتريات + فروع + مبيعات)
import { useState, useMemo } from "react";
import { S, fm, fpm } from "./constants.js";

const MIN = 12; // الدزينة
const factoryOf = bc => (bc ?? "").match(/^(\d{5})/)?.[1] ?? "";
const toDozen = n => Math.ceil(n / MIN) * MIN;

// ─── تحليل المنتج عبر الفروع ─────────────────────────────────
function analyze(products, periods) {
  return products.map(p => {
    // مبيعات كل فرع (مجموع كل الفترات)
    const branchSales = {};
    periods.forEach(per => {
      Object.entries(per.sales ?? {}).forEach(([branch, data]) => {
        const q = Number(data[p.barcode]?.qty ?? 0);
        if (q > 0) branchSales[branch] = (branchSales[branch] ?? 0) + q;
      });
    });

    // لكل فرع: مُعطى (دزينة) + متبقي
    const branches = Object.entries(branchSales).map(([branch, sold]) => {
      const given = toDozen(sold);
      return { branch, sold, given, remaining: given - sold };
    });

    const totalSold = branches.reduce((s,b)=>s+b.sold, 0);
    const bought    = p.qty ?? 0;
    const soldPct   = bought > 0 ? (totalSold/bought)*100 : 0;
    const margin    = p.buyPrice > 0 ? ((p.sellPrice-p.buyPrice)/p.buyPrice)*100 : 0;
    const closing   = Math.max(0, bought - totalSold);
    const frozenVal = closing * (p.buyPrice ?? 0);
    const branchCount = branches.length;

    return {
      ...p, branchSales, branches, totalSold, bought, soldPct,
      margin, closing, frozenVal, branchCount, factory: factoryOf(p.barcode),
    };
  });
}

// ─── توليد القرارات ──────────────────────────────────────────
function buildDecisions(analyzed, minMargin) {
  const decisions = [];

  analyzed.forEach(p => {
    // 1) كرّر الطلب — أداء عالٍ + هامش جيد
    if (p.soldPct >= 75 && p.margin >= minMargin && p.totalSold > 0) {
      const orderQty = toDozen(Math.round(p.totalSold * 0.6)); // 60% من المباع، مقرّب للدزينة
      decisions.push({
        kind: "reorder", icon: "🔄", color: "#8aab8e",
        title: "كرّر الطلب", product: p.name, barcode: p.barcode, factory: p.factory,
        reasons: [
          `نسبة البيع ${Math.round(p.soldPct)}% — أداء قوي`,
          `هامش الربح ${Math.round(p.margin)}%`,
          `بيع في ${p.branchCount} فرع`,
          p.closing <= MIN ? "المخزون شارف على النفاد" : "طلب مستقر ومتكرر",
        ],
        action: `اطلب ${fm(orderQty)} قطعة من المورّد`,
        impact: `يغطّي الطلب المتوقع ويمنع نفاد منتج رابح`,
        score: p.soldPct * p.margin,
      });
    }

    // 3) أوقف وصفّي — أداء ضعيف + مجمّد عالٍ
    if (p.soldPct < 25 && p.frozenVal > 200 && p.closing > MIN) {
      decisions.push({
        kind: "stop", icon: "🛑", color: "#e8855a",
        title: "أوقف وصفّي", product: p.name, barcode: p.barcode, factory: p.factory,
        reasons: [
          `نسبة البيع ${Math.round(p.soldPct)}% فقط — بطيء`,
          `${fm(p.closing)} قطعة راكدة`,
          `${fpm(p.frozenVal)} فلوس مجمّدة`,
          "يشغل مساحة عرض دون عائد",
        ],
        action: `صفّي ${fm(p.closing)} قطعة بخصم، ولا تعد الطلب`,
        impact: `يحرّر ${fpm(p.frozenVal)} مجمّدة + مساحة عرض`,
        score: p.frozenVal,
      });
    }

    // 4) وسّع — الأعلى أداءً + هامش ممتاز
    if (p.soldPct >= 80 && p.margin >= 25 && p.totalSold > MIN) {
      decisions.push({
        kind: "expand", icon: "✨", color: "#a89fc4",
        title: "وسّع المنتج", product: p.name, barcode: p.barcode, factory: p.factory,
        reasons: [
          `من الأعلى مبيعاً (${Math.round(p.soldPct)}%)`,
          `هامش مرتفع ${Math.round(p.margin)}%`,
          `طلب مستمر في ${p.branchCount} فرع`,
          "فرصة توسّع بنفس التصميم",
        ],
        action: `أنشئ ألوان/نسخ جديدة (فضي، روز جولد، لؤلؤي)`,
        impact: `يضاعف مبيعات تصميم ناجح بأقل مخاطرة`,
        score: p.soldPct * p.margin,
      });
    }
  });

  // 2) انقل بين الفروع — لكل منتج، فرع فائض → فرع محتاج
  analyzed.forEach(p => {
    if (p.branches.length < 2) return;
    const surplus = [...p.branches].filter(b => b.remaining >= MIN && b.sold < p.totalSold/p.branchCount)
      .sort((a,b)=>b.remaining-a.remaining)[0];
    const needy = [...p.branches].filter(b => b.remaining === 0 && b.sold > p.totalSold/p.branchCount)
      .sort((a,b)=>b.sold-a.sold)[0];
    if (surplus && needy && surplus.branch !== needy.branch) {
      const moveQty = Math.min(surplus.remaining, toDozen(Math.round(needy.sold*0.3)));
      if (moveQty >= MIN/2) {
        decisions.push({
          kind: "transfer", icon: "🔀", color: "#d4a853",
          title: "انقل بين الفروع", product: p.name, barcode: p.barcode, factory: p.factory,
          reasons: [
            `${surplus.branch}: بيع ضعيف (${surplus.sold}) + متبقي ${surplus.remaining}`,
            `${needy.branch}: بيع قوي (${needy.sold}) + نفد`,
            "إعادة توزيع تمنع نفاد فرع قوي",
            "تحريك مخزون راكد في فرع ضعيف",
          ],
          action: `انقل ${fm(moveQty)} قطعة من ${surplus.branch} إلى ${needy.branch}`,
          impact: `يبيع المتبقي الراكد في الفرع الأقوى`,
          score: needy.sold * 10,
        });
      }
    }
  });

  // 5) كومبو — منتجان أقوياء بنفس الفرع
  const strong = analyzed.filter(p => p.soldPct >= 60 && p.margin >= minMargin)
    .sort((a,b)=>b.totalSold-a.totalSold).slice(0, 8);
  for (let i = 0; i < strong.length - 1; i++) {
    const a = strong[i], b = strong[i+1];
    // يشتركان في فرع قوي؟
    const shared = Object.keys(a.branchSales).filter(br => b.branchSales[br]);
    if (shared.length >= 2) {
      const comboBuy  = (a.buyPrice??0)+(b.buyPrice??0);
      const comboSell = (a.sellPrice??0)+(b.sellPrice??0);
      const cmargin = comboBuy>0 ? ((comboSell-comboBuy)/comboBuy)*100 : 0;
      if (cmargin >= minMargin) {
        decisions.push({
          kind: "combo", icon: "🎁", color: "#6366f1",
          title: "أنشئ كومبو", product: `${a.name?.slice(0,15)} + ${b.name?.slice(0,15)}`,
          barcode: `${a.barcode} + ${b.barcode}`, factory: a.factory,
          reasons: [
            "المنتجان يُباعان بقوة في نفس الفروع",
            `يشتركان في ${shared.length} فرع`,
            `هامش الكومبو ${Math.round(cmargin)}%`,
            "يرفع متوسط قيمة الفاتورة",
          ],
          action: `كومبو بسعر ${fm(Math.round(comboSell*0.9))} ﷼ (خصم 10%)`,
          impact: `يرفع متوسط السلة ويصرّف الاثنين معاً`,
          score: (a.totalSold+b.totalSold),
        });
        break; // كومبو واحد يكفي للعرض الأولي
      }
    }
  }

  return decisions.sort((a,b)=>b.score-a.score);
}

// ─── المكوّن الرئيسي ─────────────────────────────────────────
export function DecisionEngine({ products = [], periods = [], settings = {} }) {
  const [minMargin, setMinMargin] = useState(15);
  const [filter, setFilter] = useState("all");

  const analyzed = useMemo(() => analyze(products, periods), [products, periods]);
  const decisions = useMemo(() => buildDecisions(analyzed, minMargin), [analyzed, minMargin]);

  const filtered = filter === "all" ? decisions : decisions.filter(d => d.kind === filter);

  const counts = {
    reorder:  decisions.filter(d=>d.kind==="reorder").length,
    transfer: decisions.filter(d=>d.kind==="transfer").length,
    stop:     decisions.filter(d=>d.kind==="stop").length,
    expand:   decisions.filter(d=>d.kind==="expand").length,
    combo:    decisions.filter(d=>d.kind==="combo").length,
  };

  const printReport = (kind) => {
    const list = kind === "all" ? decisions : decisions.filter(d=>d.kind===kind);
    const title = kind === "all" ? "تقرير القرارات التنفيذية" :
      {reorder:"تقرير إعادة الطلب",transfer:"تقرير النقل بين الفروع",stop:"تقرير التصفية",expand:"تقرير التوسّع",combo:"تقرير الكومبو"}[kind];
    const rows = list.map((d,i)=>`
      <div class="card">
        <div class="ttl">${d.icon} ${d.title}: ${d.product}</div>
        <div class="meta">باركود: ${d.barcode} · مصنع: ${d.factory}</div>
        <ul>${d.reasons.map(r=>`<li>${r}</li>`).join("")}</ul>
        <div class="act">✅ ${d.action}</div>
        <div class="imp">📈 ${d.impact}</div>
      </div>`).join("");
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
        *{font-family:'Cairo',sans-serif;box-sizing:border-box}
        body{padding:0;margin:0;background:#fff;color:#1a1a1a}
        .toolbar{position:fixed;top:0;left:0;right:0;background:#0f172a;padding:10px;display:flex;gap:10px;justify-content:center;z-index:99}
        .toolbar button{font-family:'Cairo';font-size:14px;font-weight:700;border:none;border-radius:10px;padding:10px 20px;cursor:pointer}
        .bk{background:#334155;color:#fff}.pr{background:#2563eb;color:#fff}
        .wrap{max-width:800px;margin:0 auto;padding:70px 20px 40px}
        h1{text-align:center;color:#0f172a;margin-bottom:6px}
        .date{text-align:center;color:#888;font-size:13px;margin-bottom:24px}
        .card{border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:14px;page-break-inside:avoid}
        .ttl{font-size:16px;font-weight:900;color:#0f172a;margin-bottom:4px}
        .meta{font-size:12px;color:#888;font-family:monospace;margin-bottom:8px}
        ul{margin:8px 0;padding-right:20px}li{font-size:14px;color:#444;margin-bottom:3px}
        .act{background:#dcfce7;color:#166534;padding:9px 12px;border-radius:9px;font-weight:700;font-size:14px;margin-top:8px}
        .imp{color:#666;font-size:13px;margin-top:6px}
        @media print{.toolbar{display:none}.wrap{padding:20px}}
      </style></head><body>
      <div class="toolbar"><button class="bk" onclick="window.close();history.back()">← رجوع</button><button class="pr" onclick="window.print()">🖨️ طباعة</button></div>
      <div class="wrap"><h1>${title}</h1><div class="date">📅 ${new Date().toLocaleDateString("ar-SA")} · ${settings?.brandName??"ALBAROO"}</div>
      ${rows || "<p style='text-align:center;color:#888'>لا توجد قرارات</p>"}</div></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div>
      {/* رأس */}
      <div style={{background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.2)",borderRadius:"18px",padding:"18px",marginBottom:"14px"}}>
        <div style={{fontSize:"17px",fontWeight:"900",color:S.white,marginBottom:"4px"}}>🎯 القرارات التنفيذية</div>
        <div style={{fontSize:"12px",color:"rgba(212,168,83,0.7)",marginBottom:"14px"}}>مدير مشتريات + فروع + مبيعات — قرارات جاهزة</div>

        <div style={{marginBottom:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
            <span style={{fontSize:"13px",color:"rgba(255,255,255,0.6)"}}>أقل هامش مقبول</span>
            <span style={{fontSize:"15px",fontWeight:"900",color:S.gold}}>{minMargin}%</span>
          </div>
          <input type="range" min={0} max={50} step={5} value={minMargin} onChange={e=>setMinMargin(Number(e.target.value))} style={{width:"100%",accentColor:"#d4a853"}} />
        </div>

        <button onClick={()=>printReport("all")} style={{width:"100%",padding:"12px",borderRadius:"13px",border:"none",background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",fontSize:"14px",fontWeight:"900",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
          🖨️ اطبع التقرير الشامل ({decisions.length})
        </button>
      </div>

      {/* فلاتر بعدّاد + طباعة لكل نوع */}
      <div style={{display:"flex",gap:"5px",flexWrap:"wrap",marginBottom:"12px"}}>
        {[
          ["all","الكل",decisions.length],
          ["reorder","🔄 طلب",counts.reorder],
          ["transfer","🔀 نقل",counts.transfer],
          ["stop","🛑 تصفية",counts.stop],
          ["expand","✨ توسّع",counts.expand],
          ["combo","🎁 كومبو",counts.combo],
        ].map(([k,l,n])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{
            padding:"6px 12px",borderRadius:"100px",cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:"12px",fontWeight:"700",
            background:filter===k?"rgba(212,168,83,0.2)":"rgba(255,255,255,0.05)",
            color:filter===k?S.gold:"rgba(255,255,255,0.4)",
            border:filter===k?"1px solid rgba(212,168,83,0.4)":"1px solid rgba(255,255,255,0.08)",
          }}>{l} ({n})</button>
        ))}
      </div>

      {/* زر طباعة النوع المختار */}
      {filter !== "all" && filtered.length > 0 && (
        <button onClick={()=>printReport(filter)} style={{width:"100%",padding:"10px",borderRadius:"11px",border:"1px solid rgba(212,168,83,0.3)",background:"rgba(212,168,83,0.08)",color:S.gold,fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif",marginBottom:"12px"}}>
          🖨️ اطبع هذا التقرير ({filtered.length})
        </button>
      )}

      {/* القرارات */}
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.3)"}}>
          <div style={{fontSize:"40px",marginBottom:"12px"}}>🎯</div>
          <div style={{fontSize:"15px",color:"rgba(255,255,255,0.5)"}}>{products.length===0?"ارفع البيانات أولاً":"لا توجد قرارات بهذا الفلتر"}</div>
        </div>
      ) : (
        filtered.map((d,i)=><DecisionCard key={i} d={d} />)
      )}
    </div>
  );
}

// ─── بطاقة قرار ──────────────────────────────────────────────
function DecisionCard({ d }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{borderRadius:"16px",overflow:"hidden",border:`1px solid ${d.color}30`,marginBottom:"10px"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"14px 16px",background:`${d.color}10`,cursor:"pointer",display:"flex",alignItems:"center",gap:"12px"}}>
        <span style={{fontSize:"24px",flexShrink:0}}>{d.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"13px",fontWeight:"900",color:d.color,marginBottom:"2px"}}>{d.title}</div>
          <div style={{fontSize:"14px",fontWeight:"700",color:S.white}}>{d.product}</div>
        </div>
        <div style={{fontSize:"12px",color:d.color}}>{open?"▲":"▼"}</div>
      </div>
      {open && (
        <div style={{padding:"14px 16px",borderTop:`1px solid ${d.color}20`,background:"rgba(0,0,0,0.25)"}}>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",fontFamily:"monospace",marginBottom:"10px"}}>{d.barcode} · 🏭 {d.factory}</div>
          <div style={{marginBottom:"12px"}}>
            {d.reasons.map((r,i)=>(
              <div key={i} style={{fontSize:"13px",color:"rgba(255,255,255,0.7)",marginBottom:"5px",display:"flex",gap:"7px"}}>
                <span style={{color:d.color}}>•</span><span>{r}</span>
              </div>
            ))}
          </div>
          <div style={{background:`${d.color}15`,border:`1px solid ${d.color}30`,borderRadius:"11px",padding:"11px 13px",marginBottom:"8px"}}>
            <div style={{fontSize:"11px",color:d.color,fontWeight:"700",marginBottom:"3px"}}>✅ التوصية</div>
            <div style={{fontSize:"14px",color:S.white,fontWeight:"700"}}>{d.action}</div>
          </div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>📈 {d.impact}</div>
        </div>
      )}
    </div>
  );
}
