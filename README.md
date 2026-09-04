# CityMind

CityMind is a professional urban-planning decision-support workspace for private developers, planners, architects, landowners, and community-development organizations. The current MVP preserves its four working analytical features while introducing planner-owned project context.

## Architecture

- `frontend/`: React, Vite, Tailwind CSS, Leaflet, Recharts, and Axios
- `backend/`: Node.js, Express, MySQL repository layer, validation, analytics, and optional Gemini summaries
- `backend/database/`: MySQL schema and demonstration data for Dhaka Central

The compatibility hierarchy is now `Planning Project → Planning Area → current city/ward reference data → analysis → recommendations`. City and ward APIs remain available while project-owned spatial datasets are implemented incrementally.

The recommendation engine always uses transparent indicator rules. Gemini never calculates or changes recommendation scores, and no API key is sent to the browser.

## Local setup

Prerequisites: Node.js 20+ and npm. MySQL 8+ is required when persistent database mode is enabled.

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create local environment files:

   ```bash
   cp -n backend/.env.example backend/.env
   cp -n frontend/.env.example frontend/.env
   ```

   The default `DEMO_MODE=true` starts immediately with the included demonstration dataset.

3. Start both applications:

   ```bash
   npm run dev
   ```

Open `http://127.0.0.1:5173`. The API runs at `http://127.0.0.1:5001` because macOS commonly reserves port 5000.

Local demo sign-in: `planner@citymind.local` / `CityMindDemo123!`. Replace the demo account and `JWT_SECRET` before deployment.

### Persistent MySQL mode

Create and seed the database:

   ```bash
   mysql -u root -p < backend/database/schema.sql
   mysql -u root -p < backend/database/seed.sql
   ```

Then edit `backend/.env`, set `DEMO_MODE=false`, and provide the MySQL credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`).

For a database created before the Urban Health Score and Smart Recommendation features, run these one-time migrations in order:

```bash
mysql -u root -p < backend/database/migrations/001_add_urban_health_score.sql
mysql -u root -p < backend/database/migrations/002_add_smart_recommendation_fields.sql
mysql -u root -p < backend/database/migrations/003_add_planning_projects.sql
mysql -u root -p < backend/database/migrations/004_expand_planning_project_creation.sql
mysql -u root -p < backend/database/migrations/005_add_planning_features.sql
mysql -u root -p < backend/database/migrations/006_add_project_recommendation_locations.sql
mysql -u root -p < backend/database/migrations/007_project_master_planning_foundation.sql
mysql -u root -p < backend/database/migrations/008_enforce_project_ownership.sql
```

## Environment variables

Backend: `PORT`, `FRONTEND_URL`, `DEMO_MODE`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_CONNECTION_LIMIT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, and optional `GEMINI_API_KEY` / `GEMINI_MODEL`.

Frontend: `VITE_API_URL`. No secrets belong in a `VITE_` variable because Vite exposes those values to the browser.

## API endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/planning-projects`
- `GET /api/planning-projects`
- `GET /api/planning-projects/:projectId`
- `PUT /api/planning-projects/:projectId`
- `DELETE /api/planning-projects/:projectId`
- `GET /api/planning-projects/:projectId/features`
- `POST /api/planning-projects/:projectId/features`
- `PUT /api/planning-projects/:projectId/features/:featureId`
- `DELETE /api/planning-projects/:projectId/features/:featureId`
- `GET /api/planning-projects/:projectId/gap-analysis`
- `GET /api/planning-projects/:projectId/block-analysis`
- `POST /api/planning-projects/:projectId/recommendations`
- `GET /api/planning-projects/:projectId/recommendations`
- `GET /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/recommendations`
- `POST /api/projects/:projectId/recommendations`
- `GET /api/cities`
- `GET /api/cities/:cityId`
- `GET /api/wards?cityId=:cityId`
- `GET /api/wards/:wardId`
- `GET /api/population?wardId=:wardId`
- `GET /api/facilities?wardId=:wardId`
- `GET /api/roads?wardId=:wardId`
- `GET /api/environment?wardId=:wardId`
- `GET /api/analysis?wardId=:wardId`
- `POST /api/analysis/ward/:wardId`
- `GET /api/analysis/ward/:wardId`
- `GET /api/analysis/city/:cityId`
- `GET /api/analysis/ward/:wardId/health-score`
- `GET /api/analysis/city/:cityId/health-scores`
- `GET /api/recommendations?cityId=:cityId&wardId=:wardId`
- `POST /api/recommendations`
- `GET /api/cities/:cityId/overview`
- `GET /api/cities/:cityId/gap-analysis`
- `GET /api/cities/:cityId/map`
- `GET /api/cities/:cityId/recommendations`
- `GET /api/cities/:cityId/health-score`

