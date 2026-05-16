// src/services/firestoreService.js
// ============================================================
// Firestore Service — All database CRUD operations
// ============================================================
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
} from "firebase/firestore";
import { db } from "../config/firebase";

// ──────────────────────────────────────────────
// REVIEWS
// ──────────────────────────────────────────────

export async function createReview(reviewData) {
  const reviewsRef = collection(db, "reviews");
  const review = {
    userId: reviewData.userId,
    username: reviewData.username,
    gameId: reviewData.gameId,
    gameTitle: reviewData.gameTitle,
    gameCover: reviewData.gameCover || "",
    reviewType: reviewData.reviewType || "simple",
    overallRating: reviewData.overallRating || 0,
    storyRating: reviewData.storyRating || null,
    gameplayRating: reviewData.gameplayRating || null,
    graphicsRating: reviewData.graphicsRating || null,
    audioRating: reviewData.audioRating || null,
    replayabilityRating: reviewData.replayabilityRating || null,
    weightedScore: reviewData.weightedScore || reviewData.overallRating,
    textContent: reviewData.textContent || "",
    mediaURLs: reviewData.mediaURLs || [],
    likes: [],
    likesCount: 0,
    commentsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(reviewsRef, review);
  return { id: docRef.id, ...review };
}

export async function getGameReviews(gameId) {
  const q = query(
    collection(db, "reviews"),
    where("gameId", "==", String(gameId)),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getUserReviews(userId) {
  const q = query(
    collection(db, "reviews"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function getLatestReviews(count = 20) {
  const q = query(
    collection(db, "reviews"),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function updateReview(reviewId, updates) {
  const reviewRef = doc(db, "reviews", reviewId);
  await updateDoc(reviewRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteReview(reviewId) {
  await deleteDoc(doc(db, "reviews", reviewId));
}

export async function toggleReviewLike(reviewId, userId) {
  const reviewRef = doc(db, "reviews", reviewId);
  const snapshot = await getDoc(reviewRef);
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  const isLiked = data.likes?.includes(userId);
  await updateDoc(reviewRef, {
    likes: isLiked ? arrayRemove(userId) : arrayUnion(userId),
    likesCount: increment(isLiked ? -1 : 1),
  });
  return !isLiked;
}

// ──────────────────────────────────────────────
// COMMENTS
// ──────────────────────────────────────────────

export async function addComment(reviewId, commentData) {
  const commentsRef = collection(db, "reviews", reviewId, "comments");
  const comment = {
    userId: commentData.userId,
    username: commentData.username,
    text: commentData.text,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(commentsRef, comment);
  const reviewRef = doc(db, "reviews", reviewId);
  await updateDoc(reviewRef, { commentsCount: increment(1) });
  return { id: docRef.id, ...comment };
}

export async function getComments(reviewId) {
  const q = query(
    collection(db, "reviews", reviewId, "comments"),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function deleteComment(reviewId, commentId) {
  await deleteDoc(doc(db, "reviews", reviewId, "comments", commentId));
  const reviewRef = doc(db, "reviews", reviewId);
  await updateDoc(reviewRef, { commentsCount: increment(-1) });
}

// ──────────────────────────────────────────────
// GAME LIBRARY
// ──────────────────────────────────────────────

export async function addToLibrary(userId, gameData) {
  const libraryRef = doc(db, "users", userId, "library", String(gameData.gameId));
  await setDoc(libraryRef, {
    gameId: String(gameData.gameId),
    gameTitle: gameData.gameTitle,
    gameCover: gameData.gameCover || "",
    genre: gameData.genre || "",
    platform: gameData.platform || "",
    status: gameData.status || "plan_to_play",
    userRating: gameData.userRating || null,
    progress: gameData.progress || 0,
    hoursPlayed: gameData.hoursPlayed || 0,
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserLibrary(userId) {
  const libraryRef = collection(db, "users", userId, "library");
  const snapshot = await getDocs(libraryRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function updateLibraryEntry(userId, gameId, updates) {
  const entryRef = doc(db, "users", userId, "library", String(gameId));
  await updateDoc(entryRef, { ...updates, updatedAt: serverTimestamp() });
}

export async function removeFromLibrary(userId, gameId) {
  await deleteDoc(doc(db, "users", userId, "library", String(gameId)));
}

// ──────────────────────────────────────────────
// SOCIAL — Follow / Unfollow
// ──────────────────────────────────────────────

export async function followUser(currentUserId, targetUserId) {
  const currentUserRef = doc(db, "users", currentUserId);
  const targetUserRef = doc(db, "users", targetUserId);
  await updateDoc(currentUserRef, { following: arrayUnion(targetUserId) });
  await updateDoc(targetUserRef, { followers: arrayUnion(currentUserId) });
}

export async function unfollowUser(currentUserId, targetUserId) {
  const currentUserRef = doc(db, "users", currentUserId);
  const targetUserRef = doc(db, "users", targetUserId);
  await updateDoc(currentUserRef, { following: arrayRemove(targetUserId) });
  await updateDoc(targetUserRef, { followers: arrayRemove(currentUserId) });
}

// ──────────────────────────────────────────────
// USER PROFILE
// ──────────────────────────────────────────────

export async function getUserProfile(userId) {
  const userRef = doc(db, "users", userId);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) return { id: snapshot.id, ...snapshot.data() };
  return null;
}

export async function updateUserProfile(userId, updates) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
}

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────

export async function getAllUsers() {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function banUser(userId) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { role: "banned", updatedAt: serverTimestamp() });
}

export async function unbanUser(userId) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { role: "user", updatedAt: serverTimestamp() });
}

// ──────────────────────────────────────────────
// REPORTS
// ──────────────────────────────────────────────

export async function createReport(reportData) {
  const reportsRef = collection(db, "reports");
  await addDoc(reportsRef, {
    reportedItemId: reportData.itemId,
    reportedItemType: reportData.itemType,
    reportedBy: reportData.reportedBy,
    reason: reportData.reason,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

export async function getReports() {
  const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function resolveReport(reportId, action) {
  const reportRef = doc(db, "reports", reportId);
  await updateDoc(reportRef, { status: action });
}
