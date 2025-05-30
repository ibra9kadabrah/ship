import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Anchor, FileText, History, AlertCircle, Loader, LogOut, LayoutDashboard } from 'lucide-react'; // Import icons including LogOut and LayoutDashboard
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
  const activeLinkClasses = "bg-blue-800 text-white"; // Nautical blue active
  const inactiveLinkClasses = "text-blue-100 hover:bg-blue-600 hover:text-white"; // Nautical blue inactive
  const disabledLinkClasses = "text-blue-300 opacity-50 pointer-events-none cursor-not-allowed"; // Adjusted disabled for blue bg

  // --- Updated Logic: Check for REPORT_PENDING first ---
  const isReportPending = voyageState === 'REPORT_PENDING';

  // Helper functions to determine link enabled status
  // Disable all if a report is pending
  const isDepartureEnabled = !isReportPending && (voyageState === 'NO_VOYAGE_ACTIVE' || voyageState === 'ARRIVED' || voyageState === 'AT_ANCHOR' || voyageState === 'BERTHED');
  const isNoonEnabled = !isReportPending && (voyageState === 'DEPARTED' || voyageState === 'AT_SEA');
  // Corrected Arrival logic: Should only be enabled AT_SEA or DEPARTED (if first noon is skipped)
  const isArrivalEnabled = !isReportPending && (voyageState === 'DEPARTED' || voyageState === 'AT_SEA');
  const isArrivalAnchorNoonEnabled = !isReportPending && (voyageState === 'ARRIVED' || voyageState === 'AT_ANCHOR' || voyageState === 'AT_SEA'); // AT_SEA might cover AT_ANCHOR if not explicitly set
  const isBerthEnabled = !isReportPending && (voyageState === 'ARRIVED' || voyageState === 'AT_ANCHOR' || voyageState === 'BERTHED');
  // --- End Updated Logic ---

  // Function to get combined classes for a link
  const getNavLinkClass = (isActive: boolean, isEnabled: boolean): string => {
    if (!isEnabled) {
      return `${baseLinkClasses} ${disabledLinkClasses}`;
    }
    return `${baseLinkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`;
  };

  return (
    <div className="w-64 bg-blue-700 text-white p-4 flex flex-col h-full"> {/* Main background to nautical blue */}
      {/* Logo/Header */}
      <div className="flex items-center mb-8 px-2">
        <Anchor size={28} className="mr-2 text-blue-300" /> {/* Adjusted icon color for blue bg */}
        <h1 className="text-xl font-bold text-white">Maritime Reporting</h1> {/* Header text to white */}
      </div>

      {/* Navigation */}
      <nav className="flex-grow">
        {/* History Section */}
        <h3 className="px-3 text-xs font-semibold uppercase text-blue-300 tracking-wider mb-2">Overview</h3> {/* Changed "History" to "Overview" and color */}
        <ul>
          <li>
            <NavLink
              to="/captain/dashboard-display" // Path to the new dashboard
              end // This is now the main captain index/dashboard
              className={({ isActive }) => getNavLinkClass(isActive, true)} // Always enabled
            >
              <LayoutDashboard size={18} className="mr-3" /> 
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink 
              to="/captain/history" // Updated path for report history
              // Use the new function, always enabled (true)
              className={({ isActive }) => getNavLinkClass(isActive, true)} 
            >
              <History size={18} className="mr-3" />
              Report History
            </NavLink>
          </li>
        </ul>

        {/* Forms Section */}
        <h3 className="px-3 mt-6 text-xs font-semibold uppercase text-blue-300 tracking-wider mb-2"> {/* Section header color */}
          Forms 
          {voyageState === 'LOADING' && <Loader size={14} className="inline ml-2 animate-spin text-blue-200" />} {/* Adjusted loader color */}
          {voyageState === 'ERROR' && <AlertCircle size={14} className="inline ml-2 text-red-300" />} {/* Adjusted error icon color */}
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
              to="/captain/forms/arrival-anchor-noon" 
              className={({ isActive }) => getNavLinkClass(isActive, isArrivalAnchorNoonEnabled)}
              aria-disabled={!isArrivalAnchorNoonEnabled}
            >
               <FileText size={18} className="mr-3" />
              Arr. Anchor Noon
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
