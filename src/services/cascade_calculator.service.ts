// src/services/cascade_calculator.service.ts
import { Report } from '../types/report';
import ReportModel from '../models/report.model';
import { calculateDistances } from './distance_calculator';
import { calculateTotalConsumptions, calculateCurrentRobs } from './bunker_calculator';
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

export interface AffectedReport {
  reportId: string;
  updates: Record<string, any>;
  errors: string[];
}

export const CascadeCalculatorService = {
  async calculateCascade(reportId: string, modifications: FieldModification[]): Promise<CascadeResult> {
    const sourceReport = ReportModel.findById(reportId);
    if (!sourceReport) throw new Error(`Report ${reportId} not found`);

    const criticalMods = modifications.filter(m => isCriticalField(m.fieldName));
    if (criticalMods.length === 0) return { isValid: true, affectedReports: [], errors: [] };

    const subsequentReports = this.getSubsequentReports(sourceReport);
    if (subsequentReports.length === 0) return { isValid: true, affectedReports: [], errors: [] };

    const modifiedSource = { ...sourceReport };
    criticalMods.forEach(mod => (modifiedSource as any)[mod.fieldName] = mod.newValue);

    const result: CascadeResult = { isValid: true, affectedReports: [], errors: [] };

    for (let i = 0; i < subsequentReports.length; i++) {
      const currentReport = subsequentReports[i];
      const previousReport = i === 0 ? modifiedSource : subsequentReports[i - 1];
      
      const affectedReport = this.calculateReportCascade(currentReport, previousReport, criticalMods);
      result.affectedReports.push(affectedReport);
      
      if (affectedReport.errors.length > 0) {
        result.isValid = false;
        result.errors.push(...affectedReport.errors);
      }

      Object.assign(currentReport, affectedReport.updates);
    }

    return result;
  },

  getSubsequentReports(sourceReport: Partial<Report>): Partial<Report>[] {
    if (!sourceReport.voyageId) return [];

    const allReports = ReportModel._getAllReportsForVoyage(sourceReport.voyageId)
      .filter(r => r.status === 'approved');

    allReports.sort((a, b) => this.getTimestamp(a) - this.getTimestamp(b));

    const sourceIndex = allReports.findIndex(r => r.id === sourceReport.id);
    return sourceIndex >= 0 ? allReports.slice(sourceIndex + 1) : [];
  },

  calculateReportCascade(targetReport: Partial<Report>, previousReport: Partial<Report>, modifications: FieldModification[]): AffectedReport {
    const updates: Record<string, any> = {};
    const errors: string[] = [];

    const modTypes = new Set(modifications.map(m => getCascadeType(m.fieldName)).filter(Boolean));

    if (modTypes.has('DISTANCE')) {
      const distanceResult = this.calculateDistanceCascade(targetReport, previousReport);
      Object.assign(updates, distanceResult.updates);
      errors.push(...distanceResult.errors);
    }

    if (modTypes.has('BUNKER_CONSUMPTION') || modTypes.has('BUNKER_SUPPLY')) {
      const bunkerResult = this.calculateBunkerCascade(targetReport, previousReport);
      Object.assign(updates, bunkerResult.updates);
      errors.push(...bunkerResult.errors);
    }

    if (modTypes.has('CARGO')) {
      const cargoResult = this.calculateCargoCascade(targetReport, previousReport);
      Object.assign(updates, cargoResult.updates);
      errors.push(...cargoResult.errors);
    }

    return { reportId: targetReport.id!, updates, errors };
  },

  calculateDistanceCascade(targetReport: Partial<Report>, previousReport: Partial<Report>) {
    const updates: Record<string, any> = {};
    const errors: string[] = [];

    try {
      const voyageDistance = (targetReport as any).voyageDistance || (previousReport as any).voyageDistance || 0;
      const distanceSinceLast = (targetReport as any).distanceSinceLastReport || 0;
      const previousTotal = previousReport.totalDistanceTravelled || 0;

      const newTotalDistance = previousTotal + distanceSinceLast;
      const newDistanceToGo = Math.max(0, voyageDistance - newTotalDistance);

      updates.totalDistanceTravelled = newTotalDistance;
      updates.distanceToGo = newDistanceToGo;

      if (newTotalDistance < 0) errors.push(`Negative total distance: ${newTotalDistance}`);
      if (newTotalDistance > voyageDistance * 1.1) errors.push(`Total distance exceeds voyage distance by >10%`);

      if (targetReport.sailingTimeVoyage && targetReport.sailingTimeVoyage > 0) {
        const avgSpeed = newTotalDistance / targetReport.sailingTimeVoyage;
        updates.avgSpeedVoyage = avgSpeed;
        if (avgSpeed < 0 || avgSpeed > 30) errors.push(`Invalid speed: ${avgSpeed} knots`);
      }
    } catch (error) {
      errors.push(`Distance calculation error: ${error}`);
    }

    return { updates, errors };
  },

  calculateBunkerCascade(targetReport: Partial<Report>, previousReport: Partial<Report>) {
    const updates: Record<string, any> = {};
    const errors: string[] = [];

    try {
      const previousRob = {
        lsifo: previousReport.currentRobLsifo || 0,
        lsmgo: previousReport.currentRobLsmgo || 0,
        cylOil: previousReport.currentRobCylOil || 0,
        meOil: previousReport.currentRobMeOil || 0,
        aeOil: previousReport.currentRobAeOil || 0
      };

      const consumptions = calculateTotalConsumptions({
        meConsumptionLsifo: targetReport.meConsumptionLsifo,
        meConsumptionLsmgo: targetReport.meConsumptionLsmgo,
        meConsumptionCylOil: targetReport.meConsumptionCylOil,
        meConsumptionMeOil: targetReport.meConsumptionMeOil,
        meConsumptionAeOil: targetReport.meConsumptionAeOil,
        boilerConsumptionLsifo: targetReport.boilerConsumptionLsifo,
        boilerConsumptionLsmgo: targetReport.boilerConsumptionLsmgo,
        auxConsumptionLsifo: targetReport.auxConsumptionLsifo,
        auxConsumptionLsmgo: targetReport.auxConsumptionLsmgo
      });

      const supplies = {
        supplyLsifo: targetReport.supplyLsifo,
        supplyLsmgo: targetReport.supplyLsmgo,
        supplyCylOil: targetReport.supplyCylOil,
        supplyMeOil: targetReport.supplyMeOil,
        supplyAeOil: targetReport.supplyAeOil
      };

      const currentRobs = calculateCurrentRobs(previousRob, consumptions, supplies);

      updates.totalConsumptionLsifo = consumptions.totalConsumptionLsifo;
      updates.totalConsumptionLsmgo = consumptions.totalConsumptionLsmgo;
      updates.totalConsumptionCylOil = consumptions.totalConsumptionCylOil;
      updates.totalConsumptionMeOil = consumptions.totalConsumptionMeOil;
      updates.totalConsumptionAeOil = consumptions.totalConsumptionAeOil;
      updates.currentRobLsifo = currentRobs.currentRobLsifo;
      updates.currentRobLsmgo = currentRobs.currentRobLsmgo;
      updates.currentRobCylOil = currentRobs.currentRobCylOil;
      updates.currentRobMeOil = currentRobs.currentRobMeOil;
      updates.currentRobAeOil = currentRobs.currentRobAeOil;

      Object.entries(currentRobs).forEach(([fuel, rob]) => {
        if (rob < 0) errors.push(`Negative ROB for ${fuel}: ${rob}`);
      });
    } catch (error) {
      errors.push(`Bunker calculation error: ${error}`);
    }

    return { updates, errors };
  },

  calculateCargoCascade(targetReport: Partial<Report>, previousReport: Partial<Report>) {
    const updates: Record<string, any> = {};
    const errors: string[] = [];

    try {
      if (targetReport.reportType === 'berth') {
        const previousCargoQty = (previousReport as any).cargoQuantity || 0;
        const cargoLoaded = (targetReport as any).cargoLoaded || 0;
        const cargoUnloaded = (targetReport as any).cargoUnloaded || 0;
        
        const newCargoQuantity = previousCargoQty + cargoLoaded - cargoUnloaded;
        
        updates.cargoQuantity = newCargoQuantity;
        updates.cargoStatus = newCargoQuantity > 0 ? 'Loaded' : 'Empty';
        
        if (newCargoQuantity < 0) {
          errors.push(`Cannot unload more cargo than available: ${newCargoQuantity}`);
        }
      }
    } catch (error) {
      errors.push(`Cargo calculation error: ${error}`);
    }

    return { updates, errors };
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