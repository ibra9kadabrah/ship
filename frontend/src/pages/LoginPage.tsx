import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Anchor } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth hook

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Removed rememberMe state as it's not implemented in AuthContext
  
  const { login, isLoading, error: authError, token, user } = useAuth(); // Get login function and state from context
  const navigate = useNavigate();
  
  // Local error state for form validation
  const [formError, setFormError] = useState(''); 

  // Redirect effect - runs when token or user state changes
  useEffect(() => {
    // Don't redirect if loading or no token/user yet
    if (isLoading || !token || !user) return; 

    // Redirect based on role
    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
    } else if (user.role === 'captain') {
      navigate('/captain', { replace: true });
    } else if (user.role === 'office') { // Add redirection for office role
      navigate('/office', { replace: true });
    }
    
  }, [token, user, isLoading, navigate]); // Added isLoading to dependencies

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(''); // Clear previous form errors
    
    // Basic validation
    if (!username.trim() || !password.trim()) {
      setFormError('Username and password are required');
      return;
    }

    // Call the login function from AuthContext
    await login({ username, password });
    
    // Navigation will be handled by the effect or DefaultRedirect in App.tsx
    // No need for direct navigation here after login call completes
  };

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Left panel */}
      <div className="hidden md:flex md:w-1/3 lg:w-1/4 bg-blue-900 flex-col">
        <div className="p-8">
          <div className="flex items-center text-white mb-8">
            <Anchor size={32} className="mr-3" />
            <h1 className="text-2xl font-bold">Maritime Reporting</h1>
          </div>
          
          <div className="text-blue-200 mt-8">
            <h2 className="text-xl mb-4">Welcome to the</h2>
            <h3 className="text-3xl font-bold mb-6">Voyage Reporting System</h3>
            <p className="opacity-75">
              The comprehensive solution for maritime voyage reporting and management.
              Track your fleet, manage reports, and ensure compliance.
            </p>
          </div>
        </div>
        
        <div className="mt-auto p-8 text-white text-sm opacity-70">
          <p>© 2025 Maritime Solutions Inc.</p>
          <p>Version 1.2.0</p> {/* Consider making this dynamic later */}
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile only header */}
          <div className="flex items-center justify-center mb-8 md:hidden">
            <Anchor size={28} className="text-blue-900 mr-2" />
            <h1 className="text-2xl font-bold text-blue-900">Maritime Reporting</h1>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Log In</h2>
            
            {/* Display form validation error OR authentication error */}
            {(formError || authError) && (
              <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                {formError || authError}
              </div>
            )}
            
            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                  disabled={isLoading} // Disable input while loading
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                  disabled={isLoading} // Disable input while loading
                />
              </div>
              
              {/* Removed Remember Me / Forgot Password for simplicity */}
              {/* <div className="flex items-center justify-between mb-6"> ... </div> */}
              
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </span>
                ) : (
                  'Log In'
                )}
              </button>
            </form>
            
            {/* Removed demo credentials display */}
            {/* <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600"> ... </div> */}
          </div>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Having trouble logging in? Contact your system administrator or call</p>
            <p className="font-medium">Maritime Support: +1-800-555-0123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
