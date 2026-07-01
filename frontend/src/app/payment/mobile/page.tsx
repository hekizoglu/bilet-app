"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { QrCode, Copy, CheckCircle, Smartphone, CreditCard, ArrowLeft, Share2, Wallet, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

// Phase 13.8 — Mobil Ödeme Ekranı (Dynamic Refactoring)
// Özellikler: API Entegrasyonu, QR ile IBAN gösterimi, One-Tap kopyalama, Mobil-first tasarım

function MobilePaymentContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [copied, setCopied] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"iban" | "qr" | "creditcard">("iban");
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const deferredPromptRef = useRef<any>(null);

  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Credit Card Form States
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holderName, setHolderName] = useState("");
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);

  // PWA: Ana ekrana ekle butonu için install prompt yönetimi
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setShowInstallPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Fetch reservation details dynamically if ID is provided
  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    fetch(`http://localhost:5000/api/reservations/public/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Bilet detayları yüklenemedi.");
        return r.json();
      })
      .then((data) => {
        setReservation(data);
        setLoading(false);
        // Eğer kredi kartı ise varsayılan olarak kredi kartı sekmesini seç
        if (data.event?.paymentType === 'creditcard') {
          setPaymentMethod("creditcard");
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;
    if (outcome === "accepted") setShowInstallPrompt(false);
    deferredPromptRef.current = null;
  };

  // One-Tap kopyalama
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      // Fallback
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(label);
      setTimeout(() => setCopied(null), 2500);
    }
  };

  const handleCardNumberChange = (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 16);
    const formatted = clean.match(/.{1,4}/g)?.join(" ") || clean;
    setCardNumber(formatted);
  };

  const handleExpiryChange = (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) {
      setExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setExpiry(clean);
    }
  };

  const handleCvvChange = (value: string) => {
    const clean = value.replace(/\D/g, "").slice(0, 3);
    setCvv(clean);
  };

  const handleCreditCardPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPay(true);
    try {
      const res = await fetch(`http://localhost:5000/api/payments/${id}/pay-creditcard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardNumber: cardNumber.replace(/\s+/g, ""),
          expiry,
          cvv,
          holderName
        })
      });
      const result = await res.json();
      if (res.ok) {
        setPaySuccess(true);
        setReservation((prev: any) => ({ ...prev, paymentStatus: 'paid', status: 'Onaylı' }));
      } else {
        alert(`Hata: ${result.error || "Ödeme başarısız."}`);
      }
    } catch (err) {
      alert("Ödeme sunucusuna bağlanılamadı.");
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const ibanNumber = (reservation && reservation.adminPayment?.iban) 
    ? reservation.adminPayment.iban 
    : "TR33 0006 2000 1000 0006 2978 02";
    
  const recipient = (reservation && reservation.adminPayment?.email) 
    ? reservation.adminPayment.email 
    : "Bilet Organizasyon A.Ş.";
    
  const reference = reservation 
    ? reservation.paymentReference 
    : "PAYMENT-2026-06-29-001-ABC123";
    
  const amount = reservation 
    ? `${reservation.event.price},00 TL` 
    : "350,00 TL";

  const eventTitle = reservation 
    ? `${reservation.event.name} · ${reservation.seatName ? `Koltuk: ${reservation.seatName}` : "Genel Giriş"}`
    : "Yaz Konseri 2026 · Koltuk A12";

  const isCreditCardType = reservation?.event?.paymentType === 'creditcard';

  // Paylaşım API — Mobil için native share sheet
  const sharePaymentInfo = async () => {
    const text = `💳 Ödeme Bilgileri\nIBAN: ${ibanNumber}\nAlıcı: ${recipient}\nAçıklama: ${reference}\nTutar: ${amount}`;
    if (navigator.share) {
      await navigator.share({ title: "Ödeme Bilgileri", text });
    } else {
      copyToClipboard(text, "share");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
        <p>Bilet ödeme detayları yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-red-400 p-6 text-center">
        <p className="text-lg font-bold mb-2">Hata Oluştu</p>
        <p className="text-sm text-slate-500 mb-6">{error}</p>
        <button 
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition"
        >
          Geri Dön
        </button>
      </div>
    );
  }

  // Ödeme başarılı ekranı
  if (paySuccess || reservation?.paymentStatus === 'paid') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white font-sans flex items-center justify-center p-4">
        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-green-500/20 text-green-400 border border-green-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle size={44} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ödeme Başarılı!</h1>
            <p className="text-slate-400 text-sm mt-2">Biletiniz başarıyla oluşturuldu ve onaylandı.</p>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-2">
            <div className="text-xs text-slate-500">Etkinlik</div>
            <div className="font-bold text-white text-base">{eventTitle}</div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-sm">
              <div>
                <div className="text-[10px] text-slate-500">Alıcı</div>
                <div className="font-semibold text-slate-300">{reservation?.customer}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Tutar</div>
                <div className="font-semibold text-green-400">{amount}</div>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            QR kodlu e-biletiniz <strong>{reservation?.email}</strong> adresine gönderildi. Etkinlik girişinde biletinizi okutarak giriş yapabilirsiniz.
          </div>

          <button
            onClick={() => window.location.href = '/profile'}
            className="w-full py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 rounded-2xl font-bold transition shadow-lg shadow-green-900/50 cursor-pointer"
          >
            Biletlerime Git
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-bold text-base leading-tight">Ödeme Ekranı</h1>
          <p className="text-xs text-slate-400">{isCreditCardType ? "Kredi Kartı ile güvenli öde" : "Havale / EFT ile öde"}</p>
        </div>
        <div className="ml-auto">
          {!isCreditCardType && (
            <button
              onClick={sharePaymentInfo}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
            >
              <Share2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Ana içerik */}
      <div className="px-4 pb-10 pt-6 space-y-5 max-w-md mx-auto">

        {/* Tutar kartı */}
        <div className="bg-blue-600 rounded-3xl p-6 text-center shadow-2xl shadow-blue-900/50">
          <p className="text-sm text-blue-200 mb-1">Ödenecek Tutar</p>
          <p className="text-5xl font-black tracking-tight">{amount}</p>
          <p className="text-sm text-blue-200 mt-2">{eventTitle}</p>
        </div>

        {/* Tab geçiş */}
        {!isCreditCardType ? (
          <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setPaymentMethod("iban")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${
                paymentMethod === "iban"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Wallet size={16} />
              IBAN ile Öde
            </button>
            <button
              onClick={() => setPaymentMethod("qr")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${
                paymentMethod === "qr"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <QrCode size={16} />
              QR Kod
            </button>
          </div>
        ) : (
          <div className="flex bg-white/5 rounded-2xl p-1 gap-1">
            <button
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white shadow cursor-default"
            >
              <CreditCard size={16} />
              Kredi Kartı ile Öde
            </button>
          </div>
        )}

        {/* IBAN Ekranı */}
        {paymentMethod === "iban" && !isCreditCardType && (
          <div className="space-y-3">
            {/* IBAN */}
            <div
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between cursor-pointer active:bg-white/10 transition"
              onClick={() => copyToClipboard(ibanNumber.replace(/\s/g, ""), "iban")}
            >
              <div>
                <p className="text-xs text-slate-400 mb-1">IBAN Numarası</p>
                <p className="font-mono font-bold text-lg tracking-widest text-white">{ibanNumber}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                copied === "iban" ? "bg-green-500" : "bg-blue-600"
              }`}>
                {copied === "iban" ? <CheckCircle size={20} /> : <Copy size={18} />}
              </div>
            </div>

            {/* Alıcı */}
            <div
              className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between cursor-pointer active:bg-white/10 transition"
              onClick={() => copyToClipboard(recipient, "recipient")}
            >
              <div>
                <p className="text-xs text-slate-400 mb-1">Alıcı Adı</p>
                <p className="font-semibold text-white">{recipient}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition ${
                copied === "recipient" ? "bg-green-500" : "bg-slate-700"
              }`}>
                {copied === "recipient" ? <CheckCircle size={20} /> : <Copy size={18} />}
              </div>
            </div>

            {/* Açıklama / Referans */}
            <div
              className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between cursor-pointer active:bg-amber-500/20 transition"
              onClick={() => copyToClipboard(reference, "reference")}
            >
              <div>
                <p className="text-xs text-amber-400 mb-1">⚠️ Açıklama (Zorunlu)</p>
                <p className="font-mono text-sm font-bold text-amber-300 break-all">{reference}</p>
                <p className="text-xs text-amber-500/80 mt-1">Bu kodu açıklama kısmına yazmayı unutmayın!</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition ${
                copied === "reference" ? "bg-green-500" : "bg-amber-600"
              }`}>
                {copied === "reference" ? <CheckCircle size={20} /> : <Copy size={18} />}
              </div>
            </div>

            {/* Hepsini kopyala butonu */}
            <button
              onClick={sharePaymentInfo}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/50 cursor-pointer"
            >
              <Share2 size={18} />
              Tüm Bilgileri Paylaş / Kopyala
            </button>
          </div>
        )}

        {/* QR Kod Ekranı */}
        {paymentMethod === "qr" && !isCreditCardType && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4">
              <div className="w-48 h-48 bg-white rounded-2xl flex items-center justify-center p-3">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=iban:${ibanNumber.replace(/\s/g, "")}?amount=${amount.split(',')[0]}`} 
                  alt="QR Code" 
                  className="w-full h-full rounded"
                />
              </div>
              <div className="text-center text-slate-900">
                <p className="font-bold">QR kodu taratın</p>
                <p className="text-xs text-slate-500 mt-1">Banka uygulamanızın QR okuyucusu ile taratarak ödeme yapabilirsiniz</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <p className="text-xs text-slate-400">
                📱 QR kod, banka uygulamanızın QR ödeme ekranında IBAN bilgilerini otomatik doldurur. Açıklama alanını manuel girmeniz gerekebilir.
              </p>
            </div>
          </div>
        )}

        {/* Kredi Kartı Formu */}
        {paymentMethod === "creditcard" && (
          <form onSubmit={handleCreditCardPay} className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kart Sahibi Adı Soyadı</label>
                <input 
                  required
                  type="text" 
                  value={holderName}
                  onChange={e => setHolderName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Kart Numarası</label>
                <input 
                  required
                  type="text" 
                  value={cardNumber}
                  onChange={e => handleCardNumberChange(e.target.value)}
                  placeholder="0000 0000 0000 0000"
                  className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600 text-white font-mono font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Son Kullanma</label>
                  <input 
                    required
                    type="text" 
                    value={expiry}
                    onChange={e => handleExpiryChange(e.target.value)}
                    placeholder="AA/YY"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600 text-white font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">CVV / Güvenlik Kodu</label>
                  <input 
                    required
                    type="text" 
                    value={cvv}
                    onChange={e => handleCvvChange(e.target.value)}
                    placeholder="123"
                    className="w-full bg-slate-800 border border-white/10 rounded-xl p-3 text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600 text-white font-mono font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingPay}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-800/50 disabled:cursor-not-allowed rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/50 cursor-pointer"
            >
              {isSubmittingPay ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Ödeme İşleniyor...
                </>
              ) : (
                <>
                  <CreditCard size={18} />
                  {amount} Güvenli Öde
                </>
              )}
            </button>
          </form>
        )}

        {/* PWA Ana Ekrana Ekle Banner */}
        {showInstallPrompt && (
          <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Smartphone size={24} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Ana Ekrana Ekle</p>
              <p className="text-xs text-blue-200">Daha hızlı erişim için uygulamayı yükle</p>
            </div>
            <button
              onClick={handleInstall}
              className="px-4 py-2 bg-white text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-50 transition flex-shrink-0"
            >
              Yükle
            </button>
          </div>
        )}

        {/* Ödeme sonrası adım */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <p className="font-semibold flex items-center gap-2 text-slate-300">
            <CreditCard size={18} className="text-blue-400" />
            Ödeme Sonrasında
          </p>
          <div className="space-y-2 text-sm text-slate-400">
            {isCreditCardType ? (
              <>
                <p>1. Kart bilgilerinizi yukarıya girin.</p>
                <p>2. "Güvenli Öde" butonuna tıklayarak ödemeyi yapın.</p>
                <p>3. Ödeme onaylandığında e-biletiniz anında mail ile gönderilir.</p>
              </>
            ) : (
              <>
                <p>1. Yukarıdaki IBAN'a transfer yapın.</p>
                <p>2. Açıklama alanına referans kodunu yazın.</p>
                <p>3. Sistem otomatik olarak ödemenizi doğrular.</p>
                <p>4. Biletiniz e-posta adresinize gönderilir.</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MobilePaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
        <p>Bilet ödeme detayları yükleniyor...</p>
      </div>
    }>
      <MobilePaymentContent />
    </Suspense>
  );
}
