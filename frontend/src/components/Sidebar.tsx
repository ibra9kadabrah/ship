import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Anchor, FileText, History, AlertCircle, Loader, LogOut } from 'lucide-react'; // Import icons including LogOut
import { VoyageState } from '../types/report'; // Import VoyageState type
import { useAuth } from '../contexts/AuthContext'; // Import useAuth

// Define props for the Sidebar component
interface SidebarProps {
  voyageState: VoyageState;
}

const Sidebar: React.FC<SidebarProps> = ({ voyageState }) => {
  const { logout } = useAuth(); // Get logout function
  const navigate = useNavigate(); // Get navigate function

  // Define common NavLink classes
  const baseLinkClasses = "flex items-center px-3 py-2 rounded-md transition-colors duration-150";
  const activeLinkClasses = "bg-gray-900 text-white"; // Classes for active link
  const inactiveLinkClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";
  const disabledLinkClasses = "text-gray-500 opacity-50 pointer-events-none cursor-not-allowed"; // Classes for disabled link

  // --- Updated Logic: Check for REPORT_PENDING first ---
  const isReportPending = voyageState === 'REPORT_PENDING';

  // Helper functions to determine link enabled status
  // Disable all if a report is pending
  const isDepartureEnabled = !isReportPending && (voyageState === 'NO_VOYAGE_ACTIVE' || voyageState === 'BERTHED'); // Enable on BERTHED too
  const isNoonEnabled = !isReportPending && (voyageState === 'DEPARTED' || voyageState === 'AT_SEA');
  // Corrected Arrival logic: Should only be enabled AT_SEA or DEPARTED (if first noon is skipped)
  const isArrivalEnabled = !isReportPending && (voyageState === 'DEPARTED' || voyageState === 'AT_SEA'); 
  const isBerthEnabled = !isReportPending && (voyageState === 'ARRIVED' || voyageState === 'BERTHED');
  // --- End Updated Logic ---

  // Function to get combined classes for a link
  const getNavLinkClass = (isActive: boolean, isEnabled: boolean): string => {
    if (!isEnabled) {
      return `${baseLinkClasses} ${disabledLinkClasses}`;
    }
    return `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;
  };

  return (
    <div className="w-64 bg-gray-800 text-white p-4 flex flex-col h-full">
      {/* Logo/Header */}
      <div className="flex items-center mb-8 px-2">
        <Anchor size={28} className="mr-2 text-blue-400" />
        <h1 className="text-xl font-bold">Maritime Reporting</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-grow">
        {/* History Section */}
        <h3 className="px-3 text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">History</h3>
        <ul>
          <li>
            <NavLink 
              to="/captain" 
              end // Use 'end' prop for the index route
              // Use the new function, always enabled (true)
              className={({ isActive }) => getNavLinkClass(isActive, true)} 
            >
              <History size={18} className="mr-3" />
              Report History
            </NavLink>
          </li>
        </ul>

        {/* Forms Section */}
        <h3 className="px-3 mt-6 text-xs font-semibold uppercase text-gray-500 tracking-wider mb-2">
          Forms 
          {voyageState === 'LOADING' && <Loader size={14} className="inline ml-2 animate-spin" />}
          {voyageState === 'ERROR' && <AlertCircle size={14} className="inline ml-2 text-red-400" />}
        </h3>
        <ul>
          <li>
            <NavLink 
              to="/captain/forms/departure" 
              className={({ isActive }) => getNavLinkClass(isActive, isDepartureEnabled)}
              aria-disabled={!isDepartureEnabled} // Accessibility
            >
              <FileText size={18} className="mr-3" />
              Departure Report
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/captain/forms/noon" 
              className={({ isActive }) => getNavLinkClass(isActive, isNoonEnabled)}
              aria-disabled={!isNoonEnabled} // Accessibility
            >
               <FileText size={18} className="mr-3" />
              Noon Report
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/captain/forms/arrival" 
              className={({ isActive }) => getNavLinkClass(isActive, isArrivalEnabled)}
              aria-disabled={!isArrivalEnabled} // Accessibility
            >
               <FileText size={18} className="mr-3" />
              Arrival Report
            </NavLink>
          </li>
           <li>
            <NavLink 
              to="/captain/forms/berth" 
              className={({ isActive }) => getNavLinkClass(isActive, isBerthEnabled)}
              aria-disabled={!isBerthEnabled} // Accessibility
            >
               <FileText size={18} className="mr-3" />
              Berth Report
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Footer/Logout Area */}
      <div className="mt-auto">
         {/* Add Logout Button */}
         <button
            onClick={() => { logout(); navigate('/login'); }} // Call logout and navigate
            className={`${baseLinkClasses} ${inactiveLinkClasses} w-full`} // Use link styling
          >
            <LogOut size={18} className="mr-3" />
            Logout
          </button>
      </div>
    </div>
  );
};

export default Sidebar;
