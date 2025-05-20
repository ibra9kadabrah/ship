# Berth Report Modification Workflow Implementation Plan

This document outlines a comprehensive, step-by-step approach to implementing the report modification workflow for Berth reports. It builds upon the patterns established for Departure, Noon, Arrival, and Arrival Anchor Noon reports.

## Overview

Berth reports are submitted when a vessel is berthed, detailing the time of berthing, berth location, cargo operations, and relevant bunker/machinery data (primarily auxiliary engines).

Key data includes:
- Report identification (date, time, timezone)
- Berth date, time, and location (latitude, longitude, berth number)
- Cargo operations (loaded/unloaded quantities, start/end date/time)
- Weather conditions (typically less critical but part of base data)
- Bunker consumption and remaining on board (ROB) - focusing on auxiliary and boiler.
- Auxiliary engine data.
- ME consumption and parameters are generally not applicable while berthed for extended periods and should be handled accordingly (e.g., non-editable or zeroed).

## Implementation Strategy

We will follow the established pattern from other report modification implementations, focusing on the specific fields relevant to a Berth report. Special attention will be given to cargo operations data and the exclusion/handling of ME-related parameters.

## Phase 1: Checklist Configuration

### Task 1: Define Berth Report Checklist Items
**Objective:** Create a comprehensive set of checklist items for office users to select when requesting changes to Berth reports.

#### Sub-task 1.1: Analyze Berth Specific Fields
**Action:** Review `BerthFormData` and `BaseReportData` in `src/types/report.ts`.
**Key fields to include:**
- Basic report info (date, time, timezone) - from `BaseReportData`
- Berth details (date, time, lat, lon, berth number) - from `BerthFormData`
- Cargo operations (loaded, unloaded, ops start/end date/time) - from `BerthFormData`
- Weather conditions - from `BaseReportData` (using granular items, though less critical for berth)
- Bunker consumption/remaining - from `BaseReportData` (focus on Boiler & Aux, ME likely zero/non-editable)
- Bunker supplies - from `BaseReportData`
- Auxiliary Engines - from `BerthFormData` (inherits from `BaseReportFormData` but `engineUnits` are excluded for Berth)
- ME Parameters & Engine Units - from `BaseReportData` (These should generally be non-editable or explicitly marked as not applicable for Berth reports in the checklist, or the form should hide/disable them).

#### Sub-task 1.2: Define Checklist Item IDs and Labels
**Action:** Create specific, descriptive IDs and user-friendly labels for each group of related fields.

