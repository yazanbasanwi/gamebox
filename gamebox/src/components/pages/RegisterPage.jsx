// src/components/pages/RegisterPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !email || !password) return toast.error(t("enterEmail"));
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    setSubmitting(true);
    try { await register(email, password, username); navigate("/"); }
    catch (err) { toast.error(err.code === "auth/email-already-in-use" ? "Email already in use" : "Registration failed"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-art-panel">
        <div className="auth-art-glow-1" />
        <div className="auth-art-glow-2" />
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800 }}>
            <span>GAME</span><span style={{ color: "var(--accent)" }}>BOX</span>
          </span>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <blockquote className="auth-art-quote">
            {lang === "ar" ? "«رحلتك في الألعاب تستحق أن تُوثَّق.»" : "\"Your gaming journey deserves to be documented.\""}
          </blockquote>
          <p className="auth-art-sub">{lang === "ar" ? "انضم إلى آلاف اللاعبين الذين يتتبعون مسيرتهم." : "Join thousands of gamers tracking their journey."}</p>
        </div>
      </div>
      <div className="auth-form-panel">
        <div style={{ width: "100%", maxWidth: 440 }}>
          <div className="auth-mobile-logo">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800 }}>
              <span>GAME</span><span style={{ color: "var(--accent)" }}>BOX</span>
            </span>
          </div>
          <div className="auth-card">
            <div className="auth-header">
              <h1>{t("joinGameBox")}</h1>
              <p>{t("createAccountSubtitle")}</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>{t("username")}</label>
                <input type="text" placeholder={t("chooseUsername")} value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="form-group">
                <label>{t("email")}</label>
                <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <div className="form-group">
                <label>{t("password")}</label>
                <div className="password-field">
                  <input type={showPassword ? "text" : "password"} placeholder="6+ characters" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>{t("confirmPassword")}</label>
                <input type="password" placeholder={t("confirmPassword")} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={submitting}>
                {submitting ? t("creatingAccount") : t("createAccount")}
              </button>
            </form>
            <div className="auth-divider"><span>{lang === "ar" ? "أو" : "or"}</span></div>
            <button className="btn-google" onClick={() => loginWithGoogle().then(() => navigate("/"))}>
              <FcGoogle size={18} /> Google
            </button>
            <p className="auth-footer">{t("hasAccount")} <Link to="/login">{t("logIn")}</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
