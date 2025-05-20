# Report Modification Workflow Plan

This document outlines the plan to implement a feature allowing office users to request changes on submitted reports, and for captains to modify and resubmit these reports.

## Phase 1: Office User - Request Changes (Implemented)

**Goal:** Allow an office user to select specific parts of a report that need changes, add a comment, and mark the report as 'changes_requested'.

**Tasks:**

1.  **Database Schema Update:**
    *   Add `status` values: `'changes_requested'`.
    *   Add columns to `reports` table:
        *   `modification_checklist` (TEXT, to store JSON array of checklist item IDs)
        *   `requested_changes_comment` (TEXT)
    *   (Done)

2.  **Backend API for Requesting Changes:**
    *   Endpoint: `PATCH /api/reports/:id/request-changes` (or similar)
    *   Protected: Office/Admin users only.
    *   Request body: `{ modification_checklist: string[], comment: string }`
    *   Logic:
        *   Validate report exists and is 'pending'.
        *   Update report status to 'changes_requested'.
        *   Store `modification_checklist` (as JSON string) and `requested_changes_comment`.
        *   Update `reviewerId` and `reviewDate`.
    *   (Done - integrated into existing `POST /api/reports/:id/review` endpoint by allowing `changes_requested` status)

3.  **Frontend UI for Office User (ReportReviewPage.tsx):**
    *   Display a checklist of modifiable sections/fields for the given report type.
        *   Checklist items should be configurable per report type (Departure, Noon, Arrival, Berth).
    *   Allow selection of multiple checklist items.
    *   Provide a textarea for comments.
    *   "Request Changes" button that calls the new backend API.
    *   (Done - integrated into existing review modal)

4.  **Configuration for Checklist Items:**
    *   Create a configuration file (e.g., `src/config/reportChecklists.ts` and `frontend/src/config/reportChecklists.ts`) defining available checklist items for each report type.
        *   Each item: `{ id: string, label: string, fields_affected: string[] }`
    *   (Done)

## Phase 2: Captain - Modify and Resubmit Departure Report (Implemented)

**Goal:** Allow a captain to see reports marked 'changes_requested', view the requested changes, modify only the allowed fields, and resubmit the report, which resets its status to 'pending'.

**Tasks:**

1.  **Backend - Fetch Report for Modification:**
    *   `ReportController.getReportById` and `ReportService.getReportById`:
        *   Ensure captains can fetch their own reports if status is 'changes_requested'.
        *   The response DTO (`FullReportViewDTO`) should include `modification_checklist` (parsed from JSON string to array) and `requested_changes_comment`.
    *   (Done)

2.  **Frontend - Captain's Report History (`ReportHistory.tsx`):**
    *   Display reports with status 'changes_requested'.
    *   Provide a "Modify Report" button/link for these reports.
    *   This button should navigate to a modification page, e.g., `/captain/modify-report/:reportId`.
    *   (Done)

3.  **Frontend - Report Modification Form (`DepartureForm.tsx` for Departure reports):**
    *   **Sub-Task 3.1: Create/Adapt Form for Modification Mode:**
        *   The form should accept a `reportIdToModify` prop.
        *   If `reportIdToModify` is present, fetch the full report data (including `modification_checklist` and `requested_changes_comment`).
        *   Pre-fill the form with this data.
        *   Display the `requested_changes_comment` from the office user.
        *   (Done)
    *   **Sub-Task 3.2: Implement Field Editability Logic:**
        *   Create a helper function `isFieldEditable(fieldName: string): boolean`.
        *   This function checks if `fieldName` is covered by any of the `fields_affected` arrays of the checklist items present in the report's `activeModificationChecklist`.
        *   Input fields should have their `readOnly` or `disabled` attribute set based on `!isFieldEditable('theirFieldName')` when in modify mode.
        *   (Done)
    *   **Sub-Task 3.3: Handle Submission of Modified Report:**
        *   The "Submit" button should now say "Submit Modified Report".
        *   On submit, construct a payload (`fieldsToSubmit`) containing *only* the fields that were part of the `activeModificationChecklist` and were potentially changed.
        *   This payload should be sent to a new backend endpoint for resubmission.
        *   (Done)

