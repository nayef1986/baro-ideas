// CardBuilder.jsx — منشئ البطاقات مع Gemini + كومبو + حفظ صورة
import { useState, useRef, useCallback } from "react";
import { S, TYPES, fm, fp, fpm } from "./constants.js";

const COMBO_STYLES = [
  { key:"set",       icon:"💎", label:"طقم",        prompt:"flat lay product set arranged elegantly together on clean white background" },
  { key:"flatlay",   icon:"🌿", label:"Flat Lay",   prompt:"aesthetic flat lay arrangement with flowers and decorative elements, soft pastel colors" },
  { key:"lifestyle", icon:"✨", label:"Lifestyle",  prompt:"lifestyle photography with model, natural lighting, modern aesthetic" },
  { key:"dark",      icon:"🔥", label:"دراما",      prompt:"dramatic dark background, cinematic moody lighting, luxury premium aesthetic" },
];

const CARD_STYLES = [
  { key:"studio",    icon:"📸", label:"استوديو",   prompt:"white marble studio photography, clean background, professional lighting" },
  { key:"model",     icon:"👗", label:"موديل",     prompt:"fashion model holding product, lifestyle photography, natural lighting" },
  { key:"lifestyle", icon:"🌿", label:"Lifestyle", prompt:"flat lay aesthetic background, flowers and natural elements" },
  { key:"dramatic",  icon:"🔥", label:"دراما",     prompt:"dramatic dark background, cinematic lighting, luxury feel" },
];

function buildComboPrompt(products, style, title) {
  const s = COMBO_STYLES.find(x=>x.key===style) ?? COMBO_STYLES[0];
  const names = products.filter(Boolean).map(p=>p.name).join(", ");
  return `Professional product photography: ${names}. ${s.prompt}. Instagram ready, high resolution commercial photo. Include all products arranged together as a complete set/bundle. ${title ? `Occasion: ${title}` : ""}`;
}

function buildSinglePrompt(productName, style) {
  const s = CARD_STYLES.find(x=>x.key===style) ?? CARD_STYLES[0];
  return `Professional product photography of ${productName}. ${s.prompt}. Instagram ready, high resolution, commercial quality.`;
}

// ─── منشئ الكومبو ─────────────────────────────────────────────

