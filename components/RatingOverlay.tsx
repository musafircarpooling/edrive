
import React, { useState } from 'react';
import { Star, X, Check, Loader2, Award, ThumbsUp, MessageSquare, User } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, setDoc } from 'firebase/firestore';

interface RatingOverlayProps {
  rideId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  revieweePic?: string;
  isDriverReviewing: boolean; // True if Driver is rating Passenger, False if Passenger rating Driver
  onClose: () => void;
}

const PASSENGER_TAGS = [
  "Smooth Driving", "Clean Vehicle", "Polite Captain", 
  "On Time", "Followed Route", "Fair Price", 
  "Safe Driving", "Great Conversation"
];

const DRIVER_TAGS = [
  "Respectful", "On Time at Pickup", "Accurate Location", 
  "Safe Drop-off", "Friendly Behavior", "Quick Payment",
  "Clear Instructions", "Patient"
];

const RatingOverlay: React.FC<RatingOverlayProps> = ({ 
  rideId, reviewerId, revieweeId, revieweeName, revieweePic, isDriverReviewing, onClose 
}) => {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tags = isDriverReviewing ? DRIVER_TAGS : PASSENGER_TAGS;

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const isSelected = prev.includes(tag);
      const nextTags = isSelected ? prev.filter(t => t !== tag) : [...prev, tag];
      setComment(nextTags.join(", "));
      return nextTags;
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
        created_at: new Date().toISOString()
      });

      await addDoc(collection(db, 'notifications'), {
        user_id: revieweeId,
        title: 'New Rating Received!',
        body: `You received a ${rating}-star rating from ${isDriverReviewing ? 'your Captain' : 'your Passenger'}.`,
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
    <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-end p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-zinc-900 rounded-[3rem] p-8 border border-white/10 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c1ff22]/20 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-[#c1ff22]" />
            </div>
            <div>
              <h2 className="text-xl font-black italic uppercase text-white leading-none">Rate <span className="text-[#c1ff22]">{isDriverReviewing ? 'Passenger' : 'Captain'}</span></h2>
              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mt-1">Hafizabad HQ Ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full"><X className="w-5 h-5 text-zinc-500" /></button>
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative">
             <div className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-[#c1ff22] shadow-2xl">
                {revieweePic ? (
                  <img src={revieweePic} className="w-full h-full object-cover" alt={revieweeName} />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-10 h-10 text-zinc-600" />
                  </div>
                )}
             </div>
             <div className="absolute -bottom-2 -right-2 bg-[#c1ff22] p-2 rounded-xl shadow-lg border-2 border-zinc-900">
                <Check className="w-4 h-4 text-black" />
             </div>
          </div>
          <div className="text-center">
            <p className="text-white font-black uppercase italic text-lg tracking-tight">{revieweeName}</p>
            <p className="text-zinc-400 text-xs font-bold italic mt-1">How was your trip experience?</p>
          </div>
          
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button 
                key={star} 
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
              >
                <Star 
                  className={`w-10 h-10 ${star <= rating ? 'fill-[#c1ff22] text-[#c1ff22]' : 'text-zinc-800'}`} 
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-3 h-3 text-[#c1ff22]" />
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Quick Feedback</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
                  selectedTags.includes(tag) 
                  ? 'bg-[#c1ff22] border-[#c1ff22] text-black' 
                  : 'bg-zinc-800 border-white/5 text-zinc-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-3 h-3 text-[#c1ff22]" />
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Additional Comments</p>
          </div>
          <textarea 
            className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-sm font-bold min-h-[80px] outline-none focus:border-[#c1ff22]/30"
            placeholder="Tell us more (Optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-[#c1ff22] text-black py-5 rounded-[2rem] font-black uppercase text-base shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Review"}
        </button>
      </div>
    </div>
  );
};

export default RatingOverlay;
