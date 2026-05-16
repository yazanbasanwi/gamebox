// src/components/pages/SteamImportPage.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { addToLibrary, updateUserProfile } from "../../services/firestoreService";
import toast from "react-hot-toast";

const STEAM_API_URL = process.env.REACT_APP_IGDB_PROXY_URL?.replace("/api/igdb", "/api/steam") || "http://localhost:5000/api/steam";

export default function SteamImportPage() {
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  const { t, lang } = useLanguage();

  const [steamInput, setSteamInput] = useState(userProfile?.steamId || "");
  const [steamProfile, setSteamProfile] = useState(null);
  const [steamGames, setSteamGames] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedGames, setSelectedGames] = useState(new Set());
  const [importedCount, setImportedCount] = useState(0);
  const [step, setStep] = useState("connect"); // connect, preview, done
  const [filter, setFilter] = useState("all"); // all, played, unplayed

  // Extract Steam ID from various input formats
  function parseSteamInput(input) {
    const trimmed = input.trim();
    // Direct Steam ID (17 digit number)
    if (/^\d{17}$/.test(trimmed)) return { type: "id", value: trimmed };
    // Full profile URL
    const idMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (idMatch) return { type: "id", value: idMatch[1] };
    // Vanity URL
    const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/);
    if (vanityMatch) return { type: "vanity", value: vanityMatch[1] };
    // Just a username
    if (trimmed.length > 0 && !/\s/.test(trimmed)) return { type: "vanity", value: trimmed };
    return null;
  }

  async function handleConnect() {
    const parsed = parseSteamInput(steamInput);
    if (!parsed) {
      toast.error(lang === "ar" ? "أدخل معرف Steam صحيح أو رابط الملف الشخصي" : "Enter a valid Steam ID, profile URL, or username");
      return;
    }

    setLoading(true);
    try {
      let steamId = parsed.value;

      // Resolve vanity URL to Steam ID
      if (parsed.type === "vanity") {
        const resolveRes = await fetch(`${STEAM_API_URL}/resolve/${parsed.value}`);
        if (!resolveRes.ok) {
          toast.error(lang === "ar" ? "لم يتم العثور على مستخدم Steam" : "Steam user not found");
          setLoading(false);
          return;
        }
        const resolveData = await resolveRes.json();
        steamId = resolveData.steamId;
      }

      // Fetch profile
      const profileRes = await fetch(`${STEAM_API_URL}/profile/${steamId}`);
      if (!profileRes.ok) throw new Error("Profile not found");
      const profile = await profileRes.json();
      setSteamProfile(profile);

      // Fetch owned games
      const gamesRes = await fetch(`${STEAM_API_URL}/games/${steamId}`);
      if (!gamesRes.ok) {
        const err = await gamesRes.json();
        toast.error(err.error || "Failed to fetch games");
        setLoading(false);
        return;
      }
      const gamesData = await gamesRes.json();
      setSteamGames(gamesData.games || []);

      // Fetch recent games
      try {
        const recentRes = await fetch(`${STEAM_API_URL}/recent/${steamId}`);
        if (recentRes.ok) {
          const recentData = await recentRes.json();
          setRecentGames(recentData.games || []);
        }
      } catch { /* recent games is optional */ }

      // Save Steam ID to profile
      await updateUserProfile(currentUser.uid, { steamId: steamId, steamProfile: profile.personaName });
      await fetchUserProfile(currentUser.uid);

      // Pre-select recently played games
      const recentIds = new Set((gamesData.games || []).filter((g) => g.playtimeMinutes > 0).slice(0, 20).map((g) => g.appId));
      setSelectedGames(recentIds);

      setStep("preview");
      toast.success(lang === "ar" ? `تم العثور على ${gamesData.totalGames} لعبة!` : `Found ${gamesData.totalGames} games!`);
    } catch (err) {
      console.error("Steam connect error:", err);
      toast.error(lang === "ar" ? "فشل الاتصال بـ Steam" : "Failed to connect to Steam");
    } finally {
      setLoading(false);
    }
  }

  function toggleGame(appId) {
    setSelectedGames((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  }

  function selectAll() {
    setSelectedGames(new Set(getFilteredGames().map((g) => g.appId)));
  }

  function deselectAll() {
    setSelectedGames(new Set());
  }

  async function handleImport() {
    if (selectedGames.size === 0) {
      toast.error(lang === "ar" ? "اختر ألعاباً للاستيراد" : "Select games to import");
      return;
    }

    setImporting(true);
    let imported = 0;
    const recentAppIds = new Set(recentGames.map((g) => g.appId));

    for (const game of steamGames) {
      if (!selectedGames.has(game.appId)) continue;

      try {
        const status = recentAppIds.has(game.appId) ? "playing"
          : game.playtimeMinutes > 120 ? "completed"
          : "plan_to_play";

        await addToLibrary(currentUser.uid, {
          gameId: `steam_${game.appId}`,
          gameTitle: game.name,
          gameCover: "",
          genre: "",
          platform: "PC",
          status: status,
          hoursPlayed: game.playtimeHours,
        });
        imported++;
      } catch (err) {
        console.error(`Failed to import ${game.name}:`, err);
      }
    }

    setImportedCount(imported);
    setStep("done");
    toast.success(lang === "ar" ? `تم استيراد ${imported} لعبة!` : `Imported ${imported} games!`);
    setImporting(false);
  }

  function getFilteredGames() {
    if (filter === "played") return steamGames.filter((g) => g.playtimeMinutes > 0);
    if (filter === "unplayed") return steamGames.filter((g) => g.playtimeMinutes === 0);
    return steamGames;
  }

  const filteredGames = getFilteredGames();
  const totalPlaytime = steamGames.reduce((sum, g) => sum + g.playtimeHours, 0);

  return (
    <div className="page steam-import-page">
      <div className="steam-header">
        <h1>🎮 {lang === "ar" ? "استيراد من Steam" : "Steam Import"}</h1>
        <p className="page-subtitle">
          {lang === "ar"
            ? "اربط حسابك على Steam لاستيراد ألعابك وساعات اللعب تلقائياً"
            : "Connect your Steam account to auto-import your games and playtime"}
        </p>
      </div>

      {/* Step 1: Connect */}
      {step === "connect" && (
        <div className="steam-connect-card">
          <div className="steam-connect-icon">🔗</div>
          <h2>{lang === "ar" ? "ربط حساب Steam" : "Connect Steam Account"}</h2>
          <p className="steam-connect-desc">
            {lang === "ar"
              ? "أدخل معرف Steam الخاص بك أو رابط الملف الشخصي أو اسم المستخدم. تأكد من أن ملفك الشخصي عام."
              : "Enter your Steam ID, profile URL, or custom username. Make sure your profile is set to public."}
          </p>

          <div className="steam-input-group">
            <input
              type="text"
              placeholder={lang === "ar" ? "Steam ID أو رابط الملف الشخصي أو اسم المستخدم" : "Steam ID, profile URL, or username"}
              value={steamInput}
              onChange={(e) => setSteamInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="steam-input"
            />
            <button onClick={handleConnect} className="btn-primary" disabled={loading || !steamInput.trim()}>
              {loading ? (lang === "ar" ? "جاري البحث..." : "Searching...") : (lang === "ar" ? "ربط" : "Connect")}
            </button>
          </div>

          <div className="steam-help">
            <p>{lang === "ar" ? "أمثلة:" : "Examples:"}</p>
            <code>76561198012345678</code>
            <code>https://steamcommunity.com/id/gaben</code>
            <code>gaben</code>
          </div>
        </div>
      )}

      {/* Step 2: Preview & Select */}
      {step === "preview" && steamProfile && (
        <>
          {/* Steam Profile Card */}
          <div className="steam-profile-card">
            <img src={steamProfile.avatarUrl} alt="" className="steam-avatar" />
            <div className="steam-profile-info">
              <h3>{steamProfile.personaName}</h3>
              <div className="steam-profile-stats">
                <span>🎮 {steamGames.length} {lang === "ar" ? "لعبة" : "games"}</span>
                <span>⏱️ {Math.round(totalPlaytime)} {lang === "ar" ? "ساعة إجمالية" : "total hours"}</span>
                {recentGames.length > 0 && <span>🔥 {recentGames.length} {lang === "ar" ? "لعبة حديثة" : "recently played"}</span>}
              </div>
            </div>
            <a href={steamProfile.profileUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">
              {lang === "ar" ? "عرض في Steam" : "View on Steam"} ↗
            </a>
          </div>

          {/* Recently Played */}
          {recentGames.length > 0 && (
            <div className="steam-section">
              <h3>🔥 {lang === "ar" ? "ألعبت مؤخراً" : "Recently Played"}</h3>
              <div className="steam-recent-grid">
                {recentGames.slice(0, 6).map((game) => (
                  <div key={game.appId} className="steam-recent-card">
                    <img src={game.coverUrl} alt={game.name} className="steam-recent-cover" />
                    <div className="steam-recent-info">
                      <strong>{game.name}</strong>
                      <span>{Math.round(game.playtimeRecent / 60 * 10) / 10}h {lang === "ar" ? "هذا الأسبوع" : "last 2 weeks"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game Selection */}
          <div className="steam-section">
            <div className="steam-section-header">
              <h3>{lang === "ar" ? "اختر الألعاب للاستيراد" : "Select Games to Import"}</h3>
              <div className="steam-selection-controls">
                <div className="steam-filter-tabs">
                  <button className={`tab-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
                    {lang === "ar" ? "الكل" : "All"} ({steamGames.length})
                  </button>
                  <button className={`tab-btn ${filter === "played" ? "active" : ""}`} onClick={() => setFilter("played")}>
                    {lang === "ar" ? "لُعبت" : "Played"} ({steamGames.filter((g) => g.playtimeMinutes > 0).length})
                  </button>
                  <button className={`tab-btn ${filter === "unplayed" ? "active" : ""}`} onClick={() => setFilter("unplayed")}>
                    {lang === "ar" ? "لم تُلعب" : "Unplayed"} ({steamGames.filter((g) => g.playtimeMinutes === 0).length})
                  </button>
                </div>
                <div className="steam-select-btns">
                  <button className="btn-ghost btn-sm" onClick={selectAll}>{lang === "ar" ? "تحديد الكل" : "Select All"}</button>
                  <button className="btn-ghost btn-sm" onClick={deselectAll}>{lang === "ar" ? "إلغاء الكل" : "Deselect All"}</button>
                </div>
              </div>
            </div>

            <p className="steam-selected-count">
              {selectedGames.size} {lang === "ar" ? "لعبة محددة" : "games selected"}
            </p>

            <div className="steam-games-list">
              {filteredGames.map((game) => (
                <label key={game.appId} className={`steam-game-row ${selectedGames.has(game.appId) ? "selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={selectedGames.has(game.appId)}
                    onChange={() => toggleGame(game.appId)}
                  />
                  <img src={game.coverUrl} alt="" className="steam-game-cover" onError={(e) => { e.target.style.display = "none"; }} />
                  <div className="steam-game-info">
                    <strong>{game.name}</strong>
                    <span className="steam-game-playtime">
                      {game.playtimeHours > 0
                        ? `${game.playtimeHours} ${lang === "ar" ? "ساعة" : "hours"}`
                        : (lang === "ar" ? "لم تُلعب" : "Never played")}
                    </span>
                  </div>
                  <span className="steam-game-status">
                    {game.playtimeMinutes > 120 ? "✅" : game.playtimeMinutes > 0 ? "🎮" : "📋"}
                  </span>
                </label>
              ))}
            </div>

            <div className="steam-import-actions">
              <button onClick={handleImport} className="btn-primary" disabled={importing || selectedGames.size === 0}>
                {importing
                  ? (lang === "ar" ? "جاري الاستيراد..." : "Importing...")
                  : (lang === "ar" ? `استيراد ${selectedGames.size} لعبة` : `Import ${selectedGames.size} Games`)}
              </button>
              <button onClick={() => setStep("connect")} className="btn-ghost">{t("cancel")}</button>
            </div>
          </div>
        </>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="steam-done-card">
          <div className="steam-done-icon">✅</div>
          <h2>{lang === "ar" ? "تم الاستيراد بنجاح!" : "Import Complete!"}</h2>
          <p>
            {lang === "ar"
              ? `تم استيراد ${importedCount} لعبة إلى مكتبتك`
              : `${importedCount} games imported to your library`}
          </p>
          <div className="steam-done-actions">
            <a href="/library" className="btn-primary">{lang === "ar" ? "عرض المكتبة" : "View Library"}</a>
            <button onClick={() => { setStep("connect"); setSteamGames([]); setSteamProfile(null); }} className="btn-secondary">
              {lang === "ar" ? "استيراد المزيد" : "Import More"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