4.  **Backend - Resubmit Report Endpoint:**
    *   **Sub-Task 4.1: Define Route:**
        *   `PATCH /api/reports/:id/resubmit` (Protected: Captains only).
        *   (Done)
    *   **Sub-Task 4.2: Controller Method (`ReportController.resubmitReport`):**
        *   Handle the request, extract `reportId`, `captainId` (from auth), and `changes` (the `fieldsToSubmit` payload from frontend).
        *   Call a new service method.
        *   (Done)
    *   **Sub-Task 4.3: Service Method (`ReportService.resubmitReport`):**
        *   Input: `reportId`, `captainId`, `changes: Partial<CreateReportDTO>`.
        *   Logic:
            *   Fetch the report.
            *   Verify `report.captainId === captainId`.
            *   Verify `report.status === 'changes_requested'`.
            *   Update the report fields based on the `changes` payload.
                *   If `changes` includes `engineUnits` or `auxEngines`, delete existing ones for the report and create new ones from the payload.
            *   **Reset report status to `'pending'`.**
            *   **Clear/nullify `reviewerId`, `reviewDate`, `reviewComments`, `modification_checklist`, `requested_changes_comment`.**
            *   Update `updatedAt`.
            *   Return the updated `FullReportViewDTO`.
        *   (Done)
    *   **Sub-Task 4.4: Model Method (`ReportModel.update`):**
        *   Create a generic `update` method in `ReportModel` that can update specified fields of a report.
        *   Input: `id: string`, `data: Partial<ReportRecordData>`.
        *   Constructs a dynamic SQL `UPDATE` statement.
        *   (Done)
    *   **Sub-Task 4.5: Model Methods for Sub-records:**
        *   Add `deleteByReportId` to `ReportEngineUnitModel` and `ReportAuxEngineModel`.
        *   (Done)

5.  **Testing (Departure Report):**
    *   End-to-end flow: Captain submits -> Office requests changes -> Captain modifies & resubmits -> Report is 'pending' again, review details cleared, changes applied.
    *   (Done)

## Phase 3: Noon Report Modification Workflow

**Goal:** Extend the report modification workflow to support Noon Reports, considering their specific fields like passage states and conditional SOSP/ROSP data.

**Recap of Learnings from Departure Report Implementation:**
*   Careful type definition (`ReportRecordData`, DTOs) is crucial to avoid TypeScript errors when data flows between layers.
*   Dynamic SQL generation in models (like `ReportModel.update`) needs a comprehensive list of all possible fields (`DYNAMIC_FIELDS`).
*   Frontend form logic for field editability (`isFieldEditable`) needs to be robust and correctly tied to `readOnly`/`disabled` attributes.
*   Client-side validation needs to be aware of data structures, especially for nested objects/arrays (e.g., ignoring metadata in `engineUnits`).
*   Thorough logging at each step (controller, service, model, frontend) is invaluable for debugging data flow and SQL generation.

**Detailed Plan:**

**Task 1: Define Noon Report Modification Checklist Items**
*   **Sub-task 1.1:** Analyze [`src/types/report.ts`](src/types/report.ts:1) for all fields specific to or relevant for a Noon report (`NoonSpecificData`, relevant parts of `BaseReportData`).
    *   Key fields: `reportDate`, `reportTime`, `timeZone`, `noonLatDeg`, `noonLatMin`, `noonLatDir`, `noonLonDeg`, `noonLonMin`, `noonLonDir`, `noonCourse`, `passageState`, `sospDate`, `sospTime`, `sospLatDeg`, `sospLatMin`, `sospLatDir`, `sospLonDeg`, `sospLonMin`, `sospLonDir`, `sospCourse`, `rospDate`, `rospTime`, `rospLatDeg`, `rospLatMin`, `rospLatDir`, `rospLonDeg`, `rospLonMin`, `rospLonDir`, `rospCourse`, `distanceSinceLastReport`, weather fields, bunker consumptions/supplies, machinery parameters.
