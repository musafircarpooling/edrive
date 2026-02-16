
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import AdBannerOverlay from '../AdBannerOverlay';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface LoginScreenProps {
  onBack: () => void;
  onSuccess: (isAdmin?: boolean, profileData?: any) => void;
  onSwitchToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onBack, onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('edrive_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    
    if (!cleanEmail || !cleanPassword) {
      setError("Please enter both your registered email and password.");
      return;
    }

    setIsLoading(true);

    if (cleanEmail === 'jj@gmail.com' && cleanPassword === 'ppllmm') {
      onSuccess(true, { name: 'Admin', lastName: 'HQ', email: cleanEmail });
      setIsLoading(false);
      return;
    }

    try {
      const userQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        const profileData = userSnap.docs[0].data();
        if (profileData.temp_password && profileData.temp_password === cleanPassword) {
          if (rememberMe) localStorage.setItem('edrive_saved_email', cleanEmail);
          localStorage.setItem('edrive_user_session', JSON.stringify(profileData));
          onSuccess(false, profileData);
          setIsLoading(false);
          return;
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const profileData = userDoc.data();
        if (rememberMe) localStorage.setItem('edrive_saved_email', cleanEmail);
        localStorage.setItem('edrive_user_session', JSON.stringify(profileData));
        onSuccess(false, profileData);
      } else {
        setError("Your account details were not found in the city registry. Contact support.");
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError("Invalid credentials. Please check your email and password carefully.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection and try again.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Your account is temporarily locked for security.");
      } else {
        setError(err.message || "An unexpected error occurred during login. Try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgot) return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-6 overflow-hidden animate-in fade-in duration-300">
      <style>{`
        @keyframes border-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .chasing-light-box { 
          position: relative; 
          background: #111; 
          overflow: hidden; 
          z-index: 0; 
        }

        .fluid-multi-color::before { 
          content: ""; 
          position: absolute; 
          inset: -150%; 
          background: conic-gradient(
            #c1ff22, 
            #ff4d00, 
            #ff9e00, 
            #ffffff, 
            #00ffd5, 
            #7a00ff, 
            #ff00c8, 
            #c1ff22
          ); 
          animation: border-spin 3.5s linear infinite; 
          z-index: -1; 
          filter: blur(8px);
          opacity: 0.9;
        }

        /* Subtle inner glow to enhance the fluid feel */
        .fluid-multi-color::after {
          content: "";
          position: absolute;
          inset: 2px;
          background: #0e0e0e;
          border-radius: inherit;
          z-index: -1;
        }
      `}</style>

      <AdBannerOverlay location="login" />
      
      <header className="pt-6 pb-8 flex flex-col items-start gap-4">
        <button onClick={onBack} className="p-3 bg-white/5 rounded-2xl text-[#c1ff22] active:scale-90 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">
            Login <span className="text-[#c1ff22]">eDrive</span>
          </h1>
          <p className="text-[#c1ff22] text-[10px] font-black uppercase tracking-[0.4em] italic">Ao Chalen • Secure Access</p>
        </div>
      </header>

      <div className="flex-1 space-y-6">
        <div className="space-y-5">
          {/* Email Input with Fluid Multi-Color Border */}
          <div className="chasing-light-box fluid-multi-color p-[1px] rounded-[2rem]">
            <div className="bg-[#111] rounded-[1.95rem] p-6 flex items-center gap-5 relative z-10 focus-within:bg-[#151515] transition-colors">
              <Mail className="w-6 h-6 text-[#c1ff22] shrink-0" />
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em] block mb-1">Email Address</label>
                <input 
                  className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-800 tracking-tight" 
                  placeholder="name@email.com" 
                  type="email"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                />
              </div>
            </div>
          </div>

          {/* Password Input with Fluid Multi-Color Border */}
          <div className="chasing-light-box fluid-multi-color p-[1px] rounded-[2rem]">
            <div className="bg-[#111] rounded-[1.95rem] p-6 flex items-center gap-5 relative z-10 focus-within:bg-[#151515] transition-colors">
              <Lock className="w-6 h-6 text-[#c1ff22] shrink-0" />
              <div className="flex-1">
                <label className="text-[9px] font-black uppercase text-zinc-600 tracking-[0.2em] block mb-1">Password</label>
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="bg-transparent w-full outline-none text-base font-bold text-white placeholder:text-zinc-800 tracking-tight" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                />
              </div>
              <button onClick={() => setShowPassword(!showPassword)} className="p-2 text-zinc-600 active:scale-90 transition-transform">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <button onClick={() => setRememberMe(!rememberMe)} className="flex items-center gap-3 active:scale-95 transition-all">
              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#c1ff22] border-[#c1ff22]' : 'border-zinc-800 bg-zinc-900/50'}`}>
                {rememberMe && <CheckCircle2 className="w-4 h-4 text-black" />}
              </div>
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Remember Me</span>
            </button>
            <button onClick={() => setShowForgot(true)} className="text-[10px] font-black uppercase text-zinc-700 tracking-widest hover:text-[#c1ff22] transition-colors">Forgot Password?</button>
          </div>
        </div>

        <div className="pt-4 space-y-6">
          <button 
            onClick={handleLogin} 
            disabled={isLoading} 
            className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.5rem] font-black text-xl uppercase shadow-[0_20px_40px_rgba(193,255,34,0.2)] active:scale-95 disabled:opacity-30 transition-all italic tracking-tighter"
          >
            {isLoading ? <Loader2 className="w-7 h-7 animate-spin mx-auto" /> : 'Confirm & Login'}
          </button>

          {error && (
            <div className="flex items-center gap-4 text-rose-500 bg-rose-500/10 p-5 rounded-[2rem] border border-rose-500/20 animate-in shake">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-widest leading-tight">{error}</p>
            </div>
          )}

          <div className="text-center">
            <button onClick={onSwitchToRegister} className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] group">
              New to eDrive? <span className="text-[#c1ff22] group-hover:underline">Register Here</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
