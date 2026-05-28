import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Fingerprint, Globe, ChevronRight, Search, Activity,
  ScanFace, Lock, Bell, X, ShieldCheck, Phone, Clock, Share2, Heart
} from 'lucide-react';

const API_BASE = 'https://amber-backend-flng.onrender.com';

const getImgUrl = (path) => {
  if (!path) return 'https://via.placeholder.com/300x200?text=No+Photo';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  const cleanPath = path.replace(/^\/+/, '').replace('uploads/uploads/', 'uploads/');
  return `${API_BASE}/${cleanPath}`;
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [showMock, setShowMock] = useState(false);
  const [subscribed, setSubscribed] = useState(() => localStorage.getItem('amber_subscribed') === 'true');
  const [missingPersons, setMissingPersons] = useState([]);
  const [loadingPersons, setLoadingPersons] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/missing_persons/`)
      .then(r => r.json())
      .then(data => { setMissingPersons(data.filter(p => p.status === 'ACTIVE')); setLoadingPersons(false); })
      .catch(() => setLoadingPersons(false));
  }, []);

  const toggleSubscription = async () => {
    if (subscribed) { setSubscribed(false); localStorage.setItem('amber_subscribed', 'false'); return; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setSubscribed(true);
      localStorage.setItem('amber_subscribed', 'true');
      new Notification('AMBER-India Alerts Enabled', {
        body: 'You will now receive alerts when a missing person is reported near you.',
        icon: '/favicon.ico', tag: 'amber-enroll'
      });
      triggerDemo();
    } else {
      alert('Please allow notifications in your browser settings to receive AMBER alerts.');
    }
  };

  useEffect(() => {
    // Real-time notification grid listener
    const WS_BASE = 'wss://amber-backend-flng.onrender.com';
    const socket = new WebSocket(`${WS_BASE}/ws/police_dashboard`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'EMERGENCY_BROADCAST') {
        if (Notification.permission === 'granted') {
          new Notification('🚨 AMBER-India: EMERGENCY ALERT', {
            body: data.message,
            icon: '/favicon.ico',
            tag: 'emergency-broadcast',
            requireInteraction: true
          });
        }
        // Also show in-app alert if subscribed or just browsing
        alert(`🚨 EMERGENCY BROADCAST: ${data.message}`);
      } else if (data.type === 'CRITICAL_MATCH' && subscribed) {
        new Notification('⚠️ Potential Match Sighted', {
          body: `A potential match for ${data.person_name} has been reported nearby. Stay vigilant.`,
          icon: '/favicon.ico'
        });
      } else if (data.type === 'NEW_CASE') {
        // Direct browser push alert when new case is registered
        if (Notification.permission === 'granted') {
          new Notification('🚨 AMBER-India: NEW MISSING PERSON', {
            body: `ALERT: ${data.full_name}, Age ${data.age} was reported missing. Tap for details.`,
            icon: '/favicon.ico',
            tag: `new-case-${data.id}`,
            requireInteraction: true
          });
        }
        // Native alert in browser
        alert(`🚨 NEIGHBOURHOOD AMBER ALERT:\nNew missing person registered: ${data.full_name}, Age ${data.age}.\nStay vigilant!`);
        // Refresh missing persons list
        fetch(`${API_BASE}/missing_persons/`)
          .then(r => r.json())
          .then(persons => { setMissingPersons(persons.filter(p => p.status === 'ACTIVE')); });
      }
    };

    return () => socket.close();
  }, [subscribed]);

  const triggerDemo = () => {
    setShowMock(true);
    setTimeout(() => { const a = new Audio('https://www.soundjay.com/buttons/beep-07a.mp3'); a.play().catch(() => {}); }, 500);
  };

  const getDaysMissing = (reportedAt) => {
    const hrs = Math.round((Date.now() - new Date(reportedAt)) / 3600000);
    if (hrs < 1) return 'Less than an hour ago';
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    const days = Math.round(hrs / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const getWhatsAppUrl = (person) => {
    const text = `🚨 MISSING PERSON ALERT 🚨\n\nName: ${person.full_name}\nAge: ${person.age} years\nMissing: ${getDaysMissing(person.reported_at)}\n\n${person.description || ''}\n\nIf you have seen this person, please report at:\nhttps://amber-india.netlify.app/report\n\n📞 Call 1098 (Childline) or 100 (Police Emergency)\n\nPlease report any information immediately.`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col relative overflow-x-hidden grid-bg">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-950/20 to-transparent pointer-events-none -z-10" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-40 -left-20 w-80 h-80 bg-teal-500/10 rounded-full blur-[120px] -z-10 animate-pulse" style={{ animationDuration: '8s' }} />

      {/* Nav */}
      <nav className="w-full flex justify-between items-center px-8 py-6 z-50 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <ShieldAlert size={24} className="text-white-force" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white">AMBER-<span className="text-blue-500">India</span></h1>
            <p className="text-[9px] font-normal tracking-[0.2em] text-slate-500 uppercase">National Missing Persons Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-5 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all font-medium text-[10px] uppercase tracking-widest text-slate-300">
            <Lock size={14} className="opacity-50" />
            Officer Login
          </button>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center text-center px-4 z-10 pt-20 pb-12">
        {/* Hero */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-[10px] font-medium uppercase tracking-widest mb-8 animate-slide-up shadow-lg">
          <Activity size={14} className="animate-pulse" />
          Real-time Grid • Available 24/7
        </div>
        
        <h2 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 max-w-5xl animate-slide-up leading-tight text-white">
          AMBER-India: <span className="text-gradient-blue font-black">Sovereign Recovery Grid</span>
        </h2>

        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 font-normal leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>

          India's most advanced missing person identification grid. Powered by AI biometrics and crowdsourced intelligence to secure every citizen.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <button onClick={() => navigate('/report')}
            className="group px-10 py-5 bg-gradient-premium text-white font-medium text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-4 transition-all hover:scale-105 shadow-xl shadow-blue-500/20">
            <ScanFace size={20} />
            Report a Sighting
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button onClick={() => document.getElementById('records-section').scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-5 bg-slate-900 border border-slate-800 text-slate-300 font-medium text-xs uppercase tracking-[0.2em] rounded-2xl transition-all hover:bg-slate-800">
            Browse Records
          </button>
        </div>

        {/* ── MISSING PERSONS GALLERY ── */}
        <div id="records-section" className="w-full max-w-6xl mt-32 text-left animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-end justify-between mb-10">
            <div>
              <h3 className="text-3xl font-semibold tracking-tight text-white">Active Search Records</h3>
              <p className="text-slate-500 text-[11px] font-normal uppercase tracking-widest mt-2">Public awareness is the first line of defence</p>
            </div>
            {missingPersons.length > 0 && (
              <div className="flex items-center gap-3 bg-rose-500/10 px-5 h-10 rounded-full border border-rose-500/30">
                 <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-medium text-rose-400 uppercase tracking-widest">
                  {missingPersons.length} CRITICAL CASES
                </span>
              </div>
            )}
          </div>

          {loadingPersons ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="rounded-2xl bg-slate-900 border border-slate-800 h-72 animate-pulse" />)}
            </div>
          ) : missingPersons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-slate-800 rounded-2xl bg-slate-900/50">
              <Heart size={40} className="mb-4 opacity-30 text-rose-500" />
              <p className="font-medium text-sm text-white">No active missing person cases at this time.</p>
              <p className="text-sm mt-1 text-slate-500">Check back later, or contact your local police station.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {missingPersons.map(person => {
                const hrs = (Date.now() - new Date(person.reported_at)) / 3600000;
                return (
                  <div key={person.id} className="group rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5 transition-all overflow-hidden flex flex-col">
                    <div className="relative h-48 overflow-hidden bg-slate-950">
                      <img src={getImgUrl(person.photo_path)} alt={person.full_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x200?text=Photo+Unavailable'; }} />
                      {hrs > 24 && (
                        <div className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider">URGENT</div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <p className="text-white font-medium text-sm truncate">{person.full_name}</p>
                        <p className="text-slate-300 text-xs">{person.age} years old</p>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                        <Clock size={11} className="text-blue-400" />
                        <span>Missing {getDaysMissing(person.reported_at)}</span>
                      </div>
                      {person.description && (
                        <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{person.description}</p>
                      )}
                      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-800/60">
                        <button onClick={() => navigate(`/report?personId=${person.id}`)}
                          className="flex-1 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 font-medium rounded-lg transition-all text-[11px] uppercase tracking-wider">
                          Report Sighting
                        </button>
                        <a href={getWhatsAppUrl(person)} target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg transition-all flex items-center justify-center" title="Share on WhatsApp">
                          <Share2 size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── HELPLINES ── */}
        <div className="w-full max-w-4xl mt-16 animate-fade-in-up" style={{ animationDelay: '550ms' }}>
          <div className="bg-slate-900/40 p-6 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3 mb-5">
              <Phone size={18} className="text-rose-500" />
              <h3 className="font-semibold text-white text-lg">Emergency Helplines</h3>
              <span className="ml-auto text-xs text-slate-500">Free to call • Available 24/7</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { number: '1098', label: 'Childline', desc: 'Missing children', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10' },
                { number: '100', label: 'Police Emergency', desc: 'Nearest station', color: 'text-blue-400 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10' },
                { number: '1094', label: 'Women Helpline', desc: 'Missing women', color: 'text-pink-400 border-pink-500/30 bg-pink-500/5 hover:bg-pink-500/10' },
                { number: '112', label: 'National Emergency', desc: 'All emergencies', color: 'text-rose-400 border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10' },
              ].map(h => (
                <a key={h.number} href={`tel:${h.number}`}
                  className={`flex flex-col items-center p-4 rounded-xl border text-center transition-all hover:scale-105 cursor-pointer ${h.color}`}>
                  <span className="text-2xl font-semibold">{h.number}</span>
                  <span className="text-xs font-medium mt-1">{h.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{h.desc}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── NOTIFICATION ENROLMENT ── */}
        <div className="mt-16 w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <div className="bg-slate-900/50 rounded-2xl p-1 border border-slate-800 shadow-lg">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 py-10">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-4 text-blue-400">
                  <Bell size={20} className="animate-pulse" />
                  <span className="text-[10px] font-medium uppercase tracking-[0.3em] font-mono">Background Alert Notifications</span>
                </div>
                <h3 className="text-3xl font-semibold mb-4 text-white">Enable Neighbourhood Alerts.</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Get instant push alerts when a missing person is reported near you — even when your browser is closed. Stay informed. Help bring someone home.
                </p>
                <div className="flex items-center gap-4">
                  <button onClick={toggleSubscription}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-medium transition-all ${subscribed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 active:scale-95'}`}>
                    {subscribed ? <ShieldCheck size={20} /> : <Bell size={20} />}
                    {subscribed ? 'Alerts Enabled ✓' : 'Enable Alerts'}
                  </button>
                  {!subscribed && <span className="text-[10px] text-slate-500 font-normal">Click above to allow notifications</span>}
                </div>
              </div>
              <div className="w-full md:w-[320px] h-[160px] rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center group cursor-pointer" onClick={triggerDemo}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Activity size={18} className="text-blue-400 animate-pulse" />
                  </div>
                  <p className="text-xs font-medium text-slate-200">Preview a Sample Alert</p>
                  <p className="text-[10px] text-slate-400 italic">Click to see what the notification looks like</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mt-24 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex flex-col items-center p-10 rounded-[32px] bg-slate-900/40 border border-slate-800 hover-lift shadow-2xl group">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform">
              <Fingerprint size={28} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-4 text-white">AI Biometrics</h3>
            <p className="text-slate-400 text-[13px] font-normal leading-relaxed text-center">Proprietary facial landmark algorithms compare sightings against records in milliseconds.</p>
          </div>
          <div className="flex flex-col items-center p-10 rounded-[32px] bg-slate-900/40 border border-slate-800 hover-lift shadow-2xl group">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-8 group-hover:-rotate-6 transition-transform">
              <Globe size={28} className="text-teal-400" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-4 text-white">National Grid</h3>
            <p className="text-slate-400 text-[13px] font-normal leading-relaxed text-center">A unified recovery network connecting citizens and law enforcement across all Indian states.</p>
          </div>
          <div className="flex flex-col items-center p-10 rounded-[32px] bg-slate-900/40 border border-slate-800 hover-lift shadow-2xl group">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform">
              <Search size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-4 text-white">Secure Privacy</h3>
            <p className="text-slate-400 text-[13px] font-normal leading-relaxed text-center">Citizen reports are encrypted and accessible only by authorised officers via JWT-secured portals.</p>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-6 border-t border-slate-900 mt-12 bg-slate-950/60 z-10">
        <p className="text-slate-400 text-sm font-mono tracking-wider">© 2026 AMBER-India • National Missing Persons Portal • Ministry of Home Affairs</p>
        <p className="text-slate-500 text-xs mt-1">In an emergency, call <span className="text-red-400 font-bold">112</span> or Childline <span className="text-blue-400 font-bold">1098</span></p>
      </footer>

      {/* Lock Screen Demo Overlay */}
      {showMock && (
        <div className="mock-lock-screen" onClick={() => setShowMock(false)}>
          <div className="lock-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div className="lock-date">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          <div className="mock-notification" onClick={(e) => e.stopPropagation()}>
            <div className="notification-header">
              <div className="notification-icon"><ShieldAlert size={12} /></div>
              <span className="notification-title">AMBER-India • Alert</span>
              <span className="notification-time">just now</span>
            </div>
            <div className="notification-body">
              <h4 className="notification-body-title">⚠️ Missing Person in Your Area</h4>
              <p className="notification-body-text">A new missing person has been reported nearby. If you have seen anything, please tap to report.</p>
            </div>
          </div>
          <div className="absolute bottom-12 flex flex-col items-center gap-2 text-white/40 animate-bounce">
            <ChevronRight size={24} className="-rotate-90" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tap anywhere to dismiss</span>
          </div>
          <button onClick={() => setShowMock(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white/60">
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
