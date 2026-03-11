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
   NSE STOCK DATA  (prices as of March 2026)
================================================================ */
const ALL_NSE_STOCKS = [
  { symbol:"SCOM", name:"Safaricom PLC",           sector:"Telco",         price:24.15, change:3.17,  volume:30600000, pe:18.2, divYield:4.9, high52:28.50, low52:18.40, mktCap:"967B", color:"#22c55e" },
  { symbol:"EQTY", name:"Equity Group Holdings",    sector:"Banking",       price:77.00, change:4.05,  volume:3652097,  pe:6.1,  divYield:5.8, high52:80.00, low52:41.20, mktCap:"291B", color:"#10b981" },
  { symbol:"KCB",  name:"Kenya Commercial Bank",    sector:"Banking",       price:79.00, change:0.96,  volume:3950000,  pe:5.8,  divYield:6.2, high52:82.00, low52:44.00, mktCap:"254B", color:"#0ea5e9" },
  { symbol:"COOP", name:"Co-operative Bank",        sector:"Banking",       price:29.95, change:0.17,  volume:890000,   pe:7.2,  divYield:6.1, high52:32.00, low52:20.50, mktCap:"175B", color:"#38bdf8" },
  { symbol:"ABSA", name:"ABSA Bank Kenya",          sector:"Banking",       price:30.35, change:1.00,  volume:182410,   pe:8.4,  divYield:4.5, high52:35.00, low52:21.50, mktCap:"163B", color:"#ef4444" },
  { symbol:"NCBA", name:"NCBA Group",               sector:"Banking",       price:89.50, change:2.29,  volume:450000,   pe:6.9,  divYield:5.2, high52:95.00, low52:58.00, mktCap:"147B", color:"#f97316" },
  { symbol:"DTK",  name:"Diamond Trust Bank",       sector:"Banking",       price:156.75,change:0.00,  volume:50080,    pe:7.8,  divYield:3.1, high52:165.0, low52:92.00, mktCap:"89B",  color:"#a855f7" },
  { symbol:"SCBK", name:"Standard Chartered Kenya", sector:"Banking",       price:330.00,change:2.80,  volume:95000,    pe:10.2, divYield:4.8, high52:350.0, low52:210.0, mktCap:"124B", color:"#ec4899" },
  { symbol:"IMH",  name:"I & M Holdings",           sector:"Banking",       price:49.10, change:0.10,  volume:699650,   pe:6.5,  divYield:4.2, high52:56.00, low52:33.00, mktCap:"84B",  color:"#06b6d4" },
  { symbol:"HFCK", name:"HF Group",                 sector:"Banking",       price:10.75, change:-0.46, volume:115470,   pe:null, divYield:0,   high52:14.50, low52:7.80,  mktCap:"8B",   color:"#84cc16" },
  { symbol:"EABL", name:"East African Breweries",   sector:"Manufacturing", price:255.00,change:-0.10, volume:280380,   pe:22.4, divYield:3.8, high52:285.0, low52:138.0, mktCap:"204B", color:"#f59e0b" },
  { symbol:"BAT",  name:"BAT Kenya",                sector:"Manufacturing", price:541.00,change:-1.28, volume:27280,    pe:12.1, divYield:8.9, high52:620.0, low52:440.0, mktCap:"54B",  color:"#d97706" },
  { symbol:"CARB", name:"Carbacid Investments",     sector:"Manufacturing", price:29.30, change:-1.51, volume:27230,    pe:14.3, divYield:5.1, high52:35.00, low52:18.50, mktCap:"4B",   color:"#78716c" },
  { symbol:"JUB",  name:"Jubilee Holdings",         sector:"Insurance",     price:389.75,change:0.32,  volume:6200,     pe:9.5,  divYield:3.2, high52:420.0, low52:270.0, mktCap:"38B",  color:"#6366f1" },
  { symbol:"BRIT", name:"Britam Holdings",          sector:"Insurance",     price:11.95, change:1.70,  volume:373120,   pe:11.2, divYield:4.2, high52:14.00, low52:7.50,  mktCap:"31B",  color:"#3b82f6" },
  { symbol:"CIC",  name:"CIC Insurance Group",       sector:"Insurance",     price:4.98,  change:-1.58, volume:205810,   pe:9.8,  divYield:3.1, high52:6.50,  low52:3.20,  mktCap:"9B",   color:"#8b5cf6" },
  { symbol:"CTUM", name:"Centum Investment",        sector:"Investment",    price:14.30, change:-3.05, volume:15630,    pe:null, divYield:1.5, high52:19.50, low52:12.00, mktCap:"16B",  color:"#14b8a6" },
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

function calcRSI(data, period = 14) {
  if (data.length < period + 1) return 50;
  const ch = data.slice(1).map((d, i) => d.price - data[i].price);
  const rec = ch.slice(-period);
  const gains = rec.filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
  const losses = Math.abs(rec.filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
  if (losses === 0) return 100;
  return parseFloat((100 - 100 / (1 + gains / losses)).toFixed(1));
}

function calcVolatility(data) {
  const ret = data.slice(1).map((d, i) => (d.price - data[i].price) / data[i].price);
  const mean = ret.reduce((a, b) => a + b, 0) / ret.length;
  const variance = ret.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / ret.length;
  return parseFloat((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1));
}

function calcBollinger(data, period = 20) {
  return data.map((d, i) => {
    if (i < period - 1) return { ...d, upper: null, lower: null, mid: null };
    const sl = data.slice(i - period + 1, i + 1).map(x => x.price);
    const mean = sl.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(sl.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period);
    return { ...d, upper: parseFloat((mean + 2 * std).toFixed(2)), lower: parseFloat((mean - 2 * std).toFixed(2)), mid: parseFloat(mean.toFixed(2)) };
  });
}

function getSignal(stock, hist, rsiValue) {
  const smaD = calcSMA(hist, 20); const lastSMA = smaD[smaD.length - 1]?.sma;
  const volValue = calcVolatility(hist); 
  let currentScore = 0; 
  let reasons = [];

  if (stock.change > 1.5)  { currentScore += 1; reasons.push("Strong momentum ↑"); }
  if (stock.change < -1.5) { currentScore -= 1; reasons.push("Selling pressure ↓"); }
  if (rsiValue < 35)  { currentScore += 2; reasons.push(`Oversold RSI ${rsiValue}`); }
  else if (rsiValue < 45) { currentScore += 1; reasons.push(`Near oversold RSI ${rsiValue}`); }
  if (rsiValue > 65)  { currentScore -= 2; reasons.push(`Overbought RSI ${rsiValue}`); }
  if (stock.pe && stock.pe < 7)  { currentScore += 2; reasons.push("Deep value P/E<7"); }
  else if (stock.pe && stock.pe < 10) { currentScore += 1; reasons.push("Value P/E<10"); }
  if (stock.divYield > 5) { currentScore += 1; reasons.push(`High yield ${stock.divYield}%`); }
  if (lastSMA && stock.price > lastSMA * 1.01) { currentScore += 1; reasons.push("Above 20-day MA"); }
  if (lastSMA && stock.price < lastSMA * 0.99) { currentScore -= 1; reasons.push("Below 20-day MA"); }
  if (volValue < 30) { currentScore += 1; reasons.push("Low volatility"); }
  if (volValue > 55) { currentScore -= 1; reasons.push("High volatility risk"); }

  const signal = currentScore >= 3 ? "STRONG BUY" : currentScore >= 1 ? "BUY" : currentScore <= -3 ? "STRONG SELL" : currentScore <= -1 ? "SELL" : "HOLD";
  return { signal, score: currentScore, reasons, vol: volValue };
}

const SIGNAL_STYLE = {
  "STRONG BUY":  { bg:"#052e16", border:"#16a34a", color:"#4ade80" },
  "BUY":         { bg:"#064e3b", border:"#059669", color:"#34d399" },
  "HOLD":        { bg:"#1c1917", border:"#57534e", color:"#a8a29e" },
  "SELL":        { bg:"#450a0a", border:"#dc2626", color:"#f87171" },
  "STRONG SELL": { bg:"#3b0764", border:"#9333ea", color:"#e879f9" },
};

/* ================================================================
   ANTHROPIC API KEY INPUT
================================================================ */
function ApiKeyGate({ onKey }) {
  const [val, setVal] = useState("");
  const saved = storage.get("anthropic_key");
  if (saved) { onKey(saved); return null; }
  return (
    <div style={{ minHeight:"100vh", background:"#060a12", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Georgia',serif" }}>
      <div style={{ background:"#0a1628", border:"1px solid #1e3a5f", borderRadius:16, padding:"40px 36px", maxWidth:440, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:8 }}>🇰🇪</div>
        <div style={{ fontFamily:"Georgia,serif", fontSize:26, fontWeight:700, color:"#38bdf8", marginBottom:6, letterSpacing:2 }}>NSE VAULT</div>
        <div style={{ fontSize:12, color:"#475569", marginBottom:24 }}>Enter your Anthropic API key to enable AI analysis &amp; live news</div>
        <input type="password" placeholder="sk-ant-api03-..." value={val} onChange={e => setVal(e.target.value)}
          style={{ width:"100%", background:"#060a12", border:"1px solid #1e3a5f", borderRadius:8, padding:"11px 14px", color:"#e2e8f0", fontSize:13, boxSizing:"border-box", marginBottom:12 }}/>
        <button onClick={() => { if (val.startsWith("sk-ant")) { storage.set("anthropic_key", val); onKey(val); } else alert("Paste a valid Anthropic API key (starts with sk-ant)"); }}
          style={{ width:"100%", padding:"12px", background:"linear-gradient(135deg,#0369a1,#0d9488)", border:"none", borderRadius:10, color:"#fff", fontSize:14, cursor:"pointer", fontWeight:600 }}>
          Enter NSE Vault →
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN APP
================================================================ */
export default function App() {
  const [apiKey, setApiKey] = useState(() => storage.get("anthropic_key") || "");
  const [page, setPage] = useState("dashboard");
  const [holdings, setHoldings] = useState(() => storage.get("holdings") || {});
  const [watchlist, setWatchlist] = useState(() => storage.get("watchlist") || ["SCOM","EQTY","COOP","CIC","BRIT"]);
  const [priceAlerts, setPriceAlerts] = useState(() => storage.get("priceAlerts") || []);
  const [journalEntries, setJournalEntries] = useState(() => storage.get("journal") || []);
  const [selectedStock, setSelectedStock] = useState(ALL_NSE_STOCKS[0]);
  const [aiState, setAiState] = useState({ loading:false, text:"", stock:null, mode:"" });
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSearched, setNewsSearched] = useState(false);
  const [chartType, setChartType] = useState("price");
  const [notification, setNotification] = useState(null);
  const [newAlert, setNewAlert] = useState({ symbol:"SCOM", targetPrice:"", direction:"above" });
  const [journalText, setJournalText] = useState("");
  const histCache = useRef({});

  const getHistoryCached = useCallback((symbol) => {
    if (!histCache.current[symbol]) histCache.current[symbol] = genHistory(ALL_NSE_STOCKS.find(s => s.symbol === symbol)?.price || 50);
    return histCache.current[symbol];
  }, []);

  const save = (key, val) => { storage.set(key, val); };
  const notify = (msg, type = "success") => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3500); };

  if (!apiKey) return <ApiKeyGate onKey={k => setApiKey(k)} />;

  /* maths */
  const portfolio = ALL_NSE_STOCKS.map(s => {
    const h = holdings[s.symbol] || { ziidi:0, faida:0, avgPrice:s.price };
    const total = (h.ziidi || 0) + (h.faida || 0);
    const cost  = total * (h.avgPrice || s.price);
    const value = total * s.price;
    return { ...s, ...h, totalShares:total, cost, value, gain:value-cost, gainPct: cost>0 ? ((value-cost)/cost*100) : 0 };
  }).filter(s => s.totalShares > 0);

  const totalValue = portfolio.reduce((s,p) => s+p.value, 0);
  const totalCost  = portfolio.reduce((s,p) => s+p.cost,  0);
  const totalGain  = totalValue - totalCost;
  const totalGainPct = totalCost > 0 ? (totalGain/totalCost*100) : 0;
  const totalDiv   = portfolio.reduce((s,p) => s + p.value*(p.divYield/100), 0);

  const callAI = async (prompt, mode, stockSym="") => {
    setAiState({ loading:true, text:"", stock:stockSym, mode });
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key": apiKey, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
        body: JSON.stringify({ model:"claude-3-5-sonnet-20240620", max_tokens:1000, messages:[{ role:"user", content:prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(c=>c.text||"").join("") || "Analysis unavailable.";
      setAiState({ loading:false, text, stock:stockSym, mode });
    } catch {
      setAiState({ loading:false, text:"Could not connect.", stock:stockSym, mode });
    }
  };

  return (
    <div style={{ fontFamily:"'Georgia',serif", background:"#060a12", minHeight:"100vh", color:"#e2e8f0", padding:20 }}>
      <div style={{ maxWidth:800, margin:"0 auto" }}>
        <h1 style={{ color:"#38bdf8" }}>NSE VAULT 🇰🇪 Dashboard</h1>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:40 }}>
           <div style={{ background:"#0a1628", padding:20, borderRadius:12, border:"1px solid #1e3a5f" }}>
              <div style={{ fontSize:12, color:"#475569" }}>PORTFOLIO VALUE</div>
              <div style={{ fontSize:24, fontWeight:700 }}>KES {totalValue.toLocaleString()}</div>
           </div>
           <div style={{ background:"#0a1628", padding:20, borderRadius:12, border:"1px solid #1e3a5f" }}>
              <div style={{ fontSize:12, color:"#475569" }}>ANNUAL DIVIDENDS</div>
              <div style={{ fontSize:24, fontWeight:700 }}>KES {totalDiv.toLocaleString()}</div>
           </div>
        </div>
        
        <div style={{ background:"#0a1628", padding:20, borderRadius:12, border:"1px solid #1e3a5f" }}>
          <h2 style={{ fontSize:18 }}>AI Market Analysis</h2>
          <button 
            onClick={() => callAI("Analyze the current NSE market outlook for March 2026.", "market", "general")}
            style={{ padding:"10px 20px", background:"#38bdf8", border:"none", borderRadius:8, cursor:"pointer" }}>
            Ask AI Advisor
          </button>
          {aiState.loading && <p>Thinking...</p>}
          {aiState.text && <p style={{ marginTop:20, lineHeight:1.6 }}>{aiState.text}</p>}
        </div>
      </div>
    </div>
  );
} // Final closing brace!
