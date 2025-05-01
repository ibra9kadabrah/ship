import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import apiClient from '../services/api';
import { UserLoginDTO, User } from '../types/user'; // Corrected import path

// Define the shape of the context data
interface AuthContextType {
  token: string | null;
  user: Omit<User, 'password'> | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: UserLoginDTO) => Promise<void>;
  logout: () => void;
}

// Create the context with a default value (can be null or an initial state)
const AuthContext = createContext<AuthContextType | null>(null);

// Define the props for the provider component
interface AuthProviderProps {
  children: ReactNode;
}

// Create the provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [user, setUser] = useState<Omit<User, 'password'> | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading until initial check is done
  const [error, setError] = useState<string | null>(null);

  // Effect to check for existing token and fetch user data on initial load
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('authToken');
      if (storedToken) {
        setToken(storedToken);
        // Optionally: Add an endpoint like /api/auth/me to verify token and get user data
        // For now, we assume the token is valid if it exists.
        // We might need to store user info in localStorage too upon login.
        const storedUser = localStorage.getItem('authUser');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (e) {
            console.error("Failed to parse stored user data", e);
            localStorage.removeItem('authUser'); // Clear invalid data
            localStorage.removeItem('authToken');
            setToken(null);
          }
        } else {
           // If no user data, maybe token is stale? Log out.
           logout(); 
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Login function
  const login = async (credentials: UserLoginDTO) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post<{ user: Omit<User, 'password'>; token: string }>('/auth/login', credentials);
      const { user: loggedInUser, token: receivedToken } = response.data;
      
      localStorage.setItem('authToken', receivedToken);
      localStorage.setItem('authUser', JSON.stringify(loggedInUser)); // Store user info
      setToken(receivedToken);
      setUser(loggedInUser);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      // Ensure state is cleared on error
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
    // Optionally redirect to login page here or handle in routing
  };

  // Value provided to consuming components
  const value = {
    token,
    user,
    isLoading,
    error,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
