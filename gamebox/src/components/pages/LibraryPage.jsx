// src/components/pages/LibraryPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getUserLibrary, updateLibraryEntry, removeFromLibrary } from "../../services/firestoreService";
import { getImageURL } from "../../services/igdbService";
import toast from "react-hot-toast";

export default function LibraryPage() {
  const { currentUser } = useAuth();
  const { t, lang } = useLanguage();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");

  const TABS = [
    { key: "All", label: lang === "ar" ? "الكل" : "All" },
    { key: "playing", label: t("playing") },
    { key: "completed", label: t("completed") },
    { key: "plan_to_play", label: t("wantToPlay") },
  ];

  useEffect(() => { if (currentUser) loadLibrary(); }, [currentUser]);

  async function loadLibrary() {
    try { setLibrary(await getUserLibrary(currentUser.uid)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleStatusChange(gameId, newStatus) {
    try {
      await updateLibraryEntry(currentUser.uid, gameId, { status: newStatus });
      setLibrary(p => p.map(g => g.gameId === gameId ? { ...g, status: newStatus } : g));
    } catch { toast.error("Failed"); }
  }

  async function handleRemove(gameId) {
    try {
      await removeFromLibrary(currentUser.uid, gameId);
      setLibrary(p => p.filter(g => g.gameId !== gameId));
    } catch { toast.error("Failed"); }
  }

  const counts = {
    All: library.length,
    playing: library.filter(g => g.status === "playing").length,
    completed: library.filter(g => g.status === "completed").length,
    plan_to_play: library.filter(g => g.status === "plan_to_play").length,
  };

  const filtered = activeTab === "All" ? library : library.filter(g => g.status === activeTab);

  function getStatusClass(status) {
    if (status === "playing") return "status-playing";
    if (status === "completed") return "status-completed";
    return "status-plan_to_play";
  }

  function getStatusLabel(status) {
    if (status === "playing") return t("playing");
    if (status === "completed") return t("completed");
    return t("wantToPlay");
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page library-page">
      {/* Header with stat pills */}
      <div className="library-header">
        <h1>{t("myLibraryTitle")}</h1>
        <div className="library-stats-row">
          <div className="library-stat-pill">
            <span className="stat-label-text">{lang === "ar" ? "الإجمالي:" : "Total:"}</span>
            <strong>{counts.All}</strong>
          </div>
          <div className="library-stat-pill completed">
            <span className="stat-label-text" style={{ color: "var(--success)" }}>{lang === "ar" ? "مكتملة:" : "Completed:"}</span>
            <strong>{counts.completed}</strong>
          </div>
          <div className="library-stat-pill playing">
            <span className="stat-label-text" style={{ color: "var(--accent-light)" }}>{lang === "ar" ? "ألعبها:" : "Playing:"}</span>
            <strong>{counts.playing}</strong>
          </div>
          <div className="library-stat-pill wishlist">
            <span className="stat-label-text" style={{ color: "var(--warning)" }}>{lang === "ar" ? "قائمة الرغبات:" : "Wishlist:"}</span>
            <strong>{counts.plan_to_play}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="library-tabs">
        {TABS.map(tab => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)}>
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Games grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>{t("noGamesInCategory")}</p>
          <Link to="/browse" className="btn-primary" style={{ marginTop: "1rem" }}>{t("browseGames")}</Link>
        </div>
      ) : (
        <div className="library-grid">
          {filtered.map(entry => (
            <div key={entry.gameId} className="library-card">
              <Link to={`/game/${entry.gameId}`}>
                <img src={getImageURL(entry.gameCover, "cover_small")} alt={entry.gameTitle} className="library-cover" />
              </Link>
              <div className="library-info">
                <Link to={`/game/${entry.gameId}`}><h3>{entry.gameTitle}</h3></Link>
                <div className="library-meta">
                  <span className={`status-dot ${getStatusClass(entry.status)}`}>{getStatusLabel(entry.status)}</span>
                  {entry.genre && <span className="genre-tag">{entry.genre}</span>}
                  {entry.hoursPlayed > 0 && <span className="genre-tag">⏱️ {entry.hoursPlayed}h</span>}
                </div>
              </div>
              <div className="library-actions">
                <select value={entry.status} onChange={e => handleStatusChange(entry.gameId, e.target.value)}>
                  <option value="playing">{t("playing")}</option>
                  <option value="completed">{t("completed")}</option>
                  <option value="plan_to_play">{t("wantToPlay")}</option>
                </select>
                <button className="btn-ghost btn-sm" onClick={() => handleRemove(entry.gameId)}>{t("remove")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
