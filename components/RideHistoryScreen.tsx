
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ChevronRight, Loader2, Navigation, Clock, Menu, 
  MapPin, Target, Calendar, User, Info, MessageSquare, 
  RotateCcw, ArrowLeftRight, FileText, Banknote, Trash2,
  Download, Share2, Mail, X
} from 'lucide-react';
import { RIDE_OPTIONS } from '../constants';
import { RealtimeRideRequest } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';

interface RideHistoryScreenProps {
  userProfile: any;
  onBack: () => void;
}

const RideHistoryScreen: React.FC<RideHistoryScreenProps> = ({ userProfile, onBack }) => {
  const [history, setHistory] = useState<RealtimeRideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState<RealtimeRideRequest | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const qPassenger = query(
          collection(db, 'ride_requests'),
          where('passenger_id', '==', userProfile.uid || userProfile.email)
        );
        const qDriver = query(
          collection(db, 'ride_requests'),
          where('driver_id', '==', userProfile.uid || userProfile.email)
        );

        const [pSnap, dSnap] = await Promise.all([getDocs(qPassenger), getDocs(qDriver)]);
        const combined = [
          ...pSnap.docs.map(d => ({ ...d.data(), id: d.id } as RealtimeRideRequest)),
          ...dSnap.docs.map(d => ({ ...d.data(), id: d.id } as RealtimeRideRequest))
        ];

        const relevant = combined.filter(r => ['completed', 'cancelled'].includes(r.status));
        setHistory(relevant.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (e) {
        console.error("History fetch error", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [userProfile.uid, userProfile.email]);

  const formatRideDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    } as Intl.DateTimeFormatOptions).replace(/,/g, '');
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Remove this ride from history?")) return;
    try {
      await deleteDoc(doc(db, 'ride_requests', id));
      setHistory(prev => prev.filter(r => r.id !== id));
      setSelectedRide(null);
    } catch (e) {
      alert("Failed to remove ride.");
    }
  };

  const openReceipt = () => {
    setLoadingReceipt(true);
    setTimeout(() => {
      setLoadingReceipt(false);
      setShowReceipt(true);
    }, 2000); // 2 second loading as requested
  };

  // Receipt Detail View
  if (showReceipt && selectedRide) {
    const fare = selectedRide.final_fare || selectedRide.base_fare;
    const tax = fare * 0.05;
    const baseFare = fare - tax;

    return (
      <div className="fixed inset-0 z-[1000] bg-[#111111] flex flex-col animate-in fade-in duration-300">
        <header className="px-6 pt-12 pb-4 flex items-center justify-between border-b border-white/5 no-print">
          <button onClick={() => setShowReceipt(false)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-lg font-bold">Receipt</h1>
          <div className="w-10" />
        </header>

        <div className="flex-1 overflow-y-auto p-4 bg-[#111111]">
          {/* White Paper Receipt */}
          <div className="bg-white text-black p-8 rounded-sm shadow-2xl min-h-[600px] font-sans selection:bg-[#c1ff22]">
            {/* Header / Logo Section */}
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-[#c1ff22] w-12 h-12 rounded-xl flex items-center justify-center text-black font-black italic transform -skew-x-6 text-3xl">e</div>
              <h2 className="text-3xl font-black italic tracking-tighter">eDrive</h2>
            </div>

            <div className="text-center mb-8">
              <p className="text-[11px] font-bold uppercase">Receipt (Tax invoice) for your ride</p>
              <p className="text-[10px] text-zinc-600 font-medium">Invoice number: EDRV-{selectedRide.id.slice(-8).toUpperCase()}</p>
            </div>

            <div className="flex justify-between items-start mb-8 text-[11px]">
              <div>
                <p className="font-bold">To: <span className="font-normal">{userProfile.name}</span></p>
              </div>
              <p className="font-bold">Date: <span className="font-normal">{new Date(selectedRide.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span></p>
            </div>

            <div className="space-y-1 mb-10 text-[10px] leading-relaxed">
              <p><span className="font-bold">Invoice is issued by:</span> AIAN</p>
              <p><span className="font-bold">On behalf of:</span> Transport Service Provider</p>
              <p><span className="font-bold">Driver's Name:</span> {selectedRide.driver_name || "Asif Azhar"}</p>
              <p><span className="font-bold">Service Supply Location:</span> Punjab</p>
              <p><span className="font-bold">Car details:</span> {selectedRide.ride_type === 'MOTO' ? 'red MOTOR-BIKE Honda AGW-6874' : 'white TOYOTA Corolla'}</p>
            </div>

            <div className="space-y-4 mb-10 text-[10px]">
              <div>
                <p className="font-bold">Pick-up Location:</p>
                <p className="text-zinc-600">{selectedRide.pickup_address}, Hafizabad, Punjab, Pakistan</p>
              </div>
              <div>
                <p className="font-bold">Drop-off Location:</p>
                <p className="text-zinc-600">{selectedRide.dest_address}, Hafizabad, Punjab, Pakistan</p>
              </div>
              <div>
                <p className="font-bold">Ride Start Time:</p>
                <p className="text-zinc-600">{formatTime(selectedRide.created_at)}</p>
              </div>
            </div>

            {/* Price Table */}
            <div className="border-t border-b border-black/10 py-2 mb-6 text-[10px]">
              <div className="flex justify-between font-bold mb-2">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="h-px bg-black/10 mb-2" />
              <div className="flex justify-between mb-1.5">
                <span>Ride fare (ST included)</span>
                <span>PKR {fare.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax 5%</span>
                <span>PKR {tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-right mb-16">
              <p className="text-[11px] font-black italic">Total Amount (incl. ST) <span className="ml-2">PKR {fare.toFixed(2)}</span></p>
            </div>

            {/* Legal Footer */}
            <div className="text-[8px] text-zinc-500 leading-normal space-y-4">
              <p>eDrive does not provide transportation services to passengers and only issues tax invoice on behalf of a driver providing transportation services. eDrive collects the sales tax on behalf of a driver and pays the sales tax to the government treasury.</p>
              <p>Company Registration Address: OFFICE 106, 1ST FLOOR, HAWAII TOWER, HAFIZABAD CITY HUB, PAKISTAN</p>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-8 flex justify-center gap-10 bg-[#111111]">
          {[
            { icon: Download, label: 'Download' },
            { icon: Share2, label: 'Share' },
            { icon: Mail, label: 'Mail' }
          ].map((btn, i) => (
            <button key={i} className="flex flex-col items-center gap-3 active:scale-90 transition-transform">
              <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5">
                <btn.icon className="w-6 h-6 text-zinc-300" />
              </div>
              <span className="text-[11px] font-bold text-white">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Custom Loading State for Receipt
  if (loadingReceipt) {
    return (
      <div className="fixed inset-0 z-[1000] bg-[#111111] flex flex-col items-center justify-center animate-in fade-in duration-300">
        <style>{`
          .receipt-spinner {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: conic-gradient(from 0deg, transparent 40%, #ffffff 100%);
            mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #fff 0);
            -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 6px), #fff 0);
            animation: rotate-spinner 1s linear infinite;
          }
          @keyframes rotate-spinner {
            to { transform: rotate(360deg); }
          }
        `}</style>
        <div className="flex flex-col items-center gap-8">
          <div className="w-20 h-20 bg-[#c1ff22] rounded-[2rem] flex items-center justify-center shadow-[0_20px_60px_rgba(193,255,34,0.3)]">
            <FileText className="w-10 h-10 text-black fill-current" />
          </div>
          <h2 className="text-2xl font-black italic text-white uppercase tracking-tighter">Receipt</h2>
          <div className="receipt-spinner opacity-40 mt-4" />
        </div>
      </div>
    );
  }

  if (selectedRide) {
    return (
      <div className="fixed inset-0 z-[500] bg-[#111111] text-white flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
        {/* Detail Header */}
        <header className="px-6 pt-12 pb-4 flex items-center bg-[#111111] border-b border-white/5">
          <button onClick={() => setSelectedRide(null)} className="p-2 -ml-2 active:scale-90 transition-transform">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex-1 text-center pr-10">
            <h1 className="text-lg font-bold">{formatRideDate(selectedRide.created_at)}</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8">
          {/* Route Section */}
          <div className="space-y-6 relative">
             <div className="absolute left-[5px] top-[10px] bottom-[10px] w-[1px] border-l border-dotted border-zinc-700" />
             
             {/* Pickup */}
             <div className="flex justify-between items-start gap-4">
               <div className="flex items-start gap-4 flex-1">
                 <div className="w-2.5 h-2.5 rounded-full border-2 border-[#3b82f6] bg-[#111111] mt-1.5 z-10 shrink-0" />
                 <p className="text-[15px] font-medium text-white leading-tight">{selectedRide.pickup_address}</p>
               </div>
               <span className="text-[13px] font-medium text-zinc-500 whitespace-nowrap">{formatTime(selectedRide.created_at)}</span>
             </div>

             {/* Drop */}
             <div className="flex justify-between items-start gap-4">
               <div className="flex items-start gap-4 flex-1">
                 <div className="w-2.5 h-2.5 rounded-full bg-[#84cc16] mt-1.5 z-10 shrink-0" />
                 <p className="text-[15px] font-medium text-white leading-tight">{selectedRide.dest_address}</p>
               </div>
               <span className="text-[13px] font-medium text-zinc-500 whitespace-nowrap">{formatTime(selectedRide.completed_at || selectedRide.created_at)}</span>
             </div>
          </div>

          {/* Stats Summary Row */}
          <div className="flex items-center gap-10 py-2 border-t border-white/5 pt-6">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                 <Clock className="w-5 h-5 text-white" />
               </div>
               <div>
                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Duration</p>
                  <p className="text-base font-bold text-white">23 min</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                 <Navigation className="w-5 h-5 text-white" />
               </div>
               <div>
                  <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Distance</p>
                  <p className="text-base font-bold text-white">151 m</p>
               </div>
            </div>
          </div>

          {/* Captain Section */}
          <div className="pt-6 border-t border-white/5 flex items-center gap-4">
             <img src={selectedRide.driver_image || userProfile.profilePic} className="w-16 h-16 rounded-full border border-white/10 object-cover" />
             <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{selectedRide.driver_name || "Captain"}</h3>
                <p className="text-[13px] text-zinc-500 font-medium">
                  {selectedRide.ride_type === 'MOTO' ? 'Red MOTOR-BIKE Honda' : 'White TOYOTA Corolla'},<br/>
                  LEV-16A-6196
                </p>
             </div>
          </div>

          {/* Action Icons Grid */}
          <div className="grid grid-cols-4 gap-4 py-8 border-t border-white/5">
             <button onClick={openReceipt} className="flex flex-col items-center gap-3 group active:scale-95 transition-all">
                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 group-hover:bg-zinc-800">
                  <FileText className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                </div>
                <span className="text-[11px] font-medium text-zinc-400 text-center leading-tight">Receipt</span>
             </button>
             {[
               { icon: MessageSquare, label: 'Support' },
               { icon: RotateCcw, label: 'Repeat ride' },
               { icon: ArrowLeftRight, label: 'Return route' }
             ].map((action, i) => (
               <button key={i} className="flex flex-col items-center gap-3 group active:scale-95 transition-all">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 group-hover:bg-zinc-800">
                    <action.icon className="w-6 h-6 text-zinc-400 group-hover:text-white" />
                  </div>
                  <span className="text-[11px] font-medium text-zinc-400 text-center leading-tight">{action.label}</span>
               </button>
             ))}
          </div>

          {/* Payment Section */}
          <div className="space-y-6 pt-4">
             <h4 className="text-lg font-bold text-white">I paid</h4>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <p className="text-sm font-medium text-white">Fare</p>
                   <p className="text-sm font-bold text-white">PKR {(selectedRide.final_fare || selectedRide.base_fare).toFixed(2)}</p>
                </div>
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <Banknote className="w-5 h-5 text-[#84cc16]" />
                      <p className="text-sm font-bold text-white">Total paid</p>
                   </div>
                   <p className="text-sm font-bold text-white">PKR {(selectedRide.final_fare || selectedRide.base_fare).toFixed(2)}</p>
                </div>
             </div>
          </div>
        </div>

        {/* Bottom Action */}
        <div className="p-6 pb-12 bg-[#111111]">
           <button 
             onClick={() => handleRemove(selectedRide.id)}
             className="w-full bg-zinc-900 text-rose-500/80 py-6 rounded-2xl font-bold text-base border border-white/5 active:scale-95 transition-transform"
           >
             Remove from history
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111111] text-white overflow-hidden">
      <header className="px-5 pt-12 pb-6 flex items-center bg-[#111111] z-10 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2">
          <Menu className="w-6 h-6 text-white" />
        </button>
        <div className="flex-1 text-center pr-4">
          <h1 className="text-lg font-bold tracking-tight">My rides</h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Loading history...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-30">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-700">
              <Clock className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium">No rides found</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {history.map((ride) => (
              <div 
                key={ride.id} 
                onClick={() => setSelectedRide(ride)}
                className="border-b border-white/5 px-5 py-6 space-y-4 active:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-[15px] font-bold text-white">
                    {formatRideDate(ride.created_at)}
                  </h3>
                  <p className="text-[15px] font-bold text-white">
                    PKR {(ride.final_fare || ride.base_fare).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-start gap-4 relative">
                  <div className="absolute left-[5px] top-[10px] bottom-[10px] w-0.5 border-l border-dotted border-zinc-700" />
                  
                  <div className="flex flex-col gap-5 w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-[#3b82f6] bg-[#111111] z-10" />
                      <p className="text-[13px] font-medium text-zinc-300 truncate pr-6">{ride.pickup_address}</p>
                    </div>
                    <div className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#84cc16] z-10" />
                        <p className="text-[13px] font-medium text-zinc-300 truncate pr-6">{ride.dest_address}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-800 shrink-0" />
                    </div>
                  </div>
                </div>

                {ride.status === 'cancelled' && (
                  <div className="inline-block bg-zinc-800/80 px-3 py-1.5 rounded-lg">
                    <span className="text-[11px] font-medium text-zinc-300">You cancelled</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 text-center opacity-10">
        <p className="text-[8px] font-black uppercase tracking-[0.5em]">eDrive Hafizabad History</p>
      </div>
    </div>
  );
};

export default RideHistoryScreen;
