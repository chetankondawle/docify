# YugabyteDB Setup Guide

This guide explains how to set up and configure YugabyteDB for the Docify application.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Node.js 18+

## Quick Start

### 1. Start YugabyteDB

From the project root, run:

```bash
docker compose up -d
```

This starts YugabyteDB on:
- **PostgreSQL port**: `5433` (maps to Yugabyte's YSQL API)
- **YCQL port**: `9042` (Cassandra-compatible API)
- **Web UI**: `http://localhost:7000` (YugabyteDB Admin Console)

The first startup takes ~30 seconds as YugabyteDB initializes. Check status:

```bash
docker compose ps
```

### 2. Verify Database Connection

```bash
docker compose exec yugabytedb ysqlsh -h 127.0.0.1 -U yugabyte -d yugabyte -c "SELECT 1;"
```

Expected output:
```
 ?column?
----------
        1
(1 row)
```

### 3. Configure Environment

The `.env` file in `backend/` already contains the correct defaults:

```
DATABASE_URL=postgresql://yugabyte@127.0.0.1:5433/yugabyte
```

### 4. Start the Application

```bash
npm run dev
```

The backend automatically creates the required tables (`Users`, `Documents`) on first startup via Sequelize `sync()`.

## Database Schema

The application uses two tables:

### Users

| Column    | Type          | Notes            |
|-----------|---------------|------------------|
| id        | UUID          | Primary key      |
| username  | VARCHAR(100)  | Required         |
| mobile    | VARCHAR(15)   | Required         |
| dob       | DATE          | Required         |
| pan       | VARCHAR(10)   | Required         |
| salary    | DECIMAL(12,2) | Required         |
| address   | TEXT          | Required         |
| createdAt | TIMESTAMP     | Auto             |
| updatedAt | TIMESTAMP     | Auto             |

### Documents

| Column            | Type          | Notes                 |
|-------------------|---------------|-----------------------|
| id                | UUID          | Primary key           |
| userId            | UUID          | FK -> Users.id        |
| originalName      | VARCHAR(255)  |                       |
| filename          | VARCHAR(255)  |                       |
| path              | VARCHAR(500)  |                       |
| mimetype          | VARCHAR(100)  |                       |
| size              | INTEGER       |                       |
| sizeFormatted     | VARCHAR(20)   |                       |
| category          | VARCHAR(50)   |                       |
| documentType      | VARCHAR(50)   |                       |
| ocrData           | JSONB         |                       |
| ocrProcessed      | BOOLEAN       |                       |
| ocrError          | TEXT          |                       |
| ocrModel          | VARCHAR(100)  |                       |
| ocrProcessedAt    | TIMESTAMP     |                       |
| formatValidation  | JSONB         |                       |
| pdfTampering      | JSONB         |                       |
| imageTampering    | JSONB         |                       |
| createdAt         | TIMESTAMP     | Auto                  |
| updatedAt         | TIMESTAMP     | Auto                  |

## Environment Variables

| Variable       | Default                                                         | Description                          |
|----------------|-----------------------------------------------------------------|--------------------------------------|
| DATABASE_URL   | `postgresql://yugabyte@127.0.0.1:5433/yugabyte`                 | YugabyteDB connection string         |
| DB_SYNC_FORCE  | `false`                                                         | Drop & recreate tables on startup    |

> **Warning**: Set `DB_SYNC_FORCE=true` only during development to reset tables. This drops all data.

## API Endpoints

Once YugabyteDB is running and the backend is started, the following user endpoints are available:

| Method | Endpoint             | Description                    |
|--------|----------------------|--------------------------------|
| POST   | `/api/v1/users`      | Create a new user              |
| GET    | `/api/v1/users`      | List all users with documents  |
| GET    | `/api/v1/users/:id`  | Get a single user with docs    |

## Troubleshooting

### Connection refused

Ensure YugabyteDB is running:

```bash
docker compose ps
```

If the container is not running, check logs:

```bash
docker compose logs yugabytedb
```

### Tables not created

The backend creates tables automatically via Sequelize `sync()`. Check the backend logs:

```bash
# In the backend console output, look for:
# "Database connection established successfully."
# "Database models synced."
```

### Resetting the database

```bash
# Stop and remove volumes to reset
docker compose down -v
docker compose up -d
```