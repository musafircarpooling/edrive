
import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, Search, MapPin, Loader2, Zap, X, UserPlus, History, RefreshCcw, ChevronRight, Edit3, FileText, Activity,
  Pizza, Pill, Package, FileCode, Mic, Target, Navigation, Square, Play, Trash2, LifeBuoy, Camera, Mail, Phone, User, AlignLeft, Sparkles, ShieldCheck
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { RIDE_OPTIONS, HAFIZABAD_LANDMARKS } from '../constants';
import { RideType, UserProfile, LocationData, DynamicLocation, SliderItem } from '../types';
import { db } from '../firebase';
import { collection, query, getDocs, setDoc, doc, addDoc, where } from 'firebase/firestore';
import AdBannerOverlay from './AdBannerOverlay';

interface HomeScreenProps {
  userProfile: UserProfile;
  onOpenDriverOnboarding: () => void;
  onFindDriver: (requestId: string) => void;
  onOpenProfile: () => void;
  onOpenHistory: () => void;
  onLogout: () => void;
  onSwitchToDriver?: () => void;
}

const DELIVERY_CATEGORIES = [
  { id: 'FOOD', label: 'FOOD', icon: Pizza },
  { id: 'MEDICINE', label: 'MEDICINE', icon: Pill },
  { id: 'PARCEL', label: 'PARCEL', icon: Package },
  { id: 'DOC', label: 'DOC', icon: FileCode },
];

const INITIAL_SLIDER: SliderItem[] = [
  {
    id: 's1',
    title: "Hafizabad's #1 Moto",
    desc: "Bikes at your doorstep in minutes.",
    image: "https://images.unsplash.com/photo-1558981403-c5f91cbba527?auto=format&fit=crop&q=80&w=800",
    badge: "FASTEST",
    is_active: true,
    created_at: ''
  },
  {
    id: 's2',
    title: "Mini Car Comfort",
    desc: "Affordable family rides across the city.",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800",
    badge: "AFFORDABLE",
    is_active: true,
    created_at: ''
  }
];

