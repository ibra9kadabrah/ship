import {
    Report,
    FullReportViewDTO,
    EngineUnitData,
    AuxEngineData,
    // ReportStatus, // Not directly used here, but good for context
    // CreateReportDTO // Not for query service
} from '../../types/report';
import { Vessel } from '../../types/vessel';
import { User } from '../../types/user'; // Corrected import path
import ReportModel from '../../models/report.model';
import VesselModel from '../../models/vessel.model';
import UserModel from '../../models/user.model';
import ReportEngineUnitModel from '../../models/report_engine_unit.model';
import ReportAuxEngineModel from '../../models/report_aux_engine.model';

// This DTO might be useful if the list views need slightly different data than FullReportViewDTO
// For now, using Partial<Report> & { vesselName?: string; captainName?: string } as per original service
export type ReportListDTO = Partial<Report> & { vesselName?: string; captainName?: string };


export class ReportQueryService {
  async getReportById(id: string): Promise<FullReportViewDTO> {
    console.log(`[ReportQueryService] Searching for report with ID: ${id}`);
    const reportBase = ReportModel.findById(id);
    if (!reportBase) throw new Error(`Report with ID ${id} not found.`);

    if (!reportBase.vesselId || !reportBase.captainId) {
      throw new Error(`Report ${id} is missing essential IDs (vesselId, captainId).`);
    }

    const hasVoyageId = reportBase.voyageId !== null && reportBase.voyageId !== undefined;

    // Fetch related data in parallel
    const vesselPromise = VesselModel.findById(reportBase.vesselId);
    const captainPromise = UserModel.findById(reportBase.captainId);
    const departureReportPromise = hasVoyageId
      ? ReportModel.getFirstReportForVoyage(reportBase.voyageId!)
      : Promise.resolve(null);
    const engineUnitsPromise = ReportEngineUnitModel.findByReportId(id);
    const auxEnginesPromise = ReportAuxEngineModel.findByReportId(id);

    const [vessel, captain, departureReport, engineUnits, auxEngines] = await Promise.all([
      vesselPromise,
      captainPromise,
      departureReportPromise,
      engineUnitsPromise,
      auxEnginesPromise
    ]);

    return this.buildFullReportDTO(
        reportBase as Report, // Cast as it should be a full report by this point if found
        vessel,
        captain,
        departureReport as Report | null, // Cast as it could be null
        engineUnits || [],
        auxEngines || []
    );
  }

  private async buildFullReportDTO(
    reportBase: Report,
    vessel: Vessel | null,
    captain: User | null,
    departureReport: Report | null,
    engineUnits: EngineUnitData[],
    auxEngines: AuxEngineData[]
  ): Promise<FullReportViewDTO> {
    const modificationChecklistString = (reportBase as any).modification_checklist;
    let parsedChecklist: string[] | null = null;
    if (modificationChecklistString && typeof modificationChecklistString === 'string') {
      try {
        parsedChecklist = JSON.parse(modificationChecklistString);
      } catch (e) {
        console.error("Failed to parse modification_checklist JSON:", e);
      }
    }

    const fullReport: FullReportViewDTO = {
      ...reportBase,
      engineUnits: engineUnits,
      auxEngines: auxEngines,
      vesselName: vessel?.name ?? 'Unknown Vessel',
      captainName: captain?.name ?? 'Unknown Captain',
      voyageCargoQuantity: (departureReport?.reportType === 'departure' ? (departureReport as any).cargoQuantity : null)
                          ?? (reportBase.reportType === 'departure' ? (reportBase as any).cargoQuantity : null)
                          ?? null,
      voyageCargoType: (departureReport?.reportType === 'departure' ? (departureReport as any).cargoType : null)
                       ?? (reportBase.reportType === 'departure' ? (reportBase as any).cargoType : null)
                       ?? null,
      voyageCargoStatus: (departureReport?.reportType === 'departure' ? (departureReport as any).cargoStatus : null)
                         ?? (reportBase.reportType === 'departure' ? (reportBase as any).cargoStatus : null)
                         ?? null,
      modification_checklist: parsedChecklist,
      requested_changes_comment: (reportBase as any).requested_changes_comment || null,
    };
    return fullReport;
  }

  async getPendingReports(vesselId?: string): Promise<ReportListDTO[]> {
    const reportsWithNames = ReportModel.getPendingReports(vesselId);
    return reportsWithNames;
  }

  async getReportsByCaptainId(captainId: string): Promise<Partial<Report>[]> {
    const reports = ReportModel.findByCaptainId(captainId);
    // Consider if full DTOs are needed or if partial is sufficient for captain's history
    console.warn("[ReportQueryService.getReportsByCaptainId] returns base data only; related machinery not fetched by default.");
    return reports;
  }

  async getAllReports(vesselId?: string): Promise<ReportListDTO[]> {
    const reportsWithNames = ReportModel.findAll(vesselId);
    return reportsWithNames;
  }
}