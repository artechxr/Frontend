"use client";
import React, { useState, useEffect } from "react";
import { 
  BarChart3, Users, AlertTriangle, TrendingUp, 
  MapPin, RefreshCw, Layers, ShieldCheck, 
  Activity, ArrowRight, Zap, Target, GitBranch
} from "lucide-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import WorkforceFlowMap from "./components/WorkforceFlowMap";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("EV Battery Management Specialist");
  
  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [districts, setDistricts] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillData, setSkillData] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [transitions, setTransitions] = useState<any>(null);
  
  // Simulation states
  const [simCapacity, setSimCapacity] = useState(30);
  const [simResult, setSimResult] = useState<any>(null);

  // Loading & Metadata
  const [loading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState<any>(null);

  useEffect(() => {
    fetchAllData();
  }, [selectedState, selectedDistrict]);

  useEffect(() => {
    if (activeTab === "deepdive" || activeTab === "simulator") {
      fetchSkillSpecificData();
    }
  }, [selectedSkill, selectedState, selectedDistrict, activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (selectedState) q.append("state", selectedState);
      if (selectedDistrict) q.append("district", selectedDistrict);
      const query = q.toString() ? `?${q.toString()}` : "";

      const [sumRes, distRes, skillRes, alertRes, recRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/dashboard-summary${query}`),
        fetch(`http://127.0.0.1:8000/api/districts${query}`),
        fetch(`http://127.0.0.1:8000/api/skills${query}`),
        fetch(`http://127.0.0.1:8000/api/alerts${query}`),
        fetch(`http://127.0.0.1:8000/api/recommendations${query}`)
      ]);

      const sumData = await sumRes.json();
      const distData = await distRes.json();
      const skillData = await skillRes.json();
      const alertData = await alertRes.json();
      const recData = await recRes.json();

      setSummary(sumData.data);
      setDistricts(distData.data);
      setSkills(skillData.data);
      setAlerts(alertData.data);
      setRecommendations(recData.data);
      setMetadata(sumData.metadata); // Keep metadata from one of the endpoints
      
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
    setLoading(false);
  };

  const fetchSkillSpecificData = async () => {
    if (!selectedSkill) return;
    try {
      const q = new URLSearchParams();
      if (selectedState) q.append("state", selectedState);
      if (selectedDistrict) q.append("district", selectedDistrict);
      const query = q.toString() ? `?${q.toString()}` : "";

      const [skillRes, forecastRes, transRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/skill/${encodeURIComponent(selectedSkill)}${query}`),
        fetch(`http://127.0.0.1:8000/api/forecast/${encodeURIComponent(selectedSkill)}${query}`),
        fetch(`http://127.0.0.1:8000/api/skill-transition/${encodeURIComponent(selectedSkill)}`)
      ]);

      if (skillRes.ok) setSkillData((await skillRes.json()).data[0]);
      if (forecastRes.ok) setForecast((await forecastRes.json()).data);
      if (transRes.ok) setTransitions((await transRes.json()).data);
      
      runSimulation(simCapacity);
    } catch (e) {
      console.error(e);
    }
  };

  const runSimulation = async (val: number) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: selectedState || null,
          district: selectedDistrict || null,
          skill: selectedSkill,
          training_capacity_increase_pct: val
        })
      });
      if (res.ok) {
        setSimResult((await res.json()).data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimChange = (e: any) => {
    const val = Number(e.target.value);
    setSimCapacity(val);
    runSimulation(val);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans">
      {/* SIDEBAR */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">SIH 26246</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">SkillSight AI</h1>
          <p className="text-xs text-slate-400 mt-1">Predictive Labour Market</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setActiveTab("overview")} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "overview" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
            <Activity className="inline-block mr-2" size={18} /> Overview
          </button>
          <button onClick={() => setActiveTab("deepdive")} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "deepdive" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
            <Target className="inline-block mr-2" size={18} /> Skill Deep Dive
          </button>
          <button onClick={() => setActiveTab("radar")} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "radar" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
            <Layers className="inline-block mr-2" size={18} /> Future Skill Radar
          </button>
          <button onClick={() => setActiveTab("simulator")} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "simulator" ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
            <Zap className="inline-block mr-2" size={18} /> Policy Simulator
          </button>
          <button onClick={() => setActiveTab("flowmap")} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === "flowmap" ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800"}`}>
            <GitBranch className="inline-block mr-2" size={18} /> Workforce Flow Map
          </button>
        </nav>

        {/* Data Freshness Indicator */}
        <div className="p-4 m-4 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Data Source</h3>
          {metadata ? (
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${metadata.status === "LIVE" ? "bg-green-500" : metadata.status === "LATEST_AVAILABLE" ? "bg-blue-400" : "bg-amber-500"}`}></div>
                <span className="text-sm font-medium text-white">{metadata.source}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Status: {metadata.status}</p>
              <p className="text-xs text-slate-400">Updated: {metadata.data_age_minutes} min ago</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Loading...</p>
          )}
          <button onClick={fetchAllData} className="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-xs py-1.5 rounded flex items-center justify-center gap-1 transition-colors">
            <RefreshCw size={12} /> Refresh Data
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <MapPin size={16} className="text-slate-500 ml-2" />
              <select value={selectedState} onChange={e => {setSelectedState(e.target.value); setSelectedDistrict("");}} className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 py-1 pl-1">
                <option value="">All India (National)</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Gujarat">Gujarat</option>
                <option value="Uttar Pradesh">Uttar Pradesh</option>
              </select>
            </div>
            {selectedState && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                <select value={selectedDistrict} onChange={e => setSelectedDistrict(e.target.value)} className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 py-1 pl-2">
                  <option value="">All Districts</option>
                  <option value="Pune">Pune</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Bengaluru">Bengaluru</option>
                </select>
              </div>
            )}
          </div>
          
          {(activeTab === "deepdive" || activeTab === "simulator") && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-1">
              <Target size={16} className="text-blue-600 ml-2" />
              <select value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)} className="bg-transparent border-none text-sm font-bold text-blue-800 focus:ring-0 py-1 pl-1 pr-4 max-w-xs">
                {skills.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </header>

        <main className="p-8">
          {loading && activeTab === "overview" ? (
            <div className="flex items-center justify-center h-64"><p className="text-slate-500">Processing live intelligence...</p></div>
          ) : (
            <>
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {summary && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Demand</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{summary.total_demand.toLocaleString()}</h3>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Supply</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{summary.total_supply.toLocaleString()}</h3>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm bg-rose-50/30">
                        <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Critical Shortages</p>
                        <h3 className="text-3xl font-extrabold text-rose-700 mt-2">{summary.critical_shortages}</h3>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/30">
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Saturated Trades</p>
                        <h3 className="text-3xl font-extrabold text-emerald-700 mt-2">{summary.saturated_trades}</h3>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Labour Market Analytics</h3>
                      <div className="overflow-auto max-h-80">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="p-3 font-semibold text-slate-600">Location</th>
                              <th className="p-3 font-semibold text-slate-600">Skill</th>
                              <th className="p-3 font-semibold text-slate-600">Demand/Supply</th>
                              <th className="p-3 font-semibold text-slate-600">Status</th>
                              <th className="p-3 font-semibold text-slate-600">Demand Index</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {districts.map((d, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-3">{d.district} <span className="text-xs text-slate-400 block">{d.state}</span></td>
                                <td className="p-3 font-medium">{d.skill}</td>
                                <td className="p-3">{d.current_demand} / {d.current_supply}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 text-xs rounded-full font-bold ${
                                    d.gap > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                  }`}>{d.status}</span>
                                </td>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full" style={{width: `${d.skill_demand_index}%`}}></div></div>
                                    <span className="text-xs font-bold text-slate-600">{d.skill_demand_index}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="col-span-1 space-y-4">
                      <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-rose-800 mb-3 flex items-center gap-2"><AlertTriangle size={16}/> Early Warnings</h3>
                        <div className="space-y-3">
                          {alerts.slice(0, 4).map((a, i) => (
                            <div key={i} className="bg-rose-50 border border-rose-100 p-3 rounded-lg">
                              <p className="text-xs font-bold text-slate-800">{a.skill} &middot; {a.location}</p>
                              <p className="text-xs text-rose-600 mt-1">{a.predicted_status} expected in {a.time_horizon}.</p>
                              <p className="text-xs text-slate-500 mt-1">{a.reason}</p>
                            </div>
                          ))}
                          {alerts.length === 0 && <p className="text-sm text-slate-500">No critical alerts detected for this region.</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* WORKFORCE FLOW MAP — embedded in Overview */}
                  <WorkforceFlowMap
                    selectedSkill={selectedSkill}
                    selectedState={selectedState}
                    allSkills={skills}
                  />
                </div>
              )}

              {activeTab === "flowmap" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900">Workforce Flow Map</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Zone-wise skill underflow and overflow — where workforce is available and where it is needed.
                    </p>
                  </div>
                  <WorkforceFlowMap
                    selectedSkill={selectedSkill}
                    selectedState={selectedState}
                    allSkills={skills}
                  />
                  {/* Explainer */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-indigo-800 mb-2">How to read this map</h3>
                    <ul className="text-xs text-indigo-700 space-y-1 list-disc pl-4">
                      <li><strong>🔴 Underflow zones</strong> have demand exceeding supply — they need additional workforce.</li>
                      <li><strong>🔵 Overflow zones</strong> have supply exceeding demand — there is available workforce.</li>
                      <li><strong>Arrows</strong> show potential workforce mobility opportunities from overflow to underflow zones.</li>
                      <li>Use the <strong>time horizon toggle</strong> to see how the situation evolves over 12, 24, or 36 months.</li>
                      <li>Click any zone bubble for detailed metrics and specific matching opportunities.</li>
                    </ul>
                    <p className="text-[11px] text-indigo-500 mt-3 border-t border-indigo-100 pt-2">
                      ⚠️ Prototype / Simulated Data — Potential workforce match is calculated from demo data. Actual workforce mobility depends on wages, eligibility, housing, transport, individual preferences and other real-world factors.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "deepdive" && skillData && forecast && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-2xl font-extrabold text-slate-900">{skillData.skill}</h2>
                        <p className="text-sm text-slate-500 mt-1">{skillData.district}, {skillData.state} &middot; {skillData.sector}</p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-3xl font-black text-blue-600">{skillData.skill_demand_index}<span className="text-lg text-slate-400">/100</span></div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Skill Demand Index</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                      <div className="col-span-2">
                        <h3 className="text-sm font-bold text-slate-700 mb-4">Deterministic Forecast (12/24/36 Months)</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[{months: 0, demand: forecast.current_demand, supply: forecast.current_supply}, ...forecast.forecasts]}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="months" tickFormatter={t => t===0 ? 'Current' : `+${t}m`} tick={{fontSize: 12, fill: '#64748b'}} />
                              <YAxis tick={{fontSize: 12, fill: '#64748b'}} />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="demand" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} name="Projected Demand" />
                              <Line type="monotone" dataKey="supply" stroke="#10b981" strokeWidth={3} dot={{r: 4}} name="Projected Supply" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="col-span-1 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500 font-medium">Forecast Confidence</p>
                          <div className="flex items-center gap-2 mt-1">
                            <ShieldCheck className={forecast.confidence_level === "High" ? "text-green-500" : "text-amber-500"} size={20} />
                            <span className="text-lg font-bold text-slate-800">{forecast.confidence_level} ({forecast.confidence_score}%)</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">Driven by consistent historical data and strong industry growth signals.</p>
                        </div>
                        
                        {recommendations.filter(r => r.skill === skillData.skill).map((r, i) => (
                          <div key={i} className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <p className="text-xs text-blue-600 font-bold uppercase mb-1">AI Recommendation</p>
                            <p className="text-sm font-medium text-slate-800 mb-2">{r.recommendation}</p>
                            <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                              {r.reasons.map((reason: string, j: number) => <li key={j}>{reason}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {transitions && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Skill Transition & Reskilling Pathways</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {transitions.transitions.map((t: any, i: number) => (
                          <div key={i} className="border border-slate-200 p-4 rounded-lg hover:border-blue-400 transition-colors bg-slate-50/50">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-bold text-slate-900">{t.target_skill}</h4>
                              <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">{t.future_demand_trend}</span>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <p className="text-xs font-semibold text-slate-500">Transferable Skills</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {t.transferable_skills.map((s: string, j: number) => <span key={j} className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{s}</span>)}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-rose-500">Missing Skills (Gap)</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {t.missing_skills.map((s: string, j: number) => <span key={j} className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded">{s}</span>)}
                                </div>
                              </div>
                              <div className="pt-2 border-t border-slate-200">
                                <p className="text-xs text-slate-600"><strong>Training:</strong> {t.suggested_training}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Workforce Flow Map — quick view in Deep Dive */}
                  <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                          <GitBranch size={18} className="text-indigo-500" />
                          Workforce Flow Map
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Zone-level underflow and overflow for this skill</p>
                      </div>
                      <button
                        onClick={() => setActiveTab("flowmap")}
                        className="text-xs text-indigo-600 font-bold border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1"
                      >
                        Full Map <ArrowRight size={12} />
                      </button>
                    </div>
                    <WorkforceFlowMap
                      selectedSkill={selectedSkill}
                      selectedState={selectedState}
                      allSkills={skills}
                    />
                  </div>
                </div>
              )}

              {activeTab === "simulator" && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Policy Intervention Simulator</h2>
                    <p className="text-sm text-slate-500 mb-8">Test the impact of policy decisions on projected skill gaps without altering live data.</p>
                    
                    <div className="mb-8 p-5 bg-slate-50 border border-slate-200 rounded-lg">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Adjust Training Capacity ({simCapacity > 0 ? `+${simCapacity}%` : `${simCapacity}%`})</label>
                      <input 
                        type="range" 
                        min="-50" max="100" step="10" 
                        value={simCapacity} 
                        onChange={handleSimChange}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>-50% (Reduce Seats)</span>
                        <span>0% (Baseline)</span>
                        <span>+100% (Double Seats)</span>
                      </div>
                    </div>

                    {simResult && (
                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Baseline (No Intervention)</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between pb-2 border-b border-slate-100">
                              <span className="text-sm text-slate-600">Current Demand</span>
                              <span className="text-sm font-bold">{simResult.baseline_demand}</span>
                            </div>
                            <div className="flex justify-between pb-2 border-b border-slate-100">
                              <span className="text-sm text-slate-600">Current Supply</span>
                              <span className="text-sm font-bold">{simResult.baseline_supply}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-rose-600 font-bold">Baseline Gap</span>
                              <span className="text-sm font-black text-rose-600">{simResult.baseline_gap}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                          <h3 className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-4">Projected Outcome</h3>
                          <div className="space-y-4">
                            <div className="flex justify-between pb-2 border-b border-blue-100">
                              <span className="text-sm text-slate-600">Demand</span>
                              <span className="text-sm font-bold">{simResult.baseline_demand}</span>
                            </div>
                            <div className="flex justify-between pb-2 border-b border-blue-100">
                              <span className="text-sm text-slate-600">Projected Supply</span>
                              <span className="text-sm font-bold text-emerald-600">{simResult.projected_supply}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-slate-800 font-bold">Remaining Gap</span>
                              <span className="text-sm font-black text-slate-800">{simResult.projected_gap}</span>
                            </div>
                          </div>
                          
                          <div className="mt-6 pt-4 border-t border-blue-200">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-slate-600">Gap Reduction</span>
                              <span className="text-xl font-black text-emerald-600">{simResult.gap_reduction_pct.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "radar" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Future Skill Radar</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Render grouped skills */}
                    {["Critical / Emerging (80-100)", "High Demand (60-79)", "Stable (40-59)", "Saturation Risk (0-39)"].map((category, idx) => {
                      const ranges = [[80, 100], [60, 79], [40, 59], [0, 39]];
                      const groupSkills = districts.filter(d => d.skill_demand_index >= ranges[idx][0] && d.skill_demand_index <= ranges[idx][1]);
                      
                      return (
                        <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{category}</h4>
                          <div className="space-y-2">
                            {groupSkills.map((s, i) => (
                              <div key={i} className="flex justify-between items-center bg-white p-2 border border-slate-100 rounded text-sm shadow-sm cursor-pointer hover:border-blue-300" onClick={() => {setSelectedSkill(s.skill); setActiveTab("deepdive");}}>
                                <span className="font-medium text-slate-800 truncate w-32" title={s.skill}>{s.skill}</span>
                                <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{s.skill_demand_index}</span>
                              </div>
                            ))}
                            {groupSkills.length === 0 && <p className="text-xs text-slate-400">No skills in this range.</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}