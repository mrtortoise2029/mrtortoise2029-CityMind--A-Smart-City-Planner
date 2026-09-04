import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  GitCompareArrows,
  MapPin,
  Sparkles,
  X,
} from "lucide-react";
import {
  createProjectRecommendations,
  createRecommendations,
  updateProjectRecommendationStatus,
} from "../api/client.js";

const projectTypes = [
  ["HOSPITAL", "Hospital"],
  ["SCHOOL", "School"],
  ["PARK", "Park"],
  ["COMMERCIAL_CENTER", "Commercial center"],
  ["ROAD_CONNECTION", "Road connection"],
  ["DRAINAGE", "Drainage infrastructure"],
  ["OTHER", "Other"],
];
const factorLabels = {
  population_need_score: "Population need",
  infrastructure_gap_score: "Infrastructure gap",
  accessibility_score: "Accessibility",
  future_demand_score: "Future demand",
  existing_coverage_score: "Existing coverage need",
};
const factorKeys = Object.keys(factorLabels);
const money = (value) =>
  new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 }).format(
    Number(value),
  );

function CandidateCard({
  candidate,
  compared,
  onCompare,
  onDecision,
  onViewMap,
}) {
  const location = candidate.candidate_location ?? {
    label: candidate.ward.name,
  };
  const blockName = candidate.project_evidence?.block_name;
  return (
    <article
      className={
        candidate.rank === 1 ? "candidate-card recommended" : "candidate-card"
      }
    >
      <div className="candidate-card-top">
        <div className="candidate-rank">
          <span>Rank</span>
          <strong>{String(candidate.rank).padStart(2, "0")}</strong>
        </div>
        <div>
          <span>{location.label}</span>
          <h3>
            {blockName
              ? `${blockName} planning context`
              : `${candidate.ward.name} reference context`}
          </h3>
        </div>
        <div className="candidate-score">
          <span>Recommendation score</span>
          <strong>
            {candidate.recommendation_score}
            <small>/100</small>
          </strong>
        </div>
        <span className={`candidate-priority ${candidate.priority}`}>
          {candidate.priority}
        </span>
      </div>
      <div className="candidate-factors">
        {factorKeys.map((key) => (
          <div key={key}>
            <span>{factorLabels[key]}</span>
            <div>
              <i style={{ width: `${candidate[key]}%` }} />
            </div>
            <strong>{candidate[key]}</strong>
          </div>
        ))}
      </div>
      <div className="candidate-impact">
        <div>
          <span>Estimated cost</span>
          <strong>৳{money(candidate.estimated_cost)}</strong>
        </div>
        <div>
          <span>Expected population served</span>
          <strong>{money(candidate.expected_population_served)}</strong>
        </div>
      </div>
      {blockName && (
        <div className="candidate-block-context">
          <span>Development block</span>
          <strong>{blockName}</strong>
          <span>Planned residents</span>
          <strong>{money(candidate.project_evidence.block_population)}</strong>
        </div>
      )}
      {candidate.project_evidence && (
        <div className="candidate-impact">
          <div>
            <span>Population coverage</span>
            <strong>
              {candidate.project_evidence.population_coverage_score}/100
            </strong>
          </div>
          <div>
            <span>Land suitability</span>
            <strong>
              {candidate.project_evidence.land_suitability_score}/100
            </strong>
          </div>
        </div>
      )}
      <div className="candidate-actions">
        <button onClick={() => onViewMap(candidate)} type="button">
          <MapPin size={13} />
          View on Map
        </button>
        <button
          aria-pressed={compared}
          className={compared ? "selected" : ""}
          onClick={() => onCompare(candidate.recommendation_id)}
          type="button"
        >
          {compared ? <Check size={13} /> : <GitCompareArrows size={13} />}
          Compare
        </button>
        {onDecision && (
          <>
            <button
              className={candidate.status === "approved" ? "selected" : ""}
              onClick={() => onDecision(candidate, "approved")}
              type="button"
            >
              <Check size={13} />
              Shortlist
            </button>
            <button
              onClick={() => onDecision(candidate, "dismissed")}
              type="button"
            >
              <X size={13} />
              Dismiss
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export function SmartRecommendationEngine({
  cityId,
  initialResult = null,
  onResult,
  planningProject,
  planningProjectId,
}) {
  const [form, setForm] = useState({
    projectType: "HOSPITAL",
    budget: "150000000",
    planningHorizon: String(planningProject?.planning_horizon ?? 5),
  });
  const [result, setResult] = useState(initialResult);
  const [comparedIds, setComparedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const analyze = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const input = {
        projectType: form.projectType,
        budget: Number(form.budget),
        planningHorizon: Number(form.planningHorizon),
      };
      const data = planningProjectId
        ? await createProjectRecommendations(planningProjectId, input)
        : await createRecommendations({ ...input, cityId });
      setResult(data);
      onResult?.(data);
      setComparedIds(
        data.recommendations.slice(0, 2).map(({ recommendation_id: id }) => id),
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ??
          "Unable to analyze candidate blocks",
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleCompare = (id) =>
    setComparedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const viewMap = (candidate) => {
    window.dispatchEvent(
      new CustomEvent("citymind:focus-ward", {
        detail: { wardId: candidate.ward.id, candidate },
      }),
    );
    document
      .getElementById("map")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const decide = async (candidate, status) => {
    if (!planningProjectId) return;
    await updateProjectRecommendationStatus(
      planningProjectId,
      candidate.recommendation_id,
      status,
    );
    setResult((current) => ({
      ...current,
      recommendations: current.recommendations.map((item) =>
        item.recommendation_id === candidate.recommendation_id
          ? { ...item, status }
          : item,
      ),
    }));
  };
  const compared =
    result?.recommendations.filter(({ recommendation_id: id }) =>
      comparedIds.includes(id),
    ) ?? [];

  return (
    <article className="panel smart-recommendation-panel">
      <div className="recommendation-builder-heading">
        <div>
          <p className="eyebrow">Project-based site planning</p>
          <h2>Create Development Recommendation</h2>
          <p>
            Compare candidate sites inside the saved project boundary. CityMind
            recommends options; the planner decides.
          </p>
        </div>
        <Sparkles size={22} />
      </div>
      <form className="recommendation-form" onSubmit={analyze}>
        <label>
          <span>Development need</span>
          <select name="projectType" onChange={update} value={form.projectType}>
            {projectTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Budget (BDT)</span>
          <input
            min="1"
            name="budget"
            onChange={update}
            required
            type="number"
            value={form.budget}
          />
        </label>
        <label>
          <span>Planning Horizon</span>
          <div className="input-suffix">
            <input
              max="30"
              min="1"
              name="planningHorizon"
              onChange={update}
              required
              type="number"
              value={form.planningHorizon}
            />
            <span>years</span>
          </div>
        </label>
        <button disabled={loading} type="submit">
          <Sparkles size={15} />
          {loading ? "Analyzing locations…" : "Analyze Locations"}
        </button>
      </form>

      {error && (
        <div className="recommendation-error">
          <AlertTriangle size={18} />
          <div>
            <strong>Analysis failed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
      {!result && !error && (
        <div className="recommendation-empty">
          <MapPin size={25} />
          <h3>Choose a development scenario</h3>
          <p>
            CityMind will rank candidate sites inside this project's boundary.
            The planner makes the final decision.
          </p>
        </div>
      )}
      {result && !result.recommendations.length && (
        <div className="recommendation-empty">
          <AlertTriangle size={25} />
          <h3>No suitable candidate sites</h3>
          <p>
            {result.message} Review the boundary, spatial data, or available
            budget.
          </p>
        </div>
      )}

      {result?.recommendations.length > 0 && (
        <>
          <section className="recommended-location-banner">
            <div>
              <span>Highest-suitability planning option</span>
              <h3>
                {result.recommendations[0].candidate_location?.label ??
                  result.recommendations[0].ward.name}
              </h3>
              <p>
                {result.request.projectType.replaceAll("_", " ")} ·{" "}
                {result.request.planningHorizon}-year horizon
              </p>
              {result.spatial_context && (
                <small>
                  Latest boundary · {result.spatial_context.approved_assets_considered} implemented and {result.spatial_context.proposed_assets_considered} proposed plan items considered
                </small>
              )}
            </div>
            <div>
              <span>Suitability</span>
              <strong>
                {result.recommendations[0].recommendation_score}
                <small>/100</small>
              </strong>
            </div>
          </section>
          <div className="candidate-list">
            {result.recommendations.map((candidate) => (
              <CandidateCard
                candidate={candidate}
                compared={comparedIds.includes(candidate.recommendation_id)}
                key={candidate.recommendation_id}
                onCompare={toggleCompare}
                onDecision={planningProjectId ? decide : null}
                onViewMap={viewMap}
              />
            ))}
          </div>

          <section className="candidate-comparison">
            <div className="candidate-section-heading">
              <div>
                <p className="eyebrow">Side-by-side evidence</p>
                <h3>Compare Candidate Blocks</h3>
              </div>
              <span>{compared.length} selected</span>
            </div>
            {compared.length ? (
              <div
                className="candidate-comparison-table"
                role="table"
                aria-label="Candidate site comparison"
              >
                <div role="row">
                  <span>Block</span>
                  <span>Score</span>
                  <span>Population need</span>
                  <span>Infrastructure gap</span>
                  <span>Cost</span>
                </div>
                {compared.map((candidate) => (
                  <div key={candidate.recommendation_id} role="row">
                    <strong>
                      {candidate.project_evidence?.block_name ??
                        candidate.candidate_location?.label ??
                        candidate.ward.name}
                    </strong>
                    <b>{candidate.recommendation_score}</b>
                    <span>{candidate.population_need_score}</span>
                    <span>{candidate.infrastructure_gap_score}</span>
                    <span>৳{money(candidate.estimated_cost)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Select candidates using the Compare buttons above.</p>
            )}
          </section>

          <section className="location-explanation">
            <div className="candidate-section-heading">
              <div>
                <p className="eyebrow">Deterministic explanation</p>
                <h3>Why this location?</h3>
              </div>
              <ArrowUpRight size={18} />
            </div>
            <ul>
              {result.recommendations[0].explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <small>
              The mathematical score is produced entirely by the backend scoring
              engine. Gemini does not rank locations.
            </small>
          </section>
          {result.budget_scenarios?.length > 0 && (
            <section className="candidate-comparison">
              <div className="candidate-section-heading">
                <div>
                  <p className="eyebrow">Budget scenarios</p>
                  <h3>Cost versus impact</h3>
                </div>
              </div>
              <div className="scenario-grid">
                {result.budget_scenarios.map((scenario) => (
                  <article key={scenario.name}>
                    <span>{scenario.name.replaceAll("_", " ")}</span>
                    <strong>৳{money(scenario.budget)}</strong>
                    <small>{scenario.feasible_candidates} feasible sites</small>
                    <p>
                      {scenario.top_candidate?.label ??
                        "No affordable candidate"}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
          {result.sensitivity?.length > 0 && (
            <section className="candidate-comparison">
              <div className="candidate-section-heading">
                <div>
                  <p className="eyebrow">Sensitivity analysis</p>
                  <h3>How weights affect the top score</h3>
                </div>
              </div>
              <div className="dimension-list">
                {result.sensitivity.map((item) => (
                  <div key={item.factor}>
                    <span>{item.factor.replaceAll("_", " ")}</span>
                    <div>
                      <i style={{ width: `${item.resulting_score}%` }} />
                    </div>
                    <strong>{item.resulting_score}</strong>
                  </div>
                ))}
              </div>
            </section>
          )}
          {result.rejected_candidates?.length > 0 && (
            <section className="recommendation-error">
              <AlertTriangle size={18} />
              <div>
                <strong>
                  {result.rejected_candidates.length} candidates rejected by
                  budget
                </strong>
                <p>
                  {result.rejected_candidates[0].candidate_location.label}:{" "}
                  {result.rejected_candidates[0].reason}
                </p>
              </div>
            </section>
          )}
        </>
      )}
    </article>
  );
}
