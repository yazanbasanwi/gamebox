// src/components/pages/CommunityPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getAllUsers, followUser, unfollowUser } from "../../services/firestoreService";
import { Search } from "lucide-react";
import toast from "react-hot-toast";

export default function CommunityPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try { setUsers((await getAllUsers()).filter((u) => u.id !== currentUser?.uid && u.role !== "banned")); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleFollow(targetId) {
    if (!currentUser) return toast.error(t("logIn"));
    try {
      if (userProfile?.following?.includes(targetId)) { await unfollowUser(currentUser.uid, targetId); }
      else { await followUser(currentUser.uid, targetId); }
      await fetchUserProfile(currentUser.uid); loadUsers();
    } catch { toast.error("Failed"); }
  }

  const filtered = users.filter((u) =>
    (u.displayName || u.username || u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page community-page">
      <h1>{t("communityTitle")}</h1>
      <p className="page-subtitle">{t("discoverGamers")}</p>

      <div className="community-search-pill">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder={t("searchUsers")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="community-search-clear" onClick={() => setSearchQuery("")}>×</button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>{t("noUsersFound")}</p></div>
      ) : (
        <div className="community-grid">
          {filtered.map((user) => {
            const isFollowing = userProfile?.following?.includes(user.id);
            return (
              <div key={user.id} className="community-card">
                <div className="community-avatar">
                  {user.avatarURL
                    ? <img src={user.avatarURL} alt="" />
                    : <span>{(user.displayName || user.email || "U")[0].toUpperCase()}</span>
                  }
                </div>
                <div className="community-info">
                  <Link to={`/user/${user.id}`}><strong>{user.displayName || user.username || "User"}</strong></Link>
                  <span className="community-stats">{user.followers?.length || 0} {t("followers")}</span>
                  {user.bio && <p className="community-bio">{user.bio.slice(0, 80)}{user.bio.length > 80 ? "..." : ""}</p>}
                </div>
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
