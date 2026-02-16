
import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Star, ShieldCheck, MessageSquare, Phone, Sparkles, ThumbsUp, ThumbsDown, Car, MessageCircleCode, Shield, Check, Share2, AlertCircle, Info } from 'lucide-react';
import { UserProfile, RealtimeRideRequest, RideType } from '../types';
import MapContainer from './MapContainer';
import RatingOverlay from './RatingOverlay';
import ReviewDisplayOverlay from './ReviewDisplayOverlay';
import ChatOverlay from './ChatOverlay';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface Offer {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_image: string;
  driver_age?: string;
  driver_completed_rides?: number;
  offer_fare: number;
  rating: number;
  vehicle_model: string;
  vehicle_number: string;
  vehicle_color: string;
  vehicle_image: string;
  vehicle_type: RideType;
}

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

interface SearchingScreenProps {
  requestId: string;
  userProfile: UserProfile;
  onCancel: () => void;
}

const CANCEL_REASONS = [
  "CHANGED MY MIND",
  "DRIVER TAKING TOO LONG",
  "FARE IS TOO HIGH",
  "DRIVER ASKED TO CANCEL",
  "FOUND ANOTHER RIDE"
];

// Sanitization utility to convert Firestore data to plain primitives
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

const SearchingScreen: React.FC<SearchingScreenProps> = ({ requestId, userProfile, onCancel }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [rideData, setRideData] = useState<RealtimeRideRequest | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedCancelReason, setSelectedCancelReason] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reviewViewer, setReviewViewer] = useState<{ id: string, name: string, pic?: string } | null>(null);
  const [fullVehicleImage, setFullVehicleImage] = useState<string | null>(null);
  const [showFullChat, setShowFullChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const bellAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bellAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    bellAudio.current.volume = 0.6;
  }, []);

  useEffect(() => {
    if (!requestId) return;

    const offersQuery = query(collection(db, 'ride_offers'), where('request_id', '==', requestId));
    const unsubOffers = onSnapshot(offersQuery, (snap) => {
      const newOffers = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          driver_id: String(data.driver_id || ""),
          driver_name: String(data.driver_name || "Captain"),
          driver_image: String(data.driver_image || ""),
          driver_age: String(data.driver_age || "N/A"),
          driver_completed_rides: Number(data.driver_completed_rides || 0),
          offer_fare: Number(data.offer_fare || 0),
          rating: Number(data.driver_rating || data.rating || 4.9),
          vehicle_model: String(data.vehicle_model || "Vehicle"),
          vehicle_number: String(data.vehicle_number || "N/A"),
          vehicle_color: String(data.vehicle_color || "N/A"),
          vehicle_image: String(data.vehicle_image || ""),
          vehicle_type: (data.vehicle_type as RideType) || RideType.MOTO
        } as Offer;
      });
      setOffers(newOffers.sort((a, b) => a.offer_fare - b.offer_fare));
    });

    const unsubRequest = onSnapshot(doc(db, 'ride_requests', requestId), (snap) => {
      if (!snap.exists()) {
         onCancel();
         return;
      }
      const data = snap.data();
      const ride = sanitizeRide(snap.id, data);
      setRideData(ride);
      if (ride.status === 'cancelled') onCancel();
      if (ride.status === 'completed' && !showRating && ride.completed_at) {
        const completedTime = new Date(ride.completed_at).getTime();
        if (new Date().getTime() - completedTime < 15000) setShowRating(true);
        else onCancel();
      }
    });

    const qChat = query(collection(db, 'ride_chat'), where('request_id', '==', requestId));
    const unsubChat = onSnapshot(qChat, (snap) => {
      const msgs = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          sender_id: String(data.sender_id || ""),
          text: String(data.text || ""),
          created_at: String(data.created_at || "")
        };
      });
      setMessages(msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    });

    return () => { unsubOffers(); unsubRequest(); unsubChat(); };
  }, [requestId, onCancel, showRating]);

  const handleAccept = async (offer: Offer) => {
    try {
      await updateDoc(doc(db, 'ride_requests', requestId), {
        status: 'accepted',
        driver_id: offer.driver_id,
        driver_name: offer.driver_name,
        driver_image: offer.driver_image,
        final_fare: offer.offer_fare,
        vehicle_model: offer.vehicle_model,
        vehicle_number: offer.vehicle_number,
        vehicle_color: offer.vehicle_color,
        vehicle_image: offer.vehicle_image
      });
    } catch (err) { alert("Failed to accept offer."); }
  };

  const submitCancellation = async () => {
    if (!selectedCancelReason || isCancelling) return;
    setIsCancelling(true);
    try {
      await updateDoc(doc(db, 'ride_requests', requestId), {
        status: 'cancelled',
        cancel_reason: selectedCancelReason
      });
      setShowCancelModal(false);
      onCancel();
    } catch (err) { alert("Cancellation failed."); } finally { setIsCancelling(false); }
  };

  const callEmergency = () => { window.location.href = "tel:15"; };

  const startTrip = async () => {
    try {
      await updateDoc(doc(db, 'ride_requests', requestId), { 
        status: 'ongoing', 
        started_at: new Date().toISOString() 
      });
    } catch (err) { alert("Failed to start ride."); }
  };

  if (rideData && rideData.status === 'arrived' && rideData.ride_type !== RideType.DELIVERY) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in fade-in overflow-hidden">
        <style>{`
          @keyframes screen-shake { 0%, 100% { transform: translateX(0); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); } 20%, 40%, 60%, 80% { transform: translateX(2px); } }
          @keyframes pop-up { 0% { transform: scale(0.8); opacity: 0; } 70% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
          .animate-screen-shake { animation: screen-shake 1.8s cubic-bezier(.36,.07,.19,.97) infinite; }
          .animate-pop-up { animation: pop-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}</style>

        <div className="flex-none p-6 pt-8 flex flex-col items-center gap-4">
          <div className="w-full bg-[#c1ff22] rounded-[3rem] p-6 flex flex-col items-center gap-4 shadow-[0_20px_50px_rgba(193,255,34,0.25)] border-4 border-black animate-screen-shake">
             <div className="w-full h-36 bg-black rounded-[2rem] overflow-hidden border-2 border-black/10 shadow-inner flex items-center justify-center">
                {rideData.vehicle_image ? (
                  <img src={rideData.vehicle_image} className="w-full h-full object-cover" />
                ) : (
                  <Car className="w-16 h-16 text-[#c1ff22]" />
                )}
             </div>
             <div className="text-center">
                <h2 className="text-xl font-black italic uppercase leading-none text-black">Captain has arrived! <br/> START RIDE?</h2>
                <p className="text-[10px] font-black uppercase text-black/60 mt-2 tracking-widest leading-none">
                  {rideData.vehicle_model || 'Vehicle'} • {rideData.vehicle_color || ''}
                </p>
                <p className="text-[9px] font-bold text-black/40 uppercase mt-1 tracking-tighter leading-none">{rideData.vehicle_number}</p>
             </div>
          </div>

          <div className="w-full space-y-3 px-2">
             <button onClick={startTrip} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black uppercase text-lg shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all italic animate-pop-up">
                <ThumbsUp className="w-6 h-6" /> YES, START
             </button>
             <button onClick={() => setShowCancelModal(true)} className="w-full bg-zinc-900 text-zinc-500 py-4 rounded-[1.8rem] font-black uppercase text-[10px] flex items-center justify-center gap-3 active:scale-95 border border-white/5 italic">
                <ThumbsDown className="w-4 h-4" /> NO, CANCEL RIDE
             </button>
          </div>
        </div>

        <div className="px-8 flex justify-center gap-8 py-4">
           <button onClick={() => window.location.href=`tel:${rideData.driver_id}`} className="flex flex-col items-center gap-2 active:scale-90 transition-transform"><div className="w-14 h-14 bg-[#c1ff22]/10 rounded-2xl flex items-center justify-center border border-[#c1ff22]/20"><Phone className="w-6 h-6 text-[#c1ff22]" /></div><span className="text-[9px] font-black uppercase text-zinc-600">Call</span></button>
           <button onClick={() => setShowFullChat(true)} className="flex flex-col items-center gap-2 active:scale-90 transition-transform relative"><div className="w-14 h-14 bg-[#c1ff22]/10 rounded-2xl flex items-center justify-center border border-[#c1ff22]/20"><MessageSquare className="w-6 h-6 text-[#c1ff22]" /></div><span className="text-[9px] font-black uppercase text-zinc-600">Chat</span></button>
        </div>
        
        {showFullChat && <ChatOverlay requestId={requestId} currentUserEmail={userProfile.email} otherPartyName={rideData.driver_name || "Captain"} onClose={() => setShowFullChat(false)} />}
        {showCancelModal && (
          <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#1a1a1a] rounded-[2.5rem] p-10 space-y-8 relative border border-white/5">
              <h3 className="text-2xl font-black uppercase text-white">CANCEL <span className="text-rose-500 italic">RIDE?</span></h3>
              <div className="space-y-3">
                {CANCEL_REASONS.map(reason => (
                  <button key={reason} onClick={() => setSelectedCancelReason(reason)} className={`w-full p-5 rounded-2xl text-center font-black uppercase text-[10px] tracking-widest transition-all ${selectedCancelReason === reason ? 'bg-[#c1ff22] text-black' : 'bg-[#252525] text-zinc-500'}`}>{reason}</button>
                ))}
              </div>
              <button onClick={submitCancellation} disabled={!selectedCancelReason || isCancelling} className={`w-full py-7 rounded-[2rem] font-black uppercase text-sm shadow-2xl flex items-center justify-center gap-3 italic ${selectedCancelReason ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-700'}`}>{isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SUBMIT CANCELLATION'}</button>
              <button onClick={() => setShowCancelModal(false)} className="w-full text-[10px] font-black uppercase text-zinc-500 tracking-widest py-2">Go Back</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (rideData && ['accepted', 'ongoing', 'completed', 'arrived'].includes(rideData.status)) {
    const isDelivery = rideData.ride_type === RideType.DELIVERY;
    
    // Descriptive status labels for delivery
    const deliveryStatusLabels: Record<string, string> = {
      accepted: "I'm Picking the order.",
      arrived: "Picked up and on the way to you.",
      ongoing: "Arrived at your doorstep."
    };

    return (
      <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in fade-in overflow-hidden">
        <div className="h-[40%] w-full relative">
          <MapContainer drivers={[{ id: rideData.driver_id || 'capt', lat: 32.0711, lng: 73.6875, rotation: 0, type: rideData.ride_type }]} />
        </div>
        <div className="flex-1 bg-zinc-950 rounded-t-[3.5rem] -mt-10 relative p-8 flex flex-col shadow-2xl border-t border-white/5">
           <div className="flex justify-between items-center mb-8">
              <button onClick={() => setReviewViewer({ id: rideData.driver_id!, name: rideData.driver_name!, pic: rideData.driver_image })} className="flex items-center gap-4 text-left active:scale-95 transition-transform">
                 <img src={rideData.driver_image} className="w-16 h-16 rounded-2xl border-2 border-[#c1ff22] object-cover" />
                 <div>
                    <h3 className="font-black text-lg italic uppercase leading-none">{rideData.driver_name}</h3>
                    <p className="text-[10px] text-[#c1ff22] font-black uppercase tracking-widest mt-2">
                       {isDelivery ? deliveryStatusLabels[rideData.status] : rideData.status.toUpperCase()}
                    </p>
                 </div>
              </button>
              <div className="text-right">
                 <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Final Fare</p>
                 <p className="text-3xl font-black text-[#c1ff22] italic leading-none tracking-tight">Rs {rideData.final_fare || rideData.base_fare}</p>
              </div>
           </div>
           <div className="bg-zinc-900/60 p-5 rounded-[2rem] border border-white/5 flex items-center gap-5">
              <div className="w-20 h-14 bg-black rounded-2xl overflow-hidden border border-white/5" onClick={() => setFullVehicleImage(rideData.vehicle_image || null)}>
                 {rideData.vehicle_image ? <img src={rideData.vehicle_image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><Car className="w-7 h-7" /></div>}
              </div>
              <div className="flex-1">
                 <h4 className="text-[12px] font-bold text-white uppercase italic">{rideData.vehicle_model}</h4>
                 <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">{rideData.vehicle_color} • {rideData.vehicle_number}</p>
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4 mt-8">
              <button onClick={callEmergency} className="flex items-center justify-center gap-3 bg-rose-600/10 text-rose-500 py-5 rounded-3xl font-black uppercase text-[10px] border border-rose-600/20 active:scale-95 shadow-xl"><AlertCircle className="w-5 h-5" /> EMERGENCY 15</button>
              <button onClick={() => setShowCancelModal(true)} className="bg-zinc-900 text-zinc-500 py-5 rounded-3xl font-black uppercase text-[10px] border border-white/5 active:scale-95">Cancel Trip</button>
           </div>
           <div className="flex-1" />
           <div className="mt-auto grid grid-cols-2 gap-4 pb-10">
              <button onClick={() => window.location.href=`tel:${rideData.driver_id}`} className="bg-zinc-900 h-16 rounded-3xl flex items-center justify-center border border-white/5 active:scale-95 shadow-lg"><Phone className="text-[#c1ff22] w-6 h-6" /></button>
              <button onClick={() => setShowFullChat(true)} className="bg-zinc-900 h-16 rounded-3xl flex items-center justify-center border border-white/5 active:scale-95 relative shadow-lg">
                <MessageSquare className="text-[#c1ff22] w-6 h-6" />
                {messages.length > 0 && <div className="absolute top-5 right-7 w-2.5 h-2.5 bg-[#c1ff22] rounded-full border border-black animate-pulse" />}
              </button>
           </div>
        </div>
        {showFullChat && <ChatOverlay requestId={requestId} currentUserEmail={userProfile.email} otherPartyName={rideData.driver_name || "Captain"} onClose={() => setShowFullChat(false)} />}
        {reviewViewer && <ReviewDisplayOverlay userId={reviewViewer.id} userName={reviewViewer.name} userPic={reviewViewer.pic} onClose={() => setReviewViewer(null)} />}
        {showRating && <RatingOverlay rideId={requestId} reviewerId={userProfile.email} revieweeId={rideData?.driver_id || "captain"} revieweeName={rideData?.driver_name || "Captain"} revieweePic={rideData?.driver_image} isDriverReviewing={false} rideType={rideData.ride_type} onClose={() => { setShowRating(false); onCancel(); }} />}
        {showCancelModal && (
          <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#1a1a1a] rounded-[2.5rem] p-10 space-y-8 relative border border-white/5">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter">CANCEL <span className="text-rose-500 italic">TRIP?</span></h3>
              <div className="space-y-3">
                {CANCEL_REASONS.map(reason => (
                  <button key={reason} onClick={() => setSelectedCancelReason(reason)} className={`w-full p-5 rounded-2xl text-center font-black uppercase text-[10px] tracking-widest transition-all ${selectedCancelReason === reason ? 'bg-[#c1ff22] text-black' : 'bg-[#252525] text-zinc-500'}`}>{reason}</button>
                ))}
              </div>
              <button onClick={submitCancellation} disabled={!selectedCancelReason || isCancelling} className={`w-full py-7 rounded-[2rem] font-black uppercase text-sm shadow-2xl flex items-center justify-center gap-3 italic ${selectedCancelReason ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-700'}`}>{isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SUBMIT CANCELLATION'}</button>
              <button onClick={() => setShowCancelModal(false)} className="w-full text-[10px] font-black uppercase text-zinc-500 tracking-widest py-2">Go Back</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in fade-in overflow-hidden">
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

        @keyframes zoom-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        .animate-zoom-pulse {
          animation: zoom-pulse 2s ease-in-out infinite;
        }
      `}</style>
      <header className="px-6 pt-12 pb-4 flex items-center justify-between shrink-0">
        <button onClick={() => setShowCancelModal(true)} className="w-14 h-14 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 active:scale-90"><X className="w-6 h-6 text-white" /></button>
        <div className="text-center animate-zoom-pulse">
          <h2 className="text-[12px] font-black uppercase italic tracking-[0.1em] text-[#c1ff22]">Searching for</h2>
          <p className="text-[14px] font-black uppercase italic tracking-widest text-white">hafizabad fleet</p>
        </div>
        <button className="w-14 h-14 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 active:scale-90"><Shield className="w-6 h-6 text-[#c1ff22]" /></button>
      </header>
      <div className="flex-1 flex flex-col items-center px-6 overflow-y-auto no-scrollbar pb-32">
        <div className="chasing-light-box fluid-multi-color p-[1.5px] rounded-[2.5rem] mt-4 w-full shadow-2xl">
          <div className="w-full bg-[#111] rounded-[2.4rem] p-8 space-y-5 relative z-10">
             <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-[#c1ff22] rounded-full shadow-[0_0_10px_#c1ff22]" />
                <p className="text-[12px] font-bold text-white uppercase italic truncate">{rideData?.pickup_address || "FETCHING..."}</p>
             </div>
             <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-rose-500 rounded-full shadow-[0_0_10px_#f43f5e]" />
                <p className="text-[12px] font-bold text-white uppercase italic truncate">{rideData?.dest_address || "FETCHING..."}</p>
             </div>
          </div>
        </div>
        {offers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center relative py-20">
             <div className="w-56 h-56 rounded-full border border-[#c1ff22]/10 flex items-center justify-center relative">
                <div className="absolute inset-0 border border-[#c1ff22]/20 rounded-full animate-ping" />
                <Sparkles className="w-12 h-12 text-[#c1ff22] animate-pulse" />
             </div>
             <p className="mt-10 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 italic">Waiting for Captains to bid...</p>
          </div>
        ) : (
          <div className="w-full space-y-6 pt-8">
            {offers.map(offer => (
              <div key={offer.id} className="bg-[#151515] rounded-[3rem] p-7 border border-white/5 space-y-6 animate-in slide-in-from-bottom shadow-2xl">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-4 text-left">
                      <div className="relative">
                         <img src={offer.driver_image} className="w-16 h-16 rounded-2xl border-2 border-[#c1ff22] object-cover" />
                         <div className="absolute -bottom-1 -right-1 bg-[#3b82f6] p-1 rounded-lg border-2 border-[#151515]"><ShieldCheck className="w-4 h-4 text-white" /></div>
                      </div>
                      <div>
                         <h4 className="text-white text-[13px] uppercase italic font-medium leading-none">{offer.driver_name}</h4>
                         <div className="flex items-center gap-2 mt-3">
                            <Star className="w-3.5 h-3.5 text-[#c1ff22] fill-current" />
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">{offer.rating} • Age: {offer.driver_age}</span>
                         </div>
                         <p className="text-[8px] font-black text-[#c1ff22] uppercase tracking-[0.2em] mt-2">{offer.driver_completed_rides} COMPLETED TRIPS</p>
                         <button onClick={() => setReviewViewer({ id: offer.driver_id, name: offer.driver_name, pic: offer.driver_image })} className="text-[8px] font-black text-zinc-500 uppercase tracking-widest underline mt-2 decoration-[#c1ff22]/30">READ REVIEWS</button>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xl font-black text-[#c1ff22] italic leading-none">Rs {offer.offer_fare}</p>
                   </div>
                </div>

                <div className="bg-black/40 rounded-3xl p-5 border border-white/5 space-y-4">
                   <div className="flex items-center gap-5">
                      <div className="w-20 h-14 bg-black rounded-2xl overflow-hidden border border-white/5" onClick={() => setFullVehicleImage(offer.vehicle_image)}>
                         {offer.vehicle_image ? <img src={offer.vehicle_image} className="w-full h-full object-cover" /> : <Car className="w-8 h-8 text-zinc-800 mx-auto" />}
                      </div>
                      <div>
                         <p className="text-[9px] font-black uppercase text-[#c1ff22] tracking-widest mb-1">VEHICLE INFO</p>
                         <h5 className="text-[12px] font-bold text-white uppercase italic">{offer.vehicle_model}</h5>
                         <p className="text-[10px] font-bold text-zinc-500 uppercase leading-none mt-1.5">{offer.vehicle_color} • {offer.vehicle_number}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <button onClick={async () => { await deleteDoc(doc(db, 'ride_offers', offer.id)); }} className="bg-zinc-800 text-zinc-500 py-6 rounded-2xl font-black uppercase text-[10px] italic border border-white/5">REJECT</button>
                   <button onClick={() => handleAccept(offer)} className="bg-[#c1ff22] text-black py-6 rounded-2xl font-black uppercase text-[10px] shadow-xl italic tracking-widest">ACCEPT BID</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {fullVehicleImage && (
        <div className="fixed inset-0 z-[700] bg-black/98 flex flex-col items-center justify-center p-6 animate-in zoom-in" onClick={() => setFullVehicleImage(null)}>
           <button className="absolute top-12 right-6 p-5 bg-white/10 rounded-full text-white"><X className="w-10 h-10" /></button>
           <img src={fullVehicleImage} className="max-w-full max-h-[80vh] object-contain rounded-[3rem] shadow-2xl border-2 border-white/10" />
           <p className="mt-10 text-[11px] font-black uppercase text-zinc-500 tracking-[0.5em]">Official Fleet Vehicle Profile</p>
        </div>
      )}

      {reviewViewer && <ReviewDisplayOverlay userId={reviewViewer.id} userName={reviewViewer.name} userPic={reviewViewer.pic} onClose={() => setReviewViewer(null)} />}

      <div className="px-6 pb-14 pt-4 shrink-0">
        <button onClick={() => setShowCancelModal(true)} className="w-full bg-[#111] text-rose-500 py-7 rounded-[2.5rem] font-black uppercase text-[12px] shadow-xl border border-white/5 active:scale-95 italic tracking-widest">CANCEL REQUEST</button>
      </div>
      {showCancelModal && (
          <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-sm bg-[#1a1a1a] rounded-[2.5rem] p-10 space-y-8 relative border border-white/5">
              <h3 className="text-2xl font-black uppercase text-white tracking-tighter">CANCEL <span className="text-rose-500 italic">REQUEST?</span></h3>
              <div className="space-y-3">
                {CANCEL_REASONS.map(reason => (
                  <button key={reason} onClick={() => setSelectedCancelReason(reason)} className={`w-full p-5 rounded-2xl text-center font-black uppercase text-[10px] tracking-widest transition-all ${selectedCancelReason === reason ? 'bg-[#c1ff22] text-black' : 'bg-[#252525] text-zinc-500'}`}>{reason}</button>
                ))}
              </div>
              <button onClick={submitCancellation} disabled={!selectedCancelReason || isCancelling} className={`w-full py-7 rounded-[2rem] font-black uppercase text-sm shadow-2xl flex items-center justify-center gap-3 italic ${selectedCancelReason ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-700'}`}>{isCancelling ? <Loader2 className="w-5 h-5 animate-spin" /> : 'SUBMIT CANCELLATION'}</button>
              <button onClick={() => setShowCancelModal(false)} className="w-full text-[10px] font-black uppercase text-zinc-500 tracking-widest py-2">Go Back</button>
            </div>
          </div>
        )}
    </div>
  );
};

export default SearchingScreen;
