// src/services/report_modification.service.ts
import ReportModel from '../models/report.model';
import { CascadeCalculatorService, FieldModification, CascadeResult, AffectedReport } from './cascade_calculator.service'; // Import AffectedReport

export const ReportModificationService = {
  async modifyReportWithCascade(
    reportId: string,
    modifications: FieldModification[],
    previewOnly: boolean = false
  ): Promise<{ success: boolean; cascadeResult: CascadeResult; error?: string }> {
    
    const originalReport = await ReportModel.findById(reportId);
    if (!originalReport || originalReport.status !== 'approved') {
      return { 
        success: false, 
        cascadeResult: { isValid: false, affectedReports: [], errors: [] },
        error: 'Report not found or not approved' 
      };
    }

    const cascadeResult = await CascadeCalculatorService.calculateCascade(reportId, modifications);

    if (previewOnly) return { success: true, cascadeResult };

    if (!cascadeResult.isValid) {
      return { success: false, cascadeResult, error: 'Cascade validation failed' };
    }

    const sourceUpdates: Record<string, any> = {};
    modifications.forEach(mod => sourceUpdates[mod.fieldName] = mod.newValue);

    const sourceUpdateSuccess = await ReportModel.update(reportId, sourceUpdates);
    if (!sourceUpdateSuccess) {
      return { success: false, cascadeResult, error: 'Failed to update source report' };
    }

    for (const affectedReport of cascadeResult.affectedReports) {
      // Use finalState which contains all recalculated fields for the update
      if (Object.keys(affectedReport.finalState).length > 0) { 
        const updateSuccess = await ReportModel.update(affectedReport.reportId, affectedReport.finalState);
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