## Verification

```bash
npm test
npm run build
```

### Master planning workspace check

1. Open a planning project and verify its identity, area, planning horizon, evidence metrics, and progress remain visible across all workspace tabs.
2. Use **Overview** to review planning progress, current situation, critical gaps, available recommendation results, simulated future demand, and the project-boundary map preview.
3. Use **GIS Planning**, **Gap Analysis**, **Recommendations**, and **Urban Health** to open the existing working feature modules without leaving project context.
4. Select **View on Map** from a gap or recommendation to verify the GIS tab opens and highlights that evidence.
5. Review the 5/10/20/30-year **Future Planning** population views; these are explicitly marked as simulations.
6. Use **Export Report** or **Reports → Export JSON** to download the currently available project, gap, and recommendation evidence.

The Budget tab intentionally remains unavailable until actual project budget inputs and allocation APIs exist. A missing project health score is displayed as a labeled reference-context proxy rather than an invented project value.

### GIS feature check

1. Open a planning project and select **GIS Planning**.
2. Confirm the saved project boundary loads and the map fits it automatically.
3. Change the context buffer between boundary-only, 500 m, 1 km, 2 km, and 5 km; confirm nearby wards, facilities, and roads update.
4. Toggle existing and project layers independently.
5. Use **Measure Distance** or **Measure Area**, then place a planning point, facility proposal, or two-point road proposal.
6. Edit or redraw the project boundary and save it.
7. Run a Smart Recommendation and select **View on Map**; verify the candidate zone is highlighted and its score, explanation, and mapped constraints appear in the right panel.
8. Narrow the browser to tablet/mobile width and confirm the tools, map, and context panel stack vertically.

The canvas uses a desktop-first `tools → map → context` layout. Existing markers use conventional circular symbols; planner proposals use amber planning diamonds; CityMind options use green planning diamonds. `planning_features` stores project-owned Point, LineString, and Polygon GeoJSON. Water bodies are a supported layer slot but remain empty until a water dataset or Overpass import is added.

### Urban gap analysis check

1. Select **Gap Analysis** inside a planning project and wait for its project coverage report.
2. Confirm required, existing, surrounding, and missing healthcare, education, park, road, and commercial capacity.
3. Select **View on map** for a critical area and confirm the GIS workspace opens at that location.

The scoring model is documented in `backend/src/utils/urbanScoring.js`. It normalizes measured hospital and school rates/capacity, road density/condition/congestion, AQI/water/noise, green cover, parks, population, density, and growth to 0–100. Urban health is a weighted performance score; infrastructure gap is the inverse of weighted service coverage; population need combines density (55%), population (30%), and growth (15%). Priority combines infrastructure gap (55%), population need (35%), and environmental deficit (10%). Missing measurements are scored as zero and explicitly reported in `data_quality`.

### Urban health score check

1. Select **Health Score** and choose a ward.
2. Verify its circular score, category, six component cards, and radar chart.
3. In **Compare Wards**, select two or more wards and verify their database-backed ranking.
4. Recalculate a ward in **Gap Analysis**; the Health Score workspace refreshes automatically.

