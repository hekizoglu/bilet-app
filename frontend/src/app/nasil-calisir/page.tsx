"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Info, Ticket, Users, Globe, Lock, QrCode, CreditCard, Armchair, ChevronLeft } from 'lucide-react';

export default function HowItWorksPage() {
  const features = [
    {
      icon: <Globe className="text-blue-500 w-8 h-8" />,
      title: "1. Keşif Portalı ve Genel Etkinlikler",
      description: <>Admin panelinden etkinlik oluştururken 'Görünürlük' ayarını yapabilirsiniz. Etkinliği <strong>'Genel'</strong> olarak ayarlarsanız ana sayfada görünür. <span className="font-bold text-blue-600">'Keşif Portalında Göster'</span> butonunu işaretlerseniz ise tüm organizatörlerin etkinliklerinin listelendiği Global Keşif Portalı (Aggregator) vitrininde yerini alır ve <strong>çok daha geniş kitlelere</strong> ulaşır.</>
    },
    {
      icon: <Lock className="text-rose-500 w-8 h-8" />,
      title: "2. Özel (Gizli) Etkinlikler",
      description: <><span className="font-bold text-rose-600">Doğum günü partileri, özel davetler veya VIP toplantılar</span> gibi sadece belirli bir kapalı gruba yönelik etkinlikler düzenleyebilirsiniz. Etkinliği <strong>'Özel'</strong> olarak ayarladığınızda hiçbir ana sayfada veya arama sonucunda çıkmaz. Özel davetiye linkini gönderdiğiniz misafirleriniz sayfaya girip biletini/LCV (Katılım) kaydını oluşturabilir, böylece admin panelinden <span className="font-bold underline decoration-rose-400 decoration-2 underline-offset-2">kimlerin katılacağını anlık olarak net bir şekilde</span> takip edebilirsiniz.</>
    },
    {
      icon: <Armchair className="text-amber-500 w-8 h-8" />,
      title: "3. Dinamik Oturma Planı",
      description: <>Koltuklu etkinlikler için gelişmiş sürükle-bırak destekli <strong>'Salon Tasarımcısı'</strong>nı kullanabilirsiniz. Koltukları sıralar halinde dizip numaralandırabilir ve fiyatlandırabilirsiniz. Kullanıcılar bilet alırken istedikleri koltuğu <span className="font-bold text-amber-600">etkileşimli şemadan seçerek</span> alırlar.</>
    },
    {
      icon: <CreditCard className="text-emerald-500 w-8 h-8" />,
      title: "4. Akıllı Ödeme Sistemi",
      description: <>Etkinlikler için <strong>Kredi Kartı</strong>, <strong>Kartsız Ödeme</strong> (Banka Havalesi/WhatsApp onayı) veya <strong>Ücretsiz</strong> seçeneklerini belirleyebilirsiniz. Sistem, ücretsiz etkinliklerde anında bilet oluştururken, kartsız işlemlerde admin onayına (Pending) düşürür.</>
    },
    {
      icon: <Users className="text-purple-500 w-8 h-8" />,
      title: "5. Bekleme Listesi (Waitlist)",
      description: <><span className="font-bold text-purple-600">Kapasitesi dolan etkinliklerinizde potansiyel müşterileri kaçırmayın!</span> Sistem otomatik olarak 'Bekleme Listesi' butonunu aktif eder. Kullanıcılar isim ve e-postalarını bırakarak iptal durumunda size ulaşabilecekleri bir sıraya girerler.</>
    },
    {
      icon: <QrCode className="text-indigo-500 w-8 h-8" />,
      title: "6. QR Kod ile Kapı Kontrolü",
      description: <>Satılan her bilet benzersiz bir <span className="font-bold text-indigo-600">şifrelenmiş QR kod</span> içerir. Kapı girişindeki görevlileriniz, mobil cihazlarıyla sisteme girerek bu QR kodları saniyeler içinde okutup biletin <strong className="underline decoration-indigo-400 decoration-2 underline-offset-2">sahte mi yoksa kullanılmış mı</strong> olduğunu anında denetleyebilir.</>
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-900 via-indigo-800 to-blue-900 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[50%] -left-[10%] w-[70%] h-[150%] rounded-full bg-gradient-to-r from-blue-400/20 to-purple-500/20 blur-3xl rotate-12"></div>
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[120%] rounded-full bg-gradient-to-l from-indigo-400/20 to-cyan-400/20 blur-3xl -rotate-12"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-blue-50 text-sm font-semibold mb-6 border border-white/20 backdrop-blur-md shadow-lg">
              <Info size={16} /> Sistem Rehberi
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-6 leading-tight">
              Bilet-App <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-200">Nasıl Çalışır?</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100/90 max-w-2xl mx-auto font-medium">
              Yeni nesil biletleme ve etkinlik yönetim platformumuzun tüm detaylarını ve size sunduğu ayrıcalıkları keşfedin.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
          
          <div className="space-y-12">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col sm:flex-row gap-6 group"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                    {feature.icon}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-base">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 pt-10 border-t border-slate-100 text-center">
            <h4 className="text-2xl font-bold text-slate-800 mb-4">Hemen Başlayın!</h4>
            <p className="text-slate-600 mb-8 max-w-lg mx-auto">Sistem hakkında yeterli bilgiye sahipsiniz. Artık ilk etkinliğinizi oluşturup satışa çıkmaya hazırsınız.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/admin/events" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30 hover:-translate-y-1">
                <Ticket size={20} /> Etkinlik Oluştur
              </Link>
              <Link href="/aggregator" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold transition-all border border-slate-200 hover:-translate-y-1">
                <Globe size={20} /> Keşif Portalını Gör
              </Link>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
