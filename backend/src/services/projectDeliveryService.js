import * as planningProjectRepository from '../repositories/planningProjectRepository.js';
import * as projectPlanningRepository from '../repositories/projectPlanningRepository.js';
import * as projectGapAnalysisService from './projectGapAnalysisService.js';
import { PROJECT_CONFIG } from '../utils/recommendationScoring.js';
import { httpError } from '../utils/httpError.js';

const COST_ASSUMPTIONS = Object.freeze({
  HOSPITAL: PROJECT_CONFIG.HOSPITAL.baseCost,
  SCHOOL: PROJECT_CONFIG.SCHOOL.baseCost,
  PARK: PROJECT_CONFIG.PARK.baseCost,
  ROAD: PROJECT_CONFIG.ROAD.baseCost,
  COMMERCIAL: PROJECT_CONFIG.COMMERCIAL_CENTER.baseCost,
  DRAINAGE: PROJECT_CONFIG.DRAINAGE.baseCost,
  EMERGENCY: 65_000_000,
  UTILITY: 55_000_000,
});

async function ensureProject(projectId, ownerUserId) {
  const project = await planningProjectRepository.findPlanningProjectById(
    projectId,
    ownerUserId
  );

  if (!project) {
    throw httpError(
      404,
      'Planning project not found',
      'PLANNING_PROJECT_NOT_FOUND'
    );
  }

  return project;
}

/* =========================================================
   DEVELOPMENT PHASES
========================================================= */

export async function listPhases(projectId, ownerUserId) {
  const project = await ensureProject(projectId, ownerUserId);

  return {
    project: {
      id: project.id,
      name: project.name,
      planning_horizon: project.planning_horizon,
    },
    phases: await projectPlanningRepository.findPhases(projectId),
  };
}

function validatePhase(project, input) {
  if (input.endYear > Number(project.planning_horizon)) {
    throw httpError(
      400,
      'Phase end year cannot exceed the project planning horizon',
      'PHASE_OUTSIDE_HORIZON'
    );
  }

  if (input.startYear > input.endYear) {
    throw httpError(
      400,
      'Phase start year must be before its end year',
      'INVALID_PHASE_RANGE'
    );
  }
}

const phaseRecord = (input) => ({
  name: input.name,
  phase_order: input.phaseOrder,
  start_year: input.startYear,
  end_year: input.endYear,
  status: input.status,
  description: input.description ?? null,
});

export async function createPhase(projectId, ownerUserId, input) {
  const project = await ensureProject(projectId, ownerUserId);

  validatePhase(project, input);

  return projectPlanningRepository.createPhase(
    projectId,
    phaseRecord(input)
  );
}

export async function updatePhase(
  projectId,
  phaseId,
  ownerUserId,
  input
) {
  const project = await ensureProject(projectId, ownerUserId);

  validatePhase(project, input);

  const saved = await projectPlanningRepository.updatePhase(
    projectId,
    phaseId,
    phaseRecord(input)
  );

  if (!saved) {
    throw httpError(
      404,
      'Development phase not found',
      'DEVELOPMENT_PHASE_NOT_FOUND'
    );
  }

  return saved;
}

export async function deletePhase(projectId, phaseId, ownerUserId) {
  await ensureProject(projectId, ownerUserId);

  const deleted = await projectPlanningRepository.deletePhase(
    projectId,
    phaseId
  );

  if (!deleted) {
    throw httpError(
      404,
      'Development phase not found',
      'DEVELOPMENT_PHASE_NOT_FOUND'
    );
  }

  return {
    id: phaseId,
    deleted: true,
  };
}

/* =========================================================
   FUTURE PLANNING
========================================================= */

export async function getFuturePlan(projectId, ownerUserId) {
  const [project, gaps, phasesResult] = await Promise.all([
    ensureProject(projectId, ownerUserId),

    projectGapAnalysisService.getProjectGapAnalysis(
      projectId,
      ownerUserId
    ),

    listPhases(projectId, ownerUserId),
  ]);

  return {
    project: {
      id: project.id,
      name: project.name,
      planning_horizon: project.planning_horizon,
    },

    phases: phasesResult.phases,

    scenarios: gaps.horizon_scenarios.map((scenario) => ({
      ...scenario,

      phase:
        phasesResult.phases.find(
          ({ start_year, end_year }) =>
            scenario.years >= start_year &&
            scenario.years <= end_year
        )?.name ?? null,
    })),

    priority_sequence: gaps.priority_areas.map(
      ({ key, category, gap_percent }, index) => ({
        order: index + 1,
        key,
        category,
        gap_percent,

        suggested_phase_order: Math.min(
          index + 1,
          Math.max(phasesResult.phases.length, 1)
        ),
      })
    ),

    confidence: 'SIMULATED',
  };
}

