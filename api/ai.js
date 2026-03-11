module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set in Vercel env vars" });

  let messages;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    messages = body?.messages;
  } catch {
    return res.status(400).json({ error: "Invalid request body" });
  }
  if (!messages) return res.status(400).json({ error: "messages required" });

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
    // fallback: first model that supports generateContent
    const fallback = models.find(m => m.supportedGenerationMethods?.includes("generateContent"));
    return fallback ? fallback.name.replace("models/", "") : null;
  }

  try {
    const model = await getModel();
    if (!model) return res.status(500).json({ error: "No available Gemini model found for your API key" });

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );
    const data = await response.json();
    if (data.error) return res.status(200).json({ error: data.error.message });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Analysis unavailable.";
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
