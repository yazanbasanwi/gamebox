# 🎮 GameBox

**A social game review and discovery platform**
CPIT-498/499 Capstone Project — King Abdulaziz University

**Team:** Hamad Alqriqri, Yazan Basnawi, Rakan Alsolami
**Supervisor:** Dr. Fawaz Alsaadi

---

## Features

- **Flexible Reviews** — Simple star ratings or detailed multi-category reviews (Gameplay, Graphics, Audio, Story, Replayability)
- **Game Browsing** — Search and discover games powered by the IGDB/Twitch API
- **Personal Library** — Track games as Playing, Completed, or Want to Play
- **Social Feed** — Community reviews with likes and comments
- **AI Recommendations** — Personalized game suggestions (planned)
- **Accessibility** — Text-to-Speech, Speech-to-Text (planned)
- **Admin Dashboard** — User management, content moderation, reports

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6 |
| Backend | Node.js + Express (IGDB proxy) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Email/Password + Google) |
| Game Data | IGDB API via Twitch OAuth |
| Hosting | Firebase Hosting (or Vercel/Netlify) |

---

## Project Structure

```
gamebox/
├── public/
│   └── index.html
├── server/                    # Express backend (IGDB proxy)
│   ├── index.js
│   └── package.json
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── AdminRoute.jsx
│   │   ├── layout/
│   │   │   └── Navbar.jsx
│   │   └── pages/
│   │       ├── HomePage.jsx
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       ├── ForgotPasswordPage.jsx
│   │       ├── BrowsePage.jsx
│   │       ├── GameDetailPage.jsx
│   │       ├── FeedPage.jsx
│   │       ├── LibraryPage.jsx
│   │       ├── ProfilePage.jsx
│   │       └── AdminPage.jsx
│   ├── config/
│   │   └── firebase.js        # Firebase initialization
│   ├── context/
│   │   └── AuthContext.jsx     # Auth state management
│   ├── services/
│   │   ├── firestoreService.js # All Firestore CRUD operations
│   │   └── igdbService.js      # IGDB/Twitch API calls
│   ├── styles/
│   │   └── index.css           # Global styles
│   ├── App.jsx                 # Root component + routing
│   └── index.js                # Entry point
├── .env.example                # Environment variables template
├── .gitignore
├── firestore.rules             # Firestore security rules
└── package.json
```

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/gamebox.git
cd gamebox
npm install
cd server && npm install && cd ..
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project called **GameBox**
3. **Enable Authentication:**
   - Go to Authentication → Sign-in method
   - Enable **Email/Password**
   - Enable **Google**
4. **Create Firestore Database:**
   - Go to Firestore Database → Create database
   - Start in **test mode** (you'll deploy rules later)
5. **Get your config:**
   - Go to Project Settings → General → Your apps → Web app
   - Register a web app and copy the config object

### 3. Twitch/IGDB API Setup

1. Go to [Twitch Developer Console](https://dev.twitch.tv/console)
2. Register a new application
3. Set OAuth Redirect URL to `http://localhost:3000`
4. Copy your **Client ID** and generate a **Client Secret**

### 4. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Firebase and Twitch credentials.

Also update `server/index.js` with your Twitch credentials (or use environment variables).

### 5. Update Firebase Config

Edit `src/config/firebase.js` and replace the placeholder config with your actual Firebase project config.

### 6. Run the App

**Terminal 1 — Backend (IGDB Proxy):**
```bash
cd server
node index.js
```

**Terminal 2 — Frontend:**
```bash
npm start
```

The app will open at `http://localhost:3000`

### 7. Deploy Firestore Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

### 8. Create an Admin User

After registering your first account, manually set `role: "admin"` in Firestore:
1. Go to Firebase Console → Firestore
2. Find your user document in the `users` collection
3. Edit the `role` field from `"user"` to `"admin"`

---

## Firestore Schema

```
users/{uid}
  ├── uid, email, displayName, username
  ├── avatarURL, bio, favoriteGenres
  ├── role ("user" | "admin" | "banned")
  ├── followers[], following[]
  ├── createdAt, updatedAt
  └── library/{gameId}  (subcollection)
        ├── gameId, gameTitle, gameCover
        ├── status ("playing" | "completed" | "plan_to_play")
        ├── progress, hoursPlayed, userRating
        └── addedAt, updatedAt

reviews/{reviewId}
  ├── userId, username, gameId, gameTitle, gameCover
  ├── reviewType ("simple" | "detailed")
  ├── overallRating, weightedScore
  ├── storyRating, gameplayRating, graphicsRating
  ├── audioRating, replayabilityRating
  ├── textContent, mediaURLs[]
  ├── likes[], likesCount, commentsCount
  ├── createdAt, updatedAt
  └── comments/{commentId}  (subcollection)
        ├── userId, username, text
        └── createdAt

reports/{reportId}
  ├── reportedItemId, reportedItemType
  ├── reportedBy, reason
  ├── status ("pending" | "resolved" | "dismissed")
  └── createdAt
```

---

## Routes

| Path | Component | Auth Required |
|------|-----------|:---:|
| `/` | HomePage | No |
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/forgot-password` | ForgotPasswordPage | No |
| `/browse` | BrowsePage | No |
| `/game/:id` | GameDetailPage | No |
| `/feed` | FeedPage | No |
| `/library` | LibraryPage | Yes |
| `/profile` | ProfilePage | Yes |
| `/admin` | AdminPage | Admin |

---

## Next Steps (CPIT-499)

- [ ] Connect IGDB API and test game browsing
- [ ] Implement full review creation flow with weighted scoring
- [ ] Build comment system on reviews
- [ ] Add follow/unfollow social features
- [ ] Implement AI recommendation engine
- [ ] Add TTS / STT accessibility features
- [ ] Deploy to Firebase Hosting
- [ ] Write unit tests
