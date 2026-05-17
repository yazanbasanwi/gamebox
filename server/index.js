require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.text());
app.use(express.json());

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error("❌ Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET");
  process.exit(1);
}

let accessToken = null;
let tokenExpiry = 0;

async function getTwitchToken() {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: TWITCH_CLIENT_ID,
      client_secret: TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  const data = await response.json();
  if (!data.access_token) throw new Error("Failed to get Twitch token: " + JSON.stringify(data));
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  console.log("✅ Twitch token refreshed");
  return accessToken;
}

async function callDeepSeek(messages, maxTokens = 600, temperature = 0.7) {
  if (!DEEPSEEK_API_KEY) throw new Error("No DeepSeek API key configured");
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({ model: "deepseek-chat", messages, max_tokens: maxTokens, temperature }),
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`DeepSeek error ${response.status}: ${txt}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

app.post("/api/igdb/:endpoint", async (req, res) => {
  try {
    const token = await getTwitchToken();
    const response = await fetch(`https://api.igdb.com/v4/${req.params.endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: req.body,
    });
    res.json(await response.json());
  } catch (err) {
    console.error("IGDB proxy error:", err);
    res.status(500).json({ error: "Failed to fetch from IGDB" });
  }
});

app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { library = [], reviews = [], favoriteGenres = [], language } = req.body;
    const isArabic = language === "ar";

    if (!DEEPSEEK_API_KEY) return res.status(500).json({ error: "AI not configured" });

    const played = [
      ...library.map(g => g.gameTitle || g.gameName || ""),
      ...reviews.map(r => r.gameTitle || ""),
    ].filter(Boolean).slice(0, 30).join(", ");

    const reviewSummary = reviews.slice(0, 10).map(r =>
      `${r.gameTitle} (${r.weightedScore || r.overallRating}/5)`
    ).join(", ");

    const genreList = (favoriteGenres || []).join(", ");

    const prompt = isArabic
      ? `أنت خبير ألعاب فيديو. بناءً على ملف اللاعب هذا:
- الألعاب التي لعبها: ${played || "لا شيء"}
- التقييمات: ${reviewSummary || "لا شيء"}
- الأنواع المفضلة: ${genreList || "غير محدد"}

أوصِ بـ 5 ألعاب جديدة لم يلعبها. أجب بـ JSON فقط:
{"analysis":"جملة واحدة عن ذوق اللاعب","recommendations":[{"name":"اسم اللعبة","genre":"النوع","matchPercent":90,"reason":"سبب قصير"}]}`
      : `You are a video game expert. Based on this player profile:
- Games played: ${played || "none"}
- Reviews: ${reviewSummary || "none"}
- Favorite genres: ${genreList || "not specified"}

Recommend 5 games they haven't played. Reply ONLY with valid JSON (no markdown):
{"analysis":"One sentence about their taste","recommendations":[{"name":"Game Name","genre":"Genre","matchPercent":90,"reason":"Short reason why they'd love it"}]}`;

    const content = await callDeepSeek([{ role: "user", content: prompt }], 700, 0.8);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.json({ recommendations: [], analysis: "" });
    const parsed = JSON.parse(jsonMatch[0]);
    res.json(parsed);
  } catch (err) {
    console.error("AI recommend error:", err.message);
    res.status(500).json({ error: "Failed to load recommendations" });
  }
});

app.post("/api/ai/moderate", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 3) return res.json({ approved: true });
    if (!DEEPSEEK_API_KEY) return res.json({ approved: true });

    const content = await callDeepSeek([{
      role: "user",
      content: `Is this comment appropriate for a gaming review platform? Flag only clear hate speech, harassment, or explicit content. Minor profanity or harsh game criticism is fine. Reply ONLY with JSON: {"approved":true/false,"reason":"brief reason if rejected"}

Comment: "${text.slice(0, 500)}"`
    }], 80, 0.1);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { approved: true };
    res.json(result);
  } catch (err) {
    console.error("Moderation error:", err.message);
    res.json({ approved: true });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 GameBox API server running on http://localhost:${PORT}`);
  console.log(`📡 IGDB proxy at http://localhost:${PORT}/api/igdb/`);
  console.log(`🤖 AI endpoints at http://localhost:${PORT}/api/ai/`);
});
