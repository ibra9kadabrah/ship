import pool from '../../db/connection'; // For transactions
import {
    Report,
    CreateReportDTO, // Used for the 'changes' payload
    FullReportViewDTO,
    BerthSpecificData,
    DepartureSpecificData, // For casting report if it's a departure
    // ReportType, // For context
    // ReportStatus // For context
} from '../../types/report';
import { Vessel } from '../../types/vessel'; // Needed for cargo validation
import ReportModel from '../../models/report.model';
import VesselModel from '../../models/vessel.model'; // Needed for cargo validation
import ReportEngineUnitModel from '../../models/report_engine_unit.model';
import ReportAuxEngineModel from '../../models/report_aux_engine.model';
import { ReportQueryService } from './report-query.service'; // To fetch the full report after resubmission
// RobCalculator itself doesn't export calculateTotalConsumptions or calculateCurrentRobs
// import { RobCalculator, RobCalculationResult } from './helpers/rob-calculator';
import { CargoCalculator } from './helpers/cargo-calculator';
import { ReportRecordData } from './helpers/report-builder';
import { VoyageLifecycleService, PreviousVoyageFinalState } from '../voyage_lifecycle.service'; // For previous ROBs
import {
    BunkerConsumptionInput,
    BunkerSupplyInput,
    PreviousRob,
    TotalConsumptions,
    CurrentRobs,
    calculateTotalConsumptions, // Import directly
    calculateCurrentRobs      // Import directly
} from '../bunker_calculator';


export class ReportResubmissionService {
  private reportQueryService: ReportQueryService;

  constructor() {
    this.reportQueryService = new ReportQueryService();
  }

