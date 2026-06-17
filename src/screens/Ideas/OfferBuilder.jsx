// OfferBuilder.jsx — منشئ العروض الاحترافي
// 3 مراحل: اختيار المنتجات (من الاحتياج) → نوع العرض → البطاقة النهائية (صورة)
import { useState, useRef, useMemo, useEffect } from "react";
import { S, fm, fpm } from "./constants.js";

const factoryOf = bc => (bc ?? "").match(/^(\d{5})/)?.[1] ?? "";

// تحميل مكتبة عبر script
function loadScript(src, globalName) {
  return new Promise((resolve, reject) => {
    if (window[globalName]) return resolve(window[globalName]);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(window[globalName]);
    s.onerror = () => reject(new Error("فشل التحميل"));
    document.head.appendChild(s);
  });
}

// أنواع العروض
const OFFER_TYPES = [
  { key:"discount",  icon:"🔥", label:"خصم مباشر",        color:"#e8855a", needs:"pct",   hint:"خصم % على المنتج" },
  { key:"free",      icon:"🎁", label:"قطعة مجانية",       color:"#8aab8e", needs:"none",  hint:"اشترِ واحدة والثانية هدية" },
  { key:"second",    icon:"💝", label:"الثانية بخصم",      color:"#d4a853", needs:"pct",   hint:"الأولى كامل والثانية بخصم %" },
  { key:"buy3",      icon:"⭐", label:"3 قطع بخصم",        color:"#c9a96e", needs:"pct",   hint:"3 من نفس المنتج/المصنع بخصم %" },
  { key:"mix",       icon:"🔀", label:"حبة + حبة بخصم",     color:"#6366f1", needs:"pct",   hint:"منتج من مصنع + منتج من مصنع آخر بخصم %" },
  { key:"bundle",    icon:"📦", label:"كومبو بسعر",        color:"#a89fc4", needs:"price", hint:"حزمة منتجات بسعر ثابت" },
];

