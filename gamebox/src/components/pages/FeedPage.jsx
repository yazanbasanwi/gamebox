// src/components/pages/FeedPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getLatestReviews, toggleReviewLike, getUserLibrary } from "../../services/firestoreService";
import { getImageURL, searchGames } from "../../services/igdbService";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function FeedPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const { currentUser, userProfile } = useAuth();

  useEffect(() => { loadFeed(); }, []);
  useEffect(() => { if (currentUser) loadRecommendations(); }, [currentUser]);

  async function loadFeed() {
    try { setReviews(await getLatestReviews(30)); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // AI Recommendation: analyze user's library genres and review patterns to suggest games
  async function loadRecommendations() {
    setLoadingRecs(true);
    try {
      // Get user's library to analyze preferences
      const library = await getUserLibrary(currentUser.uid);
      const genres = {};

      // Count genre frequency from library
      library.forEach((game) => {
        if (game.genre) {
          genres[game.genre] = (genres[game.genre] || 0) + 1;
        }
      });

      // Also consider favorite genres from profile
      (userProfile?.favoriteGenres || []).forEach((g) => {
        genres[g] = (genres[g] || 0) + 3; // weight profile preferences higher
      });

      // Get top genres
      const topGenres = Object.entries(genres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      if (topGenres.length === 0) {
        // Default recommendations if no preferences found
        topGenres.push("RPG", "Action", "Adventure");
      }

      // Search for games in top genres
      const searchQuery = topGenres.join(" ");
      const results = await searchGames(searchQuery, 6);

      // Filter out games already in library
      const libraryIds = new Set(library.map((g) => g.gameId));
      const filtered = (results || []).filter((g) => !libraryIds.has(String(g.id)));

      setRecommendations(filtered.slice(0, 5));
    } catch (err) {
      console.error("Recommendations error:", err);
    } finally {
      setLoadingRecs(false);
    }
  }

  async function handleLike(reviewId) {
    if (!currentUser) return toast.error("Please log in");
    try {
      const isLiked = await toggleReviewLike(reviewId, currentUser.uid);
      setReviews((prev) => prev.map((r) =>
        r.id === reviewId ? {
          ...r,
          likes: isLiked ? [...(r.likes || []), currentUser.uid] : (r.likes || []).filter((id) => id !== currentUser.uid),
          likesCount: (r.likesCount || 0) + (isLiked ? 1 : -1),
        } : r
      ));
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page feed-page">
      <div className="feed-layout">
        <div className="feed-main">
          <h1>Community Reviews</h1>
          {reviews.length === 0 ? (
            <div className="empty-state"><p>No reviews yet.</p><Link to="/browse" className="btn-primary">Browse Games</Link></div>
          ) : (
            <div className="feed-list">
              {reviews.map((review) => (
                <div key={review.id} className="feed-card">
                  <div className="feed-card-header">
                    <div className="feed-user">
                      <div className="feed-avatar">{review.username?.[0]?.toUpperCase()}</div>
                      <div>
                        <strong>{review.username}</strong>
                        <span className="feed-game-link"> reviewed <Link to={`/game/${review.gameId}`}>{review.gameTitle}</Link></span>
                      </div>
                    </div>
                    <span className="feed-rating">{"★".repeat(Math.round(review.weightedScore || review.overallRating))} {review.weightedScore || review.overallRating}/5</span>
                  </div>
                  {review.gameCover && <img src={getImageURL(review.gameCover, "cover_small")} alt="" className="feed-cover" />}
                  {review.textContent && <p className="feed-text">{review.textContent}</p>}
                  <div className="feed-actions">
                    <button className={`like-btn ${review.likes?.includes(currentUser?.uid) ? "liked" : ""}`} onClick={() => handleLike(review.id)}>❤️ {review.likesCount || 0}</button>
                    <span>💬 {review.commentsCount || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Recommendations Sidebar */}
        {currentUser && (
          <aside className="feed-sidebar">
            <div className="sidebar-card">
              <h3>🤖 AI Recommendations</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>Based on your library and preferences</p>
              {loadingRecs ? <p className="empty-text">Analyzing your taste...</p> :
                recommendations.length === 0 ? <p className="empty-text">Add games to your library for recommendations</p> :
                  <div className="rec-list">
                    {recommendations.map((game) => (
                      <Link to={`/game/${game.id}`} key={game.id} className="rec-item">
                        {game.cover && <img src={getImageURL(game.cover.image_id, "thumb")} alt="" className="rec-cover" />}
                        <div>
                          <strong>{game.name}</strong>
                          {game.total_rating && <span className="rec-rating">⭐ {Math.round(game.total_rating)}</span>}
                        </div>
                      </Link>
                    ))}
                  </div>
              }
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
