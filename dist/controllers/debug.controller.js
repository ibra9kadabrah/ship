"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugController = void 0;
const excel_data_aggregation_service_1 = require("../services/excel_data_aggregation.service");
const report_model_1 = __importDefault(require("../models/report.model"));
const voyage_model_1 = __importDefault(require("../models/voyage.model"));
const vessel_model_1 = __importDefault(require("../models/vessel.model"));
exports.DebugController = {
    // Existing debug endpoints...
    async getExcelDebugData(req, res) {
        try {
            const { voyageId } = req.params;
            if (!voyageId) {
                res.status(400).json({ error: 'Voyage ID is required' });
                return;
            }
            console.log(`[DebugController] Fetching Excel debug data for voyage: ${voyageId}`);
            // Get voyage details
            const voyage = voyage_model_1.default.findById(voyageId);
            if (!voyage) {
                res.status(404).json({ error: `Voyage ${voyageId} not found` });
                return;
            }
            // Get vessel details
            const vessel = vessel_model_1.default.findById(voyage.vesselId);
            if (!vessel) {
                res.status(404).json({ error: `Vessel ${voyage.vesselId} not found` });
                return;
            }
            // Get all reports for the voyage
            const allReports = report_model_1.default._getAllReportsForVoyage(voyageId);
            const approvedReports = allReports.filter(r => r.status === 'approved');
            // Sort reports chronologically
            const sortedReports = approvedReports.sort((a, b) => {
                const dateA = new Date(`${a.reportDate}T${a.reportTime || '00:00:00'}`).getTime();
                const dateB = new Date(`${b.reportDate}T${b.reportTime || '00:00:00'}`).getTime();
                return dateA - dateB;
            });
            // Get the last report (should have cumulative values)
            const lastReport = sortedReports[sortedReports.length - 1];
            // Debug info for each report
            const reportDebugInfo = sortedReports.map(report => ({
                id: report.id,
                type: report.reportType,
                date: report.reportDate,
                time: report.reportTime,
                status: report.status,
                meDailyRunHours: report.meDailyRunHours,
                distanceSinceLastReport: report.distanceSinceLastReport || null,
                totalDistanceTravelled: report.totalDistanceTravelled,
                sailingTimeVoyage: report.sailingTimeVoyage,
                avgSpeedVoyage: report.avgSpeedVoyage,
                // Fuel consumption
                totalConsumptionLsifo: report.totalConsumptionLsifo,
                totalConsumptionLsmgo: report.totalConsumptionLsmgo,
                // ROB values
                currentRobLsifo: report.currentRobLsifo,
                currentRobLsmgo: report.currentRobLsmgo,
            }));
            // Try to aggregate data
            let aggregatedData = null;
            let aggregationError = null;
            try {
                aggregatedData = await excel_data_aggregation_service_1.ExcelDataAggregationService.aggregateDataForExcel(voyageId);
            }
            catch (error) {
                aggregationError = error instanceof Error ? error.message : String(error);
            }
            // Get next voyage departure report
            let nextVoyageDepartureInfo = null;
            try {
                const { VoyageLifecycleService } = await Promise.resolve().then(() => __importStar(require('../services/voyage_lifecycle.service')));
                // Pass voyage.id as the currentVoyageId
                const nextDepartureReport = await VoyageLifecycleService.getNextVoyageDepartureReport(vessel.id, voyage.id, // Pass the ID of the current voyage (Voyage N)
                voyage.startDate);
                if (nextDepartureReport) {
                    nextVoyageDepartureInfo = {
                        id: nextDepartureReport.id,
                        voyageId: nextDepartureReport.voyageId,
                        date: nextDepartureReport.reportDate,
                        time: nextDepartureReport.reportTime,
                        harbourDistance: nextDepartureReport.harbourDistance,
                        meDailyRunHours: nextDepartureReport.meDailyRunHours,
                        totalConsumptionLsifo: nextDepartureReport.totalConsumptionLsifo,
                        totalConsumptionLsmgo: nextDepartureReport.totalConsumptionLsmgo,
                        currentRobLsifo: nextDepartureReport.currentRobLsifo,
                        currentRobLsmgo: nextDepartureReport.currentRobLsmgo,
                    };
                }
            }
            catch (error) {
                console.error('Error fetching next voyage departure:', error);
            }
            const debugResponse = {
                voyage: {
                    id: voyage.id,
                    voyageNumber: voyage.voyageNumber,
                    vesselId: voyage.vesselId,
                    departurePort: voyage.departurePort,
                    destinationPort: voyage.destinationPort,
                    startDate: voyage.startDate,
                    endDate: voyage.endDate,
                    status: voyage.status,
                },
                vessel: {
                    id: vessel.id,
                    name: vessel.name,
                    imoNumber: vessel.imoNumber,
                    type: vessel.type,
                },
                reportsSummary: {
                    totalReports: allReports.length,
                    approvedReports: approvedReports.length,
                    reportTypes: approvedReports.map(r => r.reportType),
                },
                lastReport: lastReport ? {
                    id: lastReport.id,
                    type: lastReport.reportType,
                    date: lastReport.reportDate,
                    time: lastReport.reportTime,
                    sailingTimeVoyage: lastReport.sailingTimeVoyage,
                    totalDistanceTravelled: lastReport.totalDistanceTravelled,
                    avgSpeedVoyage: lastReport.avgSpeedVoyage,
                } : null,
                nextVoyageDeparture: nextVoyageDepartureInfo,
                reports: reportDebugInfo,
                aggregatedData: aggregatedData,
                aggregationError: aggregationError,
                calculatedTotals: {
                    voyageN_totalHours: lastReport?.sailingTimeVoyage || 0,
                    voyageN_totalDistance: lastReport?.totalDistanceTravelled || 0,
                    plus1_hours: nextVoyageDepartureInfo?.meDailyRunHours || 0,
                    plus1_distance: nextVoyageDepartureInfo?.harbourDistance || 0,
                    grandTotalHours: (lastReport?.sailingTimeVoyage || 0) + (nextVoyageDepartureInfo?.meDailyRunHours || 0),
                    grandTotalDistance: (lastReport?.totalDistanceTravelled || 0) + (nextVoyageDepartureInfo?.harbourDistance || 0),
                    calculatedAvgSpeed: ((lastReport?.totalDistanceTravelled || 0) + (nextVoyageDepartureInfo?.harbourDistance || 0)) /
                        ((lastReport?.sailingTimeVoyage || 0) + (nextVoyageDepartureInfo?.meDailyRunHours || 0)) || 0,
                }
            };
            res.json(debugResponse);
        }
        catch (error) {
            console.error('[DebugController] Error in getExcelDebugData:', error);
            res.status(500).json({
                error: 'Failed to fetch Excel debug data',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
};
