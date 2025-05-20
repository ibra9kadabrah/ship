# Arrival Anchor Noon Report Modification Workflow Implementation Plan

This document outlines a comprehensive, step-by-step approach to implementing the report modification workflow for Arrival Anchor Noon reports. It builds upon the patterns established for Departure, Noon, and Arrival reports.

## Overview

Arrival Anchor Noon reports are typically submitted when a vessel is at anchor, providing noon-time updates on position, weather, bunker status, and machinery parameters. This report type combines elements of a standard Noon report with the context of being at anchor.

Key data includes:
- Report identification (date, time, timezone)
- Noon position (latitude, longitude) and course
- Distance since the last report
- Weather conditions
- Bunker consumption and remaining on board (ROB)
- Machinery parameters
- Engine unit and auxiliary engine data

## Implementation Strategy

We will follow the established pattern from other report modification implementations, focusing on the specific fields relevant to an Arrival Anchor Noon report.

## Phase 1: Checklist Configuration

### Task 1: Define Arrival Anchor Noon Report Checklist Items
**Objective:** Create a comprehensive set of checklist items for office users to select when requesting changes to Arrival Anchor Noon reports.

#### Sub-task 1.1: Analyze Arrival Anchor Noon Specific Fields
**Action:** Review `ArrivalAnchorNoonSpecificData` and `BaseReportData` in `src/types/report.ts`.
**Key fields to include:**
- Basic report info (date, time, timezone) - from `BaseReportData`
- Noon position and details (date, time, lat, lon, course) - from `ArrivalAnchorNoonSpecificData`
- Distance since last report - from `ArrivalAnchorNoonSpecificData`
- Weather conditions - from `BaseReportData` (using granular items)
- Bunker consumption/remaining - from `BaseReportData` (using granular items)
- Bunker supplies - from `BaseReportData`
- Machinery parameters - from `BaseReportData` (using granular items)
- Engine Units & Aux Engines - from `BaseReportData`

**Note:** The current `ArrivalAnchorNoonSpecificData` type does not explicitly list distinct "anchor-specific" fields beyond the noon data reported while at anchor. If additional fields related to anchoring (e.g., anchor depth, chain length) are required, they must first be added to the `ArrivalAnchorNoonSpecificData` type in `src/types/report.ts`. For this plan, we assume such fields are not currently part of the defined data structure.

#### Sub-task 1.2: Define Checklist Item IDs and Labels
**Action:** Create specific, descriptive IDs and user-friendly labels for each group of related fields, maintaining consistency with the granularity of other report types for common sections.

