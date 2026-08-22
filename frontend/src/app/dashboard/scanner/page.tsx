"use client";

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Download, UploadCloud, CheckCircle, XCircle, AlertTriangle, Scan, Camera } from 'lucide-react';

interface Ticket {
  id: string;
  ticketCode: string;
  seatName: string | null;
  customer: string;
  isUsed: boolean;
}

export default function OfflineScannerPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pendingSync, setPendingSync] = useState<{ticketCode: string, usedAt: string}[]>([]);
  
  const [scanResult, setScanResult] = useState<{status: 'success'|'error'|'warning', message: string, detail?: string} | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    fetchEvents();
    // Load state from local storage on mount
    const savedTickets = localStorage.getItem('offline_tickets');
    if (savedTickets) setTickets(JSON.parse(savedTickets));
    
    const savedPending = localStorage.getItem('pending_sync');
    if (savedPending) setPendingSync(JSON.parse(savedPending));
    
    const savedEvent = localStorage.getItem('offline_event_id');
    if (savedEvent) setSelectedEventId(savedEvent);
  }, []);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events`, {
        headers: { 'Authorization': `Bearer ${getCookie('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.filter((e: any) => e.status === 'Aktif'));
      }
    } catch (e) {
      console.error("Etkinlikler yüklenemedi", e);
    }
  };

  const downloadTickets = async () => {
    if (!selectedEventId) toast.error("Lütfen bir etkinlik seçin"); return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events/${selectedEventId}/attendees`, {
        headers: { 'Authorization': `Bearer ${getCookie('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data.attendees || []);
        localStorage.setItem('offline_tickets', JSON.stringify(data.attendees || []));
        localStorage.setItem('offline_event_id', selectedEventId);
        toast.success(`${(data.attendees || []).length} adet bilet cihazınıza indirildi. İnterneti kapatabilirsiniz.`);
      } else {
        toast.error("Biletler indirilemedi.");
      }
    }catch {
      toast.error("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    }
  };

  const syncTickets = async () => {
    if (pendingSync.length === 0) toast.info("Senkronize edilecek yeni veri yok."); return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/reservations/sync`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getCookie('token')}` 
        },
        body: JSON.stringify({ checkIns: pendingSync })
      });

      if (res.ok) {
        const data = await res.json();
        setPendingSync([]);
        localStorage.removeItem('pending_sync');
        toast.success(`${data.results.success} bilet sunucuya eşitlendi. (Çakışma: ${data.results.conflicts})`);
      } else {
        toast.error("Senkronizasyon başarısız oldu.");
      }
    }catch {
      toast.error("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
    }
  };

  const startScanner = () => {
    if (tickets.length === 0) {
      toast.warning("Önce biletleri cihaza indirmelisiniz!");
      return;
    }
    
    setIsScanning(true);
    setScanResult(null);

    // Timeout to allow DOM to render the reader div
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 }, formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] },
        false
      );

      scannerRef.current.render(onScanSuccess, onScanFailure);
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }
    setIsScanning(false);
  };

  const onScanSuccess = (decodedText: string) => {
    stopScanner(); // Stop after successful scan
    handleTicketCode(decodedText);
  };

  const onScanFailure = () => {
    // ignore
  };

  const handleTicketCode = (code: string) => {
    const ticketIndex = tickets.findIndex(t => t.ticketCode === code);
    
    if (ticketIndex === -1) {
      setScanResult({
        status: 'error',
        message: 'GEÇERSİZ BİLET',
        detail: 'Sistemde böyle bir bilet bulunamadı.'
      });
      return;
    }

    const ticket = tickets[ticketIndex];

    if (ticket.isUsed) {
      setScanResult({
        status: 'warning',
        message: 'DAHA ÖNCE OKUTULDU',
        detail: `${ticket.customer} - ${ticket.seatName || 'Genel Giriş'}`
      });
      return;
    }

    // Mark as used locally
    const newTickets = [...tickets];
    newTickets[ticketIndex].isUsed = true;
    setTickets(newTickets);
    localStorage.setItem('offline_tickets', JSON.stringify(newTickets));

    // Add to pending sync
    const newPending = [...pendingSync, { ticketCode: code, usedAt: new Date().toISOString() }];
    setPendingSync(newPending);
    localStorage.setItem('pending_sync', JSON.stringify(newPending));

    setScanResult({
      status: 'success',
      message: 'GİRİŞ ONAYLANDI',
      detail: `${ticket.customer} - ${ticket.seatName || 'Genel Giriş'}`
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Scan className="text-blue-600" size={32} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bilet Tarayıcı (Çevrimdışı)</h1>
          <p className="text-gray-500 text-sm">İnternet bağlantısı olmadan kapı kontrolü yapın.</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="font-semibold text-gray-800 mb-4">1. Kurulum (İnternet Gerektirir)</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="flex-1 p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 bg-white outline-none"
          >
            <option value="">Etkinlik Seçin...</option>
            {events.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button
            onClick={downloadTickets}
            className="flex items-center justify-center gap-2 bg-gray-800 text-white px-6 py-2.5 rounded-xl hover:bg-gray-900 transition"
          >
            <Download size={18} /> İndir
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Cihazda <strong>{tickets.length}</strong> adet bilet verisi bulunuyor.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
          <span>2. Tarama (İnternet Gerektirmez)</span>
          <div className="text-xs font-bold px-2 py-1 bg-gray-100 rounded text-gray-600">
            Bekleyen Eşitleme: {pendingSync.length}
          </div>
        </h2>

        {!isScanning && (
          <div className="text-center py-8">
            <button
              onClick={startScanner}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition flex items-center justify-center gap-3 mx-auto shadow-lg shadow-blue-200"
            >
              <Camera size={24} /> Kamerayı Aç
            </button>
          </div>
        )}

        {isScanning && (
          <div className="relative">
            <div id="reader" className="overflow-hidden rounded-xl bg-gray-100 w-full max-w-md mx-auto"></div>
            <button 
              onClick={stopScanner}
              className="mt-4 w-full max-w-md mx-auto block bg-gray-200 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
            >
              İptal
            </button>
          </div>
        )}

        {scanResult && !isScanning && (
          <div className={`mt-6 p-6 rounded-xl border flex flex-col items-center justify-center text-center animate-in zoom-in duration-300 ${
            scanResult.status === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            scanResult.status === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
            'bg-red-50 border-red-200 text-red-800'
          }`}>
            {scanResult.status === 'success' && <CheckCircle size={64} className="mb-3 text-green-500" />}
            {scanResult.status === 'warning' && <AlertTriangle size={64} className="mb-3 text-yellow-500" />}
            {scanResult.status === 'error' && <XCircle size={64} className="mb-3 text-red-500" />}
            
            <h3 className="text-2xl font-black mb-1">{scanResult.message}</h3>
            {scanResult.detail && <p className="text-lg font-medium opacity-90">{scanResult.detail}</p>}

            <button
              onClick={startScanner}
              className="mt-6 bg-white bg-opacity-50 hover:bg-opacity-100 text-gray-900 px-6 py-2.5 rounded-xl font-bold transition border border-gray-300"
            >
              Sıradakini Tara
            </button>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="font-semibold text-gray-800 mb-4">3. Eşitleme (İnternet Gerektirir)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Çevrimdışı taradığınız biletlerin sunucuya (ana sisteme) iletilmesi için gün sonunda veya internete bağlandığınızda bu butona basın.
        </p>
        <button
          onClick={syncTickets}
          disabled={pendingSync.length === 0}
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold transition ${
            pendingSync.length > 0 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <UploadCloud size={20} />
          {pendingSync.length} Bileti Sunucuya Gönder
        </button>
      </div>
    </div>
  );
}
