"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportModificationController = void 0;
const report_modification_service_1 = require("../services/report_modification.service");
exports.ReportModificationController = {
    async previewCascade(req, res) {
        try {
            const { reportId } = req.params;
            const { modifications } = req.body;
            const result = await report_modification_service_1.ReportModificationService.modifyReportWithCascade(reportId, modifications, true // preview only
            );
            res.json(result);
        }
        catch (error) {
            res.status(500).json({ error: 'Preview failed', details: String(error) });
        }
    },
    async modifyWithCascade(req, res) {
        try {
            const { reportId } = req.params;
            const { modifications } = req.body;
            const result = await report_modification_service_1.ReportModificationService.modifyReportWithCascade(reportId, modifications, false // apply changes
            );
            if (result.success) {
                res.json(result);
            }
            else {
                res.status(400).json(result);
            }
        }
        catch (error) {
            res.status(500).json({ error: 'Modification failed', details: String(error) });
        }
    }
};
