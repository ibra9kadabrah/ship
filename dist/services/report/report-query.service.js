"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportQueryService = void 0;
const report_model_1 = __importDefault(require("../../models/report.model"));
const vessel_model_1 = __importDefault(require("../../models/vessel.model"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const report_engine_unit_model_1 = __importDefault(require("../../models/report_engine_unit.model"));
const report_aux_engine_model_1 = __importDefault(require("../../models/report_aux_engine.model"));
class ReportQueryService {
    async getReportById(id) {
        console.log(`[ReportQueryService] Searching for report with ID: ${id}`);
        const reportBase = report_model_1.default.findById(id);
        if (!reportBase)
            throw new Error(`Report with ID ${id} not found.`);
        if (!reportBase.vesselId || !reportBase.captainId) {
            throw new Error(`Report ${id} is missing essential IDs (vesselId, captainId).`);
        }
        const hasVoyageId = reportBase.voyageId !== null && reportBase.voyageId !== undefined;
        // Fetch related data in parallel
        const vesselPromise = vessel_model_1.default.findById(reportBase.vesselId);
        const captainPromise = user_model_1.default.findById(reportBase.captainId);
        const departureReportPromise = hasVoyageId
            ? report_model_1.default.getFirstReportForVoyage(reportBase.voyageId)
            : Promise.resolve(null);
        const engineUnitsPromise = report_engine_unit_model_1.default.findByReportId(id);
        const auxEnginesPromise = report_aux_engine_model_1.default.findByReportId(id);
        const [vessel, captain, departureReport, engineUnits, auxEngines] = await Promise.all([
            vesselPromise,
            captainPromise,
            departureReportPromise,
            engineUnitsPromise,
            auxEnginesPromise
        ]);
        return this.buildFullReportDTO(reportBase, // Cast as it should be a full report by this point if found
        vessel, captain, departureReport, // Cast as it could be null
        engineUnits || [], auxEngines || []);
    }
    async buildFullReportDTO(reportBase, vessel, captain, departureReport, engineUnits, auxEngines) {
        const modificationChecklistString = reportBase.modification_checklist;
        let parsedChecklist = null;
        if (modificationChecklistString && typeof modificationChecklistString === 'string') {
            try {
                parsedChecklist = JSON.parse(modificationChecklistString);
            }
            catch (e) {
                console.error("Failed to parse modification_checklist JSON:", e);
            }
        }
        const fullReport = {
            ...reportBase,
            engineUnits: engineUnits,
            auxEngines: auxEngines,
            vesselName: vessel?.name ?? 'Unknown Vessel',
            captainName: captain?.name ?? 'Unknown Captain',
            voyageCargoQuantity: (departureReport?.reportType === 'departure' ? departureReport.cargoQuantity : null)
                ?? (reportBase.reportType === 'departure' ? reportBase.cargoQuantity : null)
                ?? null,
            voyageCargoType: (departureReport?.reportType === 'departure' ? departureReport.cargoType : null)
                ?? (reportBase.reportType === 'departure' ? reportBase.cargoType : null)
                ?? null,
            voyageCargoStatus: (departureReport?.reportType === 'departure' ? departureReport.cargoStatus : null)
                ?? (reportBase.reportType === 'departure' ? reportBase.cargoStatus : null)
                ?? null,
            modification_checklist: parsedChecklist,
            requested_changes_comment: reportBase.requested_changes_comment || null,
        };
        return fullReport;
    }
    async getPendingReports(vesselId) {
        const reportsWithNames = report_model_1.default.getPendingReports(vesselId);
        return reportsWithNames;
    }
    async getReportsByCaptainId(captainId) {
        const reports = report_model_1.default.findByCaptainId(captainId);
        // Consider if full DTOs are needed or if partial is sufficient for captain's history
        console.warn("[ReportQueryService.getReportsByCaptainId] returns base data only; related machinery not fetched by default.");
        return reports;
    }
    async getAllReports(vesselId) {
        const reportsWithNames = report_model_1.default.findAll(vesselId);
        return reportsWithNames;
    }
}
exports.ReportQueryService = ReportQueryService;
