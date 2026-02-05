
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Car, BarChart3, LogOut, ChevronLeft, 
  CheckCircle, XCircle, Loader2, Search, 
  RefreshCw, MapPin, Edit3, Trash2, Save, X, 
  ShieldCheck, Star, Mail, Phone, 
  Clock, FileText, Ban, CheckCircle2, Eye, 
  AlertTriangle, Flag, Briefcase, Info, 
  Plus, Download, Upload, Send, Bell, Filter, Link, Clock3, User, Calendar, History, ShieldAlert, Printer, LifeBuoy, AlignLeft, Camera, LayoutGrid, Image as LucideImage, PlusCircle, FilePlus, Smartphone, CreditCard, ExternalLink,
  Maximize2, Lock, Unlock, KeyRound, MessageCircle, Sparkles, Database, Code, FileJson, Zap, Activity, Banknote, TrendingUp
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, setDoc, addDoc, getDoc, writeBatch, where } from 'firebase/firestore';
import { DynamicLocation, RideType, AppComplaint, AdLocation, AppAd, SliderItem, PasswordResetRequest, AdminConfig, RealtimeRideRequest } from '../types';
import { RIDE_OPTIONS } from '../constants';

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminTab = 'metrics' | 'partners' | 'citizens' | 'locations' | 'reports' | 'notifications' | 'complaints' | 'ads' | 'resets' | 'settings' | 'database' | 'live';

