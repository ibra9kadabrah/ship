"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportBuilder = void 0;
class ReportBuilder {
    static buildReportRecord(reportId, reportInput, captainId, voyageIdToAssociate, // Added voyageId
    calculations) {
        const record = {
            id: reportId,
            voyageId: voyageIdToAssociate, // Use the passed voyageId
            vesselId: reportInput.vesselId,
            reportType: reportInput.reportType,
            status: 'pending', // Default status
            captainId: captainId,
            reviewerId: null,
            reviewDate: null,
            reviewComments: null,
            reportDate: reportInput.reportDate,
            reportTime: reportInput.reportTime,
            timeZone: reportInput.timeZone,
            // Calculated fields from ReportCalculations
            totalConsumptionLsifo: calculations.totalConsumptions.totalConsumptionLsifo,
            totalConsumptionLsmgo: calculations.totalConsumptions.totalConsumptionLsmgo,
            totalConsumptionCylOil: calculations.totalConsumptions.totalConsumptionCylOil,
            totalConsumptionMeOil: calculations.totalConsumptions.totalConsumptionMeOil,
            totalConsumptionAeOil: calculations.totalConsumptions.totalConsumptionAeOil,
            currentRobLsifo: calculations.currentRobs.currentRobLsifo,
            currentRobLsmgo: calculations.currentRobs.currentRobLsmgo,
            currentRobCylOil: calculations.currentRobs.currentRobCylOil,
            currentRobMeOil: calculations.currentRobs.currentRobMeOil,
            currentRobAeOil: calculations.currentRobs.currentRobAeOil,
            totalDistanceTravelled: calculations.distanceOutput.totalDistanceTravelled ?? null,
            distanceToGo: calculations.distanceOutput.distanceToGo ?? null,
            sailingTimeVoyage: calculations.sailingTimeVoyage,
            avgSpeedVoyage: calculations.avgSpeedVoyage,
            // Initial ROBs (if any) - spread the object which might be null/undefined
            ...(calculations.initialRobDataForRecord || {}),
            // Weather data (common to all report types)
            windDirection: reportInput.windDirection ?? null,
            seaDirection: reportInput.seaDirection ?? null,
            swellDirection: reportInput.swellDirection ?? null,
            windForce: reportInput.windForce ?? null,
            seaState: reportInput.seaState ?? null,
            swellHeight: reportInput.swellHeight ?? null,
            // Boiler and Aux consumption (common)
            boilerConsumptionLsifo: reportInput.boilerConsumptionLsifo ?? null,
            boilerConsumptionLsmgo: reportInput.boilerConsumptionLsmgo ?? null,
            auxConsumptionLsifo: reportInput.auxConsumptionLsifo ?? null,
            auxConsumptionLsmgo: reportInput.auxConsumptionLsmgo ?? null,
            // Supplies (common)
            supplyLsifo: reportInput.supplyLsifo ?? null,
            supplyLsmgo: reportInput.supplyLsmgo ?? null,
            supplyCylOil: reportInput.supplyCylOil ?? null,
            supplyMeOil: reportInput.supplyMeOil ?? null,
            supplyAeOil: reportInput.supplyAeOil ?? null,
        };
        // Type-specific fields and conditional common fields
        if (reportInput.reportType === 'departure') {
            const depInput = reportInput;
            Object.assign(record, this.buildDepartureFields(depInput));
            record.cargoQuantity = depInput.cargoQuantity; // From input for departure
            record.cargoStatus = depInput.cargoStatus;
            // ME Consumption & Params for Departure (from input)
            record.meConsumptionLsifo = depInput.meConsumptionLsifo ?? null;
            record.meConsumptionLsmgo = depInput.meConsumptionLsmgo ?? null;
            record.meConsumptionCylOil = depInput.meConsumptionCylOil ?? null;
            record.meConsumptionMeOil = depInput.meConsumptionMeOil ?? null;
            record.meConsumptionAeOil = depInput.meConsumptionAeOil ?? null;
            record.meFoPressure = depInput.meFoPressure ?? null;
            record.meLubOilPressure = depInput.meLubOilPressure ?? null;
            record.meFwInletTemp = depInput.meFwInletTemp ?? null;
            record.meLoInletTemp = depInput.meLoInletTemp ?? null;
            record.meScavengeAirTemp = depInput.meScavengeAirTemp ?? null;
            record.meTcRpm1 = depInput.meTcRpm1 ?? null;
            record.meTcRpm2 = depInput.meTcRpm2 ?? null;
            record.meTcExhaustTempIn = depInput.meTcExhaustTempIn ?? null;
            record.meTcExhaustTempOut = depInput.meTcExhaustTempOut ?? null;
            record.meThrustBearingTemp = depInput.meThrustBearingTemp ?? null;
            record.meDailyRunHours = depInput.meDailyRunHours ?? null;
            record.mePresentRpm = depInput.mePresentRpm ?? null;
            record.meCurrentSpeed = depInput.meCurrentSpeed ?? null;
        }
        else if (reportInput.reportType === 'noon') {
            const noonInput = reportInput;
            Object.assign(record, this.buildNoonFields(noonInput));
            // ME Consumption & Params for Noon (from input)
            record.meConsumptionLsifo = noonInput.meConsumptionLsifo ?? null;
            // ... (similar for all ME/AE consumption and ME params)
            record.meDailyRunHours = noonInput.meDailyRunHours ?? null;
            record.mePresentRpm = noonInput.mePresentRpm ?? null;
            record.meCurrentSpeed = noonInput.meCurrentSpeed ?? null;
        }
        else if (reportInput.reportType === 'arrival') {
            const arrInput = reportInput;
            Object.assign(record, this.buildArrivalFields(arrInput));
            // ME Consumption & Params for Arrival (from input)
            record.meConsumptionLsifo = arrInput.meConsumptionLsifo ?? null;
            // ...
            record.meDailyRunHours = arrInput.meDailyRunHours ?? null;
            record.mePresentRpm = arrInput.mePresentRpm ?? null;
            record.meCurrentSpeed = arrInput.meCurrentSpeed ?? null;
        }
        else if (reportInput.reportType === 'berth') {
            const berthInput = reportInput;
            Object.assign(record, this.buildBerthFields(berthInput));
            record.cargoQuantity = calculations.berthCalculatedCargoQuantity ?? null; // Calculated for berth
            record.cargoStatus = null; // Null for berth
            // ME/AE consumption and ME Params are null for berth
            record.meConsumptionLsifo = null;
            record.meConsumptionLsmgo = null;
            record.meConsumptionCylOil = null;
            record.meConsumptionMeOil = null;
            record.meConsumptionAeOil = null;
            record.meFoPressure = null;
            record.meLubOilPressure = null;
            record.meFwInletTemp = null;
            record.meLoInletTemp = null;
            record.meScavengeAirTemp = null;
            record.meTcRpm1 = null;
            record.meTcRpm2 = null;
            record.meTcExhaustTempIn = null;
            record.meTcExhaustTempOut = null;
            record.meThrustBearingTemp = null;
            record.meDailyRunHours = null;
            record.mePresentRpm = null;
            record.meCurrentSpeed = null;
        }
        else if (reportInput.reportType === 'arrival_anchor_noon') {
            const aanInput = reportInput;
            Object.assign(record, this.buildArrivalAnchorNoonFields(aanInput));
            // ME Consumption & Params for AAN (from input)
            record.meConsumptionLsifo = aanInput.meConsumptionLsifo ?? null;
            // ...
            record.meDailyRunHours = aanInput.meDailyRunHours ?? null;
            record.mePresentRpm = aanInput.mePresentRpm ?? null;
            record.meCurrentSpeed = aanInput.meCurrentSpeed ?? null;
        }
        record.createdAt = new Date().toISOString();
        record.updatedAt = new Date().toISOString();
        return record; // Cast to full type after assembly
    }
    static buildDepartureFields(input) {
        return {
            departurePort: input.departurePort,
            destinationPort: input.destinationPort,
            voyageDistance: input.voyageDistance,
            etaDate: input.etaDate,
            etaTime: input.etaTime,
            fwdDraft: input.fwdDraft,
            aftDraft: input.aftDraft,
            // cargoQuantity & cargoStatus handled in main builder
            faspDate: input.faspDate,
            faspTime: input.faspTime,
            faspLatDeg: input.faspLatDeg,
            faspLatMin: input.faspLatMin,
            faspLatDir: input.faspLatDir,
            faspLonDeg: input.faspLonDeg,
            faspLonMin: input.faspLonMin,
            faspLonDir: input.faspLonDir,
            faspCourse: input.faspCourse,
            harbourDistance: input.harbourDistance,
            harbourTime: input.harbourTime,
            // distanceSinceLastReport is not for departure
        };
    }
    static buildNoonFields(input) {
        return {
            distanceSinceLastReport: input.distanceSinceLastReport,
            passageState: input.passageState || null,
            noonDate: input.noonDate,
            noonTime: input.noonTime,
            noonLatDeg: input.noonLatDeg,
            noonLatMin: input.noonLatMin,
            noonLatDir: input.noonLatDir,
            noonLonDeg: input.noonLonDeg,
            noonLonMin: input.noonLonMin,
            noonLonDir: input.noonLonDir,
            noonCourse: input.noonCourse,
            sospDate: input.passageState === 'SOSP' ? input.sospDate : null,
            sospTime: input.passageState === 'SOSP' ? input.sospTime : null,
            sospLatDeg: input.passageState === 'SOSP' ? input.sospLatDeg : null,
            sospLatMin: input.passageState === 'SOSP' ? input.sospLatMin : null,
            sospLatDir: input.passageState === 'SOSP' ? input.sospLatDir : null,
            sospLonDeg: input.passageState === 'SOSP' ? input.sospLonDeg : null,
            sospLonMin: input.passageState === 'SOSP' ? input.sospLonMin : null,
            sospLonDir: input.passageState === 'SOSP' ? input.sospLonDir : null,
            sospCourse: input.passageState === 'SOSP' ? input.sospCourse : null,
            rospDate: input.passageState === 'ROSP' ? input.rospDate : null,
            rospTime: input.passageState === 'ROSP' ? input.rospTime : null,
            rospLatDeg: input.passageState === 'ROSP' ? input.rospLatDeg : null,
            rospLatMin: input.passageState === 'ROSP' ? input.rospLatMin : null,
            rospLatDir: input.passageState === 'ROSP' ? input.rospLatDir : null,
            rospLonDeg: input.passageState === 'ROSP' ? input.rospLonDeg : null,
            rospLonMin: input.passageState === 'ROSP' ? input.rospLonMin : null,
            rospLonDir: input.passageState === 'ROSP' ? input.rospLonDir : null,
            rospCourse: input.passageState === 'ROSP' ? input.rospCourse : null,
        };
    }
    static buildArrivalFields(input) {
        return {
            distanceSinceLastReport: input.distanceSinceLastReport,
            harbourDistance: input.harbourDistance,
            harbourTime: input.harbourTime,
            eospDate: input.eospDate,
            eospTime: input.eospTime,
            eospLatDeg: input.eospLatDeg,
            eospLatMin: input.eospLatMin,
            eospLatDir: input.eospLatDir,
            eospLonDeg: input.eospLonDeg,
            eospLonMin: input.eospLonMin,
            eospLonDir: input.eospLonDir,
            eospCourse: input.eospCourse,
            estimatedBerthingDate: input.estimatedBerthingDate,
            estimatedBerthingTime: input.estimatedBerthingTime,
        };
    }
    static buildBerthFields(input) {
        return {
            berthDate: input.berthDate,
            berthTime: input.berthTime,
            berthLatDeg: input.berthLatDeg,
            berthLatMin: input.berthLatMin,
            berthLatDir: input.berthLatDir,
            berthLonDeg: input.berthLonDeg,
            berthLonMin: input.berthLonMin,
            berthLonDir: input.berthLonDir,
            cargoLoaded: input.cargoLoaded ?? null,
            cargoUnloaded: input.cargoUnloaded ?? null,
            cargoOpsStartDate: input.cargoOpsStartDate,
            cargoOpsStartTime: input.cargoOpsStartTime,
            cargoOpsEndDate: input.cargoOpsEndDate,
            cargoOpsEndTime: input.cargoOpsEndTime,
            berthNumber: input.berthNumber,
            // cargoQuantity handled in main builder
        };
    }
    static buildArrivalAnchorNoonFields(input) {
        // Similar to NoonFields but specific to ArrivalAnchorNoonSpecificData type
        return {
            distanceSinceLastReport: input.distanceSinceLastReport,
            noonDate: input.noonDate,
            noonTime: input.noonTime,
            noonLatDeg: input.noonLatDeg,
            noonLatMin: input.noonLatMin,
            noonLatDir: input.noonLatDir,
            noonLonDeg: input.noonLonDeg,
            noonLonMin: input.noonLonMin,
            noonLonDir: input.noonLonDir,
            noonCourse: input.noonCourse,
            // AAN doesn't have SOSP/ROSP states
            passageState: null, // Explicitly null for AAN
        };
    }
}
exports.ReportBuilder = ReportBuilder;