```typescript
// Example checklist items for Arrival Anchor Noon reports
// (To be added to src/config/reportChecklists.ts and frontend/src/config/reportChecklists.ts)

export const arrivalAnchorNoonChecklistItems: ChecklistItem[] = [
  // General Info (from BaseReportData)
  {
    id: 'arrival_anchor_noon_general_info',
    label: 'General Report Information',
    fields_affected: ['reportDate', 'reportTime', 'timeZone'],
    reportType: 'arrival_anchor_noon',
    category: 'General'
  },
  // Noon Position & Course (from ArrivalAnchorNoonSpecificData)
  {
    id: 'arrival_anchor_noon_position_details',
    label: 'Noon Position & Course Details',
    fields_affected: [
      'noonDate', 'noonTime', 
      'noonLatDeg', 'noonLatMin', 'noonLatDir', 
      'noonLonDeg', 'noonLonMin', 'noonLonDir', 
      'noonCourse'
    ],
    reportType: 'arrival_anchor_noon',
    category: 'Navigation'
  },
  // Performance & Distance (from ArrivalAnchorNoonSpecificData)
  {
    id: 'arrival_anchor_noon_performance_distance',
    label: 'Distance Since Last Report',
    fields_affected: ['distanceSinceLastReport'],
    reportType: 'arrival_anchor_noon',
    category: 'Performance'
  },
  // Weather (from BaseReportData - granular)
  { 
    id: 'arrival_anchor_noon_weather_wind', 
    label: 'Weather - Wind', 
    fields_affected: ['windDirection', 'windForce'], 
    reportType: 'arrival_anchor_noon',
    category: 'Weather'
  },
  { 
    id: 'arrival_anchor_noon_weather_sea', 
    label: 'Weather - Sea', 
    fields_affected: ['seaDirection', 'seaState'], 
    reportType: 'arrival_anchor_noon',
    category: 'Weather'
  },
  { 
    id: 'arrival_anchor_noon_weather_swell', 
    label: 'Weather - Swell', 
    fields_affected: ['swellDirection', 'swellHeight'], 
    reportType: 'arrival_anchor_noon',
    category: 'Weather'
  },
  // Bunker Consumptions (from BaseReportData - granular)
  { 
    id: 'arrival_anchor_noon_bunker_me_cons', 
    label: 'Bunker - ME Consumptions', 
    fields_affected: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil'], 
    reportType: 'arrival_anchor_noon',
    category: 'Bunker Consumptions'
  },
  { 
    id: 'arrival_anchor_noon_bunker_boiler_cons', 
    label: 'Bunker - Boiler Consumptions', 
    fields_affected: ['boilerConsumptionLsifo', 'boilerConsumptionLsmgo'], 
    reportType: 'arrival_anchor_noon',
    category: 'Bunker Consumptions'
  },
  { 
    id: 'arrival_anchor_noon_bunker_aux_cons', 
    label: 'Bunker - Aux Consumptions', 
    fields_affected: ['auxConsumptionLsifo', 'auxConsumptionLsmgo'], 
    reportType: 'arrival_anchor_noon',
    category: 'Bunker Consumptions'
  },
  // Bunker Supplies (from BaseReportData)
  { 
    id: 'arrival_anchor_noon_bunker_supplies', 
    label: 'Bunker - Supplies', 
    fields_affected: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil'], 
    reportType: 'arrival_anchor_noon',
    category: 'Bunker Supplies'
  },
  // Machinery ME Params (from BaseReportData - granular)
  {
    id: 'arrival_anchor_noon_machinery_me_press_temp',
    label: 'Machinery - ME Pressures & Temperatures',
    fields_affected: ['meFoPressure', 'meLubOilPressure', 'meFwInletTemp', 'meLoInletTemp', 'meScavengeAirTemp', 'meThrustBearingTemp'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery ME'
  },
  {
    id: 'arrival_anchor_noon_machinery_me_tc',
    label: 'Machinery - ME Turbocharger Params',
    fields_affected: ['meTcRpm1', 'meTcRpm2', 'meTcExhaustTempIn', 'meTcExhaustTempOut'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery ME'
  },
  {
    id: 'arrival_anchor_noon_machinery_me_run_perf',
    label: 'Machinery - ME Running Hours & Performance',
    fields_affected: ['meDailyRunHours', 'mePresentRpm', 'meCurrentSpeed'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery ME'
  },
  // Machinery Engine Units (from BaseReportData)
  {
    id: 'arrival_anchor_noon_machinery_engine_units',
    label: 'Machinery - Engine Units Data',
    fields_affected: ['engineUnits'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery Units'
  },
  // Machinery Aux Engines (from BaseReportData)
  {
    id: 'arrival_anchor_noon_machinery_aux_engines',
    label: 'Machinery - Aux Engines Data',
    fields_affected: ['auxEngines'],
    reportType: 'arrival_anchor_noon',
    category: 'Machinery Aux'
  }
];
```

#### Sub-task 1.3: Update Backend Configuration
**Action:** Update `CHECKLIST_ITEMS_BY_REPORT_TYPE` in `src/config/reportChecklists.ts` to include the `arrivalAnchorNoonChecklistItems`.

```typescript
// In src/config/reportChecklists.ts
export const CHECKLIST_ITEMS_BY_REPORT_TYPE: Record<ReportType, ChecklistItem[]> = {
  // ... other report types
  'arrival_anchor_noon': arrivalAnchorNoonChecklistItems,
  // ...
};
```

