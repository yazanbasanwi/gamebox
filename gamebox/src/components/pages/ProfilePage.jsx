// src/components/pages/ProfilePage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getUserReviews, deleteReview, updateUserProfile,
  getUserProfile, followUser, unfollowUser,
} from "../../services/firestoreService";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../config/firebase";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { userId } = useParams();
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // If viewing own profile or another user's
  const viewingUserId = userId || currentUser?.uid;
  const isOwnProfile = !userId || userId === currentUser?.uid;

  useEffect(() => {
    if (viewingUserId) loadProfile();
  }, [viewingUserId]);

  async function loadProfile() {
    setLoading(true);
    try {
      let profileData;
      if (isOwnProfile) {
        profileData = userProfile;
      } else {
        profileData = await getUserProfile(viewingUserId);
      }
      setProfile(profileData);
      setBio(profileData?.bio || "");
      setDisplayName(profileData?.displayName || "");
      setFavoriteGenres((profileData?.favoriteGenres || []).join(", "));
      const reviewsData = await getUserReviews(viewingUserId);
      setReviews(reviewsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    try {
      await updateUserProfile(currentUser.uid, {
        displayName,
        bio,
        favoriteGenres: favoriteGenres.split(",").map((g) => g.trim()).filter(Boolean),
      });
      await fetchUserProfile(currentUser.uid);
      setEditing(false);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    }
  }

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image");
    if (file.size > 2 * 1024 * 1024) return toast.error("Image must be under 2MB");

    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateUserProfile(currentUser.uid, { avatarURL: url });
      await fetchUserProfile(currentUser.uid);
      setProfile((p) => ({ ...p, avatarURL: url }));
      toast.success("Profile picture updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload picture");
    } finally {
      setUploading(false);
    }
  }

  async function handleFollow() {
    if (!currentUser) return toast.error("Please log in");
    try {
      const isFollowing = userProfile?.following?.includes(viewingUserId);
      if (isFollowing) {
        await unfollowUser(currentUser.uid, viewingUserId);
        toast.success("Unfollowed");
      } else {
        await followUser(currentUser.uid, viewingUserId);
        toast.success("Following!");
      }
      await fetchUserProfile(currentUser.uid);
      const updated = await getUserProfile(viewingUserId);
      setProfile(updated);
    } catch {
      toast.error("Failed");
    }
  }

  async function handleDeleteReview(reviewId) {
    if (!window.confirm("Delete this review?")) return;
    try {
      await deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!profile) return <div className="page"><div className="empty-state"><p>User not found</p></div></div>;

  const isFollowing = userProfile?.following?.includes(viewingUserId);

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <div className="profile-avatar-large" onClick={() => isOwnProfile && fileInputRef.current?.click()} style={{ cursor: isOwnProfile ? "pointer" : "default" }}>
          {profile?.avatarURL ? (
            <img src={profile.avatarURL} alt="avatar" />
          ) : (
            <span>{(profile?.displayName || "U")[0].toUpperCase()}</span>
          )}
          {isOwnProfile && (
            <div className="avatar-overlay">{uploading ? "..." : "📷"}</div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
        </div>

        <div className="profile-info">
          {editing ? (
            <div className="profile-edit-form">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write something about yourself..." rows={3} />
              <input value={favoriteGenres} onChange={(e) => setFavoriteGenres(e.target.value)} placeholder="Favorite genres (comma separated)" />
              <div className="form-actions">
                <button onClick={handleSaveProfile} className="btn-primary">Save</button>
                <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1>{profile?.displayName || "User"}</h1>
              <p className="profile-bio">{profile?.bio || "No bio yet"}</p>
              {profile?.favoriteGenres?.length > 0 && (
                <div className="profile-genres">
                  {profile.favoriteGenres.map((g) => (
                    <span key={g} className="genre-tag">{g}</span>
                  ))}
                </div>
              )}
              <div className="profile-stats">
                <span>{reviews.length} Reviews</span>
                <span>{profile?.followers?.length || 0} Followers</span>
                <span>{profile?.following?.length || 0} Following</span>
              </div>
              <div className="profile-actions">
                {isOwnProfile ? (
                  <button onClick={() => setEditing(true)} className="btn-secondary btn-sm">Edit Profile</button>
                ) : (
                  currentUser && (
                    <button onClick={handleFollow} className={isFollowing ? "btn-secondary btn-sm" : "btn-primary btn-sm"}>
                      {isFollowing ? "Unfollow" : "Follow"}
                    </button>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <section className="profile-reviews">
        <h2>{isOwnProfile ? "My" : `${profile?.displayName}'s`} Reviews</h2>
        {reviews.length === 0 ? (
          <p className="empty-text">No reviews yet.</p>
        ) : (
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <strong>{review.gameTitle}</strong>
                  <span className="review-rating">
                    {"★".repeat(Math.round(review.weightedScore || review.overallRating))} {review.weightedScore || review.overallRating}/5
                  </span>
                </div>
                {review.textContent && <p className="review-text">{review.textContent}</p>}
                {review.reviewType === "detailed" && (
                  <div className="review-categories">
                    {review.gameplayRating && <span>Gameplay: {review.gameplayRating}★</span>}
                    {review.graphicsRating && <span>Graphics: {review.graphicsRating}★</span>}
                    {review.audioRating && <span>Audio: {review.audioRating}★</span>}
                    {review.storyRating && <span>Story: {review.storyRating}★</span>}
                    {review.replayabilityRating && <span>Replay: {review.replayabilityRating}★</span>}
                  </div>
                )}
                {isOwnProfile && (
                  <button className="btn-ghost btn-sm danger" onClick={() => handleDeleteReview(review.id)}>Delete</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
