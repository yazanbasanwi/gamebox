// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "../config/firebase";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create or update user document in Firestore
  async function createUserDocument(user, extraData = {}) {
    const userRef = doc(db, "users", user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      // New user — create profile document
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || extraData.username || "",
        username: extraData.username || user.email.split("@")[0],
        avatarURL: user.photoURL || "",
        bio: "",
        favoriteGenres: [],
        role: "user", // "user" | "admin"
        followers: [],
        following: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, userData);
      return userData;
    } else {
      return snapshot.data();
    }
  }

  // Fetch user profile from Firestore
  async function fetchUserProfile(uid) {
    const userRef = doc(db, "users", uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      setUserProfile({ id: snapshot.id, ...snapshot.data() });
    }
  }

  // Register with email/password
  async function register(email, password, username) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: username });
    await createUserDocument(result.user, { username });
    await fetchUserProfile(result.user.uid);
    return result.user;
  }

  // Login with email/password
  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await fetchUserProfile(result.user.uid);
    return result.user;
  }

  // Login with Google
  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    await createUserDocument(result.user);
    await fetchUserProfile(result.user.uid);
    return result.user;
  }

  // Logout
  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  // Reset password
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    register,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
