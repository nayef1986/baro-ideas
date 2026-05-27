// AISimulation.jsx — محاكاة العروض قبل الاعتماد
import { useState, useMemo } from "react";
import { S, TYPES, fm, fp, fpm } from "./constants.js";

function simulateOffer(product, offerType, discountPct, periods) {
  const { qty, soldPct, buyPrice, sellPrice, closing } = product;
  const newPrice  = sellPrice * (1 - discountPct / 100);
  const profit    = newPrice - buyPrice;
  const margin    = buyPrice > 0 ? (profit / buyPrice) * 100 : 0;

  // حساب معدل البيع الحالي
  const avgSold = qty > 0 ? qty * (soldPct / 100) : 0;

  // تأثير الخصم على المبيعات (نموذج بسيط)
  const demandBoost = offerType === "flash" ? 2.5
    : offerType === "bundle" ? 1.8
    : offerType === "discount" ? 1.5
    : offerType === "clear" ? 2.0
    : 1.3;

  const expectedSold    = Math.min(closing, Math.round(avgSold * demandBoost));
  const expectedRevenue = expectedSold * newPrice;
  const expectedProfit  = expectedSold * profit;
  const clearancePct    = closing > 0 ? (expectedSold / closing) * 100 : 0;
  const basketImpact    = offerType === "bundle" ? "+15%" : offerType === "flash" ? "+8%" : "+5%";

  // تقييم العرض
  let rating = "good";
  let ratingLabel = "جيد";
  let ratingColor = "#d4a853";

  if (margin >= 25 && clearancePct >= 40) {
    rating = "excellent"; ratingLabel = "ممتاز ✨"; ratingColor = "#8aab8e";
  } else if (margin < 0) {
    rating = "danger"; ratingLabel = "خطر ⚠️"; ratingColor = "#e8855a";
  } else if (margin < 10 || clearancePct < 20) {
    rating = "needsEdit"; ratingLabel = "يحتاج تعديل 🔧"; ratingColor = "#f59e0b";
  }

  const successPct = Math.min(95, Math.max(10,
    (margin > 20 ? 30 : margin > 10 ? 20 : 10) +
    (clearancePct > 50 ? 30 : clearancePct > 30 ? 20 : 10) +
    (demandBoost > 2 ? 25 : demandBoost > 1.5 ? 15 : 10)
  ));

  return {
    newPrice, margin, profit, expectedSold, expectedRevenue,
    expectedProfit, clearancePct, basketImpact, rating,
    ratingLabel, ratingColor, successPct,
  };
}

