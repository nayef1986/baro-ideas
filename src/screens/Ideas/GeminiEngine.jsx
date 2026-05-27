// GeminiEngine.jsx — محرك Gemini الذكي
import { useState, useMemo, useCallback } from "react";
import { S, fm, fp, fpm, TYPES } from "./constants.js";

// ─── بناء بيانات موجزة لـ Gemini ────────────────────────────

function buildDataSummary(products, periods) {
  const sorted = [...periods].sort((a,b) =>
    (a.uploadDate??a.label) > (b.uploadDate??b.label) ? 1 : -1
  );

  // نبني index للفروع لكل منتج
  const branchIndex = {};
  sorted.forEach(per => {
    Object.entries(per.sales ?? {}).forEach(([branch, data]) => {
      Object.entries(data).forEach(([bc, v]) => {
        if (!branchIndex[bc]) branchIndex[bc] = {};
        branchIndex[bc][branch] = (branchIndex[bc][branch] ?? 0) + Number(v.qty ?? 0);
      });
    });
  });

  // نبني index للمصانع
  const factoryMap = {};
  products.forEach(p => {
    const factory = p.barcode?.match(/^(\d{5})/)?.[1] ?? "";
    if (!factoryMap[factory]) factoryMap[factory] = { count:0, totalSold:0, name: factory };
    factoryMap[factory].count++;
  });

  const productData = products.slice(0, 100).map(p => {
    const monthly = sorted.map(per => ({
      label: per.label,
      qty: Object.values(per.sales ?? {}).reduce((s,b) =>
        s + Number(b[p.barcode]?.qty ?? 0), 0),
    }));
    const totalSold  = monthly.reduce((s,m)=>s+m.qty,0);
    const lastMonth  = monthly[monthly.length-1]?.qty ?? 0;
    const prevMonth  = monthly[monthly.length-2]?.qty ?? 0;
    const growth     = prevMonth > 0 ? ((lastMonth-prevMonth)/prevMonth)*100 : 0;
    const bought     = p.qty ?? 0;
    const remaining  = Math.max(0, bought - totalSold);
    const soldPct    = bought > 0 ? (totalSold/bought)*100 : 0;
    const frozenVal  = remaining * (p.buyPrice ?? 0);
    const margin     = p.buyPrice > 0 ? ((p.sellPrice-p.buyPrice)/p.buyPrice)*100 : 0;
    const factory    = p.barcode?.match(/^(\d{5})/)?.[1] ?? "";

    // أفضل فرع للمنتج
    const branches = branchIndex[p.barcode] ?? {};
    const topBranch = Object.entries(branches).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? "";
    const branchCount = Object.keys(branches).filter(b => branches[b] > 0).length;

    return {
      name: p.name?.slice(0,30),
      barcode: p.barcode,
      container: p.container ?? "",
      factory,
      lastMonth, prevMonth, growth: Math.round(growth),
      remaining, soldPct: Math.round(soldPct),
      buyPrice: p.buyPrice, sellPrice: p.sellPrice,
      margin: Math.round(margin), frozenVal: Math.round(frozenVal),
      monthly: monthly.slice(-6).map(m => m.qty),
      topBranch: topBranch.slice(0,15),
      branchCount,
    };
  });

  // تحليل المصانع
  const factoryData = Object.entries(
    products.reduce((acc, p) => {
      const f = p.barcode?.match(/^(\d{5})/)?.[1] ?? "غير معروف";
      if (!acc[f]) acc[f] = { factory:f, products:0, totalSold:0, frozenVal:0 };
      const sold = sorted.reduce((s,per) =>
        s + Object.values(per.sales??{}).reduce((ss,d)=>ss+Number(d[p.barcode]?.qty??0),0), 0);
      acc[f].products++;
      acc[f].totalSold += sold;
      acc[f].frozenVal += Math.max(0,(p.qty??0)-sold) * (p.buyPrice??0);
      return acc;
    }, {})
  ).map(([,v])=>v).sort((a,b)=>b.frozenVal-a.frozenVal).slice(0,10);

  return {
    products: productData,
    periods: sorted.map(p=>p.label),
    factories: factoryData,
  };
}

