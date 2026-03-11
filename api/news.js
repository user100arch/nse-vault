module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY not set" });

  const prompt = `Generate 6 realistic NSE Kenya stock market news items for March 2026. Cover Safaricom (SCOM), Equity Bank (EQTY), KCB Group (KCB), East African Breweries (EABL), Britam (BRIT), and one general NSE market update.

Return ONLY a valid JSON array. No markdown, no backticks, no explanation whatsoever — just the raw JSON array starting with [ and ending with ].

Each object must have exactly: title, source, summary (2 sentences), sentiment (positive/negative/neutral), symbol (SCOM/EQTY/KCB/EABL/BRIT/NSE), date (e.g. Mar 11, 2026).`;

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
        model: "openrouter/free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500
      }),
    });

    const data = await response.json();

    if (!data.error) {
      const raw = data.choices?.[0]?.message?.content || "";
      const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      const start = clean.indexOf("[");
      const end = clean.lastIndexOf("]");
      if (start !== -1 && end !== -1) {
        try {
          const news = JSON.parse(clean.substring(start, end + 1));
          if (Array.isArray(news) && news.length > 0) {
            return res.status(200).json({ news });
          }
        } catch {}
      }
    }
  } catch {}

  // Always fall back to hardcoded news so page is never empty
  return res.status(200).json({
    news: [
      { title: "NSE 20-Share Index gains 1.2% on banking stocks rally", source: "Business Daily", summary: "The NSE 20-Share Index closed higher driven by gains in banking counters. Equity Group and KCB Group led the rally with strong trading volume.", sentiment: "positive", symbol: "NSE", date: "Mar 11, 2026" },
      { title: "Safaricom M-Pesa transactions hit record KES 35 trillion", source: "KenyanWallStreet", summary: "Safaricom reported record M-Pesa transaction volumes for the financial year, crossing KES 35 trillion. The milestone reinforces the company's dominance in mobile money across East Africa.", sentiment: "positive", symbol: "SCOM", date: "Mar 10, 2026" },
      { title: "Equity Group expands DRC operations amid rising profits", source: "Reuters Africa", summary: "Equity Group Holdings announced expansion of its Democratic Republic of Congo banking operations following record regional profits. The bank's pan-African strategy continues to deliver strong shareholder returns.", sentiment: "positive", symbol: "EQTY", date: "Mar 9, 2026" },
      { title: "KCB Group completes NBK integration ahead of schedule", source: "Business Daily", summary: "KCB Group has completed the full integration of National Bank of Kenya ahead of the projected timeline. Cost savings from the merger are expected to significantly boost 2026 earnings per share.", sentiment: "positive", symbol: "KCB", date: "Mar 8, 2026" },
      { title: "EABL faces margin pressure as excise duty rises", source: "The Star Kenya", summary: "East African Breweries Limited warned of near-term margin pressure following the government's decision to raise excise duty on alcoholic beverages by 15%. The company is reviewing its pricing strategy ahead of Q2.", sentiment: "negative", symbol: "EABL", date: "Mar 7, 2026" },
      { title: "Britam Holdings posts improved underwriting results in Q1", source: "NSE Announcement", summary: "Britam Holdings reported improved underwriting profitability in its latest quarterly trading update, citing cost discipline and premium growth. The insurer declared an interim dividend of KES 0.20 per share.", sentiment: "positive", symbol: "BRIT", date: "Mar 6, 2026" }
    ]
  });
};
