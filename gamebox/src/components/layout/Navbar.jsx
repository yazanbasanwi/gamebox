// src/components/layout/Navbar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { HiOutlineSearch } from "react-icons/hi";
import { useState } from "react";
import toast from "react-hot-toast";

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  async function handleLogout() {
    try { await logout(); toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Logged out"); navigate("/"); }
    catch { toast.error(lang === "ar" ? "فشل تسجيل الخروج" : "Logout failed"); }
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
            <img src="/logo.png" alt="GameBox" className="logo-icon-img" />
          <span className="logo-text">GAME<span className="logo-accent">BOX</span></span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end>{t("home")}</NavLink>
          <NavLink to="/browse">{t("games")}</NavLink>
          <NavLink to="/feed">{t("reviews")}</NavLink>
          <NavLink to="/community">{t("community")}</NavLink>
          {currentUser && (
            <>
              <NavLink to="/library">{t("library")}</NavLink>
              <NavLink to="/lists">{t("lists")}</NavLink>
              <NavLink to="/journal">{t("journal")}</NavLink>
            </>
          )}
          {userProfile?.role === "admin" && <NavLink to="/admin">{t("admin")}</NavLink>}
        </div>

        <div className="nav-right">
          <form onSubmit={handleSearch} className="nav-search-form">
            <HiOutlineSearch className="search-icon" />
            <input type="text" placeholder={t("searchGames")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="nav-search-input" />
          </form>

          {/* Language Toggle */}
          <button className="lang-toggle" onClick={toggleLanguage} title={lang === "en" ? "التبديل إلى العربية" : "Switch to English"}>
            {lang === "en" ? "عربي" : "EN"}
          </button>

          {currentUser ? (
            <div className="nav-user" onClick={() => setMenuOpen(!menuOpen)}>
              <div className="nav-avatar">
                {userProfile?.avatarURL ? <img src={userProfile.avatarURL} alt="avatar" /> : <span>{(userProfile?.displayName || currentUser.email)?.[0]?.toUpperCase()}</span>}
              </div>
              {menuOpen && (
                <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div className="dropdown-header">
                    <strong>{userProfile?.displayName || "User"}</strong>
                    <small>{currentUser.email}</small>
                  </div>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>{t("profile")}</Link>
                  <Link to="/library" onClick={() => setMenuOpen(false)}>{t("myLibrary")}</Link>
                  <Link to="/lists" onClick={() => setMenuOpen(false)}>{t("myLists")}</Link>
                  <Link to="/journal" onClick={() => setMenuOpen(false)}>{t("journal")}</Link>
                  <button onClick={handleLogout}>{t("logOut")}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth-buttons">
              <Link to="/login" className="btn-ghost">{t("logIn")}</Link>
              <Link to="/register" className="btn-primary btn-sm">{t("signUp")}</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
