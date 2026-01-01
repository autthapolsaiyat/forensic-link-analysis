# 🔗 Forensic Link Analysis System

ระบบเชื่อมโยงข้อมูลนิติวิทยาศาสตร์ สำหรับ ศพฐ.10 (Pilot)

## 📊 Overview

| รายการ | จำนวน |
|--------|-------|
| Cases | 18,786 |
| Samples | 27,032 |
| Persons | 17,909 |
| DNA Matches | 2,535 |
| Case Links | 613 |
| Multi-Case Persons | 197 |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Azure Cloud                          │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Static    │  │  App        │  │  Azure SQL      │ │
│  │   Web App   │──│  Service    │──│  Database       │ │
│  │  (Frontend) │  │  (API)      │  │  (Data)         │ │
│  └─────────────┘  └─────────────┘  └─────────────────┘ │
│         │                │                  │          │
│         └────────────────┼──────────────────┘          │
│                          │                             │
│                    NDDB API                            │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
forensic-link-analysis/
├── api/                    # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── config/        # Database configuration
│   │   ├── routes/        # API routes
│   │   └── index.js       # Main entry point
│   └── package.json
├── frontend/              # Frontend (React + Vite) - Coming soon
├── import-script/         # Data import scripts
├── sql/                   # SQL scripts
└── .github/workflows/     # CI/CD pipelines
```

## 🚀 Quick Start

### API (Local Development)

```bash
cd api
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run dev
```

API will be available at: http://localhost:3000

### API Documentation

Swagger UI: http://localhost:3000/api-docs

## 📚 API Endpoints

### Cases
- `GET /api/v1/cases` - List all cases
- `GET /api/v1/cases/:id` - Get case details
- `GET /api/v1/cases/:id/samples` - Get samples in case
- `GET /api/v1/cases/:id/persons` - Get persons in case
- `GET /api/v1/cases/:id/links` - Get case links

### Persons
- `GET /api/v1/persons` - List all persons
- `GET /api/v1/persons/multi-case` - Persons in multiple cases
- `GET /api/v1/persons/:id` - Get person details
- `GET /api/v1/persons/:id/cases` - Get person's cases

### Links
- `GET /api/v1/links` - List all links (ranked by strength)
- `GET /api/v1/links/types` - Summary by link type
- `GET /api/v1/links/top` - Top links

### Graph (for Visualization)
- `GET /api/v1/graph/person/:id` - Person-centric graph
- `GET /api/v1/graph/case/:id` - Case-centric graph
- `GET /api/v1/graph/network` - Network overview

### Statistics
- `GET /api/v1/stats/overview` - System overview
- `GET /api/v1/stats/by-province` - By province
- `GET /api/v1/stats/by-case-type` - By case type

### Search
- `GET /api/v1/search?q=xxx` - General search
- `GET /api/v1/search/id/:idNumber` - Search by ID
- `GET /api/v1/search/case/:caseNumber` - Search by case number

## 🔐 Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment (development/production) |
| `DB_SERVER` | Azure SQL Server |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `CORS_ORIGIN` | Allowed CORS origin |

## 🔧 Deployment

### Azure Resources

| Resource | Name | Type |
|----------|------|------|
| Resource Group | rg-forensic-link-prod | - |
| SQL Server | sql-forensic-link-prod | Azure SQL |
| Database | forensic_link_db | Azure SQL Database |
| App Service | forensic-link-api | Web App |
| Static Web App | forensic-link | Static Web App |

### CI/CD

- Push to `main` branch triggers automatic deployment
- API deploys to Azure App Service
- Frontend deploys to Azure Static Web Apps

## 📈 Progress

- [x] Phase 1: Data Foundation
- [x] Phase 2: Link Engine
- [x] Phase 3: Backend API
- [ ] Phase 4: Frontend UI
- [ ] Phase 5: Deployment & Polish

## 👥 Team

- ศพฐ.10 (Central Institute of Forensic Science Region 10)

## 📄 License

Private - ศพฐ.10 Internal Use Only