*   **Sub-task 1.2:** Define checklist item IDs and user-friendly labels.
    *   `noon_general_info`: (Report Date/Time, Timezone) - `fields_affected: ['reportDate', 'reportTime', 'timeZone']`
    *   `noon_position_course`: (Noon Lat/Lon/Course) - `fields_affected: ['noonLatDeg', 'noonLatMin', 'noonLatDir', 'noonLonDeg', 'noonLonMin', 'noonLonDir', 'noonCourse']`
    *   `noon_passage_state`: (`passageState` field itself) - `fields_affected: ['passageState']`
    *   `noon_sosp_details`: (All SOSP fields) - `fields_affected: ['sospDate', 'sospTime', 'sospLatDeg', 'sospLatMin', 'sospLatDir', 'sospLonDeg', 'sospLonMin', 'sospLonDir', 'sospCourse']`
    *   `noon_rosp_details`: (All ROSP fields) - `fields_affected: ['rospDate', 'rospTime', 'rospLatDeg', 'rospLatMin', 'rospLatDir', 'rospLonDeg', 'rospLonMin', 'rospLonDir', 'rospCourse']`
    *   `noon_weather`: (Wind, Sea, Swell details) - `fields_affected: ['windDirection', 'windForce', 'seaDirection', 'seaState', 'swellDirection', 'swellHeight']`
    *   `noon_bunker_me_cons`: `fields_affected: ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil']`
    *   `noon_bunker_boiler_cons`: `fields_affected: ['boilerConsumptionLsifo', 'boilerConsumptionLsmgo']`
    *   `noon_bunker_aux_cons`: `fields_affected: ['auxConsumptionLsifo', 'auxConsumptionLsmgo']`
    *   `noon_bunker_supplies`: `fields_affected: ['supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil']`
    *   `noon_machinery_me_params`: `fields_affected: ['meFoPressure', ..., 'meCurrentSpeed']` (all ME params)
    *   `noon_machinery_engine_units`: `fields_affected: ['engineUnits']` (entire section)
    *   `noon_machinery_aux_engines`: `fields_affected: ['auxEngines']` (entire section)
    *   `noon_performance_distance`: (`distanceSinceLastReport`) - `fields_affected: ['distanceSinceLastReport']`
*   **Sub-task 1.3:** Update `CHECKLIST_ITEMS_BY_REPORT_TYPE` in [`src/config/reportChecklists.ts`](src/config/reportChecklists.ts:1) to add an entry for `'noon'` with its specific checklist items.
*   **Sub-task 1.4:** Update `reportChecklists.ts` in `frontend/src/config/` to mirror the backend changes for the Office UI.

**Task 2: Frontend Implementation (`NoonForm.tsx`)**
*   **Sub-task 2.1: Create/Adapt `NoonForm.tsx`:**
    *   Action: Review existing [`frontend/src/components/forms/NoonForm.tsx`](frontend/src/components/forms/NoonForm.tsx:1). Adapt it to support modification mode, similar to `DepartureForm.tsx`.
    *   It needs to handle `NoonSpecificData` and relevant `BaseReportData`.
    *   Ensure inputs for `passageState` (dropdown: 'NOON', 'SOSP', 'ROSP'), and conditionally rendered sections for SOSP and ROSP details based on `formData.passageState`.
*   **Sub-task 2.2: Implement Modification Mode Logic in `NoonForm.tsx`:**
    *   Action: Add props `reportIdToModify?: string`.
    *   Action: Add state variables: `initialReportData: FullReportViewDTO | null`, `activeModificationChecklist: string[]`, `officeChangesComment: string | null`, `isLoadingReportToModify: boolean`.
    *   Action: Implement `useEffect` to fetch report data using `getReportById(reportIdToModify)` if `reportIdToModify` is present. Populate state from the fetched report.
    *   Action: Display `officeChangesComment` if present.
*   **Sub-task 2.3: Implement Field Editability Logic (`isFieldEditable`, `isSectionEditable`) in `NoonForm.tsx`:**
    *   Action: Copy `isFieldEditable` and `isSectionEditable` helpers from `DepartureForm.tsx`.
    *   Action: Import `noonChecklistItems` (or the main checklist config) from `frontend/src/config/reportChecklists.ts`.
    *   Action: **Modify `isFieldEditable` for SOSP/ROSP fields:**
        *   A SOSP field (e.g., `sospDate`) is editable if:
            1.  In modify mode (`isModifyMode`).
            2.  The "SOSP Details" checklist item (e.g., `noon_sosp_details`) is in `activeModificationChecklist`.
            3.  AND the current `formData.passageState` is 'SOSP'.
        *   Similar logic for ROSP fields.
        *   The `passageState` dropdown itself is editable if `noon_passage_state` is in `activeModificationChecklist`.
*   **Sub-task 2.4: Apply `readOnly`/`disabled` to Inputs in `NoonForm.tsx`:**
    *   Action: For standard fields (Noon Lat/Lon/Course, weather, bunkers, machinery, `distanceSinceLastReport`), apply `readOnly={isModifyMode && !isFieldEditable('fieldName')}` and corresponding styling.
    *   Action: For the `passageState` select dropdown: `disabled={isModifyMode && !isFieldEditable('passageState')}`.
    *   Action: For SOSP/ROSP input fields: `readOnly={isModifyMode && !isFieldEditable('sospFieldName')}`. The conditional rendering based on `formData.passageState` should remain.
