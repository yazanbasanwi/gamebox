// src/components/pages/ForgotPasswordPage.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { resetPassword } = useAuth();
  const { t } = useLanguage();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return toast.error(t("enterEmail"));
    try { await resetPassword(email); setSubmitted(true); toast.success("Reset email sent!"); }
    catch { toast.error("Failed to send reset email"); }
  }

  if (submitted) {
    return (
      <div className="auth-page"><div className="auth-card"><div className="auth-header">
        <h1>{t("checkEmail")}</h1>
        <p>{email}</p>
      </div>
      <Link to="/login" className="btn-primary" style={{ textAlign: "center", display: "block" }}>{t("backToLogin")}</Link>
      </div></div>
    );
  }

  return (
    <div className="auth-page"><div className="auth-card"><div className="auth-header">
      <h1>{t("resetPassword")}</h1>
      <p>{t("resetSubtitle")}</p>
    </div>
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="form-group">
        <label htmlFor="email">{t("email")}</label>
        <input id="email" type="email" placeholder={t("enterEmail")} value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button type="submit" className="btn-primary">{t("sendResetLink")}</button>
    </form>
    <p className="auth-footer"><Link to="/login">{t("backToLogin")}</Link></p>
    </div></div>
  );
}
