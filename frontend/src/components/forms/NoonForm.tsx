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
import CoordinateInputGroup from './CoordinateInputGroup'; // Import the new component

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
  // Add state for previous noon report's passage state
  const [prevNoonState, setPrevNoonState] = useState<PassageState | null>(null); 
  const [formData, setFormData] = useState<Partial<NoonFormData>>({ // Use Partial for initial state
    reportType: 'noon',
    vesselId: '', // Will be set after fetching vessel info
    reportDate: '',
    reportTime: '',
    timeZone: '',
    // Passage State - Default to empty string, make optional
    passageState: '', 
    distanceSinceLastReport: '',
    // Noon fields are now always required
    noonDate: '', 
    noonTime: '', 
    noonLatDeg: '', // Replaced noonLatitude
    noonLatMin: '', // Replaced noonLatitude
    noonLatDir: 'N', // Replaced noonLatitude (default N)
    noonLonDeg: '', // Replaced noonLongitude
    noonLonMin: '', // Replaced noonLongitude
    noonLonDir: 'E', // Replaced noonLongitude (default E)
    noonCourse: '', // Added noonCourse
    // Conditional fields (initialize all, rely on validation/filtering later)
    sospDate: '', sospTime: '', 
    sospLatDeg: '', sospLatMin: '', sospLatDir: 'N', // Replaced sospLatitude
    sospLonDeg: '', sospLonMin: '', sospLonDir: 'E', // Replaced sospLongitude
    sospCourse: '', // Added sospCourse
    rospDate: '', rospTime: '', 
    rospLatDeg: '', rospLatMin: '', rospLatDir: 'N', // Replaced rospLatitude
    rospLonDeg: '', rospLonMin: '', rospLonDir: 'E', // Replaced rospLongitude
    rospCourse: '', // Added rospCourse
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

  // Fetch vessel info (assuming backend now includes previousNoonPassageState)
  useEffect(() => {
    const fetchVesselInfo = async () => {
      setIsLoading(true);
      setError(null); // Reset error before fetching
      try {
        const response = await apiClient.get<VesselInfo>('/vessels/my-vessel'); 
        const fetchedData = response.data;
        setVesselInfo(fetchedData);
        setFormData(prev => ({ ...prev, vesselId: fetchedData.id })); 
        // Set the previous noon state from fetched data
        setPrevNoonState(fetchedData.previousNoonPassageState ?? null); 
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
    prefix: 'noonLat' | 'noonLon' | 'sospLat' | 'sospLon' | 'rospLat' | 'rospLon', 
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

    // --- Input Format Validation ---
    const errors: string[] = [];
    const numericFields: (keyof NoonFormData)[] = [ // Use Partial<> for formData access
        'distanceSinceLastReport', 'windForce', 'seaState', 'swellHeight',
        'noonLatDeg', 'noonLatMin', 'noonLonDeg', 'noonLonMin', 'noonCourse', // Always validate noon numerics
        'sospLatDeg', 'sospLatMin', 'sospLonDeg', 'sospLonMin', 'sospCourse', // Conditional, validate if present
        'rospLatDeg', 'rospLatMin', 'rospLonDeg', 'rospLonMin', 'rospCourse', // Conditional, validate if present
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed' // Added mePresentRpm, meCurrentSpeed
    ];

    // Validate standard numeric fields
    numericFields.forEach(field => {
        const value = formData[field as keyof NoonFormData];
        // Allow empty strings for optional fields (like meTcRpm2), but fail if non-empty and not numeric
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
            // Special check for conditional SOSP/ROSP fields - only error if the state requires them
            let isRequiredByState = true;
            if (field.startsWith('sosp') && formData.passageState !== 'SOSP') isRequiredByState = false;
            if (field.startsWith('rosp') && formData.passageState !== 'ROSP') isRequiredByState = false;
            
            if (isRequiredByState) {
                errors.push(`${field} must be a valid number.`);
            }
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


    // --- Required Fields & State Logic Validation ---
    // Always required fields
    const alwaysRequiredFields: (keyof NoonFormData)[] = [
        'reportDate', 'reportTime', 'timeZone', 'distanceSinceLastReport',
        'noonDate', 'noonTime', 
        'noonLatDeg', 'noonLatMin', 'noonLatDir', // Noon coords always required
        'noonLonDeg', 'noonLonMin', 'noonLonDir', // Noon coords always required
        'noonCourse', 'mePresentRpm', 'meCurrentSpeed' // Added mePresentRpm, meCurrentSpeed
    ];
    for (const field of alwaysRequiredFields) {
        if (!formData[field]) {
            setError(`Field "${field}" is required.`);
            setIsLoading(false);
            return;
        }
    }

    // Conditional SOSP/ROSP fields validation (including course and Deg/Min/Dir)
    if (formData.passageState === 'SOSP' && (
        !formData.sospDate || !formData.sospTime || 
        !formData.sospLatDeg || !formData.sospLatMin || !formData.sospLatDir ||
        !formData.sospLonDeg || !formData.sospLonMin || !formData.sospLonDir ||
        !formData.sospCourse
    )) {
         setError('SOSP Date, Time, Latitude (Deg/Min/Dir), Longitude (Deg/Min/Dir), and Course are required when SOSP state is selected.');
         setIsLoading(false);
         return;
    }
     if (formData.passageState === 'ROSP' && (
        !formData.rospDate || !formData.rospTime || 
        !formData.rospLatDeg || !formData.rospLatMin || !formData.rospLatDir ||
        !formData.rospLonDeg || !formData.rospLonMin || !formData.rospLonDir ||
        !formData.rospCourse
     )) {
         setError('ROSP Date, Time, Latitude (Deg/Min/Dir), Longitude (Deg/Min/Dir), and Course are required when ROSP state is selected.');
         setIsLoading(false);
         return;
    }

    // Passage State Sequence Validation
    if (prevNoonState === 'SOSP' && !formData.passageState) { // Must select SOSP or ROSP if previous was SOSP
        setError('Passage state (SOSP/ROSP) is required because the previous Noon report was SOSP.');
        setIsLoading(false);
        return;
    }
    if (prevNoonState !== 'SOSP' && formData.passageState === 'ROSP') { // Cannot select ROSP if previous was not SOSP
        setError('ROSP state is only allowed immediately following an SOSP state.');
        setIsLoading(false);
        return;
    }
    // --- End Required Fields & State Logic Validation ---


    // Prepare payload: Convert numbers, filter conditional fields
    const payload = { ...formData };
    // Use the *same* numericFields array defined above for conversion
    numericFields.forEach(field => {
        const key = field as keyof NoonFormData; // Use type assertion
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

    // Filter out irrelevant conditional fields (including course and Deg/Min/Dir)
    if (payload.passageState !== 'SOSP') {
        delete payload.sospDate; delete payload.sospTime; 
        delete payload.sospLatDeg; delete payload.sospLatMin; delete payload.sospLatDir;
        delete payload.sospLonDeg; delete payload.sospLonMin; delete payload.sospLonDir;
        delete payload.sospCourse;
    }
    if (payload.passageState !== 'ROSP') {
        delete payload.rospDate; delete payload.rospTime; 
        delete payload.rospLatDeg; delete payload.rospLatMin; delete payload.rospLatDir;
        delete payload.rospLonDeg; delete payload.rospLonMin; delete payload.rospLonDir;
        delete payload.rospCourse;
     }
    // Convert empty passageState to null for backend
    if (payload.passageState === '') {
        payload.passageState = null;
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
      await apiClient.post('/reports', payload as NoonFormData); // Use correct type
      setSuccess('Noon report submitted successfully!');
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
    <> 
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Noon Report</h2> 
      {renderVesselInfo()}

      <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md"> 
        {/* General Information Section */}
        <fieldset className="border p-4 rounded"> 
          <legend className="text-lg font-medium px-2">General Info</legend> 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> 
             <div>
                <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700">Report Date</label> 
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

        {/* Noon Position & Course Section (Always Visible) */}
        <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Noon Position & Course</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"> {/* Date/Time */}
                <div><label htmlFor="noonDate" className="block text-sm font-medium text-gray-700">Noon Date</label><input type="date" id="noonDate" name="noonDate" value={formData.noonDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                <div><label htmlFor="noonTime" className="block text-sm font-medium text-gray-700">Noon Time</label><input type="time" id="noonTime" name="noonTime" value={formData.noonTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4"> {/* Lat/Lon/Course */}
                 <CoordinateInputGroup
                    label="Noon Latitude"
                    idPrefix="noonLat"
                    degreeValue={formData.noonLatDeg ?? ''}
                    minuteValue={formData.noonLatMin ?? ''}
                    directionValue={formData.noonLatDir ?? 'N'}
                    onDegreeChange={(e) => handleCoordinateChange('noonLat', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('noonLat', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('noonLat', 'Dir', e.target.value)}
                    directionOptions={['N', 'S']}
                    required={true}
                 />
                 <CoordinateInputGroup
                    label="Noon Longitude"
                    idPrefix="noonLon"
                    degreeValue={formData.noonLonDeg ?? ''}
                    minuteValue={formData.noonLonMin ?? ''}
                    directionValue={formData.noonLonDir ?? 'E'}
                    onDegreeChange={(e) => handleCoordinateChange('noonLon', 'Deg', e.target.value)}
                    onMinuteChange={(e) => handleCoordinateChange('noonLon', 'Min', e.target.value)}
                    onDirectionChange={(e) => handleCoordinateChange('noonLon', 'Dir', e.target.value)}
                    directionOptions={['E', 'W']}
                    required={true}
                 />
                <div><label htmlFor="noonCourse" className="block text-sm font-medium text-gray-700">Noon Course (°)</label><input type="number" step="any" id="noonCourse" name="noonCourse" value={formData.noonCourse} onChange={handleChange} required min="0" max="360" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
            </div>
        </fieldset>

        {/* Passage State & Distance Section */}
        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Passage State & Distance</legend> 
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
             <div>
                <label htmlFor="passageState" className="block text-sm font-medium text-gray-700">Passage State (Optional)</label>
                <select 
                    id="passageState" 
                    name="passageState" 
                    value={formData.passageState ?? ''} // Use nullish coalescing for value prop
                    onChange={handleChange} 
                    className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"
                >
                    <option value="" disabled={prevNoonState === 'SOSP'}>-- Select SOSP/ROSP (Optional) --</option>
                    <option value="SOSP">SOSP</option>
                    <option value="ROSP" disabled={prevNoonState !== 'SOSP'}>ROSP</option>
                </select>
                 {prevNoonState === 'SOSP' && <p className="text-xs text-blue-600 mt-1">SOSP or ROSP required after previous SOSP.</p>}
                 {prevNoonState !== 'SOSP' && <p className="text-xs text-gray-500 mt-1">ROSP only allowed after SOSP.</p>}
            </div>
             <div>
                <label htmlFor="distanceSinceLastReport" className="block text-sm font-medium text-gray-700">Distance Since Last (NM)</label>
                <input type="number" step="0.1" id="distanceSinceLastReport" name="distanceSinceLastReport" value={formData.distanceSinceLastReport} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" />
            </div>
           </div>
           {/* Conditional SOSP/ROSP Fields */}
            {formData.passageState === 'SOSP' && (
               <div className="p-3 bg-yellow-50 border border-yellow-200 rounded space-y-4">
                    <p className="text-sm text-yellow-700 font-medium">SOSP Details Required</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700">SOSP Date</label><input type="date" name="sospDate" value={formData.sospDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">SOSP Time</label><input type="time" name="sospTime" value={formData.sospTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CoordinateInputGroup label="SOSP Latitude" idPrefix="sospLat" degreeValue={formData.sospLatDeg ?? ''} minuteValue={formData.sospLatMin ?? ''} directionValue={formData.sospLatDir ?? 'N'} onDegreeChange={(e) => handleCoordinateChange('sospLat', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('sospLat', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('sospLat', 'Dir', e.target.value)} directionOptions={['N', 'S']} required={true} />
                        <CoordinateInputGroup label="SOSP Longitude" idPrefix="sospLon" degreeValue={formData.sospLonDeg ?? ''} minuteValue={formData.sospLonMin ?? ''} directionValue={formData.sospLonDir ?? 'E'} onDegreeChange={(e) => handleCoordinateChange('sospLon', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('sospLon', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('sospLon', 'Dir', e.target.value)} directionOptions={['E', 'W']} required={true} />
                        <div><label className="block text-sm font-medium text-gray-700">SOSP Course (°)</label><input type="number" step="any" name="sospCourse" value={formData.sospCourse} onChange={handleChange} required min="0" max="360" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    </div>
               </div>
           )}
            {formData.passageState === 'ROSP' && (
               <div className="p-3 bg-green-50 border border-green-200 rounded space-y-4">
                    <p className="text-sm text-green-700 font-medium">ROSP Details Required</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-gray-700">ROSP Date</label><input type="date" name="rospDate" value={formData.rospDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">ROSP Time</label><input type="time" name="rospTime" value={formData.rospTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <CoordinateInputGroup label="ROSP Latitude" idPrefix="rospLat" degreeValue={formData.rospLatDeg ?? ''} minuteValue={formData.rospLatMin ?? ''} directionValue={formData.rospLatDir ?? 'N'} onDegreeChange={(e) => handleCoordinateChange('rospLat', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('rospLat', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('rospLat', 'Dir', e.target.value)} directionOptions={['N', 'S']} required={true} />
                        <CoordinateInputGroup label="ROSP Longitude" idPrefix="rospLon" degreeValue={formData.rospLonDeg ?? ''} minuteValue={formData.rospLonMin ?? ''} directionValue={formData.rospLonDir ?? 'E'} onDegreeChange={(e) => handleCoordinateChange('rospLon', 'Deg', e.target.value)} onMinuteChange={(e) => handleCoordinateChange('rospLon', 'Min', e.target.value)} onDirectionChange={(e) => handleCoordinateChange('rospLon', 'Dir', e.target.value)} directionOptions={['E', 'W']} required={true} />
                        <div><label className="block text-sm font-medium text-gray-700">ROSP Course (°)</label><input type="number" step="any" name="rospCourse" value={formData.rospCourse} onChange={handleChange} required min="0" max="360" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm" /></div>
                    </div>
               </div>
           )}
        </fieldset>

        {/* Weather Section */}
        <fieldset className="border p-4 rounded">
          <legend className="text-lg font-medium px-2">Weather</legend> 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="windDirection" className="block text-sm font-medium text-gray-700">Wind Direction</label>
              <select id="windDirection" name="windDirection" value={formData.windDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"> 
                {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="windForce" className="block text-sm font-medium text-gray-700">Wind Force (Beaufort)</label>
              <input type="number" id="windForce" name="windForce" value={formData.windForce} onChange={handleChange} required min="0" max="12" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/> 
            </div>
             <div>
              <label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">Sea Direction</label>
               <select id="seaDirection" name="seaDirection" value={formData.seaDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"> 
                 {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
               </select>
            </div>
             <div>
              <label htmlFor="seaState" className="block text-sm font-medium text-gray-700">Sea State (Douglas Scale)</label>
              <input type="number" id="seaState" name="seaState" value={formData.seaState} onChange={handleChange} required min="0" max="9" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/> 
            </div>
             <div>
              <label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">Swell Direction</label>
               <select id="swellDirection" name="swellDirection" value={formData.swellDirection} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white"> 
                 {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
               </select>
            </div>
             <div>
              <label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">Swell Height (m)</label>
              <input type="number" step="0.1" id="swellHeight" name="swellHeight" value={formData.swellHeight} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/> 
            </div>
          </div>
        </fieldset>

        {/* Bunkers Section */}
        <fieldset className="border p-4 rounded">
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
        <div className="pt-4"> 
          {error && <p className="text-red-600 mb-4">{error}</p>} 
          {success && <p className="text-green-600 mb-4">{success}</p>}
          <button
            type="submit"
            disabled={isLoading || !vesselInfo}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
              (isLoading || !vesselInfo) ? 'opacity-70 cursor-not-allowed' : '' 
            }`}
          >
            {isLoading ? 'Submitting...' : 'Submit Noon Report'} 
          </button>
        </div>
      </form>
    </> 
  );
};

export default NoonForm;