*   **Sub-task 2.5: Implement `handleSubmit` for Resubmission in `NoonForm.tsx`:**
    *   Action: Copy the `handleSubmit` structure from `DepartureForm.tsx`.
    *   Action: Ensure `fieldsToSubmit` is constructed correctly:
        *   Include changed fields that are part of `activeModificationChecklist`.
        *   If `passageState` was changed, include it.
        *   If SOSP/ROSP fields were changed (and the relevant `passageState` is selected), include them. If `passageState` changed away from SOSP/ROSP, the SOSP/ROSP fields should ideally not be submitted or submitted as nulls (backend should handle this gracefully by only updating provided fields).
    *   Action: Call `apiClient.patch(\`/reports/\${reportIdToModify}/resubmit\`, fieldsToSubmit);`.
    *   Action: Navigate to `/captain/history` on success.
*   **Sub-task 2.6: Update `App.tsx` and Routing for Noon Form Modification:**
    *   Action: The existing `/captain/modify-report/:reportId` route should lead to a page/component (e.g., `ReportModificationPage`). This page will fetch the report by ID, determine its `reportType`, and then render the appropriate form (`DepartureForm`, `NoonForm`, etc.) passing the `reportIdToModify` and fetched report data.
    *   This might require `ReportModificationPage` to have logic like:
        ```tsx
        // Inside ReportModificationPage
        if (reportData.reportType === 'departure') return <DepartureForm reportIdToModify={id} initialData={reportData} />;
        if (reportData.reportType === 'noon') return <NoonForm reportIdToModify={id} initialData={reportData} />;
        // etc.
        ```

**Task 3: Backend Verification and Potential Refinements**
*   **Sub-task 3.1:** Review `ReportService.resubmitReport` and `ReportModel.update`.
    *   Confirm they are generic enough for Noon report fields. The dynamic field handling in `ReportModel.update` should work.
    *   The current logic in `ReportService.resubmitReport` for `engineUnits` and `auxEngines` (delete and re-create if present in `changes`) will apply.
*   **Sub-task 3.2 (Future Consideration): Recalculations for Noon Report.**
    *   If modifying `distanceSinceLastReport` or `meDailyRunHours` in a Noon report should trigger recalculations of `totalDistanceTravelled`, `avgSpeedVoyage`, or `currentRobs`, this logic is currently *not* in the `resubmitReport` path. This is a known limitation for this phase. The resubmission will save the values as provided by the frontend.

**Task 4: Testing Noon Report Modification Workflow**
*   **Sub-task 4.1: End-to-End Testing Scenarios:**
    *   **Scenario 1 (Noon Position):** Office requests change to Noon Position. Captain modifies Lat/Lon/Course. Resubmits. Verify changes and status.
    *   **Scenario 2 (Passage State Change):**
        *   Initial report: `passageState: 'NOON'`.
        *   Office requests change to `passageState` (selects `noon_passage_state` checklist item).
        *   Captain changes `passageState` to `'SOSP'`, fills SOSP details. Resubmits.
        *   Verify `passageState` and SOSP details are updated, status 'pending'.
    *   **Scenario 3 (SOSP/ROSP Details Change):**
        *   Initial report: `passageState: 'SOSP'`, SOSP details filled.
        *   Office requests change to `noon_sosp_details`.
        *   Captain modifies SOSP Date/Time. Resubmits.
        *   Verify SOSP details updated, status 'pending'.
    *   **Scenario 4 (Weather/Bunkers/Machinery):** Office requests change to one of these sections. Captain modifies. Resubmits. Verify.
    *   **Scenario 5 (Performance):** Office requests change to `distanceSinceLastReport`. Captain modifies. Resubmits. Verify.
*   **Sub-task 4.2: Verification Checklist for each test:**
    *   Correct fields are editable/read-only in `NoonForm.tsx` based on checklist and `passageState`.
    *   Correct data (only changed & allowed fields) is sent in the `PATCH` request.
    *   Report is updated in the database with captain's modifications.
    *   Report status is `'pending'`.
    *   `reviewerId`, `reviewDate`, `reviewComments`, `modification_checklist`, `requested_changes_comment` are `NULL` in the database.
    *   Report appears correctly in Office "Pending Reports" queue.
    *   Report appears correctly in Captain's "Report History" with 'pending' status.

This detailed plan for Phase 3 should cover the Noon Report modification workflow.