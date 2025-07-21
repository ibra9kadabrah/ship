# MRV Ship Reporting System - Test Suite

This directory contains comprehensive tests for the MRV Ship Reporting System, focusing on calculation modules that are critical for regulatory compliance.

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration
├── fixtures/                   # Test data and helpers
│   └── test-data.ts            # Mock vessels, reports, and test helpers
├── mocks/                      # Mock implementations
│   └── database.mock.ts        # Database connection and query mocks
├── unit/                       # Unit tests
│   └── calculations/           # Calculation module tests
│       ├── bunker-calculator.test.ts
│       ├── distance-calculator.test.ts
│       ├── cargo-calculator.test.ts
│       ├── performance-calculator.test.ts
│       └── rob-calculator.test.ts
└── integration/                # Integration tests
    └── report-workflow.test.ts # End-to-end workflow testing
```

## Test Categories

### Unit Tests (High Coverage Requirements)

**Bunker Calculator** (`bunker-calculator.test.ts`)
- Tests fuel consumption calculations (ME + Boiler + Auxiliary)
- Tests ROB calculations with various supply scenarios
- Handles null/undefined inputs and edge cases
- **Coverage Target: 95%**

**Distance Calculator** (`distance-calculator.test.ts`)
- Tests distance calculations for all report types
- Tests cumulative distance tracking across reports
- Tests distance-to-go calculations with voyage completion
- **Coverage Target: 95%**

**Cargo Calculator** (`cargo-calculator.test.ts`)
- Tests cargo capacity validation against vessel deadweight
- Tests complex multi-berth cargo quantity calculations
- Tests resubmission scenarios with cargo changes
- **Coverage Target: 90%**

**Performance Calculator** (`performance-calculator.test.ts`)
- Tests sailing time accumulation (excluding berth reports)
- Tests average speed calculations with zero-division protection
- Tests edge cases with null/undefined values

**ROB Calculator** (`rob-calculator.test.ts`)
- Tests ROB determination for first-ever vessel reports
- Tests complex departure vs non-departure logic
- Tests integration with previous voyage states

### Integration Tests

**Report Workflow** (`report-workflow.test.ts`)
- Tests complete voyage workflows (departure → noon → berth → arrival)
- Tests calculation dependencies and data flow
- Tests error handling across modules
- Tests real-world scenarios with multiple report types

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run only calculation tests
npm run test:calc
```

## Test Configuration

- **Framework**: Jest with ts-jest for TypeScript support
- **Timeout**: 30 seconds (for potential database integration tests)
- **Mocking**: Automatic mocking of database connections and external dependencies
- **Custom Matchers**: `toBeCloseToNumber()` for floating-point calculations

## Coverage Targets

| Module | Branches | Functions | Lines | Statements |
|--------|----------|-----------|-------|------------|
| Global | 80% | 80% | 80% | 80% |
| Bunker Calculator | 95% | 100% | 95% | 95% |
| Distance Calculator | 95% | 100% | 95% | 95% |
| Cargo Calculator | 90% | 95% | 90% | 90% |

## Key Features

### Regulatory Compliance Focus
All calculation tests are designed to ensure accuracy in MRV (Monitoring, Reporting, and Verification) calculations that are subject to regulatory requirements.

### Edge Case Handling
Comprehensive testing of null/undefined inputs, zero values, negative numbers, and boundary conditions that could occur in real vessel operations.

### Database Isolation
Unit tests use mocked database connections to ensure fast, isolated testing without dependencies on actual database state.

### Real-world Scenarios
Integration tests simulate complete voyage workflows with realistic data flows and dependencies between calculation modules.

## Writing New Tests

When adding new calculation functions:

1. **Create unit tests** in the appropriate `tests/unit/calculations/` file
2. **Add test fixtures** in `tests/fixtures/test-data.ts` if needed
3. **Update integration tests** if the new function affects report workflows
4. **Maintain high coverage** (aim for 95%+ on calculation modules)
5. **Test edge cases** thoroughly, especially null/undefined/zero values

## Test Data

The `tests/fixtures/test-data.ts` file contains:
- Mock vessel configurations
- Sample report data for all report types
- Helper functions for creating test inputs
- Edge case scenarios (low deadweight, null values, etc.)

This centralized approach ensures consistent test data across all test files and makes maintenance easier.