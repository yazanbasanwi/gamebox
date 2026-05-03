// src/components/pages/HomePage.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

export default function HomePage() {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>{t("welcomeTo")} <span className="accent">GameBox</span></h1>
          <p>{t("homeSubtitle")}</p>
          <div className="hero-actions">
            {currentUser ? (
              <>
                <Link to="/browse" className="btn-primary">{t("browseGames")}</Link>
                <Link to="/feed" className="btn-secondary">{t("viewReviews")}</Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn-primary">{t("getStarted")}</Link>
                <Link to="/browse" className="btn-secondary">{t("browseGames")}</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <span className="feature-icon">⭐</span>
          <h3>{t("flexibleReviews")}</h3>
          <p>{t("flexibleReviewsDesc")}</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">🤖</span>
          <h3>{t("aiRecommendations")}</h3>
          <p>{t("aiRecommendationsDesc")}</p>
        </div>
        <div className="feature-card">
          <span className="feature-icon">📚</span>
          <h3>{t("yourGameLibrary")}</h3>
          <p>{t("yourGameLibraryDesc")}</p>
        </div>
      </section>
    </div>
  );
}