function ComboBuilder({ products, images, onBack }) {
  const [selected,  setSelected]  = useState([null, null, null]);
  const [style,     setStyle]     = useState("set");
  const [title,     setTitle]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState("");
  const canvasRef = useRef();

  const setProduct = (idx, barcode) => {
    const p = products.find(x=>x.barcode===barcode) ?? null;
    setSelected(prev => { const n=[...prev]; n[idx]=p; return n; });
  };

  const generate = async () => {
    const prods = selected.filter(Boolean);
    if (prods.length < 2) { setError("اختر منتجين على الأقل"); return; }
    setLoading(true); setError(""); setResult(null);

    const prompt = buildComboPrompt(prods, style, title);
    const imgs   = prods.map(p => images?.[p.barcode] ?? null);

    try {
      const res = await fetch("/api/gemini-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageBase64:  imgs[0],
          imageBase64B: imgs[1],
          imageBase64C: imgs[2],
          mode: "image",
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("لم يتم توليد صورة");
      setResult(data.image);
    } catch(e) { setError("خطأ: " + e.message); }
    setLoading(false);
  };

  const saveImage = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `combo-${Date.now()}.jpg`;
    a.click();
  };

  return (
    <div>
      <button onClick={onBack} style={{padding:"8px 16px",borderRadius:"100px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif",marginBottom:"14px"}}>
        ← رجوع
      </button>

      <div style={{fontSize:"15px",fontWeight:"900",color:S.white,marginBottom:"14px"}}>🎁 أنشئ صورة كومبو</div>

      {/* اختيار المنتجات */}
      <div style={{display:"flex",flexDirection:"column",gap:"8px",marginBottom:"14px"}}>
        {[0,1,2].map(idx => (
          <div key={idx}>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"5px"}}>منتج {idx+1} {idx<2?"*":""}</div>
            <select value={selected[idx]?.barcode??""} onChange={e=>setProduct(idx,e.target.value)}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"10px 13px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none"}}>
              <option value="">اختر منتج…</option>
              {products.map(p=><option key={p.barcode} value={p.barcode}>{p.name}</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* عنوان */}
      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"5px"}}>عنوان العرض (اختياري)</div>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="مثال: كومبو رمضان 2026"
          style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"10px 13px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none"}} />
      </div>

      {/* أسلوب الصورة */}
      <div style={{marginBottom:"14px"}}>
        <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>أسلوب الصورة</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px"}}>
          {COMBO_STYLES.map(cs=>(
            <button key={cs.key} onClick={()=>setStyle(cs.key)} style={{
              padding:"10px",borderRadius:"12px",border:"none",cursor:"pointer",
              fontFamily:"Cairo,sans-serif",fontSize:"12px",fontWeight:"700",
              background:style===cs.key?"rgba(168,159,196,0.2)":"rgba(255,255,255,0.04)",
              color:style===cs.key?"#a89fc4":"rgba(255,255,255,0.4)",
              border:style===cs.key?"1px solid rgba(168,159,196,0.4)":"1px solid rgba(255,255,255,0.07)",
              display:"flex",alignItems:"center",gap:"7px",justifyContent:"center",
            }}>
              <span style={{fontSize:"18px"}}>{cs.icon}</span>{cs.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{color:"#e8855a",fontSize:"13px",marginBottom:"10px"}}>{error}</div>}

      <button onClick={generate} disabled={loading} style={{
        width:"100%",padding:"13px",borderRadius:"14px",border:"none",
        background:loading?"rgba(168,159,196,0.1)":"linear-gradient(135deg,#a89fc4,#8b82a8)",
        color:"#ffffff",fontSize:"14px",fontWeight:"900",cursor:loading?"not-allowed":"pointer",
        fontFamily:"Cairo,sans-serif",marginBottom:"14px",opacity:loading?0.7:1,
      }}>
        {loading ? "⏳ Gemini يولّد الصورة…" : "✨ أنشئ صورة الكومبو"}
      </button>

      {result && (
        <div>
          <img src={result} alt="combo" style={{width:"100%",borderRadius:"16px",marginBottom:"12px"}} />
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px"}}>
            <button onClick={saveImage} style={{padding:"12px",borderRadius:"13px",border:"1px solid rgba(37,211,102,0.3)",background:"rgba(37,211,102,0.1)",color:"#25d166",fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
              💾 حفظ الصورة
            </button>
            <button onClick={generate} style={{padding:"12px",borderRadius:"13px",border:"1px solid rgba(168,159,196,0.3)",background:"rgba(168,159,196,0.1)",color:"#a89fc4",fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
              🔄 أعد التوليد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── منشئ البطاقة الفردية ─────────────────────────────────────

export function CardTab({ initType, initProd, products = [], images = {}, periods = [] }) {
  const [view,    setView]    = useState("card"); // card | combo
  const [type,    setType]    = useState(initType ?? "discount");
  const [title,   setTitle]   = useState(initProd ? "خصم خاص — " + initProd.name : "");
  const [expiry,  setExpiry]  = useState("");
  const [oldP,    setOldP]    = useState(String(initProd?.sellPrice ?? ""));
  const [newP,    setNewP]    = useState(initProd ? String((initProd.sellPrice*0.75).toFixed(1)) : "");
  const [imgStyle, setImgStyle] = useState("studio");
  const [loading,  setLoading]  = useState(false);
  const [aiImage,  setAiImage]  = useState(null);
  const [error,    setError]    = useState("");
  const cardRef = useRef();

  const t       = TYPES.find(x=>x.key===type) ?? TYPES[0];
  const oldNum  = parseFloat(oldP)||0;
  const newNum  = parseFloat(newP)||0;
  const disc    = oldNum>0&&newNum>0 ? Math.round((1-newNum/oldNum)*100) : 0;
  const buy     = initProd?.buyPrice ?? 0;
  const profit  = newNum - buy;
  const margin  = buy>0 ? ((newNum-buy)/buy)*100 : 0;
  const tl      = margin>=20?"green":margin>=0?"amber":"red";
  const TLC     = {green:"#8aab8e",amber:"#d4a853",red:"#e8855a"};
  const TLL     = {green:"🟢 آمن",amber:"🟡 هامش ضعيف",red:"🔴 خطر"};

  const generateAI = async () => {
    setLoading(true); setError(""); setAiImage(null);
    const prompt = buildSinglePrompt(initProd?.name ?? title, imgStyle);
    const imageBase64 = initProd?.barcode ? images?.[initProd.barcode] ?? null : null;
    try {
      const res = await fetch("/api/gemini-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageBase64, mode: "image" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.image) throw new Error("لم يتم توليد صورة");
      setAiImage(data.image);
    } catch(e) { setError("خطأ: " + e.message); }
    setLoading(false);
  };

  const saveCard = async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#0d0b06" });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/jpeg", 0.9);
      a.download = `card-${Date.now()}.jpg`;
      a.click();
    } catch {
      alert("لتحميل البطاقة استخدم لقطة الشاشة");
    }
  };

  if (view === "combo") return <ComboBuilder products={products} images={images} onBack={()=>setView("card")} />;

  const inp = (val, set, label, ph, type_="text") => (
    <div>
      <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"5px"}}>{label}</div>
      <input type={type_} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
        style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"10px 13px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none"}} />
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>

      {/* زر الكومبو */}
      <button onClick={()=>setView("combo")} style={{width:"100%",padding:"12px",borderRadius:"14px",border:"1px solid rgba(212,168,83,0.3)",background:"rgba(212,168,83,0.08)",color:S.gold,fontSize:"14px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
        🎁 أنشئ صورة كومبو (3 منتجات)
      </button>

      {/* نوع العرض */}
      <div style={{background:S.card,border:"1px solid "+S.border,borderRadius:S.rs,padding:"16px"}}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"rgba(212,168,83,0.6)",marginBottom:"11px"}}>نوع العرض</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"7px"}}>
          {TYPES.map(ot=>(
            <button key={ot.key} onClick={()=>setType(ot.key)} style={{
              padding:"10px 4px",borderRadius:"12px",cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:"11px",fontWeight:"700",
              background:type===ot.key?ot.color+"20":"rgba(255,255,255,0.04)",
              color:type===ot.key?ot.color:"rgba(255,255,255,0.35)",
              border:type===ot.key?"1px solid "+ot.color+"45":"1px solid rgba(255,255,255,0.07)",
              display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",
            }}>
              <span style={{fontSize:"20px"}}>{ot.icon}</span>{ot.label}
            </button>
          ))}
        </div>
      </div>

      {/* التفاصيل */}
      <div style={{background:S.card,border:"1px solid "+S.border,borderRadius:S.rs,padding:"16px",display:"flex",flexDirection:"column",gap:"11px"}}>
        <div style={{fontSize:"12px",fontWeight:"700",color:"rgba(212,168,83,0.6)"}}>✏️ تفاصيل العرض</div>
        {inp(title, setTitle, "العنوان *", "اكتب عنوان العرض")}
        {inp(expiry, setExpiry, "تاريخ الانتهاء", "مثال: 30 مايو 2026")}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"9px"}}>
          {inp(oldP, setOldP, "السعر القديم ﷼", "0", "number")}
          {inp(newP, setNewP, "السعر الجديد ﷼", "0", "number")}
        </div>
      </div>

      {/* حاسبة الربح */}
      {oldNum>0&&newNum>0&&buy>0 && (
        <div style={{padding:"15px",borderRadius:"14px",background:TLC[tl]+"08",border:"1px solid "+TLC[tl]+"25"}}>
          <div style={{fontSize:"14px",fontWeight:"900",color:TLC[tl],marginBottom:"11px"}}>{TLL[tl]}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"7px"}}>
            {[["سعر الشراء",buy+" ﷼","rgba(255,255,255,0.45)"],["الربح",profit.toFixed(1)+" ﷼",TLC[tl]],["الهامش",margin.toFixed(1)+"%",TLC[tl]]].map(([l,v,c])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:"10px",padding:"9px",textAlign:"center"}}>
                <div style={{fontSize:"14px",fontWeight:"900",color:c}}>{v}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",marginTop:"2px"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gemini صورة */}
      <div style={{background:"rgba(168,159,196,0.06)",border:"1px solid rgba(168,159,196,0.2)",borderRadius:S.rs,padding:"16px"}}>
        <div style={{fontSize:"13px",fontWeight:"700",color:"#a89fc4",marginBottom:"11px"}}>🤖 Gemini يصمم صورة</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"7px",marginBottom:"12px"}}>
          {CARD_STYLES.map(cs=>(
            <button key={cs.key} onClick={()=>setImgStyle(cs.key)} style={{
              padding:"9px",borderRadius:"11px",cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:"12px",fontWeight:"700",
              background:imgStyle===cs.key?"rgba(168,159,196,0.2)":"rgba(255,255,255,0.04)",
              color:imgStyle===cs.key?"#a89fc4":"rgba(255,255,255,0.35)",
              border:imgStyle===cs.key?"1px solid rgba(168,159,196,0.4)":"1px solid rgba(255,255,255,0.07)",
              display:"flex",alignItems:"center",gap:"6px",justifyContent:"center",
            }}>
              <span style={{fontSize:"16px"}}>{cs.icon}</span>{cs.label}
            </button>
          ))}
        </div>
        <button onClick={generateAI} disabled={loading} style={{
          width:"100%",padding:"12px",borderRadius:"13px",border:"none",
          background:loading?"rgba(168,159,196,0.1)":"linear-gradient(135deg,#a89fc4,#8b82a8)",
          color:"#ffffff",fontSize:"13px",fontWeight:"900",cursor:loading?"not-allowed":"pointer",
          fontFamily:"Cairo,sans-serif",opacity:loading?0.7:1,
        }}>
          {loading ? "⏳ يولّد…" : "✨ أنشئ الصورة"}
        </button>
        {error && <div style={{color:"#e8855a",fontSize:"12px",marginTop:"8px"}}>{error}</div>}
        {aiImage && (
          <div style={{marginTop:"12px"}}>
            <img src={aiImage} alt="AI" style={{width:"100%",borderRadius:"13px",marginBottom:"10px"}} />
            <button onClick={()=>{const a=document.createElement("a");a.href=aiImage;a.download="product-ai-"+Date.now()+".jpg";a.click();}}
              style={{width:"100%",padding:"11px",borderRadius:"12px",border:"1px solid rgba(37,211,102,0.3)",background:"rgba(37,211,102,0.1)",color:"#25d166",fontSize:"13px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
              💾 حفظ الصورة
            </button>
          </div>
        )}
      </div>

      {/* أنشئ البطاقة */}
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}>
        <div style={{fontSize:"12px",color:"rgba(212,168,83,0.5)",fontWeight:"700"}}>أنشئ البطاقة</div>
        <div ref={cardRef} style={{width:"100%",maxWidth:"320px",background:"#0d0b06",borderRadius:"20px",overflow:"hidden",border:`1.5px solid ${t.color}28`}}>
          <div style={{background:`linear-gradient(135deg,${t.color}ee,${t.color}99)`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <span style={{fontSize:"22px"}}>{t.icon}</span>
              <span style={{fontSize:"17px",fontWeight:"900",color:"#0a0804"}}>{t.label}</span>
            </div>
            <span style={{fontSize:"12px",color:"rgba(10,8,4,0.5)"}}>البارو</span>
          </div>
          {aiImage ? (
            <img src={aiImage} alt="product" style={{width:"100%",height:"140px",objectFit:"cover"}} />
          ) : (
            <div style={{height:"100px",display:"flex",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.1)",fontSize:"28px"}}>📷</div>
          )}
          <div style={{padding:"14px 16px 12px"}}>
            <div style={{fontSize:"17px",fontWeight:"900",color:S.white,lineHeight:"1.3",marginBottom:"10px"}}>{title||"عنوان العرض"}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                {oldNum>0&&<div style={{fontSize:"12px",color:"rgba(255,255,255,0.3)",textDecoration:"line-through",marginBottom:"3px"}}>{oldNum} ﷼</div>}
                <div style={{fontSize:"26px",fontWeight:"900",color:t.color}}>{newNum||"—"} <span style={{fontSize:"13px"}}>﷼</span></div>
              </div>
              {disc>0&&<div style={{background:`linear-gradient(135deg,${t.color},${t.color}99)`,borderRadius:"12px",padding:"8px 14px",textAlign:"center",color:"#0a0804",fontWeight:"900"}}>
                <div style={{fontSize:"20px",lineHeight:1}}>{disc}%</div>
                <div style={{fontSize:"9px",marginTop:"1px"}}>خصم</div>
              </div>}
            </div>
            {expiry&&<div style={{padding:"8px 0 0",fontSize:"12px",color:"rgba(255,255,255,0.3)",display:"flex",gap:"6px"}}><span>⏰</span><span>ينتهي: {expiry}</span></div>}
          </div>
        </div>
        <button onClick={saveCard} style={{width:"100%",maxWidth:"320px",padding:"13px",borderRadius:"14px",border:"none",background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",fontSize:"14px",fontWeight:"900",cursor:"pointer",fontFamily:"Cairo,sans-serif",boxShadow:"0 4px 20px rgba(212,168,83,0.3)"}}>
          🖨️ حفظ البطاقة كصورة
        </button>
      </div>
    </div>
  );
}
