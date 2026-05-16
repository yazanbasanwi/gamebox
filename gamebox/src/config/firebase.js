import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBf8IPXgSJXnm4oNe1NedLNd0hwehkDfpI",
  authDomain: "gameboxapp-4425f.firebaseapp.com",
  projectId: "gameboxapp-4425f",
  storageBucket: "gameboxapp-4425f.firebasestorage.app",
  messagingSenderId: "927010518019",
  appId: "1:927010518019:web:21bc47a5b8458dce7a0a36",
  measurementId: "G-ZHWM5NT499"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;