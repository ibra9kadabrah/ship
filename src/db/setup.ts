import db from './connection';

// Function to set up the database schema
export function setupDatabase(): void {
  console.log('Setting up database schema...');
  
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'captain', 'office')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1
    )
  `);
  
  // Create vessels table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vessels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      flag TEXT NOT NULL,
      imoNumber TEXT UNIQUE NOT NULL,
      deadweight REAL NOT NULL,
      captainId TEXT,
      -- Initial ROB (Set only once on first departure report)
      initialRobLsifo REAL,
      initialRobLsmgo REAL,
      initialRobCylOil REAL,
      initialRobMeOil REAL,
      initialRobAeOil REAL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (captainId) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS voyages (
      id TEXT PRIMARY KEY,
      vesselId TEXT NOT NULL,
      voyageNumber TEXT NOT NULL,
      departurePort TEXT NOT NULL,
      destinationPort TEXT NOT NULL,
      voyageDistance REAL NOT NULL,
      startDate TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('active', 'completed')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (vesselId) REFERENCES vessels(id)
    )
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      voyageId TEXT NOT NULL,
      vesselId TEXT NOT NULL,
      reportType TEXT NOT NULL CHECK(reportType IN ('departure', 'noon', 'arrival', 'berth')),
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
      captainId TEXT NOT NULL,
      reviewerId TEXT,
      reviewDate TEXT,
      reviewComments TEXT,
      
      -- General information
      reportDate TEXT NOT NULL, -- Already NOT NULL
      reportTime TEXT NOT NULL, -- Already NOT NULL
      timeZone TEXT NOT NULL, -- Already NOT NULL
      
      -- Voyage data 
      departurePort TEXT,
      destinationPort TEXT,
      voyageDistance REAL,
      etaDate TEXT,
      etaTime TEXT,
      fwdDraft REAL NULL, -- Added Draft
      aftDraft REAL NULL, -- Added Draft

      -- Cargo information (optional, primarily for departure/arrival)
      cargoQuantity REAL,
      cargoType TEXT,
      cargoStatus TEXT CHECK(cargoStatus IN ('Loaded', 'Empty')),

      -- FASP Data (optional)
      faspDate TEXT,
      faspTime TEXT,
      faspLatitude REAL,
      faspLongitude REAL,
      faspCourse REAL,

      -- Distance Data (optional, but required input for departure)
      harbourDistance REAL,
      harbourTime TEXT, -- Format HH:MM
      distanceSinceLastReport REAL,
      totalDistanceTravelled REAL, -- Calculated
      distanceToGo REAL, -- Calculated

      -- Weather Data (optional)
      windDirection TEXT CHECK(windDirection IN ('N', 'NE', 'NW', 'E', 'SE', 'S', 'W', 'SW')),
      seaDirection TEXT CHECK(seaDirection IN ('N', 'NE', 'NW', 'E', 'SE', 'S', 'W', 'SW')),
      swellDirection TEXT CHECK(swellDirection IN ('N', 'NE', 'NW', 'E', 'SE', 'S', 'W', 'SW')),
      windForce INTEGER CHECK(windForce BETWEEN 0 AND 12),
      seaState INTEGER CHECK(seaState BETWEEN 0 AND 9),
      swellHeight INTEGER CHECK(swellHeight BETWEEN 0 AND 9), -- In meters

      -- Bunker Data: Consumption Inputs (optional)
      meConsumptionLsifo REAL,
      meConsumptionLsmgo REAL,
      meConsumptionCylOil REAL,
      meConsumptionMeOil REAL,
      meConsumptionAeOil REAL,
      boilerConsumptionLsifo REAL,
      boilerConsumptionLsmgo REAL,
      auxConsumptionLsifo REAL,
      auxConsumptionLsmgo REAL,

      -- Bunker Data: Supply Inputs (optional)
      supplyLsifo REAL,
      supplyLsmgo REAL,
      supplyCylOil REAL,
      supplyMeOil REAL,
      supplyAeOil REAL,

      -- Bunker Data: Calculated Total Consumptions (optional)
      totalConsumptionLsifo REAL,
      totalConsumptionLsmgo REAL,
      totalConsumptionCylOil REAL,
      totalConsumptionMeOil REAL,
      totalConsumptionAeOil REAL,

      -- Bunker Data: Calculated Current ROBs (optional)
      currentRobLsifo REAL,
      currentRobLsmgo REAL,
      currentRobCylOil REAL,
      currentRobMeOil REAL,
      currentRobAeOil REAL,

      -- Machinery Data: Main Engine Parameters (optional)
      meFoPressure REAL,
      meLubOilPressure REAL,
      meFwInletTemp REAL,
      meLoInletTemp REAL,
      meScavengeAirTemp REAL,
      meTcRpm1 REAL,
      meTcRpm2 REAL,
      meTcExhaustTempIn REAL,
      meTcExhaustTempOut REAL,
      meThrustBearingTemp REAL,
      meDailyRunHours REAL,

      -- Noon Report Specific Fields
      passageState TEXT CHECK(passageState IN ('NOON', 'SOSP', 'ROSP')),
      noonDate TEXT,
      noonTime TEXT,
      noonLatitude REAL,
      noonLongitude REAL,
      sospDate TEXT,
      sospTime TEXT,
      sospLatitude REAL,
      sospLongitude REAL,
      rospDate TEXT,
      rospTime TEXT,
      rospLatitude REAL,
      rospLongitude REAL,

      -- Arrival Report Specific Fields
      eospDate TEXT,
      eospTime TEXT,
      eospLatitude REAL,
      eospLongitude REAL,
      eospCourse REAL,
      estimatedBerthingDate TEXT,
      estimatedBerthingTime TEXT,

      -- Berth Report Specific Fields
      berthDate TEXT,
      berthTime TEXT,
      berthLatitude REAL,
      berthLongitude REAL,
      cargoLoaded REAL,
      cargoUnloaded REAL,
      -- cargoQuantity REAL, -- Already exists
      cargoOpsStartDate TEXT,
      cargoOpsStartTime TEXT,
      cargoOpsEndDate TEXT,
      cargoOpsEndTime TEXT,
      
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      
      FOREIGN KEY (voyageId) REFERENCES voyages(id),
      FOREIGN KEY (vesselId) REFERENCES vessels(id),
      FOREIGN KEY (captainId) REFERENCES users(id),
      FOREIGN KEY (reviewerId) REFERENCES users(id)
    )
  `);

  // Create report_engine_units table
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_engine_units (
      id TEXT PRIMARY KEY,
      reportId TEXT NOT NULL,
      unitNumber INTEGER NOT NULL, -- 1-8
      exhaustTemp REAL NULL,
      underPistonAir REAL NULL,
      pcoOutletTemp REAL NULL,
      jcfwOutletTemp REAL NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (reportId) REFERENCES reports(id) ON DELETE CASCADE,
      UNIQUE (reportId, unitNumber)
    )
  `);

  // Create report_aux_engines table
  db.exec(`
    CREATE TABLE IF NOT EXISTS report_aux_engines (
      id TEXT PRIMARY KEY,
      reportId TEXT NOT NULL,
      engineName TEXT NOT NULL, -- e.g., 'DG1', 'DG2', 'DG3', 'V1'
      load REAL NULL,
      kw REAL NULL,
      foPress REAL NULL,
      lubOilPress REAL NULL,
      waterTemp REAL NULL,
      dailyRunHour REAL NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (reportId) REFERENCES reports(id) ON DELETE CASCADE,
      UNIQUE (reportId, engineName)
    )
  `);

  console.log('Database schema setup complete.');
}

// Call this function to initialize the database
if (require.main === module) {
  setupDatabase();
}

export default setupDatabase;
