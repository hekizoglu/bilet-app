"use client";

import { useState, useRef, useEffect } from "react";
import { QrCode, Copy, CheckCircle, Smartphone, CreditCard, ArrowLeft, Share2, Wallet } from "lucide-react";

// Phase 13.8 — Mobil Ödeme Ekranı
// Özellikler: QR ile IBAN gösterimi, One-Tap kopyalama, Mobil-first tasarım

export default function MobilePaymentPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"iban" | "qr">("iban");
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const deferredPromptRef = useRef<any>(null);

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

  // Paylaşım API — Mobil için native share sheet
  const sharePaymentInfo = async () => {
    const text = `💳 Ödeme Bilgileri\nIBAN: TR33 0006 2000 1000 0006 2978 02\nAlıcı: Bilet Organizasyon A.Ş.\nAçıklama: PAYMENT-2026-06-29-001-ABC123`;
    if (navigator.share) {
      await navigator.share({ title: "Ödeme Bilgileri", text });
    } else {
      copyToClipboard(text, "share");
    }
  };

  const ibanNumber = "TR33 0006 2000 1000 0006 2978 02";
  const recipient = "Bilet Organizasyon A.Ş.";
  const reference = "PAYMENT-2026-06-29-001-ABC123";
  const amount = "350,00 TL";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
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
          <p className="text-xs text-slate-400">Havale / EFT ile öde</p>
        </div>
        <div className="ml-auto">
          <button
            onClick={sharePaymentInfo}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Ana içerik */}
      <div className="px-4 pb-10 pt-6 space-y-5 max-w-md mx-auto">

        {/* Tutar kartı */}
        <div className="bg-blue-600 rounded-3xl p-6 text-center shadow-2xl shadow-blue-900/50">
          <p className="text-sm text-blue-200 mb-1">Ödenecek Tutar</p>
          <p className="text-5xl font-black tracking-tight">{amount}</p>
          <p className="text-sm text-blue-200 mt-2">Yaz Konseri 2026 · Koltuk A12</p>
        </div>

        {/* Tab geçiş */}
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

        {/* IBAN Ekranı */}
        {paymentMethod === "iban" && (
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
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/50"
            >
              <Share2 size={18} />
              Tüm Bilgileri Paylaş / Kopyala
            </button>
          </div>
        )}

        {/* QR Kod Ekranı */}
        {paymentMethod === "qr" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4">
              {/* QR placeholder — gerçek uygulamada qrcode kütüphanesi ile üretilir */}
              <div className="w-48 h-48 bg-slate-800 rounded-2xl flex items-center justify-center">
                <QrCode size={80} className="text-white" />
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
            <p>1. Yukarıdaki IBAN'a transfer yapın.</p>
            <p>2. Açıklama alanına referans kodunu yazın.</p>
            <p>3. Sistem otomatik olarak ödemenizi doğrular.</p>
            <p>4. Biletiniz e-posta adresinize gönderilir.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
