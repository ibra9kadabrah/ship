import {
    Report,
    FullReportViewDTO,
    EngineUnitData,
    AuxEngineData,
} from '../../types/report';
import { Vessel } from '../../types/vessel';
import { User } from '../../types/user';
import ReportModel from '../../models/report.model';
import VesselModel from '../../models/vessel.model';
import UserModel from '../../models/user.model';
import ReportEngineUnitModel from '../../models/report_engine_unit.model';
import ReportAuxEngineModel from '../../models/report_aux_engine.model';

export type ReportListDTO = Partial<Report> & { vesselName?: string; captainName?: string };

export class ReportQueryService {
  async getReportById(id: string): Promise<FullReportViewDTO> {
    console.log(`[ReportQueryService] Searching for report with ID: ${id}`);
    const reportBase = await ReportModel.findById(id);
    if (!reportBase) throw new Error(`Report with ID ${id} not found.`);

    if (!reportBase.vesselId || !reportBase.captainId) {
      throw new Error(`Report ${id} is missing essential IDs (vesselId, captainId).`);
    }

    const hasVoyageId = reportBase.voyageId !== null && reportBase.voyageId !== undefined;

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
        reportBase as Report,
        vessel,
        captain,
        departureReport as Report | null,
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
    const reportsWithNames = await ReportModel.getPendingReports(vesselId);
    return reportsWithNames;
  }

  async getReportsByCaptainId(captainId: string): Promise<Partial<Report>[]> {
    const reports = await ReportModel.findByCaptainId(captainId);
    console.warn("[ReportQueryService.getReportsByCaptainId] returns base data only; related machinery not fetched by default.");
    return reports;
  }

  async getAllReports(vesselId?: string): Promise<ReportListDTO[]> {
    const reportsWithNames = await ReportModel.findAll(vesselId);
    return reportsWithNames;
  }
}