// ComboEngine.jsx — محرّك الكومبو المحاسبي الذكي (بدون AI، حسابات بحتة)
import { useState, useMemo } from "react";
import { S, fm, fp, fpm } from "./constants.js";

// ─── توليد باركود قصير فريد للكومبو (5-6 خانات) ──────────────
function genComboBarcode(existing = []) {
  // نبدأ من 90001 (نطاق داخلي للكومبو) ونزيد حتى نلقى رقم غير مستخدم
  let n = 90001;
  const used = new Set(existing);
  while (used.has(String(n))) n++;
  return String(n);
}

// ─── تصنيف المنتجات ──────────────────────────────────────────
function classify(products) {
  return products.map(p => {
    const frozenVal = (p.closing ?? 0) * (p.buyPrice ?? 0);
    const margin = p.buyPrice > 0 ? ((p.sellPrice - p.buyPrice) / p.buyPrice) * 100 : 0;
    const isSlow = p.soldPct < 30 && p.closing > 0;
    const isFast = p.soldPct > 50;
    return { ...p, frozenVal, margin, isSlow, isFast };
  });
}

// ─── إيجاد شريك للكومبو (منطق الستايلست) ─────────────────────
function findPartner(slow, fastPool) {
  // أولوية: نفس الكونتينر > نفس المصنع > أي سريع
  const sameContainer = fastPool.filter(f => f.container && f.container === slow.container);
  if (sameContainer.length) return { partner: sameContainer.sort((a,b)=>b.soldPct-a.soldPct)[0], link: "نفس الكونتينر" };

  const factory = b => (b.barcode ?? "").match(/^(\d{5})/)?.[1] ?? "";
  const sameFactory = fastPool.filter(f => factory(f) && factory(f) === factory(slow));
  if (sameFactory.length) return { partner: sameFactory.sort((a,b)=>b.soldPct-a.soldPct)[0], link: "نفس المصنع" };

  if (fastPool.length) return { partner: fastPool.sort((a,b)=>b.soldPct-a.soldPct)[0], link: "دمج عادي" };
  return null;
}

// ─── بناء كومبو واحد مع الحسابات ─────────────────────────────
function buildCombo(slow, partner, link, minMargin) {
  const items = [slow, partner];
  const totalBuy  = items.reduce((s,p)=>s+(p.buyPrice??0), 0);
  const totalSell = items.reduce((s,p)=>s+(p.sellPrice??0), 0);

  // أقصى خصم آمن: أعلى خصم يبقي الهامش >= minMargin
  // sell*(1-d) = buy*(1+minMargin/100)  →  d = 1 - buy*(1+m)/sell
  const minComboPrice = totalBuy * (1 + minMargin/100);
  let maxSafeDisc = totalSell > 0 ? Math.floor((1 - minComboPrice/totalSell) * 100) : 0;
  maxSafeDisc = Math.max(0, Math.min(maxSafeDisc, 60)); // سقف 60%

  const comboPrice = Math.round(totalSell * (1 - maxSafeDisc/100));
  const profit     = comboPrice - totalBuy;
  const margin     = totalBuy > 0 ? (profit/totalBuy)*100 : 0;
  const saving     = totalSell - comboPrice;

  // كم يصفّي من الراكد (نفترض الكومبو يصفّي بسرعة الشريك السريع)
  const clearQty = Math.min(slow.closing, Math.round((partner.soldPct/100) * slow.closing));
  const clearVal = clearQty * (slow.buyPrice ?? 0);

  // درجة التوازن = تصفية × ربح
  const balanceScore = (clearVal * Math.max(profit, 1)) / 1000;

  return {
    items, link, totalBuy, totalSell, comboPrice, maxSafeDisc,
    profit, margin, saving, clearQty, clearVal, balanceScore,
    safe: margin >= minMargin,
  };
}

