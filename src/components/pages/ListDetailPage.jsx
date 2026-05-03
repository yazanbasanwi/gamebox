// src/components/pages/ListDetailPage.jsx
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { db } from "../../config/firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { searchGames, getImageURL } from "../../services/igdbService";
import toast from "react-hot-toast";

export default function ListDetailPage() {
  const { listId } = useParams();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => { loadList(); }, [listId]);

  async function loadList() {
    try {
      const snap = await getDoc(doc(db, "lists", listId));
      if (snap.exists()) { setList({ id: snap.id, ...snap.data() }); }
      else { toast.error("List not found"); navigate("/lists"); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchGames(searchQuery.trim(), 5);
      setSearchResults(results || []);
    } catch { toast.error("Search failed"); }
    finally { setSearching(false); }
  }

  async function handleAddGame(game) {
    try {
      const gameData = {
        gameId: String(game.id),
        name: game.name,
        coverId: game.cover?.image_id || "",
      };
      await updateDoc(doc(db, "lists", listId), {
        games: arrayUnion(gameData),
      });
      setList((prev) => ({ ...prev, games: [...(prev.games || []), gameData] }));
      setSearchResults([]);
      setSearchQuery("");
      toast.success("Game added!");
    } catch { toast.error("Failed"); }
  }

  async function handleRemoveGame(gameId) {
    try {
      const gameToRemove = list.games.find((g) => g.gameId === gameId);
      if (!gameToRemove) return;
      await updateDoc(doc(db, "lists", listId), {
        games: arrayRemove(gameToRemove),
      });
      setList((prev) => ({ ...prev, games: prev.games.filter((g) => g.gameId !== gameId) }));
      toast.success(t("remove"));
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!list) return <div className="page"><div className="empty-state"><p>List not found</p></div></div>;

  const isOwner = currentUser?.uid === list.userId;

  return (
    <div className="page list-detail-page">
      <div className="section-header">
        <div>
          <h1>{list.title}</h1>
          <p className="page-subtitle">by {list.username} — {list.games?.length || 0} {t("games")}</p>
        </div>
        <Link to="/lists" className="btn-ghost">{t("backToLogin").replace("Login", t("lists"))}</Link>
      </div>

      {list.description && <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>{list.description}</p>}

      {/* Add games - only for owner */}
      {isOwner && (
        <div className="review-form-card" style={{ marginBottom: "1.5rem" }}>
          <h3>Add Games</h3>
          <div className="browse-search">
            <input type="text" placeholder={t("searchForGame")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            <button onClick={handleSearch} className="btn-primary btn-sm">{t("search")}</button>
          </div>
          {searching && <p className="empty-text">{t("loading")}</p>}
          {searchResults.length > 0 && (
            <div className="search-results-list">
              {searchResults.map((game) => (
                <div key={game.id} className="search-result-item">
                  {game.cover && <img src={getImageURL(game.cover.image_id, "thumb")} alt="" style={{ width: 32, height: 42, borderRadius: 4 }} />}
                  <span style={{ flex: 1 }}>{game.name}</span>
                  <button className="btn-primary btn-sm" onClick={() => handleAddGame(game)}>+</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Games in list */}
      {(!list.games || list.games.length === 0) ? (
        <div className="empty-state"><p>{t("noGamesFound")}</p></div>
      ) : (
        <div className="library-list">
          {list.games.map((game) => (
            <div key={game.gameId} className="library-card">
              <Link to={`/game/${game.gameId}`}>
                <img src={getImageURL(game.coverId, "cover_small")} alt={game.name} className="library-cover" />
              </Link>
              <div className="library-info">
                <Link to={`/game/${game.gameId}`}><h3>{game.name}</h3></Link>
              </div>
              {isOwner && (
                <button className="btn-ghost btn-sm danger" onClick={() => handleRemoveGame(game.gameId)}>{t("remove")}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
