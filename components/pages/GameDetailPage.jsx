// src/components/pages/GameDetailPage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getGameDetails, getCoverURL, getImageURL, formatReleaseDate } from "../../services/igdbService";
import {
  createReview, getGameReviews, addToLibrary,
  toggleReviewLike, addComment, getComments, createReport,
} from "../../services/firestoreService";
import toast from "react-hot-toast";

function StarRating({ value, onChange, label }) {
  return (
    <div className="star-rating-row">
      <span className="star-label">{label}</span>
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button key={star} type="button" className={`star ${star <= value ? "filled" : ""}`} onClick={() => onChange(star)}>★</button>
        ))}
      </div>
      <span className="star-value">{value || "-"}</span>
    </div>
  );
}

function CommentSection({ reviewId, currentUser, userProfile }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);

  async function loadComments() {
    setLoading(true);
    try { setComments(await getComments(reviewId)); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser) return toast.error("Please log in to comment");
    if (!newComment.trim()) return;
    try {
      const comment = await addComment(reviewId, {
        userId: currentUser.uid, username: userProfile?.displayName || currentUser.email, text: newComment.trim(),
      });
      setComments([...comments, comment]);
      setNewComment("");
      toast.success("Comment added!");
    } catch { toast.error("Failed to add comment"); }
  }

  return (
    <div className="comment-section">
      <button className="btn-ghost btn-sm" onClick={() => { if (!showComments) loadComments(); setShowComments(!showComments); }}>
        💬 {showComments ? "Hide" : "Show"} Comments
      </button>
      {showComments && (
        <div className="comments-list">
          {loading ? <p className="empty-text">Loading...</p> : comments.length === 0 ? <p className="empty-text">No comments yet</p> :
            comments.map((c) => (<div key={c.id} className="comment-item"><strong>{c.username}</strong><p>{c.text}</p></div>))
          }
          {currentUser && (
            <form onSubmit={handleSubmit} className="comment-form">
              <input type="text" placeholder="Write a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
              <button type="submit" className="btn-primary btn-sm">Post</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function TTSButton({ text }) {
  const [speaking, setSpeaking] = useState(false);
  function handleSpeak() {
    if (!text) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u); setSpeaking(true);
  }
  return <button className="btn-ghost btn-sm" onClick={handleSpeak}>{speaking ? "🔇 Stop" : "🔊 Listen"}</button>;
}

export default function GameDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [game, setGame] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewType, setReviewType] = useState("simple");
  const [overallRating, setOverallRating] = useState(0);
  const [storyRating, setStoryRating] = useState(0);
  const [gameplayRating, setGameplayRating] = useState(0);
  const [graphicsRating, setGraphicsRating] = useState(0);
  const [audioRating, setAudioRating] = useState(0);
  const [replayRating, setReplayRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => { loadGame(); }, [id]);

  async function loadGame() {
    setLoading(true);
    try {
      const [gameData, reviewsData] = await Promise.all([getGameDetails(id), getGameReviews(id)]);
      setGame(gameData); setReviews(reviewsData);
    } catch (err) { console.error("Failed to load game:", err); toast.error("Failed to load game details"); }
    finally { setLoading(false); }
  }

  function calcWeightedScore() {
    const ratings = [storyRating, gameplayRating, graphicsRating, audioRating, replayRating].filter((r) => r > 0);
    if (ratings.length === 0) return 0;
    return +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  }

  function toggleSpeechToText() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) { toast.error("Speech recognition not supported"); return; }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR(); r.continuous = true; r.interimResults = false; r.lang = "en-US";
    r.onresult = (e) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setReviewText((p) => (p + " " + t).trim()); };
    r.onerror = () => { setIsListening(false); toast.error("Speech error"); };
    r.onend = () => setIsListening(false);
    recognitionRef.current = r; r.start(); setIsListening(true); toast.success("Listening...");
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!currentUser) return toast.error("Please log in");
    const rating = reviewType === "simple" ? overallRating : calcWeightedScore();
    if (rating === 0) return toast.error("Please provide a rating");
    setSubmitting(true);
    try {
      const newReview = await createReview({
        userId: currentUser.uid, username: userProfile?.displayName || currentUser.email,
        gameId: String(id), gameTitle: game.name, gameCover: game.cover?.image_id || "",
        reviewType, overallRating: reviewType === "simple" ? overallRating : rating,
        storyRating: reviewType === "detailed" ? storyRating : null,
        gameplayRating: reviewType === "detailed" ? gameplayRating : null,
        graphicsRating: reviewType === "detailed" ? graphicsRating : null,
        audioRating: reviewType === "detailed" ? audioRating : null,
        replayabilityRating: reviewType === "detailed" ? replayRating : null,
        weightedScore: rating, textContent: reviewText,
      });
      setReviews([newReview, ...reviews]); setShowReviewForm(false); resetForm(); toast.success("Review published!");
    } catch (err) { console.error(err); toast.error("Failed to publish"); } finally { setSubmitting(false); }
  }

  function resetForm() { setOverallRating(0); setStoryRating(0); setGameplayRating(0); setGraphicsRating(0); setAudioRating(0); setReplayRating(0); setReviewText(""); setReviewType("simple"); }

  async function handleAddToLibrary(status) {
    if (!currentUser) return toast.error("Please log in");
    try { await addToLibrary(currentUser.uid, { gameId: String(id), gameTitle: game.name, gameCover: game.cover?.image_id || "", genre: game.genres?.[0]?.name || "", status }); toast.success(`Added to ${status.replace(/_/g, " ")}!`); }
    catch { toast.error("Failed to add"); }
  }

  async function handleLike(reviewId) {
    if (!currentUser) return toast.error("Please log in");
    try {
      const isLiked = await toggleReviewLike(reviewId, currentUser.uid);
      setReviews((prev) => prev.map((r) => r.id === reviewId ? { ...r, likes: isLiked ? [...(r.likes || []), currentUser.uid] : (r.likes || []).filter((i) => i !== currentUser.uid), likesCount: (r.likesCount || 0) + (isLiked ? 1 : -1) } : r));
    } catch { toast.error("Failed"); }
  }

  async function handleReport(reviewId) {
    if (!currentUser) return toast.error("Please log in");
    const reason = window.prompt("Why are you reporting this?");
    if (!reason) return;
    try { await createReport({ itemId: reviewId, itemType: "review", reportedBy: currentUser.uid, reason }); toast.success("Report submitted"); }
    catch { toast.error("Failed"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading game...</p></div>;
  if (!game) return <div className="page"><div className="empty-state"><p>Game not found.</p><button onClick={() => navigate("/browse")} className="btn-primary">Browse Games</button></div></div>;

  const developers = game.involved_companies?.filter((c) => c.developer)?.map((c) => c.company?.name).join(", ");
  const publishers = game.involved_companies?.filter((c) => c.publisher)?.map((c) => c.company?.name).join(", ");

  return (
    <div className="page game-detail-page">
      <div className="game-hero">
        {game.screenshots?.[0] && <div className="game-hero-bg" style={{ backgroundImage: `url(${getImageURL(game.screenshots[0].image_id, "screenshot_huge")})` }} />}
        <div className="game-hero-content">
          <img src={getCoverURL(game, "cover_big")} alt={game.name} className="game-detail-cover" />
          <div className="game-hero-info">
            <h1>{game.name}</h1>
            <div className="game-meta">
              {developers && <span>Developer: {developers}</span>}
              {publishers && <span>Publisher: {publishers}</span>}
              <span>{formatReleaseDate(game.first_release_date)}</span>
            </div>
            {game.genres && <div className="game-genres">{game.genres.map((g) => <span key={g.id || g.name} className="genre-tag">{g.name}</span>)}</div>}
            <div className="game-actions">
              <button onClick={() => handleAddToLibrary("playing")} className="btn-primary">Currently Playing</button>
              <button onClick={() => handleAddToLibrary("plan_to_play")} className="btn-secondary">Want to Play</button>
              <button onClick={() => handleAddToLibrary("completed")} className="btn-secondary">Completed</button>
            </div>
          </div>
        </div>
      </div>

      <div className="game-detail-body">
        <div className="game-detail-main">
          {game.summary && <section className="detail-section"><h2>About</h2><p>{game.summary}</p><TTSButton text={game.summary} /></section>}
          {game.screenshots?.length > 0 && <section className="detail-section"><h2>Screenshots</h2><div className="screenshots-grid">{game.screenshots.slice(0, 4).map((ss) => <img key={ss.image_id} src={getImageURL(ss.image_id, "screenshot_big")} alt="screenshot" loading="lazy" />)}</div></section>}

          <section className="detail-section">
            <div className="section-header"><h2>Reviews ({reviews.length})</h2>{currentUser && !showReviewForm && <button onClick={() => setShowReviewForm(true)} className="btn-primary">Write a Review</button>}</div>
            {showReviewForm && (
              <div className="review-form-card">
                <h3>Write a Review</h3>
                <div className="review-type-toggle">
                  <button className={`toggle-btn ${reviewType === "simple" ? "active" : ""}`} onClick={() => setReviewType("simple")}>Simple Review</button>
                  <button className={`toggle-btn ${reviewType === "detailed" ? "active" : ""}`} onClick={() => setReviewType("detailed")}>Detailed Review</button>
                </div>
                <form onSubmit={handleSubmitReview}>
                  {reviewType === "simple" ? <StarRating value={overallRating} onChange={setOverallRating} label="Overall Rating" /> : (
                    <div className="category-ratings"><h4>Category Ratings</h4>
                      <StarRating value={gameplayRating} onChange={setGameplayRating} label="Gameplay" />
                      <StarRating value={graphicsRating} onChange={setGraphicsRating} label="Graphics" />
                      <StarRating value={audioRating} onChange={setAudioRating} label="Audio / Soundtrack" />
                      <StarRating value={storyRating} onChange={setStoryRating} label="Story / Narrative" />
                      <StarRating value={replayRating} onChange={setReplayRating} label="Replayability" />
                      <div className="weighted-score">Overall Score: <strong>{calcWeightedScore()}</strong></div>
                    </div>
                  )}
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label>Your Review (Optional)</label>
                      <button type="button" className={`btn-ghost btn-sm ${isListening ? "danger" : ""}`} onClick={toggleSpeechToText}>{isListening ? "🛑 Stop Recording" : "🎤 Voice Input"}</button>
                    </div>
                    <textarea rows={5} placeholder="Share your thoughts..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? "Publishing..." : "Publish Review"}</button>
                    <button type="button" className="btn-ghost" onClick={() => { setShowReviewForm(false); resetForm(); }}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
            <div className="reviews-list">
              {reviews.length === 0 ? <p className="empty-text">No reviews yet. Be the first!</p> :
                reviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div className="review-header"><strong>{review.username}</strong>
                      <span className="review-rating">{"★".repeat(Math.round(review.weightedScore || review.overallRating))}{"☆".repeat(5 - Math.round(review.weightedScore || review.overallRating))}<span className="rating-number">{review.weightedScore || review.overallRating}/5</span></span>
                    </div>
                    {review.textContent && <p className="review-text">{review.textContent}</p>}
                    {review.reviewType === "detailed" && <div className="review-categories">
                      {review.gameplayRating && <span>Gameplay: {review.gameplayRating}★</span>}
                      {review.graphicsRating && <span>Graphics: {review.graphicsRating}★</span>}
                      {review.audioRating && <span>Audio: {review.audioRating}★</span>}
                      {review.storyRating && <span>Story: {review.storyRating}★</span>}
                      {review.replayabilityRating && <span>Replay: {review.replayabilityRating}★</span>}
                    </div>}
                    <div className="review-footer">
                      <button className={`like-btn ${review.likes?.includes(currentUser?.uid) ? "liked" : ""}`} onClick={() => handleLike(review.id)}>❤️ {review.likesCount || 0}</button>
                      {review.textContent && <TTSButton text={review.textContent} />}
                      <button className="btn-ghost btn-sm" onClick={() => handleReport(review.id)}>🚩 Report</button>
                    </div>
                    <CommentSection reviewId={review.id} currentUser={currentUser} userProfile={userProfile} />
                  </div>
                ))
              }
            </div>
          </section>
        </div>
        <aside className="game-detail-sidebar">
          <div className="sidebar-card"><h3>Details</h3>
            {game.platforms && <div className="sidebar-item"><span className="sidebar-label">Platforms</span><span>{game.platforms.map((p) => p.name).join(", ")}</span></div>}
            {game.game_modes && <div className="sidebar-item"><span className="sidebar-label">Game Modes</span><span>{game.game_modes.map((m) => m.name).join(", ")}</span></div>}
            {game.themes && <div className="sidebar-item"><span className="sidebar-label">Themes</span><span>{game.themes.map((t) => t.name).join(", ")}</span></div>}
            {game.total_rating && <div className="sidebar-item"><span className="sidebar-label">IGDB Rating</span><span>⭐ {Math.round(game.total_rating)}/100 ({game.total_rating_count} votes)</span></div>}
          </div>
          {game.similar_games?.length > 0 && <div className="sidebar-card"><h3>Similar Games</h3><div className="similar-games">{game.similar_games.slice(0, 5).map((sg) => <a key={sg.id} href={`/game/${sg.id}`} className="similar-game-link">{sg.cover && <img src={getImageURL(sg.cover.image_id, "thumb")} alt={sg.name} />}<span>{sg.name}</span></a>)}</div></div>}
        </aside>
      </div>
    </div>
  );
}
