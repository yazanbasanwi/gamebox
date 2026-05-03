// server/index.js
// ============================================================
// GameBox Backend — Express Proxy for IGDB API
// ============================================================
// This server acts as a proxy between the React frontend and
// the IGDB API to handle CORS and keep the Twitch client
// secret secure (not exposed in the browser).
//
// RUN:   cd server && npm install && node index.js
// ============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.text());
app.use(express.json());

// ── Twitch OAuth Token Management ──
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error("❌ Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env");
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
  if (!data.access_token) {
    throw new Error("Failed to get Twitch token: " + JSON.stringify(data));
  }
  accessToken = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  console.log("✅ Twitch token refreshed");
  return accessToken;
}

// ── IGDB Proxy Endpoint ──
// POST /api/igdb/:endpoint
// Body: IGDB query string (Apicalypse syntax)
app.post("/api/igdb/:endpoint", async (req, res) => {
  try {
    const token = await getTwitchToken();
    const endpoint = req.params.endpoint;

    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: req.body,
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("IGDB proxy error:", err);
    res.status(500).json({ error: "Failed to fetch from IGDB" });
  }
});

// ── Health Check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start Server ──
app.listen(PORT, () => {
  console.log(`🚀 GameBox API server running on http://localhost:${PORT}`);
  console.log(`📡 IGDB proxy at http://localhost:${PORT}/api/igdb/`);
});
