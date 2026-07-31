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
    <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 99999 }}>
      {isOpen && (
        <div style={{ position: 'absolute', bottom: '60px', right: '0', width: '300px', background: 'white', padding: '16px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>Bize Ulaşın</h3>
            <button type="button" onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} color="black" />
            </button>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input type="text" required placeholder="Adınız Soyadınız" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <input type="email" required placeholder="E-posta" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
              <option value="FEEDBACK">Görüş Bildir</option>
              <option value="SUGGESTION">Öneride Bulun</option>
              <option value="COMPLAINT">Şikayet İlet</option>
            </select>
            <textarea required minLength={10} placeholder="Mesajınız..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} rows={4} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />
            <button type="submit" disabled={isSubmitting} style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {isSubmitting ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </form>
        </div>
      )}

      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '56px', height: '56px', borderRadius: '50%', background: isOpen ? '#e11d48' : '#2563eb', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={26} />}
      </button>
    </div>
  );
}
