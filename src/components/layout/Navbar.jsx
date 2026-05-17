// src/components/layout/Navbar.jsx
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Search, Gamepad2, Settings, BookOpen, Library, List, Users, Star, SplitSquareHorizontal, Home } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { searchGames, getImageURL } from "../../services/igdbService";
import toast from "react-hot-toast";

export default function Navbar() {
  const { currentUser, userProfile, logout } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchInput(e) {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimerRef.current);
    if (val.trim().length < 2) {
      setShowDropdown(false);
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchGames(val.trim(), 6);
        setSearchResults(results || []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
  }

  function handleSearch(e) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setShowDropdown(false);
      setSearchResults([]);
    }
  }

  function handleResultClick(gameId) {
    navigate(`/game/${gameId}`);
    setSearchQuery("");
    setShowDropdown(false);
    setSearchResults([]);
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
        <Link to="/" className="nav-logo">
          <div className="logo-icon-box">
            <Gamepad2 size={18} color="white" />
          </div>
          <span className="logo-text">GAME<span className="logo-accent">BOX</span></span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end>{t("home")}</NavLink>
          <NavLink to="/browse">{t("games")}</NavLink>
          <NavLink to="/feed">{t("reviews")}</NavLink>
          <NavLink to="/compare">{lang === "ar" ? "مقارنة" : "Compare"}</NavLink>
          <NavLink to="/community">{t("community")}</NavLink>
          {currentUser && (
            <>
              <NavLink to="/library" className="nav-link-secondary">{t("library")}</NavLink>
              <NavLink to="/lists" className="nav-link-secondary">{t("lists")}</NavLink>
              <NavLink to="/journal" className="nav-link-secondary">{t("journal")}</NavLink>
            </>
          )}
          {userProfile?.role === "admin" && <NavLink to="/admin">{t("admin")}</NavLink>}
        </div>

        <div className="nav-right">
          {/* Search with live dropdown */}
          <div className="nav-search-wrapper" ref={searchRef}>
            <form onSubmit={handleSearch} className="nav-search-form">
              <Search size={15} className="search-icon" />
              <input
                type="text"
                placeholder={lang === "ar" ? "ابحث عن لعبة..." : "Search games..."}
                value={searchQuery}
                onChange={handleSearchInput}
                onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                className="nav-search-input"
                autoComplete="off"
              />
            </form>

            {showDropdown && (
              <div className="search-dropdown">
                {searchLoading ? (
                  <div className="search-dropdown-status">
                    <div className="spinner-sm" />
                    {lang === "ar" ? "جارٍ البحث..." : "Searching..."}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="search-dropdown-status">
                    {lang === "ar" ? "لا نتائج" : "No results found"}
                  </div>
                ) : (
                  <>
                    {searchResults.map(game => (
                      <button
                        key={game.id}
                        className="search-dropdown-item"
                        onClick={() => handleResultClick(game.id)}
                      >
                        <img
                          src={getImageURL(game.cover?.image_id, "cover_small")}
                          alt={game.name}
                          className="search-dropdown-cover"
                          onError={e => { e.target.src = "/placeholder-game.png"; }}
                        />
                        <div className="search-dropdown-info">
                          <span className="search-dropdown-name">{game.name}</span>
                          {game.first_release_date && (
                            <span className="search-dropdown-year">
                              {new Date(game.first_release_date * 1000).getFullYear()}
                            </span>
                          )}
                        </div>
                        {game.total_rating && (
                          <span className="search-dropdown-rating">
                            ★ {Math.round(game.total_rating)}
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      className="search-dropdown-see-all"
                      onClick={handleSearch.bind(null, { preventDefault: () => {} })}
                    >
                      {lang === "ar" ? `عرض كل النتائج لـ "${searchQuery}"` : `See all results for "${searchQuery}"`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <button className="lang-toggle" onClick={toggleLanguage}>
            {lang === "en" ? "عربي" : "EN"}
          </button>

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
                  <a href="mailto:support@gamebox.app" className="dropdown-support-link">
                    📧 {lang === "ar" ? "تواصل مع الدعم" : "Contact Support"}
                  </a>
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
