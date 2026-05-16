// src/components/layout/Navbar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Search, Gamepad2, Settings, BookOpen, Library, List, Users, Star, SplitSquareHorizontal, Home } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  async function handleLogout() {
    try {
      await logout();
      toast.success(lang === "ar" ? "تم تسجيل الخروج" : "Logged out");
      navigate("/");
      setMenuOpen(false);
    } catch {
      toast.error(lang === "ar" ? "فشل تسجيل الخروج" : "Logout failed");
    }
  }

  const initials = (userProfile?.displayName || currentUser?.email || "?")[0].toUpperCase();

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="nav-logo">
          <div className="logo-icon-box">
            <Gamepad2 size={18} color="white" />
          </div>
          <span className="logo-text">GAME<span className="logo-accent">BOX</span></span>
        </Link>

        {/* Nav links */}
        <div className="nav-links">
          <NavLink to="/" end>{t("home")}</NavLink>
          <NavLink to="/browse">{t("games")}</NavLink>
          <NavLink to="/feed">{t("reviews")}</NavLink>
          <NavLink to="/compare">{lang === "ar" ? "مقارنة" : "Compare"}</NavLink>
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
          {/* Search */}
          <form onSubmit={handleSearch} className="nav-search-form">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder={lang === "ar" ? "ابحث عن ألعاب، مستخدمين..." : "Search games, users..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="nav-search-input"
            />
          </form>

          {/* Language toggle */}
          <button className="lang-toggle" onClick={toggleLanguage}>
            {lang === "en" ? "عربي" : "EN"}
          </button>

          {/* User menu or auth buttons */}
          {currentUser ? (
            <div className="nav-user" ref={menuRef}>
              <button className="nav-avatar-btn" onClick={() => setMenuOpen(!menuOpen)}>
                <div className="nav-avatar">
                  {userProfile?.avatarURL
                    ? <img src={userProfile.avatarURL} alt="avatar" />
                    : initials
                  }
                </div>
                <span className="nav-username">{userProfile?.displayName || "Me"}</span>
                <span className="nav-chevron">{menuOpen ? "▲" : "▼"}</span>
              </button>

              {menuOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <strong>{userProfile?.displayName || "User"}</strong>
                    <small>{currentUser.email}</small>
                  </div>
                  <Link to="/profile" onClick={() => setMenuOpen(false)}>
                    <Users size={14} /> {t("profile")}
                  </Link>
                  <Link to="/library" onClick={() => setMenuOpen(false)}>
                    <Library size={14} /> {t("myLibrary")}
                  </Link>
                  <Link to="/lists" onClick={() => setMenuOpen(false)}>
                    <List size={14} /> {t("myLists")}
                  </Link>
                  <Link to="/journal" onClick={() => setMenuOpen(false)}>
                    <BookOpen size={14} /> {t("journal")}
                  </Link>
                  <div className="dropdown-divider" />
                  <Link to="/settings" onClick={() => setMenuOpen(false)}>
                    <Settings size={14} /> {lang === "ar" ? "الإعدادات" : "Settings"}
                  </Link>
                  <button onClick={handleLogout} className="dropdown-logout">
                    {lang === "ar" ? "🚪 تسجيل الخروج" : "🚪 Log Out"}
                  </button>
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
