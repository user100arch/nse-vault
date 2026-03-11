export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured in Vercel environment variables" });

  const prompt = `Give me 6 NSE Kenya stock market news items from March 2026. Cover Safaricom (SCOM), Equity Bank (EQTY), KCB, EABL, and general NSE market trends. Return ONLY a raw JSON array — no markdown, no backticks, no explanation before or after. Each object must have exactly these fields: title (string), source (string), summary (max 2 sentences), sentiment ("positive" or "negative" or "neutral"), symbol (NSE ticker like SCOM/EQTY/KCB/EABL or "NSE"), date (string like "Mar 11, 2026").`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );
    const data = await response.json();
    if (data.error) return res.status(200).json({ news: [], error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const clean = raw.replace(/```json|```/g, "").trim();
    try {
      const news = JSON.parse(clean);
      res.status(200).json({ news });
    } catch {
      res.status(200).json({ news: [], raw });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
