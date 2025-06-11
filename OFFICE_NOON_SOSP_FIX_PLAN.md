# Plan: Correcting Noon Report SOSP State and Implementing Cascade Logic

## 1. Problem Statement

An incorrect `passageState` (e.g., "SOSP" - Stoppage of Sea Passage) in an approved Noon Report cannot be easily changed to "none" (i.e., `null`) through the existing report modification user interface. The UI field for `passageState` is often disabled. Furthermore, if such a change were made, the system currently lacks the backend logic to correctly cascade this state change to subsequent reports (e.g., a following "ROSP" - Resumption of Sea Passage report should also be cleared or re-evaluated).

## 2. Root Cause Analysis

### 2.1. Frontend Issue: Disabled `passageState` Field

*   The Noon Report modification UI is handled by `NoonForm.tsx`, which uses `PassageStateSection.tsx` to render the `passageState` dropdown.
*   The `passageState` dropdown in `PassageStateSection.tsx` is disabled during report modification (`isModifyMode === true`) if the checklist item ID `'noon_passage_state'` is not present in the `activeModificationChecklist` for that report.
*   The `activeModificationChecklist` is determined by the items selected by an office user when requesting changes to a report.
*   **Conclusion:** The field is disabled because the office did not explicitly request a change to the "Passage State" via the checklist system.

### 2.2. Backend Issue: Missing `passageState` Cascade Logic

*   The backend `ReportModel` ([`src/models/report.model.ts`](src/models/report.model.ts:1)) allows `passageState` to be `null`.
*   The `ReportModificationService` ([`src/services/report_modification.service.ts`](src/services/report_modification.service.ts:1)) and `CascadeCalculatorService` ([`src/services/cascade_calculator.service.ts`](src/services/cascade_calculator.service.ts:1)) handle report modifications and cascading effects of changes.
*   However, the current `CascadeCalculatorService` primarily focuses on numerical cascades (distance, bunkers, cargo) and does not have logic to handle the logical cascade required for `passageState` changes (e.g., clearing an SOSP should clear a dependent ROSP).
*   The `report_validator.ts` ([`src/services/report_validator.ts`](src/services/report_validator.ts:1)) correctly validates `passageState` transitions for *new* report submissions (e.g., ROSP must follow SOSP) but does not inherently prevent an existing SOSP from being changed to `null` if the actual preceding report allows it.

## 3. Solution Proposal

The solution involves two main parts: enabling the frontend modification under office control and implementing the necessary backend cascade logic.

### 3.1. Frontend Enablement (User/Office Action - No Code Change Required for Enablement)

*   **Action:** For office personnel to enable the modification of `passageState` for a specific Noon Report:
    *   When initiating a report modification ("changes requested"), they **must** select the checklist item corresponding to "Passage State (Noon/SOSP/ROSP)" (which has the ID `'noon_passage_state'` as defined in [`frontend/src/config/reportChecklists.ts`](frontend/src/config/reportChecklists.ts:191)).
*   **Outcome:** If `'noon_passage_state'` is included in the `activeModificationChecklist`, the `passageState` dropdown in `NoonForm.tsx` will become editable, allowing the user to select the empty option (representing "none" or `null`).

### 3.2. Backend Implementation: `passageState` Cascade Logic (Code Changes Required)

The primary backend changes will be in the service layer, likely within `CascadeCalculatorService.calculateCascade` or a new dedicated function/service called by `ReportModificationService`.

**Affected Files:**
*   Primarily: [`src/services/cascade_calculator.service.ts`](src/services/cascade_calculator.service.ts)
*   Potentially: [`src/services/report_modification.service.ts`](src/services/report_modification.service.ts) (if a new service is introduced for state cascades).

**Detailed Logic:**

1.  **Detect `passageState` Modification:**
    *   Within `modifyReportWithCascade` (or equivalent), check if `passageState` is one of the `modifications`.

