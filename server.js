
const http = require("http");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== "POST" || req.url !== "/chat") {
    res.writeHead(404);
    return res.end("Not found");
  }

  if (!API_KEY) {
    res.writeHead(500);
    return res.end(JSON.stringify({ error: "API key is not configured" }));
  }

  try {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 30000) throw new Error("Message too large");
    }

    const data = JSON.parse(body);
    const character = String(data.character || "Персонаж").slice(0, 100);
    const personality = String(data.personality || "").slice(0, 3000);
    const message = String(data.message || "").slice(0, 4000);
    const history = Array.isArray(data.history) ? data.history.slice(-12) : [];

    if (!message.trim()) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Message is empty" }));
    }

    const input = history.map(item => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content || "").slice(0, 2000)
    }));

    input.push({ role: "user", content: message });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        instructions: `Ты — ${character} из вселенной Naruto.
Личность и манера речи: ${personality}
Оставайся в роли персонажа. Отвечай естественно, разнообразно и учитывай историю диалога.
Не повторяй шаблонные фразы. Не говори, что ты искусственный интеллект.`,
        input
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "OpenAI API error");
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ reply: result.output_text || "..." }));

  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`SHINOBI PHONE server running on port ${PORT}`);
});
