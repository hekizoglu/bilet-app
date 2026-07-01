"use client";

import { useState, useEffect } from 'react';
import { Calendar, Plus, X } from 'lucide-react';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [halls, setHalls] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All');
  const [layoutFilter, setLayoutFilter] = useState('All');
  
  // Form State
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('Taslak');
  const [isSeated, setIsSeated] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [hallId, setHallId] = useState('');
  const [paymentType, setPaymentType] = useState('free');
  const [visibility, setVisibility] = useState('PUBLIC');

  const fetchEvents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHalls = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/halls');
      if (res.ok) {
        const data = await res.json();
        setHalls(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchHalls();
  }, []);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getCookie('token');

    const payload = {
      name,
      date: new Date(date).toISOString(),
      price: Number(price),
      status,
      isSeated,
      paymentType,
      visibility,
      ...(isSeated ? { hallId } : { capacity: Number(capacity) })
    };

    try {
      const res = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchEvents();
        // Formu temizle
        setName(''); setDate(''); setPrice(''); setStatus('Taslak'); setIsSeated(true); setCapacity(''); setHallId(''); setPaymentType('free'); setVisibility('PUBLIC');
      } else {
        const errData = await res.json();
        let errMsg = errData.error || errData.message || "Bilinmeyen hata";
        if (errData.details && Array.isArray(errData.details)) {
          errMsg += ":\n" + errData.details.map((d: any) => `- ${d.message}`).join("\n");
        }
        alert(`Hata: ${errMsg}`);
      }
    } catch (error) {
      console.error(error);
      alert('Sunucuya bağlanılamadı');
    }
  };

  const handleRegenerateSlug = async (eventId: string) => {
    if (!confirm("Bu işlem mevcut özel linki iptal edecek ve yeni bir link oluşturacaktır. Emin misiniz?")) return;
    
    const token = getCookie('token');
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}/regenerate-slug`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Link başarıyla yenilendi!");
        fetchEvents();
      } else {
        alert("Link yenilenirken hata oluştu.");
      }
    } catch (e) {
      alert("Sunucuya bağlanılamadı");
    }
  };

  const getLocalNowString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  };
  const nowString = getLocalNowString();

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || event.status === statusFilter;
    
    let matchesPrice = true;
    if (priceFilter === 'Free') matchesPrice = Number(event.price) === 0;
    else if (priceFilter === 'Paid') matchesPrice = Number(event.price) > 0;

    let matchesLayout = true;
    if (layoutFilter === 'Seated') matchesLayout = event.isSeated === true;
    else if (layoutFilter === 'Seatless') matchesLayout = event.isSeated === false;

    return matchesSearch && matchesStatus && matchesPrice && matchesLayout;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="text-blue-600" />
          Etkinlikler
        </h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Yeni Etkinlik Ekle
        </button>
      </div>

      {/* Search and Filter bar */}
      <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Etkinlik adına göre ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex gap-3">
            <div className="w-full md:w-36">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="All">Tüm Durumlar</option>
                <option value="Aktif">Aktif</option>
                <option value="Taslak">Taslak</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>

            <div className="w-full md:w-36">
              <select
                value={layoutFilter}
                onChange={(e) => setLayoutFilter(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="All">Oturma Düzeni</option>
                <option value="Seated">Koltuklu</option>
                <option value="Seatless">Ayakta</option>
              </select>
            </div>

            <div className="w-full md:w-36">
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="All">Ücret Tipi</option>
                <option value="Free">Ücretsiz</option>
                <option value="Paid">Ücretli</option>
              </select>
            </div>

            {(searchTerm || statusFilter !== 'All' || layoutFilter !== 'All' || priceFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('All');
                  setLayoutFilter('All');
                  setPriceFilter('All');
                }}
                className="col-span-2 sm:col-span-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                Temizle
              </button>
            )}
          </div>
        </div>

        <div className="text-xs font-semibold text-gray-500 pt-1">
          {filteredEvents.length} / {events.length} etkinlik listeleniyor
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
              <th className="p-4 font-medium">Etkinlik Adı</th>
              <th className="p-4 font-medium">Tarih</th>
              <th className="p-4 font-medium">Fiyat (₺)</th>
              <th className="p-4 font-medium">Ödeme</th>
              <th className="p-4 font-medium">Tür</th>
              <th className="p-4 font-medium">Görünürlük</th>
              <th className="p-4 font-medium">Durum</th>
              <th className="p-4 font-medium text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredEvents.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50 transition">
                <td className="p-4 font-medium text-gray-900">{event.name}</td>
                <td className="p-4 text-gray-600">{new Date(event.date).toLocaleString('tr-TR')}</td>
                <td className="p-4 text-gray-600">{event.price} ₺</td>
                <td className="p-4 text-gray-600">
                  {event.paymentType === 'free' && 'Ücretsiz'}
                  {event.paymentType === 'creditcard' && 'Şimdi Ödeme'}
                  {event.paymentType === 'cardless' && 'Kartsız Ödeme'}
                </td>
                <td className="p-4 text-gray-600">
                  {event.isSeated ? (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Koltuklu ({event.hall?.name})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Ayakta ({event.capacity} Kişi)
                    </span>
                  )}
                </td>
                <td className="p-4 text-gray-600">
                  {event.visibility === 'PUBLIC' ? (
                    <span className="text-green-600 font-medium">Genel</span>
                  ) : (
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-red-600 font-medium">Özel Link</span>
                      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded">
                        <span className="text-gray-500 truncate w-24">...{event.privateSlug?.slice(-6)}</span>
                        <button onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/event/${event.privateSlug}`);
                          alert("Link kopyalandı!");
                        }} className="text-blue-600 font-bold hover:underline">Kopyala</button>
                      </div>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    event.status === 'Aktif' ? 'bg-blue-100 text-blue-800' :
                    event.status === 'Pasif' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    {event.visibility === 'PRIVATE' && (
                      <button 
                        onClick={() => handleRegenerateSlug(event.id)} 
                        className="text-sm px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium rounded transition"
                        title="Özel Linki Yenile (Eskisi iptal olur)"
                      >
                        Yenile
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        const link = event.visibility === 'PRIVATE' ? event.privateSlug : event.id;
                        navigator.clipboard.writeText(`${window.location.origin}/event/${link}`);
                        alert('Etkinlik linki kopyalandı! Müşterilerinize gönderebilirsiniz.');
                      }}
                      className="text-sm px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 font-medium rounded transition"
                      title="Müşteri Linkini Kopyala"
                    >
                      Kopyala
                    </button>
                    <a 
                      href={`/event/${event.visibility === 'PRIVATE' ? event.privateSlug : event.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm px-3 py-1.5 bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium rounded transition"
                      title="Sayfaya Git"
                    >
                      Sayfayı Gör
                    </a>
                  </div>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  Henüz etkinlik bulunmuyor.
                </td>
              </tr>
            )}
            {events.length > 0 && filteredEvents.length === 0 && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-gray-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                      <Calendar size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-base">Eşleşen Etkinlik Bulunamadı</p>
                      <p className="text-xs text-gray-500 mt-1">Arama kriterlerinizi veya filtrelerinizi değiştirerek tekrar deneyebilirsiniz.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('All');
                        setLayoutFilter('All');
                        setPriceFilter('All');
                      }}
                      className="mt-2 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-lg font-bold transition cursor-pointer"
                    >
                      Filtreleri Temizle
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Yeni Etkinlik Ekle</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="event-form" onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Etkinlik Adı</label>
                  <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarih ve Saat</label>
                    <input required type="datetime-local" min={nowString} value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺)</label>
                    <input required type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="Taslak">Taslak</option>
                      <option value="Aktif">Aktif</option>
                      <option value="Pasif">Pasif</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Oturma Düzeni</label>
                    <select value={isSeated ? "true" : "false"} onChange={e => setIsSeated(e.target.value === "true")} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="true">Koltuklu Seçimli</option>
                      <option value="false">Ayakta (Genel Giriş)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ödeme Türü</label>
                    <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="free">Ücretsiz</option>
                      <option value="creditcard">Şimdi Ödeme (Kredi Kartı)</option>
                      <option value="cardless">Kartsız Ödeme (Banka/WhatsApp)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Görünürlük</label>
                    <select 
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value)}
                      className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="PUBLIC">Genel (Ana sayfada listelenir)</option>
                      <option value="PRIVATE">Özel (Sadece link ile girilir)</option>
                    </select>
                  </div>
                </div>

                {isSeated ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salon Seçin</label>
                    <select required value={hallId} onChange={e => setHallId(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                      <option value="">-- Salon Seçin --</option>
                      {halls.map(hall => (
                        <option key={hall.id} value={hall.id}>{hall.name} ({hall.seatCount} Koltuk)</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kapasite (Kişi)</label>
                    <input required type="number" min="1" value={capacity} onChange={e => setCapacity(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                )}
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition">İptal</button>
              <button type="submit" form="event-form" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition">Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
