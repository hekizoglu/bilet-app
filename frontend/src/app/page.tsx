import Link from 'next/link';
import { Calendar, MapPin, Tag } from 'lucide-react';

async function getPublicEvents() {
  try {
    const res = await fetch('http://localhost:5000/api/events/public', { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Etkinlikler çekilemedi", e);
    return [];
  }
}

export default async function Home() {
  const events = await getPublicEvents();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-blue-900 text-white py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Hoş Geldiniz</h1>
        <p className="text-xl text-blue-200 mb-8 max-w-2xl mx-auto">
          En sevdiğiniz konserler, tiyatrolar ve özel organizasyonlar için biletlerinizi hemen ayırtın.
        </p>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
          <Calendar className="text-blue-600" size={32} />
          Yaklaşan Etkinlikler
        </h2>

        {events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-lg">Şu anda listelenecek açık bir etkinlik bulunmuyor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event: any) => (
              <div key={event.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition duration-300 border border-gray-100 flex flex-col">
                <div className="h-48 bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center relative">
                  <span className="text-4xl font-bold text-blue-900 opacity-20 uppercase px-4 text-center">{event.name}</span>
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-sm font-bold text-blue-900 shadow-sm">
                    {event.price > 0 ? `${event.price} ₺` : 'ÜCRETSİZ'}
                  </div>
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{event.name}</h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar size={16} className="text-blue-500" />
                      <span>{new Date(event.date).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' })}</span>
                    </div>
                    {event.isSeated && event.hall ? (
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <MapPin size={16} className="text-blue-500" />
                        <span>{event.hall.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-600 text-sm">
                        <Tag size={16} className="text-blue-500" />
                        <span>Genel Giriş (Ayakta)</span>
                      </div>
                    )}
                  </div>

                  <Link 
                    href={`/event/${event.id}`}
                    className="mt-auto w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-center transition shadow hover:shadow-lg"
                  >
                    Bilet Al
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
