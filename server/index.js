// server/index.js
// ============================================================
// GameBox Backend — IGDB + DeepSeek AI + Steam API
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.text());
app.use(express.json());

// ── Environment Variables ──
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const STEAM_API_KEY = process.env.STEAM_API_KEY;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error("❌ Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env");
  process.exit(1);
}
if (!DEEPSEEK_API_KEY) console.warn("⚠️  Missing DEEPSEEK_API_KEY — AI recommendations disabled");
if (!STEAM_API_KEY) console.warn("⚠️  Missing STEAM_API_KEY — Steam import disabled");

// ── Twitch OAuth ──
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
  if (!data.access_token) throw new Error("Failed to get Twitch token");
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  console.log("✅ Twitch token refreshed");
  return accessToken;
}

// ── IGDB Proxy ──
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
    console.error("IGDB error:", err);
    res.status(500).json({ error: "IGDB request failed" });
  }
});

// ── DeepSeek AI Recommendations ──
app.post("/api/ai/recommend", async (req, res) => {
  if (!DEEPSEEK_API_KEY) return res.status(503).json({ error: "AI not configured" });

  try {
    const { library, reviews, favoriteGenres, language } = req.body;
    if (!library || library.length === 0) return res.status(400).json({ error: "No library data" });

    const isArabic = language === "ar";

    const libraryList = library.map((g) => {
      let entry = `- ${g.gameTitle}`;
      if (g.genre) entry += ` (${g.genre})`;
      if (g.status) entry += ` [${g.status.replace(/_/g, " ")}]`;
      if (g.hoursPlayed) entry += ` — ${g.hoursPlayed} hours`;
      return entry;
    }).join("\n");

    const reviewList = (reviews || []).slice(0, 10).map((r) => {
      let entry = `- ${r.gameTitle}: ${r.weightedScore || r.overallRating}/5`;
      if (r.reviewType === "detailed") {
        const cats = [];
        if (r.gameplayRating) cats.push(`Gameplay: ${r.gameplayRating}/5`);
        if (r.storyRating) cats.push(`Story: ${r.storyRating}/5`);
        if (r.graphicsRating) cats.push(`Graphics: ${r.graphicsRating}/5`);
        if (r.audioRating) cats.push(`Audio: ${r.audioRating}/5`);
        if (r.replayabilityRating) cats.push(`Replayability: ${r.replayabilityRating}/5`);
        if (cats.length > 0) entry += ` (${cats.join(", ")})`;
      }
      if (r.textContent) entry += ` — "${r.textContent.slice(0, 100)}"`;
      return entry;
    }).join("\n");

    const systemPrompt = isArabic
      ? `أنت مساعد ذكي متخصص في توصيات الألعاب. قم بتحليل مكتبة المستخدم ومراجعاته واقترح 5 ألعاب فيديو لم يلعبها بعد. لكل لعبة، قدم: اسم اللعبة، النوع، لماذا ستعجبه بناءً على ذوقه، ونسبة التوافق (1-100). أجب بصيغة JSON فقط.`
      : `You are an expert gaming recommendation AI. Analyze the user's game library, reviews, and preferences to suggest 5 video games they haven't played yet. For each game provide: name, genre, personalized reason, and match percentage (1-100). Respond ONLY in valid JSON.`;

    const userPrompt = `
${isArabic ? "مكتبة ألعاب المستخدم:" : "User's Game Library:"}
${libraryList}
${reviewList ? (isArabic ? "\nمراجعات المستخدم:\n" : "\nUser's Reviews:\n") + reviewList : ""}
${(favoriteGenres || []).length ? (isArabic ? "\nالأنواع المفضلة: " : "\nFavorite Genres: ") + favoriteGenres.join(", ") : ""}

Respond in this exact JSON format:
{"recommendations":[{"name":"Game Name","genre":"Genre","reason":"Why they'd like it","matchPercent":95}],"analysis":"Brief gaming taste analysis"}`;

    console.log("🤖 DeepSeek request — library:", library.length, "reviews:", (reviews || []).length);

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer sk-6decebe1dc0c4c09b70904ca7b2f3d95" },
      body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.7, max_tokens: 1500 }),
    });

    if (!response.ok) { console.error("DeepSeek error:", response.status); return res.status(500).json({ error: "AI service error" }); }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content || "";
    const cleaned = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    console.log("✅ DeepSeek recommendations:", parsed.recommendations?.length || 0);
    res.json(parsed);
  } catch (err) {
    console.error("AI error:", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// ══════════════════════════════════════════════
// STEAM API ENDPOINTS
// ══════════════════════════════════════════════

// Resolve vanity URL (custom Steam name) to Steam ID
app.get("/api/steam/resolve/:vanityUrl", async (req, res) => {
  if (!STEAM_API_KEY) return res.status(503).json({ error: "Steam API not configured" });
  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${C7739B18F07CB21CFA3E6F98B7525A4A}&vanityurl=${req.params.vanityUrl}`
    );
    const data = await response.json();
    if (data.response?.success === 1) {
      res.json({ steamId: data.response.steamid });
    } else {
      res.status(404).json({ error: "Steam user not found" });
    }
  } catch (err) {
    console.error("Steam resolve error:", err);
    res.status(500).json({ error: "Failed to resolve Steam user" });
  }
});

// Get Steam user profile
app.get("/api/steam/profile/:steamId", async (req, res) => {
  if (!STEAM_API_KEY) return res.status(503).json({ error: "Steam API not configured" });
  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${req.params.steamId}`
    );
    const data = await response.json();
    const player = data.response?.players?.[0];
    if (player) {
      res.json({
        steamId: player.steamid,
        personaName: player.personaname,
        avatarUrl: player.avatarfull,
        profileUrl: player.profileurl,
        countryCode: player.loccountrycode || null,
      });
    } else {
      res.status(404).json({ error: "Profile not found" });
    }
  } catch (err) {
    console.error("Steam profile error:", err);
    res.status(500).json({ error: "Failed to fetch Steam profile" });
  }
});