function buildGeminiPrompt(data, lang = "ar") {
  const top = data.products;
  const slow = top.filter(p => p.soldPct < 30).sort((a,b)=>a.soldPct-b.soldPct).slice(0,5);
  const rising = top.filter(p => p.growth > 20).sort((a,b)=>b.growth-a.growth).slice(0,5);
  const falling = top.filter(p => p.growth < -20).sort((a,b)=>a.growth-b.growth).slice(0,5);

  // تحليل المصانع الضعيفة
  const weakFactories = data.factories?.filter(f=>f.frozenVal>1000).slice(0,3) ?? [];

  return `أنت محاسب ومسوّق محترف متخصص في منتجات التجزئة.

الفترات المتاحة: ${data.periods.join(", ")}

المنتجات الراكدة (أقل من 30% مباع):
${slow.map(p=>`- ${p.name} | ${p.barcode} | مصنع: ${p.factory} | كونتينر: ${p.container} | مباع: ${p.soldPct}% | متبقي: ${p.remaining} | مجمّد: ${p.frozenVal} ﷼ | أفضل فرع: ${p.topBranch}`).join('\n')}

المنتجات الصاعدة (نمو > 20%):
${rising.map(p=>`- ${p.name} | ${p.barcode} | مصنع: ${p.factory} | نمو: +${p.growth}% | آخر شهر: ${p.lastMonth} | ${p.branchCount} فرع`).join('\n')}

المنتجات الهابطة:
${falling.map(p=>`- ${p.name} | ${p.barcode} | مصنع: ${p.factory} | انخفاض: ${p.growth}% | آخر شهر: ${p.lastMonth}`).join('\n')}

المصانع الأعلى تجميداً:
${weakFactories.map(f=>`- مصنع ${f.factory}: ${f.products} منتج | مجمّد: ${Math.round(f.frozenVal)} ﷼`).join('\n')}

المطلوب: قدم 10-12 اقتراحاً ذكياً بأسلوب البراندات الصينية والكورية، بصيغة JSON فقط بدون أي نص خارج JSON:

{
  "suggestions": [
    {
      "id": "1",
      "type": "discount|bundle|flash|seasonal|reorder|campaign",
      "priority": "high|medium|low",
      "title": "عنوان الاقتراح",
      "product": "اسم المنتج",
      "barcode": "رقم الباركود",
      "container": "رقم الكونتينر إن وجد",
      "factory": "رقم المصنع",
      "topBranch": "أفضل فرع للمنتج",
      "reason": "سبب الاقتراح بجملة واحدة مختصرة",
      "action": "الإجراء المقترح",
      "expectedImpact": "التأثير المتوقع",
      "safetyScore": 85,
      "profitability": "high|medium|low",
      "urgency": "immediate|soon|planned"
    }
  ]
}`;
}

// ─── بطاقة اقتراح واحد ───────────────────────────────────────