```typescript
// Example checklist items for Berth reports
// (To be added to src/config/reportChecklists.ts and frontend/src/config/reportChecklists.ts)

export const berthChecklistItems: ChecklistItem[] = [
  // General Info (from BaseReportData)
  {
    id: 'berth_general_info',
    label: 'General Report Information',
    fields_affected: ['reportDate', 'reportTime', 'timeZone'],
    reportType: 'berth',
    category: 'General'
  },
  // Berth Details (from BerthFormData)
  {
    id: 'berth_location_details',
    label: 'Berth Location & Time',
    fields_affected: [
      'berthDate', 'berthTime', 
      'berthLatDeg', 'berthLatMin', 'berthLatDir', 
      'berthLonDeg', 'berthLonMin', 'berthLonDir', 
      'berthNumber'
    ],
    reportType: 'berth',
    category: 'Navigation'
  },
  // Cargo Operations (from BerthFormData)
  {
    id: 'berth_cargo_ops_quantities',
    label: 'Cargo Operations - Quantities',
    fields_affected: ['cargoLoaded', 'cargoUnloaded'],
    reportType: 'berth',
    category: 'Cargo Operations'
  },
  {
    id: 'berth_cargo_ops_datetime',
    label: 'Cargo Operations - Dates & Times',
    fields_affected: ['cargoOpsStartDate', 'cargoOpsStartTime', 'cargoOpsEndDate', 'cargoOpsEndTime'],
    reportType: 'berth',
    category: 'Cargo Operations'
  },
  // Weather (from BaseReportData - granular, less critical but available)
  { 
    id: 'berth_weather_wind', 
    label: 'Weather - Wind', 
    fields_affected: ['windDirection', 'windForce'], 
    reportType: 'berth',
    category: 'Weather'
  },
  { 
    id: 'berth_weather_sea', 
    label: 'Weather - Sea State', // Sea direction less relevant at berth
    fields_affected: ['seaState'], // Sea direction might be omitted or made optional
    reportType: 'berth',
    category: 'Weather'
  },
  { 
    id: 'berth_weather_swell', 
    label: 'Weather - Swell', 
    fields_affected: ['swellHeight'], // Swell direction less relevant
    reportType: 'berth',
    category: 'Weather'
  },
  // Bunker Consumptions (Focus on Boiler & Aux)
  // ME Consumptions are part of BaseReportData but should be non-editable or explicitly stated as N/A for Berth.
  // The form logic should handle this.
  { 
    id: 'berth_bunker_me_cons', 
    label: 'Bunker - ME Consumptions (Verify N/A or Zero)', 
    fields_affected: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil'], 
    reportType: 'berth',
    category: 'Bunker Consumptions (ME - N/A)' // Special category to indicate non-applicability
  },
  { 
    id: 'berth_bunker_boiler_cons', 
    label: 'Bunker - Boiler Consumptions', 
    fields_affected: ['boilerConsumptionLsifo', 'boilerConsumptionLsmgo'], 
    reportType: 'berth',
    category: 'Bunker Consumptions'
  },
  { 
    id: 'berth_bunker_aux_cons', 
    label: 'Bunker - Aux Consumptions', 
    fields_affected: ['auxConsumptionLsifo', 'auxConsumptionLsmgo'], 
    reportType: 'berth',
    category: 'Bunker Consumptions'
  },
  // Bunker Supplies (from BaseReportData)
  { 
    id: 'berth_bunker_supplies', 
    label: 'Bunker - Supplies', 
    fields_affected: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'], 
    reportType: 'berth',
    category: 'Bunker Supplies'
  },
  // Machinery Aux Engines (from BaseReportData, as engineUnits is excluded in BerthFormData)
  {
    id: 'berth_machinery_aux_engines',
    label: 'Machinery - Aux Engines Data',
    fields_affected: ['auxEngines'],
    reportType: 'berth',
    category: 'Machinery Aux'
  },
  // ME Params - Mark as N/A or non-editable
  {
    id: 'berth_machinery_me_params',
    label: 'Machinery - ME Parameters (Verify N/A)',
    fields_affected: [
        'meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 
        'meScavengeAirTemp', 'meThrustBearingTemp', 'meTcRpm1', 'meTcRpm2', 
        'meTcExhaustTempIn', 'meTcExhaustTempOut', 'meDailyRunHours', 
        'mePresentRpm', 'meCurrentSpeed'
    ],
    reportType: 'berth',
    category: 'Machinery ME (N/A)'
  }
  // Engine Units are not part of BerthFormData, so no checklist item for it.
];
```

#### Sub-task 1.3: Update Backend Configuration
**Action:** Update `CHECKLIST_ITEMS_BY_REPORT_TYPE` in `src/config/reportChecklists.ts` to include the `berthChecklistItems`.

```typescript
// In src/config/reportChecklists.ts
export const CHECKLIST_ITEMS_BY_REPORT_TYPE: Record<ReportType, ChecklistItem[]> = {
  // ... other report types
  'berth': berthChecklistItems,
  // ...
};
```

#### Sub-task 1.4: Update Frontend Configuration
**Action:** Duplicate the same changes in `frontend/src/config/reportChecklists.ts`.

## Phase 2: Frontend Implementation

### Task 2: Adapt `BerthForm.tsx` Component
**Objective:** Update or create the `BerthForm.tsx` component to support modification mode with proper field editability logic, paying special attention to cargo operations and the handling of ME-related fields.

#### Sub-task 2.1: Add Modification Mode Props and State
**Action:** Modify `BerthForm.tsx` to include:
- New props: `reportIdToModify?: string`, `initialData?: FullReportViewDTO`
- Additional state variables (similar to other forms):
  ```typescript
  const [isModifyMode, setIsModifyMode] = useState<boolean>(!!reportIdToModify);
  const [initialReportData, setInitialReportData] = useState<FullReportViewDTO | null>(null);
  const [activeModificationChecklist, setActiveModificationChecklist] = useState<string[]>([]);
  const [officeChangesComment, setOfficeChangesComment] = useState<string | null>(null);
  const [isLoadingReportToModify, setIsLoadingReportToModify] = useState<boolean>(false);
  ```

#### Sub-task 2.2: Implement Data Fetching for Modification
**Action:** Add `useEffect` to fetch report data when in modification mode. Create a `mapReportToFormData` helper specific to `BerthFormData`.
- This mapper should correctly populate all `BerthFormData` fields from `FullReportViewDTO`.
- For ME consumption and ME parameters (which are part of `BaseReportFormData` but generally not applicable to Berth reports), the mapper should ideally set them to empty strings or a "N/A" representation if the form fields are to be displayed as read-only. If these fields are hidden in `BerthForm.tsx`, this mapping is less critical for them.

