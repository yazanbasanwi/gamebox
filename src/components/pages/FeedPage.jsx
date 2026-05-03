// src/components/pages/FeedPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getLatestReviews, toggleReviewLike, getUserLibrary } from "../../services/firestoreService";
import { getImageURL, searchGames } from "../../services/igdbService";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";

export default function FeedPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => { loadFeed(); }, []);
  useEffect(() => { if (currentUser) loadRecommendations(); }, [currentUser]);

  async function loadFeed() {
    try { setReviews(await getLatestReviews(30)); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadRecommendations() {
    setLoadingRecs(true);
    try {
      const library = await getUserLibrary(currentUser.uid);
      const genres = {};
      library.forEach((g) => { if (g.genre) genres[g.genre] = (genres[g.genre]||0) + 1; });
      (userProfile?.favoriteGenres || []).forEach((g) => { genres[g] = (genres[g]||0) + 3; });
      const topGenres = Object.entries(genres).sort((a,b) => b[1]-a[1]).slice(0,3).map(([g]) => g);
      if (topGenres.length === 0) topGenres.push("RPG", "Action", "Adventure");
      const results = await searchGames(topGenres.join(" "), 6);
      const libIds = new Set(library.map((g) => g.gameId));
      setRecommendations((results||[]).filter((g) => !libIds.has(String(g.id))).slice(0,5));
    } catch (err) { console.error(err); }
    finally { setLoadingRecs(false); }
  }

  async function handleLike(rid) {
    if (!currentUser) return toast.error(t("logIn"));
    try {
      const liked = await toggleReviewLike(rid, currentUser.uid);
      setReviews((p) => p.map((r) => r.id === rid ? { ...r, likes: liked ? [...(r.likes||[]), currentUser.uid] : (r.likes||[]).filter((i) => i !== currentUser.uid), likesCount: (r.likesCount||0) + (liked ? 1 : -1) } : r));
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page feed-page">
      <div className="feed-layout">
        <div className="feed-main">
          <h1>{t("communityReviews")}</h1>
          {reviews.length === 0 ? (
            <div className="empty-state"><p>{t("noReviewsYet")}</p><Link to="/browse" className="btn-primary">{t("browseGames")}</Link></div>
          ) : (
            <div className="feed-list">
              {reviews.map((review) => (
                <div key={review.id} className="feed-card">
                  <div className="feed-card-header">
                    <div className="feed-user">
                      <div className="feed-avatar">{review.username?.[0]?.toUpperCase()}</div>
                      <div><strong>{review.username}</strong><span className="feed-game-link"> {t("reviewed")} <Link to={`/game/${review.gameId}`}>{review.gameTitle}</Link></span></div>
                    </div>
                    <span className="feed-rating">{"★".repeat(Math.round(review.weightedScore||review.overallRating))} {review.weightedScore||review.overallRating}/5</span>
                  </div>
                  {review.gameCover && <img src={getImageURL(review.gameCover, "cover_small")} alt="" className="feed-cover" />}
                  {review.textContent && <p className="feed-text">{review.textContent}</p>}
                  <div className="feed-actions">
                    <button className={`like-btn ${review.likes?.includes(currentUser?.uid) ? "liked" : ""}`} onClick={() => handleLike(review.id)}>❤️ {review.likesCount||0}</button>
                    <span>💬 {review.commentsCount||0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {currentUser && (
          <aside className="feed-sidebar">
            <div className="sidebar-card">
              <h3>{t("aiRecsTitle")}</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>{t("aiRecsSubtitle")}</p>
              {loadingRecs ? <p className="empty-text">{t("analyzingTaste")}</p> :
                recommendations.length === 0 ? <p className="empty-text">{t("addGamesForRecs")}</p> :
                <div className="rec-list">{recommendations.map((game) => (
                  <Link to={`/game/${game.id}`} key={game.id} className="rec-item">
                    {game.cover && <img src={getImageURL(game.cover.image_id, "thumb")} alt="" className="rec-cover" />}
                    <div><strong>{game.name}</strong>{game.total_rating && <span className="rec-rating">⭐ {Math.round(game.total_rating)}</span>}</div>
                  </Link>
                ))}</div>
              }
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
