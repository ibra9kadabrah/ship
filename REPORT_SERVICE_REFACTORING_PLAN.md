# Report Service Refactoring Plan

## Overview
The `report.service.ts` file currently contains 1073 lines of code, handling multiple responsibilities including report submission, validation, review, export, and complex business logic. This refactoring plan will break it down into smaller, focused modules following the Single Responsibility Principle.

## Current Structure Analysis

### Main Responsibilities in report.service.ts:
1. **Report Submission** (submitReport: ~500 lines)
   - Validation orchestration
   - ROB calculations
   - Distance calculations
   - Voyage lifecycle management
   - Transaction handling
   - Machinery data persistence

2. **Report Retrieval** (getReportById: ~70 lines)
   - Data aggregation from multiple models
   - DTO construction

3. **Report Review** (reviewReport: ~130 lines)
   - Status updates
   - Voyage completion logic
   - Initial ROB updates

4. **Report Resubmission** (resubmitReport: ~200 lines)
   - Change validation
   - ROB recalculation
   - Cargo quantity recalculation

5. **Query Operations** (~50 lines)
   - getPendingReports
   - getReportsByCaptainId
   - getAllReports

6. **Excel Export** (wrapper function)

## Proposed Architecture

```
src/services/
├── report/
│   ├── index.ts                          # Main ReportService facade
│   ├── report-submission.service.ts      # Handle report submission logic
│   ├── report-review.service.ts          # Handle review/approval logic
│   ├── report-query.service.ts           # Handle all query operations
│   ├── report-resubmission.service.ts    # Handle resubmission logic
│   └── helpers/
│       ├── report-builder.ts             # Build report records
│       ├── rob-calculator.ts             # ROB calculation logic
│       ├── distance-calculator.ts        # Distance calculation logic
│       ├── cargo-calculator.ts           # Cargo quantity calculations
│       ├── performance-calculator.ts     # Performance metrics calculations
│       └── validation-orchestrator.ts    # Coordinate validations
```

## Detailed Refactoring Steps

### Step 1: Create Helper Modules

#### 1.1 Create `report-builder.ts`
```typescript
// Responsibilities:
// - Construct ReportRecordData from CreateReportDTO
// - Handle type-specific field mapping
// - Manage calculated field assignments

export class ReportBuilder {
  static buildReportRecord(
    reportId: string,
    reportInput: CreateReportDTO,
    captainId: string,
    calculations: CalculationResults
  ): ReportRecordData {
    // Extract record building logic from submitReport
  }

  static buildDepartureFields(input: DepartureSpecificData): Partial<ReportRecordData> {}
  static buildNoonFields(input: NoonSpecificData): Partial<ReportRecordData> {}
  static buildArrivalFields(input: ArrivalSpecificData): Partial<ReportRecordData> {}
  static buildBerthFields(input: BerthSpecificData): Partial<ReportRecordData> {}
}
```

#### 1.2 Create `rob-calculator.ts`
```typescript
// Responsibilities:
// - Determine previous ROB values
// - Handle initial ROB logic
// - Coordinate with bunker calculator

export class RobCalculator {
  static async calculateRobs(
    vessel: Vessel,
    reportType: ReportType,
    reportInput: CreateReportDTO,
    previousReport: Partial<Report> | null,
    previousVoyageState: PreviousVoyageFinalState | null
  ): Promise<RobCalculationResult> {
    // Extract ROB calculation logic
  }

  static determineInitialRobs(vessel: Vessel, reportInput: CreateReportDTO): InitialRobData | null {}
  static getPreviousRobs(previousReport: Partial<Report> | null, vessel: Vessel): PreviousRob {}
}
```

#### 1.3 Create `cargo-calculator.ts`
```typescript
// Responsibilities:
// - Calculate cargo quantities for berth reports
// - Validate cargo against vessel capacity

export class CargoCalculator {
  static calculateBerthCargoQuantity(
    reportId: string,
    voyageId: string,
    reportInput: BerthSpecificData
  ): number {
    // Extract cargo calculation logic from submitReport
  }

  static async calculateResubmissionCargo(
    report: Report,
    changes: Partial<BerthSpecificData>,
    vessel: Vessel
  ): Promise<number> {
    // Extract from resubmitReport
  }
}
```

#### 1.4 Create `performance-calculator.ts`
```typescript
// Responsibilities:
// - Calculate sailing time
// - Calculate average speed
// - Aggregate performance metrics

export class PerformanceCalculator {
  static calculateSailingTime(
    currentRunHours: number,
    previousReports: Partial<Report>[]
  ): number {
    // Extract sailing time calculation
  }

  static calculateAverageSpeed(
    totalDistance: number,
    sailingTime: number
  ): number {
    // Extract average speed calculation
  }
}
```

#### 1.5 Create `validation-orchestrator.ts`
```typescript
// Responsibilities:
// - Coordinate pre-submission validations
// - Check pending reports
// - Validate vessel and voyage states

export class ValidationOrchestrator {
  static async validatePreSubmission(
    reportInput: CreateReportDTO,
    captainId: string,
    vessel: Vessel
  ): Promise<ValidationResult> {
    // Extract validation logic
  }

  static checkPendingReports(
    captainId: string,
    vesselId: string,
    voyageId?: string
  ): void {
    // Extract pending report checks
  }
}
```

### Step 2: Create Service Modules

