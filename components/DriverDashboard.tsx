
import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, Wallet, Power, RefreshCcw, Loader2, Phone, LogOut, Car, Star, X, Zap, 
  Send, MapPin, Target, Navigation, MessageCircle, MessageSquare, Play, Pause, 
  Volume2, Mic, Award, ShieldCheck, CheckCircle2, Clock, Box, Info, Calendar, 
  ChevronLeft, ChevronRight, Filter, History, Landmark, Check, AlertCircle, EyeOff, Trash2, ThumbsDown, Banknote, Package
} from 'lucide-react';
import { UserProfile, RealtimeRideRequest, RideType } from '../types';
import { RIDE_OPTIONS } from '../constants';
import AdBannerOverlay from './AdBannerOverlay';
import ChatOverlay from './ChatOverlay';
import RatingOverlay from './RatingOverlay';
import ReviewDisplayOverlay from './ReviewDisplayOverlay';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs, orderBy, limit } from 'firebase/firestore';

interface DriverDashboardProps {
  userProfile: UserProfile;
  onLogout: () => void;
  onSwitchToUser: () => void;
}

const DRIVER_CANCEL_REASONS = [
  "PASSENGER NOT RESPONDING",
  "VEHICLE ISSUE / ACCIDENT",
  "TOO FAR FROM PICKUP",
  "WRONG PICKUP LOCATION",
  "SAFETY CONCERNS",
  "PERSONAL EMERGENCY"
];

const sanitizeRide = (id: string, data: any): RealtimeRideRequest => {
  return {
    id,
    passenger_id: String(data.passenger_id || ""),
    passenger_name: String(data.passenger_name || ""),
    passenger_image: String(data.passenger_image || ""),
    pickup_address: String(data.pickup_address || ""),
    dest_address: String(data.dest_address || ""),
    pickup_lat: Number(data.pickup_lat || 0),
    pickup_lng: Number(data.pickup_lng || 0),
    dest_lat: Number(data.dest_lat || 0),
    dest_lng: Number(data.dest_lng || 0),
    base_fare: Number(data.base_fare || 0),
    final_fare: data.final_fare ? Number(data.final_fare) : undefined,
    ride_type: data.ride_type as RideType,
    delivery_category: data.delivery_category ? String(data.delivery_category) : undefined,
    status: data.status,
    driver_id: data.driver_id ? String(data.driver_id) : undefined,
    driver_name: data.driver_name ? String(data.driver_name) : undefined,
    driver_image: data.driver_image ? String(data.driver_image) : undefined,
    vehicle_image: data.vehicle_image ? String(data.vehicle_image) : undefined,
    vehicle_model: data.vehicle_model ? String(data.vehicle_model) : undefined,
    vehicle_number: data.vehicle_number ? String(data.vehicle_number) : undefined,
    vehicle_color: data.vehicle_color ? String(data.vehicle_color) : undefined,
    created_at: String(data.created_at || ""),
    arrived_at: data.arrived_at ? String(data.arrived_at) : undefined,
    started_at: data.started_at ? String(data.started_at) : undefined,
    completed_at: data.completed_at ? String(data.completed_at) : undefined,
    cancel_reason: data.cancel_reason ? String(data.cancel_reason) : undefined,
    instruction_text: data.instruction_text ? String(data.instruction_text) : undefined,
    voice_note_base64: data.voice_note_base64 ? String(data.voice_note_base64) : undefined,
  } as RealtimeRideRequest;
};

