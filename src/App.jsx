import { useState, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

/* ================================================================
   STORAGE — uses localStorage for standalone deployment
================================================================ */
const storage = {
  get: (key) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
  },
  set: (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
};

/* ================================================================
   NSE STOCK DATA
================================================================ */
const ALL_NSE_STOCKS = [
  { symbol:"SCOM", name:"Safaricom PLC",            sector:"Telco",         price:24.15, change:3.17,  volume:30600000, pe:18.2, divYield:4.9, high52:28.50, low52:18.40, mktCap:"967B", color:"#22c55e" },
  { symbol:"EQTY", name:"Equity Group Holdings",    sector:"Banking",       price:77.00, change:4.05,  volume:3652097,  pe:6.1,  divYield:5.8, high52:80.00, low52:41.20, mktCap:"291B", color:"#10b981" },
  { symbol:"KCB",  name:"Kenya Commercial Bank",    sector:"Banking",       price:79.00, change:0.96,  volume:3950000,  pe:5.8,  divYield:6.2, high52:82.00, low52:44.00, mktCap:"254B", color:"#0ea5e9" },
  { symbol:"COOP", name:"Co-operative Bank",        sector:"Banking",       price:29.95, change:0.17,  volume:890000,   pe:7.2,  divYield:6.1, high52:32.00, low52:20.50, mktCap:"175B", color:"#38bdf8" },
  { symbol:"ABSA", name:"ABSA Bank Kenya",          sector:"Banking",       price:30.35, change:1.00,  volume:182410,   pe:8.4,  divYield:4.5, high52:35.00, low52:21.50, mktCap:"163B", color:"#ef4444" },
  { symbol:"NCBA", name:"NCBA Group",               sector:"Banking",       price:89.50, change:2.29,  volume:450000,   pe:6.9,  divYield:5.2, high52:95.00, low52:58.00, mktCap:"147B", color:"#f97316" },
  { symbol:"DTK",  name:"Diamond Trust Bank",       sector:"Banking",       price:156.75,change:0.00,  volume:50080,    pe:7.8,  divYield:3.1, high52:165.0, low52:92.00, mktCap:"89B",  color:"#a855f7" },
  { symbol:"SCBK", name:"Standard Chartered Kenya", sector:"Banking",       price:330.00,change:2.80,  volume:95000,    pe:10.2, divYield:4.8, high52:350.0, low52:210.0, mktCap:"124B", color:"#ec4899" },
  { symbol:"IMH",  name:"I & M Holdings",           sector:"Banking",       price:49.10, change:0.10,  volume:699650,   pe:6.5,  divYield:4.2, high52:56.00, low52:33.00, mktCap:"84B",  color:"#06b6d4" },
  { symbol:"EABL", name:"East African Breweries",   sector:"Manufacturing", price:255.00,change:-0.10, volume:280380,   pe:22.4, divYield:3.8, high52:285.0, low52:138.0, mktCap:"204B", color:"#f59e0b" },
  { symbol:"BAT",  name:"BAT Kenya",                sector:"Manufacturing", price:541.00,change:-1.28, volume:27280,    pe:12.1, divYield:8.9, high52:620.0, low52:440.0, mktCap:"54B",  color:"#d97706" },
  { symbol:"CIC",  name:"CIC Insurance Group",      sector:"Insurance",     price:4.98,  change:-1.58, volume:205810,   pe:9.8,  divYield:3.1, high52:6.50,  low52:3.20,  mktCap:"9B",   color:"#8b5cf6" },
  { symbol:"SBIC", name:"Stanbic Holdings",         sector:"Banking",       price:257.00,change:0.00,  volume:12000,    pe:8.9,  divYield:5.6, high52:270.0, low52:188.0, mktCap:"102B", color:"#fb7185" },
];

const SECTOR_COLORS = { Banking:"#0ea5e9", Telco:"#22c55e", Manufacturing:"#f59e0b", Insurance:"#6366f1", Investment:"#14b8a6" };

/* ================================================================
   STATISTICAL HELPERS
================================================================ */
function genHistory(basePrice, days = 90) {
  const data = []; let price = basePrice * 0.82;
  for (let i = days; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    price = Math.max(price + (Math.random() - 0.47) * price * 0.022, basePrice * 0.45);
    data.push({ date: d.toLocaleDateString("en-KE", { month:"short", day:"numeric" }), price: parseFloat(price.toFixed(2)), volume: Math.floor(Math.random() * 800000 + 50000) });
  }
  if (data.length) data[data.length - 1].price = basePrice;
  return data;
}

function calcSMA(data, period = 20) {
  return data.map((d, i) => {
    if (i < period - 1) return { ...d, sma: null };
    const sl = data.slice(i - period + 1, i + 1).map(x => x.price);
    return { ...d, sma: parseFloat((sl.reduce((a, b) => a + b, 0) / period).toFixed(2)) };
  });
}

function ApiKeyGate({ onKey }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ minHeight:"100vh", background:"#060a12", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Georgia',serif" }}>
      <div style={{ background:"#0a1628", border:"1px solid #1e3a5f", borderRadius:16, padding:"40px 36px", maxWidth:440, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:8 }}>🇰🇪</div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:26, fontWeight:700, color:"#38bdf8", marginBottom:12 }}>NSE VAULT</div>
        <input type="password" placeholder="sk-ant-..." value={val} onChange={e => setVal(e.target.value)}
          style={{ width:"100%", background:"#060a12", border:"1px solid #1e3a5f", borderRadius:8, padding:"11px 14px", color:"#e2e8f0", marginBottom:12 }}/>
        <button onClick={() => { if (val.startsWith("sk-ant")) { storage.set("anthropic_key", val); onKey(val); } }}
          style={{ width:"100%", padding:"12px", background:"linear-gradient(135deg,#0369a1,#0d9488)", border:"none", borderRadius:10, color:"#fff", cursor:"pointer" }}>
          Enter Vault →
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => storage.get("anthropic_key") || "");
  const [holdings] = useState(() => storage.get("holdings") || {});
  const [aiState, setAiState] = useState({ loading:false, text:"" });
  const histCache = useRef({});

  const getHistory = useCallback((symbol) => {
    if (!histCache.current[symbol]) histCache.current[symbol] = genHistory(ALL_NSE_STOCKS.find(s => s.symbol === symbol)?.price || 50);
    return histCache.current[symbol];
  }, []);

  if (!apiKey) return <ApiKeyGate onKey={k => setApiKey(k)} />;

  const portfolio = ALL_NSE_STOCKS.map(s => {
    const h = holdings[s.symbol] || { ziidi:0, faida:0 };
    const total = (h.ziidi || 0) + (h.faida || 0);
    const value = total * s.price;
    return { ...s, totalShares:total, value };
  }).filter(s => s.totalShares > 0);

  const totalValue = portfolio.reduce((acc,p) => acc+p.value, 0);
  const smaData = calcSMA(getHistory("SCOM"), 20);
  
  const sectorData = portfolio.reduce((acc,p) => { acc[p.sector]=(acc[p.sector]||0)+p.value; return acc; }, {});
  const sectorPie = Object.entries(sectorData).map(([name,value]) => ({ name, value, color:SECTOR_COLORS[name]||"#64748b" }));

  const callAI = async () => {
    setAiState({ loading:true, text:"" });
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key": apiKey, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
        body: JSON.stringify({ model:"claude-3-5-sonnet-20240620", max_tokens:1000, messages:[{ role:"user", content:"Analyze the NSE market." }] })
      });
      const data = await res.json();
      setAiState({ loading:false, text: data.content?.[0]?.text || "No response." });
    } catch { setAiState({ loading:false, text:"Error." }); }
  };

  return (
    <div style={{ background:"#060a12", minHeight:"100vh", color:"#e2e8f0", padding:20 }}>
      <div style={{ maxWidth:1000, margin:"0 auto" }}>
        <h1>NSE VAULT 🇰🇪 Dashboard</h1>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:40 }}>
           <div style={{ background:"#0a1628", padding:20, borderRadius:12, border:"1px solid #1e3a5f" }}>
              <div style={{ fontSize:12, color:"#475569" }}>PORTFOLIO VALUE</div>
              <div style={{ fontSize:24, fontWeight:700 }}>KES {totalValue.toLocaleString()}</div>
           </div>
           <div style={{ background:"#0a1628", padding:20, borderRadius:12, border:"1px solid #1e3a5f" }}>
              <h2 style={{ fontSize:14 }}>AI Insights</h2>
              <button onClick={callAI} style={{ padding:"8px 16px", background:"#38bdf8", border:"none", borderRadius:6 }}>Ask Claude</button>
           </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20 }}>
          <div style={{ background:"#0a1628", padding:20, borderRadius:12 }}>
             <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={smaData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#0e2040"/><XAxis dataKey="date" hide/><YAxis hide/><Tooltip/>
                   <Area type="monotone" dataKey="price" stroke="#38bdf8" fill="#38bdf820"/>
                   <Line type="monotone" dataKey="sma" stroke="#f59e0b" dot={false}/>
                </AreaChart>
             </ResponsiveContainer>
          </div>
          <div style={{ background:"#0a1628", padding:20, borderRadius:12 }}>
             <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={sectorPie} innerRadius={50} outerRadius={80} dataKey="value">{sectorPie.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie></PieChart>
             </ResponsiveContainer>
          </div>
        </div>
        {aiState.text && <div style={{ marginTop:20, padding:20, background:"#060a12", borderRadius:10 }}>{aiState.text}</div>}
        {aiState.loading && <p>AI is thinking...</p>}
        {/* Helper for BarChart if needed in future */}
        <div style={{display:'none'}}><BarChart data={[]}><Bar dataKey="v" fill="#fff"/></BarChart></div>
      </div>
    </div>
  );
}
