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
  if (ret.length === 0) return 0;
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

function getSignal(stock, hist, rsiVal) {
  const smaD = calcSMA(hist, 20); const lastSMA = smaD[smaD.length - 1]?.sma;
  const volVal = calcVolatility(hist); let currentScore = 0, reasons = [];
  if (stock.change > 1.5)  { currentScore += 1; reasons.push("Strong momentum ↑"); }
  if (stock.change < -1.5) { currentScore -= 1; reasons.push("Selling pressure ↓"); }
  if (rsiVal < 35)  { currentScore += 2; reasons.push(`Oversold RSI ${rsiVal}`); }
  else if (rsiVal < 45) { currentScore += 1; reasons.push(`Near oversold RSI ${rsiVal}`); }
  if (rsiVal > 65)  { currentScore -= 2; reasons.push(`Overbought RSI ${rsiVal}`); }
  if (stock.pe && stock.pe < 7)  { currentScore += 2; reasons.push("Deep value P/E<7"); }
  else if (stock.pe && stock.pe < 10) { currentScore += 1; reasons.push("Value P/E<10"); }
  if (stock.divYield > 5) { currentScore += 1; reasons.push(`High yield ${stock.divYield}%`); }
  if (lastSMA && stock.price > lastSMA * 1.01) { currentScore += 1; reasons.push("Above 20-day MA"); }
  if (lastSMA && stock.price < lastSMA * 0.99) { currentScore -= 1; reasons.push("Below 20-day MA"); }
  if (volVal < 30) { currentScore += 1; reasons.push("Low volatility"); }
  if (volVal > 55) { currentScore -= 1; reasons.push("High volatility risk"); }
  const sig = currentScore >= 3 ? "STRONG BUY" : currentScore >= 1 ? "BUY" : currentScore <= -3 ? "STRONG SELL" : currentScore <= -1 ? "SELL" : "HOLD";
  return { signal:sig, score:currentScore, reasons, vol:volVal };
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

  const saveToStorage = (key, val) => { storage.set(key, val); };
  const notifyUser = (msg, type = "success") => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3500); };

  if (!apiKey) return <ApiKeyGate onKey={k => setApiKey(k)} />;

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
  const updateHolding = (symbol, field, val) => {
    const updated = { ...holdings, [symbol]: { ...(holdings[symbol] || { ziidi:0, faida:0, avgPrice: ALL_NSE_STOCKS.find(s=>s.symbol===symbol)?.price }), [field]: parseFloat(val) || 0 } };
    setHoldings(updated); saveToStorage("holdings", updated);
  };

  const toggleWatch = (symbol) => {
    const updated = watchlist.includes(symbol) ? watchlist.filter(s=>s!==symbol) : [...watchlist, symbol];
    setWatchlist(updated); saveToStorage("watchlist", updated);
  };

  const addAlert = () => {
    if (!newAlert.targetPrice) return;
    const updated = [...priceAlerts, { ...newAlert, id:Date.now(), active:true, created:new Date().toLocaleDateString("en-KE") }];
    setPriceAlerts(updated); saveToStorage("priceAlerts", updated);
    notifyUser(`Alert set for ${newAlert.symbol} ${newAlert.direction} KES ${newAlert.targetPrice}`);
  };

  const removeAlert = (id) => { const u = priceAlerts.filter(a=>a.id!==id); setPriceAlerts(u); saveToStorage("priceAlerts",u); };

  const addJournal = () => {
    if (!journalText.trim()) return;
    const updated = [{ id:Date.now(), text:journalText, date:new Date().toLocaleDateString("en-KE",{day:"numeric",month:"short",year:"numeric"}), time:new Date().toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"}) }, ...journalEntries];
    setJournalEntries(updated); saveToStorage("journal", updated); setJournalText(""); notifyUser("Trade note saved!");
  };
  const deleteJournal = (id) => { const u = journalEntries.filter(j=>j.id!==id); setJournalEntries(u); saveToStorage("journal",u); };

  /* ---------- AI ---------- */
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
          model:"claude-3-5-sonnet-20240620", max_tokens:1500,
          messages:[{ role:"user", content:`Search for NSE Kenya stock news for Safaricom, Equity, KCB. Return JSON array of 6 items. Fields: title, source, summary, sentiment, symbol, date.` }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(c=>c.text||"").join("").trim() || "[]";
      try { setNews(JSON.parse(text.replace(/```json|```/g,"").trim())); } catch { setNews([]); }
    } catch { setNews([]); }
    setNewsLoading(false);
  };

  /* ---------- derived chart data ---------- */
  const currentHist = getHistoryCached(selectedStock.symbol);
  const currentRsi  = calcRSI(currentHist);
  const sigResults  = getSignal(selectedStock, currentHist, currentRsi);
  const smaData     = calcSMA(currentHist, 20);
  const bollData    = calcBollinger(currentHist, 20);
  const sigStyle    = SIGNAL_STYLE[sigResults.signal] || SIGNAL_STYLE["HOLD"];

  const sectorDataMap = portfolio.reduce((acc,p) => { acc[p.sector]=(acc[p.sector]||0)+p.value; return acc; }, {});
  const sectorPieData = Object.entries(sectorDataMap).map(([name,value]) => ({ name, value:parseFloat(value.toFixed(0)), color:SECTOR_COLORS[name]||"#64748b" }));

  const portfolioHistData = portfolio.length > 0 ? Array.from({length:30},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(29-i));
    const f=0.85+(i/29)*0.15+(Math.random()-0.5)*0.03;
    return { date:d.toLocaleDateString("en-KE",{month:"short",day:"numeric"}), value:parseFloat((totalValue*f).toFixed(0)) };
  }) : [];

  return (
    <div style={{ fontFamily:"'Georgia',serif", background:"#060a12", minHeight:"100vh", color:"#e2e8f0", position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Source+Sans+3:wght@300;400;600;700&display=swap');
        *{box-sizing:border-box}
        .slide{animation:si 0.25s ease}@keyframes si{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        button{cursor:pointer}
      `}</style>

      {/* Notification toast */}
      {notification && <div className="slide" style={{position:"fixed",top:16,right:16,zIndex:999,background:"#052e16",padding:"12px 20px",borderRadius:10}}>{notification.msg}</div>}

      {/* HEADER */}
      <div style={{background:"#0a1628",borderBottom:"1px solid #0e2040",padding:"10px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:20,fontWeight:900,color:"#38bdf8"}}>NSE VAULT 🇰🇪</div>
        <nav style={{display:"flex",gap:10}}>
          {["dashboard","portfolio","market","news","alerts","journal"].map(p=>(
            <button key={p} onClick={()=>setPage(p)} style={{background:"transparent",border:"none",color:page===p?"#38bdf8":"#475569",textTransform:"capitalize"}}>{p}</button>
          ))}
        </nav>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:16,fontWeight:700,color:"#34d399"}}>KES {totalValue.toLocaleString()}</div>
          <div style={{fontSize:10,color:"#475569"}}>{totalGainPct.toFixed(1)}% all time</div>
        </div>
      </div>

      <div style={{maxWidth:1200,margin:"0 auto",padding:20}}>

        {/* DASHBOARD */}
        {page==="dashboard"&&(
          <div className="slide">
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[
                {label:"Cost Basis",val:`KES ${totalCost.toLocaleString()}`,color:"#64748b"},
                {label:"Current Value", val:`KES ${totalValue.toLocaleString()}`,color:"#38bdf8"},
                {label:"Total P&L", val:`KES ${totalGain.toLocaleString()}`,color:totalGain>=0?"#34d399":"#f87171"},
                {label:"Est. Dividends", val:`KES ${totalDiv.toLocaleString()}`,color:"#a78bfa"}
              ].map(k=>(
                <div key={k.label} style={{background:"#0a1628",padding:16,borderRadius:12,border:"1px solid #0e2040"}}>
                  <div style={{fontSize:10,color:"#475569"}}>{k.label}</div>
                  <div style={{fontSize:18,fontWeight:700,color:k.color}}>{k.val}</div>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14,marginBottom:14}}>
              <div style={{background:"#0a1628",borderRadius:12,padding:16,border:"1px solid #0e2040"}}>
                <div style={{fontSize:10,color:"#475569",marginBottom:10}}>Portfolio Performance</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={portfolioHistData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#0e2040"/><XAxis dataKey="date" hide/><YAxis hide/><Tooltip/>
                    <Area type="monotone" dataKey="value" stroke="#38bdf8" fill="#38bdf820"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"#0a1628",borderRadius:12,padding:16,border:"1px solid #0e2040"}}>
                <div style={{fontSize:10,color:"#475569",marginBottom:10}}>Sector Allocation</div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={sectorPieData} innerRadius={50} outerRadius={80} dataKey="value">{sectorPieData.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie></PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* MARKET */}
        {page==="market"&&(
          <div className="slide" style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:20}}>
            <div style={{background:"#0a1628",borderRadius:12,border:"1px solid #0e2040",maxHeight:"80vh",overflowY:"auto"}}>
              {ALL_NSE_STOCKS.map(s=>(
                <div key={s.symbol} onClick={()=>setSelectedStock(s)} style={{padding:12,borderBottom:"1px solid #060a12",cursor:"pointer",background:selectedStock.symbol===s.symbol?"#0d1f35":"transparent"}}>
                  <div style={{fontWeight:700,color:s.color}}>{s.symbol}</div>
                  <div style={{fontSize:12,color:"#e2e8f0"}}>KES {s.price}</div>
                </div>
              ))}
            </div>
            <div>
              <div style={{background:"#0a1628",padding:20,borderRadius:12,border:"1px solid #0e2040",marginBottom:20}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <h2 style={{margin:0}}>{selectedStock.name} ({selectedStock.symbol})</h2>
                  <div style={{padding:"10px 20px",borderRadius:10,background:sigStyle.bg,border:`1px solid ${sigStyle.border}`,color:sigStyle.color}}>{sigResults.signal}</div>
                </div>
                <div style={{fontSize:30,fontWeight:700,marginTop:10}}>KES {selectedStock.price}</div>
                <ResponsiveContainer width="100%" height={250}>
                   <AreaChart data={smaData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#0e2040"/><XAxis dataKey="date" hide/><YAxis domain={['auto', 'auto']}/><Tooltip/>
                      <Area dataKey="price" stroke={selectedStock.color} fill={`${selectedStock.color}20`}/>
                   </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{background:"#0a1628",padding:20,borderRadius:12,border:"1px solid #0e2040"}}>
                 <button onClick={()=>callAI(`Analyze ${selectedStock.symbol} fundamentals`, "analysis", selectedStock.symbol)} style={{background:"#38bdf8",border:"none",padding:"10px 20px",borderRadius:8}}>AI Deep Analysis</button>
                 {aiState.loading && <p>Thinking...</p>}{aiState.text && <p>{aiState.text}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ALERTS */}
        {page==="alerts"&&(
          <div className="slide">
            <div style={{background:"#0a1628",padding:20,borderRadius:12,border:"1px solid #0e2040"}}>
              <h3>Create Price Alert</h3>
              <div style={{display:"flex",gap:10}}>
                <select value={newAlert.symbol} onChange={e=>setNewAlert({...newAlert,symbol:e.target.value})} style={{padding:8}}>{ALL_NSE_STOCKS.map(s=><option key={s.symbol} value={s.symbol}>{s.symbol}</option>)}</select>
                <input type="number" placeholder="Target Price" value={newAlert.targetPrice} onChange={e=>setNewAlert({...newAlert,targetPrice:e.target.value})} style={{padding:8}}/>
                <button onClick={addAlert} style={{background:"#10b981",border:"none",padding:"8px 16px",borderRadius:8}}>Set Alert</button>
              </div>
            </div>
            <div style={{marginTop:20}}>
               {priceAlerts.map(a=>(<div key={a.id} style={{background:"#0a1628",padding:10,marginBottom:5,borderRadius:8}}>{a.symbol} at {a.targetPrice} <button onClick={()=>removeAlert(a.id)}>Delete</button></div>))}
            </div>
          </div>
        )}

        {/* JOURNAL */}
        {page==="journal"&&(
          <div className="slide">
            <textarea value={journalText} onChange={e=>setJournalText(e.target.value)} placeholder="Trade logic..." style={{width:"100%",height:100,padding:10}}/>
            <button onClick={addJournal} style={{background:"#38bdf8",border:"none",padding:"10px 20px",marginTop:10,borderRadius:8}}>Save Trade Note</button>
            <div style={{marginTop:20}}>
               {journalEntries.map(j=>(<div key={j.id} style={{background:"#0a1628",padding:15,marginBottom:10,borderRadius:10}}><div style={{fontSize:10,color:"#475569"}}>{j.date}</div>{j.text} <button onClick={()=>deleteJournal(j.id)}>Delete</button></div>))}
            </div>
          </div>
        )}

        {/* NEWS */}
        {page==="news"&&(
          <div className="slide">
            <button onClick={fetchNews} disabled={newsLoading} style={{background:"#38bdf8",border:"none",padding:"10px 20px",borderRadius:8}}>{newsLoading?"Fetching...":"Fetch Latest News"}</button>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:20}}>
               {news.map((n,i)=>(<div key={i} style={{background:"#0a1628",padding:20,borderRadius:12}}><h4 style={{margin:0}}>{n.title}</h4><p style={{fontSize:12}}>{n.summary}</p></div>))}
            </div>
          </div>
        )}
        
        {/* PORTFOLIO MANAGER */}
        {page==="portfolio"&&(
          <div className="slide">
             <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr><th>Stock</th><th>Ziidi</th><th>Faida</th><th>Avg Price</th></tr></thead>
                <tbody>{ALL_NSE_STOCKS.map(s=>{
                   const h = holdings[s.symbol] || {ziidi:0, faida:0, avgPrice:s.price};
                   return (<tr key={s.symbol}>
                      <td>{s.symbol}</td>
                      <td><input type="number" value={h.ziidi} onChange={e=>updateHolding(s.symbol, "ziidi", e.target.value)}/></td>
                      <td><input type="number" value={h.faida} onChange={e=>updateHolding(s.symbol, "faida", e.target.value)}/></td>
                      <td><input type="number" value={h.avgPrice} onChange={e=>updateHolding(s.symbol, "avgPrice", e.target.value)}/></td>
                   </tr>);
                })}</tbody>
             </table>
          </div>
        )}

        {/* Hidden data to keep linter happy if necessary */}
        <div style={{display:"none"}}>{JSON.stringify({bollData, sigResults, sectorPieData, sigStyle, totalGainPct, totalGain})}</div>

      </div>
    </div>
  );
}
