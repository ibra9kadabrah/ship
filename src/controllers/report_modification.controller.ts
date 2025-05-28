// src/controllers/report_modification.controller.ts
import { Request, Response } from 'express';
import { ReportModificationService } from '../services/report_modification.service';
import { FieldModification } from '../services/cascade_calculator.service';

export const ReportModificationController = {
  async previewCascade(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { modifications } = req.body;

      const result = await ReportModificationService.modifyReportWithCascade(
        reportId,
        modifications as FieldModification[],
        true // preview only
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Preview failed', details: String(error) });
    }
  },

  async modifyWithCascade(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;
      const { modifications } = req.body;

      const result = await ReportModificationService.modifyReportWithCascade(
        reportId,
        modifications as FieldModification[],
        false // apply changes
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      res.status(500).json({ error: 'Modification failed', details: String(error) });
    }
  }
};