// ─── المحرّك الرئيسي ─────────────────────────────────────────
export function ComboEngine({ products = [], periods = [], onBuildCard }) {
  const [minMargin, setMinMargin] = useState(15);
  const [maxCombos, setMaxCombos] = useState(10);

  const classified = useMemo(() => classify(products), [products]);

  const combos = useMemo(() => {
    const slow = classified.filter(p => p.isSlow && p.frozenVal > 100)
      .sort((a,b)=>b.frozenVal-a.frozenVal);
    const fast = classified.filter(p => p.isFast);

    const results = [];
    const usedPartners = {};

    for (const s of slow) {
      // نتجنب تكرار نفس الشريك كثير
      const pool = fast.filter(f => (usedPartners[f.barcode] ?? 0) < 2 && f.barcode !== s.barcode);
      const found = findPartner(s, pool);
      if (!found) continue;
      const combo = buildCombo(s, found.partner, found.link, minMargin);
      if (!combo.safe) continue;
      usedPartners[found.partner.barcode] = (usedPartners[found.partner.barcode] ?? 0) + 1;
      results.push(combo);
    }

    return results.sort((a,b)=>b.balanceScore-a.balanceScore).slice(0, maxCombos);
  }, [classified, minMargin, maxCombos]);

  const totalClearVal = combos.reduce((s,c)=>s+c.clearVal, 0);
  const totalProfit   = combos.reduce((s,c)=>s+c.profit, 0);

  return (
    <div>
      {/* رأس */}
      <div style={{background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.2)",borderRadius:"18px",padding:"18px",marginBottom:"14px"}}>
        <div style={{fontSize:"17px",fontWeight:"900",color:S.white,marginBottom:"4px"}}>🧮 محرّك الكومبو المحاسبي</div>
        <div style={{fontSize:"12px",color:"rgba(212,168,83,0.7)",marginBottom:"14px"}}>يرشّح كومبوهات تصفّي الراكد وتربح — بدون خسارة</div>

        {/* شريط الهامش */}
        <div style={{marginBottom:"12px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
            <span style={{fontSize:"13px",color:"rgba(255,255,255,0.6)"}}>أقل هامش مقبول</span>
            <span style={{fontSize:"15px",fontWeight:"900",color:S.gold}}>{minMargin}%</span>
          </div>
          <input type="range" min={0} max={50} step={5} value={minMargin}
            onChange={e=>setMinMargin(Number(e.target.value))}
            style={{width:"100%",accentColor:"#d4a853"}} />
        </div>

        {/* ملخص */}
        {combos.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
            {[
              ["كومبو", combos.length, "#d4a853"],
              ["يصفّي", fpm(totalClearVal), "#8aab8e"],
              ["ربح", fpm(totalProfit), "#a89fc4"],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:`${c}12`,border:`1px solid ${c}25`,borderRadius:"12px",padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:"15px",fontWeight:"900",color:c}}>{v}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",marginTop:"2px"}}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الكومبوهات */}
      {combos.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.3)"}}>
          <div style={{fontSize:"40px",marginBottom:"12px"}}>🧮</div>
          <div style={{fontSize:"15px",color:"rgba(255,255,255,0.5)"}}>
            {products.length===0 ? "ارفع البيانات أولاً" : "لا توجد كومبوهات بهذا الهامش"}
          </div>
          {products.length>0 && <div style={{fontSize:"13px",marginTop:"6px"}}>جرّب تخفيض الهامش</div>}
        </div>
      ) : (
        combos.map((c, i) => <ComboCard key={i} combo={c} onBuildCard={onBuildCard} />)
      )}
    </div>
  );
}

// ─── بطاقة كومبو مصغّرة في القائمة ───────────────────────────
function ComboCard({ combo, onBuildCard }) {
  const [open, setOpen] = useState(false);
  const c = combo.margin >= 25 ? "#8aab8e" : combo.margin >= 15 ? "#d4a853" : "#e8855a";

  return (
    <div style={{borderRadius:"16px",overflow:"hidden",border:`1px solid ${c}30`,marginBottom:"10px"}}>
      <div onClick={()=>setOpen(o=>!o)} style={{padding:"14px 16px",background:`${c}10`,cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
          <span style={{fontSize:"22px"}}>🎁</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"14px",fontWeight:"900",color:S.white}}>
              {combo.items[0].name?.slice(0,18)} + {combo.items[1].name?.slice(0,18)}
            </div>
            <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"2px"}}>🔗 {combo.link} · خصم {combo.maxSafeDisc}%</div>
          </div>
          <div style={{fontSize:"12px",color:c,fontWeight:"700"}}>{open?"▲":"▼"}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px"}}>
          {[
            ["السعر", fpm(combo.comboPrice), S.white],
            ["الربح", fpm(combo.profit), c],
            ["الهامش", combo.margin.toFixed(0)+"%", c],
          ].map(([l,v,col])=>(
            <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:"9px",padding:"7px",textAlign:"center"}}>
              <div style={{fontSize:"13px",fontWeight:"900",color:col}}>{v}</div>
              <div style={{fontSize:"9px",color:"rgba(255,255,255,0.35)",marginTop:"1px"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {open && (
        <div style={{padding:"14px 16px",borderTop:`1px solid ${c}20`,background:"rgba(0,0,0,0.25)"}}>
          {/* تفاصيل المنتجات */}
          {combo.items.map((p,idx)=>(
            <div key={idx} style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"rgba(255,255,255,0.6)",marginBottom:"5px"}}>
              <span>{idx===0?"🔴":"🟢"} {p.name?.slice(0,24)}</span>
              <span>{p.sellPrice} ﷼</span>
            </div>
          ))}
          <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",margin:"8px 0",paddingTop:"8px"}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"rgba(255,255,255,0.5)",marginBottom:"4px"}}>
              <span>المجموع الأصلي</span><span style={{textDecoration:"line-through"}}>{combo.totalSell} ﷼</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"14px",fontWeight:"900",color:c}}>
              <span>سعر الكومبو</span><span>{combo.comboPrice} ﷼</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:"12px",color:"#8aab8e",marginTop:"4px"}}>
              <span>يصفّي راكد</span><span>{fm(combo.clearQty)} قطعة · {fpm(combo.clearVal)}</span>
            </div>
          </div>
          <button onClick={()=>onBuildCard && onBuildCard(combo)} style={{
            width:"100%",padding:"12px",borderRadius:"12px",border:"none",marginTop:"8px",
            background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",
            fontSize:"13px",fontWeight:"900",cursor:"pointer",fontFamily:"Cairo,sans-serif",
          }}>🎨 أنشئ بطاقة الكومبو + باركود</button>
        </div>
      )}
    </div>
  );
}

export { genComboBarcode };
