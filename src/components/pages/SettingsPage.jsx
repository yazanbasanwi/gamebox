// src/components/pages/SettingsPage.jsx
// User settings: privacy, Steam account linking, account management
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { updateUserProfile } from "../../services/firestoreService";
import toast from "react-hot-toast";

const STEAM_API_URL = process.env.REACT_APP_IGDB_PROXY_URL?.replace("/api/igdb", "/api/steam") || "http://localhost:5000/api/steam";

export default function SettingsPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  // Privacy settings
  const [isPrivate, setIsPrivate] = useState(userProfile?.isPrivate || false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Steam linking
  const [steamInput, setSteamInput] = useState(userProfile?.steamId || "");
  const [steamProfile, setSteamProfile] = useState(
    userProfile?.steamId ? { personaName: userProfile.steamProfile || userProfile.steamId } : null
  );
  const [connectingSteam, setConnectingSteam] = useState(false);

  // Save privacy setting to Firestore
  async function handleSavePrivacy() {
    setSavingPrivacy(true);
    try {
      await updateUserProfile(currentUser.uid, { isPrivate });
      await fetchUserProfile(currentUser.uid);
      toast.success(lang === "ar" ? "تم حفظ إعدادات الخصوصية" : "Privacy settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSavingPrivacy(false);
    }
  }

  // Parse Steam input (ID, URL, or username) and resolve to a Steam ID
  function parseSteamInput(input) {
    const trimmed = input.trim();
    if (/^\d{17}$/.test(trimmed)) return { type: "id", value: trimmed };
    const idMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (idMatch) return { type: "id", value: idMatch[1] };
    const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/);
    if (vanityMatch) return { type: "vanity", value: vanityMatch[1] };
    if (trimmed.length > 0 && !/\s/.test(trimmed)) return { type: "vanity", value: trimmed };
    return null;
  }

  // Connect Steam account and save to profile
  async function handleConnectSteam() {
    const parsed = parseSteamInput(steamInput);
    if (!parsed) {
      toast.error(lang === "ar" ? "أدخل معرف Steam صحيح" : "Enter a valid Steam ID or username");
      return;
    }
    setConnectingSteam(true);
    try {
      let steamId = parsed.value;
      if (parsed.type === "vanity") {
        const res = await fetch(`${STEAM_API_URL}/resolve/${parsed.value}`);
        if (!res.ok) { toast.error("Steam user not found"); return; }
        const data = await res.json();
        steamId = data.steamId;
      }
      const profileRes = await fetch(`${STEAM_API_URL}/profile/${steamId}`);
      if (!profileRes.ok) { toast.error("Profile not found"); return; }
      const profile = await profileRes.json();

      await updateUserProfile(currentUser.uid, {
        steamId,
        steamProfile: profile.personaName,
      });
      await fetchUserProfile(currentUser.uid);
      setSteamProfile(profile);
      toast.success(lang === "ar" ? "تم ربط حساب Steam!" : "Steam account linked!");
    } catch (err) {
      console.error("Steam connect error:", err);
      toast.error("Failed to connect Steam");
    } finally {
      setConnectingSteam(false);
    }
  }

  // Disconnect Steam account from profile
  async function handleDisconnectSteam() {
    try {
      await updateUserProfile(currentUser.uid, { steamId: null, steamProfile: null });
      await fetchUserProfile(currentUser.uid);
      setSteamProfile(null);
      setSteamInput("");
      toast.success(lang === "ar" ? "تم فصل حساب Steam" : "Steam account disconnected");
    } catch {
      toast.error("Failed");
    }
  }

  return (
    <div className="page settings-page">
      <h1>{lang === "ar" ? "الإعدادات" : "Settings"}</h1>

      {/* Privacy Settings */}
      <div className="settings-section">
        <h2>{lang === "ar" ? "الخصوصية" : "Privacy"}</h2>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-label">
              <strong>{lang === "ar" ? "حساب خاص" : "Private Account"}</strong>
              <p>{lang === "ar"
                ? "عند التفعيل، لن يستطيع الآخرون رؤية مكتبتك أو مراجعاتك"
                : "When enabled, others cannot see your library or reviews"
              }</p>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <button
            onClick={handleSavePrivacy}
            className="btn-primary btn-sm"
            disabled={savingPrivacy}
          >
            {savingPrivacy
              ? (lang === "ar" ? "جاري الحفظ..." : "Saving...")
              : (lang === "ar" ? "حفظ" : "Save Privacy Settings")
            }
          </button>
        </div>
      </div>

      {/* Steam Account Linking */}
      <div className="settings-section">
        <h2>{lang === "ar" ? "حساب Steam" : "Steam Account"}</h2>
        <div className="settings-card">
          {steamProfile ? (
            // Steam account is connected
            <div className="steam-connected">
              <div className="steam-connected-info">
                <span className="steam-connected-icon">🎮</span>
                <div>
                  <strong>{steamProfile.personaName}</strong>
                  <p>{lang === "ar" ? "حساب Steam مرتبط" : "Steam account linked"}</p>
                </div>
              </div>
              <div className="steam-connected-actions">
                <Link to="/steam" className="btn-primary btn-sm">
                  {lang === "ar" ? "استيراد الألعاب" : "Import Games"}
                </Link>
                <button onClick={handleDisconnectSteam} className="btn-ghost btn-sm danger">
                  {lang === "ar" ? "فصل الحساب" : "Disconnect"}
                </button>
              </div>
            </div>
          ) : (
            // Steam account not connected
            <>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.9rem" }}>
                {lang === "ar"
                  ? "اربط حساب Steam لاستيراد ألعابك تلقائياً"
                  : "Link your Steam account to auto-import your games"
                }
              </p>
              <div className="steam-input-group">
                <input
                  type="text"
                  className="steam-input"
                  placeholder={lang === "ar"
                    ? "Steam ID أو رابط الملف الشخصي أو اسم المستخدم"
                    : "Steam ID, profile URL, or username"
                  }
                  value={steamInput}
                  onChange={e => setSteamInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleConnectSteam()}
                />
                <button
                  onClick={handleConnectSteam}
                  className="btn-primary"
                  disabled={connectingSteam || !steamInput.trim()}
                >
                  {connectingSteam
                    ? (lang === "ar" ? "جاري الاتصال..." : "Connecting...")
                    : (lang === "ar" ? "ربط" : "Connect")
                  }
                </button>
              </div>
              <div className="steam-help">
                <p>{lang === "ar" ? "أمثلة:" : "Examples:"}</p>
                <code>76561198012345678</code>
                <code>https://steamcommunity.com/id/username</code>
                <code>username</code>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account Info */}
      <div className="settings-section">
        <h2>{lang === "ar" ? "الحساب" : "Account"}</h2>
        <div className="settings-card">
          <div className="settings-row">
            <div className="settings-label">
              <strong>{lang === "ar" ? "البريد الإلكتروني" : "Email"}</strong>
              <p>{currentUser?.email}</p>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-label">
              <strong>{lang === "ar" ? "الدور" : "Role"}</strong>
              <p>{userProfile?.role || "user"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
