
import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Search, MapPin, Loader2, Zap, X, UserPlus, History, RefreshCcw, ChevronRight, Edit3, FileText, Activity,
  Mic, Target, Navigation, Square, Play, Pause, Trash2, LifeBuoy, Camera, Mail, Phone, User, AlignLeft, Sparkles, ShieldCheck, Volume2, LogOut,
  Car, Globe, Bell, Settings, Info, MessageSquare, Star, Facebook, Instagram, ShieldAlert, ChevronLeft, Pizza, Pill, Box, Sun, Moon, Clock, Shield, Award
} from 'lucide-react';
import { RIDE_OPTIONS, HAFIZABAD_LANDMARKS } from '../constants';
import { RideType, UserProfile, LocationData, DynamicLocation, RealtimeRideRequest } from '../types';
import AdBannerOverlay from './AdBannerOverlay';
import NotificationBell from './NotificationBell';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

interface HomeScreenProps {
  userProfile: UserProfile;
  onOpenDriverOnboarding: () => void;
  onFindDriver: (requestId: string) => void;
  onOpenProfile: () => void;
  onOpenHistory: () => void;
  onOpenAffiliate?: () => void;
  onLogout: () => void;
  onSwitchToDriver?: () => void;
  onOpenReferral?: () => void;
  onOpenAdmin?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type DeliveryCategory = 'FOOD' | 'MEDICINE' | 'PARCEL';

const HomeScreen: React.FC<HomeScreenProps> = ({ 
  userProfile, 
  onOpenDriverOnboarding, 
  onFindDriver, 
  onOpenProfile, 
  onOpenHistory, 
  onOpenAffiliate,
  onLogout, 
  onSwitchToDriver, 
  onOpenReferral,
  onOpenAdmin,
  theme,
  onToggleTheme
}) => {
  const [selectedType, setSelectedType] = useState<RideType>(RideType.MOTO);
  const [deliveryCategory, setDeliveryCategory] = useState<DeliveryCategory>('PARCEL');
  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [fare, setFare] = useState("150");
  const [showMenu, setShowMenu] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState<'pickup' | 'destination' | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [activeLandmarkIdx, setActiveLandmarkIdx] = useState(0);
  const [sliderImages, setSliderImages] = useState<string[]>([]);
  const sliderInterval = useRef<number | null>(null);

  const [instruction, setInstruction] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceNoteBase64, setVoiceNoteBase64] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const [userStats, setUserStats] = useState({ rating: 5.0, tripCount: 0 });
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const playbackAudio = useRef<HTMLAudioElement | null>(null);
  const recordingInterval = useRef<number | null>(null);
  const instructionContainerRef = useRef<HTMLDivElement>(null);

  const [allLandmarks, setAllLandmarks] = useState<LocationData[]>(HAFIZABAD_LANDMARKS);

  useEffect(() => {
    const userId = userProfile.uid || userProfile.email;
    if (!userId) return;

    const qTrips = query(
      collection(db, 'ride_requests'),
      where('passenger_id', '==', userId),
      where('status', '==', 'completed')
    );
    const unsubTrips = onSnapshot(qTrips, (snap) => {
      setUserStats(prev => ({ ...prev, tripCount: snap.size }));
    });

    const qReviews = query(
      collection(db, 'ride_reviews'),
      where('reviewee_id', '==', userId)
    );
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      if (snap.empty) {
        setUserStats(prev => ({ ...prev, rating: 5.0 }));
        return;
      }
      const total = snap.docs.reduce((acc, d) => acc + (Number(d.data().rating) || 0), 0);
      const avg = total / snap.size;
      setUserStats(prev => ({ ...prev, rating: Number(avg.toFixed(1)) }));
    });

