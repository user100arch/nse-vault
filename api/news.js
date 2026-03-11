module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = "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";

  const prompt = `Give me 6 NSE Kenya stock market news items from March 2026. Cover Safaricom (SCOM), Equity Bank (EQTY), KCB, EABL, and general NSE market trends. Return ONLY a raw JSON array with no markdown, no backticks, no explanation before or after. Each object must have exactly: title, source, summary (max 2 sentences), sentiment (positive/negative/neutral), symbol (SCOM/EQTY/KCB/EABL/NSE), date.`;

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
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1500
      }),
    });
    const data = await response.json();
    if (data.error) return res.status(200).json({ news: [], error: data.error.message });

    const raw = data.choices?.[0]?.message?.content || "[]";
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
