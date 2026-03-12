module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Real Kenyan financial news RSS feeds — no API key needed
  const feeds = [
    "https://www.businessdailyafrica.com/rss/markets",
    "https://kenyanwallstreet.com/feed/",
    "https://www.standardmedia.co.ke/rss/business.php",
    "https://nation.africa/kenya/business/rss.xml",
  ];

  const NSE_KEYWORDS = {
    SCOM: ["safaricom", "m-pesa", "mpesa"],
    EQTY: ["equity bank", "equity group"],
    KCB:  ["kcb", "kenya commercial bank"],
    EABL: ["eabl", "east african breweries", "tusker", "guinness"],
    BRIT: ["britam"],
    JUB:  ["jubilee", "jubilee holdings"],
    COOP: ["co-operative bank", "cooperative bank"],
    BAT:  ["bat kenya", "british american tobacco"],
    DTK:  ["diamond trust"],
    NSE:  ["nse", "nairobi securities", "stock exchange", "shares", "equities", "market"]
  };

  function detectSymbol(text) {
    const lower = text.toLowerCase();
    for (const [symbol, keywords] of Object.entries(NSE_KEYWORDS)) {
      if (keywords.some(k => lower.includes(k))) return symbol;
    }
    return "NSE";
  }

  function detectSentiment(text) {
    const lower = text.toLowerCase();
    const positive = ["gain", "rise", "rise", "surge", "profit", "growth", "record", "strong", "up", "high", "rally", "expand", "dividend", "boost", "increase", "positive", "beats"];
    const negative = ["fall", "drop", "loss", "decline", "down", "weak", "slump", "cut", "pressure", "risk", "warn", "miss", "below", "deficit", "concern"];
    const posScore = positive.filter(w => lower.includes(w)).length;
    const negScore = negative.filter(w => lower.includes(w)).length;
    if (posScore > negScore) return "positive";
    if (negScore > posScore) return "negative";
    return "neutral";
  }

  function parseRSS(xml) {
    const items = [];
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of itemMatches) {
      const item = match[1];
      const title   = (item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)  || [])[1]?.trim() || "";
      const desc    = (item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/) || [])[1]?.trim() || "";
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1]?.trim() || "";
      const link    = (item.match(/<link>(.*?)<\/link>/)       || [])[1]?.trim() || "";
      if (!title) continue;
      // Clean HTML tags from description
      const cleanDesc = desc.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim();
      const summary = cleanDesc.length > 180 ? cleanDesc.substring(0, 180) + "…" : cleanDesc || title;
      const dateObj = pubDate ? new Date(pubDate) : new Date();
      const date = dateObj.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
      items.push({ title, summary, date, link });
    }
    return items;
  }

  const allNews = [];

  // Try each RSS feed
  for (const feedUrl of feeds) {
    try {
      const response = await fetch(feedUrl, {
        headers: { "User-Agent": "NSE-Vault-NewsReader/1.0" },
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) continue;
      const xml = await response.text();
      const items = parseRSS(xml);

      // Get source name from URL
      const source = feedUrl.includes("businessdaily") ? "Business Daily" :
                     feedUrl.includes("kenyanwallstreet") ? "KenyanWallStreet" :
                     feedUrl.includes("standardmedia") ? "Standard Media" :
                     feedUrl.includes("nation") ? "Daily Nation" : "Kenya News";

      for (const item of items.slice(0, 3)) {
        const combined = item.title + " " + item.summary;
        allNews.push({
          title: item.title,
          source,
          summary: item.summary,
          sentiment: detectSentiment(combined),
          symbol: detectSymbol(combined),
          date: item.date,
          link: item.link
        });
      }
      if (allNews.length >= 6) break;
    } catch { continue; }
  }

  // Filter to NSE-relevant news only
  const nseNews = allNews.filter(n =>
    n.symbol !== "NSE" ||
    n.title.toLowerCase().includes("nse") ||
    n.title.toLowerCase().includes("stock") ||
    n.title.toLowerCase().includes("share") ||
    n.title.toLowerCase().includes("market") ||
    n.title.toLowerCase().includes("invest")
  );

  const finalNews = (nseNews.length >= 3 ? nseNews : allNews).slice(0, 6);

  if (finalNews.length > 0) {
    return res.status(200).json({ news: finalNews, source: "live_rss" });
  }

  // Hardcoded fallback if all RSS feeds fail
  return res.status(200).json({
    source: "fallback",
    news: [
      { title: "NSE 20-Share Index gains 1.2% on banking stocks rally", source: "Business Daily", summary: "The NSE 20-Share Index closed higher driven by gains in banking counters. Equity Group and KCB Group led the rally with strong trading volume.", sentiment: "positive", symbol: "NSE", date: "Mar 11, 2026" },
      { title: "Safaricom M-Pesa transactions hit record KES 35 trillion", source: "KenyanWallStreet", summary: "Safaricom reported record M-Pesa transaction volumes for the financial year, crossing KES 35 trillion. The milestone reinforces the company's dominance in mobile money across East Africa.", sentiment: "positive", symbol: "SCOM", date: "Mar 10, 2026" },
      { title: "Equity Group expands DRC operations amid rising profits", source: "Reuters Africa", summary: "Equity Group Holdings announced expansion of its DRC banking operations following record regional profits. The bank's pan-African strategy continues to deliver strong shareholder returns.", sentiment: "positive", symbol: "EQTY", date: "Mar 9, 2026" },
      { title: "KCB Group completes NBK integration ahead of schedule", source: "Business Daily", summary: "KCB Group completed the full integration of National Bank of Kenya ahead of schedule. Cost savings from the merger are expected to significantly boost 2026 earnings per share.", sentiment: "positive", symbol: "KCB", date: "Mar 8, 2026" },
      { title: "EABL faces margin pressure as excise duty rises 15%", source: "The Star Kenya", summary: "East African Breweries warned of near-term margin pressure following the government's decision to raise excise duty on alcoholic beverages. The company is reviewing its pricing strategy ahead of Q2.", sentiment: "negative", symbol: "EABL", date: "Mar 7, 2026" },
      { title: "Britam Holdings posts improved underwriting results in Q1", source: "NSE Announcement", summary: "Britam Holdings reported improved underwriting profitability citing cost discipline and premium growth. The insurer declared an interim dividend of KES 0.20 per share.", sentiment: "positive", symbol: "BRIT", date: "Mar 6, 2026" }
    ]
  });
};
