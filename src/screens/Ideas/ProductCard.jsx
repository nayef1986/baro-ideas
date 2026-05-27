// ProductCard.jsx — بطاقة المنتج الكاملة
import { useState, useRef, useMemo } from "react";
import { S, fm, fp, fpm } from "./constants.js";

function MiniChart({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:"2px",height:"32px"}}>
      {data.map((v,i) => (
        <div key={i} style={{
          flex:1, borderRadius:"3px 3px 0 0",
          background: i===data.length-1 ? color : `${color}55`,
          height: `${(v/max)*100}%`, minHeight: v>0?"2px":"0",
          transition:"height 0.3s",
        }} />
      ))}
    </div>
  );
}

function ProductDetailCard({ product, periods, images, onClose, onSaveImage }) {
  const cardRef = useRef();

  const monthly = useMemo(() => {
    const sorted = [...periods].sort((a,b)=>
      (a.uploadDate??a.label)>(b.uploadDate??b.label)?1:-1
    );
    return sorted.slice(-6).map(per => ({
      label: per.label?.slice(0,6),
      qty: Object.values(per.sales??{}).reduce((s,b)=>
        s+Number(b[product.barcode]?.qty??0),0),
    }));
  }, [product, periods]);

  const totalSold  = monthly.reduce((s,m)=>s+m.qty,0);
  const lastMonth  = monthly[monthly.length-1]?.qty ?? 0;
  const prevMonth  = monthly[monthly.length-2]?.qty ?? 0;
  const growth     = prevMonth>0 ? ((lastMonth-prevMonth)/prevMonth)*100 : 0;
  const margin     = product.buyPrice>0 ? ((product.sellPrice-product.buyPrice)/product.buyPrice)*100 : 0;
  const frozenVal  = product.closing * product.buyPrice;
  const factoryCode = product.barcode?.match(/^(\d+)/)?.[1]?.slice(0,5) ?? "";

  const perfColor  = product.soldPct > 60 ? "#8aab8e" : product.soldPct > 30 ? "#d4a853" : "#e8855a";
  const perfLabel  = product.soldPct > 60 ? "🟢 ممتاز" : product.soldPct > 30 ? "🟡 متوسط" : "🔴 ضعيف";

  const saveCard = async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      const canvas = await html2canvas(cardRef.current, { scale:2, backgroundColor:"#0d0b06", useCORS:true });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/jpeg", 0.92);
      a.download = `product-${product.barcode}-${Date.now()}.jpg`;
      a.click();
    } catch { alert("استخدم لقطة الشاشة"); }
  };

  const copyIT = () => {
    const container = product.purchases?.slice(-1)[0]?.container ?? product.container ?? "";
    const text = [
      `📦 بيانات المنتج — البارو`,
      `━━━━━━━━━━━━━━━━━`,
      `الاسم: ${product.name}`,
      `الباركود: ${product.barcode}`,
      `رقم المصنع: ${factoryCode}`,
      `الكونتينر: ${container}`,
      `سعر الشراء: ${product.buyPrice} ﷼`,
      `سعر البيع: ${product.sellPrice} ﷼`,
      `الهامش: ${margin.toFixed(1)}%`,
      `المخزون المتبقي: ${fm(product.closing)} قطعة`,
      `نسبة المبيعات: ${Math.round(product.soldPct)}%`,
      `━━━━━━━━━━━━━━━━━`,
      img ? `🖼️ الصورة: موجودة` : `🖼️ الصورة: غير مرفوعة`,
      ``,
      `للبحث في النظام: ${product.barcode}`,
    ].join('\n');
    navigator.clipboard.writeText(text)
      .then(()=>alert("✅ تم نسخ بيانات IT\n\n" + text.slice(0,100) + "..."))
      .catch(()=>alert(text));
  };

  const img = images?.[product.barcode];
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !onSaveImage) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      await onSaveImage(product.barcode, base64);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <button onClick={onClose} style={{padding:"7px 15px",borderRadius:"100px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",fontSize:"12px",cursor:"pointer",fontFamily:"Cairo,sans-serif",marginBottom:"14px"}}>
        ← رجوع
      </button>

      {/* البطاقة القابلة للحفظ */}
      <div ref={cardRef} style={{background:"#0d0b06",borderRadius:"20px",overflow:"hidden",border:"1px solid rgba(212,168,83,0.2)",marginBottom:"14px"}}>

        {/* هيدر */}
        <div style={{background:"linear-gradient(135deg,rgba(212,168,83,0.2),rgba(212,168,83,0.05))",padding:"16px",borderBottom:"1px solid rgba(212,168,83,0.1)"}}>
          <div style={{display:"flex",gap:"14px",alignItems:"flex-start"}}>
            <label style={{cursor:"pointer",position:"relative",flexShrink:0}}>
              {img ? (
                <img src={img} alt={product.name} style={{width:"70px",height:"70px",borderRadius:"14px",objectFit:"cover",border:"1px solid rgba(212,168,83,0.2)"}} />
              ) : (
                <div style={{width:"70px",height:"70px",borderRadius:"14px",background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px"}}>
                  {uploading ? "⏳" : "📷"}
                </div>
              )}
              <div style={{position:"absolute",bottom:"-4px",right:"-4px",width:"20px",height:"20px",borderRadius:"50%",background:"#d4a853",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px"}}>✏️</div>
              <input type="file" accept="image/*" className="hidden" style={{display:"none"}} onChange={handleImageUpload} />
            </label>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"16px",fontWeight:"900",color:S.white,lineHeight:"1.3",marginBottom:"5px"}}>{product.name}</div>
              <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",fontFamily:"monospace",marginBottom:"4px"}}>{product.barcode}</div>
              <div style={{fontSize:"11px",color:"rgba(212,168,83,0.6)"}}>🏭 {factoryCode}</div>
            </div>
            <div style={{display:"inline-flex",background:`${perfColor}15`,border:`1px solid ${perfColor}30`,borderRadius:"100px",padding:"5px 11px",fontSize:"12px",fontWeight:"700",color:perfColor,flexShrink:0}}>{perfLabel}</div>
          </div>
        </div>

        {/* إحصاءات */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"1px",background:"rgba(255,255,255,0.05)"}}>
          {[
            ["شراء", `${product.buyPrice} ﷼`, "rgba(255,255,255,0.5)"],
            ["بيع",  `${product.sellPrice} ﷼`, S.gold],
            ["هامش", `${margin.toFixed(0)}%`,   margin>20?"#8aab8e":"#e8855a"],
            ["مباع", `${Math.round(product.soldPct)}%`, perfColor],
          ].map(([l,v,c])=>(
            <div key={l} style={{background:"#0d0b06",padding:"11px",textAlign:"center"}}>
              <div style={{fontSize:"14px",fontWeight:"900",color:c}}>{v}</div>
              <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"2px"}}>{l}</div>
            </div>
          ))}
        </div>

        {/* مخزون */}
        <div style={{padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"8px"}}>
            <span style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>المخزون</span>
            <span style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>قيمة مجمدة: {fpm(frozenVal)}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
            {[["مشتريات",fm(product.qty),"rgba(255,255,255,0.6)"],["مباع",fm(Math.round(product.qty*product.soldPct/100)),perfColor],["متبقي",fm(product.closing),"rgba(255,255,255,0.4)"]].map(([l,v,c])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.04)",borderRadius:"10px",padding:"9px",textAlign:"center"}}>
                <div style={{fontSize:"15px",fontWeight:"900",color:c}}>{v}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"2px"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ترند شهري */}
        <div style={{padding:"14px 16px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)"}}>الأداء الشهري</div>
            <div style={{fontSize:"13px",fontWeight:"900",color:growth>0?"#8aab8e":growth<0?"#e8855a":"#d4a853"}}>
              {growth>0?"+":""}{growth.toFixed(1)}%
            </div>
          </div>
          <MiniChart data={monthly.map(m=>m.qty)} color={perfColor} />
          <div style={{display:"flex",justifyContent:"space-between",marginTop:"4px"}}>
            {monthly.map((m,i)=>(
              <div key={i} style={{fontSize:"9px",color:"rgba(255,255,255,0.2)",textAlign:"center",flex:1}}>{m.label}</div>
            ))}
          </div>
        </div>
      </div>

      {/* أزرار */}
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        <button onClick={saveCard} style={{width:"100%",padding:"13px",borderRadius:"14px",border:"none",background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",fontSize:"14px",fontWeight:"900",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
          🖼️ حفظ البطاقة كصورة
        </button>
        <button onClick={copyIT} style={{width:"100%",padding:"13px",borderRadius:"14px",border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#a5b4fc",fontSize:"14px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>
          📋 نسخ بيانات IT
        </button>
      </div>
    </div>
  );
}

export function ProductCardsView({ products, periods, images, onSaveImage }) {
  const [search,  setSearch]  = useState("");
  const [sortBy,  setSortBy]  = useState("soldPct");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    let list = products;
    if (search) list = list.filter(p => p.name?.includes(search) || p.barcode?.includes(search));
    return [...list].sort((a,b) => {
      if (sortBy === "soldPct")  return a.soldPct - b.soldPct;
      if (sortBy === "frozen")   return b.closing*b.buyPrice - a.closing*a.buyPrice;
      if (sortBy === "margin")   return (b.sellPrice-b.buyPrice)/Math.max(b.buyPrice,1) - (a.sellPrice-a.buyPrice)/Math.max(a.buyPrice,1);
      return 0;
    });
  }, [products, search, sortBy]);

  if (selected) return (
    <ProductDetailCard
      product={selected}
      periods={periods}
      images={images}
      onClose={()=>setSelected(null)}
      onSaveImage={onSaveImage}
    />
  );

  return (
    <div>
      {/* بحث */}
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 بحث بالاسم أو الباركود…"
        style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"10px 14px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none",marginBottom:"10px"}} />

      {/* ترتيب */}
      <div style={{display:"flex",gap:"6px",marginBottom:"12px"}}>
        {[["soldPct","الأضعف أداءً"],["frozen","الأعلى تجميداً"],["margin","الأعلى هامشاً"]].map(([k,l])=>(
          <button key={k} onClick={()=>setSortBy(k)} style={{
            padding:"6px 12px",borderRadius:"100px",border:"none",cursor:"pointer",
            fontFamily:"Cairo,sans-serif",fontSize:"11px",fontWeight:"700",
            background:sortBy===k?"rgba(212,168,83,0.2)":"rgba(255,255,255,0.05)",
            color:sortBy===k?S.gold:"rgba(255,255,255,0.4)",
            border:sortBy===k?"1px solid rgba(212,168,83,0.4)":"1px solid rgba(255,255,255,0.08)",
          }}>{l}</button>
        ))}
      </div>

      {/* القائمة */}
      <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
        {filtered.slice(0,50).map(p => {
          const perfColor = p.soldPct>60?"#8aab8e":p.soldPct>30?"#d4a853":"#e8855a";
          const img = images?.[p.barcode];
          return (
            <div key={p.barcode} onClick={()=>setSelected(p)} style={{
              display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",
              background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"14px",cursor:"pointer",
            }}>
              {img ? (
                <img src={img} alt={p.name} style={{width:"48px",height:"48px",borderRadius:"10px",objectFit:"cover",flexShrink:0}} />
              ) : (
                <div style={{width:"48px",height:"48px",borderRadius:"10px",background:"rgba(255,255,255,0.04)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}}>📦</div>
              )}
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"14px",fontWeight:"700",color:S.white,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                <div style={{fontSize:"11px",color:"rgba(255,255,255,0.3)",fontFamily:"monospace",marginTop:"2px"}}>{p.barcode}</div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:"14px",fontWeight:"900",color:perfColor}}>{Math.round(p.soldPct)}%</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.3)",marginTop:"2px"}}>{fm(p.closing)} متبقي</div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{textAlign:"center",padding:"40px",color:"rgba(255,255,255,0.3)"}}>
            <div style={{fontSize:"32px",marginBottom:"10px"}}>📦</div>
            <div>لا توجد منتجات</div>
          </div>
        )}
      </div>
    </div>
  );
}
