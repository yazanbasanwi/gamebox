

import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  // Stores the email address the user types into the input
  const [email, setEmail] = useState("");

  // Controls which view to show — false = form, true = success confirmation
  // When this flips to true, the page switches from showing the form to showing "Check Your Email"
  const [submitted, setSubmitted] = useState(false);

  // Get the resetPassword function from AuthContext (wraps Firebase sendPasswordResetEmail)
  const { resetPassword } = useAuth();

  // Get translation function from LanguageContext
  const { t } = useLanguage();

  // Handles the reset form submission
  async function handleSubmit(e) {
    // Stop the browser from doing a full page reload on form submit
    e.preventDefault();

    // Validate that the email field is not empty before calling Firebase
    if (!email) return toast.error(t("enterEmail"));

    try {
      // Call Firebase to send the password reset email
      // Firebase will handle the email delivery — we just trigger the request
      await resetPassword(email);

      // Flip the submitted flag to true — this causes the component to render the success view
      setSubmitted(true);

      toast.success("Reset email sent!");
    } catch {
      // Firebase can throw errors for invalid email format or network issues
      // We show a generic error — we intentionally don't say "email not found"
      // to prevent attackers from discovering which emails are registered
      toast.error("Failed to send reset email");
    }
  }

  // ── Success View ──
  // Shown after the reset email is sent — the submitted state flipped to true
  // We use conditional rendering (if/return) instead of navigating to a new page
  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h1>{t("checkEmail")}</h1>
            {/* Show the email address so the user knows where to look */}
            <p>{email}</p>
          </div>
          {/* Link back to login — user can now go check their email and follow the reset link */}
          <Link
            to="/login"
            className="btn-primary"
            style={{ textAlign: "center", display: "block" }}
          >
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  // ── Form View ──
  // Shown initially when submitted is false
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{t("resetPassword")}</h1>
          <p>{t("resetSubtitle")}</p>
        </div>

        {/* Reset form — only has one field (email) unlike the login form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">{t("email")}</label>
            {/* htmlFor="email" connects this label to the input with id="email" for accessibility */}
            <input
              id="email"
              type="email"
              placeholder={t("enterEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Submit button — triggers handleSubmit which calls Firebase */}
          <button type="submit" className="btn-primary">
            {t("sendResetLink")}
          </button>
        </form>

        {/* Link back to login in case the user remembers their password */}
        <p className="auth-footer">
          <Link to="/login">{t("backToLogin")}</Link>
        </p>
      </div>
    </div>
  );
}