import {
    CreateReportDTO,
    ReportType,
    ReportStatus,
    DepartureSpecificData,
    NoonSpecificData,
    ArrivalSpecificData,
    BerthSpecificData,
    ArrivalAnchorNoonSpecificData,
    CargoStatus,
    CardinalDirection,
    PassageState,
    // EngineUnitData, // Will be needed by ReportSubmissionService, not directly by builder
    // AuxEngineData,  // Same as above
    // FullReportViewDTO // For query service
} from '../../../types/report';
// Assuming these types will be accessible, possibly moved to a shared types location or defined by their respective calculator modules
import { CurrentRobs, TotalConsumptions, PreviousRob, BunkerConsumptionInput, BunkerSupplyInput } from '../../bunker_calculator'; // Placeholder path
import { DistanceCalculationOutput, DistanceCalculationInput } from '../../distance_calculator'; // Placeholder path
// import { Vessel } from '../../../types/vessel'; // Not directly needed by builder if vessel-specific logic is pre-processed
// import { User } from '../../../types/user'; // Not directly needed by builder
// import { Voyage } from '../../../types/voyage'; // Not directly needed by builder
// import { PreviousVoyageFinalState } from '../../voyage_lifecycle.service'; // Placeholder path

// Copied from report.service.ts (lines 36-93)
// This should align with the type in report.model.ts and the DB schema
export type ReportRecordData = {
    id: string; voyageId: string | null; vesselId: string; reportType: ReportType; status: ReportStatus; captainId: string;
    reviewerId?: string | null; reviewDate?: string | null; reviewComments?: string | null; reportDate: string; reportTime: string; timeZone: string;
    departurePort?: string | null; destinationPort?: string | null; voyageDistance?: number | null; etaDate?: string | null; etaTime?: string | null;
    fwdDraft?: number | null; aftDraft?: number | null; cargoQuantity?: number | null; cargoType?: string | null; cargoStatus?: CargoStatus | null;
    faspDate?: string | null; faspTime?: string | null;
    faspLatDeg?: number | null; faspLatMin?: number | null; faspLatDir?: 'N' | 'S' | null;
    faspLonDeg?: number | null; faspLonMin?: number | null; faspLonDir?: 'E' | 'W' | null;
    faspCourse?: number | null;
    harbourDistance?: number | null; harbourTime?: string | null; distanceSinceLastReport?: number | null; totalDistanceTravelled?: number | null; distanceToGo?: number | null;
    windDirection?: CardinalDirection | null; seaDirection?: CardinalDirection | null; swellDirection?: CardinalDirection | null; windForce?: number | null; seaState?: number | null; swellHeight?: number | null;
    meConsumptionLsifo?: number | null; meConsumptionLsmgo?: number | null; meConsumptionCylOil?: number | null; meConsumptionMeOil?: number | null; meConsumptionAeOil?: number | null;
    boilerConsumptionLsifo?: number | null; boilerConsumptionLsmgo?: number | null; auxConsumptionLsifo?: number | null; auxConsumptionLsmgo?: number | null;
    supplyLsifo?: number | null; supplyLsmgo?: number | null; supplyCylOil?: number | null; supplyMeOil?: number | null; supplyAeOil?: number | null;
    totalConsumptionLsifo?: number | null; totalConsumptionLsmgo?: number | null; totalConsumptionCylOil?: number | null; totalConsumptionMeOil?: number | null; totalConsumptionAeOil?: number | null;
    currentRobLsifo?: number | null; currentRobLsmgo?: number | null; currentRobCylOil?: number | null; currentRobMeOil?: number | null; currentRobAeOil?: number | null;
    initialRobLsifo?: number | null; // Added for storing input on first departure
    initialRobLsmgo?: number | null;
    initialRobCylOil?: number | null;
    initialRobMeOil?: number | null;
    initialRobAeOil?: number | null;
    meFoPressure?: number | null; meLubOilPressure?: number | null; meFwInletTemp?: number | null; meLoInletTemp?: number | null; meScavengeAirTemp?: number | null;
    meTcRpm1?: number | null; meTcRpm2?: number | null; meTcExhaustTempIn?: number | null; meTcExhaustTempOut?: number | null; meThrustBearingTemp?: number | null; meDailyRunHours?: number | null;
    mePresentRpm?: number | null; // Added Present RPM
    meCurrentSpeed?: number | null; // Added Current Speed
    passageState?: PassageState | null;
    noonDate?: string | null; noonTime?: string | null;
    noonLatDeg?: number | null; noonLatMin?: number | null; noonLatDir?: 'N' | 'S' | null;
    noonLonDeg?: number | null; noonLonMin?: number | null; noonLonDir?: 'E' | 'W' | null;
    noonCourse?: number | null; // Added noonCourse
    sospDate?: string | null; sospTime?: string | null;
    sospLatDeg?: number | null; sospLatMin?: number | null; sospLatDir?: 'N' | 'S' | null;
    sospLonDeg?: number | null; sospLonMin?: number | null; sospLonDir?: 'E' | 'W' | null;
    sospCourse?: number | null; // Added sospCourse
    rospDate?: string | null; rospTime?: string | null;
    rospLatDeg?: number | null; rospLatMin?: number | null; rospLatDir?: 'N' | 'S' | null;
    rospLonDeg?: number | null; rospLonMin?: number | null; rospLonDir?: 'E' | 'W' | null;
    rospCourse?: number | null; // Added rospCourse
    eospDate?: string | null; eospTime?: string | null;
    eospLatDeg?: number | null; eospLatMin?: number | null; eospLatDir?: 'N' | 'S' | null;
    eospLonDeg?: number | null; eospLonMin?: number | null; eospLonDir?: 'E' | 'W' | null;
    eospCourse?: number | null;
    estimatedBerthingDate?: string | null; estimatedBerthingTime?: string | null;
    berthDate?: string | null; berthTime?: string | null;
    berthLatDeg?: number | null; berthLatMin?: number | null; berthLatDir?: 'N' | 'S' | null;
    berthLonDeg?: number | null; berthLonMin?: number | null; berthLonDir?: 'E' | 'W' | null;
    cargoLoaded?: number | null; cargoUnloaded?: number | null;
    cargoOpsStartDate?: string | null; cargoOpsStartTime?: string | null; cargoOpsEndDate?: string | null; cargoOpsEndTime?: string | null;
    berthNumber?: string | null; // Added Berth Number
    // Calculated Performance Metrics
    sailingTimeVoyage?: number | null;
    avgSpeedVoyage?: number | null;
    // Fields for review/modification flow
    modification_checklist?: string | null; // JSON string of checklist items
    requested_changes_comment?: string | null;
    createdAt: string; // Add createdAt
    updatedAt: string;
};

