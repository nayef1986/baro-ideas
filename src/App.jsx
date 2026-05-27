import { useState, useEffect } from "react";
import IdeasScreen from "./screens/Ideas/index.jsx";

const SUPABASE_URL = "https://tvxxprynqeufzlgleurm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eHhwcnlucWV1ZnpsZ2xldXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjk4NTAsImV4cCI6MjA5NDY0NTg1MH0.FfHtUehBX0yjZsuMiE8Z8UP7bE1Ii_RFB5FKT4EJuXk";

async function sbGet(key) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/baro_store?key=eq.${encodeURIComponent(key)}&select=value`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.length ? JSON.parse(rows[0].value) : null;
  } catch { return null; }
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [periods,  setPeriods]  = useState([]);
  const [settings, setSettings] = useState({ brandName:"البارو", minStock:12, factories:{} });
  const [images,   setImages]   = useState({});
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    (async () => {
      const [prods, pers, sett, imgs] = await Promise.all([
        sbGet("baro_products_v2"),
        sbGet("baro_periods_v2"),
        sbGet("baro_settings_v2"),
        sbGet("baro_images_v2"),
      ]);
      setProducts(prods ?? []);
      setPeriods(pers  ?? []);
      setSettings(sett ?? { brandName:"البارو", minStock:12, factories:{} });
      setImages(imgs   ?? {});
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#0a0804", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:"40px", marginBottom:"12px", animation:"spin 1s linear infinite" }}>⏳</div>
        <div style={{ color:"rgba(212,168,83,0.7)", fontSize:"15px", fontFamily:"Cairo,sans-serif" }}>جاري التحميل…</div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const handleSaveImage = async (barcode, base64) => {
    try {
      const key = "baro_images_v2";
      // نقرأ الصور الحالية
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/baro_store?key=eq.${encodeURIComponent(key)}&select=value`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      );
      const rows = await res.json();
      const current = rows?.length ? JSON.parse(rows[0].value) : {};
      const updated = { ...current, [barcode]: base64 };

      // نحفظ
      await fetch(`${SUPABASE_URL}/rest/v1/baro_store`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({ key, value: JSON.stringify(updated) }),
      });

      // تحديث الـ state
      setImages(updated);
    } catch (e) { console.error("Save image failed:", e); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0a0804", direction:"rtl", padding:"20px 16px" }}>
      <IdeasScreen
        products={products}
        periods={periods}
        settings={settings}
        images={images}
        onSaveImage={handleSaveImage}
      />
    </div>
  );
}
