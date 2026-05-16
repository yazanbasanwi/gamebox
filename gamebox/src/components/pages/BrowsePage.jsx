// src/components/pages/BrowsePage.jsx
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { Search, ChevronDown, Play } from "lucide-react";
import {
  searchGames, getPopularGames, getRecentGames, getTopRatedGames,
  getFilteredGames, getCoverURL, formatReleaseDate,
  GENRE_OPTIONS, PLATFORM_OPTIONS, SORT_OPTIONS, RATING_OPTIONS,
} from "../../services/igdbService";

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("popular");
  const [searchInput, setSearchInput] = useState(queryParam);
  const [showFilters, setShowFilters] = useState(false);
  const { t, lang } = useLanguage();

  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedRating, setSelectedRating] = useState(0);
  const [selectedSort, setSelectedSort] = useState("popular");
  const [arabicOnly, setArabicOnly] = useState(false);

  const isFiltered = selectedGenre !== "all" || selectedPlatform !== "all" || selectedRating > 0 || arabicOnly;
  const activeFilterCount = [selectedGenre !== "all", selectedPlatform !== "all", selectedRating > 0, arabicOnly].filter(Boolean).length;

  useEffect(() => {
    if (queryParam) { setSearchInput(queryParam); handleSearch(queryParam); }
    else { loadGames(activeTab); }
  }, [queryParam]);

  async function loadGames(tab) {
    setLoading(true); setActiveTab(tab);
    try {
      let results;
      switch (tab) {
        case "recent": results = await getRecentGames(); break;
        case "top": results = await getTopRatedGames(); break;
        default: results = await getPopularGames();
      }
      setGames(results || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSearch(q = searchInput) {
    if (!q.trim()) return isFiltered ? applyFilters() : loadGames(activeTab);
    setLoading(true);
    try { setGames((await searchGames(q.trim())) || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function applyFilters() {
    setLoading(true);
    try {
      const results = await getFilteredGames({ genre: selectedGenre, platform: selectedPlatform, minRating: selectedRating, hasArabic: arabicOnly, sortBy: selectedSort, count: 40 });
      setGames(results);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function clearFilters() {
    setSelectedGenre("all"); setSelectedPlatform("all"); setSelectedRating(0); setSelectedSort("popular"); setArabicOnly(false);
    loadGames(activeTab);
  }

  function getOptionName(option) { return lang === "ar" ? (option.nameAr || option.name) : option.name; }

  const TABS = [
    { key: "popular", label: t("popular") },
    { key: "recent", label: t("newReleases") },
    { key: "top", label: t("topRated") },
  ];

  return (
    <div className="browse-page">
      {/* Sticky header */}
      <header>
        <div>
          <div className="browse-top-bar">
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "1.25rem", fontWeight: 700 }}>{t("browseTitle")}</h2>
            <div className="browse-search-pill">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder={t("searchForGame")}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
              />
            </div>
          </div>
          <div className="browse-filter-row">
            <div className="browse-tabs">
              {TABS.map(({ key, label }) => (
                <button key={key} className={`browse-tab ${activeTab === key && !isFiltered ? "active" : ""}`} onClick={() => loadGames(key)}>{label}</button>
              ))}
            </div>
            <div className="filter-pills">
              <button className={`filter-pill ${showFilters ? "active" : ""}`} onClick={() => setShowFilters(!showFilters)} style={showFilters ? { borderColor: "var(--accent)", color: "var(--accent)" } : {}}>
                {lang === "ar" ? "فلترة" : "Filters"}
                {activeFilterCount > 0 && <span style={{ background: "var(--accent)", color: "white", borderRadius: "50%", width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>{activeFilterCount}</span>}
                <ChevronDown size={12} />
              </button>
              {activeFilterCount > 0 && (
                <button className="filter-pill" onClick={clearFilters} style={{ color: "var(--danger)" }}>
                  {lang === "ar" ? "مسح" : "Clear"}
                </button>
              )}
            </div>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="filter-panel-dropdown">
              <div className="filter-grid">
                <div className="filter-select-group">
                  <label>{lang === "ar" ? "النوع" : "Genre"}</label>
                  <select value={selectedGenre} onChange={e => setSelectedGenre(e.target.value)}>
                    {GENRE_OPTIONS.map(g => <option key={g.id} value={g.id}>{getOptionName(g)}</option>)}
                  </select>
                </div>
                <div className="filter-select-group">
                  <label>{lang === "ar" ? "المنصة" : "Platform"}</label>
                  <select value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)}>
                    {PLATFORM_OPTIONS.map(p => <option key={p.id} value={p.id}>{getOptionName(p)}</option>)}
                  </select>
                </div>
                <div className="filter-select-group">
                  <label>{lang === "ar" ? "التقييم" : "Min Rating"}</label>
                  <select value={selectedRating} onChange={e => setSelectedRating(Number(e.target.value))}>
                    {RATING_OPTIONS.map(r => <option key={r.id} value={r.id}>{getOptionName(r)}</option>)}
                  </select>
                </div>
                <div className="filter-select-group">
                  <label>{lang === "ar" ? "ترتيب" : "Sort By"}</label>
                  <select value={selectedSort} onChange={e => setSelectedSort(e.target.value)}>
                    {SORT_OPTIONS.map(s => <option key={s.id} value={s.id}>{getOptionName(s)}</option>)}
                  </select>
                </div>
              </div>
              <div className="filter-bottom">
                <label className="arabic-toggle-row">
                  <input type="checkbox" checked={arabicOnly} onChange={e => setArabicOnly(e.target.checked)} />
                  <span>🇸🇦 {lang === "ar" ? "ألعاب تدعم العربية فقط" : "Arabic supported games only"}</span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={applyFilters} className="btn-primary btn-sm">{lang === "ar" ? "تطبيق" : "Apply"}</button>
                  {isFiltered && <button onClick={clearFilters} className="btn-ghost btn-sm">{lang === "ar" ? "مسح" : "Clear"}</button>}
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {isFiltered && (
            <div className="active-chips" style={{ marginTop: "0.75rem" }}>
              {selectedGenre !== "all" && <span className="chip">{getOptionName(GENRE_OPTIONS.find(g => String(g.id) === String(selectedGenre)) || {})} <button onClick={() => setSelectedGenre("all")}>×</button></span>}
              {selectedPlatform !== "all" && <span className="chip">{getOptionName(PLATFORM_OPTIONS.find(p => String(p.id) === String(selectedPlatform)) || {})} <button onClick={() => setSelectedPlatform("all")}>×</button></span>}
              {selectedRating > 0 && <span className="chip">⭐ {selectedRating}+ <button onClick={() => setSelectedRating(0)}>×</button></span>}
              {arabicOnly && <span className="chip">🇸🇦 {lang === "ar" ? "عربي" : "Arabic"} <button onClick={() => setArabicOnly(false)}>×</button></span>}
            </div>
          )}
        </div>
      </header>

      {/* Results */}
      {loading ? (
        <div className="loading-screen"><div className="spinner" /><p>{t("loadingGames")}</p></div>
      ) : games.length === 0 ? (
        <div className="empty-state"><p>{t("noGamesFound")}</p>{isFiltered && <button onClick={clearFilters} className="btn-primary" style={{ marginTop: "1rem" }}>{lang === "ar" ? "مسح الفلاتر" : "Clear Filters"}</button>}</div>
      ) : (
        <>
          <p className="results-count">{lang === "ar" ? `${games.length} لعبة` : `${games.length} games`}</p>
          <div className="games-grid">
            {games.map(game => (
              <Link to={`/game/${game.id}`} key={game.id} className="game-card">
                <div className="game-card-cover">
                  <img src={getCoverURL(game)} alt={game.name} loading="lazy" />
                  <div className="play-overlay"><div className="play-btn"><Play size={18} color="white" fill="white" /></div></div>
                </div>
                <div className="game-card-info">
                  <h3>{game.name}</h3>
                  <div className="game-card-meta">
                    <span>{formatReleaseDate(game.first_release_date)?.split(",")[1]?.trim() || "TBA"}</span>
                    {game.total_rating && <span className="game-rating-badge">⭐ {Math.round(game.total_rating)}</span>}
                  </div>
                  {game.genres?.[0] && <span className="genre-tag">{game.genres[0].name}</span>}
                  {game.language_supports?.some(ls => ls.language?.name === "Arabic") && <span className="arabic-badge" style={{ marginTop: 4 }}>🇸🇦 {lang === "ar" ? "عربي" : "Arabic"}</span>}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
