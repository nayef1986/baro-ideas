// Ideas/index.jsx — مركز الأفكار الذكي v2 Final
import { useState, useEffect, lazy, Suspense } from "react";
import { totalPurchases, num } from "../../lib/calc.js";
import { S } from "./constants.js";

const GeminiEngineComp = lazy(() => import("./GeminiEngine.jsx").then(m=>({default:m.GeminiEngine})));
const IdeasLogComp     = lazy(() => import("./IdeasLog.jsx").then(m=>({default:m.IdeasLog})));
const CardBuilderComp  = lazy(() => import("./CardBuilder.jsx").then(m=>({default:m.CardTab})));
const SimulationComp   = lazy(() => import("./AISimulation.jsx").then(m=>({default:m.AISimulation})));
const ProductCardsComp = lazy(() => import("./ProductCard.jsx").then(m=>({default:m.ProductCardsView})));
const AlertCenterComp  = lazy(() => import("./AlertCenter.jsx").then(m=>({default:m.AlertCenter})));
const ProfitRulesComp  = lazy(() => import("./ProfitRules.jsx").then(m=>({default:m.ProfitRules})));

const Loader = () => (
  <div style={{textAlign:"center",padding:"40px"}}>
    <div style={{fontSize:"24px",animation:"spin 1s linear infinite"}}>⏳</div>
    <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
  </div>
);

const STORAGE_KEY = "baro_ideas_data_v2";

function loadLocal() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { ideas: d.ideas ?? [], rules: d.rules ?? {} };
  } catch { return { ideas: [], rules: {} }; }
}

