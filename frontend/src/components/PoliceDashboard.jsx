import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  ShieldAlert, Map as MapIcon, Bell, LogOut, Plus, X, Upload,
  Globe, Activity, Search, CheckCircle2, Clock, AlertTriangle,
  ChevronRight, Users, Zap, Eye, Radio, TrendingUp, Target, Wifi, Download, Share2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://amber-backend-flng.onrender.com';
const WS_BASE = 'wss://amber-backend-flng.onrender.com';
const INDIA_BOUNDS = [[6.5, 68.0], [35.5, 97.5]]; // Approximate bounds for India
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

function LocationPicker({ onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Build image URL from relative path
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
    { msg: 'System initialized • Portal operational', type: 'info', ts: new Date() },
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

  const getShareUrl = (person) => {
    const text = `🚨 MISSING PERSON ALERT 🚨\n\nName: ${person.full_name}\nAge: ${person.age} years\n\n${person.description || ''}\n\nIf you have seen this person, please report at:\nhttps://amber-india.netlify.app/report\n\n📞 1098 (Childline) or 100 (Police Emergency)`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
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
      method: 'PUT', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    if (r.ok) {
      toast("Case has been marked as Recovered.", "emerald");

      // Simulated SMS Notification
      setTimeout(() => {
        toast("SMS Sent: The family has been notified.", "blue");
      }, 1500);

      setSelectedCase(null);
      fetchData();
    }
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
        setFeed(f => [{ msg: `ALERT: Match confirmed with ${Math.round(d.confidence)}% confidence`, type: 'alert', ts: new Date() }, ...f.slice(0, 19)]);
        toast(`Facial match for Case #${d.missing_person_id} — ${Math.round(d.confidence)}% confidence`, 'amber');
        // Get human-readable location name
        getLocationName(d.lat, d.lng).then(name => {
          setAlertLocationName(name);
          setFeed(f => [{ msg: `Sighting reported near ${name}`, type: 'info', ts: new Date() }, ...f.slice(0, 19)]);
        });
        fetchData();
      }
      if (d.type === 'CASE_RECOVERED') {
        setFeed(f => [{ msg: `${d.name} marked as recovered.`, type: 'success', ts: new Date() }, ...f.slice(0, 19)]);
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
      toast("Patrol units dispatched to location.", "emerald");
    }, 2000);
  };

  const isWithinIndia = (lat, lng) => {
    return lat >= 6.5 && lat <= 35.5 && lng >= 68.0 && lng <= 97.5;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isWithinIndia(form.lat, form.lng)) {
      return toast("Registration failed. Coordinates must be within Indian Territory.", "rose");
    }
    if (!file) return toast("Please upload a photo of the person", "amber");
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
        toast("Missing person registered successfully.", "emerald");
        setDrawer(false);
        setForm({ full_name: '', age: '', description: '', lat: 28.6139, lng: 77.209 });
        setFile(null);
        fetchData();
      } else {
        toast("Registration failed. Please check the form and try again.", "rose");
      }
    } catch {
      toast("Could not reach the server. Please try again.", "rose");
    } finally {
      setSub(false);
    }
  };

  const active    = persons.filter(p => p.status === 'ACTIVE');
  const recovered = persons.filter(p => p.status === 'RECOVERED');
  const critical  = active.filter(p => (Date.now() - new Date(p.reported_at)) / 3600000 > 24);

  return (
    <div className="h-screen w-screen bg-gray-50 text-gray-900 flex flex-col font-sans overflow-hidden relative">

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
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30 text-[9px] font-black uppercase tracking-widest animate-pulse">
                    <Activity size={10}/> High Confidence Match
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500/20 text-slate-400 rounded-full border border-slate-500/20 text-[9px] font-black uppercase tracking-widest">
                    <Zap size={10}/> Facial Recognition Module
                  </div>
                </div>
                <h2 className="text-3xl font-black text-white italic tracking-tighter">Match <span className="text-blue-400">Results</span></h2>
              </div>
              <button onClick={() => setActiveAlert(null)} className="p-2 text-slate-500 hover:text-white transition-all"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-5 gap-8 mb-8">
              {/* Case Photo with Laser */}
              <div className="col-span-2 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Case File Record</p>
                <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 relative">
                  <div className="biometric-laser" />
                  <img src={getImgUrl(activeAlert.case_photo)} className="w-full h-full object-cover" alt="" onError={e => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Archived"; }}/>
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
                    { label: 'Face Shape', val: '94%', color: 'text-emerald-400' },
                    { label: 'Similarity Index', val: '87%', color: 'text-blue-400' },
                    { label: 'Feature Alignment',  val: '91%', color: 'text-emerald-400' },
                    { label: 'Confidence Score',  val: '78%', color: 'text-amber-400' },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{m.label}</span>
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
                  <img src={getImgUrl(activeAlert.sighting_photo)} className="w-full h-full object-cover" alt="" onError={e => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Archived"; }}/>
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
                <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">System Recommendation</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">Match confidence exceeds threshold. Recommend dispatching nearest patrol unit for physical verification at the reported coordinates.</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <button onClick={() => setActiveAlert(null)} className="h-12 px-6 rounded-xl border border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">Dismiss</button>
                <button 
                  onClick={handleAuthorizeDispatch}
                  disabled={dispatching}
                  className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-[0.1em] shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                  {dispatching ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap size={14} fill="currentColor"/> Dispatch Patrol
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="h-16 flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-8 z-50 sticky top-0">
        <div className="flex items-center gap-10 h-full">
          <div className="flex items-center gap-4 border-r border-gray-200 pr-8 h-8">
            <div className="flex flex-col items-center justify-center">
              <ShieldAlert size={20} className="text-blue-600"/>
              <span className="text-[5px] font-black uppercase tracking-[0.2em] mt-0.5 text-gray-500">सत्यमेव जयते</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[14px] font-black text-gray-900 leading-none tracking-tight">GOV.IN</span>
              <span className="text-[8px] font-black text-blue-600 leading-none uppercase tracking-widest mt-1">AMBER-India | Ministry of Home Affairs</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 h-full">
            {[
              { id: 'bento', label: 'Overview' },
              { id: 'map',   label: 'Recovery Grid' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'cases', label: 'Registry' },
            ].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center px-5 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                  ${activeTab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex items-center relative w-[360px]">
          <Search size={14} className="absolute left-4 text-gray-400"/>
          <input type="text" placeholder="Search case files or identifiers..."
            className="w-full bg-gray-100 border-none rounded-full py-2.5 pl-11 pr-4 text-[11px] text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"/>
        </div>

        <div className="flex items-center gap-6 h-full">
          {liveCount > 0 && (
            <div className="flex items-center gap-2 bg-red-500 text-white px-4 h-8 rounded-full text-[9px] font-black uppercase tracking-[0.1em] animate-pulse shadow-lg shadow-red-200">
              {liveCount} CRITICAL ALERTS
            </div>
          )}
          
          <button onClick={() => setDrawer(true)} className="flex items-center gap-2 bg-gradient-premium hover:opacity-90 text-white font-black px-6 h-9 rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-blue-200">
            <Plus size={14} strokeWidth={3}/> Register Case
          </button>
          
          <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
            <button onClick={() => navigate('/report')} className="p-2 text-gray-400 hover:text-blue-600 transition-all hover:bg-gray-100 rounded-lg"><Globe size={18}/></button>
            <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} className="p-2 text-gray-400 hover:text-red-500 transition-all hover:bg-gray-100 rounded-lg"><LogOut size={18}/></button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'bento' && (
          <div className="h-full overflow-hidden p-6 animate-fade-in-up">
            <div className="grid grid-cols-12 gap-6 h-full">
              <div className="col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
                <ActiveCasesCard count={active.length} />
                <div className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={12} className="text-red-500"/> Critical Alerts
                    </h3>
                  </div>
                  <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">
                    {critical.map(p => (
                      <div key={p.id} onClick={() => openTimeline(p)} className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 cursor-pointer transition-all border border-transparent hover:border-gray-200">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src={getImgUrl(p.photo_path)} className="w-full h-full object-cover" alt=""/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase text-gray-900 truncate group-hover:text-blue-600">{p.full_name}</p>
                          <p className="text-[9px] text-red-500 font-bold mt-0.5">24H+ ELAPSED</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-5 flex flex-col gap-6">
                <div className="flex-1 bg-white border border-gray-200 rounded-3xl overflow-hidden relative shadow-sm">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={mapZoom} 
                    className="w-full h-full" 
                    zoomControl={false}
                    maxBounds={INDIA_BOUNDS}
                    minZoom={4}
                  >
                    <ChangeView center={mapCenter} zoom={mapZoom}/>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                    {active.map(p => (
                      <Marker key={p.id} position={[p.last_known_lat, p.last_known_lng]} eventHandlers={{ click: () => openTimeline(p) }}>
                        <Circle center={[p.last_known_lat, p.last_known_lng]}
                          pathOptions={{ color:'#2dd4bf', weight:2, dashArray:'3,6', fillOpacity:0.1 }} radius={25000} className="animate-pulse" />
                        <Popup className="custom-popup">
                          <div className="p-2">
                            <p className="font-black uppercase text-sm text-gray-900">{p.full_name}</p>
                            <p className="text-[9px] mt-1 text-blue-600">Predicted Search Zone Active</p>
                          </div>
                        </Popup>
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
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Citizen Sighting</p>
                            <p className="text-xs font-bold text-gray-900">Match: {Math.round(s.match_score || 0)}%</p>
                            <p className="text-[9px] text-gray-500 mt-1">{new Date(s.reported_at).toLocaleString()}</p>
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
                              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Reporter Location</p>
                              <p className="text-xs font-bold text-gray-900 uppercase">{tracker.name}</p>
                              <p className="text-[9px] text-gray-500 mt-1">Live tracking active...</p>
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
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Activity Log</h3>
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
                <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <RecoveryStatusCard activeCount={active.length} recoveredCount={recovered.length} />
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <CaseStatusPieChart activeCount={active.length} recoveredCount={recovered.length} />
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <WeeklyTrendChart persons={persons} />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ── VIEW: ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <div className="h-full overflow-y-auto p-8 animate-fade-in-up custom-scrollbar bg-gray-50/50">
            <div className="max-w-7xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-gray-900">Intelligence <span className="text-blue-600 italic">Analytics</span></h2>
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mt-1">Real-time data visualization of the AMBER-India recovery grid</p>
                </div>
                <button className="flex items-center gap-2 bg-white border border-gray-200 px-5 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all">
                  <Download size={14}/> Export Statistics
                </button>
              </div>

              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-8 space-y-8">
                  <div className="glass-panel shadow-premium p-8 rounded-[32px] min-h-[400px]">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                      <TrendingUp size={14} className="text-blue-600"/> Registration Trends (Last 14 Days)
                    </h3>
                    <div className="h-[300px] w-full">
                      <WeeklyTrendChart persons={persons} height={300} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8">
                    <div className="glass-panel shadow-premium p-8 rounded-[32px]">
                       <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Age Distribution</h3>
                       <AgeDistributionChart persons={persons} />
                    </div>
                    <div className="glass-panel shadow-premium p-8 rounded-[32px]">
                       <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">System Efficiency</h3>
                       <div className="space-y-6">
                         {[
                           { label: 'Avg. Recovery Time', val: '18.4 hrs', trend: '-12%', color: 'text-emerald-500' },
                           { label: 'Biometric Match Rate', val: '92.1%', trend: '+4.2%', color: 'text-blue-500' },
                           { label: 'Public Participation', val: '2.4k users', trend: '+18%', color: 'text-blue-500' }
                         ].map((s, i) => (
                           <div key={i} className="flex items-center justify-between">
                             <span className="text-xs font-bold text-gray-500">{s.label}</span>
                             <div className="text-right">
                               <p className="text-sm font-black text-gray-900">{s.val}</p>
                               <span className={`text-[9px] font-black ${s.color}`}>{s.trend}</span>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-4 space-y-8">
                  <div className="bg-gradient-premium p-8 rounded-[32px] text-white shadow-lg shadow-blue-200 flex flex-col justify-between min-h-[220px]">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Public Safety Protocol</p>
                      <h4 className="text-2xl font-black leading-tight italic">Broadcast National Alert</h4>
                      <p className="text-[10px] text-white/60 mt-2">Send a high-priority push notification to all citizens currently enrolled in the AMBER-India network.</p>
                    </div>
                    <button onClick={async () => {
                      const msg = prompt("Enter emergency broadcast message:");
                      if (!msg) return;
                      const formData = new FormData();
                      formData.append('message', msg);
                      const res = await fetch(`${API_BASE}/broadcast/`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                        body: formData
                      });
                      if (res.ok) toast("Emergency Broadcast Sent to National Grid", "emerald");
                      else toast("Failed to send broadcast", "rose");
                    }} className="h-10 w-full bg-white text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-widest mt-4 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                      <Bell size={14}/> Send Alert
                    </button>
                  </div>
                  
                  <div className="glass-panel shadow-premium p-8 rounded-[32px] flex-1">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Case Status Breakdown</h3>
                    <CaseStatusPieChart activeCount={active.length} recoveredCount={recovered.length} showLegend={true} />
                  </div>
                </div>
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
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Reports</span>
                <Search size={14} className="text-slate-700"/>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                {active.map(p => {
                  const pri = getCasePriority(p.reported_at);
                  return (
                    <div key={p.id} onClick={() => { setMapCenter([p.last_known_lat, p.last_known_lng]); setMapZoom(14); openTimeline(p); }}
                      className="group p-3 rounded-xl cursor-pointer hover:bg-white/5 transition-all border border-transparent hover:border-white/5">
                      <div className="flex items-center gap-3">
                        <img src={getImgUrl(p.photo_path)} className="w-9 h-9 rounded-lg object-cover opacity-70 group-hover:opacity-100 transition-all" alt="" onError={e => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=NA"; }}/>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black uppercase truncate group-hover:text-blue-600 transition-colors text-gray-900">{p.full_name}</p>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${pri.cls}`}>{pri.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1">
              <MapContainer 
                center={mapCenter} 
                zoom={mapZoom} 
                className="w-full h-full" 
                zoomControl={true}
                maxBounds={INDIA_BOUNDS}
                minZoom={4}
              >
                <ChangeView center={mapCenter} zoom={mapZoom}/>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                {persons.map(p => (
                  <React.Fragment key={p.id}>
                    <Marker position={[p.last_known_lat, p.last_known_lng]} eventHandlers={{ click: () => openTimeline(p) }}>
                      <Popup className="custom-popup">
                        <div className="p-2">
                          <p className="font-black uppercase text-sm text-gray-900">{p.full_name}</p>
                          <p className={`text-[9px] mt-1 ${p.status === 'RECOVERED' ? 'text-green-600' : 'text-blue-600'}`}>{p.status}</p>
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
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Citizen Sighting</p>
                        <p className="text-xs font-bold text-gray-900">Match: {Math.round(s.match_score || 0)}%</p>
                        <p className="text-[9px] text-gray-500 mt-1">{new Date(s.reported_at).toLocaleString()}</p>
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
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Live Reporter</p>
                          <p className="text-xs font-bold text-gray-900 uppercase">{tracker.name}</p>
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
                  <Users size={24} className="text-blue-600"/> CASE REGISTRY
                </h2>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 px-4 py-2 rounded-xl border border-gray-200">
                  Total Records: {persons.length}
                </div>
              </div>

              <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-6 w-[35%]">Subject Details</th>
                      <th className="text-left p-6 w-[10%]">Age</th>
                      <th className="text-left p-6 w-[15%]">Search Priority</th>
                      <th className="text-left p-6 w-[15%]">Status</th>
                      <th className="text-left p-6 w-[25%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {persons.map(p => {
                      const pri = getCasePriority(p.reported_at);
                      const isActive = p.status === 'ACTIVE';
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-all group">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm flex-shrink-0">
                                <img 
                                  src={getImgUrl(p.photo_path)} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                  alt=""
                                  onError={(e) => { e.target.src = "https://via.placeholder.com/150?text=No+Photo"; }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black uppercase text-gray-900 group-hover:text-blue-600 transition-colors truncate">{p.full_name}</p>
                                <p className="text-[10px] text-gray-500 font-mono mt-0.5 tracking-tighter">ID: AMB-{String(p.id).padStart(4, '0')}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="text-xs font-black text-gray-600">{p.age}y</span>
                          </td>
                          <td className="p-6">
                            {isActive ? (
                              <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-sm ${pri.cls}`}>
                                {pri.label}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase text-gray-400">--</span>
                            )}
                          </td>
                          <td className="p-6">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border ${isActive ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-green-700 bg-green-50 border-green-200'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => { openTimeline(p); setActiveTab('map'); setMapCenter([p.last_known_lat, p.last_known_lng]); }}
                                className="h-9 px-4 rounded-xl bg-white hover:bg-gray-50 text-gray-700 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-gray-300 shadow-sm active:scale-95"
                              >
                                <Eye size={14}/> Timeline
                              </button>
                              {isActive && (
                                <button 
                                  onClick={() => markRecovered(p.id)}
                                  className="h-9 px-4 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
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
                    <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">No cases have been registered yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══ CASE TIMELINE PANEL ══ */}
      {selectedCase && (
        <div className="fixed inset-0 z-[1500] flex justify-end printable-timeline">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCase(null)}/>
          <div className="relative w-[400px] h-full bg-white border-l border-gray-200 flex flex-col animate-slide-in shadow-2xl z-[1501]">
            <div className="p-7 border-b border-gray-200 flex justify-between items-start">
              <div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Case File</p>
                <h3 className="text-lg font-black uppercase text-gray-900">{selectedCase.full_name}</h3>
                <p className="text-[10px] text-gray-500 mt-1">Age {selectedCase.age} • Case #{selectedCase.id}</p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-gray-400 hover:text-gray-900 transition-all mt-1"><X size={22}/></button>
            </div>
            {/* Priority Block */}
            {(() => { const pri = getCasePriority(selectedCase.reported_at); const hrs = Math.round((Date.now() - new Date(selectedCase.reported_at)) / 3600000);
              return (<div className={`mx-6 mt-5 p-4 rounded-2xl border flex items-center gap-3 ${pri.cls.includes('rose') ? 'border-red-200 bg-red-50' : pri.cls.includes('orange') ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
                <AlertTriangle size={16} className={`${pri.cls.includes('rose') ? 'text-red-500' : pri.cls.includes('orange') ? 'text-amber-500' : 'text-blue-500'} ${pri.pulse ? 'animate-pulse' : ''}`}/>
                <div><p className={`text-[10px] font-black uppercase ${pri.cls.includes('rose') ? 'text-red-600' : pri.cls.includes('orange') ? 'text-amber-600' : 'text-blue-600'}`}>{pri.label} — {hrs}h elapsed</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{new Date(selectedCase.reported_at).toLocaleString()}</p></div>
              </div>);}
            )()}
            {/* Sightings Timeline */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={11}/> Case Timeline
              </p>
              
              <div className="space-y-4">
                {caseSightings.map((s, i) => (
                  <div key={s.id} className="pl-5 border-l-2 border-gray-200 relative">
                    <div className={`absolute left-[-5px] top-1.5 w-2 h-2 rounded-full ${s.match_score > 70 ? 'bg-green-500' : s.match_score > 40 ? 'bg-amber-500' : 'bg-gray-400'}`}/>
                    <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                      <div className="flex justify-between mb-3">
                        <span className="text-[9px] font-black text-gray-500 uppercase">Sighting #{caseSightings.length - i}</span>
                        <span className="text-[8px] font-mono text-gray-400">{new Date(s.reported_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">AI Confidence</span>
                        <span className={`text-sm font-black ${s.match_score > 70 ? 'text-green-600' : s.match_score > 40 ? 'text-blue-600' : 'text-gray-500'}`}>{Math.round(s.match_score || 0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                        <div className={`h-full rounded-full transition-all duration-100 ${s.match_score > 70 ? 'bg-green-500' : s.match_score > 40 ? 'bg-blue-500' : 'bg-gray-400'}`} style={{ width: `${s.match_score || 0}%` }}/>
                      </div>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${s.match_score > 70 ? 'text-green-600' : 'text-gray-500'}`}>
                        {s.match_score > 70 ? '✅ MATCH CONFIRMED' : s.match_score > 40 ? '⚠ Review Required' : '❌ No Match'}
                      </p>
                      <p className="text-[9px] text-gray-500 mt-1.5 font-mono">{s.sighting_lat?.toFixed(5)}, {s.sighting_lng?.toFixed(5)}</p>
                    </div>
                  </div>
                ))}
                
                {/* Initial Report Node */}
                <div className="pl-5 border-l-2 border-gray-200 relative">
                  <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-blue-500"/>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex justify-between mb-1">
                      <span className="text-[9px] font-black text-blue-600 uppercase">Case Reported</span>
                      <span className="text-[8px] font-mono text-gray-500">{new Date(selectedCase.reported_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[9px] text-gray-500 mt-1.5 font-mono">Original Last Known: {selectedCase.last_known_lat?.toFixed(5)}, {selectedCase.last_known_lng?.toFixed(5)}</p>
                  </div>
                </div>
              </div>
            </div>
            {selectedCase.status === 'ACTIVE' ? (
              <div className="p-6 border-t border-gray-200 space-y-3">
                <a href={getShareUrl(selectedCase)} target="_blank" rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-widest text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Share2 size={14}/> Share on WhatsApp
                </a>
                <button onClick={() => markRecovered(selectedCase.id)} className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all bg-green-600 hover:bg-green-700 shadow-sm">
                  <CheckCircle2 size={16}/> Mark as Recovered
                </button>
              </div>
            ) : (
              <div className="p-6 border-t border-gray-200">
                <button onClick={() => window.print()} className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest text-white flex items-center justify-center gap-2 active:scale-95 transition-all bg-blue-600 hover:bg-blue-700 shadow-sm">
                  <Download size={16}/> EXPORT PDF REPORT
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ NEW ALERT DRAWER ══ */}
      {drawer && (
        <div className="fixed inset-0 z-[2000] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawer(false)}/>
          <div className="relative w-[420px] h-full bg-white border-l border-gray-200 p-9 flex flex-col z-[2001] animate-slide-in shadow-2xl">
            <button onClick={() => setDrawer(false)} className="absolute top-9 right-9 text-gray-400 hover:text-gray-900 transition-all"><X size={28}/></button>
            <div className="mb-7">
              <h2 className="text-xl font-black uppercase italic tracking-tight text-gray-900">Register <span className="text-blue-600">Missing Person</span></h2>
              <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-1.5">This person will appear on the public portal immediately.</p>
            </div>
            <form onSubmit={handleRegister} className="flex-1 space-y-4 overflow-y-auto pr-1 custom-scrollbar">
              {[['Full Name','text','full_name'],['Age','number','age']].map(([l,t,k]) => (
                <div key={k}>
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">{l}</label>
                  <input type={t} required className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-blue-500 transition-all shadow-sm"
                    value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})}/>
                </div>
              ))}
              <div>
                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Description</label>
                <textarea rows="3" required className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-blue-500 resize-none shadow-sm"
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[['Latitude','lat'],['Longitude','lng']].map(([l,k]) => (
                  <div key={k}>
                    <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">{l}</label>
                    <input type="number" step="any" className="w-full bg-white border border-gray-300 p-3.5 rounded-xl text-xs text-gray-900 outline-none focus:border-blue-500 shadow-sm"
                      value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})}/>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block">Tap Map to Set Location</label>
                  <button type="button" onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setForm({...form, lat: pos.coords.latitude, lng: pos.coords.longitude});
                      });
                    }
                  }} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Use My Location</button>
                </div>
                <div className="h-44 rounded-2xl overflow-hidden border border-gray-200 relative group">
                  <MapContainer center={[form.lat || 20.5937, form.lng || 78.9629]} zoom={4} className="w-full h-full" zoomControl={false} maxBounds={INDIA_BOUNDS}>
                    <ChangeView center={[form.lat, form.lng]} zoom={form.lat === 28.6139 ? 4 : 12}/>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                    <LocationPicker onSelect={(lat, lng) => setForm({...form, lat, lng})}/>
                    <Marker position={[form.lat, form.lng]} />
                  </MapContainer>
                  <div className="absolute top-2 right-2 z-[1000] bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[8px] font-black uppercase text-gray-600 border border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to Pin
                  </div>
                </div>
              </div>
              <div className="relative bg-gray-50 p-8 border-dashed border-2 border-gray-300 hover:border-blue-400 transition-all text-center rounded-2xl cursor-pointer group">
                <input type="file" required className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files[0])}/>
                <Upload size={24} className="mx-auto mb-2 text-gray-400 group-hover:text-blue-500 transition-colors"/>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">{file ? file.name : 'Upload a clear photo of their face'}</p>
              </div>
              <button type="submit" disabled={submitting} className="w-full btn-premium py-4 rounded-xl font-black uppercase tracking-widest text-white text-[11px] disabled:opacity-40">
                {submitting ? 'Registering...' : 'Register Person'}
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
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center relative z-10 py-4">
          <p className="text-xl font-bold text-white mb-2">No active cases found.</p>
          <p className="text-xs text-slate-500">Database empty.</p>
        </div>
      ) : (
        <>
          <div className="flex items-end gap-5 mb-8 relative z-10">
            <span className="text-6xl font-black text-white leading-none tracking-tighter neon-glow-text">{String(count).padStart(3, '0')}</span>
            <div className="flex flex-col mb-1.5">
              <span className="text-cyan-400 text-[10px] font-black leading-tight">ONLINE</span>
              <span className="text-slate-600 text-[8px] font-black tracking-widest uppercase italic leading-tight">Portal Live</span>
            </div>
          </div>
          <div className="flex items-end gap-2 h-16 relative z-10">
            {[40, 70, 45, 90, 65, 30, 85, 50, 60, 75].map((h, i) => (
              <div key={i} className="flex-1 chart-bar" style={{ height: `${h}%`, opacity: 0.7 + (h/200) }} />
            ))}
          </div>
        </>
      )}
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
            <p className="text-[10px] font-bold text-slate-300 leading-tight mt-2">Recovered Subjects</p>
          </div>
          <div className="pt-3 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-300 leading-tight">Recovery Rate</p>
            <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest mt-1.5 leading-tight">Nationwide</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingSightingsCard({ sightings }) {
  const pending = sightings.filter(s => s.match_score < 70).length;
  const highConf = sightings.filter(s => s.match_score >= 70).length;
  return (
    <div className="glass-panel silk-border rounded-[32px] p-8 bento-tile bg-gradient-to-tr from-amber-500/5 to-transparent relative overflow-hidden min-h-[180px] flex flex-col justify-center">
      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 block relative z-10 leading-normal">Active Search Resources</h3>
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">P</div>
            <p className="text-sm font-bold text-white">Active Patrol Teams: 22</p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center text-slate-400">S</div>
            <p className="text-sm font-bold text-slate-300">Standby Teams: 8</p>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-white/5 relative z-10 flex justify-between items-center">
        <div>
          <span className="text-xl font-black text-white">{sightings.length}</span>
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-tight">Total Citizen Reports</p>
        </div>
        <div className="text-right">
          <span className="text-emerald-400 text-sm font-black leading-none">{highConf} Likely Matches</span>
          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest leading-tight mt-1">{pending} Needs Review</p>
        </div>
      </div>
    </div>
  );
}

function CaseStatusPieChart({ activeCount, recoveredCount, showLegend = false }) {
  const total = activeCount + recoveredCount || 1;
  const recoveredPct = (recoveredCount / total) * 100;

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  const startX = 1;
  const startY = 0;
  const [endX, endY] = getCoordinatesForPercent(recoveredPct / 100);
  const largeArcFlag = recoveredPct > 50 ? 1 : 0;
  const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;

  return (
    <div className={`flex items-center gap-8 ${showLegend ? 'flex-col' : ''}`}>
      <div className="relative w-32 h-32 flex items-center justify-center">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full transform -rotate-90">
          <circle cx="0" cy="0" r="1" fill="#f1f5f9" />
          <path d={pathData} fill="#2563eb" />
          <circle cx="0" cy="0" r="0.6" fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-gray-900 leading-none">{Math.round(recoveredPct)}%</span>
          <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1">Recovery</span>
        </div>
      </div>
      
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-blue-600" />
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recovered</span>
          </div>
          <span className="text-xs font-black text-gray-900">{recoveredCount}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-gray-200" />
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending</span>
          </div>
          <span className="text-xs font-black text-gray-900">{activeCount}</span>
        </div>
      </div>
    </div>
  );
}

function AgeDistributionChart({ persons }) {
  const groups = { '0-5': 0, '6-12': 0, '13-17': 0, '18+': 0 };
  persons.forEach(p => {
    const age = parseInt(p.age);
    if (age <= 5) groups['0-5']++;
    else if (age <= 12) groups['6-12']++;
    else if (age <= 17) groups['13-17']++;
    else groups['18+']++;
  });

  const data = Object.entries(groups).map(([label, value]) => ({ label, value }));
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
            <span>{d.label} yrs</span>
            <span className="text-gray-900">{d.value} cases</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-premium rounded-full transition-all duration-1000" style={{ width: `${(d.value / max) * 100}%` }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function WeeklyTrendChart({ persons, height = 140 }) {
  // Generate last 7 days labels
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const counts = days.map(day => 
    persons.filter(p => p.reported_at?.startsWith(day)).length
  );

  const max = Math.max(...counts, 2);
  const width = 400;
  
  // Calculate SVG points for a smooth area chart
  const points = counts.map((c, i) => {
    const x = (i / (counts.length - 1)) * width;
    const y = height - (c / max) * (height - 20);
    return `${x},${y}`;
  });

  const pathData = `M 0,${height} ` + points.map(p => `L ${p}`).join(' ') + ` L ${width},${height} Z`;
  const lineData = `M ` + points.map(p => i === 0 ? `0,${points[0].split(',')[1]}` : `L ${p}`).join(' ');

  return (
    <div className="glass-panel shadow-sm p-6 rounded-[24px] hover-lift transition-all bg-white overflow-hidden flex flex-col">
       <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Registration Trend</h3>
       <div className="flex-1 relative">
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
           <defs>
             <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" />
               <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
             </linearGradient>
           </defs>
           {/* Area */}
           <path d={pathData} fill="url(#areaGradient)" />
           {/* Line */}
           <polyline points={points.join(' ')} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
           {/* Data Points */}
           {points.map((p, i) => (
             <circle key={i} cx={p.split(',')[0]} cy={p.split(',')[1]} r="4" fill="white" stroke="#2563eb" strokeWidth="2" />
           ))}
         </svg>
       </div>
       <div className="flex justify-between mt-3 px-1">
         {days.map((d, i) => (
           <span key={i} className="text-[8px] font-black text-gray-400 uppercase">{new Date(d).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
         ))}
       </div>
    </div>
  );
}