// Get user's owned games with playtime
app.get("/api/steam/games/:steamId", async (req, res) => {
  if (!STEAM_API_KEY) return res.status(503).json({ error: "Steam API not configured" });
  try {
    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${req.params.steamId}&include_appinfo=1&include_played_free_games=1&format=json`
    );
    const data = await response.json();

    if (!data.response?.games) {
      return res.status(404).json({ error: "No games found. Make sure the Steam profile is public." });
    }

    const games = data.response.games.map((game) => ({
      appId: game.appid,
      name: game.name,
      playtimeMinutes: game.playtime_forever || 0,
      playtimeHours: Math.round((game.playtime_forever || 0) / 60 * 10) / 10,
      playtimeRecent: game.playtime_2weeks || 0,
      iconUrl: game.img_icon_url
        ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
        : null,
      coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`,
    }));

    // Sort by playtime descending
    games.sort((a, b) => b.playtimeMinutes - a.playtimeMinutes);

    res.json({
      totalGames: data.response.game_count,
      games: games,
    });
  } catch (err) {
    console.error("Steam games error:", err);
    res.status(500).json({ error: "Failed to fetch Steam games" });
  }
});

// Get recently played games (last 2 weeks)
app.get("/api/steam/recent/:steamId", async (req, res) => {
  if (!STEAM_API_KEY) return res.status(503).json({ error: "Steam API not configured" });
  try {
    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${req.params.steamId}&count=10&format=json`
    );
    const data = await response.json();
    const games = (data.response?.games || []).map((game) => ({
      appId: game.appid,
      name: game.name,
      playtimeRecent: game.playtime_2weeks || 0,
      playtimeTotal: game.playtime_forever || 0,
      coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${game.appid}/header.jpg`,
    }));
    res.json({ games });
  } catch (err) {
    console.error("Steam recent error:", err);
    res.status(500).json({ error: "Failed to fetch recent games" });
  }
});

// ── Health Check ──
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    services: { igdb: !!TWITCH_CLIENT_ID, deepseek: !!DEEPSEEK_API_KEY, steam: !!STEAM_API_KEY },
  });
});

app.listen(PORT, () => {
  console.log(`🚀 GameBox API server running on http://localhost:${PORT}`);
  console.log(`📡 IGDB proxy at http://localhost:${PORT}/api/igdb/`);
  console.log(`🤖 AI recommendations at http://localhost:${PORT}/api/ai/recommend`);
  console.log(`🎮 Steam API at http://localhost:${PORT}/api/steam/`);
});
