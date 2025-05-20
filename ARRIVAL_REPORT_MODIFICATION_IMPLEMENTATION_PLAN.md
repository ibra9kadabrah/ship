# Arrival Report Modification Workflow Implementation Plan

This document outlines a comprehensive, step-by-step approach to implementing the report modification workflow for Arrival reports, building on the successful implementations for Departure and Noon reports.

## Overview

Arrival reports capture critical data when a vessel arrives at a port, including:
- End of sea passage (EOSP) details
- Weather conditions
- Bunker consumption/remaining
- Machinery parameters
- Arrival-specific data like estimatedBerthingDate/Time

## Implementation Strategy

We'll follow the established pattern from Departure and Noon reports with special attention to Arrival-specific fields and conditions.

## Phase 1: Checklist Configuration

### Task 1: Define Arrival Report Checklist Items
**Objective:** Create a comprehensive set of checklist items that office users can select when requesting changes to Arrival reports.

#### Sub-task 1.1: Analyze Arrival-Specific Fields
**Action:** Review `ArrivalSpecificData` and related types in `src/types/report.ts` to identify all fields relevant to Arrival reports.

**Key fields to include:**
- Basic report info (date, time, timezone)
- EOSP position and details
- Weather conditions
- Bunker consumption/remaining
- Machinery parameters
- Estimated berthing details
- Performance metrics like distanceSinceLastReport, totalDistanceTravelled

**Target:** Complete list of all fields that can be modified in Arrival reports

#### Sub-task 1.2: Define Checklist Item IDs and Labels
**Action:** Create specific, descriptive IDs and user-friendly labels for each group of related fields

```typescript
// Example checklist items for Arrival reports
const arrivalChecklistItems: ChecklistItem[] = [
  {
    id: 'arrival_general_info',
    label: 'General Report Information',
    fields_affected: ['reportDate', 'reportTime', 'timeZone']
  },
  {
    id: 'arrival_eosp_details',
    label: 'End of Sea Passage (EOSP) Details',
    fields_affected: [
      'eospDate', 'eospTime', 'eospLatDeg', 'eospLatMin', 'eospLatDir', 
      'eospLonDeg', 'eospLonMin', 'eospLonDir', 'eospCourse'
    ]
  },
  {
    id: 'arrival_weather',
    label: 'Weather Conditions',
    fields_affected: [
      'windDirection', 'windForce', 'seaDirection', 'seaState', 
      'swellDirection', 'swellHeight'
    ]
  },
  {
    id: 'arrival_bunker_me_cons',
    label: 'Main Engine Bunker Consumption',
    fields_affected: [
      'meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 
      'meConsumptionMeOil', 'meConsumptionAeOil'
    ]
  },
  {
    id: 'arrival_bunker_boiler_cons',
    label: 'Boiler Bunker Consumption',
    fields_affected: ['boilerConsumptionLsifo', 'boilerConsumptionLsmgo']
  },
  {
    id: 'arrival_bunker_aux_cons',
    label: 'Auxiliary Engines Bunker Consumption',
    fields_affected: ['auxConsumptionLsifo', 'auxConsumptionLsmgo']
  },
  {
    id: 'arrival_bunker_supplies',
    label: 'Bunker Supplies',
    fields_affected: [
      'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'
    ]
  },
  {
    id: 'arrival_machinery_me_params',
    label: 'Main Engine Parameters',
    fields_affected: [
      'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp',
      'meScavengeAirTemp', 'meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn',
      'meTcExhaustTempOut', 'meThrustBearingTemp', 'meDailyRunHours',
      'mePresentRpm', 'meCurrentSpeed'
    ]
  },
  {
    id: 'arrival_machinery_engine_units',
    label: 'Engine Units',
    fields_affected: ['engineUnits']
  },
  {
    id: 'arrival_machinery_aux_engines',
    label: 'Auxiliary Engines',
    fields_affected: ['auxEngines']
  },
  {
    id: 'arrival_performance_distance',
    label: 'Distance Since Last Report',
    fields_affected: ['distanceSinceLastReport']
  },
  {
    id: 'arrival_berth_details',
    label: 'Estimated Berthing Details',
    fields_affected: ['estimatedBerthingDate', 'estimatedBerthingTime']
  }
];
```

**Target:** Well-organized, comprehensive set of checklist items covering all aspects of Arrival reports

