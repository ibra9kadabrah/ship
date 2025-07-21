# Project Overview

This document provides a detailed overview of the project's architecture, purpose, and file interactions.

## 1. High-Level Summary

The project is a **MRV (Monitoring, Reporting, and Verification) Ship Reporting System**. It appears to be a full-stack web application designed for collecting and managing data related to ship voyages and operations, likely for regulatory compliance with environmental standards.

The system consists of:
- A **backend server** built with Node.js and TypeScript.
- A **PostgreSQL database** for data persistence.
- A **frontend web application** built with React.
- The application is containerized using **Docker** for deployment.

## 2. Backend (Root Directory)

The backend is a Node.js application written in TypeScript, located in the project's root and `src` directory.

### 2.1. Key Technologies & Libraries

Based on `package.json`, the core technologies are:
- **Web Framework:** Express.js
- **Database:** PostgreSQL (using the `pg` library)
- **Authentication:** JSON Web Tokens (JWT) for securing endpoints.
- **Password Hashing:** `bcryptjs` is used to hash user passwords.
- **Excel Generation:** `exceljs` is used for exporting data, likely reports.
- **Development:** `nodemon` for live-reloading and `ts-node` for running TypeScript directly.
- **Testing:** Jest is the testing framework.

### 2.2. Scripts

- `dev`: Runs the backend in development mode.
- `build`: Compiles TypeScript to JavaScript for production.
- `start`: Starts the production server from the compiled code.
- `db:setup:pg`: Executes a script to initialize the PostgreSQL database schema.

### 2.3. Docker & Deployment

The application is designed to be deployed using Docker.

- **Dockerfile**: The `Dockerfile` sets up a Node.js 18 environment. It installs dependencies, compiles the TypeScript code, and sets up an entrypoint script.
- **entrypoint.sh**: This script is executed when the Docker container starts. It first runs the database setup script (`npm run db:setup:pg`) to ensure the database is ready, and then it starts the Node.js application.
- **Configuration**: The application is configured to run on port 3000 and expects a `JWT_SECRET` to be provided as an environment variable in the deployment environment.

### 2.4. Database Schema

The database schema is defined in `src/db/setup-pg.ts`. It creates a schema named `mrv_app` and the following tables:

- **users**: Stores user information, including credentials and roles (admin, captain, office).
- **vessels**: Contains details about each ship, such as its name, IMO number, and the captain assigned to it.
- **voyages**: Tracks voyage information, including departure and destination ports, and the vessel undertaking the voyage.
- **reports**: This is the core table, storing the data from various types of reports (departure, noon, arrival, etc.). It has a large number of columns to capture all the required data points for MRV reporting.
- **report_engine_units**: A related table to `reports`, storing detailed engine metrics for each report.
- **report_aux_engines**: Another related table to `reports`, storing metrics for auxiliary engines.

The script also seeds an initial admin user with a default password.

### 2.5. Data Models

The `src/models` directory contains data access objects (DAOs) that provide an abstraction layer for the database. Each model corresponds to a database table and handles all CRUD (Create, Read, Update, Delete) operations.

- **`user.model.ts`**: Manages user data, including password hashing with `bcryptjs` and credential verification.
- **`vessel.model.ts`**: Handles operations related to vessels.
- **`voyage.model.ts`**: Manages voyage data, including the creation and completion of voyages.
- **`report.model.ts`**: A large and central model that manages all aspects of report data. It includes complex logic for creating, retrieving, and updating reports based on their type and status.
- **`report_engine_unit.model.ts` & `report_aux_engine.model.ts`**: These models handle the storage and retrieval of detailed engine metrics, which are linked to the main `reports` table.

These models encapsulate all direct database interactions, ensuring that the rest of the application (services and controllers) is decoupled from the database implementation.

### 2.6. Business Logic (Services)

The `src/services` directory contains the core business logic of the application. It is well-structured, with a clear separation of concerns.

