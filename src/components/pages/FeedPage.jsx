// src/components/pages/FeedPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getLatestReviews, toggleReviewLike, getUserLibrary, getUserReviews, createReport } from "../../services/firestoreService";
import { getImageURL, searchGames } from "../../services/igdbService";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Heart, Flag } from "lucide-react";
import toast from "react-hot-toast";

const AI_API_URL = "/api/ai/recommend";

export default function FeedPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState("");
  const [recGameCovers, setRecGameCovers] = useState({});
  const { currentUser, userProfile } = useAuth();
  const { t, lang } = useLanguage();

  useEffect(() => { loadFeed(); }, []);
  useEffect(() => { if (currentUser) loadAIRecommendations(); }, [currentUser]);

  async function loadFeed() {
    try { setReviews(await getLatestReviews(30)); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadAIRecommendations() {
    setLoadingRecs(true);
    setRecError("");
    try {
      let library = [], userRevs = [];
      try { library = await getUserLibrary(currentUser.uid); } catch { library = []; }
      try { userRevs = await getUserReviews(currentUser.uid); } catch { userRevs = []; }

      if (library.length === 0 && userRevs.length === 0) {
        setRecError(t("addGamesForRecs") || (lang === "ar" ? "أضف ألعاباً لاحتياجاتك للحصول على توصيات" : "Add some games to your library to get recommendations"));
        setLoadingRecs(false);
        return;
      }

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

      const data = await response.json();
      if (data.error) { setRecError(data.error); return; }

      setRecommendations(data.recommendations || []);
      setAiAnalysis(data.analysis || "");

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

  async function handleLike(rid) {
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

  async function handleReport(rid) {
    if (!currentUser) return toast.error(t("logIn"));
    const reason = window.prompt(lang === "ar" ? "سبب الإبلاغ؟" : "Reason for reporting this review?");
    if (!reason) return;
    try {
      await createReport({ itemId: rid, itemType: "review", reportedBy: currentUser.uid, reason });
      toast.success(lang === "ar" ? "تم الإبلاغ، شكراً!" : "Reported. Thank you!");
    } catch { toast.error("Failed to report"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page feed-page">
      <div className="feed-layout">
        <div className="feed-main">
          <h1>{t("communityReviews")}</h1>
          {reviews.length === 0 ? (
            <div className="empty-state">
              <p>{t("noReviewsYet")}</p>
              <Link to="/browse" className="btn-primary">{t("browseGames")}</Link>
            </div>
          ) : (
            <div className="feed-list">
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

        {currentUser && (
          <aside className="feed-sidebar">
            <div className="sidebar-card ai-rec-card">
              <div className="ai-rec-header">
                <h3>{t("aiRecsTitle")}</h3>
                <span className="ai-badge">DeepSeek AI</span>
              </div>
              <p className="ai-rec-subtitle">{t("aiRecsSubtitle")}</p>

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
                    {recommendations.map((rec, i) => {
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
