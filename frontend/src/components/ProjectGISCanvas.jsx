import { useEffect, useMemo, useState } from "react";
import { divIcon, DomEvent } from "leaflet";
import {
  Building2,
  CheckCircle2,
  CircleDot,
  Crosshair,
  GraduationCap,
  Hospital,
  Layers3,
  Leaf,
  MapPin,
  Maximize2,
  Pencil,
  Route,
  Ruler,
  Save,
  Trash2,
  X,
} from "lucide-react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  acceptEvaluatedProjectLocation,
  createPlanningFeature,
  deletePlanningFeature,
  evaluateProjectLocation,
  getPlanningFeatures,
  getProjectValidation,
  updatePlanningFeature,
} from "../api/client.js";
import { FacilityMarkers } from "./map/FacilityMarkers.jsx";
import { WardLayer } from "./map/WardLayer.jsx";
import {
  calculateBoundaryMetrics,
  geoJSONToPositions,
  positionsToGeoJSON,
} from "../utils/projectGeometry.js";
import {
  filterMapDataToProjectContext,
  isPointInProjectContext,
} from "../utils/projectContext.js";

const existingLayerConfiguration = [
  ["hospital", "Hospitals"],
  ["school", "Schools"],
  ["park", "Parks"],
  ["roads", "Roads"],
  ["water", "Water bodies"],
  ["other", "Existing facilities"],
  ["population", "Population"],
  ["environment", "Environment"],
];
const projectLayerConfiguration = [
  ["projectBoundary", "Project Boundary"],
  ["residential", "Residential Zones"],
  ["commercial", "Commercial Zones"],
  ["education", "Education Zones"],
  ["healthcare", "Healthcare Zones"],
  ["green", "Green Zones"],
  ["projectRoads", "Road Network"],
  ["future", "Future Development Areas"],
  ["blocks", "Development Blocks"],
  ["gates", "Project Gates"],
  ["proposals", "Planning Proposals"],
  ["coverageGaps", "Coverage Gaps"],
  ["serviceAreas", "Service Radius"],
  ["populationHeat", "Population Intensity"],
];
const initialLayers = {
  ...Object.fromEntries(
    existingLayerConfiguration.map(([key]) => [key, false]),
  ),
  ...Object.fromEntries(projectLayerConfiguration.map(([key]) => [key, true])),
  coverageGaps: false,
  proposals: true,
  serviceAreas: false,
  populationHeat: false,
};
const zoneLayers = {
  RESIDENTIAL_ZONE: "residential",
  COMMERCIAL_ZONE: "commercial",
  EDUCATION_ZONE: "education",
  HEALTHCARE_ZONE: "healthcare",
  GREEN_ZONE: "green",
  ROAD_PROPOSAL: "projectRoads",
  FUTURE_DEVELOPMENT_AREA: "future",
  BLOCK: "blocks",
  PRIMARY_ROAD: "projectRoads",
  SECONDARY_ROAD: "projectRoads",
  LOCAL_ROAD: "projectRoads",
  MAIN_GATE: "gates",
  SECONDARY_GATE: "gates",
  RECREATION_ZONE: "green",
  UTILITY_ZONE: "future",
  DRAINAGE_CORRIDOR: "projectRoads",
  WATER_BODY: "future",
};
const zoneColors = {
  RESIDENTIAL_ZONE: "#5aa8ff",
  COMMERCIAL_ZONE: "#d895ff",
  EDUCATION_ZONE: "#4aa7e8",
  HEALTHCARE_ZONE: "#f36c79",
  GREEN_ZONE: "#4bd396",
  FUTURE_DEVELOPMENT_AREA: "#f2bd62",
  BLOCK: "#77b7ff",
  RECREATION_ZONE: "#4bd396",
  UTILITY_ZONE: "#b79cf6",
  WATER_BODY: "#48bde8",
};
const toolConfiguration = [
  ["EVALUATE_LOCATION", Crosshair, "Analyze Exact Location"],
  ["DRAW_AREA", Maximize2, "Draw Area"],
  ["EDIT_BOUNDARY", Pencil, "Edit Boundary"],
  ["ADD_BLOCK", Maximize2, "Add Development Block"],
  ["ADD_ZONE", Layers3, "Add Land Use Zone"],
  ["ADD_ROAD", Route, "Add Hierarchical Road"],
  ["ADD_GATE", MapPin, "Add Project Gate"],
  ["MEASURE_DISTANCE", Ruler, "Measure Distance"],
  ["MEASURE_AREA", Maximize2, "Measure Area"],
  ["PLANNING_POINT", MapPin, "Add Planning Point"],
  ["FACILITY_PROPOSAL", Building2, "Add Facility Proposal"],
  ["ROAD_PROPOSAL", Route, "Add Road Proposal"],
];
const vertexIcon = divIcon({
  className: "project-boundary-vertex",
  html: "<span></span>",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});
const gapIcon = (severity) =>
  divIcon({
    className: "coverage-gap-marker-shell",
    html: `<span class="coverage-gap-marker ${severity.toLowerCase()}">!</span>`,
    iconAnchor: [15, 15],
    iconSize: [30, 30],
  });

function projectPayload(project, boundary) {
  return {
    name: project.name,
    description: project.description,
    projectType: project.project_type,
    country: project.country,
    cityId: Number(project.city_id),
    region: project.region,
    locationSearch: project.location_search ?? "",
    boundary,
    planningHorizon: Number(project.planning_horizon),
    expectedPopulation: project.expected_population
      ? Number(project.expected_population)
      : null,
    expectedHouseholds: project.expected_households
      ? Number(project.expected_households)
      : null,
    targetDensity: project.target_density
      ? Number(project.target_density)
      : null,
    currentPopulation: project.current_population
      ? Number(project.current_population)
      : null,
    currentHouseholds: project.current_households
      ? Number(project.current_households)
      : null,
    currentDensity: project.current_density
      ? Number(project.current_density)
      : null,
  };
}

function distanceKm([latitude1, longitude1], [latitude2, longitude2]) {
  const radians = (value) => (value * Math.PI) / 180;
  const latitudeDelta = radians(latitude2 - latitude1);
  const longitudeDelta = radians(longitude2 - longitude1);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitude1)) *
      Math.cos(radians(latitude2)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function snapToPlanningGeometry(point, features, thresholdKm = 0.04) {
  const vertices = features.flatMap((feature) => {
    if (feature.geometry.type === "Point")
      return [
        [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
      ];
    const coordinates =
      feature.geometry.type === "Polygon"
        ? feature.geometry.coordinates[0]
        : feature.geometry.coordinates;
    return coordinates.map(([longitude, latitude]) => [latitude, longitude]);
  });
  return vertices.reduce(
    (best, vertex) => {
      const distance = distanceKm(point, vertex);
      return distance <= thresholdKm && distance < best.distance
        ? { point: vertex, distance }
        : best;
    },
    { point, distance: Infinity },
  ).point;
}

function MapActions({ onClick }) {
  useMapEvents({ click: ({ latlng }) => onClick([latlng.lat, latlng.lng]) });
  return null;
}

function CanvasViewport({
  boundary,
  recommendation,
  selectedGap,
  selectedWard,
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedGap?.coordinates)
      map.flyTo(
        [selectedGap.coordinates.latitude, selectedGap.coordinates.longitude],
        16,
        { duration: 0.55 },
      );
    else if (recommendation?.candidate_location)
      map.flyTo(
        [
          recommendation.candidate_location.latitude,
          recommendation.candidate_location.longitude,
        ],
        16,
        { duration: 0.55 },
      );
    else if (selectedWard)
      map.flyTo([selectedWard.latitude, selectedWard.longitude], 14, {
        duration: 0.55,
      });
    else if (boundary.length >= 3)
      map.fitBounds(boundary, { padding: [35, 35], maxZoom: 15 });
  }, [boundary, map, recommendation, selectedGap, selectedWard]);
  return null;
}

