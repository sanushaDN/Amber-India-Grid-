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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col relative overflow-x-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none -z-10" />
      <div className="absolute top-40 -right-20 w-96 h-96 bg-blue-400/5 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-40 -left-20 w-80 h-80 bg-teal-400/5 rounded-full blur-[100px] -z-10" />

      {/* Nav */}
      <nav className="w-full flex justify-between items-center px-8 py-6 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">AMBER-<span className="text-blue-600">India</span></h1>
            <p className="text-[9px] font-black tracking-[0.2em] text-gray-400 uppercase">National Missing Persons Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-5 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 transition-all font-black text-[10px] uppercase tracking-widest text-gray-600">
            <Lock size={14} className="opacity-50" />
            Officer Login
          </button>
        </div>
      </nav>

      <main className="flex-grow flex flex-col items-center text-center px-4 z-10 pt-20 pb-12">
        {/* Hero */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-8 animate-slide-up shadow-sm">
          <Activity size={14} className="animate-pulse" />
          Real-time Grid • Available 24/7
        </div>
        
        <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 max-w-5xl animate-slide-up leading-[0.9] text-gray-900">
          Reuniting Families Through <br />
          <span className="text-gradient-blue italic">Intelligence.</span>
        </h2>
        
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mb-12 font-medium leading-relaxed animate-slide-up" style={{ animationDelay: '100ms' }}>
          India's most advanced missing person identification grid. Powered by AI biometrics and crowdsourced intelligence to secure every citizen.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <button onClick={() => navigate('/report')}
            className="group px-10 py-5 bg-gradient-premium text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-4 transition-all hover:scale-105 shadow-xl shadow-blue-200">
            <ScanFace size={20} />
            Report a Sighting
            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button onClick={() => document.getElementById('records-section').scrollIntoView({ behavior: 'smooth' })}
            className="px-10 py-5 bg-white border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-[0.2em] rounded-2xl transition-all hover:bg-gray-50">
            Browse Records
          </button>
        </div>

        {/* ── MISSING PERSONS GALLERY ── */}
        <div id="records-section" className="w-full max-w-6xl mt-32 text-left animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-end justify-between mb-10">
            <div>
              <h3 className="text-3xl font-black tracking-tight text-gray-900">Active Search Records</h3>
              <p className="text-gray-500 text-[11px] font-black uppercase tracking-widest mt-2">Public awareness is the first line of defence</p>
            </div>
            {missingPersons.length > 0 && (
              <div className="flex items-center gap-3 bg-red-50 px-5 h-10 rounded-full border border-red-100">
                 <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                  {missingPersons.length} CRITICAL CASES
                </span>
              </div>
            )}
          </div>

          {loadingPersons ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="rounded-2xl bg-gray-200 border border-gray-300 h-72 animate-pulse" />)}
            </div>
          ) : missingPersons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500 border border-gray-200 rounded-2xl bg-white">
              <Heart size={40} className="mb-4 opacity-30" />
              <p className="font-bold text-sm">No active missing person cases at this time.</p>
              <p className="text-sm mt-1 text-gray-500">Check back later, or contact your local police station.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {missingPersons.map(person => {
                const hrs = (Date.now() - new Date(person.reported_at)) / 3600000;
                return (
                  <div key={person.id} className="group rounded-2xl bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden flex flex-col">
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      <img src={getImgUrl(person.photo_path)} alt={person.full_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x200?text=Photo+Unavailable'; }} />
                      {hrs > 24 && (
                        <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">URGENT</div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900/80 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <p className="text-white font-bold text-sm truncate">{person.full_name}</p>
                        <p className="text-gray-200 text-xs">{person.age} years old</p>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Clock size={11} />
                        <span>Missing {getDaysMissing(person.reported_at)}</span>
                      </div>
                      {person.description && (
                        <p className="text-gray-600 text-[11px] leading-relaxed line-clamp-2">{person.description}</p>
                      )}
                      <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                        <button onClick={() => navigate(`/report?personId=${person.id}`)}
                          className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold rounded-lg transition-all text-[11px]">
                          Report Sighting
                        </button>
                        <a href={getWhatsAppUrl(person)} target="_blank" rel="noopener noreferrer"
                          className="p-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-600 rounded-lg transition-all flex items-center justify-center" title="Share on WhatsApp">
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
          <div className="glass-panel p-6 rounded-2xl border border-gray-200">
            <div className="flex items-center gap-3 mb-5">
              <Phone size={18} className="text-red-500" />
              <h3 className="font-bold text-gray-900 text-lg">Emergency Helplines</h3>
              <span className="ml-auto text-xs text-gray-500">Free to call • Available 24/7</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { number: '1098', label: 'Childline', desc: 'Missing children', color: 'text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100' },
                { number: '100', label: 'Police Emergency', desc: 'Nearest station', color: 'text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100' },
                { number: '1094', label: 'Women Helpline', desc: 'Missing women', color: 'text-pink-700 border-pink-200 bg-pink-50 hover:bg-pink-100' },
                { number: '112', label: 'National Emergency', desc: 'All emergencies', color: 'text-rose-700 border-rose-200 bg-rose-50 hover:bg-rose-100' },
              ].map(h => (
                <a key={h.number} href={`tel:${h.number}`}
                  className={`flex flex-col items-center p-4 rounded-xl border text-center transition-all hover:scale-105 cursor-pointer ${h.color}`}>
                  <span className="text-2xl font-black">{h.number}</span>
                  <span className="text-xs font-bold mt-1">{h.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{h.desc}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── NOTIFICATION ENROLMENT ── */}
        <div className="mt-16 w-full max-w-4xl animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <div className="bg-white rounded-2xl p-1 border border-gray-200 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 py-10">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <Bell size={20} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">Background Alert Notifications</span>
                </div>
                <h3 className="text-3xl font-bold mb-4">Enable Neighbourhood Alerts.</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Get instant push alerts when a missing person is reported near you — even when your browser is closed. Stay informed. Help bring someone home.
                </p>
                <div className="flex items-center gap-4">
                  <button onClick={toggleSubscription}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all ${subscribed ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300 active:scale-95'}`}>
                    {subscribed ? <ShieldCheck size={20} /> : <Bell size={20} />}
                    {subscribed ? 'Alerts Enabled ✓' : 'Enable Alerts'}
                  </button>
                  {!subscribed && <span className="text-[10px] text-gray-500 font-bold">Click above to allow notifications</span>}
                </div>
              </div>
              <div className="w-full md:w-[320px] h-[160px] rounded-2xl bg-gray-50 border border-gray-200 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center group cursor-pointer" onClick={triggerDemo}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                    <Activity size={18} className="text-blue-600" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">Preview a Sample Alert</p>
                  <p className="text-[10px] text-gray-500 italic">Click to see what the notification looks like</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mt-24 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex flex-col items-center p-10 rounded-[32px] bg-white border border-gray-100 hover-lift shadow-premium group">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform">
              <Fingerprint size={28} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-black tracking-tight mb-4 text-gray-900">AI Biometrics</h3>
            <p className="text-gray-500 text-[13px] font-medium leading-relaxed text-center">Proprietary facial landmark algorithms compare sightings against records in milliseconds.</p>
          </div>
          <div className="flex flex-col items-center p-10 rounded-[32px] bg-white border border-gray-100 hover-lift shadow-premium group">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-8 group-hover:-rotate-6 transition-transform">
              <Globe size={28} className="text-teal-600" />
            </div>
            <h3 className="text-xl font-black tracking-tight mb-4 text-gray-900">National Grid</h3>
            <p className="text-gray-500 text-[13px] font-medium leading-relaxed text-center">A unified recovery network connecting citizens and law enforcement across all Indian states.</p>
          </div>
          <div className="flex flex-col items-center p-10 rounded-[32px] bg-white border border-gray-100 hover-lift shadow-premium group">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-8 group-hover:rotate-6 transition-transform">
              <Search size={28} className="text-indigo-600" />
            </div>
            <h3 className="text-xl font-black tracking-tight mb-4 text-gray-900">Secure Privacy</h3>
            <p className="text-gray-500 text-[13px] font-medium leading-relaxed text-center">Citizen reports are encrypted and accessible only by authorised officers via JWT-secured portals.</p>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-6 border-t border-gray-200 mt-12 bg-gray-50 z-10">
        <p className="text-gray-500 text-sm font-mono tracking-wider">© 2026 AMBER-India • National Missing Persons Portal • Ministry of Home Affairs</p>
        <p className="text-gray-600 text-xs mt-1">In an emergency, call <span className="text-red-600 font-bold">112</span> or Childline <span className="text-blue-600 font-bold">1098</span></p>
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
