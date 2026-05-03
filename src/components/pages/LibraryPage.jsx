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
  const { t } = useLanguage();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("playing");

  const TABS = [
    { key: "playing", label: t("playing"), icon: "🎮" },
    { key: "completed", label: t("completed"), icon: "✅" },
    { key: "plan_to_play", label: t("wantToPlay"), icon: "📋" },
  ];

  useEffect(() => { if (currentUser) loadLibrary(); }, [currentUser]);

  async function loadLibrary() {
    try { setLibrary(await getUserLibrary(currentUser.uid)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleStatusChange(gameId, newStatus) {
    try { await updateLibraryEntry(currentUser.uid, gameId, { status: newStatus }); setLibrary((p) => p.map((g) => g.gameId === gameId ? { ...g, status: newStatus } : g)); }
    catch { toast.error("Failed"); }
  }

  async function handleRemove(gameId) {
    try { await removeFromLibrary(currentUser.uid, gameId); setLibrary((p) => p.filter((g) => g.gameId !== gameId)); toast.success(t("remove")); }
    catch { toast.error("Failed"); }
  }

  const filtered = library.filter((g) => g.status === activeTab);
  const counts = { playing: library.filter((g) => g.status === "playing").length, completed: library.filter((g) => g.status === "completed").length, plan_to_play: library.filter((g) => g.status === "plan_to_play").length };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page library-page">
      <h1>{t("myLibraryTitle")}</h1>
      <p className="page-subtitle">{t("manageCollection")}</p>
      <div className="library-stats">
        {TABS.map((tab) => (
          <div key={tab.key} className="stat-card"><span className="stat-icon">{tab.icon}</span><div><div className="stat-number">{counts[tab.key]}</div><div className="stat-label">{tab.label}</div></div></div>
        ))}
      </div>
      <div className="library-tabs">
        {TABS.map((tab) => (
          <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? "active" : ""}`} onClick={() => setActiveTab(tab.key)}>{tab.label} ({counts[tab.key]})</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><p>{t("noGamesInCategory")}</p><Link to="/browse" className="btn-primary">{t("browseGames")}</Link></div>
      ) : (
        <div className="library-list">
          {filtered.map((entry) => (
            <div key={entry.gameId} className="library-card">
              <Link to={`/game/${entry.gameId}`}><img src={getImageURL(entry.gameCover, "cover_small")} alt={entry.gameTitle} className="library-cover" /></Link>
              <div className="library-info"><Link to={`/game/${entry.gameId}`}><h3>{entry.gameTitle}</h3></Link>{entry.genre && <span className="genre-tag">{entry.genre}</span>}</div>
              <div className="library-actions">
                <select value={entry.status} onChange={(e) => handleStatusChange(entry.gameId, e.target.value)}>
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