// Copied from report.service.ts (lines 96-102) - consider moving to a shared types file
export interface InitialRobData {
  initialRobLsifo?: number | null;
  initialRobLsmgo?: number | null;
  initialRobCylOil?: number | null;
  initialRobMeOil?: number | null;
  initialRobAeOil?: number | null;
}

export interface ReportCalculations {
    totalConsumptions: TotalConsumptions;
    currentRobs: CurrentRobs;
    distanceOutput: DistanceCalculationOutput;
    sailingTimeVoyage: number;
    avgSpeedVoyage: number;
    // This is the cargo quantity specifically calculated for berth reports.
    berthCalculatedCargoQuantity?: number | null;
    // Contains initial ROB values if they were part of the input (for first departure)
    // or from the DTO for subsequent departures. These are stored directly on the report record.
    initialRobDataForRecord?: InitialRobData | null;
}


export class ReportBuilder {
  static buildReportRecord(
    reportId: string,
    reportInput: CreateReportDTO,
    captainId: string,
    voyageIdToAssociate: string | null, // Added voyageId
    calculations: ReportCalculations
  ): ReportRecordData {
    const record: Partial<ReportRecordData> = {
        id: reportId,
        voyageId: voyageIdToAssociate, // Use the passed voyageId
        vesselId: reportInput.vesselId,
        reportType: reportInput.reportType,
        status: 'pending' as ReportStatus, // Default status
        captainId: captainId,
        reviewerId: null,
        reviewDate: null,
        reviewComments: null,
        reportDate: reportInput.reportDate,
        reportTime: reportInput.reportTime,
        timeZone: reportInput.timeZone,

        // Calculated fields from ReportCalculations
        totalConsumptionLsifo: calculations.totalConsumptions.totalConsumptionLsifo,
        totalConsumptionLsmgo: calculations.totalConsumptions.totalConsumptionLsmgo,
        totalConsumptionCylOil: calculations.totalConsumptions.totalConsumptionCylOil,
        totalConsumptionMeOil: calculations.totalConsumptions.totalConsumptionMeOil,
        totalConsumptionAeOil: calculations.totalConsumptions.totalConsumptionAeOil,

        currentRobLsifo: calculations.currentRobs.currentRobLsifo,
        currentRobLsmgo: calculations.currentRobs.currentRobLsmgo,
        currentRobCylOil: calculations.currentRobs.currentRobCylOil,
        currentRobMeOil: calculations.currentRobs.currentRobMeOil,
        currentRobAeOil: calculations.currentRobs.currentRobAeOil,

        totalDistanceTravelled: calculations.distanceOutput.totalDistanceTravelled ?? null,
        distanceToGo: calculations.distanceOutput.distanceToGo ?? null,

        sailingTimeVoyage: calculations.sailingTimeVoyage,
        avgSpeedVoyage: calculations.avgSpeedVoyage,

        // Initial ROBs (if any) - spread the object which might be null/undefined
        ...(calculations.initialRobDataForRecord || {}),

        // Weather data (common to all report types)
        windDirection: reportInput.windDirection ?? null,
        seaDirection: reportInput.seaDirection ?? null,
        swellDirection: reportInput.swellDirection ?? null,
        windForce: reportInput.windForce ?? null,
        seaState: reportInput.seaState ?? null,
        swellHeight: reportInput.swellHeight ?? null,

        // Boiler and Aux consumption (common)
        boilerConsumptionLsifo: reportInput.boilerConsumptionLsifo ?? null,
        boilerConsumptionLsmgo: reportInput.boilerConsumptionLsmgo ?? null,
        auxConsumptionLsifo: reportInput.auxConsumptionLsifo ?? null,
        auxConsumptionLsmgo: reportInput.auxConsumptionLsmgo ?? null,

        // Supplies (common)
        supplyLsifo: reportInput.supplyLsifo ?? null,
        supplyLsmgo: reportInput.supplyLsmgo ?? null,
        supplyCylOil: reportInput.supplyCylOil ?? null,
        supplyMeOil: reportInput.supplyMeOil ?? null,
        supplyAeOil: reportInput.supplyAeOil ?? null,
    };

    // Type-specific fields and conditional common fields
    if (reportInput.reportType === 'departure') {
        const depInput = reportInput as DepartureSpecificData;
        Object.assign(record, this.buildDepartureFields(depInput));
        record.cargoQuantity = depInput.cargoQuantity; // From input for departure
        record.cargoStatus = depInput.cargoStatus;
        // ME Consumption & Params for Departure (from input)
        record.meConsumptionLsifo = depInput.meConsumptionLsifo ?? null;
        record.meConsumptionLsmgo = depInput.meConsumptionLsmgo ?? null;
        record.meConsumptionCylOil = depInput.meConsumptionCylOil ?? null;
        record.meConsumptionMeOil = depInput.meConsumptionMeOil ?? null;
        record.meConsumptionAeOil = depInput.meConsumptionAeOil ?? null;
        record.meFoPressure = depInput.meFoPressure ?? null;
        record.meLubOilPressure = depInput.meLubOilPressure ?? null;
        record.meFwInletTemp = depInput.meFwInletTemp ?? null;
        record.meLoInletTemp = depInput.meLoInletTemp ?? null;
        record.meScavengeAirTemp = depInput.meScavengeAirTemp ?? null;
        record.meTcRpm1 = depInput.meTcRpm1 ?? null;
        record.meTcRpm2 = depInput.meTcRpm2 ?? null;
        record.meTcExhaustTempIn = depInput.meTcExhaustTempIn ?? null;
        record.meTcExhaustTempOut = depInput.meTcExhaustTempOut ?? null;
        record.meThrustBearingTemp = depInput.meThrustBearingTemp ?? null;
        record.meDailyRunHours = depInput.meDailyRunHours ?? null;
        record.mePresentRpm = depInput.mePresentRpm ?? null;
        record.meCurrentSpeed = depInput.meCurrentSpeed ?? null;
    } else if (reportInput.reportType === 'noon') {
        const noonInput = reportInput as NoonSpecificData;
        Object.assign(record, this.buildNoonFields(noonInput));
        // ME Consumption & Params for Noon (from input)
        record.meConsumptionLsifo = noonInput.meConsumptionLsifo ?? null;
        // ... (similar for all ME/AE consumption and ME params)
        record.meDailyRunHours = noonInput.meDailyRunHours ?? null;
        record.mePresentRpm = noonInput.mePresentRpm ?? null;
        record.meCurrentSpeed = noonInput.meCurrentSpeed ?? null;
    } else if (reportInput.reportType === 'arrival') {
        const arrInput = reportInput as ArrivalSpecificData;
        Object.assign(record, this.buildArrivalFields(arrInput));
        // ME Consumption & Params for Arrival (from input)
        record.meConsumptionLsifo = arrInput.meConsumptionLsifo ?? null;
        // ...
        record.meDailyRunHours = arrInput.meDailyRunHours ?? null;
        record.mePresentRpm = arrInput.mePresentRpm ?? null;
        record.meCurrentSpeed = arrInput.meCurrentSpeed ?? null;
    } else if (reportInput.reportType === 'berth') {
        const berthInput = reportInput as BerthSpecificData;
        Object.assign(record, this.buildBerthFields(berthInput));
        record.cargoQuantity = calculations.berthCalculatedCargoQuantity ?? null; // Calculated for berth
        record.cargoStatus = null; // Null for berth
        // ME/AE consumption and ME Params are null for berth
        record.meConsumptionLsifo = null;
        record.meConsumptionLsmgo = null;
        record.meConsumptionCylOil = null;
        record.meConsumptionMeOil = null;
        record.meConsumptionAeOil = null;
        record.meFoPressure = null;
        record.meLubOilPressure = null;
        record.meFwInletTemp = null;
        record.meLoInletTemp = null;
        record.meScavengeAirTemp = null;
        record.meTcRpm1 = null;
        record.meTcRpm2 = null;
        record.meTcExhaustTempIn = null;
        record.meTcExhaustTempOut = null;
        record.meThrustBearingTemp = null;
        record.meDailyRunHours = null;
        record.mePresentRpm = null;
        record.meCurrentSpeed = null;
    } else if (reportInput.reportType === 'arrival_anchor_noon') {
        const aanInput = reportInput as ArrivalAnchorNoonSpecificData;
        Object.assign(record, this.buildArrivalAnchorNoonFields(aanInput));
         // ME Consumption & Params for AAN (from input)
        record.meConsumptionLsifo = aanInput.meConsumptionLsifo ?? null;
        // ...
        record.meDailyRunHours = aanInput.meDailyRunHours ?? null;
        record.mePresentRpm = aanInput.mePresentRpm ?? null;
        record.meCurrentSpeed = aanInput.meCurrentSpeed ?? null;
    }

    record.createdAt = new Date().toISOString();
    record.updatedAt = new Date().toISOString();

    return record as ReportRecordData; // Cast to full type after assembly
  }