- **`report/` subdirectory**: This is the heart of the application's logic, handling all aspects of report management. It's broken down into:
    - **`report-submission.service.ts`**: Manages the submission of new reports.
    - **`report-review.service.ts`**: Handles the approval/rejection of reports.
    - **`report-query.service.ts`**: Fetches report data.
    - **`report-resubmission.service.ts`**: Manages the resubmission of rejected reports.
    - **`helpers/`**: A collection of modules for specific calculations (bunker, distance, cargo, etc.), which promotes code reuse and clarity.
    - **`index.ts`**: Exports a `ReportServiceFacade` to provide a unified interface to the report-related services.

- **`voyage.service.ts`** and **`voyage_lifecycle.service.ts`**: These services manage the state of voyages, from creation to completion, based on the reports submitted.

- **`excel_export.service.ts`** and **`excel_data_aggregation.service.ts`**: These services work together to generate Excel reports. The aggregation service prepares the data, and the export service creates the Excel file.

- **`report_modification.service.ts`** and **`cascade_calculator.service.ts`**: These services implement a critical feature for data integrity: the ability to modify an approved report and have the changes automatically cascade to all subsequent reports in the same voyage.

### 2.7. API Layer (Controllers)

The `src/controllers` directory contains the API layer of the application. These controllers are responsible for handling incoming HTTP requests, calling the appropriate services, and sending back responses.

- **`auth.controller.ts`**: Manages user authentication, including registration, login, and user management.
- **`vessel.controller.ts`**: Handles CRUD operations for vessels.
- **`voyage.controller.ts`**: Provides endpoints for fetching details about the current voyage.
- **`report.controller.ts`**: A central controller for all report-related actions, such as submitting, reviewing, and fetching reports.
- **`report_modification.controller.ts`**: Exposes endpoints for the report modification and cascade functionality.
- **`debug.controller.ts`** and **`debug-utils.ts`**: Provide utilities and endpoints for debugging.

The controllers effectively connect the HTTP layer with the service layer, maintaining a clean architecture.

### 2.8. API Endpoints (Routes)

The `src/routes` directory defines the API endpoints. It maps HTTP requests to the appropriate controller functions and uses middleware for authentication and authorization.

- **`auth.routes.ts`**: Handles authentication-related endpoints like `/login` and `/register`.
- **`vessel.routes.ts`**: Defines CRUD endpoints for vessels.
- **`voyage.routes.ts`**: Provides endpoints for fetching voyage information.
- **`report.routes.ts`**: A comprehensive set of routes for all report-related actions, including submission, review, and modification.
- **`debug.routes.ts`**: Contains endpoints for debugging purposes.

The routing is well-structured and follows RESTful conventions.

### 2.9. Testing Setup

The project includes a comprehensive testing setup built around Jest and TypeScript, with a focus on regulatory compliance and calculation accuracy.

#### 2.9.1. Test Framework & Configuration

- **Framework**: Jest with `ts-jest` preset for TypeScript support
- **Environment**: Node.js test environment
- **Timeout**: 30 seconds for integration tests that may hit the database
- **Coverage**: Configurable coverage collection with strict thresholds for critical modules

#### 2.9.2. Test Scripts

- `npm test`: Run all tests
- `npm run test:watch`: Run tests in watch mode during development
- `npm run test:coverage`: Generate coverage reports (HTML, LCOV, and text formats)
- `npm run test:calc`: Run only calculation-specific tests

#### 2.9.3. Test Structure

The tests are organized into two main categories:

**Unit Tests** (`tests/unit/`):
- Focus on calculation modules critical for MRV regulatory compliance
- High coverage requirements (90-100% for calculation functions)
- Include comprehensive edge case testing (null values, zero division, boundary conditions)
- Located primarily in `tests/unit/calculations/`

**Integration Tests** (`tests/integration/`):
- Test complete voyage workflows and data flow between modules
- Validate end-to-end report submission and processing scenarios
- Test real-world data patterns and dependencies

