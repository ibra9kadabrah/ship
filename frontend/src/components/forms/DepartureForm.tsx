import React, { useState, useEffect, ChangeEvent } from 'react'; // Added ChangeEvent
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import apiClient from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { DepartureSpecificData, BaseReportFormData, CardinalDirection, CargoStatus, EngineUnitData, AuxEngineData } from '../../types/report';
import BunkerConsumptionSection from './sections/BunkerConsumptionSection';
import BunkerSupplySection from './sections/BunkerSupplySection';
import MachineryMEParamsSection from './sections/MachineryMEParamsSection';
import EngineUnitsSection from './sections/EngineUnitsSection';
import AuxEnginesSection from './sections/AuxEnginesSection';
import CoordinateInputGroup from './CoordinateInputGroup'; // Import the new component

// Use BaseReportFormData for the state, adding departure-specific optional fields
type DepartureFormData = Partial<BaseReportFormData & {
  departurePort: string;
  destinationPort: string;
  voyageDistance: number | string;
  etaDate: string;
  etaTime: string;
  fwdDraft: number | string;
  aftDraft: number | string;
  cargoQuantity: number | string;
  cargoType: string;
  cargoStatus: CargoStatus;
  faspDate: string;
  faspTime: string;
  faspLatDeg: number | string; // Replaced faspLatitude
  faspLatMin: number | string; // Replaced faspLatitude
  faspLatDir: 'N' | 'S';       // Replaced faspLatitude
  faspLonDeg: number | string; // Replaced faspLongitude
  faspLonMin: number | string; // Replaced faspLongitude
  faspLonDir: 'E' | 'W';       // Replaced faspLongitude
  faspCourse: number | string;
  harbourDistance: number | string;
  harbourTime: string;
  // distanceSinceLastReport: number | string; // Removed
  initialRobLsifo?: number | string;
  initialRobLsmgo?: number | string;
  initialRobCylOil?: number | string;
  initialRobMeOil?: number | string;
  initialRobAeOil?: number | string;
  // Add machinery arrays to form data type
  engineUnits?: EngineUnitData[];
  auxEngines?: AuxEngineData[];
}>;

// Define initial states for machinery arrays (including optional)
const initialEngineUnits: EngineUnitData[] = Array.from({ length: 8 }, (_, i) => ({ 
  unitNumber: i + 1, 
  exhaustTemp: '', // Initialize optional fields as empty strings for controlled inputs
  underPistonAir: '', 
  pcoOutletTemp: '', 
  jcfwOutletTemp: '' 
}));
const initialAuxEngines: AuxEngineData[] = [
  { engineName: 'DG1', load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: '' }, // Required
  { engineName: 'DG2', load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: '' }, // Optional
  { engineName: 'V1', load: '', kw: '', foPress: '', lubOilPress: '', waterTemp: '', dailyRunHour: '' }   // Optional
];

