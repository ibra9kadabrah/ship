import React, { useState, useEffect, ChangeEvent } from 'react'; // Added ChangeEvent
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import apiClient, { getCarryOverCargoDetails, getReportById } from '../../services/api'; // Import getCarryOverCargoDetails and getReportById
import { useAuth } from '../../contexts/AuthContext';
import { VesselInfo } from '../../types/vessel';
import { CarryOverCargo } from '../../types/voyage'; // Import CarryOverCargo
import { DepartureSpecificData, BaseReportFormData, CardinalDirection, CargoStatus, EngineUnitData, AuxEngineData, FullReportViewDTO } from '../../types/report'; // Added FullReportViewDTO
import { departureChecklistItems, ChecklistItem } from '../../config/reportChecklists'; // Import checklist config
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

interface DepartureFormProps {
  reportIdToModify?: string;
}

const DepartureForm: React.FC<DepartureFormProps> = ({ reportIdToModify }) => {
  const navigate = useNavigate(); // Initialize useNavigate
  const { user } = useAuth(); // Assuming captain is logged in
  const [vesselInfo, setVesselInfo] = useState<VesselInfo | null>(null);
  const isModifyMode = !!reportIdToModify;
  const [initialReportData, setInitialReportData] = useState<FullReportViewDTO | null>(null);
  const [activeModificationChecklist, setActiveModificationChecklist] = useState<string[]>([]);
  const [officeChangesComment, setOfficeChangesComment] = useState<string | null>(null);
  const [isLoadingVessel, setIsLoadingVessel] = useState(true);
  const [vesselError, setVesselError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isDeparturePortReadOnly, setIsDeparturePortReadOnly] = useState(false); // State for read-only status
  const [carryOverCargo, setCarryOverCargo] = useState<CarryOverCargo | null>(null);
  const [isLoadingCarryOver, setIsLoadingCarryOver] = useState(false);
  const [carryOverError, setCarryOverError] = useState<string | null>(null);
  const [isCargoTypeReadOnly, setIsCargoTypeReadOnly] = useState(false);
  const [isCargoQuantityReadOnly, setIsCargoQuantityReadOnly] = useState(false);
  const [isCargoStatusReadOnly, setIsCargoStatusReadOnly] = useState(false);
  const [isLoadingReportToModify, setIsLoadingReportToModify] = useState(false);


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
      setIsLoadingCarryOver(true); // Start loading carry-over info
      setCarryOverError(null);
      try {
        const response = await apiClient.get<VesselInfo>('/vessels/my-vessel');
        const fetchedVesselInfo = response.data;
        console.log("Fetched Vessel Info:", fetchedVesselInfo);
        setVesselInfo(fetchedVesselInfo);

        if (fetchedVesselInfo.lastDestinationPort) {
          console.log("Setting Departure Port from lastDestinationPort:", fetchedVesselInfo.lastDestinationPort);
          setFormData(prev => ({
            ...prev,
            departurePort: fetchedVesselInfo.lastDestinationPort || ''
          }));
          setIsDeparturePortReadOnly(true);
          console.log("Set isDeparturePortReadOnly to true");
        } else {
          setIsDeparturePortReadOnly(false);
          console.log("Set isDeparturePortReadOnly to false");
        }

        // Fetch carry-over cargo details if vessel ID is available
        if (fetchedVesselInfo.id) {
          try {
            const cargo = await getCarryOverCargoDetails(fetchedVesselInfo.id);
            setCarryOverCargo(cargo);
            console.log("Fetched Carry Over Cargo:", cargo);
          } catch (cargoErr: any) {
            console.error("Error fetching carry-over cargo:", cargoErr);
            // Don't block form for this, but log error. User can still input manually.
            setCarryOverError(cargoErr.message || "Failed to load carry-over cargo details.");
          }
        }
      } catch (err: any) {
        console.error("Error fetching vessel info:", err);
        setVesselError(err.response?.data?.error || "Failed to load assigned vessel information.");
      } finally {
        setIsLoadingVessel(false);
        setIsLoadingCarryOver(false); // Finish loading carry-over info
      }
    };
    if (user?.role === 'captain') {
      fetchVessel();
    } else {
      setVesselError("User is not a captain.");
      setIsLoadingVessel(false);
      setIsLoadingCarryOver(false);
    }
  }, [user]);

  // Effect to fetch report details if in modify mode
  useEffect(() => {
    if (isModifyMode && reportIdToModify) {
      const fetchReportToModify = async () => {
        setIsLoadingReportToModify(true);
        setSubmitError(null); // Clear previous errors
        try {
          const report = await getReportById(reportIdToModify);
          setInitialReportData(report);
console.log("[Modify Mode] Fetched report for modification. Raw report data:", JSON.stringify(report));
          console.log("[Modify Mode] Modification checklist from report:", JSON.stringify(report.modification_checklist));
          console.log("[Modify Mode] Requested changes comment from report:", report.requested_changes_comment);
          // Pre-fill formData - ensure all fields from FullReportViewDTO are mapped to DepartureFormData
          // This might need careful mapping if structures differ significantly for some fields
          // Create a helper for safe string conversion from number | null | undefined
          const toStringOrEmpty = (val: number | null | undefined): string => val !== null && val !== undefined ? String(val) : '';

          const mappedData: Partial<DepartureFormData> = {
            // Map all fields from FullReportViewDTO to DepartureFormData, handling nulls and type conversions
            reportDate: report.reportDate || '',
            reportTime: report.reportTime || '',
            timeZone: report.timeZone || '',
            departurePort: report.departurePort || '',
            destinationPort: report.destinationPort || '',
            voyageDistance: toStringOrEmpty(report.voyageDistance),
            etaDate: report.etaDate || '',
            etaTime: report.etaTime || '',
            fwdDraft: toStringOrEmpty(report.fwdDraft),
            aftDraft: toStringOrEmpty(report.aftDraft),
            cargoQuantity: toStringOrEmpty(report.cargoQuantity),
            cargoType: report.cargoType || '',
            cargoStatus: report.cargoStatus ?? 'Loaded', // Default if null
            faspDate: report.faspDate || '',
            faspTime: report.faspTime || '',
            faspLatDeg: toStringOrEmpty(report.faspLatDeg),
            faspLatMin: toStringOrEmpty(report.faspLatMin),
            faspLatDir: report.faspLatDir ?? 'N',
            faspLonDeg: toStringOrEmpty(report.faspLonDeg),
            faspLonMin: toStringOrEmpty(report.faspLonMin),
            faspLonDir: report.faspLonDir ?? 'E',
            faspCourse: toStringOrEmpty(report.faspCourse),
            harbourDistance: toStringOrEmpty(report.harbourDistance),
            harbourTime: report.harbourTime || '',
            windDirection: report.windDirection ?? 'N', // Default if null, or use undefined if select handles it
            seaDirection: report.seaDirection ?? 'N',
            swellDirection: report.swellDirection ?? 'N',
            windForce: toStringOrEmpty(report.windForce),
            seaState: toStringOrEmpty(report.seaState),
            swellHeight: toStringOrEmpty(report.swellHeight),
            meConsumptionLsifo: toStringOrEmpty(report.meConsumptionLsifo),
            meConsumptionLsmgo: toStringOrEmpty(report.meConsumptionLsmgo),
            meConsumptionCylOil: toStringOrEmpty(report.meConsumptionCylOil),
            meConsumptionMeOil: toStringOrEmpty(report.meConsumptionMeOil),
            meConsumptionAeOil: toStringOrEmpty(report.meConsumptionAeOil),
            boilerConsumptionLsifo: toStringOrEmpty(report.boilerConsumptionLsifo),
            boilerConsumptionLsmgo: toStringOrEmpty(report.boilerConsumptionLsmgo),
            auxConsumptionLsifo: toStringOrEmpty(report.auxConsumptionLsifo),
            auxConsumptionLsmgo: toStringOrEmpty(report.auxConsumptionLsmgo),
            supplyLsifo: toStringOrEmpty(report.supplyLsifo),
            supplyLsmgo: toStringOrEmpty(report.supplyLsmgo),
            supplyCylOil: toStringOrEmpty(report.supplyCylOil),
            supplyMeOil: toStringOrEmpty(report.supplyMeOil),
            supplyAeOil: toStringOrEmpty(report.supplyAeOil),
            initialRobLsifo: toStringOrEmpty(report.initialRobLsifo),
            initialRobLsmgo: toStringOrEmpty(report.initialRobLsmgo),
            initialRobCylOil: toStringOrEmpty(report.initialRobCylOil),
            initialRobMeOil: toStringOrEmpty(report.initialRobMeOil),
            initialRobAeOil: toStringOrEmpty(report.initialRobAeOil),
            meFoPressure: toStringOrEmpty(report.meFoPressure),
            meLubOilPressure: toStringOrEmpty(report.meLubOilPressure),
            meFwInletTemp: toStringOrEmpty(report.meFwInletTemp),
            meLoInletTemp: toStringOrEmpty(report.meLoInletTemp),
            meScavengeAirTemp: toStringOrEmpty(report.meScavengeAirTemp),
            meTcRpm1: toStringOrEmpty(report.meTcRpm1),
            meTcRpm2: toStringOrEmpty(report.meTcRpm2),
            meTcExhaustTempIn: toStringOrEmpty(report.meTcExhaustTempIn),
            meTcExhaustTempOut: toStringOrEmpty(report.meTcExhaustTempOut),
            meThrustBearingTemp: toStringOrEmpty(report.meThrustBearingTemp),
            meDailyRunHours: toStringOrEmpty(report.meDailyRunHours),
            mePresentRpm: toStringOrEmpty(report.mePresentRpm),
            meCurrentSpeed: toStringOrEmpty(report.meCurrentSpeed),
            engineUnits: report.engineUnits?.map(u => ({ ...u, exhaustTemp: toStringOrEmpty(u.exhaustTemp), underPistonAir: toStringOrEmpty(u.underPistonAir), pcoOutletTemp: toStringOrEmpty(u.pcoOutletTemp), jcfwOutletTemp: toStringOrEmpty(u.jcfwOutletTemp)  })) || initialEngineUnits,
            auxEngines: report.auxEngines?.map(a => ({ ...a, load: toStringOrEmpty(a.load), kw: toStringOrEmpty(a.kw), foPress: toStringOrEmpty(a.foPress), lubOilPress: toStringOrEmpty(a.lubOilPress), waterTemp: toStringOrEmpty(a.waterTemp), dailyRunHour: toStringOrEmpty(a.dailyRunHour) })) || initialAuxEngines,
          };
          setFormData(mappedData);
          const checklist = report.modification_checklist || [];
          setActiveModificationChecklist(checklist);
          setOfficeChangesComment(report.requested_changes_comment || null);
          console.log("[Modify Mode] Fetched report. Active Checklist:", checklist); // Enhanced log
          console.log("[Modify Mode] Office comments:", report.requested_changes_comment); // Enhanced log
        } catch (err: any) {
          console.error("Error fetching report to modify:", err);
          setSubmitError(err.response?.data?.error || "Failed to load report data for modification.");
        } finally {
          setIsLoadingReportToModify(false);
        }
      };
      fetchReportToModify();
    }
  }, [reportIdToModify, isModifyMode]);

  // Effect to pre-fill cargo details from carryOverCargo (only in new report mode)
  useEffect(() => {
    if (isModifyMode) return; // Don't run this effect if in modify mode
    if (carryOverCargo && vesselInfo) {
      console.log("Pre-filling cargo from carryOverCargo:", carryOverCargo);

      const newCargoType = (carryOverCargo.lastCargoType !== null && carryOverCargo.lastCargoType !== undefined)
        ? carryOverCargo.lastCargoType
        : ''; // Default to empty string if null/undefined from carry-over

      const newCargoQuantityStr = (carryOverCargo.lastCargoQuantity !== null && carryOverCargo.lastCargoQuantity !== undefined)
        ? String(carryOverCargo.lastCargoQuantity)
        : '0'; // Default to '0' string if null/undefined from carry-over
      
      const numericCargoQuantity = Number(newCargoQuantityStr);

      const newCargoStatus: CargoStatus = numericCargoQuantity > 0 ? 'Loaded' : 'Empty';

      setFormData(prev => ({
        ...prev,
        cargoType: newCargoType,
        cargoQuantity: newCargoQuantityStr,
        cargoStatus: newCargoStatus,
      }));

      // If carryOverCargo object exists, these fields are considered determined by it and made read-only.
      setIsCargoTypeReadOnly(true);
      setIsCargoQuantityReadOnly(true);
      setIsCargoStatusReadOnly(true);
      console.log(`Cargo fields pre-filled. Type: "${newCargoType}", Qty: "${newCargoQuantityStr}", Status: "${newCargoStatus}". Read-only: true.`);

    } else if (vesselInfo) { // This condition means carryOverCargo is null, but vesselInfo is loaded
      // No carry-over data, or vesselInfo not yet loaded (though latter less likely here)
      // Ensure cargo fields are editable if they were previously made read-only by carry-over.
      setIsCargoTypeReadOnly(false);
      setIsCargoQuantityReadOnly(false);
      setIsCargoStatusReadOnly(false);
      console.log("No carry-over cargo data. Cargo fields are editable.");
    }
  }, [carryOverCargo, vesselInfo]); // Rerun if carryOverCargo or vesselInfo changes

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

    // Deadweight validation
    if (vesselInfo && vesselInfo.deadweight && formData.cargoQuantity) {
      const cargoQuantityNum = Number(formData.cargoQuantity);
      if (!isNaN(cargoQuantityNum) && cargoQuantityNum > vesselInfo.deadweight) {
        errors.push(`Cargo Quantity (${cargoQuantityNum} MT) cannot exceed vessel deadweight (${vesselInfo.deadweight} MT).`);
      }
    }

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
    const engineUnitNumericFields = ['exhaustTemp', 'underPistonAir', 'pcoOutletTemp', 'jcfwOutletTemp'];
    formData.engineUnits?.forEach((unit) => {
        engineUnitNumericFields.forEach(key => {
            const value = unit[key as keyof Omit<EngineUnitData, 'unitNumber' | 'id' | 'reportId' | 'createdAt' | 'updatedAt'>];
            if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
                errors.push(`Engine Unit #${unit.unitNumber} ${key} must be a valid number.`);
            }
        });
    });

    // Validate Aux Engines (numeric)
    const auxEngineNumericFields = ['load', 'kw', 'foPress', 'lubOilPress', 'waterTemp', 'dailyRunHour'];
    formData.auxEngines?.forEach((aux) => {
        auxEngineNumericFields.forEach(key => {
            const value = aux[key as keyof Omit<AuxEngineData, 'engineName' | 'id' | 'reportId' | 'createdAt' | 'updatedAt'>];
            if (value !== undefined && value !== null && value !== '' && isNaN(Number(value))) {
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
      if (isModifyMode && reportIdToModify) {
        // Construct changedData payload
        let changedData: Partial<DepartureSpecificData> = { reportType: 'departure' }; // Always include reportType
        let hasChanges = false;
        (Object.keys(formData) as Array<keyof DepartureFormData>).forEach(key => {
          // Compare with initialReportData, considering type conversions for numbers
          const currentValue = formData[key];
          const initialValue = initialReportData ? (initialReportData as any)[key] : undefined;

          let currentTransformed: any = currentValue;
          let initialTransformed: any = initialValue;

          // If the field is numeric, convert form string to number for comparison
          // This needs a robust way to identify numeric fields, perhaps from a predefined list or by checking initialReportData type
          // For simplicity, we'll assume numeric fields in payload are numbers.
          // This comparison logic needs to be very careful.
          // A simpler approach for now: if a field was editable, include its current value.
          // The backend will handle full object update and recalculations.
          
          // For now, let's assume we send all editable fields' current values.
          // A more precise diff would be better for a production system.
        });

        // For this phase, we'll send the whole formData for editable sections.
        // The backend will eventually need to be smart about merging.
        // Or, the frontend needs to send a precise diff.
        // For now, let's prepare a payload similar to new submission but for the /modify endpoint.
        // This is a placeholder for the actual diff logic or sending all editable fields.
        
        // Filter formData to include only fields affected by the active checklist
        const fieldsToSubmit: Partial<DepartureSpecificData> = { reportType: 'departure' };
        let actualChangesMade = false;
        departureChecklistItems.forEach(checklistItem => {
          if (activeModificationChecklist.includes(checklistItem.id)) {
            checklistItem.fields_affected.forEach(fieldName => {
              const key = fieldName as keyof DepartureFormData;
              if (formData[key] !== undefined) { // Check if field exists in formData
                // Compare with initialReportData to see if it actually changed
                const formValue = formData[key];
                const initialValueFromFetched = initialReportData ? (initialReportData as any)[key] : undefined;
                
                // Convert form value to number if it's a numeric field for proper comparison/payload
                let transformedFormValue: any = formValue;
                if (numericFields.includes(key as any) && typeof formValue === 'string' && formValue !== '') {
                    transformedFormValue = Number(formValue);
                } else if (typeof formValue === 'string' && formValue === '' && numericFields.includes(key as any) ) {
                    transformedFormValue = null; // Treat empty string for number as null
                }


                // This comparison is tricky due to type differences (string in form, number/null in initialData)
                // A robust diffing mechanism would be needed here.
                // For now, if a field is in the checklist, we include its current (transformed) value.
                (fieldsToSubmit as any)[key] = transformedFormValue;
                // A simple check for actual changes (could be more sophisticated)
                if (String(transformedFormValue) !== String(initialValueFromFetched)) {
                    actualChangesMade = true;
                }
              }
            });
          }
        });
        
        if (!actualChangesMade && Object.keys(fieldsToSubmit).length <=1 ) { // only reportType
            setSubmitError("No changes were made to the editable fields.");
            setIsSubmitting(false);
            return;
        }

        // Ensure engineUnits and auxEngines are included if they were part of the checklist
        if (activeModificationChecklist.some(id => departureChecklistItems.find(item => item.id === id)?.fields_affected.includes('engineUnits'))) {
            fieldsToSubmit.engineUnits = payload.engineUnits; // Use the fully processed engineUnits from payload
        }
        if (activeModificationChecklist.some(id => departureChecklistItems.find(item => item.id === id)?.fields_affected.includes('auxEngines'))) {
            fieldsToSubmit.auxEngines = payload.auxEngines; // Use the fully processed auxEngines from payload
        }


        await apiClient.patch(`/reports/${reportIdToModify}/resubmit`, fieldsToSubmit);
        setSubmitSuccess("Modified report submitted successfully!");
        setTimeout(() => navigate('/captain/history'), 1500); // Navigate to history to see updated status

      } else {
        await apiClient.post('/reports', payload); // Submit to the unified report endpoint
        setSubmitSuccess("Departure report submitted successfully!");
        setTimeout(() => navigate('/captain'), 1500);
      }
    } catch (err: any) {
      console.error(`Error submitting ${isModifyMode ? 'modified ' : ''}departure report:`, err);
      setSubmitError(err.response?.data?.error || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Determine if Initial ROB fields should be shown/editable
  const showInitialRob = vesselInfo && vesselInfo.initialRobLsifo === null;

  // Helper function to determine if a field should be editable in modify mode
  const isFieldEditable = (fieldName: string): boolean => {
    if (!isModifyMode) {
      return true;
    }
    if (activeModificationChecklist.length === 0) {
      // Log specifically for fields of interest if checklist is empty
      if (['cargoQuantity', 'fwdDraft', 'aftDraft'].includes(fieldName)) {
        console.log(`isFieldEditable for ${fieldName}: ModifyMode=true, ActiveChecklist EMPTY, Result: false`);
      }
      return false;
    }
    const editable = departureChecklistItems.some(item =>
      activeModificationChecklist.includes(item.id) && item.fields_affected.includes(fieldName)
    );
    // Log for fields of interest
    if (['cargoQuantity', 'fwdDraft', 'aftDraft', 'departurePort', 'destinationPort', 'harbourDistance', 'harbourTime', 'initialRobLsifo'].includes(fieldName)) {
      console.log(`isFieldEditable for ${fieldName}: ModifyMode=true, ActiveChecklist: ${JSON.stringify(activeModificationChecklist)}, Result: ${editable}`);
    } else {
      // Optional: log for other fields if needed, but can be noisy
      // console.log(`isFieldEditable for ${fieldName} (other): Result: ${editable}`);
    }
    return editable;
  };
  
  // Specific check for grouped sections like engineUnits or auxEngines
  // This function determines if ANY field within a section is editable,
  // which then passes isReadOnly={!isSectionEditable(...)} to the section component.
  // The section component itself will then use its own logic (if any) or apply readOnly to all its inputs.
  const isSectionEditable = (sectionChecklistPrefix: string): boolean => {
    if (!isModifyMode) return true;
    if (activeModificationChecklist.length === 0) return false;
    // Check if any checklist item relevant to this section is active
    const editable = departureChecklistItems.some(item =>
      activeModificationChecklist.includes(item.id) && item.id.startsWith(sectionChecklistPrefix)
    );
    console.log(`Section (prefix): ${sectionChecklistPrefix}, ActiveChecklist: ${JSON.stringify(activeModificationChecklist)}, IsSectionEditable: ${editable}`);
    return editable;
  };

  // Render loading/error states or the form
  if (isLoadingVessel || (isModifyMode && isLoadingReportToModify)) return <div className="p-4 text-center">Loading data...</div>;
  
  // Error display logic
  if (!isModifyMode && vesselError) return <div className="p-4 bg-red-100 text-red-700 rounded">{vesselError}</div>;
  if (isModifyMode && !initialReportData && submitError) return <div className="p-4 bg-red-100 text-red-700 rounded">{submitError}</div>; // Error fetching report to modify
  if (isModifyMode && !initialReportData && !isLoadingReportToModify) return <div className="p-4 text-center">Could not load report to modify.</div>; // Generic load fail for modify
  if (!isModifyMode && !vesselInfo && !isLoadingVessel) return <div className="p-4 text-center">Could not load assigned vessel data.</div>; // Generic load fail for new


  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4 bg-white rounded shadow-md">
      <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
        {isModifyMode && initialReportData ? `Modify Departure Report (ID: ${initialReportData.id.substring(0,8)}...)` : 'New Departure Report'}
      </h2>

      {isModifyMode && officeChangesComment && (
        <div className="mb-6 p-4 border rounded bg-yellow-50 border-yellow-300">
          <h3 className="text-lg font-medium text-yellow-700 mb-1">Office Comments for Modification:</h3>
          <p className="text-sm text-yellow-800 whitespace-pre-wrap">{officeChangesComment}</p>
        </div>
      )}

      {/* Vessel Info Display */}
      {(vesselInfo || initialReportData) && (
        <div className="mb-6 p-4 border rounded bg-gray-50">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Vessel & Captain Information</h3>
            <p><strong>Vessel Name:</strong> {isModifyMode && initialReportData ? initialReportData.vesselName : vesselInfo?.name}</p>
            {/* IMO and DWT are not in FullReportViewDTO, so only show if new report mode and vesselInfo is loaded */}
            {!isModifyMode && vesselInfo && (
              <>
                <p><strong>IMO Number:</strong> {vesselInfo.imoNumber}</p>
                <p><strong>Deadweight (DWT):</strong> {vesselInfo.deadweight}</p>
              </>
            )}
             {isModifyMode && initialReportData && ( // Show vessel ID if in modify mode as a fallback
                <p><strong>Vessel ID:</strong> {initialReportData.vesselId}</p>
            )}
            <p><strong>Captain:</strong> {isModifyMode && initialReportData ? initialReportData.captainName : user?.name || 'N/A'}</p>
        </div>
      )}

      {isModifyMode && (
        <div className="my-4 p-4 border rounded bg-yellow-50 border-yellow-300">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Office Change Request</h3>
          {officeChangesComment && (
            <div className="mb-3">
              <p className="font-medium text-yellow-700">Comment:</p>
              <p className="text-yellow-900 whitespace-pre-wrap">{officeChangesComment}</p>
            </div>
          )}
          {activeModificationChecklist.length > 0 && (
            <div>
              <p className="font-medium text-yellow-700">Requested changes for:</p>
              <ul className="list-disc list-inside ml-4 text-yellow-900">
                {activeModificationChecklist.map(itemId => {
                  const item = departureChecklistItems.find(ci => ci.id === itemId);
                  return <li key={itemId}>{item ? item.label : itemId}</li>;
                })}
              </ul>
            </div>
          )}
        </div>
      )}

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
                <input type="number" step="0.01" id="fwdDraft" name="fwdDraft" value={formData.fwdDraft} onChange={handleChange} required min="0" readOnly={isModifyMode && !isFieldEditable('fwdDraft')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('fwdDraft') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
            </div>
             <div>
                <label htmlFor="aftDraft" className="block text-sm font-medium text-gray-700">Aft Draft (m)</label>
                <input type="number" step="0.01" id="aftDraft" name="aftDraft" value={formData.aftDraft} onChange={handleChange} required min="0" readOnly={isModifyMode && !isFieldEditable('aftDraft')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !isFieldEditable('aftDraft') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
            </div>
             <div>
                <label htmlFor="cargoQuantity" className="block text-sm font-medium text-gray-700">
                  Cargo Quantity (MT) {(isModifyMode ? '' : (isCargoQuantityReadOnly ? '(from carry-over)' : ''))}
                </label>
                <input
                  type="number"
                  id="cargoQuantity"
                  name="cargoQuantity"
                  value={formData.cargoQuantity}
                  onChange={handleChange}
                  required
                  min="0"
                  readOnly={isModifyMode ? !isFieldEditable('cargoQuantity') : isCargoQuantityReadOnly}
                  className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${(isModifyMode ? !isFieldEditable('cargoQuantity') : isCargoQuantityReadOnly) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
            </div>
             <div>
                <label htmlFor="cargoType" className="block text-sm font-medium text-gray-700">
                  Cargo Type {(isModifyMode ? '' : (isCargoTypeReadOnly ? '(from carry-over)' : ''))}
                </label>
                <input
                  type="text"
                  id="cargoType"
                  name="cargoType"
                  value={formData.cargoType}
                  onChange={handleChange}
                  required
                  readOnly={isModifyMode ? !isFieldEditable('cargoType') : isCargoTypeReadOnly}
                  className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${(isModifyMode ? !isFieldEditable('cargoType') : isCargoTypeReadOnly) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
            </div>
             <div>
                <label htmlFor="cargoStatus" className="block text-sm font-medium text-gray-700">
                  Cargo Status {(isModifyMode ? '' : (isCargoStatusReadOnly ? '(from carry-over)' : ''))}
                </label>
                <select
                  id="cargoStatus"
                  name="cargoStatus"
                  value={formData.cargoStatus}
                  onChange={handleChange}
                  required
                  disabled={isModifyMode ? !isFieldEditable('cargoStatus') : isCargoStatusReadOnly}
                  className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${(isModifyMode ? !isFieldEditable('cargoStatus') : isCargoStatusReadOnly) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                >
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
            <input type="date" id="faspDate" name="faspDate" value={formData.faspDate || ''} onChange={handleChange} required readOnly={isModifyMode && !activeModificationChecklist.includes('departure_fasp_datetime')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_fasp_datetime') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
          </div>
          <div>
            <label htmlFor="faspTime" className="block text-sm font-medium text-gray-700">FASP Time</label>
            <input type="time" id="faspTime" name="faspTime" value={formData.faspTime || ''} onChange={handleChange} required readOnly={isModifyMode && !activeModificationChecklist.includes('departure_fasp_datetime')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_fasp_datetime') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
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
              readOnly={isModifyMode && !activeModificationChecklist.includes('departure_fasp_coords')}
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
              readOnly={isModifyMode && !activeModificationChecklist.includes('departure_fasp_coords')}
            />
          </div>
           <div>
            <label htmlFor="faspCourse" className="block text-sm font-medium text-gray-700">FASP Course (°)</label>
            <input type="number" id="faspCourse" name="faspCourse" value={formData.faspCourse || ''} onChange={handleChange} required min="0" max="360" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_fasp_course')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_fasp_course') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
          </div>
        </div>
      </fieldset>

       {/* --- Distance Section (Part of Voyage/FASP in backend type, separate section for clarity) --- */}
       <fieldset className="border p-4 rounded">
         <legend className="text-lg font-medium px-2">Distance Since Last</legend>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
             <label htmlFor="harbourDistance" className="block text-sm font-medium text-gray-700">Harbour Distance (NM)</label>
             <input type="number" step="0.1" id="harbourDistance" name="harbourDistance" value={formData.harbourDistance || ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_harbour_distance_time')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_harbour_distance_time') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
           </div>
           <div>
             <label htmlFor="harbourTime" className="block text-sm font-medium text-gray-700">Harbour Time (HH:MM)</label>
             <input type="text" pattern="[0-9]{2}:[0-9]{2}" id="harbourTime" name="harbourTime" value={formData.harbourTime || ''} onChange={handleChange} required placeholder="HH:MM" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_harbour_distance_time')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_harbour_distance_time') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
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
            <select id="windDirection" name="windDirection" value={formData.windDirection || 'N'} onChange={handleChange} required disabled={isModifyMode && !activeModificationChecklist.includes('departure_weather_wind')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !activeModificationChecklist.includes('departure_weather_wind') ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
              {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
            </select>
          </div>
           <div>
            <label htmlFor="windForce" className="block text-sm font-medium text-gray-700">Wind Force (Beaufort)</label>
            <input type="number" id="windForce" name="windForce" value={formData.windForce || ''} onChange={handleChange} required min="0" max="12" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_weather_wind')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_weather_wind') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
          </div>
           <div>
            <label htmlFor="seaDirection" className="block text-sm font-medium text-gray-700">Sea Direction</label>
             <select id="seaDirection" name="seaDirection" value={formData.seaDirection || 'N'} onChange={handleChange} required disabled={isModifyMode && !activeModificationChecklist.includes('departure_weather_sea')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !activeModificationChecklist.includes('departure_weather_sea') ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
               {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
             </select>
          </div>
           <div>
            <label htmlFor="seaState" className="block text-sm font-medium text-gray-700">Sea State (Douglas Scale)</label>
            <input type="number" id="seaState" name="seaState" value={formData.seaState || ''} onChange={handleChange} required min="0" max="9" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_weather_sea')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_weather_sea') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
          </div>
           <div>
            <label htmlFor="swellDirection" className="block text-sm font-medium text-gray-700">Swell Direction</label>
             <select id="swellDirection" name="swellDirection" value={formData.swellDirection || 'N'} onChange={handleChange} required disabled={isModifyMode && !activeModificationChecklist.includes('departure_weather_swell')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm bg-white ${isModifyMode && !activeModificationChecklist.includes('departure_weather_swell') ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
               {['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].map(dir => <option key={dir} value={dir}>{dir}</option>)}
             </select>
          </div>
           <div>
            <label htmlFor="swellHeight" className="block text-sm font-medium text-gray-700">Swell Height (m)</label>
            <input type="number" step="0.1" id="swellHeight" name="swellHeight" value={formData.swellHeight || ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_weather_swell')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_weather_swell') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
          </div>
        </div>
      </fieldset>

      {/* --- Bunkers Section --- */}
      <fieldset className="border p-4 rounded">
            <legend className="text-lg font-medium px-2">Bunkers</legend>
            <BunkerConsumptionSection
              formData={formData}
              handleChange={handleChange}
              isReadOnly={isModifyMode && !['departure_bunker_me_cons', 'departure_bunker_boiler_cons', 'departure_bunker_aux_cons'].some(id => activeModificationChecklist.includes(id))}
            />
            <BunkerSupplySection
              formData={formData}
              handleChange={handleChange}
              title="Supply (Since Last)"
              isReadOnly={isModifyMode && !activeModificationChecklist.includes('departure_bunker_supplies')}
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
                    <input type="number" step="0.01" id="initialRobLsifo" name="initialRobLsifo" value={formData.initialRobLsifo ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_initial_robs')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_initial_robs') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
                 {/* Add inputs for LSMGO, CylOil, MeOil, AeOil */}
                 <div>
                    <label htmlFor="initialRobLsmgo" className="block text-sm font-medium text-gray-700">Initial LSMGO (MT)</label>
                    <input type="number" step="0.01" id="initialRobLsmgo" name="initialRobLsmgo" value={formData.initialRobLsmgo ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_initial_robs')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_initial_robs') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
                 <div>
                    <label htmlFor="initialRobCylOil" className="block text-sm font-medium text-gray-700">Initial Cyl Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobCylOil" name="initialRobCylOil" value={formData.initialRobCylOil ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_initial_robs')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_initial_robs') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
                 <div>
                    <label htmlFor="initialRobMeOil" className="block text-sm font-medium text-gray-700">Initial ME Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobMeOil" name="initialRobMeOil" value={formData.initialRobMeOil ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_initial_robs')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_initial_robs') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
                </div>
                 <div>
                    <label htmlFor="initialRobAeOil" className="block text-sm font-medium text-gray-700">Initial AE Oil (L)</label>
                    <input type="number" step="0.01" id="initialRobAeOil" name="initialRobAeOil" value={formData.initialRobAeOil ?? ''} onChange={handleChange} required min="0" readOnly={isModifyMode && !activeModificationChecklist.includes('departure_initial_robs')} className={`mt-1 block w-full p-2 border border-gray-300 rounded shadow-sm ${isModifyMode && !activeModificationChecklist.includes('departure_initial_robs') ? 'bg-gray-100 cursor-not-allowed' : ''}`}/>
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
          isReadOnly={isModifyMode && !activeModificationChecklist.includes('departure_machinery_me_press_temp') && !activeModificationChecklist.includes('departure_machinery_me_tc') && !activeModificationChecklist.includes('departure_machinery_me_run_perf')}
        />
        <EngineUnitsSection
          engineUnits={formData.engineUnits || []}
          handleEngineUnitChange={handleEngineUnitChange}
          isReadOnly={isModifyMode && !activeModificationChecklist.includes('departure_machinery_engine_units')}
        />
        <AuxEnginesSection
          auxEngines={formData.auxEngines || []}
          handleAuxEngineChange={handleAuxEngineChange}
          isReadOnly={isModifyMode && !activeModificationChecklist.includes('departure_machinery_aux_engines')}
        />
      </fieldset>


      {/* --- Submission Button --- */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || isLoadingVessel || (isModifyMode && isLoadingReportToModify)}
          className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out ${
            (isSubmitting || isLoadingVessel || (isModifyMode && isLoadingReportToModify)) ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Submitting...' : (isModifyMode ? 'Submit Modified Report' : 'Submit Departure Report')}
        </button>
      </div>
    </form>
  );
};

export default DepartureForm;
