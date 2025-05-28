import { useState, useEffect } from 'react';
import { FullReportViewDTO } from '../types/report'; // Adjusted path
import { ChecklistItem } from '../config/reportChecklists'; // Adjusted path
import apiClient, { getReportById } from '../services/api'; // Assuming getReportById is exported from api service

export interface ModificationModeState {
  isModifyMode: boolean;
  initialReportData: FullReportViewDTO | null;
  activeModificationChecklist: string[];
  officeChangesComment: string | null;
  isLoadingReportToModify: boolean;
  error: string | null;
}

export const useModificationMode = (
  reportIdToModify?: string,
  propInitialData?: FullReportViewDTO | null, // Allow passing initial data if already fetched
  propActiveChecklist?: string[],
  propOfficeComment?: string | null
): ModificationModeState => {
  const [state, setState] = useState<ModificationModeState>({
    isModifyMode: !!reportIdToModify,
    initialReportData: propInitialData || null,
    activeModificationChecklist: propActiveChecklist || [],
    officeChangesComment: propOfficeComment || null,
    isLoadingReportToModify: false,
    error: null,
  });

  useEffect(() => {
    // Only fetch if in modify mode, an ID is present, and data hasn't been passed via props
    if (reportIdToModify && !propInitialData) {
      const fetchReportToModify = async () => {
        setState(prev => ({ ...prev, isLoadingReportToModify: true, error: null }));
        
        try {
          // Use getReportById directly if it's the preferred way to fetch a single report
          const report = await getReportById(reportIdToModify); 
          setState(prev => ({
            ...prev,
            initialReportData: report,
            // Only override checklist/comment if not provided by props
            activeModificationChecklist: propActiveChecklist || report.modification_checklist || [],
            officeChangesComment: propOfficeComment || report.requested_changes_comment || null,
            isLoadingReportToModify: false,
          }));
        } catch (err: any) {
          console.error("Error fetching report to modify in useModificationMode:", err);
          setState(prev => ({
            ...prev,
            error: err.response?.data?.error || "Failed to load report data for modification.",
            isLoadingReportToModify: false,
          }));
        }
      };
      
      fetchReportToModify();
    } else if (reportIdToModify && propInitialData) {
      // If data is passed via props, ensure state reflects it
      // This handles cases where the component might re-render but props remain the same
      setState(prev => ({
        ...prev,
        isModifyMode: true, // Ensure modify mode is true
        initialReportData: propInitialData,
        activeModificationChecklist: propActiveChecklist || propInitialData.modification_checklist || [],
        officeChangesComment: propOfficeComment || propInitialData.requested_changes_comment || null,
      }));
    }
  }, [reportIdToModify, propInitialData, propActiveChecklist, propOfficeComment]); // Add prop dependencies

  return state;
};

// Helper to determine if a field should be editable based on the active checklist
export const createFieldEditabilityChecker = (
  isModifyMode: boolean,
  activeChecklist: string[],
  reportChecklistItems: ChecklistItem[] // Pass the specific form's checklist items
) => {
  return (fieldName: string): boolean => {
    if (!isModifyMode) return true; // Not in modify mode, all fields are editable by default
    if (activeChecklist.length === 0) return false; // In modify mode but no checklist items, nothing is editable
    
    // Check if any active checklist item affects this field
    return reportChecklistItems.some(item =>
      activeChecklist.includes(item.id) && item.fields_affected.includes(fieldName)
    );
  };
};

// Helper to determine if a whole section (identified by a checklist item ID) is editable
export const createSectionEditabilityChecker = (
  isModifyMode: boolean,
  activeChecklist: string[]
) => {
  return (sectionChecklistId: string): boolean => {
    if (!isModifyMode) return true;
    if (activeChecklist.length === 0) return false;
    
    return activeChecklist.includes(sectionChecklistId);
  };
};

// Prepares a payload for resubmission, including only fields that were part of the active checklist
export const prepareModificationPayload = <T extends { reportType: string, vesselId?: string }>(
  originalFormData: Partial<T>, // The current, potentially modified form data
  initialReportData: FullReportViewDTO | null, // The report data as it was when modification started
  activeChecklist: string[],
  reportChecklistItems: ChecklistItem[],
  numericFields: (keyof T)[] = [], // List of fields that should be numbers
  // Add specific data transformation functions if needed, e.g., for engineUnits, auxEngines
  transformEngineUnits?: (units: any) => any,
  transformAuxEngines?: (engines: any) => any
): Partial<T> => {
  const changedData: Partial<T> = {};
  
  if (originalFormData.reportType) { // Ensure reportType is present before assigning
    changedData.reportType = originalFormData.reportType;
  } else {
    // This case should ideally not happen if originalFormData always includes reportType
    // Consider throwing an error or having a default if reportType is critical and missing
    // For now, this will result in changedData not having reportType if originalFormData.reportType is undefined
  }

  if (!initialReportData) return changedData; // Return early if no initial data to compare against

  if (originalFormData.vesselId) { // Ensure vesselId is included if present
    changedData.vesselId = originalFormData.vesselId;
  }

  let hasChanges = false;

  reportChecklistItems.forEach(checklistItem => {
    if (activeChecklist.includes(checklistItem.id)) {
      checklistItem.fields_affected.forEach(fieldName => {
        const key = fieldName as keyof T;
        
        // Ensure the key exists in originalFormData before processing
        if (Object.prototype.hasOwnProperty.call(originalFormData, key)) {
          let currentValue = (originalFormData as any)[key];
          const initialValue = (initialReportData as any)[key];

          // Convert to number if it's a numeric field for comparison and payload
          if (numericFields.includes(key) && currentValue !== undefined && currentValue !== null && String(currentValue).trim() !== '') {
            currentValue = Number(currentValue);
            if (isNaN(currentValue)) currentValue = null; // Or handle error
          } else if (numericFields.includes(key) && (currentValue === undefined || currentValue === null || String(currentValue).trim() === '')) {
            currentValue = null;
          }
          
          // Special handling for array fields like engineUnits or auxEngines
          if (key === 'engineUnits' && typeof transformEngineUnits === 'function') {
            (changedData as any)[key] = transformEngineUnits(currentValue);
            // Compare stringified versions for complex objects/arrays if direct comparison is tricky
            if (JSON.stringify((changedData as any)[key]) !== JSON.stringify(transformEngineUnits(initialValue))) {
              hasChanges = true;
            }
          } else if (key === 'auxEngines' && typeof transformAuxEngines === 'function') {
            (changedData as any)[key] = transformAuxEngines(currentValue);
            if (JSON.stringify((changedData as any)[key]) !== JSON.stringify(transformAuxEngines(initialValue))) {
              hasChanges = true;
            }
          } else {
            // For simple fields, direct assignment and comparison
            (changedData as any)[key] = currentValue;
            if (String(currentValue) !== String(initialValue)) { // Simple string comparison for changes
              hasChanges = true;
            }
          }
        }
      });
    }
  });
  
  // If no actual changes were made to the editable fields,
  // we might return just the reportType or an empty object based on backend requirements.
  // For now, returning the changedData which includes at least reportType.
  // The calling function should check if `hasChanges` is true before submitting.
  // console.log("Prepared modification payload:", changedData, "Has Changes:", hasChanges);
  return changedData; 
  // Consider returning an object { payload: changedData, hasActualChanges: hasChanges }
};