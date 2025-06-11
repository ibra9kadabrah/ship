// src/services/cascade_calculator.service.ts
import { Report, ReportType, PassageState } from '../types/report';
import ReportModel from '../models/report.model';
import VoyageModel from '../models/voyage.model';
import { calculateTotalConsumptions, calculateCurrentRobs, BunkerConsumptionInput, BunkerSupplyInput, PreviousRob, CurrentRobs } from './bunker_calculator';
import { isCriticalField, getCascadeType } from '../config/cascade_fields';

export interface FieldModification {
  fieldName: string;
  oldValue: any;
  newValue: any;
}

export interface CascadeResult {
  isValid: boolean;
  affectedReports: AffectedReport[];
  errors: string[];
}

export interface FieldChange {
  oldValue: any;
  newValue: any;
}

// Helper type for bunker deltas, keys match PreviousRob and basic fuel types
type BunkerRobDeltas = {
  lsifo?: number;
  lsmgo?: number;
  cylOil?: number;
  meOil?: number;
  aeOil?: number;
};

export interface AffectedReport {
  reportId: string;
  reportType: ReportType; 
  changes: Record<string, FieldChange>;
  finalState: Record<string, any>; 
  errors: string[];
}

const SOSP_FIELDS: (keyof Report)[] = ['sospDate', 'sospTime', 'sospLatDeg', 'sospLatMin', 'sospLatDir', 'sospLonDeg', 'sospLonMin', 'sospLonDir', 'sospCourse'];
const ROSP_FIELDS: (keyof Report)[] = ['rospDate', 'rospTime', 'rospLatDeg', 'rospLatMin', 'rospLatDir', 'rospLonDeg', 'rospLonMin', 'rospLonDir', 'rospCourse'];


