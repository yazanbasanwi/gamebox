// src/services/igdbService.js
// ============================================================
// IGDB Game Data Service
// ============================================================
// All requests go through the Express backend proxy at /api/igdb
// The backend handles Twitch OAuth — NO secrets in the frontend
// ============================================================

const IGDB_PROXY_URL = process.env.REACT_APP_IGDB_PROXY_URL || "http://localhost:5000/api/igdb";

// ──────────────────────────────────────────────
// IGDB API Calls (via backend proxy)
// ──────────────────────────────────────────────

async function igdbFetch(endpoint, body) {
  const response = await fetch(`${IGDB_PROXY_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body,
  });
  if (!response.ok) throw new Error(`IGDB request failed: ${response.status}`);
  return response.json();
}

// Search games by name
export async function searchGames(searchQuery, count = 20) {
  const body = `
    search "${searchQuery}";
    fields name, cover.image_id, genres.name, platforms.name,
           first_release_date, rating, rating_count,
           summary, involved_companies.company.name,
           screenshots.image_id, total_rating;
    limit ${count};
    where version_parent = null;
  `;
  return igdbFetch("games", body);
}

// Get popular/trending games
export async function getPopularGames(count = 20) {
  const body = `
    fields name, cover.image_id, genres.name, platforms.name,
           first_release_date, rating, rating_count,
           summary, involved_companies.company.name,
           total_rating;
    sort total_rating_count desc;
    where total_rating_count > 100 & cover != null;
    limit ${count};
  `;
  return igdbFetch("games", body);
}

// Get recently released games
export async function getRecentGames(count = 20) {
  const now = Math.floor(Date.now() / 1000);
  const body = `
    fields name, cover.image_id, genres.name, platforms.name,
           first_release_date, rating, rating_count,
           summary, total_rating;
    sort first_release_date desc;
    where first_release_date < ${now} & cover != null;
    limit ${count};
  `;
  return igdbFetch("games", body);
}

// Get top rated games
export async function getTopRatedGames(count = 20) {
  const body = `
    fields name, cover.image_id, genres.name, platforms.name,
           first_release_date, rating, rating_count,
           summary, total_rating;
    sort total_rating desc;
    where total_rating_count > 50 & cover != null & total_rating > 80;
    limit ${count};
  `;
  return igdbFetch("games", body);
}

// Get a single game's full details
export async function getGameDetails(gameId) {
  const body = `
    fields name, cover.image_id, genres.name, platforms.name,
           first_release_date, rating, rating_count,
           summary, storyline, total_rating, total_rating_count,
           involved_companies.company.name, involved_companies.developer,
           involved_companies.publisher,
           screenshots.image_id, videos.video_id, videos.name,
           similar_games.name, similar_games.cover.image_id,
           themes.name, game_modes.name, player_perspectives.name;
    where id = ${gameId};
  `;
  const results = await igdbFetch("games", body);
  return results[0] || null;
}

// Get games by genre
export async function getGamesByGenre(genreId, count = 20) {
  const body = `
    fields name, cover.image_id, genres.name, platforms.name,
           first_release_date, rating, total_rating;
    where genres = (${genreId}) & cover != null;
    sort total_rating desc;
    limit ${count};
  `;
  return igdbFetch("games", body);
}

// Get all genres
export async function getGenres() {
  const body = `
    fields name, slug;
    sort name asc;
    limit 50;
  `;
  return igdbFetch("genres", body);
}

// ──────────────────────────────────────────────
// Image URL Helpers
// ──────────────────────────────────────────────

// IGDB image sizes: cover_small, cover_big, screenshot_med,
// screenshot_big, screenshot_huge, thumb, micro, 720p, 1080p
export function getImageURL(imageId, size = "cover_big") {
  if (!imageId) return "/placeholder-game.png";
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

// Helper to extract cover image ID from IGDB game object
export function getCoverURL(game, size = "cover_big") {
  if (!game?.cover?.image_id) return "/placeholder-game.png";
  return getImageURL(game.cover.image_id, size);
}

// Format UNIX timestamp to readable date
export function formatReleaseDate(timestamp) {
  if (!timestamp) return "TBA";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
