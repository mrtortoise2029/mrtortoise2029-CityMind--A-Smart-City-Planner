import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, MapPinned } from "lucide-react";
import {
  getProjectBlockAnalysis,
  simulateProjectBlockHealth,
} from "../api/client.js";

const labels = {
  healthcare: "Healthcare",
  education: "Education",
  mobility: "Mobility",
  environment: "Environment",
  green_space: "Green space",
  infrastructure: "Infrastructure",
  accessibility: "Accessibility",
};

export function ProjectBlockHealthDashboard({ onNavigate, planningProject }) {
  const [state, setState] = useState({
    loading: true,
    error: "",
    blocks: [],
    plannedBlocks: [],
    summary: null,
    plannedSummary: null,
    history: [],
  });
  const [selectedId, setSelectedId] = useState("");
  const [intervention, setIntervention] = useState("HOSPITAL");
  const [simulation, setSimulation] = useState(null);
  useEffect(() => {
    getProjectBlockAnalysis(planningProject.id)
      .then((result) => {
        const blocks = result.blocks;
        setState({
          loading: false,
          error: "",
          blocks,
          plannedBlocks: result.planned_blocks ?? blocks,
          summary: result.summary ?? null,
          plannedSummary: result.planned_summary ?? result.summary ?? null,
          history: result.history ?? [],
        });
        setSelectedId((current) =>
          blocks.some(({ block }) => String(block.id) === current)
            ? current
            : String(blocks[0]?.block.id ?? ""),
        );
      })
      .catch((error) =>
        setState({
          loading: false,
          error:
            error.response?.data?.error?.message ?? "Block plan is unavailable",
          blocks: [],
          plannedBlocks: [],
          summary: null,
          plannedSummary: null,
          history: [],
        }),
      );
  }, [planningProject.id]);
  const selected = useMemo(
    () => state.blocks.find(({ block }) => String(block.id) === selectedId),
    [selectedId, state.blocks],
  );
  const selectedPlanned = useMemo(
    () =>
      state.plannedBlocks.find(
        ({ block }) => String(block.id) === selectedId,
      ) ?? selected,
    [selected, selectedId, state.plannedBlocks],
  );
  const runSimulation = async () =>
    setSimulation(
      await simulateProjectBlockHealth(planningProject.id, {
        blockId: Number(selectedId),
        intervention,
      }),
    );
  const details = selected?.score_details ?? {
    raw_score: selected?.score ?? 0,
    contributions: {},
    penalties: { constraint: 0, missing_data: 0 },
  };

  return (
    <article className="project-block-health">
      <header>
        <div>
          <p className="eyebrow">Project urban health</p>
          <h2>Health by Development Block</h2>
          <p>
            Current health counts implemented assets. Planned health previews
            every non-rejected proposal inside the live boundary.
          </p>
        </div>
        {state.blocks.length > 0 && (
          <label>
            <span>Selected block</span>
            <select
              aria-label="Select project block"
              onChange={(event) => {
                setSelectedId(event.target.value);
                setSimulation(null);
              }}
              value={selectedId}
            >
              {state.blocks.map(({ block }) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>
      {state.loading && (
        <div className="block-health-empty">
          <span className="loader" />
          <p>Loading project blocks…</p>
        </div>
      )}
      {state.error && (
        <div className="block-health-empty error">
          <AlertTriangle />
          <p>{state.error}</p>
        </div>
      )}
      {!state.loading && !state.error && !selected && (
        <div className="block-health-empty">
          <MapPinned size={30} />
          <h3>No blocks are defined inside this boundary</h3>
          <p>Draw development blocks before running block-level analysis.</p>
          <button onClick={() => onNavigate("gis")} type="button">
            Draw blocks on GIS map
          </button>
        </div>
      )}
      {selected && (
        <>
          <div className="block-health-grid">
            <section className="block-identity-card">
              <MapPinned size={22} />
              <span>Selected planning unit</span>
              <h3>{selected.block.name}</h3>
              <dl>
                <div>
                  <dt>Population</dt>
                  <dd>{selected.population.toLocaleString()} people</dd>
                </div>
                <div>
                  <dt>Households</dt>
                  <dd>{selected.households.toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Land use</dt>
                  <dd>{selected.block.land_use}</dd>
                </div>
                <div>
                  <dt>Area</dt>
                  <dd>{selected.area_acres.toLocaleString()} acres</dd>
                </div>
                <div>
                  <dt>Vulnerability</dt>
                  <dd>
                    {selected.vulnerability_score ?? 100 - selected.score}/100
                  </dd>
                </div>
              </dl>
              <i className="confidence-chip simulated">
                {selected.population_confidence}
              </i>
              <button onClick={() => onNavigate("gis")} type="button" className="view-on-map">
                View block on map
              </button>
            </section>
            <section className="block-score-card">
              <div
                className="block-score-ring"
                style={{ "--block-score": `${selected.score * 3.6}deg` }}
              >
                <div>
                  <strong>{selected.score}</strong>
                  <span>/100</span>
                </div>
              </div>
              <h3>{selected.category}</h3>
              <div className="health-live-comparison">
                <span>
                  Current <b>{selected.score}</b>
                </span>
                <span>
                  Planned <b>{selectedPlanned.score}</b>
                </span>
                <em>
                  {selectedPlanned.score - selected.score >= 0 ? "+" : ""}
                  {selectedPlanned.score - selected.score} potential
                </em>
              </div>
              <p>
                Raw {details.raw_score}; penalties: constraint −
                {details.penalties.constraint}, missing data −
                {details.penalties.missing_data}.
              </p>
              <dl>
                <div>
                  <dt>Hospitals</dt>
                  <dd>
                    {selected.facilities.hospitals} →{" "}
                    {selectedPlanned.facilities.hospitals}
                  </dd>
                </div>
                <div>
                  <dt>Schools</dt>
                  <dd>
                    {selected.facilities.schools} →{" "}
                    {selectedPlanned.facilities.schools}
                  </dd>
                </div>
                <div>
                  <dt>Parks</dt>
                  <dd>
                    {selected.facilities.parks} →{" "}
                    {selectedPlanned.facilities.parks}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
          <section className="block-component-grid">
            {Object.entries(selected.components).map(([key, score]) => (
              <article key={key}>
                <div>
                  <span>{labels[key]}</span>
                  <strong>{score}</strong>
                </div>
                <div>
                  <i style={{ width: `${score}%` }} />
                </div>
                <small>
                  Weighted contribution {details.contributions[key] ?? "—"}
                </small>
              </article>
            ))}
          </section>
          <section className="health-simulation-card">
            <div>
              <Activity size={18} />
              <h3>Before / After Planning Simulation</h3>
              <span className="confidence-chip simulated">SIMULATED</span>
            </div>
            <div className="intervention-container">
  <label htmlFor="health-intervention">Intervention</label>

  <div className="intervention-actions">
    <select
      id="health-intervention"
      aria-label="Health intervention"
      onChange={(event) => setIntervention(event.target.value)}
      value={intervention}
    >
      <option value="HOSPITAL">Add hospital</option>
      <option value="SCHOOL">Add school</option>
      <option value="PARK">Add park</option>
      <option value="ROAD">Add local road</option>
      <option value="DRAINAGE">Add drainage corridor</option>
    </select>

    <button onClick={runSimulation} type="button">
      Simulate impact
    </button>
  </div>
</div>

            {simulation && (
              <div className="simulation-result">
                <strong>
                  {simulation.before.score} → {simulation.after.score}
                </strong>
                <span>
                  {simulation.score_change >= 0 ? "+" : ""}
                  {simulation.score_change} points
                </span>
                <p>No project data was changed.</p>
              </div>
            )}
          </section>
          <section className="health-ranking-card">
            <h3>Block vulnerability ranking</h3>
            <ol>
              {[...state.blocks]
                .sort(
                  (a, b) =>
                    (b.vulnerability_score ?? 100 - b.score) -
                    (a.vulnerability_score ?? 100 - a.score),
                )
                .map((item) => (
                  <li key={item.block.id}>
                    <span>{item.block.name}</span>
                    <b>{item.score}/100</b>
                    <em>
                      Planned{" "}
                      {state.plannedBlocks.find(
                        ({ block }) => block.id === item.block.id,
                      )?.score ?? item.score}
                      /100
                    </em>
                  </li>
                ))}
            </ol>
            <small>
              {state.history.length} recorded health state
              {state.history.length === 1 ? "" : "s"} for this project.
            </small>
          </section>
        </>
      )}
    </article>
  );
}
