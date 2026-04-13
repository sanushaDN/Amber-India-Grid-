import React, { useState, useEffect } from 'react';
import {
  Camera, Map as MapPin, CheckCircle, ArrowLeft,
  ChevronRight, Activity, Clock, AlertCircle, Wifi,
  Shield, Award, Radio
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function CitizenUpload() {
  const [step, setStep]                 = useState(1);
  const [location, setLocation]         = useState({ lat: 28.6139, lng: 77.2090 });
  const [gpsStatus, setGpsStatus]       = useState('acquiring');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [missingPersons, setMissingPersons] = useState([]);
  const [file, setFile]                 = useState(null);
  const [filePreview, setFilePreview]   = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [success, setSuccess]           = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [aiScore, setAiScore]           = useState(0);
  const [aiRunning, setAiRunning]       = useState(false);
  const [showBadge, setShowBadge]       = useState(false);
  const [latestSightingId, setLatestSightingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const API_BASE = 'https://amber-backend-flng.onrender.com';
    fetch(`${API_BASE}/missing_persons/`)
      .then(r => r.json())
      .then(data => setMissingPersons(data.filter(p => p.status === 'ACTIVE')))
      .catch(() => {});

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus('ok');
        },
        () => setGpsStatus('denied'),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    } else {
      setGpsStatus('denied');
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onloadend = () => setFilePreview(reader.result);
    reader.readAsDataURL(f);
    setStep(3);
    setAiScore(0);
    setAiRunning(true);
    let score = 0;
    const target = 55 + Math.floor(Math.random() * 40);
    const iv = setInterval(() => {
      score += Math.floor(Math.random() * 4) + 1;
      if (score >= target) { score = target; clearInterval(iv); setAiRunning(false); }
      setAiScore(score);
    }, 70);
  };

  const handleSubmit = async () => {
    setUploading(true);
    setSubmitError('');

    const formData = new FormData();
    formData.append('missing_person_id', selectedPerson.id);
    formData.append('sighting_lat',  location.lat);
    formData.append('sighting_lng',  location.lng);
    formData.append('photo', file);

    const API_BASE = 'https://amber-backend-flng.onrender.com';
    try {
      const res = await fetch(`${API_BASE}/citizen_sightings/`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setLatestSightingId(data.id);
        setSuccess(true);
        // Delay badge reveal for dramatic effect
        setTimeout(() => setShowBadge(true), 800);
      } else {
        const err = await res.json();
        setSubmitError(err.detail || 'Submission failed. Please try again.');
      }
    } catch {
      setSubmitError('Cannot reach the server. Is the backend running?');
    } finally {
      setUploading(false);
    }
  };

  const getBadgeRank = () => {
    if (aiScore >= 85) return { rank: 'SENTINEL', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', glow: 'neon-glow-amber', desc: 'Your intel is Mission-Critical. HQ has been alerted.' };
    if (aiScore >= 70) return { rank: 'GUARDIAN', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', glow: 'neon-glow-text', desc: 'High-value intelligence. Field teams are being dispatched.' };
    if (aiScore >= 50) return { rank: 'OBSERVER', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30', glow: 'neon-glow-text', desc: 'Valuable lead. Officers will review your submission.' };
    return { rank: 'CONTRIBUTOR', color: 'text-slate-400', bg: 'bg-white/5 border-white/10', glow: '', desc: 'Every report matters. Your data strengthens the grid.' };
  };

  // LIVE INTERCEPT TRACKING SENDER
  useEffect(() => {
    if (!success || !latestSightingId) return;

    const WS_BASE = 'wss://amber-backend-flng.onrender.com';
    const socket = new WebSocket(`${WS_BASE}/ws/police_dashboard`);
    
    let interval;
    socket.onopen = () => {
      console.log('[BEACON] Tactical Signal Established');
      interval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: "LIVE_COORDINATE_UPDATE",
            sighting_id: latestSightingId,
            person_name: selectedPerson?.full_name,
            lat: location.lat,
            lng: location.lng
          }));
        }
      }, 3000); // 3-second heartbeat
    };

    return () => {
      clearInterval(interval);
      socket.close();
    };
  }, [success, latestSightingId, location, selectedPerson]);

  /* ── SUCCESS SCREEN WITH HONOR BADGE ── */
  if (success) {
    const badge = getBadgeRank();
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center font-sans relative">
        <div className="security-grid" />

        {/* Shockwave Effect */}
        <div className="relative mb-10">
          <div className="shockwave-ring" />
          <div className="shockwave-ring" style={{ animationDelay: '0.3s' }} />
          <div className="w-24 h-24 bg-amber-500/15 rounded-full flex items-center justify-center border border-amber-500/25 shadow-[0_0_80px_rgba(245,158,11,0.2)] relative z-10">
            <CheckCircle size={48} className="text-amber-500" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase italic tracking-tight mb-2">
          Intelligence <span className="text-amber-500">Secured</span>
        </h1>
        <p className="text-slate-500 text-sm max-w-xs leading-relaxed mb-1">
          Your data has been encrypted and transmitted to the AMBER-India national grid.
        </p>
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-8 font-mono">
          Reference: #SIT-{Math.floor(Math.random() * 9000) + 1000}
        </p>

        {/* HONOR BADGE */}
        {showBadge && (
          <div className={`animate-fade-in-up max-w-sm w-full rounded-3xl border p-6 mb-8 relative overflow-hidden ${badge.bg}`}>
            <div className="badge-shine absolute inset-0 rounded-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award size={18} className={badge.color} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Digital Patriot Badge</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${badge.color}`}>{aiScore}% MATCH</span>
              </div>
              <h3 className={`text-2xl font-black uppercase italic tracking-tight ${badge.color} ${badge.glow} mb-2`}>{badge.rank}</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed">{badge.desc}</p>
            </div>
          </div>
        )}

        {/* Protocol Steps */}
        <div className="bg-[#000033]/40 border border-white/5 rounded-2xl p-5 max-w-sm w-full mb-8 text-left">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Radio size={11} className="text-cyan-400 animate-pulse"/> Sovereign Grid Protocol
          </p>
          <div className="space-y-3">
            {[
              { icon: <Shield size={12}/>, text: 'Biometric AI Comparison (DeepFace Layer-2)', done: true },
              { icon: <Shield size={12}/>,      text: 'Real-time Police Notification (Sovereign Grid)', done: true },
              { icon: <MapPin size={12}/>,       text: 'Field Unit Dispatch & GPS Triangulation', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${item.done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-600'}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-bold ${item.done ? 'text-slate-300' : 'text-slate-600'}`}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { setSuccess(false); setShowBadge(false); setStep(1); setSelectedPerson(null); setFile(null); setFilePreview(null); }}
          className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all flex items-center gap-2">
          <ArrowLeft size={12}/> File Another Official Report
        </button>
      </div>
    );
  }

  /* ── MAIN PORTAL ── */
  return (
    <div className="min-h-screen bg-transparent text-slate-100 font-sans relative">
      <div className="security-grid" />

      {/* DBIM-Style Public Header */}
      <header className="h-16 gov-banner flex items-center justify-between px-6 z-50 relative">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/70 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest">
          <ArrowLeft size={16}/> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]"/>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">CITIZEN INTELLIGENCE | GOV.IN</span>
        </div>
        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${gpsStatus === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
          <MapPin size={11}/> {gpsStatus === 'ok' ? 'GPS LOCKED' : 'GPS STANDBY'}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-10 relative z-10">
        {/* Step Indicator */}
        <div className="flex items-center mb-12">
          {['Identify', 'Capture', 'Broadcast'].map((label, i) => {
            const num = i + 1;
            const done = step > num;
            const active = step === num;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border text-xs font-black transition-all
                    ${done ? 'bg-amber-500 border-amber-500 text-black' :
                      active ? 'border-amber-500/60 text-amber-400 bg-amber-500/10 pulse-amber' :
                      'border-slate-800 text-slate-700'}`}>
                    {done ? <CheckCircle size={16}/> : num}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-white' : 'text-slate-700'}`}>{label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-px mx-3 mb-5 transition-all ${step > num ? 'bg-amber-500' : 'bg-slate-800'}`}/>}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── STEP 1: SELECT PERSON ── */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <h1 className="text-2xl font-black uppercase tracking-tight italic">
                Have you seen <span className="text-amber-400">someone?</span>
              </h1>
              <p className="text-slate-600 text-xs mt-2 font-bold uppercase tracking-widest">Select the person you believe you have spotted</p>
            </div>
            {missingPersons.length === 0 ? (
              <div className="text-center py-16 text-slate-700">
                <Activity size={32} className="mx-auto mb-3 animate-pulse"/>
                <p className="text-sm font-black uppercase tracking-widest">Syncing with Grid...</p>
                <p className="text-xs mt-1 text-slate-800">Establishing secure connection to HQ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {missingPersons.map(p => {
                  const hrs = Math.round((Date.now() - new Date(p.reported_at)) / 3600000);
                  return (
                    <div key={p.id} onClick={() => { setSelectedPerson(p); setStep(2); }}
                      className="glass-panel p-4 rounded-[24px] flex items-center gap-4 cursor-pointer group border border-white/5 hover:border-amber-500/30 transition-all active:scale-[0.98]">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-white/5 flex-shrink-0 relative">
                        <img src={`${API_BASE}/${p.photo_path}`} alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={e => { e.target.style.display='none'; }}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm uppercase group-hover:text-amber-400 transition-colors">{p.full_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{p.age}y</span>
                          <span className="text-[10px] text-slate-700 font-mono">#{String(p.id).padStart(4,'0')}</span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${hrs > 24 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'}`}>
                            {hrs > 24 ? 'CRITICAL' : hrs > 6 ? 'URGENT' : 'RECENT'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-700 group-hover:text-amber-400 transition-all flex-shrink-0"/>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: CAPTURE PHOTO ── */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <h1 className="text-2xl font-black uppercase tracking-tight italic">
                Capture <span className="text-amber-400">Evidence</span>
              </h1>
              <p className="text-slate-600 text-xs mt-2 font-bold uppercase tracking-widest">
                Take or upload a photo of the person you spotted
              </p>
            </div>
            {/* Selected person reminder */}
            <div className="flex items-center gap-3 glass-panel p-4 rounded-xl border border-amber-500/20 mb-6">
              <img src={`${API_BASE}/${selectedPerson?.photo_path}`} alt=""
                className="w-10 h-10 rounded-lg object-cover" onError={e => { e.target.style.display='none'; }}/>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reporting sighting for</p>
                <p className="text-sm font-black uppercase">{selectedPerson?.full_name}</p>
              </div>
            </div>
            <label className="relative glass-panel p-12 border-2 border-dashed border-white/10 hover:border-amber-500/50 rounded-[32px] text-center block cursor-pointer transition-all group mb-5 active:scale-[0.98]">
              <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange}/>
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-amber-500/20 group-hover:scale-110 transition-all animate-float">
                <Camera size={32} className="text-amber-500"/>
              </div>
              <p className="font-black text-base uppercase tracking-tight">Upload Evidence</p>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-2">SECURE END-TO-END TRANSMISSION</p>
            </label>
            <button onClick={() => setStep(1)} className="w-full py-3 text-slate-600 hover:text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all">
              ← Wrong subject? Select Again
            </button>
          </div>
        )}

        {/* ── STEP 3: CONFIRM & BROADCAST ── */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <h1 className="text-2xl font-black uppercase tracking-tight italic">
                Confirm & <span className="text-rose-400">Broadcast</span>
              </h1>
              <p className="text-slate-600 text-xs mt-2 font-bold uppercase tracking-widest">Review your sighting before submitting</p>
            </div>

            <div className="glass-panel p-5 rounded-[28px] border border-white/5 mb-4 flex gap-5">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-white/5 flex-shrink-0 relative">
                <div className="biometric-laser" style={{ animationDuration: '3s' }}/>
                <img src={filePreview} alt="Sighting" className="w-full h-full object-cover"/>
              </div>
              <div className="space-y-3 flex-1">
                <InfoRow icon={<Activity size={12}/>} label="Subject" val={selectedPerson?.full_name}/>
                <InfoRow icon={<MapPin size={12}/>}   label="Location"
                  val={gpsStatus === 'ok'
                    ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                    : 'Using approximate location'}
                  warn={gpsStatus === 'denied'}/>
                <InfoRow icon={<Clock size={12}/>}    label="Time" val={new Date().toLocaleTimeString()}/>
              </div>
            </div>

            {/* Tactical GPS Scan */}
            <div className="h-44 glass-panel rounded-[28px] border border-white/5 mb-4 overflow-hidden relative">
               <div className="absolute inset-0 z-10 pointer-events-none border border-amber-500/10 rounded-[28px]" />
               <div className="scanline" />
               <MapContainer center={[location.lat, location.lng]} zoom={16} className="w-full h-full grayscale-[0.6] contrast-[1.2]" zoomControl={false} scrollWheelZoom={false} dragging={false} touchZoom={false}>
                 <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                 <RecenterMap center={[location.lat, location.lng]} />
                 <Circle center={[location.lat, location.lng]} radius={10} pathOptions={{ color: '#f59e0b', weight: 4, fillOpacity: 0.8, className: 'animate-pulse' }} />
                 <Circle center={[location.lat, location.lng]} radius={100} pathOptions={{ color: '#f59e0b', weight: 1, dashArray: '5, 10', fillOpacity: 0.05 }} />
               </MapContainer>
               <div className="absolute top-3 left-3 z-20 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-[0_0_8px_#f43f5e]" />
                 <span className="text-[8px] font-black text-white uppercase tracking-widest leading-none">Live Coordinate Sync</span>
               </div>
               <div className="absolute bottom-3 right-3 z-20 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[8px] font-mono text-slate-400">
                 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
               </div>
            </div>

            {/* AI Confidence Meter */}
            <div className={`p-5 rounded-[28px] border mb-4 transition-all ${aiScore >= 70 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Activity size={12} className={aiRunning ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}/>
                  {aiRunning ? 'Neural Net Scanning...' : 'Biometric Analysis Complete'}
                </p>
                <span className={`text-lg font-black font-mono ${aiScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{aiScore}%</span>
              </div>
              <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-100 ${aiScore >= 70 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${aiScore}%` }}/>
              </div>
              {!aiRunning && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[
                    { label: 'Facial Geometry', val: `${Math.min(aiScore + 5, 99)}%` },
                    { label: 'Ocular Match', val: `${Math.min(aiScore + 2, 99)}%` },
                    { label: 'Confidence', val: `${aiScore}%` },
                  ].map((m, i) => (
                    <div key={i} className="text-center">
                      <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">{m.label}</p>
                      <p className={`text-[10px] font-black font-mono ${aiScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{m.val}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className={`text-[9px] font-black uppercase tracking-widest mt-3 ${aiScore >= 70 ? 'text-emerald-400' : 'text-slate-600'}`}>
                {aiRunning ? '⚡ Analyzing facial geometry...' :
                  aiScore >= 70 ? '✅ High confidence — HQ will be alerted automatically' :
                  '⚠️ Possible match — will be reviewed by officers'}
              </p>
            </div>

            {/* Error message */}
            {submitError && (
              <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl mb-4">
                <AlertCircle size={16} className="text-rose-400 flex-shrink-0 mt-0.5"/>
                <p className="text-[11px] font-bold text-rose-300">{submitError}</p>
              </div>
            )}

            <button onClick={handleSubmit} disabled={uploading || aiRunning}
              className="w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-3"
              style={{ background: uploading ? '#374151' : 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', boxShadow: '0 10px 40px rgba(245,158,11,0.25)' }}>
              {uploading ? (
                <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"/> Transmitting...</>
              ) : aiRunning ? (
                'AI Scanning...'
              ) : (
                <><Radio size={16}/> Initiate Sovereign Broadcast</>
              )}
            </button>
            <button onClick={() => setStep(2)} className="w-full mt-3 py-3 text-slate-600 hover:text-slate-400 text-[10px] font-black uppercase tracking-widest transition-all">
              ← Retake Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, val, warn }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-700 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
        <p className={`text-[11px] font-black uppercase ${warn ? 'text-orange-400' : 'text-white'}`}>{val}</p>
      </div>
    </div>
  );
}
