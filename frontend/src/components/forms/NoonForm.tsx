import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { NoonFormData, PassageState, CardinalDirection, EngineUnitData, AuxEngineData } from '../../types/report';
import { useNavigate } from 'react-router-dom';
import BunkerConsumptionSection from './sections/BunkerConsumptionSection';
import BunkerSupplySection from './sections/BunkerSupplySection';
import MachineryMEParamsSection from './sections/MachineryMEParamsSection';
import EngineUnitsSection from './sections/EngineUnitsSection';
import AuxEnginesSection from './sections/AuxEnginesSection';

// Helper function to initialize machinery data (similar to DepartureForm)
const initializeEngineUnits = (): EngineUnitData[] => {
  return Array.from({ length: 8 }, (_, i) => ({
    unitNumber: i + 1,
    exhaustTemp: '', underPistonAir: '', pcoOutletTemp: '', jcfwOutletTemp: ''
  }));
};

const initializeAuxEngines = (): AuxEngineData[] => {
  const names = ['DG1', 'DG2', 'V1']; // Assuming these are the standard aux engines
  return names.map(name => ({
    engineName: name,
    load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: ''
  }));
};

const NoonForm: React.FC = () => {
  const { user } = useAuth(); // Use the useAuth hook
  const navigate = useNavigate();
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [formData, setFormData] = useState<NoonFormData>({
    reportType: 'noon',
    vesselId: '', // Will be set after fetching vessel info
    reportDate: '',
    reportTime: '',
    timeZone: '',
    // Passage State
    passageState: 'NOON', // Default state
    distanceSinceLastReport: '',
    // Conditional fields (initialize all, rely on validation/filtering later)
    noonDate: '', noonTime: '', noonLatitude: '', noonLongitude: '',
    sospDate: '', sospTime: '', sospLatitude: '', sospLongitude: '',
    rospDate: '', rospTime: '', rospLatitude: '', rospLongitude: '',
    // Weather
    windDirection: 'N', seaDirection: 'N', swellDirection: 'N',
    windForce: '', seaState: '', swellHeight: '',
    // Bunkers (Consumption)
    meConsumptionLsifo: '', meConsumptionLsmgo: '', meConsumptionCylOil: '', meConsumptionMeOil: '', meConsumptionAeOil: '',
    boilerConsumptionLsifo: '', boilerConsumptionLsmgo: '',
    auxConsumptionLsifo: '', auxConsumptionLsmgo: '',
    // Bunkers (Supply)
    supplyLsifo: '', supplyLsmgo: '', supplyCylOil: '', supplyMeOil: '', supplyAeOil: '',
    // Machinery (ME Params)
    meFoPressure: '', meLubOilPressure: '', meFwInletTemp: '', meLoInletTemp: '', meScavengeAirTemp: '',
    meTcRpm1: '', meTcRpm2: '', meTcExhaustTempIn: '', meTcExhaustTempOut: '', meThrustBearingTemp: '', meDailyRunHours: '',
    // Machinery (Units/Aux)
    engineUnits: initializeEngineUnits(),
    auxEngines: initializeAuxEngines(),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch vessel info
  useEffect(() => {
    const fetchVesselInfo = async () => {
      setIsLoading(true);
      setError(null); // Reset error before fetching
      try {
        // Corrected path: remove '/api' prefix as it's in baseURL
        const response = await apiClient.get<VesselInfo>('/vessels/my-vessel'); 
        setVesselInfo(response.data);
        setFormData(prev => ({ ...prev, vesselId: response.data.id })); // Set vesselId in form data
      } catch (err) {
        setError('Failed to fetch vessel information.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchVesselInfo();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handlers for nested machinery data (similar to DepartureForm)
  const handleEngineUnitChange = (index: number, field: keyof Omit<EngineUnitData, 'unitNumber'>, value: string) => {
    setFormData(prev => {
      const updatedUnits = [...(prev.engineUnits || [])];
      if (updatedUnits[index]) {
        updatedUnits[index] = { ...updatedUnits[index], [field]: value };
      }
      return { ...prev, engineUnits: updatedUnits };
    });
  };

  const handleAuxEngineChange = (index: number, field: keyof Omit<AuxEngineData, 'engineName'>, value: string) => {
    setFormData(prev => {
      const updatedAux = [...(prev.auxEngines || [])];
      if (updatedAux[index]) {
        updatedAux[index] = { ...updatedAux[index], [field]: value };
      }
      return { ...prev, auxEngines: updatedAux };
    });
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Basic Client-side validation (can be expanded)
    if (!formData.reportDate || !formData.reportTime || !formData.distanceSinceLastReport) {
        setError('Report Date, Time, and Distance Since Last are required.');
        setIsLoading(false);
        return;
    }
    // Add validation for conditional fields based on passageState
    if (formData.passageState === 'NOON' && (!formData.noonDate || !formData.noonTime || !formData.noonLatitude || !formData.noonLongitude)) {
         setError('Noon Date, Time, Latitude, and Longitude are required for NOON state.');
         setIsLoading(false);
         return;
    }
     if (formData.passageState === 'SOSP' && (!formData.sospDate || !formData.sospTime || !formData.sospLatitude || !formData.sospLongitude)) {
         setError('SOSP Date, Time, Latitude, and Longitude are required for SOSP state.');
         setIsLoading(false);
         return;
    }
     if (formData.passageState === 'ROSP' && (!formData.rospDate || !formData.rospTime || !formData.rospLatitude || !formData.rospLongitude)) {
         setError('ROSP Date, Time, Latitude, and Longitude are required for ROSP state.');
         setIsLoading(false);
         return;
    }

    // Prepare payload: Convert numbers, filter conditional fields
    const payload = { ...formData };
    const numericFields: (keyof NoonFormData)[] = [
        'distanceSinceLastReport', 'windForce', 'seaState', 'swellHeight',
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours',
        'noonLatitude', 'noonLongitude', 'sospLatitude', 'sospLongitude', 'rospLatitude', 'rospLongitude'
    ];

    numericFields.forEach(field => {
        if (payload[field] !== '' && payload[field] !== undefined && payload[field] !== null) {
            (payload as any)[field] = parseFloat(payload[field] as string);
            if (isNaN((payload as any)[field])) {
                 // Handle potential NaN if input is not a valid number
                 console.warn(`Could not parse numeric field: ${field}, value: ${payload[field]}`);
                 (payload as any)[field] = null; // Or handle error appropriately
            }
        } else {
             (payload as any)[field] = null; // Set to null if empty or undefined
        }
    });

    // Filter out irrelevant conditional fields
    if (payload.passageState !== 'NOON') {
        delete payload.noonDate; delete payload.noonTime; delete payload.noonLatitude; delete payload.noonLongitude;
    }
    if (payload.passageState !== 'SOSP') {
        delete payload.sospDate; delete payload.sospTime; delete payload.sospLatitude; delete payload.sospLongitude;
    }
    if (payload.passageState !== 'ROSP') {
        delete payload.rospDate; delete payload.rospTime; delete payload.rospLatitude; delete payload.rospLongitude;
    }
    
    // Convert machinery fields (similar logic as numericFields)
    payload.engineUnits = payload.engineUnits?.map(unit => {
        const convertedUnit = { ...unit };
        const unitNumericFields: (keyof Omit<EngineUnitData, 'unitNumber'>)[] = ['exhaustTemp', 'underPistonAir', 'pcoOutletTemp', 'jcfwOutletTemp'];
        unitNumericFields.forEach(field => {
            if (convertedUnit[field] !== '' && convertedUnit[field] !== undefined && convertedUnit[field] !== null) {
                (convertedUnit as any)[field] = parseFloat(convertedUnit[field] as string);
                 if (isNaN((convertedUnit as any)[field])) (convertedUnit as any)[field] = null;
            } else {
                 (convertedUnit as any)[field] = null;
            }
        });
        return convertedUnit;
    });
     payload.auxEngines = payload.auxEngines?.map(aux => {
        const convertedAux = { ...aux };
        const auxNumericFields: (keyof Omit<AuxEngineData, 'engineName'>)[] = ['load', 'kw', 'foPress', 'lubOilPress', 'waterTemp', 'dailyRunHour'];
         auxNumericFields.forEach(field => {
            if (convertedAux[field] !== '' && convertedAux[field] !== undefined && convertedAux[field] !== null) {
                (convertedAux as any)[field] = parseFloat(convertedAux[field] as string);
                 if (isNaN((convertedAux as any)[field])) (convertedAux as any)[field] = null;
            } else {
                 (convertedAux as any)[field] = null;
            }
        });
        return convertedAux;
    });


    try {
      // Corrected path: remove '/api' prefix as it's handled by baseURL
      await apiClient.post('/reports', payload); 
      setSuccess('Noon report submitted successfully!');
      // Optionally reset form or navigate away
      // setFormData({ ...initial state... }); // Reset form
      setTimeout(() => navigate('/captain'), 1500); // Navigate back to dashboard after delay
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit report.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Vessel Info (Helper Component or direct render)
  const renderVesselInfo = () => {
    if (!vesselInfo) return <p>Loading vessel info...</p>;
    return (
      <div className="mb-4 p-4 border rounded bg-gray-50">
        <h3 className="font-semibold text-lg mb-2">Vessel Information</h3>
        <p><strong>Name:</strong> {vesselInfo.name}</p>
        <p><strong>IMO:</strong> {vesselInfo.imoNumber}</p>
        <p><strong>DWT:</strong> {vesselInfo.deadweight}</p>
        {user && <p><strong>Captain:</strong> {user.name}</p>}
      </div>
    );
  };

  return (
    // Removed outer div max-w-4xl mx-auto p-4 as layout likely handles it
    <> 
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Noon Report</h2> {/* Match DepartureForm h2 */}
      {renderVesselInfo()}

      {/* Apply consistent form styling */}
      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md"> {/* Consistent form class */}
        {/* General Information Section */}
        <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
          <legend className="text-lg font-medium px-2">General Info</legend> {/* Consistent legend class & text */}
          {/* Inputs for reportDate, reportTime, timeZone */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
             <div>
                <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label> {/* Consistent label */}
                {/* Apply consistent input styling */}
                <input type="date" id="reportDate" name="reportDate" value={formData.reportDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="reportTime" className="block text-sm font-medium text-gray-700">Report Time</label>
                {/* Apply consistent input styling */}
                <input type="time" id="reportTime" name="reportTime" value={formData.reportTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">Time Zone</label>
                {/* Apply consistent input styling */}
                <input type="text" id="timeZone" name="timeZone" value={formData.timeZone} onChange={handleChange} required placeholder="e.g., UTC+3" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
          </div>
        </fieldset>

        {/* Passage State & Distance Section */}
        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Passage State & Distance</legend> {/* Match legend style */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div>
                <label htmlFor="passageState" className="block text-sm font-medium text-gray-700">Passage State</label>
                 {/* Apply consistent select styling */}
                <select id="passageState" name="passageState" value={formData.passageState} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white">
                    <option value="NOON">NOON</option>
                    <option value="SOSP">SOSP</option>
                    <option value="ROSP">ROSP</option>
                </select>
            </div>
             <div>
                <label htmlFor="distanceSinceLastReport" className="block text-sm font-medium text-gray-700">Distance Since Last (NM)</label>
                 {/* Apply consistent input styling */}
                <input type="number" step="0.1" id="distanceSinceLastReport" name="distanceSinceLastReport" value={formData.distanceSinceLastReport} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" />
            </div>
           </div>
           {/* Conditional Fields */}
           {formData.passageState === 'NOON' && (
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-blue-50 border border-blue-200 rounded">
                   {/* Inputs for noonDate, noonTime, noonLatitude, noonLongitude */}
                    <p className="col-span-full text-sm text-blue-700">NOON Details Required</p>
                    {/* Apply consistent input styling */}
                    <div><label className="block text-sm font-medium text-gray-700">Noon Date</label><input type="date" name="noonDate" value={formData.noonDate} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Noon Time</label><input type="time" name="noonTime" value={formData.noonTime} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Noon Latitude</label><input type="number" step="any" name="noonLatitude" value={formData.noonLatitude} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">Noon Longitude</label><input type="number" step="any" name="noonLongitude" value={formData.noonLongitude} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
               </div>
           )}
            {formData.passageState === 'SOSP' && (
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                   {/* Inputs for sospDate, sospTime, sospLatitude, sospLongitude */}
                    <p className="col-span-full text-sm text-yellow-700">SOSP Details Required</p>
                    {/* Apply consistent input styling */}
                    <div><label className="block text-sm font-medium text-gray-700">SOSP Date</label><input type="date" name="sospDate" value={formData.sospDate} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">SOSP Time</label><input type="time" name="sospTime" value={formData.sospTime} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">SOSP Latitude</label><input type="number" step="any" name="sospLatitude" value={formData.sospLatitude} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">SOSP Longitude</label><input type="number" step="any" name="sospLongitude" value={formData.sospLongitude} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
               </div>
           )}
            {formData.passageState === 'ROSP' && (
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-green-50 border border-green-200 rounded">
                   {/* Inputs for rospDate, rospTime, rospLatitude, rospLongitude */}
                    <p className="col-span-full text-sm text-green-700">ROSP Details Required</p>
                    {/* Apply consistent input styling */}
                    <div><label className="block text-sm font-medium text-gray-700">ROSP Date</label><input type="date" name="rospDate" value={formData.rospDate} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">ROSP Time</label><input type="time" name="rospTime" value={formData.rospTime} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">ROSP Latitude</label><input type="number" step="any" name="rospLatitude" value={formData.rospLatitude} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    <div><label className="block text-sm font-medium text-gray-700">ROSP Longitude</label><input type="number" step="any" name="rospLongitude" value={formData.rospLongitude} onChange={handleChange} className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
               </div>
           )}
        </fieldset>

        {/* Weather Section */}
        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Weather</legend> {/* Match legend style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="windDirection" className="block text-sm font-medium text-gray-700">Wind Direction</label>
              <select id="windDirection" name="windDirection" value={formData.windDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"> {/* Consistent select */}
                {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="windForce" className="block text-sm font-medium text-gray-700">Wind Force (Beaufort)</label>
              <input type="number" id="windForce" name="windForce" value={formData.windForce} onChange={handleChange} required min="0" max="12" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/> {/* Consistent input */}
            </div>
             <div>
              <label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">Sea Direction</label>
               <select id="seaDirection" name="seaDirection" value={formData.seaDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"> {/* Consistent select */}
                 {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
               </select>
            </div>
             <div>
              <label htmlFor="seaState" className="block text-sm font-medium text-gray-700">Sea State (Douglas Scale)</label>
              <input type="number" id="seaState" name="seaState" value={formData.seaState} onChange={handleChange} required min="0" max="9" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/> {/* Consistent input */}
            </div>
             <div>
              <label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">Swell Direction</label>
               <select id="swellDirection" name="swellDirection" value={formData.swellDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"> {/* Consistent select */}
                 {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
               </select>
            </div>
             <div>
              <label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">Swell Height (m)</label>
              <input type="number" step="0.1" id="swellHeight" name="swellHeight" value={formData.swellHeight} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/> {/* Consistent input */}
            </div>
          </div>
        </fieldset>

        {/* Bunkers Section */}
        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Bunkers</legend>
          <BunkerConsumptionSection
            formData={formData}
            handleChange={handleChange}
            title="Consumption (24h)"
          />
          <BunkerSupplySection
            formData={formData}
            handleChange={handleChange}
            title="Supply (Since Last)"
          />
        </fieldset>

        {/* Machinery Section */}
        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Machinery</legend>
          <MachineryMEParamsSection
            formData={formData}
            handleChange={handleChange}
            isTcRpm2Optional={true} // TC#2 is optional in Noon form
            includeDailyRunHours={true} // Noon form includes daily run hours
          />
          <EngineUnitsSection
            engineUnits={formData.engineUnits || []}
            handleEngineUnitChange={handleEngineUnitChange}
          />
          <AuxEnginesSection
            auxEngines={formData.auxEngines || []}
            handleAuxEngineChange={handleAuxEngineChange}
          />
        </fieldset>

        {/* Submission Area */}
        <div className="pt-4"> {/* Keep pt-4 */}
          {error && <p className="text-red-600 mb-4">{error}</p>} {/* Keep error/success messages */}
          {success && <p className="text-green-600 mb-4">{success}</p>}
           {/* Match DepartureForm button style exactly */}
          <button
            type="submit"
            disabled={isLoading || !vesselInfo}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
              (isLoading || !vesselInfo) ? 'opacity-70 cursor-not-allowed' : '' // Keep disabled logic
            }`}
          >
            {isLoading ? 'Submitting...' : 'Submit Noon Report'} {/* Keep button text */}
          </button>
        </div>
      </form>
    </> // Close the fragment opened at the start
  );
};

export default NoonForm;
