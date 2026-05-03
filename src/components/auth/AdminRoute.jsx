// src/components/auth/AdminRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Redirects to / if user is not an admin
export default function AdminRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser || userProfile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}