const DepartureForm: React.FC = () => {
  const navigate = useNavigate(); // Initialize useNavigate
  const { user } = useAuth(); // Assuming captain is logged in
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const [isLoadingVessel, setIsLoadingVessel] = useState(true);
  const [vesselError, setVesselError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isDeparturePortReadOnly, setIsDeparturePortReadOnly] = useState(false); // State for read-only status

  // Form state - initialize with default/empty values
  const [formData, setFormData] = useState<Partial<DepartureFormData>>({
    // Initialize form state - use empty strings/defaults
    reportDate: '', // Required
    reportTime: '', // Required
    timeZone: '', // Required
    departurePort: '', // Required
    destinationPort: '', // Required
    voyageDistance: '', // Required (will be parsed to number)
    etaDate: '', // Required
    etaTime: '', // Required
    fwdDraft: '', // Required
    aftDraft: '', // Required
    cargoQuantity: '', // Required
    cargoType: '', // Required
    cargoStatus: 'Loaded', // Required (default)
    faspDate: '', // Required
    faspTime: '', // Required
    faspLatDeg: '', // Required
    faspLatMin: '', // Required
    faspLatDir: 'N', // Required (default N)
    faspLonDeg: '', // Required
    faspLonMin: '', // Required
    faspLonDir: 'E', // Required (default E)
    faspCourse: '', // Required
    harbourDistance: '', // Required
    harbourTime: '', // Required
    // distanceSinceLastReport: '', // Removed
    // Weather (Required)
    windDirection: 'N', 
    seaDirection: 'N',
    swellDirection: 'N',
    windForce: '',
    seaState: '',
    swellHeight: '',
    // Bunkers Consumption (Required)
    meConsumptionLsifo: '',
    meConsumptionLsmgo: '',
    meConsumptionCylOil: '',
    meConsumptionMeOil: '',
    meConsumptionAeOil: '',
    boilerConsumptionLsifo: '',
    boilerConsumptionLsmgo: '',
    auxConsumptionLsifo: '',
    auxConsumptionLsmgo: '',
    // Bunkers Supply (Required)
    supplyLsifo: '',
    supplyLsmgo: '',
    supplyCylOil: '',
    supplyMeOil: '',
    supplyAeOil: '',
    // Initial ROBs (Optional Input)
    initialRobLsifo: '', 
    initialRobLsmgo: '',
    initialRobCylOil: '',
    initialRobMeOil: '',
    initialRobAeOil: '',
    // Machinery (Required)
    meFoPressure: '',
    meLubOilPressure: '',
    meFwInletTemp: '',
    meLoInletTemp: '',
    meScavengeAirTemp: '',
    meTcRpm1: '',
    meTcRpm2: '',
    meTcExhaustTempIn: '',
    meTcExhaustTempOut: '',
    meThrustBearingTemp: '',
    meDailyRunHours: '',
    mePresentRpm: '', // Added mePresentRpm
    meCurrentSpeed: '', // Added Current Speed
    // Initialize machinery arrays in state
    engineUnits: initialEngineUnits,
    auxEngines: initialAuxEngines,
  });

  // Fetch assigned vessel info on mount
  useEffect(() => {
    const fetchVessel = async () => {
      setIsLoadingVessel(true);
      setVesselError(null);
      try {
        const response = await apiClient.get<VesselInfo>('/vessels/my-vessel');
        const fetchedVesselInfo = response.data;
        console.log("Fetched Vessel Info:", fetchedVesselInfo); // Log fetched data
        setVesselInfo(fetchedVesselInfo);

        // Pre-fill departure port and set read-only status if last destination exists
        if (fetchedVesselInfo.lastDestinationPort) {
          console.log("Setting Departure Port from lastDestinationPort:", fetchedVesselInfo.lastDestinationPort); // Log pre-fill action
          setFormData(prev => ({
            ...prev,
            departurePort: fetchedVesselInfo.lastDestinationPort || '' 
          }));
          setIsDeparturePortReadOnly(true); // Set read-only to true
          console.log("Set isDeparturePortReadOnly to true"); // Log state set
        } else {
          setIsDeparturePortReadOnly(false); // Ensure it's false otherwise
          console.log("Set isDeparturePortReadOnly to false"); // Log state set
        }

      } catch (err: any) {
        console.error("Error fetching vessel info:", err);
        setVesselError(err.response?.data?.error || "Failed to load assigned vessel information.");
      } finally {
        setIsLoadingVessel(false);
      }
    };
    if (user?.role === 'captain') {
      fetchVessel();
    } else {
      setVesselError("User is not a captain."); // Should be caught by routing, but good practice
      setIsLoadingVessel(false);
    }
  }, [user]); // Re-fetch if user changes (e.g., logout/login)

  // Handle standard form input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Special handling for coordinate direction selects
    if (name === 'faspLatDir' || name === 'faspLonDir') {
      setFormData(prev => ({ ...prev, [name]: value as 'N' | 'S' | 'E' | 'W' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Specific handlers for CoordinateInputGroup
  const handleCoordinateChange = (
    prefix: 'faspLat' | 'faspLon', 
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

  // Specific handlers for nested machinery data arrays
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!vesselInfo) {
      setSubmitError("Vessel information not loaded.");
      return;
    }
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);

    // --- Input Format Validation ---
    const errors: string[] = [];
    const numericFields = [
        'voyageDistance', 'fwdDraft', 'aftDraft', 'cargoQuantity', 
        'faspLatDeg', 'faspLatMin', // Replaced faspLatitude
        'faspLonDeg', 'faspLonMin', // Replaced faspLongitude
        'faspCourse',
        'harbourDistance', /* 'distanceSinceLastReport', */ 'windForce', 'seaState', 'swellHeight', // Removed distanceSinceLastReport
        'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
        'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
        'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
        'initialRobLsifo', 'initialRobLsmgo', 'initialRobCylOil', 'initialRobMeOil', 'initialRobAeOil', // Optional, validate if present
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp',
        'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours'
    ];
    const stringOnlyFields = ['departurePort', 'destinationPort', 'cargoType'];

    // Validate standard numeric fields
    numericFields.forEach(field => {
        const value = formData[field as keyof DepartureFormData];
        // Allow empty strings for optional fields (like initial ROBs, meTcRpm2), but fail if non-empty and not numeric
        if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
            errors.push(`${field} must be a valid number.`);
        }
    });

    // Validate string-only fields (no digits allowed)
    stringOnlyFields.forEach(field => {
        const value = formData[field as keyof DepartureFormData];
        if (value && /\d/.test(String(value))) { // Check if value exists and contains digits
            errors.push(`${field} cannot contain numbers.`);
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
        setSubmitError(errors.join(' '));
        setIsSubmitting(false);
        return;
    }
    // --- End Input Format Validation ---

    // Construct payload ensuring all required fields are present and correctly typed
    const payload: DepartureSpecificData = {
      reportType: 'departure',
      vesselId: vesselInfo.id,
      // General Info (Required)
      reportDate: formData.reportDate || '', // Provide default empty string if somehow undefined
      reportTime: formData.reportTime || '',
      timeZone: formData.timeZone || '',
      // Voyage Details (Required)
      departurePort: formData.departurePort || '',
      destinationPort: formData.destinationPort || '',
      voyageDistance: Number(formData.voyageDistance) || 0,
      etaDate: formData.etaDate || '',
      etaTime: formData.etaTime || '',
      // Drafts & Cargo (Required)
      fwdDraft: Number(formData.fwdDraft) || 0,
      aftDraft: Number(formData.aftDraft) || 0,
      cargoQuantity: Number(formData.cargoQuantity) || 0,
      cargoType: formData.cargoType || '',
      cargoStatus: formData.cargoStatus || 'Loaded', // Default if undefined
      // FASP (Required)
      faspDate: formData.faspDate || '',
      faspTime: formData.faspTime || '',
      faspLatDeg: Number(formData.faspLatDeg) || 0,
      faspLatMin: Number(formData.faspLatMin) || 0,
      faspLatDir: formData.faspLatDir || 'N', // Default if somehow undefined
      faspLonDeg: Number(formData.faspLonDeg) || 0,
      faspLonMin: Number(formData.faspLonMin) || 0,
      faspLonDir: formData.faspLonDir || 'E', // Default if somehow undefined
      faspCourse: Number(formData.faspCourse) || 0,
      // Distance (Required)
      harbourDistance: Number(formData.harbourDistance) || 0,
      harbourTime: formData.harbourTime || '',
      // distanceSinceLastReport: Number(formData.distanceSinceLastReport) || 0, // Removed
      // Weather (Required)
      windDirection: formData.windDirection || 'N',
      seaDirection: formData.seaDirection || 'N',
      swellDirection: formData.swellDirection || 'N',
      windForce: Number(formData.windForce) || 0,
      seaState: Number(formData.seaState) || 0,
      swellHeight: Number(formData.swellHeight) || 0,
      // Bunkers Consumption (Required)
      meConsumptionLsifo: Number(formData.meConsumptionLsifo) || 0,
      meConsumptionLsmgo: Number(formData.meConsumptionLsmgo) || 0,
      meConsumptionCylOil: Number(formData.meConsumptionCylOil) || 0,
      meConsumptionMeOil: Number(formData.meConsumptionMeOil) || 0,
      meConsumptionAeOil: Number(formData.meConsumptionAeOil) || 0,
      boilerConsumptionLsifo: Number(formData.boilerConsumptionLsifo) || 0,
      boilerConsumptionLsmgo: Number(formData.boilerConsumptionLsmgo) || 0,
      auxConsumptionLsifo: Number(formData.auxConsumptionLsifo) || 0,
      auxConsumptionLsmgo: Number(formData.auxConsumptionLsmgo) || 0,
      // Bunkers Supply (Required)
      supplyLsifo: Number(formData.supplyLsifo) || 0,
      supplyLsmgo: Number(formData.supplyLsmgo) || 0,
      supplyCylOil: Number(formData.supplyCylOil) || 0,
      supplyMeOil: Number(formData.supplyMeOil) || 0,
      supplyAeOil: Number(formData.supplyAeOil) || 0,
      // Machinery (Required)
      meFoPressure: Number(formData.meFoPressure) || 0,
      meLubOilPressure: Number(formData.meLubOilPressure) || 0,
      meFwInletTemp: Number(formData.meFwInletTemp) || 0,
      meLoInletTemp: Number(formData.meLoInletTemp) || 0,
      meScavengeAirTemp: Number(formData.meScavengeAirTemp) || 0,
      meTcRpm1: Number(formData.meTcRpm1) || 0,
      meTcRpm2: Number(formData.meTcRpm2) || 0,
      meTcExhaustTempIn: Number(formData.meTcExhaustTempIn) || 0,
      meTcExhaustTempOut: Number(formData.meTcExhaustTempOut) || 0,
      meThrustBearingTemp: Number(formData.meThrustBearingTemp) || 0,
      meDailyRunHours: Number(formData.meDailyRunHours) || 0,
      mePresentRpm: Number(formData.mePresentRpm) || 0, // Added mePresentRpm
      meCurrentSpeed: Number(formData.meCurrentSpeed) || 0, // Added meCurrentSpeed
      // Initial ROBs (Conditional)
      initialRobLsifo: showInitialRob ? (Number(formData.initialRobLsifo) || undefined) : undefined,
      initialRobLsmgo: showInitialRob ? (Number(formData.initialRobLsmgo) || undefined) : undefined,
      initialRobCylOil: showInitialRob ? (Number(formData.initialRobCylOil) || undefined) : undefined,
      initialRobMeOil: showInitialRob ? (Number(formData.initialRobMeOil) || undefined) : undefined,
      initialRobAeOil: showInitialRob ? (Number(formData.initialRobAeOil) || undefined) : undefined,
      // Add engineUnits and auxEngines data from state, converting numeric strings
      engineUnits: formData.engineUnits?.map(unit => ({
        ...unit,
        exhaustTemp: unit.exhaustTemp !== undefined && unit.exhaustTemp !== '' ? Number(unit.exhaustTemp) : undefined,
        underPistonAir: unit.underPistonAir !== undefined && unit.underPistonAir !== '' ? Number(unit.underPistonAir) : undefined,
        pcoOutletTemp: unit.pcoOutletTemp !== undefined && unit.pcoOutletTemp !== '' ? Number(unit.pcoOutletTemp) : undefined,
        jcfwOutletTemp: unit.jcfwOutletTemp !== undefined && unit.jcfwOutletTemp !== '' ? Number(unit.jcfwOutletTemp) : undefined,
      })) || [],
      auxEngines: formData.auxEngines?.map(aux => ({
        ...aux,
        load: aux.load !== undefined && aux.load !== '' ? Number(aux.load) : undefined,
        kw: aux.kw !== undefined && aux.kw !== '' ? Number(aux.kw) : undefined,
        foPress: aux.foPress !== undefined && aux.foPress !== '' ? Number(aux.foPress) : undefined,
        lubOilPress: aux.lubOilPress !== undefined && aux.lubOilPress !== '' ? Number(aux.lubOilPress) : undefined,
        waterTemp: aux.waterTemp !== undefined && aux.waterTemp !== '' ? Number(aux.waterTemp) : undefined,
        dailyRunHour: aux.dailyRunHour !== undefined && aux.dailyRunHour !== '' ? Number(aux.dailyRunHour) : undefined,
      })) || [],
    };

    // Remove undefined initial ROB fields if they weren't needed (or weren't entered)
     if (!showInitialRob || payload.initialRobLsifo === undefined) delete payload.initialRobLsifo;
     if (!showInitialRob || payload.initialRobLsmgo === undefined) delete payload.initialRobLsmgo;
     if (!showInitialRob || payload.initialRobCylOil === undefined) delete payload.initialRobCylOil;
     if (!showInitialRob || payload.initialRobMeOil === undefined) delete payload.initialRobMeOil;
     if (!showInitialRob || payload.initialRobAeOil === undefined) delete payload.initialRobAeOil;


    try {
      await apiClient.post('/reports', payload); // Submit to the unified report endpoint
      setSubmitSuccess("Departure report submitted successfully!");
      // Optionally reset form: setFormData({ ...initial empty state... });
      // Add navigation after success
      setTimeout(() => navigate('/captain'), 1500); 
    } catch (err: any) {
      console.error("Error submitting departure report:", err);
      setSubmitError(err.response?.data?.error || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Determine if Initial ROB fields should be shown/editable
  const showInitialRob = vesselInfo && vesselInfo.initialRobLsifo === null;

  // Render loading/error states or the form
  if (isLoadingVessel) return <div className="p-4 text-center">Loading vessel data...</div>;
  if (vesselError) return <div className="p-4 bg-red-100 text-red-700 rounded">{vesselError}</div>;
  if (!vesselInfo) return <div className="p-4 text-center">Could not load vessel data.</div>;


  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md">
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">New Departure Report</h2>

      {/* Vessel Info Display */}
      <div className="mb-6 p-4 border rounded bg-gray-50">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Vessel & Captain Information</h3>
          <p><strong>Vessel Name:</strong> {vesselInfo.name}</p>
          <p><strong>IMO Number:</strong> {vesselInfo.imoNumber}</p>
          <p><strong>Deadweight (DWT):</strong> {vesselInfo.deadweight}</p>
          <p><strong>Captain:</strong> {user?.name || 'N/A'}</p> {/* Display logged-in captain's name */}
      </div>

      {submitError && <div className="p-3 bg-red-100 text-red-700 rounded">{submitError}</div>}
      {submitSuccess && <div className="p-3 bg-green-100 text-green-700 rounded">{submitSuccess}</div>}

      {/* --- General Info Section --- */}
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
            <label htmlFor="timeZone" className="block text-sm font-medium text-gray-700">Time Zone (e.g., UTC+3)</label>
            <input type="text" id="timeZone" name="timeZone" value={formData.timeZone} onChange={handleChange} required placeholder="UTC+/-HH:MM or Name" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
          </div>
        </div>
      </fieldset>

      {/* --- Voyage Details Section --- */}
      <fieldset className="border p-4 rounded">
        <legend className="text-lg font-medium px-2">Voyage Details</legend>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                {/* Update label and add readOnly attribute conditionally */}
                <label htmlFor="departurePort" className="block text-sm font-medium text-gray-700">
                  Departure Port {isDeparturePortReadOnly ? '(from last voyage)' : ''}
                </label>
                <input 
                  type="text" 
                  id="departurePort" 
                  name="departurePort" 
                  value={formData.departurePort} 
                  onChange={handleChange} 
                  required 
                  readOnly={isDeparturePortReadOnly} // Bind to state variable
                  className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isDeparturePortReadOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`} // Style read-only field based on state
                />
            </div>
             <div>
                <label htmlFor="destinationPort" className="block text-sm font-medium text-gray-700">Destination Port</label>
                <input type="text" id="destinationPort" name="destinationPort" value={formData.destinationPort} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="voyageDistance" className="block text-sm font-medium text-gray-700">Voyage Distance (NM)</label>
                <input type="number" id="voyageDistance" name="voyageDistance" value={formData.voyageDistance} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="etaDate" className="block text-sm font-medium text-gray-700">ETA Date</label>
                <input type="date" id="etaDate" name="etaDate" value={formData.etaDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="etaTime" className="block text-sm font-medium text-gray-700">ETA Time</label>
                <input type="time" id="etaTime" name="etaTime" value={formData.etaTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
         </div>
      </fieldset>
      
      {/* --- Drafts & Cargo Section --- */}
      <fieldset className="border p-4 rounded">
        <legend className="text-lg font-medium px-2">Drafts & Cargo</legend>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                <label htmlFor="fwdDraft" className="block text-sm font-medium text-gray-700">Fwd Draft (m)</label>
                <input type="number" step="0.01" id="fwdDraft" name="fwdDraft" value={formData.fwdDraft} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="aftDraft" className="block text-sm font-medium text-gray-700">Aft Draft (m)</label>
                <input type="number" step="0.01" id="aftDraft" name="aftDraft" value={formData.aftDraft} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="cargoQuantity" className="block text-sm font-medium text-gray-700">Cargo Quantity (MT)</label>
                <input type="number" id="cargoQuantity" name="cargoQuantity" value={formData.cargoQuantity} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="cargoType" className="block text-sm font-medium text-gray-700">Cargo Type</label>
                <input type="text" id="cargoType" name="cargoType" value={formData.cargoType} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
            </div>
             <div>
                <label htmlFor="cargoStatus" className="block text-sm font-medium text-gray-700">Cargo Status</label>
                <select id="cargoStatus" name="cargoStatus" value={formData.cargoStatus} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white">
                    <option value="Loaded">Loaded</option>
                    <option value="Empty">Empty</option>
                </select>
            </div>
         </div>
      </fieldset>

      {/* --- FASP Section --- */}
      <fieldset className="border p-4 rounded">
        <legend className="text-lg font-medium px-2">FASP Details</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="faspDate" className="block text-sm font-medium text-gray-700">FASP Date</label>
            <input type="date" id="faspDate" name="faspDate" value={formData.faspDate} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
          </div>
          <div>
            <label htmlFor="faspTime" className="block text-sm font-medium text-gray-700">FASP Time</label>
            <input type="time" id="faspTime" name="faspTime" value={formData.faspTime} onChange={handleChange} required className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
          </div>
          {/* Replace FASP Lat/Lon inputs with CoordinateInputGroup */}
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <CoordinateInputGroup
              label="FASP Latitude"
              idPrefix="faspLat"
              degreeValue={formData.faspLatDeg ?? ''}
              minuteValue={formData.faspLatMin ?? ''}
              directionValue={formData.faspLatDir ?? 'N'}
              onDegreeChange={(e) => handleCoordinateChange('faspLat', 'Deg', e.target.value)}
              onMinuteChange={(e) => handleCoordinateChange('faspLat', 'Min', e.target.value)}
              onDirectionChange={(e) => handleCoordinateChange('faspLat', 'Dir', e.target.value)}
              directionOptions={['N', 'S']}
              required={true}
              // Add error props if implementing detailed validation later
            />
            <CoordinateInputGroup
              label="FASP Longitude"
              idPrefix="faspLon"
              degreeValue={formData.faspLonDeg ?? ''}
              minuteValue={formData.faspLonMin ?? ''}
              directionValue={formData.faspLonDir ?? 'E'}
              onDegreeChange={(e) => handleCoordinateChange('faspLon', 'Deg', e.target.value)}
              onMinuteChange={(e) => handleCoordinateChange('faspLon', 'Min', e.target.value)}
              onDirectionChange={(e) => handleCoordinateChange('faspLon', 'Dir', e.target.value)}
              directionOptions={['E', 'W']}
              required={true}
              // Add error props if implementing detailed validation later
            />
          </div>
           <div>
            <label htmlFor="faspCourse" className="block text-sm font-medium text-gray-700">FASP Course (°)</label>
            <input type="number" id="faspCourse" name="faspCourse" value={formData.faspCourse} onChange={handleChange} required min="0" max="360" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
          </div>
        </div>
      </fieldset>

       {/* --- Distance Section (Part of Voyage/FASP in backend type, separate section for clarity) --- */}
       <fieldset className="border p-4 rounded">
         <legend className="text-lg font-medium px-2">Distance Since Last</legend>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
             <label htmlFor="harbourDistance" className="block text-sm font-medium text-gray-700">Harbour Distance (NM)</label>
             <input type="number" step="0.1" id="harbourDistance" name="harbourDistance" value={formData.harbourDistance} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
           </div>
           <div>
             <label htmlFor="harbourTime" className="block text-sm font-medium text-gray-700">Harbour Time (HH:MM)</label>
             <input type="text" pattern="[0-9]{2}:[0-9]{2}" id="harbourTime" name="harbourTime" value={formData.harbourTime} onChange={handleChange} required placeholder="HH:MM" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
           </div>
           {/* Removed Distance Since Last Report Input */}
         </div>
       </fieldset>

      {/* --- Weather Section --- */}
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

      {/* --- Bunkers Section --- */}
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

      {/* --- Initial ROB Section (Conditional) --- */}
      {showInitialRob && (
        <fieldset className="border p-4 rounded border-orange-300 bg-orange-50">
            <legend className="text-lg font-medium px-2 text-orange-700">Initial ROB (First Departure Only)</legend>
            <p className="text-sm text-orange-600 mb-2">Enter the initial Remaining On Board quantities as this is the first departure report for this vessel.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                    <label htmlFor="initialRobLsifo" className="block text-sm font-medium text-gray-700">Initial LSIFO (MT)</label>
                    <input type="number" step="0.01" id="initialRobLsifo" name="initialRobLsifo" value={formData.initialRobLsifo ?? ''} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
                </div>
                 {/* Add inputs for LSMGO, CylOil, MeOil, AeOil */}
                 <div>
                    <label htmlFor="initialRobLsmgo" className="block text-sm font-medium text-gray-700">Initial LSMGO (MT)</label>
                    <input type="number" step="0.01" id="initialRobLsmgo" name="initialRobLsmgo" value={formData.initialRobLsmgo ?? ''} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
                </div>
                 <div>
                    <label htmlFor="initialRobCylOil" className="block text-sm font-medium text-gray-700">Initial Cyl Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobCylOil" name="initialRobCylOil" value={formData.initialRobCylOil ?? ''} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
                </div>
                 <div>
                    <label htmlFor="initialRobMeOil" className="block text-sm font-medium text-gray-700">Initial ME Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobMeOil" name="initialRobMeOil" value={formData.initialRobMeOil ?? ''} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
                </div>
                 <div>
                    <label htmlFor="initialRobAeOil" className="block text-sm font-medium text-gray-700">Initial AE Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobAeOil" name="initialRobAeOil" value={formData.initialRobAeOil ?? ''} onChange={handleChange} required min="0" className="mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm"/>
                </div>
            </div>
        </fieldset>
      )}
      {/* --- Machinery Section --- */}
      <fieldset className="border p-4 rounded">
        <legend className="text-lg font-medium px-2">Machinery</legend>
        <MachineryMEParamsSection
          formData={formData}
          handleChange={handleChange}
          isTcRpm2Optional={true} // TC#2 is optional in Departure form
          includeDailyRunHours={true} // Departure form includes daily run hours
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


      {/* --- Submission Button --- */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || isLoadingVessel}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
            (isSubmitting || isLoadingVessel) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Departure Report'}
        </button>
      </div>
    </form>
  );
};

export default DepartureForm;
