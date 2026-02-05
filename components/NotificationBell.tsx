
import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Info, Clock, CheckCircle2, Zap, Trash2, CheckSquare, Square, Loader2, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { AppNotification } from '../types';

interface NotificationBellProps {
  userId: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    // Robust Asset Fetching: Try to load sound, handle errors gracefully
    try {
      audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audioRef.current.volume = 0.5;
      audioRef.current.addEventListener('error', () => {
        console.warn("eDrive: Notification sound asset failed to fetch. Silence enabled.");
        audioRef.current = null;
      });
    } catch (e) {
      audioRef.current = null;
    }

    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {});
      }
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  const fetchNotifications = async () => {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppNotification));
      
      const sorted = data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setNotifications(sorted);
    } catch (err: any) {
      console.error("🔥 eDrive HQ Notification Registry Error:", err);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications();

    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', userId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const newNotif = { ...change.doc.data(), id: change.doc.id } as AppNotification;
          setNotifications(prev => {
             if (prev.find(n => n.id === newNotif.id)) return prev;
             const updated = [newNotif, ...prev];
             return updated.sort((a, b) => 
               new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
             );
          });
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          if ("vibrate" in navigator) navigator.vibrate([300, 100, 300]);
        }
      });
    }, (err) => {
      console.error("Realtime notification sync failed", err);
    });

    return () => { unsubscribe(); };
  }, [userId]);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    const batch = writeBatch(db);
    notifications.filter(n => !n.is_read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { is_read: true });
    });
    await batch.commit();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await deleteDoc(doc(db, 'notifications', id));
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
    const batch = writeBatch(db);
    idsToDelete.forEach(id => {
      batch.delete(doc(db, 'notifications', id));
    });
    await batch.commit();
    setSelectedIds(new Set());
    setIsDeleting(false);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => {
          setShowPopover(!showPopover);
          if (!showPopover) markAllRead();
        }} 
        className={`relative p-3.5 rounded-2xl shadow-xl transition-all border ${
            unreadCount > 0 
            ? 'bg-[#c1ff22] border-[#c1ff22] scale-105' 
            : 'bg-zinc-900 border-white/5 opacity-80'
        }`}
      >
        <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-black animate-shake' : 'text-zinc-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-black animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {showPopover && (
        <>
          <div className="fixed inset-0 z-[1000]" onClick={() => setShowPopover(false)} />
          <div className="absolute right-0 mt-4 w-80 bg-[#121212] border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[1001] overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <div className="p-5 border-b border-white/5 bg-zinc-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#c1ff22] animate-ping" />
                  <h3 className="text-white font-black text-[10px] uppercase tracking-[0.2em]">City Notifications</h3>
                </div>
                <button onClick={() => setShowPopover(false)} className="p-1.5 bg-white/5 rounded-lg"><X className="w-4 h-4 text-zinc-500" /></button>
              </div>
              
              {notifications.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <button 
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 text-[9px] font-black uppercase text-zinc-400 hover:text-[#c1ff22] transition-colors"
                  >
                    {selectedIds.size === notifications.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {selectedIds.size === notifications.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedIds.size > 0 && (
                    <button 
                      onClick={deleteSelected}
                      disabled={isDeleting}
                      className="flex items-center gap-1.5 text-rose-500 text-[9px] font-black uppercase bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/20 active:scale-95 transition-all"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      Clear ({selectedIds.size})
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto no-scrollbar bg-black/20">
              {notifications.length === 0 ? (
                <div className="p-16 text-center space-y-4 opacity-20">
                  <Bell className="w-12 h-12 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-white">No active alerts</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`group relative p-5 border-b border-white/5 transition-all hover:bg-white/[0.02] ${!notif.is_read ? 'bg-[#c1ff22]/5' : ''}`}
                  >
                    <div className="flex gap-4">
                      <button 
                        onClick={() => toggleSelect(notif.id)}
                        className={`mt-1 shrink-0 transition-colors ${selectedIds.has(notif.id) ? 'text-[#c1ff22]' : 'text-zinc-800'}`}
                      >
                        {selectedIds.has(notif.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                           <p className="text-white font-black text-xs uppercase tracking-tight italic truncate pr-6">{notif.title}</p>
                           <button 
                             onClick={() => deleteNotification(notif.id)}
                             className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/20 hover:text-rose-500 text-zinc-600 rounded-lg transition-all"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                        <p className="text-zinc-500 text-[10px] font-medium leading-relaxed mt-1 line-clamp-2">{notif.body}</p>
                        <div className="flex items-center gap-1.5 mt-2.5">
                           <Clock className="w-3 h-3 text-zinc-800" />
                           <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">
                             {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 bg-zinc-900/80 text-center">
                <p className="text-[7px] font-black text-zinc-700 uppercase tracking-[0.5em]">Hafizabad Registry Console</p>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
          20%, 40%, 60%, 80% { transform: rotate(10deg); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both infinite;
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
