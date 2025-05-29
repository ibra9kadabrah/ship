# Plan to Fix Cascade Calculation Logic

## 1. Objective

To correct the cascade calculation logic in `src/services/cascade_calculator.service.ts` ensuring that:
1.  Modifications to a source report correctly update its own dependent fields before cascading.
2.  Cascading effects accurately propagate to all subsequent reports in the voyage.
3.  The "Fields Changed" preview accurately reflects all calculated changes for each affected report.
4.  The authoritative `voyageDistance` from the `VoyageModel` is consistently used.

## 2. Problem Analysis Recap

The primary issues identified are:
*   The `modifiedSource` report (the report directly edited by the user) does not have its own dependent fields (e.g., `totalDistanceTravelled` if `harbourDistance` changes) recalculated immediately after the user's modifications are applied to it and *before* the cascade to subsequent reports begins.
*   This leads to incorrect base values for the first step of the cascade, causing errors in `totalDistanceTravelled`, `distanceToGo`, and `avgSpeedVoyage` for subsequent reports.
*   The frontend preview for intermediate reports sometimes doesn't list all fields that should have changed (e.g., `totalDistanceTravelled`).

## 3. Proposed Solution and Implementation Steps

The fix will primarily involve changes to `src/services/cascade_calculator.service.ts`.

### 3.1. Recalculate Dependent Fields on `modifiedSource`

**Location:** `CascadeCalculatorService.calculateCascade`

**Logic Change:**
After applying the user's direct `modifications` to the `modifiedSource` object, and before starting the loop for `subsequentReports`, insert a step to recalculate fields on `modifiedSource` itself that depend on the `criticalMods`.

