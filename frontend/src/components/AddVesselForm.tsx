import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { User } from '../types/user'; // Use frontend User type

// Define the structure for the vessel creation payload
interface CreateVesselPayload {
  name: string;
  flag: string;
  imoNumber: string;
  type: string; 
  deadweight: number;
  captainId: string;
}

const vesselTypes = [
  "Bulk Carrier", "Oil Tanker", "Chemical Tanker", "Gas Carrier", "LNG Carrier",
  "Container Ship", "General Cargo Ship", "Refrigerated Cargo Carrier",
  "Combination Carrier", "Ro-ro Ship", "Passenger Ship", "Other Cargo Ship"
];

const AddVesselForm: React.FC = () => {
  const [name, setName] = useState('');
  const [flag, setFlag] = useState('');
  const [imoNumber, setImoNumber] = useState('');
  const [type, setType] = useState(''); // Initialize with empty string for default "Select" option
  const [deadweight, setDeadweight] = useState('');
  const [selectedCaptainId, setSelectedCaptainId] = useState('');
  
  const [captains, setCaptains] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch captains on component mount
  useEffect(() => {
    const fetchCaptains = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const response = await apiClient.get<User[]>('/auth/users?role=captain');
        setCaptains(response.data);
      } catch (err: any) {
        console.error('Error fetching captains:', err);
        setFetchError(err.response?.data?.error || 'Failed to fetch captains list.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCaptains();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccess(null);

    if (!name.trim() || !flag.trim() || !imoNumber.trim() || !type.trim() || !deadweight.trim() || !selectedCaptainId) {
      setSubmitError('All fields are required, including vessel type and selecting a captain.');
      return;
    }
    const dwtNumber = parseFloat(deadweight);
    if (isNaN(dwtNumber) || dwtNumber <= 0) {
        setSubmitError('Deadweight must be a positive number.');
        return;
    }

    setIsLoading(true);
    try {
      const payload: CreateVesselPayload = { 
        name, 
        flag, 
        imoNumber, 
        type, 
        deadweight: dwtNumber, 
        captainId: selectedCaptainId 
      };
      await apiClient.post('/vessels', payload); 
      setSuccess(`Successfully added vessel: ${name}`);
      setName('');
      setFlag('');
      setImoNumber('');
      setType(''); 
      setDeadweight('');
      setSelectedCaptainId('');
    } catch (err: any) {
      console.error('Error adding vessel:', err);
      setSubmitError(err.response?.data?.error || 'Failed to add vessel.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fetchError && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
          Error loading captains: {fetchError}
        </div>
      )}
       {submitError && (
        <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
          {submitError}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm">
          {success}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="vessel-name" className="block text-sm font-medium text-gray-700 mb-1">
            Vessel Name
          </label>
          <input
            id="vessel-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Sea Explorer"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="vessel-flag" className="block text-sm font-medium text-gray-700 mb-1">
            Flag
          </label>
          <input
            id="vessel-flag"
            type="text"
            value={flag}
            onChange={(e) => setFlag(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Panama"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="vessel-imo" className="block text-sm font-medium text-gray-700 mb-1">
            IMO Number
          </label>
          <input
            id="vessel-imo"
            type="text"
            value={imoNumber}
            onChange={(e) => setImoNumber(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 9123456"
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="vessel-type" className="block text-sm font-medium text-gray-700 mb-1">
            Vessel Type
          </label>
          <select
            id="vessel-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          >
            <option value="" disabled>-- Select Vessel Type --</option>
            {vesselTypes.map((vesselType) => (
              <option key={vesselType} value={vesselType}>
                {vesselType}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="vessel-dwt" className="block text-sm font-medium text-gray-700 mb-1">
            Deadweight (DWT)
          </label>
          <input
            id="vessel-dwt"
            type="number" 
            value={deadweight}
            onChange={(e) => setDeadweight(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 50000"
            disabled={isLoading}
            min="0" 
          />
        </div>
        <div className="md:col-span-2"> 
          <label htmlFor="vessel-captain" className="block text-sm font-medium text-gray-700 mb-1">
            Assign Captain
          </label>
          <select
            id="vessel-captain"
            value={selectedCaptainId}
            onChange={(e) => setSelectedCaptainId(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading || fetchError !== null || captains.length === 0} 
          >
            <option value="" disabled>
              {isLoading ? 'Loading captains...' : (fetchError ? 'Error loading' : (captains.length === 0 ? 'No captains available' : '-- Select a Captain --'))}
            </option>
            {captains.map((captain) => (
              <option key={captain.id} value={captain.id}>
                {captain.name} ({captain.username})
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || fetchError !== null} 
        className={`w-full py-2 px-4 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition duration-150 ease-in-out ${
          (isLoading || fetchError !== null) ? 'opacity-70 cursor-not-allowed' : ''
        }`}
      >
        {isLoading ? 'Processing...' : 'Add Vessel'}
      </button>
    </form>
  );
};

export default AddVesselForm;
