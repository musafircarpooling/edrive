
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Loader2, Star, ShieldCheck, MessageSquare, Phone, Car, Check, Info, AlertOctagon, User, Calendar, Sparkles, MapPin, ChevronRight, Award, Trash2, Navigation
} from 'lucide-react';
import { UserProfile, RealtimeRideRequest, RideType } from '../types';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc, getDoc } from 'firebase/firestore';
import MapContainer from './MapContainer';
import ChatOverlay from './ChatOverlay';
import RatingOverlay from './RatingOverlay';

interface Offer {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_image: string;
  offer_fare: number;
  vehicle_model?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  vehicle_image_url?: string;
  rating?: number;
  age?: string;
  total_rides?: number;
}

interface SearchingScreenProps {
  requestId: string;
  userProfile: UserProfile;
  onCancel: () => void;
}

const CANCEL_REASONS = [
  "Changed my mind",
  "Driver taking too long",
  "Fare is too high",
  "Driver asked to cancel",
  "Found another ride"
];

const SearchingScreen: React.FC<SearchingScreenProps> = ({ requestId, userProfile, onCancel }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeRide, setActiveRide] = useState<RealtimeRideRequest | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [showRating, setShowRating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const [selectedProfile, setSelectedProfile] = useState<Offer | null>(null);
  const [profileReviews, setProfileReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  
  const [activeDriverLoc, setActiveDriverLoc] = useState<{lat: number, lng: number, rotation: number} | null>(null);

  const offerSoundRef = useRef<HTMLAudioElement | null>(null);
  const chatSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    offerSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    offerSoundRef.current.volume = 1.0;

    chatSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    chatSoundRef.current.volume = 0.8;

    const unlock = () => {
      [offerSoundRef, chatSoundRef].forEach(ref => {
        if (ref.current) {
          ref.current.play().then(() => {
            ref.current?.pause();
            ref.current!.currentTime = 0;
          }).catch(() => {});
        }
      });
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('click', unlock);
    return () => window.removeEventListener('click', unlock);
  }, []);

  const enrichOffer = async (offer: any): Promise<Offer> => {
    const driverSnap = await getDoc(doc(db, 'drivers', offer.driver_id));
    const driver = driverSnap.data();
    
    const ridesQuery = query(
      collection(db, 'ride_requests'),
      where('driver_id', '==', offer.driver_id)
    );
    const ridesSnap = await getDocs(ridesQuery);
    const completedCount = ridesSnap.docs.filter(d => d.data().status === 'completed').length;
    
    return { 
      ...offer, 
      vehicle_model: driver?.vehicle_model || 'City Verified', 
      vehicle_number: driver?.vehicle_number || 'HFZ-000',
      vehicle_type: driver?.vehicle_type || 'MOTO', 
      vehicle_image_url: driver?.vehicle_image_url, 
      rating: driver?.rating || 5.0,
      age: driver?.age || 'Captain',
      total_rides: completedCount
    };
  };

  useEffect(() => {
    if (!requestId) return;

    const rideUnsub = onSnapshot(doc(db, 'ride_requests', requestId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as RealtimeRideRequest;
        setActiveRide({ ...data, id: docSnap.id });
        if (data.status === 'completed') setShowRating(true);
        if (data.status === 'cancelled') onCancel();
      }
    });

    const offersUnsub = onSnapshot(query(collection(db, 'ride_offers'), where('request_id', '==', requestId)), async (snap) => {
      if (snap.docChanges().some(change => change.type === 'added')) {
        if (offerSoundRef.current) {
          offerSoundRef.current.currentTime = 0;
          offerSoundRef.current.play().catch(() => {});
        }
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
      }
      const enrichedOffers = await Promise.all(snap.docs.map(d => enrichOffer({ ...d.data(), id: d.id })));
      setOffers(enrichedOffers);
    });

    // Chat Monitoring for Unread Count and Sound
    const chatUnsub = onSnapshot(query(collection(db, 'ride_chat'), where('request_id', '==', requestId)), (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const msg = change.doc.data();
          // If message is from someone else and chat is not open
          if (msg.sender_id !== userProfile.email) {
            if (!showChat) {
              setUnreadCount(prev => prev + 1);
              if (chatSoundRef.current) {
                chatSoundRef.current.currentTime = 0;
                chatSoundRef.current.play().catch(() => {});
              }
              if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
            }
          }
        }
      });
    });

    const locUnsub = onSnapshot(doc(db, 'active_locations', requestId), (docSnap) => {
      if (docSnap.exists() && activeRide?.driver_id) {
        const data = docSnap.data();
        const driverLoc = data[activeRide.driver_id];
        if (driverLoc) {
          setActiveDriverLoc({
            lat: driverLoc.lat,
            lng: driverLoc.lng,
            rotation: driverLoc.rotation || 0
          });
        }
      }
    });

    return () => {
      rideUnsub();
      offersUnsub();
      locUnsub();
      chatUnsub();
    };
  }, [requestId, activeRide?.driver_id, showChat]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  const fetchDriverProfile = async (offer: Offer) => {
    setSelectedProfile(offer);
    setIsLoadingReviews(true);
    try {
      const q = query(collection(db, 'ride_reviews'), where('reviewee_id', '==', offer.driver_id));
      const snap = await getDocs(q);
      const reviewsData = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data();
        const reviewerSnap = await getDoc(doc(db, 'profiles', data.reviewer_id));
        return { ...data, id: d.id, reviewer: reviewerSnap.data() };
      }));
      setProfileReviews(reviewsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err) {
      setProfileReviews([]);
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const handleAcceptOffer = async (offer: Offer) => {
    setIsAccepting(offer.id);
    try {
      await updateDoc(doc(db, 'ride_requests', requestId), {
        status: 'accepted',
        driver_id: offer.driver_id,
        base_fare: offer.offer_fare
      });
    } catch (err) { 
      alert("Acceptance failed. Please try again.");
    } finally { 
      setIsAccepting(null); 
    }
  };

  const handleCancelRide = async (reason: string) => {
    try {
      await updateDoc(doc(db, 'ride_requests', requestId), {
        status: 'cancelled',
        cancel_reason: reason
      });
      onCancel();
    } catch (err) {
      alert("Cancellation failed");
    } finally {
      setShowCancelDialog(false);
    }
  };

  if (activeRide?.status === 'accepted' || activeRide?.status === 'ongoing' || activeRide?.status === 'completed') {
    const currentDriver = offers.find(o => o.driver_id === activeRide.driver_id);
    
    const driversForMap = activeDriverLoc && activeRide.driver_id ? [{
      id: activeRide.driver_id,
      lat: activeDriverLoc.lat,
      lng: activeDriverLoc.lng,
      rotation: activeDriverLoc.rotation,
      type: activeRide.ride_type
    }] : [];

    return (
      <div className="fixed inset-0 bg-black z-[200] flex flex-col animate-in fade-in overflow-hidden">
        <div className="h-[45%] w-full relative z-0">
          <MapContainer 
            drivers={driversForMap}
            activeTripPath={{ 
              pickup: { lat: 32.0711, lng: 73.6875, address: activeRide.pickup_address, city: 'H', area: 'A' }, 
              destination: { lat: 32.0750, lng: 73.6950, address: activeRide.dest_address, city: 'H', area: 'B' } 
            }} 
          />
          <div className="absolute top-12 left-6 z-50">
             <div className="bg-black/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-[#c1ff22]/30 flex items-center gap-3 shadow-2xl">
                <div className="w-2 h-2 bg-[#c1ff22] rounded-full animate-pulse shadow-[0_0_10px_#c1ff22]" />
                <span className="text-[10px] font-bold uppercase text-white tracking-widest">
                  {activeRide.status === 'completed' ? 'Trip Complete' : 'Captain Engaged'}
                </span>
             </div>
          </div>
        </div>

        <div className="flex-1 bg-zinc-950 rounded-t-[3.5rem] -mt-12 relative z-10 p-8 flex flex-col border-t border-white/5 shadow-2xl overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <img 
                  onClick={() => currentDriver && fetchDriverProfile(currentDriver)}
                  src={currentDriver?.driver_image || 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg'} 
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#c1ff22] cursor-pointer active:scale-95 transition-transform" 
                />
                <div className="absolute -bottom-1 -right-1 bg-[#c1ff22] p-1 rounded-lg border-2 border-zinc-950">
                  <Car className="w-2.5 h-2.5 text-black" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[13px] font-bold italic uppercase text-zinc-100 leading-tight tracking-tight">{currentDriver?.driver_name || 'Captain'}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                   <Star className="w-3 h-3 text-[#c1ff22] fill-current" />
                   <span className="text-[10px] font-bold text-zinc-500 uppercase">{(currentDriver?.rating || 5.0).toFixed(1)} • VERIFIED</span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 ml-4">
               <p className="text-[10px] font-bold text-zinc-600 uppercase mb-1">TRIP FARE</p>
               <p className="text-2xl font-bold italic text-[#c1ff22]">Rs {activeRide.base_fare}</p>
            </div>
          </div>

          <div className="bg-zinc-900/40 p-5 rounded-[2rem] border border-white/5 flex items-center gap-5 mb-6">
             <div className="w-16 h-16 rounded-2xl bg-zinc-800 overflow-hidden border border-white/5">
                {currentDriver?.vehicle_image_url ? (
                  <img src={currentDriver.vehicle_image_url} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Car className="text-zinc-700 w-8 h-8" /></div>
                )}
             </div>
             <div>
               <p className="text-[10px] font-bold uppercase text-zinc-600 tracking-widest">VEHICLE</p>
               <p className="text-sm font-bold text-zinc-100 uppercase italic">{currentDriver?.vehicle_model || 'Loading...'}</p>
               <p className="text-[10px] font-bold text-[#c1ff22] uppercase mt-0.5 tracking-tighter">{currentDriver?.vehicle_number || 'HFZ-000'}</p>
             </div>
          </div>

          <div className="space-y-4 mb-8">
             <div className="flex items-center gap-4">
               <div className="w-2.5 h-2.5 rounded-full bg-[#c1ff22] shrink-0 shadow-[0_0_8px_#c1ff22]" />
               <div className="flex-1">
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-none mb-1">Pick up</p>
                  <p className="text-xs font-bold text-zinc-100 truncate uppercase italic">{activeRide.pickup_address}</p>
               </div>
             </div>
             <div className="flex items-center gap-4">
               <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_#f43f5e]" />
               <div className="flex-1">
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest leading-none mb-1">Drop Location</p>
                  <p className="text-xs font-bold text-zinc-100 truncate uppercase italic">{activeRide.dest_address}</p>
               </div>
             </div>
          </div>

          <div className="mt-auto grid grid-cols-4 gap-4 pb-4">
             <button onClick={() => window.location.href = `tel:03000000000`} className="aspect-square bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-white/5 active:scale-95 shadow-xl transition-all">
                <Phone className="text-[#c1ff22] w-6 h-6" />
             </button>
             <button onClick={() => setShowChat(true)} className="relative aspect-square bg-zinc-900 rounded-[2rem] flex items-center justify-center border border-white/5 active:scale-95 shadow-xl transition-all">
                <MessageSquare className="text-[#c1ff22] w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-950 animate-bounce">
                    {unreadCount}
                  </span>
                )}
             </button>
             <button 
                onClick={() => activeRide.status === 'completed' ? onCancel() : setShowCancelDialog(true)} 
                className="col-span-2 bg-zinc-900 text-rose-500 rounded-[2rem] font-bold uppercase text-xs active:scale-95 border border-rose-500/10 shadow-xl"
             >
               {activeRide.status === 'completed' ? 'EXIT' : 'CANCEL'}
             </button>
          </div>
        </div>

        {showChat && activeRide.driver_id && <ChatOverlay requestId={requestId} currentUserEmail={userProfile.email} otherPartyName={currentDriver?.driver_name || "Captain"} onClose={() => setShowChat(false)} />}
        {showRating && activeRide.driver_id && (
          <RatingOverlay 
            rideId={requestId} 
            reviewerId={userProfile.email} 
            revieweeId={activeRide.driver_id} 
            revieweeName={currentDriver?.driver_name || 'Captain'} 
            revieweePic={currentDriver?.driver_image}
            isDriverReviewing={false} 
            onClose={() => { setShowRating(false); onCancel(); }} 
          />
        )}
        
        {showCancelDialog && (
          <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex flex-col justify-end p-6 animate-in fade-in">
             <div className="bg-zinc-900 rounded-[3.5rem] p-8 border border-white/10 space-y-6 shadow-2xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold uppercase italic text-zinc-100 leading-none">Cancel <span className="text-rose-500">Trip?</span></h3>
                  <button onClick={() => setShowCancelDialog(false)} className="p-3 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  {CANCEL_REASONS.map(reason => (
                    <button key={reason} onClick={() => handleCancelRide(reason)} className="w-full bg-black/40 p-5 rounded-2xl text-left font-bold uppercase text-[10px] text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all border border-white/5 active:scale-[0.98]">
                      {reason}
                    </button>
                  ))}
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#080808] z-[200] flex flex-col animate-in fade-in overflow-hidden text-white">
      <header className="p-6 pt-12 flex items-center justify-between shrink-0">
        <button onClick={() => setShowCancelDialog(true)} className="p-4 bg-zinc-900/50 rounded-full border border-white/5 active:scale-90 transition-transform">
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="text-center">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-1 leading-none italic">Searching Drivers</h2>
          <p className="text-[#c1ff22] text-[9px] font-bold uppercase tracking-[0.2em] italic leading-none">Hafizabad City Fleet</p>
        </div>
        <div className="p-4 bg-zinc-900/20 rounded-full text-[#c1ff22]">
           <ShieldCheck className="w-6 h-6" />
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 mb-4">
           <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#c1ff22] shrink-0 shadow-[0_0_8px_#c1ff22]" />
                <div className="flex-1 min-w-0">
                   <p className="text-[8px] font-bold uppercase text-zinc-600 mb-0.5 tracking-widest">Pickup</p>
                   <p className="text-xs font-bold text-zinc-100 truncate uppercase italic">{activeRide?.pickup_address || "Determining Location..."}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_#f43f5e]" />
                <div className="flex-1 min-w-0">
                   <p className="text-[8px] font-bold uppercase text-zinc-600 mb-0.5 tracking-widest">Drop Location</p>
                   <p className="text-xs font-bold text-zinc-100 truncate uppercase italic">{activeRide?.dest_address || "Determining Location..."}</p>
                </div>
              </div>
           </div>
        </div>

        {offers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
             <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                <div className="absolute inset-0 border-[3px] border-[#c1ff22]/5 rounded-full animate-[ping_3s_linear_infinite]"></div>
                <div className="absolute inset-4 border-2 border-t-[#c1ff22] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 border-[1px] border-zinc-800 rounded-full"></div>
                <div className="relative z-10 text-[#c1ff22]">
                   <Sparkles className="w-12 h-12" />
                </div>
             </div>

             <div className="space-y-3">
               <h3 className="text-2xl font-bold italic uppercase tracking-tight text-zinc-100 leading-none">Broadcasting Deal</h3>
               <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.25em]">Hafizabad Captains are reviewing your deal...</p>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-6 mb-4">
               <div className="flex items-center justify-center gap-2 bg-[#c1ff22]/10 py-3 rounded-full border border-[#c1ff22]/20">
                  <div className="w-2 h-2 bg-[#c1ff22] rounded-full animate-pulse" />
                  <p className="text-[9px] font-bold text-[#c1ff22] uppercase tracking-[0.2em] italic">{offers.length} Captain offers received</p>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-40 no-scrollbar space-y-4">
                {offers.map(offer => (
                  <div key={offer.id} className="w-full bg-zinc-900 rounded-[2.5rem] p-6 border border-white/5 shadow-2xl space-y-5 animate-in slide-in-from-bottom-10">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-4 min-w-0 flex-1">
                          <button onClick={() => fetchDriverProfile(offer)} className="relative active:scale-95 transition-transform shrink-0">
                             <img src={offer.driver_image} className="w-14 h-14 rounded-2xl object-cover border-2 border-[#c1ff22]" />
                             <div className="absolute -bottom-1 -right-1 bg-black p-1 rounded-lg border border-[#c1ff22]/30">
                                <Info className="w-3.5 h-3.5 text-[#c1ff22]" />
                             </div>
                          </button>
                          <div className="min-w-0 flex-1">
                             <h4 className="font-bold text-zinc-100 text-[13px] uppercase italic leading-tight">{offer.driver_name}</h4>
                             <div className="flex items-center gap-2 mt-1.5">
                                <Star className="w-3 h-3 text-[#c1ff22] fill-current" />
                                <span className="text-[10px] font-bold text-[#c1ff22] uppercase tracking-tight">{(offer.rating || 5.0).toFixed(1)}</span>
                             </div>
                          </div>
                       </div>
                       <div className="text-right shrink-0 ml-4">
                          <p className="text-3xl font-bold text-[#c1ff22] italic leading-none">Rs {offer.offer_fare}</p>
                       </div>
                    </div>

                    <div className="flex gap-3">
                       <button onClick={() => setOffers(prev => prev.filter(o => o.id !== offer.id))} className="flex-1 bg-zinc-800 text-zinc-500 py-4.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all">Dismiss</button>
                       <button onClick={() => handleAcceptOffer(offer)} disabled={isAccepting !== null} className="flex-[2] bg-[#c1ff22] text-black py-4.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2">
                          {isAccepting === offer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Hire Captain</>}
                       </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <footer className="p-8 shrink-0 bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 left-0 right-0 z-50">
        <button 
          onClick={() => setShowCancelDialog(true)} 
          className="w-full bg-zinc-900/40 border border-white/5 text-rose-500 py-5 rounded-[2rem] font-bold uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all shadow-xl backdrop-blur-md"
        >
          Cancel Ride Request
        </button>
      </footer>

      {selectedProfile && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="h-2/5 w-full relative bg-zinc-800">
             {selectedProfile.vehicle_image_url ? (
               <img src={selectedProfile.vehicle_image_url} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center flex-col gap-4 text-zinc-700">
                 <Car className="w-20 h-20" />
                 <p className="text-[9px] font-bold uppercase tracking-widest">No Vehicle Image</p>
               </div>
             )}
             <div className="absolute top-12 left-6 right-6 flex justify-between z-10">
                <button onClick={() => setSelectedProfile(null)} className="p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 active:scale-90"><X className="w-6 h-6 text-white" /></button>
                <div className="bg-[#c1ff22] text-black px-4 py-2 rounded-2xl font-bold uppercase text-[10px] shadow-2xl italic tracking-tight">Captain Details</div>
             </div>
             <div className="absolute bottom-6 left-6 bg-black/80 backdrop-blur-xl px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl">
                <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Registration Plate</p>
                <p className="text-lg font-bold text-[#c1ff22] tracking-tight uppercase">{selectedProfile.vehicle_number || 'HFZ-000'}</p>
             </div>
             <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent"></div>
          </div>

          <div className="flex-1 bg-zinc-950 rounded-t-[3rem] -mt-10 relative z-10 flex flex-col overflow-hidden border-t border-white/5">
             <div className="p-8 overflow-y-auto no-scrollbar space-y-8 pb-32">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-5 min-w-0 flex-1">
                      <img src={selectedProfile.driver_image} className="w-20 h-20 rounded-[2.5rem] object-cover border-4 border-[#c1ff22] shrink-0" />
                      <div className="min-w-0 flex-1">
                         <h3 className="text-xl font-bold italic uppercase tracking-tight text-zinc-100 leading-tight">{selectedProfile.driver_name}</h3>
                         <div className="flex flex-wrap items-center gap-3 mt-2.5">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#c1ff22]/10 rounded-full border border-[#c1ff22]/30">
                               <Star className="w-3 h-3 text-[#c1ff22] fill-current" />
                               <span className="text-[10px] font-bold text-[#c1ff22]">{selectedProfile.rating?.toFixed(1)}</span>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Age: {selectedProfile.age || "Captain"}</span>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5">
                      <p className="text-[8px] font-bold text-zinc-600 uppercase mb-2 tracking-widest">Vehicle Model</p>
                      <p className="text-xs font-bold text-zinc-100 uppercase italic">{selectedProfile.vehicle_model || "City Verified"}</p>
                   </div>
                   <div className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5">
                      <p className="text-[8px] font-bold text-zinc-600 uppercase mb-2 tracking-widest">Trips Completed</p>
                      <p className="text-xs font-bold text-zinc-100 uppercase italic">{selectedProfile.total_rides || 0} Trips</p>
                   </div>
                </div>
                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <Award className="w-5 h-5 text-[#c1ff22]" />
                      <h4 className="text-sm font-bold uppercase italic tracking-tight text-zinc-100">Citizen Reviews</h4>
                   </div>
                   {isLoadingReviews ? (
                     <div className="py-10 flex flex-col items-center gap-3 text-zinc-800"><Loader2 className="w-8 h-8 animate-spin" /></div>
                   ) : profileReviews.length === 0 ? (
                     <div className="py-20 text-center opacity-20"><Star className="w-12 h-12 mx-auto mb-2" /><p className="text-[10px] font-bold uppercase text-zinc-500">No feedback logged yet</p></div>
                   ) : (
                     <div className="space-y-4">
                        {profileReviews.map((rev, idx) => (
                           <div key={idx} className="bg-zinc-900/30 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <img src={(rev.reviewer as any)?.profile_pic || "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg"} className="w-10 h-10 rounded-xl object-cover" />
                                    <div>
                                       <p className="text-zinc-100 font-bold uppercase italic text-xs leading-none">{(rev.reviewer as any)?.name}</p>
                                       <div className="flex text-[#c1ff22] mt-1">{Array(rev.rating).fill(0).map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-current" />)}</div>
                                    </div>
                                 </div>
                                 <span className="text-[7px] font-bold text-zinc-700 uppercase">{new Date(rev.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-zinc-400 text-xs italic leading-relaxed font-medium">"{rev.comment}"</p>
                           </div>
                        ))}
                     </div>
                   )}
                </div>
             </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/90 to-transparent">
             <button onClick={() => { setSelectedProfile(null); handleAcceptOffer(selectedProfile); }} disabled={isAccepting !== null} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2.5rem] font-black uppercase text-base shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                {isAccepting === selectedProfile.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Check className="w-6 h-6" /> Hire This Captain</>}
             </button>
          </div>
        </div>
      )}

      {showCancelDialog && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col justify-end p-6 animate-in fade-in">
           <div className="bg-zinc-900 rounded-[3.5rem] p-8 border border-white/10 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold uppercase italic text-zinc-100 leading-none">Cancel <span className="text-rose-500">Request?</span></h3>
                <button onClick={() => setShowCancelDialog(false)} className="p-3 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {CANCEL_REASONS.map(reason => (
                  <button key={reason} onClick={() => handleCancelRide(reason)} className="w-full bg-black/40 p-5 rounded-2xl text-left font-bold uppercase text-[10px] text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all border border-white/5 active:scale-[0.98]">
                    {reason}
                  </button>
                ))}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SearchingScreen;
