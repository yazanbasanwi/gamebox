const IGDB_PROXY_URL = process.env.REACT_APP_IGDB_PROXY_URL || "http://localhost:3001/api/igdb";

async function igdbFetch(endpoint, body) {
  const response = await fetch(`${IGDB_PROXY_URL}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body,
  });
  if (!response.ok) throw new Error(`IGDB request failed: ${response.status}`);
  return response.json();
}

const GAME_FIELDS = `name, cover.image_id, genres.name, genres.id, platforms.name, platforms.id,
  first_release_date, rating, rating_count, summary,
  involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
  total_rating, total_rating_count, language_supports.language.name, language_supports.language_support_type.name,
  age_ratings.rating, age_ratings.category`;

const DETAIL_FIELDS = `${GAME_FIELDS}, storyline, screenshots.image_id, videos.video_id, videos.name,
  similar_games.name, similar_games.cover.image_id, similar_games.id,
  themes.name, game_modes.name, player_perspectives.name`;

export async function searchGames(searchQuery, count = 20) {
  const body = `search "${searchQuery}"; fields ${GAME_FIELDS}; limit ${count}; where version_parent = null;`;
  return igdbFetch("games", body);
}

export async function getPopularGames(count = 20, offset = 0) {
  const body = `fields ${GAME_FIELDS}; sort total_rating_count desc; where total_rating_count > 100 & cover != null; limit ${count}; offset ${offset};`;
  return igdbFetch("games", body);
}

export async function getRecentGames(count = 20, offset = 0) {
  const now = Math.floor(Date.now() / 1000);
  const body = `fields ${GAME_FIELDS}; sort first_release_date desc; where first_release_date < ${now} & cover != null; limit ${count}; offset ${offset};`;
  return igdbFetch("games", body);
}

export async function getTopRatedGames(count = 20, offset = 0) {
  const body = `fields ${GAME_FIELDS}; sort total_rating desc; where total_rating_count > 50 & cover != null & total_rating > 80; limit ${count}; offset ${offset};`;
  return igdbFetch("games", body);
}

export async function getGameDetails(gameId) {
  const body = `fields ${DETAIL_FIELDS}; where id = ${gameId};`;
  const results = await igdbFetch("games", body);
  return results[0] || null;
}

export async function getFilteredGames({ genre, platform, minRating, hasArabic, sortBy, count = 30, offset = 0 }) {
  let conditions = ["cover != null", "version_parent = null"];
  if (genre && genre !== "all") conditions.push(`genres = (${genre})`);
  if (platform && platform !== "all") conditions.push(`platforms = (${platform})`);
  if (minRating && minRating > 0) {
    conditions.push(`total_rating >= ${minRating}`);
    conditions.push(`total_rating_count > 5`);
  }
  let sort = "sort total_rating_count desc";
  if (sortBy === "rating") sort = "sort total_rating desc";
  else if (sortBy === "newest") sort = "sort first_release_date desc";
  else if (sortBy === "name") sort = "sort name asc";
  else if (sortBy === "oldest") sort = "sort first_release_date asc";

  const whereClause = conditions.join(" & ");
  const fetchCount = hasArabic ? 200 : count;
  const body = `fields ${GAME_FIELDS}; ${sort}; where ${whereClause}; limit ${fetchCount}; offset ${hasArabic ? 0 : offset};`;
  let results = await igdbFetch("games", body);

  if (hasArabic && results) {
    results = results.filter((game) =>
      game.language_supports?.some((ls) => ls.language?.name === "Arabic")
    );
  }
  return results || [];
}

export async function getGenres() {
  return igdbFetch("genres", `fields id, name, slug; sort name asc; limit 50;`);
}

export async function getPlatforms() {
  return igdbFetch("platforms", `fields id, name, slug; sort name asc; where category = (1,5,6); limit 50;`);
}

export async function getGamesByGenre(genreId, count = 20) {
  const body = `fields ${GAME_FIELDS}; where genres = (${genreId}) & cover != null; sort total_rating desc; limit ${count};`;
  return igdbFetch("games", body);
}

export function getImageURL(imageId, size = "cover_big") {
  if (!imageId) return "/placeholder-game.png";
  return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

export function getCoverURL(game, size = "cover_big") {
  if (!game?.cover?.image_id) return "/placeholder-game.png";
  return getImageURL(game.cover.image_id, size);
}

export function formatReleaseDate(timestamp) {
  if (!timestamp) return "TBA";
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

const ESRB_MAP = { 6: "RP", 7: "EC", 8: "E", 9: "E10+", 10: "T", 11: "M", 12: "AO" };
const PEGI_MAP = { 1: "3", 2: "7", 3: "12", 4: "16", 5: "18" };

export function getAgeRating(game) {
  if (!game?.age_ratings?.length) return null;
  const esrb = game.age_ratings.find((r) => r.category === 1);
  if (esrb) return { label: ESRB_MAP[esrb.rating] || "RP", system: "ESRB" };
  const pegi = game.age_ratings.find((r) => r.category === 2);
  if (pegi) return { label: `${PEGI_MAP[pegi.rating] || "?"}+`, system: "PEGI" };
  return null;
}

export function getAccessibilityFeatures(game) {
  if (!game?.language_supports?.length) return [];
  const features = [];
  const hasSubtitles = game.language_supports.some((ls) =>
    ls.language_support_type?.name?.toLowerCase().includes("subtitle")
  );
  const audioCount = game.language_supports.filter((ls) =>
    ls.language_support_type?.name?.toLowerCase().includes("audio")
  ).length;
  if (hasSubtitles) features.push("Subtitles");
  if (audioCount > 1) features.push("Multiple Audio Languages");
  return features;
}

export const GENRE_OPTIONS = [
  { id: "all", name: "All Genres", nameAr: "جميع الأنواع" },
  { id: 31, name: "Adventure", nameAr: "مغامرة" },
  { id: 12, name: "RPG", nameAr: "تقمص أدوار" },
  { id: 5, name: "Shooter", nameAr: "تصويب" },
  { id: 15, name: "Strategy", nameAr: "استراتيجية" },
  { id: 8, name: "Platform", nameAr: "منصات" },
  { id: 9, name: "Puzzle", nameAr: "ألغاز" },
  { id: 10, name: "Racing", nameAr: "سباق" },
  { id: 14, name: "Sport", nameAr: "رياضة" },
  { id: 4, name: "Fighting", nameAr: "قتال" },
  { id: 2, name: "Point-and-click", nameAr: "أشر وانقر" },
  { id: 24, name: "Tactical", nameAr: "تكتيكية" },
  { id: 25, name: "Hack and slash", nameAr: "أكشن قتالي" },
  { id: 33, name: "Arcade", nameAr: "أركيد" },
  { id: 32, name: "Indie", nameAr: "مستقلة" },
  { id: 34, name: "Visual Novel", nameAr: "رواية مرئية" },
  { id: 35, name: "Card & Board", nameAr: "بطاقات ولوحية" },
  { id: 36, name: "MOBA", nameAr: "موبا" },
];

export const PLATFORM_OPTIONS = [
  { id: "all", name: "All Platforms", nameAr: "جميع المنصات" },
  { id: 6, name: "PC (Windows)", nameAr: "كمبيوتر" },
  { id: 48, name: "PlayStation 4", nameAr: "بلايستيشن 4" },
  { id: 167, name: "PlayStation 5", nameAr: "بلايستيشن 5" },
  { id: 49, name: "Xbox One", nameAr: "إكس بوكس ون" },
  { id: 169, name: "Xbox Series X|S", nameAr: "إكس بوكس سيريس" },
  { id: 130, name: "Nintendo Switch", nameAr: "نينتندو سويتش" },
  { id: 34, name: "Android", nameAr: "أندرويد" },
  { id: 39, name: "iOS", nameAr: "آي أو إس" },
];

export const SORT_OPTIONS = [
  { id: "popular", name: "Most Popular", nameAr: "الأكثر شعبية" },
  { id: "rating", name: "Highest Rated", nameAr: "الأعلى تقييماً" },
  { id: "newest", name: "Newest First", nameAr: "الأحدث أولاً" },
  { id: "oldest", name: "Oldest First", nameAr: "الأقدم أولاً" },
  { id: "name", name: "Name (A-Z)", nameAr: "الاسم (أ-ي)" },
];

export const RATING_OPTIONS = [
  { id: 0, name: "Any Rating", nameAr: "أي تقييم" },
  { id: 60, name: "60+", nameAr: "60+" },
  { id: 70, name: "70+", nameAr: "70+" },
  { id: 80, name: "80+", nameAr: "80+" },
  { id: 90, name: "90+", nameAr: "90+" },
];
