# GameBox

## Setup

### 1. Install dependencies
```
npm install
cd server && npm install && cd ..
```

### 2. Configure Firebase
Edit `src/config/firebase.js` with your Firebase project config.

### 3. Configure server
Create `server/.env`:
```
TWITCH_CLIENT_ID=your_key
TWITCH_CLIENT_SECRET=your_secret
DEEPSEEK_API_KEY=your_key
STEAM_API_KEY=your_key
PORT=5000
```

### 4. Run
Terminal 1: `cd server && node index.js`
Terminal 2: `npm start`
