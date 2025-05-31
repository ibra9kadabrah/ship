"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportModificationService = void 0;
// src/services/report_modification.service.ts
const report_model_1 = __importDefault(require("../models/report.model"));
const cascade_calculator_service_1 = require("./cascade_calculator.service"); // Import AffectedReport
exports.ReportModificationService = {
    async modifyReportWithCascade(reportId, modifications, previewOnly = false) {
        const originalReport = report_model_1.default.findById(reportId);
        if (!originalReport || originalReport.status !== 'approved') {
            return {
                success: false,
                cascadeResult: { isValid: false, affectedReports: [], errors: [] },
                error: 'Report not found or not approved'
            };
        }
        const cascadeResult = await cascade_calculator_service_1.CascadeCalculatorService.calculateCascade(reportId, modifications);
        if (previewOnly)
            return { success: true, cascadeResult };
        if (!cascadeResult.isValid) {
            return { success: false, cascadeResult, error: 'Cascade validation failed' };
        }
        const sourceUpdates = {};
        modifications.forEach(mod => sourceUpdates[mod.fieldName] = mod.newValue);
        const sourceUpdateSuccess = report_model_1.default.update(reportId, sourceUpdates);
        if (!sourceUpdateSuccess) {
            return { success: false, cascadeResult, error: 'Failed to update source report' };
        }
        for (const affectedReport of cascadeResult.affectedReports) {
            // Use finalState which contains all recalculated fields for the update
            if (Object.keys(affectedReport.finalState).length > 0) {
                const updateSuccess = report_model_1.default.update(affectedReport.reportId, affectedReport.finalState);
                if (!updateSuccess) {
                    console.error(`Failed to update report ${affectedReport.reportId}`);
                    // Consider if this should halt the process or collect errors
                    // For now, it continues and reports overall success based on sourceUpdateSuccess and cascadeResult.isValid
                }
            }
        }
        return { success: true, cascadeResult };
    }
};
