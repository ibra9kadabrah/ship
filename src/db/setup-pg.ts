import pool from './connection';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function setupDatabase(): Promise<void> {
  console.log('Setting up PostgreSQL database schema...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create schema
    await client.query('CREATE SCHEMA IF NOT EXISTS mrv_app');
    await client.query('SET search_path TO mrv_app');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'captain', 'office')),
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        isActive BOOLEAN NOT NULL DEFAULT true
      )
    `);

    // Create vessels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vessels (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        flag VARCHAR(255) NOT NULL,
        imoNumber VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(255) NOT NULL,
        deadweight REAL NOT NULL,
        captainId UUID,
        initialRobLsifo REAL,
        initialRobLsmgo REAL,
        initialRobCylOil REAL,
        initialRobMeOil REAL,
        initialRobAeOil REAL,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        isActive BOOLEAN NOT NULL DEFAULT true,
        FOREIGN KEY (captainId) REFERENCES users(id)
      )
    `);

    // Create voyages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS voyages (
        id UUID PRIMARY KEY,
        vesselId UUID NOT NULL,
        voyageNumber VARCHAR(255) NOT NULL,
        departurePort VARCHAR(255) NOT NULL,
        destinationPort VARCHAR(255) NOT NULL,
        voyageDistance REAL NOT NULL,
        startDate TIMESTAMPTZ NOT NULL,
        status VARCHAR(50) NOT NULL CHECK(status IN ('active', 'completed')),
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (vesselId) REFERENCES vessels(id)
      )
    `);

    // Create reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY,
        voyageId UUID,
        vesselId UUID NOT NULL,
        reportType VARCHAR(50) NOT NULL CHECK(reportType IN ('departure', 'noon', 'arrival', 'berth', 'arrival_anchor_noon')),
        status VARCHAR(50) NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'changes_requested')),
        captainId UUID NOT NULL,
        reviewerId UUID,
        reviewDate TIMESTAMPTZ,
        reviewComments TEXT,
        modification_checklist TEXT,
        requested_changes_comment TEXT,
        reportDate TIMESTAMPTZ NOT NULL,
        reportTime TIME NOT NULL,
        timeZone VARCHAR(50) NOT NULL,
        departurePort VARCHAR(255),
        destinationPort VARCHAR(255),
        voyageDistance REAL,
        etaDate DATE,
        etaTime TIME,
        fwdDraft REAL,
        aftDraft REAL,
        cargoQuantity REAL,
        cargoType VARCHAR(255),
        cargoStatus VARCHAR(50) CHECK(cargoStatus IN ('Loaded', 'Empty')),
        faspDate DATE,
        faspTime TIME,
        faspLatDeg INTEGER,
        faspLatMin REAL,
        faspLatDir CHAR(1) CHECK(faspLatDir IN ('N', 'S')),
        faspLonDeg INTEGER,
        faspLonMin REAL,
        faspLonDir CHAR(1) CHECK(faspLonDir IN ('E', 'W')),
        faspCourse REAL,
        harbourDistance REAL,
        harbourTime INTERVAL,
        distanceSinceLastReport REAL,
        totalDistanceTravelled REAL,
        distanceToGo REAL,
        windDirection VARCHAR(2),
        seaDirection VARCHAR(2),
        swellDirection VARCHAR(2),
        windForce INTEGER,
        seaState INTEGER,
        swellHeight INTEGER,
        meConsumptionLsifo REAL,
        meConsumptionLsmgo REAL,
        meConsumptionCylOil REAL,
        meConsumptionMeOil REAL,
        meConsumptionAeOil REAL,
        boilerConsumptionLsifo REAL,
        boilerConsumptionLsmgo REAL,
        auxConsumptionLsifo REAL,
        auxConsumptionLsmgo REAL,
        supplyLsifo REAL,
        supplyLsmgo REAL,
        supplyCylOil REAL,
        supplyMeOil REAL,
        supplyAeOil REAL,
        totalConsumptionLsifo REAL,
        totalConsumptionLsmgo REAL,
        totalConsumptionCylOil REAL,
        totalConsumptionMeOil REAL,
        totalConsumptionAeOil REAL,
        currentRobLsifo REAL,
        currentRobLsmgo REAL,
        currentRobCylOil REAL,
        currentRobMeOil REAL,
        currentRobAeOil REAL,
        initialRobLsifo REAL,
        initialRobLsmgo REAL,
        initialRobCylOil REAL,
        initialRobMeOil REAL,
        initialRobAeOil REAL,
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
        mePresentRpm REAL,
        meCurrentSpeed REAL,
        sailingTimeVoyage REAL,
        avgSpeedVoyage REAL,
        passageState VARCHAR(50) CHECK(passageState IN ('NOON', 'SOSP', 'ROSP')),
        noonDate DATE,
        noonTime TIME,
        noonLatDeg INTEGER,
        noonLatMin REAL,
        noonLatDir CHAR(1) CHECK(noonLatDir IN ('N', 'S')),
        noonLonDeg INTEGER,
        noonLonMin REAL,
        noonLonDir CHAR(1) CHECK(noonLonDir IN ('E', 'W')),
        noonCourse REAL,
        sospDate DATE,
        sospTime TIME,
        sospLatDeg INTEGER,
        sospLatMin REAL,
        sospLatDir CHAR(1) CHECK(sospLatDir IN ('N', 'S')),
        sospLonDeg INTEGER,
        sospLonMin REAL,
        sospLonDir CHAR(1) CHECK(sospLonDir IN ('E', 'W')),
        sospCourse REAL,
        rospDate DATE,
        rospTime TIME,
        rospLatDeg INTEGER,
        rospLatMin REAL,
        rospLatDir CHAR(1) CHECK(rospLatDir IN ('N', 'S')),
        rospLonDeg INTEGER,
        rospLonMin REAL,
        rospLonDir CHAR(1) CHECK(rospLonDir IN ('E', 'W')),
        rospCourse REAL,
        eospDate DATE,
        eospTime TIME,
        eospLatDeg INTEGER,
        eospLatMin REAL,
        eospLatDir CHAR(1) CHECK(eospLatDir IN ('N', 'S')),
        eospLonDeg INTEGER,
        eospLonMin REAL,
        eospLonDir CHAR(1) CHECK(eospLonDir IN ('E', 'W')),
        eospCourse REAL,
        estimatedBerthingDate DATE,
        estimatedBerthingTime TIME,
        berthDate DATE,
        berthTime TIME,
        berthLatDeg INTEGER,
        berthLatMin REAL,
        berthLatDir CHAR(1) CHECK(berthLatDir IN ('N', 'S')),
        berthLonDeg INTEGER,
        berthLonMin REAL,
        berthLonDir CHAR(1) CHECK(berthLonDir IN ('E', 'W')),
        cargoLoaded REAL,
        cargoUnloaded REAL,
        cargoOpsStartDate DATE,
        cargoOpsStartTime TIME,
        cargoOpsEndDate DATE,
        cargoOpsEndTime TIME,
        berthNumber VARCHAR(255),
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (voyageId) REFERENCES voyages(id),
        FOREIGN KEY (vesselId) REFERENCES vessels(id),
        FOREIGN KEY (captainId) REFERENCES users(id),
        FOREIGN KEY (reviewerId) REFERENCES users(id)
      )
    `);

    // Create report_engine_units table
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_engine_units (
        id UUID PRIMARY KEY,
        reportId UUID NOT NULL,
        unitNumber INTEGER NOT NULL,
        exhaustTemp REAL,
        underPistonAir REAL,
        pcoOutletTemp REAL,
        jcfwOutletTemp REAL,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (reportId) REFERENCES reports(id) ON DELETE CASCADE,
        UNIQUE (reportId, unitNumber)
      )
    `);

    // Create report_aux_engines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_aux_engines (
        id UUID PRIMARY KEY,
        reportId UUID NOT NULL,
        engineName VARCHAR(255) NOT NULL,
        load REAL,
        kw REAL,
        foPress REAL,
        lubOilPress REAL,
        waterTemp REAL,
        dailyRunHour REAL,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updatedAt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (reportId) REFERENCES reports(id) ON DELETE CASCADE,
        UNIQUE (reportId, engineName)
      )
    `);

    // Seed or update initial admin user
    const res = await client.query('SELECT id, isActive FROM users WHERE username = $1', ['admin']);
    const hashedPassword = bcrypt.hashSync('ak-admin-123000', 10);

    if (res.rows.length > 0) {
      // Admin user exists, ensure they are active and password is correct
      const admin = res.rows[0];
      console.log(`Admin user found (ID: ${admin.id}, Active: ${admin.isActive}). Ensuring user is active and password is set.`);
      await client.query(
        `UPDATE users SET password = $1, isActive = true, updatedAt = NOW() WHERE id = $2`,
        [hashedPassword, admin.id]
      );
      console.log('Default admin user updated successfully.');
    } else {
      // Admin user does not exist, create them
      console.log('Admin user not found, creating default admin...');
      const adminId = uuidv4();
      await client.query(
        `INSERT INTO users (id, username, password, name, role, isActive)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [adminId, 'admin', hashedPassword, 'Admin User', 'admin', true]
      );
      console.log('Default admin user created successfully.');
    }

    await client.query('COMMIT');
    console.log('Database schema setup and initial data seeding complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up database:', error);
  } finally {
    client.release();
    console.log('Database setup script finished.');
  }
}

setupDatabase();

export default setupDatabase;