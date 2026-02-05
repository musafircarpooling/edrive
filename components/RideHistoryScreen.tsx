
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, MapPin, ChevronRight, X, Star, ShieldCheck, CreditCard, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { RIDE_OPTIONS } from '../constants';
import { RealtimeRideRequest, RideType } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface RideHistoryScreenProps {
  userProfile: any;
  onBack: () => void;
}

const RideHistoryScreen: React.FC<RideHistoryScreenProps> = ({ userProfile, onBack }) => {
  const [selectedRide, setSelectedRide] = useState<RealtimeRideRequest | null>(null);
  const [history, setHistory] = useState<RealtimeRideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRideHistory();
  }, [userProfile.email]);

  const fetchRideHistory = async () => {
    if (!userProfile.email) return;
    setIsLoading(true);
    try {
      // Index-Free Strategy: Fetch all completed/cancelled rides for the user without orderBy
      // We perform filtering for 'passenger or driver' client-side if needed, or use two single-field queries
      const q = query(
        collection(db, 'ride_requests'),
        where('status', 'in', ['completed', 'cancelled'])
      );

      const querySnapshot = await getDocs(q);
      const allRides = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as RealtimeRideRequest));
      
      // Filter by user role and sort by date in JS
      const userRides = allRides
        .filter(ride => ride.passenger_id === userProfile.email || ride.driver_id === userProfile.email)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

      setHistory(userRides);
    } catch (err: any) {
      console.error("🔥 eDrive History Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRideIcon = (type: RideType) => {
    return RIDE_OPTIONS.find(opt => opt.type === type)?.icon;
  };

  const RideDetailModal = ({ ride, onClose }: { ride: RealtimeRideRequest; onClose: () => void }) => (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0a] animate-in slide-in-from-bottom duration-300">
      <div className="p-6 pt-12 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-md">
        <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Ride Details</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        <div className="text-center space-y-2">
          <div className="text-5xl font-black text-[#c1ff22] italic tracking-tighter">Rs {ride.base_fare}</div>
          <div className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">
            {ride.created_at ? new Date(ride.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date Unknown'}
          </div>
          
          <div className={`mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${
            ride.status === 'completed' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            {ride.status === 'completed' ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-black uppercase tracking-widest">{ride.status}</span>
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-[2.5rem] p-8 border border-white/5 space-y-8">
            <div className="flex gap-5">
              <div className="flex flex-col items-center pt-1.5 shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#c1ff22] shadow-[0_0_10px_#c1ff22]"></div>
                <div className="w-0.5 h-16 border-l border-dashed border-zinc-700 my-1"></div>
                <div className="w-3 h-3 rounded-full border-2 border-[#c1ff22]"></div>
              </div>
              <div className="flex-1 space-y-8 min-w-0">
                <div>
                  <div className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Pickup</div>
                  <div className="text-white font-bold text-sm leading-tight break-words">{ride.pickup_address}</div>
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase text-zinc-600 tracking-widest mb-1">Destination</div>
                  <div className="text-white font-bold text-sm leading-tight break-words">{ride.dest_address}</div>
                </div>
              </div>
            </div>
        </div>

        {ride.status === 'cancelled' && ride.cancel_reason && (
          <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-[2rem]">
            <p className="text-[9px] font-black uppercase text-rose-500/60 tracking-widest mb-1">Reason for Cancellation</p>
            <p className="text-white font-bold text-xs">{ride.cancel_reason}</p>
          </div>
        )}

        <div className="bg-zinc-900/50 rounded-[2.5rem] p-6 border border-white/5">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-2 border-[#c1ff22]/20 bg-zinc-800 flex items-center justify-center">
              <img 
                src={ride.passenger_image || "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg"} 
                className="w-full h-full object-cover" 
                onError={(e) => (e.currentTarget.src = "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg")}
              />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">
                {ride.passenger_id === userProfile.email ? 'Ride History' : ride.passenger_name}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{ride.ride_type} • Hafizabad Fleet</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
              <img src={getRideIcon(ride.ride_type)} className="w-8 h-8 object-contain opacity-40" />
            </div>
          </div>
        </div>

        <button className="w-full bg-zinc-800 text-zinc-400 py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest hover:text-white transition-all flex items-center justify-center gap-3">
          <CreditCard className="w-5 h-5" /> Report an issue
        </button>
      </div>

      <div className="p-10 text-center opacity-10">
        <div className="text-white font-black italic text-4xl tracking-tighter uppercase">edrive</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
      <div className="p-6 pt-12 flex items-center gap-5 border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <button onClick={onBack} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
          <ArrowLeft className="w-7 h-7 text-[#c1ff22]" />
        </button>
        <div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">Your <span className="text-[#c1ff22]">Trips</span></h1>
          <p className="text-[8px] font-black uppercase text-zinc-600 tracking-[0.3em]">Hafizabad Records</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-12">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
            <Loader2 className="w-10 h-10 text-[#c1ff22] animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scanning City Ledger...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-20 opacity-20 text-center space-y-6">
            <div className="w-24 h-24 bg-zinc-900 rounded-[3rem] flex items-center justify-center">
              <Clock className="w-10 h-10" />
            </div>
            <div>
              <p className="font-black text-xl uppercase tracking-tighter italic">No History Found</p>
              <p className="text-[10px] uppercase font-black tracking-widest mt-2">Completed trips will appear here</p>
            </div>
          </div>
        ) : (
          history.map((ride) => (
            <button
              key={ride.id}
              onClick={() => setSelectedRide(ride)}
              className="w-full bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-6 flex items-center gap-5 hover:bg-[#c1ff22]/5 hover:border-[#c1ff22]/20 transition-all active:scale-[0.98] text-left group animate-in slide-in-from-bottom-4"
            >
              <div className="w-16 h-16 bg-zinc-800 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 group-hover:bg-[#c1ff22]/20 transition-colors border border-white/5 shadow-xl">
                <img src={getRideIcon(ride.ride_type)} className="w-9 h-9 object-contain" alt={ride.ride_type} />
              </div>
              
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {ride.created_at ? new Date(ride.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : '---'}
                  </span>
                  <span className={`text-xl font-black italic ${ride.status === 'cancelled' ? 'text-zinc-600 line-through' : 'text-[#c1ff22]'}`}>
                    Rs {ride.base_fare}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 font-bold text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c1ff22] shrink-0" />
                  <span className="truncate">{ride.pickup_address}</span>
                </div>
                <div className="flex items-center gap-2 text-white font-bold text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span className="truncate">{ride.dest_address}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {selectedRide && (
        <RideDetailModal ride={selectedRide} onClose={() => setSelectedRide(null)} />
      )}
    </div>
  );
};

export default RideHistoryScreen;
