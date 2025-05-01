import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/user'; // Import UserRole type

// Define props for the component, including allowed roles
interface ProtectedRouteProps {
  roles?: UserRole[]; // Optional array of allowed roles
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles }) => {
  const { token, user, isLoading } = useAuth();

  if (isLoading) {
    // You might want a more sophisticated loading spinner here
    // You might want a more sophisticated loading spinner here
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // 1. Check if user is logged in (has token)
  if (!token) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  // 2. Check if specific roles are required and if the user has one of them
  if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
    // Redirect to login (or a dedicated 'Unauthorized' page) if role not allowed
    // For simplicity, redirecting to login for now.
    // than dropping them off on the home page.
    return <Navigate to="/login" replace />;
  }

  // If authenticated and authorized, render the child routes
  return <Outlet />;
};

export default ProtectedRoute;