export function AISimulation({ products, periods, onClose }) {
  const [selBarcode, setSelBarcode] = useState(products[0]?.barcode ?? "");
  const [offerType,  setOfferType]  = useState("discount");
  const [discountPct, setDiscount]  = useState(25);

  const product = products.find(p => p.barcode === selBarcode);
  const sim = useMemo(() => {
    if (!product) return null;
    return simulateOffer(product, offerType, discountPct, periods);
  }, [product, offerType, discountPct, periods]);

  const RATINGS = {
    excellent: { bg: "rgba(138,171,142,0.12)", border: "rgba(138,171,142,0.3)" },
    good:      { bg: "rgba(212,168,83,0.12)",  border: "rgba(212,168,83,0.3)"  },
    needsEdit: { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.3)"  },
    danger:    { bg: "rgba(232,133,90,0.12)",  border: "rgba(232,133,90,0.3)"  },
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{fontSize:"17px",fontWeight:"900",color:S.white}}>🔬 محاكاة العرض</div>
        {onClose && <button onClick={onClose} style={{padding:"6px 13px",borderRadius:"100px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",fontSize:"12px",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>إغلاق</button>}
      </div>

      {/* اختيار المنتج */}
      <div>
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"6px"}}>المنتج</div>
        <select value={selBarcode} onChange={e=>setSelBarcode(e.target.value)}
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"11px 13px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none"}}>
          {products.map(p=><option key={p.barcode} value={p.barcode}>{p.name}</option>)}
        </select>
      </div>

      {/* نوع العرض */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px"}}>
        {TYPES.slice(0,4).map(t=>(
          <button key={t.key} onClick={()=>setOfferType(t.key)} style={{
            padding:"9px 4px",borderRadius:"11px",cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:"11px",fontWeight:"700",
            background:offerType===t.key?`${t.color}20`:"rgba(255,255,255,0.04)",
            color:offerType===t.key?t.color:"rgba(255,255,255,0.35)",
            border:offerType===t.key?`1px solid ${t.color}45`:"1px solid rgba(255,255,255,0.07)",
            display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",
          }}>
            <span style={{fontSize:"18px"}}>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* نسبة الخصم */}
      <div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>نسبة الخصم</div>
          <div style={{fontSize:"14px",fontWeight:"900",color:S.gold}}>{discountPct}%</div>
        </div>
        <input type="range" min={5} max={60} step={5} value={discountPct}
          onChange={e=>setDiscount(Number(e.target.value))}
          style={{width:"100%",accentColor:"#d4a853"}} />
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px"}}>
          <span style={{fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>5%</span>
          <span style={{fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>60%</span>
        </div>
      </div>

      {/* نتائج المحاكاة */}
      {sim && product && (
        <>
          {/* التقييم */}
          <div style={{padding:"16px",borderRadius:"16px",background:RATINGS[sim.rating].bg,border:`1px solid ${RATINGS[sim.rating].border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
              <div style={{fontSize:"18px",fontWeight:"900",color:sim.ratingColor}}>{sim.ratingLabel}</div>
              <div style={{fontSize:"24px",fontWeight:"900",color:sim.ratingColor}}>{sim.successPct}%</div>
            </div>
            <div style={{height:"8px",background:"rgba(255,255,255,0.08)",borderRadius:"100px",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${sim.successPct}%`,background:`linear-gradient(90deg,${sim.ratingColor},${sim.ratingColor}99)`,borderRadius:"100px",transition:"width 0.5s"}} />
            </div>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginTop:"6px"}}>احتمالية النجاح</div>
          </div>

          {/* الأرقام */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            {[
              ["السعر الجديد",     `${sim.newPrice.toFixed(1)} ﷼`, sim.ratingColor],
              ["هامش الربح",       `${sim.margin.toFixed(1)}%`,    sim.ratingColor],
              ["مبيعات متوقعة",   fm(sim.expectedSold) + " قطعة", "#d4a853"],
              ["إيراد متوقع",     fpm(sim.expectedRevenue),        "#8aab8e"],
              ["ربح متوقع",       fpm(sim.expectedProfit),         sim.ratingColor],
              ["تصريف المخزون",   `${sim.clearancePct.toFixed(0)}%`, "#a89fc4"],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:"12px",padding:"11px",textAlign:"center"}}>
                <div style={{fontSize:"16px",fontWeight:"900",color:c}}>{v}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginTop:"3px"}}>{l}</div>
              </div>
            ))}
          </div>

          {/* تأثير على متوسط السلة */}
          <div style={{background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:"13px",padding:"12px 15px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:"13px",color:"rgba(255,255,255,0.6)"}}>📊 تأثير على متوسط السلة</div>
            <div style={{fontSize:"15px",fontWeight:"900",color:"#a5b4fc"}}>{sim.basketImpact}</div>
          </div>

          {/* تحذير خسارة */}
          {sim.rating === "danger" && (
            <div style={{background:"rgba(232,133,90,0.1)",border:"1px solid rgba(232,133,90,0.3)",borderRadius:"13px",padding:"12px 15px"}}>
              <div style={{fontSize:"13px",fontWeight:"700",color:"#e8855a",marginBottom:"4px"}}>⚠️ تحذير: هذا العرض خاسر</div>
              <div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)"}}>سعر الشراء {product.buyPrice} ﷼ · السعر الجديد {sim.newPrice.toFixed(1)} ﷼</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
