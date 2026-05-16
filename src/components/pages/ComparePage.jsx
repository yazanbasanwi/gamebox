// src/components/pages/ComparePage.jsx
import { useState, useEffect } from "react";
import { useLanguage } from "../../context/LanguageContext";
import { searchGames, getGameDetails, getCoverURL, getImageURL, formatReleaseDate } from "../../services/igdbService";
import { getGameReviews } from "../../services/firestoreService";
import toast from "react-hot-toast";

function GameSearchBox({ label, selectedGame, onSelect, lang }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  async function handleSearch(q) {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); setShowResults(false); return; }
    setSearching(true);
    try {
      const data = await searchGames(q.trim(), 6);
      setResults(data || []);
      setShowResults(true);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }

  function handleSelect(game) {
    onSelect(game);
    setQuery("");
    setResults([]);
    setShowResults(false);
  }

  return (
    <div className="compare-search-box">
      <label className="compare-search-label">{label}</label>
      {selectedGame ? (
        <div className="compare-selected">
          <img src={getCoverURL(selectedGame, "cover_small")} alt="" className="compare-selected-cover" />
          <div className="compare-selected-info">
            <strong>{selectedGame.name}</strong>
            <span>{formatReleaseDate(selectedGame.first_release_date)}</span>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => onSelect(null)}>✕</button>
        </div>
      ) : (
        <div className="compare-search-wrapper">
          <input
            type="text"
            placeholder={lang === "ar" ? "ابحث عن لعبة..." : "Search for a game..."}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
          />
          {searching && <span className="compare-searching">{lang === "ar" ? "جاري البحث..." : "Searching..."}</span>}
          {showResults && results.length > 0 && (
            <div className="compare-dropdown">
              {results.map((game) => (
                <button key={game.id} className="compare-dropdown-item" onMouseDown={() => handleSelect(game)}>
                  {game.cover && <img src={getCoverURL(game, "thumb")} alt="" />}
                  <div>
                    <strong>{game.name}</strong>
                    <span>{formatReleaseDate(game.first_release_date)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RatingBar({ value, maxValue, label, color }) {
  const percent = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="rating-bar">
      <span className="rating-bar-label">{label}</span>
      <div className="rating-bar-track">
        <div className="rating-bar-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="rating-bar-value">{value > 0 ? value.toFixed(1) : "—"}</span>
    </div>
  );
}

export default function ComparePage() {
  const { t, lang } = useLanguage();
  const [game1, setGame1] = useState(null);
  const [game2, setGame2] = useState(null);
  const [detail1, setDetail1] = useState(null);
  const [detail2, setDetail2] = useState(null);
  const [reviews1, setReviews1] = useState([]);
  const [reviews2, setReviews2] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (game1 && game2) loadComparison();
  }, [game1, game2]);

  async function loadComparison() {
    setLoading(true);
    try {
      const [d1, d2, r1, r2] = await Promise.all([
        getGameDetails(game1.id),
        getGameDetails(game2.id),
        getGameReviews(String(game1.id)),
        getGameReviews(String(game2.id)),
      ]);
      setDetail1(d1);
      setDetail2(d2);
      setReviews1(r1);
      setReviews2(r2);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load comparison");
    } finally {
      setLoading(false);
    }
  }

  // Calculate average ratings from GameBox reviews
  function calcAverages(reviews) {
    if (reviews.length === 0) return { overall: 0, gameplay: 0, story: 0, graphics: 0, audio: 0, replayability: 0, count: 0 };
    let totals = { overall: 0, gameplay: 0, story: 0, graphics: 0, audio: 0, replayability: 0 };
    let counts = { overall: 0, gameplay: 0, story: 0, graphics: 0, audio: 0, replayability: 0 };

    reviews.forEach((r) => {
      const score = r.weightedScore || r.overallRating || 0;
      if (score > 0) { totals.overall += score; counts.overall++; }
      if (r.gameplayRating) { totals.gameplay += r.gameplayRating; counts.gameplay++; }
      if (r.storyRating) { totals.story += r.storyRating; counts.story++; }
      if (r.graphicsRating) { totals.graphics += r.graphicsRating; counts.graphics++; }
      if (r.audioRating) { totals.audio += r.audioRating; counts.audio++; }
      if (r.replayabilityRating) { totals.replayability += r.replayabilityRating; counts.replayability++; }
    });

    return {
      overall: counts.overall > 0 ? totals.overall / counts.overall : 0,
      gameplay: counts.gameplay > 0 ? totals.gameplay / counts.gameplay : 0,
      story: counts.story > 0 ? totals.story / counts.story : 0,
      graphics: counts.graphics > 0 ? totals.graphics / counts.graphics : 0,
      audio: counts.audio > 0 ? totals.audio / counts.audio : 0,
      replayability: counts.replayability > 0 ? totals.replayability / counts.replayability : 0,
      count: reviews.length,
    };
  }

  function handleSwap() {
    setGame1(game2); setGame2(game1);
    setDetail1(detail2); setDetail2(detail1);
    setReviews1(reviews2); setReviews2(reviews1);
  }

  const avg1 = calcAverages(reviews1);
  const avg2 = calcAverages(reviews2);
  const bothSelected = game1 && game2;
  const bothLoaded = detail1 && detail2 && !loading;

  const categories = [
    { key: "overall", label: lang === "ar" ? "التقييم العام" : "Overall", icon: "⭐" },
    { key: "gameplay", label: lang === "ar" ? "أسلوب اللعب" : "Gameplay", icon: "🎮" },
    { key: "story", label: lang === "ar" ? "القصة" : "Story", icon: "📖" },
    { key: "graphics", label: lang === "ar" ? "الرسومات" : "Graphics", icon: "🎨" },
    { key: "audio", label: lang === "ar" ? "الصوت" : "Audio", icon: "🎵" },
    { key: "replayability", label: lang === "ar" ? "إعادة اللعب" : "Replayability", icon: "🔄" },
  ];

  return (
    <div className="page compare-page">
      <h1>{lang === "ar" ? "مقارنة الألعاب" : "Game Comparison"}</h1>
      <p className="page-subtitle">{lang === "ar" ? "اختر لعبتين لمقارنتهما جنباً إلى جنب" : "Select two games to compare side by side"}</p>

      {/* Game Selection */}
      <div className="compare-selection">
        <GameSearchBox
          label={lang === "ar" ? "اللعبة الأولى" : "Game 1"}
          selectedGame={game1}
          onSelect={setGame1}
          lang={lang}
        />

        <div className="compare-vs">
          {bothSelected && (
            <button className="compare-swap-btn" onClick={handleSwap} title={lang === "ar" ? "تبديل" : "Swap"}>⇄</button>
          )}
          <span>VS</span>
        </div>

        <GameSearchBox
          label={lang === "ar" ? "اللعبة الثانية" : "Game 2"}
          selectedGame={game2}
          onSelect={setGame2}
          lang={lang}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="loading-screen"><div className="spinner" /><p>{lang === "ar" ? "جاري تحميل المقارنة..." : "Loading comparison..."}</p></div>
      )}

      {/* Comparison Results */}
      {bothLoaded && (
        <div className="compare-results">

          {/* Hero Comparison */}
          <div className="compare-hero">
            <div className="compare-hero-game">
              <img src={getCoverURL(detail1, "cover_big")} alt={detail1.name} className="compare-hero-cover" />
              <h2>{detail1.name}</h2>
              <div className="compare-hero-meta">
                <span>{formatReleaseDate(detail1.first_release_date)}</span>
                {detail1.total_rating && <span className="compare-igdb-score">IGDB: {Math.round(detail1.total_rating)}/100</span>}
              </div>
              {detail1.genres && <div className="game-genres" style={{ justifyContent: "center" }}>{detail1.genres.map((g) => <span key={g.id || g.name} className="genre-tag">{g.name}</span>)}</div>}
            </div>

            <div className="compare-hero-divider">
              <span className="compare-hero-vs">VS</span>
            </div>

            <div className="compare-hero-game">
              <img src={getCoverURL(detail2, "cover_big")} alt={detail2.name} className="compare-hero-cover" />
              <h2>{detail2.name}</h2>
              <div className="compare-hero-meta">
                <span>{formatReleaseDate(detail2.first_release_date)}</span>
                {detail2.total_rating && <span className="compare-igdb-score">IGDB: {Math.round(detail2.total_rating)}/100</span>}
              </div>
              {detail2.genres && <div className="game-genres" style={{ justifyContent: "center" }}>{detail2.genres.map((g) => <span key={g.id || g.name} className="genre-tag">{g.name}</span>)}</div>}
            </div>
          </div>

          {/* IGDB Rating Comparison */}
          <div className="compare-section">
            <h3>{lang === "ar" ? "تقييم IGDB" : "IGDB Ratings"}</h3>
            <div className="compare-bar-group">
              <div className="compare-bar-row">
                <div className="compare-bar-left">
                  <div className="compare-bar-track">
                    <div className="compare-bar-fill left" style={{ width: `${detail1.total_rating || 0}%` }} />
                  </div>
                  <span className="compare-bar-value">{detail1.total_rating ? Math.round(detail1.total_rating) : "—"}</span>
                </div>
                <span className="compare-bar-label">{lang === "ar" ? "التقييم" : "Rating"}</span>
                <div className="compare-bar-right">
                  <span className="compare-bar-value">{detail2.total_rating ? Math.round(detail2.total_rating) : "—"}</span>
                  <div className="compare-bar-track">
                    <div className="compare-bar-fill right" style={{ width: `${detail2.total_rating || 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="compare-bar-row">
                <div className="compare-bar-left">
                  <div className="compare-bar-track">
                    <div className="compare-bar-fill left" style={{ width: `${Math.min((detail1.total_rating_count || 0) / Math.max(detail1.total_rating_count || 1, detail2.total_rating_count || 1) * 100, 100)}%` }} />
                  </div>
                  <span className="compare-bar-value">{detail1.total_rating_count || 0}</span>
                </div>
                <span className="compare-bar-label">{lang === "ar" ? "الأصوات" : "Votes"}</span>
                <div className="compare-bar-right">
                  <span className="compare-bar-value">{detail2.total_rating_count || 0}</span>
                  <div className="compare-bar-track">
                    <div className="compare-bar-fill right" style={{ width: `${Math.min((detail2.total_rating_count || 0) / Math.max(detail1.total_rating_count || 1, detail2.total_rating_count || 1) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GameBox Community Ratings */}
          <div className="compare-section">
            <h3>{lang === "ar" ? "تقييمات مجتمع GameBox" : "GameBox Community Ratings"}</h3>
            {avg1.count === 0 && avg2.count === 0 ? (
              <p className="empty-text">{lang === "ar" ? "لا توجد مراجعات بعد لهاتين اللعبتين" : "No GameBox reviews yet for either game"}</p>
            ) : (
              <div className="compare-bar-group">
                {categories.map((cat) => (
                  <div key={cat.key} className="compare-bar-row">
                    <div className="compare-bar-left">
                      <div className="compare-bar-track">
                        <div className="compare-bar-fill left" style={{ width: `${(avg1[cat.key] / 5) * 100}%` }} />
                      </div>
                      <span className="compare-bar-value">{avg1[cat.key] > 0 ? avg1[cat.key].toFixed(1) : "—"}</span>
                    </div>
                    <span className="compare-bar-label">{cat.icon} {cat.label}</span>
                    <div className="compare-bar-right">
                      <span className="compare-bar-value">{avg2[cat.key] > 0 ? avg2[cat.key].toFixed(1) : "—"}</span>
                      <div className="compare-bar-track">
                        <div className="compare-bar-fill right" style={{ width: `${(avg2[cat.key] / 5) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="compare-review-counts">
                  <span>{avg1.count} {lang === "ar" ? "مراجعة" : "reviews"}</span>
                  <span>{avg2.count} {lang === "ar" ? "مراجعة" : "reviews"}</span>
                </div>
              </div>
            )}
          </div>

          {/* Details Comparison Table */}
          <div className="compare-section">
            <h3>{lang === "ar" ? "التفاصيل" : "Details"}</h3>
            <div className="compare-table">
              <div className="compare-table-row">
                <span className="compare-table-val">{detail1.involved_companies?.filter((c) => c.developer)?.map((c) => c.company?.name).join(", ") || "—"}</span>
                <span className="compare-table-label">{lang === "ar" ? "المطور" : "Developer"}</span>
                <span className="compare-table-val">{detail2.involved_companies?.filter((c) => c.developer)?.map((c) => c.company?.name).join(", ") || "—"}</span>
              </div>
              <div className="compare-table-row">
                <span className="compare-table-val">{detail1.platforms?.map((p) => p.name).join(", ") || "—"}</span>
                <span className="compare-table-label">{lang === "ar" ? "المنصات" : "Platforms"}</span>
                <span className="compare-table-val">{detail2.platforms?.map((p) => p.name).join(", ") || "—"}</span>
              </div>
              <div className="compare-table-row">
                <span className="compare-table-val">{detail1.game_modes?.map((m) => m.name).join(", ") || "—"}</span>
                <span className="compare-table-label">{lang === "ar" ? "أوضاع اللعب" : "Game Modes"}</span>
                <span className="compare-table-val">{detail2.game_modes?.map((m) => m.name).join(", ") || "—"}</span>
              </div>
              <div className="compare-table-row">
                <span className="compare-table-val">{detail1.themes?.map((th) => th.name).join(", ") || "—"}</span>
                <span className="compare-table-label">{lang === "ar" ? "الموضوعات" : "Themes"}</span>
                <span className="compare-table-val">{detail2.themes?.map((th) => th.name).join(", ") || "—"}</span>
              </div>
            </div>
          </div>

          {/* Screenshots */}
          {(detail1.screenshots?.length > 0 || detail2.screenshots?.length > 0) && (
            <div className="compare-section">
              <h3>{lang === "ar" ? "لقطات الشاشة" : "Screenshots"}</h3>
              <div className="compare-screenshots">
                <div className="compare-screenshots-col">
                  {detail1.screenshots?.slice(0, 2).map((ss) => (
                    <img key={ss.image_id} src={getImageURL(ss.image_id, "screenshot_big")} alt="" />
                  ))}
                </div>
                <div className="compare-screenshots-col">
                  {detail2.screenshots?.slice(0, 2).map((ss) => (
                    <img key={ss.image_id} src={getImageURL(ss.image_id, "screenshot_big")} alt="" />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!bothSelected && !loading && (
        <div className="compare-empty">
          <div className="compare-empty-icon">⚖️</div>
          <p>{lang === "ar" ? "اختر لعبتين أعلاه لبدء المقارنة" : "Select two games above to start comparing"}</p>
        </div>
      )}
    </div>
  );
}