const DriverDashboard: React.FC<DriverDashboardProps> = ({ userProfile, onLogout, onSwitchToUser }) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'wallet'>('feed');
  const [isOnline, setIsOnline] = useState(true);
  const [requests, setRequests] = useState<RealtimeRideRequest[]>([]);
  const [skippedRideIds, setSkippedRideIds] = useState<Set<string>>(new Set());
  const [selectedRide, setSelectedRide] = useState<RealtimeRideRequest | null>(null);
  const [offerFare, setOfferFare] = useState("");
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [activeOngoingRide, setActiveOngoingRide] = useState<RealtimeRideRequest | null>(null);
  const [rideToRate, setRideToRate] = useState<RealtimeRideRequest | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [reviewViewer, setReviewViewer] = useState<{ id: string, name: string, pic?: string } | null>(null);
  
  // Wallet & History States
  const [rideHistory, setRideHistory] = useState<RealtimeRideRequest[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | null>(null);

  const feedAudioRef = useRef<HTMLAudioElement | null>(null);
  const [activeFeedAudioId, setActiveFeedAudioId] = useState<string | null>(null);

  useEffect(() => {
    const partnerId = userProfile.uid || userProfile.email;
    
    // Ongoing Ride Listener
    const qOngoing = query(
      collection(db, 'ride_requests'),
      where('status', 'in', ['accepted', 'arrived', 'ongoing']),
      where('driver_id', '==', partnerId)
    );
    const unsubOngoing = onSnapshot(qOngoing, (snap) => {
      if (!snap.empty) {
        const activeRide = sanitizeRide(snap.docs[0].id, snap.docs[0].data());
        setActiveOngoingRide(activeRide);
      } else {
        setActiveOngoingRide(null);
        setShowCancelModal(false);
      }
    });

    // History Listener (Completed)
    const qHistory = query(
      collection(db, 'ride_requests'),
      where('status', '==', 'completed'),
      where('driver_id', '==', partnerId)
    );
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      const history = snap.docs.map(d => sanitizeRide(d.id, d.data()));
      setRideHistory(history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    });

    if (isOnline) {
      const driverVehicleType = userProfile.vehicleType || RideType.MOTO;
      const rideTypesToWatch = (driverVehicleType === RideType.MOTO) ? [RideType.MOTO, RideType.DELIVERY] : [driverVehicleType];
      const qReq = query(collection(db, 'ride_requests'), where('status', '==', 'pending'), where('ride_type', 'in', rideTypesToWatch));
      const unsubReq = onSnapshot(qReq, (snap) => {
        setRequests(snap.docs.map(d => sanitizeRide(d.id, d.data())).filter(r => !skippedRideIds.has(r.id)));
      });
      return () => { unsubOngoing(); unsubHistory(); unsubReq(); };
    }

    return () => { unsubOngoing(); unsubHistory(); };
  }, [isOnline, userProfile.vehicleType, userProfile.uid, userProfile.email, skippedRideIds]);

  useEffect(() => {
    if (!activeOngoingRide) return;
    const qChat = query(collection(db, 'ride_chat'), where('request_id', '==', activeOngoingRide.id));
    const unsubChat = onSnapshot(qChat, (snap) => {
      setUnreadCount(snap.docs.filter(d => d.data().sender_id !== userProfile.email && !showChat).length);
    });
    return () => unsubChat();
  }, [activeOngoingRide?.id, showChat, userProfile.email]);

  const handleSendOffer = async () => {
    if (!selectedRide || !offerFare || isSubmittingOffer) return;
    setIsSubmittingOffer(true);
    try {
      await addDoc(collection(db, 'ride_offers'), {
        request_id: selectedRide.id,
        driver_id: userProfile.uid || userProfile.email,
        driver_name: userProfile.name,
        driver_image: userProfile.profilePic,
        driver_age: userProfile.age || "32",
        driver_completed_rides: rideHistory.length + 12,
        offer_fare: parseInt(offerFare),
        driver_rating: 4.9,
        vehicle_model: userProfile.vehicleModel || "",
        vehicle_number: userProfile.vehicleNumber || "",
        vehicle_color: userProfile.vehicleColor || "",
        vehicle_image: userProfile.vehicleImage || "",
        vehicle_type: userProfile.vehicleType || RideType.MOTO,
        created_at: new Date().toISOString()
      });
      setSelectedRide(null);
      setOfferFare("");
    } catch (err) { alert("Failed to send bid."); } finally { setIsSubmittingOffer(false); }
  };

  const handleAction = async () => {
    if (!activeOngoingRide?.id) return;
    setIsActionLoading(true);
    try {
      if (activeOngoingRide.ride_type === RideType.DELIVERY) {
        const nextStatus = activeOngoingRide.status === 'accepted' ? 'arrived' : 'ongoing';
        await updateDoc(doc(db, 'ride_requests', activeOngoingRide.id), { 
          status: nextStatus, 
          [`${nextStatus}_at`]: new Date().toISOString() 
        });
      } else {
        await updateDoc(doc(db, 'ride_requests', activeOngoingRide.id), { 
          status: 'arrived', 
          arrived_at: new Date().toISOString() 
        });
      }
    } catch (e) { alert("Update error."); } finally { setIsActionLoading(false); }
  };

  const submitCancellation = async () => {
    if (!activeOngoingRide?.id || !selectedCancelReason || isActionLoading) return;
    setIsActionLoading(true);
    try {
      await updateDoc(doc(db, 'ride_requests', activeOngoingRide.id), { 
        status: 'cancelled', 
        cancel_reason: selectedCancelReason 
      });
      setShowCancelModal(false);
      setSelectedCancelReason(null);
      setActiveOngoingRide(null);
    } catch (err) { alert("Cancellation error."); } finally { setIsActionLoading(false); }
  };

  const handleComplete = async () => {
    if (!activeOngoingRide?.id) return;
    setIsActionLoading(true);
    try {
      const requestId = activeOngoingRide.id;
      const rideDataForRating = { ...activeOngoingRide };
      await updateDoc(doc(db, 'ride_requests', requestId), {
        status: 'completed',
        completed_at: new Date().toISOString()
      });
      setRideToRate(rideDataForRating);
      setShowRating(true);
      setActiveOngoingRide(null);
    } catch (err) { alert("Completion error."); } finally { setIsActionLoading(false); }
  };

  const toggleFeedAudio = (id: string, base64: string) => {
    if (activeFeedAudioId === id) {
      feedAudioRef.current?.pause();
      setActiveFeedAudioId(null);
    } else {
      if (feedAudioRef.current) feedAudioRef.current.pause();
      feedAudioRef.current = new Audio(base64);
      feedAudioRef.current.onended = () => setActiveFeedAudioId(null);
      feedAudioRef.current.play();
      setActiveFeedAudioId(id);
    }
  };

  const filteredHistory = rideHistory.filter(ride => {
    const rideDate = new Date(ride.created_at).toISOString().split('T')[0];
    return rideDate === selectedDate;
  });

  const dailyEarning = filteredHistory.reduce((acc, ride) => acc + (ride.final_fare || ride.base_fare), 0);

  if (activeOngoingRide) {
    const isDelivery = activeOngoingRide.ride_type === RideType.DELIVERY;
    const status = activeOngoingRide.status;

    const deliveryLabels: Record<string, string> = {
      accepted: "I'm Picking the order.",
      arrived: "Picked up and on the way to you.",
      ongoing: "Arrived at your doorstep."
    };

    const deliveryButtonLabels: Record<string, string> = {
      accepted: "MARK AS PICKED UP",
      arrived: "MARK AS ARRIVED AT DOORSTEP",
      ongoing: "MARK AS DELIVERED"
    };

    return (
      <div className="flex flex-col h-full bg-[#080808] text-white overflow-hidden animate-in fade-in">
        <header className="px-5 pt-12 pb-4 border-b border-white/5 flex items-center justify-between bg-zinc-900/20">
           <div className="flex items-center gap-3">
              <img src={activeOngoingRide.passenger_image || 'https://via.placeholder.com/150'} className="w-10 h-10 rounded-xl object-cover border border-[#c1ff22]" />
              <div>
                <h2 className="text-[10px] font-black uppercase italic text-[#c1ff22] leading-none">
                  {isDelivery ? deliveryLabels[status] : status.toUpperCase()}
                </h2>
                <p className="text-[11px] font-bold text-white mt-1 uppercase truncate max-w-[140px]">{activeOngoingRide.passenger_name}</p>
              </div>
           </div>
           <button onClick={() => setShowChat(true)} className="relative p-3 bg-zinc-900 rounded-xl border border-white/5">
             <MessageCircle className="w-6 h-6 text-[#c1ff22]" />
             {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">{unreadCount}</span>}
           </button>
        </header>

        <main className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
           <div className="bg-[#111] p-5 rounded-[2.2rem] border border-white/5 space-y-5 shadow-xl">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#c1ff22] mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">PICKUP</p>
                    <p className="text-xs font-bold text-white italic leading-tight">{activeOngoingRide.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">DESTINATION</p>
                    <p className="text-xs font-bold text-white italic leading-tight">{activeOngoingRide.dest_address}</p>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">EXPECTED PAYMENT</span>
                <span className="text-2xl font-black text-[#c1ff22] italic tracking-tight">Rs {activeOngoingRide.final_fare || activeOngoingRide.base_fare}</span>
              </div>
           </div>

           <div className="grid grid-cols-[1fr_2fr] gap-3">
              <button onClick={() => window.location.href=`tel:${activeOngoingRide.passenger_id}`} className="bg-zinc-900 py-6 rounded-2xl flex items-center justify-center border border-white/5 active:scale-95 shadow-lg"><Phone className="w-6 h-6 text-[#c1ff22]" /></button>
              <button onClick={() => setShowCancelModal(true)} className="bg-zinc-900 py-6 rounded-2xl font-black text-[11px] text-[#c1ff22] border border-white/5 active:scale-95 uppercase tracking-widest italic shadow-lg flex items-center justify-center gap-3">
                <Trash2 className="w-4 h-4" /> CANCEL TRIP
              </button>
           </div>
        </main>

        <div className="p-4 pb-12">
           {isDelivery ? (
             <button onClick={status === 'ongoing' ? handleComplete : handleAction} disabled={isActionLoading} className="w-full bg-[#c1ff22] text-black py-7 rounded-[2.2rem] font-black uppercase text-lg shadow-[0_20px_40px_rgba(193,255,34,0.2)] active:scale-95 flex items-center justify-center gap-3 italic tracking-tight">
                {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : deliveryButtonLabels[status]}
             </button>
           ) : (
             <>
               {status === 'accepted' && (
                 <button onClick={handleAction} disabled={isActionLoading} className="w-full bg-[#c1ff22] text-black py-7 rounded-[2.2rem] font-black uppercase text-lg shadow-[0_20px_40px_rgba(193,255,34,0.2)] active:scale-95 flex items-center justify-center gap-3 italic tracking-tight">
                    {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "I've arrived, start Ride?"}
                 </button>
               )}
               {status === 'arrived' && (
                 <div className="w-full bg-zinc-900 border border-white/5 p-5 rounded-[2.2rem] flex flex-col items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-[#c1ff22]" />
                    <span className="text-[#c1ff22] font-black uppercase italic text-sm">Waiting for passenger...</span>
                    <p className="text-[9px] font-black text-zinc-600 uppercase">Ask them to tap "YES, START"</p>
                 </div>
               )}
               {status === 'ongoing' && (
                 <button onClick={handleComplete} disabled={isActionLoading} className="w-full bg-[#c1ff22] text-black py-7 rounded-[2.2rem] font-black uppercase text-lg shadow-[0_20px_40px_rgba(193,255,34,0.2)] active:scale-95 flex items-center justify-center gap-3 italic tracking-tight">
                   {isActionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Finish Ride & Collect cash"}
                 </button>
               )}
             </>
           )}
        </div>
        
        {showChat && <ChatOverlay requestId={activeOngoingRide.id} currentUserEmail={userProfile.email} otherPartyName={activeOngoingRide.passenger_name} onClose={() => setShowChat(false)} />}
        {showCancelModal && (
          <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#1a1a1a] rounded-[2.5rem] p-10 space-y-8 relative border border-white/5 shadow-2xl">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter">CANCEL <span className="text-rose-500 italic">TRIP?</span></h3>
              <div className="space-y-2.5">
                {DRIVER_CANCEL_REASONS.map(reason => (
                  <button key={reason} onClick={() => setSelectedCancelReason(reason)} className={`w-full p-5 rounded-2xl text-center font-black uppercase text-[10px] tracking-widest transition-all ${selectedCancelReason === reason ? 'bg-[#c1ff22] text-black shadow-lg scale-105' : 'bg-zinc-900 text-zinc-500'}`}>{reason}</button>
                ))}
              </div>
              <button onClick={submitCancellation} disabled={!selectedCancelReason || isActionLoading} className={`w-full py-7 rounded-[2.2rem] font-black uppercase text-sm shadow-2xl flex items-center justify-center gap-3 italic transition-all active:scale-95 ${selectedCancelReason ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-700'}`}>{isActionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CONFIRM CANCELLATION'}</button>
              <button onClick={() => setShowCancelModal(false)} className="w-full text-[10px] font-black uppercase text-zinc-500 tracking-widest py-2">Go Back</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white">
      <header className="p-6 pt-12 flex flex-col gap-5 border-b border-white/5 bg-black/40 shadow-xl shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <img src={userProfile.profilePic} className="w-12 h-12 rounded-2xl border-2 border-[#c1ff22] object-cover" />
             <div>
               <h2 className="text-sm font-bold text-white leading-none">{userProfile.name}</h2>
               <p className="text-[9px] font-medium text-zinc-500 mt-1 uppercase tracking-wider">Hafizabad Captain</p>
             </div>
          </div>
          <button onClick={() => setIsOnline(!isOnline)} className={`p-4 rounded-2xl transition-all active:scale-90 ${isOnline ? 'bg-[#c1ff22] text-black shadow-lg' : 'bg-zinc-900 text-zinc-600'}`}><Power className="w-6 h-6" /></button>
        </div>
        <button onClick={onSwitchToUser} className="w-full bg-zinc-900/50 py-4 rounded-2xl text-zinc-400 font-black uppercase text-[10px] italic flex items-center justify-center gap-3 border border-white/5 active:bg-white/5"><RefreshCcw className="w-4 h-4" /> Switch to Customer Mode</button>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {activeTab === 'feed' ? (
          <div className="p-4 space-y-4 animate-in fade-in">
             {!isOnline ? (
               <div className="flex flex-col items-center justify-center py-20 opacity-40"><Power className="w-12 h-12 mb-4" /><p className="text-[11px] font-black uppercase tracking-widest">Go Online to See Feed</p></div>
             ) : requests.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 opacity-30"><Loader2 className="w-10 h-10 animate-spin mb-4" /><p className="text-[11px] font-black uppercase tracking-widest italic">Scanning Hafizabad...</p></div>
             ) : (
               requests.map(req => (
                 <div key={req.id} className="bg-zinc-900/80 rounded-[2.2rem] p-6 border border-white/5 space-y-5 shadow-xl animate-in slide-in-from-bottom">
                    <div className="flex justify-between items-start">
                       <button onClick={() => setReviewViewer({ id: req.passenger_id, name: req.passenger_name, pic: req.passenger_image })} className="flex items-center gap-3 text-left active:scale-95 transition-transform">
                          <img src={req.passenger_image || userProfile.profilePic} className="w-12 h-12 rounded-xl object-cover border border-zinc-800" />
                          <div>
                            <h4 className="font-black text-white text-sm uppercase italic leading-none">{req.passenger_name}</h4>
                            <p className="text-[8px] font-black text-[#c1ff22] uppercase tracking-widest mt-1.5 underline">Read Client Reviews</p>
                          </div>
                       </button>
                       <p className="text-xl font-black text-[#c1ff22] italic">Rs {req.base_fare}</p>
                    </div>

                    {req.ride_type === RideType.DELIVERY && (
                      <div className="bg-gradient-to-r from-blue-600/20 to-cyan-500/20 px-5 py-3 rounded-2xl border border-blue-500/20 flex items-center gap-3">
                         <Package className="w-4 h-4 text-cyan-400" />
                         <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">DELIVERY ORDER <span className="text-cyan-400 ml-1">&gt; {req.delivery_category}</span></span>
                      </div>
                    )}

                    <div className="space-y-3">
                       <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-[#c1ff22] mt-0.5" /><p className="text-[12px] font-bold leading-tight">{req.pickup_address}</p></div>
                       <div className="flex items-start gap-3"><Target className="w-4 h-4 text-rose-500 mt-0.5" /><p className="text-[12px] font-bold leading-tight">{req.dest_address}</p></div>
                    </div>
                    {(req.instruction_text || req.voice_note_base64) && (
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5 space-y-3">
                         <p className="text-[7px] font-black uppercase text-zinc-600 tracking-[0.2em]">Client Note</p>
                         {req.instruction_text && <p className="text-[11px] font-medium text-zinc-400 italic line-clamp-2">"{req.instruction_text}"</p>}
                         {req.voice_note_base64 && <button onClick={() => toggleFeedAudio(req.id, req.voice_note_base64!)} className="flex items-center gap-3 w-full p-3 rounded-xl text-[9px] font-black uppercase border border-[#c1ff22]/20 text-[#c1ff22] transition-all active:scale-95 bg-[#c1ff22]/5"><Play className="w-3.5 h-3.5 fill-current" /> {activeFeedAudioId === req.id ? 'Playing...' : 'Play Voice Note'}</button>}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setSkippedRideIds(prev => new Set(prev).add(req.id))} className="bg-zinc-800 text-zinc-500 py-6 rounded-2xl font-black uppercase text-[10px] active:scale-95 italic">SKIP</button>
                      <button onClick={() => { setSelectedRide(req); setOfferFare(req.base_fare.toString()); }} className="bg-[#c1ff22] text-black py-6 rounded-2xl font-black uppercase text-[10px] active:scale-95 italic tracking-widest shadow-lg">SUBMIT BID</button>
                    </div>
                 </div>
               ))
             )}
          </div>
        ) : (
          <div className="p-4 space-y-6 animate-in fade-in">
             <div className="bg-[#111] p-8 rounded-[3rem] border border-white/5 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp className="w-24 h-24" /></div>
                <p className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.3em]">DAILY EARNING</p>
                <h3 className="text-5xl font-black text-[#c1ff22] italic mt-2 tracking-tighter leading-none">Rs {dailyEarning}</h3>
                <div className="flex items-center gap-2 mt-6">
                   <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                      <Calendar className="w-5 h-5 text-[#c1ff22]" />
                      <input 
                        type="date" 
                        className="bg-transparent flex-1 outline-none text-xs font-black uppercase text-white" 
                        value={selectedDate} 
                        onChange={e => setSelectedDate(e.target.value)} 
                      />
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                   <h4 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">RIDE HISTORY ({filteredHistory.length})</h4>
                   <div className="flex gap-2">
                      <div className={`w-2 h-2 rounded-full ${filteredHistory.length > 0 ? 'bg-green-500' : 'bg-rose-500'}`} />
                   </div>
                </div>
                
                {filteredHistory.length === 0 ? (
                  <div className="py-20 text-center opacity-20 flex flex-col items-center">
                    <History className="w-12 h-12 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No rides on this date</p>
                  </div>
                ) : (
                  filteredHistory.map(ride => (
                    <div key={ride.id} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 flex items-center justify-between shadow-xl">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6 text-[#c1ff22]" /></div>
                          <div>
                             <h5 className="text-[12px] font-bold text-white uppercase italic leading-none">{ride.passenger_name}</h5>
                             <p className="text-[9px] font-medium text-zinc-500 mt-1.5 uppercase truncate max-w-[150px]">{ride.dest_address}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className="text-lg font-black text-white italic leading-none">Rs {ride.final_fare || ride.base_fare}</p>
                          <p className="text-[7px] font-black text-zinc-700 uppercase mt-1.5">{new Date(ride.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        )}
      </main>

      {selectedRide && (
        <div className="fixed inset-0 z-[500] bg-black/95 flex items-center justify-center p-6 animate-in fade-in">
           <div className="w-full max-sm bg-zinc-950 border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl animate-in zoom-in">
              <div className="flex justify-between items-center">
                 <h3 className="text-2xl font-black italic uppercase leading-none">Your <span className="text-[#c1ff22]">Bid</span></h3>
                 <button onClick={() => setSelectedRide(null)} className="p-3 bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <div className="bg-zinc-900 p-8 rounded-[2.2rem] border border-white/10 text-center">
                 <label className="text-[9px] font-black uppercase text-zinc-600 block mb-2">Offer Fare (Rs)</label>
                 <input type="number" className="bg-transparent w-full text-5xl font-black outline-none text-[#c1ff22] text-center italic" value={offerFare} onChange={e => setOfferFare(e.target.value)} autoFocus />
              </div>
              <button onClick={handleSendOffer} disabled={isSubmittingOffer} className="w-full bg-[#c1ff22] text-black py-7 rounded-[2.2rem] font-black uppercase shadow-2xl flex items-center justify-center gap-3 active:scale-95 italic text-lg">{isSubmittingOffer ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Confirm Offer'}</button>
           </div>
        </div>
      )}

      {reviewViewer && <ReviewDisplayOverlay userId={reviewViewer.id} userName={reviewViewer.name} userPic={reviewViewer.pic} onClose={() => setReviewViewer(null)} />}
      
      {showRating && rideToRate && (
        <RatingOverlay 
          rideId={rideToRate.id} 
          reviewerId={userProfile.uid || userProfile.email} 
          revieweeId={rideToRate.passenger_id} 
          revieweeName={rideToRate.passenger_name} 
          revieweePic={rideToRate.passenger_image} 
          isDriverReviewing={true} 
          rideType={rideToRate.ride_type} 
          onClose={() => { setShowRating(false); setRideToRate(null); }} 
        />
      )}

      <footer className="fixed bottom-0 left-0 right-0 bg-black/95 border-t border-white/5 p-4 flex justify-around pb-12 z-40">
         <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'feed' ? 'text-[#c1ff22] scale-110' : 'text-zinc-800'}`}><TrendingUp className="w-7 h-7" /><span className="text-[9px] font-black uppercase">Feed</span></button>
         <button onClick={() => setActiveTab('wallet')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'wallet' ? 'text-[#c1ff22] scale-110' : 'text-zinc-800'}`}><Wallet className="w-7 h-7" /><span className="text-[9px] font-black uppercase">Wallet</span></button>
         <button onClick={onLogout} className="flex flex-col items-center gap-1.5 text-rose-500/40 active:scale-95"><LogOut className="w-7 h-7" /><span className="text-[9px] font-black uppercase tracking-widest">Exit</span></button>
      </footer>
    </div>
  );
};

export default DriverDashboard;
