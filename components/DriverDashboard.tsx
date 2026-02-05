
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  TrendingUp, Wallet, Power, RefreshCcw, Loader2, Phone, 
  MessageSquareText, UserCircle, Star, ShieldCheck, X, ChevronRight, Quote, Info, AlertOctagon, Award, Banknote, Calendar, History, ArrowUpRight, LogOut, ArrowDown, Send, User, MapPin, Clock, FileText, Play, Volume2, LifeBuoy, Camera, Mail, AlignLeft
} from 'lucide-react';
import { UserProfile, RealtimeRideRequest, RideType } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, setDoc, doc, updateDoc, addDoc, getDoc } from 'firebase/firestore';
import MapContainer from './MapContainer';
import ChatOverlay from './ChatOverlay';
import RatingOverlay from './RatingOverlay';
import NotificationBell from './NotificationBell';
import AdBannerOverlay from './AdBannerOverlay';

interface DriverDashboardProps {
  userProfile: UserProfile;
  onLogout: () => void;
  onSwitchToUser: () => void;
}

type DashboardTab = 'feed' | 'earnings';

const DRIVER_CANCEL_REASONS = [
  "Vehicle problem",
  "Unable to find passenger",
  "Passenger not responding",
  "Area is unsafe",
  "Accident / Emergency"
];

