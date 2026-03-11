module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY not set in Vercel env vars" });

  const prompt = `You are a financial news assistant for the Nairobi Securities Exchange (NSE) in Kenya.

Generate 6 realistic NSE Kenya stock market news items for March 2026. Make them specific, realistic and relevant to the Kenyan market. Cover these companies: Safaricom (SCOM), Equity Bank (EQTY), KCB Group (KCB), East African Breweries (EABL), Britam (BRIT), and one general NSE market update.

Return ONLY a valid JSON array. No markdown, no backticks, no explanation. Each object must have exactly these fields:
- title (string: headline)
- source (string: e.g. "Business Daily", "KenyanWallStreet", "NSE", "Reuters")  
- summary (string: 2 sentences max describing the news)
- sentiment (string: exactly "positive", "negative", or "neutral")
- symbol (string: e.g. "SCOM", "EQTY", "KCB", "EABL", "BRIT", or "NSE")
- date (string: e.g. "Mar 11, 2026")

Example format:
[{"title":"Safaricom M-Pesa hits 40 million users","source":"Business Daily","summary":"Safaricom announced M-Pesa has crossed 40 million active users in Kenya. The milestone signals continued revenue growth for the telco giant.","sentiment":"positive","symbol":"SCOM","date":"Mar 11, 2026"}]`;

  const models = [
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "mistralai/mistral-small-3.1-24b-instruct:free",
    "openrouter/free"
  ];

  for (const model of models) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://nse-vault.vercel.app",
          "X-Title": "NSE Vault"
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500
        }),
      });

      const data = await response.json();
      if (data.error) continue;

      const raw = data.choices?.[0]?.message?.content || "";
      if (!raw) continue;

      // Strip any markdown fences if present
      const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

      // Find the JSON array
      const start = clean.indexOf("[");
      const end = clean.lastIndexOf("]");
      if (start === -1 || end === -1) continue;

      const jsonStr = clean.substring(start, end + 1);
      const news = JSON.parse(jsonStr);
      if (Array.isArray(news) && news.length > 0) {
        return res.status(200).json({ news });
      }
    } catch {
      continue;
    }
  }

  // Fallback: return hardcoded news if all models fail
  return res.status(200).json({
    news: [
      { title: "NSE 20-Share Index gains 1.2% on banking stocks rally", source: "Business Daily", summary: "The NSE 20-Share Index closed higher driven by gains in banking counters. Equity Group and KCB Group led the rally with strong volume.", sentiment: "positive", symbol: "NSE", date: "Mar 11, 2026" },
      { title: "Safaricom reports strong Q3 revenue growth", source: "KenyanWallStreet", summary: "Safaricom's M-Pesa continues to drive revenue with a 14% year-on-year increase in mobile money transactions. The company maintained its dividend guidance for the year.", sentiment: "positive", symbol: "SCOM", date: "Mar 10, 2026" },
      { title: "Equity Group expands DRC operations amid rising profits", source: "Reuters Africa", summary: "Equity Group Holdings announced expansion of its Democratic Republic of Congo operations following record profits. The bank's pan-African strategy continues to deliver returns.", sentiment: "positive", symbol: "EQTY", date: "Mar 9, 2026" },
      { title: "KCB Group completes NBK integration ahead of schedule", source: "Business Daily", summary: "KCB Group has completed the full integration of National Bank of Kenya ahead of the projected timeline. Cost savings from the merger are expected to boost 2026 earnings.", sentiment: "positive", symbol: "KCB", date: "Mar 8, 2026" },
      { title: "EABL faces margin pressure as excise duty rises", source: "The Star", summary: "East African Breweries Limited warned of margin pressure following the government's decision to raise excise duty on alcoholic beverages. The company is reviewing pricing strategy.", sentiment: "negative", symbol: "EABL", date: "Mar 7, 2026" },
      { title: "Britam Holdings posts improved underwriting results", source: "NSE", summary: "Britam Holdings reported improved underwriting profitability in its latest trading update. The insurer cited cost discipline and premium growth as key drivers.", sentiment: "positive", symbol: "BRIT", date: "Mar 6, 2026" }
    ]
  });
};
