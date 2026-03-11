module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OPENROUTER_API_KEY not set in Vercel env vars" });

  let messages;
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    messages = body?.messages;
  } catch {
    return res.status(400).json({ error: "Invalid request body" });
  }
  if (!messages) return res.status(400).json({ error: "messages required" });

  // Try models in order until one works
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
        body: JSON.stringify({ model, messages, max_tokens: 1000 }),
      });

      const data = await response.json();
      if (data.error) continue; // try next model
      const text = data.choices?.[0]?.message?.content || "";
      if (text) return res.status(200).json({ text });
    } catch {
      continue; // try next model
    }
  }

  return res.status(200).json({ text: "AI advisor is temporarily unavailable. Please try again in a moment." });
};
