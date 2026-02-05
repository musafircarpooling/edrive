
import React, { useState, useEffect, useRef } from 'react';
import { Send, X, User, ShieldCheck, Sparkles, MessageSquare, MapPin, Navigation, Maximize2, Minimize2, Radio, AlertTriangle, Ban, Flag, Loader2 } from 'lucide-react';
// Fixed: Migrated from Supabase to Firebase
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

interface ChatOverlayProps {
  requestId: string;
  currentUserEmail: string;
  onClose: () => void;
  otherPartyName: string;
}

const QUICK_MESSAGES = [
  "Assalam-o-alaikum!",
  "Pahunch raha hoon.",
  "Kahan hain aap?",
  "I am arriving in 2 mins.",
  "Theek hai (OK).",
  "Location pe hoon.",
  "Wait please.",
  "Ji, aa jayen.",
  "Chalen?"
];

const REPORT_REASONS = [
  "Misbehavior / Rude",
  "Asking for extra fare",
  "Safety concerns",
  "Reckless driving",
  "Wrong identity",
  "Harassment"
];

const ChatOverlay: React.FC<ChatOverlayProps> = ({ requestId, currentUserEmail, onClose, otherPartyName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [otherLocation, setOtherLocation] = useState<{lat: number, lng: number} | null>(null);
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number}>({ lat: 32.0711, lng: 73.6875 });
  
  const [showSafetyOptions, setShowSafetyOptions] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportDetails, setReportDetails] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const myMarker = useRef<any>(null);
  const otherMarker = useRef<any>(null);

  useEffect(() => {
    const L = (window as any).L;
    if (!L || !mapContainerRef.current || leafletMap.current) return;

    leafletMap.current = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true
    }).setView([32.0711, 73.6875], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(leafletMap.current);

    myMarker.current = L.marker([myLocation.lat, myLocation.lng], {
      icon: L.divIcon({ 
        html: `
          <div class="relative">
            <div class="absolute -inset-2 bg-[#c1ff22]/20 rounded-full animate-ping"></div>
            <div class="w-5 h-5 bg-[#c1ff22] rounded-full border-2 border-black shadow-lg flex items-center justify-center">
              <div class="w-1.5 h-1.5 bg-black rounded-full"></div>
            </div>
          </div>
        `, 
        className: '', 
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    }).addTo(leafletMap.current);

    otherMarker.current = L.marker([32.0711, 73.6875], {
      icon: L.divIcon({ 
        html: `
          <div class="relative">
            <div class="w-5 h-5 bg-black rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div class="w-1.5 h-1.5 bg-[#c1ff22] rounded-full animate-pulse"></div>
            </div>
          </div>
        `, 
        className: '', 
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let geoWatchId: number;
    // Fixed: Migrated location sync to Firestore document tracking
    const locDocRef = doc(db, 'active_locations', requestId);
    
    const unsubscribe = onSnapshot(locDocRef, (snapshot) => {
      const data = snapshot.data();
      if (data) {
        Object.keys(data).forEach(email => {
          if (email !== currentUserEmail) {
            const loc = data[email];
            setOtherLocation({ lat: loc.lat, lng: loc.lng });
          }
        });
      }
    });

    if ("geolocation" in navigator) {
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setMyLocation(newPos);
          setDoc(locDocRef, { [currentUserEmail]: newPos }, { merge: true });
        },
        null,
        { enableHighAccuracy: true }
      );
    }
    return () => { if (geoWatchId) navigator.geolocation.clearWatch(geoWatchId); unsubscribe(); };
  }, [currentUserEmail, requestId]);

  const sortMessages = (msgs: Message[]) => {
    return [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  };

  useEffect(() => {
    const fetchMessages = async () => {
      // Index-Free strategy: Remove 'orderBy' to avoid composite index requirement
      const q = query(
        collection(db, 'ride_chat'), 
        where('request_id', '==', requestId)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Message));
      setMessages(sortMessages(data));
    };
    fetchMessages();
    
    const qChat = query(
      collection(db, 'ride_chat'), 
      where('request_id', '==', requestId)
    );
    
    const unsubscribe = onSnapshot(qChat, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newMsg = { ...change.doc.data(), id: change.doc.id } as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return sortMessages([...prev, newMsg]);
          });
        }
      });
    }, (err) => {
      console.error("Chat sync failed:", err);
    });

    return () => { unsubscribe(); };
  }, [requestId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleBlockUser = async () => {
    // Fixed: Migrated block user functionality to Firestore
    const rideSnap = await getDoc(doc(db, 'ride_requests', requestId));
    if (!rideSnap.exists()) return;
    const ride = rideSnap.data();
    const targetEmail = currentUserEmail === ride.passenger_id ? ride.driver_id : ride.passenger_id;
    
    if (!confirm(`Are you sure you want to block ${otherPartyName}? You won't see their rides/offers again.`)) return;
    
    await addDoc(collection(db, 'user_blocks'), {
      blocker_id: currentUserEmail,
      blocked_id: targetEmail,
      created_at: new Date().toISOString()
    });
    alert("User blocked. Closing chat.");
    onClose();
  };

  const submitReport = async () => {
    if (!selectedReason || isSubmittingReport) return;
    setIsSubmittingReport(true);
    try {
      // Fixed: Migrated incident reporting to Firestore
      const rideSnap = await getDoc(doc(db, 'ride_requests', requestId));
      if (!rideSnap.exists()) throw new Error("Could not find ride details for report.");
      const ride = rideSnap.data();

      const targetEmail = currentUserEmail === ride.passenger_id ? ride.driver_id : ride.passenger_id;
      if (!targetEmail) throw new Error("Could not identify the other party for the report.");

      await addDoc(collection(db, 'reports'), {
        id: `rep-${Date.now()}`,
        reporter_id: currentUserEmail,
        reported_id: targetEmail,
        reason: selectedReason,
        details: reportDetails || "No additional comments",
        ride_request_id: requestId, 
        created_at: new Date().toISOString()
      });

      alert("Success: Incident reported to Hafizabad HQ. Our safety team will review this immediately.");
      setShowReportForm(false);
      setShowSafetyOptions(false);
      setReportDetails("");
      setSelectedReason("");
    } catch (err: any) {
      console.error("Report Error:", err);
      alert("Report Failed: " + (err.message || "Connection error. Please check your internet."));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage("");
    // Fixed: Migrated chat message sending to Firestore addDoc
    await addDoc(collection(db, 'ride_chat'), { 
      request_id: requestId, 
      sender_id: currentUserEmail, 
      text: msg.trim(),
      created_at: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="p-6 pt-12 border-b border-white/5 bg-black/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center border border-[#c1ff22]/30 shadow-inner">
            <User className="w-5 h-5 text-[#c1ff22]" />
          </div>
          <div>
            <h3 className="font-black text-white text-sm uppercase italic tracking-tight">{otherPartyName}</h3>
            <p className="text-[8px] text-[#c1ff22] font-black uppercase tracking-[0.2em]">Secure City Line</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setShowSafetyOptions(true)} className="p-2.5 bg-rose-500/10 rounded-2xl text-rose-500 active:scale-90"><AlertTriangle className="w-6 h-6" /></button>
           <button onClick={onClose} className="p-2.5 bg-white/5 rounded-2xl text-white"><X className="w-6 h-6" /></button>
        </div>
      </div>

      <div className={`relative transition-all duration-500 overflow-hidden bg-[#121212] ${isMapExpanded ? 'h-1/2' : 'h-24'}`}>
        <div ref={mapContainerRef} className="w-full h-full" />
        <button onClick={() => setIsMapExpanded(!isMapExpanded)} className="absolute top-4 right-4 z-[1000] bg-black/80 p-3 rounded-2xl text-[#c1ff22]">{isMapExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
        {messages.map((m) => {
          const isMe = m.sender_id === currentUserEmail;
          return (
            <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[80%] px-5 py-3.5 rounded-[1.8rem] font-bold text-sm ${isMe ? 'bg-[#c1ff22] text-black rounded-tr-none' : 'bg-zinc-800 text-white rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-6 py-3 flex flex-wrap gap-2 overflow-x-auto no-scrollbar bg-black/40 border-t border-white/5">
         {QUICK_MESSAGES.map(txt => (
           <button key={txt} onClick={() => setNewMessage(txt)} className="whitespace-nowrap bg-zinc-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">{txt}</button>
         ))}
      </div>

      <div className="bg-zinc-900/95 border-t border-white/5 p-6">
          <form onSubmit={handleSend} className="flex gap-3">
            <input className="flex-1 bg-zinc-800 rounded-[1.8rem] px-6 py-5 outline-none text-white font-bold text-sm" placeholder="Message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
            <button type="submit" className="bg-[#c1ff22] p-5 rounded-2xl text-black active:scale-90 flex items-center justify-center"><Send className="w-6 h-6" /></button>
          </form>
      </div>

      {showSafetyOptions && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-end justify-center p-6 animate-in fade-in">
           <div className="w-full max-w-sm bg-zinc-900 rounded-[3rem] p-8 border border-rose-500/20 shadow-2xl space-y-4 animate-in slide-in-from-bottom-10">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-2xl font-black italic uppercase text-rose-500 tracking-tighter">Safety <span className="text-white">Center</span></h2>
                 <button onClick={() => setShowSafetyOptions(false)} className="p-2 bg-white/5 rounded-full"><X className="w-6 h-6 text-white" /></button>
              </div>
              <button onClick={handleBlockUser} className="w-full bg-zinc-800 p-5 rounded-2xl flex items-center gap-4 active:scale-95 transition-all">
                 <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center"><Ban className="w-5 h-5 text-rose-500" /></div>
                 <div className="text-left"><p className="text-white font-black uppercase text-xs">Block {otherPartyName}</p><p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Restrict future connection</p></div>
              </button>
              <button onClick={() => { setShowReportForm(true); setShowSafetyOptions(false); }} className="w-full bg-zinc-800 p-5 rounded-2xl flex items-center gap-4 active:scale-95 transition-all">
                 <div className="w-10 h-10 bg-[#c1ff22]/10 rounded-xl flex items-center justify-center"><Flag className="w-5 h-5 text-[#c1ff22]" /></div>
                 <div className="text-left"><p className="text-white font-black uppercase text-xs">Submit Incident Report</p><p className="text-[8px] text-zinc-600 font-black uppercase tracking-widest">Inform City Admin Team</p></div>
              </button>
           </div>
        </div>
      )}

      {showReportForm && (
        <div className="fixed inset-0 z-[400] bg-[#0c0c0c] flex flex-col p-6 animate-in slide-in-from-bottom">
           <header className="flex justify-between items-center mb-10 pt-10">
              <h2 className="text-3xl font-black italic uppercase text-rose-500 tracking-tighter">Incident <span className="text-white">Form</span></h2>
              <button onClick={() => setShowReportForm(false)} className="p-3 bg-white/5 rounded-2xl"><X className="w-6 h-6 text-white" /></button>
           </header>
           <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar pb-32">
              <div className="space-y-3">
                 <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Select Incident Reason</p>
                 <div className="grid grid-cols-2 gap-3">
                    {REPORT_REASONS.map(r => (
                      <button key={r} onClick={() => setSelectedReason(r)} className={`p-4 rounded-2xl text-[10px] font-black uppercase text-center border transition-all ${selectedReason === r ? 'bg-rose-500 border-rose-500 text-white' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}>{r}</button>
                    ))}
                 </div>
              </div>
              <textarea className="w-full bg-zinc-900 border border-white/5 rounded-[2rem] p-6 text-white text-sm font-bold min-h-[150px] outline-none focus:border-rose-500/30" placeholder="Explain what happened..." value={reportDetails} onChange={e => setReportDetails(e.target.value)} />
              <button onClick={submitReport} disabled={isSubmittingReport || !selectedReason} className="w-full bg-rose-500 text-white py-5 rounded-[2.5rem] font-black uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                {isSubmittingReport ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Commit Report to HQ'}
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default ChatOverlay;
