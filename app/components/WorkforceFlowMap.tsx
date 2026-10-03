"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowRight, AlertTriangle, TrendingUp, Users,
  Info, RefreshCw, ChevronDown
} from "lucide-react";

const API = "http://127.0.0.1:8000/api";

const HORIZONS = [
  { key: "current", label: "Current" },
  { key: "12m", label: "12 Months" },
  { key: "24m", label: "24 Months" },
  { key: "36m", label: "36 Months" },
];

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  Underflow: {
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
    dot: "#ef4444",
    label: "Underflow — Needs Workers",
  },
  Balanced: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    dot: "#f59e0b",
    label: "Balanced",
  },
  Overflow: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    text: "text-blue-700",
    dot: "#3b82f6",
    label: "Overflow — Available Workforce",
  },
};

// Rough India bounding box for projecting lat/lng → SVG coords
const INDIA_BOUNDS = {
  minLat: 8.0, maxLat: 37.0,
  minLng: 68.0, maxLng: 97.0,
};

function project(lat: number, lng: number, svgW: number, svgH: number) {
  const x = ((lng - INDIA_BOUNDS.minLng) / (INDIA_BOUNDS.maxLng - INDIA_BOUNDS.minLng)) * svgW;
  const y = ((INDIA_BOUNDS.maxLat - lat) / (INDIA_BOUNDS.maxLat - INDIA_BOUNDS.minLat)) * svgH;
  return { x, y };
}

interface Zone {
  id: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  demand: number;
  supply: number;
  gap: number;
  status: "Underflow" | "Balanced" | "Overflow";
  severity: string;
}

interface Flow {
  source: string;
  source_name: string;
  target: string;
  target_name: string;
  potential_match: number;
  distance_km: number;
  source_lat: number;
  source_lng: number;
  target_lat: number;
  target_lng: number;
}

interface MapData {
  zones: Zone[];
  underflow_zones: Zone[];
  overflow_zones: Zone[];
  balanced_zones: Zone[];
  potential_flows: Flow[];
}

interface Props {
  selectedSkill: string;
  selectedState: string;
  allSkills: string[];
}

