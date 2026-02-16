
import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, Loader2, Calendar, User } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ReviewDisplayOverlayProps {
  userId: string;
  userName: string;
  userPic?: string;
  onClose: () => void;
}

const ReviewDisplayOverlay: React.FC<ReviewDisplayOverlayProps> = ({ userId, userName, userPic, onClose }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const q = query(
          collection(db, 'ride_reviews'),
          where('reviewee_id', '==', userId),
          limit(20)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as Review));
        setReviews(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (e) {
        console.error("Error fetching reviews", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReviews();
  }, [userId]);

  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <div className="fixed inset-0 z-[600] bg-black/90 backdrop-blur-md flex items-end justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-zinc-950 rounded-[3rem] border border-white/10 shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom-10">
        <header className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#c1ff22] bg-zinc-900">
              {userPic ? <img src={userPic} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-zinc-700" /></div>}
            </div>
            <div>
              <h3 className="text-white font-black uppercase italic text-sm leading-none">{userName}</h3>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3 h-3 text-[#c1ff22] fill-current" />
                <span className="text-[10px] font-black text-[#c1ff22]">{avgRating} ({reviews.length} Reviews)</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-zinc-900 rounded-2xl active:scale-90"><X className="w-5 h-5" /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center opacity-20">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest mt-2">Syncing History...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-10 text-center opacity-20">
              <MessageSquare className="w-10 h-10 mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">No reviews yet</p>
            </div>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="bg-zinc-900/50 p-5 rounded-3xl border border-white/5 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-[#c1ff22] fill-current' : 'text-zinc-800'}`} />
                    ))}
                  </div>
                  <span className="text-[8px] font-black text-zinc-600 uppercase flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs font-medium text-zinc-300 italic">"{review.comment}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewDisplayOverlay;
