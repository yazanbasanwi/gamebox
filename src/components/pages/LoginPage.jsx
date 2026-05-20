// src/components/pages/LoginPage.jsx
// Login page with email/password form and Google OAuth sign-in
// Uses a split-panel layout: left side shows a decorative art panel, right side has the form
// After login, redirects the user back to the page they were trying to visit
 
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { Eye, EyeOff } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";
 
export default function LoginPage() {
  // Controlled form state — each input's value is stored in React state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
 
  // Controls whether the password is shown as plain text or hidden (••••)
  const [showPassword, setShowPassword] = useState(false);
 
  // Prevents double submissions by disabling the button while the Firebase call is in progress
  const [submitting, setSubmitting] = useState(false);
 
  // Get login functions from AuthContext
  const { login, loginWithGoogle } = useAuth();
 
  // Get translation function and current language from LanguageContext
  const { t, lang } = useLanguage();
 
  // useNavigate lets us redirect programmatically after successful login
  const navigate = useNavigate();
 
  // useLocation reads the current URL — used to get the "from" page for redirect after login
  const location = useLocation();
 
  // If user was redirected here from a protected route (e.g. /library),
  // store that path so we can redirect back after login. Default to "/" if no redirect path
  const from = location.state?.from?.pathname || "/";
 
  // Handles email/password login form submission
  async function handleSubmit(e) {
    // Prevent the browser's default form submission which would reload the page
    e.preventDefault();
 
    // Validate that both fields are filled before making the Firebase call
    if (!email || !password) return toast.error(t("enterEmail"));
 
    // Disable the submit button to prevent multiple submissions
    setSubmitting(true);
 
    try {
      // Call Firebase Authentication via our AuthContext login function
      await login(email, password);
      toast.success(t("welcomeBack") + "!");
 
      // Navigate back to the page the user was trying to visit before being redirected to login
      // replace: true replaces the /login entry in browser history so Back button works correctly
      navigate(from, { replace: true });
    } catch {
      // Firebase throws an error for wrong credentials — show a user-friendly message
      // We don't specify whether it's the email or password that's wrong for security reasons
      toast.error(lang === "ar" ? "بريد إلكتروني أو كلمة مرور غير صحيحة" : "Invalid email or password");
    } finally {
      // Always re-enable the submit button whether login succeeded or failed
      setSubmitting(false);
    }
  }
 
  // Handles Google OAuth sign-in via Firebase popup
  async function handleGoogle() {
    try {
      // Opens a Google sign-in popup window via Firebase
      await loginWithGoogle();
      // Redirect to the original destination after successful Google sign-in
      navigate(from, { replace: true });
    } catch {
      toast.error("Google sign-in failed");
    }
  }
 
  return (
    <div className="auth-page">
 
      {/* ── Left Art Panel (hidden on mobile, visible on desktop) ── */}
      <div className="auth-art-panel">
        {/* Purple gradient glow effects — purely decorative */}
        <div className="auth-art-glow-1" />
        <div className="auth-art-glow-2" />
 
        {/* GameBox logo in the top-left of the art panel */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800 }}>
            <span style={{ color: "var(--text-primary)" }}>GAME</span>
            <span style={{ color: "var(--accent)" }}>BOX</span>
          </span>
        </div>
 
        {/* Inspirational quote at the bottom of the art panel */}
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
 
      {/* ── Right Form Panel ── */}
      <div className="auth-form-panel">
        <div style={{ width: "100%", maxWidth: 440 }}>
 
          {/* Mobile-only logo — shown when the art panel is hidden on small screens */}
          <div className="auth-mobile-logo">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: "1.75rem", fontWeight: 800 }}>
              <span>GAME</span><span style={{ color: "var(--accent)" }}>BOX</span>
            </span>
          </div>
 
          <div className="auth-card">
            {/* Card header with title and subtitle */}
            <div className="auth-header">
              <h1>{t("welcomeBack")}</h1>
              <p>{lang === "ar" ? "أدخل بيانات حسابك للمتابعة." : "Enter your credentials to access your account."}</p>
            </div>
 
            {/* Login form — onSubmit calls handleSubmit instead of default browser behavior */}
            <form onSubmit={handleSubmit} className="auth-form">
 
              {/* Email input — autoComplete="email" enables browser autofill */}
              <div className="form-group">
                <label>{t("email")}</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
 
              {/* Password field with show/hide toggle and forgot password link */}
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label>{t("password")}</label>
                  {/* Forgot password link — navigates to /forgot-password */}
                  <Link to="/forgot-password" className="forgot-link">{t("forgotPassword")}</Link>
                </div>
                <div className="password-field">
                  {/* type switches between "password" (hidden) and "text" (visible) based on showPassword state */}
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  {/* Eye toggle button — clicking flips showPassword between true and false */}
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
 
              {/* Submit button — disabled while submitting to prevent double clicks */}
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                disabled={submitting}
              >
                {/* Show loading text while Firebase call is in progress */}
                {submitting ? (lang === "ar" ? "جاري الدخول..." : "Logging in...") : t("logIn")}
              </button>
            </form>
 
            {/* Divider between form and Google button */}
            <div className="auth-divider">
              <span>{lang === "ar" ? "أو" : "or"}</span>
            </div>
 
            {/* Google sign-in button using the FcGoogle colored icon from react-icons */}
            <button className="btn-google" onClick={handleGoogle}>
              <FcGoogle size={18} /> Google
            </button>
 
            {/* Link to registration page for new users */}
            <p className="auth-footer">
              {t("noAccount")} <Link to="/register">{t("signUp")}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}