#### 2.9.4. Coverage Requirements

The system enforces strict coverage thresholds, especially for calculation modules:

- **Global minimum**: 80% across all metrics (branches, functions, lines, statements)
- **Bunker Calculator**: 95% coverage (100% function coverage required)
- **Distance Calculator**: 95% coverage (100% function coverage required)
- **Cargo Calculator**: 90% coverage (95% function coverage required)

These high standards ensure accuracy in calculations subject to regulatory oversight.

#### 2.9.5. Test Infrastructure

- **Setup File** (`tests/setup.ts`): Global test configuration, console mocking, and custom matchers
- **Fixtures** (`tests/fixtures/`): Centralized test data including mock vessels, reports, and edge cases
- **Mocks** (`tests/mocks/`): Database connection mocks to ensure isolated unit testing
- **Custom Matchers**: `toBeCloseToNumber()` for floating-point calculation comparisons

#### 2.9.6. Key Features

- **Regulatory Focus**: All calculation tests ensure MRV compliance accuracy
- **Database Isolation**: Unit tests use mocked database connections for speed and reliability
- **Edge Case Coverage**: Comprehensive testing of error conditions and boundary values
- **Real-world Scenarios**: Integration tests simulate complete voyage workflows
- **Automated Mocking**: Console methods are mocked to reduce test output noise

## 3. Frontend

The `frontend` directory contains a single-page application (SPA) built with React.

### 3.1. Key Technologies & Libraries

Based on `frontend/package.json`, the core technologies are:
- **Framework:** React
- **Build Tool:** Vite
- **HTTP Client:** Axios
- **Routing:** React Router
- **Styling:** Tailwind CSS
- **Linting:** ESLint

### 3.2. Scripts

- `dev`: Runs the frontend in development mode.
- `build`: Builds the frontend for production.
- `lint`: Lints the frontend code.
- `preview`: Previews the production build.

### 3.3. Frontend Architecture

The frontend is a React application with a clear and organized structure.

- **`main.tsx`**: The entry point of the application. It sets up the React application and wraps it with an `AuthProvider` to manage authentication state.
- **`App.tsx`**: Defines the application's routing using `react-router-dom`. It uses protected routes to control access to different parts of the application based on user roles (admin, captain, office).
- **`contexts/AuthContext.tsx`**: Provides authentication state (user, token) to the entire application.
- **`layouts/`**: Contains layout components (`CaptainLayout`, `OfficeLayout`) that provide a consistent structure for different sections of the application.
- **`pages/`**: Contains the main pages of the application, such as dashboards and report management pages.
- **`components/`**: Contains reusable UI components, including forms for submitting reports.
- **`services/api.ts`**: A dedicated module for making API calls to the backend, likely using Axios. This centralizes API interaction and makes the code easier to maintain.

### 3.4. User Roles & Features

The frontend is designed to support three distinct user roles, each with a specific set of features:

- **Admin**:
    - **User Management**: Admins can add new captain and office users to the system.
    - **Vessel Management**: Admins can add new vessels to the system.
    - **Report History**: Admins have access to the complete history of all reports.

- **Captain**:
    - **Dashboard**: Captains have a dashboard that displays the current status of their assigned vessel's voyage.
    - **Report Submission**: Captains can submit various types of reports (Departure, Noon, Arrival, etc.) through dedicated forms.
    - **Report History**: Captains can view the history of their own submitted reports.
    - **Report Modification**: Captains can modify and resubmit reports that have been sent back by the office with requested changes.

- **Office**:
    - **Pending Reports**: Office users can view a list of all pending reports that require their review.
    - **Report Review**: Office users can review individual reports and either approve, reject, or request changes.
    - **Report History**: Office users have access to the complete history of all approved reports.
    - **Report Management**: Office users can modify approved reports, which triggers the backend's cascade functionality to ensure data consistency.

