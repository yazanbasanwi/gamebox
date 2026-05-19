// src/components/pages/FeedPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getLatestReviews, toggleReviewLike, getUserLibrary, getUserReviews, createReport } from "../../services/firestoreService";
import { getImageURL, searchGames } from "../../services/igdbService";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Heart, Flag } from "lucide-react";
import toast from "react-hot-toast";

// Backend endpoint used to request AI-based game recommendations.
const AI_API_URL = "/api/ai/recommend";

// Main page component that displays community reviews and AI recommendations.
export default function FeedPage() {
  // Stores the latest community reviews shown in the feed.
  const [reviews, setReviews] = useState([]);
  // Controls the loading screen while reviews are being fetched.
  const [loading, setLoading] = useState(true);
  // Stores AI game recommendations returned from the backend.
  const [recommendations, setRecommendations] = useState([]);
  // Stores the AI explanation/analysis of the user taste.
  const [aiAnalysis, setAiAnalysis] = useState("");
  // Tracks whether AI recommendations are currently loading.
  const [loadingRecs, setLoadingRecs] = useState(false);
  // Stores any error message related to recommendations.
  const [recError, setRecError] = useState("");
  // Maps recommended game names to cover images and game IDs from IGDB.
  const [recGameCovers, setRecGameCovers] = useState({});
  // Gets the logged-in user and their profile data.
  const { currentUser, userProfile } = useAuth();
  // Gets translation helper and current app language.
  const { t, lang } = useLanguage();

  // Load community reviews once when the page first opens.
  useEffect(() => { loadFeed(); }, []);
  // Load AI recommendations only when a user is logged in.
  useEffect(() => { if (currentUser) loadAIRecommendations(); }, [currentUser]);

  // Fetches the latest reviews for the community feed.
  async function loadFeed() {
    try { setReviews(await getLatestReviews(30)); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Builds user taste data, sends it to the AI endpoint, then loads recommendation covers.
  async function loadAIRecommendations() {
    setLoadingRecs(true);
    setRecError("");
    try {
      // These arrays are used as input for the AI recommendation request.
      let library = [], userRevs = [];
      try { library = await getUserLibrary(currentUser.uid); } catch { library = []; }
      try { userRevs = await getUserReviews(currentUser.uid); } catch { userRevs = []; }

      // Stop if the user has no library games or reviews to analyze.
      if (library.length === 0 && userRevs.length === 0) {
        setRecError(t("addGamesForRecs") || (lang === "ar" ? "أضف ألعاباً لاحتياجاتك للحصول على توصيات" : "Add some games to your library to get recommendations"));
        setLoadingRecs(false);
        return;
      }

      // Send the user library, reviews, favorite genres, and language to the backend AI service.
      const response = await fetch(AI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          library,
          reviews: userRevs,
          favoriteGenres: userProfile?.favoriteGenres || [],
          language: lang,
        }),
      });

      if (!response.ok) throw new Error(`AI request failed: ${response.status}`);

      // Convert the AI response into usable JSON data.
      const data = await response.json();
      if (data.error) { setRecError(data.error); return; }

      setRecommendations(data.recommendations || []);
      setAiAnalysis(data.analysis || "");

      // Look up cover images for the first few recommended games using IGDB search.
      const covers = {};
      for (const rec of (data.recommendations || []).slice(0, 5)) {
        try {
          const results = await searchGames(rec.name, 1);
          if (results?.[0]?.cover?.image_id) {
            covers[rec.name] = { coverId: results[0].cover.image_id, gameId: results[0].id };
          }
        } catch { }
      }
      setRecGameCovers(covers);
    } catch (err) {
      console.error("AI recommendation error:", err);
      setRecError(lang === "ar" ? "فشل تحميل التوصيات" : "Failed to load AI recommendations");
    } finally {
      setLoadingRecs(false);
    }
  }

  // Likes or unlikes a review, then updates the review state immediately in the UI.
  async function handleLike(rid) {
    // Users must be logged in before liking a review.
    // Users must be logged in before reporting a review.
    if (!currentUser) return toast.error(t("logIn"));
    try {
      const liked = await toggleReviewLike(rid, currentUser.uid);
      setReviews((p) => p.map((r) => r.id === rid ? {
        ...r,
        likes: liked ? [...(r.likes||[]), currentUser.uid] : (r.likes||[]).filter((i) => i !== currentUser.uid),
        likesCount: (r.likesCount||0) + (liked ? 1 : -1),
      } : r));
    } catch { toast.error("Failed"); }
  }

  // Allows a logged-in user to report a review with a written reason.
  async function handleReport(rid) {
    if (!currentUser) return toast.error(t("logIn"));
    // Ask the user to provide a reason before creating the report.
    const reason = window.prompt(lang === "ar" ? "سبب الإبلاغ؟" : "Reason for reporting this review?");
    if (!reason) return;
    try {
      await createReport({ itemId: rid, itemType: "review", reportedBy: currentUser.uid, reason });
      toast.success(lang === "ar" ? "تم الإبلاغ، شكراً!" : "Reported. Thank you!");
    } catch { toast.error("Failed to report"); }
  }

  // Show a loading spinner until the feed reviews are ready.
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page feed-page">
      <div className="feed-layout">
        <div className="feed-main">
          <h1>{t("communityReviews")}</h1>
          {/* Show an empty message when there are no community reviews. */}
          {reviews.length === 0 ? (
            <div className="empty-state">
              <p>{t("noReviewsYet")}</p>
              <Link to="/browse" className="btn-primary">{t("browseGames")}</Link>
            </div>
          ) : (
            <div className="feed-list">
              {/* Render each review as a feed card. */}
              {reviews.map((review) => (
                <div key={review.id} className="feed-card">
                  <div className="feed-card-header">
                    <div className="feed-user">
                      <div className="feed-avatar">{review.username?.[0]?.toUpperCase()}</div>
                      <div>
                        <strong>{review.username}</strong>
                        <span className="feed-game-link"> {t("reviewed")} <Link to={`/game/${review.gameId}`}>{review.gameTitle}</Link></span>
                      </div>
                    </div>
                    <span className="feed-rating">{"★".repeat(Math.round(review.weightedScore||review.overallRating))} {review.weightedScore||review.overallRating}/5</span>
                  </div>
<div className="feed-card-body">
  {review.gameCover && (
    <img src={getImageURL(review.gameCover, "720p")} alt="" className="feed-cover" />
  )}
  <div className="feed-card-text">
    {review.textContent && <p className="feed-text">{review.textContent}</p>}
    <div className="feed-actions">
      {/* Like button changes style if the current user already liked the review. */}
      <button
        className={`like-btn ${review.likes?.includes(currentUser?.uid) ? "liked" : ""}`}
        onClick={() => handleLike(review.id)}
      >
        <Heart size={14} className="like-icon" />
        {review.likesCount||0}
      </button>
      <button className="feed-report-btn" onClick={() => handleReport(review.id)} title={lang === "ar" ? "إبلاغ" : "Report"}>
        <Flag size={13} />
        <span>{lang === "ar" ? "إبلاغ" : "Report"}</span>
      </button>
    </div>
  </div>
</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Only logged-in users can see the AI recommendations sidebar. */}
        {currentUser && (
          <aside className="feed-sidebar">
            <div className="sidebar-card ai-rec-card">
              <div className="ai-rec-header">
                <h3>{t("aiRecsTitle")}</h3>
                <span className="ai-badge">DeepSeek AI</span>
              </div>
              <p className="ai-rec-subtitle">{t("aiRecsSubtitle")}</p>

              {/* Display loading, error, or recommendation results depending on the current state. */}
              {loadingRecs ? (
                <div className="ai-loading">
                  <div className="ai-loading-dots"><span></span><span></span><span></span></div>
                  <p>{t("analyzingTaste")}</p>
                </div>
              ) : recError ? (
                <div className="ai-error">
                  <p>{recError}</p>
                  <button onClick={loadAIRecommendations} className="btn-ghost btn-sm" style={{ marginTop: "0.5rem" }}>
                    {lang === "ar" ? "إعادة المحاولة" : "Retry"}
                  </button>
                </div>
              ) : (
                <>
                  {aiAnalysis && <div className="ai-analysis"><p>{aiAnalysis}</p></div>}
                  <div className="ai-rec-list">
                    {/* Render every AI recommendation with cover, genre, match percentage, and reason. */}
                    {recommendations.map((rec, i) => {
                      // Find the IGDB cover data for this recommendation if it exists.
                      const cover = recGameCovers[rec.name];
                      return (
                        <div key={i} className="ai-rec-item">
                          <div className="ai-rec-item-header">
                            {cover ? (
                              <Link to={`/game/${cover.gameId}`}>
                                <img src={getImageURL(cover.coverId, "thumb")} alt="" className="ai-rec-cover" />
                              </Link>
                            ) : (
                              <div className="ai-rec-cover-placeholder">🎮</div>
                            )}
                            <div className="ai-rec-info">
                              {cover ? <Link to={`/game/${cover.gameId}`}><strong>{rec.name}</strong></Link> : <strong>{rec.name}</strong>}
                              <span className="ai-rec-genre">{rec.genre}</span>
                            </div>
                            <div className="ai-match-badge">{rec.matchPercent}%</div>
                          </div>
                          <p className="ai-rec-reason">{rec.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={loadAIRecommendations} className="btn-ghost btn-sm ai-refresh-btn">
                    🔄 {lang === "ar" ? "تحديث التوصيات" : "Refresh Recommendations"}
                  </button>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