export function OfferBuilder({ products = [], periods = [], images = {}, settings = {} }) {
  const [step, setStep] = useState(1);          // 1 اختيار · 2 نوع · 3 بطاقة
  const [selected, setSelected] = useState([]); // باركودات مختارة
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("weak");  // weak | strong
  const [offerType, setOfferType] = useState(null);
  const [pct, setPct] = useState(20);
  const [bundlePrice, setBundlePrice] = useState(0);
  const [title, setTitle] = useState("");

  // قائمة المنتجات (الأضعف/الأقوى أداءً)
  const list = useMemo(() => {
    let l = products.filter(p => (p.qty ?? 0) > 0);
    if (search) l = l.filter(p => p.name?.includes(search) || p.barcode?.includes(search));
    return [...l].sort((a,b) => sortBy === "weak" ? a.soldPct - b.soldPct : b.soldPct - a.soldPct);
  }, [products, search, sortBy]);

  const selectedProducts = useMemo(
    () => selected.map(bc => products.find(p => p.barcode === bc)).filter(Boolean),
    [selected, products]
  );

  const toggle = (bc) => setSelected(s => s.includes(bc) ? s.filter(x=>x!==bc) : [...s, bc]);

  // ─── المرحلة 1: اختيار المنتجات ───
  if (step === 1) {
    return (
      <div>
        <Header step={1} />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 بحث بالاسم أو الباركود…"
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"10px 14px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none",marginBottom:"10px"}} />
        <div style={{display:"flex",gap:"6px",marginBottom:"12px"}}>
          {[["weak","🔴 الأضعف أداءً"],["strong","🟢 الأقوى أداءً"]].map(([k,l])=>(
            <button key={k} onClick={()=>setSortBy(k)} style={{
              flex:1,padding:"8px",borderRadius:"11px",cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:"12px",fontWeight:"700",
              background:sortBy===k?"rgba(212,168,83,0.2)":"rgba(255,255,255,0.05)",
              color:sortBy===k?S.gold:"rgba(255,255,255,0.4)",
              border:sortBy===k?"1px solid rgba(212,168,83,0.4)":"1px solid rgba(255,255,255,0.08)",
            }}>{l}</button>
          ))}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"80px"}}>
          {list.slice(0,60).map(p => {
            const on = selected.includes(p.barcode);
            const perfColor = p.soldPct>60?"#8aab8e":p.soldPct>30?"#d4a853":"#e8855a";
            const img = images?.[p.barcode];
            return (
              <div key={p.barcode} onClick={()=>toggle(p.barcode)} style={{
                display:"flex",alignItems:"center",gap:"12px",padding:"10px 12px",
                background:on?"rgba(212,168,83,0.12)":"rgba(255,255,255,0.04)",
                border:on?"1px solid rgba(212,168,83,0.5)":"1px solid rgba(255,255,255,0.07)",
                borderRadius:"14px",cursor:"pointer",
              }}>
                <div style={{width:"24px",height:"24px",borderRadius:"7px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                  background:on?S.gold:"rgba(255,255,255,0.08)",color:on?"#0a0804":"transparent",fontSize:"14px",fontWeight:"900"}}>✓</div>
                {img
                  ? <img src={img} alt="" style={{width:"46px",height:"46px",borderRadius:"10px",objectFit:"cover",flexShrink:0}} />
                  : <div style={{width:"46px",height:"46px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>📦</div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"13px",fontWeight:"700",color:S.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                  <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace"}}>{p.barcode}</div>
                </div>
                <div style={{textAlign:"left",flexShrink:0}}>
                  <div style={{fontSize:"13px",fontWeight:"900",color:perfColor}}>{Math.round(p.soldPct)}%</div>
                  <div style={{fontSize:"9px",color:"rgba(255,255,255,0.3)"}}>{fm(p.closing)} متبقي</div>
                </div>
              </div>
            );
          })}
        </div>

        {selected.length > 0 && (
          <div style={{position:"fixed",bottom:"80px",left:0,right:0,padding:"0 16px",maxWidth:"440px",margin:"0 auto",zIndex:40}}>
            <button onClick={()=>setStep(2)} style={{width:"100%",padding:"15px",borderRadius:"14px",border:"none",
              background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",fontSize:"15px",fontWeight:"900",cursor:"pointer",
              fontFamily:"Cairo,sans-serif",boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
              التالي — اختر نوع العرض ({selected.length}) ←
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── المرحلة 2: نوع العرض ───
  if (step === 2) {
    return (
      <div>
        <Header step={2} onBack={()=>setStep(1)} />
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.5)",marginBottom:"12px"}}>اخترت {selected.length} منتج · اختر نوع العرض:</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"16px"}}>
          {OFFER_TYPES.map(t => {
            const on = offerType === t.key;
            return (
              <button key={t.key} onClick={()=>setOfferType(t.key)} style={{
                padding:"14px 10px",borderRadius:"14px",cursor:"pointer",fontFamily:"Cairo,sans-serif",textAlign:"center",
                background:on?`${t.color}20`:"rgba(255,255,255,0.04)",
                border:on?`1px solid ${t.color}`:"1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{fontSize:"26px",marginBottom:"4px"}}>{t.icon}</div>
                <div style={{fontSize:"13px",fontWeight:"900",color:on?t.color:S.white}}>{t.label}</div>
                <div style={{fontSize:"9px",color:"rgba(255,255,255,0.4)",marginTop:"2px",lineHeight:1.3}}>{t.hint}</div>
              </button>
            );
          })}
        </div>

        {/* مدخلات حسب النوع */}
        {offerType && (() => {
          const t = OFFER_TYPES.find(x=>x.key===offerType);
          return (
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"14px",padding:"14px",marginBottom:"16px"}}>
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="عنوان العرض (اختياري)…"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"10px",padding:"9px 12px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none",marginBottom:"12px"}} />
              {t.needs === "pct" && (
                <div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:"6px"}}>
                    <span style={{fontSize:"13px",color:"rgba(255,255,255,0.6)"}}>نسبة الخصم</span>
                    <span style={{fontSize:"16px",fontWeight:"900",color:t.color}}>{pct}%</span>
                  </div>
                  <input type="range" min={5} max={70} step={5} value={pct} onChange={e=>setPct(Number(e.target.value))} style={{width:"100%",accentColor:t.color}} />
                </div>
              )}
              {t.needs === "price" && (
                <div>
                  <div style={{fontSize:"13px",color:"rgba(255,255,255,0.6)",marginBottom:"6px"}}>سعر الكومبو (﷼)</div>
                  <input type="number" value={bundlePrice} onChange={e=>setBundlePrice(Number(e.target.value))} placeholder="السعر الإجمالي…"
                    style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"10px",padding:"10px 12px",color:S.white,fontSize:"15px",fontWeight:"900",fontFamily:"Cairo,sans-serif",outline:"none"}} />
                </div>
              )}
              {t.needs === "none" && (
                <div style={{fontSize:"12px",color:"rgba(138,171,142,0.8)",textAlign:"center",padding:"4px"}}>🎁 اشترِ قطعة واحصل على الثانية مجاناً</div>
              )}
            </div>
          );
        })()}

        {offerType && (
          <button onClick={()=>setStep(3)} style={{width:"100%",padding:"15px",borderRadius:"14px",border:"none",
            background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",fontSize:"15px",fontWeight:"900",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
            عرض البطاقة النهائية ←
          </button>
        )}
      </div>
    );
  }

  // ─── المرحلة 3: البطاقة النهائية ───
  return (
    <OfferCard
      products={selectedProducts}
      images={images}
      offerType={OFFER_TYPES.find(t=>t.key===offerType)}
      pct={pct}
      bundlePrice={bundlePrice}
      title={title}
      settings={settings}
      onBack={()=>setStep(2)}
    />
  );
}

// ─── الهيدر المشترك مع خطوات ───
function Header({ step, onBack }) {
  return (
    <div style={{marginBottom:"14px"}}>
      {onBack && (
        <button onClick={onBack} style={{padding:"7px 15px",borderRadius:"100px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",fontSize:"12px",cursor:"pointer",fontFamily:"Cairo,sans-serif",marginBottom:"12px"}}>← رجوع</button>
      )}
      <div style={{display:"flex",gap:"6px",marginBottom:"4px"}}>
        {[1,2,3].map(n => (
          <div key={n} style={{flex:1,height:"4px",borderRadius:"2px",background:n<=step?S.gold:"rgba(255,255,255,0.1)"}} />
        ))}
      </div>
      <div style={{fontSize:"11px",color:"rgba(212,168,83,0.7)"}}>
        {step===1?"الخطوة 1 من 3 — اختر المنتجات":step===2?"الخطوة 2 من 3 — نوع العرض":"الخطوة 3 من 3 — البطاقة"}
      </div>
    </div>
  );
}

// ─── البطاقة النهائية (صورة) ───
function OfferCard({ products, images, offerType, pct, bundlePrice, title, settings, onBack }) {
  const cardRef = useRef();
  const [saving, setSaving] = useState(false);

  // حساب الأسعار: كان → صار
  const calc = useMemo(() => {
    const totalOld = products.reduce((s,p)=>s+Number(p.sellPrice??0),0);
    let totalNew = totalOld;
    let badge = "";
    switch (offerType?.key) {
      case "discount":
        totalNew = totalOld * (1 - pct/100); badge = `خصم ${pct}%`; break;
      case "free":
        // اشترِ واحدة والثانية مجاناً (نفترض قطعتين من الأرخص مجانية)
        totalNew = totalOld; // السعر نفسه، القيمة المجانية إضافية
        badge = "قطعة مجانية 🎁"; break;
      case "second": {
        const sorted = [...products].sort((a,b)=>Number(b.sellPrice)-Number(a.sellPrice));
        const second = Number(sorted[1]?.sellPrice ?? 0);
        totalNew = totalOld - (second * pct/100); badge = `الثانية بخصم ${pct}%`; break;
      }
      case "buy3":
        totalNew = totalOld * (1 - pct/100); badge = `3 قطع بخصم ${pct}%`; break;
      case "mix":
        totalNew = totalOld * (1 - pct/100); badge = `حبة + حبة بخصم ${pct}%`; break;
      case "bundle":
        totalNew = bundlePrice > 0 ? bundlePrice : totalOld; badge = "كومبو"; break;
      default: break;
    }
    const saved = Math.max(0, totalOld - totalNew);
    return { totalOld, totalNew, saved, badge };
  }, [products, offerType, pct, bundlePrice]);

  const saveCard = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const html2canvas = await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "html2canvas");
      const canvas = await html2canvas(cardRef.current, { scale:2, backgroundColor:"#0d0b06", useCORS:true });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/jpeg", 0.92);
      a.download = `offer-${Date.now()}.jpg`;
      a.click();
    } catch { alert("استخدم لقطة الشاشة"); }
    setSaving(false);
  };

  const color = offerType?.color ?? "#d4a853";

  return (
    <div>
      <Header step={3} onBack={onBack} />

      {/* البطاقة القابلة للحفظ */}
      <div ref={cardRef} style={{background:"#0d0b06",borderRadius:"20px",overflow:"hidden",border:`1px solid ${color}40`,marginBottom:"14px"}}>
        {/* شريط العرض */}
        <div style={{background:`linear-gradient(135deg,${color},${color}aa)`,padding:"16px",textAlign:"center"}}>
          <div style={{fontSize:"28px"}}>{offerType?.icon}</div>
          <div style={{fontSize:"20px",fontWeight:"900",color:"#fff",marginTop:"2px"}}>{title || offerType?.label}</div>
          <div style={{fontSize:"13px",color:"rgba(255,255,255,0.85)",fontWeight:"700",marginTop:"2px"}}>{calc.badge}</div>
        </div>

        {/* المنتجات */}
        <div style={{padding:"14px"}}>
          {products.map((p,i) => {
            const img = images?.[p.barcode];
            const factory = factoryOf(p.barcode);
            const container = p.purchases?.slice(-1)[0]?.container ?? p.container ?? "";
            return (
              <div key={p.barcode} style={{display:"flex",gap:"12px",alignItems:"center",padding:"10px 0",borderBottom:i<products.length-1?"1px solid rgba(255,255,255,0.06)":"none"}}>
                {img
                  ? <img src={img} alt="" style={{width:"64px",height:"64px",borderRadius:"12px",objectFit:"cover",flexShrink:0,border:`1px solid ${color}30`}} />
                  : <div style={{width:"64px",height:"64px",borderRadius:"12px",background:"rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"26px",flexShrink:0}}>📦</div>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"14px",fontWeight:"700",color:S.white,lineHeight:1.3}}>{p.name}</div>
                  <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",fontFamily:"monospace",marginTop:"2px"}}>{p.barcode}</div>
                  <div style={{display:"flex",gap:"8px",marginTop:"3px",flexWrap:"wrap"}}>
                    <span style={{fontSize:"10px",color:"rgba(212,168,83,0.7)"}}>🏭 {factory}</span>
                    {container && <span style={{fontSize:"10px",color:"rgba(99,162,241,0.7)"}}>📦 {container}</span>}
                  </div>
                </div>
                <div style={{textAlign:"left",flexShrink:0}}>
                  <div style={{fontSize:"14px",fontWeight:"900",color:S.gold}}>{fm(p.sellPrice)} ﷼</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* كان → صار */}
        <div style={{margin:"0 14px 14px",background:`${color}12`,border:`1px solid ${color}30`,borderRadius:"14px",padding:"14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",textDecoration:"line-through"}}>كان {fm(calc.totalOld)} ﷼</div>
              <div style={{fontSize:"24px",fontWeight:"900",color}}>صار {fm(calc.totalNew)} ﷼</div>
            </div>
            {calc.saved > 0 && (
              <div style={{textAlign:"center",background:`${color}25`,borderRadius:"12px",padding:"8px 14px"}}>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.6)"}}>توفّر</div>
                <div style={{fontSize:"18px",fontWeight:"900",color:"#8aab8e"}}>{fm(calc.saved)} ﷼</div>
              </div>
            )}
          </div>
        </div>

        {/* فوتر */}
        <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.06)",textAlign:"center"}}>
          <div style={{fontSize:"15px",fontWeight:"900",color:S.gold,letterSpacing:"2px"}}>ALBAROO</div>
        </div>
      </div>

      <button onClick={saveCard} disabled={saving} style={{width:"100%",padding:"14px",borderRadius:"14px",border:"none",
        background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",fontSize:"15px",fontWeight:"900",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
        {saving ? "⏳ جاري الحفظ…" : "🖼️ حفظ العرض كصورة"}
      </button>
    </div>
  );
}