const DriverDashboard: React.FC<DriverDashboardProps> = ({ userProfile, onLogout, onSwitchToUser }) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('feed');
  const [activeRequests, setActiveRequests] = useState<RealtimeRideRequest[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTrip, setActiveTrip] = useState<RealtimeRideRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RealtimeRideRequest | null>(null);
  const [offerFare, setOfferFare] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [neverShowIds, setNeverShowIds] = useState<Set<string>>(new Set());
  const [showChat, setShowChat] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [passengerReviews, setPassengerReviews] = useState<any[]>([]);
  const [passengerProfile, setPassengerProfile] = useState<any>(null);
  const [lastFinishedRide, setLastFinishedRide] = useState<RealtimeRideRequest | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [driverData, setDriverData] = useState<any>(null);

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
  
  const [viewedPassenger, setViewedPassenger] = useState<any | null>(null);
  const [viewedPassengerReviews, setViewedPassengerReviews] = useState<any[]>([]);
  const [isLoadingPassengerProfile, setIsLoadingPassengerProfile] = useState(false);
  
  const [startY, setStartY] = useState(0);
  const [pullOffset, setPullOffset] = useState(0);

  const [earningsData, setEarningsData] = useState({
    today: 0,
    week: 0,
    lifetime: 0,
    trips: [] as any[]
  });
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

  const bellRef = useRef<HTMLAudioElement | null>(null);
  const chatSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bellRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    bellRef.current.volume = 1.0;

    chatSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    chatSoundRef.current.volume = 0.8;

    const unlock = () => {
      [bellRef, chatSoundRef].forEach(ref => {
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

    const fetchDriverData = async () => {
      try {
        const dSnap = await getDoc(doc(db, 'drivers', userProfile.email));
        if (dSnap.exists()) {
          setDriverData(dSnap.data());
        }
      } catch (err) {
        console.error("Error fetching driver data:", err);
      }
    };
    fetchDriverData();

    return () => window.removeEventListener('click', unlock);
  }, [userProfile.email]);

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
      alert("Incident logged at Hafizabad Admin HQ. Safety team will investigate.");
      setShowSupportForm(false);
      setComplaintForm({ subject: "", message: "", targetName: "", targetPhone: "", targetEmail: "", proof: null });
    } catch (err) {
      alert("Log failed. Registry connection weak.");
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  const getPartnerLabel = (type: RideType) => {
    switch (type) {
      case RideType.MOTO: return "Bike";
      case RideType.RIDE: return "Car";
      case RideType.RICKSHAW: return "Rikshaw";
      case RideType.DELIVERY: return "Delivery";
      default: return "Verified";
    }
  };

  const getOrderLabel = (type: RideType) => {
    switch (type) {
      case RideType.MOTO: return "Bike Order";
      case RideType.RIDE: return "Car Order";
      case RideType.RICKSHAW: return "Rikshaw Order";
      case RideType.DELIVERY: return "Delivery Order";
      default: return "Service Order";
    }
  };

  const shouldDriverSeeRequest = (driverType: RideType, requestType: RideType) => {
    if (driverType === RideType.MOTO) {
      return requestType === RideType.MOTO || requestType === RideType.DELIVERY;
    }
    return driverType === requestType;
  };

  const fetchEarnings = async () => {
    setIsLoadingEarnings(true);
    try {
      const q = query(
        collection(db, 'ride_requests'),
        where('driver_id', '==', userProfile.email),
        where('status', '==', 'completed')
      );
      const querySnapshot = await getDocs(q);
      const history = querySnapshot.docs.map(doc => doc.data() as RealtimeRideRequest);

      if (history) {
        const sortedHistory = history.sort((a, b) => 
          new Date(b.completed_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        const today = new Date().toDateString();
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        let todaySum = 0;
        let weekSum = 0;
        let totalSum = 0;

        sortedHistory.forEach(ride => {
          const rideDate = new Date(ride.completed_at || 0);
          const earned = ride.base_fare;
          totalSum += earned;
          if (rideDate.toDateString() === today) todaySum += earned;
          if (rideDate >= startOfWeek) weekSum += earned;
        });

        setEarningsData({
          today: Math.round(todaySum),
          week: Math.round(weekSum),
          lifetime: Math.round(totalSum),
          trips: sortedHistory
        });
      }
    } catch (err) {
      console.error("🔥 eDrive Earnings failed", err);
    } finally {
      setIsLoadingEarnings(false);
    }
  };

  const fetchCurrentState = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    
    const qTrip = query(
      collection(db, 'ride_requests'),
      where('driver_id', '==', userProfile.email)
    );
    const tripSnapshot = await getDocs(qTrip);
    const trips = tripSnapshot.docs.map(d => d.data() as RealtimeRideRequest);
    const currentTrip = trips.find(t => ['accepted', 'ongoing'].includes(t.status));

    if (currentTrip) {
      setActiveTrip(currentTrip);
      fetchPassengerDetails(currentTrip.passenger_id);
    } else {
      setActiveTrip(null);
      setPassengerProfile(null);
    }

    if (isOnline && !currentTrip && driverData) {
      const qPending = query(collection(db, 'ride_requests'), where('status', '==', 'pending'));
      const pendingSnapshot = await getDocs(qPending);
      const data = pendingSnapshot.docs.map(doc => doc.data() as RealtimeRideRequest);

      if (data) {
        const enriched = await Promise.all(data.map(async (req) => {
           const profSnap = await getDoc(doc(db, 'profiles', req.passenger_id));
           const prof = profSnap.data();
           return { 
             ...req, 
             passenger_full_name: `${prof?.name} ${prof?.last_name || ''}`.trim(),
             passenger_age: prof?.age, 
             passenger_gender: prof?.gender,
             passenger_rating: prof?.rating || 5.0,
             passenger_image: prof?.profile_pic
           };
        }));
        
        setActiveRequests(enriched
          .filter(r => !neverShowIds.has(r.id) && shouldDriverSeeRequest(driverData.vehicle_type, r.ride_type))
          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
        );
      }
    }
    
    if (manual) setTimeout(() => setIsRefreshing(false), 500);
  }, [isOnline, neverShowIds, userProfile.email, driverData]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (activeTab === 'feed' && !activeTrip) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (activeTab === 'feed' && !activeTrip && startY > 0) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        setPullOffset(Math.min(diff / 2.5, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullOffset > 60) {
      fetchCurrentState(true);
    }
    setPullOffset(0);
    setStartY(0);
  };

  useEffect(() => {
    if (activeTab === 'earnings') fetchEarnings();
  }, [activeTab]);

  useEffect(() => {
    if (driverData) fetchCurrentState();
    
    const qRideRequests = query(collection(db, 'ride_requests'));
    const unsubscribe = onSnapshot(qRideRequests, async (snapshot) => {
      if (!driverData) return;

      snapshot.docChanges().forEach(async (change) => {
        const req = change.doc.data() as RealtimeRideRequest;
        
        if (change.type === 'modified' && req.driver_id === userProfile.email && req.status === 'accepted') {
          setActiveTrip(req);
          fetchPassengerDetails(req.passenger_id);
          return;
        }

        if (change.type === 'added' && req.status === 'pending') {
          if (!neverShowIds.has(req.id) && shouldDriverSeeRequest(driverData.vehicle_type, req.ride_type)) {
            if (bellRef.current) {
              bellRef.current.currentTime = 0;
              bellRef.current.play().catch(() => {});
            }
            if ("vibrate" in navigator) navigator.vibrate([300, 100, 300]);
            
            const profSnap = await getDoc(doc(db, 'profiles', req.passenger_id));
            const prof = profSnap.data();
            const enrichedReq = { 
              ...req, 
              passenger_full_name: `${prof?.name} ${prof?.last_name || ''}`.trim(),
              passenger_age: prof?.age, 
              passenger_gender: prof?.gender,
              passenger_rating: prof?.rating || 5.0,
              passenger_image: prof?.profile_pic
            };
            setActiveRequests(prev => [enrichedReq, ...prev].filter(r => !neverShowIds.has(req.id) && shouldDriverSeeRequest(driverData.vehicle_type, r.ride_type)));
          }
        } else if (change.type === 'modified' || change.type === 'removed') {
          if (req.status !== 'pending' || (req.driver_id && req.driver_id !== userProfile.email)) {
            setActiveRequests(prev => prev.filter(r => r.id !== req.id));
          }
          
          if (req.driver_id === userProfile.email) {
            if (['accepted', 'ongoing'].includes(req.status)) {
              setActiveTrip(req);
              fetchPassengerDetails(req.passenger_id);
            } else if (req.status === 'cancelled' || req.status === 'completed') {
              if (activeTrip?.id === req.id || !activeTrip) {
                if (req.status === 'completed' && !showRating) {
                    setLastFinishedRide(req);
                    setShowRating(true);
                }
                setActiveTrip(null);
                setPassengerProfile(null);
                if (req.status === 'cancelled') {
                   fetchCurrentState();
                }
              }
            }
          }
        }
      });
    });

    return () => { 
      unsubscribe();
    };
  }, [isOnline, neverShowIds, userProfile.email, activeTrip?.id, fetchCurrentState, driverData]);

  // Active Trip Chat Monitoring
  useEffect(() => {
    if (!activeTrip || !activeTrip.id) return;

    const chatUnsub = onSnapshot(query(collection(db, 'ride_chat'), where('request_id', '==', activeTrip.id)), (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const msg = change.doc.data();
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

    return () => chatUnsub();
  }, [activeTrip?.id, showChat, userProfile.email]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (showChat) setUnreadCount(0);
  }, [showChat]);

  const fetchPassengerDetails = async (email: string) => {
    setIsLoadingHistory(true);
    try {
      const profSnap = await getDoc(doc(db, 'profiles', email));
      setPassengerProfile(profSnap.data());
      
      const qReviews = query(
        collection(db, 'ride_reviews'), 
        where('reviewee_id', '==', email)
      );
      const reviewsSnapshot = await getDocs(qReviews);
      
      const reviewsData = await Promise.all(reviewsSnapshot.docs.map(async (d) => {
        const data = d.data();
        const reviewerSnap = await getDoc(doc(db, 'profiles', data.reviewer_id));
        return { ...data, id: d.id, reviewer: reviewerSnap.data() };
      }));
      
      setPassengerReviews(reviewsData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (err) { setPassengerReviews([]); } finally { setIsLoadingHistory(false); }
  };

  const handleOpenPassengerVault = async (passengerId: string) => {
    setIsLoadingPassengerProfile(true);
    try {
      const profSnap = await getDoc(doc(db, 'profiles', passengerId));
      const prof = profSnap.data();
      setViewedPassenger(prof);
      
      const qReviews = query(
        collection(db, 'ride_reviews'), 
        where('reviewee_id', '==', passengerId)
      );
      const reviewsSnapshot = await getDocs(qReviews);
      
      const reviewsData = await Promise.all(reviewsSnapshot.docs.map(async (d) => {
        const data = d.data();
        const reviewerSnap = await getDoc(doc(db, 'profiles', data.reviewer_id));
        return { ...data, id: d.id, reviewer: reviewerSnap.data() };
      }));
      
      setViewedPassengerReviews(reviewsData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (err) {
      console.error("Vault access failed", err);
    } finally {
      setIsLoadingPassengerProfile(false);
    }
  };

  const handleIgnoreRequest = (id: string) => {
    setNeverShowIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
    setActiveRequests(prev => prev.filter(r => r.id !== id));
  };

  const playVoiceNote = (note?: string) => {
    const audioUrl = note || activeTrip?.voice_note;
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const handleSendOffer = async () => {
    if (!selectedRequest || !offerFare || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const bidId = `bid-${Date.now().toString(36)}`;
      
      await setDoc(doc(db, 'ride_offers', bidId), { 
        id: bidId, 
        request_id: selectedRequest.id, 
        driver_id: userProfile.email, 
        driver_name: `${userProfile.name} ${userProfile.lastName || ''}`.trim(), 
        driver_image: userProfile.profilePic, 
        offer_fare: parseFloat(offerFare),
        created_at: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), { 
        user_id: selectedRequest.passenger_id, 
        title: 'New Bid Received!', 
        body: `${userProfile.name} offered Rs ${offerFare} for your trip.`, 
        type: 'ride_request', 
        is_read: false,
        created_at: new Date().toISOString()
      });

      setSelectedRequest(null);
      setOfferFare("");
    } catch (err: any) { 
      alert("Bid submission failed."); 
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleFinishRide = async (trip: RealtimeRideRequest) => {
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'ride_requests', trip.id), { 
        status: 'completed', 
        completed_at: new Date().toISOString() 
      });
      setLastFinishedRide(trip);
      setActiveTrip(null);
      setPassengerProfile(null);
      setShowRating(true);
      fetchEarnings(); 
    } catch (err) { alert("Finish failed"); } finally { setIsSubmitting(false); }
  };

  const handleCancelTrip = async (reason: string) => {
    if (!activeTrip) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'ride_requests', activeTrip.id), { 
        status: 'cancelled', 
        cancel_reason: reason 
      });
      setActiveTrip(null);
      setPassengerProfile(null);
      setShowCancelDialog(false);
      fetchCurrentState();
    } catch (err) {
      alert("Cancellation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingClose = () => {
    setShowRating(false);
    setLastFinishedRide(null);
    setActiveTrip(null);
    setPassengerProfile(null);
    setActiveTab('feed');
    fetchCurrentState();
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#080808] text-white overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AdBannerOverlay location="driver_db" />
      {activeTrip && passengerProfile ? (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col animate-in fade-in overflow-hidden">
          <div className="h-[45%] w-full relative z-0">
             <MapContainer activeTripPath={{ 
                pickup: { lat: 32.0711, lng: 73.6875, address: activeTrip.pickup_address, city: 'H', area: 'A' }, 
                destination: { lat: 32.0750, lng: 73.6950, address: activeTrip.dest_address, city: 'H', area: 'B' } 
             }} />
             <div className="absolute top-12 left-6 z-50">
                <div className="bg-black/80 backdrop-blur-xl px-5 py-2.5 rounded-full border border-[#c1ff22]/30 flex items-center gap-3 shadow-2xl">
                    <div className="w-2 h-2 bg-[#c1ff22] rounded-full animate-pulse shadow-[0_0_8px_#c1ff22]" />
                    <span className="text-[10px] font-black uppercase text-white tracking-widest">Active Engagement</span>
                </div>
             </div>
          </div>

          <div className="flex-1 bg-zinc-950 rounded-t-[3.5rem] -mt-12 relative z-10 p-8 flex flex-col shadow-2xl border-t border-white/5 overflow-y-auto no-scrollbar">
             <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-5 min-w-0 flex-1">
                   <div className="relative shrink-0">
                      <img 
                        onClick={() => handleOpenPassengerVault(activeTrip.passenger_id)}
                        src={passengerProfile.profile_pic || 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg'} 
                        className="w-16 h-16 rounded-[1.8rem] border-4 border-[#c1ff22] object-cover cursor-pointer active:scale-90 transition-transform" 
                      />
                      <div className="absolute -bottom-1 -right-1 bg-black p-1 rounded-lg border border-[#c1ff22]/30">
                         <Info className="w-3.5 h-3.5 text-[#c1ff22]" />
                      </div>
                   </div>
                   <div className="min-w-0 flex-1">
                      <h2 className="text-[13px] font-black uppercase italic leading-tight tracking-tighter">{passengerProfile.name} {passengerProfile.last_name || ''}</h2>
                      <div className="flex flex-col gap-1.5 mt-2">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest leading-none">Age: {passengerProfile.age || 'N/A'}</p>
                        <div className="flex items-center gap-1.5">
                            <Star className="w-3 h-3 text-[#c1ff22] fill-current" />
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">Rating: {passengerProfile.rating?.toFixed(1) || '5.0'}</span>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">ACCEPTED FARE</p>
                  <p className="text-xl font-black text-[#c1ff22] italic leading-none whitespace-nowrap">Rs {activeTrip.base_fare}</p>
                </div>
             </div>
             
             <div className="bg-zinc-900/40 p-5 rounded-[2.5rem] border border-white/5 space-y-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-[#c1ff22] shadow-[0_0_8px_#c1ff22] mt-1 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Pickup Point</p>
                    <p className="text-[11px] font-black text-zinc-300 truncate uppercase italic leading-tight">{activeTrip.pickup_address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 shadow-[0_0_8px_#f43f5e] mt-1" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-0.5">Drop Point</p>
                    <p className="text-[11px] font-black text-white truncate uppercase italic leading-tight">{activeTrip.dest_address}</p>
                  </div>
                </div>
             </div>

             {(activeTrip.description || activeTrip.voice_note) && (
               <div className="bg-zinc-900/40 p-5 rounded-[2.5rem] border border-white/5 space-y-3 mb-8">
                  <div className="flex items-center justify-between px-1">
                     <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#c1ff22]" />
                        <span className="text-[9px] font-black uppercase text-[#c1ff22] tracking-widest">Citizen Instructions</span>
                     </div>
                     {activeTrip.voice_note && (
                        <button 
                          onClick={() => playVoiceNote()}
                          className="flex items-center gap-2 bg-[#c1ff22] text-black px-3 py-1.5 rounded-full font-black text-[8px] uppercase active:scale-95 transition-all shadow-lg"
                        >
                           <Play className="w-2.5 h-2.5 fill-current" />
                           Play Voice Note
                        </button>
                     )}
                  </div>
                  {activeTrip.description && (
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                       <p className="text-xs font-medium text-zinc-300 italic whitespace-pre-wrap leading-relaxed">
                         {activeTrip.description}
                       </p>
                    </div>
                  )}
                  {activeTrip.voice_note && !activeTrip.description && (
                    <div className="flex items-center gap-3 p-4 bg-black/40 rounded-2xl border border-[#c1ff22]/20">
                       <Volume2 className="w-5 h-5 text-[#c1ff22]" />
                       <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Voice instruction attached</p>
                    </div>
                  )}
               </div>
             )}

             <div className="mt-auto grid grid-cols-4 gap-3 pb-4">
                <button onClick={() => window.location.href = `tel:${passengerProfile.phone_number}`} className="aspect-square bg-zinc-900 rounded-[1.8rem] flex items-center justify-center border border-white/5 active:scale-95 transition-all"><Phone className="text-[#c1ff22] w-5 h-5" /></button>
                <button onClick={() => setShowChat(true)} className="relative aspect-square bg-zinc-900 rounded-[1.8rem] flex items-center justify-center border border-white/5 active:scale-95 transition-all">
                  <MessageSquareText className="text-[#c1ff22] w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-950 animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button onClick={() => setShowCancelDialog(true)} className="aspect-square bg-zinc-900 rounded-[1.8rem] flex items-center justify-center border border-rose-500/20 active:scale-95 transition-all"><AlertOctagon className="text-rose-500 w-5 h-5" /></button>
                <button onClick={() => handleFinishRide(activeTrip)} disabled={isSubmitting} className="bg-[#c1ff22] text-black rounded-[1.8rem] font-black uppercase text-[10px] flex items-center justify-center gap-2 active:scale-95 shadow-xl transition-all">
                   {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "FINISH TRIP"}
                </button>
             </div>
          </div>
          
          {showChat && activeTrip && <ChatOverlay requestId={activeTrip.id} currentUserEmail={userProfile.email} otherPartyName={`${passengerProfile.name} ${passengerProfile.last_name || ''}`.trim()} onClose={() => setShowChat(false)} />}
        </div>
      ) : (
        <>
          <header className="p-6 pt-12 flex flex-col gap-4 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={userProfile.profilePic} className="w-10 h-10 rounded-xl border border-[#c1ff22] object-cover" />
                <div className="flex flex-col">
                  <h2 className="text-white font-black text-sm uppercase italic leading-none">{userProfile.name} {userProfile.lastName}</h2>
                  <p className="text-[10px] font-black text-[#c1ff22] uppercase tracking-tight mt-1 opacity-80">
                    eDrive-&gt; {driverData ? getPartnerLabel(driverData.vehicle_type) : '...'} Partner
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsOnline(!isOnline)} className={`p-3 rounded-2xl transition-colors ${isOnline ? 'bg-[#c1ff22] text-black shadow-[0_0_15px_rgba(193,255,34,0.3)]' : 'bg-zinc-900 text-zinc-600'}`}><Power className="w-5 h-5" /></button>
                <NotificationBell userId={userProfile.email} />
              </div>
            </div>
            <button onClick={onSwitchToUser} className="w-full bg-zinc-900/50 py-3.5 rounded-2xl text-zinc-400 font-black uppercase text-[10px] tracking-widest italic flex items-center justify-center gap-3 border border-white/5 active:scale-98 transition-all"><RefreshCcw className="w-4 h-4" /> PASSENGER MODE</button>
          </header>

          <main className="flex-1 overflow-y-auto p-4 no-scrollbar pb-32 relative">
            {pullOffset > 0 && (
              <div 
                className="absolute left-0 right-0 flex justify-center pointer-events-none z-40 transition-opacity"
                style={{ height: pullOffset, top: 0, opacity: pullOffset / 60 }}
              >
                <div className="bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-[#c1ff22]/20 flex items-center gap-2 mt-4 self-center shadow-2xl">
                  <RefreshCcw className={`w-3.5 h-3.5 text-[#c1ff22] ${pullOffset > 60 ? 'animate-spin' : ''}`} />
                  <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">
                    {pullOffset > 60 ? 'Release to Refresh' : 'Pull to Refresh'}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'feed' ? (
              <div className="space-y-5" style={{ transform: `translateY(${pullOffset}px)` }}>
                {!isOnline ? (
                  <div className="flex flex-col items-center justify-center py-32 opacity-20 text-center space-y-4">
                      <Power className="w-12 h-12" />
                      <p className="font-black text-xs uppercase tracking-[0.4em]">Captain Offline</p>
                  </div>
                ) : activeRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 opacity-10 text-center space-y-4">
                      <div className="w-12 h-12 border-4 border-t-[#c1ff22] border-white/5 rounded-full animate-spin"></div>
                      <p className="font-black text-[9px] uppercase tracking-[0.5em]">Live scanning Hafizabad...</p>
                  </div>
                ) : (
                  activeRequests.map((req: any) => (
                    <div key={req.id} className="bg-zinc-900 rounded-[2.5rem] border border-white/5 p-6 shadow-xl space-y-6 animate-in slide-in-from-right-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <img 
                            onClick={() => handleOpenPassengerVault(req.passenger_id)}
                            src={req.passenger_image} 
                            className="w-12 h-12 rounded-xl object-cover border border-[#c1ff22]/30 shrink-0 cursor-pointer active:scale-90 transition-transform" 
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex wrap items-center gap-2">
                               <h4 onClick={() => handleOpenPassengerVault(req.passenger_id)} className="font-black text-white text-[13px] uppercase italic leading-tight cursor-pointer">{req.passenger_full_name}</h4>
                               <button 
                                 onClick={() => handleOpenPassengerVault(req.passenger_id)}
                                 className="flex items-center gap-1 bg-[#c1ff22]/10 px-2 py-0.5 rounded-full border border-[#c1ff22]/20 active:scale-90 transition-transform"
                               >
                                 <Star className="w-2.5 h-2.5 text-[#c1ff22] fill-current" />
                                 <span className="text-[9px] font-black text-[#c1ff22]">{(req.passenger_rating || 5.0).toFixed(1)}</span>
                               </button>
                            </div>
                            <p className="text-[10px] font-black text-[#c1ff22] uppercase tracking-tight mt-1 opacity-80 italic leading-none">
                               {getOrderLabel(req.ride_type)}
                            </p>
                            {req.ride_type === RideType.DELIVERY && req.item_type && (
                              <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mt-1">
                                 {req.item_type}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-2 opacity-40">
                              <Clock className="w-2.5 h-2.5 text-zinc-500" />
                              <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">
                                {req.created_at ? new Date(req.created_at).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <p className="text-xl font-black text-[#c1ff22] italic leading-none shrink-0 ml-2">Rs {req.base_fare}</p>
                      </div>
                      
                      <div className="space-y-4 bg-black/30 p-5 rounded-[1.5rem] border border-white/5">
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#c1ff22] mt-1.5 shrink-0" />
                          <p className="text-[10px] font-bold text-zinc-300 truncate uppercase leading-tight">{req.pickup_address}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <p className="text-[10px] font-bold text-white truncate uppercase leading-tight">{req.dest_address}</p>
                        </div>
                      </div>

                      {(req.description || req.voice_note) && (
                        <div className="bg-zinc-800/40 p-4 rounded-2xl border border-white/5 space-y-3">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <FileText className="w-3.5 h-3.5 text-zinc-500" />
                                 <span className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Instructions</span>
                              </div>
                              {req.voice_note && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); playVoiceNote(req.voice_note); }}
                                  className="flex items-center gap-1.5 bg-[#c1ff22]/20 text-[#c1ff22] px-2.5 py-1 rounded-full font-black text-[7px] uppercase border border-[#c1ff22]/20 active:scale-90 transition-all"
                                >
                                   <Play className="w-2 h-2 fill-current" />
                                   Listen
                                </button>
                              )}
                           </div>
                           {req.description && (
                             <p className="text-[10px] font-medium text-zinc-400 italic line-clamp-3 leading-relaxed">
                               {req.description}
                             </p>
                           )}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button onClick={() => handleIgnoreRequest(req.id)} className="flex-1 bg-zinc-800 text-zinc-500 py-6 rounded-[1.5rem] font-black text-[10px] uppercase active:scale-95 transition-all">IGNORE</button>
                        <button onClick={() => { setSelectedRequest(req); setOfferFare(req.base_fare.toString()); }} className="flex-[2] bg-[#c1ff22] text-black py-6 rounded-[1.5rem] font-black uppercase text-[10px] active:scale-95 shadow-xl transition-all">SEND BID</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-4">
                 <div className="bg-[#c1ff22] p-8 rounded-[3.5rem] text-black relative overflow-hidden shadow-[0_20px_40px_rgba(193,255,34,0.15)]">
                    <Banknote className="absolute -bottom-4 -right-4 w-40 h-40 opacity-10 rotate-12" />
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Today's Earnings</p>
                      <h3 className="text-6xl font-black italic tracking-tighter mt-1">Rs {earningsData.today}</h3>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-white/5">
                       <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">This Week</p>
                       <p className="text-xl font-black text-white italic">Rs {earningsData.week}</p>
                    </div>
                    <div className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-white/5">
                       <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Lifetime</p>
                       <p className="text-xl font-black text-[#c1ff22] italic">Rs {earningsData.lifetime}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-3">
                         <History className="w-5 h-5 text-[#c1ff22]" />
                         <h4 className="text-sm font-black uppercase italic tracking-tighter">Ride Ledger</h4>
                      </div>
                    </div>

                    <div className="space-y-3">
                       {isLoadingEarnings ? (
                         <div className="py-20 flex flex-col items-center gap-3 opacity-20">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <p className="text-[8px] font-black uppercase">Syncing Wallet...</p>
                         </div>
                       ) : earningsData.trips.length === 0 ? (
                         <div className="py-20 text-center opacity-10 space-y-4">
                            <Banknote className="w-16 h-16 mx-auto" />
                            <p className="font-black uppercase text-xs">No earnings recorded yet</p>
                         </div>
                       ) : (
                         earningsData.trips.map(ride => (
                           <div key={ride.id} className="bg-zinc-900/30 p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-zinc-800 rounded-2xl flex items-center justify-center text-[#c1ff22] border border-white/5">
                                    <ArrowUpRight className="w-5 h-5" />
                                 </div>
                                 <div>
                                    <p className="text-white font-black uppercase italic text-xs leading-none">{ride.passenger_name}</p>
                                    <p className="text-[8px] font-black text-zinc-600 uppercase mt-1 tracking-widest">{new Date(ride.completed_at).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-base font-black text-[#c1ff22] italic">+ Rs {ride.base_fare}</p>
                              </div>
                           </div>
                         ))
                       )}
                    </div>
                 </div>
              </div>
            )}
          </main>

          <footer className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex justify-around items-center z-50 pb-8">
            <button onClick={() => setActiveTab('feed')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'feed' ? 'text-[#c1ff22] scale-110' : 'text-zinc-800 opacity-60'}`}>
               <TrendingUp className="w-6 h-6" />
               <span className="text-[8px] font-black uppercase tracking-widest">Feed</span>
            </button>
            <button onClick={() => setActiveTab('earnings')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'earnings' ? 'text-[#c1ff22] scale-110' : 'text-zinc-800 opacity-60'}`}>
               <Wallet className="w-6 h-6" />
               <span className="text-[8px] font-black uppercase tracking-widest">Earnings</span>
            </button>
            <button onClick={() => setShowSupportForm(true)} className="flex flex-col items-center gap-1.5 transition-all text-zinc-800 hover:text-[#c1ff22] opacity-60 hover:opacity-100">
               <LifeBuoy className="w-6 h-6" />
               <span className="text-[8px] font-black uppercase tracking-widest">Support</span>
            </button>
            <button onClick={onLogout} className="flex flex-col items-center gap-1.5 transition-all text-rose-500/60 hover:text-rose-500">
               <LogOut className="w-6 h-6" />
               <span className="text-[8px] font-black uppercase tracking-widest">Logout</span>
            </button>
          </footer>
        </>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setSelectedRequest(null)} />
          <div className="relative w-full bg-[#121212] rounded-t-[3.5rem] p-8 pb-12 border-t border-white/10 animate-in slide-in-from-bottom-full">
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-10" />
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-baseline gap-3">
                 <span className="text-3xl font-black text-zinc-700 italic">Rs</span>
                 <input type="number" autoFocus className="bg-transparent w-56 text-7xl font-black text-[#c1ff22] outline-none text-center italic tracking-tighter" value={offerFare} onChange={e => setOfferFare(e.target.value)} />
              </div>
            </div>
            <button 
              onClick={handleSendOffer} 
              disabled={isSubmitting} 
              className="w-full bg-[#c1ff22] text-black py-6 rounded-[2rem] font-black text-lg uppercase shadow-2xl mt-12 flex items-center justify-center active:scale-95 transition-all"
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <><Send className="w-5 h-5 mr-2" /> CONFIRM OFFER</>}
            </button>
          </div>
        </div>
      )}

      {showRating && lastFinishedRide && (
        <RatingOverlay 
          rideId={lastFinishedRide.id} 
          reviewerId={userProfile.email} 
          revieweeId={lastFinishedRide.passenger_id} 
          revieweeName={lastFinishedRide.passenger_name} 
          revieweePic={lastFinishedRide.passenger_image}
          isDriverReviewing={true} 
          onClose={handleRatingClose} 
        />
      )}

      {viewedPassenger && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col animate-in slide-in-from-bottom duration-300">
           <div className="h-2/5 w-full relative bg-zinc-900 flex items-center justify-center overflow-hidden">
              <img src={viewedPassenger.profile_pic || 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg'} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent"></div>
              <div className="absolute top-12 left-6 right-6 flex justify-between z-10">
                 <button onClick={() => setViewedPassenger(null)} className="p-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 active:scale-90"><X className="w-6 h-6 text-white" /></button>
                 <div className="bg-[#c1ff22] text-black px-4 py-2 rounded-2xl font-bold uppercase text-[10px] shadow-2xl italic tracking-tight">Citizen Vault</div>
              </div>
              <div className="absolute bottom-6 left-8">
                 <div className="w-24 h-24 rounded-[2.5rem] border-4 border-[#c1ff22] overflow-hidden shadow-2xl">
                    <img src={viewedPassenger.profile_pic || 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg'} className="w-full h-full object-cover" />
                 </div>
              </div>
           </div>

           <div className="flex-1 bg-zinc-950 rounded-t-[3.5rem] -mt-10 relative z-10 p-8 border-t border-white/5 overflow-y-auto no-scrollbar pb-32">
              <div className="space-y-8">
                 <div className="min-w-0">
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-white leading-tight">{viewedPassenger.name} {viewedPassenger.last_name || ''}</h3>
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                       <div className="flex items-center gap-1.5 px-3 py-1 bg-[#c1ff22]/10 rounded-full border border-[#c1ff22]/30">
                          <Star className="w-3.5 h-3.5 text-[#c1ff22] fill-current" />
                          <span className="text-[10px] font-black text-[#c1ff22]">{(viewedPassenger.rating || 5.0).toFixed(1)}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-green-500" />
                          <span className="text-[10px] font-black uppercase text-zinc-600 tracking-widest italic">Verified Citizen</span>
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-2 shadow-xl">
                       <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Citizen Age</p>
                       <p className="text-xl font-black text-white italic">{viewedPassenger.age || 'N/A'} Years</p>
                    </div>
                    <div className="bg-zinc-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-2 shadow-xl">
                       <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Gender</p>
                       <p className="text-xl font-black text-[#c1ff22] italic">{viewedPassenger.gender || 'Not Set'}</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h4 className="text-sm font-black uppercase italic tracking-tighter text-white">Captain Feedback</h4>
                       <Award className="w-5 h-5 text-[#c1ff22]" />
                    </div>
                    
                    {isLoadingPassengerProfile ? (
                      <div className="py-10 flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-zinc-800" /></div>
                    ) : viewedPassengerReviews.length === 0 ? (
                      <div className="py-20 text-center opacity-10 space-y-4">
                         <Star className="w-16 h-16 mx-auto" />
                         <p className="font-black uppercase text-xs">No feedback logged in registry</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                         {viewedPassengerReviews.map((rev, idx) => (
                           <div key={idx} className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-4 animate-in slide-in-from-bottom-4">
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <img src={rev.reviewer?.profile_pic || 'https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg'} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                    <div>
                                       <p className="text-white font-black uppercase italic text-[10px] leading-none">{rev.reviewer?.name || 'Captain'}</p>
                                       <div className="flex text-[#c1ff22] mt-1">{Array(rev.rating).fill(0).map((_, i) => <Star key={i} className="w-2.5 h-2.5 fill-current" />)}</div>
                                    </div>
                                 </div>
                                 <span className="text-[8px] font-black text-zinc-700 uppercase">{new Date(rev.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-zinc-400 text-xs italic leading-relaxed font-medium">"{rev.comment}"</p>
                           </div>
                         ))}
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {showSupportForm && (
        <div className="fixed inset-0 z-[2000] bg-[#0c0c0c] flex flex-col animate-in slide-in-from-bottom duration-300">
           <header className="p-6 pt-12 flex items-center justify-between border-b border-white/5 bg-zinc-900/40">
              <div className="flex items-center gap-4">
                <LifeBuoy className="w-6 h-6 text-[#c1ff22]" />
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-white">Support <span className="text-[#c1ff22]">& Complain</span></h3>
              </div>
              <button onClick={() => setShowSupportForm(false)} className="p-3 bg-white/5 rounded-2xl active:scale-90 transition-transform"><X className="w-6 h-6 text-white" /></button>
           </header>
           <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                  <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Subject</label>
                  <input className="bg-transparent w-full outline-none text-white font-bold" placeholder="e.g. Passenger did wrong with me" value={complaintForm.subject} onChange={e => setComplaintForm({...complaintForm, subject: e.target.value})} />
              </div>
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                  <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Passenger Name</label>
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-zinc-500" />
                    <input className="bg-transparent w-full outline-none text-white font-bold" placeholder="Name of person you're reporting" value={complaintForm.targetName} onChange={e => setComplaintForm({...complaintForm, targetName: e.target.value})} />
                  </div>
              </div>
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                  <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Mobile Number</label>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-zinc-500" />
                    <input className="bg-transparent w-full outline-none text-white font-bold" placeholder="Their mobile number (if known)" value={complaintForm.targetPhone} onChange={e => setComplaintForm({...complaintForm, targetPhone: e.target.value})} />
                  </div>
              </div>
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                  <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Email ID</label>
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-zinc-500" />
                    <input className="bg-transparent w-full outline-none text-white font-bold" placeholder="Their email address (if known)" value={complaintForm.targetEmail} onChange={e => setComplaintForm({...complaintForm, targetEmail: e.target.value})} />
                  </div>
              </div>
              <div className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 focus-within:border-[#c1ff22]/30 transition-all">
                  <label className="text-[10px] text-zinc-600 uppercase font-black tracking-widest block mb-1.5">Full Message / Details</label>
                  <div className="flex items-start gap-3">
                    <AlignLeft className="w-4 h-4 text-zinc-500 mt-1" />
                    <textarea className="bg-transparent w-full outline-none text-white font-bold h-32 resize-none" placeholder="Explain what happened in detail..." value={complaintForm.message} onChange={e => setComplaintForm({...complaintForm, message: e.target.value})} />
                  </div>
              </div>
              
              <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Attachment / Proof (Screenshot)</p>
                 <div onClick={() => proofInputRef.current?.click()} className="h-48 rounded-3xl border border-dashed border-white/10 bg-zinc-900 flex flex-col items-center justify-center cursor-pointer overflow-hidden group hover:border-[#c1ff22]/30 transition-all">
                    {complaintForm.proof ? (
                      <img src={complaintForm.proof} className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-zinc-600 mb-2 group-hover:text-[#c1ff22] transition-colors" />
                        <span className="text-[8px] font-black uppercase text-zinc-700">Add Evidence</span>
                      </>
                    )}
                 </div>
                 <input type="file" ref={proofInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>

              <button onClick={submitComplaint} disabled={isSubmittingComplaint} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black uppercase text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">
                {isSubmittingComplaint ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log Incident to HQ'}
              </button>
           </div>
        </div>
      )}

      {showCancelDialog && (
        <div className="fixed inset-0 z-[1000] bg-black/95 flex flex-col justify-end p-6 animate-in fade-in">
           <div className="bg-zinc-900 rounded-[3.5rem] p-8 border border-white/10 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold uppercase italic text-zinc-100 leading-none">Cancel <span className="text-rose-500">Trip?</span></h3>
                <button onClick={() => setShowCancelDialog(false)} className="p-3 bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {DRIVER_CANCEL_REASONS.map(reason => (
                  <button key={reason} onClick={() => handleCancelTrip(reason)} className="w-full bg-black/40 p-5 rounded-2xl text-left font-bold uppercase text-[10px] text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all border border-white/5 active:scale-[0.98]">
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

export default DriverDashboard;
