import { Request, Response } from 'express';
import { ExcelDataAggregationService } from '../services/excel_data_aggregation.service';
import ReportModel from '../models/report.model';
import VoyageModel from '../models/voyage.model';
import VesselModel from '../models/vessel.model';

export const DebugController = {
  // Existing debug endpoints...
  
  async getExcelDebugData(req: Request, res: Response): Promise<void> {
    try {
      const { voyageId } = req.params;
      
      if (!voyageId) {
        res.status(400).json({ error: 'Voyage ID is required' });
        return;
      }

      console.log(`[DebugController] Fetching Excel debug data for voyage: ${voyageId}`);
      
      // Get voyage details
      const voyage = VoyageModel.findById(voyageId);
      if (!voyage) {
        res.status(404).json({ error: `Voyage ${voyageId} not found` });
        return;
      }
      
      // Get vessel details
      const vessel = VesselModel.findById(voyage.vesselId);
      if (!vessel) {
        res.status(404).json({ error: `Vessel ${voyage.vesselId} not found` });
        return;
      }
      
      // Get all reports for the voyage
      const allReports = ReportModel._getAllReportsForVoyage(voyageId);
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
        distanceSinceLastReport: (report as any).distanceSinceLastReport || null,
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
        aggregatedData = await ExcelDataAggregationService.aggregateDataForExcel(voyageId);
      } catch (error) {
        aggregationError = error instanceof Error ? error.message : String(error);
      }
      
      // Get next voyage departure report
      let nextVoyageDepartureInfo = null;
      try {
        const { VoyageLifecycleService } = await import('../services/voyage_lifecycle.service');
        // Pass voyage.id as the currentVoyageId
        const nextDepartureReport = await VoyageLifecycleService.getNextVoyageDepartureReport(
          vessel.id,
          voyage.id, // Pass the ID of the current voyage (Voyage N)
          voyage.startDate
        );
        
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
      } catch (error) {
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
    } catch (error) {
      console.error('[DebugController] Error in getExcelDebugData:', error);
      res.status(500).json({ 
        error: 'Failed to fetch Excel debug data',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
};