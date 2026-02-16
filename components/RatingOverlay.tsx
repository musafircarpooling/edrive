
import React, { useState } from 'react';
import { Star, X, Check, Loader2, Award, ThumbsUp, MessageSquare, User, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { RideType } from '../types';

interface RatingOverlayProps {
  rideId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  revieweePic?: string;
  isDriverReviewing: boolean; 
  rideType?: RideType;
  onClose: () => void;
}

const PASSENGER_TAGS = [
  "SMOOTH DRIVING", "CLEAN VEHICLE", "POLITE CAPTAIN", 
  "ON TIME", "FOLLOWED ROUTE", "FAIR PRICE", 
  "SAFE DRIVING", "GREAT CONVERSATION"
];

const DELIVERY_TAGS = [
  "CAREFUL HANDLING", "FAST DELIVERY", "ITEM SAFE",
  "PROFESSIONAL PARTNER", "QUICK PICKUP", "GREAT SERVICE",
  "WELL PACKAGED", "POLITE BEHAVIOR"
];

const DRIVER_TAGS = [
  "RESPECTFUL", "ON TIME", "ACCURATE LOCATION", 
  "SAFE DROP-OFF", "FRIENDLY BEHAVIOR", "QUICK PAYMENT",
  "CLEAR INSTRUCTIONS", "PATIENT"
];

const RatingOverlay: React.FC<RatingOverlayProps> = ({ 
  rideId, reviewerId, revieweeId, revieweeName, revieweePic, isDriverReviewing, rideType, onClose 
}) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDelivery = rideType === RideType.DELIVERY;
  
  let tags: string[] = [];
  if (isDriverReviewing) {
    tags = DRIVER_TAGS;
  } else {
    tags = isDelivery ? DELIVERY_TAGS : PASSENGER_TAGS;
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'ride_reviews'), {
        ride_id: rideId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating,
        comment: comment || selectedTags.join(", ") || "No comment",
        created_at: new Date().toISOString(),
        service_type: isDelivery ? 'DELIVERY' : 'RIDE'
      });

      await addDoc(collection(db, 'notifications'), {
        user_id: revieweeId,
        title: 'New Rating Received!',
        body: `You received a ${rating}-star rating for your recent trip.`,
        type: 'system',
        is_read: false,
        created_at: new Date().toISOString()
      });

      onClose();
    } catch (err) {
      alert("Failed to submit rating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1500] bg-[#111] flex flex-col animate-in fade-in duration-300">
      {/* Header matching the image */}
      <header className="p-6 pt-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#c1ff22]/20 rounded-2xl flex items-center justify-center border border-[#c1ff22]/20">
            <Award className="w-7 h-7 text-[#c1ff22]" />
          </div>
          <div>
            <h2 className="text-2xl font-black italic uppercase text-white leading-none tracking-tighter">
              RATE {isDriverReviewing ? (isDelivery ? 'CUSTOMER' : 'PASSENGER') : (isDelivery ? 'PARTNER' : 'CAPTAIN')}
            </h2>
            <p className="text-[9px] text-zinc-600 font-black uppercase tracking-[0.2em] mt-1.5">EDRIVE HQ REGISTRY</p>
          </div>
        </div>
        <button onClick={onClose} className="p-4 bg-zinc-900/50 rounded-full active:scale-90 transition-transform">
          <X className="w-6 h-6 text-zinc-500" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
        {/* Profile Section */}
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative">
             <div className="w-40 h-40 rounded-[2.8rem] overflow-hidden border-4 border-[#c1ff22] shadow-[0_20px_60px_rgba(193,255,34,0.15)] bg-zinc-900">
                {revieweePic ? (
                  <img src={revieweePic} className="w-full h-full object-cover" alt={revieweeName} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-zinc-800" />
                  </div>
                )}
             </div>
             <div className="absolute -bottom-1 -right-1 bg-[#c1ff22] p-2 rounded-2xl shadow-xl border-4 border-[#111]">
                <Check className="w-5 h-5 text-black stroke-[3px]" />
             </div>
          </div>
          <div className="text-center space-y-2">
            <p className="text-white font-black uppercase italic text-3xl tracking-tighter leading-none">{revieweeName}</p>
            <p className="text-zinc-500 text-sm font-bold italic">How was the trip experience?</p>
          </div>
          
          {/* Star Rating Section */}
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} className="transition-all active:scale-90 p-1">
                <Star className={`w-12 h-12 ${star <= rating ? 'fill-[#c1ff22] text-[#c1ff22]' : 'text-zinc-900'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <ThumbsUp className="w-4 h-4 text-[#c1ff22]" />
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">FEEDBACK TAGS</p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {tags.map(tag => (
              <button 
                key={tag} 
                onClick={() => toggleTag(tag)} 
                className={`px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all border tracking-widest ${
                  selectedTags.includes(tag) 
                  ? 'bg-[#c1ff22] border-[#c1ff22] text-black shadow-lg scale-105' 
                  : 'bg-zinc-900/40 border-white/5 text-zinc-500 hover:border-[#c1ff22]/20'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <MessageSquare className="w-4 h-4 text-[#c1ff22]" />
            <p className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em]">SPECIFIC FEEDBACK</p>
          </div>
          <div className="relative">
            <textarea 
              className="w-full bg-black/60 border border-white/5 rounded-[2.5rem] p-8 text-white text-base font-bold min-h-[140px] outline-none focus:border-[#c1ff22]/20 transition-all placeholder:text-zinc-800 italic" 
              placeholder="Type comments here..." 
              value={comment} 
              onChange={(e) => setComment(e.target.value)} 
            />
          </div>
        </div>
      </div>

      {/* Confirm Button Area */}
      <div className="p-8 pb-14 shrink-0">
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting} 
          className="w-full bg-[#c1ff22] text-black py-7 rounded-[2.2rem] font-black uppercase text-lg shadow-[0_20px_60px_rgba(193,255,34,0.3)] flex items-center justify-center gap-4 active:scale-95 transition-all italic tracking-tighter"
        >
          {isSubmitting ? <Loader2 className="w-7 h-7 animate-spin" /> : (
            <>
              <span>CONFIRM SERVICE RATING</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default RatingOverlay;