2.  **Handle `passageState` Change on the Source Report:**
    *   If the `newValue` for `passageState` is `null` (or an empty string representing "none"):
        *   Explicitly set all SOSP-related fields on the source report to `null`. These include: `sospDate`, `sospTime`, `sospLatDeg`, `sospLatMin`, `sospLatDir`, `sospLonDeg`, `sospLonMin`, `sospLonDir`, `sospCourse`.
        *   Explicitly set all ROSP-related fields on the source report to `null`. These include: `rospDate`, `rospTime`, `rospLatDeg`, `rospLatMin`, `rospLatDir`, `rospLonDeg`, `rospLonMin`, `rospLonDir`, `rospCourse`.
        *   These changes should be added to the `modifiedSourceState` and reflected in the `changes` object for the source report in `CascadeResult`.

3.  **Implement Cascading Logic for Subsequent Reports:**
    *   This logic will be applied when iterating through `subsequentReports` in `CascadeCalculatorService.calculateCascade` (or its new equivalent for state).
    *   For each `originalSubsequentReport`:
        *   Determine the `passageState` of its *direct chronological predecessor report* after that predecessor has been modified by the current cascade operation.
        *   **If the (now modified) predecessor's `passageState` is `null` (i.e., it's no longer SOSP) AND the `originalSubsequentReport.passageState` was 'ROSP':**
            *   The `finalState` for this `originalSubsequentReport` must have its `passageState` set to `null`.
            *   All its ROSP-specific fields (`rospDate`, `rospTime`, etc.) must be set to `null` in its `finalState`.
            *   Record these changes in the `changes` object for this `affectedReport`.
        *   **Important:** This state change must propagate. If clearing an ROSP on report C (because its predecessor B became `null`) means that report C (which might have been SOSP for a report D) is now `null`, then report D's state might also need re-evaluation if it was ROSP. The iteration should ensure that each report is processed based on the *final modified state* of its immediate predecessor in the cascade chain.
    *   The `applyDeltasToReport` function (or a new similar function for state changes) will need to be updated or augmented to handle these `passageState` recalculations and field clearings for subsequent reports.

4.  **Validation Considerations:**
    *   The existing `report_validator.ts` logic for `passageState` (requiring SOSP/ROSP after a previous SOSP, and not allowing ROSP otherwise) is generally compatible. Our changes ensure that if a previous SOSP is nullified, a subsequent ROSP also becomes nullified, maintaining consistency.
    *   The validator already allows `passageState` to be `null` and doesn't require SOSP/ROSP specific fields if `passageState` is `null`.

## 4. Visual Plan (Mermaid Diagram)

```mermaid
graph TD
    A[User/Office Identifies Incorrect SOSP State in Noon Report] --> B{Office Initiates Report Modification};
    B --> C{Is 'noon_passage_state' included in Modification Checklist?};
    C -- Yes --> D[Frontend: NoonForm.tsx enables 'passageState' dropdown];
    D --> E[User selects 'None' (empty value) for passageState];
    E --> F[Frontend: User submits modification];
    F --> G[Backend: ReportModificationController receives request];
    G --> H[Backend: ReportModificationService.modifyReportWithCascade is called];
    H --> I[Backend: CascadeCalculatorService (or new logic) processes modifications];
    I --> J{Source report's passageState changed to 'None'?};
    J -- Yes --> K[Backend: Clear SOSP/ROSP fields on Source Report];
    K --> L[Backend: Iterate Subsequent Reports];
    L --> M{Subsequent Report was ROSP AND its (now modified) Predecessor's passageState is 'None'?};
    M -- Yes --> N[Backend: Set Subsequent Report's passageState to 'None' & Clear its ROSP fields];
    N --> L;
    M -- No --> O[Backend: Apply other (e.g. numerical) cascades if any to Subsequent Report];
    O --> L;
    L -- All Subsequent Reports Processed --> P[Backend: ReportModel.update saves changes to all affected reports];
    P --> Q[Modification Complete];
    C -- No --> R[Frontend: 'passageState' dropdown remains disabled - Initial Scenario];
```

## 5. Next Steps (Post-Planning)

1.  **User Communication:** Inform office users about the necessity of selecting "Passage State" in the modification checklist to enable its editing.
2.  **Backend Development:** Implement the cascade logic described in section 3.2.
3.  **Testing:** Thoroughly test the modification flow:
    *   Modifying SOSP to None.
    *   Ensuring subsequent ROSP is cleared.
    *   Ensuring other numerical cascades still work.
    *   Testing with multiple subsequent SOSP/ROSP reports.
    *   Ensuring no unintended side effects on other report types or modifications.