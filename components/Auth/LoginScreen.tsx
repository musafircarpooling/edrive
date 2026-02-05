
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import AdBannerOverlay from '../AdBannerOverlay';
import ForgotPasswordScreen from './ForgotPasswordScreen';

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

  // Handle Remember Me - Load saved email
  useEffect(() => {
    const savedEmail = localStorage.getItem('edrive_saved_email');
    const savedPref = localStorage.getItem('edrive_remember_me') === 'true';
    if (savedEmail && savedPref) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return setError("Please enter your credentials.");
    }

    setIsLoading(true);

    // Admin Bypass - JJ Special Access
    if (trimmedEmail === 'jj@gmail.com' && password === 'ppllmm') {
      onSuccess(true, { name: 'Admin', lastName: 'HQ', email: trimmedEmail });
      return;
    }

    try {
      // 1. Fetch Profile from Hafizabad Registry (Source of Truth)
      const profileSnap = await getDoc(doc(db, 'profiles', trimmedEmail));
      
      if (!profileSnap.exists()) {
        setError("Account not found in Hafizabad registry. Please register.");
        setIsLoading(false);
        return;
      }

      const profile = profileSnap.data();
      
      if (profile.verification_status === 'disabled') {
        setError("This account has been restricted by City Admin.");
        setIsLoading(false);
        return;
      }

      // 2. Verify Password against Registry strictly
      const isRegistryPasswordValid = profile.password === password;
      
      if (isRegistryPasswordValid) {
        // Successful Registry Login
        localStorage.setItem('edrive_manual_session', trimmedEmail);
        
        // Attempt to sync with Firebase Auth in the background for session management
        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (authErr) {
          console.warn("Auth session sync optional, proceeding with Registry identity.");
        }

        // Save preferences
        if (rememberMe) {
          localStorage.setItem('edrive_saved_email', trimmedEmail);
          localStorage.setItem('edrive_remember_me', 'true');
        } else {
          localStorage.removeItem('edrive_saved_email');
          localStorage.setItem('edrive_remember_me', 'false');
        }

        // 3. Always fetch Driver Status to ensure correct Mode Routing
        const driverSnap = await getDoc(doc(db, 'drivers', trimmedEmail));
        const driver = driverSnap.data();

        onSuccess(false, {
          ...profile,
          name: profile.name || 'User',
          lastName: profile.last_name || '',
          email: profile.email,
          verificationStatus: profile.verification_status || 'pending',
          profilePic: profile.profile_pic || 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg',
          isDriver: !!driver,
          driverStatus: driver?.status || 'none'
        });
      } else {
        // Explicitly reject if password doesn't match Registry
        setError("Invalid credentials. Please check your password.");
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError("Registry connection failure. Check your internet.");
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgot) return <ForgotPasswordScreen onBack={() => setShowForgot(false)} />;

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white p-6 overflow-hidden animate-in fade-in duration-300">
      <AdBannerOverlay location="login" />

      <div className="flex-shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 mb-4 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-8 h-8 text-[#c1ff22]" />
        </button>
        <div className="space-y-1 mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight uppercase leading-none text-zinc-100">
            Login <span className="text-[#c1ff22]">eDrive</span>
          </h1>
          <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">
            Ao Chalen • Secure Login
          </p>
        </div>
      </div>

      <form onSubmit={handleLogin} className="flex-1 space-y-6 overflow-y-auto no-scrollbar pb-20">
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all duration-300 shadow-xl">
            <Mail className="w-6 h-6 text-[#c1ff22]" />
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-1">Email Address</label>
              <input 
                type="email"
                className="bg-transparent w-full outline-none font-medium text-white placeholder:text-zinc-800 text-base" 
                placeholder="name@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all duration-300 relative shadow-xl">
            <Lock className="w-6 h-6 text-[#c1ff22]" />
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-1">Secure Password</label>
              <input 
                type={showPassword ? "text" : "password"}
                className="bg-transparent w-full outline-none font-medium text-white placeholder:text-zinc-800 text-base tracking-widest" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-2 text-zinc-600 hover:text-[#c1ff22] transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between px-4">
            <button 
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2 group"
            >
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${rememberMe ? 'bg-[#c1ff22] border-[#c1ff22]' : 'border-zinc-700 bg-transparent'}`}>
                {rememberMe && <CheckCircle2 className="w-4 h-4 text-black" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300">Save Password</span>
            </button>
            <button type="button" onClick={() => setShowForgot(true)} className="text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:text-[#c1ff22]">Forgot Password?</button>
          </div>
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.2rem] font-black text-lg shadow-[0_20px_40px_rgba(193,255,34,0.2)] active:scale-[0.98] disabled:opacity-30 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
        >
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <><span>Confirm & Login</span></>
          )}
        </button>

        {error && (
          <div className="flex items-center gap-4 text-rose-500 bg-rose-500/10 p-5 rounded-[1.8rem] border border-rose-500/20 animate-in zoom-in duration-300 shadow-xl">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-[10px] font-black uppercase tracking-tight leading-relaxed">{error}</p>
          </div>
        )}

        <div className="text-center pt-4">
          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
            New to Hafizabad eDrive? <br/>
            <button type="button" onClick={onSwitchToRegister} className="text-[#c1ff22] font-black hover:underline mt-2 inline-flex items-center gap-1 text-[11px]">
              Register Citizen Profile <CheckCircle2 className="w-3 h-3" />
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};

export default LoginScreen;
