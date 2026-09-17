import { PROJECT_GAP_BENCHMARKS } from './projectGapScoring.js';

const numeric = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const round = (value, places = 0) => Number(Number(value).toFixed(places));

function requiredSupply(config, population, areaSqKm) {
  if (config.perSqKm) return round(areaSqKm * config.perSqKm, 2);
  if (config.peoplePerFacility) return Math.max(1, Math.ceil(population / config.peoplePerFacility));
  return Math.max(1, Math.ceil((population / 10_000) * config.per10k));
}

function demandFor(population, households, areaSqKm) {
  const requirements = Object.fromEntries(Object.entries(PROJECT_GAP_BENCHMARKS).map(([key, config]) => [
    key.toLowerCase(),
    {
      value: requiredSupply(config, population, areaSqKm),
      unit: config.unit,
      data_type: 'ESTIMATED',
    },
  ]));
  return { population, households, requirements };
}

/**
 * Deterministic project projection. New developments interpolate toward the
 * planner-defined horizon population; other projects compound a recorded
 * contextual annual growth rate. Neither path is an official forecast.
 */
export function calculateGrowthPrediction({ project, referenceGrowthRate = null, referenceCount = 0 }) {
  const projectType = project.project_type;
  const horizon = Math.max(1, numeric(project.planning_horizon));
  const isNewDevelopment = projectType === 'NEW_DEVELOPMENT';
  const hasObservedPopulation = numeric(project.current_population) > 0;
  const baselinePopulation = isNewDevelopment
    ? numeric(project.current_population)
    : numeric(project.current_population || project.expected_population);
  const targetPopulation = numeric(project.expected_population);
  const baselineHouseholds = numeric(project.current_households || (!isNewDevelopment && project.expected_households));
  const targetHouseholds = numeric(project.expected_households);
  const growthAvailable = Number.isFinite(Number(referenceGrowthRate)) && referenceCount > 0;
  const annualGrowthRate = growthAvailable ? Math.max(0, Number(referenceGrowthRate)) : 0;
  const areaSqKm = numeric(project.area?.area_sq_km || numeric(project.area_acres) / 247.105);
  const years = [5, 10, 20, 30].filter((year) => year <= horizon);
  if (!years.includes(horizon)) years.push(horizon);
  years.sort((first, second) => first - second);

  const scenarios = years.map((year) => {
    let population;
    let households;
    if (isNewDevelopment) {
      const progress = Math.min(year / horizon, 1);
      population = Math.round(baselinePopulation + (targetPopulation - baselinePopulation) * progress);
      households = targetHouseholds
        ? Math.round(baselineHouseholds + (targetHouseholds - baselineHouseholds) * progress)
        : null;
    } else {
      population = growthAvailable
        ? Math.round(baselinePopulation * ((1 + annualGrowthRate / 100) ** year))
        : baselinePopulation;
      households = baselineHouseholds
        ? Math.round(baselineHouseholds * (baselinePopulation ? population / baselinePopulation : 1))
        : null;
    }
    return {
      year,
      population,
      households,
      demand: demandFor(population, households, areaSqKm),
      status: year === horizon ? 'PROJECT_HORIZON' : 'INTERMEDIATE_SCENARIO',
      data_type: 'SIMULATED',
    };
  });

  const method = isNewDevelopment
    ? 'Linear development scenario toward planner-defined expected population and households.'
    : growthAvailable
      ? 'Compound scenario using the mean annual growth rate in available contextual population records.'
      : 'Flat scenario because no contextual growth record is available.';
  return {
    project_id: project.id,
    planning_horizon: horizon,
    baseline_population: baselinePopulation,
    baseline_data_type: hasObservedPopulation ? 'OBSERVED' : baselinePopulation ? 'PLANNER_DEFINED' : 'NOT_AVAILABLE',
    projected_population: scenarios.at(-1)?.population ?? baselinePopulation,
    annual_growth_rate: isNewDevelopment ? null : growthAvailable ? round(annualGrowthRate, 2) : null,
    projection_label: 'Scenario-based projection',
    scenarios,
    assumptions: [method, 'Service requirements use the same configurable CityMind planning benchmarks as gap analysis.'],
    data_sources: isNewDevelopment
      ? [{ dataset: 'Planning project inputs', source: 'Planner-defined project brief', data_type: 'PLANNER_DEFINED' }]
      : growthAvailable
        ? [
          { dataset: 'Baseline population', source: hasObservedPopulation ? 'Planning project current population' : 'Planner-defined project population', data_type: hasObservedPopulation ? 'OBSERVED' : 'PLANNER_DEFINED' },
          { dataset: 'Contextual population growth', source: 'CityMind population records linked to contextual project wards', records: referenceCount, data_type: 'REFERENCE_DATA' },
        ]
        : [
          { dataset: 'Baseline population', source: hasObservedPopulation ? 'Planning project current population' : 'Planner-defined project population', data_type: hasObservedPopulation ? 'OBSERVED' : baselinePopulation ? 'PLANNER_DEFINED' : 'DATA_UNAVAILABLE' },
          { dataset: 'Contextual population growth', source: null, data_type: 'DATA_UNAVAILABLE' },
        ],
    confidence: isNewDevelopment ? 'PLANNING_ASSUMPTION' : growthAvailable ? 'ESTIMATED' : 'LOW',
    methodology: { model: 'deterministic-growth-1.0', method, official_forecast: false },
  };
}