const COLLECTIONS = [
  { id: 'profiles', label: 'Citizens (Profiles)' },
  { id: 'drivers', label: 'Fleet (Drivers)' },
  { id: 'ride_requests', label: 'Ride Requests' },
  { id: 'ride_offers', label: 'Ride Offers' },
  { id: 'ride_chat', label: 'Chat Logs' },
  { id: 'notifications', label: 'System Notifications' },
  { id: 'password_resets', label: 'Password Resets' },
  { id: 'city_locations', label: 'City Landmarks' },
  { id: 'app_ads', label: 'Static Ads' },
  { id: 'home_slider', label: 'Home Sliders' },
  { id: 'complaints', label: 'Citizen Complaints' },
  { id: 'reports', label: 'Incident Reports' },
  { id: 'user_blocks', label: 'Blocked Users' },
  { id: 'ride_reviews', label: 'Reviews & Ratings' }
];

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('metrics');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<DynamicLocation[]>([]);
  const [complaints, setComplaints] = useState<AppComplaint[]>([]);
  const [resets, setResets] = useState<PasswordResetRequest[]>([]);
  const [ads, setAds] = useState<Record<string, AppAd>>({});
  const [sliderItems, setSliderItems] = useState<SliderItem[]>([]);
  const [config, setConfig] = useState<AdminConfig>({ support_whatsapp: "923000000000" });
  
  // Live Ops State
  const [allRideRequests, setAllRideRequests] = useState<RealtimeRideRequest[]>([]);
  const [liveFilter, setLiveFilter] = useState<RideType | 'ALL'>('ALL');

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [newPass, setNewPass] = useState<Record<string, string>>({});

  // Database Management State
  const [selectedCollection, setSelectedCollection] = useState<string>('profiles');
  const [rawDbData, setRawDbData] = useState<any[]>([]);
  const [dbSearchQuery, setDbSearchQuery] = useState("");
  const [editingDoc, setEditingDoc] = useState<{ id: string | null; data: string } | null>(null);

  const [newLocation, setNewLocation] = useState({ name: '', category: 'landmark', lat: 32.0711, lng: 73.6875 });
  const [newSlider, setNewSlider] = useState({ title: '', desc: '', badge: '', image: '' });

  const adInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const sliderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'database') {
      fetchCollectionData(selectedCollection);
    }
  }, [activeTab, selectedCollection]);

  const compressImage = (base64Str: string, maxWidth = 1200, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const fetchCollectionData = async (collName: string) => {
    setIsLoading(true);
    try {
      const res = await getDocs(collection(db, collName));
      const data = res.docs.map(d => ({ ...d.data(), __id: d.id }));
      setRawDbData(data);
    } catch (err) {
      console.error("DB Fetch Error:", err);
      alert("Failed to access collection.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [driversRes, usersRes, locRes, complaintsRes, adsRes, sliderRes, resetRes, configRes, ridesRes] = await Promise.all([
        getDocs(collection(db, 'drivers')),
        getDocs(collection(db, 'profiles')),
        getDocs(collection(db, 'city_locations')),
        getDocs(collection(db, 'complaints')),
        getDocs(collection(db, 'app_ads')),
        getDocs(collection(db, 'home_slider')),
        getDocs(collection(db, 'password_resets')),
        getDoc(doc(db, 'admin_config', 'settings')),
        getDocs(collection(db, 'ride_requests'))
      ]);
      
      const sortByDateDesc = (a: any, b: any) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();

      const allRides = ridesRes.docs.map(d => ({ ...d.data(), id: d.id } as RealtimeRideRequest));
      setAllRideRequests(allRides);

      // Financial Calculation for Drivers
      const todayStr = new Date().toDateString();
      const driversData = driversRes.docs.map(d => {
        const data = d.data();
        const driverEmail = data.email || d.id;
        const completedToday = allRides.filter(r => 
          r.driver_id === driverEmail && 
          r.status === 'completed' && 
          new Date(r.completed_at || 0).toDateString() === todayStr
        );
        
        return {
          ...data,
          id: d.id,
          today_income: completedToday.reduce((acc, curr) => acc + (curr.base_fare || 0), 0),
          today_rides: completedToday.length
        };
      }).sort(sortByDateDesc);

      setDrivers(driversData);
      setUsers(usersRes.docs.map(d => ({ ...d.data(), id: d.id })).sort(sortByDateDesc));
      setLocations(locRes.docs.map(d => ({ ...d.data(), id: d.id } as DynamicLocation)).sort((a, b) => a.name.localeCompare(b.name)));
      setComplaints(complaintsRes.docs.map(d => ({ ...d.data(), id: d.id } as AppComplaint)).sort(sortByDateDesc));
      setResets(resetRes.docs.map(d => ({ ...d.data(), id: d.id } as PasswordResetRequest)).sort(sortByDateDesc));

      if (configRes.exists()) {
        setConfig(configRes.data() as AdminConfig);
      }

      const adMap: Record<string, AppAd> = {};
      adsRes.docs.forEach(d => {
        adMap[d.id] = { ...d.data(), id: d.id } as AppAd;
      });
      setAds(adMap);

      setSliderItems(sliderRes.docs.map(d => ({ ...d.data(), id: d.id } as SliderItem)).sort(sortByDateDesc));
    } catch (err) {
      console.error("Admin Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeRidesCount = useMemo(() => {
    return allRideRequests.filter(r => ['accepted', 'ongoing'].includes(r.status)).length;
  }, [allRideRequests]);

  const pendingRequestsCount = useMemo(() => {
    return allRideRequests.filter(r => r.status === 'pending').length;
  }, [allRideRequests]);

  const todayStats = useMemo(() => {
    const today = new Date().toDateString();
    const completedToday = allRideRequests.filter(r => r.status === 'completed' && new Date(r.completed_at || 0).toDateString() === today);
    return {
      revenue: completedToday.reduce((sum, r) => sum + (r.base_fare || 0), 0),
      count: completedToday.length
    };
  }, [allRideRequests]);

  const filteredLiveOps = useMemo(() => {
    return allRideRequests.filter(r => {
      const isLive = ['pending', 'accepted', 'ongoing'].includes(r.status);
      if (!isLive) return false;
      if (liveFilter === 'ALL') return true;
      return r.ride_type === liveFilter;
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [allRideRequests, liveFilter]);

  const handleDbSave = async () => {
    if (!editingDoc) return;
    try {
      const parsed = JSON.parse(editingDoc.data);
      delete parsed.__id; 
      if (editingDoc.id) {
        await setDoc(doc(db, selectedCollection, editingDoc.id), parsed);
      } else {
        await addDoc(collection(db, selectedCollection), parsed);
      }
      alert("Registry Updated.");
      setEditingDoc(null);
      fetchCollectionData(selectedCollection);
    } catch (err) {
      alert("Invalid JSON data format.");
    }
  };

  const handleDbDelete = async (id: string) => {
    if (!confirm("Permanently delete this record?")) return;
    try {
      await deleteDoc(doc(db, selectedCollection, id));
      fetchCollectionData(selectedCollection);
    } catch (err) {
      alert("Delete failed.");
    }
  };

  const handleDeleteRide = async (rideId: string) => {
    if (!confirm("Are you sure you want to permanently delete this ride request from HQ registry?")) return;
    setIsSyncing(true);
    try {
      await deleteDoc(doc(db, 'ride_requests', rideId));
      setAllRideRequests(prev => prev.filter(r => r.id !== rideId));
      alert("Ride removed from live registry.");
    } catch (err) {
      alert("Registry deletion failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const updateConfig = async () => {
    setIsSyncing(true);
    try {
      await setDoc(doc(db, 'admin_config', 'settings'), config);
      alert("HQ Settings Updated Successfully.");
    } catch (err) {
      alert("Update failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.name) return;
    setIsSyncing(true);
    try {
      const locId = `loc-${Date.now()}`;
      await setDoc(doc(db, 'city_locations', locId), {
        ...newLocation,
        id: locId,
        created_at: new Date().toISOString()
      });
      setNewLocation({ name: '', category: 'landmark', lat: 32.0711, lng: 73.6875 });
      fetchAllData();
    } catch (err) {
      alert("Failed to add area.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Remove this area from registry?")) return;
    setIsSyncing(true);
    try {
      await deleteDoc(doc(db, 'city_locations', id));
      fetchAllData();
    } catch (err) {
      alert("Delete failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateAd = async (locId: AdLocation, imageBase64: string, active: boolean) => {
    setIsSyncing(true);
    try {
      const optimizedAd = await compressImage(imageBase64, 1080, 0.7);
      await setDoc(doc(db, 'app_ads', locId), {
        image_url: optimizedAd,
        is_active: active,
        updated_at: new Date().toISOString()
      }, { merge: true });
      alert("Ad slot updated in registry.");
      fetchAllData();
    } catch (err) {
      alert("Ad update failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAdFileChange = (e: React.ChangeEvent<HTMLInputElement>, slot: AdLocation) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateAd(slot, reader.result as string, true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSliderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1200, 0.6);
        setNewSlider(prev => ({ ...prev, image: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSlider = async () => {
    if (!newSlider.title || !newSlider.image) {
      alert("Slide Title and Image are required.");
      return;
    }
    setIsSyncing(true);
    try {
      const sId = `slide-${Date.now()}`;
      await setDoc(doc(db, 'home_slider', sId), {
        ...newSlider,
        id: sId,
        is_active: true,
        created_at: new Date().toISOString()
      });
      setNewSlider({ title: '', desc: '', badge: '', image: '' });
      fetchAllData();
    } catch (err) {
      alert("Failed to add slide.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteSlider = async (id: string) => {
    if (!confirm("Delete this promo slide?")) return;
    setIsSyncing(true);
    try {
      await deleteDoc(doc(db, 'home_slider', id));
      fetchAllData();
    } catch (err) {
      alert("Delete failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePassword = async (resetReq: PasswordResetRequest) => {
    const pass = newPass[resetReq.id];
    if (!pass) return alert("Please type a new password.");
    setIsSyncing(true);
    try {
      const userEmail = resetReq.email.toLowerCase().trim();
      await updateDoc(doc(db, 'profiles', userEmail), {
        password: pass,
        updated_at: new Date().toISOString()
      });
      const driverDocRef = doc(db, 'drivers', userEmail);
      const driverSnap = await getDoc(driverDocRef);
      if (driverSnap.exists()) {
        await updateDoc(driverDocRef, {
          password: pass,
          updated_at: new Date().toISOString()
        });
      }
      await updateDoc(doc(db, 'password_resets', resetReq.id), {
        status: 'completed',
        completed_at: new Date().toISOString(),
        assigned_password: pass
      });
      alert(`Registry Updated. New password is: ${pass}`);
      const cleanPhone = resetReq.phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : cleanPhone;
      const message = `Assalam-o-Alaikum! eDrive HQ se aap ka account recovery request approve ho gaya hai.\n\nAap ka naya password hai: *${pass}*\n\nMeherbani farma kar login karein aur password tabdeel kar lain. Ao Chalen!`;
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
      setNewPass(prev => { const next = { ...prev }; delete next[resetReq.id]; return next; });
      fetchAllData();
    } catch (err) {
      alert("Registry connection failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectProfile = async (item: any) => {
    setIsSyncing(true);
    try {
      const targetEmail = item.email || item.id;
      const citizenSnap = await getDoc(doc(db, 'profiles', targetEmail));
      const driverSnap = await getDoc(doc(db, 'drivers', targetEmail));
      const cData = citizenSnap.exists() ? citizenSnap.data() : {};
      const dData = driverSnap.exists() ? driverSnap.data() : {};
      setSelectedProfile({
        ...cData, ...dData, email: targetEmail,
        profile_pic: cData.profile_pic || dData.profilePic || item.profile_pic || "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg",
        name: cData.name || dData.full_name?.split(' ')[0] || item.name || "User",
        verification_status: cData.verification_status || dData.status || item.status || 'pending'
      });
    } catch (err) { setSelectedProfile(item); } finally { setIsSyncing(false); }
  };

  const handleUpdateStatus = async (type: 'profile' | 'driver', email: string, newStatus: string) => {
    setIsSyncing(true);
    try {
      const collectionName = type === 'profile' ? 'profiles' : 'drivers';
      await updateDoc(doc(db, collectionName, email), { [type === 'profile' ? 'verification_status' : 'status']: newStatus, updated_at: new Date().toISOString() });
      alert(`Ledger Updated: ${newStatus.toUpperCase()}`);
      setSelectedProfile(null);
      fetchAllData();
    } catch (err: any) { alert("Update failed."); } finally { setIsSyncing(false); }
  };

  const filteredItems = useMemo(() => {
    const base = activeTab === 'partners' ? drivers : users;
    return base.filter(i => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (i.name || "").toLowerCase().includes(q) || (i.full_name || "").toLowerCase().includes(q) || (i.email || "").toLowerCase().includes(q) || (i.phone_number || "").toLowerCase().includes(q);
      if (activeTab === 'partners' && selectedCategory !== 'all') return matchesSearch && i.vehicle_type === selectedCategory;
      return matchesSearch;
    });
  }, [activeTab, drivers, users, searchQuery, selectedCategory]);

  const filteredDbData = useMemo(() => {
    return rawDbData.filter(item => {
      const stringified = JSON.stringify(item).toLowerCase();
      return stringified.includes(dbSearchQuery.toLowerCase());
    });
  }, [rawDbData, dbSearchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white overflow-hidden">
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-zinc-900/20 shrink-0">
         <div className="flex items-center gap-3">
            <div className="bg-[#c1ff22] w-7 h-7 rounded-lg flex items-center justify-center text-black font-bold italic transform -skew-x-6">e</div>
            <h1 className="text-[10px] font-black uppercase tracking-widest leading-none">Hafizabad HQ</h1>
         </div>
         <div className="flex gap-2">
            <button onClick={fetchAllData} className="p-3 bg-white/5 rounded-2xl text-zinc-400 active:scale-90"><RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} /></button>
            <button onClick={onLogout} className="p-3 bg-white/5 rounded-2xl text-rose-500"><LogOut className="w-5 h-5" /></button>
         </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 no-scrollbar pb-32">
         {activeTab === 'metrics' && (
           <div className="space-y-4 animate-in fade-in">
              <div className="bg-gradient-to-br from-[#c1ff22] to-[#a8e010] p-8 rounded-[3rem] text-black shadow-2xl flex justify-between items-center">
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-50">Operations Command</p>
                    <p className="text-4xl font-black tracking-tighter mt-1 italic uppercase leading-none">Control Center</p>
                 </div>
                 <Activity className="w-12 h-12 opacity-20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-2">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Today's Revenue</p>
                    <p className="text-2xl font-black text-[#c1ff22] italic">Rs {todayStats.revenue}</p>
                 </div>
                 <div className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-2">
                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Today's Volume</p>
                    <p className="text-2xl font-black text-white italic">{todayStats.count} Rides</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 {[
                   { label: 'Live Monitor', tab: 'live', count: activeRidesCount + pendingRequestsCount, icon: Zap, color: '#c1ff22' },
                   { label: 'Citizens', tab: 'citizens', count: users.length, icon: Users, color: '#3b82f6' },
                   { label: 'Fleet Partners', tab: 'partners', count: drivers.length, icon: Car, color: '#a855f7' },
                   { label: 'City Areas', tab: 'locations', count: locations.length, icon: MapPin, color: '#f59e0b' },
                   { label: 'Database', tab: 'database', count: COLLECTIONS.length, icon: Database, color: '#22c55e' },
                   { label: 'Resets', tab: 'resets', count: resets.filter(r => r.status === 'pending').length, icon: KeyRound, color: '#f59e0b' },
                   { label: 'Ads/Slider', tab: 'ads', count: Object.keys(ads).length, icon: LayoutGrid, color: '#f43f5e' },
                   { label: 'Settings', tab: 'settings', count: 0, icon: MessageCircle, color: '#fff' }
                 ].map(card => (
                   <button key={card.label} onClick={() => setActiveTab(card.tab as AdminTab)} className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 text-left space-y-4 active:scale-95 transition-all">
                      <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center relative"><card.icon className="w-5 h-5" style={{ color: card.color }} />{card.count > 0 && <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-[8px] font-black px-1.5 rounded-full">{card.count}</span>}</div>
                      <p className="font-black text-sm uppercase italic leading-none">{card.label}</p>
                   </button>
                 ))}
              </div>
           </div>
         )}

         {activeTab === 'live' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 pb-20">
               <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('metrics')} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                  <h2 className="text-xl font-black uppercase italic">Live <span className="text-[#c1ff22]">Monitor</span></h2>
               </div>

               <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  <button onClick={() => setLiveFilter('ALL')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase whitespace-nowrap border transition-all ${liveFilter === 'ALL' ? 'bg-[#c1ff22] text-black border-[#c1ff22]' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>All Services</button>
                  {RIDE_OPTIONS.map(opt => (
                    <button key={opt.type} onClick={() => setLiveFilter(opt.type)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase whitespace-nowrap border transition-all ${liveFilter === opt.type ? 'bg-[#c1ff22] text-black border-[#c1ff22]' : 'bg-zinc-900 text-zinc-500 border-white/5'}`}>{opt.label}</button>
                  ))}
               </div>

               <div className="space-y-4">
                  {filteredLiveOps.length === 0 ? (
                    <div className="py-20 text-center opacity-20 space-y-4">
                       <Zap className="w-16 h-16 mx-auto" />
                       <p className="font-black uppercase text-xs">No active city requests</p>
                    </div>
                  ) : (
                    filteredLiveOps.map(ride => (
                      <div key={ride.id} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-4 relative group">
                         <button 
                           onClick={() => handleDeleteRide(ride.id)}
                           className="absolute top-6 right-6 p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all z-10 active:scale-90"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>

                         <div className="flex justify-between items-start pr-10">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-white/5">
                                  <img src={RIDE_OPTIONS.find(o => o.type === ride.ride_type)?.icon} className="w-6 h-6 object-contain" />
                               </div>
                               <div>
                                  <p className="text-white font-black uppercase italic text-xs leading-none">{ride.passenger_name}</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                     <div className={`w-1.5 h-1.5 rounded-full ${ride.status === 'pending' ? 'bg-orange-500 animate-pulse' : 'bg-[#c1ff22]'}`} />
                                     <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">{ride.status}</p>
                                  </div>
                               </div>
                            </div>
                            <div className="text-right">
                               <p className="text-lg font-black text-[#c1ff22] italic">Rs {ride.base_fare}</p>
                               <p className="text-[7px] font-black text-zinc-700 uppercase">{new Date(ride.created_at || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                         </div>
                         
                         <div className="space-y-3 bg-black/30 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-start gap-3">
                               <div className="w-1 h-1 rounded-full bg-[#c1ff22] mt-1 shrink-0" />
                               <p className="text-[9px] font-bold text-zinc-400 uppercase truncate">{ride.pickup_address}</p>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="w-1 h-1 rounded-full bg-rose-500 mt-1 shrink-0" />
                               <p className="text-[9px] font-bold text-zinc-100 uppercase truncate">{ride.dest_address}</p>
                            </div>
                         </div>
                         
                         {ride.driver_id && (
                           <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                              <ShieldCheck className="w-3 h-3 text-[#c1ff22]" />
                              <p className="text-[8px] font-black text-[#c1ff22] uppercase tracking-widest truncate">CAPTAIN: {ride.driver_id}</p>
                           </div>
                         )}
                      </div>
                    ))
                  )}
               </div>
            </div>
         )}

         {activeTab === 'partners' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 pb-20">
                <div className="flex items-center justify-between">
                    <button onClick={() => setActiveTab('metrics')} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-black uppercase italic">Fleet <span className="text-[#a855f7]">Partners</span></h2>
                </div>
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" /><input className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white outline-none" placeholder="Search Captains..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                
                <div className="grid gap-4">
                    {filteredItems.map((item: any) => (
                        <div key={item.id} className="p-5 rounded-[2.5rem] border bg-zinc-900/30 border-white/5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleSelectProfile(item)}>
                                    <img src={item.profile_pic || item.profilePic || "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg"} className="w-14 h-14 rounded-2xl object-cover border border-[#c1ff22]/20" />
                                    <div>
                                       <h3 className="font-black text-white uppercase italic text-sm">{item.full_name || item.name}</h3>
                                       <div className="flex items-center gap-2 mt-1">
                                          <div className={`px-2 py-0.5 rounded-full text-[6px] font-black uppercase ${item.status === 'approved' ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800 text-zinc-500'}`}>{item.status || 'pending'}</div>
                                          <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">{item.vehicle_type}</p>
                                       </div>
                                    </div>
                                </div>
                                <button onClick={() => handleSelectProfile(item)} className="p-3 bg-white/5 rounded-xl text-zinc-400 active:scale-90"><Eye className="w-5 h-5" /></button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                               <div className="flex flex-col gap-1">
                                  <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Today's Income</p>
                                  <div className="flex items-center gap-2">
                                     <Banknote className="w-3 h-3 text-[#c1ff22]" />
                                     <p className="text-sm font-black text-[#c1ff22] italic">Rs {item.today_income || 0}</p>
                                  </div>
                               </div>
                               <div className="flex flex-col gap-1">
                                  <p className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Today's Orders</p>
                                  <div className="flex items-center gap-2">
                                     <TrendingUp className="w-3 h-3 text-white" />
                                     <p className="text-sm font-black text-white italic">{item.today_rides || 0} Rides</p>
                                  </div>
                               </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
         )}

         {activeTab === 'database' && (
           <div className="space-y-6 animate-in slide-in-from-right-4 pb-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('metrics')} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                  <h2 className="text-xl font-black uppercase italic">Firebase <span className="text-[#22c55e]">Data</span></h2>
                </div>
                <button onClick={() => setEditingDoc({ id: null, data: '{}' })} className="p-3 bg-[#22c55e] text-black rounded-2xl active:scale-90 shadow-lg shadow-[#22c55e]/20"><Plus className="w-6 h-6" /></button>
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-[2rem] border border-white/5 flex items-center gap-4">
                <FileJson className="w-5 h-5 text-[#22c55e]" />
                <select 
                  className="bg-transparent flex-1 outline-none text-white font-black italic uppercase text-xs"
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                >
                  {COLLECTIONS.map(c => <option key={c.id} value={c.id} className="bg-zinc-950">{c.label}</option>)}
                </select>
              </div>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input 
                  className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white outline-none focus:border-[#22c55e]/30" 
                  placeholder="Search across all fields..." 
                  value={dbSearchQuery} 
                  onChange={e => setDbSearchQuery(e.target.value)} 
                />
              </div>

              <div className="space-y-4">
                {isLoading ? (
                  <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="font-black uppercase text-[10px]">Scanning HQ Storage...</p>
                  </div>
                ) : filteredDbData.length === 0 ? (
                  <div className="py-20 text-center opacity-20"><Database className="w-16 h-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">No records found</p></div>
                ) : (
                  filteredDbData.map((item, idx) => (
                    <div key={idx} className="bg-zinc-900/40 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                       <div className="flex justify-between items-start">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none">Document ID</p>
                            <p className="text-[11px] font-black text-white italic mt-1 truncate">{item.__id}</p>
                          </div>
                          <div className="flex gap-2">
                             <button onClick={() => setEditingDoc({ id: item.__id, data: JSON.stringify(item, null, 2) })} className="p-3 bg-white/5 rounded-xl text-zinc-400 active:scale-90"><Edit3 className="w-4 h-4" /></button>
                             <button onClick={() => handleDbDelete(item.__id)} className="p-3 bg-rose-500/10 rounded-xl text-rose-500 active:scale-90"><Trash2 className="w-4 h-4" /></button>
                          </div>
                       </div>
                       <div className="bg-black/40 p-4 rounded-2xl border border-white/5 overflow-x-auto max-h-40 no-scrollbar">
                          <pre className="text-[8px] text-zinc-400 font-mono leading-relaxed">
                             {JSON.stringify(item, null, 2)}
                          </pre>
                       </div>
                    </div>
                  ))
                )}
              </div>
           </div>
         )}

         {activeTab === 'resets' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('metrics')} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                  <h2 className="text-xl font-black uppercase italic">Reset <span className="text-[#c1ff22]">Requests</span></h2>
               </div>
               <div className="grid gap-4">
                  {resets.length === 0 ? (
                     <div className="py-20 text-center opacity-20"><KeyRound className="w-16 h-16 mx-auto mb-4" /><p className="font-black uppercase text-xs">No pending resets</p></div>
                  ) : (
                    resets.map(req => (
                      <div key={req.id} className="bg-zinc-900/60 p-6 rounded-[2rem] border border-white/5 space-y-4">
                         <div className="flex justify-between items-start">
                            <div>
                               <p className="text-white font-black uppercase italic text-sm">{req.name}</p>
                               <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-1">{req.email}</p>
                               <p className="text-[10px] font-black text-[#c1ff22] mt-1">{req.phone}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${req.status === 'pending' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>{req.status}</div>
                         </div>
                         
                         {req.status === 'pending' && (
                           <div className="space-y-3 pt-2 border-t border-white/5">
                              <div className="flex gap-2">
                                 <input 
                                   className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-[#c1ff22]/40" 
                                   placeholder="Type new password..." 
                                   value={newPass[req.id] || ""} 
                                   onChange={e => setNewPass({...newPass, [req.id]: e.target.value})} 
                                 />
                                 <button onClick={() => handleUpdatePassword(req)} className="bg-[#c1ff22] text-black px-4 py-3 rounded-xl font-black text-[10px] uppercase italic active:scale-95 transition-all">Update</button>
                              </div>
                           </div>
                         )}
                      </div>
                    ))
                  )}
               </div>
            </div>
         )}

         {activeTab === 'locations' && (
           <div className="space-y-6 animate-in slide-in-from-right-4 pb-20">
              <div className="flex items-center gap-4">
                 <button onClick={() => setActiveTab('metrics')} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                 <h2 className="text-xl font-black uppercase italic">City <span className="text-[#f59e0b]">Areas</span></h2>
              </div>

              <div className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                 <p className="text-[10px] font-black uppercase text-zinc-500 px-2 tracking-widest">Add New Landmark</p>
                 <div className="space-y-3">
                    <input className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white" placeholder="Area Name" value={newLocation.name} onChange={e => setNewLocation({...newLocation, name: e.target.value})} />
                    <select className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white" value={newLocation.category} onChange={e => setNewLocation({...newLocation, category: e.target.value})}>
                       <option value="landmark">Landmark</option>
                       <option value="center">City Center</option>
                       <option value="transport">Transport Hub</option>
                       <option value="hospital">Hospital</option>
                       <option value="housing">Housing Scheme</option>
                    </select>
                    <button onClick={handleAddLocation} disabled={isSyncing} className="w-full bg-[#f59e0b] text-black py-4 rounded-2xl font-black uppercase text-xs italic flex items-center justify-center gap-2">
                       {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                       Add to Registry
                    </button>
                 </div>
              </div>

              <div className="grid gap-3">
                 {locations.map(loc => (
                    <div key={loc.id} className="bg-zinc-900/30 p-5 rounded-3xl border border-white/5 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-[#f59e0b]"><MapPin className="w-5 h-5" /></div>
                          <div>
                             <p className="text-white font-black uppercase italic text-sm">{loc.name}</p>
                             <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-1">{loc.category}</p>
                          </div>
                       </div>
                       <button onClick={() => handleDeleteLocation(loc.id)} className="p-3 bg-rose-500/10 rounded-xl text-rose-500 active:scale-90"><Trash2 className="w-4 h-4" /></button>
                    </div>
                 ))}
              </div>
           </div>
         )}

         {activeTab === 'ads' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 pb-20">
               <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('metrics')} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                  <h2 className="text-xl font-black uppercase italic">Promo <span className="text-[#f43f5e]">& Ads</span></h2>
               </div>

               <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase italic text-zinc-400 px-2">Application Static Ads</h3>
                  {['login', 'home', 'citizen_reg', 'partner_reg', 'driver_db', 'joining_screen'].map(slot => {
                     const ad = ads[slot];
                     return (
                        <div key={slot} className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                           <div className="flex justify-between items-center px-1">
                              <p className="text-[10px] font-black uppercase text-white tracking-widest italic">{slot.replace('_', ' ')} SLOT</p>
                              <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${ad?.is_active ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800 text-zinc-500'}`}>{ad?.is_active ? 'Active' : 'Empty'}</div>
                           </div>
                           
                           <div 
                             onClick={() => adInputRefs.current[slot]?.click()}
                             className="w-full aspect-[2/1] bg-black rounded-2xl border-2 border-dashed border-white/10 overflow-hidden flex flex-col items-center justify-center group cursor-pointer hover:border-[#f43f5e]/30 transition-all"
                           >
                             {ad?.image_url ? (
                               <img src={ad.image_url} className="w-full h-full object-cover" />
                             ) : (
                               <>
                                 <Camera className="w-8 h-8 text-zinc-700 group-hover:text-[#f43f5e] mb-2" />
                                 <span className="text-[8px] font-black uppercase text-zinc-800">Tap to upload ad</span>
                               </>
                             )}
                             <input 
                               type="file" 
                               ref={el => adInputRefs.current[slot] = el}
                               className="hidden" 
                               accept="image/*" 
                               onChange={(e) => handleAdFileChange(e, slot as AdLocation)} 
                             />
                           </div>

                           {ad?.image_url && (
                             <button 
                               onClick={() => handleUpdateAd(slot as AdLocation, "", false)}
                               className="w-full bg-rose-500/10 text-rose-500 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
                             >
                               Remove Ad
                             </button>
                           )}
                        </div>
                     );
                  })}
               </div>

               <div className="space-y-4 pt-6">
                  <div className="flex items-center justify-between px-2">
                     <h3 className="text-xs font-black uppercase italic text-zinc-400">Home Screen Slider</h3>
                     <Sparkles className="w-4 h-4 text-[#c1ff22]" />
                  </div>
                  
                  <div className="bg-zinc-900/60 p-6 rounded-[2.5rem] border border-white/5 space-y-4">
                     <p className="text-[9px] font-black uppercase text-zinc-600 px-2 tracking-widest">New Promotional Slide</p>
                     <div className="space-y-3">
                        <input className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white" placeholder="Slide Title" value={newSlider.title} onChange={e => setNewSlider({...newSlider, title: e.target.value})} />
                        <input className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white" placeholder="Short Description" value={newSlider.desc} onChange={e => setNewSlider({...newSlider, desc: e.target.value})} />
                        <input className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-xs font-bold text-white" placeholder="Badge (e.g. FASTEST)" value={newSlider.badge} onChange={e => setNewSlider({...newSlider, badge: e.target.value})} />
                        
                        <div 
                          onClick={() => sliderInputRef.current?.click()}
                          className="w-full aspect-[3/1] bg-black rounded-2xl border-2 border-dashed border-white/10 overflow-hidden flex flex-col items-center justify-center group cursor-pointer"
                        >
                          {newSlider.image ? (
                            <img src={newSlider.image} className="w-full h-full object-cover" />
                          ) : (
                            <>
                              <LucideImage className="w-6 h-6 text-zinc-700 mb-1" />
                              <span className="text-[7px] font-black uppercase text-zinc-800">Select Slide Image</span>
                            </>
                          )}
                          <input type="file" ref={sliderInputRef} className="hidden" accept="image/*" onChange={handleSliderFileChange} />
                        </div>

                        <button onClick={handleAddSlider} disabled={isSyncing} className="w-full bg-[#f43f5e] text-white py-4 rounded-2xl font-black uppercase text-xs italic flex items-center justify-center gap-2">
                           {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Slide
                        </button>
                     </div>
                  </div>

                  <div className="grid gap-4">
                     {sliderItems.map(slide => (
                        <div key={slide.id} className="bg-zinc-900/30 p-5 rounded-[2rem] border border-white/5 flex items-center gap-4">
                           <img src={slide.image} className="w-20 h-16 object-cover rounded-xl border border-white/5" />
                           <div className="flex-1 min-w-0">
                              <p className="text-white font-black uppercase italic text-[11px] truncate">{slide.title}</p>
                              <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{slide.badge}</p>
                           </div>
                           <button onClick={() => handleDeleteSlider(slide.id)} className="p-3 bg-rose-500/10 rounded-xl text-rose-500 active:scale-90"><Trash2 className="w-4 h-4" /></button>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'settings' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
               <div className="flex items-center gap-4">
                  <button onClick={() => setActiveTab('metrics')} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                  <h2 className="text-xl font-black uppercase italic">HQ <span className="text-[#c1ff22]">Settings</span></h2>
               </div>
               
               <div className="bg-zinc-900/60 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div className="space-y-3">
                     <label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block px-2">Support WhatsApp Number</label>
                     <div className="bg-black/40 p-5 rounded-3xl border border-white/5 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all">
                        <MessageCircle className="w-5 h-5 text-[#c1ff22]" />
                        <input 
                          className="bg-transparent w-full outline-none text-white font-black italic tracking-tighter" 
                          value={config.support_whatsapp} 
                          onChange={e => setConfig({...config, support_whatsapp: e.target.value})} 
                          placeholder="923000000000"
                        />
                     </div>
                  </div>

                  <button 
                    onClick={updateConfig} 
                    disabled={isSyncing}
                    className="w-full bg-[#c1ff22] text-black py-5 rounded-[1.8rem] font-black uppercase text-xs italic shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  >
                     {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     Commit Settings to Ledger
                  </button>
               </div>
            </div>
         )}

         {activeTab === 'citizens' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 pb-20">
                <div className="flex items-center justify-between">
                    <button onClick={() => setActiveTab('metrics')} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-5 h-5" /></button>
                    <h2 className="text-xl font-black uppercase italic">Citizens</h2>
                </div>
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" /><input className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white outline-none" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
                <div className="grid gap-4">
                    {filteredItems.map((item: any) => (
                        <div key={item.id} className="p-5 rounded-[2rem] border bg-zinc-900/30 border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4 cursor-pointer" onClick={() => handleSelectProfile(item)}>
                                <img src={item.profile_pic || "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg"} className="w-12 h-12 rounded-xl object-cover" />
                                <div><h3 className="font-black text-white uppercase italic text-sm">{item.name || item.full_name}</h3><p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{item.verification_status || item.status}</p></div>
                            </div>
                            <button onClick={() => handleSelectProfile(item)} className="p-3 bg-white/5 rounded-xl text-zinc-400 active:scale-90"><Eye className="w-5 h-5" /></button>
                        </div>
                    ))}
                </div>
            </div>
         )}
      </main>

      {selectedProfile && (
        <div id="printable-profile" className="fixed inset-0 z-[5000] bg-[#0a0a0a] flex flex-col animate-in slide-in-from-bottom duration-300 overflow-y-auto pb-32">
           <header className="flex justify-between items-center p-6 border-b border-white/5 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-xl z-10 no-print">
              <button onClick={() => setSelectedProfile(null)} className="p-2 bg-white/5 rounded-xl"><ChevronLeft className="w-6 h-6" /></button>
              <h2 className="text-xl font-black italic uppercase text-[#c1ff22]">Profile Registry</h2>
              <button onClick={() => window.print()} className="p-2 bg-[#c1ff22] rounded-xl text-black active:scale-90"><Printer className="w-6 h-6" /></button>
           </header>
           
           <div className="p-6 space-y-10">
              <div className="flex flex-col items-center">
                 <div className="relative">
                    <img 
                      src={selectedProfile.profile_pic} 
                      className="w-32 h-32 rounded-[2.5rem] object-cover border-4 border-[#c1ff22] shadow-2xl cursor-pointer" 
                      onClick={() => setPreviewImage(selectedProfile.profile_pic)}
                    />
                 </div>
                 <h3 className="text-2xl font-black uppercase italic text-white mt-4">{selectedProfile.name} {selectedProfile.last_name}</h3>
                 <div className="flex items-center gap-2 bg-[#c1ff22]/10 px-3 py-1 rounded-full border border-[#c1ff22]/30 mt-2">
                    <span className="text-[#c1ff22] text-[8px] font-black uppercase tracking-[0.2em] italic">{selectedProfile.email}</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase italic text-zinc-400 px-2 flex items-center gap-2"><FileText className="w-3 h-3" /> Information Ledger</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/60 p-5 rounded-3xl border border-white/5"><p className="text-[8px] font-black text-zinc-600 uppercase mb-1">WhatsApp</p><p className="text-white font-black italic text-sm">{selectedProfile.phone_number || 'N/A'}</p></div>
                    <div className="bg-zinc-900/60 p-5 rounded-3xl border border-white/5"><p className="text-[8px] font-black text-zinc-600 uppercase mb-1">CNIC</p><p className="text-white font-black italic text-sm">{selectedProfile.cnic || 'N/A'}</p></div>
                    <div className="bg-zinc-900/60 p-5 rounded-3xl border border-white/5"><p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Password</p><p className="text-[#c1ff22] font-black italic text-sm tracking-widest">{selectedProfile.password || '******'}</p></div>
                    <div className="bg-zinc-900/60 p-5 rounded-3xl border border-white/5"><p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Gender / Age</p><p className="text-white font-black italic text-sm">{selectedProfile.gender || 'N/A'} • {selectedProfile.age || 'Captain'}</p></div>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase italic text-zinc-400 px-2 flex items-center gap-2"><ShieldCheck className="w-3 h-3" /> Security Proofs</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest text-center">CNIC FRONT</p>
                       <div className="relative group aspect-video bg-black rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
                          {selectedProfile.cnic_front ? <img src={selectedProfile.cnic_front} className="max-w-full max-h-full object-contain" /> : <LucideImage className="w-6 h-6 opacity-10" />}
                          <button className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[#c1ff22] font-black text-[9px] uppercase no-print" onClick={() => setPreviewImage(selectedProfile.cnic_front)}>Preview</button>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[8px] font-black text-zinc-700 uppercase tracking-widest text-center">CNIC BACK</p>
                       <div className="relative group aspect-video bg-black rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center">
                          {selectedProfile.cnic_back ? <img src={selectedProfile.cnic_back} className="max-w-full max-h-full object-contain" /> : <LucideImage className="w-6 h-6 opacity-10" />}
                          <button className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-[#c1ff22] font-black text-[9px] uppercase no-print" onClick={() => setPreviewImage(selectedProfile.cnic_back)}>Preview</button>
                       </div>
                    </div>
                 </div>
              </div>

              {selectedProfile.vehicle_type && (
                 <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase italic text-[#3b82f6] px-2 flex items-center gap-2"><Car className="w-3 h-3" /> Partner Fleet Registry</h4>
                    <div className="bg-zinc-900/40 p-8 rounded-[3rem] border border-white/5 space-y-6 shadow-xl">
                       <div className="flex justify-between items-center px-2">
                          <div>
                             <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">VEHICLE MODEL</p>
                             <p className="text-xl font-black text-white italic">{selectedProfile.vehicle_model} <span className="text-xs font-black text-zinc-500 uppercase not-italic">({selectedProfile.vehicle_color})</span></p>
                          </div>
                          <div className="text-right">
                             <p className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">PLATE NUMBER</p>
                             <p className="text-xl font-black text-[#c1ff22] tracking-tighter">{selectedProfile.vehicle_number}</p>
                          </div>
                       </div>
                    </div>
                 </div>
              )}
           </div>

           <div className="fixed bottom-0 left-0 right-0 p-6 bg-black border-t border-white/5 flex gap-3 no-print z-50">
              <button onClick={() => handleUpdateStatus(selectedProfile.vehicle_type ? 'driver' : 'profile', selectedProfile.email, 'approved')} className="flex-[2] bg-green-500 text-black py-5 rounded-[2rem] font-black uppercase text-xs italic shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                <CheckCircle2 className="w-4 h-4" /> Approve Registry
              </button>
              <button onClick={() => handleUpdateStatus(selectedProfile.vehicle_type ? 'driver' : 'profile', selectedProfile.email, 'rejected')} className="flex-1 bg-rose-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs active:scale-95 transition-all">Reject</button>
           </div>
        </div>
      )}

      {editingDoc && (
        <div className="fixed inset-0 z-[6000] bg-black/95 flex flex-col p-6 animate-in slide-in-from-bottom duration-300">
           <header className="flex justify-between items-center mb-8 pt-10">
              <div>
                <h2 className="text-2xl font-black italic uppercase text-[#22c55e] tracking-tighter">{editingDoc.id ? 'Edit' : 'Add'} <span className="text-white">Record</span></h2>
                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mt-1">{selectedCollection} / {editingDoc.id || 'NEW_DOC'}</p>
              </div>
              <button onClick={() => setEditingDoc(null)} className="p-3 bg-white/5 rounded-2xl active:scale-90"><X className="w-6 h-6" /></button>
           </header>
           
           <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="flex-1 bg-zinc-900 rounded-[2.5rem] border border-white/5 p-6 flex flex-col">
                 <textarea 
                    className="flex-1 bg-black/40 rounded-2xl p-6 font-mono text-[10px] text-[#22c55e] outline-none border border-white/5 resize-none leading-relaxed focus:border-[#22c55e]/30 transition-all no-scrollbar"
                    spellCheck={false}
                    value={editingDoc.data}
                    onChange={(e) => setEditingDoc({ ...editingDoc, data: e.target.value })}
                 />
              </div>
           </div>

           <button 
             onClick={handleDbSave} 
             className="w-full bg-[#22c55e] text-black py-6 rounded-[2.5rem] font-black uppercase text-base shadow-2xl mt-6 active:scale-95 transition-all italic flex items-center justify-center gap-3"
           >
              <Save className="w-6 h-6" /> Commit to HQ Storage
           </button>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-[6000] bg-black/98 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setPreviewImage(null)}>
           <img src={previewImage} className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
        </div>
      )}

      <footer className="px-2 py-4 bg-black border-t border-white/5 flex justify-around shrink-0 pb-10 fixed bottom-0 left-0 right-0 z-50 no-print">
         {[
           { icon: BarChart3, tab: 'metrics', label: 'Cmd' },
           { icon: Zap, tab: 'live', label: 'Live' },
           { icon: Users, tab: 'citizens', label: 'Cits' },
           { icon: Car, tab: 'partners', label: 'Fleet' },
           { icon: MapPin, tab: 'locations', label: 'Areas' },
           { icon: Database, tab: 'database', label: 'Data' },
           { icon: KeyRound, tab: 'resets', label: 'Key' },
           { icon: LayoutGrid, tab: 'ads', label: 'Ads' }
         ].map(item => (
           <button key={item.tab} onClick={() => setActiveTab(item.tab as AdminTab)} className={`flex flex-col items-center gap-1.5 transition-all px-2 shrink-0 ${activeTab === item.tab ? 'text-[#c1ff22] scale-110' : 'text-zinc-800'}`}><item.icon className="w-5 h-5" /><span className="text-[7px] font-black uppercase">{item.label}</span></button>
         ))}
      </footer>
    </div>
  );
}
