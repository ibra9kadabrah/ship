// frontend/src/components/OfficeReportModification.tsx
import React, { useState } from 'react';
import { reportModificationApi } from '../services/api';
import { ReportType } from '../types/report'; // Import ReportType

// Interfaces (can be moved to a types file)
interface FieldModification {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

interface CascadeResult {
  isValid: boolean;
  affectedReports: AffectedReport[];
  errors: string[];
}

interface AffectedReport {
  reportId: string;
  updates: Record<string, any>;
  errors: string[];
}

interface OfficeReportModificationProps {
  reportId: string;
  reportData: any; // Should be FullReportViewDTO or similar, includes reportType
  onClose: () => void;
  onSuccess: () => void;
}

// Define which fields are considered critical and editable
const EDITABLE_CRITICAL_FIELDS = Object.values({
  'Distance': ['distanceSinceLastReport', 'harbourDistance', 'voyageDistance', 'totalDistanceTravelled', 'distanceToGo'],
  'Bunker Consumption': ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo', 'totalConsumptionLsifo', 'totalConsumptionLsmgo', 'totalConsumptionCylOil', 'totalConsumptionMeOil', 'totalConsumptionAeOil'],
  'Bunker Supply & ROB': ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil', 'currentRobLsifo', 'currentRobLsmgo', 'currentRobCylOil', 'currentRobMeOil', 'currentRobAeOil'],
  'Cargo': ['cargoQuantity', 'cargoType', 'cargoStatus', 'cargoLoaded', 'cargoUnloaded'],
  'Port & Voyage': ['departurePort', 'destinationPort', 'voyageNumber']
}).flat();

// Define fields relevant to each report type for display
// This needs to be comprehensive for each report type.
const REPORT_TYPE_DISPLAY_FIELDS: Record<ReportType, string[]> = {
  departure: [
    'reportDate', 'reportTime', 'timeZone', 'departurePort', 'destinationPort', 'voyageNumber', 'voyageDistance',
    'fwdDraft', 'aftDraft', 'cargoQuantity', 'cargoType', 'cargoStatus',
    'faspDate', 'faspTime', 'faspLatDeg', 'faspLatMin', 'faspLatDir', 'faspLonDeg', 'faspLonMin', 'faspLonDir', 'faspCourse',
    'harbourDistance', 'distanceSinceLastReport', // Editable
    // Bunkers (editable ones are in EDITABLE_CRITICAL_FIELDS)
    'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil',
    'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo',
    'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil',
    'initialRobLsifo', 'initialRobLsmgo', 'initialRobCylOil', 'initialRobMeOil', 'initialRobAeOil', // Usually not editable after first submission
    'currentRobLsifo', 'currentRobLsmgo', 'currentRobCylOil', 'currentRobMeOil', 'currentRobAeOil', // Calculated, but shown
    'totalConsumptionLsifo', 'totalConsumptionLsmgo', 'totalConsumptionCylOil', 'totalConsumptionMeOil', 'totalConsumptionAeOil', // Calculated
    // Add other relevant departure fields
  ],
  noon: [
    'reportDate', 'reportTime', 'timeZone', 'passageState',
    'noonDate', 'noonTime', 'noonLatDeg', 'noonLatMin', 'noonLatDir', 'noonLonDeg', 'noonLonMin', 'noonLonDir', 'noonCourse',
    'sospDate', 'sospTime', 'sospLatDeg', 'sospLatMin', 'sospLatDir', 'sospLonDeg', 'sospLonMin', 'sospLonDir', 'sospCourse',
    'rospDate', 'rospTime', 'rospLatDeg', 'rospLatMin', 'rospLatDir', 'rospLonDeg', 'rospLonMin', 'rospLonDir', 'rospCourse',
    'distanceSinceLastReport', 'totalDistanceTravelled', 'distanceToGo', // Editable ones
    'avgSpeedVoyage', 'sailingTimeVoyage',
    // Bunkers
    'meConsumptionLsifo', 'meConsumptionLsmgo', /* ... other critical bunker fields ... */
    'currentRobLsifo', 'currentRobLsmgo', /* ... other ROB fields ... */
    // Add other relevant noon fields
  ],
  arrival: [
    'reportDate', 'reportTime', 'timeZone',
    'eospDate', 'eospTime', 'eospLatDeg', 'eospLatMin', 'eospLatDir', 'eospLonDeg', 'eospLonMin', 'eospLonDir', 'eospCourse',
    'estimatedBerthingDate', 'estimatedBerthingTime',
    'distanceSinceLastReport', 'totalDistanceTravelled', 'distanceToGo', // Editable ones
    // Bunkers
    'meConsumptionLsifo', 'meConsumptionLsmgo', /* ... other critical bunker fields ... */
    'currentRobLsifo', 'currentRobLsmgo', /* ... other ROB fields ... */
    // Add other relevant arrival fields
  ],
  berth: [
    'reportDate', 'reportTime', 'timeZone',
    'berthDate', 'berthTime', 'berthLatDeg', 'berthLatMin', 'berthLatDir', 'berthLonDeg', 'berthLonMin', 'berthLonDir', 'berthNumber',
    'cargoLoaded', 'cargoUnloaded', 'cargoQuantity', 'cargoStatus', // Editable ones
    'cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime',
    // Bunkers
    'supplyLsifo', 'supplyLsmgo', /* ... other critical supply fields ... */
    'currentRobLsifo', 'currentRobLsmgo', /* ... other ROB fields ... */
    // Add other relevant berth fields
  ],
  arrival_anchor_noon: [ // Combine relevant fields from arrival and noon, plus anchor specific
    'reportDate', 'reportTime', 'timeZone', 'passageState', // Noon part
    'noonDate', 'noonTime', 'noonLatDeg', 'noonLatMin', 'noonLatDir', 'noonLonDeg', 'noonLonMin', 'noonLonDir', 'noonCourse', // Noon part
    // Anchor specific parts (assuming these exist in FullReportViewDTO for this type)
    // 'anchorDropDate', 'anchorDropTime', 'anchorDropLat', 'anchorDropLon',
    // 'anchorAweighDate', 'anchorAweighTime', 'anchorAweighLat', 'anchorAweighLon',
    'distanceSinceLastReport', 'totalDistanceTravelled', 'distanceToGo',
    // Bunkers
    'meConsumptionLsifo', 'meConsumptionLsmgo', /* ... */
    'currentRobLsifo', 'currentRobLsmgo', /* ... */
    // Add other relevant fields
  ],
  // Ensure all ReportType values from frontend/src/types/report.ts are covered.
  // Removed 'departure_final', 'bunker_supply', 'engine_ops' as they are not in ReportType.
  // If new report types are added to ReportType, they should be added here too.
};


export const OfficeReportModification: React.FC<OfficeReportModificationProps> = ({
  reportId,
  reportData,
  onClose,
  onSuccess
}) => {
  const [modifications, setModifications] = useState<FieldModification[]>([]);
  const [cascadePreview, setCascadePreview] = useState<CascadeResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (fieldName: string, newValue: any) => {
    const oldValue = reportData[fieldName];
    const filteredMods = modifications.filter(m => m.fieldName !== fieldName);
    
    if (String(oldValue) !== String(newValue)) {
      setModifications([...filteredMods, { fieldName, oldValue, newValue }]);
    } else {
      setModifications(filteredMods);
    }
    setCascadePreview(null);
  };

  const handlePreviewCascade = async () => {
    if (modifications.length === 0) {
      setError("No modifications made to preview.");
      return;
    }
    setIsPreviewLoading(true);
    setError(null);
    try {
      const result = await reportModificationApi.previewCascade(reportId, modifications);
      setCascadePreview(result.cascadeResult);
      if (!result.cascadeResult?.isValid) {
        setError("Cascade validation failed. Please review errors shown in preview.");
      }
    } catch (err: any) {
      setError(err.message || 'Failed to preview cascade effects');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleApplyModifications = async () => {
    if (!cascadePreview || !cascadePreview.isValid) {
      setError("Cannot apply: Cascade validation failed or preview not run/successful.");
      return;
    }
    setIsApplying(true);
    setError(null);
    try {
      const result = await reportModificationApi.modifyWithCascade(reportId, modifications);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Failed to apply modifications');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to apply modifications');
    } finally {
      setIsApplying(false);
    }
  };
  
  const currentReportType = reportData.reportType as ReportType;
  const fieldsToDisplay = REPORT_TYPE_DISPLAY_FIELDS[currentReportType] || Object.keys(reportData).filter(key => typeof reportData[key] !== 'object' || reportData[key] === null);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Increased max-width for a wider modal */}
      <div className="bg-white rounded-lg p-6 md:p-8 max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <h2 className="text-2xl font-semibold text-gray-800">Modify Report (ID: {reportId})</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div className="mb-6 p-4 bg-gray-100 rounded-md">
          <h3 className="font-medium text-gray-700 mb-2">Key Information</h3>
          <p><strong>Type:</strong> <span className="capitalize">{reportData.reportType.replace('_', ' ')}</span></p>
          <p><strong>Date:</strong> {reportData.reportDate} {reportData.reportTime}</p>
          {reportData.vesselName && <p><strong>Vessel:</strong> {reportData.vesselName}</p>}
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Report Fields (Editable fields are critical)</h3>
          {/* Use a more spacious grid layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {fieldsToDisplay.map((key) => {
              const value = reportData[key];
              // Skip complex objects/arrays for this simple display, or handle them specifically
              if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return null; 
              }
              if (Array.isArray(value)) {
                return null;
              }

              const isEditable = EDITABLE_CRITICAL_FIELDS.includes(key);
              if (isEditable) {
                return (
                  <FieldEditor
                    key={key}
                    fieldName={key}
                    currentValue={reportData[key]}
                    onChange={(val) => handleFieldChange(key, val)}
                    isModified={modifications.some(m => m.fieldName === key)}
                  />
                );
              } else {
                return (
                  <div key={key} className="p-3 border border-gray-200 rounded-md bg-gray-50">
                    <label className="block text-sm font-medium text-gray-500 mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </label>
                    <p className="text-sm text-gray-800 break-words">
                      {value === null || value === undefined ? 'N/A' : String(value)}
                    </p>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {modifications.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-800">
            <h4 className="font-semibold mb-2">Pending Modifications ({modifications.length})</h4>
            <ul className="list-disc list-inside text-sm">
              {modifications.map((mod, index) => (
                <li key={index}>
                  <strong>{mod.fieldName}:</strong> {String(mod.oldValue)} &rarr; {String(mod.newValue)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {modifications.length > 0 && !cascadePreview && (
          <div className="mb-6">
            <button
              onClick={handlePreviewCascade}
              disabled={isPreviewLoading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition duration-150"
            >
              {isPreviewLoading ? 'Calculating...' : 'Preview Cascade Effects'}
            </button>
          </div>
        )}

        {cascadePreview && (
          <CascadePreviewDisplay 
            cascadeResult={cascadePreview}
            onApply={handleApplyModifications}
            isApplying={isApplying}
          />
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition duration-150"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

interface FieldEditorProps {
  fieldName: string;
  currentValue: any;
  onChange: (value: any) => void;
  isModified: boolean;
}

const FieldEditor: React.FC<FieldEditorProps> = ({
  fieldName,
  currentValue,
  onChange,
  isModified
}) => {
  const [value, setValue] = useState(currentValue === null || currentValue === undefined ? '' : String(currentValue));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const targetValue = e.target.value;
    setValue(targetValue); 

    const isNumericField = typeof currentValue === 'number' || 
                           ['quantity', 'distance', 'consumption', 'supply', 'rob', 'deg', 'min', 'course', 'draft', 'force', 'height', 'temp', 'pressure', 'rpm', 'hours', 'speed']
                           .some(keyword => fieldName.toLowerCase().includes(keyword));
                           
    let processedValue: string | number | null = targetValue;
    if (isNumericField) {
      if (targetValue === '') {
        processedValue = null; // Represent empty numeric input as null
      } else {
        const num = parseFloat(targetValue);
        processedValue = isNaN(num) ? targetValue : num; 
      }
    }
    onChange(processedValue);
  };
  
  const inputType = (typeof currentValue === 'number' || 
                    ['quantity', 'distance', 'consumption', 'supply', 'rob', 'deg', 'min', 'course', 'draft', 'force', 'height', 'temp', 'pressure', 'rpm', 'hours', 'speed']
                    .some(keyword => fieldName.toLowerCase().includes(keyword)))
                    ? 'number' : 'text';

  return (
    <div className={`p-3 border rounded-md ${isModified ? 'border-orange-400 bg-orange-50' : 'border-gray-300'}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
        {fieldName.replace(/([A-Z])/g, ' $1')}
        {isModified && <span className="text-orange-600 ml-1">*</span>}
      </label>
      <input
        type={inputType}
        value={value}
        onChange={handleChange}
        step={inputType === 'number' ? '0.01' : undefined}
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder={currentValue === null || currentValue === undefined ? 'N/A' : ''}
      />
      {(currentValue !== undefined && currentValue !== null) && (
        <div className="text-xs text-gray-500 mt-1">
          Current: {String(currentValue)}
        </div>
      )}
    </div>
  );
};

interface CascadePreviewDisplayProps {
  cascadeResult: CascadeResult;
  onApply: () => void;
  isApplying: boolean;
}

const CascadePreviewDisplay: React.FC<CascadePreviewDisplayProps> = ({
  cascadeResult,
  onApply,
  isApplying
}) => {
  return (
    <div className="mb-6 p-4 border rounded-md shadow-sm">
      <h4 className="font-semibold text-gray-700 mb-3">Cascade Effects Preview</h4>
      
      <div className={`p-3 rounded-md mb-4 ${
        cascadeResult.isValid 
          ? 'bg-green-100 border border-green-300' 
          : 'bg-red-100 border border-red-300'
      }`}>
        <div className="flex items-center">
          <span className={`w-3 h-3 rounded-full mr-2 ${
            cascadeResult.isValid ? 'bg-green-500' : 'bg-red-500'
          }`}></span>
          <span className={`font-medium ${
            cascadeResult.isValid ? 'text-green-700' : 'text-red-700'
          }`}>
            {cascadeResult.isValid ? 'Validation Passed' : 'Validation Failed'}
          </span>
        </div>
        
        {cascadeResult.errors.length > 0 && (
          <div className="mt-2">
            <p className="text-sm font-medium text-red-700">Errors:</p>
            <ul className="text-sm text-red-600 list-disc list-inside pl-2">
              {cascadeResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {cascadeResult.affectedReports.length > 0 && (
        <div className="mb-4">
          <h5 className="font-medium text-gray-600 mb-2">
            Affected Reports ({cascadeResult.affectedReports.length})
          </h5>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {cascadeResult.affectedReports.map((report, index) => (
              <div key={index} className="border border-gray-200 rounded-md p-3 text-sm">
                <div className="font-medium text-gray-700 mb-1">Report ID: {report.reportId}</div>
                
                {Object.keys(report.updates).length > 0 && (
                  <div>
                    <p className="font-medium text-gray-500 text-xs mb-1">Updated Fields:</p>
                    <ul className="list-disc list-inside pl-3 text-xs text-gray-600">
                    {Object.entries(report.updates).map(([field, value]) => (
                      <li key={field}>
                        {field}: {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </li>
                    ))}
                    </ul>
                  </div>
                )}
                
                {report.errors.length > 0 && (
                  <div className="mt-1">
                    <p className="font-medium text-red-600 text-xs mb-1">Errors for this report:</p>
                    <ul className="list-disc list-inside pl-3 text-xs text-red-500">
                    {report.errors.map((error, errorIndex) => (
                      <li key={errorIndex}>{error}</li>
                    ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {cascadeResult.isValid && (
        <button
          onClick={onApply}
          disabled={isApplying}
          className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition duration-150"
        >
          {isApplying ? 'Applying...' : 'Apply Modifications'}
        </button>
      )}
    </div>
  );
};