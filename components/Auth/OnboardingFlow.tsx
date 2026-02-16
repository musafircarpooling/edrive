
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { RideType } from '../../types';
import { RIDE_OPTIONS } from '../../constants';
import { Users, ChevronRight, Sparkles, UserPlus } from 'lucide-react';

interface OnboardingFlowProps {
  onContinue: (role: RideType | 'CITIZEN', data?: { email: string; name: string }) => void;
  onLogin: () => void;
  onSkip: () => void;
}

const DEFAULT_JOIN_IMAGE = ""; 

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onContinue, onLogin, onSkip }) => {
  const [joiningImage, setJoiningImage] = useState<string>(DEFAULT_JOIN_IMAGE);
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubIcons = onSnapshot(doc(db, 'app_settings', 'ride_icons'), (snap) => {
      if (snap.exists()) {
        setCustomIcons(snap.data() as Record<string, string>);
      }
    });

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

    return () => unsubIcons();
  }, []);

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
      icon: null, 
      color: '#3b82f6' 
    },
    { 
      id: RideType.RICKSHAW, 
      label: 'Rickshaw Partner', 
      sub: 'City Travel Partner', 
      isImage: true, 
      icon: null, 
      color: '#f59e0b' 
    },
    { 
      id: RideType.RIDE, 
      label: 'Car Partner', 
      sub: 'Family Ride Partner', 
      isImage: true, 
      icon: null, 
      color: '#a855f7' 
    },
    { 
      id: RideType.DELIVERY, 
      label: 'Delivery Hero', 
      sub: 'Courier Partner', 
      isImage: true, 
      icon: null, 
      color: '#f43f5e' 
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-hidden">
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

        .fluid-multi-color::after {
          content: "";
          position: absolute;
          inset: 1.5px;
          background: #111;
          border-radius: inherit;
          z-index: -1;
        }
      `}</style>

      <div className="relative w-full h-[35%] shrink-0 overflow-hidden bg-zinc-900">
        {joiningImage ? (
           <img src={joiningImage} className="w-full h-full object-cover" alt="Welcome to eDrive" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black flex items-center justify-center relative">
             <div className="absolute inset-0 bg-[#c1ff22]/5 blur-3xl opacity-30"></div>
             <Sparkles className="w-16 h-16 text-[#c1ff22]/20 animate-pulse" />
          </div>
        )}
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

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-32">
           {roles.map((role) => {
             const iconUrl = customIcons[role.id as string];
             return (
               <div key={role.id} className="chasing-light-box fluid-multi-color p-[1.5px] rounded-[2rem] shrink-0">
                 <button 
                  onClick={() => onContinue(role.id as any)}
                  className="w-full bg-[#111] p-5 rounded-[1.95rem] flex items-center justify-between group active:scale-98 transition-all relative z-10"
                 >
                    <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-2xl bg-zinc-800/20 flex items-center justify-center group-hover:scale-110 transition-transform overflow-hidden p-2">
                          {role.id === 'CITIZEN' ? (
                            <role.icon className="w-7 h-7 text-[#c1ff22]" />
                          ) : iconUrl ? (
                            <img src={iconUrl} className="w-full h-full object-contain" alt={role.label} />
                          ) : (
                            <div className="w-6 h-6 bg-[#c1ff22]/20 rounded-full animate-pulse" />
                          )}
                       </div>
                       <div className="text-left">
                          <p className="text-zinc-100 font-black uppercase italic text-sm tracking-tight">{role.label}</p>
                          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">{role.sub}</p>
                       </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-800 group-hover:text-[#c1ff22] transition-colors" />
                 </button>
               </div>
             );
           })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/80 to-transparent z-50">
         <button onClick={onLogin} className="w-full bg-[#c1ff22]/10 text-[#c1ff22] py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest border border-[#c1ff22]/20 active:scale-95 transition-all backdrop-blur-md">Already a member? Log In</button>
      </div>
    </div>
  );
};

export default OnboardingFlow;
