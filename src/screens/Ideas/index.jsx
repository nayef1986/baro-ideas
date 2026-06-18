// Ideas/index.jsx — مركز الكومبو المحاسبي v3 + منشئ العروض
import { useState, useEffect, lazy, Suspense } from "react";
import { totalPurchases, num } from "../../lib/calc.js";

const DecisionEngineComp = lazy(() => import("./DecisionEngine.jsx").then(m=>({default:m.DecisionEngine})));
const ComboCardComp   = lazy(() => import("./ComboCard.jsx").then(m=>({default:m.ComboCard})));
const IdeasLogComp    = lazy(() => import("./IdeasLog.jsx").then(m=>({default:m.IdeasLog})));
const AlertCenterComp = lazy(() => import("./AlertCenter.jsx").then(m=>({default:m.AlertCenter})));
const ProfitRulesComp = lazy(() => import("./ProfitRules.jsx").then(m=>({default:m.ProfitRules})));
const OfferBuilderComp = lazy(() => import("./OfferBuilder.jsx").then(m=>({default:m.OfferBuilder})));

const Loader = () => (
  <div style={{textAlign:"center",padding:"40px"}}>
    <div style={{fontSize:"24px",animation:"spin 1s linear infinite"}}>⏳</div>
    <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
  </div>
);

const STORAGE_KEY = "baro_ideas_data_v2";
function loadLocal() {
  try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); return { ideas: d.ideas ?? [], rules: d.rules ?? {} }; }
  catch { return { ideas: [], rules: {} }; }
}
function saveLocal(data) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }

export default function IdeasScreen({ products=[], periods=[], settings={}, images={}, onSaveImage }) {
  const [tab,      setTab]    = useState("combo");
  const [combo,    setCombo]  = useState(null);
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
      const prods = products.slice(0,600).map(p => {
        const bought = totalPurchases(p);
        const sold = periods.reduce((tot, per) =>
          tot + Object.values(per?.sales ?? {}).reduce((s,d)=>s+num(d[p.barcode]?.qty??0),0), 0);
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

  const onBuildCard = (c) => { setCombo(c); setTab("card"); };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;font-family:'Cairo',sans-serif}
    body{background:#0a0804;color:#f0e6d0;direction:rtl}
    .ab1{position:fixed;width:500px;height:500px;top:-150px;right:-100px;background:radial-gradient(circle,rgba(212,168,83,0.07) 0%,transparent 70%);pointer-events:none;z-index:0}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(212,168,83,0.2);border-radius:3px}
    input,select,textarea{color-scheme:dark}
  `;

  const TABS = [
    { key:"combo",   icon:"🎯", label:"قرارات"  },
    { key:"offer",   icon:"🏷️", label:"عروض"   },
    { key:"alerts",  icon:"🔔", label:"تنبيهات" },
    { key:"ideas",   icon:"💡", label:"أفكار"   },
    { key:"rules",   icon:"⚙️", label:"قواعد"   },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="ab1"/>
      <div style={{position:"relative",zIndex:1,minHeight:"100vh",padding:"16px 16px 100px",maxWidth:"440px",margin:"0 auto"}}>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
          <div>
            <h1 style={{fontSize:"22px",fontWeight:"900",color:"#ffffff",marginBottom:"2px"}}>مركز القرارات</h1>
            <p style={{fontSize:"11px",color:"rgba(212,168,83,0.6)"}}>محاسبي ذكي · بدون خسارة</p>
          </div>
          <a href="https://baro-inventory-qmpp.vercel.app" style={{display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(212,168,83,0.08)",border:"1px solid rgba(212,168,83,0.2)",borderRadius:"100px",padding:"5px 11px",color:"#d4a853",fontSize:"11px",fontWeight:"700",textDecoration:"none"}}>← النظام</a>
        </div>

        {!ready && <Loader />}

        {ready && (
          <Suspense fallback={<Loader />}>
            {tab==="combo"  && <DecisionEngineComp products={PRODUCTS} periods={periods} settings={settings} />}
            {tab==="offer"  && <OfferBuilderComp products={PRODUCTS} periods={periods} images={images} settings={settings} />}
            {tab==="card"   && <ComboCardComp combo={combo} images={images} onBack={()=>setTab("combo")} />}
            {tab==="alerts" && <AlertCenterComp products={PRODUCTS} periods={periods} onBuildCard={onBuildCard} onAddToIdeas={addIdea} />}
            {tab==="ideas"  && <IdeasLogComp ideas={ideas} onAdd={addIdea} onEdit={editIdea} onDelete={deleteIdea} onStatusChange={changeStatus} />}
            {tab==="rules"  && <ProfitRulesComp rules={rules} onSave={persistRules} />}
          </Suspense>
        )}
      </div>

      {/* Bottom Nav */}
      <nav style={{position:"fixed",bottom:0,right:0,left:0,background:"rgba(8,6,4,0.92)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderTop:"1px solid rgba(212,168,83,0.1)",zIndex:50,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
        <div style={{display:"flex",width:"100%"}}>
          {TABS.map(({key,icon,label})=>(
            <button key={key} onClick={()=>setTab(key)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",padding:"9px 2px 7px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"Cairo,sans-serif",WebkitTapHighlightColor:"transparent",minWidth:0}}>
              <span style={{fontSize:tab===key?"22px":"19px",lineHeight:1,padding:"5px 12px",borderRadius:"100px",background:tab===key?"rgba(212,168,83,0.15)":"transparent",display:"block",filter:tab===key?"none":"opacity(0.45)"}}>{icon}</span>
              <span style={{fontSize:"9px",fontWeight:"700",lineHeight:1,color:tab===key?"#d4a853":"rgba(255,255,255,0.3)"}}>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
