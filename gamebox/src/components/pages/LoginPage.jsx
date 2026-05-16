// src/components/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) return toast.error(t("enterEmail"));
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success(t("welcomeBack") + "!");
      navigate(from, { replace: true });
    } catch {
      toast.error(lang === "ar" ? "بريد إلكتروني أو كلمة مرور غير صحيحة" : "Invalid email or password");
    } finally { setSubmitting(false); }
  }

  async function handleGoogle() {
    try { await loginWithGoogle(); navigate(from, { replace: true }); }
    catch { toast.error("Google sign-in failed"); }
  }

  return (
    <div className="auth-page">
      {/* Left art panel */}
      <div className="auth-art-panel">
        <div className="auth-art-glow-1" />
        <div className="auth-art-glow-2" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800 }}>
            <span style={{ color: "var(--text-primary)" }}>GAME</span>
            <span style={{ color: "var(--accent)" }}>BOX</span>
          </span>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <blockquote className="auth-art-quote">
            {lang === "ar"
              ? "«سجّل كل مرحلة انتصرت فيها. راجع كل عالم استكشفته.»"
              : "\"Track every boss defeated. Review every world explored.\""
            }
          </blockquote>
          <p className="auth-art-sub">
            {lang === "ar"
              ? "انضم إلى مجتمع من اللاعبين يبنون المكتبة النهائية للتجارب التفاعلية."
              : "Join a community of players curating the definitive library of interactive experiences."
            }
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-panel">
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div className="auth-mobile-logo">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800 }}>
              <span>GAME</span><span style={{ color: "var(--accent)" }}>BOX</span>
            </span>
          </div>
          <div className="auth-card">
            <div className="auth-header">
              <h1>{t("welcomeBack")}</h1>
              <p>{lang === "ar" ? "أدخل بيانات حسابك للمتابعة." : "Enter your credentials to access your account."}</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>{t("email")}</label>
                <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>{t("password")}</label>
                  <Link to="/forgot-password" className="forgot-link">{t("forgotPassword")}</Link>
                </div>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>
                {submitting ? (lang === "ar" ? "جاري الدخول..." : "Logging in...") : t("logIn")}
              </button>
            </form>
            <div className="auth-divider"><span>{lang === "ar" ? "أو" : "or"}</span></div>
            <button className="btn-google" onClick={handleGoogle}>
              <FcGoogle size={18} /> Google
            </button>
            <p className="auth-footer">
              {t("noAccount")} <Link to="/register">{t("signUp")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
