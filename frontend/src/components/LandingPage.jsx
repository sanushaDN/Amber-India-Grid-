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
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-['Outfit'] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#020617] to-[#020617] -z-10" />
      <div className="security-grid" />
      <div className="absolute top-20 left-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Nav */}
      <nav className="w-full flex justify-between items-center px-8 py-6 z-10 border-b border-indigo-500/20 bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShieldAlert size={32} className="text-amber-500" />
            <div className="absolute -inset-1 bg-amber-500/20 blur rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-slate-100">AMBER-<span className="text-teal-400">India</span></h1>
            <p className="text-[10px] tracking-widest text-slate-400 uppercase">National Missing Persons Portal</p>
          </div>
        </div>
        <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-5 py-2 rounded-lg border border-slate-700/50 bg-slate-800/50 hover:bg-slate-700/80 transition-all font-mono text-sm tracking-wider group">
          <Lock size={14} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
          Officer Login
        </button>
      </nav>

      <main className="flex-grow flex flex-col items-center text-center px-4 z-10 pt-16 pb-12">
        {/* Hero */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-mono tracking-wider mb-8 animate-fade-in-up">
          <Activity size={14} className="animate-pulse" />
          Available 24/7 • Helping Families
        </div>
        <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500 animate-fade-in-up leading-tight">
          National Missing Person<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-indigo-500">Identification System</span>
        </h2>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 font-light leading-relaxed animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          AMBER-India is India's centralised missing persons reporting system. If you've spotted someone, upload a photo — our system will instantly notify law enforcement with a facial match score.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <button onClick={() => navigate('/report')}
            className="group relative px-8 py-4 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold text-lg rounded-xl flex items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-[0_0_40px_-5px_rgba(45,212,191,0.5)] overflow-hidden">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <ScanFace className="relative z-10" />
            <span className="relative z-10">Report a Sighting</span>
            <ChevronRight className="relative z-10 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* ── MISSING PERSONS GALLERY ── */}
        <div className="w-full max-w-6xl mt-24 text-left animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-white">Active Missing Person Records</h3>
              <p className="text-slate-400 text-sm mt-1">These people are currently missing. Do you recognise anyone? Please report immediately.</p>
            </div>
            {missingPersons.length > 0 && (
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-full animate-pulse flex-shrink-0 ml-4">
                {missingPersons.length} Active Case{missingPersons.length > 1 ? 's' : ''}
              </span>
            )}
          </div>

          {loadingPersons ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="rounded-2xl bg-slate-800/40 border border-white/5 h-72 animate-pulse" />)}
            </div>
          ) : missingPersons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600 border border-white/5 rounded-2xl bg-white/[0.01]">
              <Heart size={40} className="mb-4 opacity-30" />
              <p className="font-bold text-sm">No active missing person cases at this time.</p>
              <p className="text-sm mt-1 text-slate-700">Check back later, or contact your local police station.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {missingPersons.map(person => {
                const hrs = (Date.now() - new Date(person.reported_at)) / 3600000;
                return (
                  <div key={person.id} className="group rounded-2xl bg-slate-900/60 border border-white/5 hover:border-teal-500/30 transition-all overflow-hidden flex flex-col">
                    <div className="relative h-48 overflow-hidden bg-slate-800">
                      <img src={getImgUrl(person.photo_path)} alt={person.full_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x200?text=Photo+Unavailable'; }} />
                      {hrs > 24 && (
                        <div className="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">URGENT</div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3">
                        <p className="text-white font-bold text-sm truncate">{person.full_name}</p>
                        <p className="text-slate-300 text-xs">{person.age} years old</p>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                        <Clock size={11} />
                        <span>Missing {getDaysMissing(person.reported_at)}</span>
                      </div>
                      {person.description && (
                        <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">{person.description}</p>
                      )}
                      <div className="flex gap-2 mt-auto pt-2">
                        <button onClick={() => navigate(`/report?personId=${person.id}`)}
                          className="flex-1 py-2 bg-teal-500/10 hover:bg-teal-500 border border-teal-500/30 text-teal-400 hover:text-teal-950 text-[11px] font-bold rounded-lg transition-all">
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
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 mb-5">
              <Phone size={18} className="text-rose-400" />
              <h3 className="font-bold text-white text-lg">Emergency Helplines</h3>
              <span className="ml-auto text-xs text-slate-500">Free to call • Available 24/7</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { number: '1098', label: 'Childline', desc: 'Missing children', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10' },
                { number: '100', label: 'Police Emergency', desc: 'Nearest station', color: 'text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10' },
                { number: '1094', label: 'Women Helpline', desc: 'Missing women', color: 'text-pink-400 border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10' },
                { number: '112', label: 'National Emergency', desc: 'All emergencies', color: 'text-rose-400 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10' },
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
          <div className="glass-panel p-1 border border-white/5 bg-white/[0.02]">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 py-10">
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2 mb-4 text-amber-500">
                  <Bell size={20} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] font-mono">Background Alert Notifications</span>
                </div>
                <h3 className="text-3xl font-bold mb-4">Enable Neighbourhood Alerts.</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  Get instant push alerts when a missing person is reported near you — even when your browser is closed. Stay informed. Help bring someone home.
                </p>
                <div className="flex items-center gap-4">
                  <button onClick={toggleSubscription}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-bold transition-all ${subscribed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 active:scale-95'}`}>
                    {subscribed ? <ShieldCheck size={20} /> : <Bell size={20} />}
                    {subscribed ? 'Alerts Enabled ✓' : 'Enable Alerts'}
                  </button>
                  {!subscribed && <span className="text-[10px] text-slate-600 font-bold">Click above to allow notifications</span>}
                </div>
              </div>
              <div className="w-full md:w-[320px] h-[160px] rounded-2xl bg-black/40 border border-white/5 relative overflow-hidden flex flex-col items-center justify-center p-6 text-center group cursor-pointer" onClick={triggerDemo}>
                <div className="scanline" />
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Activity size={18} className="text-amber-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">Preview a Sample Alert</p>
                  <p className="text-[10px] text-slate-600 italic">Click to see what the notification looks like</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mt-16 animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/50 hover:border-teal-500/30 transition-colors group">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Fingerprint size={28} className="text-teal-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Facial Recognition</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-center">Your photo is automatically compared against active missing person records to find a match.</p>
          </div>
          <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/50 hover:border-amber-500/30 transition-colors group">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Globe size={28} className="text-amber-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Live Mapping</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-center">Sightings are plotted on a live map and pushed directly to officer dashboards the moment you submit.</p>
          </div>
          <div className="flex flex-col items-center p-8 rounded-2xl bg-slate-900/40 border border-slate-700/50 hover:bg-slate-800/50 hover:border-indigo-500/30 transition-colors group">
            <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Search size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold mb-3">Safe & Confidential</h3>
            <p className="text-slate-400 text-sm leading-relaxed text-center">Your identity and location are kept private. Only authorised law enforcement officers can see your report.</p>
          </div>
        </div>
      </main>

      <footer className="w-full text-center py-6 border-t border-slate-800/50 mt-12 bg-slate-950/80 z-10">
        <p className="text-slate-500 text-sm font-mono tracking-wider">© 2026 AMBER-India • National Missing Persons Portal • Ministry of Home Affairs</p>
        <p className="text-slate-700 text-xs mt-1">In an emergency, call <span className="text-rose-500 font-bold">112</span> or Childline <span className="text-amber-500 font-bold">1098</span></p>
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
