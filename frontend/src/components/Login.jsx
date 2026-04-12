import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, User, ChevronRight, Activity, Globe, Radio } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [statusText, setStatusText] = useState('AWAITING CREDENTIALS');
  const navigate = useNavigate();

  // Typing effect for status messages during authentication
  useEffect(() => {
    if (!isAuthenticating) return;
    const messages = [
      'ESTABLISHING SECURE TUNNEL...',
      'VERIFYING BIOMETRIC HASH...',
      'AUTHENTICATING WITH SOVEREIGN GRID...',
      'ACCESS GRANTED — REDIRECTING...'
    ];
    let i = 0;
    const iv = setInterval(() => {
      if (i < messages.length) {
        setStatusText(messages[i]);
        i++;
      } else {
        clearInterval(iv);
      }
    }, 400);
    return () => clearInterval(iv);
  }, [isAuthenticating]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setError('');
    
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 sec timeout

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access_token);
        setTimeout(() => navigate('/dashboard'), 1800);
      } else {
        setError("Invalid credentials. Access denied.");
        setIsAuthenticating(false);
        setStatusText('AWAITING CREDENTIALS');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      setError(err.name === 'AbortError' ? "Server timed out. Backend is frozen." : "Security server connection failed.");
      setIsAuthenticating(false);
      setStatusText('AWAITING CREDENTIALS');
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="security-grid" />
      
      {/* Decorative Background Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-amber-500/10 rounded-full blur-[120px]"></div>
      
      <div className="w-full max-w-[460px] z-10 animate-fade-in-up">
        <div className="glass-panel p-12 py-14 rounded-[40px] border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="scanline" />
          
          <div className="text-center mb-12 relative z-10">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-amber-500/10 border border-amber-500/20 mb-8 group transition-all hover:scale-105 shadow-[0_0_60px_rgba(245,158,11,0.1)] relative">
              <div className="biometric-laser" style={{ animationDuration: '4s' }}/>
              <ShieldAlert size={48} className="text-amber-500 group-hover:rotate-12 transition-transform duration-500 relative z-10" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
              AMBER <span className="text-amber-500">GOV</span>
            </h1>
            <div className="flex items-center justify-center gap-2 mt-5">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_#f59e0b]"></div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.45em]">National Recovery Grid</p>
            </div>
          </div>

          {/* Security Status Ticker */}
          <div className="flex items-center justify-center gap-2 mb-8 relative z-10">
            <Radio size={10} className={`${isAuthenticating ? 'text-amber-400 animate-pulse' : 'text-slate-700'}`}/>
            <span className={`text-[8px] font-black uppercase tracking-[0.3em] font-mono transition-colors ${isAuthenticating ? 'text-amber-400' : 'text-slate-700'}`}>
              {statusText}
            </span>
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-[10px] mb-8 text-center font-black uppercase tracking-widest leading-relaxed relative z-10">
              <Activity size={14} className="inline mr-2 mb-0.5" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-5 top-5 text-slate-600 group-focus-within:text-amber-400 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="AUTHORIZATION ID"
                  required
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 pl-14 text-white placeholder-slate-700 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all text-xs font-black tracking-widest uppercase"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-5 top-5 text-slate-600 group-focus-within:text-amber-400 transition-colors" size={18} />
                <input 
                  type="password" 
                  placeholder="SECURITY PASSCODE"
                  required
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 pl-14 text-white placeholder-slate-700 focus:border-amber-500/50 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all text-xs font-black tracking-widest uppercase"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black py-5 rounded-2xl shadow-2xl flex items-center justify-center translate-y-2 group active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Authenticating</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <ShieldAlert size={18} />
                  <span className="text-[11px] font-black uppercase tracking-[0.3em]">Establish Secure Link</span>
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-14 flex justify-between items-center text-[9px] font-black text-slate-700 uppercase tracking-widest border-t border-white/5 pt-8 relative z-10">
            <span className="flex items-center gap-2"><Globe size={13} className="text-slate-800" /> Layer-7 Encryption</span>
            <span className="opacity-50 tracking-tighter font-mono">SENTINEL_V7.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
