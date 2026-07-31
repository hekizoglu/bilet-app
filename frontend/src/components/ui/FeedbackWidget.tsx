"use client";

import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('FEEDBACK');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, message })
      });

      if (res.ok) {
        setStatus('success');
        setName('');
        setEmail('');
        setMessage('');
        setType('FEEDBACK');
        
        // 3 saniye sonra kapat
        setTimeout(() => {
          setIsOpen(false);
          setStatus('idle');
        }, 3000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Bir hata oluştu.');
        setStatus('error');
      }
    } catch (err) {
      setErrorMsg('Sunucuya bağlanılamadı.');
      setStatus('error');
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Widget Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-xl flex items-center justify-center transition-transform hover:scale-110"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}

      {/* Widget Panel */}
      {isOpen && (
        <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden border border-gray-100 flex flex-col animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-indigo-600 p-4 flex items-center justify-between">
            <h3 className="text-white font-medium">Bize Ulaşın</h3>
            <button onClick={() => setIsOpen(false)} className="text-indigo-100 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 bg-gray-50/50">
            {status === 'success' ? (
              <div className="text-center py-8">
                <div className="bg-green-100 text-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Send className="w-6 h-6" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Teşekkürler!</h4>
                <p className="text-sm text-gray-500">Mesajınız başarıyla alındı. En kısa sürede inceleyeceğiz.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                {status === 'error' && (
                  <div className="bg-red-50 text-red-600 text-xs p-2 rounded">{errorMsg}</div>
                )}
                
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="FEEDBACK">Öneri / İstek</option>
                  <option value="COMPLAINT">Şikayet / Hata Bildirimi</option>
                </select>

                <input 
                  type="text" 
                  placeholder="Adınız Soyadınız" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />

                <input 
                  type="email" 
                  placeholder="E-posta adresiniz" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />

                <textarea 
                  placeholder="Mesajınızı buraya yazın..." 
                  required
                  rows={4}
                  minLength={10}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />

                <button 
                  type="submit" 
                  disabled={status === 'loading'}
                  className="w-full bg-indigo-600 text-white font-medium text-sm py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {status === 'loading' ? 'Gönderiliyor...' : 'Gönder'}
                  {!status && <Send className="w-4 h-4" />}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
