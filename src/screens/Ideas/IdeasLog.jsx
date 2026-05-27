// IdeasLog.jsx — سجل الأفكار وإدارتها
import { useState, useCallback } from "react";
import { S, TYPES, GLOBAL_IDEAS, fm, fp } from "./constants.js";

const STATUS_COLOR = {
  pending:   "#d4a853",
  active:    "#8aab8e",
  done:      "#6366f1",
  rejected:  "#e8855a",
};
const STATUS_LABEL = {
  pending:  "⏳ قيد الدراسة",
  active:   "✅ قيد التنفيذ",
  done:     "🏆 تم التطبيق",
  rejected: "❌ مرفوضة",
};

function IdeaCard({ idea, onEdit, onDelete, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const t = TYPES.find(x=>x.key===idea.type) ?? TYPES[0];
  const c = STATUS_COLOR[idea.status] ?? "#d4a853";

  return (
    <div style={{borderRadius:"14px",overflow:"hidden",border:`1px solid rgba(255,255,255,0.08)`,marginBottom:"8px"}}>
      <div onClick={()=>setExpanded(p=>!p)} style={{padding:"13px 15px",background:"rgba(255,255,255,0.03)",cursor:"pointer",display:"flex",alignItems:"center",gap:"11px"}}>
        <span style={{fontSize:"20px",flexShrink:0}}>{t.icon}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:"14px",fontWeight:"900",color:S.white,marginBottom:"2px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{idea.title}</div>
          <div style={{fontSize:"11px",color:"rgba(255,255,255,0.35)"}}>{idea.createdAt} · {idea.source}</div>
        </div>
        <div style={{fontSize:"11px",fontWeight:"700",color:c,flexShrink:0}}>{STATUS_LABEL[idea.status]}</div>
      </div>

      {expanded && (
        <div style={{padding:"12px 15px",borderTop:"1px solid rgba(255,255,255,0.06)",background:"rgba(0,0,0,0.2)"}}>
          {idea.reason && (
            <div style={{fontSize:"13px",color:S.dim,marginBottom:"10px"}}>{idea.reason}</div>
          )}
          {idea.result && (
            <div style={{background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:"10px",padding:"9px 12px",marginBottom:"10px"}}>
              <div style={{fontSize:"12px",color:"#a5b4fc",marginBottom:"3px"}}>📊 النتائج</div>
              <div style={{fontSize:"13px",color:S.white}}>{idea.result}</div>
            </div>
          )}
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
            {Object.keys(STATUS_LABEL).map(st=>(
              <button key={st} onClick={()=>onStatusChange(idea.id, st)}
                style={{padding:"6px 11px",borderRadius:"100px",border:"none",cursor:"pointer",fontFamily:"Cairo,sans-serif",fontSize:"11px",fontWeight:"700",
                  background:idea.status===st?`${STATUS_COLOR[st]}20`:"rgba(255,255,255,0.05)",
                  color:idea.status===st?STATUS_COLOR[st]:"rgba(255,255,255,0.3)",
                  border:idea.status===st?`1px solid ${STATUS_COLOR[st]}40`:"1px solid transparent",
                }}>{STATUS_LABEL[st]}</button>
            ))}
            <button onClick={()=>onEdit(idea)} style={{padding:"6px 11px",borderRadius:"100px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.4)",fontSize:"11px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>✏️ تعديل</button>
            <button onClick={()=>onDelete(idea.id)} style={{padding:"6px 11px",borderRadius:"100px",border:"1px solid rgba(232,133,90,0.2)",background:"rgba(232,133,90,0.08)",color:"#e8855a",fontSize:"11px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>🗑️</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddIdeaModal({ onAdd, onClose }) {
  const [title,  setTitle]  = useState("");
  const [reason, setReason] = useState("");
  const [type,   setType]   = useState("discount");
  const [result, setResult] = useState("");

  const save = () => {
    if (!title.trim()) return;
    onAdd({
      id: Date.now().toString(),
      title: title.trim(),
      reason: reason.trim(),
      result: result.trim(),
      type,
      status: "pending",
      source: "يدوي",
      createdAt: new Date().toLocaleDateString("ar-SA"),
    });
    onClose();
  };

  const inp = (val, set, label, ph, multi=false) => (
    <div>
      <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"5px"}}>{label}</div>
      {multi
        ? <textarea value={val} onChange={e=>set(e.target.value)} placeholder={ph} rows={3}
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"10px 13px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none",resize:"none"}} />
        : <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(212,168,83,0.15)",borderRadius:"12px",padding:"10px 13px",color:S.white,fontSize:"13px",fontFamily:"Cairo,sans-serif",outline:"none"}} />
      }
    </div>
  );

  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:100,display:"flex",alignItems:"flex-end"}}>
      <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:"440px",margin:"0 auto",background:"#0f0c07",border:"1px solid rgba(212,168,83,0.2)",borderRadius:"24px 24px 0 0",padding:"24px 20px 36px"}}>
        <div style={{fontSize:"17px",fontWeight:"900",color:S.white,marginBottom:"18px"}}>➕ فكرة جديدة</div>
        <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
          {inp(title, setTitle, "العنوان *", "اكتب الفكرة")}
          {inp(reason, setReason, "السبب", "لماذا هذه الفكرة؟", true)}
          {inp(result, setResult, "النتيجة (بعد التطبيق)", "اتركه فارغاً الآن")}
          <div>
            <div style={{fontSize:"12px",color:"rgba(255,255,255,0.4)",marginBottom:"8px"}}>النوع</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"6px"}}>
              {TYPES.map(t=>(
                <button key={t.key} onClick={()=>setType(t.key)} style={{
                  padding:"8px 4px",borderRadius:"10px",border:"none",cursor:"pointer",
                  fontFamily:"Cairo,sans-serif",fontSize:"11px",fontWeight:"700",
                  background:type===t.key?`${t.color}20`:"rgba(255,255,255,0.04)",
                  color:type===t.key?t.color:"rgba(255,255,255,0.35)",
                  border:type===t.key?`1px solid ${t.color}40`:"1px solid rgba(255,255,255,0.07)",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",
                }}>
                  <span style={{fontSize:"16px"}}>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"4px"}}>
            <button onClick={save} style={{padding:"13px",borderRadius:"14px",border:"none",background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",fontSize:"14px",fontWeight:"900",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>💾 حفظ</button>
            <button onClick={onClose} style={{padding:"13px",borderRadius:"14px",border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"rgba(255,255,255,0.5)",fontSize:"14px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>إلغاء</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function IdeasLog({ ideas, onAdd, onEdit, onDelete, onStatusChange }) {
  const [showAdd,    setShowAdd]    = useState(false);
  const [filterSt,   setFilterSt]  = useState("all");
  const [showGlobal, setShowGlobal] = useState(false);

  const filtered = filterSt === "all" ? ideas : ideas.filter(i=>i.status===filterSt);

  const counts = {
    all: ideas.length,
    pending:  ideas.filter(i=>i.status==="pending").length,
    active:   ideas.filter(i=>i.status==="active").length,
    done:     ideas.filter(i=>i.status==="done").length,
    rejected: ideas.filter(i=>i.status==="rejected").length,
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
        <div style={{fontSize:"15px",fontWeight:"900",color:S.white}}>سجل الأفكار</div>
        <div style={{display:"flex",gap:"7px"}}>
          <button onClick={()=>setShowGlobal(p=>!p)} style={{padding:"8px 14px",borderRadius:"12px",border:"1px solid rgba(212,168,83,0.3)",background:"rgba(212,168,83,0.1)",color:S.gold,fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>🌍 مكتبة</button>
          <button onClick={()=>setShowAdd(true)} style={{padding:"8px 14px",borderRadius:"12px",border:"none",background:"linear-gradient(135deg,#d4a853,#b8935a)",color:"#0a0804",fontSize:"12px",fontWeight:"900",cursor:"pointer",fontFamily:"Cairo,sans-serif"}}>➕ فكرة</button>
        </div>
      </div>

      {/* فلتر الحالة */}
      <div style={{display:"flex",gap:"5px",marginBottom:"12px",overflowX:"auto",paddingBottom:"4px"}}>
        {[["all","الكل"],["pending","قيد الدراسة"],["active","تنفيذ"],["done","مكتمل"],["rejected","مرفوض"]].map(([k,l])=>(
          <button key={k} onClick={()=>setFilterSt(k)} style={{
            padding:"6px 12px",borderRadius:"100px",border:"none",cursor:"pointer",whiteSpace:"nowrap",
            fontFamily:"Cairo,sans-serif",fontSize:"12px",fontWeight:"700",
            background:filterSt===k?"rgba(212,168,83,0.2)":"rgba(255,255,255,0.05)",
            color:filterSt===k?S.gold:"rgba(255,255,255,0.4)",
            border:filterSt===k?"1px solid rgba(212,168,83,0.4)":"1px solid rgba(255,255,255,0.08)",
          }}>{l} ({counts[k]})</button>
        ))}
      </div>

      {/* مكتبة الأفكار العالمية */}
      {showGlobal && (
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"16px",padding:"16px",marginBottom:"14px"}}>
          <div style={{fontSize:"14px",fontWeight:"900",color:S.white,marginBottom:"12px"}}>🌍 مكتبة الأفكار العالمية</div>
          {GLOBAL_IDEAS.map(region => (
            <div key={region.region} style={{marginBottom:"14px"}}>
              <div style={{fontSize:"13px",fontWeight:"700",color:S.gold,marginBottom:"8px"}}>{region.region}</div>
              <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                {region.ideas.map(idea => {
                  const t = TYPES.find(x=>x.key===idea.type);
                  return (
                    <div key={idea.key} style={{display:"flex",alignItems:"center",gap:"10px",padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:"11px"}}>
                      <span style={{fontSize:"18px",flexShrink:0}}>{idea.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"13px",fontWeight:"700",color:S.white}}>{idea.title}</div>
                        <div style={{fontSize:"11px",color:S.dim,marginTop:"2px"}}>{idea.desc}</div>
                      </div>
                      <button onClick={()=>onAdd({
                        id: Date.now().toString(),
                        title: idea.title,
                        reason: idea.desc,
                        result: "",
                        type: idea.type,
                        status: "pending",
                        source: region.region,
                        createdAt: new Date().toLocaleDateString("ar-SA"),
                      })} style={{padding:"6px 11px",borderRadius:"100px",border:`1px solid ${t?.color}40`,background:`${t?.color}15`,color:t?.color,fontSize:"11px",fontWeight:"700",cursor:"pointer",fontFamily:"Cairo,sans-serif",flexShrink:0}}>
                        ➕ أضف
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* الأفكار */}
      {filtered.length === 0 ? (
        <div style={{textAlign:"center",padding:"40px 20px",color:"rgba(255,255,255,0.3)"}}>
          <div style={{fontSize:"36px",marginBottom:"12px"}}>💡</div>
          <div style={{fontSize:"14px",color:"rgba(255,255,255,0.5)"}}>لا توجد أفكار بعد</div>
          <div style={{fontSize:"12px",marginTop:"6px"}}>اضغط ➕ لإضافة فكرة أو استخدم مكتبة الأفكار</div>
        </div>
      ) : (
        filtered.map(idea => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        ))
      )}

      {showAdd && <AddIdeaModal onAdd={onAdd} onClose={()=>setShowAdd(false)} />}
    </div>
  );
}