The centralized weights are healthcare 20%, education 18%, mobility 18%, environment 18%, green space 12%, and infrastructure 14%. They are exported from the Part 4 scoring utility rather than duplicated in services. Categories are Excellent (80–100), Good (65–79), Moderate (50–64), Poor (30–49), and Critical (0–29).

### Smart recommendation check

1. Select **Recommendations** and choose a project type, budget, and planning horizon.
2. Select **Analyze Locations** and verify that candidate sites inside the saved boundary are ranked from project and spatial evidence.
3. Add multiple sites to **Compare**, then select **View on Map** and confirm that the chosen coordinates are highlighted in the GIS workspace.
4. Try an insufficient budget and confirm the interface shows a safe empty result instead of failing.

The legacy city-scoped `POST /api/recommendations` remains available for compatibility. `POST /api/planning-projects/:projectId/recommendations` is the primary workflow and accepts `projectType`, `budget`, and an optional `planningHorizon`. Supported development needs are `HOSPITAL`, `SCHOOL`, `PARK`, `COMMERCIAL_CENTER`, `ROAD_CONNECTION`, `DRAINAGE`, and `OTHER`; legacy `ROAD` remains supported. The centralized weights remain in `backend/src/utils/recommendationScoring.js`.

The project wrapper deterministically generates candidate coordinates inside the saved polygon and derives the original five factors from expected/current population, density, planning horizon, mapped roads, nearby facilities and environmental context. Population coverage, land suitability, assumptions and constraints are returned as supporting evidence without changing the Part 6 weighted ranker. Candidate geometry and evidence are persisted with each recommendation for later map display.

When saved blocks exist, candidate generation uses one auditable centroid per block and includes its planned population. The demonstration project contains Block A (26,000 people), Block B (30,000), and Block C (29,000), plus sample hierarchical roads, a gate, school, park, and hospital proposal. These are explicitly planning assumptions used to demonstrate the workflow—not measured real-world claims.

## Project-based foundation

- `planning_projects` stores the workspace owner, project type, stage, area/population assumptions, planning horizon, progress, and optional health score.
- `planning_areas` reserves one editable/uploaded GeoJSON boundary per project.
- `planning_features` stores proposed facilities, roads, planning points, zones, and future-development areas.
- `recommendations.planning_project_id` records which workspace owns each recommendation run.
- The existing `projects` table is retained as the implementation/delivery record connected to an approved recommendation.
- `NEW_DEVELOPMENT`, `EXISTING_AREA`, `REDEVELOPMENT`, and `URBAN_EXPANSION` are supported planning-project types.

The project portfolio includes a five-step creation/editing workflow. A planner defines identity and location, draws a polygon on OpenStreetMap, edits it through draggable vertices, deletes or redraws it, configures type-specific population parameters, reviews a map-backed summary, and saves the project. Polygon area and centroid are calculated deterministically on both sides of the API; the backend result is authoritative.

### Planning project check

1. Select **Create New Planning Project** from the project portfolio.
2. Complete identity and location, then click at least three map points to draw the boundary.
3. Use **Edit** to drag vertices, **Undo** to remove the latest point, or **Delete** to clear the polygon.
4. Select a 5, 10, 20, or 30-year horizon and complete the population fields for the project type.
5. Verify the calculated acres/km² and map preview, then create the project.
6. Use the project-card edit and delete controls to verify the remaining CRUD operations.

GeoJSON file upload, project-native OpenStreetMap imports, and persisted budget/phasing controls remain intentionally deferred. JWT authentication, bcrypt password hashing, and project-owner authorization are active; every project endpoint is scoped to the signed-in planner.

## Current scope and limitations

The included data is demonstration data, not an official planning dataset. Until project-native datasets are imported, nearby city wards remain clearly treated as reference planning zones. Future-planning values are labeled simulations, and the JSON evidence export is not a signed or approval-ready planning report. Overpass imports, Python prediction models, project delivery tracking, persisted budgeting, and administration remain reserved for later stages.