#### Sub-task 1.3: Update Backend Configuration
**Action:** Update `CHECKLIST_ITEMS_BY_REPORT_TYPE` in `src/config/reportChecklists.ts` to include the Arrival checklist items

```typescript
export const CHECKLIST_ITEMS_BY_REPORT_TYPE: Record<ReportType, ChecklistItem[]> = {
  'departure': departureChecklistItems,
  'noon': noonChecklistItems,
  'arrival': arrivalChecklistItems,
  // Other report types...
};
```

**Target:** Backend configuration complete with Arrival report checklist items

#### Sub-task 1.4: Update Frontend Configuration
**Action:** Duplicate the same changes in `frontend/src/config/reportChecklists.ts` to ensure consistency between frontend and backend

**Target:** Frontend configuration updated with the same checklist items

## Phase 2: Frontend Implementation

### Task 2: Adapt ArrivalForm Component
**Objective:** Update the existing `ArrivalForm.tsx` to support modification mode with the proper field editability logic.

#### Sub-task 2.1: Add Modification Mode Props and State
**Action:** Modify `ArrivalForm.tsx` to include:
- New props: `reportIdToModify?: string`, `initialData?: FullReportViewDTO`
- Additional state variables:
  ```typescript
  const [isModifyMode, setIsModifyMode] = useState<boolean>(!!reportIdToModify);
  const [initialReportData, setInitialReportData] = useState<FullReportViewDTO | null>(null);
  const [activeModificationChecklist, setActiveModificationChecklist] = useState<string[]>([]);
  const [officeChangesComment, setOfficeChangesComment] = useState<string | null>(null);
  const [isLoadingReportToModify, setIsLoadingReportToModify] = useState<boolean>(false);
  ```

**Target:** Component prepared with necessary state management for modification mode

#### Sub-task 2.2: Implement Data Fetching for Modification
**Action:** Add `useEffect` to fetch report data when in modification mode:

```typescript
useEffect(() => {
  const fetchReportToModify = async () => {
    if (reportIdToModify) {
      setIsLoadingReportToModify(true);
      try {
        const reportData = await apiClient.get<FullReportViewDTO>(`/reports/${reportIdToModify}`);
        setInitialReportData(reportData);
        
        // Initialize form with fetched data
        if (reportData) {
          // Map the report data to form data structure
          const mappedData = mapReportToFormData(reportData);
          setFormData(mappedData);
          
          // Set modification checklist and comment
          if (reportData.modification_checklist) {
            setActiveModificationChecklist(reportData.modification_checklist);
          }
          if (reportData.requested_changes_comment) {
            setOfficeChangesComment(reportData.requested_changes_comment);
          }
        }
      } catch (error) {
        console.error('Error fetching report to modify:', error);
        // Handle error (show message, etc.)
      } finally {
        setIsLoadingReportToModify(false);
      }
    }
  };

  if (reportIdToModify) {
    fetchReportToModify();
  }
}, [reportIdToModify]);
```

**Target:** Proper data fetching with error handling for modification mode

#### Sub-task 2.3: Implement Field Editability Logic
**Action:** Add helper functions to determine if fields can be edited:

```typescript
// Check if a specific field is editable in modify mode
const isFieldEditable = (fieldName: string): boolean => {
  if (!isModifyMode || !activeModificationChecklist.length) return true;
  
  // Find if any checklist item includes this field
  return arrivalChecklistItems.some(item => 
    activeModificationChecklist.includes(item.id) && 
    item.fields_affected.includes(fieldName)
  );
};

// Check if a whole section is editable
const isSectionEditable = (sectionId: string): boolean => {
  if (!isModifyMode || !activeModificationChecklist.length) return true;
  return activeModificationChecklist.includes(sectionId);
};
```

**Target:** Field-level editability control logic implemented

#### Sub-task 2.4: Apply Read-Only Attributes to Form Inputs
**Action:** Update all form inputs with conditional read-only attributes:

```typescript
// Example for a text input
<input
  type="text"
  name="eospDate"
  value={formData.eospDate}
  onChange={handleChange}
  readOnly={isModifyMode && !isFieldEditable('eospDate')}
  className={`form-control ${isModifyMode && !isFieldEditable('eospDate') ? 'bg-gray-100' : ''}`}
  required
/>

// For complex components like engineUnits or auxEngines sections:
<EngineUnitsSection 
  engineUnits={formData.engineUnits} 
  onChange={handleEngineUnitsChange}
  disabled={isModifyMode && !isFieldEditable('engineUnits')}
/>
```