#### 2.1 Create `report-submission.service.ts`
```typescript
export class ReportSubmissionService {
  constructor(
    private robCalculator: RobCalculator,
    private cargoCalculator: CargoCalculator,
    private performanceCalculator: PerformanceCalculator,
    private reportBuilder: ReportBuilder,
    private validationOrchestrator: ValidationOrchestrator
  ) {}

  async submitReport(
    reportInput: CreateReportDTO,
    captainId: string
  ): Promise<Report> {
    // Simplified flow:
    // 1. Pre-validation
    // 2. Fetch required data
    // 3. Calculate metrics
    // 4. Build report record
    // 5. Execute transaction
    // 6. Return complete report
  }

  private async executeSubmissionTransaction(
    reportData: ReportRecordData,
    engineUnits?: EngineUnitData[],
    auxEngines?: AuxEngineData[]
  ): Promise<string> {
    // Transaction logic
  }
}
```

#### 2.2 Create `report-review.service.ts`
```typescript
export class ReportReviewService {
  async reviewReport(
    id: string,
    reviewData: ReviewReportDTO,
    reviewerId: string
  ): Promise<FullReportViewDTO> {
    // Extract review logic
    // Handle voyage completion
    // Update vessel initial ROBs if needed
  }

  private handleDepartureApproval(
    report: Report,
    vesselId: string
  ): void {
    // Extract departure-specific approval logic
  }

  private updateVesselInitialRobs(
    vesselId: string,
    report: Report
  ): boolean {
    // Extract initial ROB update logic
  }
}
```

#### 2.3 Create `report-query.service.ts`
```typescript
export class ReportQueryService {
  async getReportById(id: string): Promise<FullReportViewDTO> {
    // Extract report retrieval and DTO construction
  }

  async getPendingReports(vesselId?: string): Promise<ReportListDTO[]> {
    // Extract pending reports query
  }

  async getReportsByCaptainId(captainId: string): Promise<Partial<Report>[]> {
    // Extract captain reports query
  }

  async getAllReports(vesselId?: string): Promise<ReportListDTO[]> {
    // Extract all reports query
  }

  private async buildFullReportDTO(
    reportBase: Report,
    vessel: Vessel,
    captain: User,
    departureReport: Report | null,
    engineUnits: EngineUnitData[],
    auxEngines: AuxEngineData[]
  ): Promise<FullReportViewDTO> {
    // Extract DTO building logic
  }
}
```

#### 2.4 Create `report-resubmission.service.ts`
```typescript
export class ReportResubmissionService {
  constructor(
    private robCalculator: RobCalculator,
    private cargoCalculator: CargoCalculator
  ) {}

  async resubmitReport(
    reportId: string,
    captainId: string,
    changes: Partial<CreateReportDTO>
  ): Promise<FullReportViewDTO> {
    // Extract resubmission logic
    // Handle ROB recalculation
    // Handle cargo recalculation for berth
  }

  private async recalculateMetrics(
    report: Report,
    changes: Partial<CreateReportDTO>
  ): Promise<RecalculatedMetrics> {
    // Extract recalculation logic
  }
}
```

### Step 3: Create Main Facade

#### 3.1 Create `report/index.ts`
```typescript
// Main facade that maintains the existing API
export class ReportService {
  private submissionService: ReportSubmissionService;
  private reviewService: ReportReviewService;
  private queryService: ReportQueryService;
  private resubmissionService: ReportResubmissionService;

  constructor() {
    // Initialize all services with dependencies
  }

  // Delegate to appropriate services
  async submitReport(reportInput: CreateReportDTO, captainId: string): Promise<Report> {
    return this.submissionService.submitReport(reportInput, captainId);
  }

  async getReportById(id: string): Promise<FullReportViewDTO> {
    return this.queryService.getReportById(id);
  }

  async reviewReport(id: string, reviewData: ReviewReportDTO, reviewerId: string): Promise<FullReportViewDTO> {
    return this.reviewService.reviewReport(id, reviewData, reviewerId);
  }

  async resubmitReport(reportId: string, captainId: string, changes: Partial<CreateReportDTO>): Promise<FullReportViewDTO> {
    return this.resubmissionService.resubmitReport(reportId, captainId, changes);
  }

  // ... other delegated methods
}

// Export singleton instance to maintain compatibility
export const reportService = new ReportService();
```

## Implementation Strategy

### Phase 1: Create Helper Modules (Week 1)
1. Create the `helpers/` directory structure
2. Extract and test each helper module independently
3. Ensure all calculations remain consistent

### Phase 2: Create Service Modules (Week 2)
1. Create service modules one by one
2. Start with `report-query.service.ts` (least complex)
3. Move to `report-review.service.ts`
4. Then `report-resubmission.service.ts`
5. Finally tackle `report-submission.service.ts`

### Phase 3: Integration and Testing (Week 3)
1. Create the main facade
2. Update imports in controllers
3. Run comprehensive tests
4. Performance testing to ensure no regression

## Benefits

1. **Maintainability**: Each module has a single, clear responsibility
2. **Testability**: Smaller units are easier to test in isolation
3. **Reusability**: Helper modules can be reused across services
4. **Readability**: Developers can understand each module without context switching
5. **Scalability**: New features can be added to specific modules without affecting others

## Metrics for Success

- [ ] No single file exceeds 300 lines
- [ ] Each function is under 50 lines
- [ ] 90%+ test coverage for each module
- [ ] No performance regression
- [ ] All existing functionality preserved

## Risk Mitigation

1. **Incremental Refactoring**: Refactor one module at a time
2. **Comprehensive Testing**: Write tests before refactoring
3. **Feature Flags**: Use feature flags to switch between old and new implementations
4. **Code Reviews**: Each refactored module should be reviewed thoroughly
5. **Rollback Plan**: Keep the old service available until fully migrated

## Next Steps

1. Review and approve this plan
2. Set up the new directory structure
3. Begin with Phase 1 helper modules
4. Create unit tests for existing functionality
5. Start incremental refactoring