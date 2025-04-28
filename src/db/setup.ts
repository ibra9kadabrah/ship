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
      reportDate TEXT NOT NULL,
      reportTime TEXT NOT NULL,
      timeZone TEXT NOT NULL,
      
      -- Voyage data 
      departurePort TEXT,
      destinationPort TEXT,
      voyageDistance REAL,
      etaDate TEXT,
      etaTime TEXT,
      
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      
      FOREIGN KEY (voyageId) REFERENCES voyages(id),
      FOREIGN KEY (vesselId) REFERENCES vessels(id),
      FOREIGN KEY (captainId) REFERENCES users(id),
      FOREIGN KEY (reviewerId) REFERENCES users(id)
    )
  `);
  console.log('Database schema setup complete.');
}

// Call this function to initialize the database
if (require.main === module) {
  setupDatabase();
}

export default setupDatabase;