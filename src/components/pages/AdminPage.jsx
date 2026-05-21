
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  getAllUsers,
  getLatestReviews,
  getReports,
  deleteReview,
  banUser,
  unbanUser,
  resolveReport,
} from "../../services/firestoreService";
import toast from "react-hot-toast";

export default function AdminPage() {
  // Get translation function from language context
  const { t } = useLanguage();

  // Track which tab is currently active: overview | users | reviews | reports
  const [activeTab, setActiveTab] = useState("overview");

  // State arrays to hold fetched data from Firestore
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reports, setReports] = useState([]);

  // Controls the loading spinner while data is being fetched
  const [loading, setLoading] = useState(true);

  // Load admin data as soon as the component mounts
  useEffect(() => { loadAdminData(); }, []);

  // Fetches all users, latest 50 reviews, and all reports simultaneously using Promise.all
  // Promise.all runs all three Firestore calls in parallel — faster than running them one by one
  async function loadAdminData() {
    try {
      const [u, r, rp] = await Promise.all([
        getAllUsers(),
        getLatestReviews(50),
        getReports(),
      ]);
      // Update state with the fetched data
      setUsers(u);
      setReviews(r);
      setReports(rp);
    } catch (err) {
      // If any Firestore call fails, log the error and show a toast notification
      console.error(err);
      toast.error("Failed");
    } finally {
      // Always stop the loading spinner whether the fetch succeeded or failed
      setLoading(false);
    }
  }

  // Toggles a user's ban status — if banned, unban them; if not banned, ban them
  // Updates Firestore first, then updates local state so the UI reflects the change instantly
  async function handleBanUser(userId, isBanned) {
    try {
      // Call the appropriate Firestore function based on current ban status
      if (isBanned) {
        await unbanUser(userId); // sets role back to "user"
      } else {
        await banUser(userId); // sets role to "banned"
      }
      // Update the user's role in local state without re-fetching all users
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: isBanned ? "user" : "banned" } : u
        )
      );
    } catch {
      toast.error("Failed");
    }
  }

  // Deletes a review after admin confirmation
  // window.confirm shows a browser dialog — if admin clicks Cancel, the function stops
  async function handleDeleteReview(rid) {
    if (!window.confirm(t("delete") + "?")) return;
    try {
      await deleteReview(rid); // delete from Firestore
      // Remove from local state so it disappears from the table immediately
      setReviews((prev) => prev.filter((r) => r.id !== rid));
    } catch {
      toast.error("Failed");
    }
  }

  // Updates a report's status to either "resolved" or "dismissed"
  // action parameter comes from the Resolve or Dismiss button clicked by the admin
  async function handleResolveReport(rid, action) {
    try {
      await resolveReport(rid, action); // update status in Firestore
      // Update the report's status in local state so the badge changes instantly
      setReports((prev) =>
        prev.map((r) => (r.id === rid ? { ...r, status: action } : r))
      );
    } catch {
      toast.error("Failed");
    }
  }

  // Show spinner while data is loading
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  // Count only pending reports for the stats card
  const pendingReports = reports.filter((r) => r.status === "pending");

  return (
    <div className="page admin-page">
      <h1>{t("adminDashboard")}</h1>

      {/* Stats row — shows key platform metrics at a glance */}
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-number">{users.length}</div>
          <div className="stat-label">{t("totalUsers")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{reviews.length}</div>
          <div className="stat-label">{t("totalReviews")}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{pendingReports.length}</div>
          <div className="stat-label">{t("pendingReports")}</div>
        </div>
        <div className="stat-card">
          {/* Filter users array to count only those with role "banned" */}
          <div className="stat-number">{users.filter((u) => u.role === "banned").length}</div>
          <div className="stat-label">{t("bannedUsers")}</div>
        </div>
      </div>

      {/* Tab navigation — clicking a tab updates activeTab state which controls what renders below */}
      <div className="admin-tabs">
        {["overview", "users", "reviews", "reports"].map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {/* Users Tab — shows all registered users with ban/unban controls */}
      {activeTab === "users" && (
        <div className="admin-section">
          <h2>{t("userManagement")}</h2>
          <div className="admin-table">
            {/* Table header row */}
            <div className="table-header">
              <span>{t("username")}</span>
              <span>{t("email")}</span>
              <span>{t("role")}</span>
              <span>{t("actions")}</span>
            </div>
            {/* Map through all users and render one row per user */}
            {users.map((user) => (
              <div key={user.id} className="table-row">
                {/* Username links to that user's profile page */}
                <span>
                  <Link to={`/user/${user.id}`} style={{ color: "var(--accent-secondary)" }}>
                    {user.displayName || user.username || "User"}
                  </Link>
                </span>
                <span>{user.email}</span>
                {/* Role badge — CSS class changes color based on role (admin/user/banned) */}
                <span className={`role-badge ${user.role}`}>{user.role}</span>
                <span>
                  {/* Admins cannot be banned — hide the button for admin accounts */}
                  {user.role !== "admin" && (
                    <button
                      className={`btn-sm ${user.role === "banned" ? "btn-primary" : "btn-danger"}`}
                      onClick={() => handleBanUser(user.id, user.role === "banned")}
                    >
                      {user.role === "banned" ? t("unban") : t("ban")}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews Tab — shows all reviews with delete option for moderation */}
      {activeTab === "reviews" && (
        <div className="admin-section">
          <h2>{t("reviewManagement")}</h2>
          <div className="admin-table">
            <div className="table-header">
              <span>{t("username")}</span>
              <span>{t("games")}</span>
              <span>Rating</span>
              <span>{t("actions")}</span>
            </div>
            {reviews.map((r) => (
              <div key={r.id} className="table-row">
                {/* Both username and game title are clickable links */}
                <span>
                  <Link to={`/user/${r.userId}`} style={{ color: "var(--accent-secondary)" }}>
                    {r.username}
                  </Link>
                </span>
                <span>
                  <Link to={`/game/${r.gameId}`} style={{ color: "var(--accent-secondary)" }}>
                    {r.gameTitle}
                  </Link>
                </span>
                {/* Show weightedScore for detailed reviews, overallRating for simple reviews */}
                <span>{r.weightedScore || r.overallRating}/5</span>
                <span>
                  <button
                    className="btn-sm btn-danger"
                    onClick={() => handleDeleteReview(r.id)}
                  >
                    {t("delete")}
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reports Tab — shows user-submitted flags waiting for admin action */}
      {activeTab === "reports" && (
        <div className="admin-section">
          <h2>{t("reports")}</h2>
          {reports.length === 0 ? (
            <p className="empty-text">No reports</p>
          ) : (
            <div className="admin-table">
              <div className="table-header">
                <span>{t("type")}</span>
                <span>{t("reason")}</span>
                <span>{t("status")}</span>
                <span>{t("actions")}</span>
              </div>
              {reports.map((r) => (
                <div key={r.id} className="table-row">
                  <span>{r.reportedItemType}</span>
                  <span>{r.reason}</span>
                  {/* Status badge changes color: pending=yellow, resolved=green, dismissed=grey */}
                  <span className={`status-badge ${r.status}`}>{r.status}</span>
                  <span>
                    {/* Only show action buttons for pending reports — resolved/dismissed ones are done */}
                    {r.status === "pending" && (
                      <>
                        <button
                          className="btn-sm btn-primary"
                          onClick={() => handleResolveReport(r.id, "resolved")}
                        >
                          {t("resolve")}
                        </button>{" "}
                        <button
                          className="btn-sm btn-ghost"
                          onClick={() => handleResolveReport(r.id, "dismissed")}
                        >
                          {t("dismiss")}
                        </button>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overview Tab — shows the 10 most recent review activities as an activity feed */}
      {activeTab === "overview" && (
        <div className="admin-section">
          <h2>{t("recentActivity")}</h2>
          <div className="activity-feed">
            {reviews.slice(0, 10).map((r) => (
              <div key={r.id} className="activity-item">
                {/* Each activity item links to both the user profile and the game page */}
                <Link to={`/user/${r.userId}`} style={{ color: "var(--accent-secondary)" }}>
                  <strong>{r.username}</strong>
                </Link>{" "}
                {t("reviewed")}{" "}
                <Link to={`/game/${r.gameId}`} style={{ color: "var(--accent-secondary)" }}>
                  <strong>{r.gameTitle}</strong>
                </Link>{" "}
                — {r.weightedScore || r.overallRating}/5
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}