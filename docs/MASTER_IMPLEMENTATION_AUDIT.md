# CityMind master implementation audit

## A. Current architecture

- React/Vite frontend with Tailwind-compatible global styling, React Leaflet, Recharts and Axios.
- Express backend with controllers, routes, services, repositories, middleware, Zod validation and MySQL pooling.
- JWT/bcrypt authentication and project-owner filtering.
- MySQL persistence with an explicit local demo repository selected by `DEMO_MODE`.
- Planning projects are the primary context for boundaries, planning features, analysis, recommendations, health, phases and budgets.

## B. Existing working features

- Planning-project CRUD and multi-step boundary creation.
- Project GIS canvas with boundary-only default, configurable context buffer, blocks, land-use zones, roads, gates, facilities, measurements, GeoJSON import/export and plan validation.
- Deterministic project gap analysis, block population/health, intervention simulation and project-aware recommendation ranking.
- Recommendation map focus, comparisons, sensitivity, budget filtering and planner decisions.
- JSON/print reporting, authentication, responsive layouts and automated tests.

## C. Reusable modules

- `planning_features` remains the shared spatial model for blocks, zones, roads, gates and proposals.
- Existing gap, urban-health and recommendation scoring utilities remain the numerical source of truth.
- `project_analyses`, `development_phases`, `project_scenarios`, `project_budgets` and `project_budget_items` are reused.
- Existing project ownership, validation, API response and error middleware are reused.

## D. Refactored or extended areas

- Added exact clicked-location suitability evaluation and planner acceptance into the master plan.
- Added an additive planning-rule/provenance layer.
- Added persisted phase APIs, future-plan composition and budget scenario simulation.
- Replaced the budget placeholder with a working evidence-based planning interface.
- Project feature changes now notify the workspace to refresh dependent analysis.

## E. Database changes

Migration `009_location_suitability_foundation.sql` adds:

- `planning_rules`: versioned rules, jurisdiction, severity, source URL, effective year and rule type.
- `dataset_sources`: source/provider, confidence class, actual-connection flag and update time.

No existing tables are removed or destructively redesigned.

## F. Backend modules

- `locationSuitabilityService`: boundary, land use, population need, gap, access, coverage, future demand, road connectivity, health impact and constraint evaluation.
- `projectDeliveryService`: phases, future plan and budget scenarios.
- `planningRuleRepository` and `projectPlanningRepository`: demo/MySQL persistence separation.
- Configurable scoring weights and road-access targets live in `locationSuitability.js`.

## G. Frontend modules

- The GIS planning toolbox includes **Analyze Exact Location**.
- The suitability decision panel shows score, status, factors, rules, sources, warnings and confirmation controls.
- The Budget workspace provides Minimum Cost, Balanced and Maximum Impact simulations with funded/deferred packages.

## H. GIS editing and interaction

- The map remains the primary project workspace.
- A planner selects a development need, clicks an exact project point, reviews evidence, and explicitly accepts or rejects it.
- Blocking/out-of-bound sites cannot be accepted in the UI.
- Accepted features remain distinct from CityMind candidate options and trigger analysis refresh.

## I. Policy and planning-rule strategy

- Initial checks are only `SYSTEM_VALIDATION` or `PLANNER_ASSUMPTION`.
- CityMind does not claim Bangladesh statutory compliance without a verified source.
- Authoritative rules can be loaded into `planning_rules` with jurisdiction, source URL, version and year.

## J. Recommendation-engine preservation

- The existing five Part 6 factors and project-type-specific weights remain unchanged.
- Exact-location suitability is a separate reusable decision layer; it does not replace recommendation ranking.
- CityMind presents options and the planner decides.

## K. Data-source integration

- OpenStreetMap is used for the visible basemap.
- Existing database/demo spatial records supply current context.
- No authoritative parcel, flood, land-price, utility or policy connector is marked connected.
- All derived values are labeled measured, estimated, simulated or planning assumption.

## L. Testing plan and result

- Unit tests cover score bounds, categories and land-use compatibility.
- API tests cover exact location, outside boundary, acceptance, phases, future plan, budget persistence and invalid horizons.
- UI tests cover exact location evaluation/confirmation and budget simulation.
- Current result: 102 backend tests and 36 frontend tests pass; production build passes.

## M. Migration plan

1. Back up the production MySQL database.
2. Apply existing migrations in numeric order, ending with `009_location_suitability_foundation.sql`.
3. Load verified local rules and dataset-source records; do not relabel assumptions as authoritative.
4. Set production environment variables and disable demo mode.
5. Run `npm test` and `npm run build` before deployment.

## N. Risks and remaining limitations

- Point and line suitability is planning-level, not cadastral or engineering analysis.
- Parcel ownership, flood surfaces, land price, environmental constraints and statutory rules require verified datasets.
- Cost assumptions must be replaced with locally reviewed rates before real investment decisions.
- MySQL spatial indexes/PostGIS-level geometry operations are not present; current project scale is suitable for the university implementation target.