function proposedIcon(feature) {
  const label =
    feature.feature_type === "PLANNING_POINT"
      ? "+"
      : feature.feature_type.includes("GATE")
        ? "G"
        : feature.category === "hospital"
          ? "H"
          : feature.category === "school"
            ? "S"
            : feature.category === "park"
              ? "P"
              : feature.category.includes("commercial")
                ? "C"
                : feature.category.includes("road")
                  ? "R"
                  : feature.category.includes("drainage")
                    ? "D"
                    : "P";
  return divIcon({
    className: "proposed-marker-shell",
    html: `<span class="proposed-marker ${feature.source} ${feature.status === "approved" ? "approved" : ""}"><b>${label}</b></span>`,
    iconAnchor: [16, 16],
    iconSize: [32, 32],
  });
}

const mapPlacementModes = new Set([
  "EVALUATE_LOCATION",
  "DRAW_AREA",
  "ADD_BLOCK",
  "ADD_ZONE",
  "ADD_ROAD",
  "ADD_GATE",
  "MEASURE_DISTANCE",
  "MEASURE_AREA",
  "PLANNING_POINT",
  "FACILITY_PROPOSAL",
  "ROAD_PROPOSAL",
]);

function PlanningFeatures({ features, layers, mode, onMapClick }) {
  const placementActive = mapPlacementModes.has(mode);
  const placementEvents = placementActive
    ? {
        click: (event) => {
          DomEvent.stopPropagation(event.originalEvent);
          onMapClick([event.latlng.lat, event.latlng.lng]);
        },
      }
    : undefined;
  return features.map((feature) => {
    const layer = zoneLayers[feature.feature_type];
    if (layer && !layers[layer]) return null;
    if (!layer && !layers.proposals) return null;
    if (feature.geometry.type === "Point") {
      const [longitude, latitude] = feature.geometry.coordinates;
      return (
        <Marker
          eventHandlers={placementEvents}
          icon={proposedIcon(feature)}
          key={feature.id}
          position={[latitude, longitude]}
        >
          {!placementActive && <Popup>
            <b>{feature.name}</b>
            <br />
            {feature.status === "approved"
              ? "Approved · counted in analysis"
              : `Proposed · ${feature.source === "citymind" ? "CityMind option" : "Planner proposal"}`}
          </Popup>}
        </Marker>
      );
    }
    if (feature.geometry.type === "LineString") {
      const width =
        feature.feature_type === "PRIMARY_ROAD"
          ? 7
          : feature.feature_type === "SECONDARY_ROAD"
            ? 5
            : 3;
      return (
        <Polyline
          eventHandlers={placementEvents}
          key={feature.id}
          pathOptions={{
            color: "#ffcf66",
            dashArray: feature.status === "approved" ? undefined : "8 6",
            weight: width,
          }}
          positions={feature.geometry.coordinates.map(
            ([longitude, latitude]) => [latitude, longitude],
          )}
        >
          <Tooltip>
            {feature.name} ·{" "}
            {feature.feature_type.replaceAll("_", " ").toLowerCase()}
          </Tooltip>
          {!placementActive && <Popup>
            <b>{feature.name}</b>
            <br />
            {feature.feature_type.replaceAll("_", " ")}
            <br />
            Width: {feature.properties?.widthMeters ?? "Not set"} m
          </Popup>}
        </Polyline>
      );
    }
    const positions = feature.geometry.coordinates[0].map(
      ([longitude, latitude]) => [latitude, longitude],
    );
    const color = zoneColors[feature.feature_type] ?? "#80b7a5";
    return (
      <Polygon
        eventHandlers={placementEvents}
        key={feature.id}
        pathOptions={{
          color,
          dashArray: feature.status === "approved" ? undefined : "7 5",
          fillColor: color,
          fillOpacity: 0.28,
          weight: 3,
        }}
        positions={positions}
      >
        <Tooltip
          className={
            feature.feature_type === "BLOCK" ? "project-block-label" : undefined
          }
          direction="center"
          permanent={feature.feature_type === "BLOCK"}
        >
          <strong>{feature.name}</strong>
          {feature.feature_type === "BLOCK" &&
          feature.properties?.population ? (
            <small>
              {Number(feature.properties.population).toLocaleString()} people
            </small>
          ) : null}
        </Tooltip>
        {feature.feature_type === "BLOCK" && !placementActive && (
          <Popup>
            <b>{feature.name}</b>
            <br />
            Population:{" "}
            {Number(feature.properties?.population || 0).toLocaleString()} (
            {feature.properties?.populationConfidence ?? "PLANNING_ASSUMPTION"})
            <br />
            Households:{" "}
            {Number(feature.properties?.households || 0).toLocaleString()}
            <br />
            Land use: {feature.properties?.landUse ?? feature.category}
            <br />
            Green space: {Number(feature.properties?.greenSpacePercent || 0)}%
            <br />
            Utility coverage: {Number(feature.properties?.utilityCoverage || 0)}
            %<br />
            Land suitability:{" "}
            {Number(feature.properties?.landSuitability ?? 70)}/100
            <br />
            Constraint: {feature.properties?.constraintLevel ?? "UNASSESSED"}
            {feature.properties?.constraintNote
              ? ` — ${feature.properties.constraintNote}`
              : ""}
            <br />
            Phase: {feature.properties?.phase ?? "Not assigned"}
          </Popup>
        )}
      </Polygon>
    );
  });
}

