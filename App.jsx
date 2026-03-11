import { useState, useEffect, useCallback, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
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
  { symbol:"SCOM", name:"Safaricom PLC",            sector:"Telco",         price:24.15, change:3.17,  volume:30600000, pe:18.2, divYield:4.9, high52:28.50, low52:18.40, mktCap:"967B", color:"#22c55e" },
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
  { symbol:"CIC",  name:"CIC Insurance Group",      sector:"Insurance",     price:4.98,  change:-1.58, volume:205810,   pe:9.8,  divYield:3.1, high52:6.50,  low52:3.20,  mktCap:"9B",   color:"#8b5cf6" },
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

function getSignal(stock, hist, rsi) {
  const smaD = calcSMA(hist, 20); const lastSMA = smaD[smaD.length - 1]?.sma;
  const vol = calcVolatility(hist); let score = 0, reasons = [];
  if (stock.change > 1.5)  { score += 1; reasons.push("Strong momentum ↑"); }
  if (stock.change < -1.5) { score -= 1; reasons.push("Selling pressure ↓"); }
  if (rsi < 35)  { score += 2; reasons.push(`Oversold RSI ${rsi}`); }
  else if (rsi < 45) { score += 1; reasons.push(`Near oversold RSI ${rsi}`); }
  if (rsi > 65)  { score -= 2; reasons.push(`Overbought RSI ${rsi}`); }
  if (stock.pe && stock.pe < 7)  { score += 2; reasons.push("Deep value P/E<7"); }
  else if (stock.pe && stock.pe < 10) { score += 1; reasons.push("Value P/E<10"); }
  if (stock.divYield > 5) { score += 1; reasons.push(`High yield ${stock.divYield}%`); }
  if (lastSMA && stock.price > lastSMA * 1.01) { score += 1; reasons.push("Above 20-day MA"); }
  if (lastSMA && stock.price < lastSMA * 0.99) { score -= 1; reasons.push("Below 20-day MA"); }
  if (vol < 30) { score += 1; reasons.push("Low volatility"); }
  if (vol > 55) { score -= 1; reasons.push("High volatility risk"); }
  const signal = score >= 3 ? "STRONG BUY" : score >= 1 ? "BUY" : score <= -3 ? "STRONG SELL" : score <= -1 ? "SELL" : "HOLD";
  return { signal, score, reasons, vol };
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
        <div style={{ fontSize:10, color:"#334155", marginTop:14 }}>
          Get a free API key at <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color:"#38bdf8" }}>console.anthropic.com</a><br/>
          Key is stored locally in your browser only.
        </div>
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

  if (!apiKey) return <ApiKeyGate onKey={k => setApiKey(k)} />;

  const save = (key, val) => { storage.set(key, val); };
  const notify = (msg, type = "success") => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3500); };

  const getHistory = useCallback((symbol) => {
    if (!histCache.current[symbol]) histCache.current[symbol] = genHistory(ALL_NSE_STOCKS.find(s => s.symbol === symbol)?.price || 50);
    return histCache.current[symbol];
  }, []);

  /* ---------- portfolio maths ---------- */
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

  /* ---------- helpers ---------- */
  const updateHolding = (symbol, field, value) => {
    const updated = { ...holdings, [symbol]: { ...(holdings[symbol] || { ziidi:0, faida:0, avgPrice: ALL_NSE_STOCKS.find(s=>s.symbol===symbol)?.price }), [field]: parseFloat(value) || 0 } };
    setHoldings(updated); save("holdings", updated);
  };

  const toggleWatch = (symbol) => {
    const updated = watchlist.includes(symbol) ? watchlist.filter(s=>s!==symbol) : [...watchlist, symbol];
    setWatchlist(updated); save("watchlist", updated);
  };

  const addAlert = () => {
    if (!newAlert.targetPrice) return;
    const updated = [...priceAlerts, { ...newAlert, id:Date.now(), active:true, created:new Date().toLocaleDateString("en-KE") }];
    setPriceAlerts(updated); save("priceAlerts", updated);
    notify(`Alert set for ${newAlert.symbol} ${newAlert.direction} KES ${newAlert.targetPrice}`);
  };

  const removeAlert = (id) => { const u = priceAlerts.filter(a=>a.id!==id); setPriceAlerts(u); save("priceAlerts",u); };

  const addJournal = () => {
    if (!journalText.trim()) return;
    const updated = [{ id:Date.now(), text:journalText, date:new Date().toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"}), time:new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}) }, ...journalEntries];
    setJournalEntries(updated); save("journal", updated); setJournalText(""); notify("Trade note saved!");
  };
  const deleteJournal = (id) => { const u = journalEntries.filter(j=>j.id!==id); setJournalEntries(u); save("journal",u); };

  /* ---------- AI ---------- */
  const callAI = async (prompt, mode, stockSym="") => {
    setAiState({ loading:true, text:"", stock:stockSym, mode });
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key": apiKey, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000, messages:[{ role:"user", content:prompt }] })
      });
      const data = await res.json();
      const text = data.content?.map(c=>c.text||"").join("") || "Analysis unavailable.";
      setAiState({ loading:false, text, stock:stockSym, mode });
    } catch {
      setAiState({ loading:false, text:"Could not connect. Please check your API key.", stock:stockSym, mode });
    }
  };

  const fetchNews = async () => {
    setNewsLoading(true); setNewsSearched(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-api-key":apiKey, "anthropic-version":"2023-06-01", "anthropic-dangerous-direct-browser-access":"true" },
        body: JSON.stringify({
          model:"claude-sonnet-4-20250514", max_tokens:1500,
          tools:[{ "type":"web_search_20250305","name":"web_search" }],
          messages:[{ role:"user", content:`Search for the latest NSE Kenya stock market news from today or this week (March 2026). Include news about Safaricom, Equity Bank, KCB, EABL, and general NSE market trends. Return a JSON array of 6 news items. Fields: title, source, summary (2 sentences max), sentiment (positive/negative/neutral), symbol (relevant NSE stock symbol or "NSE"), date. Return ONLY the JSON array, no markdown fences.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c=>c.text||"").join("").trim() || "[]";
      try { setNews(JSON.parse(text.replace(/```json|```/g,"").trim())); } catch { setNews([]); }
    } catch { setNews([]); }
    setNewsLoading(false);
  };

  /* ---------- derived chart data ---------- */
  const hist     = getHistory(selectedStock.symbol);
  const rsi      = calcRSI(hist);
  const { signal, score, reasons, vol } = getSignal(selectedStock, hist, rsi);
  const smaHist  = calcSMA(hist, 20);
  const bollHist = calcBollinger(hist, 20);
  const signalStyle = SIGNAL_STYLE[signal] || SIGNAL_STYLE["HOLD"];

  const sectorData = portfolio.reduce((acc,p) => { acc[p.sector]=(acc[p.sector]||0)+p.value; return acc; }, {});
  const sectorPie  = Object.entries(sectorData).map(([name,value]) => ({ name, value:parseFloat(value.toFixed(0)), color:SECTOR_COLORS[name]||"#64748b" }));

  const portfolioHistData = portfolio.length > 0 ? Array.from({length:30},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(29-i));
    const f=0.85+(i/29)*0.15+(Math.random()-0.5)*0.03;
    return { date:d.toLocaleDateString("en-KE",{month:"short",day:"numeric"}), value:parseFloat((totalValue*f).toFixed(0)) };
  }) : [];

  const watchlistStocks = ALL_NSE_STOCKS.filter(s=>watchlist.includes(s.symbol));

  /* ================================================================
     RENDER
  ================================================================ */
  return (
    <div style={{ fontFamily:"'Georgia',serif", background:"#060a12", minHeight:"100vh", color:"#e2e8f0", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Source+Sans+3:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#1e3a5f #060a12}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#060a12}::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:4px}
        .hr:hover{background:#0d1f35!important;transition:background 0.15s}
        .sc:hover{transform:translateY(-1px);border-color:var(--c)!important;transition:all 0.2s}
        .shimmer{background:linear-gradient(90deg,#0d1f35 25%,#1e3a5f 50%,#0d1f35 75%);background-size:200% 100%;animation:sh 1.5s infinite}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .slide{animation:si 0.25s ease}@keyframes si{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .pulse{animation:pu 2s infinite}@keyframes pu{0%,100%{opacity:1}50%{opacity:.4}}
        input,select,textarea{outline:none;font-family:'Source Sans 3',sans-serif}
        button{font-family:'Source Sans 3',sans-serif;cursor:pointer}
      `}</style>

      {/* BG grid */}
      <div style={{position:"fixed",inset:0,backgroundImage:"linear-gradient(rgba(14,165,233,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,.03) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none",zIndex:0}}/>

      {/* Notification toast */}
      {notification && (
        <div className="slide" style={{position:"fixed",top:16,right:16,zIndex:9999,background:notification.type==="alert"?"#7c2d12":"#052e16",border:`1px solid ${notification.type==="alert"?"#ea580c":"#16a34a"}`,borderRadius:10,padding:"12px 20px",color:"#f1f5f9",fontSize:13,maxWidth:340,fontFamily:"'Source Sans 3',sans-serif",boxShadow:"0 8px 32px #00000080"}}>
          {notification.msg}
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{background:"linear-gradient(180deg,#0a1628,#060a12)",borderBottom:"1px solid #0e2040",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58,position:"sticky",top:0,zIndex:100}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:900,background:"linear-gradient(135deg,#38bdf8,#10b981)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",letterSpacing:3}}>NSE VAULT 🇰🇪</div>
        <nav style={{display:"flex",gap:2}}>
          {[["dashboard","📊 Dashboard"],["portfolio","💼 Portfolio"],["market","📈 Market"],["news","📰 News"],["alerts","🔔 Alerts"],["journal","📓 Journal"],["learn","🎓 Guide"]].map(([p,l])=>(
            <button key={p} onClick={()=>setPage(p)} style={{padding:"6px 13px",background:page===p?"#0d2137":"transparent",border:"none",borderBottom:page===p?"2px solid #38bdf8":"2px solid transparent",color:page===p?"#38bdf8":"#475569",fontSize:12,transition:"all 0.15s"}}>
              {l}
            </button>
          ))}
        </nav>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:9,color:"#334155",letterSpacing:1,fontFamily:"'Source Sans 3',sans-serif"}}>PORTFOLIO</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:17,color:totalGain>=0?"#34d399":"#f87171",fontWeight:700}}>KES {totalValue.toLocaleString()}</div>
          {totalCost>0&&<div style={{fontSize:9,color:totalGain>=0?"#34d399":"#f87171",fontFamily:"'Source Sans 3',sans-serif"}}>{totalGain>=0?"+":""}{totalGainPct.toFixed(1)}% all time</div>}
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px",position:"relative",zIndex:1}}>

        {/* ══════ DASHBOARD ══════ */}
        {page==="dashboard"&&(
          <div className="slide">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[
                {label:"Total Invested",val:`KES ${totalCost.toLocaleString()}`,sub:"Your cost basis",color:"#64748b",icon:"💰"},
                {label:"Current Value", val:`KES ${totalValue.toLocaleString()}`,sub:`${portfolio.length} holdings`,color:"#38bdf8",icon:"📊"},
                {label:"Total P&L",     val:`${totalGain>=0?"+":""}KES ${Math.abs(totalGain).toLocaleString()}`,sub:`${totalGainPct>=0?"+":""}${totalGainPct.toFixed(1)}%`,color:totalGain>=0?"#34d399":"#f87171",icon:totalGain>=0?"📈":"📉"},
                {label:"Annual Divs",   val:`~KES ${totalDiv.toLocaleString(undefined,{maximumFractionDigits:0})}`,sub:"Est. passive income",color:"#a78bfa",icon:"💸"},
              ].map(k=>(
                <div key={k.label} style={{background:"linear-gradient(135deg,#0a1628,#0d1f35)",borderRadius:12,padding:"16px 18px",border:"1px solid #0e2040"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:9,color:"#475569",textTransform:"uppercase",letterSpacing:1,fontFamily:"'Source Sans 3',sans-serif"}}>{k.label}</span><span style={{fontSize:16}}>{k.icon}</span></div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:16,fontWeight:700,color:k.color}}>{k.val}</div>
                  <div style={{fontSize:10,color:"#334155",marginTop:2,fontFamily:"'Source Sans 3',sans-serif"}}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
              <div style={{background:"#0a1628",borderRadius:12,padding:16,border:"1px solid #0e2040"}}>
                <div style={{fontSize:10,color:"#475569",marginBottom:10,fontFamily:"'Source Sans 3',sans-serif",letterSpacing:1,textTransform:"uppercase"}}>30-Day Portfolio Value</div>
                {portfolioHistData.length>0?(
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={portfolioHistData}>
                      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25}/><stop offset="100%" stopColor="#38bdf8" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0e2040"/><XAxis dataKey="date" tick={{fontSize:9,fill:"#334155"}} interval={6}/><YAxis tick={{fontSize:9,fill:"#334155"}} tickFormatter={v=>"K"+(v/1000).toFixed(0)}/>
                      <Tooltip contentStyle={{background:"#0d1f35",border:"1px solid #0e2040",fontSize:11,fontFamily:"'Source Sans 3',sans-serif"}} formatter={v=>[`KES ${v.toLocaleString()}`,""]}/>
                      <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} fill="url(#pg)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                ):<div style={{height:150,display:"flex",alignItems:"center",justifyContent:"center",color:"#334155",fontSize:12,fontFamily:"'Source Sans 3',sans-serif"}}>Add holdings to see chart</div>}
              </div>
              <div style={{background:"#0a1628",borderRadius:12,padding:16,border:"1px solid #0e2040"}}>
                <div style={{fontSize:10,color:"#475569",marginBottom:8,fontFamily:"'Source Sans 3',sans-serif",letterSpacing:1,textTransform:"uppercase"}}>Sector Split</div>
                {sectorPie.length>0?(
                  <><ResponsiveContainer width="100%" height={120}><PieChart><Pie data={sectorPie} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>{sectorPie.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip contentStyle={{background:"#0d1f35",border:"1px solid #0e2040",fontSize:10}} formatter={v=>[`KES ${v.toLocaleString()}`,]}/></PieChart></ResponsiveContainer>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:4}}>{sectorPie.map(s=><span key={s.name} style={{fontSize:9,color:s.color,fontFamily:"'Source Sans 3',sans-serif"}}>● {s.name}</span>)}</div></>
                ):<div style={{height:150,display:"flex",alignItems:"center",justifyContent:"center",color:"#334155",fontSize:11,fontFamily:"'Source Sans 3',sans-serif",textAlign:"center"}}>Add holdings to see sector split</div>}
              </div>
            </div>

            {/* Holdings table */}
            <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",overflow:"hidden",marginBottom:14}}>
              <div style={{padding:"12px 18px",borderBottom:"1px solid #0e2040",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",fontFamily:"'Source Sans 3',sans-serif"}}>Holdings</span>
                <button onClick={()=>setPage("portfolio")} style={{fontSize:11,background:"transparent",border:"1px solid #1e3a5f",borderRadius:6,color:"#38bdf8",padding:"3px 10px"}}>Manage →</button>
              </div>
              {portfolio.length===0?(
                <div style={{padding:"36px 20px",textAlign:"center",color:"#334155",fontFamily:"'Source Sans 3',sans-serif"}}>
                  <div style={{fontSize:28,marginBottom:6}}>📭</div>
                  <div style={{fontSize:12}}>No holdings. Go to <strong style={{color:"#38bdf8",cursor:"pointer"}} onClick={()=>setPage("portfolio")}>Portfolio</strong> to add your Faida & Ziidi shares.</div>
                </div>
              ):(
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr style={{background:"#060a12"}}>{["Stock","Ziidi","Faida","Total","Avg Price","Value","P&L","Div/yr","Signal"].map(h=><th key={h} style={{textAlign:"left",padding:"7px 13px",fontSize:9,color:"#334155",fontFamily:"'Source Sans 3',sans-serif",letterSpacing:.5,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                  <tbody>{portfolio.map(p=>{const ph=getHistory(p.symbol);const pr=calcRSI(ph);const ps=getSignal(p,ph,pr);const ss=SIGNAL_STYLE[ps.signal]||SIGNAL_STYLE["HOLD"];return(
                    <tr key={p.symbol} className="hr" style={{borderBottom:"1px solid #060a12",cursor:"pointer"}} onClick={()=>{setSelectedStock(ALL_NSE_STOCKS.find(s=>s.symbol===p.symbol));setPage("market");}}>
                      <td style={{padding:"11px 13px"}}><div style={{fontFamily:"'Cinzel',serif",fontSize:13,color:p.color,fontWeight:700}}>{p.symbol}</div><div style={{fontSize:9,color:"#475569",fontFamily:"'Source Sans 3',sans-serif"}}>{p.name.substring(0,18)}</div></td>
                      <td style={{padding:"11px 13px",fontSize:12,color:"#4ade80",fontFamily:"'Source Sans 3',sans-serif"}}>{p.ziidi||0}</td>
                      <td style={{padding:"11px 13px",fontSize:12,color:"#fbbf24",fontFamily:"'Source Sans 3',sans-serif"}}>{p.faida||0}</td>
                      <td style={{padding:"11px 13px",fontSize:13,color:"#e2e8f0",fontWeight:600,fontFamily:"'Source Sans 3',sans-serif"}}>{p.totalShares}</td>
                      <td style={{padding:"11px 13px",fontSize:12,color:"#94a3b8",fontFamily:"'Source Sans 3',sans-serif"}}>KES {(p.avgPrice||p.price).toFixed(2)}</td>
                      <td style={{padding:"11px 13px",fontSize:13,color:"#f1f5f9",fontWeight:600,fontFamily:"'Source Sans 3',sans-serif"}}>KES {p.value.toLocaleString()}</td>
                      <td style={{padding:"11px 13px"}}><div style={{fontSize:12,color:p.gain>=0?"#34d399":"#f87171",fontFamily:"'Source Sans 3',sans-serif",fontWeight:600}}>{p.gain>=0?"+":""}KES {Math.abs(p.gain).toFixed(0)}</div><div style={{fontSize:9,color:p.gainPct>=0?"#34d399":"#f87171",fontFamily:"'Source Sans 3',sans-serif"}}>{p.gainPct>=0?"+":""}{p.gainPct.toFixed(1)}%</div></td>
                      <td style={{padding:"11px 13px",fontSize:11,color:"#a78bfa",fontFamily:"'Source Sans 3',sans-serif"}}>KES {(p.value*(p.divYield/100)).toFixed(0)}</td>
                      <td style={{padding:"11px 13px"}}><span style={{fontSize:9,padding:"2px 7px",borderRadius:5,background:ss.bg,border:`1px solid ${ss.border}`,color:ss.color,fontFamily:"'Source Sans 3',sans-serif",fontWeight:600}}>{ps.signal}</span></td>
                    </tr>
                  );})}
                  </tbody>
                </table>
              )}
            </div>

            {/* Watchlist */}
            <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",padding:16}}>
              <div style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",marginBottom:12,fontFamily:"'Source Sans 3',sans-serif"}}>Watchlist</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
                {watchlistStocks.map(s=>{const sh=getHistory(s.symbol);const sr=calcRSI(sh);const ss=getSignal(s,sh,sr);const sst=SIGNAL_STYLE[ss.signal]||SIGNAL_STYLE["HOLD"];return(
                  <div key={s.symbol} className="sc" style={{"--c":s.color,background:"#060a12",borderRadius:10,padding:12,border:"1px solid #0e2040",cursor:"pointer"}} onClick={()=>{setSelectedStock(s);setPage("market");}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:14,color:s.color,fontWeight:700}}>{s.symbol}</div>
                    <div style={{fontSize:9,color:"#475569",fontFamily:"'Source Sans 3',sans-serif",marginBottom:5}}>{s.name.substring(0,15)}</div>
                    <div style={{fontSize:15,fontWeight:700,color:"#f1f5f9",fontFamily:"'Cinzel',serif"}}>KES {s.price}</div>
                    <div style={{fontSize:10,color:s.change>=0?"#34d399":"#f87171",fontFamily:"'Source Sans 3',sans-serif"}}>{s.change>=0?"+":""}{s.change}%</div>
                    <div style={{marginTop:5,fontSize:9,padding:"1px 5px",borderRadius:4,background:sst.bg,border:`1px solid ${sst.border}`,color:sst.color,display:"inline-block",fontFamily:"'Source Sans 3',sans-serif"}}>{ss.signal}</div>
                  </div>
                );})}
              </div>
            </div>
          </div>
        )}

        {/* ══════ PORTFOLIO ══════ */}
        {page==="portfolio"&&(
          <div className="slide">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div><div style={{fontFamily:"'Cinzel',serif",fontSize:20,color:"#38bdf8",fontWeight:700}}>Portfolio Manager</div><div style={{fontSize:11,color:"#475569",fontFamily:"'Source Sans 3',sans-serif"}}>Enter your shares from Faida & Ziidi. Changes save automatically.</div></div>
              <div style={{display:"flex",gap:8}}><div style={{background:"#052e16",border:"1px solid #166534",borderRadius:7,padding:"5px 12px",fontSize:11,color:"#4ade80",fontFamily:"'Source Sans 3',sans-serif"}}>📱 Ziidi = Green</div><div style={{background:"#431407",border:"1px solid #92400e",borderRadius:7,padding:"5px 12px",fontSize:11,color:"#fbbf24",fontFamily:"'Source Sans 3',sans-serif"}}>🏢 Faida = Gold</div></div>
            </div>
            {Object.entries(ALL_NSE_STOCKS.reduce((a,s)=>{if(!a[s.sector])a[s.sector]=[];a[s.sector].push(s);return a;},{})).map(([sector,stocks])=>(
              <div key={sector} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}><div style={{width:7,height:7,borderRadius:"50%",background:SECTOR_COLORS[sector]||"#64748b"}}/><span style={{fontSize:10,color:SECTOR_COLORS[sector]||"#64748b",textTransform:"uppercase",letterSpacing:2,fontFamily:"'Source Sans 3',sans-serif"}}>{sector}</span></div>
                <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr style={{background:"#060a12"}}>{["","Company","Price","📱 Ziidi","🏢 Faida","Avg Buy Price","Value","P&L","Div%","⭐"].map(h=><th key={h} style={{textAlign:"left",padding:"7px 11px",fontSize:9,color:"#334155",letterSpacing:.5,textTransform:"uppercase",fontFamily:"'Source Sans 3',sans-serif"}}>{h}</th>)}</tr></thead>
                    <tbody>{stocks.map(s=>{
                      const h=holdings[s.symbol]||{ziidi:0,faida:0,avgPrice:s.price};
                      const total=(h.ziidi||0)+(h.faida||0);const value=total*s.price;const cost=total*(h.avgPrice||s.price);const gain=value-cost;const gainPct=cost>0?(gain/cost*100):0;
                      return(
                        <tr key={s.symbol} className="hr" style={{borderBottom:"1px solid #060a12"}}>
                          <td style={{padding:"9px 11px",width:8}}><div style={{width:7,height:7,borderRadius:"50%",background:s.color}}/></td>
                          <td style={{padding:"9px 11px"}}><div style={{fontFamily:"'Cinzel',serif",fontSize:12,color:s.color,fontWeight:700}}>{s.symbol}</div><div style={{fontSize:9,color:"#475569",fontFamily:"'Source Sans 3',sans-serif"}}>{s.name}</div></td>
                          <td style={{padding:"9px 11px"}}><div style={{fontSize:12,color:"#f1f5f9",fontFamily:"'Source Sans 3',sans-serif",fontWeight:600}}>KES {s.price}</div><div style={{fontSize:9,color:s.change>=0?"#34d399":"#f87171",fontFamily:"'Source Sans 3',sans-serif"}}>{s.change>=0?"+":""}{s.change}%</div></td>
                          <td style={{padding:"9px 11px"}}><input type="number" min="0" value={h.ziidi||0} onChange={e=>updateHolding(s.symbol,"ziidi",e.target.value)} style={{width:68,background:"#052e16",border:"1px solid #166534",borderRadius:6,padding:"5px 7px",color:"#4ade80",fontSize:13,textAlign:"center"}}/></td>
                          <td style={{padding:"9px 11px"}}><input type="number" min="0" value={h.faida||0} onChange={e=>updateHolding(s.symbol,"faida",e.target.value)} style={{width:68,background:"#431407",border:"1px solid #92400e",borderRadius:6,padding:"5px 7px",color:"#fbbf24",fontSize:13,textAlign:"center"}}/></td>
                          <td style={{padding:"9px 11px"}}><div style={{display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:9,color:"#475569",fontFamily:"'Source Sans 3',sans-serif"}}>KES</span><input type="number" min="0" value={h.avgPrice||s.price} onChange={e=>updateHolding(s.symbol,"avgPrice",e.target.value)} style={{width:72,background:"#0d1f35",border:"1px solid #1e3a5f",borderRadius:6,padding:"5px 7px",color:"#94a3b8",fontSize:12,textAlign:"center"}}/></div></td>
                          <td style={{padding:"9px 11px",fontFamily:"'Source Sans 3',sans-serif"}}>{total>0?<><div style={{fontSize:12,color:"#f1f5f9",fontWeight:600}}>KES {value.toLocaleString()}</div><div style={{fontSize:9,color:"#475569"}}>{total} shares</div></>:<span style={{color:"#334155",fontSize:10}}>—</span>}</td>
                          <td style={{padding:"9px 11px",fontFamily:"'Source Sans 3',sans-serif"}}>{total>0?<><div style={{fontSize:12,color:gain>=0?"#34d399":"#f87171",fontWeight:600}}>{gain>=0?"+":""}KES {Math.abs(gain).toFixed(0)}</div><div style={{fontSize:9,color:gainPct>=0?"#34d399":"#f87171"}}>{gainPct>=0?"+":""}{gainPct.toFixed(1)}%</div></>:<span style={{color:"#334155",fontSize:10}}>—</span>}</td>
                          <td style={{padding:"9px 11px",fontSize:11,color:"#a78bfa",fontFamily:"'Source Sans 3',sans-serif"}}>{s.divYield}%</td>
                          <td style={{padding:"9px 11px"}}><button onClick={()=>toggleWatch(s.symbol)} style={{background:"transparent",border:"none",fontSize:15,opacity:watchlist.includes(s.symbol)?1:0.25,transition:"opacity 0.2s"}}>{watchlist.includes(s.symbol)?"⭐":"☆"}</button></td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════ MARKET ══════ */}
        {page==="market"&&(
          <div className="slide" style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:14}}>
            {/* Stock list */}
            <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",overflow:"hidden",maxHeight:"calc(100vh - 80px)",overflowY:"auto"}}>
              <div style={{padding:"10px 13px",borderBottom:"1px solid #0e2040",fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",fontFamily:"'Source Sans 3',sans-serif"}}>NSE Stocks</div>
              {ALL_NSE_STOCKS.map(s=>{const sh=getHistory(s.symbol);const sr=calcRSI(sh);const ss=getSignal(s,sh,sr);const sst=SIGNAL_STYLE[ss.signal]||SIGNAL_STYLE["HOLD"];return(
                <div key={s.symbol} className="hr" onClick={()=>setSelectedStock(s)} style={{padding:"9px 13px",cursor:"pointer",borderBottom:"1px solid #060a12",borderLeft:`3px solid ${selectedStock.symbol===s.symbol?s.color:"transparent"}`,background:selectedStock.symbol===s.symbol?"#0d1f35":"transparent"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><span style={{fontFamily:"'Cinzel',serif",fontSize:12,color:s.color,fontWeight:700}}>{s.symbol}</span><span style={{fontSize:9,color:"#334155",marginLeft:5,fontFamily:"'Source Sans 3',sans-serif"}}>{s.sector}</span></div>
                    <span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:sst.bg,color:sst.color,fontFamily:"'Source Sans 3',sans-serif"}}>{ss.signal}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
                    <span style={{fontSize:12,color:"#e2e8f0",fontFamily:"'Source Sans 3',sans-serif",fontWeight:600}}>KES {s.price}</span>
                    <span style={{fontSize:10,color:s.change>=0?"#34d399":"#f87171",fontFamily:"'Source Sans 3',sans-serif"}}>{s.change>=0?"+":""}{s.change}%</span>
                  </div>
                </div>
              );})}
            </div>

            {/* Detail panel */}
            <div>
              <div style={{background:"#0a1628",borderRadius:12,padding:"14px 18px",border:"1px solid #0e2040",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:24,color:selectedStock.color,fontWeight:900}}>{selectedStock.symbol}</span>
                      <span style={{fontSize:12,color:"#475569",fontFamily:"'Source Sans 3',sans-serif"}}>{selectedStock.name}</span>
                      <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:(SECTOR_COLORS[selectedStock.sector]||"#64748b")+"22",color:SECTOR_COLORS[selectedStock.sector]||"#64748b",border:`1px solid ${(SECTOR_COLORS[selectedStock.sector]||"#64748b")}40`,fontFamily:"'Source Sans 3',sans-serif"}}>{selectedStock.sector}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:30,color:"#f1f5f9",fontWeight:700}}>KES {selectedStock.price}</span>
                      <span style={{fontSize:14,color:selectedStock.change>=0?"#34d399":"#f87171",fontFamily:"'Source Sans 3',sans-serif"}}>{selectedStock.change>=0?"▲":"▼"} {Math.abs(selectedStock.change)}%</span>
                    </div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                    <div style={{padding:"8px 16px",borderRadius:10,background:signalStyle.bg,border:`2px solid ${signalStyle.border}`,textAlign:"center"}}>
                      <div style={{fontSize:8,color:"#475569",letterSpacing:2,fontFamily:"'Source Sans 3',sans-serif"}}>SIGNAL</div>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:16,color:signalStyle.color,fontWeight:700}}>{signal}</div>
                    </div>
                    <button onClick={()=>toggleWatch(selectedStock.symbol)} style={{fontSize:11,background:"transparent",border:"1px solid #1e3a5f",borderRadius:6,color:watchlist.includes(selectedStock.symbol)?"#fbbf24":"#475569",padding:"3px 10px"}}>{watchlist.includes(selectedStock.symbol)?"⭐ Watching":"☆ Watch"}</button>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:7,marginTop:12}}>
                  {[["RSI",rsi,rsi<35?"#34d399":rsi>65?"#f87171":"#94a3b8"],["Volatility",vol+"%",vol<30?"#34d399":vol>50?"#f87171":"#fbbf24"],["P/E",selectedStock.pe||"N/A","#94a3b8"],["Div Yield",selectedStock.divYield+"%","#a78bfa"],["52W High","KES "+selectedStock.high52,"#94a3b8"],["52W Low","KES "+selectedStock.low52,"#94a3b8"]].map(([l,v,c])=>(
                    <div key={l} style={{background:"#060a12",borderRadius:7,padding:"7px 9px"}}><div style={{fontSize:8,color:"#334155",textTransform:"uppercase",letterSpacing:.5,fontFamily:"'Source Sans 3',sans-serif"}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:c,fontFamily:"'Cinzel',serif",marginTop:1}}>{v}</div></div>
                  ))}
                </div>
              </div>

              {/* Signal reasons */}
              <div style={{background:"#0a1628",borderRadius:10,padding:"10px 14px",border:"1px solid #0e2040",marginBottom:10,display:"flex",flexWrap:"wrap",gap:6}}>
                {reasons.map(r=>{const pos=r.includes("↑")||r.includes("Low")||r.includes("Oversold")||r.includes("Above")||r.includes("value")||r.includes("yield")||r.includes("near");const neg=r.includes("↓")||r.includes("High vol")||r.includes("Overbought")||r.includes("Below")||r.includes("pressure");return <span key={r} style={{fontSize:10,padding:"2px 9px",borderRadius:20,background:pos?"#052e16":neg?"#450a0a":"#1e293b",color:pos?"#4ade80":neg?"#f87171":"#94a3b8",fontFamily:"'Source Sans 3',sans-serif"}}>{r}</span>;})}
                {reasons.length===0&&<span style={{color:"#334155",fontSize:11,fontFamily:"'Source Sans 3',sans-serif"}}>Neutral — no strong signal</span>}
              </div>

              {/* Charts */}
              <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",overflow:"hidden",marginBottom:10}}>
                <div style={{display:"flex",borderBottom:"1px solid #0e2040"}}>
                  {[["price","Price+MA"],["bollinger","Bollinger"],["volume","Volume"],["rsi","RSI"]].map(([k,l])=>(
                    <button key={k} onClick={()=>setChartType(k)} style={{flex:1,padding:"9px 0",background:chartType===k?"#0d1f35":"transparent",border:"none",borderBottom:chartType===k?`2px solid ${selectedStock.color}`:"2px solid transparent",color:chartType===k?"#f1f5f9":"#475569",fontSize:11}}>
                      {l}
                    </button>
                  ))}
                </div>
                <div style={{padding:14}}>
                  {chartType==="price"&&<ResponsiveContainer width="100%" height={180}><AreaChart data={smaHist}><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={selectedStock.color} stopOpacity={0.2}/><stop offset="100%" stopColor={selectedStock.color} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#0e2040"/><XAxis dataKey="date" tick={{fontSize:8,fill:"#334155"}} interval={8}/><YAxis tick={{fontSize:8,fill:"#334155"}} domain={["auto","auto"]}/><Tooltip contentStyle={{background:"#0d1f35",border:"1px solid #0e2040",fontSize:10,fontFamily:"'Source Sans 3',sans-serif"}}/><Area type="monotone" dataKey="price" stroke={selectedStock.color} strokeWidth={2} fill="url(#cg)" name="Price"/><Line type="monotone" dataKey="sma" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="20-Day MA"/></AreaChart></ResponsiveContainer>}
                  {chartType==="bollinger"&&<ResponsiveContainer width="100%" height={180}><AreaChart data={bollHist}><CartesianGrid strokeDasharray="3 3" stroke="#0e2040"/><XAxis dataKey="date" tick={{fontSize:8,fill:"#334155"}} interval={8}/><YAxis tick={{fontSize:8,fill:"#334155"}} domain={["auto","auto"]}/><Tooltip contentStyle={{background:"#0d1f35",border:"1px solid #0e2040",fontSize:10}}/><Area type="monotone" dataKey="upper" stroke="#ef444460" fill="#ef444410" strokeWidth={1} name="Upper"/><Area type="monotone" dataKey="price" stroke={selectedStock.color} strokeWidth={2} fill={selectedStock.color+"15"} name="Price"/><Line type="monotone" dataKey="lower" stroke="#34d39960" dot={false} strokeWidth={1} name="Lower"/></AreaChart></ResponsiveContainer>}
                  {chartType==="volume"&&<ResponsiveContainer width="100%" height={180}><BarChart data={hist}><CartesianGrid strokeDasharray="3 3" stroke="#0e2040"/><XAxis dataKey="date" tick={{fontSize:8,fill:"#334155"}} interval={8}/><YAxis tick={{fontSize:8,fill:"#334155"}} tickFormatter={v=>(v/1000).toFixed(0)+"K"}/><Tooltip contentStyle={{background:"#0d1f35",border:"1px solid #0e2040",fontSize:10}} formatter={v=>[v.toLocaleString(),"Volume"]}/><Bar dataKey="volume" fill={selectedStock.color+"80"} radius={[2,2,0,0]}/></BarChart></ResponsiveContainer>}
                  {chartType==="rsi"&&<div style={{padding:"8px 0"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:"#94a3b8",fontFamily:"'Source Sans 3',sans-serif"}}>RSI (14-period)</span><span style={{fontFamily:"'Cinzel',serif",fontSize:20,color:rsi<35?"#34d399":rsi>65?"#f87171":"#fbbf24",fontWeight:700}}>{rsi}</span></div><div style={{height:24,background:"#060a12",borderRadius:12,overflow:"hidden",position:"relative",marginBottom:6}}><div style={{position:"absolute",left:"35%",top:0,bottom:0,width:1,background:"#34d39940"}}/><div style={{position:"absolute",left:"65%",top:0,bottom:0,width:1,background:"#f8717140"}}/><div style={{height:"100%",width:rsi+"%",background:`linear-gradient(90deg,#34d399,${rsi<35?"#34d399":rsi>65?"#f87171":"#fbbf24"})`,borderRadius:12,transition:"width .8s"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"#334155",fontFamily:"'Source Sans 3',sans-serif",marginBottom:12}}><span>Oversold (0)</span><span>(100) Overbought</span></div><div style={{padding:10,background:"#060a12",borderRadius:7,fontSize:11,color:"#94a3b8",fontFamily:"'Source Sans 3',sans-serif",lineHeight:1.6}}>{rsi<35&&<><strong style={{color:"#34d399"}}>Oversold</strong> — potential buy opportunity.</>}{rsi>65&&<><strong style={{color:"#f87171"}}>Overbought</strong> — consider waiting before buying more.</>}{rsi>=35&&rsi<=65&&<><strong style={{color:"#fbbf24"}}>Neutral</strong> — use other indicators to decide.</>}</div></div>}
                </div>
              </div>

              {/* AI */}
              <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",fontFamily:"'Source Sans 3',sans-serif"}}>🤖 AI Advisor</span>
                  <div style={{display:"flex",gap:6}}>
                    {[["deep","Deep Analysis"],["buy","Buy Now?"],["risk","Risk Check"]].map(([m,l])=>(
                      <button key={m} onClick={()=>callAI(
                        m==="deep"?`Analyse ${selectedStock.name} (${selectedStock.symbol}) on NSE Kenya for a beginner investor. Price: KES ${selectedStock.price} (${selectedStock.change}%), P/E: ${selectedStock.pe||"N/A"}, Div: ${selectedStock.divYield}%, RSI: ${rsi}, Volatility: ${vol}%. Signal: ${signal}. Write 4 plain-language paragraphs: fundamentals, statistics, valuation vs peers, 12-month outlook.`:
                        m==="buy"?`I'm a beginner NSE investor in Nairobi. Should I buy ${selectedStock.name} (${selectedStock.symbol}) at KES ${selectedStock.price}? RSI: ${rsi}, Signal: ${signal}. Give a direct YES/NO/WAIT first, then explain in 3 sentences. Practical Kenyan financial advisor tone.`:
                        `Top 3 risks of investing in ${selectedStock.name} (${selectedStock.symbol}) right now. Price KES ${selectedStock.price}, volatility ${vol}%, RSI ${rsi}. For a beginner. One risk + mitigation each. Short and practical.`,
                        m, selectedStock.symbol
                      )} style={{padding:"4px 11px",background:aiState.mode===m&&aiState.stock===selectedStock.symbol?"#1e3a5f":"transparent",border:"1px solid #1e3a5f",borderRadius:6,color:aiState.mode===m&&aiState.stock===selectedStock.symbol?"#38bdf8":"#475569",fontSize:11}}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                {aiState.loading&&aiState.stock===selectedStock.symbol&&<div><div className="shimmer" style={{height:10,borderRadius:4,marginBottom:7,width:"85%"}}/><div className="shimmer" style={{height:10,borderRadius:4,marginBottom:7,width:"70%"}}/><div className="shimmer" style={{height:10,borderRadius:4,width:"78%"}}/></div>}
                {aiState.text&&aiState.stock===selectedStock.symbol&&!aiState.loading&&<div style={{fontSize:12,color:"#cbd5e1",lineHeight:1.8,fontFamily:"'Source Sans 3',sans-serif",whiteSpace:"pre-wrap"}}>{aiState.text}</div>}
                {(!aiState.text||aiState.stock!==selectedStock.symbol)&&!aiState.loading&&<div style={{textAlign:"center",padding:"12px 0",color:"#334155",fontSize:11,fontFamily:"'Source Sans 3',sans-serif"}}>Select an analysis type above</div>}
              </div>
            </div>
          </div>
        )}

        {/* ══════ NEWS ══════ */}
        {page==="news"&&(
          <div className="slide">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div><div style={{fontFamily:"'Cinzel',serif",fontSize:20,color:"#38bdf8",fontWeight:700}}>NSE Market News</div><div style={{fontSize:11,color:"#475569",fontFamily:"'Source Sans 3',sans-serif"}}>Live news from the web with sentiment analysis</div></div>
              <button onClick={fetchNews} disabled={newsLoading} style={{padding:"9px 22px",background:"linear-gradient(135deg,#0369a1,#0d9488)",border:"none",borderRadius:10,color:"#fff",fontSize:13,opacity:newsLoading?.7:1,fontWeight:600}}>{newsLoading?"🔄 Fetching...":"📡 Fetch Latest News"}</button>
            </div>
            {newsLoading&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>{[1,2,3,4].map(i=><div key={i} style={{background:"#0a1628",borderRadius:12,padding:18,border:"1px solid #0e2040"}}><div className="shimmer" style={{height:12,borderRadius:5,marginBottom:8,width:"75%"}}/><div className="shimmer" style={{height:9,borderRadius:5,marginBottom:5,width:"55%"}}/><div className="shimmer" style={{height:9,borderRadius:5,width:"85%"}}/></div>)}</div>}
            {!newsLoading&&news.length>0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {news.map((item,i)=>{const stock=ALL_NSE_STOCKS.find(s=>s.symbol===item.symbol);const sc=item.sentiment==="positive"?"#34d399":item.sentiment==="negative"?"#f87171":"#94a3b8";return(
                <div key={i} style={{background:"#0a1628",borderRadius:12,padding:18,border:`1px solid ${sc}25`,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:sc}}/>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                    <span style={{fontSize:9,color:sc,textTransform:"uppercase",letterSpacing:1,fontFamily:"'Source Sans 3',sans-serif"}}>{item.sentiment} · {item.source}</span>
                    <div style={{display:"flex",gap:5}}>{stock&&<span style={{fontSize:8,padding:"1px 5px",borderRadius:3,background:stock.color+"22",color:stock.color,fontFamily:"'Source Sans 3',sans-serif"}}>{item.symbol}</span>}<span style={{fontSize:9,color:"#334155",fontFamily:"'Source Sans 3',sans-serif"}}>{item.date}</span></div>
                  </div>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:12,color:"#e2e8f0",marginBottom:7,lineHeight:1.4,fontWeight:600}}>{item.title}</div>
                  <div style={{fontSize:11,color:"#64748b",lineHeight:1.6,fontFamily:"'Source Sans 3',sans-serif"}}>{item.summary}</div>
                  {stock&&holdings[stock.symbol]&&((holdings[stock.symbol].ziidi||0)+(holdings[stock.symbol].faida||0))>0&&<div style={{marginTop:8,padding:"5px 9px",background:sc+"11",borderRadius:5,fontSize:9,color:sc,fontFamily:"'Source Sans 3',sans-serif"}}>⚡ You hold {(holdings[stock.symbol].ziidi||0)+(holdings[stock.symbol].faida||0)} shares of {stock.symbol}</div>}
                </div>
              );})}</div>}
            {!newsLoading&&!newsSearched&&<div style={{textAlign:"center",padding:"70px 0"}}><div style={{fontSize:44,marginBottom:12}}>📰</div><div style={{fontFamily:"'Cinzel',serif",fontSize:16,color:"#1e3a5f",marginBottom:8}}>LIVE NSE NEWS</div><div style={{fontSize:12,color:"#334155",fontFamily:"'Source Sans 3',sans-serif",marginBottom:20}}>Fetch the latest news affecting your stocks</div><button onClick={fetchNews} style={{padding:"11px 28px",background:"linear-gradient(135deg,#0369a1,#0d9488)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:600}}>📡 Load NSE News</button></div>}
          </div>
        )}

        {/* ══════ ALERTS ══════ */}
        {page==="alerts"&&(
          <div className="slide">
            <div style={{fontFamily:"'Cinzel',serif",fontSize:20,color:"#38bdf8",fontWeight:700,marginBottom:4}}>Price Alerts</div>
            <div style={{fontSize:11,color:"#475569",fontFamily:"'Source Sans 3',sans-serif",marginBottom:18}}>Get notified when stocks hit your target</div>
            <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",padding:18,marginBottom:18}}>
              <div style={{fontSize:10,color:"#475569",letterSpacing:1,textTransform:"uppercase",marginBottom:12,fontFamily:"'Source Sans 3',sans-serif"}}>New Alert</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:10,alignItems:"end"}}>
                <div><label style={{fontSize:9,color:"#475569",display:"block",marginBottom:4,fontFamily:"'Source Sans 3',sans-serif"}}>STOCK</label><select value={newAlert.symbol} onChange={e=>setNewAlert({...newAlert,symbol:e.target.value})} style={{width:"100%",background:"#060a12",border:"1px solid #1e3a5f",borderRadius:7,padding:"8px 11px",color:"#e2e8f0",fontSize:12}}>{ALL_NSE_STOCKS.map(s=><option key={s.symbol} value={s.symbol}>{s.symbol} — {s.name}</option>)}</select></div>
                <div><label style={{fontSize:9,color:"#475569",display:"block",marginBottom:4,fontFamily:"'Source Sans 3',sans-serif"}}>DIRECTION</label><select value={newAlert.direction} onChange={e=>setNewAlert({...newAlert,direction:e.target.value})} style={{width:"100%",background:"#060a12",border:"1px solid #1e3a5f",borderRadius:7,padding:"8px 11px",color:"#e2e8f0",fontSize:12}}><option value="above">Rises ABOVE</option><option value="below">Drops BELOW</option></select></div>
                <div><label style={{fontSize:9,color:"#475569",display:"block",marginBottom:4,fontFamily:"'Source Sans 3',sans-serif"}}>TARGET (KES)</label><input type="number" placeholder="e.g. 80.00" value={newAlert.targetPrice} onChange={e=>setNewAlert({...newAlert,targetPrice:e.target.value})} style={{width:"100%",background:"#060a12",border:"1px solid #1e3a5f",borderRadius:7,padding:"8px 11px",color:"#e2e8f0",fontSize:12}}/></div>
                <button onClick={addAlert} style={{padding:"8px 18px",background:"linear-gradient(135deg,#059669,#0284c7)",border:"none",borderRadius:7,color:"#fff",fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>+ Set Alert</button>
              </div>
            </div>
            {priceAlerts.length>0?(
              <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",overflow:"hidden"}}>
                {priceAlerts.map(alert=>{const stock=ALL_NSE_STOCKS.find(s=>s.symbol===alert.symbol);const triggered=stock&&(alert.direction==="above"?stock.price>=parseFloat(alert.targetPrice):stock.price<=parseFloat(alert.targetPrice));return(
                  <div key={alert.id} className="hr" style={{padding:"13px 18px",borderBottom:"1px solid #060a12",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <div style={{display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:triggered?"#f59e0b":"#1e3a5f",boxShadow:triggered?"0 0 8px #f59e0b":""}} className={triggered?"pulse":""}/>
                      <div><span style={{fontFamily:"'Cinzel',serif",fontSize:13,color:stock?.color||"#94a3b8",fontWeight:700}}>{alert.symbol}</span><span style={{fontSize:11,color:"#475569",fontFamily:"'Source Sans 3',sans-serif",marginLeft:8}}>{alert.direction==="above"?"rises above":"drops below"} KES {alert.targetPrice}</span></div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <span style={{fontSize:11,color:triggered?"#f59e0b":"#334155",fontFamily:"'Source Sans 3',sans-serif"}}>{triggered?"🔔 TRIGGERED — Now: KES "+stock?.price:`Current: KES ${stock?.price||"?"}`}</span>
                      <span style={{fontSize:9,color:"#334155",fontFamily:"'Source Sans 3',sans-serif"}}>Set {alert.created}</span>
                      <button onClick={()=>removeAlert(alert.id)} style={{background:"transparent",border:"1px solid #450a0a",borderRadius:5,color:"#f87171",padding:"2px 9px",fontSize:10}}>Remove</button>
                    </div>
                  </div>
                );})}
              </div>
            ):<div style={{textAlign:"center",padding:"50px 0",color:"#334155",fontFamily:"'Source Sans 3',sans-serif"}}><div style={{fontSize:28}}>🔔</div><div style={{fontSize:12,marginTop:6}}>No alerts yet.</div></div>}
          </div>
        )}

        {/* ══════ JOURNAL ══════ */}
        {page==="journal"&&(
          <div className="slide">
            <div style={{fontFamily:"'Cinzel',serif",fontSize:20,color:"#38bdf8",fontWeight:700,marginBottom:4}}>Trade Journal</div>
            <div style={{fontSize:11,color:"#475569",fontFamily:"'Source Sans 3',sans-serif",marginBottom:18}}>Record your thinking. Discipline wins in the long run.</div>
            <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",padding:18,marginBottom:18}}>
              <textarea value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder="e.g. Bought 50 SCOM at KES 24.15 via Ziidi. RSI was 38 — oversold. Plan to hold 6 months and collect July dividend..." style={{width:"100%",background:"#060a12",border:"1px solid #1e3a5f",borderRadius:7,padding:12,color:"#e2e8f0",fontSize:13,resize:"vertical",minHeight:90,lineHeight:1.6}}/>
              <div style={{display:"flex",justifyContent:"flex-end",marginTop:8}}><button onClick={addJournal} style={{padding:"8px 22px",background:"linear-gradient(135deg,#7c3aed,#0284c7)",border:"none",borderRadius:7,color:"#fff",fontSize:13,fontWeight:600}}>💾 Save</button></div>
            </div>
            {journalEntries.length===0?<div style={{textAlign:"center",padding:"50px 0",color:"#334155",fontFamily:"'Source Sans 3',sans-serif"}}><div style={{fontSize:28}}>📓</div><div style={{fontSize:12,marginTop:6}}>Start writing above — your future self will thank you.</div></div>:
            journalEntries.map(j=>(
              <div key={j.id} style={{background:"#0a1628",borderRadius:10,padding:"14px 18px",border:"1px solid #0e2040",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:9,color:"#475569",fontFamily:"'Source Sans 3',sans-serif",letterSpacing:.5}}>{j.date} · {j.time}</span><button onClick={()=>deleteJournal(j.id)} style={{background:"transparent",border:"none",color:"#334155",fontSize:13}}>✕</button></div>
                <div style={{fontSize:13,color:"#cbd5e1",lineHeight:1.7,fontFamily:"'Source Sans 3',sans-serif",whiteSpace:"pre-wrap"}}>{j.text}</div>
              </div>
            ))}
          </div>
        )}

        {/* ══════ LEARN ══════ */}
        {page==="learn"&&(
          <div className="slide">
            <div style={{fontFamily:"'Cinzel',serif",fontSize:20,color:"#38bdf8",fontWeight:700,marginBottom:4}}>Investor's Guide</div>
            <div style={{fontSize:11,color:"#475569",fontFamily:"'Source Sans 3',sans-serif",marginBottom:18}}>Everything a beginner Kenyan investor needs to know</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              {[
                {icon:"📱",title:"Using Ziidi",color:"#22c55e",items:["Open M-Pesa → Financial Services → Ziidi","Complete KYC with National ID + selfie","Deposit from M-Pesa — minimum KES 100","Search stock e.g. SCOM, CIC, BRIT, COOP","Tap Buy → enter shares → confirm","Trading hours: 9:00 AM – 3:00 PM Mon–Fri","Dividends paid directly to M-Pesa"]},
                {icon:"🏢",title:"Using Faida Securities",color:"#f59e0b",items:["Visit faida.co.ke or their Nairobi office","Fill free account opening form","Submit National ID + KRA PIN + photo","Fund via bank transfer (Equity, KCB, Co-op)","Place orders on their web portal","Tel: +254 20 221 2000","Best for EQTY, EABL, KCB, SCBK"]},
                {icon:"📊",title:"Reading Statistics",color:"#38bdf8",items:["RSI < 35: Oversold → potential buy opportunity","RSI > 65: Overbought → consider waiting","Price above 20-day MA: uptrend → bullish","Price below 20-day MA: downtrend → caution","Bollinger lower band: potential price bounce","P/E < 8: value stock — cheap vs earnings","High volume on rise = strong conviction"]},
                {icon:"💰",title:"Dividend Strategy",color:"#a78bfa",items:["Dividends paid once or twice per year","Must own shares BEFORE ex-dividend date","Top payers: COOP 6.1%, KCB 6.2%, EQTY 5.8%","BAT Kenya highest yield ~8.9% (higher risk)","Reinvest dividends → compounding power","Track dates at nse.co.ke announcements","Dividends go to your M-Pesa or bank"]},
                {icon:"⚠️",title:"Risk Management",color:"#f87171",items:["Never invest money needed in <6 months","Spread across at least 3 different sectors","Max 30% of portfolio in any single stock","Review every 3 months — don't obsess daily","Normal dips of 5-10% — don't panic sell","Avoid WhatsApp stock tips without research","Understand what you own before buying"]},
                {icon:"📈",title:"Investing vs Trading",color:"#34d399",items:["Investing: Buy & hold 3–5+ years (safer)","Trading: Buy low sell high in weeks (riskier)","Beginners: Start with investing, not trading","Long-term holds: SCOM, EQTY, KCB, COOP","Learning-to-trade stocks: CIC, BRIT (cheap)","Reinvest profits for compounding returns","Time in market beats timing the market"]},
              ].map(card=>(
                <div key={card.title} style={{background:"#0a1628",borderRadius:12,padding:18,border:`1px solid ${card.color}20`}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:13,color:card.color,fontWeight:700,marginBottom:10}}>{card.icon} {card.title}</div>
                  {card.items.map((item,i)=><div key={i} style={{display:"flex",gap:7,marginBottom:6,fontSize:11,color:"#94a3b8",lineHeight:1.5,fontFamily:"'Source Sans 3',sans-serif"}}><span style={{color:card.color,flexShrink:0}}>→</span><span>{item}</span></div>)}
                </div>
              ))}
            </div>
            {/* AI Q&A */}
            <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",padding:18}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:13,color:"#38bdf8",fontWeight:700,marginBottom:10}}>🤖 Ask Your Personal NSE Advisor</div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input id="qa" placeholder="e.g. What is a P/E ratio? When should I sell? How do dividends work?" onKeyDown={e=>{if(e.key==="Enter"&&e.target.value){callAI(`I'm a beginner NSE Kenya investor using Faida and Ziidi. Answer simply: ${e.target.value}`,"qa","general");e.target.value="";}}} style={{flex:1,background:"#060a12",border:"1px solid #1e3a5f",borderRadius:7,padding:"9px 12px",color:"#e2e8f0",fontSize:12}}/>
                <button onClick={()=>{const i=document.getElementById("qa");if(i.value){callAI(`I'm a beginner NSE Kenya investor using Faida and Ziidi. Answer simply and practically: ${i.value}`,"qa","general");i.value="";}}} style={{padding:"9px 18px",background:"linear-gradient(135deg,#7c3aed,#0284c7)",border:"none",borderRadius:7,color:"#fff",fontSize:12,fontWeight:600}}>Ask →</button>
              </div>
              {aiState.loading&&aiState.stock==="general"&&<div><div className="shimmer" style={{height:10,borderRadius:4,marginBottom:6,width:"80%"}}/><div className="shimmer" style={{height:10,borderRadius:4,width:"60%"}}/></div>}
              {aiState.text&&aiState.stock==="general"&&!aiState.loading&&<div style={{fontSize:12,color:"#cbd5e1",lineHeight:1.8,fontFamily:"'Source Sans 3',sans-serif",borderTop:"1px solid #0e2040",paddingTop:10}}>{aiState.text}</div>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