function SuggestionCard({ s, products, images, onBuildCard, onAddToIdeas }) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = TYPES.find(t=>t.key===s.type) ?? TYPES[0];
  const c = typeInfo.color;

  const priorityColor = s.priority==="high" ? "#e8855a" : s.priority==="medium" ? "#d4a853" : "#8aab8e";
  const urgencyLabel  = s.urgency==="immediate" ? "🔴 عاجل" : s.urgency==="soon" ? "🟡 قريباً" : "🟢 مخطط";

  return (
    <div style={{borderRadius:"16px",overflow:"hidden",border:`1px solid ${c}30`,marginBottom:"10px"}}>
      {/* Header */}
      <div onClick={()=>setExpanded(p=>!p)} style={{
        padding:"14px 16px", background:`${c}10`, cursor:"pointer",
        display:"flex", alignItems:"center", gap:"12px",
      }}>
        <span style={{fontSize:"22px",flexShrink:0}}>{typeInfo.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"15px",fontWeight:"900",color:S.white,marginBottom:"2px"}}>{s.product || s.title}</div>
          <div style={{display:"flex",gap:"7px",alignItems:"center",flexWrap:"wrap",marginTop:"2px"}}>
            <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{s.barcode}</div>
            {s.barcode && <div style={{fontSize:"10px",color:"rgba(212,168,83,0.5)"}}>🏭 {s.barcode.slice(0,5)}</div>}
            {s.container && <div style={{fontSize:"10px",color:"rgba(99,162,241,0.6)"}}>📦 {s.container}</div>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px",flexShrink:0}}>
          <div style={{fontSize:"11px",fontWeight:"700",color:priorityColor}}>{urgencyLabel}</div>
          <div style={{fontSize:"12px",color:c,fontWeight:"700"}}>{expanded?"▲":"▼"}</div>
        </div>
      </div>

      {/* Details */}
      {expanded && (
        <div style={{background:"rgba(0,0,0,0.3)",borderTop:`1px solid ${c}20`,padding:"14px 16px"}}>
          {/* السبب */}
          <div style={{background:`${c}12`,border:`1px solid ${c}25`,borderRadius:"11px",padding:"10px 13px",marginBottom:"10px"}}>
            <div style={{fontSize:"12px",color:c,fontWeight:"700",marginBottom:"3px"}}>💡 السبب</div>
            <div style={{fontSize:"13px",color:S.white}}>{s.reason}</div>
          </div>

          {/* الإجراء */}
          <div style={{background:"rgba(255,255,255,0.04)",borderRadius:"11px",padding:"10px 13px",marginBottom:"10px"}}>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"3px"}}>📋 الإجراء</div>
            <div style={{fontSize:"13px",color:S.white,fontWeight:"600"}}>{s.action}</div>
          </div>

          {/* مؤشرات */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px"}}>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:"10px",padding:"9px",textAlign:"center"}}>
              <div style={{fontSize:"18px",fontWeight:"900",color:c}}>{s.safetyScore}%</div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",marginTop:"2px"}}>نسبة الأمان</div>
            </div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:"10px",padding:"9px",textAlign:"center"}}>
              <div style={{fontSize:"14px",fontWeight:"900",color:s.profitability==="high"?"#8aab8e":s.profitability==="medium"?"#d4a853":"#e8855a"}}>
                {s.profitability==="high"?"🟢 عالية":s.profitability==="medium"?"🟡 متوسطة":"🔴 منخفضة"}
              </div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",marginTop:"2px"}}>الربحية</div>
            </div>
          </div>

          {/* التأثير المتوقع */}
          <div style={{fontSize:"13px",color:"rgba(255,255,255,0.5)",marginBottom:"12px"}}>
            📈 {s.expectedImpact}
          </div>

          {/* الأزرار */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <button onClick={()=>onBuildCard(s)} style={{
              padding:"11px",borderRadius:"12px",border:`1px solid ${c}35`,
              background:`${c}18`,color:S.white,fontSize:"13px",fontWeight:"700",
              cursor:"pointer",fontFamily:"Cairo,sans-serif",
            }}>🎨 أنشئ البطاقة</button>
            <button onClick={()=>onAddToIdeas(s)} style={{
              padding:"11px",borderRadius:"12px",border:"1px solid rgba(255,255,255,0.15)",
              background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.7)",
              fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif",
            }}>💾 أضف للأفكار</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── محرك Gemini الرئيسي ─────────────────────────────────────