export default function WorkforceFlowMap({ selectedSkill, selectedState, allSkills }: Props) {
  const [skill, setSkill] = useState(selectedSkill || "EV Battery Management Specialist");
  const [state, setState] = useState(selectedState || "");
  const [horizon, setHorizon] = useState("current");
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [hoveredFlow, setHoveredFlow] = useState<string | null>(null);

  const svgW = 500;
  const svgH = 440;

  const fetchMap = useCallback(async () => {
    if (!skill) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ skill, horizon });
      if (state) params.append("state", state);
      const res = await fetch(`${API}/workforce-map?${params}`);
      if (!res.ok) throw new Error("No data");
      const json = await res.json();
      setMapData(json.data);
      setMetadata(json.metadata);
      setSelectedZone(null);
    } catch {
      setError("Could not load workforce map. Ensure the backend is running.");
      setMapData(null);
    }
    setLoading(false);
  }, [skill, state, horizon]);

  useEffect(() => { fetchMap(); }, [fetchMap]);

  // Update when parent changes skill
  useEffect(() => { if (selectedSkill) setSkill(selectedSkill); }, [selectedSkill]);
  useEffect(() => { if (selectedState !== undefined) setState(selectedState); }, [selectedState]);

  const zones = mapData?.zones || [];
  const flows = mapData?.potential_flows || [];

  // Get matching flows for the selected zone
  const relatedFlows = selectedZone
    ? flows.filter(f => f.source === selectedZone.id || f.target === selectedZone.id)
    : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Workforce Flow Map</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Where skills are available — and where they are needed.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Skill selector */}
            <div className="relative">
              <select
                value={skill}
                onChange={e => setSkill(e.target.value)}
                className="appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
            </div>
            {/* Horizon tabs */}
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              {HORIZONS.map(h => (
                <button
                  key={h.key}
                  onClick={() => setHorizon(h.key)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    horizon === h.key
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchMap}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? "animate-spin text-blue-500" : "text-slate-500"} />
            </button>
          </div>
        </div>

        {/* Data notice */}
        {metadata && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
              metadata.status === "SIMULATED"
                ? "bg-amber-100 text-amber-700"
                : metadata.status === "LIVE"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                metadata.status === "SIMULATED" ? "bg-amber-500" : "bg-green-500"
              }`} />
              {metadata.status === "SIMULATED" ? "Prototype / Simulated Data" : metadata.status}
            </span>
            <span className="text-[10px] text-slate-400">
              {metadata.source} · {metadata.data_age_minutes}m ago
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-6 bg-white">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div key={status} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.dot }} />
            <span className="text-xs text-slate-600 font-medium">{cfg.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-2">
          <span className="text-slate-400 text-sm">──→</span>
          <span className="text-xs text-slate-600 font-medium">Potential Workforce Flow</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col lg:flex-row min-h-[440px]">
        {/* SVG Map */}
        <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-50/30">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
              <p className="text-sm text-slate-500 animate-pulse">Calculating workforce flows...</p>
            </div>
          )}
          {error && (
            <div className="text-sm text-rose-600 text-center p-4">{error}</div>
          )}
          {!loading && !error && (
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full max-w-[500px]"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))" }}
            >
              {/* India outline hint (soft rectangle placeholder) */}
              <rect x="30" y="10" width="440" height="420" rx="4"
                fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
              <text x="250" y="430" textAnchor="middle" fontSize="9" fill="#cbd5e1">
                Indicative map · Not to scale
              </text>

              {/* Flow arrows — draw first so bubbles appear on top */}
              {flows.map((flow, i) => {
                const src = project(flow.source_lat, flow.source_lng, svgW - 60, svgH - 40);
                const tgt = project(flow.target_lat, flow.target_lng, svgW - 60, svgH - 40);
                const sx = src.x + 30; const sy = src.y + 20;
                const tx = tgt.x + 30; const ty = tgt.y + 20;

                const isHighlighted =
                  hoveredFlow === `${flow.source}-${flow.target}` ||
                  (selectedZone && (flow.source === selectedZone.id || flow.target === selectedZone.id));

                const strokeW = isHighlighted ? 2.5 : 1.5;
                const opacity = isHighlighted ? 0.85 : 0.30;

                // Mid-point for label
                const mx = (sx + tx) / 2;
                const my = (sy + ty) / 2;

                return (
                  <g key={i}
                    onMouseEnter={() => setHoveredFlow(`${flow.source}-${flow.target}`)}
                    onMouseLeave={() => setHoveredFlow(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <defs>
                      <marker id={`arrow-${i}`} markerWidth="6" markerHeight="6"
                        refX="5" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L6,3 z" fill={isHighlighted ? "#6366f1" : "#94a3b8"} />
                      </marker>
                    </defs>
                    <line
                      x1={sx} y1={sy} x2={tx} y2={ty}
                      stroke={isHighlighted ? "#6366f1" : "#94a3b8"}
                      strokeWidth={strokeW}
                      strokeDasharray={isHighlighted ? "0" : "5 3"}
                      opacity={opacity}
                      markerEnd={`url(#arrow-${i})`}
                    />
                    {isHighlighted && (
                      <g>
                        <rect x={mx - 22} y={my - 9} width={44} height={16} rx={4}
                          fill="white" stroke="#6366f1" strokeWidth="1" />
                        <text x={mx} y={my + 3} textAnchor="middle" fontSize="8"
                          fill="#4f46e5" fontWeight="600">
                          {flow.potential_match.toLocaleString()}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Zone bubbles */}
              {zones.map((zone) => {
                const { x, y } = project(zone.lat, zone.lng, svgW - 60, svgH - 40);
                const cx = x + 30;
                const cy = y + 20;
                const cfg = STATUS_CONFIG[zone.status] || STATUS_CONFIG.Balanced;
                const isSelected = selectedZone?.id === zone.id;
                const r = isSelected ? 20 : 15;
                const absGap = Math.abs(zone.gap);

                return (
                  <g key={zone.id} onClick={() => setSelectedZone(isSelected ? null : zone)}
                    style={{ cursor: "pointer" }}>
                    {/* Pulse ring for selected */}
                    {isSelected && (
                      <circle cx={cx} cy={cy} r={r + 6}
                        fill="none" stroke={cfg.dot} strokeWidth="2" opacity="0.3" />
                    )}
                    <circle
                      cx={cx} cy={cy} r={r}
                      fill={cfg.dot}
                      fillOpacity="0.15"
                      stroke={cfg.dot}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    {/* Status icon */}
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                      fontSize="10">
                      {zone.status === "Underflow" ? "🔴" : zone.status === "Overflow" ? "🔵" : "🟡"}
                    </text>
                    {/* District label */}
                    <text x={cx} y={cy + r + 9} textAnchor="middle"
                      fontSize="8" fill="#334155" fontWeight="600">
                      {zone.district}
                    </text>
                    {/* Gap label */}
                    <text x={cx} y={cy + r + 18} textAnchor="middle"
                      fontSize="7" fill={zone.status === "Underflow" ? "#ef4444" : zone.status === "Overflow" ? "#3b82f6" : "#92400e"}>
                      {zone.status === "Underflow" ? `−${absGap.toLocaleString()}` : zone.status === "Overflow" ? `+${absGap.toLocaleString()}` : "≈ Balanced"}
                    </text>
                  </g>
                );
              })}

              {zones.length === 0 && !loading && (
                <text x={svgW / 2} y={svgH / 2} textAnchor="middle"
                  fontSize="12" fill="#94a3b8">
                  No zone data for selected skill/state
                </text>
              )}
            </svg>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 overflow-y-auto">
          {selectedZone ? (
            <ZoneDetailPanel
              zone={selectedZone}
              relatedFlows={relatedFlows}
              allZones={zones}
              onClose={() => setSelectedZone(null)}
            />
          ) : (
            <FlowSummaryPanel
              underflow={mapData?.underflow_zones || []}
              overflow={mapData?.overflow_zones || []}
              flows={flows}
              onSelectZone={setSelectedZone}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Zone Detail Panel ──────────────────────────────────────────────────────────
function ZoneDetailPanel({ zone, relatedFlows, allZones, onClose }: {
  zone: Zone;
  relatedFlows: Flow[];
  allZones: Zone[];
  onClose: () => void;
}) {
  const cfg = STATUS_CONFIG[zone.status];
  const outflows = relatedFlows.filter(f => f.source === zone.id);
  const inflows = relatedFlows.filter(f => f.target === zone.id);

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">{zone.district}</h3>
          <p className="text-xs text-slate-500">{zone.state}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs border border-slate-200 rounded px-2 py-1">
          ✕ Close
        </button>
      </div>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.dot }} />
        {cfg.label}
      </div>

      {/* Metrics */}
      <div className="space-y-2 bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Labour Metrics</h4>
        <MetricRow label="Demand" value={zone.demand.toLocaleString()} />
        <MetricRow label="Supply" value={zone.supply.toLocaleString()} />
        <MetricRow
          label={zone.gap > 0 ? "Shortage Gap" : "Surplus"}
          value={(zone.gap > 0 ? `−${zone.gap.toLocaleString()}` : `+${Math.abs(zone.gap).toLocaleString()}`)}
          highlight={zone.gap > 0 ? "red" : "blue"}
        />
        <MetricRow label="Severity" value={zone.severity} />
      </div>

      {/* Inflows — underflow zones show where workforce can come from */}
      {zone.status === "Underflow" && inflows.length === 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-700">
          No overflow zones found nearby for this skill. Consider training capacity expansion.
        </div>
      )}

      {zone.status === "Underflow" && inflows.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Potential Workforce Sources
          </h4>
          <div className="space-y-2">
            {inflows.map((f, i) => {
              const srcZone = allZones.find(z => z.id === f.source);
              return (
                <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">{f.source_name}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                      +{f.potential_match.toLocaleString()} match
                    </span>
                  </div>
                  {f.distance_km > 0 && (
                    <p className="text-xs text-slate-500">~{f.distance_km.toLocaleString()} km away</p>
                  )}
                  {srcZone && (
                    <p className="text-xs text-slate-500">Overflow: +{Math.abs(srcZone.gap).toLocaleString()}</p>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            Potential workforce match only. Actual movement depends on wages, eligibility, mobility preferences and real-world constraints.
          </p>
        </div>
      )}

      {/* Outflows — overflow zones show where workforce can go */}
      {zone.status === "Overflow" && outflows.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Potential Destinations
          </h4>
          <div className="space-y-2">
            {outflows.map((f, i) => {
              const tgtZone = allZones.find(z => z.id === f.target);
              const severity = tgtZone?.severity || "Unknown";
              return (
                <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">{f.target_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      severity === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {severity} shortage
                    </span>
                  </div>
                  {f.distance_km > 0 && (
                    <p className="text-xs text-slate-500">~{f.distance_km.toLocaleString()} km away</p>
                  )}
                  <p className="text-xs text-slate-500">Potential match: {f.potential_match.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            Workers with relevant skills may be considered for opportunities in these destinations, subject to wages, eligibility, mobility preferences and real-world constraints.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Flow Summary Panel ─────────────────────────────────────────────────────────
function FlowSummaryPanel({ underflow, overflow, flows, onSelectZone }: {
  underflow: Zone[];
  overflow: Zone[];
  flows: Flow[];
  onSelectZone: (z: Zone) => void;
}) {
  return (
    <div className="p-5 space-y-5">
      <div>
        <p className="text-xs text-slate-500 mb-1">Click a zone bubble on the map to see details and potential workforce flows.</p>
      </div>

      {underflow.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Underflow Zones
          </h4>
          <div className="space-y-2">
            {underflow.map(z => (
              <button key={z.id} onClick={() => onSelectZone(z)}
                className="w-full text-left bg-red-50 border border-red-200 rounded-lg p-3 hover:border-red-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800">{z.district}</span>
                  <span className="text-xs font-bold text-red-600">−{Math.abs(z.gap).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{z.state} · {z.severity} severity</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {overflow.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Overflow Zones
          </h4>
          <div className="space-y-2">
            {overflow.map(z => (
              <button key={z.id} onClick={() => onSelectZone(z)}
                className="w-full text-left bg-blue-50 border border-blue-200 rounded-lg p-3 hover:border-blue-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800">{z.district}</span>
                  <span className="text-xs font-bold text-blue-600">+{Math.abs(z.gap).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{z.state}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {flows.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
            Top Potential Flows
          </h4>
          <div className="space-y-2">
            {flows.slice(0, 4).map((f, i) => (
              <div key={i} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                <div className="text-right flex-1">
                  <p className="text-xs font-bold text-slate-700">{f.source_name}</p>
                  <p className="text-[10px] text-blue-600">+{f.potential_match.toLocaleString()} available</p>
                </div>
                <ArrowRight size={14} className="text-indigo-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-700">{f.target_name}</p>
                  <p className="text-[10px] text-red-600">needs workers</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            Potential workforce match detected. Actual mobility is subject to wages, eligibility and individual preferences.
          </p>
        </div>
      )}

      {underflow.length === 0 && overflow.length === 0 && (
        <div className="text-center py-8 text-sm text-slate-400">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          <p>Select a skill to view zone-level distribution.</p>
        </div>
      )}
    </div>
  );
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: "red" | "blue" }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-xs font-bold ${
        highlight === "red" ? "text-red-600" : highlight === "blue" ? "text-blue-600" : "text-slate-800"
      }`}>{value}</span>
    </div>
  );
}
