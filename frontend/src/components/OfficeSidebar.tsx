import React from 'react';
import { NavLink } from 'react-router-dom';
import { MailQuestion, LogOut, History, Edit3 } from 'lucide-react'; // Import History and Edit3 icons
import { useAuth } from '../contexts/AuthContext'; // For logout
import { useNavigate } from 'react-router-dom';

const OfficeSidebar: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Define common NavLink classes
  const baseLinkClasses = "flex items-center px-3 py-2 rounded-md transition-colors duration-150";
  const activeLinkClasses = "bg-blue-800 text-white"; // Nautical blue active
  const inactiveLinkClasses = "text-blue-100 hover:bg-blue-600 hover:text-white"; // Nautical blue inactive

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-blue-700 text-white p-4 flex flex-col h-full"> {/* Main background to nautical blue */}
      {/* Header */}
      <div className="flex items-center mb-8 px-2">
        {/* You can add a logo/icon here, ensure it's visible on blue */}
        <h1 className="text-xl font-bold text-white">Office Dashboard</h1> {/* Header text to white */}
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
          <li>
            <NavLink
              to="/office/report-management"
              className={({ isActive }) =>
                `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
              }
            >
              <Edit3 size={18} className="mr-3" />
              Report Management
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
