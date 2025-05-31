"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CascadeCalculatorService = void 0;
const report_model_1 = __importDefault(require("../models/report.model"));
const voyage_model_1 = __importDefault(require("../models/voyage.model"));
const bunker_calculator_1 = require("./bunker_calculator");
const cascade_fields_1 = require("../config/cascade_fields");
exports.CascadeCalculatorService = {
    async calculateCascade(reportId, modifications) {
        const sourceReportOriginal = report_model_1.default.findById(reportId);
        if (!sourceReportOriginal)
            throw new Error(`Report ${reportId} not found`);
        if (!sourceReportOriginal.voyageId)
            throw new Error(`Source report ${reportId} does not have a voyageId.`);
        const voyage = voyage_model_1.default.findById(sourceReportOriginal.voyageId);
        if (!voyage)
            throw new Error(`Voyage ${sourceReportOriginal.voyageId} not found for report ${reportId}.`);
        let authoritativeVoyageDistance = voyage.voyageDistance ?? 0;
        const criticalMods = modifications.filter(m => (0, cascade_fields_1.isCriticalField)(m.fieldName));
        const modifiedSourceState = { ...sourceReportOriginal };
        criticalMods.forEach(mod => {
            modifiedSourceState[mod.fieldName] = mod.newValue;
            if (mod.fieldName === 'voyageDistance' && sourceReportOriginal.reportType === 'departure') {
                authoritativeVoyageDistance = typeof mod.newValue === 'number' ? mod.newValue : authoritativeVoyageDistance;
                modifiedSourceState.voyageDistance = authoritativeVoyageDistance;
            }
        });
        let distanceDelta = 0;
        const bunkerRobDeltas = {};
        let cargoQuantityDelta = 0;
        const originalSourceTDT = sourceReportOriginal.totalDistanceTravelled ?? 0;
        const originalSourceRobs = {
            lsifo: sourceReportOriginal.currentRobLsifo ?? 0, lsmgo: sourceReportOriginal.currentRobLsmgo ?? 0,
            cylOil: sourceReportOriginal.currentRobCylOil ?? 0, meOil: sourceReportOriginal.currentRobMeOil ?? 0,
            aeOil: sourceReportOriginal.currentRobAeOil ?? 0,
        };
        const originalSourceCargoQuantity = sourceReportOriginal.cargoQuantity ?? 0;
        const modTypesForSource = new Set(criticalMods.map(m => (0, cascade_fields_1.getCascadeType)(m.fieldName)).filter(Boolean));
        if (modTypesForSource.has('DISTANCE')) {
            const harbourDistanceMod = criticalMods.find(m => m.fieldName === 'harbourDistance' && sourceReportOriginal.reportType === 'departure');
            if (harbourDistanceMod) {
                const oldHD = harbourDistanceMod.oldValue ?? 0;
                const newHD = harbourDistanceMod.newValue ?? 0;
                distanceDelta = newHD - oldHD;
                modifiedSourceState.totalDistanceTravelled = originalSourceTDT + distanceDelta;
            }
            else if (criticalMods.some(m => m.fieldName === 'totalDistanceTravelled')) {
                distanceDelta = (modifiedSourceState.totalDistanceTravelled ?? 0) - originalSourceTDT;
            }
            else if (sourceReportOriginal.reportType !== 'departure' && criticalMods.some(m => m.fieldName === 'distanceSinceLastReport')) {
                const reportBeforeSource = report_model_1.default.findPreviousReport(modifiedSourceState.id, modifiedSourceState.vesselId);
                const prevTotalDist = reportBeforeSource?.totalDistanceTravelled ?? 0;
                modifiedSourceState.totalDistanceTravelled = prevTotalDist + (modifiedSourceState.distanceSinceLastReport ?? 0);
                distanceDelta = (modifiedSourceState.totalDistanceTravelled ?? 0) - originalSourceTDT;
            }
            const currentSourceTDT = modifiedSourceState.totalDistanceTravelled ?? 0;
            modifiedSourceState.distanceToGo = Math.max(0, authoritativeVoyageDistance - currentSourceTDT);
            const sailingTime = modifiedSourceState.sailingTimeVoyage ?? 0;
            if (sailingTime > 0)
                modifiedSourceState.avgSpeedVoyage = currentSourceTDT / sailingTime;
            else if (currentSourceTDT === 0 && sailingTime === 0)
                modifiedSourceState.avgSpeedVoyage = 0;
            else
                modifiedSourceState.avgSpeedVoyage = (distanceDelta !== 0 && sailingTime === 0 && currentSourceTDT !== 0) ? null : sourceReportOriginal.avgSpeedVoyage;
        }
        if (modTypesForSource.has('BUNKER_CONSUMPTION') || modTypesForSource.has('BUNKER_SUPPLY')) {
            let prevRobForSource = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };
            if (modifiedSourceState.reportType === 'departure') {
                prevRobForSource = {
                    lsifo: modifiedSourceState.initialRobLsifo ?? 0, lsmgo: modifiedSourceState.initialRobLsmgo ?? 0,
                    cylOil: modifiedSourceState.initialRobCylOil ?? 0, meOil: modifiedSourceState.initialRobMeOil ?? 0,
                    aeOil: modifiedSourceState.initialRobAeOil ?? 0,
                };
            }
            else {
                const reportBeforeSource = report_model_1.default.findPreviousReport(modifiedSourceState.id, modifiedSourceState.vesselId);
                if (reportBeforeSource)
                    prevRobForSource = {
                        lsifo: reportBeforeSource.currentRobLsifo ?? 0, lsmgo: reportBeforeSource.currentRobLsmgo ?? 0,
                        cylOil: reportBeforeSource.currentRobCylOil ?? 0, meOil: reportBeforeSource.currentRobMeOil ?? 0,
                        aeOil: reportBeforeSource.currentRobAeOil ?? 0,
                    };
            }
            const consumptions = (0, bunker_calculator_1.calculateTotalConsumptions)(modifiedSourceState);
            const supplies = modifiedSourceState;
            const newSourceRobs = (0, bunker_calculator_1.calculateCurrentRobs)(prevRobForSource, consumptions, supplies);
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
            const reportBeforeSource = report_model_1.default.findPreviousReport(modifiedSourceState.id, modifiedSourceState.vesselId);
            if (reportBeforeSource)
                prevCargoQtyForSource = reportBeforeSource.cargoQuantity ?? 0;
            const cargoLoaded = modifiedSourceState.cargoLoaded ?? 0;
            const cargoUnloaded = modifiedSourceState.cargoUnloaded ?? 0;
            const newSourceCargoQuantity = prevCargoQtyForSource + cargoLoaded - cargoUnloaded;
            modifiedSourceState.cargoQuantity = newSourceCargoQuantity;
            modifiedSourceState.cargoStatus = newSourceCargoQuantity > 0 ? 'Loaded' : 'Empty';
            cargoQuantityDelta = newSourceCargoQuantity - originalSourceCargoQuantity;
        }
        const result = { isValid: true, affectedReports: [], errors: [] };
        if (criticalMods.length > 0) {
            const sourceChanges = {};
            for (const key in modifiedSourceState) {
                if (Object.prototype.hasOwnProperty.call(modifiedSourceState, key)) {
                    const oldValue = sourceReportOriginal[key];
                    const newValue = modifiedSourceState[key];
                    if (String(oldValue) !== String(newValue)) {
                        if (typeof oldValue === 'number' && typeof newValue === 'number') {
                            if (Math.abs(oldValue - newValue) > 1e-5)
                                sourceChanges[key] = { oldValue, newValue };
                        }
                        else if (oldValue !== newValue)
                            sourceChanges[key] = { oldValue, newValue };
                    }
                }
            }
            criticalMods.forEach(mod => {
                if (!sourceChanges[mod.fieldName] || sourceChanges[mod.fieldName].newValue !== mod.newValue) {
                    if (mod.oldValue !== mod.newValue)
                        sourceChanges[mod.fieldName] = { oldValue: mod.oldValue, newValue: mod.newValue };
                }
                modifiedSourceState[mod.fieldName] = mod.newValue;
            });
            result.affectedReports.push({
                reportId: sourceReportOriginal.id, reportType: sourceReportOriginal.reportType,
                changes: sourceChanges, finalState: { ...modifiedSourceState }, errors: []
            });
        }
        const subsequentReports = this.getSubsequentReports(sourceReportOriginal);
        for (const originalSubsequentReport of subsequentReports) {
            const affectedReportData = this.applyDeltasToReport(originalSubsequentReport, authoritativeVoyageDistance, distanceDelta, bunkerRobDeltas, cargoQuantityDelta);
            result.affectedReports.push(affectedReportData);
            if (affectedReportData.errors.length > 0) {
                result.isValid = false;
                result.errors.push(...affectedReportData.errors);
            }
        }
        return result;
    },
    getSubsequentReports(sourceReport) {
        if (!sourceReport.voyageId)
            return [];
        const allReports = report_model_1.default._getAllReportsForVoyage(sourceReport.voyageId)
            .filter(r => r.status === 'approved' && r.id !== sourceReport.id)
            .map(r => ({ ...r }));
        allReports.sort((a, b) => this.getTimestamp(a) - this.getTimestamp(b));
        const sourceTimestamp = this.getTimestamp(sourceReport);
        return allReports.filter(r => this.getTimestamp(r) > sourceTimestamp);
    },
    applyDeltasToReport(originalReport, authoritativeVoyageDistance, distanceDelta, bunkerRobDeltas, cargoQuantityDelta) {
        const finalState = { ...originalReport };
        const changes = {};
        const errors = [];
        const oldTDT = originalReport.totalDistanceTravelled ?? 0;
        let newTDT = oldTDT;
        if (distanceDelta !== 0) {
            newTDT = oldTDT + distanceDelta;
            if (Math.abs(oldTDT - newTDT) > 1e-5)
                changes.totalDistanceTravelled = { oldValue: oldTDT, newValue: newTDT };
        }
        finalState.totalDistanceTravelled = newTDT;
        const oldDTG = originalReport.distanceToGo ?? (authoritativeVoyageDistance - oldTDT);
        const newDTG = Math.max(0, authoritativeVoyageDistance - newTDT);
        if (Math.abs((oldDTG ?? 0) - newDTG) > 1e-5)
            changes.distanceToGo = { oldValue: oldDTG, newValue: newDTG };
        finalState.distanceToGo = newDTG;
        const originalVoyageDistField = originalReport.voyageDistance;
        if (originalVoyageDistField !== authoritativeVoyageDistance && !(originalVoyageDistField === null && authoritativeVoyageDistance === 0)) {
            changes.voyageDistance = { oldValue: originalVoyageDistField, newValue: authoritativeVoyageDistance };
        }
        finalState.voyageDistance = authoritativeVoyageDistance;
        const sailingTime = originalReport.sailingTimeVoyage ?? 0;
        finalState.sailingTimeVoyage = sailingTime;
        const oldAvgSpeed = originalReport.avgSpeedVoyage;
        let newAvgSpeed = oldAvgSpeed;
        if (sailingTime > 0)
            newAvgSpeed = newTDT / sailingTime;
        else if (newTDT === 0 && sailingTime === 0)
            newAvgSpeed = 0;
        if (oldAvgSpeed !== newAvgSpeed && (oldAvgSpeed !== null && oldAvgSpeed !== undefined || Math.abs(newAvgSpeed ?? 0) > 1e-5)) {
            if (typeof oldAvgSpeed === 'number' && typeof newAvgSpeed === 'number') {
                if (Math.abs(oldAvgSpeed - newAvgSpeed) > 1e-5)
                    changes.avgSpeedVoyage = { oldValue: oldAvgSpeed, newValue: newAvgSpeed };
            }
            else
                changes.avgSpeedVoyage = { oldValue: oldAvgSpeed, newValue: newAvgSpeed };
        }
        finalState.avgSpeedVoyage = newAvgSpeed;
        if (finalState.avgSpeedVoyage !== null && finalState.avgSpeedVoyage !== undefined && (finalState.avgSpeedVoyage < 0 || finalState.avgSpeedVoyage > 30))
            errors.push(`Invalid speed: ${finalState.avgSpeedVoyage.toFixed(2)} for report ${originalReport.id}`);
        if (newTDT < 0)
            errors.push(`Negative total distance: ${newTDT.toFixed(2)} for report ${originalReport.id}`);
        if (authoritativeVoyageDistance > 0 && newTDT > authoritativeVoyageDistance * 1.1)
            errors.push(`Total distance (${newTDT.toFixed(2)}) exceeds voyage distance (${authoritativeVoyageDistance.toFixed(2)}) by >10% for report ${originalReport.id}`);
        finalState.distanceSinceLastReport = originalReport.distanceSinceLastReport;
        // Apply Bunker Deltas
        const robKeys = ['lsifo', 'lsmgo', 'cylOil', 'meOil', 'aeOil'];
        robKeys.forEach(fuelKey => {
            const delta = bunkerRobDeltas[fuelKey] ?? 0;
            const robFieldKey = `currentRob${fuelKey.charAt(0).toUpperCase() + fuelKey.slice(1)}`;
            if (delta !== 0) {
                const oldRob = originalReport[robFieldKey] ?? 0;
                const newRob = oldRob + delta;
                if (Math.abs(oldRob - newRob) > 1e-5)
                    changes[robFieldKey] = { oldValue: oldRob, newValue: newRob };
                finalState[robFieldKey] = newRob;
                if (newRob < 0)
                    errors.push(`Negative ROB for ${fuelKey}: ${newRob.toFixed(2)}`);
            }
            else {
                finalState[robFieldKey] = originalReport[robFieldKey];
            }
        });
        // Carry over consumption and supply inputs for subsequent reports
        const bunkerInputFields = ['meConsumptionLsifo', 'meConsumptionLsmgo', 'meConsumptionCylOil', 'meConsumptionMeOil', 'meConsumptionAeOil', 'boilerConsumptionLsifo', 'boilerConsumptionLsmgo', 'auxConsumptionLsifo', 'auxConsumptionLsmgo', 'supplyLsifo', 'supplyLsmgo', 'supplyCylOil', 'supplyMeOil', 'supplyAeOil', 'totalConsumptionLsifo', 'totalConsumptionLsmgo', 'totalConsumptionCylOil', 'totalConsumptionMeOil', 'totalConsumptionAeOil'];
        bunkerInputFields.forEach(k => {
            if (originalReport[k] !== undefined)
                finalState[k] = originalReport[k];
        });
        // Apply Cargo Delta
        if (cargoQuantityDelta !== 0) {
            const oldCargoQty = originalReport.cargoQuantity ?? 0;
            const newCargoQty = oldCargoQty + cargoQuantityDelta;
            if (Math.abs(oldCargoQty - newCargoQty) > 1e-5)
                changes.cargoQuantity = { oldValue: oldCargoQty, newValue: newCargoQty };
            finalState.cargoQuantity = newCargoQty;
            finalState.cargoStatus = newCargoQty > 0 ? 'Loaded' : 'Empty';
        }
        else {
            finalState.cargoQuantity = originalReport.cargoQuantity;
            finalState.cargoStatus = originalReport.cargoStatus;
        }
        finalState.cargoLoaded = originalReport.cargoLoaded;
        finalState.cargoUnloaded = originalReport.cargoUnloaded;
        finalState.cargoType = originalReport.cargoType;
        Object.keys(originalReport).forEach(key => {
            if (!(key in finalState))
                finalState[key] = originalReport[key];
        });
        return {
            reportId: originalReport.id,
            reportType: originalReport.reportType,
            changes,
            finalState,
            errors
        };
    },
    getTimestamp(report) {
        if (report.createdAt) {
            try {
                return new Date(report.createdAt).getTime();
            }
            catch (e) {
                console.error('Error parsing createdAt timestamp:', e);
                return 0;
            }
        }
        return 0;
    }
};
