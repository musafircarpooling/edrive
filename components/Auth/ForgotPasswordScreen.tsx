
import React, { useState } from 'react';
import { ArrowLeft, User, Phone, Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ onBack }) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email) return alert("Please fill all fields.");

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'password_resets'), {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        status: 'pending',
        created_at: new Date().toISOString()
      });
      setIsSuccess(true);
    } catch (err) {
      alert("Request failed. Please check your internet connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col h-full bg-[#121212] items-center justify-center p-8 text-center space-y-8 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-[#c1ff22]/10 border-2 border-[#c1ff22] rounded-[2.5rem] flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-[#c1ff22]" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black italic uppercase text-white tracking-tighter">Request <span className="text-[#c1ff22]">Sent</span></h2>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">Admin is reviewing your identity. You will receive your new password on WhatsApp shortly.</p>
        </div>
        <button onClick={onBack} className="w-full bg-[#c1ff22] text-black py-5 rounded-[2.2rem] font-black uppercase text-sm active:scale-95 transition-all">Back to Login</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121212] text-white p-6 animate-in slide-in-from-right duration-300">
      <button onClick={onBack} className="p-2 -ml-2 mb-6 hover:bg-white/5 rounded-full w-fit">
        <ArrowLeft className="w-8 h-8 text-[#c1ff22]" />
      </button>

      <div className="space-y-1 mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tight text-white leading-none">Recover <span className="text-[#c1ff22]">Access</span></h1>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Submit details to Hafizabad HQ</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all">
          <User className="w-6 h-6 text-[#c1ff22]" />
          <div className="flex-1">
            <label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-1">Full Name</label>
            <input className="bg-transparent w-full outline-none font-bold text-white text-base" placeholder="As on CNIC" value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all">
          <Phone className="w-6 h-6 text-[#c1ff22]" />
          <div className="flex-1">
            <label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-1">WhatsApp Number</label>
            <input className="bg-transparent w-full outline-none font-bold text-white text-base" placeholder="03xxxxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 focus-within:border-[#c1ff22]/30 transition-all">
          <Mail className="w-6 h-6 text-[#c1ff22]" />
          <div className="flex-1">
            <label className="text-[9px] font-black uppercase text-zinc-600 tracking-widest block mb-1">Email ID</label>
            <input className="bg-transparent w-full outline-none font-bold text-white text-base" placeholder="name@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-[#c1ff22] text-black py-6 rounded-[2.2rem] font-black text-lg uppercase shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all"
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-5 h-5" /> Submit to Admin</>}
        </button>
      </form>
    </div>
  );
};

export default ForgotPasswordScreen;