const HomeScreen: React.FC<HomeScreenProps> = ({ userProfile, onOpenDriverOnboarding, onFindDriver, onOpenProfile, onOpenHistory, onLogout, onSwitchToDriver }) => {
  const [selectedType, setSelectedType] = useState<RideType>(RideType.MOTO);
  const [selectedDeliveryCategory, setSelectedDeliveryCategory] = useState('PARCEL');
  const [pickup, setPickup] = useState<LocationData | null>(null);
  const [destination, setDestination] = useState<LocationData | null>(null);
  const [description, setDescription] = useState("");
  const [fare, setFare] = useState("100");
  const [showMenu, setShowMenu] = useState(false);
  
  // Initialize with local landmarks to ensure the UI is never empty
  const [allLocations, setAllLocations] = useState<DynamicLocation[]>(
    HAFIZABAD_LANDMARKS.map((l, idx) => ({
      ...l,
      id: `local-${idx}`,
      name: l.name || 'Unnamed Area',
      address: l.address || '',
      category: l.category || 'landmark',
      lat: l.lat || 32.0711,
      lng: l.lng || 73.6875
    }))
  );

  const [sliderItems, setSliderItems] = useState<SliderItem[]>(INITIAL_SLIDER);
  const [showLocationPicker, setShowLocationPicker] = useState<'pickup' | 'destination' | null>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Support Form State
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    subject: "",
    message: "",
    targetName: "",
    targetPhone: "",
    targetEmail: "",
    proof: null as string | null
  });
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Voice Note State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNoteBase64, setVoiceNoteBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setSliderItems(prev => {
        if (prev.length > 0) setCurrentSlide((curr) => (curr + 1) % prev.length);
        return prev;
      });
    }, 4000);
    return () => clearInterval(slideTimer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Areas from Firestore
        const qLoc = query(collection(db, 'city_locations'));
        const locSnap = await getDocs(qLoc);
        
        if (!locSnap.empty) {
          const fetchedLocations = locSnap.docs.map(d => {
            const data = d.data();
            return {
              ...data,
              id: d.id,
              name: data.name || data.address || 'Unnamed Area',
              address: data.address || '',
              category: data.category || 'landmark',
              lat: data.lat || 32.0711,
              lng: data.lng || 73.6875
            } as DynamicLocation;
          }).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

          setAllLocations(fetchedLocations);
        }
        
        // Fetch Slider (Dynamic)
        const qSlider = query(collection(db, 'home_slider'), where('is_active', '==', true));
        const sliderSnap = await getDocs(qSlider);
        const dynamicItems = sliderSnap.docs.map(doc => ({ ...(doc.data() as SliderItem), id: doc.id }));
        if (dynamicItems.length > 0) {
          setSliderItems(dynamicItems.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
        }

        setIsFirebaseConnected(true);
      } catch (err) {
        console.error("Home Data Fetch Error:", err);
        setIsFirebaseConnected(false);
      }
    };
    fetchData();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComplaintForm(prev => ({ ...prev, proof: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const submitComplaint = async () => {
    if (!complaintForm.subject || !complaintForm.targetName || !complaintForm.message) {
      alert("Please fill Subject, Target Name, and Message fields.");
      return;
    }
    setIsSubmittingComplaint(true);
    try {
      await addDoc(collection(db, 'complaints'), {
        reporter_email: userProfile.email,
        reporter_name: `${userProfile.name} ${userProfile.lastName || ''}`.trim(),
        reporter_pic: userProfile.profilePic,
        subject: complaintForm.subject,
        message: complaintForm.message,
        target_name: complaintForm.targetName,
        target_phone: complaintForm.targetPhone,
        target_email: complaintForm.targetEmail,
        proof_image: complaintForm.proof,
        created_at: new Date().toISOString(),
        status: 'open'
      });
      alert("Complaint submitted to Hafizabad HQ. We will investigate.");
      setShowSupportForm(false);
      setComplaintForm({ subject: "", message: "", targetName: "", targetPhone: "", targetEmail: "", proof: null });
    } catch (err) { alert("Submission failed."); } finally { setIsSubmittingComplaint(false); }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => { setVoiceNoteBase64(reader.result as string); };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone permission denied."); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); } };

  const playRecordedNote = () => { if (voiceNoteBase64) { const audio = new Audio(voiceNoteBase64); audio.play(); } };

  const handleSubmitRequest = async () => {
    if (!userProfile.email || !destination || !pickup) return;
    setIsSubmittingRequest(true);
    try {
      const requestId = `req-${Date.now().toString(36)}`;
      await setDoc(doc(db, 'ride_requests', requestId), { 
        id: requestId, 
        passenger_id: userProfile.email, 
        passenger_name: userProfile.name, 
        passenger_image: userProfile.profilePic, 
        base_fare: parseFloat(fare), 
        ride_type: selectedType, 
        status: 'pending',
        pickup_address: pickup.address,
        dest_address: destination.address,
        description: description,
        voice_note: voiceNoteBase64,
        item_type: selectedType === RideType.DELIVERY ? selectedDeliveryCategory : null,
        created_at: new Date().toISOString()
      });
      onFindDriver(requestId);
    } catch (err) { alert("Ride Request Failed."); } finally { setIsSubmittingRequest(false); }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#080808] overflow-hidden text-white overscroll-none">
      <AdBannerOverlay location="home" />
      <header className="px-5 pt-8 pb-4 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMenu(true)} className="bg-zinc-900 p-2.5 rounded-2xl border border-white/5 active:scale-95 transition-all">
            <Menu className="text-[#c1ff22] w-6 h-6" />
          </button>
        </div>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-extrabold italic tracking-tight uppercase leading-none text-zinc-100">eDrive</h1>
          <p className="text-[#c1ff22] text-[8px] font-bold uppercase tracking-[0.2em] mt-0.5">Ao Chalen</p>
        </div>
        <div className="scale-90 origin-right flex items-center gap-3">
          <button className="p-2.5 bg-zinc-900 rounded-2xl border border-white/5 text-zinc-400">
            <Navigation className="w-5 h-5" />
          </button>
          <NotificationBell userId={userProfile.email || 'guest'} />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pt-2 pb-32 no-scrollbar">
        {/* PROMOTIONAL SLIDER */}
        <div className="relative w-full aspect-[2.8/1] mb-6 overflow-hidden rounded-[2.5rem] border border-white/10 group">
           {sliderItems.map((item, idx) => (
             <div 
               key={item.id} 
               className={`absolute inset-0 transition-all duration-700 ease-in-out transform ${idx === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}
             >
                <img src={item.image} className="w-full h-full object-cover mix-blend-overlay opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent p-6 flex flex-col justify-center">
                   <span className="bg-[#c1ff22] text-black text-[7px] font-black uppercase px-2 py-0.5 rounded-full w-fit mb-2 tracking-widest">{item.badge}</span>
                   <h3 className="text-lg font-black uppercase italic leading-none text-white tracking-tighter">{item.title}</h3>
                   <p className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-tight max-w-[180px]">{item.desc}</p>
                </div>
             </div>
           ))}
           <div className="absolute bottom-4 left-6 flex gap-1.5">
             {sliderItems.map((_, i) => (
               <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1 rounded-full transition-all ${i === currentSlide ? 'w-4 bg-[#c1ff22]' : 'w-1.5 bg-white/20'}`} />
             ))}
           </div>
        </div>

        {/* Main Service Selector */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {RIDE_OPTIONS.map((option) => (
            <button 
              key={option.type} 
              onClick={() => setSelectedType(option.type)} 
              className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all border-2 ${selectedType === option.type ? 'bg-[#c1ff22]/10 border-[#c1ff22]' : 'bg-zinc-900/50 border-transparent opacity-50'}`}
            >
              <img src={option.icon} className="w-7 h-7 object-contain mb-1.5" alt={option.label} />
              <div className="text-[8px] font-bold uppercase tracking-tight text-center leading-none">{option.label}</div>
            </button>
          ))}
        </div>

        <div className={`bg-zinc-900/30 rounded-[2.5rem] p-4 border border-white/5 space-y-4 mb-4 ${selectedType === RideType.DELIVERY ? 'animate-in fade-in zoom-in-95 duration-300' : ''}`}>
          
          {selectedType === RideType.DELIVERY && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {DELIVERY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedDeliveryCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-[9px] uppercase tracking-wider transition-all shrink-0 ${
                    selectedDeliveryCategory === cat.id ? 'bg-[#c1ff22]/20 border-[#c1ff22] text-[#c1ff22]' : 'bg-zinc-800/40 border-white/5 text-zinc-600'
                  }`}
                >
                  <cat.icon className="w-3 h-3" /> {cat.label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <button onClick={() => setShowLocationPicker('pickup')} className="w-full bg-zinc-900/60 rounded-[1.8rem] p-5 flex items-start gap-4 text-left active:scale-[0.98] transition-all border border-white/5">
              <MapPin className="w-5 h-5 text-[#c1ff22] mt-1" />
              <div className="flex-1 min-w-0">
                 <p className="text-[7px] font-black uppercase text-zinc-600 mb-1 tracking-widest leading-none">{selectedType === RideType.DELIVERY ? 'PICKUP ADDRESS' : 'PICKUP'}</p>
                 <p className={`text-[11px] font-black leading-none ${pickup ? 'text-zinc-100' : 'text-zinc-700'}`}>{pickup?.name || "Where to pick from?"}</p>
              </div>
            </button>

            <button onClick={() => setShowLocationPicker('destination')} className="w-full bg-zinc-900/60 rounded-[1.8rem] p-5 flex items-start gap-4 text-left active:scale-[0.98] transition-all border border-white/5">
              <Target className={`w-5 h-5 ${selectedType === RideType.DELIVERY ? 'text-blue-500' : 'text-rose-500'} mt-1`} />
              <div className="flex-1 min-w-0">
                 <p className="text-[7px] font-black uppercase text-zinc-600 mb-1 tracking-widest leading-none">{selectedType === RideType.DELIVERY ? 'DELIVERY ADDRESS' : 'DROP LOCATION'}</p>
                 <p className={`text-[11px] font-black leading-none ${destination ? 'text-zinc-100' : 'text-zinc-700'}`}>{destination?.name || "Where to go?"}</p>
              </div>
            </button>
          </div>

          <div className="relative bg-zinc-900/60 rounded-[2.2rem] p-6 border border-white/5">
             <div className="flex items-center justify-between mb-3">
               <p className="text-[8px] font-black uppercase text-zinc-600 tracking-widest leading-none">INSTRUCTION / VOICE NOTE</p>
               {voiceNoteBase64 && <button onClick={() => setVoiceNoteBase64(null)} className="text-rose-500 active:scale-75 transition-transform"><Trash2 className="w-4 h-4" /></button>}
             </div>
             <div className="flex items-end gap-3">
                <textarea className="flex-1 bg-transparent border-none text-sm font-black text-zinc-100 outline-none transition-all resize-none h-20 placeholder:text-zinc-800 italic leading-snug" placeholder="Type instructions here..." value={description} onChange={(e) => setDescription(e.target.value)} />
                <div className="flex flex-col gap-2">
                  {voiceNoteBase64 && <button onClick={playRecordedNote} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#c1ff22] border border-[#c1ff22]/30 active:scale-90 transition-transform"><Play className="w-6 h-6 fill-current" /></button>}
                  <button onClick={isRecording ? stopRecording : startRecording} className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 ${isRecording ? 'bg-rose-500 animate-pulse text-white' : 'bg-[#c1ff22] text-black shadow-[#c1ff22]/20'}`}>{isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-6 h-6" />}</button>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-zinc-900/40 rounded-[2rem] p-5 border border-white/5 flex items-center gap-4 mb-4">
           <div className="w-12 h-12 bg-[#c1ff22] rounded-2xl flex items-center justify-center text-black font-extrabold text-lg italic shadow-md">Rs</div>
           <div className="flex-1">
              <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest block mb-1.5">Proposed Fare (Negotiable)</label>
              <input type="number" className="bg-transparent w-full text-3xl outline-none font-black text-zinc-100 italic tracking-tight leading-none" value={fare} onChange={(e) => setFare(e.target.value)} />
           </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black via-black/90 to-transparent z-[140]">
        <button onClick={handleSubmitRequest} disabled={isSubmittingRequest || !destination || !pickup} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2.2rem] font-black text-xl uppercase shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-30 italic tracking-tight">
          {isSubmittingRequest ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Zap className="w-6 h-6 fill-current" /><span>{selectedType === RideType.DELIVERY ? 'PLACE DELIVERY ORDER' : 'REQUEST EDRIVE'}</span></>}
        </button>
      </div>

      {showMenu && (
        <div className="fixed inset-0 z-[1000] animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={() => setShowMenu(false)} />
          <div className="relative h-full w-full max-w-[280px] bg-zinc-950 flex flex-col p-8 animate-in slide-in-from-left duration-500 shadow-2xl">
            {/* Branded Header */}
            <div className="flex justify-between items-center mb-12">
               <div className="flex items-center gap-3">
                  <div className="bg-[#c1ff22] w-10 h-10 rounded-xl flex items-center justify-center text-black font-black italic transform -skew-x-6 text-xl shadow-lg">e</div>
                  <h1 className="text-2xl font-black italic uppercase tracking-tighter text-white">eDrive</h1>
               </div>
               <button onClick={() => setShowMenu(false)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"><X className="w-6 h-6 text-white" /></button>
            </div>

            {/* Profile Section */}
            <div className="mb-10 group cursor-pointer" onClick={() => { setShowMenu(false); onOpenProfile(); }}>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#c1ff22]/30 shadow-lg group-active:scale-95 transition-transform shrink-0">
                  <img src={userProfile.profilePic} className="w-full h-full object-cover" alt="Profile" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-black text-lg uppercase italic tracking-tight text-white truncate leading-none">
                    {userProfile.name} {userProfile.lastName}
                  </h2>
                  <p className="text-[9px] font-bold text-[#c1ff22] uppercase tracking-[0.2em] mt-1.5 opacity-70 italic leading-none">Citizen Profile</p>
                </div>
              </div>
            </div>

            {/* Navigation Menus - Larger Sizes */}
            <nav className="flex-1 space-y-6">
              <button onClick={() => { setShowMenu(false); onOpenHistory(); }} className="w-full flex items-center gap-5 py-2 text-zinc-400 hover:text-[#c1ff22] transition-colors group">
                <History className="w-7 h-7 group-hover:scale-110 transition-transform" />
                <span className="font-black text-base uppercase italic tracking-tighter">Ride History</span>
              </button>
              
              <button onClick={() => { setShowMenu(false); setShowSupportForm(true); }} className="w-full flex items-center gap-5 py-2 text-zinc-400 hover:text-[#c1ff22] transition-colors group">
                <LifeBuoy className="w-7 h-7 group-hover:scale-110 transition-transform" />
                <span className="font-black text-base uppercase italic tracking-tighter">Live Support</span>
              </button>

              {userProfile.driverStatus === 'approved' ? (
                <button onClick={() => { setShowMenu(false); onSwitchToDriver?.(); }} className="w-full flex items-center gap-5 py-2 text-[#c1ff22] transition-colors group">
                  <RefreshCcw className="w-7 h-7 group-hover:rotate-180 transition-transform duration-500" />
                  <span className="font-black text-base uppercase italic tracking-tighter">Captain Dashboard</span>
                </button>
              ) : (
                <button 
                  onClick={() => { setShowMenu(false); onOpenDriverOnboarding(); }} 
                  className="w-full flex items-center gap-5 p-5 bg-[#c1ff22] rounded-[1.8rem] text-black shadow-xl shadow-[#c1ff22]/10 active:scale-95 transition-all group mt-4"
                >
                  <UserPlus className="w-6 h-6" />
                  <span className="font-black text-base uppercase italic tracking-tighter">Become Partner</span>
                </button>
              )}
            </nav>

            {/* Logout Footer */}
            <div className="pt-6 border-t border-white/5">
              <button onClick={() => onLogout()} className="w-full bg-rose-500/10 text-rose-500 py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.2em] border border-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-3">
                Sign Out from HQ
              </button>
              <p className="text-[7px] font-black text-zinc-800 text-center mt-6 uppercase tracking-[0.4em]">Hafizabad Fleet v1.1</p>
            </div>
          </div>
        </div>
      )}

      {showSupportForm && (
        <div className="fixed inset-0 z-[2000] bg-[#0c0c0c] flex flex-col animate-in slide-in-from-bottom duration-300">
           <header className="p-6 pt-12 flex items-center justify-between border-b border-white/5 bg-zinc-900/40">
              <div className="flex items-center gap-4"><LifeBuoy className="w-6 h-6 text-[#c1ff22]" /><h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Support</h3></div>
              <button onClick={() => setShowSupportForm(false)} className="p-3 bg-white/5 rounded-2xl"><X className="w-6 h-6 text-white" /></button>
           </header>
           <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                  <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Subject</label>
                  <input className="bg-transparent w-full outline-none text-white font-bold" placeholder="Subject..." value={complaintForm.subject} onChange={e => setComplaintForm({...complaintForm, subject: e.target.value})} />
              </div>
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                  <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Message</label>
                  <textarea className="bg-transparent w-full outline-none text-white font-bold h-32 resize-none" placeholder="Message details..." value={complaintForm.message} onChange={e => setComplaintForm({...complaintForm, message: e.target.value})} />
              </div>
              <button onClick={submitComplaint} disabled={isSubmittingComplaint} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                {isSubmittingComplaint ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Support Ticket'}
              </button>
           </div>
        </div>
      )}

      {showLocationPicker && (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
          <header className="p-5 pt-12 flex flex-col gap-5 border-b border-white/5">
            <div className="flex items-center justify-between"><h3 className="text-2xl font-extrabold uppercase italic tracking-tight text-zinc-100">Select <span className="text-[#c1ff22]">Area</span></h3><button onClick={() => { setShowLocationPicker(null); setLocationSearch(""); }} className="p-2 bg-white/5 rounded-full"><X className="w-6 h-6 text-white" /></button></div>
            <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700" /><input autoFocus className="w-full bg-zinc-900 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-semibold text-white outline-none focus:border-[#c1ff22]/40 transition-all" placeholder="Search area..." value={locationSearch} onChange={e => setLocationSearch(e.target.value)} /></div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
             {allLocations.filter(l => (l.name || "").toLowerCase().includes(locationSearch.toLowerCase())).map(loc => (
               <button key={loc.id} onClick={() => { const data = { address: loc.name, name: loc.name, city: 'Hafizabad', area: loc.name, lat: loc.lat, lng: loc.lng }; if (showLocationPicker === 'pickup') setPickup(data); else setDestination(data); setShowLocationPicker(null); setLocationSearch(""); }} className="w-full bg-zinc-900/30 p-4 rounded-2xl border border-white/5 flex items-center justify-between active:scale-98 transition-all">
                 <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-[#c1ff22]"><MapPin className="w-5 h-5" /></div><div className="text-left"><p className="text-xs font-black text-zinc-100 leading-none">{loc.name}</p><p className="text-[7px] font-bold text-zinc-600 uppercase tracking-widest mt-1">{loc.category}</p></div></div><ChevronRight className="w-4 h-4 text-zinc-800" />
               </button>
             ))}
             {allLocations.filter(l => (l.name || "").toLowerCase().includes(locationSearch.toLowerCase())).length === 0 && (
                <div className="py-20 text-center opacity-20">
                   <MapPin className="w-10 h-10 mx-auto mb-2" />
                   <p className="text-[10px] font-black uppercase tracking-widest">No matching areas found</p>
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeScreen;
