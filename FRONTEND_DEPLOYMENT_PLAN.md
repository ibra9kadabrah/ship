# Frontend Deployment Plan for Render (Static Site)

**Overall Goal:** Deploy the React (Vite-based) frontend application as a Static Site on Render, configured to communicate with the already deployed backend API.

**Phase 1: Local Frontend Code Adjustments**

*   **Step 1.1: Modify API Configuration to Use Environment Variables.**
    *   **Objective:** Make the frontend API base URL configurable via environment variables, allowing it to point to `localhost` during local development and the live Render URL when deployed.
    *   **File to Modify:** `frontend/src/services/api.ts`
    *   **Action:**
        1.  Change the `API_BASE_URL` definition from its current hardcoded value:
            ```typescript
            // Current:
            // const API_BASE_URL = 'http://localhost:3000/api';

            // New:
            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
            ```
            *Vite exposes environment variables prefixed with `VITE_` on the `import.meta.env` object.*
    *   **Verification:** Ensure the frontend still works locally after this change (it will use the fallback `http://localhost:3000/api` if `VITE_API_BASE_URL` is not set).

*   **Step 1.2: Create a Local Environment File for Frontend (Optional but Recommended).**
    *   **Objective:** Define the `VITE_API_BASE_URL` for local development convenience.
    *   **Action:**
        1.  Create a new file named `.env` in the `frontend/` directory (i.e., `frontend/.env`).
        2.  Add the following line to `frontend/.env`:
            ```
            VITE_API_BASE_URL=http://localhost:3000/api
            ```
    *   **Important:** Ensure that `frontend/.env` (or a more general `*.env` pattern at the root or within `frontend/`) is added to your main project `.gitignore` file if it's not already, to prevent committing local environment settings.

*   **Step 1.3: Commit Frontend Changes.**
    *   Commit the updated `frontend/src/services/api.ts`.
    *   If you created `frontend/.env`, ensure your `.gitignore` is updated and commit that change if necessary.

**Phase 2: Render Static Site Configuration**

*   **Step 2.1: Create a New "Static Site" Service on Render.**
    *   Navigate to your Render dashboard and initiate the creation of a new service.
    *   Select "Static Site" as the service type.

*   **Step 2.2: Configure Repository and Build Settings.**
    *   **Repository:** Connect to your GitHub (or other Git provider) repository where the frontend code resides.
    *   **Branch:** Select the branch that contains your latest frontend changes (e.g., `main`, `develop`).
    *   **Root Directory (or Base Directory):** Set this to `frontend`.
        *   *This tells Render to execute build commands from within this subdirectory of your repository.*
    *   **Build Command:** Set this to `npm install && npm run build`.
        *   *This uses the scripts from `frontend/package.json`.*
    *   **Publish Directory:** Set this to `dist`.
        *   *This is the default output directory for Vite builds, relative to the `Root Directory`. So, Render will look for `frontend/dist` from your repository root.*

*   **Step 2.3: Configure Environment Variables for the Frontend Service.**
    *   In the "Environment" section for your new Static Site service on Render:
    *   Add a new environment variable:
        *   **Key:** `VITE_API_BASE_URL`
        *   **Value:** `https://mrv-ak-docker.onrender.com/api` (This is the URL of your deployed backend API)

**Phase 3: Deployment and Testing**

*   **Step 3.1: Save Configuration and Trigger Deploy.**
    *   Save the service configuration on Render. This should automatically trigger the first deployment of your frontend.

*   **Step 3.2: Monitor Frontend Deployment Logs.**
    *   Check the deployment logs on Render for the Static Site service. Ensure the `npm install` and `npm run build` steps complete successfully.

*   **Step 3.3: Test Deployed Frontend.**
    *   Once Render indicates the frontend is live, access it using the URL provided by Render for the Static Site service.
    *   Verify:
        *   The frontend loads correctly.
        *   It makes API calls to `https://mrv-ak-docker.onrender.com/api`.
        *   Login, data fetching, form submissions, and other dynamic features are working as expected.
        *   Check the browser's developer console for any errors.

**Visual Plan:**

```mermaid
graph TD
    A[Start: Backend API Deployed] --> B{Phase 1: Local Frontend Adjustments};
    B --> B1[Modify frontend/src/services/api.ts to use import.meta.env.VITE_API_BASE_URL];
    B1 --> B2[Create frontend/.env for local VITE_API_BASE_URL (optional, gitignore)];
    B2 --> B3[Commit frontend code changes];

    B3 --> C{Phase 2: Render Static Site Configuration};
    C --> C1[Create New "Static Site" Service on Render];
    C1 --> C2[Set Repository, Branch, Root Directory: frontend];
    C2 --> C3[Set Build Command: npm install && npm run build];
    C3 --> C4[Set Publish Directory: dist];
    C4 --> C5[Set Render Environment Variable: VITE_API_BASE_URL = https://mrv-ak-docker.onrender.com/api];

    C5 --> D{Phase 3: Deploy & Test Frontend};
    D --> D1[Save Render Config & Trigger Deploy];
    D1 --> D2[Monitor Frontend Deployment Logs on Render];
    D2 --> D3[Test Deployed Frontend Application Thoroughly];
    D3 --> E[End: Frontend Deployed & Integrated];