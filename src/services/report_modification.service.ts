// src/services/report_modification.service.ts
import ReportModel from '../models/report.model';
import { CascadeCalculatorService, FieldModification, CascadeResult } from './cascade_calculator.service';

export const ReportModificationService = {
  async modifyReportWithCascade(
    reportId: string,
    modifications: FieldModification[],
    previewOnly: boolean = false
  ): Promise<{ success: boolean; cascadeResult: CascadeResult; error?: string }> {
    
    const originalReport = ReportModel.findById(reportId);
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

    const sourceUpdateSuccess = ReportModel.update(reportId, sourceUpdates);
    if (!sourceUpdateSuccess) {
      return { success: false, cascadeResult, error: 'Failed to update source report' };
    }

    for (const affectedReport of cascadeResult.affectedReports) {
      if (Object.keys(affectedReport.updates).length > 0) {
        const updateSuccess = ReportModel.update(affectedReport.reportId, affectedReport.updates);
        if (!updateSuccess) {
          console.error(`Failed to update report ${affectedReport.reportId}`);
        }
      }
    }

    return { success: true, cascadeResult };
  }
};