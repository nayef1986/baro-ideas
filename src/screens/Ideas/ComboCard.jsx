// ComboCard.jsx — بطاقة الكومبو (نسختين: زبون/تشغيلية) حجم استوري + باركود
import { useState, useRef, useEffect } from "react";
import { S, fm, fpm } from "./constants.js";
import { genComboBarcode } from "./ComboEngine.jsx";

// تحميل مكتبة عبر script (الطريقة الصحيحة للمتصفح)
function loadScript(src, globalName) {
  return new Promise((resolve, reject) => {
    if (window[globalName]) return resolve(window[globalName]);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(window[globalName]);
    s.onerror = () => reject(new Error("فشل تحميل المكتبة"));
    document.head.appendChild(s);
  });
}

const factoryOf = bc => (bc ?? "").match(/^(\d{5})/)?.[1] ?? "";

export function ComboCard({ combo, images = {}, onBack }) {
  const [mode, setMode]   = useState("customer"); // customer | internal
  const [title, setTitle] = useState("كومبو مميّز");
  const [comboCode] = useState(() => genComboBarcode());
  const [saving, setSaving] = useState(false);
  const cardRef = useRef();
  const barcodeRef = useRef();

  const items = combo?.items ?? [];

  // نرسم الباركود
  useEffect(() => {
    let cancelled = false;
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js", "JsBarcode")
      .then(JsBarcode => {
        if (cancelled || !barcodeRef.current || !JsBarcode) return;
        JsBarcode(barcodeRef.current, comboCode, {
          format: "CODE128", width: 2.5, height: 60,
          displayValue: true, fontSize: 16, margin: 8,
          background: "#ffffff", lineColor: "#000000",
        });
      }).catch(()=>{});
    return () => { cancelled = true; };
  }, [comboCode, mode]);

  const saveImg = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const html2canvas = await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js", "html2canvas");
      const canvas = await html2canvas(cardRef.current, { scale: 2, backgroundColor: "#0d0b06", useCORS: true });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/jpeg", 0.92);
      a.download = `combo-${mode}-${comboCode}.jpg`;
      a.click();
    } catch { alert("تعذّر الحفظ — استخدم لقطة الشاشة"); }
    setSaving(false);
  };

  if (!combo) return null;

  const oldTotal = combo.totalSell;
  const newPrice = combo.comboPrice;

  return (
    <div>
      {/* أزرار التحكم */}
      <button onClick={onBack} style={{padding:"8px 16px",borderRadius:"100px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif",marginBottom:"12px"}}>← رجوع</button>

      {/* اسم العرض */}
      <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="اسم العرض"
        style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"11px 14px",color:S.white,fontSize:"14px",fontFamily:"Cairo,sans-serif",outline:"none",marginBottom:"12px"}} />

      {/* تبديل النسخة */}
      <div style={{display:"flex",gap:"6px",marginBottom:"14px",background:"rgba(255,255,255,0.04)",borderRadius:"14px",padding:"4px"}}>
        {[["customer","👤 للزبون"],["internal","🔒 تشغيلية"]].map(([k,l])=>(
          <button key={k} onClick={()=>setMode(k)} style={{
            flex:1,padding:"9px",borderRadius:"11px",border:"none",cursor:"pointer",
            fontFamily:"Cairo,sans-serif",fontSize:"13px",fontWeight:"700",
            background:mode===k?"rgba(212,168,83,0.15)":"transparent",
            color:mode===k?"#d4a853":"rgba(255,255,255,0.35)",
            border:mode===k?"1px solid rgba(212,168,83,0.3)":"1px solid transparent",
          }}>{l}</button>
        ))}
      </div>

      {/* البطاقة — حجم استوري 9:16 */}
      <div ref={cardRef} style={{
        width:"100%", aspectRatio:"9/16", background:"linear-gradient(160deg,#15110a,#0a0804)",
        borderRadius:"20px", overflow:"hidden", border:"1px solid rgba(212,168,83,0.2)",
        display:"flex", flexDirection:"column", padding:"22px 18px", position:"relative",
      }}>
        {/* العنوان */}
        <div style={{textAlign:"center",marginBottom:"14px"}}>
          <div style={{fontSize:"11px",color:"rgba(212,168,83,0.6)",fontWeight:"700",letterSpacing:"2px"}}>البارو</div>
          <div style={{fontSize:"24px",fontWeight:"900",color:"#ffffff",marginTop:"4px",lineHeight:1.2}}>{title}</div>
          {mode==="customer" && combo.maxSafeDisc>0 && (
            <div style={{display:"inline-block",marginTop:"10px",background:"linear-gradient(135deg,#e8855a,#d4a853)",color:"#0a0804",fontSize:"20px",fontWeight:"900",padding:"6px 18px",borderRadius:"100px"}}>
              خصم {combo.maxSafeDisc}%
            </div>
          )}
        </div>

        {/* المنتجات */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:"10px",overflow:"hidden"}}>
          {items.map((p,i)=>(
            <div key={i} style={{display:"flex",gap:"11px",alignItems:"center",background:"rgba(255,255,255,0.04)",borderRadius:"14px",padding:"10px"}}>
              {/* صورة */}
              <div style={{width:"58px",height:"58px",borderRadius:"11px",background:"rgba(255,255,255,0.05)",flexShrink:0,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {images?.[p.barcode] ? <img src={images[p.barcode]} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:"24px"}}>📦</span>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"14px",fontWeight:"700",color:"#ffffff",lineHeight:1.3}}>{p.name?.slice(0,30)}</div>
                {mode==="internal" ? (
                  <>
                    <div style={{fontSize:"10px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace",marginTop:"3px"}}>{p.barcode}</div>
                    <div style={{display:"flex",gap:"8px",marginTop:"2px",flexWrap:"wrap"}}>
                      <span style={{fontSize:"10px",color:"rgba(212,168,83,0.7)"}}>🏭 {factoryOf(p.barcode)}</span>
                      {p.container && <span style={{fontSize:"10px",color:"rgba(99,162,241,0.7)"}}>📦 {p.container}</span>}
                    </div>
                    <div style={{display:"flex",gap:"7px",marginTop:"3px"}}>
                      <span style={{fontSize:"10px",color:"rgba(255,255,255,0.5)"}}>جاء {fm(p.qty??0)}</span>
                      <span style={{fontSize:"10px",color:"#8aab8e"}}>باع {fm(Math.round((p.qty??0)*(p.soldPct??0)/100))}</span>
                      <span style={{fontSize:"10px",color:"#e8855a"}}>باقي {fm(p.closing??0)}</span>
                    </div>
                  </>
                ) : (
                  <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginTop:"3px"}}>{p.sellPrice} ﷼</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* السعر */}
        <div style={{textAlign:"center",margin:"14px 0"}}>
          {mode==="customer" && <div style={{fontSize:"15px",color:"rgba(255,255,255,0.3)",textDecoration:"line-through"}}>{oldTotal} ﷼</div>}
          <div style={{fontSize:"34px",fontWeight:"900",color:"#d4a853"}}>{newPrice} <span style={{fontSize:"16px"}}>﷼</span></div>
          {mode==="internal" && (
            <div style={{display:"flex",justifyContent:"center",gap:"14px",marginTop:"6px"}}>
              <span style={{fontSize:"12px",color:"#8aab8e"}}>ربح {fpm(combo.profit)}</span>
              <span style={{fontSize:"12px",color:"#a89fc4"}}>هامش {combo.margin.toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* باركود الكومبو */}
        <div style={{background:"#ffffff",borderRadius:"12px",padding:"10px",display:"flex",flexDirection:"column",alignItems:"center"}}>
          <svg ref={barcodeRef}></svg>
        </div>
      </div>

      {/* حفظ */}
      <button onClick={saveImg} disabled={saving} style={{
        width:"100%",padding:"14px",borderRadius:"14px",border:"none",marginTop:"14px",
        background:saving?"rgba(212,168,83,0.3)":"linear-gradient(135deg,#d4a853,#b8935a)",
        color:"#0a0804",fontSize:"14px",fontWeight:"900",cursor:saving?"wait":"pointer",fontFamily:"Cairo,sans-serif",
      }}>
        {saving ? "⏳ جاري الحفظ…" : `💾 حفظ ${mode==="customer"?"بطاقة الزبون":"البطاقة التشغيلية"}`}
      </button>
      <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)",textAlign:"center",marginTop:"8px"}}>
        باركود الكومبو: <span style={{fontFamily:"monospace",color:"#d4a853"}}>{comboCode}</span> — سجّله في Odoo
      </div>
    </div>
  );
}
