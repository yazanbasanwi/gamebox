// src/components/pages/RegisterPage.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { FcGoogle } from "react-icons/fc";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register, loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !email || !password) return toast.error(t("enterEmail"));
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    setSubmitting(true);
    try {
      await register(email, password, username);
      toast.success("Welcome to GameBox!");
      navigate("/");
    } catch (err) {
      toast.error(err.code === "auth/email-already-in-use" ? "Email already in use" : "Registration failed");
    } finally { setSubmitting(false); }
  }

  async function handleGoogle() {
    try { await loginWithGoogle(); toast.success("Welcome!"); navigate("/"); }
    catch { toast.error("Google sign-in failed"); }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{t("joinGameBox")}</h1>
          <p>{t("createAccountSubtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">{t("username")}</label>
            <input id="username" type="text" placeholder={t("chooseUsername")} value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="email">{t("email")}</label>
            <input id="email" type="email" placeholder={t("enterEmail")} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="password">{t("password")}</label>
            <input id="password" type="password" placeholder="6+ characters" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">{t("confirmPassword")}</label>
            <input id="confirmPassword" type="password" placeholder={t("confirmPassword")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? t("creatingAccount") : t("createAccount")}</button>
        </form>
        <div className="auth-divider"><span>{t("orContinueWith")}</span></div>
        <button className="btn-google" onClick={handleGoogle}><FcGoogle size={20} /> Google</button>
        <p className="auth-footer">{t("hasAccount")} <Link to="/login">{t("logIn")}</Link></p>
      </div>
    </div>
  );
}
