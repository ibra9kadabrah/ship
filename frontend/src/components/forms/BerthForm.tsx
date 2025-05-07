import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
// Import necessary types including machinery
import { BerthFormData, CardinalDirection, CurrentVoyageDetails, CargoStatus, AuxEngineData } from '../../types/report'; // Removed EngineUnitData
import { useNavigate } from 'react-router-dom';
// Removed BunkerConsumptionSection, MachineryMEParamsSection, EngineUnitsSection imports
import BunkerSupplySection from './sections/BunkerSupplySection';
import AuxEnginesSection from './sections/AuxEnginesSection';
import CoordinateInputGroup from './CoordinateInputGroup'; // Import the new component

// Helper functions to initialize machinery data (copied from ArrivalForm)
// Removed initializeEngineUnits function

const initializeAuxEngines = (): AuxEngineData[] => {
  const names = ['DG1', 'DG2', 'V1'];
  return names.map(name => ({
    engineName: name,
    load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: ''
  }));
};


const BerthForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [voyageDetails, setVoyageDetails] = useState<CurrentVoyageDetails | null>(null);
  const [formData, setFormData] = useState<BerthFormData>({
    reportType: 'berth',
    vesselId: '', // Set after fetching vessel info
    reportDate: '',
    reportTime: '',
    timeZone: '',
    // Berth Data
    berthDate: '', berthTime: '', 
    berthLatDeg: '', berthLatMin: '', berthLatDir: 'N', // Replaced berthLatitude
    berthLonDeg: '', berthLonMin: '', berthLonDir: 'E', // Replaced berthLongitude
    berthNumber: '', // Added Berth Number
    // Cargo Ops Data
    cargoOpsStartDate: '', cargoOpsStartTime: '', cargoOpsEndDate: '', cargoOpsEndTime: '',
    cargoLoaded: '', // Conditional
    cargoUnloaded: '', // Conditional
    // Weather
    windDirection: 'N', seaDirection: 'N', swellDirection: 'N',
    windForce: '', seaState: '', swellHeight: '',
    // Bunkers (Consumption) - REMOVED
    // meConsumptionLsifo: '', meConsumptionLsmgo: '', meConsumptionCylOil: '', meConsumptionMeOil: '', meConsumptionAeOil: '',
    boilerConsumptionLsifo: '', boilerConsumptionLsmgo: '', // Keep Boiler/Aux consumption for now, might be needed by Aux section? Revisit if Aux section needs update.
    auxConsumptionLsifo: '', auxConsumptionLsmgo: '', // Keep Boiler/Aux consumption for now
    // Bunkers (Supply)
    supplyLsifo: '', supplyLsmgo: '', supplyCylOil: '', supplyMeOil: '', supplyAeOil: '',
    // Machinery (ME Params) - REMOVED
    // meFoPressure: '', meLubOilPressure: '', meFwInletTemp: '', meLoInletTemp: '', meScavengeAirTemp: '',
    // meTcRpm1: '', meTcRpm2: '', meTcExhaustTempIn: '', meTcExhaustTempOut: '', meThrustBearingTemp: '', meDailyRunHours: '',
    // mePresentRpm: '',
    // meCurrentSpeed: '',
    // Initialize machinery arrays
    // engineUnits removed
    auxEngines: initializeAuxEngines(),
  });
  const [isLoading, setIsLoading] = useState(true); // Combined loading state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch vessel info and voyage details
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null); // Reset error on new fetch attempt
      try {
        // Fetch vessel info first
        // Corrected path: remove '/api' prefix as it's in baseURL
        const vesselResponse = await apiClient.get<VesselInfo>('/vessels/my-vessel'); 
        setVesselInfo(vesselResponse.data);
        setFormData(prev => ({ ...prev, vesselId: vesselResponse.data.id }));

        // Then fetch current voyage details
        try {
            // Corrected path: remove '/api' prefix as it's in baseURL
            const voyageResponse = await apiClient.get<CurrentVoyageDetails>('/voyages/current/details'); 
            setVoyageDetails(voyageResponse.data);
        } catch (voyageErr: any) {
             if (voyageErr.response && voyageErr.response.status === 404) {
                 setError('No active voyage found. Cannot submit Berth Report.');
             } else {
                 setError('Failed to fetch active voyage details.');
                 console.error('Voyage fetch error:', voyageErr);
             }
             setVoyageDetails(null); // Ensure voyage details are null on error
        }

      } catch (vesselErr) {
        setError('Failed to fetch vessel information.');
        console.error('Vessel fetch error:', vesselErr);
        setVesselInfo(null); // Ensure vessel info is null on error
        setVoyageDetails(null); // Ensure voyage details are null if vessel fetch fails
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
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
    prefix: 'berthLat' | 'berthLon', 
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

  // Handlers for nested machinery data (copied from ArrivalForm)
  // handleEngineUnitChange removed

  const handleAuxEngineChange = (index: number, field: keyof Omit<AuxEngineData, 'engineName'>, value: string) => {
     setFormData(prev => {
      const updatedAux = [...(prev.auxEngines || [])]; // Use initializers if needed
      if (updatedAux[index]) {
        updatedAux[index] = { ...updatedAux[index], [field]: value };
      }
      return { ...prev, auxEngines: updatedAux };
    });
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!voyageDetails) {
        setError('Cannot submit: Active voyage details are missing.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // --- Input Format Validation ---
    const errors: string[] = [];
    const numericFields: (keyof BerthFormData)[] = [ // Define list of numeric fields
        'berthLatDeg', 'berthLatMin', 'berthLonDeg', 'berthLonMin', // Replaced Lat/Lon
        'cargoLoaded', 'cargoUnloaded', // Conditional, validate if present
        'windForce', 'seaState', 'swellHeight',
        // ME Consumption removed
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo', // Keep Boiler/Aux consumption
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        // ME Params removed
    ];
    // No string-only fields specific to Berth form

    // Validate standard numeric fields
    numericFields.forEach(field => {
        const value = formData[field as keyof BerthFormData];
        // Allow empty strings for optional fields (like meTcRpm2, cargoLoaded/Unloaded), but fail if non-empty and not numeric
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
             // Special check for conditional cargo fields - only error if the state requires them
            // Both fields are optional now, only validate if non-empty
            errors.push(`${field} must be a valid number.`);
        }
    });

    // Validate Engine Units (numeric) - REMOVED

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
    const requiredFields: (keyof BerthFormData)[] = [
        'reportDate', 'reportTime', 'timeZone',
        'berthDate', 'berthTime', 'berthNumber', // Added berthNumber
        'berthLatDeg', 'berthLatMin', 'berthLatDir', // Replaced Lat/Lon
        'berthLonDeg', 'berthLonMin', 'berthLonDir', // Replaced Lat/Lon
        'cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime',
        // Required ME Params removed
        // Note: Bunkers consumption/supply are also required by BaseReportFormData
        // Keep Boiler/Aux consumption required for now, rely on backend validation primarily
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo', // Explicitly add these? Or rely on backend? Let's rely on backend for now.
        // Cargo loaded/unloaded are now optional from frontend perspective
    ];

    for (const field of requiredFields) {
        // Check if the field exists in formData and is not empty/null/undefined
        // Allow 0 as a valid number
        const value = formData[field];
        if (value === undefined || value === null || value === '') { 
            setError(`Field "${field}" is required.`);
            setIsLoading(false);
            return;
        }
    }

    // Prepare payload: Convert numbers
    const payload: any = { ...formData }; 

    // Default empty cargo fields to 0 before numeric conversion
    if (payload.cargoLoaded === '' || payload.cargoLoaded === null || payload.cargoLoaded === undefined) {
        payload.cargoLoaded = 0;
    }
    if (payload.cargoUnloaded === '' || payload.cargoUnloaded === null || payload.cargoUnloaded === undefined) {
        payload.cargoUnloaded = 0;
    }

    // Use the *same* numericFields array defined above for conversion
    numericFields.forEach(field => {
        // Check if field exists in payload before processing (cargoLoaded/Unloaded might be deleted)
        // Use type assertion for safer access
        const key = field as keyof BerthFormData; 
        if (payload[key] !== undefined) {
            if (payload[key] !== '' && payload[key] !== null) {
                payload[key] = parseFloat(payload[key] as string);
                 if (isNaN(payload[key])) {
                     console.warn(`Could not parse numeric field: ${key}, value: ${formData[key]}`); // Log original value
                     payload[key] = null; 
                }
            } else {
                 payload[key] = null; 
            }
        }
    });
    
    // Convert machinery fields (copied from ArrivalForm)
     // payload.engineUnits conversion removed
     payload.auxEngines = payload.auxEngines?.map((aux: AuxEngineData) => { // Add explicit type
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
      await apiClient.post('/reports', payload as BerthFormData); // Cast back after deletions
      setSuccess('Berth report submitted successfully!');
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
    // Show loading only if vesselInfo is null AND isLoading is true
    if (isLoading && !vesselInfo) return <p>Loading vessel info...</p>; 
    if (!vesselInfo) return null; // Don't render if info couldn't be fetched but loading is done

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
  
   // Render Voyage Info (including initial cargo status)
   const renderVoyageInfo = () => {
     // Show loading only if voyageDetails is null AND isLoading is true
     if (isLoading && !voyageDetails) return <p>Loading voyage details...</p>; 
     if (!voyageDetails) return null; // Don't render if details couldn't be fetched

     return (
       <div className="mb-4 p-4 border rounded bg-blue-50 border-blue-200">
         <h3 className="font-semibold text-lg mb-2 text-blue-800">Active Voyage Context</h3>
         <p><strong>Voyage ID:</strong> {voyageDetails.voyageId}</p>
         <p><strong>Departure:</strong> {voyageDetails.departurePort}</p>
         <p><strong>Destination:</strong> {voyageDetails.destinationPort}</p>
         <p><strong>Initial Cargo Status:</strong> <span className={`font-medium ${voyageDetails.initialCargoStatus === 'Loaded' ? 'text-green-700' : 'text-orange-700'}`}>{voyageDetails.initialCargoStatus}</span></p>
       </div>
     );
   };

  return (
    // Removed outer div max-w-4xl mx-auto p-4 as layout likely handles it
    <> 
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Berth Report</h2> {/* Match DepartureForm h2 */}
      {renderVesselInfo()}
      {renderVoyageInfo()} 

      {/* Show main error prominently if voyage details failed */}
       {error && !isLoading && <p className="text-red-600 mb-4 p-3 bg-red-100 rounded">{error}</p>}

      {/* Only show form if vessel and voyage details loaded successfully */}
      {!isLoading && vesselInfo && voyageDetails && (
      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md"> {/* Consistent form class */}
      {/* General Information Section */}
      <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
        <legend className="text-lg font-medium px-2">General Info</legend> {/* Consistent legend class & text */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
          <div><label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label><input type="date" id="reportDate" name="reportDate" value={formData.reportDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div> {/* Consistent label/input */}
          <div><label htmlFor="reportTime" className="block text-sm font-medium text-gray-700">Report Time</label><input type="time" id="reportTime" name="reportTime" value={formData.reportTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
          <div><label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">Time Zone</label><input type="text" id="timeZone" name="timeZone" value={formData.timeZone} onChange={handleChange} required placeholder="e.g., UTC+3" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
        </div>
      </fieldset>

          {/* Berth Details Section */}
          <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
            <legend className="text-lg font-medium px-2">Berth Details</legend> {/* Consistent legend class */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"> {/* Date/Time */}
               <div><label htmlFor="berthDate" className="block text-sm font-medium text-gray-700">Berth Date</label><input type="date" id="berthDate" name="berthDate" value={formData.berthDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div> {/* Consistent label/input */}
               <div><label htmlFor="berthTime" className="block text-sm font-medium text-gray-700">Berth Time</label><input type="time" id="berthTime" name="berthTime" value={formData.berthTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
             </div>
             {/* Replace Berth Lat/Lon inputs with CoordinateInputGroup */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <CoordinateInputGroup
                    label="Berth Latitude"
                    idPrefix="berthLat"
                    degreeValue={formData.berthLatDeg ?? ''}
                    minuteValue={formData.berthLatMin ?? ''}
                    directionValue={formData.berthLatDir ?? 'N'}
                    onDegreeChange={(e) => handleCoordinateChange('berthLat', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('berthLat', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('berthLat', 'Dir', e.target.value)}
                    directionOptions={['N', 'S']}
                    required={true}
                 />
                 <CoordinateInputGroup
                    label="Berth Longitude"
                    idPrefix="berthLon"
                    degreeValue={formData.berthLonDeg ?? ''}
                    minuteValue={formData.berthLonMin ?? ''}
                    directionValue={formData.berthLonDir ?? 'E'}
                    onDegreeChange={(e) => handleCoordinateChange('berthLon', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('berthLon', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('berthLon', 'Dir', e.target.value)}
                    directionOptions={['E', 'W']}
                    required={true}
                 />
             </div>
             {/* Add Berth Number Input */}
             <div className="mt-4">
                <label htmlFor="berthNumber" className="block text-sm font-medium text-gray-700">Berth Number</label>
                <input type="text" id="berthNumber" name="berthNumber" value={formData.berthNumber} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
             </div>
          </fieldset>

          {/* Cargo Operations Section */}
          <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
            <legend className="text-lg font-medium px-2">Cargo Operations</legend> {/* Consistent legend class */}
             {/* Always show both cargo fields, adjust grid */}
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4"> {/* Use 4 columns for cargo + dates */}
                 {/* Cargo Loaded */}
                 <div>
                    <label htmlFor="cargoLoaded" className="block text-sm font-medium text-gray-700">Cargo Loaded (MT)</label>
                    <input type="number" step="0.01" id="cargoLoaded" name="cargoLoaded" value={formData.cargoLoaded ?? ''} onChange={handleChange} min="0" placeholder="0.00" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/> {/* Removed required */}
                </div>
                 {/* Cargo Unloaded */}
                 <div>
                    <label htmlFor="cargoUnloaded" className="block text-sm font-medium text-gray-700">Cargo Unloaded (MT)</label>
                    <input type="number" step="0.01" id="cargoUnloaded" name="cargoUnloaded" value={formData.cargoUnloaded ?? ''} onChange={handleChange} min="0" placeholder="0.00" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/> {/* Removed required */}
                </div>
                 {/* Cargo Ops Times - moved to next row or adjust grid */}
                 {/* Let's keep times below for clarity */}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4"> {/* New grid for times */}
                 <div><label htmlFor="cargoOpsStartDate" className="block text-sm font-medium text-gray-700">Ops Start Date</label><input type="date" id="cargoOpsStartDate" name="cargoOpsStartDate" value={formData.cargoOpsStartDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
                 <div><label htmlFor="cargoOpsStartTime" className="block text-sm font-medium text-gray-700">Ops Start Time</label><input type="time" id="cargoOpsStartTime" name="cargoOpsStartTime" value={formData.cargoOpsStartTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
                 <div><label htmlFor="cargoOpsEndDate" className="block text-sm font-medium text-gray-700">Ops End Date</label><input type="date" id="cargoOpsEndDate" name="cargoOpsEndDate" value={formData.cargoOpsEndDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
                 <div><label htmlFor="cargoOpsEndTime" className="block text-sm font-medium text-gray-700">Ops End Time</label><input type="time" id="cargoOpsEndTime" name="cargoOpsEndTime" value={formData.cargoOpsEndTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
             </div>
          </fieldset>

          {/* Weather Section */}
          <fieldset className="border p-4 rounded"> {/* Consistent fieldset class */}
            <legend className="text-lg font-medium px-2">Weather</legend> {/* Consistent legend class */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Consistent grid */}
               {/* Consistent select/input (already match) */}
               <div><label htmlFor="windDirection" className="block text-sm font-medium text-gray-700">Wind Direction</label><select id="windDirection" name="windDirection" value={formData.windDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white">{['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}</select></div>
               {/* Consistent input */}
               <div><label htmlFor="windForce" className="block text-sm font-medium text-gray-700">Wind Force (Beaufort)</label><input type="number" id="windForce" name="windForce" value={formData.windForce} onChange={handleChange} required min="0" max="12" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
               {/* Consistent select */}
               <div><label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">Sea Direction</label><select id="seaDirection" name="seaDirection" value={formData.seaDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white">{['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}</select></div>
               {/* Consistent input */}
               <div><label htmlFor="seaState" className="block text-sm font-medium text-gray-700">Sea State (Douglas Scale)</label><input type="number" id="seaState" name="seaState" value={formData.seaState} onChange={handleChange} required min="0" max="9" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
               {/* Consistent select */}
               <div><label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">Swell Direction</label><select id="swellDirection" name="swellDirection" value={formData.swellDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white">{['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}</select></div>
               {/* Consistent input */}
               <div><label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">Swell Height (m)</label><input type="number" step="0.1" id="swellHeight" name="swellHeight" value={formData.swellHeight} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/></div>
             </div>
          </fieldset>

          <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Bunkers</legend>
            {/* BunkerConsumptionSection removed */}
            <BunkerSupplySection
              formData={formData}
              handleChange={handleChange}
              title="Supply (Since Last)"
            />
          </fieldset>

          <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Machinery</legend>
            {/* MachineryMEParamsSection removed */}
            {/* EngineUnitsSection removed */}
            <AuxEnginesSection
              auxEngines={formData.auxEngines || []}
              handleAuxEngineChange={handleAuxEngineChange}
            />
          </fieldset>


      {/* Submission Area */}
      <div className="pt-4"> {/* Keep pt-4 */}
        {error && !isLoading && <p className="text-red-600 mb-4">{error}</p>} {/* Keep error/success messages */}
        {success && <p className="text-green-600 mb-4">{success}</p>}
        {/* Match DepartureForm button style exactly */}
        <button
          type="submit"
          disabled={isLoading || !vesselInfo || !voyageDetails}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
            (isLoading || !vesselInfo || !voyageDetails) ? 'opacity-70 cursor-not-allowed' : '' // Keep disabled logic
          }`}
        >
          {isLoading ? 'Submitting...' : 'Submit Berth Report'} {/* Keep button text */}
        </button>
      </div>
    </form>
  )}
    </> // Close the fragment opened at the start
  );
};

export default BerthForm;
