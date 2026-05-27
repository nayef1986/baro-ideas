// constants.js

export const S = {
  bg: "#0a0804", card: "rgba(255,245,220,0.06)",
  border: "rgba(212,168,83,0.18)", gold: "#d4a853",
  white: "#ffffff", dim: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.12)", r: "20px", rs: "13px",
};

export const TYPES = [
  { key:"discount",  icon:"🔥", label:"خصم",      color:"#e8855a" },
  { key:"bundle",    icon:"🎁", label:"كومبو",     color:"#d4a853" },
  { key:"flash",     icon:"⚡", label:"فلاش",      color:"#f59e0b" },
  { key:"buy3",      icon:"⭐", label:"اشتري 3",   color:"#c9a96e" },
  { key:"seasonal",  icon:"🌸", label:"موسمي",     color:"#b8976a" },
  { key:"clear",     icon:"💨", label:"تصفية",     color:"#8aab8e" },
  { key:"new",       icon:"✨", label:"جديد",      color:"#a89fc4" },
  { key:"limited",   icon:"🏷️", label:"محدود",    color:"#6366f1" },
];

// مكتبة الأفكار العالمية
export const GLOBAL_IDEAS = [
  {
    region: "🇨🇳 صيني",
    ideas: [
      { key:"flash_sale",    icon:"⚡", title:"Flash Sale",         desc:"عرض لساعة واحدة فقط — خلق إلحاح فوري",       type:"flash"    },
      { key:"bogo",          icon:"🎁", title:"Buy 1 Get 1",        desc:"اشتري واحد خذ واحد — مثبت في السوق الصيني", type:"bundle"   },
      { key:"bundle_price",  icon:"📦", title:"Bundle Pricing",     desc:"حزمة منتجات بسعر واحد مخفض",                type:"bundle"   },
      { key:"limited_ed",    icon:"🏷️", title:"Limited Edition",   desc:"كمية محدودة — يرفع القيمة الإدراكية",        type:"limited"  },
      { key:"countdown",     icon:"⏳", title:"Countdown Timer",    desc:"عد تنازلي — يحفز الشراء الفوري",             type:"flash"    },
      { key:"group_buy",     icon:"👥", title:"Group Buying",       desc:"كلما اشترى أكثر كلما انخفض السعر",           type:"discount" },
    ]
  },
  {
    region: "🇰🇷 كوري",
    ideas: [
      { key:"set_collect",   icon:"💎", title:"Set Collection",     desc:"كومبو متكامل كطقم واحد",                     type:"bundle"   },
      { key:"daily_deal",    icon:"📅", title:"Daily Deal",         desc:"عرض اليوم — يتجدد كل 24 ساعة",               type:"flash"    },
      { key:"loyalty",       icon:"🌟", title:"Loyalty Reward",     desc:"مكافأة الزبائن المتكررين",                    type:"discount" },
      { key:"new_hype",      icon:"🚀", title:"New Arrival Hype",   desc:"إطلاق منتج جديد بضجة تسويقية",               type:"new"      },
      { key:"seasonal_must", icon:"🌺", title:"Seasonal Must-Have", desc:"لازمة الموسم — ربط بالمناسبة",               type:"seasonal" },
    ]
  },
];

export const fm  = n => Number(n||0).toLocaleString("en-US",{maximumFractionDigits:1});
export const fp  = n => Number(n||0).toFixed(1) + "%";
export const fpm = n => "﷼ " + Number(n||0).toLocaleString("en-US",{maximumFractionDigits:0});
export const todayAr = () => new Date().toLocaleDateString("ar-SA",{weekday:"long",day:"numeric",month:"long"});
