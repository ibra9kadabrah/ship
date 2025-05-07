import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { CurrentVoyageDetails } from '../types/report'; // Use the updated type
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { AlertCircle, Ship, Anchor, ArrowRightCircle, Info, UserCircle } from 'lucide-react'; // Icons, added UserCircle
import logo from '../assets/logo.jpg'; // Import the logo

const CaptainDisplayDashboardPage: React.FC = () => {
  const { user } = useAuth(); // Get user for welcome message
  const [dashboardData, setDashboardData] = useState<CurrentVoyageDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<CurrentVoyageDetails>('/voyages/current/details');
        setDashboardData(response.data);
      } catch (err: any) {
        console.error("Error fetching captain dashboard data:", err);
        if (err.response?.status === 404) {
          setError(err.response?.data?.message || "No active voyage or vessel assignment found.");
        } else {
          setError(err.response?.data?.message || "Failed to load dashboard data.");
        }
        setDashboardData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div className="text-center p-6">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg shadow-md flex items-center">
        <AlertCircle className="text-red-500 mr-3 h-8 w-8" />
        <div>
          <h3 className="text-lg font-semibold text-red-700">Error Loading Dashboard</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg shadow-md flex items-center">
        <Info className="text-yellow-500 mr-3 h-8 w-8" />
        <div>
          <h3 className="text-lg font-semibold text-yellow-700">No Voyage Data</h3>
          <p className="text-yellow-600">No active voyage details available to display on the dashboard.</p>
        </div>
      </div>
    );
  }

  const {
    vesselName,
    vesselImoNumber,
    vesselDeadweight,
    departurePort,
    destinationPort,
    voyageDistance,
    totalDistanceTravelled,
    distanceToGo,
    etaDate, // Destructure etaDate
    etaTime, // Destructure etaTime
    actualDepartureDate, // Destructure ATD
    actualDepartureTime, // Destructure ATD
  } = dashboardData;

  const totalVoyageDist = voyageDistance ?? 0;
  const distTravelled = totalDistanceTravelled ?? 0;
  // Ensure distanceToGo is not negative and not more than totalVoyageDist
  const distToGo = Math.max(0, Math.min(distanceToGo ?? totalVoyageDist, totalVoyageDist));
  
  let progressPercentage = 0;
  if (totalVoyageDist > 0) {
    // Calculate progress based on distance travelled if available, otherwise use distance to go
    if (totalDistanceTravelled !== null && totalDistanceTravelled !== undefined) {
        progressPercentage = (distTravelled / totalVoyageDist) * 100;
    } else { // Fallback if totalDistanceTravelled is not available from latest report
        progressPercentage = ((totalVoyageDist - distToGo) / totalVoyageDist) * 100;
    }
  }
  progressPercentage = Math.max(0, Math.min(progressPercentage, 100)); // Clamp between 0 and 100

  return (
    <div className="p-6 bg-slate-100 min-h-screen"> {/* Changed main background to bg-slate-100 */}
      <div className="max-w-4xl mx-auto"> {/* Centering container for overall content */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center">
            <img src={logo} alt="Company Logo" className="h-12 w-auto mr-4 rounded" /> {/* Logo Added */}
            <h1 className="text-3xl font-bold text-gray-800">Captain's Dashboard</h1>
          </div>
          {user && (
            <div className="flex items-center text-sm text-gray-600 bg-white px-4 py-2 rounded-full shadow">
              <UserCircle size={20} className="text-blue-500 mr-2" />
              <span>Welcome, <strong>{user.name}</strong>!</span>
            </div>
          )}
        </div>

        <div className="space-y-8"> {/* Container for cards to apply consistent spacing */}
          {/* Vessel Information Card - bg-white is fine against bg-slate-100 */}
          <div className="bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="flex items-center mb-4">
              <Ship size={32} className="text-blue-600 mr-4" />
              <h2 className="text-2xl font-semibold text-gray-700">Vessel Information</h2>
            </div> {/* This div for the header (icon + title) is correct */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-base">
              <p><strong className="font-medium text-gray-600">Name:</strong> {vesselName || 'N/A'}</p>
              <p><strong className="font-medium text-gray-600">IMO:</strong> {vesselImoNumber || 'N/A'}</p>
              <p><strong className="font-medium text-gray-600">DWT:</strong> {vesselDeadweight ? `${vesselDeadweight} MT` : 'N/A'}</p>
            </div>
          </div> {/* This closes the Vessel Information Card correctly */}

      {/* Voyage Details Card */}
      <div className="bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow duration-300">
        <div className="flex items-center mb-6">
          <Anchor size={32} className="text-green-600 mr-4" />
          <h2 className="text-2xl font-semibold text-gray-700">Current Voyage</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 items-center mb-6 text-lg">
          <div className="text-center md:text-left mb-2 md:mb-0">
            <p className="text-sm text-gray-500 uppercase">FROM</p>
            <p className="font-semibold text-gray-800">{departurePort?.toUpperCase() || 'N/A'}</p>
            {actualDepartureDate && actualDepartureTime && (
              <p className="text-xs text-gray-500 mt-1">ATD: {actualDepartureDate} {actualDepartureTime}</p>
            )}
          </div>
          <div className="flex justify-center items-center my-2 md:my-0 text-center"> {/* Added text-center for the column */}
            <ArrowRightCircle size={28} className="text-gray-400" />
          </div>
          <div className="text-center md:text-right mb-2 md:mb-0">
            <p className="text-sm text-gray-500 uppercase">TO</p>
            <p className="font-semibold text-gray-800">{destinationPort?.toUpperCase() || 'N/A'}</p>
            {etaDate && etaTime && (
              <p className="text-xs text-gray-500 mt-1">ETA: {etaDate} {etaTime}</p>
            )}
          </div>
        </div>
        {/* Removed separate ETA display as it's now under TO port */}
        
        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between mb-1 text-base">
            <span className="font-semibold text-blue-700">Voyage Progress</span>
            <span className="font-semibold text-blue-700">{progressPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-5 dark:bg-gray-700 shadow-inner overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-700 h-5 rounded-full transition-all duration-1000 ease-out flex items-center justify-center text-white text-xs font-bold"
              style={{ width: `${progressPercentage}%` }}
            >
             {progressPercentage > 10 && `${progressPercentage.toFixed(0)}%`}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-700">
            <span>Travelled: <strong>{distTravelled.toFixed(1)} NM</strong></span>
            <span>To Go: <strong>{distToGo.toFixed(1)} NM</strong> / Total: <strong>{totalVoyageDist.toFixed(1)} NM</strong></span>
          </div>
        </div>
      </div> {/* End of Voyage Details Card */}
     </div> {/* End of space-y-8 cards container */}
    </div> {/* End of max-w-4xl centering container */}
  </div> // This is the root div for "p-6 bg-gray-50 min-h-screen"
  ); 
};

export default CaptainDisplayDashboardPage;
