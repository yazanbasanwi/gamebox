// src/components/pages/CommunityPage.jsx
// Browse all users, follow/unfollow, view their profiles and follower details
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getAllUsers, followUser, unfollowUser } from "../../services/firestoreService";
import toast from "react-hot-toast";

export default function CommunityPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // all | following | followers

  // Load all non-banned users on mount
  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const all = await getAllUsers();
      setUsers(all.filter(u => u.id !== currentUser?.uid && u.role !== "banned"));
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  }

  // Toggle follow/unfollow for a user
  async function handleFollow(targetId) {
    if (!currentUser) return toast.error(t("logIn"));
    try {
      if (userProfile?.following?.includes(targetId)) {
        await unfollowUser(currentUser.uid, targetId);
      } else {
        await followUser(currentUser.uid, targetId);
      }
      await fetchUserProfile(currentUser.uid);
      loadUsers();
    } catch {
      toast.error("Failed");
    }
  }

  // Filter users by search query and active tab
  const filtered = users.filter(u => {
    const nameMatch = (u.displayName || u.username || u.email || "")
      .toLowerCase().includes(searchQuery.toLowerCase());
    if (!nameMatch) return false;
    if (activeTab === "following") return userProfile?.following?.includes(u.id);
    if (activeTab === "followers") return userProfile?.followers?.includes(u.id);
    return true;
  });

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page community-page">
      <h1>{t("communityTitle")}</h1>
      <p className="page-subtitle">{t("discoverGamers")}</p>

      {/* Filter tabs - All / Following / Followers */}
      {currentUser && (
        <div className="browse-tabs" style={{ marginBottom: "1rem" }}>
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            {lang === "ar" ? "الجميع" : "All"} ({users.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "following" ? "active" : ""}`}
            onClick={() => setActiveTab("following")}
          >
            {t("following")} ({userProfile?.following?.length || 0})
          </button>
          <button
            className={`tab-btn ${activeTab === "followers" ? "active" : ""}`}
            onClick={() => setActiveTab("followers")}
          >
            {t("followers")} ({userProfile?.followers?.length || 0})
          </button>
        </div>
      )}

      {/* Search box */}
      <div className="browse-search" style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder={t("searchUsers")}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Users grid */}
      {filtered.length === 0 ? (
        <div className="empty-state"><p>{t("noUsersFound")}</p></div>
      ) : (
        <div className="community-grid">
          {filtered.map(user => {
            const isFollowing = userProfile?.following?.includes(user.id);
            const mutualFollow = userProfile?.following?.includes(user.id) && user.following?.includes(currentUser?.uid);
            return (
              <div key={user.id} className="community-card">
                {/* Avatar */}
                <Link to={`/user/${user.id}`} className="community-avatar-link">
                  <div className="community-avatar">
                    {user.avatarURL
                      ? <img src={user.avatarURL} alt="" />
                      : <span>{(user.displayName || user.email || "U")[0].toUpperCase()}</span>
                    }
                  </div>
                </Link>

                {/* User info */}
                <div className="community-info">
                  <Link to={`/user/${user.id}`}>
                    <strong>{user.displayName || user.username || "User"}</strong>
                    {mutualFollow && (
                      <span className="mutual-badge">{lang === "ar" ? "متبادل" : "Mutual"}</span>
                    )}
                  </Link>
                  <div className="community-stats-row">
                    <span>{user.followers?.length || 0} {t("followers")}</span>
                    <span>·</span>
                    <span>{user.following?.length || 0} {t("following")}</span>
                  </div>
                  {user.bio && (
                    <p className="community-bio">
                      {user.bio.slice(0, 80)}{user.bio.length > 80 ? "..." : ""}
                    </p>
                  )}
                  {user.favoriteGenres?.length > 0 && (
                    <div className="community-genres">
                      {user.favoriteGenres.slice(0, 3).map(g => (
                        <span key={g} className="genre-tag" style={{ fontSize: "0.7rem" }}>{g}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Follow button */}
                {currentUser && (
                  <button
                    onClick={() => handleFollow(user.id)}
                    className={isFollowing ? "btn-secondary btn-sm" : "btn-primary btn-sm"}
                  >
                    {isFollowing ? t("unfollow") : t("follow")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
