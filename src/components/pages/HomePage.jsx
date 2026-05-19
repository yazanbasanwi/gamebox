// src/components/pages/HomePage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Sparkles, Star, Library, ArrowRight } from "lucide-react";
import { getPopularGames, getCoverURL } from "../../services/igdbService";

export default function HomePage() {
  const { currentUser } = useAuth();
  const { t, lang } = useLanguage();
  const [featureGames, setFeatureGames] = useState([]);

  useEffect(() => {
    getPopularGames(6).then(games => {
      if (games?.length) setFeatureGames(games);
    }).catch(() => {});
  }, []);

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-line" />
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>{lang === "ar" ? "المعيار الجديد لتتبع الألعاب" : "The new standard for game tracking"}</span>
          </div>
          <h1>
            {lang === "ar" ? (
              <>سجّل. قيّم.<br /><span className="gradient-text">اكتشف ما هو قادم.</span></>
            ) : (
              <>Rate. Review.<br /><span className="gradient-text">Discover more.</span></>
            )}
          </h1>
          <p className="hero-sub">
            {lang === "ar"
              ? "GameBox هو المنصة المثالية للاعبين المتحمسين لتتبع مكتبتهم وكتابة مراجعات معمّقة واكتشاف العناوين الرائعة."
              : "GameBox is the premier platform for passionate gamers to track their library, write in-depth reviews, and discover masterpiece titles through a curated community."
            }
          </p>
          <div className="hero-actions">
            {currentUser ? (
              <>
                <Link to="/browse" className="btn-primary btn-lg">
                  {t("browseGames")} <ArrowRight size={18} />
                </Link>
                <Link to="/feed" className="btn-secondary btn-lg">{t("viewReviews")}</Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn-primary btn-lg">
                  {lang === "ar" ? "ابدأ مجاناً" : "Get Started for Free"} <ArrowRight size={18} />
                </Link>
                <Link to="/browse" className="btn-secondary btn-lg">{t("browseGames")}</Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div>
          <div className="features-grid">
            {/* Feature 1 — Flexible Reviews */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Star size={22} color="var(--accent-light)" />
              </div>
              <h3>{t("flexibleReviews")}</h3>
              <p>{lang === "ar"
                ? "لا تكتفِ بـ 7/10. قيّم الألعاب عبر القصة وأسلوب اللعب والرسومات والصوت لإعطاء المجتمع الصورة الكاملة."
                : "Don't just give it a 7/10. Rate games across story, gameplay, visuals, and audio to give the community the full picture."
              }</p>
              <div className="feature-demo">
                {["Story", "Gameplay", "Graphics", "Audio"].map((cat, i) => (
                  <div className="feature-bar-row" key={cat}>
                    <span>{lang === "ar" ? ["القصة","اللعب","الرسوم","الصوت"][i] : cat}</span>
                    <div className="feature-bars">
                      {[1,2,3,4,5].map(s => (
                        <div key={s} className={`feature-bar ${s <= (i === 1 ? 5 : 4) ? "filled" : "empty"}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 2 — AI Recommendations */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Sparkles size={22} color="var(--accent-light)" />
              </div>
              <h3>{t("aiRecommendations")}</h3>
              <p>{lang === "ar"
                ? "يحلل محركنا الذكي مكتبتك وتقييماتك ليقترح عناوين ستحبها بالتأكيد."
                : "Our AI engine analyzes your library, playtime, and ratings to suggest titles you're guaranteed to love."
              }</p>
              <div className="feature-demo" style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                {featureGames[0] ? (
                  <img
                    src={getCoverURL(featureGames[0], "cover_small")}
                    alt={featureGames[0].name}
                    style={{ width: 48, height: 64, borderRadius: 6, objectFit: "cover", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
                    onError={e => { e.target.style.background = "linear-gradient(to bottom, #6366f1, #7c3aed)"; e.target.style.display = "none"; }}
                  />
                ) : (
                  <div style={{ width: 48, height: 64, borderRadius: 6, background: "linear-gradient(to bottom, #6366f1, #7c3aed)", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }} />
                )}
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>
                    {featureGames[0]?.name || "Cybernetic Souls"}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--accent-light)", marginTop: 4 }}>
                    98% {lang === "ar" ? "تطابق" : "Match"}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 — Game Library */}
            <div className="feature-card">
              <div className="feature-icon-box">
                <Library size={22} color="var(--accent-light)" />
              </div>
              <h3>{t("yourGameLibrary")}</h3>
              <p>{lang === "ar"
                ? "تتبع كل شيء لعبته أو تلعبه أو تريد لعبه. أنشئ مجموعات مخصصة وشاركها مع الأصدقاء."
                : "Track everything you've played, are playing, or want to play. Build custom collections and share them with friends."
              }</p>
              <div className="feature-demo" style={{ display: "flex" }}>
                {featureGames.slice(1, 4).map((game, i) => (
                  <img
                    key={game.id}
                    src={getCoverURL(game, "cover_small")}
                    alt={game.name}
                    style={{
                      width: 48, height: 64, borderRadius: 6, objectFit: "cover",
                      marginLeft: i > 0 ? -10 : 0,
                      border: "2px solid var(--bg-card)",
                      boxShadow: "var(--shadow)",
                      flexShrink: 0,
                    }}
                    onError={e => { e.target.style.display = "none"; }}
                  />
                ))}
                {featureGames.length < 2 && [
                  "linear-gradient(135deg, #059669, #34d399)",
                  "linear-gradient(135deg, #dc2626, #fb923c)",
                  "linear-gradient(135deg, #2563eb, #67e8f9)",
                ].map((bg, i) => (
                  <div key={i} style={{ width: 48, height: 64, borderRadius: 6, background: bg, marginLeft: i > 0 ? -10 : 0, border: "2px solid var(--bg-card)", boxShadow: "var(--shadow)" }} />
                ))}
                <div style={{ width: 48, height: 64, borderRadius: 6, background: "var(--bg-elevated)", marginLeft: -10, border: "2px solid var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)" }}>+42</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <p>© 2025 GameBox. {lang === "ar" ? "منصة ألعاب احترافية." : "A premium gaming editorial platform."}</p>
      </footer>
    </div>
  );
}