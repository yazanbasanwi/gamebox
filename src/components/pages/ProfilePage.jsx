// src/components/pages/ProfilePage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getUserReviews, deleteReview, updateUserProfile, getUserProfile, followUser, unfollowUser } from "../../services/firestoreService";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../config/firebase";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const viewingUserId = userId || currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUser?.uid;

  useEffect(() => { if (viewingUserId) loadProfile(); }, [viewingUserId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const p = isOwnProfile ? userProfile : await getUserProfile(viewingUserId);
      setProfile(p); setBio(p?.bio || ""); setDisplayName(p?.displayName || ""); setFavoriteGenres((p?.favoriteGenres || []).join(", "));
      setReviews(await getUserReviews(viewingUserId));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSaveProfile() {
    try {
      await updateUserProfile(currentUser.uid, { displayName, bio, favoriteGenres: favoriteGenres.split(",").map((g) => g.trim()).filter(Boolean) });
      await fetchUserProfile(currentUser.uid); setEditing(false); toast.success(t("save") + "!");
    } catch { toast.error("Failed"); }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    toast.loading("Uploading...", { id: "avatar-upload" });
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}_${Date.now()}`);
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload complete:", snapshot);
      const url = await getDownloadURL(storageRef);
      console.log("Download URL:", url);
      await updateUserProfile(currentUser.uid, { avatarURL: url });
      await fetchUserProfile(currentUser.uid);
      setProfile((p) => ({ ...p, avatarURL: url }));
      toast.success("Profile picture updated!", { id: "avatar-upload" });
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Upload failed: " + (err.message || "Check Firebase Storage is enabled"), { id: "avatar-upload" });
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleFollow() {
    if (!currentUser) return toast.error(t("logIn"));
    try {
      const isFollowing = userProfile?.following?.includes(viewingUserId);
      if (isFollowing) { await unfollowUser(currentUser.uid, viewingUserId); } else { await followUser(currentUser.uid, viewingUserId); }
      await fetchUserProfile(currentUser.uid);
      setProfile(await getUserProfile(viewingUserId));
    } catch { toast.error("Failed"); }
  }

  async function handleDeleteReview(rid) {
    if (!window.confirm(t("delete") + "?")) return;
    try { await deleteReview(rid); setReviews((p) => p.filter((r) => r.id !== rid)); } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!profile) return <div className="page"><div className="empty-state"><p>User not found</p></div></div>;
  const isFollowing = userProfile?.following?.includes(viewingUserId);

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <div
          className="profile-avatar-large"
          onClick={() => { if (isOwnProfile && !uploading) fileInputRef.current?.click(); }}
          style={{ cursor: isOwnProfile ? "pointer" : "default" }}
        >
          {profile?.avatarURL ? <img src={profile.avatarURL} alt="" /> : <span>{(profile?.displayName || "U")[0].toUpperCase()}</span>}
          {isOwnProfile && <div className="avatar-overlay">{uploading ? "⏳" : "📷"}</div>}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/gif, image/webp"
            style={{ display: "none" }}
            onChange={handleAvatarUpload}
          />
        </div>
        <div className="profile-info">
          {editing ? (
            <div className="profile-edit-form">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("displayName")} />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("aboutYourself")} rows={3} />
              <input value={favoriteGenres} onChange={(e) => setFavoriteGenres(e.target.value)} placeholder={t("favoriteGenres")} />
              <div className="form-actions"><button onClick={handleSaveProfile} className="btn-primary">{t("save")}</button><button onClick={() => setEditing(false)} className="btn-ghost">{t("cancel")}</button></div>
            </div>
          ) : (
            <>
              <h1>{profile?.displayName || "User"}</h1>
              <p className="profile-bio">{profile?.bio || t("noBioYet")}</p>
              {profile?.favoriteGenres?.length > 0 && <div className="profile-genres">{profile.favoriteGenres.map((g) => <span key={g} className="genre-tag">{g}</span>)}</div>}
              <div className="profile-stats">
                <span>{reviews.length} {t("reviews")}</span>
                <span>{profile?.followers?.length || 0} {t("followers")}</span>
                <span>{profile?.following?.length || 0} {t("following")}</span>
              </div>
              <div className="profile-actions">
                {isOwnProfile ? <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">{t("editProfile")}</button> :
                  currentUser && <button onClick={handleFollow} className={isFollowing ? "btn-secondary btn-sm" : "btn-primary btn-sm"}>{isFollowing ? t("unfollow") : t("follow")}</button>
                }
              </div>
            </>
          )}
        </div>
      </div>
      <section className="profile-reviews">
        <h2>{isOwnProfile ? t("myReviews") : `${profile?.displayName}'s ${t("reviews")}`}</h2>
        {reviews.length === 0 ? <p className="empty-text">{t("noReviewsWritten")}</p> :
          <div className="reviews-list">{reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header"><strong>{review.gameTitle}</strong><span className="review-rating">{"★".repeat(Math.round(review.weightedScore||review.overallRating))} {review.weightedScore||review.overallRating}/5</span></div>
              {review.textContent && <p className="review-text">{review.textContent}</p>}
              {isOwnProfile && <button className="btn-ghost btn-sm danger" onClick={() => handleDeleteReview(review.id)}>{t("delete")}</button>}
            </div>
          ))}</div>
        }
      </section>
    </div>
  );
}