  static buildDepartureFields(input: DepartureSpecificData): Partial<ReportRecordData> {
    return {
        departurePort: input.departurePort,
        destinationPort: input.destinationPort,
        voyageDistance: input.voyageDistance,
        etaDate: input.etaDate,
        etaTime: input.etaTime,
        fwdDraft: input.fwdDraft,
        aftDraft: input.aftDraft,
        // cargoQuantity & cargoStatus handled in main builder
        faspDate: input.faspDate,
        faspTime: input.faspTime,
        faspLatDeg: input.faspLatDeg,
        faspLatMin: input.faspLatMin,
        faspLatDir: input.faspLatDir,
        faspLonDeg: input.faspLonDeg,
        faspLonMin: input.faspLonMin,
        faspLonDir: input.faspLonDir,
        faspCourse: input.faspCourse,
        harbourDistance: input.harbourDistance,
        harbourTime: input.harbourTime,
        // distanceSinceLastReport is not for departure
    };
  }

  static buildNoonFields(input: NoonSpecificData): Partial<ReportRecordData> {
    return {
        distanceSinceLastReport: input.distanceSinceLastReport,
        passageState: input.passageState || null,
        noonDate: input.noonDate,
        noonTime: input.noonTime,
        noonLatDeg: input.noonLatDeg,
        noonLatMin: input.noonLatMin,
        noonLatDir: input.noonLatDir,
        noonLonDeg: input.noonLonDeg,
        noonLonMin: input.noonLonMin,
        noonLonDir: input.noonLonDir,
        noonCourse: input.noonCourse,
        sospDate: input.passageState === 'SOSP' ? input.sospDate : null,
        sospTime: input.passageState === 'SOSP' ? input.sospTime : null,
        sospLatDeg: input.passageState === 'SOSP' ? input.sospLatDeg : null,
        sospLatMin: input.passageState === 'SOSP' ? input.sospLatMin : null,
        sospLatDir: input.passageState === 'SOSP' ? input.sospLatDir : null,
        sospLonDeg: input.passageState === 'SOSP' ? input.sospLonDeg : null,
        sospLonMin: input.passageState === 'SOSP' ? input.sospLonMin : null,
        sospLonDir: input.passageState === 'SOSP' ? input.sospLonDir : null,
        sospCourse: input.passageState === 'SOSP' ? input.sospCourse : null,
        rospDate: input.passageState === 'ROSP' ? input.rospDate : null,
        rospTime: input.passageState === 'ROSP' ? input.rospTime : null,
        rospLatDeg: input.passageState === 'ROSP' ? input.rospLatDeg : null,
        rospLatMin: input.passageState === 'ROSP' ? input.rospLatMin : null,
        rospLatDir: input.passageState === 'ROSP' ? input.rospLatDir : null,
        rospLonDeg: input.passageState === 'ROSP' ? input.rospLonDeg : null,
        rospLonMin: input.passageState === 'ROSP' ? input.rospLonMin : null,
        rospLonDir: input.passageState === 'ROSP' ? input.rospLonDir : null,
        rospCourse: input.passageState === 'ROSP' ? input.rospCourse : null,
    };
  }