#### Sub-task 1.4: Update Frontend Configuration
**Action:** Duplicate the same changes in `frontend/src/config/reportChecklists.ts`.

## Phase 2: Frontend Implementation

### Task 2: Adapt `ArrivalAnchorNoonForm.tsx` Component
**Objective:** Update or create the `ArrivalAnchorNoonForm.tsx` component to support modification mode with proper field editability logic. (The review document mentions adapting `ArrivalAnchorNoonForm.tsx`; if it doesn't exist, it will need to be created, likely by adapting `NoonForm.tsx` or `ArrivalForm.tsx`).

#### Sub-task 2.1: Add Modification Mode Props and State
**Action:** Modify `ArrivalAnchorNoonForm.tsx` to include:
- New props: `reportIdToModify?: string`, `initialData?: FullReportViewDTO`
- Additional state variables (similar to `ArrivalForm.tsx`):
  ```typescript
  const [isModifyMode, setIsModifyMode] = useState<boolean>(!!reportIdToModify);
  const [initialReportData, setInitialReportData] = useState<FullReportViewDTO | null>(null);
  const [activeModificationChecklist, setActiveModificationChecklist] = useState<string[]>([]);
  const [officeChangesComment, setOfficeChangesComment] = useState<string | null>(null);
  const [isLoadingReportToModify, setIsLoadingReportToModify] = useState<boolean>(false);
  ```

#### Sub-task 2.2: Implement Data Fetching for Modification
**Action:** Add `useEffect` to fetch report data when in modification mode, similar to `ArrivalForm.tsx`. Create a `mapReportToFormData` helper specific to `ArrivalAnchorNoonFormData`.

#### Sub-task 2.3: Implement Field Editability Logic
**Action:** Add helper functions `isFieldEditable` and `isSectionEditable`, using `arrivalAnchorNoonChecklistItems`.

#### Sub-task 2.4: Apply Read-Only Attributes to Form Inputs
**Action:** Update all form inputs with conditional `readOnly` attributes and styling based on editability. Ensure section components (`BunkerConsumptionSection`, `MachineryMEParamsSection`, etc.) receive and respect `disabled` and `isFieldEditable` props.

#### Sub-task 2.5: Display Office Change Request Information
**Action:** Add UI elements to show the office's change request comment and highlighted checklist items.

#### Sub-task 2.6: Implement Form Submission Logic for Resubmission
**Action:** Update the form submission handler to support modification mode:
- If `isModifyMode`, prepare a payload with only editable fields.
- Send a `PATCH` request to `/reports/${reportIdToModify}/resubmit`.
- Handle navigation and user feedback (e.g., success/error messages).

## Phase 3: Testing Implementation

### Task 3: Create Comprehensive Test Scenarios
**Objective:** Define test cases to verify the Arrival Anchor Noon report modification workflow.

#### Sub-task 3.1: Define Test Scenarios
1.  **Basic Field Modification:** Test changes to general info, noon position, and distance.
2.  **Weather/Bunker/Machinery Modification:** Test changes to granular items within these common sections.
3.  **Complex Data Modification:** Test changes to `engineUnits` and `auxEngines`.
4.  **No SOSP/ROSP/PassageState:** Confirm these fields are not present or editable for this report type.
5.  **Auth and Permission Test:** Verify role-based access for requesting/making changes.
6.  **Multiple Fields Modification:** Test updates across different sections.

#### Sub-task 3.2: Implement Test Cases
- Create initial report data.
- Simulate office review and change request.
- Perform captain modifications.
- Verify data integrity and display.

## Phase 4: Documentation

### Task 4: Update Documentation
**Objective:** Ensure all documentation reflects the Arrival Anchor Noon report modification capabilities.

#### Sub-task 4.1: Update Technical Documentation
- Detail the `arrivalAnchorNoonChecklistItems`.
- Document `ArrivalAnchorNoonForm.tsx` modification mode specifics.

#### Sub-task 4.2: Update User Guides
- Provide instructions for office users and captains.

## Success Criteria

1.  **Functional Completeness:**
    - Office users can request specific changes to Arrival Anchor Noon reports.
    - Captains can clearly see and modify only the requested fields.
    - Resubmitted reports accurately reflect updates.
2.  **User Experience:**
    - Clear visual cues for editable fields.
    - Intuitive workflow for both user roles.
3.  **Technical Quality:**
    - Code adheres to established patterns.
    - Type safety and comprehensive error handling.
    - Maintainable and well-structured code.
4.  **Performance:**
    - Responsive form loading and submission.

This plan provides a roadmap for implementing the modification workflow for Arrival Anchor Noon reports.
  const [activeModificationChecklist, setActiveModificationChecklist] = useState<string[]>([]);
  const [officeChangesComment, setOfficeChangesComment] = useState<string | null>(null);
  const [isLoadingReportToModify, setIsLoadingReportToModify] = useState<boolean>(false);
  ```

#### Sub-task 2.2: Implement Data Fetching for Modification
**Action:** Add `useEffect` to fetch report data when in modification mode, similar to `ArrivalForm.tsx`. Create a `mapReportToFormData` helper specific to `ArrivalAnchorNoonFormData`.

#### Sub-task 2.3: Implement Field Editability Logic
**Action:** Add helper functions `isFieldEditable` and `isSectionEditable`, using `arrivalAnchorNoonChecklistItems`.

#### Sub-task 2.4: Apply Read-Only Attributes to Form Inputs
**Action:** Update all form inputs with conditional `readOnly` attributes and styling based on editability. Ensure section components (`BunkerConsumptionSection`, `MachineryMEParamsSection`, etc.) receive and respect `disabled` and `isFieldEditable` props.

#### Sub-task 2.5: Display Office Change Request Information
**Action:** Add UI elements to show the office's change request comment and highlighted checklist items.

#### Sub-task 2.6: Implement Form Submission Logic for Resubmission
**Action:** Update the form submission handler to support modification mode:
- If `isModifyMode`, prepare a payload with only editable fields.
- Send a `PATCH` request to `/reports/${reportIdToModify}/resubmit`.
- Handle navigation and user feedback (e.g., success/error messages).

## Phase 3: Testing Implementation

### Task 3: Create Comprehensive Test Scenarios
**Objective:** Define test cases to verify the Arrival Anchor Noon report modification workflow.

#### Sub-task 3.1: Define Test Scenarios
1.  **Basic Field Modification:** Test changes to general info, noon position, and distance.
2.  **Weather/Bunker/Machinery Modification:** Test changes to granular items within these common sections.
3.  **Complex Data Modification:** Test changes to `engineUnits` and `auxEngines`.
4.  **No SOSP/ROSP/PassageState:** Confirm these fields are not present or editable for this report type.
5.  **Auth and Permission Test:** Verify role-based access for requesting/making changes.
6.  **Multiple Fields Modification:** Test updates across different sections.

#### Sub-task 3.2: Implement Test Cases
- Create initial report data.
- Simulate office review and change request.
- Perform captain modifications.
- Verify data integrity and display.

## Phase 4: Documentation

### Task 4: Update Documentation
**Objective:** Ensure all documentation reflects the Arrival Anchor Noon report modification capabilities.

#### Sub-task 4.1: Update Technical Documentation
- Detail the `arrivalAnchorNoonChecklistItems`.
- Document `ArrivalAnchorNoonForm.tsx` modification mode specifics.

#### Sub-task 4.2: Update User Guides
- Provide instructions for office users and captains.

## Success Criteria

1.  **Functional Completeness:**
    - Office users can request specific changes to Arrival Anchor Noon reports.
    - Captains can clearly see and modify only the requested fields.
    - Resubmitted reports accurately reflect updates.
2.  **User Experience:**
    - Clear visual cues for editable fields.
    - Intuitive workflow for both user roles.
3.  **Technical Quality:**
    - Code adheres to established patterns.
    - Type safety and comprehensive error handling.
    - Maintainable and well-structured code.
4.  **Performance:**
    - Responsive form loading and submission.

This plan provides a roadmap for implementing the modification workflow for Arrival Anchor Noon reports.