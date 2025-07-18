# MRV Ship Reporting System

This is a ship reporting system for MRV data collection.

## Setup

1.  Install dependencies:
    ```
    npm install
    ```
2.  Install PostgreSQL and create a database and user.
3.  Create a `.env` file in the root of the project with the following content:
    ```
    # PostgreSQL Connection Details
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=mrv_user
    DB_PASSWORD=password
    DB_NAME=mrv_ship_reporting
    ```
4.  Run the database setup script:
    ```
    npm run db:setup:pg
    ```
5.  Start the development server:
    ```
    npm run dev
    ```

## Deployment

The application is deployed using Docker. The `Dockerfile` and `entrypoint.sh` files are included in the project.