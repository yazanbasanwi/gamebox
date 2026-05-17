// src/components/pages/GameDetailPage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getGameDetails, getCoverURL, getImageURL, formatReleaseDate, getAgeRating, getAccessibilityFeatures } from "../../services/igdbService";
import { createReview, getGameReviews, addToLibrary, toggleReviewLike, addComment, getComments, createReport } from "../../services/firestoreService";
import { Heart, MessageCircle, CornerDownRight, Flag, Volume2, VolumeX, Mic, MicOff } from "lucide-react";
import toast from "react-hot-toast";

const MODERATE_URL = "/api/ai/moderate";

function StarRating({ value, onChange, label }) {
  return (
    <div className="star-rating-row">
      <span className="star-label">{label}</span>
      <div className="stars">{[1,2,3,4,5].map((s) => <button key={s} type="button" className={`star ${s <= value ? "filled" : ""}`} onClick={() => onChange(s)}>★</button>)}</div>
      <span className="star-value">{value || "-"}</span>
    </div>
  );
}

function CommentItem({ comment, onReply, currentUser }) {
  return (
    <div className="comment-item">
      <div className="comment-avatar">{(comment.username?.[0] || "?").toUpperCase()}</div>
      <div className="comment-body">
        <strong className="comment-username">{comment.username}</strong>
        <p className="comment-text">{comment.text}</p>
        {currentUser && (
          <button className="reply-trigger-btn" onClick={() => onReply(comment.id, comment.username)}>
            <CornerDownRight size={12} /> Reply
          </button>
        )}
      </div>
    </div>
  );
}