  static buildArrivalFields(input: ArrivalSpecificData): Partial<ReportRecordData> {
    return {
        distanceSinceLastReport: input.distanceSinceLastReport,
        harbourDistance: input.harbourDistance,
        harbourTime: input.harbourTime,
        eospDate: input.eospDate,
        eospTime: input.eospTime,
        eospLatDeg: input.eospLatDeg,
        eospLatMin: input.eospLatMin,
        eospLatDir: input.eospLatDir,
        eospLonDeg: input.eospLonDeg,
        eospLonMin: input.eospLonMin,
        eospLonDir: input.eospLonDir,
        eospCourse: input.eospCourse,
        estimatedBerthingDate: input.estimatedBerthingDate,
        estimatedBerthingTime: input.estimatedBerthingTime,
    };
  }

  static buildBerthFields(input: BerthSpecificData): Partial<ReportRecordData> {
    return {
        berthDate: input.berthDate,
        berthTime: input.berthTime,
        berthLatDeg: input.berthLatDeg,
        berthLatMin: input.berthLatMin,
        berthLatDir: input.berthLatDir,
        berthLonDeg: input.berthLonDeg,
        berthLonMin: input.berthLonMin,
        berthLonDir: input.berthLonDir,
        cargoLoaded: input.cargoLoaded ?? null,
        cargoUnloaded: input.cargoUnloaded ?? null,
        cargoOpsStartDate: input.cargoOpsStartDate,
        cargoOpsStartTime: input.cargoOpsStartTime,
        cargoOpsEndDate: input.cargoOpsEndDate,
        cargoOpsEndTime: input.cargoOpsEndTime,
        berthNumber: input.berthNumber,
        // cargoQuantity handled in main builder
    };
  }

  static buildArrivalAnchorNoonFields(input: ArrivalAnchorNoonSpecificData): Partial<ReportRecordData> {
    // Similar to NoonFields but specific to ArrivalAnchorNoonSpecificData type
    return {
        distanceSinceLastReport: input.distanceSinceLastReport,
        noonDate: input.noonDate,
        noonTime: input.noonTime,
        noonLatDeg: input.noonLatDeg,
        noonLatMin: input.noonLatMin,
        noonLatDir: input.noonLatDir,
        noonLonDeg: input.noonLonDeg,
        noonLonMin: input.noonLonMin,
        noonLonDir: input.noonLonDir,
        noonCourse: input.noonCourse,
        // AAN doesn't have SOSP/ROSP states
        passageState: null, // Explicitly null for AAN
    };
  }
}