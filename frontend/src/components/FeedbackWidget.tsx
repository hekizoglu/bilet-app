"use client";

import { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    type: 'FEEDBACK',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Mesajınız iletildi!');
        setFormData({ name: '', email: '', type: 'FEEDBACK', message: '' });
        setIsOpen(false);
      } else {
        toast.error(data.error || 'Gönderim başarısız.');
      }
    } catch (error) {
      toast.error('Bağlantı hatası oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col transform transition-all duration-300 origin-bottom-right">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white">
            <div>
              <h3 className="font-bold text-sm">Bize Ulaşın</h3>
              <p className="text-xs text-blue-100 opacity-90">İstek, öneri veya şikayetleriniz</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition">
              <X size={20} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
            <input 
              type="text" 
              required
              placeholder="Adınız Soyadınız" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
            />
            <input 
              type="email" 
              required
              placeholder="E-posta Adresiniz" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
            />
            <select
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800"
            >
              <option value="FEEDBACK">Görüş Bildir</option>
              <option value="SUGGESTION">Öneride Bulun</option>
              <option value="COMPLAINT">Şikayet İlet</option>
            </select>
            <textarea 
              required
              minLength={10}
              placeholder="Mesajınızı detaylıca buraya yazın..." 
              value={formData.message}
              onChange={e => setFormData({...formData, message: e.target.value})}
              rows={4}
              className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 resize-none"
            />
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 text-sm"
            >
              {isSubmitting ? 'Gönderiliyor...' : <><Send size={16} /> Gönder</>}
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform duration-200 ${isOpen ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={26} />}
      </button>
    </div>
  );
}