#### Sub-task 2.3: Implement Field Editability Logic
**Action:** Add helper functions `isFieldEditable` and `isSectionEditable`, using `berthChecklistItems`.
- The `isFieldEditable` logic for ME consumption and ME parameters should likely always return `false` in modify mode for Berth reports, unless a specific checklist item explicitly allows their modification (which would be unusual).

#### Sub-task 2.4: Apply Read-Only Attributes and Conditional Rendering
**Action:**
- Update all form inputs with conditional `readOnly` attributes and styling based on editability.
- For ME consumption fields and ME parameter fields (e.g., `meFoPressure`, `meDailyRunHours`), consider either:
    - Making them permanently `readOnly` and displaying "N/A" or current (likely zero) values.
    - Conditionally hiding these sections entirely if not relevant for Berth modification.
- Ensure section components (`BunkerConsumptionSection`, `MachineryMEParamsSection`, `AuxEnginesSection`) receive and respect `disabled` and `isFieldEditable` props.
    - `BunkerConsumptionSection` will need to handle ME fields being non-editable.
    - `MachineryMEParamsSection` should likely be entirely disabled or hidden.
    - `EngineUnitsSection` is not used as `engineUnits` are not part of `BerthFormData`.

#### Sub-task 2.5: Display Office Change Request Information
**Action:** Add UI elements (the orange box) to show the office's change request comment and highlighted checklist items, using `berthChecklistItems` for label lookup.

#### Sub-task 2.6: Implement Form Submission Logic for Resubmission
**Action:** Update the form submission handler:
- If `isModifyMode`, prepare a payload with only editable fields.
    - Special care for `cargoLoaded` and `cargoUnloaded`: these depend on the initial cargo state of the voyage. The resubmission should reflect the intended final state.
    - ME-related fields should generally not be part of the resubmit payload unless explicitly made editable by a checklist item (unlikely).
- Send a `PATCH` request to `/reports/${reportIdToModify}/resubmit`.
- Handle navigation and user feedback.

## Phase 3: Testing Implementation

### Task 3: Create Comprehensive Test Scenarios
**Objective:** Define test cases to verify the Berth report modification workflow.

#### Sub-task 3.1: Define Test Scenarios
1.  **Basic Field Modification:** Test changes to general info, berth location, and berth number.
2.  **Cargo Operations Modification:**
    - Test modifying `cargoLoaded` when initial state was 'Empty'.
    - Test modifying `cargoUnloaded` when initial state was 'Loaded'.
    - Test modifying cargo operation start/end dates and times.
    - Verify that cargo quantity calculations in the backend (if any upon resubmission) are correct.
3.  **Bunker/Aux Machinery Modification:** Test changes to boiler/aux consumptions, supplies, and aux engine data.
4.  **ME Fields Handling:** Confirm ME consumption fields and ME parameters are non-editable or correctly handled as N/A.
5.  **Auth and Permission Test:** Verify role-based access.
6.  **Multiple Fields Modification:** Test updates across different editable sections.

#### Sub-task 3.2: Implement Test Cases
- Create initial voyage with a preceding Arrival report.
- Submit an initial Berth report.
- Simulate office review and request changes to various Berth-specific fields.
- Perform captain modifications.
- Verify data integrity, especially for cargo operations and ROB calculations.

## Phase 4: Documentation

### Task 4: Update Documentation
**Objective:** Ensure all documentation reflects the Berth report modification capabilities.

#### Sub-task 4.1: Update Technical Documentation
- Detail the `berthChecklistItems`.
- Document `BerthForm.tsx` modification mode specifics, especially cargo handling and ME field exclusion.

#### Sub-task 4.2: Update User Guides
- Provide instructions for office users and captains regarding Berth report modifications.

## Success Criteria

1.  **Functional Completeness:**
    - Office users can request specific changes to Berth reports.
    - Captains can clearly see and modify only the requested fields.
    - Resubmitted Berth reports accurately reflect updates, especially for cargo operations.
    - ME-related fields are correctly handled (non-editable/hidden).
2.  **User Experience:**
    - Clear visual cues for editable fields.
    - Intuitive workflow for modifying berth and cargo operations data.
3.  **Technical Quality:**
    - Code adheres to established patterns.
    - Type safety and comprehensive error handling.
4.  **Performance:**
    - Responsive form loading and submission.

This plan provides a roadmap for implementing the modification workflow for Berth reports.