/* =========================================================
   SMART BUDGET OPTIMIZER
========================================================= */

function budgetPriority(gap) {
  return gap >= 75
    ? 'CRITICAL'
    : gap >= 50
      ? 'HIGH'
      : gap >= 25
        ? 'MEDIUM'
        : 'LOW';
}

/*
  Need Score
  ----------
  75% = infrastructure/service gap severity
  25% = quantity of missing infrastructure

  The score is deterministic and explainable.
*/
function calculateNeedScore(category) {
  const gapScore = Math.min(
    Math.max(Number(category.gap_percent ?? 0), 0),
    100
  );

  const missingUnits = Math.max(
    Number(category.missing ?? 0),
    0
  );

  const missingScore = Math.min(
    missingUnits * 10,
    100
  );

  return Math.round(
    gapScore * 0.75 +
    missingScore * 0.25
  );
}

/*
  Expected impact is a planning simulation.

  It combines:
  - sector need
  - percentage of required cost funded

  It is NOT an authoritative prediction.
*/
function calculateExpectedImpact(needScore, fundingCoverage) {
  const impact =
    (Number(needScore) * Number(fundingCoverage)) / 100;

  return Math.min(
    100,
    Math.max(0, Math.round(impact))
  );
}

export async function simulateBudget(
  projectId,
  ownerUserId,
  input
) {
  console.log('🔥 NEW BUDGET OPTIMIZER CODE IS RUNNING 🔥');
  const project = await ensureProject(
    projectId,
    ownerUserId
  );

  /*
    Reuse CityMind's existing Gap Analysis.
  */
  const gaps =
    await projectGapAnalysisService.getProjectGapAnalysis(
      projectId,
      ownerUserId
    );

  const phaseList =
    await projectPlanningRepository.findPhases(projectId);

  /*
    STEP 1
    Define the core sectors that should always be visible
    in the Smart Budget Optimizer.

    Gap Analysis may completely omit a sector when there is
    no current gap. In that case we still show the sector,
    but with zero funding requirement.
  */
  const CORE_BUDGET_SECTORS = [
    {
      key: 'HOSPITAL',
      category: 'Healthcare',
    },
    {
      key: 'SCHOOL',
      category: 'Education',
    },
    {
      key: 'ROAD',
      category: 'Road access',
    },
    {
      key: 'DRAINAGE',
      category: 'Drainage network',
    },
    {
      key: 'PARK',
      category: 'Parks',
    },
  ];

  /*
    Start with sectors returned by Gap Analysis.
  */
  const categoryMap = new Map(
    gaps.categories.map((category) => [
      category.key,
      category,
    ])
  );

  /*
    Add missing core sectors.

    Example:
    If Gap Analysis does not return HOSPITAL,
    Healthcare is inserted with zero gap.
  */
  CORE_BUDGET_SECTORS.forEach((sector) => {
    if (!categoryMap.has(sector.key)) {
      categoryMap.set(sector.key, {
        key: sector.key,
        category: sector.category,
        missing: 0,
        gap_percent: 0,
      });
    }
  });

  /*
    Final sector list contains:
    - every sector returned by Gap Analysis
    - Healthcare
    - Education
    - Road
    - Drainage
    - Parks

    Duplicate sectors are prevented by the Map.
  */
  const budgetCategories = Array.from(
    categoryMap.values()
  );

  /*
    Build optimizer sector objects.
  */
  const allSectors = budgetCategories.map(
    (category) => {
      const units = Math.max(
        0,
        Math.ceil(
          Number(category.missing ?? 0)
        )
      );

      const unitCost =
        COST_ASSUMPTIONS[category.key] ??
        50_000_000;

      const rawNeedScore =
        calculateNeedScore(category);

      const needScore =
        units > 0
          ? rawNeedScore
          : 0;

      const estimatedCost =
        units * unitCost;

      const impactScore =
        units > 0
          ? Math.round(
              needScore * 0.7 +
              Math.min(
                Number(
                  category.gap_percent ?? 0
                ),
                100
              ) * 0.3
            )
          : 0;

      return {
        category: category.key,

        label: category.category,

        units,

        estimated_cost:
          estimatedCost,

        need_score:
          needScore,

        impact_score:
          impactScore,

        priority:
          units > 0
            ? budgetPriority(
                Number(
                  category.gap_percent ?? 0
                )
              )
            : 'NO_GAP',

        assumptions: {
          unit_cost:
            unitCost,

          missing_units:
            Number(
              category.missing ?? 0
            ),

          gap_percent:
            Number(
              category.gap_percent ?? 0
            ),

          confidence:
            'PLANNING_ASSUMPTION',
        },
      };
    }
  );

  /*
    Only sectors with an actual identified need
    participate in budget distribution.

    NO_GAP sectors stay visible but receive BDT 0.
  */
  const candidates = allSectors.filter(
    (item) =>
      item.units > 0 &&
      item.estimated_cost > 0
  );

  /*
    STEP 2
    Calculate total project need score.
  */
  const totalNeedScore =
    candidates.reduce(
      (total, item) =>
        total + item.need_score,
      0
    );

  /*
    STEP 3
    Smart sector allocation.
  */
  const sectorAllocations =
    allSectors.map((item) => {
      const hasCurrentGap =
        item.units > 0 &&
        item.estimated_cost > 0 &&
        item.need_score > 0;

      const allocationShare =
        hasCurrentGap &&
        totalNeedScore > 0
          ? item.need_score /
            totalNeedScore
          : 0;

      const proposedAllocation =
        hasCurrentGap
          ? Number(
              input.availableBudget
            ) * allocationShare
          : 0;

      /*
        Never allocate more than the
        estimated requirement.
      */
      const allocatedAmount =
        hasCurrentGap
          ? Math.min(
              proposedAllocation,
              item.estimated_cost
            )
          : 0;

      const fundingCoverage =
        item.estimated_cost > 0
          ? (
              allocatedAmount /
              item.estimated_cost
            ) * 100
          : 0;

      const expectedImpact =
        hasCurrentGap
          ? calculateExpectedImpact(
              item.need_score,
              fundingCoverage
            )
          : 0;

      return {
        category:
          item.category,

        label:
          item.label,

        priority:
          item.priority,

        need_score:
          item.need_score,

        allocated_amount:
          Math.round(
            allocatedAmount
          ),

        allocation_percentage:
          Number(
            (
              allocationShare *
              100
            ).toFixed(1)
          ),

        required_cost:
          item.estimated_cost,

        funding_coverage_percent:
          Number(
            fundingCoverage.toFixed(1)
          ),

        expected_impact_percent:
          expectedImpact,

        reason:
          hasCurrentGap
            ? `${item.label} has a ${item.assumptions.gap_percent}% ` +
              `identified service gap with ${item.assumptions.missing_units} ` +
              `missing planned unit(s).`
            : `${item.label} has no currently identified funding gap ` +
              `for this planning scenario.`,

        confidence:
          'SIMULATED',
      };
    });

  /*
    STEP 4
    Existing package-selection logic.

    Only sectors requiring funding are included.
  */
  const ordered =
    [...candidates].sort(
      input.scenarioType ===
        'MINIMUM_COST'

        ? (a, b) =>
            a.estimated_cost -
              b.estimated_cost ||
            b.impact_score -
              a.impact_score

        : input.scenarioType ===
            'MAXIMUM_IMPACT'

          ? (a, b) =>
              b.impact_score -
                a.impact_score ||
              a.estimated_cost -
                b.estimated_cost

          : (a, b) =>
              b.impact_score /
                Math.max(
                  b.estimated_cost,
                  1
                ) -
              a.impact_score /
                Math.max(
                  a.estimated_cost,
                  1
                )
    );

  let remaining =
    Number(input.availableBudget);

  const selected = [];
  const deferred = [];

  ordered.forEach(
    (item, index) => {
      const enriched = {
        ...item,

        development_phase_id:
          phaseList[
            Math.min(
              index,
              Math.max(
                phaseList.length - 1,
                0
              )
            )
          ]?.id ?? null,
      };

      if (
        item.estimated_cost <=
        remaining
      ) {
        selected.push(enriched);

        remaining -=
          item.estimated_cost;
      } else {
        deferred.push({
          ...enriched,

          reason:
            'Estimated package exceeds the remaining scenario budget.',
        });
      }
    }
  );

  /*
    STEP 5
    Optimizer summary.
  */
  const totalSectorAllocation =
    sectorAllocations.reduce(
      (total, item) =>
        total +
        item.allocated_amount,
      0
    );

  const unallocatedBudget =
    Math.max(
      Number(input.availableBudget) -
        totalSectorAllocation,
      0
    );

  /*
    Only active sectors are used when calculating
    the average expected impact.

    Healthcare/Education with NO_GAP therefore
    do not artificially lower the score.
  */
  const activeSectorAllocations =
    sectorAllocations.filter(
      (item) =>
        item.required_cost > 0
    );

  const averageExpectedImpact =
    activeSectorAllocations.length > 0
      ? Math.round(
          activeSectorAllocations.reduce(
            (total, item) =>
              total +
              item.expected_impact_percent,
            0
          ) /
            activeSectorAllocations.length
        )
      : 0;

  /*
    STEP 6
    Preserve existing scenario structure.
  */
  const scenario = {
    scenario_name:
      input.scenarioName ||
      input.scenarioType.replaceAll(
        '_',
        ' '
      ),

    available_budget:
      Number(input.availableBudget),

    currency:
      input.currency,

    cost_source:
      'CityMind configurable planning cost assumptions — replace with verified local rates',

    cost_year:
      new Date().getFullYear(),
  };

  const saved =
    input.saveScenario
      ? await projectPlanningRepository
          .saveBudgetScenario(
            projectId,
            scenario,
            selected
          )
      : null;

  /*
    STEP 7
    Final Smart Budget Optimizer response.
  */
  return {
    project: {
      id:
        project.id,

      name:
        project.name,

      planning_horizon:
        project.planning_horizon,
    },

    scenario_type:
      input.scenarioType,

    ...scenario,

    /*
      ALL sectors are returned here.

      Therefore Healthcare and Education remain
      visible even when their allocation is zero.
    */
    sector_allocations:
      sectorAllocations,

    optimizer_summary: {
      total_budget:
        Number(
          input.availableBudget
        ),

      allocated_budget:
        totalSectorAllocation,

      unallocated_budget:
        unallocatedBudget,

      sectors_evaluated:
        sectorAllocations.length,

      sectors_requiring_funding:
        activeSectorAllocations.length,

      sectors_without_current_gap:
        sectorAllocations.length -
        activeSectorAllocations.length,

      average_expected_impact_percent:
        averageExpectedImpact,
    },

    /*
      Existing package results.
    */
    selected,

    deferred,

    summary: {
      allocated:
        scenario.available_budget -
        remaining,

      remaining,

      funded_packages:
        selected.length,

      deferred_packages:
        deferred.length,
    },

    saved_scenario_id:
      saved?.id ?? null,

    confidence:
      'PLANNING_ASSUMPTION',

    simulation_label:
      'SIMULATED',

    methodology: {
      need_score:
        '75% service gap severity + 25% missing infrastructure quantity',

      allocation:
        'Available budget is distributed proportionally only among sectors with an identified funding need.',

      zero_gap:
        'Core planning sectors without a currently identified infrastructure gap remain visible with BDT 0 recommended allocation.',

      impact:
        'Expected impact combines sector need with estimated funding coverage.',
    },

    warning:
      'Costs and expected impacts are planning assumptions for scenario comparison. They are not tenders, authoritative market quotations, or guaranteed outcomes.',
  };
}

/* =========================================================
   SAVED BUDGET SCENARIOS
========================================================= */

export async function listBudgets(
  projectId,
  ownerUserId
) {
  const project = await ensureProject(
    projectId,
    ownerUserId
  );

  return {
    project: {
      id: project.id,
      name: project.name,
    },

    scenarios:
      await projectPlanningRepository.findBudgetScenarios(
        projectId
      ),
  };
}