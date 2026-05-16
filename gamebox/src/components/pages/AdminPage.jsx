// src/components/pages/AdminPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { getAllUsers, getLatestReviews, getReports, deleteReview, banUser, unbanUser, resolveReport } from "../../services/firestoreService";
import toast from "react-hot-toast";

export default function AdminPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  const [users, setUsers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAdminData(); }, []);

  async function loadAdminData() {
    try { const [u, r, rp] = await Promise.all([getAllUsers(), getLatestReviews(50), getReports()]); setUsers(u); setReviews(r); setReports(rp); }
    catch (err) { console.error(err); toast.error("Failed"); }
    finally { setLoading(false); }
  }

  async function handleBanUser(userId, isBanned) {
    try {
      if (isBanned) { await unbanUser(userId); } else { await banUser(userId); }
      setUsers((p) => p.map((u) => u.id === userId ? { ...u, role: isBanned ? "user" : "banned" } : u));
    } catch { toast.error("Failed"); }
  }

  async function handleDeleteReview(rid) {
    if (!window.confirm(t("delete") + "?")) return;
    try { await deleteReview(rid); setReviews((p) => p.filter((r) => r.id !== rid)); } catch { toast.error("Failed"); }
  }

  async function handleResolveReport(rid, action) {
    try { await resolveReport(rid, action); setReports((p) => p.map((r) => r.id === rid ? { ...r, status: action } : r)); } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  const pendingReports = reports.filter((r) => r.status === "pending");

  return (
    <div className="page admin-page">
      <h1>{t("adminDashboard")}</h1>
      <div className="admin-stats">
        <div className="admin-stat-card"><div className="stat-number">{users.length}</div><div className="stat-label">{t("totalUsers")}</div></div>
        <div className="admin-stat-card"><div className="stat-number">{reviews.length}</div><div className="stat-label">{t("totalReviews")}</div></div>
        <div className="admin-stat-card"><div className="stat-number">{pendingReports.length}</div><div className="stat-label">{t("pendingReports")}</div></div>
        <div className="admin-stat-card"><div className="stat-number">{users.filter((u) => u.role === "banned").length}</div><div className="stat-label">{t("bannedUsers")}</div></div>
      </div>
      <div className="admin-tabs">
        {["overview", "users", "reviews", "reports"].map((tab) => (
          <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>{t(tab)}</button>
        ))}
      </div>

      {activeTab === "users" && (
        <div className="admin-section"><h2>{t("userManagement")}</h2>
          <div className="admin-table">
            <div className="table-header"><span>{t("username")}</span><span>{t("email")}</span><span>{t("role")}</span><span>{t("actions")}</span></div>
            {users.map((user) => (
              <div key={user.id} className="table-row">
                <span><Link to={`/user/${user.id}`} style={{ color: "var(--accent-secondary)" }}>{user.displayName||user.username||"User"}</Link></span>
                <span>{user.email}</span>
                <span className={`role-badge ${user.role}`}>{user.role}</span>
                <span>{user.role !== "admin" && <button className={`btn-sm ${user.role === "banned" ? "btn-primary" : "btn-danger"}`} onClick={() => handleBanUser(user.id, user.role === "banned")}>{user.role === "banned" ? t("unban") : t("ban")}</button>}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="admin-section"><h2>{t("reviewManagement")}</h2>
          <div className="admin-table">
            <div className="table-header"><span>{t("username")}</span><span>{t("games")}</span><span>Rating</span><span>{t("actions")}</span></div>
            {reviews.map((r) => (
              <div key={r.id} className="table-row">
                <span><Link to={`/user/${r.userId}`} style={{ color: "var(--accent-secondary)" }}>{r.username}</Link></span>
                <span><Link to={`/game/${r.gameId}`} style={{ color: "var(--accent-secondary)" }}>{r.gameTitle}</Link></span>
                <span>{r.weightedScore||r.overallRating}/5</span>
                <span><button className="btn-sm btn-danger" onClick={() => handleDeleteReview(r.id)}>{t("delete")}</button></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="admin-section"><h2>{t("reports")}</h2>
          {reports.length === 0 ? <p className="empty-text">No reports</p> :
            <div className="admin-table">
              <div className="table-header"><span>{t("type")}</span><span>{t("reason")}</span><span>{t("status")}</span><span>{t("actions")}</span></div>
              {reports.map((r) => (
                <div key={r.id} className="table-row">
                  <span>{r.reportedItemType}</span><span>{r.reason}</span><span className={`status-badge ${r.status}`}>{r.status}</span>
                  <span>{r.status === "pending" && <><button className="btn-sm btn-primary" onClick={() => handleResolveReport(r.id, "resolved")}>{t("resolve")}</button> <button className="btn-sm btn-ghost" onClick={() => handleResolveReport(r.id, "dismissed")}>{t("dismiss")}</button></>}</span>
                </div>
              ))}
            </div>
          }
        </div>
      )}

      {activeTab === "overview" && (
        <div className="admin-section"><h2>{t("recentActivity")}</h2>
          <div className="activity-feed">{reviews.slice(0,10).map((r) => (
            <div key={r.id} className="activity-item">
              <Link to={`/user/${r.userId}`} style={{ color: "var(--accent-secondary)" }}><strong>{r.username}</strong></Link> {t("reviewed")} <Link to={`/game/${r.gameId}`} style={{ color: "var(--accent-secondary)" }}><strong>{r.gameTitle}</strong></Link> — {r.weightedScore||r.overallRating}/5
            </div>
          ))}</div>
        </div>
      )}
    </div>
  );
}