export const CascadeCalculatorService = {
  async calculateCascade(reportId: string, modifications: FieldModification[]): Promise<CascadeResult> {
    const sourceReportOriginal = ReportModel.findById(reportId) as Report;
    if (!sourceReportOriginal) throw new Error(`Report ${reportId} not found`);
    if (!sourceReportOriginal.voyageId) throw new Error(`Source report ${reportId} does not have a voyageId.`);

    const voyage = VoyageModel.findById(sourceReportOriginal.voyageId);
    if (!voyage) throw new Error(`Voyage ${sourceReportOriginal.voyageId} not found for report ${reportId}.`);
    let authoritativeVoyageDistance = voyage.voyageDistance ?? 0;

    const modifiedSourceState = { ...sourceReportOriginal } as Report & Record<string, any>;
    
    // Apply ALL modifications to the source report state first
    modifications.forEach(mod => {
      modifiedSourceState[mod.fieldName] = mod.newValue;
      if (mod.fieldName === 'voyageDistance' && sourceReportOriginal.reportType === 'departure') {
        authoritativeVoyageDistance = typeof mod.newValue === 'number' ? mod.newValue : authoritativeVoyageDistance;
        modifiedSourceState.voyageDistance = authoritativeVoyageDistance;
      }
    });

    // If passageState is modified to a non-SOSP state, clear related SOSP fields
    const passageStateMod = modifications.find(m => m.fieldName === 'passageState');
    if (passageStateMod && passageStateMod.newValue !== 'SOSP') {
      SOSP_FIELDS.forEach(field => { (modifiedSourceState as any)[field] = null; });
    }
    if (passageStateMod && passageStateMod.newValue !== 'ROSP') {
      ROSP_FIELDS.forEach(field => { (modifiedSourceState as any)[field] = null; });
    }

    let distanceDelta = 0;
    const bunkerRobDeltas: BunkerRobDeltas = {};
    let cargoQuantityDelta = 0;

    const originalSourceTDT = sourceReportOriginal.totalDistanceTravelled ?? 0;
    const originalSourceRobs: PreviousRob = {
        lsifo: sourceReportOriginal.currentRobLsifo ?? 0, lsmgo: sourceReportOriginal.currentRobLsmgo ?? 0,
        cylOil: sourceReportOriginal.currentRobCylOil ?? 0, meOil: sourceReportOriginal.currentRobMeOil ?? 0,
        aeOil: sourceReportOriginal.currentRobAeOil ?? 0,
    };
    const originalSourceCargoQuantity = (sourceReportOriginal as any).cargoQuantity ?? 0;

    const criticalMods = modifications.filter(m => isCriticalField(m.fieldName));
    const modTypesForSource = new Set(criticalMods.map(m => getCascadeType(m.fieldName)).filter(Boolean));

    if (modTypesForSource.has('DISTANCE')) {
      const harbourDistanceMod = criticalMods.find(m => m.fieldName === 'harbourDistance' && sourceReportOriginal.reportType === 'departure');
      if (harbourDistanceMod) {
        const oldHD = harbourDistanceMod.oldValue ?? 0;
        const newHD = harbourDistanceMod.newValue ?? 0;
        distanceDelta = newHD - oldHD;
        modifiedSourceState.totalDistanceTravelled = originalSourceTDT + distanceDelta;
      } else if (criticalMods.some(m => m.fieldName === 'totalDistanceTravelled')) {
        distanceDelta = (modifiedSourceState.totalDistanceTravelled ?? 0) - originalSourceTDT;
      } else if (sourceReportOriginal.reportType !== 'departure' && criticalMods.some(m => m.fieldName === 'distanceSinceLastReport')) {
        const reportBeforeSource = ReportModel.findPreviousReport(modifiedSourceState.id, modifiedSourceState.vesselId);
        const prevTotalDist = reportBeforeSource?.totalDistanceTravelled ?? 0;
        modifiedSourceState.totalDistanceTravelled = prevTotalDist + (modifiedSourceState.distanceSinceLastReport ?? 0);
        distanceDelta = (modifiedSourceState.totalDistanceTravelled ?? 0) - originalSourceTDT;
      }
      
      const currentSourceTDT = modifiedSourceState.totalDistanceTravelled ?? 0;
      modifiedSourceState.distanceToGo = Math.max(0, authoritativeVoyageDistance - currentSourceTDT);
      const sailingTime = modifiedSourceState.sailingTimeVoyage ?? 0;
      if (sailingTime > 0) modifiedSourceState.avgSpeedVoyage = currentSourceTDT / sailingTime;
      else if (currentSourceTDT === 0 && sailingTime === 0) modifiedSourceState.avgSpeedVoyage = 0;
      else modifiedSourceState.avgSpeedVoyage = (distanceDelta !== 0 && sailingTime === 0 && currentSourceTDT !== 0) ? null : sourceReportOriginal.avgSpeedVoyage;
    }

    if (modTypesForSource.has('BUNKER_CONSUMPTION') || modTypesForSource.has('BUNKER_SUPPLY')) {
      let prevRobForSource: PreviousRob = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };
      if (modifiedSourceState.reportType === 'departure') {
        prevRobForSource = {
          lsifo: modifiedSourceState.initialRobLsifo ?? 0, lsmgo: modifiedSourceState.initialRobLsmgo ?? 0,
          cylOil: modifiedSourceState.initialRobCylOil ?? 0, meOil: modifiedSourceState.initialRobMeOil ?? 0,
          aeOil: modifiedSourceState.initialRobAeOil ?? 0,
        };
      } else {
        const reportBeforeSource = ReportModel.findPreviousReport(modifiedSourceState.id, modifiedSourceState.vesselId);
        if (reportBeforeSource) prevRobForSource = {
            lsifo: reportBeforeSource.currentRobLsifo ?? 0, lsmgo: reportBeforeSource.currentRobLsmgo ?? 0,
            cylOil: reportBeforeSource.currentRobCylOil ?? 0, meOil: reportBeforeSource.currentRobMeOil ?? 0,
            aeOil: reportBeforeSource.currentRobAeOil ?? 0,
        };
      }
      const consumptions = calculateTotalConsumptions(modifiedSourceState as BunkerConsumptionInput);
      const supplies = modifiedSourceState as BunkerSupplyInput;
      const newSourceRobs = calculateCurrentRobs(prevRobForSource, consumptions, supplies);

      modifiedSourceState.totalConsumptionLsifo = consumptions.totalConsumptionLsifo;
      modifiedSourceState.totalConsumptionLsmgo = consumptions.totalConsumptionLsmgo;
      modifiedSourceState.totalConsumptionCylOil = consumptions.totalConsumptionCylOil;
      modifiedSourceState.totalConsumptionMeOil = consumptions.totalConsumptionMeOil;
      modifiedSourceState.totalConsumptionAeOil = consumptions.totalConsumptionAeOil;

      modifiedSourceState.currentRobLsifo = newSourceRobs.currentRobLsifo;
      bunkerRobDeltas.lsifo = (newSourceRobs.currentRobLsifo ?? 0) - (originalSourceRobs.lsifo ?? 0);
      modifiedSourceState.currentRobLsmgo = newSourceRobs.currentRobLsmgo;
      bunkerRobDeltas.lsmgo = (newSourceRobs.currentRobLsmgo ?? 0) - (originalSourceRobs.lsmgo ?? 0);
      modifiedSourceState.currentRobCylOil = newSourceRobs.currentRobCylOil;
      bunkerRobDeltas.cylOil = (newSourceRobs.currentRobCylOil ?? 0) - (originalSourceRobs.cylOil ?? 0);
      modifiedSourceState.currentRobMeOil = newSourceRobs.currentRobMeOil;
      bunkerRobDeltas.meOil = (newSourceRobs.currentRobMeOil ?? 0) - (originalSourceRobs.meOil ?? 0);
      modifiedSourceState.currentRobAeOil = newSourceRobs.currentRobAeOil;
      bunkerRobDeltas.aeOil = (newSourceRobs.currentRobAeOil ?? 0) - (originalSourceRobs.aeOil ?? 0);
    }

    if (modTypesForSource.has('CARGO') && modifiedSourceState.reportType === 'berth') {
      let prevCargoQtyForSource = 0;
      const reportBeforeSource = ReportModel.findPreviousReport(modifiedSourceState.id, modifiedSourceState.vesselId);
      if (reportBeforeSource) prevCargoQtyForSource = (reportBeforeSource as any).cargoQuantity ?? 0;
      
      const cargoLoaded = modifiedSourceState.cargoLoaded ?? 0;
      const cargoUnloaded = modifiedSourceState.cargoUnloaded ?? 0;
      const newSourceCargoQuantity = prevCargoQtyForSource + cargoLoaded - cargoUnloaded;
      
      modifiedSourceState.cargoQuantity = newSourceCargoQuantity;
      modifiedSourceState.cargoStatus = newSourceCargoQuantity > 0 ? 'Loaded' : 'Empty';
      cargoQuantityDelta = newSourceCargoQuantity - originalSourceCargoQuantity;
    }

    const result: CascadeResult = { isValid: true, affectedReports: [], errors: [] };
    
    // Calculate changes for the source report by comparing final modifiedSourceState with original
    const sourceChanges: Record<string, FieldChange> = {};
    for (const key of Object.keys(modifiedSourceState) as (keyof Report)[]) {
      const originalValue = (sourceReportOriginal as any)[key];
      const finalValue = modifiedSourceState[key];

      if (Object.prototype.hasOwnProperty.call(sourceReportOriginal, key)) { // Key existed in original
        if (String(originalValue) !== String(finalValue)) {
          if (typeof originalValue === 'number' && typeof finalValue === 'number' && Math.abs(originalValue - finalValue) < 1e-5) {
            // Numbers are effectively the same, no change
          } else if ((originalValue === null || originalValue === undefined) && (finalValue === null || finalValue === undefined)) {
            // Both are null/undefined, no change
          } else {
            sourceChanges[key] = { oldValue: originalValue, newValue: finalValue };
          }
        }
      } else if (finalValue !== undefined && finalValue !== null) { // New key added with a value
        sourceChanges[key] = { oldValue: undefined, newValue: finalValue };
      }
    }
    // Check for keys removed from original
    for (const key of Object.keys(sourceReportOriginal) as (keyof Report)[]) {
      if (!Object.prototype.hasOwnProperty.call(modifiedSourceState, key) || modifiedSourceState[key] === undefined) {
        if (sourceReportOriginal[key] !== undefined && sourceReportOriginal[key] !== null && !sourceChanges[key]) {
          sourceChanges[key] = { oldValue: sourceReportOriginal[key], newValue: undefined };
        }
      }
    }

    if (Object.keys(sourceChanges).length > 0) {
      result.affectedReports.push({
        reportId: sourceReportOriginal.id, reportType: sourceReportOriginal.reportType,
        changes: sourceChanges, finalState: { ...modifiedSourceState }, errors: [] // finalState is the fully modified source state
      });
    }

    const subsequentReports = this.getSubsequentReports(sourceReportOriginal);
    let predecessorFinalState: Partial<Report> & Record<string, any> = { ...modifiedSourceState };

    for (const originalSubsequentReport of subsequentReports) {
      const affectedReportData = this.applyDeltasToReport(
        originalSubsequentReport, authoritativeVoyageDistance,
        distanceDelta, bunkerRobDeltas, cargoQuantityDelta,
        predecessorFinalState.passageState as PassageState | null
      );
      result.affectedReports.push(affectedReportData);
      if (affectedReportData.errors.length > 0) {
        result.isValid = false;
        result.errors.push(...affectedReportData.errors);
      }
      predecessorFinalState = affectedReportData.finalState;
    }
    return result;
  },

  getSubsequentReports(sourceReport: Partial<Report>): Partial<Report>[] { 
    if (!sourceReport.voyageId) return [];
    const allReports = ReportModel._getAllReportsForVoyage(sourceReport.voyageId)
      .filter(r => r.status === 'approved' && r.id !== sourceReport.id)
      .map(r => ({ ...r })); 
    allReports.sort((a, b) => this.getTimestamp(a) - this.getTimestamp(b));
    const sourceTimestamp = this.getTimestamp(sourceReport);
    return allReports.filter(r => this.getTimestamp(r) > sourceTimestamp);
  },

  applyDeltasToReport(
    originalReport: Partial<Report>,
    authoritativeVoyageDistance: number,
    distanceDelta: number,
    bunkerRobDeltas: BunkerRobDeltas,
    cargoQuantityDelta: number,
    predecessorPassageState: PassageState | null // New parameter
  ): AffectedReport {
    const finalState: Partial<Report> & Record<string, any> = { ...originalReport };
    const changes: Record<string, FieldChange> = {};
    const errors: string[] = [];

    const oldTDT = originalReport.totalDistanceTravelled ?? 0;
    let newTDT = oldTDT;
    if (distanceDelta !== 0) {
      newTDT = oldTDT + distanceDelta;
      if (Math.abs(oldTDT - newTDT) > 1e-5) changes.totalDistanceTravelled = { oldValue: oldTDT, newValue: newTDT };
    }
    finalState.totalDistanceTravelled = newTDT;

    const oldDTG = originalReport.distanceToGo ?? (authoritativeVoyageDistance - oldTDT);
    const newDTG = Math.max(0, authoritativeVoyageDistance - newTDT);
    if (Math.abs((oldDTG ?? 0) - newDTG) > 1e-5) changes.distanceToGo = { oldValue: oldDTG, newValue: newDTG };
    finalState.distanceToGo = newDTG;
    
    // Correctly handle voyageDistance so it doesn't show as a change if it's consistent.
    if (finalState.reportType === 'departure' && finalState.voyageDistance !== authoritativeVoyageDistance) {
        changes.voyageDistance = { oldValue: finalState.voyageDistance, newValue: authoritativeVoyageDistance };
        finalState.voyageDistance = authoritativeVoyageDistance;
    }

    const sailingTime = originalReport.sailingTimeVoyage ?? 0;
    finalState.sailingTimeVoyage = sailingTime;
    const oldAvgSpeed = originalReport.avgSpeedVoyage;
    let newAvgSpeed = oldAvgSpeed;
    if (sailingTime > 0) newAvgSpeed = newTDT / sailingTime;
    else if (newTDT === 0 && sailingTime === 0) newAvgSpeed = 0;
    if (oldAvgSpeed !== newAvgSpeed && (oldAvgSpeed !== null && oldAvgSpeed !== undefined || Math.abs(newAvgSpeed ?? 0) > 1e-5)) {
        if (typeof oldAvgSpeed === 'number' && typeof newAvgSpeed === 'number') { if (Math.abs(oldAvgSpeed - newAvgSpeed) > 1e-5) changes.avgSpeedVoyage = { oldValue: oldAvgSpeed, newValue: newAvgSpeed };}
        else changes.avgSpeedVoyage = { oldValue: oldAvgSpeed, newValue: newAvgSpeed };
    }
    finalState.avgSpeedVoyage = newAvgSpeed;
    if (finalState.avgSpeedVoyage !== null && finalState.avgSpeedVoyage !== undefined && (finalState.avgSpeedVoyage < 0 || finalState.avgSpeedVoyage > 30)) errors.push(`Invalid speed: ${finalState.avgSpeedVoyage.toFixed(2)} for report ${originalReport.id}`);
    if (newTDT < 0) errors.push(`Negative total distance: ${newTDT.toFixed(2)} for report ${originalReport.id}`);
    if (authoritativeVoyageDistance > 0 && newTDT > authoritativeVoyageDistance * 1.1) errors.push(`Total distance (${newTDT.toFixed(2)}) exceeds voyage distance (${authoritativeVoyageDistance.toFixed(2)}) by >10% for report ${originalReport.id}`);
    (finalState as any).distanceSinceLastReport = (originalReport as any).distanceSinceLastReport;

    // Apply Bunker Deltas
    const robKeys: (keyof BunkerRobDeltas)[] = ['lsifo', 'lsmgo', 'cylOil', 'meOil', 'aeOil'];
    robKeys.forEach(fuelKey => {
        const delta = bunkerRobDeltas[fuelKey] ?? 0;
        const robFieldKey = `currentRob${fuelKey.charAt(0).toUpperCase() + fuelKey.slice(1)}` as keyof Report;
        
        if (delta !== 0) {
            const oldRob = (originalReport as any)[robFieldKey] ?? 0;
            const newRob = oldRob + delta;
            if (Math.abs(oldRob - newRob) > 1e-5) changes[robFieldKey] = { oldValue: oldRob, newValue: newRob };
            (finalState as any)[robFieldKey] = newRob;
            if (newRob < 0) errors.push(`Negative ROB for ${fuelKey}: ${newRob.toFixed(2)}`);
        } else {
            (finalState as any)[robFieldKey] = (originalReport as any)[robFieldKey];
        }
    });
    // Carry over consumption and supply inputs for subsequent reports
    const bunkerInputFields = ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo', 'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil', 'totalConsumptionLsifo', 'totalConsumptionLsmgo', 'totalConsumptionCylOil', 'totalConsumptionMeOil', 'totalConsumptionAeOil'];
    bunkerInputFields.forEach(k => {
        if ((originalReport as any)[k] !== undefined) (finalState as any)[k] = (originalReport as any)[k];
    });

    // Apply Cargo Delta
    if (cargoQuantityDelta !== 0) {
        const oldCargoQty = (originalReport as any).cargoQuantity ?? 0;
        const newCargoQty = oldCargoQty + cargoQuantityDelta;
        if (Math.abs(oldCargoQty - newCargoQty) > 1e-5) changes.cargoQuantity = { oldValue: oldCargoQty, newValue: newCargoQty };
        (finalState as any).cargoQuantity = newCargoQty;
        (finalState as any).cargoStatus = newCargoQty > 0 ? 'Loaded' : 'Empty';
    } else {
        (finalState as any).cargoQuantity = (originalReport as any).cargoQuantity;
        (finalState as any).cargoStatus = (originalReport as any).cargoStatus;
    }
    (finalState as any).cargoLoaded = (originalReport as any).cargoLoaded;
    (finalState as any).cargoUnloaded = (originalReport as any).cargoUnloaded;
    (finalState as any).cargoType = (originalReport as any).cargoType;

    // New: Passage State Cascade Logic
    const originalPassageState = originalReport.passageState as PassageState | null;
    if (originalPassageState === 'ROSP' && predecessorPassageState !== 'SOSP') {
      if (finalState.passageState !== 'NOON') { // Assuming 'NOON' is the default
        changes.passageState = { oldValue: originalPassageState, newValue: 'NOON' };
      }
      finalState.passageState = 'NOON';
      ROSP_FIELDS.forEach(field => {
        if ((finalState as any)[field] !== null) {
          changes[field] = { oldValue: (finalState as any)[field], newValue: null };
        }
        (finalState as any)[field] = null;
      });
    }

    Object.keys(originalReport).forEach(key => {
        if (!(key in finalState)) (finalState as any)[key] = (originalReport as any)[key];
    });

    return {
      reportId: originalReport.id!,
      reportType: originalReport.reportType!,
      changes,
      finalState,
      errors
    };
  },

  getTimestamp(report: Partial<Report>): number { 
    if (report.createdAt) {
      try {
        return new Date(report.createdAt).getTime();
      } catch (e) {
        console.error('Error parsing createdAt timestamp:', e);
        return 0;
      }
    }
    return 0;
  }
};