function PlanningCanvasMap({
  boundary,
  contextData,
  draftBoundary,
  draftFeaturePoints,
  features,
  layers,
  measurePoints,
  mode,
  gapAnalysis,
  onMapClick,
  onSelectWard,
  onUpdateBoundaryVertex,
  recommendation,
  roadPoints,
  selectedGap,
  selectedWard,
  baseLayer,
  locationEvaluation,
}) {
  const center = boundary[0] ?? [
    contextData.city.latitude,
    contextData.city.longitude,
  ];
  const wardLayers = {
    wards: false,
    population: layers.population,
    pollution: layers.environment,
  };
  return (
    <MapContainer
      center={center}
      className="project-canvas-map"
      scrollWheelZoom
      zoom={13}
    >
      <TileLayer
        attribution={
          baseLayer === "satellite"
            ? "Tiles &copy; Esri"
            : "&copy; OpenStreetMap contributors"
        }
        url={
          baseLayer === "satellite"
            ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        }
      />
      <CanvasViewport
        boundary={boundary}
        recommendation={recommendation}
        selectedGap={selectedGap}
        selectedWard={selectedWard}
      />
      <MapActions onClick={onMapClick} />
      <WardLayer
        layers={wardLayers}
        onSelectWard={onSelectWard}
        selectedWardId={selectedWard?.id}
        wards={contextData.wards}
      />
      {layers.roads &&
        contextData.roads
          .filter((road) => road.geometry?.length > 1)
          .map((road) => (
            <Polyline
              eventHandlers={{ click: () => onSelectWard(road.ward_id) }}
              key={road.id}
              pathOptions={{ color: "#748d85", opacity: 0.8, weight: 3 }}
              positions={road.geometry}
            >
              <Tooltip>{road.name} · existing road</Tooltip>
            </Polyline>
          ))}
      <FacilityMarkers
        facilities={contextData.facilities}
        layers={layers}
        onSelectWard={onSelectWard}
      />
      {layers.serviceAreas &&
        contextData.facilities.map((facility) => (
          <Circle
            center={[facility.latitude, facility.longitude]}
            key={`service-${facility.id}`}
            pathOptions={{ color: "#69f0bd", fillOpacity: 0.04, weight: 1 }}
            radius={
              { hospital: 3000, school: 1500, park: 1000 }[facility.type] ??
              1200
            }
          >
            <Tooltip>{facility.name} service radius</Tooltip>
          </Circle>
        ))}
      {layers.populationHeat &&
        features
          .filter(({ feature_type: type }) => type === "BLOCK")
          .map((feature) => {
            const points = feature.geometry.coordinates[0];
            const latitude =
              points.reduce((sum, point) => sum + point[1], 0) / points.length;
            const longitude =
              points.reduce((sum, point) => sum + point[0], 0) / points.length;
            const population = Number(feature.properties?.population || 0);
            return (
              <CircleMarker
                center={[latitude, longitude]}
                key={`population-${feature.id}`}
                pathOptions={{
                  color: "#ff826e",
                  fillColor: "#ff5f57",
                  fillOpacity: 0.25,
                }}
                radius={Math.max(8, Math.min(32, population / 1000))}
              >
                <Tooltip>
                  {feature.name}: {population.toLocaleString()} people
                </Tooltip>
              </CircleMarker>
            );
          })}
      {layers.projectBoundary && boundary.length >= 3 && (
        <Polygon
          pathOptions={{
            color: "#69f0bd",
            fillColor: "#28a878",
            fillOpacity: 0.2,
            weight: 5,
          }}
          positions={boundary}
        >
          <Tooltip>Project boundary</Tooltip>
        </Polygon>
      )}
      {mode === "EDIT_BOUNDARY" &&
        draftBoundary.map((position, index) => (
          <Marker
            draggable
            eventHandlers={{
              dragend: ({ target }) =>
                onUpdateBoundaryVertex(index, target.getLatLng()),
            }}
            icon={vertexIcon}
            key={`${index}-${position.join("-")}`}
            position={position}
          />
        ))}
      {mode === "EDIT_BOUNDARY" && draftBoundary.length >= 3 && (
        <Polygon
          pathOptions={{
            color: "#f8f5d7",
            dashArray: "5 5",
            fillColor: "#35bd89",
            fillOpacity: 0.18,
            weight: 3,
          }}
          positions={draftBoundary}
        />
      )}
      {mode === "DRAW_AREA" && draftBoundary.length >= 2 && (
        <Polyline
          pathOptions={{ color: "#6ff0be", dashArray: "6 5", weight: 3 }}
          positions={draftBoundary}
        />
      )}
      {mode === "MEASURE_DISTANCE" && measurePoints.length > 0 && (
        <Polyline
          pathOptions={{ color: "#ffd166", dashArray: "5 5", weight: 3 }}
          positions={measurePoints}
        />
      )}
      {mode === "MEASURE_AREA" && measurePoints.length > 1 && (
        <Polygon
          pathOptions={{
            color: "#ffd166",
            dashArray: "5 5",
            fillOpacity: 0.12,
          }}
          positions={measurePoints}
        />
      )}
      {mode === "ROAD_PROPOSAL" && roadPoints.length > 0 && (
        <Polyline
          pathOptions={{ color: "#ffcf66", dashArray: "7 5", weight: 4 }}
          positions={roadPoints}
        />
      )}
      {mode === "ADD_ROAD" && draftFeaturePoints.length > 0 && (
        <Polyline
          pathOptions={{ color: "#ffcf66", dashArray: "7 5", weight: 5 }}
          positions={draftFeaturePoints}
        />
      )}
      {(mode === "ADD_BLOCK" || mode === "ADD_ZONE") &&
        draftFeaturePoints.length > 1 && (
          <Polygon
            pathOptions={{
              color: "#77b7ff",
              dashArray: "6 5",
              fillOpacity: 0.16,
            }}
            positions={draftFeaturePoints}
          />
        )}
      <PlanningFeatures
        features={features}
        layers={layers}
        mode={mode}
        onMapClick={onMapClick}
      />
      {locationEvaluation?.selection && (
        <Marker
          icon={proposedIcon({
            feature_type: "FACILITY_PROPOSAL",
            category: locationEvaluation.selection.facility_type.toLowerCase(),
            source: "citymind",
          })}
          position={[
            locationEvaluation.selection.latitude,
            locationEvaluation.selection.longitude,
          ]}
        >
          <Popup>
            <b>Evaluated location</b>
            <br />
            {locationEvaluation.status.replaceAll("_", " ")} ·{" "}
            {locationEvaluation.suitability_score}/100
          </Popup>
        </Marker>
      )}
      {recommendation?.candidate_location && (
        <Marker
          icon={proposedIcon({
            feature_type: "FACILITY_PROPOSAL",
            category: recommendation.project_type.toLowerCase(),
            source: "citymind",
          })}
          position={[
            recommendation.candidate_location.latitude,
            recommendation.candidate_location.longitude,
          ]}
        >
          <Popup>
            <b>
              {recommendation.project_evidence?.block_name ??
                recommendation.candidate_location.label}
            </b>
            <br />
            CityMind option · {recommendation.recommendation_score}/100
            <br />
            {Number(
              recommendation.project_evidence?.block_population || 0,
            ).toLocaleString()}{" "}
            planned residents
          </Popup>
        </Marker>
      )}
      {layers.coverageGaps &&
        gapAnalysis?.critical_areas.map((area) => (
          <Marker
            icon={gapIcon(area.severity)}
            key={area.id}
            position={[area.coordinates.latitude, area.coordinates.longitude]}
          >
            <Popup>
              <b>
                {area.site} · {area.category}
              </b>
              <br />
              {area.reason}
              <br />
              {area.confidence}
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}

function LayerToggle({ active, label, onClick }) {
  return (
    <button
      aria-pressed={active}
      className={active ? "active" : ""}
      onClick={onClick}
      type="button"
    >
      <span />
      {label}
    </button>
  );
}

function recommendationConstraints(ward) {
  if (!ward) return [];
  return [
    Number(ward.air_quality_index) > 150
      ? `High air-quality pressure (AQI ${ward.air_quality_index})`
      : null,
    Number(ward.parks) === 0
      ? "No mapped park within the candidate zone"
      : null,
    Number(ward.good_road_percent) < 50
      ? "Road-condition constraint requires further review"
      : null,
  ].filter(Boolean);
}

export function ProjectGISCanvas({
  focusRequest,
  gapAnalysis: initialGapAnalysis = null,
  mapData,
  planningProject,
  onUpdateProject,
}) {
  const [layers, setLayers] = useState(initialLayers);
  const [bufferKm, setBufferKm] = useState(0);
  const [features, setFeatures] = useState([]);
  const [mode, setMode] = useState(null);
  const [facilityType, setFacilityType] = useState("hospital");
  const [draftBoundary, setDraftBoundary] = useState(() =>
    geoJSONToPositions(planningProject.area?.boundary_geojson),
  );
  const [measurePoints, setMeasurePoints] = useState([]);
  const [roadPoints, setRoadPoints] = useState([]);
  const [draftFeaturePoints, setDraftFeaturePoints] = useState([]);
  const [blockName, setBlockName] = useState("Block A");
  const [blockLandUse, setBlockLandUse] = useState("residential");
  const [blockPopulation, setBlockPopulation] = useState(10000);
  const [blockHouseholds, setBlockHouseholds] = useState(2200);
  const [blockGreenSpace, setBlockGreenSpace] = useState(8);
  const [blockUtilityCoverage, setBlockUtilityCoverage] = useState(60);
  const [blockLandSuitability, setBlockLandSuitability] = useState(70);
  const [blockConstraintLevel, setBlockConstraintLevel] =
    useState("UNASSESSED");
  const [blockConstraintNote, setBlockConstraintNote] = useState("");
  const [zoneType, setZoneType] = useState("RESIDENTIAL_ZONE");
  const [roadType, setRoadType] = useState("PRIMARY_ROAD");
  const [roadWidth, setRoadWidth] = useState(24);
  const [gateType, setGateType] = useState("MAIN_GATE");
  const [measurement, setMeasurement] = useState(null);
  const [selectedWardId, setSelectedWardId] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [gapAnalysis, setGapAnalysis] = useState(initialGapAnalysis);
  const [selectedGap, setSelectedGap] = useState(null);
  const [notice, setNotice] = useState("");
  const [baseLayer, setBaseLayer] = useState("streets");
  const [validation, setValidation] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [locationEvaluation, setLocationEvaluation] = useState(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const boundaryGeometry = planningProject.area?.boundary_geojson;
  const boundary = useMemo(
    () => geoJSONToPositions(boundaryGeometry),
    [boundaryGeometry],
  );
  const contextData = useMemo(
    () => filterMapDataToProjectContext(mapData, boundaryGeometry, bufferKm),
    [mapData, boundaryGeometry, bufferKm],
  );
  const visibleFeatures = useMemo(
    () =>
      features.filter((feature) => {
        const coordinates =
          feature.geometry.type === "Point"
            ? [feature.geometry.coordinates]
            : feature.geometry.type === "LineString"
              ? feature.geometry.coordinates
              : feature.geometry.coordinates[0];
        return coordinates.every(([longitude, latitude]) =>
          isPointInProjectContext(latitude, longitude, boundaryGeometry, 0),
        );
      }),
    [boundaryGeometry, features],
  );
  const visibleGapAnalysis = useMemo(
    () =>
      gapAnalysis
        ? {
            ...gapAnalysis,
            critical_areas: (gapAnalysis.critical_areas ?? []).filter((area) =>
              isPointInProjectContext(
                area.coordinates.latitude,
                area.coordinates.longitude,
                boundaryGeometry,
                0,
              ),
            ),
          }
        : null,
    [boundaryGeometry, gapAnalysis],
  );
  const selectedWard =
    contextData.wards.find(({ id }) => Number(id) === Number(selectedWardId)) ??
    null;

  useEffect(() => {
    getPlanningFeatures(planningProject.id)
      .then(setFeatures)
      .catch(() => setNotice("Planning proposals could not be loaded."));
  }, [planningProject.id]);
  useEffect(() => {
    const focus = (event) => {
      const candidate = event.detail?.candidate;
      setSelectedWardId(Number(event.detail?.wardId));
      setRecommendation(candidate ?? null);
    };
    window.addEventListener("citymind:focus-ward", focus);
    return () => window.removeEventListener("citymind:focus-ward", focus);
  }, []);
  useEffect(() => {
    if (initialGapAnalysis) setGapAnalysis(initialGapAnalysis);
  }, [initialGapAnalysis]);
  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.type === "gap") {
      setSelectedGap(focusRequest.area ?? null);
      setRecommendation(null);
      setSelectedWardId(null);
      return;
    }
    setSelectedGap(null);
    setRecommendation(focusRequest.candidate ?? null);
    setSelectedWardId(Number(focusRequest.wardId));
  }, [focusRequest]);
  useEffect(() => {
    const showAnalysis = (event) => setGapAnalysis(event.detail ?? null);
    const focusGap = (event) => {
      setSelectedGap(event.detail?.area ?? null);
      setRecommendation(null);
      setSelectedWardId(null);
    };
    window.addEventListener("citymind:project-gap-analysis", showAnalysis);
    window.addEventListener("citymind:focus-gap-area", focusGap);
    return () => {
      window.removeEventListener("citymind:project-gap-analysis", showAnalysis);
      window.removeEventListener("citymind:focus-gap-area", focusGap);
    };
  }, []);

  const selectTool = (tool) => {
    setNotice("");
    setMeasurement(null);
    setMeasurePoints([]);
    setRoadPoints([]);
    setDraftFeaturePoints([]);
    if (tool === "DRAW_AREA") setDraftBoundary([]);
    if (tool === "EDIT_BOUNDARY") setDraftBoundary(boundary);
    if (tool === "ADD_BLOCK") {
      const count = features.filter(
        ({ feature_type: type }) => type === "BLOCK",
      ).length;
      setBlockName(`Block ${String.fromCharCode(65 + Math.min(count, 25))}`);
    }
    setMode(tool);
    if (tool === "EVALUATE_LOCATION") setLocationEvaluation(null);
  };
  const announcePlanChange = (detail) =>
    window.dispatchEvent(
      new CustomEvent("citymind:plan-updated", {
        detail: { projectId: planningProject.id, ...detail },
      }),
    );
  const addFeature = async (input) => {
    try {
      const feature = await createPlanningFeature(planningProject.id, input);
      setFeatures((current) => [...current, feature]);
      setUndoStack((current) =>
        [...current, { type: "CREATE", feature }].slice(-20),
      );
      setRedoStack([]);
      setNotice(`${feature.name} added to the project plan.`);
      announcePlanChange({ action: "feature-created", featureId: feature.id });
    } catch (error) {
      setNotice(
        error.response?.data?.error?.message ??
          "Unable to save the planning proposal.",
      );
    }
  };
  const handleMapClick = async (rawPoint) => {
    const point =
      mode === "EVALUATE_LOCATION"
        ? rawPoint
        : snapToPlanningGeometry(rawPoint, features);
    if (mode === "EVALUATE_LOCATION") {
      setEvaluationLoading(true);
      setNotice("");
      try {
        const result = await evaluateProjectLocation(planningProject.id, {
          facilityType: facilityType.toUpperCase().replaceAll(" ", "_"),
          latitude: point[0],
          longitude: point[1],
        });
        setLocationEvaluation(result);
      } catch (error) {
        setNotice(
          error.response?.data?.error?.message ??
            "Unable to evaluate this location.",
        );
      } finally {
        setEvaluationLoading(false);
        setMode(null);
      }
      return;
    }
    if (mode === "DRAW_AREA")
      setDraftBoundary((current) => [...current, point]);
    if (mode === "MEASURE_DISTANCE") {
      const next = [...measurePoints, point];
      setMeasurePoints(next);
      if (next.length === 2) {
        setMeasurement({
          label: "Distance",
          value: `${distanceKm(next[0], next[1]).toFixed(2)} km`,
        });
        setMode(null);
      }
    }
    if (mode === "MEASURE_AREA")
      setMeasurePoints((current) => [...current, point]);
    if (mode === "ADD_BLOCK" || mode === "ADD_ZONE" || mode === "ADD_ROAD")
      setDraftFeaturePoints((current) => [...current, point]);
    if (mode === "ADD_GATE") {
      await addFeature({
        featureType: gateType,
        category: "entry",
        name:
          gateType === "MAIN_GATE"
            ? "Main Project Gate"
            : "Secondary Project Gate",
        geometry: { type: "Point", coordinates: [point[1], point[0]] },
      });
      setMode(null);
    }
    if (mode === "PLANNING_POINT") {
      await addFeature({
        featureType: "PLANNING_POINT",
        category: "planning",
        name: `Planning Point ${features.length + 1}`,
        geometry: { type: "Point", coordinates: [point[1], point[0]] },
      });
      setMode(null);
    }
    if (mode === "FACILITY_PROPOSAL") {
      const label = facilityType[0].toUpperCase() + facilityType.slice(1);
      await addFeature({
        featureType: "FACILITY_PROPOSAL",
        category: facilityType,
        name: `Proposed ${label}`,
        geometry: { type: "Point", coordinates: [point[1], point[0]] },
      });
      setMode(null);
    }
    if (mode === "ROAD_PROPOSAL") {
      const next = [...roadPoints, point];
      setRoadPoints(next);
      if (next.length === 2) {
        await addFeature({
          featureType: "ROAD_PROPOSAL",
          category: "road",
          name: `Proposed Road ${features.filter(({ feature_type: type }) => type === "ROAD_PROPOSAL").length + 1}`,
          geometry: {
            type: "LineString",
            coordinates: next.map(([latitude, longitude]) => [
              longitude,
              latitude,
            ]),
          },
        });
        setRoadPoints([]);
        setMode(null);
      }
    }
  };
  const acceptLocation = async () => {
    if (!locationEvaluation) return;
    try {
      const { selection } = locationEvaluation;
      const result = await acceptEvaluatedProjectLocation(planningProject.id, {
        facilityType: selection.facility_type,
        latitude: selection.latitude,
        longitude: selection.longitude,
        name: `Proposed ${selection.facility_type
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())}`,
      });
      setFeatures((current) => [...current, result.feature]);
      setLocationEvaluation(null);
      setNotice(
        `${result.feature.name} accepted into the master plan. Analyses are recalculating.`,
      );
      announcePlanChange({
        action: "evaluated-location-accepted",
        featureId: result.feature.id,
      });
    } catch (error) {
      setNotice(
        error.response?.data?.error?.message ??
          "Unable to add this location to the master plan.",
      );
    }
  };
  const finishPlanningFeature = async () => {
    if (
      (mode === "ADD_BLOCK" || mode === "ADD_ZONE") &&
      draftFeaturePoints.length < 3
    ) {
      setNotice("Select at least three points to create the planning polygon.");
      return;
    }
    if (mode === "ADD_ROAD" && draftFeaturePoints.length < 2) {
      setNotice("Select at least two points to create a road alignment.");
      return;
    }
    if (mode === "ADD_BLOCK") {
      const ring = [...draftFeaturePoints, draftFeaturePoints[0]].map(
        ([latitude, longitude]) => [longitude, latitude],
      );
      await addFeature({
        featureType: "BLOCK",
        category: blockLandUse,
        name: blockName,
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {
          landUse: blockLandUse,
          phase: 1,
          population: Number(blockPopulation),
          households: Number(blockHouseholds),
          populationConfidence: "PLANNING_ASSUMPTION",
          greenSpacePercent: Number(blockGreenSpace),
          utilityCoverage: Number(blockUtilityCoverage),
          landSuitability: Number(blockLandSuitability),
          constraintLevel: blockConstraintLevel,
          constraintNote: blockConstraintNote.trim() || null,
        },
      });
    } else if (mode === "ADD_ZONE") {
      const ring = [...draftFeaturePoints, draftFeaturePoints[0]].map(
        ([latitude, longitude]) => [longitude, latitude],
      );
      await addFeature({
        featureType: zoneType,
        category: zoneType.replace("_ZONE", "").toLowerCase(),
        name: `${zoneType.replaceAll("_", " ")} ${features.length + 1}`,
        geometry: { type: "Polygon", coordinates: [ring] },
      });
    } else if (mode === "ADD_ROAD") {
      await addFeature({
        featureType: roadType,
        category: roadType.replace("_ROAD", "").toLowerCase(),
        name: `${roadType.replaceAll("_", " ")} ${features.length + 1}`,
        geometry: {
          type: "LineString",
          coordinates: draftFeaturePoints.map(([latitude, longitude]) => [
            longitude,
            latitude,
          ]),
        },
        properties: { widthMeters: Number(roadWidth) },
      });
    }
    setDraftFeaturePoints([]);
    setMode(null);
  };
  const saveBoundary = async () => {
    if (draftBoundary.length < 3) {
      setNotice("Draw at least three boundary points before saving.");
      return;
    }
    try {
      const saved = await onUpdateProject(
        projectPayload(planningProject, positionsToGeoJSON(draftBoundary)),
      );
      setDraftBoundary(geoJSONToPositions(saved.area.boundary_geojson));
      setMode(null);
      setNotice("Project boundary updated.");
      announcePlanChange({ action: "boundary-updated" });
    } catch (error) {
      setNotice(
        error.response?.data?.error?.message ??
          "Unable to update the project boundary.",
      );
    }
  };
  const finishAreaMeasurement = () => {
    if (measurePoints.length < 3) {
      setNotice("Select at least three points to measure an area.");
      return;
    }
    const value = calculateBoundaryMetrics(measurePoints);
    setMeasurement({
      label: "Measured area",
      value: `${value.areaAcres.toLocaleString()} acres · ${value.areaSqKm.toLocaleString()} km²`,
    });
    setMode(null);
  };
  const removeFeature = async (featureId) => {
    try {
      const feature = features.find(({ id }) => id === featureId);
      await deletePlanningFeature(planningProject.id, featureId);
      setFeatures((current) => current.filter(({ id }) => id !== featureId));
      if (feature)
        setUndoStack((current) =>
          [...current, { type: "DELETE", feature }].slice(-20),
        );
      setRedoStack([]);
      announcePlanChange({ action: "feature-deleted", featureId });
    } catch (error) {
      setNotice(
        error.response?.data?.error?.message ??
          "Unable to remove the planning proposal.",
      );
    }
  };
  const featureInput = (feature) => ({
    featureType: feature.feature_type,
    category: feature.category ?? undefined,
    name: feature.name,
    geometry: feature.geometry,
    status: feature.status,
    properties: feature.properties ?? undefined,
  });
  const approveFeature = async (feature) => {
    try {
      const approved = await updatePlanningFeature(
        planningProject.id,
        feature.id,
        {
          ...featureInput(feature),
          status: "approved",
        },
      );
      setFeatures((current) =>
        current.map((item) => (item.id === approved.id ? approved : item)),
      );
      setNotice(
        `${approved.name} approved and included in all project calculations.`,
      );
      announcePlanChange({
        action: "feature-approved",
        featureId: approved.id,
      });
    } catch (error) {
      setNotice(
        error.response?.data?.error?.message ??
          "Unable to approve this plan item.",
      );
    }
  };
  const invertAction = async (action) => {
    if (action.type === "CREATE") {
      await deletePlanningFeature(planningProject.id, action.feature.id);
      setFeatures((current) =>
        current.filter(({ id }) => id !== action.feature.id),
      );
      return { type: "DELETE", feature: action.feature };
    }
    const restored = await createPlanningFeature(
      planningProject.id,
      featureInput(action.feature),
    );
    setFeatures((current) => [...current, restored]);
    return { type: "CREATE", feature: restored };
  };
  const undo = async () => {
    const action = undoStack.at(-1);
    if (!action) return;
    const inverse = await invertAction(action);
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, inverse]);
  };
  const redo = async () => {
    const action = redoStack.at(-1);
    if (!action) return;
    const inverse = await invertAction(action);
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, inverse]);
  };
  const exportGeoJSON = () => {
    const content = {
      type: "FeatureCollection",
      features: features.map((feature) => ({
        type: "Feature",
        geometry: feature.geometry,
        properties: {
          featureType: feature.feature_type,
          category: feature.category,
          name: feature.name,
          status: feature.status,
          ...feature.properties,
        },
      })),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/geo+json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${planningProject.name.replaceAll(" ", "-")}-plan.geojson`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const importGeoJSON = async (event) => {
    try {
      const collection = JSON.parse(await event.target.files[0].text());
      for (const [index, item] of (collection.features ?? []).entries()) {
        const type =
          item.properties?.featureType ??
          {
            Point: "PLANNING_POINT",
            LineString: "ROAD_PROPOSAL",
            Polygon: "BLOCK",
          }[item.geometry?.type];
        await addFeature({
          featureType: type,
          category: item.properties?.category,
          name: item.properties?.name ?? `Imported feature ${index + 1}`,
          geometry: item.geometry,
          properties: Object.fromEntries(
            Object.entries(item.properties ?? {}).filter(
              ([key]) =>
                !["featureType", "category", "name", "status"].includes(key),
            ),
          ),
        });
      }
      setNotice("GeoJSON plan imported inside the project boundary.");
    } catch (error) {
      setNotice(
        error.response?.data?.error?.message ??
          "GeoJSON import failed validation.",
      );
    }
    event.target.value = "";
  };
  const validatePlan = async () => {
    const result = await getProjectValidation(planningProject.id);
    setValidation(result);
    setNotice(
      result.valid
        ? `Plan validation passed across ${result.checked_features} features${result.issues.length ? ` with ${result.issues.length} advisory issue(s)` : ""}.`
        : `Plan validation found ${result.issues.length} issue(s): ${result.issues[0]?.message}`,
    );
  };
  const conflicts = [
    ...new Set([
      ...(recommendation?.constraints ?? []),
      ...recommendationConstraints(selectedWard),
    ]),
  ];

  return (
    <article className="project-gis-canvas">
      <header className="project-canvas-heading">
        <div>
          <p className="eyebrow">Project GIS planning canvas</p>
          <h2>{planningProject.name}</h2>
          <p>
            Plan inside your boundary with a configurable surrounding evidence
            context.
          </p>
        </div>
        <div className="gis-header-actions">
          <label>
            Basemap
            <select
              onChange={(event) => setBaseLayer(event.target.value)}
              value={baseLayer}
            >
              <option value="streets">Street map</option>
              <option value="satellite">Satellite</option>
            </select>
          </label>
          <label>
            Context buffer
            <select
              onChange={(event) => setBufferKm(Number(event.target.value))}
              value={bufferKm}
            >
              <option value="0">Boundary only</option>
              <option value="0.5">500 m</option>
              <option value="1">1 km</option>
              <option value="2">2 km</option>
              <option value="5">5 km</option>
            </select>
          </label>
        </div>
      </header>
      <div className="project-canvas-layout">
        <aside className="planning-toolbox">
          <div className="toolbox-title">
            <Crosshair size={15} />
            <div>
              <strong>Planning tools</strong>
              <span>
                {mode ? mode.replaceAll("_", " ") : "Select a map action"}
              </span>
            </div>
          </div>
          <div className="planning-tools">
            {toolConfiguration.map(([tool, Icon, label]) => (
              <button
                aria-pressed={mode === tool}
                className={mode === tool ? "active" : ""}
                key={tool}
                onClick={() => selectTool(tool)}
                type="button"
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="boundary-tool-actions">
            <button disabled={!undoStack.length} onClick={undo} type="button">
              Undo
            </button>
            <button disabled={!redoStack.length} onClick={redo} type="button">
              Redo
            </button>
            <button onClick={validatePlan} type="button">
              Validate plan
            </button>
            <button onClick={exportGeoJSON} type="button">
              Export GeoJSON
            </button>
            <label className="geojson-import">
              Import GeoJSON
              <input
                accept=".geojson,.json,application/geo+json"
                onChange={importGeoJSON}
                type="file"
              />
            </label>
          </div>
          {["FACILITY_PROPOSAL", "EVALUATE_LOCATION"].includes(mode) && (
            <label className="facility-proposal-type">
              <span>
                {mode === "EVALUATE_LOCATION"
                  ? "Development need"
                  : "Facility type"}
              </span>
              <select
                onChange={(event) => setFacilityType(event.target.value)}
                value={facilityType}
              >
                <option value="hospital">Hospital</option>
                <option value="school">School</option>
                <option value="park">Park</option>
                <option value="commercial center">Commercial center</option>
                <option value="road">Road connection</option>
                <option value="drainage">Drainage</option>
                <option value="community facility">Community facility</option>
                <option value="other">Other</option>
              </select>
              {mode === "EVALUATE_LOCATION" && (
                <small>Click the exact project location to evaluate it.</small>
              )}
            </label>
          )}
          {mode === "ADD_BLOCK" && (
            <div className="planning-feature-options">
              <label>
                <span>Block name</span>
                <input
                  onChange={(event) => setBlockName(event.target.value)}
                  value={blockName}
                />
              </label>
              <label>
                <span>Land use</span>
                <select
                  onChange={(event) => setBlockLandUse(event.target.value)}
                  value={blockLandUse}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="mixed-use">Mixed use</option>
                  <option value="institutional">Institutional</option>
                </select>
              </label>
              <label>
                <span>Planned population</span>
                <input
                  min="1"
                  onChange={(event) => setBlockPopulation(event.target.value)}
                  type="number"
                  value={blockPopulation}
                />
              </label>
              <label>
                <span>Households</span>
                <input
                  min="1"
                  onChange={(event) => setBlockHouseholds(event.target.value)}
                  type="number"
                  value={blockHouseholds}
                />
              </label>
              <label>
                <span>Green space (%)</span>
                <input
                  max="100"
                  min="0"
                  onChange={(event) => setBlockGreenSpace(event.target.value)}
                  type="number"
                  value={blockGreenSpace}
                />
              </label>
              <label>
                <span>Utility coverage (%)</span>
                <input
                  max="100"
                  min="0"
                  onChange={(event) =>
                    setBlockUtilityCoverage(event.target.value)
                  }
                  type="number"
                  value={blockUtilityCoverage}
                />
              </label>
              <label>
                <span>Land suitability (0–100)</span>
                <input
                  max="100"
                  min="0"
                  onChange={(event) =>
                    setBlockLandSuitability(event.target.value)
                  }
                  type="number"
                  value={blockLandSuitability}
                />
              </label>
              <label>
                <span>Constraint level</span>
                <select
                  onChange={(event) =>
                    setBlockConstraintLevel(event.target.value)
                  }
                  value={blockConstraintLevel}
                >
                  <option value="UNASSESSED">Unassessed</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
              <label>
                <span>Constraint note</span>
                <input
                  maxLength="240"
                  onChange={(event) =>
                    setBlockConstraintNote(event.target.value)
                  }
                  placeholder="Flooding, easement, ownership…"
                  value={blockConstraintNote}
                />
              </label>
            </div>
          )}
          {mode === "ADD_ZONE" && (
            <label className="facility-proposal-type">
              <span>Zone type</span>
              <select
                onChange={(event) => setZoneType(event.target.value)}
                value={zoneType}
              >
                <option value="RESIDENTIAL_ZONE">Residential</option>
                <option value="COMMERCIAL_ZONE">Commercial</option>
                <option value="EDUCATION_ZONE">Education</option>
                <option value="HEALTHCARE_ZONE">Healthcare</option>
                <option value="GREEN_ZONE">Green</option>
                <option value="RECREATION_ZONE">Recreation</option>
                <option value="UTILITY_ZONE">Utility</option>
              </select>
            </label>
          )}
          {mode === "ADD_ROAD" && (
            <div className="planning-feature-options">
              <label>
                <span>Road hierarchy</span>
                <select
                  onChange={(event) => setRoadType(event.target.value)}
                  value={roadType}
                >
                  <option value="PRIMARY_ROAD">Primary road</option>
                  <option value="SECONDARY_ROAD">Secondary road</option>
                  <option value="LOCAL_ROAD">Local road</option>
                  <option value="DRAINAGE_CORRIDOR">Drainage corridor</option>
                </select>
              </label>
              <label>
                <span>Width (metres)</span>
                <input
                  min="3"
                  onChange={(event) => setRoadWidth(event.target.value)}
                  type="number"
                  value={roadWidth}
                />
              </label>
            </div>
          )}
          {mode === "ADD_GATE" && (
            <label className="facility-proposal-type">
              <span>Gate type</span>
              <select
                onChange={(event) => setGateType(event.target.value)}
                value={gateType}
              >
                <option value="MAIN_GATE">Main gate</option>
                <option value="SECONDARY_GATE">Secondary gate</option>
              </select>
            </label>
          )}
          {["ADD_BLOCK", "ADD_ZONE", "ADD_ROAD"].includes(mode) && (
            <div className="boundary-tool-actions">
              <button onClick={finishPlanningFeature} type="button">
                <Save size={13} />
                Finish
              </button>
              <button
                onClick={() => {
                  setDraftFeaturePoints([]);
                  setMode(null);
                }}
                type="button"
              >
                <X size={13} />
                Cancel
              </button>
            </div>
          )}
          {(mode === "DRAW_AREA" || mode === "EDIT_BOUNDARY") && (
            <div className="boundary-tool-actions">
              <button
                disabled={draftBoundary.length < 3}
                onClick={saveBoundary}
                type="button"
              >
                <Save size={13} />
                Save boundary
              </button>
              <button
                onClick={() => {
                  setDraftBoundary(boundary);
                  setMode(null);
                }}
                type="button"
              >
                <X size={13} />
                Cancel
              </button>
            </div>
          )}
          {mode === "MEASURE_AREA" && (
            <button
              className="finish-measure"
              onClick={finishAreaMeasurement}
              type="button"
            >
              Finish area measurement
            </button>
          )}
          <div className="layer-groups">
            <section>
              <h3>Existing data</h3>
              {existingLayerConfiguration.map(([key, label]) => (
                <LayerToggle
                  active={layers[key]}
                  key={key}
                  label={label}
                  onClick={() =>
                    setLayers((current) => ({
                      ...current,
                      [key]: !current[key],
                    }))
                  }
                />
              ))}
            </section>
            <section>
              <h3>Project layers</h3>
              {projectLayerConfiguration.map(([key, label]) => (
                <LayerToggle
                  active={layers[key]}
                  key={key}
                  label={label}
                  onClick={() =>
                    setLayers((current) => ({
                      ...current,
                      [key]: !current[key],
                    }))
                  }
                />
              ))}
            </section>
          </div>
        </aside>
        <section className="project-map-stage">
          <PlanningCanvasMap
            baseLayer={baseLayer}
            boundary={boundary}
            contextData={contextData}
            draftBoundary={draftBoundary}
            draftFeaturePoints={draftFeaturePoints}
            features={visibleFeatures}
            gapAnalysis={visibleGapAnalysis}
            layers={layers}
            locationEvaluation={locationEvaluation}
            measurePoints={measurePoints}
            mode={mode}
            onMapClick={handleMapClick}
            onSelectWard={setSelectedWardId}
            onUpdateBoundaryVertex={(index, point) =>
              setDraftBoundary((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? [point.lat, point.lng] : item,
                ),
              )
            }
            recommendation={recommendation}
            roadPoints={roadPoints}
            selectedGap={selectedGap}
            selectedWard={selectedWard}
          />
          <div className="planning-map-legend">
            <span>
              <i className="existing" />
              Existing
            </span>
            <span>
              <i className="proposed" />
              Planner proposal
            </span>
            <span>
              <i className="recommended" />
              CityMind option
            </span>
            <span>
              <i className="gap" />
              Coverage gap
            </span>
          </div>
          {mode && (
            <div className="active-map-tool">
              <CircleDot size={13} />
              {mode.replaceAll("_", " ")} active
            </div>
          )}
          {evaluationLoading && (
            <div className="active-map-tool">
              <span className="loader" />
              Evaluating location…
            </div>
          )}
          {selectedGap && (
            <div className="selected-gap-overlay">
              <span>{selectedGap.confidence} COVERAGE GAP</span>
              <strong>
                {selectedGap.site} · {selectedGap.category}
              </strong>
              <p>{selectedGap.reason}</p>
            </div>
          )}
        </section>
        <aside className="planning-context-panel">
          <section>
            <p className="eyebrow">Project context</p>
            <h3>{planningProject.name}</h3>
            <dl>
              <div>
                <dt>Boundary</dt>
                <dd>
                  {planningProject.area
                    ? `${Number(planningProject.area.area_acres).toLocaleString()} acres`
                    : "Not defined"}
                </dd>
              </div>
              <div>
                <dt>Buffer</dt>
                <dd>{bufferKm ? `${bufferKm} km` : "None"}</dd>
              </div>
              <div>
                <dt>Mapped zones</dt>
                <dd>{contextData.wards.length}</dd>
              </div>
              <div>
                <dt>Existing facilities</dt>
                <dd>{contextData.facilities.length}</dd>
              </div>
            </dl>
          </section>
          {measurement && (
            <section className="measurement-result">
              <Ruler size={16} />
              <div>
                <span>{measurement.label}</span>
                <strong>{measurement.value}</strong>
              </div>
            </section>
          )}
          {recommendation && (
            <section className="map-recommendation-card">
              <p className="eyebrow">Selected CityMind option</p>
              <div>
                <h3>
                  {recommendation.candidate_location?.label ??
                    recommendation.ward.name}
                </h3>
                <strong>
                  {recommendation.recommendation_score}
                  <small>/100</small>
                </strong>
              </div>
              <span>
                {recommendation.project_type.replaceAll("_", " ")} ·{" "}
                {recommendation.priority} priority · {recommendation.ward.name}{" "}
                evidence context
              </span>
              <dl>
                <div>
                  <dt>Population need</dt>
                  <dd>{recommendation.population_need_score}</dd>
                </div>
                <div>
                  <dt>Infrastructure gap</dt>
                  <dd>{recommendation.infrastructure_gap_score}</dd>
                </div>
                <div>
                  <dt>Accessibility</dt>
                  <dd>{recommendation.accessibility_score}</dd>
                </div>
                <div>
                  <dt>Future demand</dt>
                  <dd>{recommendation.future_demand_score}</dd>
                </div>
              </dl>
              <ul>
                {recommendation.explanation.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <h4>Conflicts & constraints</h4>
              {conflicts.length ? (
                conflicts.map((conflict) => (
                  <p className="constraint" key={conflict}>
                    {conflict}
                  </p>
                ))
              ) : (
                <p className="no-constraints">
                  No mapped conflicts in the available dataset.
                </p>
              )}
            </section>
          )}
          {selectedWard && !recommendation && (
            <section>
              <p className="eyebrow">Selected context zone</p>
              <h3>{selectedWard.name}</h3>
              <dl>
                <div>
                  <dt>Population</dt>
                  <dd>{Number(selectedWard.population).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>Hospitals</dt>
                  <dd>{selectedWard.hospitals}</dd>
                </div>
                <div>
                  <dt>Schools</dt>
                  <dd>{selectedWard.schools}</dd>
                </div>
                <div>
                  <dt>Road network</dt>
                  <dd>{selectedWard.road_length_km} km</dd>
                </div>
                <div>
                  <dt>Environment</dt>
                  <dd>AQI {selectedWard.air_quality_index}</dd>
                </div>
              </dl>
            </section>
          )}
          <section className="proposal-list">
            <div>
              <p className="eyebrow">Project plan</p>
              <span>{features.length} items</span>
            </div>
            {features.length ? (
              features.map((feature) => (
                <article key={feature.id}>
                  <i className={feature.source} />
                  <div>
                    <strong>{feature.name}</strong>
                    <span>
                      {feature.feature_type.replaceAll("_", " ")} ·{" "}
                      {feature.status === "approved"
                        ? "implemented · counted in analysis"
                        : `${feature.source} · proposed`}
                    </span>
                  </div>
                  <div className="proposal-actions">
                    {feature.status !== "approved" ? (
                      <button
                        className="approve"
                        onClick={() => approveFeature(feature)}
                        type="button"
                      >
                        <CheckCircle2 size={12} />
                        Approve
                      </button>
                    ) : (
                      <span className="implemented-badge">
                        <CheckCircle2 size={11} /> Implemented
                      </span>
                    )}
                    <button
                      aria-label={`Remove ${feature.name}`}
                      onClick={() => removeFeature(feature.id)}
                      type="button"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p>No project proposals placed yet.</p>
            )}
          </section>
          {notice && <p className="canvas-notice">{notice}</p>}
        </aside>
      </div>
      {locationEvaluation && (
        <section
          className={`location-evaluation ${locationEvaluation.status.toLowerCase()}`}
        >
          <header>
            <div>
              <p className="eyebrow">Exact location assessment</p>
              <h3>
                {locationEvaluation.selection.facility_type.replaceAll(
                  "_",
                  " ",
                )}
              </h3>
              <span>{locationEvaluation.status.replaceAll("_", " ")}</span>
            </div>
            <strong>
              {locationEvaluation.suitability_score}
              <small>/100</small>
            </strong>
          </header>
          <p>
            {locationEvaluation.block
              ? `${locationEvaluation.block.name} · ${Number(locationEvaluation.block.population).toLocaleString()} people`
              : "Outside a mapped development block"}
          </p>
          <div className="location-factor-grid">
            {Object.entries(locationEvaluation.factors).map(([key, value]) => (
              <div key={key}>
                <span>{key.replaceAll("_", " ")}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <h4>Rules & evidence</h4>
          <div className="evaluation-rules">
            {locationEvaluation.rules.map((rule) => (
              <article
                className={`evaluation-rule ${rule.status.toLowerCase()}`}
                key={rule.rule_code}
              >
                <b>{rule.status}</b>
                <div>
                  <strong>{rule.name}</strong>
                  <p>{rule.message ?? rule.description}</p>
                  <small>
                    {rule.source?.name ?? rule.source_name} ·{" "}
                    {rule.source?.rule_type ?? rule.rule_type}
                  </small>
                </div>
              </article>
            ))}
          </div>
          <footer>
            <p>ESTIMATED · Requires professional verification</p>
            <div>
              <button
                className="primary"
                disabled={locationEvaluation.status === "NOT_RECOMMENDED"}
                onClick={acceptLocation}
                type="button"
              >
                Add to Master Plan
              </button>
              <button onClick={() => setLocationEvaluation(null)} type="button">
                Reject option
              </button>
            </div>
          </footer>
        </section>
      )}
    </article>
  );
}