    return () => { unsubTrips(); unsubReviews(); };
  }, [userProfile.uid, userProfile.email]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'city_locations'), (snap) => {
      // STRICT SANITIZATION
      const dynamic = snap.docs.map(d => {
        const data = d.data();
        return {
          id: String(d.id),
          name: String(data.name || ""),
          address: String(data.address || ""),
          city: String(data.city || "Hafizabad"),
          area: String(data.area || ""),
          lat: Number(data.lat || 0),
          lng: Number(data.lng || 0),
          category: String(data.category || "")
        } as LocationData;
      });
      const combined = [...HAFIZABAD_LANDMARKS, ...dynamic];
      const unique = Array.from(new Map(combined.map(item => [item.name, item])).values());
      setAllLandmarks(unique);
    });

    const unsubIcons = onSnapshot(doc(db, 'app_settings', 'ride_icons'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() || {};
        const cleaned: Record<string, string> = {};
        Object.keys(data).forEach(k => {
          if (typeof data[k] === 'string') cleaned[k] = data[k];
        });
        setCustomIcons(cleaned);
      }
    });

    const unsubSlider = onSnapshot(doc(db, 'app_settings', 'slider_images'), (snap) => {
      if (snap.exists()) {
        const images = snap.data().images || [];
        setSliderImages(Array.isArray(images) ? images.map(String) : []);
      }
    });

    return () => { unsub(); unsubIcons(); unsubSlider(); };
  }, []);

  useEffect(() => {
    sliderInterval.current = window.setInterval(() => {
      const total = sliderImages.length > 0 ? sliderImages.length : HAFIZABAD_LANDMARKS.length;
      setActiveLandmarkIdx(prev => (prev + 1) % total);
    }, 4500);
    return () => { if (sliderInterval.current) clearInterval(sliderInterval.current); };
  }, [sliderImages]);

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = window.setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      setRecordingSeconds(0);
    }
    return () => { if (recordingInterval.current) clearInterval(recordingInterval.current); };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      if (voiceNoteBase64) deleteVoiceNote();
      if (isPlaying) stopPlayback();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setVoiceNoteBase64(base64);
          const tempAudio = new Audio(base64);
          tempAudio.onloadedmetadata = () => setAudioDuration(tempAudio.duration);
        };
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const togglePlayback = () => {
    if (!voiceNoteBase64) return;
    if (isPlaying) {
      stopPlayback();
    } else {
      playbackAudio.current = new Audio(voiceNoteBase64);
      playbackAudio.current.onplay = () => setIsPlaying(true);
      playbackAudio.current.onpause = () => setIsPlaying(false);
      playbackAudio.current.onended = () => {
        setIsPlaying(false);
        setAudioCurrentTime(0);
      };
      playbackAudio.current.ontimeupdate = () => {
        if (playbackAudio.current) setAudioCurrentTime(playbackAudio.current.currentTime);
      };
      playbackAudio.current.play();
    }
  };

  const stopPlayback = () => {
    if (playbackAudio.current) {
      playbackAudio.current.pause();
      playbackAudio.current = null;
      setIsPlaying(false);
    }
  };

  const deleteVoiceNote = () => {
    stopPlayback();
    setVoiceNoteBase64(null);
    setAudioDuration(0);
    setAudioCurrentTime(0);
  };

  const handleFocus = () => {
    setTimeout(() => {
      instructionContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  const isDelivery = selectedType === RideType.DELIVERY;

  const handleRequest = async () => {
    if (isSubmittingRequest) return;
    const canRequest = isDelivery ? !!destination : (!!pickup && !!destination);
    if (!canRequest) {
      alert("Please select destination " + (!isDelivery ? "and pickup " : "") + "first.");
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const finalFare = parseInt(fare) || 150;
      const requestData = {
        passenger_id: String(userProfile.uid || userProfile.email),
        passenger_name: String(userProfile.name),
        passenger_image: String(userProfile.profilePic || ""),
        pickup_address: String(pickup?.name || pickup?.address || (isDelivery ? "Anywhere" : "Where to pick from?")),
        dest_address: String(destination?.name || destination?.address || ""),
        pickup_lat: Number(pickup?.lat || 0),
        pickup_lng: Number(pickup?.lng || 0),
        dest_lat: Number(destination?.lat || 0),
        dest_lng: Number(destination?.lng || 0),
        base_fare: Number(finalFare),
        ride_type: String(selectedType),
        delivery_category: isDelivery ? String(deliveryCategory) : null,
        status: 'pending',
        created_at: new Date().toISOString(),
        instruction_text: String(instruction || "").trim(),
        voice_note_base64: String(voiceNoteBase64 || "")
      };
      const docRef = await addDoc(collection(db, 'ride_requests'), requestData);
      onFindDriver(docRef.id);
    } catch (err) {
      console.error("eDrive HQ error:", err);
      alert("System Error: Could not post your request. Please try again.");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const isRequestDisabled = isSubmittingRequest || (isDelivery ? !destination : (!pickup || !destination));

  const handleSwitchMode = () => {
    setShowMenu(false);
    if (userProfile.isDriver && userProfile.driverStatus === 'approved') {
      onSwitchToDriver?.();
    } else {
      onOpenDriverOnboarding();
    }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden relative">
      <style>{`
        @keyframes border-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .chasing-light-box { 
          position: relative; 
          background: var(--app-surface); 
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
          filter: blur(6px);
          opacity: 0.9;
        }

        .fluid-multi-color::after {
          content: "";
          position: absolute;
          inset: 1.5px;
          background: var(--app-surface);
          border-radius: inherit;
          z-index: -1;
        }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      <AdBannerOverlay location="home" />
      
      <div className="px-5 pt-10 pb-4 z-20 shrink-0">
        <div className="chasing-light-box fluid-multi-color p-[1.5px] rounded-[2.2rem]">
          <header className="bg-[#0f0f0f] px-5 py-4 rounded-[2.1rem] flex items-center justify-between relative z-10 shadow-2xl">
            <button 
              onClick={() => setShowMenu(true)} 
              className="bg-zinc-900/50 p-3 rounded-2xl border border-white/5 active:scale-95 transition-all"
            >
              <Menu className="text-[var(--app-lime)] w-6 h-6" />
            </button>
            
            <div className="text-center">
              <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">EDRIVE</h1>
              <p className="text-[var(--app-lime)] text-[10px] font-black uppercase tracking-[0.4em] mt-1">AO CHALEN</p>
            </div>

            <div className="flex items-center">
              <div className="bg-zinc-900/50 p-0.5 rounded-2xl border border-white/5">
                <NotificationBell userId={userProfile.uid || userProfile.email} />
              </div>
            </div>
          </header>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 no-scrollbar pb-32 space-y-6">
        
        <div className="chasing-light-box fluid-multi-color p-[1.5px] rounded-[2.5rem]">
          <div className="w-full aspect-[21/9] bg-[var(--app-surface)] rounded-[2.4rem] relative overflow-hidden group shadow-2xl z-10">
            {sliderImages.length > 0 ? (
               <div className="w-full h-full relative">
                  <img 
                    src={sliderImages[activeLandmarkIdx % sliderImages.length]} 
                    className="w-full h-full object-cover animate-in fade-in duration-700" 
                    key={activeLandmarkIdx}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
               </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center p-8 bg-gradient-to-br from-[var(--app-lime)]/5 to-transparent">
                 <div className="inline-block bg-[var(--app-lime)] px-3 py-1 rounded-full w-fit mb-3">
                    <span className="text-[8px] font-black uppercase text-black tracking-widest">Hafizabad</span>
                 </div>
                 <h2 className="text-2xl font-black uppercase text-[var(--app-text)] animate-in fade-in slide-in-from-left duration-700" key={activeLandmarkIdx}>
                   {HAFIZABAD_LANDMARKS[activeLandmarkIdx % HAFIZABAD_LANDMARKS.length].name}
                 </h2>
              </div>
            )}
            
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5 pt-1 z-20">
               {(sliderImages.length > 0 ? sliderImages : HAFIZABAD_LANDMARKS.slice(0, 5)).map((_, i) => (
                 <div key={i} className={`h-1 rounded-full transition-all duration-500 ${activeLandmarkIdx % (sliderImages.length || 5) === i ? 'w-8 bg-[var(--app-lime)]' : 'w-1.5 bg-white/20'}`} />
               ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 pt-2">
          {RIDE_OPTIONS.map((option) => {
            const iconUrl = customIcons[option.type];
            return (
              <div 
                key={option.type} 
                className={`chasing-light-box p-[1px] rounded-[1.8rem] transition-all ${selectedType === option.type ? 'fluid-multi-color shadow-[0_15px_30px_rgba(193,255,34,0.1)]' : 'border border-white/5'}`}
              >
                <button 
                  onClick={() => setSelectedType(option.type)} 
                  className={`w-full flex flex-col items-center p-4 rounded-[1.75rem] transition-all relative z-10 ${selectedType === option.type ? 'bg-[#0f1109]' : 'bg-[var(--app-surface)] opacity-80'}`}
                >
                  <div className="w-10 h-10 flex items-center justify-center mb-1">
                    {iconUrl ? (
                      <img 
                        src={iconUrl} 
                        className={`w-full h-full object-contain filter drop-shadow-md transition-transform ${selectedType === option.type ? 'scale-110' : ''}`} 
                      />
                    ) : (
                      <div className="w-6 h-6 bg-zinc-800 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[8px] font-black uppercase italic tracking-tighter ${selectedType === option.type ? 'text-[var(--app-lime)]' : 'text-[var(--app-text-muted)]'}`}>
                    {option.label}
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className={`bg-[var(--app-surface)] rounded-[3rem] p-5 border border-[var(--app-border)] shadow-2xl space-y-5 ${isDelivery ? 'animate-in fade-in slide-in-from-top-4' : ''}`}>
          {isDelivery && (
            <div className="flex gap-2 justify-center pb-2">
              {[
                { id: 'FOOD', label: 'FOOD', icon: Pizza },
                { id: 'MEDICINE', label: 'MEDICINE', icon: Pill },
                { id: 'PARCEL', label: 'PARCEL', icon: Box }
              ].map((cat) => (
                <button 
                  key={cat.id} 
                  onClick={() => setDeliveryCategory(cat.id as DeliveryCategory)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-[9px] uppercase border transition-all ${deliveryCategory === cat.id ? 'bg-[var(--app-lime)] border-[var(--app-lime)] text-black shadow-lg' : 'bg-[var(--app-bg)]/50 border-[var(--app-border)] text-[var(--app-text-muted)]'}`}
                >
                  <cat.icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          <div className="chasing-light-box fluid-multi-color p-[1px] rounded-[1.8rem]">
            <button onClick={() => setShowLocationPicker('pickup')} className="w-full bg-[var(--app-surface)] p-5 rounded-[1.75rem] flex items-center justify-between text-left relative z-10 transition-colors hover:bg-zinc-900/50">
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <div className="w-10 h-10 bg-[var(--app-lime)]/10 rounded-full flex items-center justify-center shrink-0">
                   <MapPin className="w-5 h-5 text-[var(--app-lime)]" />
                </div>
                <div className="flex-1 overflow-hidden">
                   <p className="text-[7px] font-black uppercase text-[var(--app-text-muted)] tracking-widest mb-0.5">
                     PICKUP ADDRESS {isDelivery && "(OPTIONAL)"}
                   </p>
                   <p className={`text-xs font-bold truncate ${pickup ? 'text-[var(--app-text)]' : 'text-[var(--app-text-muted)]'}`}>
                     {pickup?.name || (isDelivery ? "Anywhere" : "Where to pick from?")}
                   </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--app-text)] shrink-0 ml-2" />
            </button>
          </div>

          <div className="chasing-light-box fluid-multi-color p-[1px] rounded-[1.8rem]">
            <button onClick={() => setShowLocationPicker('destination')} className="w-full bg-[var(--app-surface)] p-5 rounded-[1.75rem] flex items-center justify-between text-left relative z-10 transition-colors hover:bg-zinc-900/50">
              <div className="flex items-center gap-4 flex-1 overflow-hidden">
                <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                   <Target className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 overflow-hidden">
                   <p className="text-[7px] font-black uppercase text-[var(--app-text-muted)] tracking-widest mb-0.5">{isDelivery ? 'DELIVERY ADDRESS' : 'DROP LOCATION'}</p>
                   <p className={`text-xs font-bold truncate ${destination ? 'text-[var(--app-text)]' : 'text-[var(--app-text-muted)]'}`}>{destination?.name || "Where to go?"}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--app-text)] shrink-0 ml-2" />
            </button>
          </div>

          <div className="bg-[var(--app-bg)]/40 p-6 rounded-[2.2rem] border border-[var(--app-border)] space-y-4 relative overflow-hidden shadow-inner">
              <div className="px-1">
                 <p className="text-[9px] font-black uppercase text-[var(--app-text-muted)] tracking-widest mb-2">
                   {isDelivery ? "DELIVERY ADDRESS / DETAILS" : "INSTRUCTION / VOICE NOTE"}
                 </p>
                 <textarea 
                   className="bg-transparent text-[13px] font-semibold italic outline-none text-[var(--app-text)] placeholder:text-[var(--app-text-muted)]/30 w-full min-h-[100px] resize-none leading-tight tracking-tight" 
                   style={{ fontFamily: "'Lucida Fax', 'Lucida Bright', Georgia, serif" }}
                   placeholder={isDelivery ? "Enter specific delivery details here..." : "Type instructions here..."}
                   value={instruction}
                   onChange={e => setInstruction(e.target.value)}
                   onFocus={handleFocus}
                 />
              </div>

              {voiceNoteBase64 && (
                <div className="flex items-center gap-2 h-14 pr-16">
                  <div className="bg-[var(--app-lime)]/10 px-4 rounded-[1.5rem] flex items-center gap-3 border border-[var(--app-lime)]/10 h-full flex-1">
                    <button onClick={togglePlayback} className="w-8 h-8 rounded-full bg-[var(--app-lime)] flex items-center justify-center text-black shadow-lg">
                      {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                    </button>
                    <div className="flex-1 h-1 bg-[var(--app-text-muted)]/20 rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--app-lime)] transition-all" style={{ width: `${(audioCurrentTime / audioDuration) * 100 || 0}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-[var(--app-lime)] tabular-nums">{formatTime(audioCurrentTime)}</span>
                    <button onClick={deleteVoiceNote} className="ml-2 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              <div className="absolute bottom-5 right-5">
                 <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-black shadow-2xl transition-all active:scale-90 ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-[var(--app-lime)]'}`}
                 >
                    {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Mic className="w-7 h-7" />}
                    {isRecording && <span className="absolute -top-1 px-1 bg-black text-white text-[8px] font-black rounded-sm">{formatTime(recordingSeconds)}</span>}
                 </button>
              </div>
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto animate-in slide-in-from-bottom duration-500">
          <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-4 flex items-center shadow-2xl gap-5">
              <div className="w-16 h-16 bg-[var(--app-lime)] rounded-[1.5rem] flex items-center justify-center text-black font-black italic text-2xl shrink-0 shadow-lg">Rs</div>
              <div className="flex flex-col flex-1">
                <p className="text-[9px] font-black uppercase text-zinc-500 tracking-widest mb-1">PROPOSED FARE (NEGOTIABLE)</p>
                <div className="flex items-center">
                  <input 
                    type="number" 
                    className="bg-transparent w-full text-4xl font-black outline-none text-white italic tracking-tighter" 
                    value={fare} 
                    onChange={e => setFare(e.target.value)} 
                    onFocus={handleFocus} 
                  />
                </div>
              </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-10 pt-4 bg-transparent flex flex-col items-center shrink-0 mb-safe">
        <button 
          onClick={handleRequest} 
          disabled={isSubmittingRequest} 
          className={`w-full py-6 rounded-[2.5rem] font-black text-xl uppercase shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:pointer-events-none transition-all italic tracking-tighter ${isRequestDisabled ? 'bg-[#4c5d0b] text-[#c1ff22]/60' : (isDelivery ? 'bg-lime-600 text-black' : 'bg-[var(--app-lime)] text-black')}`}
        >
          {isSubmittingRequest ? <Loader2 className="w-7 h-7 animate-spin" /> : (
            <>
              <Zap className={`w-6 h-6 fill-current ${isRequestDisabled ? 'text-[#c1ff22]/60' : 'text-black'}`} />
              <span className={isRequestDisabled ? 'text-[#c1ff22]/60' : 'text-black'}>{isDelivery ? `PLACE ${deliveryCategory} ORDER` : 'REQUEST EDRIVE'}</span>
            </>
          )}
        </button>
      </div>

      {showMenu && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMenu(false)}>
          <div className="w-4/5 max-w-[320px] h-full bg-[#111111] flex flex-col shadow-2xl border-r border-white/5" onClick={e => e.stopPropagation()}>
             <div onClick={() => { setShowMenu(false); onOpenProfile(); }} className="p-6 pt-12 flex items-center justify-between cursor-pointer active:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                   <div className="relative">
                      <img src={userProfile.profilePic} className="w-16 h-16 rounded-full border-2 border-[#c1ff22] object-cover" />
                      <div className="absolute -bottom-1 -right-1 bg-[#c1ff22] p-1 rounded-full border-2 border-[#111111]"><Sparkles className="w-3 h-3 text-black" /></div>
                   </div>
                   <div className="space-y-1">
                      <h3 className="font-black text-xl text-white italic leading-none">{userProfile.name}</h3>
                      <div className="flex items-center gap-1">
                         <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= Math.round(userStats.rating) ? 'text-orange-500 fill-current' : 'text-zinc-800'}`} />)}
                         </div>
                         <span className="text-[10px] font-black text-zinc-500 mt-0.5 ml-1">{userStats.rating.toFixed(1)} ({userStats.tripCount})</span>
                      </div>
                   </div>
                </div>
                <ChevronRight className="w-6 h-6 text-zinc-700" />
             </div>

             <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto no-scrollbar">
                <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-black bg-[#c1ff22] shadow-lg transition-all border border-[#c1ff22]">
                  <Car className="w-5 h-5 text-black" />
                  <span className="text-sm font-black uppercase italic">City</span>
                </button>
                <button onClick={() => { setShowMenu(false); onOpenHistory(); }} className="w-full flex items-center gap-4 p-4 rounded-2xl text-white hover:bg-white/5 transition-all">
                  <Clock className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-bold">Request history</span>
                </button>
                <button onClick={() => { setShowMenu(false); onOpenAffiliate?.(); }} className="group w-full flex items-center gap-4 p-4 rounded-2xl text-white hover:bg-white/5 transition-all border border-transparent hover:border-[#6A0DAD]/30 relative">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <Award className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-sm font-bold">Affiliate Program</span>
                  <div className="absolute right-4 w-2 h-2 bg-[#C6FF00] rounded-full animate-pulse shadow-[0_0_10px_#C6FF00]" />
                </button>
                <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-white hover:bg-white/5 transition-all">
                  <Globe className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-bold">City to City</span>
                </button>
                <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-white hover:bg-white/5 transition-all">
                  <Bell className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-bold">Notifications</span>
                </button>
                <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-white hover:bg-white/5 transition-all">
                  <Shield className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-bold">Safety</span>
                </button>
                <button className="w-full flex items-center gap-4 p-4 rounded-2xl text-white hover:bg-white/5 transition-all">
                  <Settings className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-bold">Settings</span>
                </button>
             </nav>

             <div className="p-4 space-y-6">
                <div className="h-px bg-white/5 w-full" />
                
                <button onClick={handleSwitchMode} className="w-full bg-[#c1ff22] text-black py-5 rounded-2xl font-black text-base uppercase shadow-lg active:scale-95 transition-all italic">
                   {userProfile.isDriver && userProfile.driverStatus === 'approved' ? 'Switch Mode' : 'Become partner'}
                </button>

                <div className="pt-4 pb-8 border-t border-white/5">
                   <div className="flex items-center justify-center gap-6">
                      <button className="p-3 bg-blue-600/20 rounded-full text-blue-500 active:scale-90 transition-transform"><Facebook className="w-6 h-6 fill-current" /></button>
                      <button className="p-3 bg-pink-600/20 rounded-full text-pink-500 active:scale-90 transition-transform"><Instagram className="w-6 h-6" /></button>
                      <button onClick={() => { setShowMenu(false); onLogout(); }} className="p-3 bg-rose-600/20 rounded-full text-rose-500 active:scale-90 transition-transform"><LogOut className="w-6 h-6" /></button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {showLocationPicker && (
        <div className="fixed inset-0 z-[200] bg-[var(--app-bg)] p-6 flex flex-col animate-in slide-in-from-bottom">
           <header className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black italic uppercase text-[var(--app-text)]">Select <span className="text-[var(--app-lime)]">Area</span></h2>
              <button onClick={() => setShowLocationPicker(null)} className="p-2 bg-[var(--app-surface)] rounded-full text-[var(--app-text-muted)]"><X className="w-6 h-6" /></button>
           </header>
           
           <div className="chasing-light-box fluid-multi-color p-[1px] rounded-2xl mb-4">
              <input 
                className="w-full bg-[var(--app-surface)] p-4 rounded-[0.95rem] outline-none text-[var(--app-text)] relative z-10 font-bold" 
                placeholder="Search Areas..." 
                value={locationSearch} 
                onChange={e => setLocationSearch(e.target.value)} 
              />
           </div>

           <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
              {allLandmarks.filter(l => l.name?.toLowerCase().includes(locationSearch.toLowerCase())).map((loc, i) => (
                <button key={i} onClick={() => { 
                  if (showLocationPicker === 'pickup') {
                    setPickup({
                      name: String(loc.name),
                      address: String(loc.address),
                      city: String(loc.city),
                      area: String(loc.area),
                      lat: Number(loc.lat),
                      lng: Number(loc.lng)
                    });
                  } else {
                    setDestination({
                      name: String(loc.name),
                      address: String(loc.address),
                      city: String(loc.city),
                      area: String(loc.area),
                      lat: Number(loc.lat),
                      lng: Number(loc.lng)
                    });
                  } 
                  setShowLocationPicker(null); 
                }} className="w-full bg-[var(--app-surface)] p-5 rounded-2xl text-left flex items-center gap-4 border border-[var(--app-border)] hover:border-[var(--app-lime)] transition-colors">
                   <MapPin className="w-4 h-4 text-[var(--app-lime)]" />
                   <div className="flex-1">
                      <span className="font-black text-xs uppercase tracking-tight text-[var(--app-text)]">{loc.name}</span>
                      <p className="text-[8px] text-[var(--app-text-muted)] font-bold uppercase tracking-widest mt-0.5">{loc.address}</p>
                   </div>
                </button>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
