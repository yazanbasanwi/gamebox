// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";

import HomePage from "./components/pages/HomePage";
import LoginPage from "./components/pages/LoginPage";
import RegisterPage from "./components/pages/RegisterPage";
import ForgotPasswordPage from "./components/pages/ForgotPasswordPage";
import BrowsePage from "./components/pages/BrowsePage";
import GameDetailPage from "./components/pages/GameDetailPage";
import FeedPage from "./components/pages/FeedPage";
import LibraryPage from "./components/pages/LibraryPage";
import ProfilePage from "./components/pages/ProfilePage";
import AdminPage from "./components/pages/AdminPage";
import ListsPage from "./components/pages/ListsPage";
import ListDetailPage from "./components/pages/ListDetailPage";
import JournalPage from "./components/pages/JournalPage";
import CommunityPage from "./components/pages/CommunityPage";

import "./styles/index.css";

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/game/:id" element={<GameDetailPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/user/:userId" element={<ProfilePage />} />
          <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/lists" element={<ProtectedRoute><ListsPage /></ProtectedRoute>} />
          <Route path="/list/:listId" element={<ProtectedRoute><ListDetailPage /></ProtectedRoute>} />
          <Route path="/journal" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="*" element={<div className="page"><div className="empty-state"><h2>404 — Page Not Found</h2></div></div>} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3000, style: { background: "#1a1a2e", color: "#e0e0e0", border: "1px solid #333" } }} />
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}
