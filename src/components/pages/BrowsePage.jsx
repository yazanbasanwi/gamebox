// src/components/pages/BrowsePage.jsx
import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { searchGames, getPopularGames, getRecentGames, getTopRatedGames, getCoverURL, formatReleaseDate } from "../../services/igdbService";

export default function BrowsePage() {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("popular");
  const [searchInput, setSearchInput] = useState(queryParam);
  const { t } = useLanguage();

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
    if (!q.trim()) return loadGames(activeTab);
    setLoading(true);
    try { setGames((await searchGames(q.trim())) || []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="page browse-page">
      <div className="browse-header">
        <h1>{t("browseTitle")}</h1>
        <div className="browse-search">
          <input type="text" placeholder={t("searchForGame")} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          <button onClick={() => handleSearch()} className="btn-primary">{t("search")}</button>
        </div>
        <div className="browse-tabs">
          {[["popular", t("popular")], ["recent", t("newReleases")], ["top", t("topRated")]].map(([key, label]) => (
            <button key={key} className={`tab-btn ${activeTab === key ? "active" : ""}`} onClick={() => loadGames(key)}>{label}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="loading-screen"><div className="spinner" /><p>{t("loadingGames")}</p></div>
      ) : games.length === 0 ? (
        <div className="empty-state"><p>{t("noGamesFound")}</p></div>
      ) : (
        <div className="games-grid">
          {games.map((game) => (
            <Link to={`/game/${game.id}`} key={game.id} className="game-card">
              <div className="game-card-cover"><img src={getCoverURL(game)} alt={game.name} loading="lazy" /></div>
              <div className="game-card-info">
                <h3>{game.name}</h3>
                <span className="game-date">{formatReleaseDate(game.first_release_date)}</span>
                {game.genres && <div className="game-genres">{game.genres.slice(0, 2).map((g) => <span key={g.id || g.name} className="genre-tag">{g.name}</span>)}</div>}
                {game.total_rating && <div className="game-rating">⭐ {Math.round(game.total_rating)}/100</div>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
