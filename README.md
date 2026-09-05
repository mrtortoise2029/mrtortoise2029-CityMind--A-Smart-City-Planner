# CityMind

CityMind is a project-based urban planning and decision-support platform. It combines spatial planning, service-gap analysis, urban health assessment, and site recommendations in one workspace.

The platform supports new developments, existing areas, redevelopment projects, and urban expansion projects.

## Features

### Planning projects

- Private, account-based project portfolio
- Five-step project creation and editing workflow
- Map-based boundary drawing and vertex editing
- Automatic area and centroid calculation
- Project-specific population, household, density, and planning-horizon inputs
- Support for `NEW_DEVELOPMENT`, `EXISTING_AREA`, `REDEVELOPMENT`, and `URBAN_EXPANSION`

### Interactive GIS planning

- OpenStreetMap and satellite basemaps
- Project boundary editing
- Configurable surrounding-data buffer
- Development blocks and land-use zones
- Primary, secondary, and local roads
- Main and secondary gates
- Facility and infrastructure proposals
- Distance and area measurement
- GeoJSON import and export
- Existing, proposed, approved, and recommendation layers
- Exact-location suitability analysis
- Plan validation and project-scoped feature ownership

### Urban gap analysis

- Project and block-level service coverage
- Healthcare, education, parks, roads, commercial services, utilities, emergency services, and drainage indicators
- Required, existing, surrounding, and missing capacity
- Critical-area mapping and priority ordering
- Current and planned-scenario comparison
- 5, 10, 20, and 30-year demand scenarios
- `MEASURED`, `ESTIMATED`, and `SIMULATED` confidence labels

### Urban Health Score

- Deterministic project and block scoring
- Healthcare, education, mobility, environment, green space, infrastructure, and accessibility components
- Population-weighted project score
- Block ranking and vulnerability indicators
- Current versus planned score comparison
- What-if simulations for hospitals, schools, parks, roads, and drainage

### Smart recommendation engine

- Candidate generation inside the project boundary
- Block-aware site ranking
- Population need, infrastructure gap, accessibility, future demand, and existing-coverage factors
- Budget and planning-horizon controls
- Side-by-side candidate comparison
- Cost, population served, constraints, and supporting evidence
- Budget scenarios and sensitivity analysis
- Map focus and shortlist/dismiss workflow

The numerical analysis and ranking logic is deterministic and runs in the backend. Gemini integration is optional and limited to explanations and planning summaries; it does not calculate scores or define database truth.

## Technology

### Frontend

- React 19 and Vite
- Leaflet and React Leaflet
- Recharts
- Tailwind CSS
- Axios
- Vitest and Testing Library

### Backend

- Node.js and Express
- MySQL 8
- Zod validation
- JWT authentication
- bcrypt password hashing
- Jest and Supertest

## Project structure

```text
CityMind/
├── frontend/
│   └── src/
│       ├── api/              API client
│       ├── components/       Workspace, GIS, analytics, and authentication UI
│       ├── hooks/            Dashboard data hooks
│       ├── styles/           Application styles
│       └── utils/            Geometry, context, and report utilities
├── backend/
│   ├── database/             Schema, seed data, and migrations
│   └── src/
│       ├── config/           Environment and database configuration
│       ├── controllers/      HTTP controllers
│       ├── middleware/       Authentication, validation, and error handling
│       ├── repositories/     MySQL and demo-data access
│       ├── routes/           API routes
│       ├── services/         Planning and analysis services
│       └── utils/            Scoring and spatial utilities
└── docs/                     Project documentation
```

## Local development

Requirements:

- Node.js 20+
- npm
- MySQL 8+ for persistent database mode

Install dependencies and create local environment files:

```bash
npm install
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env
```

Start the frontend and backend:

```bash
npm run dev
```

The frontend starts at `http://127.0.0.1:5173` and the API at `http://127.0.0.1:5001`. If port 5173 is occupied, Vite selects the next available local port.

### Demo account

```text
Email: planner@citymind.local
Password: CityMindDemo123!
```

These credentials are for local development only.

## MySQL setup

Create and seed a new database:

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
```

Set `DEMO_MODE=false` in `backend/.env`, then configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET`.

For an existing database, apply the files in `backend/database/migrations/` in numerical order from `001` through `009`.

## Environment variables

Backend:

```text
NODE_ENV
PORT
FRONTEND_URL
DEMO_MODE
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
DB_CONNECTION_LIMIT
JWT_SECRET
JWT_EXPIRES_IN
GEMINI_API_KEY       optional
GEMINI_MODEL         optional
```

Frontend:

```text
VITE_API_URL
```

Secrets must not be stored in a `VITE_` variable because Vite exposes those values to the browser.

## Main API routes

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

GET    /api/planning-projects
POST   /api/planning-projects
GET    /api/planning-projects/:projectId
PUT    /api/planning-projects/:projectId
DELETE /api/planning-projects/:projectId

GET    /api/planning-projects/:projectId/features
POST   /api/planning-projects/:projectId/features
PUT    /api/planning-projects/:projectId/features/:featureId
DELETE /api/planning-projects/:projectId/features/:featureId

GET    /api/planning-projects/:projectId/gap-analysis
GET    /api/planning-projects/:projectId/block-analysis
POST   /api/planning-projects/:projectId/health-simulation
GET    /api/planning-projects/:projectId/validation

POST   /api/planning-projects/:projectId/evaluate-location
POST   /api/planning-projects/:projectId/evaluated-locations/accept
GET    /api/planning-projects/:projectId/planning-rules

GET    /api/planning-projects/:projectId/recommendations
POST   /api/planning-projects/:projectId/recommendations
PATCH  /api/planning-projects/:projectId/recommendations/:recommendationId

GET    /api/planning-projects/:projectId/development-phases
GET    /api/planning-projects/:projectId/future-plan
GET    /api/planning-projects/:projectId/budgets
POST   /api/planning-projects/:projectId/budget-simulation
```

Legacy city and ward routes remain available for reference datasets and compatibility.

## Scoring principles

- Every planning object belongs to a planning project.
- Current scores count approved or implemented assets.
- Planned scores simulate non-rejected proposals.
- Project boundaries control candidate generation and feature validation.
- Missing data is identified instead of being presented as measured evidence.
- Policy assumptions remain separate from authoritative external rules.
- Recommendations support planning decisions; they do not replace professional review or statutory approval.

## Testing and build

Run all tests:

```bash
npm test
```

Create a production frontend build:

```bash
npm run build
```

The test suite covers authentication, CORS, geometry, project context, urban scoring, location suitability, recommendation ranking, GIS interaction, project creation, workspace views, and report generation.

## Deployment notes

The included Dhaka records are demonstration data and are not an official government planning dataset. Production deployments should connect verified spatial, population, infrastructure, environmental, and policy sources.

Before deployment:

- Replace the demo credentials.
- Set a strong `JWT_SECRET`.
- Use production MySQL credentials.
- Restrict `FRONTEND_URL` to the deployed frontend origin.
- Keep Gemini and database credentials on the backend only.
- Review planning assumptions with qualified professionals and relevant authorities.
