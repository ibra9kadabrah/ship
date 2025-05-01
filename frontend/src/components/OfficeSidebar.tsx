import React from 'react';
import { NavLink } from 'react-router-dom';
import { MailQuestion, LogOut, History } from 'lucide-react'; // Import History icon
import { useAuth } from '../contexts/AuthContext'; // For logout
import { useNavigate } from 'react-router-dom';

const OfficeSidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Define common NavLink classes
  const baseLinkClasses = "flex items-center px-3 py-2 rounded-md transition-colors duration-150";
  const activeLinkClasses = "bg-gray-900 text-white"; 
  const inactiveLinkClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center mb-8 px-2">
        {/* You can add a logo/icon here */}
        <h1 className="text-xl font-bold">Office Dashboard</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-grow">
        <ul>
          <li>
            <NavLink 
              to="/office" 
              end 
              className={({ isActive }) => 
                `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
              }
            >
              <MailQuestion size={18} className="mr-3" />
              Pending Reports
            </NavLink>
          </li>
          {/* Add Complete History Link */}
          <li>
            <NavLink 
              to="/office/history" 
              className={({ isActive }) => 
                `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
              }
            >
              <History size={18} className="mr-3" />
              Complete History
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Footer/Logout Area */}
      <div className="mt-auto">
         <button
            onClick={handleLogout}
            className={`${baseLinkClasses} ${inactiveLinkClasses} w-full`} // Use link styling for button
          >
            <LogOut size={18} className="mr-3" />
            Logout
          </button>
      </div>
    </div>
  );
};

export default OfficeSidebar;
