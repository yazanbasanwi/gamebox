// src/components/pages/LoginPage.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { t } = useLanguage();
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
    } catch (err) {
      const msg = err.code === "auth/user-not-found" || err.code === "auth/invalid-credential"
        ? (t("lang") === "ar" ? "بريد إلكتروني أو كلمة مرور غير صحيحة" : "Invalid email or password")
        : (t("lang") === "ar" ? "فشل تسجيل الدخول" : "Login failed");
      toast.error(msg);
    } finally { setSubmitting(false); }
  }

  async function handleGoogle() {
    try {
      await loginWithGoogle();
      toast.success(t("welcomeBack") + "!");
      navigate(from, { replace: true });
    } catch { toast.error("Google sign-in failed"); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{t("welcomeBack")}</h1>
          <p>{t("loginSubtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t("email")}</label>
            <input id="email" type="email" placeholder={t("enterEmail")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t("password")}</label>
            <input id="password" type="password" placeholder={t("enterPassword")} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          <Link to="/forgot-password" className="forgot-link">{t("forgotPassword")}</Link>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? t("loggingIn") : t("logIn")}</button>
        </form>
        <div className="auth-divider"><span>{t("orContinueWith")}</span></div>
        <button className="btn-google" onClick={handleGoogle}><FcGoogle size={20} /> Google</button>
        <p className="auth-footer">{t("noAccount")} <Link to="/register">{t("signUp")}</Link></p>
      </div>
    </div>
  );
}
