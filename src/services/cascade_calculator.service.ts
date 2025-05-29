// src/services/cascade_calculator.service.ts
import { Report, ReportType } from '../types/report';
import ReportModel from '../models/report.model';
import VoyageModel from '../models/voyage.model';
import { calculateTotalConsumptions, calculateCurrentRobs, BunkerConsumptionInput, BunkerSupplyInput, PreviousRob } from './bunker_calculator';
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

export interface AffectedReport {
  reportId: string;
  reportType: ReportType; 
  changes: Record<string, FieldChange>;
  finalState: Record<string, any>; 
  errors: string[];
}

export const CascadeCalculatorService = {
  async calculateCascade(reportId: string, modifications: FieldModification[]): Promise<CascadeResult> {
    const sourceReportOriginal = ReportModel.findById(reportId) as Report;
    if (!sourceReportOriginal) throw new Error(`Report ${reportId} not found`);
    if (!sourceReportOriginal.voyageId) throw new Error(`Source report ${reportId} does not have a voyageId.`);

    const voyage = VoyageModel.findById(sourceReportOriginal.voyageId);
    if (!voyage) throw new Error(`Voyage ${sourceReportOriginal.voyageId} not found for report ${reportId}.`);
    let authoritativeVoyageDistance = voyage.voyageDistance ?? 0;

    const criticalMods = modifications.filter(m => isCriticalField(m.fieldName));

    const modifiedSourceState = { ...sourceReportOriginal } as Report & Record<string, any>;
    
    let distanceDelta = 0;
    const originalSourceTDT = sourceReportOriginal.totalDistanceTravelled ?? 0;

    // Apply direct modifications first
    criticalMods.forEach(mod => {
      modifiedSourceState[mod.fieldName] = mod.newValue;
      if (mod.fieldName === 'voyageDistance' && sourceReportOriginal.reportType === 'departure') {
        authoritativeVoyageDistance = typeof mod.newValue === 'number' ? mod.newValue : authoritativeVoyageDistance;
        modifiedSourceState.voyageDistance = authoritativeVoyageDistance;
      }
    });
    
    // Determine distanceDelta based on the primary distance field modified on source
    const harbourDistanceMod = criticalMods.find(m => m.fieldName === 'harbourDistance' && sourceReportOriginal.reportType === 'departure');
    
    if (harbourDistanceMod) {
      const oldHD = harbourDistanceMod.oldValue ?? 0;
      const newHD = harbourDistanceMod.newValue ?? 0;
      distanceDelta = newHD - oldHD; // Strict delta from harbourDistance change
      // Update TDT of source based on this delta from its *original* TDT
      modifiedSourceState.totalDistanceTravelled = originalSourceTDT + distanceDelta;
    } else {
      // If other distance fields (like TDT itself, or DSL on non-departure) were modified on source
      // The delta is the change in the source's TDT after its own recalculation
      // For TDT direct mod:
      if (criticalMods.some(m => m.fieldName === 'totalDistanceTravelled')) {
         distanceDelta = (modifiedSourceState.totalDistanceTravelled ?? 0) - originalSourceTDT;
      } 
      // For DSL mod on non-departure source:
      else if (sourceReportOriginal.reportType !== 'departure' && criticalMods.some(m => m.fieldName === 'distanceSinceLastReport')) {
        const reportBeforeSource = ReportModel.findPreviousReport(modifiedSourceState.id, modifiedSourceState.vesselId);
        const prevTotalDist = reportBeforeSource?.totalDistanceTravelled ?? 0;
        modifiedSourceState.totalDistanceTravelled = prevTotalDist + (modifiedSourceState.distanceSinceLastReport ?? 0);
        distanceDelta = (modifiedSourceState.totalDistanceTravelled ?? 0) - originalSourceTDT;
      }
    }

    // Recalculate other dependent distance fields on modifiedSourceState using its new TDT
    if (criticalMods.some(m => getCascadeType(m.fieldName) === 'DISTANCE')) {
        const currentSourceTDT = modifiedSourceState.totalDistanceTravelled ?? 0;
        if (authoritativeVoyageDistance >= 0) {
            modifiedSourceState.distanceToGo = Math.max(0, authoritativeVoyageDistance - currentSourceTDT);
        } else {
            modifiedSourceState.distanceToGo = null;
        }
        const sailingTime = modifiedSourceState.sailingTimeVoyage ?? 0;
        if (sailingTime > 0) {
            modifiedSourceState.avgSpeedVoyage = currentSourceTDT / sailingTime;
        } else if (currentSourceTDT === 0 && sailingTime === 0) {
            modifiedSourceState.avgSpeedVoyage = 0;
        } else {
            // If TDT changed but sailing time is 0, avgSpeed might become Infinity or NaN
            modifiedSourceState.avgSpeedVoyage = (distanceDelta !== 0 && sailingTime === 0 && currentSourceTDT !== 0) ? null : sourceReportOriginal.avgSpeedVoyage;
        }
    }
    
    // TODO: Implement similar delta calculation and self-recalculation for BUNKER and CARGO
    // e.g., calculate primaryRobDelta, primaryCargoDelta for modifiedSourceState

    const result: CascadeResult = { isValid: true, affectedReports: [], errors: [] };

    // Add AffectedReport for the source report itself
    if (criticalMods.length > 0) {
      const sourceChanges: Record<string, FieldChange> = {};
      for (const key in modifiedSourceState) {
        if (Object.prototype.hasOwnProperty.call(modifiedSourceState, key)) {
          const oldValue = (sourceReportOriginal as any)[key];
          const newValue = modifiedSourceState[key];
          if (String(oldValue) !== String(newValue)) {
            if (typeof oldValue === 'number' && typeof newValue === 'number') {
                if (Math.abs(oldValue - newValue) > 1e-5) { 
                    sourceChanges[key] = { oldValue, newValue };
                }
            } else if (oldValue !== newValue) { 
                 sourceChanges[key] = { oldValue, newValue };
            }
          }
        }
      }
      // Ensure direct modifications are captured if self-recalc reverted them or if they weren't "dependent"
      criticalMods.forEach(mod => {
        const currentValInSourceChanges = sourceChanges[mod.fieldName]?.newValue;
        if (currentValInSourceChanges === undefined || currentValInSourceChanges !== mod.newValue) {
             // If not captured or if self-recalc changed it from user's direct input, ensure user's input is shown as the change
             if (mod.oldValue !== mod.newValue) { // only if there was a change
                sourceChanges[mod.fieldName] = { oldValue: mod.oldValue, newValue: mod.newValue };
             }
        }
         // And ensure final state has the user's direct input for these critical mods
         modifiedSourceState[mod.fieldName] = mod.newValue;
      });


      result.affectedReports.push({
        reportId: sourceReportOriginal.id,
        reportType: sourceReportOriginal.reportType,
        changes: sourceChanges,
        finalState: { ...modifiedSourceState },
        errors: [] 
      });
    }

    const subsequentReports = this.getSubsequentReports(sourceReportOriginal);
    for (const originalSubsequentReport of subsequentReports) {
      const affectedReportData = this.applyDeltasToReport(
        originalSubsequentReport, 
        authoritativeVoyageDistance,
        distanceDelta
        // Pass other deltas here
      );
      result.affectedReports.push(affectedReportData);
      if (affectedReportData.errors.length > 0) {
        result.isValid = false;
        result.errors.push(...affectedReportData.errors);
      }
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
    distanceDelta: number
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
    
    const originalVoyageDistField = (originalReport as any).voyageDistance;
    if (originalVoyageDistField !== authoritativeVoyageDistance && !(originalVoyageDistField === null && authoritativeVoyageDistance === 0) ) {
        changes.voyageDistance = { oldValue: originalVoyageDistField, newValue: authoritativeVoyageDistance };
    }
    (finalState as any).voyageDistance = authoritativeVoyageDistance;

    const sailingTime = originalReport.sailingTimeVoyage ?? 0;
    finalState.sailingTimeVoyage = sailingTime; 
    
    const oldAvgSpeed = originalReport.avgSpeedVoyage;
    let newAvgSpeed = oldAvgSpeed;

    if (sailingTime > 0) {
      newAvgSpeed = newTDT / sailingTime;
    } else if (newTDT === 0 && sailingTime === 0) {
      newAvgSpeed = 0;
    }
    // Only record a change if it's significant or if oldAvgSpeed was not null/undefined
    if (oldAvgSpeed !== newAvgSpeed && (oldAvgSpeed !== null && oldAvgSpeed !== undefined || Math.abs(newAvgSpeed ?? 0) > 1e-5)) {
        if (typeof oldAvgSpeed === 'number' && typeof newAvgSpeed === 'number') {
            if (Math.abs(oldAvgSpeed - newAvgSpeed) > 1e-5) {
                changes.avgSpeedVoyage = { oldValue: oldAvgSpeed, newValue: newAvgSpeed };
            }
        } else { // Handles cases like null -> number or number -> null
            changes.avgSpeedVoyage = { oldValue: oldAvgSpeed, newValue: newAvgSpeed };
        }
    }
    finalState.avgSpeedVoyage = newAvgSpeed;

    if (finalState.avgSpeedVoyage !== null && finalState.avgSpeedVoyage !== undefined && (finalState.avgSpeedVoyage < 0 || finalState.avgSpeedVoyage > 30)) {
        errors.push(`Invalid speed: ${finalState.avgSpeedVoyage.toFixed(2)} for report ${originalReport.id}`);
    }

    if (newTDT < 0) errors.push(`Negative total distance: ${newTDT.toFixed(2)} for report ${originalReport.id}`);
    if (authoritativeVoyageDistance > 0 && newTDT > authoritativeVoyageDistance * 1.1) {
      errors.push(`Total distance (${newTDT.toFixed(2)}) exceeds voyage distance (${authoritativeVoyageDistance.toFixed(2)}) by >10% for report ${originalReport.id}`);
    }
    
    (finalState as any).distanceSinceLastReport = (originalReport as any).distanceSinceLastReport;

    // TODO: Implement delta application for BUNKER and CARGO
    Object.keys(originalReport).forEach(key => {
        if (!(key in finalState)) {
            (finalState as any)[key] = (originalReport as any)[key];
        }
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