function CommentSection({ reviewId, currentUser, userProfile, t }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try { setComments(await getComments(reviewId)); } catch {}
    finally { setLoading(false); }
  }

  function handleReply(commentId, username) {
    setReplyingTo({ commentId, username });
    setNewComment(`@${username} `);
    if (!show) { load(); setShow(true); }
  }

  async function moderateComment(text) {
    try {
      const res = await fetch(MODERATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { approved: true };
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser) return toast.error(t("logIn"));
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const modResult = await moderateComment(newComment.trim());
      if (!modResult.approved) {
        toast.error(`Comment not allowed: ${modResult.reason || "inappropriate content"}`);
        setSubmitting(false);
        return;
      }
      const c = await addComment(reviewId, {
        userId: currentUser.uid,
        username: userProfile?.displayName || currentUser.email,
        text: newComment.trim(),
      });
      setComments([...comments, c]);
      setNewComment("");
      setReplyingTo(null);
    } catch { toast.error("Failed to post comment"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="comment-section">
      <button className="comment-toggle-btn" onClick={() => { if (!show) load(); setShow(!show); }}>
        <MessageCircle size={14} />
        {show ? t("hideComments") : t("showComments")}
      </button>
      {show && (
        <div className="comments-list">
          {loading ? <p className="empty-text">{t("loading")}</p>
            : comments.length === 0 ? <p className="empty-text">{t("noCommentsYet")}</p>
            : comments.map((c) => (
              <CommentItem key={c.id} comment={c} onReply={handleReply} currentUser={currentUser} />
            ))
          }
          {currentUser && (
            <form onSubmit={handleSubmit} className="comment-form">
              {replyingTo && (
                <div className="reply-indicator">
                  <CornerDownRight size={12} /> Replying to @{replyingTo.username}
                  <button type="button" onClick={() => { setReplyingTo(null); setNewComment(""); }}>×</button>
                </div>
              )}
              <div className="comment-input-row">
                <input
                  type="text"
                  placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : t("writeComment")}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button type="submit" className="btn-primary btn-sm" disabled={submitting}>
                  {submitting ? "..." : t("post")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function TTSButton({ text, t }) {
  const [speaking, setSpeaking] = useState(false);
  function handleSpeak() {
    if (!text) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.9;
    u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u); setSpeaking(true);
  }
  return (
    <button className="btn-ghost btn-sm icon-btn" onClick={handleSpeak}>
      {speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
      {speaking ? t("stop") : t("listen")}
    </button>
  );
}

export default function GameDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { t, lang } = useLanguage();
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
      const [g, r] = await Promise.all([getGameDetails(id), getGameReviews(id)]);
      setGame(g); setReviews(r);
    } catch (err) { console.error(err); toast.error("Failed to load game"); }
    finally { setLoading(false); }
  }

  function calcWeightedScore() {
    const r = [storyRating, gameplayRating, graphicsRating, audioRating, replayRating].filter((v) => v > 0);
    return r.length === 0 ? 0 : +(r.reduce((a, b) => a + b, 0) / r.length).toFixed(1);
  }

  function toggleSTT() {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Speech recognition not supported. Try Chrome.");
      return;
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    try {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SR();
      recognition.continuous = true; recognition.interimResults = true;
      recognition.lang = lang === "ar" ? "ar-SA" : "en-US";
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) setReviewText((prev) => (prev + " " + event.results[i][0].transcript).trim());
        }
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed") toast.error("Microphone access denied.");
        else if (event.error !== "no-speech") toast.error("Speech error: " + event.error);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start(); setIsListening(true);
      toast.success(lang === "ar" ? "جاري الاستماع..." : "Listening...");
    } catch (err) { toast.error("Failed to start voice input"); }
  }

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!currentUser) return toast.error(t("logIn"));
    const rating = reviewType === "simple" ? overallRating : calcWeightedScore();
    if (rating === 0) return toast.error("Please add a rating");
    setSubmitting(true);
    try {
      const nr = await createReview({
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
      setReviews([nr, ...reviews]); setShowReviewForm(false); resetForm();
      toast.success(t("publishReview") + "!");
    } catch { toast.error("Failed to submit review"); }
    finally { setSubmitting(false); }
  }

  function resetForm() {
    setOverallRating(0); setStoryRating(0); setGameplayRating(0);
    setGraphicsRating(0); setAudioRating(0); setReplayRating(0);
    setReviewText(""); setReviewType("simple");
  }

  async function handleAddToLibrary(status) {
    if (!currentUser) return toast.error(t("logIn"));
    try {
      await addToLibrary(currentUser.uid, { gameId: String(id), gameTitle: game.name, gameCover: game.cover?.image_id || "", genre: game.genres?.[0]?.name || "", status });
      toast.success("Added to library!");
    } catch { toast.error("Failed"); }
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
    const reason = window.prompt(lang === "ar" ? "سبب الإبلاغ؟" : "Reason for reporting?");
    if (!reason) return;
    try { await createReport({ itemId: rid, itemType: "review", reportedBy: currentUser.uid, reason }); toast.success("Review reported. Thank you!"); }
    catch { toast.error("Failed to report"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /><p>{t("loading")}</p></div>;
  if (!game) return <div className="page"><div className="empty-state"><p>Game not found</p><button onClick={() => navigate("/browse")} className="btn-primary">{t("browseGames")}</button></div></div>;

  const devs = game.involved_companies?.filter((c) => c.developer)?.map((c) => c.company?.name).join(", ");
  const pubs = game.involved_companies?.filter((c) => c.publisher)?.map((c) => c.company?.name).join(", ");
  const ageRating = getAgeRating(game);
  const accessFeatures = getAccessibilityFeatures(game);
  const hasArabic = game.language_supports?.some((ls) => ls.language?.name === "Arabic");

  return (
    <div className="page game-detail-page">
      <div className="game-hero">
        {game.screenshots?.[0] && <div className="game-hero-bg" style={{ backgroundImage: `url(${getImageURL(game.screenshots[0].image_id, "screenshot_huge")})` }} />}
        <div className="game-hero-content">
          <img
            src={getImageURL(game.cover?.image_id, "cover_big_2x")}
            alt={game.name}
            className="game-detail-cover"
            onError={(e) => { e.target.src = "/placeholder-game.png"; }}
          />
          <div className="game-hero-info">
            <h1>{game.name}</h1>
            <div className="game-meta">
              {devs && <span>Developer: {devs}</span>}
              {pubs && <span>Publisher: {pubs}</span>}
              <span>{formatReleaseDate(game.first_release_date)}</span>
              {ageRating && (
                <span className={`age-rating-badge age-${ageRating.label.replace("+","plus").replace(" ","")}`}>
                  {ageRating.system} {ageRating.label}
                </span>
              )}
            </div>
            <div className="game-meta-badges">
              {game.genres && <div className="game-genres">{game.genres.map((g) => <span key={g.id||g.name} className="genre-tag">{g.name}</span>)}</div>}
              {hasArabic && <span className="arabic-badge">🇸🇦 {lang === "ar" ? "يدعم العربية" : "Arabic Support"}</span>}
              {accessFeatures.map((f) => <span key={f} className="access-badge">♿ {f}</span>)}
            </div>
            <div className="game-actions">
              <button onClick={() => handleAddToLibrary("playing")} className="btn-primary">{t("currentlyPlaying")}</button>
              <button onClick={() => handleAddToLibrary("plan_to_play")} className="btn-secondary">{t("wantToPlay")}</button>
              <button onClick={() => handleAddToLibrary("completed")} className="btn-secondary">{t("completed")}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="game-detail-body">
        <div className="game-detail-main">
          {game.summary && (
            <section className="detail-section">
              <h2>{t("about")}</h2>
              <p>{game.summary}</p>
              <TTSButton text={game.summary} t={t} />
            </section>
          )}
          {game.screenshots?.length > 0 && (
            <section className="detail-section">
              <h2>{t("screenshots")}</h2>
              <div className="screenshots-grid">
                {game.screenshots.slice(0, 4).map((ss) => (
                  <img key={ss.image_id} src={getImageURL(ss.image_id, "screenshot_big")} alt="" loading="lazy" />
                ))}
              </div>
            </section>
          )}

          <section className="detail-section">
            <div className="section-header">
              <h2>{t("reviews")} ({reviews.length})</h2>
              {currentUser && !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)} className="btn-primary">{t("writeReview")}</button>
              )}
            </div>
            {showReviewForm && (
              <div className="review-form-card">
                <h3>{t("writeReview")}</h3>
                <div className="review-type-toggle">
                  <button className={`toggle-btn ${reviewType === "simple" ? "active" : ""}`} onClick={() => setReviewType("simple")}>{t("simpleReview")}</button>
                  <button className={`toggle-btn ${reviewType === "detailed" ? "active" : ""}`} onClick={() => setReviewType("detailed")}>{t("detailedReview")}</button>
                </div>
                <form onSubmit={handleSubmitReview}>
                  {reviewType === "simple" ? <StarRating value={overallRating} onChange={setOverallRating} label={t("overallRating")} /> : (
                    <div className="category-ratings">
                      <h4>{t("categoryRatings")}</h4>
                      <StarRating value={gameplayRating} onChange={setGameplayRating} label={t("gameplay")} />
                      <StarRating value={graphicsRating} onChange={setGraphicsRating} label={t("graphics")} />
                      <StarRating value={audioRating} onChange={setAudioRating} label={t("audioSoundtrack")} />
                      <StarRating value={storyRating} onChange={setStoryRating} label={t("storyNarrative")} />
                      <StarRating value={replayRating} onChange={setReplayRating} label={t("replayability")} />
                      <div className="weighted-score">{t("overallScore")}: <strong>{calcWeightedScore()}</strong></div>
                    </div>
                  )}
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label>{t("yourReview")}</label>
                      <button type="button" className={`btn-ghost btn-sm icon-btn ${isListening ? "danger" : ""}`} onClick={toggleSTT}>
                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                        {isListening ? t("stopRecording") : t("voiceInput")}
                      </button>
                    </div>
                    <textarea rows={5} placeholder={t("shareThoughts")} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? t("publishing") : t("publishReview")}</button>
                    <button type="button" className="btn-ghost" onClick={() => { setShowReviewForm(false); resetForm(); }}>{t("cancel")}</button>
                  </div>
                </form>
              </div>
            )}
            <div className="reviews-list">
              {reviews.length === 0 ? <p className="empty-text">{t("noReviewsYet")}</p> :
                reviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <strong>{review.username}</strong>
                      <span className="review-rating">
                        {"★".repeat(Math.round(review.weightedScore||review.overallRating))}
                        {"☆".repeat(5 - Math.round(review.weightedScore||review.overallRating))}
                        <span className="rating-number">{review.weightedScore||review.overallRating}/5</span>
                      </span>
                    </div>
                    {review.textContent && <p className="review-text">{review.textContent}</p>}
                    {review.reviewType === "detailed" && (
                      <div className="review-categories">
                        {review.gameplayRating && <span>{t("gameplay")}: {review.gameplayRating}★</span>}
                        {review.graphicsRating && <span>{t("graphics")}: {review.graphicsRating}★</span>}
                        {review.audioRating && <span>{t("audioSoundtrack")}: {review.audioRating}★</span>}
                        {review.storyRating && <span>{t("storyNarrative")}: {review.storyRating}★</span>}
                        {review.replayabilityRating && <span>{t("replayability")}: {review.replayabilityRating}★</span>}
                      </div>
                    )}
                    <div className="review-footer">
                      <button className={`like-btn ${review.likes?.includes(currentUser?.uid) ? "liked" : ""}`} onClick={() => handleLike(review.id)}>
                        <Heart size={14} className="like-icon" />
                        {review.likesCount||0}
                      </button>
                      {review.textContent && <TTSButton text={review.textContent} t={t} />}
                      <button className="btn-ghost btn-sm icon-btn report-btn" onClick={() => handleReport(review.id)}>
                        <Flag size={13} /> {t("report")}
                      </button>
                    </div>
                    <CommentSection reviewId={review.id} currentUser={currentUser} userProfile={userProfile} t={t} />
                  </div>
                ))
              }
            </div>
          </section>
        </div>

        <aside className="game-detail-sidebar">
          <div className="sidebar-card">
            <h3>{t("details")}</h3>
            {ageRating && (
              <div className="sidebar-item">
                <span className="sidebar-label">{lang === "ar" ? "التصنيف العمري" : "Age Rating"}</span>
                <span className={`age-rating-badge age-${ageRating.label.replace("+","plus").replace(" ","")}`}>
                  {ageRating.system} {ageRating.label}
                </span>
              </div>
            )}
            {accessFeatures.length > 0 && (
              <div className="sidebar-item">
                <span className="sidebar-label">{lang === "ar" ? "إمكانية الوصول" : "Accessibility"}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {accessFeatures.map((f) => <span key={f} className="access-badge">♿ {f}</span>)}
                </div>
              </div>
            )}
            {game.platforms && (
              <div className="sidebar-item">
                <span className="sidebar-label">{t("platforms")}</span>
                <span>{game.platforms.map((p) => p.name).join(", ")}</span>
              </div>
            )}
            {game.game_modes && (
              <div className="sidebar-item">
                <span className="sidebar-label">{t("gameModes")}</span>
                <span>{game.game_modes.map((m) => m.name).join(", ")}</span>
              </div>
            )}
            {game.themes && (
              <div className="sidebar-item">
                <span className="sidebar-label">{t("themes")}</span>
                <span>{game.themes.map((th) => th.name).join(", ")}</span>
              </div>
            )}
            {game.total_rating && (
              <div className="sidebar-item">
                <span className="sidebar-label">{t("igdbRating")}</span>
                <span>⭐ {Math.round(game.total_rating)}/100 ({game.total_rating_count} {t("votes")})</span>
              </div>
            )}
          </div>
          {game.similar_games?.length > 0 && (
            <div className="sidebar-card">
              <h3>{t("similarGames")}</h3>
              <div className="similar-games">
                {game.similar_games.slice(0,5).map((sg) => (
                  <a key={sg.id} href={`/game/${sg.id}`} className="similar-game-link">
                    {sg.cover && <img src={getImageURL(sg.cover.image_id, "thumb")} alt={sg.name} />}
                    <span>{sg.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="sidebar-card support-card">
            <h3>{lang === "ar" ? "المساعدة" : "Help"}</h3>
            <a href="mailto:support@gamebox.app" className="support-link">
              📧 {lang === "ar" ? "تواصل مع الدعم" : "Contact Support"}
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