```typescript
// Inside CascadeCalculatorService.calculateCascade
// ... after criticalMods.forEach(mod => (modifiedSource as any)[mod.fieldName] = mod.newValue);

// NEW STEP: Recalculate dependent fields on modifiedSource itself
if (criticalMods.length > 0) {
  const sourceReportOriginalState = ReportModel.findById(reportId); // Get a fresh original for oldValues
  if (sourceReportOriginalState) {
    // Determine which categories of calculations are needed based on criticalMods
    const modTypesForSource = new Set(criticalMods.map(m => getCascadeType(m.fieldName)).filter(Boolean));
    let sourceReportRecalculatedState = { ...modifiedSource }; // Start with user's direct changes

    // For distance calculations on modifiedSource (e.g., if it's a departure report)
    if (modTypesForSource.has('DISTANCE')) {
      // For a departure report, totalDistanceTravelled is often harbourDistance.
      // This rule needs to be confirmed or made flexible.
      // Assuming for departure: TDT = harbourDistance
      if (modifiedSource.reportType === 'departure' && (modifiedSource as any).harbourDistance !== undefined) {
        sourceReportRecalculatedState.totalDistanceTravelled = (modifiedSource as any).harbourDistance;
        // Recalculate distanceToGo for the source report
        if (authoritativeVoyageDistance > 0 && sourceReportRecalculatedState.totalDistanceTravelled !== null) {
          sourceReportRecalculatedState.distanceToGo = Math.max(0, authoritativeVoyageDistance - sourceReportRecalculatedState.totalDistanceTravelled);
        }
      }
      // If other report types can be source and have direct distance dependencies, handle here.
      // For avgSpeedVoyage on source, it would also need recalculation if TDT or sailingTimeVoyage changed.
      if (sourceReportRecalculatedState.totalDistanceTravelled !== undefined && sourceReportRecalculatedState.sailingTimeVoyage && sourceReportRecalculatedState.sailingTimeVoyage > 0) {
        sourceReportRecalculatedState.avgSpeedVoyage = sourceReportRecalculatedState.totalDistanceTravelled / sourceReportRecalculatedState.sailingTimeVoyage;
      }
    }

    // For bunker calculations on modifiedSource
    if (modTypesForSource.has('BUNKER_CONSUMPTION') || modTypesForSource.has('BUNKER_SUPPLY')) {
      // Determine previous ROB for sourceReport. If it's the first report, initial ROBs are used.
      // This might require fetching the report *before* sourceReport if it's not a departure,
      // or using initial ROBs if it *is* a departure.
      // For simplicity, let's assume sourceReport has initial ROBs if it's a departure,
      // or its previous report's current ROBs are accessible.
      // This part needs careful handling of the "previous ROB" context for the source report itself.
      
      // Placeholder for fetching/determining previous ROB for source report:
      let prevRobForSource = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };
      if (sourceReportOriginalState.reportType === 'departure') {
        prevRobForSource = {
          lsifo: (sourceReportOriginalState as any).initialRobLsifo || 0,
          lsmgo: (sourceReportOriginalState as any).initialRobLsmgo || 0,
          cylOil: (sourceReportOriginalState as any).initialRobCylOil || 0,
          meOil: (sourceReportOriginalState as any).initialRobMeOil || 0,
          aeOil: (sourceReportOriginalState as any).initialRobAeOil || 0,
        };
      } else {
        // Fetch actual previous report to get its current ROBs
        const reportBeforeSource = ReportModel.findPreviousReport(sourceReport.id!, sourceReport.vesselId!);
        if (reportBeforeSource) {
            prevRobForSource = {
                lsifo: reportBeforeSource.currentRobLsifo || 0,
                lsmgo: reportBeforeSource.currentRobLsmgo || 0,
                cylOil: reportBeforeSource.currentRobCylOil || 0,
                meOil: reportBeforeSource.currentRobMeOil || 0,
                aeOil: reportBeforeSource.currentRobAeOil || 0,
            };
        }
      }

      const consumptions = calculateTotalConsumptions(sourceReportRecalculatedState as any);
      const supplies = sourceReportRecalculatedState as any; // Assuming supply fields are directly on the object
      const newRobs = calculateCurrentRobs(prevRobForSource, consumptions, supplies);

      sourceReportRecalculatedState.totalConsumptionLsifo = consumptions.totalConsumptionLsifo;
      // ... other total consumptions
      sourceReportRecalculatedState.currentRobLsifo = newRobs.currentRobLsifo;
      // ... other current ROBs
    }
    
    // For cargo calculations on modifiedSource (e.g., if it's a berth report)
    if (modTypesForSource.has('CARGO') && modifiedSource.reportType === 'berth') {
        // Similar to bunkers, need previous cargo state.
        // Placeholder:
        let prevCargoQtyForSource = 0;
        const reportBeforeSource = ReportModel.findPreviousReport(sourceReport.id!, sourceReport.vesselId!);
        if (reportBeforeSource) {
            prevCargoQtyForSource = (reportBeforeSource as any).cargoQuantity || 0;
        }
        
        const cargoLoaded = (sourceReportRecalculatedState as any).cargoLoaded || 0;
        const cargoUnloaded = (sourceReportRecalculatedState as any).cargoUnloaded || 0;
        sourceReportRecalculatedState.cargoQuantity = prevCargoQtyForSource + cargoLoaded - cargoUnloaded;
        sourceReportRecalculatedState.cargoStatus = sourceReportRecalculatedState.cargoQuantity > 0 ? 'Loaded' : 'Empty';
    }

    // Update modifiedSource with these self-recalculated values
    Object.assign(modifiedSource, sourceReportRecalculatedState);
  }
}
// ... rest of the calculateCascade function (loop for subsequentReports)
```
*   **Clarification Needed:** The exact rule for `totalDistanceTravelled` on a **departure report** needs to be confirmed (e.g., `TDT = harbourDistance`, or `TDT = harbourDistance - some_value`, or `TDT = initial_value_plus_harbour_distance_if_applicable`). The plan above assumes `TDT = harbourDistance` for simplicity if `harbourDistance` is modified on a departure report.
*   Recalculating ROBs/Cargo on `modifiedSource` requires knowing the state of the report *immediately preceding* `modifiedSource` (if it's not the first report of the voyage) or initial voyage values. This logic needs to be robust.

### 3.2. Ensure Correct Propagation of Cascaded Values

**Location:** `CascadeCalculatorService.calculateCascade` (looping part) and `calculateReportCascade`.

**Current Logic for Propagation (seems mostly correct but depends on `modifiedSource` being fixed):**
```typescript
// In calculateCascade loop:
const previousReportForCalc = i === 0 ? modifiedSource : { ...currentWorkingReports[i-1] /* already updated */ }; 

// ... then in calculateReportCascade, processCategoryResult updates finalState ...

// Back in calculateCascade loop, to update the working array for next iteration:
currentWorkingReports[i] = { ...currentWorkingReports[i], ...affectedReportData.finalState };
```
*   **Confirmation:** This iterative update of `currentWorkingReports` (which should be a deep copy of `subsequentReports` at the start of `calculateCascade`) is key. Each `affectedReportData.finalState` must accurately reflect all changes for that report so the *next* report in the sequence uses the correct `previousReportForCalc`.
*   The `previousReportForCalc` for the first subsequent report (`i === 0`) will correctly be the fully recalculated `modifiedSource`.

### 3.3. Populating `AffectedReport.changes` and `AffectedReport.finalState`

**Location:** `CascadeCalculatorService.calculateReportCascade` and its helper `processCategoryResult`.

**Current Logic:**
```typescript
// In processCategoryResult:
for (const field in categoryResult.updates) { // categoryResult.updates has new state for that category
  const oldValue = (targetReport as any)[field]; // targetReport is original state of current report in loop
  const newValue = categoryResult.updates[field];
  if (String(oldValue) !== String(newValue)) { 
    changes[field] = { oldValue, newValue };
  }
  finalState[field] = newValue; // finalState starts as copy of targetReport, then gets updated
}
```
*   This logic correctly identifies changes by comparing the `targetReport`'s original field value with the `newValue` calculated by the specific cascade function (e.g., `calculateDistanceCascade`).
*   `finalState` correctly accumulates all new values.
*   **Enhancement:** Ensure that `categoryResult.updates` (returned by `calculateDistanceCascade`, `calculateBunkerCascade`, etc.) truly contains *all relevant fields for that category* with their new state, not just fields whose values mathematically changed. This was addressed in the last code update.

### 3.4. Review Specific Calculator Functions (e.g., `calculateDistanceCascade`)

*   **`calculateDistanceCascade`**:
    *   It now correctly receives and uses `authoritativeVoyageDistance`.
    *   It returns `distanceSinceLastReport`, `totalDistanceTravelled`, `distanceToGo`, `voyageDistance` (authoritative), and `avgSpeedVoyage` in its `updates` (which becomes `recalculatedFields`). This is good for populating `finalState`.
*   **`calculateBunkerCascade` & `calculateCargoCascade`**:
    *   These should also ensure they return a comprehensive set of fields for their category in their `updates` object to fully populate `finalState`. This includes carrying over input fields from `targetReport` for context if they weren't directly recalculated. This was also addressed in the last code update.

## 4. Frontend Considerations (Recap)

*   [`frontend/src/components/OfficeReportModification.tsx`](frontend/src/components/OfficeReportModification.tsx:1) will display `report.reportType`.
*   It will iterate `report.changes` to show "Old Value -> New Value".
*   It can optionally iterate `report.finalState` if a more detailed "full new state" view is desired for each affected report.

## 5. Testing Focus

*   Test modifications to departure reports (e.g., `harbourDistance`, `voyageDistance`, initial bunker inputs) and verify correct recalculation on the departure report itself and correct propagation to all subsequent reports.
*   Test modifications to intermediate reports (e.g., a Noon report's `distanceSinceLastReport` or consumptions) and verify correct propagation to reports after it (but not before).
*   Verify that the "Fields Changed" preview accurately reflects all fields whose values changed in each affected report, comparing old vs. new.
*   Verify data integrity for edge cases (e.g., first report, last report, single-report voyages).

This plan prioritizes fixing the state of the `modifiedSource` before cascading, which is the most critical step to resolve the observed discrepancies.