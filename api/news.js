export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set in Vercel environment variables" });

  const prompt = `Search your knowledge for the latest NSE Kenya stock market news from March 2026. Include news about Safaricom, Equity Bank, KCB, EABL, and general NSE market trends. Return a JSON array of 6 news items. Each item must have these exact fields: title, source, summary (2 sentences max), sentiment (positive/negative/neutral), symbol (NSE stock symbol like SCOM/EQTY/KCB/EABL or "NSE" for general), date. Return ONLY the raw JSON array — no markdown, no backticks, no explanation.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 },
        }),
      }
    );

    const data = await response.json();
    if (data.error) return res.status(200).json({ news: [], error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      const news = JSON.parse(clean);
      res.status(200).json({ news });
    } catch {
      res.status(200).json({ news: [], raw });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