export function GeminiEngine({ products, periods, images, settings, onBuildCard, onAddToIdeas }) {
  const [loading,      setLoading]      = useState(false);
  const [suggestions,  setSuggestions]  = useState([]);
  const [error,        setError]        = useState("");
  const [filter,       setFilter]       = useState("all");
  const [lastAnalysis, setLastAnalysis] = useState(null);

  const data = useMemo(() => buildDataSummary(products, periods), [products, periods]);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuggestions([]);

    try {
      const prompt = buildGeminiPrompt(data);
      const res = await fetch("/api/gemini-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "text" }),
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      // نحلل JSON
      let text = result.text ?? "";
      text = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setSuggestions(parsed.suggestions ?? []);
      setLastAnalysis(new Date().toLocaleTimeString("ar-SA"));
    } catch (e) {
      setError("حدث خطأ في التحليل: " + e.message);
    }
    setLoading(false);
  }, [data]);

  const filtered = filter === "all" ? suggestions
    : suggestions.filter(s => s.urgency === filter || s.type === filter);

  // إحصاءات سريعة
  const urgent = suggestions.filter(s=>s.urgency==="immediate").length;
  const rising = suggestions.filter(s=>s.type==="campaign"||s.type==="reorder").length;
  const slow   = suggestions.filter(s=>s.type==="discount"||s.type==="clear").length;

  return (
    <div>
      {/* Header */}
      <div style={{background:"rgba(168,159,196,0.08)",border:"1px solid rgba(168,159,196,0.2)",borderRadius:"18px",padding:"18px",marginBottom:"14px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
          <div>
            <div style={{fontSize:"17px",fontWeight:"900",color:S.white,marginBottom:"3px"}}>🧠 Gemini</div>
            <div style={{fontSize:"12px",color:"rgba(168,159,196,0.7)"}}>
              {lastAnalysis ? `آخر تحليل: ${lastAnalysis}` : "يحلل بياناتك الحقيقية"}
            </div>
          </div>
          <button onClick={analyze} disabled={loading || products.length === 0} style={{
            padding:"11px 20px",borderRadius:"14px",border:"none",
            background:loading?"rgba(168,159,196,0.2)":"linear-gradient(135deg,#a89fc4,#8b82a8)",
            color:"#ffffff",fontSize:"14px",fontWeight:"900",cursor:loading?"not-allowed":"pointer",
            fontFamily:"Cairo,sans-serif",opacity:products.length===0?0.5:1,
          }}>
            {loading ? "⏳ يحلل…" : "✨ حلّل الآن"}
          </button>
        </div>

        {/* إحصاءات */}
        {suggestions.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
            {[
              ["🔴 عاجل", urgent, "#e8855a"],
              ["📈 صاعد", rising, "#8aab8e"],
              ["💨 تصريف", slow, "#d4a853"],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:`${c}12`,border:`1px solid ${c}25`,borderRadius:"12px",padding:"10px",textAlign:"center"}}>
                <div style={{fontSize:"20px",fontWeight:"900",color:c}}>{v}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"2px"}}>{l}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* خطأ */}
      {error && (
        <div style={{background:"rgba(232,133,90,0.1)",border:"1px solid rgba(232,133,90,0.3)",borderRadius:"13px",padding:"12px 16px",marginBottom:"12px",fontSize:"13px",color:"#e8855a"}}>
          {error}
        </div>
      )}

      {/* فلتر */}
      {suggestions.length > 0 && (
        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px"}}>
          {[["all","الكل"],["immediate","عاجل"],["discount","خصم"],["bundle","كومبو"],["reorder","إعادة طلب"]].map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)} style={{
              padding:"6px 13px",borderRadius:"100px",border:"none",cursor:"pointer",
              fontFamily:"Cairo,sans-serif",fontSize:"12px",fontWeight:"700",
              background:filter===k?"rgba(168,159,196,0.2)":"rgba(255,255,255,0.05)",
              color:filter===k?"#a89fc4":"rgba(255,255,255,0.4)",
              border:filter===k?"1px solid rgba(168,159,196,0.4)":"1px solid rgba(255,255,255,0.08)",
            }}>{l}</button>
          ))}
        </div>
      )}

      {/* الاقتراحات */}
      {filtered.map(s => (
        <SuggestionCard
          key={s.id}
          s={s}
          products={products}
          images={images}
          onBuildCard={onBuildCard}
          onAddToIdeas={onAddToIdeas}
        />
      ))}

      {suggestions.length === 0 && !loading && !error && (
        <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.3)"}}>
          <div style={{fontSize:"40px",marginBottom:"12px"}}>🧠</div>
          <div style={{fontSize:"15px",marginBottom:"6px",color:"rgba(255,255,255,0.5)"}}>
            {products.length === 0 ? "لا توجد بيانات بعد" : "اضغط حلّل الآن"}
          </div>
          <div style={{fontSize:"13px"}}>
            {products.length > 0 ? `${products.length} منتج جاهز للتحليل` : "ارفع فواتير المشتريات والمبيعات أولاً"}
          </div>
        </div>
      )}
    </div>
  );
}
