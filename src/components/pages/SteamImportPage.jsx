// src/components/pages/SteamImportPage.jsx
// This page lets the user connect a Steam account, preview Steam games, and import selected games into the app library.
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { addToLibrary, updateUserProfile } from "../../services/firestoreService";
import toast from "react-hot-toast";

// Backend Steam API URL. It uses the proxy URL from environment variables if available, otherwise falls back to localhost.
const STEAM_API_URL =
  process.env.REACT_APP_IGDB_PROXY_URL?.replace("/api/igdb", "/api/steam") ||
  "http://localhost:3000/api/steam";

// Main React component for the Steam import page.
export default function SteamImportPage() {
  // Get the logged-in user, saved profile data, and a function to refresh the user profile.
  const { currentUser, userProfile, fetchUserProfile } = useAuth();
  // Get translation helper and current language for Arabic/English text.
  const { t, lang } = useLanguage();

  // Stores the Steam ID, profile URL, or username entered by the user.
  const [steamInput, setSteamInput] = useState(userProfile?.steamId || "");
  // Stores the connected Steam profile information after a successful lookup.
  const [steamProfile, setSteamProfile] = useState(null);
  // Stores all games fetched from the connected Steam account.
  const [steamGames, setSteamGames] = useState([]);
  // Stores recently played games if the backend returns them.
  const [recentGames, setRecentGames] = useState([]);
  // Controls the loading state while connecting to Steam.
  const [loading, setLoading] = useState(false);
  // Controls the loading state while importing games into the library.
  const [importing, setImporting] = useState(false);
  // Stores selected Steam app IDs using a Set so games can be added/removed easily.
  const [selectedGames, setSelectedGames] = useState(new Set());
  // Tracks how many games were successfully imported.
  const [importedCount, setImportedCount] = useState(0);
  // Controls which screen is shown: connect, preview, or done.
  const [step, setStep] = useState("connect");
  // Controls the game list filter: all, played, or unplayed.
  const [filter, setFilter] = useState("all");

  // Converts user input into either a Steam ID or a Steam vanity username.
  function parseSteamInput(input) {
    // Remove extra spaces before checking the input format.
    const trimmed = input.trim();

    // Direct Steam IDs are 17 digits long.
    if (/^\d{17}$/.test(trimmed)) return { type: "id", value: trimmed };

    // Check if the input is a Steam profile URL containing a numeric Steam ID.
    const idMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/);
    if (idMatch) return { type: "id", value: idMatch[1] };

    // Check if the input is a Steam custom profile URL.
    const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/);
    if (vanityMatch) return { type: "vanity", value: vanityMatch[1] };

    // If the input is a single word with no spaces, treat it as a vanity username.
    if (trimmed.length > 0 && !/\s/.test(trimmed)) {
      return { type: "vanity", value: trimmed };
    }

    // Return null when the input does not match any supported Steam format.
    return null;
  }

  // Connects to Steam, resolves the user if needed, fetches profile/games, and moves to the preview step.
  async function handleConnect() {
    // Parse the entered Steam input before calling the backend.
    const parsed = parseSteamInput(steamInput);

    // Stop if the input is not a valid Steam ID, URL, or username.
    if (!parsed) {
      toast.error(
        lang === "ar"
          ? "أدخل معرف Steam صحيح أو رابط الملف الشخصي"
          : "Enter a valid Steam ID, profile URL, or username"
      );
      return;
    }

    // Show loading state while API requests are running.
    setLoading(true);

    try {
      // Start with the parsed value. For vanity usernames, this will be resolved into a Steam ID.
      let steamId = parsed.value;

      // Vanity usernames must be resolved into a numeric Steam ID before fetching profile and games.
      if (parsed.type === "vanity") {
        const resolveUrl = `${STEAM_API_URL}/resolve/${encodeURIComponent(parsed.value)}`;
        console.log("Resolve URL:", resolveUrl);

        // Ask the backend to resolve the Steam vanity username.
        const resolveRes = await fetch(resolveUrl);

        // If the backend cannot resolve the username, show an error and stop.
        if (!resolveRes.ok) {
          toast.error(lang === "ar" ? "لم يتم العثور على مستخدم Steam" : "Steam user not found");
          return;
        }

        // Read the resolved Steam ID response.
        const resolveData = await resolveRes.json();
        console.log("Resolve response:", resolveData);

        // Support different possible response field names from the backend.
        steamId =
          resolveData.steamId ||
          resolveData.steamid ||
          resolveData.response?.steamid;

        // Stop if the response did not include a usable Steam ID.
        if (!steamId) {
          toast.error("Could not resolve Steam ID");
          return;
        }
      }

      // Build the request URL for the Steam profile.
      const profileUrl = `${STEAM_API_URL}/profile/${steamId}`;
      console.log("Profile URL:", profileUrl);

      // Fetch Steam profile details from the backend.
      const profileRes = await fetch(profileUrl);

      // Stop when the profile cannot be found or loaded.
      if (!profileRes.ok) {
        throw new Error("Profile not found");
      }

      // Convert the profile response into JSON.
      const profile = await profileRes.json();
      console.log("Profile response:", profile);

 // Normalize profile fields because different APIs/backends may return different property names.
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

      // Save the normalized Steam profile in component state.
      setSteamProfile(fixedProfile);

      // Build the request URL for the user's Steam games.
      const gamesUrl = `${STEAM_API_URL}/games/${steamId}`;
      console.log("Games URL:", gamesUrl);

      // Fetch the Steam games list from the backend.
      const gamesRes = await fetch(gamesUrl);

      // Handle backend/game fetch errors and show the best available message.
      if (!gamesRes.ok) {
        let errorMessage = "Failed to fetch games";

        // Try to read an error message returned by the backend.
        // Recent games are optional, so this request is allowed to fail without stopping the connection flow.
      try {
        // Decide the imported game status based on recent play and total playtime.
          const err = await gamesRes.json();
          errorMessage = err.error || errorMessage;
        } catch {
          // ignore JSON parse error
        }

        toast.error(errorMessage);
        return;
      }

      // Convert the games response into JSON.
      const gamesData = await gamesRes.json();
      console.log("Games response:", gamesData);

      // Use an empty array if the response does not contain games.
      const games = gamesData.games || [];

      // Save the full Steam games list.
      setSteamGames(games);

      try {
        const recentUrl = `${STEAM_API_URL}/recent/${steamId}`;
        console.log("Recent URL:", recentUrl);

        // Fetch recently played games from the backend.
        const recentRes = await fetch(recentUrl);

        // Only update recent games if the request succeeds.
        if (recentRes.ok) {
          const recentData = await recentRes.json();
          console.log("Recent response:", recentData);
          setRecentGames(recentData.games || []);
        }
      } catch {
        // recent games is optional
      }

      // Save the connected Steam information to the user profile in Firestore.
      await updateUserProfile(currentUser.uid, {
        steamId,
        steamProfile: fixedProfile.personaName,
      });

      // Refresh the local user profile after saving Steam information.
      await fetchUserProfile(currentUser.uid);

      // Preselect up to 20 games that have playtime so the user can import common/relevant games quickly.
      const recentIds = new Set(
        games
          .filter((g) => g.playtimeMinutes > 0)
          .slice(0, 20)
          .map((g) => g.appId)
      );

      // Apply the default selected games and move to the preview screen.
      setSelectedGames(recentIds);
      setStep("preview");

      toast.success(
        lang === "ar"
          ? `تم العثور على ${gamesData.totalGames || games.length} لعبة!`
          : `Found ${gamesData.totalGames || games.length} games!`
      );
    } catch (err) {
      // Handle network errors and Steam/backend connection failures.
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
      // Always stop the loading state after the connection attempt finishes.
      setLoading(false);
    }
  }

  // Selects or deselects one game by its Steam app ID.
  function toggleGame(appId) {
    setSelectedGames((prev) => {
      // Copy the previous Set because React state should not be mutated directly.
      const next = new Set(prev);
      if (next.has(appId)) next.delete(appId);
      else next.add(appId);
      return next;
    });
  }

  // Selects all games currently visible after filtering.
  function selectAll() {
    setSelectedGames(new Set(getFilteredGames().map((g) => g.appId)));
  }

  // Clears all selected games.
  function deselectAll() {
    setSelectedGames(new Set());
  }

  // Imports all selected games into the user's app library.
  async function handleImport() {
    // Stop if the user has not selected any games.
    if (selectedGames.size === 0) {
      toast.error(lang === "ar" ? "اختر ألعاباً للاستيراد" : "Select games to import");
      return;
    }

    // Show importing state while selected games are being added.
    setImporting(true);
    // Count successful imports.
    let imported = 0;
    // Store recent game IDs so imported games can be marked as currently playing.
    const recentAppIds = new Set(recentGames.map((g) => g.appId));

    // Loop through all Steam games, but only import games selected by the user.
    for (const game of steamGames) {
      if (!selectedGames.has(game.appId)) continue;
      // Debug log for checking the Steam cover image URL during import.
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

// Add the selected Steam game to the user's app library.
await addToLibrary(currentUser.uid, {
  gameId: `steam_${game.appId}`,
  gameTitle: game.name,
  gameCover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
  genre: "",
  platform: "PC",
  status,
  hoursPlayed: game.playtimeHours || Math.round((game.playtimeMinutes || 0) / 60),
});
        // Increase the count only after the game is added successfully.
        imported++;
      } catch (err) {
        // Continue importing the remaining games even if one game fails.
        console.error(`Failed to import ${game.name}:`, err);
      }
    }

    // Show the final import result screen.
    setImportedCount(imported);
    setStep("done");
    toast.success(lang === "ar" ? `تم استيراد ${imported} لعبة!` : `Imported ${imported} games!`);
    setImporting(false);
  }

  // Returns games based on the selected filter tab.
  function getFilteredGames() {
    if (filter === "played") return steamGames.filter((g) => g.playtimeMinutes > 0);
    if (filter === "unplayed") return steamGames.filter((g) => g.playtimeMinutes === 0);
    return steamGames;
  }

  // Games currently visible in the list after applying the filter.
  const filteredGames = getFilteredGames();

  // Calculate total playtime across all fetched Steam games.
  const totalPlaytime = steamGames.reduce(
    (sum, g) => sum + (g.playtimeHours || (g.playtimeMinutes || 0) / 60),
    0
  );

  // Render the Steam import page UI.
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

      {/* Step 1: show the Steam account connection form. */}
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

      {/* Step 2: show Steam profile, recently played games, filters, and selectable game list. */}
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
                {/* Show recently played games only when the backend returns recent games. */}
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
                {/* Display up to 6 recently played games. */}
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
              {/* Render every game that matches the selected filter. */}
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
                    // Hide broken cover images instead of showing a broken image icon.
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

      {/* Step 3: show the import completion screen. */}
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