  async resubmitReport(
    reportIdFromParams: string, // Renamed to avoid conflict with report.id
    captainId: string,
    changes: Partial<CreateReportDTO> // Changes can be partial
  ): Promise<FullReportViewDTO> {
    console.log(`[ReportResubmissionService] Called for reportId: ${reportIdFromParams} by captainId: ${captainId}`);
    console.log(`[ReportResubmissionService] Incoming 'changes' payload:`, JSON.stringify(changes, null, 2));

    const transactionExecution = async (client: any) => {
      const report = await ReportModel.findById(reportIdFromParams, client);
      if (!report || !report.id) { // Ensure report and report.id exist
        throw new Error(`Report with ID ${reportIdFromParams} not found or has no ID.`);
      }
      const currentReportId: string = report.id; // report.id is now a string

      if (report.captainId !== captainId) {
        throw new Error(`Captain ${captainId} is not authorized to resubmit report ${currentReportId}.`);
      }
      if (report.status !== 'changes_requested') {
        throw new Error(`Report ${currentReportId} is not in 'changes_requested' status. Current status: ${report.status}.`);
      }
      if (!report.vesselId) {
        throw new Error("Vessel ID is missing from the report, cannot resubmit.");
      }
      const vesselIdChecked: string = report.vesselId;

      const vessel = await VesselModel.findById(vesselIdChecked, client);
      if (!vessel) {
          throw new Error(`Vessel with ID ${vesselIdChecked} not found during resubmission.`);
      }

      let previousRobForRecalc: PreviousRob = { lsifo: 0, lsmgo: 0, cylOil: 0, meOil: 0, aeOil: 0 };
      let previousVoyageStateForRob: PreviousVoyageFinalState | null = null;

      if (report.reportType === 'departure') {
        previousVoyageStateForRob = await VoyageLifecycleService.findLatestCompletedVoyageFinalState(vesselIdChecked, client);
        if (previousVoyageStateForRob) {
            previousRobForRecalc = {
                lsifo: previousVoyageStateForRob.finalRobLsifo ?? 0,
                lsmgo: previousVoyageStateForRob.finalRobLsmgo ?? 0,
                cylOil: previousVoyageStateForRob.finalRobCylOil ?? 0,
                meOil: previousVoyageStateForRob.finalRobMeOil ?? 0,
                aeOil: previousVoyageStateForRob.finalRobAeOil ?? 0,
            };
        } else if (vessel.initialRobLsifo !== null) {
             previousRobForRecalc = {
                lsifo: vessel.initialRobLsifo ?? 0,
                lsmgo: vessel.initialRobLsmgo ?? 0,
                cylOil: vessel.initialRobCylOil ?? 0,
                meOil: vessel.initialRobMeOil ?? 0,
                aeOil: vessel.initialRobAeOil ?? 0,
            };
        } else {
            const depReport = report as Partial<Report> & DepartureSpecificData;
            previousRobForRecalc = {
                lsifo: depReport.initialRobLsifo ?? 0,
                lsmgo: depReport.initialRobLsmgo ?? 0,
                cylOil: depReport.initialRobCylOil ?? 0,
                meOil: depReport.initialRobMeOil ?? 0,
                aeOil: depReport.initialRobAeOil ?? 0,
            };
        }
      } else if (report.voyageId) {
        const reportBeforeThisInVesselHistory = await ReportModel.findPreviousReport(currentReportId, vesselIdChecked, client);
        if (reportBeforeThisInVesselHistory && reportBeforeThisInVesselHistory.voyageId === report.voyageId) {
            previousRobForRecalc = {
                lsifo: reportBeforeThisInVesselHistory.currentRobLsifo ?? 0,
                lsmgo: reportBeforeThisInVesselHistory.currentRobLsmgo ?? 0,
                cylOil: reportBeforeThisInVesselHistory.currentRobCylOil ?? 0,
                meOil: reportBeforeThisInVesselHistory.currentRobMeOil ?? 0,
                aeOil: reportBeforeThisInVesselHistory.currentRobAeOil ?? 0,
            };
        } else { 
            const voyageDeparture = await ReportModel.getFirstReportForVoyage(report.voyageId, client);
            if (voyageDeparture && voyageDeparture.id !== currentReportId) {
                 previousRobForRecalc = {
                    lsifo: voyageDeparture.currentRobLsifo ?? 0,
                    lsmgo: voyageDeparture.currentRobLsmgo ?? 0,
                    cylOil: voyageDeparture.currentRobCylOil ?? 0,
                    meOil: voyageDeparture.currentRobMeOil ?? 0,
                    aeOil: voyageDeparture.currentRobAeOil ?? 0,
                };
            } else {
                 console.warn(`[ReportResubmissionService] Could not determine previous ROBs for non-departure report ${currentReportId}. Using zeros.`);
            }
        }
      }
      
      const mergedReportDataForCalc: CreateReportDTO = { ...(report as Report), ...changes } as CreateReportDTO;
      
      const recalculatedTotalConsumptions: TotalConsumptions = calculateTotalConsumptions(mergedReportDataForCalc as BunkerConsumptionInput);
      const recalculatedCurrentRobs: CurrentRobs = calculateCurrentRobs(
          previousRobForRecalc,
          recalculatedTotalConsumptions,
          mergedReportDataForCalc as BunkerSupplyInput
      );


      const { engineUnits, auxEngines, ...restOfChanges } = changes;
      const updateData: Partial<ReportRecordData> = { ...restOfChanges };

      if (report.reportType === 'berth' && report.voyageId) {
        const berthChanges = changes as Partial<BerthSpecificData>;
        if (berthChanges.cargoLoaded !== undefined || berthChanges.cargoUnloaded !== undefined) {
            const newCargoQuantity = await CargoCalculator.calculateResubmittedBerthCargoQuantity(
              report as Report,
              berthChanges,
              vessel,
              client
            );
            if (newCargoQuantity !== null) {
              updateData.cargoQuantity = newCargoQuantity;
            }
        }
      }

      updateData.status = 'pending';
      updateData.reviewerId = null;
      updateData.reviewDate = null;
      updateData.reviewComments = null;
      updateData.modification_checklist = null;
      updateData.requested_changes_comment = null;
      updateData.updatedAt = new Date().toISOString();

      updateData.totalConsumptionLsifo = recalculatedTotalConsumptions.totalConsumptionLsifo;
      updateData.totalConsumptionLsmgo = recalculatedTotalConsumptions.totalConsumptionLsmgo;
      updateData.totalConsumptionCylOil = recalculatedTotalConsumptions.totalConsumptionCylOil;
      updateData.totalConsumptionMeOil = recalculatedTotalConsumptions.totalConsumptionMeOil;
      updateData.totalConsumptionAeOil = recalculatedTotalConsumptions.totalConsumptionAeOil;
      updateData.currentRobLsifo = recalculatedCurrentRobs.currentRobLsifo;
      updateData.currentRobLsmgo = recalculatedCurrentRobs.currentRobLsmgo;
      updateData.currentRobCylOil = recalculatedCurrentRobs.currentRobCylOil;
      updateData.currentRobMeOil = recalculatedCurrentRobs.currentRobMeOil;
      updateData.currentRobAeOil = recalculatedCurrentRobs.currentRobAeOil;

      if (engineUnits && report.reportType !== 'berth') {
        await ReportEngineUnitModel.deleteByReportId(currentReportId, client);
        await ReportEngineUnitModel.createMany(currentReportId, engineUnits, client);
      }
      if (auxEngines) {
        await ReportAuxEngineModel.deleteByReportId(currentReportId, client);
        await ReportAuxEngineModel.createMany(currentReportId, auxEngines, client);
      }

      const success = await ReportModel.update(currentReportId, updateData, client);
      if (!success) {
        throw new Error(`Failed to update report ${currentReportId} during resubmission.`);
      }
      return currentReportId;
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const updatedReportId = await transactionExecution(client);
      await client.query('COMMIT');
      return this.reportQueryService.getReportById(updatedReportId);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Report resubmission transaction failed for report ${reportIdFromParams}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}