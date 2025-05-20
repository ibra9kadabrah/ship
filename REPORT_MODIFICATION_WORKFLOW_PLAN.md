# Plan: Report Modification Workflow (Frontend-First, Departure Report Focus)

This plan outlines the implementation of a report modification workflow, starting with frontend changes for the Departure Report and minimal supporting backend adjustments.

## Phase 1: Foundational Backend Adjustments (Minimal Viable for Frontend)

1.  **Update Report Status Enum & DB Schema:**
    *   **`src/types/report.ts`:** Add `'Changes Requested'` to the `ReportStatus` enum.
        ```typescript
        export enum ReportStatus {
          PENDING = 'pending',
          APPROVED = 'approved',
          REJECTED = 'rejected',
          CHANGES_REQUESTED = 'changes_requested' // New status
        }
        ```
    *   **`src/db/setup.ts`:**
        *   Modify `reports` table `status` CHECK constraint to include `'changes_requested'`.
        *   Add `modification_checklist TEXT NULL` column to `reports` table (stores JSON array of checklist item IDs).
        *   Add `requested_changes_comment TEXT NULL` column to `reports` table (stores office user's comment for this specific modification request).

2.  **Update `ReportModel` (`src/models/report.model.ts`):**
    *   Modify `reviewReport` function:
        *   Allow setting status to `'Changes Requested'`.
        *   When status is `'Changes Requested'`, it updates `modification_checklist` and `requested_changes_comment`.

3.  **API Endpoint - Review Report (Modify):**
    *   Modify `PUT /api/reports/:id/review` (in `src/routes/report.routes.ts` and `src/controllers/report.controller.ts`):
        *   Request body to accept `status: 'changes_requested'`, `modification_checklist` (array of checklist item IDs), and `requested_changes_comment`.
        *   Controller calls `ReportService.reviewReport` with these new parameters.

4.  **API Endpoint - Fetch Report (Modify):**
    *   Ensure `GET /api/reports/:id` (via `ReportService.getReportById`) returns `modification_checklist` and `requested_changes_comment` if they exist.

5.  **Define Checklist Items for Departure Report (Conceptual - e.g., in `src/config/reportChecklists.ts` or `src/types/report.ts`):**
    *   Define a structure for checklist items, e.g.: ` { id: string; label: string; fields_affected: string[]; reportType: 'departure'; } `
    *   Create initial checklist items for `DepartureSpecificData` fields. Examples:
        *   `{ id: 'departure_voyage_details', label: 'Voyage Details (Ports, ETA, Distance)', fields_affected: ['departurePort', 'destinationPort', 'voyageDistance', 'etaDate', 'etaTime'], reportType: 'departure' }`
        *   `{ id: 'departure_fasp_coords', label: 'FASP Coordinates', fields_affected: ['faspLatDeg', 'faspLatMin', 'faspLatDir', 'faspLonDeg', 'faspLonMin', 'faspLonDir', 'faspCourse'], reportType: 'departure' }`
        *   `{ id: 'departure_bunker_me_lsifo', label: 'Bunker - ME LSIFO Consumption', fields_affected: ['meConsumptionLsifo'], reportType: 'departure' }`
        *   (Continue for all relevant groups/fields in `DepartureForm.tsx`)

## Phase 2: Frontend - Office User Workflow (Departure Report)

1.  **Display "Changes Requested" Status:**
    *   Update components like `PendingReportsList.tsx` and `AdminReportHistory.tsx` to display and filter by the new `'Changes Requested'` status.

2.  **Report Review Modal/Page (`ReportReviewPage.tsx` or similar):**
    *   For a **Departure Report**:
        *   Add "Request Changes" action.
        *   If selected:
            *   Display the predefined checklist for Departure Reports (fetched or from a frontend config mirroring backend).
            *   Allow selection of multiple checklist items.
            *   Provide a text area for `requested_changes_comment`.
            *   Submission calls `PUT /api/reports/:id/review` with `status: 'changes_requested'`, selected checklist item IDs, and the comment.

## Phase 3: Frontend - Captain Workflow (Departure Report Modification)

1.  **Display "Changes Requested" Reports:**
    *   **`ReportHistory.tsx` (Captain's view):**
        *   Highlight Departure Reports with status `'Changes Requested'`.
        *   Add a "Modify Report" button.

2.  **Departure Form Adaptation for Modification (`DepartureForm.tsx`):**
    *   **Loading Data:**
        *   Fetch full Departure Report data via `GET /api/reports/:id`, including `modification_checklist` and `requested_changes_comment`.
        *   Pre-fill form with existing data.
    *   **Display Modification Context:**
        *   Display `requested_changes_comment`.
        *   Visually indicate editable sections/fields based on `modification_checklist` (using labels from checklist definitions).
    *   **Read-Only Logic:**
        *   All fields read-only by default.
        *   Unlock input fields corresponding to `fields_affected` for each item in `modification_checklist`.
    *   **Submission of Modifications:**
        *   "Submit" button calls a new (future) API endpoint (e.g., `PUT /api/reports/:id/modify`).
        *   Payload: `reportId` and an object of *actually changed fields* and their new values.
        *   **Initial Simulation:** For this phase, submission might log the payload or navigate, as full backend processing is deferred.

## Phase 4: Backend - Processing Captain's Modifications (Departure Report - Iteration 1 - Deferred)

*   Implement `PUT /api/reports/:id/modify` endpoint.
*   Implement `ReportService.resubmitModifiedReport` and `ReportModel.updateReportForModification`.
*   Focus on:
    *   Updating specified fields for the single Departure Report.
    *   Recalculating derived values *within that report*.
    *   Setting status to `pending`.
    *   Clearing `modification_checklist` and `requested_changes_comment`.
*   **Cascading updates to subsequent reports will be handled in a later iteration.**

## Mermaid Diagram (Focus on Initial Frontend and Minimal Backend for Departure Report)

```mermaid
sequenceDiagram
    participant O as Office User
    participant C as Captain
    participant FE as Frontend
    participant BE as Backend (Minimal)
    participant DB as Database

    %% Office Requests Changes for a Departure Report
    O->>FE: Views Pending Departure Report
    FE->>BE: GET /api/reports/:id
    BE->>DB: Fetches Report
    DB-->>BE: Report Data
    BE-->>FE: Report Data
    FE-->>O: Displays Report

    O->>FE: Selects "Request Changes", picks Departure checklist items, adds comment
    FE->>BE: PUT /api/reports/:id/review (status='changes_requested', departure_checklist_ids, comment)
    BE->>DB: Updates Report (status, modification_checklist, requested_changes_comment)
    DB-->>BE: Success
    BE-->>FE: Success
    FE-->>O: Confirmation

    %% Captain Views and Modifies Departure Report
    C->>FE: Views Report History, sees "Changes Requested" Departure Report
    FE->>BE: GET /api/reports/:id
    BE->>DB: Fetches Report
    DB-->>BE: Report Data (incl. modification_checklist, requested_changes_comment)
    BE-->>FE: Report Data
    FE-->>C: Displays DepartureForm (fields locked/unlocked based on checklist, shows office comment)

    C->>FE: Modifies allowed fields in DepartureForm
    FE->>FE: Tracks changed fields and new values
    C->>FE: Clicks "Submit Modified Report"
    %% For now, frontend might just log this or navigate. Full backend processing later.
    FE-->>C: (Simulated) Modification Submitted / Navigates
    %% Later: FE->>BE: PUT /api/reports/:id/modify (changedDepartureFields)
    %% Later: BE will process, update this report, set to 'pending'