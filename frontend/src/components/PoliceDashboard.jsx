import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  ShieldAlert, Map as MapIcon, Bell, LogOut, Plus, X, Upload,
  Globe, Activity, Search, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, Users, Zap, Eye, Radio, TrendingUp, Target, Wifi
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://amber-backend-flng.onrender.com';
const WS_BASE = 'wss://amber-backend-flng.onrender.com';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom || 5, { animate: true, duration: 1.5 }); }, [center, zoom]);
  return null;
}

// Tactical URL Resolver
const getImgUrl = (path) => {
  if (!path) return "https://via.placeholder.com/150?text=No+Photo";
  // If path already starts with http, return it
  if (path.startsWith('http')) return path;
  // Clean up any double slashes or extra 'uploads' prefix
  const cleanPath = path.replace(/^\/+/, '').replace('uploads/uploads/', 'uploads/');
  return `${API_BASE}/${cleanPath}`;
};

function getCasePriority(reportedAt) {
  const hrs = (Date.now() - new Date(reportedAt)) / 3600000;
  if (hrs > 24) return { label: 'CRITICAL', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30', dot: 'bg-rose-500', pulse: true };
  if (hrs > 6)  return { label: 'URGENT',   cls: 'text-orange-400 bg-orange-500/10 border-orange-500/30', dot: 'bg-orange-500', pulse: false };
  return           { label: 'RECENT',   cls: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30', dot: 'bg-cyan-500', pulse: false };
}

export default function PoliceDashboard() {
  const navigate = useNavigate();
  const [persons, setPersons]             = useState([]);
  const [sightings, setSightings]         = useState([]);
  const [activeTab, setActiveTab]         = useState('bento');
  const [mapCenter, setMapCenter]         = useState([20.5937, 78.9629]);
  const [mapZoom, setMapZoom]             = useState(5);
  const [drawer, setDrawer]               = useState(false);
  const [selectedCase, setSelectedCase]   = useState(null);
  const [caseSightings, setCaseSightings] = useState([]);
  const [liveCount, setLiveCount]         = useState(0);
  const [toastMsg, setToastMsg]           = useState(null);
  const [activeAlert, setActiveAlert]     = useState(null);
  const [dispatching, setDispatching]     = useState(false);
  const [alertLocationName, setAlertLocationName] = useState('');
  const [feed, setFeed]                   = useState([
    { msg: 'System initialized • Grid operational', type: 'info', ts: new Date() },
  ]);
  const [form, setForm] = useState({ full_name: '', age: '', description: '', lat: 28.6139, lng: 77.209 });
  const [file, setFile]       = useState(null);
  const [submitting, setSub]  = useState(false);
  const [liveTrackers, setLiveTrackers] = useState({}); // { sighting_id: { lat, lng, name, ts } }

  // Reverse Geocoding — convert coordinates to a place name
  const getLocationName = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
      const data = await res.json();
      const addr = data.address || {};
      return addr.suburb || addr.city_district || addr.town || addr.city || addr.county || addr.state || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const toast = (msg, colour = 'emerald') => {
    setToastMsg({ msg, colour });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchData = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      fetch(`${API_BASE}/missing_persons/`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false })),
      fetch(`${API_BASE}/sightings/`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).catch(() => ({ ok: false }))
    ]);
    if (pRes.ok) setPersons(await pRes.json());
    if (sRes.ok) setSightings(await sRes.json());
  }, []);

  const openTimeline = async (person) => {
    setSelectedCase(person);
    const r = await fetch(`${API_BASE}/missing_persons/${person.id}/sightings`).catch(() => null);
    if (r?.ok) setCaseSightings(await r.json());
  };

  const markRecovered = async (id) => {
    const r = await fetch(`${API_BASE}/missing_persons/${id}/recover`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).catch(() => null);
    if (r?.ok) { await fetchData(); setSelectedCase(null); }
  };

  useEffect(() => {
    fetchData();
    const ws = new WebSocket(`${WS_BASE}/ws/police_dashboard`);
    ws.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.type === 'CRITICAL_MATCH') {
        setActiveAlert(d);
        setLiveCount(c => c + 1);
        setMapCenter([d.lat, d.lng]);
        setMapZoom(15); // Zoom in close to sighting
        setActiveTab('bento'); // Show dashboard with alert overlay
        setFeed(f => [{ msg: `🚨 MATCH ${Math.round(d.confidence)}% — Case #${d.missing_person_id}`, type: 'alert', ts: new Date() }, ...f.slice(0, 19)]);
        toast(`AI matched Case #${d.missing_person_id} at ${Math.round(d.confidence)}% confidence!`, 'amber');
        // Get human-readable location name
        getLocationName(d.lat, d.lng).then(name => setAlertLocationName(name));
        fetchData();
      }
      if (d.type === 'CASE_RECOVERED') {
        setFeed(f => [{ msg: `✅ RECOVERED: ${d.name}`, type: 'success', ts: new Date() }, ...f.slice(0, 19)]);
        toast(`${d.name} marked as RECOVERED!`, 'emerald');
        fetchData();
      }
      if (d.type === 'LIVE_COORDINATE_UPDATE') {
        setLiveTrackers(prev => ({
          ...prev,
          [d.sighting_id]: {
            lat: d.lat,
            lng: d.lng,
            name: d.person_name,
            ts: Date.now()
          }
        }));
        // Auto-center map on live tracker
        setMapCenter([d.lat, d.lng]);
        setMapZoom(15);
      }
    };
    
    // Cleanup stale trackers every 10 seconds
    const cleanup = setInterval(() => {
      setLiveTrackers(prev => {
        const next = { ...prev };
        const now = Date.now();
        Object.keys(next).forEach(id => {
          if (now - next[id].ts > 15000) delete next[id]; // 15s timeout
        });
        return next;
      });
    }, 10000);

    return () => {
      ws.close();
      clearInterval(cleanup);
    };
  }, [fetchData]);

  const handleAuthorizeDispatch = () => {
    setDispatching(true);
    setTimeout(() => {
      setDispatching(false);
      setActiveAlert(null);
      toast("TACTICAL UNITS DEPLOYED. GRID LOCKED.", "emerald");
    }, 2000);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!file) return toast("Upload a subject photo", "amber");
    setSub(true);
    const fd = new FormData();
    fd.append('full_name', form.full_name);
    fd.append('age', form.age);
    fd.append('description', form.description);
    fd.append('last_known_lat', form.lat);
    fd.append('last_known_lng', form.lng);
    fd.append('photo', file);
    try {
      const r = await fetch(`${API_BASE}/missing_persons/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (r.ok) {
        toast("NEW SUBJECT SYNCED TO NATIONAL GRID", "emerald");
        setDrawer(false);
        setForm({ full_name: '', age: '', description: '', lat: 28.6139, lng: 77.209 });
        setFile(null);
        fetchData();
      } else {
        toast("Broadcast failed. Check authorization.", "rose");
      }
    } catch {
      toast("Grid uplink failed. Retrying...", "rose");
    } finally {
      setSub(false);
    }
  };

  const active    = persons.filter(p => p.status === 'ACTIVE');
  const recovered = persons.filter(p => p.status === 'RECOVERED');
  const critical  = active.filter(p => (Date.now() - new Date(p.reported_at)) / 3600000 > 24);

  return (
    <div className="h-screen w-screen bg-transparent text-slate-100 flex flex-col font-sans overflow-hidden relative">
      <div className="security-grid" />

      {toastMsg && (
        <div className={`fixed top-6 right-6 z-[9999] animate-slide-in px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-3
          ${toastMsg.colour === 'emerald' ? 'bg-emerald-600 shadow-emerald-900/50' : 'bg-amber-600 shadow-amber-900/50'} text-white`}>
          <Wifi size={18}/> {toastMsg.msg}
        </div>
      )}

      {/* ══ V7.0 BIOMETRIC VERIFICATION OVERLAY ══ */}
      {activeAlert && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center p-8 backdrop-blur-md bg-black/70 animate-fade-in">
          <div className="w-full max-w-5xl glass-panel silk-border p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="scanline" />
            
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 text-rose-400 rounded-full border border-rose-500/30 text-[9px] font-black uppercase tracking-widest animate-pulse">
                    <Activity size={10}/> Biometric Match Detected
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20 text-[9px] font-black uppercase tracking-widest">
                    <Zap size={10}/> DeepFace Neural Net
                  </div>
                </div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Biometric <span className="text-cyan-400">Analysis</span></h2>
              </div>
              <button onClick={() => setActiveAlert(null)} className="p-2 text-slate-500 hover:text-white transition-all"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-5 gap-8 mb-8">
              {/* Case Photo with Laser */}
              <div className="col-span-2 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Case File Record</p>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 relative">
                  <div className="biometric-laser" />
                  <img src={getImgUrl(activeAlert.case_photo)} className="w-full h-full object-cover" alt=""/>
                  <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                    <p className="text-[9px] font-black text-white uppercase">{activeAlert.person_name}</p>
                  </div>
                </div>
              </div>

              {/* Neural Telemetry (Center) */}
              <div className="col-span-1 flex flex-col items-center justify-center py-4">
                <div className="flex flex-col items-center gap-1 mb-4">
                  <Target size={20} className="text-cyan-400 animate-spin" style={{ animationDuration: '8s' }}/>
                  <span className="text-3xl font-black text-white neon-glow-text mt-2">{activeAlert.confidence}%</span>
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Match Score</span>
                </div>
                <div className="w-full space-y-2.5 mt-2">
                  {[
                    { label: 'Ocular Vector', val: '94%', color: 'text-emerald-400' },
                    { label: 'Jawline Ratio', val: '87%', color: 'text-cyan-400' },
                    { label: 'Nasal Bridge',  val: '91%', color: 'text-emerald-400' },
                    { label: 'Spatial Depth',  val: '78%', color: 'text-amber-400' },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest neural-dot">{m.label}</span>
                      <span className={`text-[9px] font-black ${m.color} font-mono`}>{m.val}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mt-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 neural-dot"/>
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 neural-dot"/>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 neural-dot"/>
                </div>
              </div>

              {/* Sighting Photo with Laser */}
              <div className="col-span-2 space-y-3">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Sighting Feed</p>
                </div>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-2 border-rose-500/40 relative shadow-[0_0_40px_rgba(244,63,94,0.15)]">
                  <div className="biometric-laser" style={{ animationDelay: '1.2s' }}/>
                  <img src={getImgUrl(activeAlert.sighting_photo)} className="w-full h-full object-cover" alt=""/>
                  <div className="absolute bottom-3 left-3 right-3 bg-rose-500/20 backdrop-blur-lg px-3 py-1.5 rounded-lg border border-rose-500/30">
                    <p className="text-[9px] font-black text-rose-100 flex items-center gap-2">
                       <MapIcon size={9}/> {alertLocationName || `${activeAlert.lat.toFixed(4)}, ${activeAlert.lng.toFixed(4)}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 p-5 bg-white/[0.03] rounded-2xl border border-white/5">
              <div className="flex-1">
                <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Strategic Recommendation</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">AI Confidence exceeds 70% threshold. Immediate mobilization of Alpha-8 field units is recommended for physical verification and extraction at the reported coordinates.</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => setActiveAlert(null)} className="h-12 px-6 rounded-xl border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">Dismiss</button>
                <button 
                  onClick={handleAuthorizeDispatch}
                  disabled={dispatching}
                  className="h-12 px-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-black uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                  {dispatching ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap size={14} fill="black"/> Authorize Dispatch
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="h-16 flex-shrink-0 gov-banner flex items-center justify-between px-8 z-50">
        <div className="flex items-center gap-10 h-full">
          <div className="flex items-center gap-4 border-r border-white/10 pr-8 h-8">
            <div className="flex flex-col items-center justify-center">
              <ShieldAlert size={20} className="text-white"/>
              <span className="text-[5px] font-black uppercase tracking-[0.2em] mt-0.5 opacity-50">सत्यमेव जयते</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-black text-white leading-none tracking-tight">GOV.IN</span>
              <span className="text-[8px] font-black text-cyan-400 leading-none uppercase tracking-widest mt-1">DBIM | AMBER Grid</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 h-full">
            {[
              { id: 'bento', label: 'Dashboard' },
              { id: 'map',   label: 'Grid Map' },
              { id: 'cases', label: 'Intelligence' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center px-5 h-9 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                  ${activeTab === t.id ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex items-center relative w-[400px]">
          <Search size={14} className="absolute left-4 text-white/30"/>
          <input type="text" placeholder="Namaste! What can I find for you today?"
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-[11px] text-white placeholder-white/20 focus:outline-none focus:bg-white/10 transition-all"/>
        </div>

        <div className="flex items-center gap-6 h-full">
          {liveCount > 0 && (
            <div className="flex items-center gap-2 bg-rose-500/20 border border-rose-500/30 text-rose-200 px-4 h-8 rounded-full text-[9px] font-black uppercase tracking-[0.2em] animate-pulse">
              {liveCount} UNRESOLVED ALERTS
            </div>
          )}
          
          <button onClick={() => setDrawer(true)} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-black px-6 h-9 rounded-lg text-[10px] uppercase tracking-widest transition-all shadow-[0_4px_15px_rgba(245,158,11,0.3)]">
            <Plus size={14} strokeWidth={3}/> Register Case
          </button>
          
          <div className="flex items-center gap-1 border-l border-white/10 pl-4">
            <button onClick={() => navigate('/report')} className="p-2 text-white/40 hover:text-white transition-all"><Globe size={18}/></button>
            <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} className="p-2 text-white/40 hover:text-rose-400 transition-all"><LogOut size={18}/></button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'bento' && (
          <div className="h-full overflow-hidden p-6 animate-fade-in-up">
            <div className="grid grid-cols-12 gap-6 h-full">
              <div className="col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
                <ActiveCasesCard count={active.length} />
                <div className="glass-panel silk-border rounded-[32px] p-6 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={12} className="text-rose-400"/> Critical Alerts
                    </h3>
                  </div>
                  <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">
                    {critical.map(p => (
                      <div key={p.id} onClick={() => openTimeline(p)} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/5">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
                          <img src={getImgUrl(p.photo_path)} className="w-full h-full object-cover" alt=""/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase truncate group-hover:text-cyan-400">{p.full_name}</p>
                          <p className="text-[9px] text-rose-400 font-bold mt-0.5">24H+ ELAPSED</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-5 flex flex-col gap-6">
                <div className="flex-1 glass-panel silk-border scanline-move rounded-[32px] overflow-hidden relative shadow-2xl">
                  <div className="scanline" />
                  <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full grayscale-[0.2] contrast-[1.1]" zoomControl={false}>
                    <ChangeView center={mapCenter} zoom={mapZoom}/>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
                    {active.map(p => (
                      <Marker key={p.id} position={[p.last_known_lat, p.last_known_lng]} eventHandlers={{ click: () => openTimeline(p) }}>
                        <Circle center={[p.last_known_lat, p.last_known_lng]}
                          pathOptions={{ color:'#2dd4bf', weight:1, dashArray:'3,6', fillOpacity:0.05 }} radius={25000}/>
                      </Marker>
                    ))}
                    {/* Citizen Sighting Markers */}
                    {sightings.map(s => (
                      <Circle
                        key={`sighting-${s.id}`}
                        center={[s.sighting_lat, s.sighting_lng]}
                        pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.6, weight: 3 }}
                        radius={5000}
                      >
                        <Popup className="custom-popup">
                          <div className="p-1">
                            <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Citizen Sighting</p>
                            <p className="text-xs font-bold text-white">Match: {Math.round(s.match_score || 0)}%</p>
                            <p className="text-[9px] text-slate-400 mt-1">{new Date(s.reported_at).toLocaleString()}</p>
                          </div>
                        </Popup>
                      </Circle>
                    ))}
                    {/* Live Intercept Trackers */}
                    {Object.keys(liveTrackers).map(id => {
                      const tracker = liveTrackers[id];
                      return (
                        <Circle 
                          key={`tracker-${id}`} 
                          center={[tracker.lat, tracker.lng]}
                          pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.6, weight: 3 }} 
                          radius={5000}
                          className="animate-pulse"
                        >
                          <Popup className="custom-popup">
                            <div className="p-1">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Live Reporter Signal</p>
                              <p className="text-xs font-bold text-white uppercase">{tracker.name}</p>
                              <p className="text-[9px] text-slate-500 mt-1">Tactical intercept active...</p>
                            </div>
                          </Popup>
                        </Circle>
                      );
                    })}
                  </MapContainer>
                </div>

                <div className="h-44 glass-panel silk-border rounded-[32px] p-6 flex flex-col">
                   <div className="flex items-center gap-2 mb-4">
                    <Radio size={14} className="text-rose-400 animate-pulse"/>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Recovery Feed</h3>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar font-mono">
                    {feed.map((f, i) => (
                      <div key={i} className="flex gap-4 text-[10px]">
                        <span className="text-slate-700">{f.ts.toLocaleTimeString()}</span>
                        <span className={`font-black uppercase tracking-tight ${f.type === 'alert' ? 'text-rose-400' : f.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {f.msg}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ══ COLUMN 3: METRICS & UNITS (Right) ══ */}
              <div className="col-span-4 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
                <RecoveryStatusCard activeCount={active.length} recoveredCount={recovered.length} />
                <FieldUnitsCard />
              </div>

            </div>
          </div>
        )}

        {/* ── VIEW: FULL MAP ── */}
        {activeTab === 'map' && (
          <div className="h-full flex animate-fade-in-up">
            {/* Sidebar */}
            <div className="w-72 glass-panel border-r border-white/5 flex flex-col">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Grid Cases</span>
                <Search size={14} className="text-slate-700"/>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {active.map(p => {
                  const pri = getCasePriority(p.reported_at);
                  return (
                    <div key={p.id} onClick={() => { setMapCenter([p.last_known_lat, p.last_known_lng]); setMapZoom(14); openTimeline(p); }}
                      className="group p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <img src={getImgUrl(p.photo_path)} className="w-9 h-9 rounded-lg object-cover opacity-70 group-hover:opacity-100 transition-all" alt=""/>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase truncate group-hover:text-cyan-400 transition-colors">{p.full_name}</p>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${pri.cls}`}>{pri.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1">
              <MapContainer center={mapCenter} zoom={mapZoom} className="w-full h-full" zoomControl={true}>
                <ChangeView center={mapCenter} zoom={mapZoom}/>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"/>
                {persons.map(p => (
                  <React.Fragment key={p.id}>
                    <Marker position={[p.last_known_lat, p.last_known_lng]} eventHandlers={{ click: () => openTimeline(p) }}>
                      <Popup className="custom-popup">
                        <div className="p-2">
                          <p className="font-black uppercase text-sm text-white">{p.full_name}</p>
                          <p className={`text-[9px] mt-1 ${p.status === 'RECOVERED' ? 'text-emerald-400' : 'text-cyan-400'}`}>{p.status}</p>
                        </div>
                      </Popup>
                    </Marker>
                    {p.status === 'ACTIVE' && <Circle center={[p.last_known_lat, p.last_known_lng]} pathOptions={{ color:'#2dd4bf', weight:1, dashArray:'3,6', fillOpacity:0.03 }} radius={20000}/>}
                  </React.Fragment>
                ))}
                {/* Citizen Sighting Markers on Full Map */}
                {sightings.map(s => (
                  <Circle
                    key={`full-sighting-${s.id}`}
                    center={[s.sighting_lat, s.sighting_lng]}
                    pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.6, weight: 3 }}
                    radius={5000}
                  >
                    <Popup className="custom-popup">
                      <div className="p-1">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Citizen Sighting</p>
                        <p className="text-xs font-bold text-white">Match: {Math.round(s.match_score || 0)}%</p>
                        <p className="text-[9px] text-slate-400 mt-1">{new Date(s.reported_at).toLocaleString()}</p>
                      </div>
                    </Popup>
                  </Circle>
                ))}
                {/* Live Intercept Trackers on Full Map */}
                {Object.keys(liveTrackers).map(id => {
                  const tracker = liveTrackers[id];
                  return (
                    <Circle 
                      key={`full-tracker-${id}`} 
                      center={[tracker.lat, tracker.lng]}
                      pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.5, weight: 2 }} 
                      radius={1000}
                      className="animate-pulse"
                    >
                      <Popup className="custom-popup">
                        <div className="p-1">
                          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Live Reporter</p>
                          <p className="text-xs font-bold text-white uppercase">{tracker.name}</p>
                        </div>
                      </Popup>
                    </Circle>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        )}

        {/* ── VIEW: REGISTRY TABLE ── */}
        {activeTab === 'cases' && (
          <div className="h-full overflow-y-auto p-8 animate-fade-in-up custom-scrollbar">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black uppercase tracking-widest flex items-center gap-3">
                  <Users size={24} className="text-cyan-400"/> CASE REGISTRY
                </h2>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                  Total Records: {persons.length}
                </div>
              </div>

              <div className="glass-panel rounded-3xl overflow-hidden border border-white/5">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.02]">
                      <th className="text-left p-6 w-[35%]">Subject Intelligence</th>
                      <th className="text-left p-6 w-[10%]">Age</th>
                      <th className="text-left p-6 w-[15%]">Search Priority</th>
                      <th className="text-left p-6 w-[15%]">Grid Status</th>
                      <th className="text-left p-6 w-[25%]">Actions & Telemetry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {persons.map(p => {
                      const pri = getCasePriority(p.reported_at);
                      const isActive = p.status === 'ACTIVE';
                      return (
                        <tr key={p.id} className="hover:bg-white/[0.03] transition-all group">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shadow-xl flex-shrink-0">
                                <img 
                                  src={getImgUrl(p.photo_path)} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                  alt=""
                                  onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=No+Photo"; }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black uppercase group-hover:text-cyan-400 transition-colors truncate">{p.full_name}</p>
                                <p className="text-[10px] text-slate-600 font-mono mt-0.5 tracking-tighter">ID: AMB-{String(p.id).padStart(4, '0')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="text-xs font-black text-slate-400">{p.age}y</span>
                          </td>
                          <td className="p-6">
                            {isActive ? (
                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${pri.cls}`}>
                                {pri.label}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-slate-700">--</span>
                            )}
                          </td>
                          <td className="p-6">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${isActive ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => { openTimeline(p); setActiveTab('map'); setMapCenter([p.last_known_lat, p.last_known_lng]); }}
                                className="h-9 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/5 active:scale-95"
                              >
                                <Eye size={14}/> Timeline
                              </button>
                              {isActive && (
                                <button 
                                  onClick={() => markRecovered(p.id)}
                                  className="h-9 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
                                >
                                  <CheckCircle2 size={14}/> Recover
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {persons.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-700 bg-black/20">
                    <Users size={48} className="mb-4 opacity-20"/>
                    <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">No records found in grid registry</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ CASE TIMELINE PANEL ══ */}
      {selectedCase && (
        <div className="fixed inset-0 z-[1500] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedCase(null)}/>
          <div className="relative w-[400px] h-full bg-[#070b12] border-l border-white/10 flex flex-col animate-slide-in shadow-2xl z-[1501]">
            <div className="p-7 border-b border-white/5 flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Intelligence File</p>
                <h3 className="text-lg font-black uppercase">{selectedCase.full_name}</h3>
                <p className="text-[10px] text-slate-600 mt-1">Age {selectedCase.age} • Case-0{selectedCase.id}</p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-slate-700 hover:text-white transition-all mt-1"><X size={22}/></button>
            </div>
            {/* Priority Block */}
            {(() => { const pri = getCasePriority(selectedCase.reported_at); const hrs = Math.round((Date.now() - new Date(selectedCase.reported_at)) / 3600000);
              return (<div className={`mx-6 mt-5 p-4 rounded-2xl border flex items-center gap-3 ${pri.cls.includes('rose') ? 'border-rose-500/20 bg-rose-500/5' : pri.cls.includes('orange') ? 'border-orange-500/20 bg-orange-500/5' : 'border-cyan-500/20 bg-cyan-500/5'}`}>
                <AlertTriangle size={16} className={`${pri.cls.split(' ')[0]} ${pri.pulse ? 'animate-pulse' : ''}`}/>
                <div><p className={`text-[10px] font-black uppercase ${pri.cls.split(' ')[0]}`}>{pri.label} — {hrs}h elapsed</p>
                <p className="text-[9px] text-slate-600 mt-0.5">{new Date(selectedCase.reported_at).toLocaleString()}</p></div>
              </div>);}
            )()}
            {/* Sightings Timeline */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={11}/> Sightings ({caseSightings.length})
              </p>
              {caseSightings.length === 0 ? (
                <div className="text-center py-10 text-slate-700">
                  <Eye size={28} className="mx-auto mb-3"/>
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting field reports</p>
                  <p className="text-[9px] text-slate-800 mt-1">Citizens can submit via the Public Portal</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {caseSightings.map((s, i) => (
                    <div key={s.id} className="pl-5 border-l-2 border-slate-800 relative">
                      <div className={`absolute left-[-5px] top-1.5 w-2 h-2 rounded-full ${s.match_score > 70 ? 'bg-emerald-500' : s.match_score > 40 ? 'bg-amber-500' : 'bg-slate-700'}`}/>
                      <div className="glass-card p-4 rounded-xl">
                        <div className="flex justify-between mb-3">
                          <span className="text-[9px] font-black text-slate-600 uppercase">Sighting #{caseSightings.length - i}</span>
                          <span className="text-[8px] font-mono text-slate-700">{new Date(s.reported_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">AI Confidence</span>
                          <span className={`text-sm font-black ${s.match_score > 70 ? 'text-emerald-400' : s.match_score > 40 ? 'text-cyan-400' : 'text-slate-500'}`}>{Math.round(s.match_score || 0)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
                          <div className={`h-full rounded-full transition-all duration-100 ${s.match_score > 70 ? 'bg-emerald-500' : s.match_score > 40 ? 'bg-cyan-500' : 'bg-slate-600'}`} style={{ width: `${s.match_score || 0}%` }}/>
                        </div>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${s.match_score > 70 ? 'text-emerald-400' : 'text-slate-600'}`}>
                          {s.match_score > 70 ? '✅ MATCH CONFIRMED' : s.match_score > 40 ? '⚠ Review Required' : '❌ No Match'}
                        </p>
                        <p className="text-[9px] text-slate-700 mt-1.5 font-mono">{s.sighting_lat?.toFixed(5)}, {s.sighting_lng?.toFixed(5)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {selectedCase.status === 'ACTIVE' && (
              <div className="p-6 border-t border-white/5">
                <button onClick={() => markRecovered(selectedCase.id)} className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 8px 30px rgba(16,185,129,0.25)' }}>
                  <CheckCircle2 size={16}/> MARK AS RECOVERED
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ NEW ALERT DRAWER ══ */}
      {drawer && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setDrawer(false)}/>
          <div className="relative w-[420px] h-full bg-[#070b12] border-l border-white/10 p-9 flex flex-col z-[2001] animate-slide-in shadow-2xl">
            <button onClick={() => setDrawer(false)} className="absolute top-9 right-9 text-slate-600 hover:text-white transition-all"><X size={28}/></button>
            <div className="mb-7">
              <h2 className="text-xl font-black uppercase italic tracking-tight">Register <span className="text-amber-400">Subject</span></h2>
              <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1.5">Add to national recovery grid instantly</p>
            </div>
            <form onSubmit={handleRegister} className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
              {[['Full Name','text','full_name'],['Age','number','age']].map(([l,t,k]) => (
                <div key={k}>
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1.5">{l}</label>
                  <input type={t} required className="w-full bg-black/40 border border-white/5 p-3.5 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500/60 transition-all"
                    value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})}/>
                </div>
              ))}
              <div>
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1.5">Description</label>
                <textarea rows="3" required className="w-full bg-black/40 border border-white/5 p-3.5 rounded-xl text-xs font-bold text-white outline-none focus:border-amber-500/60 resize-none"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Latitude','lat'],['Longitude','lng']].map(([l,k]) => (
                  <div key={k}>
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-1.5">{l}</label>
                    <input type="number" step="any" className="w-full bg-black/40 border border-white/5 p-3.5 rounded-xl text-xs text-slate-400 outline-none focus:border-amber-500/60"
                      value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})}/>
                  </div>
                ))}
              </div>
              <div className="relative glass-panel p-8 border-dashed border border-slate-800 hover:border-cyan-500/50 transition-all text-center rounded-2xl cursor-pointer group">
                <input type="file" required className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files[0])}/>
                <Upload size={24} className="mx-auto mb-2 text-slate-700 group-hover:text-cyan-400 transition-colors"/>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{file ? file.name : 'Upload face photo'}</p>
              </div>
              <button type="submit" disabled={submitting} className="w-full btn-premium py-4 rounded-xl font-black uppercase tracking-widest text-white text-[11px] disabled:opacity-40">
                {submitting ? 'BROADCASTING...' : 'CONFIRM BROADCAST'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ SPECIALIZED HQ CARDS ══ */

function ActiveCasesCard({ count }) {
  return (
    <div className="glass-panel silk-border scanline-move rounded-[32px] p-8 bento-tile bg-gradient-to-br from-cyan-500/5 to-transparent relative overflow-hidden flex flex-col justify-center">
      <div className="scanline" />
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block relative z-10 leading-normal">Active Cases</h3>
      <div className="flex items-end gap-5 mb-8 relative z-10">
        <span className="text-6xl font-black text-white leading-none tracking-tighter neon-glow-text">{String(count).padStart(3, '0')}</span>
        <div className="flex flex-col mb-1.5">
          <span className="text-cyan-400 text-[10px] font-black leading-tight">SYSTEM LIVE</span>
          <span className="text-slate-600 text-[8px] font-black tracking-widest uppercase italic leading-tight">Node Grid Active</span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-16 relative z-10">
        {[40, 70, 45, 90, 65, 30, 85, 50, 60, 75].map((h, i) => (
          <div key={i} className="flex-1 chart-bar" style={{ height: `${h}%`, opacity: 0.7 + (h/200) }} />
        ))}
      </div>
    </div>
  );
}

function RecoveryStatusCard({ activeCount, recoveredCount }) {
  const total = activeCount + recoveredCount;
  const percentage = total === 0 ? 0 : Math.round((recoveredCount / total) * 100);
  
  return (
    <div className="glass-panel silk-border scanline-move rounded-[32px] p-8 bento-tile relative overflow-hidden min-h-[180px] flex flex-col justify-center">
      <div className="scanline" />
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 block relative z-10 leading-normal">Recovery Status</h3>
      <div className="flex items-center gap-10 relative z-10" style={{ display: 'flex', alignItems: 'center' }}>
        {/* SVG CIRCULAR GAUGE - 100% Reliable Centering */}
        <div className="w-24 h-24 relative flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" fill="transparent" 
              style={{ strokeDasharray: 251.2, strokeDashoffset: 251.2 - (251.2 * percentage) / 100, transition: 'stroke-dashoffset 1s ease' }} 
              className="text-cyan-400" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white neon-glow-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {percentage}%
          </span>
        </div>

        <div className="flex-1 min-w-0 space-y-6">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <p className="text-4xl font-black text-cyan-400 leading-none neon-glow-text">{recoveredCount}</p>
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2 leading-tight">Subjects Located</p>
          </div>
          <div className="pt-3 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-300 leading-tight">Global Health</p>
            <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest mt-1.5 leading-tight">Grid 98.4%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldUnitsCard() {
  return (
    <div className="glass-panel silk-border scanline-move rounded-[32px] p-8 bento-tile bg-gradient-to-tr from-indigo-500/5 to-transparent relative overflow-hidden min-h-[180px] flex flex-col justify-center">
      <div className="scanline" />
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 block relative z-10 leading-normal">Field Units</h3>
      <div className="flex items-end justify-between mb-6 relative z-10">
        <div className="relative top-[-4px]">
          <span className="text-4xl font-black text-white leading-none neon-glow-text">22/30</span>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-3 leading-tight">Active Teams</p>
        </div>
        <div className="text-right">
          <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest leading-none">Alpha-8</span>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1 leading-none">Operational</p>
        </div>
      </div>
      {/* Mock Wave Chart */}
      <div className="h-12 w-full flex items-center gap-1 overflow-hidden opacity-30 relative z-10">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="flex-1 bg-cyan-400 rounded-full" 
            style={{ height: `${30 + Math.sin(i * 0.4) * 20 + Math.random() * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

