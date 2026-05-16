// src/components/pages/ProfilePage.jsx
// Displays user profile, reviews, followers/following lists, and avatar upload
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  getUserReviews, deleteReview, updateUserProfile,
  getUserProfile, followUser, unfollowUser
} from "../../services/firestoreService";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../config/firebase";
import toast from "react-hot-toast";

// Sub-component: shows a modal list of followers or following users
function UserListModal({ title, userIds, onClose, lang }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch profiles for all user IDs in the list
    async function loadUsers() {
      try {
        const profiles = await Promise.all(userIds.map(id => getUserProfile(id)));
        setUsers(profiles.filter(Boolean));
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    }
    if (userIds.length > 0) loadUsers();
    else setLoading(false);
  }, [userIds]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: 120 }}><div className="spinner" /></div>
          ) : users.length === 0 ? (
            <p className="empty-text">{lang === "ar" ? "لا يوجد مستخدمون" : "No users yet"}</p>
          ) : (
            <div className="user-list">
              {users.map(user => (
                <Link key={user.id} to={`/user/${user.id}`} onClick={onClose} className="user-list-item">
                  <div className="user-list-avatar">
                    {user.avatarURL
                      ? <img src={user.avatarURL} alt="" />
                      : <span>{(user.displayName || "U")[0].toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <strong>{user.displayName || user.username || "User"}</strong>
                    {user.bio && <p className="user-list-bio">{user.bio.slice(0, 60)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const { t, lang } = useLanguage();

  // Profile data state
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");

  // Avatar upload state
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Modal state for followers/following lists
  const [modal, setModal] = useState(null); // null | "followers" | "following"

  const viewingUserId = userId || currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUser?.uid;

  // Load profile and reviews on mount or userId change
  useEffect(() => {
    if (viewingUserId) loadProfile();
  }, [viewingUserId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const p = isOwnProfile ? userProfile : await getUserProfile(viewingUserId);
      setProfile(p);
      setBio(p?.bio || "");
      setDisplayName(p?.displayName || "");
      setFavoriteGenres((p?.favoriteGenres || []).join(", "));
      setReviews(await getUserReviews(viewingUserId));
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setLoading(false);
    }
  }

  // Save edited profile fields to Firestore
  async function handleSaveProfile() {
    try {
      await updateUserProfile(currentUser.uid, {
        displayName,
        bio,
        favoriteGenres: favoriteGenres.split(",").map(g => g.trim()).filter(Boolean),
      });
      await fetchUserProfile(currentUser.uid);
      setEditing(false);
      toast.success(lang === "ar" ? "تم الحفظ!" : "Profile saved!");
    } catch {
      toast.error("Failed to save profile");
    }
  }

  // Upload profile picture to Firebase Storage
  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    toast.loading("Uploading...", { id: "avatar" });
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateUserProfile(currentUser.uid, { avatarURL: url });
      await fetchUserProfile(currentUser.uid);
      setProfile(p => ({ ...p, avatarURL: url }));
      toast.success("Profile picture updated!", { id: "avatar" });
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Upload failed — check Firebase Storage is enabled", { id: "avatar" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Follow or unfollow the viewed user
  async function handleFollow() {
    if (!currentUser) return toast.error(t("logIn"));
    try {
      const isFollowing = userProfile?.following?.includes(viewingUserId);
      if (isFollowing) {
        await unfollowUser(currentUser.uid, viewingUserId);
      } else {
        await followUser(currentUser.uid, viewingUserId);
      }
      await fetchUserProfile(currentUser.uid);
      setProfile(await getUserProfile(viewingUserId));
    } catch {
      toast.error("Failed");
    }
  }

  // Delete a review from this profile
  async function handleDeleteReview(rid) {
    if (!window.confirm(t("delete") + "?")) return;
    try {
      await deleteReview(rid);
      setReviews(p => p.filter(r => r.id !== rid));
    } catch {
      toast.error("Failed");
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!profile) return <div className="page"><div className="empty-state"><p>User not found</p></div></div>;

  const isFollowing = userProfile?.following?.includes(viewingUserId);
  const followerIds = profile?.followers || [];
  const followingIds = profile?.following || [];

  return (
    <div className="page profile-page">
      {/* Profile header: avatar + info */}
      <div className="profile-header">
        <div
          className="profile-avatar-large"
          onClick={() => isOwnProfile && !uploading && fileInputRef.current?.click()}
          style={{ cursor: isOwnProfile ? "pointer" : "default" }}
          title={isOwnProfile ? (lang === "ar" ? "تغيير الصورة" : "Change photo") : ""}
        >
          {profile?.avatarURL
            ? <img src={profile.avatarURL} alt="" />
            : <span>{(profile?.displayName || "U")[0].toUpperCase()}</span>
          }
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
            // Edit mode form
            <div className="profile-edit-form">
              <input
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={t("displayName")}
              />
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder={t("aboutYourself")}
                rows={3}
              />
              <input
                value={favoriteGenres}
                onChange={e => setFavoriteGenres(e.target.value)}
                placeholder={t("favoriteGenres")}
              />
              <div className="form-actions">
                <button onClick={handleSaveProfile} className="btn-primary">{t("save")}</button>
                <button onClick={() => setEditing(false)} className="btn-ghost">{t("cancel")}</button>
              </div>
            </div>
          ) : (
            // View mode
            <>
              <h1>{profile?.displayName || "User"}</h1>
              <p className="profile-bio">{profile?.bio || t("noBioYet")}</p>
              {profile?.favoriteGenres?.length > 0 && (
                <div className="profile-genres">
                  {profile.favoriteGenres.map(g => <span key={g} className="genre-tag">{g}</span>)}
                </div>
              )}

              {/* Stats row - followers and following are clickable */}
              <div className="profile-stats">
                <span>{reviews.length} {t("reviews")}</span>
                <button
                  className="profile-stat-btn"
                  onClick={() => followerIds.length > 0 && setModal("followers")}
                >
                  {followerIds.length} {t("followers")}
                </button>
                <button
                  className="profile-stat-btn"
                  onClick={() => followingIds.length > 0 && setModal("following")}
                >
                  {followingIds.length} {t("following")}
                </button>
              </div>

              <div className="profile-actions">
                {isOwnProfile ? (
                  <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">
                    ✏️ {t("editProfile")}
                  </button>
                ) : currentUser && (
                  <button
                    onClick={handleFollow}
                    className={isFollowing ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
                  >
                    {isFollowing ? t("unfollow") : t("follow")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Reviews section */}
      <section className="profile-reviews">
        <h2>{isOwnProfile ? t("myReviews") : `${profile?.displayName || "User"}'s ${t("reviews")}`}</h2>
        {reviews.length === 0 ? (
          <p className="empty-text">{t("noReviewsWritten")}</p>
        ) : (
          <div className="reviews-list">
            {reviews.map(review => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <Link to={`/game/${review.gameId}`}><strong>{review.gameTitle}</strong></Link>
                  <span className="review-rating">
                    {"★".repeat(Math.round(review.weightedScore || review.overallRating))}
                    {" "}{review.weightedScore || review.overallRating}/5
                  </span>
                </div>
                {review.reviewType === "detailed" && (
                  <div className="review-categories">
                    {review.gameplayRating && <span>🎮 {review.gameplayRating}★</span>}
                    {review.storyRating && <span>📖 {review.storyRating}★</span>}
                    {review.graphicsRating && <span>🎨 {review.graphicsRating}★</span>}
                    {review.audioRating && <span>🎵 {review.audioRating}★</span>}
                    {review.replayabilityRating && <span>🔄 {review.replayabilityRating}★</span>}
                  </div>
                )}
                {review.textContent && <p className="review-text">{review.textContent}</p>}
                {isOwnProfile && (
                  <button
                    className="btn-ghost btn-sm danger"
                    onClick={() => handleDeleteReview(review.id)}
                  >
                    {t("delete")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Followers/Following modal */}
      {modal && (
        <UserListModal
          title={modal === "followers"
            ? `${t("followers")} (${followerIds.length})`
            : `${t("following")} (${followingIds.length})`
          }
          userIds={modal === "followers" ? followerIds : followingIds}
          onClose={() => setModal(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
