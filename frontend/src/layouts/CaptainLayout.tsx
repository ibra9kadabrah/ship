import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; // Import the actual Sidebar component
import apiClient from '../services/api'; // Import apiClient
import { VoyageState } from '../types/report'; // Import VoyageState type

const CaptainLayout: React.FC = () => {
  const [voyageState, setVoyageState] = useState<VoyageState>('LOADING'); // Initial state
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoyageState = async () => {
      setError(null); // Reset error
      setVoyageState('LOADING'); // Set loading state
      try {
        // Corrected path: remove '/api' prefix as it's in baseURL
        const response = await apiClient.get<{ voyageState: VoyageState }>('/voyages/current/state'); 
        setVoyageState(response.data.voyageState);
      } catch (err: any) {
        console.error("Error fetching voyage state:", err);
        setError(err.response?.data?.message || "Failed to load voyage state.");
        setVoyageState('ERROR'); // Set error state
      }
    };

    fetchVoyageState();
    // TODO: Consider adding logic to refetch state after report submission if needed
  }, []); // Fetch only on component mount

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Pass voyageState to Sidebar */}
      <Sidebar voyageState={voyageState} /> 
      
      {/* Main content area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Optionally display loading/error state here */}
        {voyageState === 'LOADING' && <p>Loading voyage status...</p>}
        {voyageState === 'ERROR' && <p className="text-red-600">Error loading voyage status: {error}</p>}
        {voyageState === 'NO_VESSEL_ASSIGNED' && <p className="text-orange-600">No vessel assigned to your account.</p>}
        
        <Outlet /> {/* Nested routes will render here */}
      </main>
    </div>
  );
};

export default CaptainLayout;
