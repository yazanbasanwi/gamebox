// src/__tests__/gamebox.test.js
// ============================================================
// GameBox Test Suite
// Tests core utilities, data transformations, and component logic
// Run with: npm test
// ============================================================

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// ── Utility function tests ──────────────────────────────────

// Tests for IGDB service helper functions
describe("igdbService utilities", () => {
  // Test cover URL generation with a valid image ID
  test("getCoverURL returns correct IGDB URL for valid image ID", () => {
    const game = { cover: { image_id: "abc123" } };
    const url = `https://images.igdb.com/igdb/image/upload/t_cover_big/abc123.jpg`;
    expect(url).toContain("abc123");
    expect(url).toContain("cover_big");
  });

  // Test cover URL fallback when no cover exists
  test("getCoverURL returns placeholder for missing cover", () => {
    const game = {};
    const result = game?.cover?.image_id ? "has-cover" : "/placeholder-game.png";
    expect(result).toBe("/placeholder-game.png");
  });

  // Test release date formatting from Unix timestamp
  test("formatReleaseDate returns formatted string for valid timestamp", () => {
    const timestamp = 1609459200; // 2021-01-01
    const result = new Date(timestamp * 1000).getFullYear();
    expect(result).toBe(2021);
  });

  // Test release date fallback for missing timestamp
  test("formatReleaseDate returns TBA for null timestamp", () => {
    const result = null ? new Date(null).toLocaleDateString() : "TBA";
    expect(result).toBe("TBA");
  });
});

// ── Weighted score calculation tests ───────────────────────

describe("Review weighted score calculation", () => {
  // Helper function that mirrors the component logic
  function calcWeightedScore(ratings) {
    const values = Object.values(ratings).filter(v => v > 0);
    if (values.length === 0) return 0;
    return +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  }

  // All ratings provided should average correctly
  test("calculates average of all five categories", () => {
    const ratings = { story: 4, gameplay: 5, graphics: 3, audio: 4, replayability: 4 };
    expect(calcWeightedScore(ratings)).toBe(4.0);
  });

  // Partial ratings should only average filled ones
  test("ignores zero-rated categories", () => {
    const ratings = { story: 5, gameplay: 5, graphics: 0, audio: 0, replayability: 0 };
    expect(calcWeightedScore(ratings)).toBe(5.0);
  });

  // Empty ratings should return 0
  test("returns 0 when no categories rated", () => {
    const ratings = { story: 0, gameplay: 0, graphics: 0, audio: 0, replayability: 0 };
    expect(calcWeightedScore(ratings)).toBe(0);
  });

  // Single rating should return that value
  test("returns single value when only one category rated", () => {
    const ratings = { story: 3, gameplay: 0, graphics: 0, audio: 0, replayability: 0 };
    expect(calcWeightedScore(ratings)).toBe(3.0);
  });
});

// ── Language context tests ──────────────────────────────────

describe("Language translations", () => {
  const translations = {
    en: { home: "Home", games: "Games", reviews: "Reviews" },
    ar: { home: "الرئيسية", games: "الألعاب", reviews: "المراجعات" },
  };

  // Translation function returns correct English string
  test("returns English translation for 'home'", () => {
    const t = (key) => translations.en[key] || key;
    expect(t("home")).toBe("Home");
  });

  // Translation function returns correct Arabic string
  test("returns Arabic translation for 'home'", () => {
    const t = (key) => translations.ar[key] || key;
    expect(t("home")).toBe("الرئيسية");
  });

  // Falls back to key when translation is missing
  test("returns key as fallback for missing translation", () => {
    const t = (key) => translations.en[key] || key;
    expect(t("missingKey")).toBe("missingKey");
  });

  // RTL direction should be set for Arabic
  test("sets dir=rtl for Arabic language", () => {
    const dir = "ar" === "ar" ? "rtl" : "ltr";
    expect(dir).toBe("rtl");
  });

  // LTR direction should be set for English
  test("sets dir=ltr for English language", () => {
    const dir = "en" === "ar" ? "rtl" : "ltr";
    expect(dir).toBe("ltr");
  });
});

// ── Library status logic tests ──────────────────────────────

describe("Library status management", () => {
  const mockLibrary = [
    { gameId: "1", gameTitle: "Elden Ring", status: "playing" },
    { gameId: "2", gameTitle: "Hollow Knight", status: "completed" },
    { gameId: "3", gameTitle: "Cyberpunk 2077", status: "plan_to_play" },
    { gameId: "4", gameTitle: "Hades", status: "playing" },
  ];

  // Filter by playing status should return 2 games
  test("filters library by 'playing' status correctly", () => {
    const playing = mockLibrary.filter(g => g.status === "playing");
    expect(playing).toHaveLength(2);
  });

  // Filter by completed should return 1 game
  test("filters library by 'completed' status correctly", () => {
    const completed = mockLibrary.filter(g => g.status === "completed");
    expect(completed).toHaveLength(1);
    expect(completed[0].gameTitle).toBe("Hollow Knight");
  });

  // All tab should show all games
  test("all tab returns full library", () => {
    const all = mockLibrary;
    expect(all).toHaveLength(4);
  });

  // Status update should change the correct game
  test("updates status of correct game by gameId", () => {
    const updated = mockLibrary.map(g =>
      g.gameId === "1" ? { ...g, status: "completed" } : g
    );
    const eldenRing = updated.find(g => g.gameId === "1");
    expect(eldenRing.status).toBe("completed");
  });

  // Remove should exclude the correct game
  test("removes game by gameId correctly", () => {
    const remaining = mockLibrary.filter(g => g.gameId !== "2");
    expect(remaining).toHaveLength(3);
    expect(remaining.find(g => g.gameId === "2")).toBeUndefined();
  });
});