**Target:** All form fields properly respect editability rules in modification mode

#### Sub-task 2.5: Display Office Change Request Information
**Action:** Add UI elements to show the office's change request:

```tsx
{isModifyMode && officeChangesComment && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          <strong>Office requested changes:</strong> {officeChangesComment}
        </p>
      </div>
    </div>
  </div>
)}
```

**Target:** Clear visual indication of office-requested changes

#### Sub-task 2.6: Implement Form Submission Logic for Resubmission
**Action:** Update the form submission handler to support modification mode:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    setIsSubmitting(true);
    
    if (isModifyMode && reportIdToModify) {
      // Prepare data for resubmission
      const fieldsToSubmit: Partial<ArrivalFormData> = {};
      
      // Only include fields that are part of the modification checklist
      for (const field of Object.keys(formData) as (keyof ArrivalFormData)[]) {
        if (isFieldEditable(field as string)) {
          // @ts-ignore - Dynamic assignment
          fieldsToSubmit[field] = formData[field];
        }
      }
      
      // Special handling for complex fields
      if (isFieldEditable('engineUnits')) {
        fieldsToSubmit.engineUnits = formData.engineUnits;
      }
      
      if (isFieldEditable('auxEngines')) {
        fieldsToSubmit.auxEngines = formData.auxEngines;
      }
      
      // Resubmit the modified report
      await apiClient.patch(`/reports/${reportIdToModify}/resubmit`, fieldsToSubmit);
      
      // Navigate to history or show success message
      navigate('/captain/history');
      toast.success('Report resubmitted successfully');
    } else {
      // Regular submit (new report)
      await apiClient.post('/reports', formData);
      navigate('/captain/dashboard');
      toast.success('Report submitted successfully');
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    toast.error('Failed to submit report. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};
```

**Target:** Proper form submission with field filtering based on editability

## Phase 3: Testing Implementation

### Task 3: Create Comprehensive Test Scenarios
**Objective:** Define a complete set of test cases to verify proper functioning of the Arrival report modification workflow.

#### Sub-task 3.1: Define Test Scenarios
**Action:** Create the following test scenarios:

1. **Basic Field Modification Test:**
   - Office requests changes to simple fields (reportDate, reportTime)
   - Captain modifies these fields
   - Verify changes appear correctly after resubmission

2. **EOSP Details Modification Test:**
   - Office requests changes to EOSP position data
   - Captain modifies EOSP coordinates
   - Verify updated position is saved and displayed correctly

3. **Engine Units Modification Test:**
   - Office requests changes to engine units data
   - Captain modifies values for specific engine units
   - Verify complex nested data is correctly saved and retrieved

4. **Auth and Permission Test:**
   - Verify only appropriate roles can request/make changes
   - Test that captains can only modify their own reports

5. **Multiple Fields Modification Test:**
   - Office requests changes to multiple sections
   - Captain updates fields across different sections
   - Verify all changes are saved correctly

**Target:** Comprehensive test coverage for all major aspects of Arrival report modification

#### Sub-task 3.2: Implement Test Cases
**Action:** For each test scenario:
1. Create test data (initial report submission)
2. Execute the office review and change request
3. Perform captain modifications
4. Verify all data is correctly stored and displayed

**Target:** Documented test results confirming correct functionality

## Phase 4: Documentation

### Task 4: Update Documentation
**Objective:** Ensure all documentation is up-to-date with the Arrival report implementation.

#### Sub-task 4.1: Update Technical Documentation
**Action:** Update the Report Modification Workflow documentation to include Arrival report details

**Target:** Complete technical documentation for developers

#### Sub-task 4.2: Update User Guides
**Action:** Create/update user guides for both office users and captains regarding Arrival report modification

**Target:** Clear, illustrated guides for end users

## Success Criteria

1. **Functional Completeness:**
   - Office users can request specific changes to Arrival reports
   - Captains can see which fields need modification
   - Captains can modify only the requested fields
   - Resubmitted reports show correct updated values

2. **User Experience:**
   - Clear visual indication of which fields are editable
   - Helpful error messages for validation failures
   - Smooth workflow for both office and captain users

3. **Technical Quality:**
   - Code follows established patterns from Departure and Noon implementations
   - Proper type safety throughout the implementation
   - Comprehensive error handling
   - Well-structured, maintainable code

4. **Performance:**
   - Form loads quickly with pre-populated data
   - Form submission is responsive
   - No UI freezes when handling complex data structures