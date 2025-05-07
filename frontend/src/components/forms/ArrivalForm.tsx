import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { ArrivalFormData, CardinalDirection, EngineUnitData, AuxEngineData } from '../../types/report';
import { useNavigate } from 'react-router-dom';
import BunkerConsumptionSection from './sections/BunkerConsumptionSection';
import BunkerSupplySection from './sections/BunkerSupplySection';
import MachineryMEParamsSection from './sections/MachineryMEParamsSection';
import EngineUnitsSection from './sections/EngineUnitsSection';
import AuxEnginesSection from './sections/AuxEnginesSection';
import CoordinateInputGroup from './CoordinateInputGroup'; // Import the new component

// Helper functions to initialize machinery data (can be moved to a shared utils file later)
const initializeEngineUnits = (): EngineUnitData[] => {
  return Array.from({ length: 8 }, (_, i) => ({
    unitNumber: i + 1,
    exhaustTemp: '', underPistonAir: '', pcoOutletTemp: '', jcfwOutletTemp: ''
  }));
};

const initializeAuxEngines = (): AuxEngineData[] => {
  const names = ['DG1', 'DG2', 'V1'];
  return names.map(name => ({
    engineName: name,
    load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: ''
  }));
};

const ArrivalForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [formData, setFormData] = useState<ArrivalFormData>({
    reportType: 'arrival',
    vesselId: '', // Set after fetching vessel info
    reportDate: '',
    reportTime: '',
    timeZone: '',
    // EOSP Data
    eospDate: '', eospTime: '', 
    eospLatDeg: '', eospLatMin: '', eospLatDir: 'N', // Replaced eospLatitude
    eospLonDeg: '', eospLonMin: '', eospLonDir: 'E', // Replaced eospLongitude
    eospCourse: '',
    // Distance Data
    distanceSinceLastReport: '', harbourDistance: '', harbourTime: '',
    // Estimated Berthing
    estimatedBerthingDate: '', estimatedBerthingTime: '',
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
    mePresentRpm: '', // Added mePresentRpm
    meCurrentSpeed: '', // Added Current Speed
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
        setFormData(prev => ({ ...prev, vesselId: response.data.id }));
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
    // Handle direction selects specifically
    if (name.endsWith('LatDir') || name.endsWith('LonDir')) {
        setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Specific handlers for CoordinateInputGroup
  const handleCoordinateChange = (
    prefix: 'eospLat' | 'eospLon', 
    part: 'Deg' | 'Min' | 'Dir', 
    value: string
  ) => {
    const name = `${prefix}${part}`;
    if (part === 'Dir') {
      setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handlers for nested machinery data
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

    // --- Input Format Validation ---
    const errors: string[] = [];
    const numericFields: (keyof ArrivalFormData)[] = [ // Define numeric fields for validation
        'eospLatDeg', 'eospLatMin', 'eospLonDeg', 'eospLonMin', // Replaced Lat/Lon
        'eospCourse', 'distanceSinceLastReport', 'harbourDistance',
        'windForce', 'seaState', 'swellHeight',
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed' // Added mePresentRpm, meCurrentSpeed
    ];
    // No string-only fields specific to Arrival form to validate here

    // Validate standard numeric fields
    numericFields.forEach(field => {
        const value = formData[field as keyof ArrivalFormData];
        // Allow empty strings for optional fields (like meTcRpm2), but fail if non-empty and not numeric
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
            errors.push(`${field} must be a valid number.`);
        }
    });

    // Validate Engine Units (numeric)
    formData.engineUnits?.forEach((unit, index) => {
        Object.entries(unit).forEach(([key, value]) => {
            if (key !== 'unitNumber' && value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
                errors.push(`Engine Unit #${unit.unitNumber} ${key} must be a valid number.`);
            }
        });
    });

    // Validate Aux Engines (numeric)
    formData.auxEngines?.forEach((aux, index) => {
        Object.entries(aux).forEach(([key, value]) => {
            if (key !== 'engineName' && value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
                errors.push(`Aux Engine ${aux.engineName} ${key} must be a valid number.`);
            }
        });
    });

    if (errors.length > 0) {
        setError(errors.join(' '));
        setIsLoading(false);
        return;
    }
    // --- End Input Format Validation ---


    // Basic Client-side validation (Required Fields)
    const requiredFields: (keyof ArrivalFormData)[] = [
        'reportDate', 'reportTime', 'timeZone', 
        'eospDate', 'eospTime', 
        'eospLatDeg', 'eospLatMin', 'eospLatDir', // Replaced Lat/Lon
        'eospLonDeg', 'eospLonMin', 'eospLonDir', // Replaced Lat/Lon
        'eospCourse',
        'distanceSinceLastReport', 'harbourDistance', 'harbourTime', 'estimatedBerthingDate', 'estimatedBerthingTime',
        'mePresentRpm', 'meCurrentSpeed' // Added mePresentRpm, meCurrentSpeed
    ];
    for (const field of requiredFields) {
        if (!formData[field]) {
            setError(`Field "${field}" is required.`);
            setIsLoading(false);
            return;
        }
    }
     // Basic HH:MM check for harbourTime
    if (!/^\d{2}:\d{2}$/.test(formData.harbourTime)) {
        setError(`Harbour Time format must be HH:MM.`);
        setIsLoading(false);
        return;
    }


    // Prepare payload: Convert numbers
    const payload = { ...formData };
    // Use the *same* numericFields array defined above for conversion
    numericFields.forEach(field => {
        const key = field as keyof ArrivalFormData; // Use type assertion
        if (payload[key] !== '' && payload[key] !== undefined && payload[key] !== null) {
            (payload as any)[key] = parseFloat(payload[key] as string);
             if (isNaN((payload as any)[key])) {
                 console.warn(`Could not parse numeric field: ${key}, value: ${formData[key]}`); // Log original value
                 (payload as any)[key] = null; 
            }
        } else {
             (payload as any)[key] = null; 
        }
    });
    
    // Convert machinery fields
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
      setSuccess('Arrival report submitted successfully!');
      setTimeout(() => navigate('/captain'), 1500); // Navigate back after delay
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to submit report.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Vessel Info
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
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Arrival Report</h2> {/* Match DepartureForm h2 */}
      {renderVesselInfo()}

      {/* Apply consistent form styling */}
      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md"> {/* Consistent form class */}
        {/* General Information Section */}
        <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
          <legend className="text-lg font-medium px-2">General Info</legend> {/* Consistent legend class & text */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
             <div>
                <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label> {/* Consistent label */}
                <input type="date" id="reportDate" name="reportDate" value={formData.reportDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="reportTime" className="block text-sm font-medium text-gray-700">Report Time</label>
                <input type="time" id="reportTime" name="reportTime" value={formData.reportTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">Time Zone</label>
                <input type="text" id="timeZone" name="timeZone" value={formData.timeZone} onChange={handleChange} required placeholder="e.g., UTC+3" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
          </div>
        </fieldset>

        {/* EOSP Section */}
        <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
          <legend className="text-lg font-medium px-2">End of Sea Passage (EOSP)</legend> {/* Consistent legend class */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
             <div>
                <label htmlFor="eospDate" className="block text-sm font-medium text-gray-700">EOSP Date</label> {/* Consistent label */}
                <input type="date" id="eospDate" name="eospDate" value={formData.eospDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="eospTime" className="block text-sm font-medium text-gray-700">EOSP Time</label>
                <input type="time" id="eospTime" name="eospTime" value={formData.eospTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
            {/* Replace EOSP Lat/Lon inputs with CoordinateInputGroup */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <CoordinateInputGroup
                    label="EOSP Latitude"
                    idPrefix="eospLat"
                    degreeValue={formData.eospLatDeg ?? ''}
                    minuteValue={formData.eospLatMin ?? ''}
                    directionValue={formData.eospLatDir ?? 'N'}
                    onDegreeChange={(e) => handleCoordinateChange('eospLat', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('eospLat', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('eospLat', 'Dir', e.target.value)}
                    directionOptions={['N', 'S']}
                    required={true}
                 />
                 <CoordinateInputGroup
                    label="EOSP Longitude"
                    idPrefix="eospLon"
                    degreeValue={formData.eospLonDeg ?? ''}
                    minuteValue={formData.eospLonMin ?? ''}
                    directionValue={formData.eospLonDir ?? 'E'}
                    onDegreeChange={(e) => handleCoordinateChange('eospLon', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('eospLon', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('eospLon', 'Dir', e.target.value)}
                    directionOptions={['E', 'W']}
                    required={true}
                 />
            </div>
             <div>
                <label htmlFor="eospCourse" className="block text-sm font-medium text-gray-700">EOSP Course (°)</label>
                <input type="number" id="eospCourse" name="eospCourse" value={formData.eospCourse} onChange={handleChange} required min="0" max="360" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
          </div>
        </fieldset>

        {/* Distance Section */}
        <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
          <legend className="text-lg font-medium px-2">Distance</legend> {/* Consistent legend class */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
             <div>
                <label htmlFor="distanceSinceLastReport" className="block text-sm font-medium text-gray-700">Distance Since Last (NM)</label> {/* Consistent label */}
                <input type="number" step="0.1" id="distanceSinceLastReport" name="distanceSinceLastReport" value={formData.distanceSinceLastReport} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="harbourDistance" className="block text-sm font-medium text-gray-700">Harbour Distance (NM)</label>
                <input type="number" step="0.1" id="harbourDistance" name="harbourDistance" value={formData.harbourDistance} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="harbourTime" className="block text-sm font-medium text-gray-700">Harbour Time (HH:MM)</label>
                <input type="text" pattern="[0-9]{2}:[0-9]{2}" id="harbourTime" name="harbourTime" value={formData.harbourTime} onChange={handleChange} required placeholder="HH:MM" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
          </div>
        </fieldset>

        {/* Estimated Berthing Section */}
        <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
          <legend className="text-lg font-medium px-2">Estimated Berthing</legend> {/* Consistent legend class */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Consistent grid */}
             <div>
                <label htmlFor="estimatedBerthingDate" className="block text-sm font-medium text-gray-700">Est. Berthing Date</label> {/* Consistent label */}
                <input type="date" id="estimatedBerthingDate" name="estimatedBerthingDate" value={formData.estimatedBerthingDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="estimatedBerthingTime" className="block text-sm font-medium text-gray-700">Est. Berthing Time</label>
                <input type="time" id="estimatedBerthingTime" name="estimatedBerthingTime" value={formData.estimatedBerthingTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
          </div>
        </fieldset>

        {/* Weather Section */}
        <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
          <legend className="text-lg font-medium px-2">Weather</legend> {/* Consistent legend class */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
            <div>
              <label htmlFor="windDirection" className="block text-sm font-medium text-gray-700">Wind Direction</label> {/* Consistent label */}
              {/* Consistent select */}
              <select id="windDirection" name="windDirection" value={formData.windDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white">
                {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="windForce" className="block text-sm font-medium text-gray-700">Wind Force (Beaufort)</label>
              {/* Consistent input */}
              <input type="number" id="windForce" name="windForce" value={formData.windForce} onChange={handleChange} required min="0" max="12" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
              <label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">Sea Direction</label>
               {/* Consistent select */}
               <select id="seaDirection" name="seaDirection" value={formData.seaDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white">
                 {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
               </select>
            </div>
             <div>
              <label htmlFor="seaState" className="block text-sm font-medium text-gray-700">Sea State (Douglas Scale)</label>
              {/* Consistent input */}
              <input type="number" id="seaState" name="seaState" value={formData.seaState} onChange={handleChange} required min="0" max="9" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
              <label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">Swell Direction</label>
               {/* Consistent select */}
               <select id="swellDirection" name="swellDirection" value={formData.swellDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white">
                 {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
               </select>
            </div>
             <div>
              <label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">Swell Height (m)</label>
              {/* Consistent input */}
              <input type="number" step="0.1" id="swellHeight" name="swellHeight" value={formData.swellHeight} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
          </div>
        </fieldset>

        {/* Bunkers Section */}
        <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
          {/* Removed extra nested fieldset here */}
            <legend className="text-lg font-medium px-2">Bunkers</legend>
            <BunkerConsumptionSection
              formData={formData}
              handleChange={handleChange}
              // title prop removed
            />
            <BunkerSupplySection
            formData={formData}
            handleChange={handleChange}
            title="Supply (Since Last)"
          />
        </fieldset>

        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Machinery</legend>
          <MachineryMEParamsSection
            formData={formData}
            handleChange={handleChange}
            isTcRpm2Optional={true} // TC#2 is optional in Arrival form
            includeDailyRunHours={true} // Arrival form includes daily run hours
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
            {isLoading ? 'Submitting...' : 'Submit Arrival Report'} {/* Keep button text */}
          </button>
        </div>
      </form>
    </> // Close the fragment opened at the start
  );
};

export default ArrivalForm;
