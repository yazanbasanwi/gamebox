// src/components/pages/ProfilePage.jsx
// React hooks used for state, page loading effects, and the hidden file input reference.
import { useState, useEffect, useRef } from "react";
// Reads the optional userId from the route, used when viewing another user's profile.
import { useParams } from "react-router-dom";
// Provides the logged-in user, their profile, and a function to refresh profile data.
import { useAuth } from "../../context/AuthContext";
// Provides the translation function for multi-language UI text.
import { useLanguage } from "../../context/LanguageContext";
// Firestore functions for profile, review, and follow/unfollow operations.
import { getUserReviews, deleteReview, updateUserProfile, getUserProfile, followUser, unfollowUser } from "../../services/firestoreService";
// Firebase Storage helpers used to upload and retrieve avatar image URLs.
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// Firebase Storage instance from the app configuration.
import { storage } from "../../config/firebase";
// Toast notifications for success and error feedback.
import toast from "react-hot-toast";

export default function ProfilePage() {
  // Get the userId from the URL if the page is opened for another user's profile.
  const { userId } = useParams();
  // Get authentication data and profile refresh function from the auth context.
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  // Get the translation function.
  const { t } = useLanguage();
  // Stores the profile currently displayed on the page.
  const [profile, setProfile] = useState(null);
  // Stores the reviews written by the displayed user.
  const [reviews, setReviews] = useState([]);
  // Controls whether the profile edit form is visible.
  const [editing, setEditing] = useState(false);
  // Editable bio field value.
  const [bio, setBio] = useState("");
  // Editable display name field value.
  const [displayName, setDisplayName] = useState("");
  // Editable favorite genres field value as comma-separated text.
  const [favoriteGenres, setFavoriteGenres] = useState("");
  // Controls the main loading screen while profile data is being fetched.
  const [loading, setLoading] = useState(true);
  // Controls the avatar upload state.
  const [uploading, setUploading] = useState(false);
  // Reference to the hidden file input used for avatar uploads.
  const fileInputRef = useRef(null);
  // Decide which profile to show: route userId or the logged-in user's id.
  const viewingUserId = userId || currentUser?.uid;
  // Checks whether the displayed profile belongs to the logged-in user.
  const isOwnProfile = !userId || userId === currentUser?.uid;

  // Load profile data whenever the viewed user changes.
  useEffect(() => { if (viewingUserId) loadProfile(); }, [viewingUserId]);

  // Fetches the profile and reviews for the displayed user.
  async function loadProfile() {
    setLoading(true);
    try {
      // Use the profile already loaded in context for the current user, otherwise fetch another user's profile.
      const p = isOwnProfile ? userProfile : await getUserProfile(viewingUserId);
      // Fill the displayed profile and edit form fields with current profile data.
      setProfile(p); setBio(p?.bio || ""); setDisplayName(p?.displayName || ""); setFavoriteGenres((p?.favoriteGenres || []).join(", "));
      // Load reviews written by the displayed user.
      setReviews(await getUserReviews(viewingUserId));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Saves profile edits such as display name, bio, and favorite genres.
  async function handleSaveProfile() {
    try {
      // Convert the comma-separated genres text into an array before saving.
      await updateUserProfile(currentUser.uid, { displayName, bio, favoriteGenres: favoriteGenres.split(",").map((g) => g.trim()).filter(Boolean) });
      // Refresh the logged-in user's profile, close edit mode, and show success feedback.
      await fetchUserProfile(currentUser.uid); setEditing(false); toast.success(t("save") + "!");
    } catch { toast.error("Failed"); }
  }

  // Handles avatar image selection, validation, upload, and profile update.
  async function handleAvatarUpload(e) {
    // Get the selected file from the hidden file input.
    const file = e.target.files?.[0];
    if (!file) return;
    // Only allow image files.
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    // Limit avatar uploads to 5MB.
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }

    setUploading(true);
    toast.loading("Uploading...", { id: "avatar-upload" });
    try {
      // Create a unique Firebase Storage path for the uploaded avatar.
      const storageRef = ref(storage, `avatars/${currentUser.uid}_${Date.now()}`);
      // Upload the selected image file.
      const snapshot = await uploadBytes(storageRef, file);
      console.log("Upload complete:", snapshot);
      // Get the public download URL for the uploaded avatar.
      const url = await getDownloadURL(storageRef);
      console.log("Download URL:", url);
      // Save the new avatar URL in the user's profile.
      await updateUserProfile(currentUser.uid, { avatarURL: url });
      // Refresh profile context and update the local page state.
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

  // Follows or unfollows the displayed user depending on current follow state.
  async function handleFollow() {
    if (!currentUser) return toast.error(t("logIn"));
    try {
      // Check whether the current user already follows the displayed profile.
      const isFollowing = userProfile?.following?.includes(viewingUserId);
      // Toggle follow state in Firestore.
      if (isFollowing) { await unfollowUser(currentUser.uid, viewingUserId); } else { await followUser(currentUser.uid, viewingUserId); }
      // Refresh both the current user's profile and the displayed profile.
      await fetchUserProfile(currentUser.uid);
      setProfile(await getUserProfile(viewingUserId));
    } catch { toast.error("Failed"); }
  }

  // Deletes one of the user's reviews after confirmation.
  async function handleDeleteReview(rid) {
    if (!window.confirm(t("delete") + "?")) return;
    try { await deleteReview(rid); setReviews((p) => p.filter((r) => r.id !== rid)); } catch { toast.error("Failed"); }
  }

  // Show a loading screen while profile data is being loaded.
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  // Show an empty state if the requested profile cannot be found.
  if (!profile) return <div className="page"><div className="empty-state"><p>User not found</p></div></div>;
  // Used to decide whether the follow button should say Follow or Unfollow.
  const isFollowing = userProfile?.following?.includes(viewingUserId);

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <div
          className="profile-avatar-large"
          // Clicking the avatar opens the file picker only on the user's own profile.
          onClick={() => { if (isOwnProfile && !uploading) fileInputRef.current?.click(); }}
          style={{ cursor: isOwnProfile ? "pointer" : "default" }}
        >
          {/* Show the uploaded avatar if available, otherwise show the first letter of the display name. */}
          {profile?.avatarURL ? <img src={profile.avatarURL} alt="" /> : <span>{(profile?.displayName || "U")[0].toUpperCase()}</span>}
          {/* Show the camera/upload overlay only for the profile owner. */}
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
            // Profile edit form shown only when editing is enabled.
            <div className="profile-edit-form">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("displayName")} />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("aboutYourself")} rows={3} />
              <input value={favoriteGenres} onChange={(e) => setFavoriteGenres(e.target.value)} placeholder={t("favoriteGenres")} />
              <div className="form-actions"><button onClick={handleSaveProfile} className="btn-primary">{t("save")}</button><button onClick={() => setEditing(false)} className="btn-ghost">{t("cancel")}</button></div>
            </div>
          ) : (
            // Normal profile display mode.
            <>
              <h1>{profile?.displayName || "User"}</h1>
              <p className="profile-bio">{profile?.bio || t("noBioYet")}</p>
              {/* Display favorite genre tags if the profile has any. */}
              {profile?.favoriteGenres?.length > 0 && <div className="profile-genres">{profile.favoriteGenres.map((g) => <span key={g} className="genre-tag">{g}</span>)}</div>}
              <div className="profile-stats">
                <span>{reviews.length} {t("reviews")}</span>
                <span>{profile?.followers?.length || 0} {t("followers")}</span>
                <span>{profile?.following?.length || 0} {t("following")}</span>
              </div>
              <div className="profile-actions">
                {/* Show Edit Profile for own profile, otherwise show Follow/Unfollow if logged in. */}
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
        {/* Show empty text when the user has not written any reviews yet. */}
        {reviews.length === 0 ? <p className="empty-text">{t("noReviewsWritten")}</p> :
          <div className="reviews-list">{reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header"><strong>{review.gameTitle}</strong><span className="review-rating">{"★".repeat(Math.round(review.weightedScore||review.overallRating))} {review.weightedScore||review.overallRating}/5</span></div>
              {review.textContent && <p className="review-text">{review.textContent}</p>}
              {/* Allow review deletion only on the user's own profile. */}
              {isOwnProfile && <button className="btn-ghost btn-sm danger" onClick={() => handleDeleteReview(review.id)}>{t("delete")}</button>}
            </div>
          ))}</div>
        }
      </section>
    </div>
  );
}
