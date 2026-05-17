// src/components/pages/SteamImportPage.jsx
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { addToLibrary, updateUserProfile } from "../../services/firestoreService";
import toast from "react-hot-toast";

const STEAM_API_URL =
  process.env.REACT_APP_IGDB_PROXY_URL?.replace("/api/igdb", "/api/steam") ||
  "http://localhost:3000/api/steam";

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
  const [step, setStep] = useState("connect");
  const [filter, setFilter] = useState("all");

  function parseSteamInput(input) {
    const trimmed = input.trim();

    if (/^\d{17}$/.test(trimmed)) return { type: "id", value: trimmed };

    const idMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (idMatch) return { type: "id", value: idMatch[1] };

    const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/);
    if (vanityMatch) return { type: "vanity", value: vanityMatch[1] };

    if (trimmed.length > 0 && !/\s/.test(trimmed)) {
      return { type: "vanity", value: trimmed };
    }

    return null;
  }

  async function handleConnect() {
    const parsed = parseSteamInput(steamInput);

    if (!parsed) {
      toast.error(
        lang === "ar"
          ? "أدخل معرف Steam صحيح أو رابط الملف الشخصي"
          : "Enter a valid Steam ID, profile URL, or username"
      );
      return;
    }

    setLoading(true);

    try {
      let steamId = parsed.value;

      if (parsed.type === "vanity") {
        const resolveUrl = `${STEAM_API_URL}/resolve/${encodeURIComponent(parsed.value)}`;
        console.log("Resolve URL:", resolveUrl);

        const resolveRes = await fetch(resolveUrl);

        if (!resolveRes.ok) {
          toast.error(lang === "ar" ? "لم يتم العثور على مستخدم Steam" : "Steam user not found");
          return;
        }

        const resolveData = await resolveRes.json();
        console.log("Resolve response:", resolveData);

        steamId =
          resolveData.steamId ||
          resolveData.steamid ||
          resolveData.response?.steamid;

        if (!steamId) {
          toast.error("Could not resolve Steam ID");
          return;
        }
      }

      const profileUrl = `${STEAM_API_URL}/profile/${steamId}`;
      console.log("Profile URL:", profileUrl);

      const profileRes = await fetch(profileUrl);

      if (!profileRes.ok) {
        throw new Error("Profile not found");
      }

      const profile = await profileRes.json();
      console.log("Profile response:", profile);

 const fixedProfile = {
  ...profile,

  personaName:
    profile.personaName ||
    profile.personaname ||
    profile.name ||
    profile.steamProfile ||
    steamId,

  avatarUrl:
    profile.avatarUrl ||
    profile.avatarfull ||
    profile.avatar ||
    profile.avatarmedium ||
    "",

  profileUrl:
    profile.profileUrl ||
    profile.profileurl ||
    profile.profile ||
    `https://steamcommunity.com/profiles/${steamId}`,
};

      setSteamProfile(fixedProfile);

      const gamesUrl = `${STEAM_API_URL}/games/${steamId}`;
      console.log("Games URL:", gamesUrl);

      const gamesRes = await fetch(gamesUrl);

      if (!gamesRes.ok) {
        let errorMessage = "Failed to fetch games";

        try {
          const err = await gamesRes.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // ignore JSON parse error
        }

        toast.error(errorMessage);
        return;
      }

      const gamesData = await gamesRes.json();
      console.log("Games response:", gamesData);

      const games = gamesData.games || [];

      setSteamGames(games);

      try {
        const recentUrl = `${STEAM_API_URL}/recent/${steamId}`;
        console.log("Recent URL:", recentUrl);

        const recentRes = await fetch(recentUrl);

        if (recentRes.ok) {
          const recentData = await recentRes.json();
          console.log("Recent response:", recentData);
          setRecentGames(recentData.games || []);
        }
      } catch {
        // recent games is optional
      }

      await updateUserProfile(currentUser.uid, {
        steamId,
        steamProfile: fixedProfile.personaName,
      });

      await fetchUserProfile(currentUser.uid);

      const recentIds = new Set(
        games
          .filter((g) => g.playtimeMinutes > 0)
          .slice(0, 20)
          .map((g) => g.appId)
      );

      setSelectedGames(recentIds);
      setStep("preview");

      toast.success(
        lang === "ar"
          ? `تم العثور على ${gamesData.totalGames || games.length} لعبة!`
          : `Found ${gamesData.totalGames || games.length} games!`
      );
    } catch (err) {
      console.error("Steam connect error:", err);

      if (err.message === "Failed to fetch") {
        toast.error("Cannot connect to backend. Make sure server is running on port 5000.");
      } else {
        toast.error(
          lang === "ar"
            ? "فشل الاتصال بـ Steam"
            : err.message || "Failed to connect to Steam"
        );
      }
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
  console.log("Importing:", {
    appId: game.appId,
    name: game.name,
    coverUrl: game.coverUrl,
    builtUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`
  });

      try {
        const status = recentAppIds.has(game.appId)
          ? "playing"
          : game.playtimeMinutes > 120
          ? "completed"
          : "plan_to_play";

await addToLibrary(currentUser.uid, {
  gameId: `steam_${game.appId}`,
  gameTitle: game.name,
  gameCover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
  genre: "",
  platform: "PC",
  status,
  hoursPlayed: game.playtimeHours || Math.round((game.playtimeMinutes || 0) / 60),
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

  const totalPlaytime = steamGames.reduce(
    (sum, g) => sum + (g.playtimeHours || (g.playtimeMinutes || 0) / 60),
    0
  );

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
              placeholder={
                lang === "ar"
                  ? "Steam ID أو رابط الملف الشخصي أو اسم المستخدم"
                  : "Steam ID, profile URL, or username"
              }
              value={steamInput}
              onChange={(e) => setSteamInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="steam-input"
            />
            <button
              onClick={handleConnect}
              className="btn-primary"
              disabled={loading || !steamInput.trim()}
            >
              {loading
                ? lang === "ar"
                  ? "جاري البحث..."
                  : "Searching..."
                : lang === "ar"
                ? "ربط"
                : "Connect"}
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

      {step === "preview" && steamProfile && (
        <>
          <div className="steam-profile-card">
            <img src={steamProfile.avatarUrl} alt="" className="steam-avatar" />
            <div className="steam-profile-info">
              <h3>{steamProfile.personaName}</h3>
              <div className="steam-profile-stats">
                <span>
                  🎮 {steamGames.length} {lang === "ar" ? "لعبة" : "games"}
                </span>
                <span>
                  ⏱️ {Math.round(totalPlaytime)}{" "}
                  {lang === "ar" ? "ساعة إجمالية" : "total hours"}
                </span>
                {recentGames.length > 0 && (
                  <span>
                    🔥 {recentGames.length} {lang === "ar" ? "لعبة حديثة" : "recently played"}
                  </span>
                )}
              </div>
            </div>
            <a
              href={steamProfile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost btn-sm"
            >
              {lang === "ar" ? "عرض في Steam" : "View on Steam"} ↗
            </a>
          </div>

          {recentGames.length > 0 && (
            <div className="steam-section">
              <h3>🔥 {lang === "ar" ? "ألعبت مؤخراً" : "Recently Played"}</h3>
              <div className="steam-recent-grid">
                {recentGames.slice(0, 6).map((game) => (
                  <div key={game.appId} className="steam-recent-card">
                    <img src={game.coverUrl} alt={game.name} className="steam-recent-cover" />
                    <div className="steam-recent-info">
                      <strong>{game.name}</strong>
                      <span>
                        {Math.round(((game.playtimeRecent || 0) / 60) * 10) / 10}h{" "}
                        {lang === "ar" ? "هذا الأسبوع" : "last 2 weeks"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="steam-section">
            <div className="steam-section-header">
              <h3>{lang === "ar" ? "اختر الألعاب للاستيراد" : "Select Games to Import"}</h3>

              <div className="steam-selection-controls">
                <div className="steam-filter-tabs">
                  <button
                    className={`tab-btn ${filter === "all" ? "active" : ""}`}
                    onClick={() => setFilter("all")}
                  >
                    {lang === "ar" ? "الكل" : "All"} ({steamGames.length})
                  </button>

                  <button
                    className={`tab-btn ${filter === "played" ? "active" : ""}`}
                    onClick={() => setFilter("played")}
                  >
                    {lang === "ar" ? "لُعبت" : "Played"} (
                    {steamGames.filter((g) => g.playtimeMinutes > 0).length})
                  </button>

                  <button
                    className={`tab-btn ${filter === "unplayed" ? "active" : ""}`}
                    onClick={() => setFilter("unplayed")}
                  >
                    {lang === "ar" ? "لم تُلعب" : "Unplayed"} (
                    {steamGames.filter((g) => g.playtimeMinutes === 0).length})
                  </button>
                </div>

                <div className="steam-select-btns">
                  <button className="btn-ghost btn-sm" onClick={selectAll}>
                    {lang === "ar" ? "تحديد الكل" : "Select All"}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={deselectAll}>
                    {lang === "ar" ? "إلغاء الكل" : "Deselect All"}
                  </button>
                </div>
              </div>
            </div>

            <p className="steam-selected-count">
              {selectedGames.size} {lang === "ar" ? "لعبة محددة" : "games selected"}
            </p>

            <div className="steam-games-list">
              {filteredGames.map((game) => (
                <label
                  key={game.appId}
                  className={`steam-game-row ${selectedGames.has(game.appId) ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGames.has(game.appId)}
                    onChange={() => toggleGame(game.appId)}
                  />

                  <img
                    src={game.coverUrl}
                    alt=""
                    className="steam-game-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />

                  <div className="steam-game-info">
                    <strong>{game.name}</strong>
                    <span className="steam-game-playtime">
                      {(game.playtimeHours || game.playtimeMinutes > 0)
                        ? `${game.playtimeHours || Math.round((game.playtimeMinutes / 60) * 10) / 10} ${
                            lang === "ar" ? "ساعة" : "hours"
                          }`
                        : lang === "ar"
                        ? "لم تُلعب"
                        : "Never played"}
                    </span>
                  </div>

                  <span className="steam-game-status">
                    {game.playtimeMinutes > 120 ? "✅" : game.playtimeMinutes > 0 ? "🎮" : "📋"}
                  </span>
                </label>
              ))}
            </div>

            <div className="steam-import-actions">
              <button
                onClick={handleImport}
                className="btn-primary"
                disabled={importing || selectedGames.size === 0}
              >
                {importing
                  ? lang === "ar"
                    ? "جاري الاستيراد..."
                    : "Importing..."
                  : lang === "ar"
                  ? `استيراد ${selectedGames.size} لعبة`
                  : `Import ${selectedGames.size} Games`}
              </button>

              <button onClick={() => setStep("connect")} className="btn-ghost">
                {t("cancel")}
              </button>
            </div>
          </div>
        </>
      )}

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
            <a href="/library" className="btn-primary">
              {lang === "ar" ? "عرض المكتبة" : "View Library"}
            </a>

            <button
              onClick={() => {
                setStep("connect");
                setSteamGames([]);
                setSteamProfile(null);
              }}
              className="btn-secondary"
            >
              {lang === "ar" ? "استيراد المزيد" : "Import More"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}