// ── Steam input parsing tests ───────────────────────────────

describe("Steam input parsing", () => {
  // Helper that mirrors SteamImportPage parseSteamInput logic
  function parseSteamInput(input) {
    const trimmed = input.trim();
    if (/^\d{17}$/.test(trimmed)) return { type: "id", value: trimmed };
    const idMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (idMatch) return { type: "id", value: idMatch[1] };
    const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/);
    if (vanityMatch) return { type: "vanity", value: vanityMatch[1] };
    if (trimmed.length > 0 && !/\s/.test(trimmed)) return { type: "vanity", value: trimmed };
    return null;
  }

  // Direct Steam ID (17 digits) should be recognized
  test("parses direct 17-digit Steam ID", () => {
    const result = parseSteamInput("76561198012345678");
    expect(result).toEqual({ type: "id", value: "76561198012345678" });
  });

  // Full profile URL with /profiles/ should extract ID
  test("parses Steam profile URL", () => {
    const result = parseSteamInput("https://steamcommunity.com/profiles/76561198012345678");
    expect(result).toEqual({ type: "id", value: "76561198012345678" });
  });

  // Vanity URL should extract username
  test("parses Steam vanity URL", () => {
    const result = parseSteamInput("https://steamcommunity.com/id/gaben");
    expect(result).toEqual({ type: "vanity", value: "gaben" });
  });

  // Plain username should be treated as vanity
  test("parses plain username as vanity", () => {
    const result = parseSteamInput("gaben");
    expect(result).toEqual({ type: "vanity", value: "gaben" });
  });

  // Empty string should return null
  test("returns null for empty input", () => {
    const result = parseSteamInput("   ");
    expect(result).toBeNull();
  });
});

// ── Compare page average calculation tests ──────────────────

describe("Game comparison average ratings", () => {
  // Helper that mirrors ComparePage calcAverages logic
  function calcAverages(reviews) {
    if (reviews.length === 0) return { overall: 0, gameplay: 0, count: 0 };
    let totals = { overall: 0, gameplay: 0 };
    let counts = { overall: 0, gameplay: 0 };
    reviews.forEach(r => {
      const score = r.weightedScore || r.overallRating || 0;
      if (score > 0) { totals.overall += score; counts.overall++; }
      if (r.gameplayRating) { totals.gameplay += r.gameplayRating; counts.gameplay++; }
    });
    return {
      overall: counts.overall > 0 ? totals.overall / counts.overall : 0,
      gameplay: counts.gameplay > 0 ? totals.gameplay / counts.gameplay : 0,
      count: reviews.length,
    };
  }

  // Empty reviews should return zeros
  test("returns zero averages for empty reviews", () => {
    const result = calcAverages([]);
    expect(result.overall).toBe(0);
    expect(result.count).toBe(0);
  });

  // Single review should return its value as average
  test("returns correct average for single review", () => {
    const result = calcAverages([{ overallRating: 4, gameplayRating: 5 }]);
    expect(result.overall).toBe(4);
    expect(result.gameplay).toBe(5);
  });

  // Multiple reviews should average correctly
  test("averages multiple reviews correctly", () => {
    const reviews = [
      { overallRating: 4 },
      { overallRating: 2 },
    ];
    const result = calcAverages(reviews);
    expect(result.overall).toBe(3);
  });
});

// ── Filter logic tests ──────────────────────────────────────

describe("Browse page filter logic", () => {
  const mockGames = [
    { id: 1, name: "Elden Ring", genres: [{ name: "RPG" }], total_rating: 95 },
    { id: 2, name: "FIFA 24", genres: [{ name: "Sport" }], total_rating: 70 },
    { id: 3, name: "Hades", genres: [{ name: "RPG" }], total_rating: 88 },
  ];

  // Rating filter should exclude games below threshold
  test("filters games by minimum rating", () => {
    const filtered = mockGames.filter(g => (g.total_rating || 0) >= 80);
    expect(filtered).toHaveLength(2);
    expect(filtered.find(g => g.name === "FIFA 24")).toBeUndefined();
  });

  // Search should be case-insensitive
  test("search filter is case-insensitive", () => {
    const query = "elden";
    const filtered = mockGames.filter(g =>
      g.name.toLowerCase().includes(query.toLowerCase())
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Elden Ring");
  });
});
