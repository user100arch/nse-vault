module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set in Vercel env vars" });

  // Find the first available generateContent model on this key
  async function getModel() {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const d = await r.json();
    const models = d.models || [];
    const preferred = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash", "gemini-pro"];
    for (const name of preferred) {
      const found = models.find(m => m.name.includes(name) && m.supportedGenerationMethods?.includes("generateContent"));
      if (found) return found.name.replace("models/", "");
    }
    const fallback = models.find(m => m.supportedGenerationMethods?.includes("generateContent"));
    return fallback ? fallback.name.replace("models/", "") : null;
  }

  const prompt = `Give me 6 NSE Kenya stock market news items from March 2026. Cover Safaricom (SCOM), Equity Bank (EQTY), KCB, EABL, and general NSE market trends. Return ONLY a raw JSON array with no markdown, no backticks, no explanation. Each object must have: title, source, summary (max 2 sentences), sentiment (positive/negative/neutral), symbol (SCOM/EQTY/KCB/EABL/NSE), date.`;

  try {
    const model = await getModel();
    if (!model) return res.status(500).json({ news: [], error: "No available Gemini model found for your API key" });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
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
      return res.status(200).json({ news: JSON.parse(clean) });
    } catch {
      return res.status(200).json({ news: [] });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
