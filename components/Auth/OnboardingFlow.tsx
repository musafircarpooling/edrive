
import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { RideType } from '../../types';
import { RIDE_OPTIONS } from '../../constants';
import { Users, ChevronRight, Loader2, UserPlus } from 'lucide-react';

interface OnboardingFlowProps {
  onContinue: (role: RideType | 'CITIZEN', data?: { email: string; name: string }) => void;
  onLogin: () => void;
  onSkip: () => void;
}

const DEFAULT_JOIN_IMAGE = "https://images.unsplash.com/photo-1593950315186-76a92975b60c?auto=format&fit=crop&q=80&w=1200";

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onContinue, onLogin, onSkip }) => {
  const [step, setStep] = useState<'selection' | 'google'>('selection');
  const [selectedRole, setSelectedRole] = useState<RideType | 'CITIZEN' | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [joiningImage, setJoiningImage] = useState<string>(DEFAULT_JOIN_IMAGE);

  // Fetch dynamic joining screen image from Admin Ads
  useEffect(() => {
    const fetchJoiningImage = async () => {
      try {
        const adDoc = await getDoc(doc(db, 'app_ads', 'joining_screen'));
        if (adDoc.exists()) {
          const data = adDoc.data();
          if (data.is_active && data.image_url) {
            setJoiningImage(data.image_url);
          }
        }
      } catch (err) {
        console.error("Failed to fetch joining screen image", err);
      }
    };
    fetchJoiningImage();
  }, []);

  // Helper to get vehicle icon URL from constants
  const getVehicleIcon = (type: RideType) => {
    return RIDE_OPTIONS.find(o => o.type === type)?.icon;
  };

  const roles = [
    { 
      id: 'CITIZEN', 
      label: 'Citizen / Passenger', 
      sub: 'Rides & Deliveries', 
      isImage: false, 
      icon: Users, 
      color: '#c1ff22' 
    },
    { 
      id: RideType.MOTO, 
      label: 'Bike Partner', 
      sub: 'Ride & Delivery Partner', 
      isImage: true, 
      icon: getVehicleIcon(RideType.MOTO), 
      color: '#3b82f6' 
    },
    { 
      id: RideType.RICKSHAW, 
      label: 'Rickshaw Partner', 
      sub: 'City Travel Partner', 
      isImage: true, 
      icon: getVehicleIcon(RideType.RICKSHAW), 
      color: '#f59e0b' 
    },
    { 
      id: RideType.RIDE, 
      label: 'Car Partner', 
      sub: 'Family Ride Partner', 
      isImage: true, 
      icon: getVehicleIcon(RideType.RIDE), 
      color: '#a855f7' 
    },
    { 
      id: RideType.DELIVERY, 
      label: 'Delivery Hero', 
      sub: 'Courier Partner', 
      isImage: true, 
      icon: getVehicleIcon(RideType.DELIVERY), 
      color: '#f43f5e' 
    }
  ];

  const handleSelectRole = (roleId: any) => {
    setSelectedRole(roleId);
    setStep('google');
  };

  const handleGoogleSignIn = async () => {
    if (!selectedRole) return;
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      onContinue(selectedRole, {
        email: user.email || "",
        name: user.displayName || ""
      });
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      if (error.code !== 'auth/cancelled-popup-request') {
        alert("Google connection failed. Check HQ network.");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleManualRegistration = () => {
    if (!selectedRole) return;
    onContinue(selectedRole);
  };

  if (step === 'google') {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-8 animate-in fade-in duration-500">
         <div className="mt-20 space-y-10 text-center">
            <div className="w-24 h-24 bg-zinc-900 rounded-[2.5rem] border border-[#c1ff22]/20 flex items-center justify-center mx-auto shadow-2xl">
               <div className="bg-[#c1ff22] w-12 h-12 rounded-xl flex items-center justify-center text-black font-black italic transform -skew-x-6 text-2xl">e</div>
            </div>
            
            <div className="space-y-4">
               <h2 className="text-3xl font-black uppercase italic tracking-tighter">Almost <span className="text-[#c1ff22]">There!</span></h2>
               <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest px-6 leading-relaxed">
                  {selectedRole === 'CITIZEN' 
                    ? "Verify your identity with Google to join as a Citizen." 
                    : `Secure your ${selectedRole} partner account using Google.`}
               </p>
            </div>

            <div className="space-y-4 pt-4">
              <button 
                onClick={handleGoogleSignIn}
                disabled={isAuthenticating}
                className="w-full bg-white text-zinc-900 py-6 rounded-[2rem] font-black text-sm border border-white/5 flex items-center justify-center gap-4 active:scale-95 transition-all shadow-2xl disabled:opacity-50"
              >
                {isAuthenticating ? <Loader2 className="w-6 h-6 animate-spin" /> : <GoogleIcon />}
                <span>CONTINUE WITH GOOGLE</span>
              </button>

              <div className="flex items-center gap-3 py-2">
                 <div className="h-px flex-1 bg-zinc-800" />
                 <span className="text-[8px] font-black text-zinc-700 uppercase tracking-widest">or</span>
                 <div className="h-px flex-1 bg-zinc-800" />
              </div>

              <button 
                onClick={handleManualRegistration}
                disabled={isAuthenticating}
                className="w-full bg-zinc-900 text-white py-5 rounded-[2rem] font-black text-[10px] tracking-[0.2em] border border-white/5 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl disabled:opacity-50 uppercase"
              >
                <UserPlus className="w-4 h-4 text-[#c1ff22]" />
                Manual Registration
              </button>
            </div>

            <button onClick={() => setStep('selection')} className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] hover:text-[#c1ff22] transition-colors pt-6">Go Back</button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-hidden">
      {/* Dynamic Joining Screen Illustration */}
      <div className="relative w-full h-[35%] shrink-0 overflow-hidden">
        <img src={joiningImage} className="w-full h-full object-cover" alt="Welcome to eDrive" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent"></div>
        <div className="absolute top-10 left-8">
           <div className="bg-[#c1ff22] w-12 h-12 rounded-2xl flex items-center justify-center text-black font-black italic transform -skew-x-6 text-2xl shadow-2xl">e</div>
        </div>
      </div>

      <div className="flex flex-col flex-1 min-h-0 p-8 pt-2 overflow-hidden">
        <div className="flex-shrink-0 mb-6 space-y-2">
           <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Join <span className="text-[#c1ff22]">eDrive</span></h2>
           <p className="text-zinc-600 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed italic">Ap kistrah join krna chahtay ?</p>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pb-32">
           {roles.map((role) => (
             <button 
              key={role.id} 
              onClick={() => handleSelectRole(role.id)}
              className="w-full bg-zinc-900/40 p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group active:scale-98 transition-all hover:border-[#c1ff22]/20 shrink-0"
             >
                <div className="flex items-center gap-5">
                   <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden p-2">
                      {role.isImage ? (
                        <img src={role.icon as string} className="w-full h-full object-contain" alt={role.label} />
                      ) : (
                        <role.icon className="w-7 h-7 text-[#c1ff22]" />
                      )}
                   </div>
                   <div className="text-left">
                      <p className="text-zinc-100 font-black uppercase italic text-sm tracking-tight">{role.label}</p>
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">{role.sub}</p>
                   </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-800 group-hover:text-[#c1ff22] transition-colors" />
             </button>
           ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent z-50">
         <button onClick={onLogin} className="w-full bg-[#c1ff22]/10 text-[#c1ff22] py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest border border-[#c1ff22]/20 active:scale-95 transition-all backdrop-blur-md">Already a member? Log In</button>
      </div>
    </div>
  );
};

const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
  </svg>
);

export default OnboardingFlow;
