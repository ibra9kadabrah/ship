# Dockerization Plan for Backend Deployment on Render

**Overall Goal:** Create a reliable and reproducible deployment environment for the Node.js backend using Docker, targeting Render as the deployment platform. This plan assumes the project is currently at the state of commit `57535bd9fdeabd8ba9401355e5deb38c8ac21eab`.

**Phase 1: Local Project Adjustments (Prerequisites for Dockerfile)**

*   **Step 1.1: Modify `package.json` for Compatibility.**
    *   **Objective:** Use package versions known for wider compatibility or those that avoid native compilation issues.
    *   **Action:**
        1.  Change `better-sqlite3` from `^9.1.1` to `~8.5.0`.
        2.  Replace `bcrypt` (`^5.1.1`) with `bcryptjs` (`^2.4.3`).
        3.  Remove `@types/bcrypt` from `devDependencies`.
        4.  Add `@types/bcryptjs` (`^2.4.6` or latest) to `devDependencies`.
        5.  Ensure `@types/uuid` (`^9.0.7`) is in `devDependencies`.
    *   **Local Verification:** After these `package.json` changes, locally run:
        1.  `rm -rf node_modules package-lock.json`
        2.  `npm install`
        3.  Verify the application still runs locally (`npm run dev`).

*   **Step 1.2: Update Code to Use `bcryptjs`.**
    *   **Action:**
        1.  In `src/models/user.model.ts`, change `import bcrypt from 'bcrypt';` to `import bcrypt from 'bcryptjs';`.

*   **Step 1.3: Modify `src/db/connection.ts` for Configurable Database Path.**
    *   **Action:**
        ```typescript
        // src/db/connection.ts
        import Database from 'better-sqlite3';
        import path from 'path';
        import fs from 'fs';

        const projectRoot = path.resolve(__dirname, '../../');
        const defaultDbPath = path.join(projectRoot, 'database.sqlite');
        const dbPathFromEnv = process.env.DATABASE_PATH;
        let dbPathToUse = dbPathFromEnv || defaultDbPath;

        if (dbPathFromEnv) {
            const dbDir = path.dirname(dbPathFromEnv);
            if (!fs.existsSync(dbDir)) {
                console.log(`[DB] Creating directory for database: ${dbDir}`);
                fs.mkdirSync(dbDir, { recursive: true });
            }
        }
        
        console.log(`[DB] Using database at: ${dbPathToUse}`);
        const db = new Database(dbPathToUse, { verbose: console.log });

        export default db;
        ```

*   **Step 1.4: Commit all local changes.**
    *   Commit updated `package.json`, new `package-lock.json`, `src/models/user.model.ts`, `src/db/connection.ts`.

**Phase 2: Docker Configuration**

*   **Step 2.1: Create `.dockerignore` file.**
    *   **Action:** Create `.dockerignore` in project root:
        ```
        node_modules
        npm-debug.log
        dist
        coverage
        .git
        .gitignore
        .vscode
        frontend
        *.env
        ```

*   **Step 2.2: Create `Dockerfile` (Simplified Single-Stage).**
    *   **Action:** Create `Dockerfile` in project root:
        ```dockerfile
        # Use Node 18 LTS based on Debian Bookworm
        FROM node:18-bookworm
        WORKDIR /usr/src/app

        # Copy package.json and package-lock.json
        COPY package*.json ./

        # Install all dependencies (including devDependencies)
        RUN npm install

        # Copy the rest of the application source code and other necessary files
        COPY . .

        # Build the TypeScript application
        RUN npm run build

        # Copy the entrypoint script and make it executable
        COPY entrypoint.sh ./entrypoint.sh
        RUN chmod +x ./entrypoint.sh

        # Set environment variables
        ENV DATABASE_PATH=/usr/src/app/data/database.sqlite
        ENV PORT=3000
        # ENV JWT_SECRET=your_jwt_secret_in_render_env # Set in Render UI

        # Expose the port
        EXPOSE 3000

        # Use the entrypoint script
        ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
        ```

*   **Step 2.3: Create `entrypoint.sh` script.**
    *   **Action:** Create `entrypoint.sh` in project root:
        ```bash
        #!/bin/sh
        # entrypoint.sh

        PERSISTENT_DB_PATH="$DATABASE_PATH"
        INITIAL_DB_IN_IMAGE="/usr/src/app/database.sqlite" 

        DB_DIR=$(dirname "$PERSISTENT_DB_PATH")
        if [ ! -d "$DB_DIR" ]; then
          echo "Creating directory for database: $DB_DIR"
          mkdir -p "$DB_DIR"
        fi

        if [ ! -f "$PERSISTENT_DB_PATH" ] && [ -f "$INITIAL_DB_IN_IMAGE" ]; then
          echo "Database not found at $PERSISTENT_DB_PATH. Copying initial database from image..."
          cp "$INITIAL_DB_IN_IMAGE" "$PERSISTENT_DB_PATH"
        elif [ ! -f "$PERSISTENT_DB_PATH" ] && [ ! -f "$INITIAL_DB_IN_IMAGE" ]; then
          echo "Warning: Database not found at $PERSISTENT_DB_PATH and no initial database in image."
        else
          echo "Database found at $PERSISTENT_DB_PATH or no initial DB in image to copy."
        fi

        echo "Starting application... Will use database at $PERSISTENT_DB_PATH"
        exec node dist/app.js
        ```
    *   **Make executable:** `chmod +x entrypoint.sh` before committing.

**Phase 3: Render Configuration**

*   **Step 3.1: Update Render Service Settings.**
    *   Service Type: Docker
    *   Dockerfile Path: `./Dockerfile`
    *   Root Directory: Empty
    *   Persistent Disk: Mount Path `/usr/src/app/data`
    *   Environment Variables: `PORT=3000`, `DATABASE_PATH=/usr/src/app/data/database.sqlite`, `NODE_ENV=production`, `JWT_SECRET`, etc.

**Phase 4: Deployment and Testing**

*   Push changes to GitHub.
*   Trigger Render deploy.
*   Monitor logs and test.