function saveLocal(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function IdeasScreen({ products=[], periods=[], settings={}, images={}, onSaveImage }) {
  const [tab,      setTab]    = useState("alerts");
  const [bT,       setBT]     = useState(null);
  const [bP,       setBP]     = useState(null);
  const [PRODUCTS, setProds]  = useState([]);
  const [ready,    setReady]  = useState(false);

  const [ideas,  setIdeas]  = useState(()=>loadLocal().ideas);
  const [rules,  setRules]  = useState(()=>loadLocal().rules);

  const persistIdeas = (list) => { setIdeas(list); saveLocal({ideas:list,rules}); };
  const persistRules = (r)    => { setRules(r);    saveLocal({ideas,rules:r});    };

  const addIdea      = (idea) => persistIdeas([idea,...ideas]);
  const deleteIdea   = (id)   => persistIdeas(ideas.filter(i=>i.id!==id));
  const editIdea     = (idea) => persistIdeas(ideas.map(i=>i.id===idea.id?idea:i));
  const changeStatus = (id,s) => persistIdeas(ideas.map(i=>i.id===id?{...i,status:s}:i));

  useEffect(() => {
    if (!products || products.length===0) { setReady(true); return; }
    const t = setTimeout(() => {
      const lastPer = periods[periods.length-1];
      const prods = products.slice(0,150).map(p => {
        const bought   = totalPurchases(p);
        const sold     = Object.values(lastPer?.sales??{}).reduce((s,d)=>s+num(d[p.barcode]?.qty??0),0);
        const closing  = Math.max(0, bought-sold);
        const soldPct  = bought>0 ? (sold/bought)*100 : 0;
        const buyPrice = num(p.purchases?.slice(-1)[0]?.buyPrice??0);
        return { ...p, qty:bought, soldPct, buyPrice, closing };
      });
      setProds(prods);
      setReady(true);
    }, 80);
    return () => clearTimeout(t);
  }, [products, periods]);

  const onBuildCard = (s) => {
    const prod = PRODUCTS.find(p=>p.barcode===s.barcode) ?? null;
    setBT(s.type||s.action);
    setBP(prod ?? { name:s.product||s.title, barcode:s.barcode, sellPrice:0, buyPrice:0 });
    setTab("card");
  };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Cairo',sans-serif}
    body{background:#0a0804;color:#f0e6d0;direction:rtl}
    .ab1{position:fixed;width:500px;height:500px;top:-150px;right:-100px;background:radial-gradient(circle,rgba(212,168,83,0.07) 0%,transparent 70%);pointer-events:none;z-index:0}
    .ab2{position:fixed;width:400px;height:400px;bottom:-80px;left:-100px;background:radial-gradient(circle,rgba(168,159,196,0.06) 0%,transparent 70%);pointer-events:none;z-index:0}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(212,168,83,0.2);border-radius:3px}
    input,select,textarea{color-scheme:dark}
    input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
    input[type=range]{height:6px}
  `;

  const TABS = [
    { key:"alerts",   icon:"🔔", label:"تنبيهات" },
    { key:"gemini",   icon:"🧠", label:"Gemini"  },
    { key:"ideas",    icon:"💡", label:"أفكار"   },
    { key:"products", icon:"📦", label:"منتجات"  },
    { key:"card",     icon:"🎨", label:"بطاقة"   },
    { key:"sim",      icon:"🔬", label:"محاكاة"  },
    { key:"rules",    icon:"⚙️", label:"قواعد"   },
  ];

  const alertCount  = ready ? PRODUCTS.filter(p=>p.soldPct<25||p.closing===0).length : 0;
  const activeIdeas = ideas.filter(i=>i.status==="active").length;

  return (
    <>
      <style>{CSS}</style>
      <div className="ab1"/><div className="ab2"/>
      <div style={{position:"relative",zIndex:1,minHeight:"100vh",padding:"16px 16px 100px",maxWidth:"440px",margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
          <div>
            <h1 style={{fontSize:"22px",fontWeight:"900",color:"#ffffff",marginBottom:"2px"}}>مركز الأفكار</h1>
            <p style={{fontSize:"11px",color:"rgba(212,168,83,0.6)"}}>AI Commerce Intelligence</p>
          </div>
          <a href="https://baro-inventory-qmpp.vercel.app" style={{
            display:"inline-flex",alignItems:"center",gap:"4px",
            background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.2)",
            borderRadius:"100px",padding:"5px 11px",color:"#d4a853",
            fontSize:"11px",fontWeight:"700",textDecoration:"none",
          }}>← النظام</a>
        </div>

        {/* إحصاء */}
        {ready && PRODUCTS.length > 0 && (
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px",marginBottom:"14px"}}>
            {[
              ["منتج",    PRODUCTS.length,                         "#d4a853"],
              ["تنبيه",   alertCount,                              "#e8855a"],
              ["فكرة",    ideas.length,                            "#a89fc4"],
              ["تنفيذ",   activeIdeas,                             "#8aab8e"],
            ].map(([l,v,c])=>(
              <div key={l} style={{background:`${c}10`,border:`1px solid ${c}20`,borderRadius:"11px",padding:"8px",textAlign:"center"}}>
                <div style={{fontSize:"17px",fontWeight:"900",color:c}}>{v}</div>
                <div style={{fontSize:"10px",color:"rgba(255,255,255,0.35)",marginTop:"1px"}}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {!ready && <Loader />}

        {ready && (
          <Suspense fallback={<Loader />}>
            {tab==="alerts" && <AlertCenterComp products={PRODUCTS} periods={periods} onBuildCard={onBuildCard} onAddToIdeas={addIdea} />}
            {tab==="gemini" && <GeminiEngineComp products={PRODUCTS} periods={periods} images={images} settings={settings} onBuildCard={onBuildCard} onAddToIdeas={addIdea} />}
            {tab==="ideas"  && <IdeasLogComp ideas={ideas} onAdd={addIdea} onEdit={editIdea} onDelete={deleteIdea} onStatusChange={changeStatus} />}
            {tab==="sim"    && <SimulationComp products={PRODUCTS} periods={periods} />}
            {tab==="products" && <ProductCardsComp products={PRODUCTS} periods={periods} images={images} onSaveImage={onSaveImage} />}
            {tab==="card"   && <CardBuilderComp initType={bT} initProd={bP} products={PRODUCTS} images={images} periods={periods} />}
            {tab==="rules"  && <ProfitRulesComp rules={rules} onSave={persistRules} />}
          </Suspense>
        )}
      </div>

      {/* Bottom Nav — قابل للتمرير */}
      <nav style={{
        position:"fixed",bottom:0,right:0,left:0,
        background:"#080604",borderTop:"1px solid rgba(212,168,83,0.12)",
        zIndex:50,paddingBottom:"env(safe-area-inset-bottom,0px)",
        overflowX:"auto",
      }}>
        <div style={{display:"flex",minWidth:"440px",maxWidth:"440px",margin:"0 auto"}}>
          {TABS.map(({key,icon,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{
              flex:1,display:"flex",flexDirection:"column",alignItems:"center",
              gap:"2px",padding:"8px 2px",border:"none",background:"transparent",
              cursor:"pointer",fontFamily:"Cairo,sans-serif",minWidth:"60px",
              color:tab===key?"#d4a853":"rgba(255,255,255,0.3)",
              WebkitTapHighlightColor:"transparent",
              borderTop:tab===key?"2px solid #d4a853":"2px solid transparent",
            }}>
              <span style={{fontSize:"17px",lineHeight:1}}>{icon}</span>
              <span style={{fontSize:"9px",fontWeight:"700",lineHeight:1}}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
