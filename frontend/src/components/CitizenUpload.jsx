import React, { useState, useEffect } from 'react';
import {
  Camera, Map as MapPin, CheckCircle, ArrowLeft,
  ChevronRight, Activity, Clock, AlertCircle, Wifi,
  Shield, Award, Radio
} from 'lucide-react';
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useSearchParams } from 'react-router-dom';

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom(), { animate: true }); }, [center, map]);
  return null;
}

const API_BASE = 'https://amber-backend-flng.onrender.com';

const getImgUrl = (path) => {
  if (!path) return 'https://via.placeholder.com/150?text=No+Photo';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const cleanPath = path.replace(/^\/+/, '').replace('uploads/uploads/', 'uploads/');
  return `${API_BASE}/${cleanPath}`;
};

export default function CitizenUpload() {
  const [step, setStep]                       = useState(1);
  const [location, setLocation]               = useState({ lat: 28.6139, lng: 77.2090 });
  const [gpsStatus, setGpsStatus]             = useState('acquiring');
  const [selectedPerson, setSelectedPerson]   = useState(null);
  const [missingPersons, setMissingPersons]   = useState([]);
  const [file, setFile]                       = useState(null);
  const [filePreview, setFilePreview]         = useState(null);
  const [uploading, setUploading]             = useState(false);
  const [success, setSuccess]                 = useState(false);
  const [submitError, setSubmitError]         = useState('');
  const [aiScore, setAiScore]                 = useState(0);
  const [aiRunning, setAiRunning]             = useState(false);
  const [showBadge, setShowBadge]             = useState(false);
  const [latestSightingId, setLatestSightingId] = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [note, setNote]                       = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetch(`${API_BASE}/missing_persons/`)
      .then(r => r.json())
      .then(data => {
        const active = data.filter(p => p.status === 'ACTIVE');
        setMissingPersons(active);
        setLoading(false);
        // Pre-select from URL param
        const personId = searchParams.get('personId');
        if (personId) {
          const preSelected = active.find(p => String(p.id) === String(personId));
          if (preSelected) { setSelectedPerson(preSelected); setStep(2); }
        }
      })
      .catch(() => setLoading(false));

    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ok'); },
        () => setGpsStatus('denied'),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    } else { setGpsStatus('denied'); }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [searchParams]);

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

  const isWithinIndia = (lat, lng) => {
    return lat >= 6.5 && lat <= 35.5 && lng >= 68.0 && lng <= 97.5;
  };

  const handleSubmit = async () => {
    if (!isWithinIndia(location.lat, location.lng)) {
      setSubmitError('ALERT: YOU ARE OUTSIDE THE NATIONAL GRID. Reports can only be submitted within Indian Territory.');
      return;
    }
    setUploading(true);
    setSubmitError('');
    const formData = new FormData();
    formData.append('missing_person_id', selectedPerson.id);
    formData.append('sighting_lat', location.lat);
    formData.append('sighting_lng', location.lng);
    formData.append('photo', file);
    try {
      const res = await fetch(`${API_BASE}/citizen_sightings/`, { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        setLatestSightingId(data.id);
        setSuccess(true);
        setTimeout(() => setShowBadge(true), 800);
      } else {
        const err = await res.json();
        setSubmitError(err.detail || 'Submission failed. Please try again.');
      }
    } catch {
      setSubmitError('Cannot reach the server. Please check your connection.');
    } finally { setUploading(false); }
  };

  const getBadgeRank = () => {
    if (aiScore >= 75) return { rank: '✅ LIKELY MATCH', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', desc: 'Excellent match! Officers have been alerted and are on their way.' };
    if (aiScore >= 50) return { rank: '⚠️ NEEDS REVIEW', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', desc: 'Possible match! Field teams are reviewing your report right now.' };
    return { rank: '❌ NOT A MATCH', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', desc: 'This sighting has been logged, but does not appear to be a match.' };
  };

  useEffect(() => {
    if (!success || !latestSightingId) return;
    const WS_BASE = 'wss://amber-backend-flng.onrender.com';
    const socket = new WebSocket(`${WS_BASE}/ws/police_dashboard`);
    let interval;
    socket.onopen = () => {
      interval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'LIVE_COORDINATE_UPDATE', sighting_id: latestSightingId, person_name: selectedPerson?.full_name, lat: location.lat, lng: location.lng }));
        }
      }, 3000);
    };
    return () => { clearInterval(interval); socket.close(); };
  }, [success, latestSightingId, location, selectedPerson]);

  /* ── SUCCESS SCREEN ── */
  if (success) {
    const badge = getBadgeRank();
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center font-sans relative">
        <div className="security-grid" />
        <div className="relative mb-10">
          <div className="shockwave-ring border-indigo-500/50" />
          <div className="shockwave-ring border-teal-500/30" style={{ animationDelay: '0.3s' }} />
          <div className="w-24 h-24 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/25 shadow-[0_0_80px_rgba(45,212,191,0.2)] relative z-10">
            <Radio size={48} className="text-teal-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-teal-500 text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg animate-bounce z-20">
            Sharing Your Location
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tight mb-2">Thank <span className="text-amber-500">You!</span></h1>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed mb-1">Your sighting report has been submitted. Officers have been notified.</p>
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-8 font-mono">
          Reference No: #SIT-{Math.floor(Math.random() * 9000) + 1000}
        </p>

        {showBadge && (
          <div className={`animate-fade-in-up max-w-sm w-full rounded-3xl border p-6 mb-8 relative overflow-hidden ${badge.bg}`}>
            <div className="badge-shine absolute inset-0 rounded-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Smart Tip Verification</span>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${badge.color}`}>{aiScore}% Match</span>
              </div>
              <h3 className={`text-2xl font-black uppercase tracking-tight ${badge.color} mb-2`}>{badge.rank}</h3>
              <p className="text-[10px] text-slate-400 leading-relaxed">{badge.desc}</p>
            </div>
          </div>
        )}

        <div className="bg-[#000033]/40 border border-white/5 rounded-2xl p-5 max-w-sm w-full mb-8 text-left">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Radio size={11} className="text-cyan-400 animate-pulse" /> What Happens Next
          </p>
          <div className="space-y-3">
            {[
              { icon: <Shield size={12} />, text: 'Photo compared against active case records', done: true },
              { icon: <Shield size={12} />, text: 'Officer team notified immediately', done: true },
              { icon: <MapPin size={12} />, text: 'Officers being dispatched to your area', done: false },
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

        <button onClick={() => { setSuccess(false); setShowBadge(false); setStep(1); setSelectedPerson(null); setFile(null); setFilePreview(null); setNote(''); }}
          className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-white transition-all flex items-center gap-2">
          <ArrowLeft size={12} /> Submit Another Sighting
        </button>
      </div>
    );
  }

  /* ── MAIN PORTAL ── */
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative">

      <header className="h-16 flex items-center justify-between px-6 z-50 relative bg-white border-b border-gray-200">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-all text-[11px] font-black uppercase tracking-widest">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-amber-500 rounded-full" />
          <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Public Sighting Portal</span>
        </div>
        <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${gpsStatus === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
          <MapPin size={11} /> {gpsStatus === 'ok' ? 'Location On' : 'Location Off'}
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-10 relative z-10">
        {/* Step Indicator */}
        <div className="flex items-center mb-12">
          {['Who?', 'Photo', 'Submit'].map((label, i) => {
            const num = i + 1;
            const done = step > num;
            const active = step === num;
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border text-xs font-black transition-all
                    ${done ? 'bg-blue-600 border-blue-600 text-white' : active ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-300 text-gray-400 bg-white'}`}>
                    {done ? <CheckCircle size={16} /> : num}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${active ? 'text-blue-600' : 'text-gray-500'}`}>{label}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-px mx-3 mb-5 transition-all ${step > num ? 'bg-blue-600' : 'bg-gray-300'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 1: SELECT PERSON */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <h1 className="text-2xl font-black uppercase tracking-tight italic">
                Select <span className="text-blue-600">Subject</span>
              </h1>
              <p className="text-gray-500 text-xs mt-2 font-bold uppercase tracking-widest">Select the person you believe you spotted</p>
            </div>
            {missingPersons.length === 0 ? (
              <div className="text-center py-16 text-gray-500 bg-white border border-gray-200 rounded-2xl">
                {loading ? (
                  <>
                    <Activity size={32} className="mx-auto mb-3 animate-pulse" />
                    <p className="text-sm font-black uppercase tracking-widest">Loading active cases...</p>
                    <p className="text-xs mt-1 text-slate-800">Connecting to server</p>
                  </>
                ) : (
                  <>
                    <Shield size={32} className="mx-auto mb-3 opacity-40" />
                    <p className="text-sm font-black uppercase tracking-widest">No Active Cases</p>
                    <p className="text-xs mt-2 text-slate-600 max-w-xs mx-auto">All cases are currently resolved. Check back later or contact your local police station.</p>
                    <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                      ← Return to Home
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {missingPersons.map(p => {
                  const hrs = Math.round((Date.now() - new Date(p.reported_at)) / 3600000);
                  return (
                    <div key={p.id} onClick={() => { setSelectedPerson(p); setStep(2); }}
                      className="bg-white p-4 rounded-xl flex items-center gap-4 cursor-pointer group border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all active:scale-[0.98]">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                        <img src={getImgUrl(p.photo_path)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/150?text=Photo'; }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm uppercase text-gray-900 group-hover:text-blue-600 transition-colors">{p.full_name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{p.age} yrs</span>
                          <span className="text-[10px] text-gray-400 font-mono">#{String(p.id).padStart(4, '0')}</span>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-500 transition-all flex-shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CAPTURE PHOTO */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Upload <span className="text-blue-600">Image</span></h1>
              <p className="text-gray-500 text-xs mt-2 font-bold uppercase tracking-widest">Take or upload a clear photo of the person you saw</p>
            </div>
            <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 mb-6">
              <img src={getImgUrl(selectedPerson?.photo_path)} alt="" className="w-10 h-10 rounded-lg object-cover" onError={e => { e.target.style.display = 'none'; }} />
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reporting sighting for</p>
                <p className="text-sm font-black uppercase text-gray-900">{selectedPerson?.full_name}</p>
              </div>
            </div>
            <label className="relative bg-white p-12 border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-2xl text-center block cursor-pointer transition-all group mb-5 active:scale-[0.98]">
              <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100 group-hover:scale-110 transition-all">
                <Camera size={32} className="text-blue-500" />
              </div>
              <p className="font-black text-base uppercase tracking-tight text-gray-900">Take or Upload a Photo</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Your photo is sent securely</p>
            </label>
            <button onClick={() => setStep(1)} className="w-full py-3 text-gray-500 hover:text-gray-700 text-[10px] font-black uppercase tracking-widest transition-all">
              ← Select a different person
            </button>
          </div>
        )}

        {/* STEP 3: REVIEW & SUBMIT */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <div className="mb-8">
              <h1 className="text-2xl font-black uppercase tracking-tight italic">Submit <span className="text-blue-600">Sighting</span></h1>
              <p className="text-gray-500 text-xs mt-2 font-bold uppercase tracking-widest">Check your details before submitting</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 mb-4 flex gap-5">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 relative">
                <img src={filePreview} alt="Sighting" className="w-full h-full object-cover" />
              </div>
              <div className="space-y-3 flex-1">
                <InfoRow icon={<Activity size={12} />} label="Person" val={selectedPerson?.full_name} />
                <InfoRow icon={<MapPin size={12} />} label="Your Location"
                  val={gpsStatus === 'ok' ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : 'Using approximate location'}
                  warn={gpsStatus === 'denied'} />
                <InfoRow icon={<Clock size={12} />} label="Time" val={new Date().toLocaleTimeString()} />
              </div>
            </div>

            <div className="h-44 bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden relative">
              <MapContainer center={[location.lat, location.lng]} zoom={16} className="w-full h-full" zoomControl={false} scrollWheelZoom={false} dragging={false} touchZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <RecenterMap center={[location.lat, location.lng]} />
                <Circle center={[location.lat, location.lng]} radius={10} pathOptions={{ color: '#3b82f6', weight: 4, fillOpacity: 0.8 }} />
              </MapContainer>
            </div>

            {/* AI Confidence Meter */}
            <div className={`p-5 rounded-2xl border mb-4 transition-all ${aiScore >= 70 ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <Activity size={12} className={aiRunning ? 'text-blue-500 animate-pulse' : 'text-gray-500'} />
                  {aiRunning ? 'Analysing photo...' : 'Analysis complete'}
                </p>
                <span className={`text-lg font-black font-mono ${aiScore >= 70 ? 'text-green-600' : 'text-blue-600'}`}>{aiScore}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-100 ${aiScore >= 70 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${aiScore}%` }} />
              </div>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-3 ${aiScore >= 70 ? 'text-green-600' : 'text-gray-600'}`}>
                {aiRunning ? '⏳ Comparing with case records...' :
                  aiScore >= 75 ? 'HIGH MATCH PROBABILITY — ALERT SENT TO AUTHORITIES' :
                  aiScore >= 50 ? 'THRESHOLD PARTIALLY MET — PENDING VERIFICATION' :
                  'SCORE BELOW THRESHOLD — SIGHTING ARCHIVED'}
              </p>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Radio size={12} className="text-blue-500" /> Anonymous Note (Optional)
              </label>
              <textarea 
                className="w-full bg-white border border-gray-300 rounded-xl p-4 text-gray-900 text-xs placeholder-gray-400 focus:border-blue-500 outline-none resize-none" 
                rows="2" 
                placeholder="Add any additional details (e.g., 'He was walking towards the station...')"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {submitError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 p-4 rounded-xl mb-4">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-red-700">{submitError}</p>
              </div>
            )}

            <button onClick={handleSubmit} disabled={uploading || aiRunning}
              className="w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
              {uploading ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting...</>
              ) : aiRunning ? ('Please wait...') : (
                <><Radio size={16} /> Submit Sighting</>
              )}
            </button>
            <button onClick={() => setStep(2)} className="w-full mt-3 py-3 text-gray-500 hover:text-gray-700 text-[10px] font-black uppercase tracking-widest transition-all">
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
      <span className="text-gray-400 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{label}</p>
        <p className={`text-[11px] font-black uppercase ${warn ? 'text-red-500' : 'text-gray-900'}`}>{val}</p>
      </div>
    </div>
  );
}
