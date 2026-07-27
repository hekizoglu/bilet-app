"use client";

import { useState, useEffect } from 'react';
import { Calendar, Users, MapIcon, DollarSign, ArrowRight, Loader2, Award, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, Variants } from 'motion/react';

// Animation configurations
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 15 
    } 
  }
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const fetchStats = async () => {
    try {
      const token = getCookie('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Dashboard stats fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-slate-500 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-sm font-medium">İstatistikler Yükleniyor...</span>
      </div>
    );
  }

  const defaultStats = stats || {
    eventsCount: 0,
    hallsCount: 0,
    pendingReservations: 0,
    totalEarnings: 0
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-2 font-sans">
      
      {/* Title block */}
      <div className="flex justify-between items-center">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight"
        >
          <Award className="text-blue-600 stroke-[2]" size={36} />
          Yönetim Paneli
        </motion.h1>
      </div>

      {/* Stats Cards Grid with Staggered Animations */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {/* Card 1: Revenue */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5, scale: 1.02 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300">
            <DollarSign size={90} className="text-green-600" />
          </div>
          <h3 className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-1">Toplam Ciro (Onaylı)</h3>
          <p className="text-3xl font-black text-slate-900 mt-2">{defaultStats.totalEarnings.toLocaleString('tr-TR')} ₺</p>
          <div className="mt-4 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md inline-flex items-center gap-1">
            <span>Banka EFT/Havale & Kredi Kartı</span>
          </div>
        </motion.div>

        {/* Card 2: Pending Approvals */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5, scale: 1.02 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden group"
        >
          <Link href="/dashboard/reservations" className="block h-full w-full">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300">
              <Users size={90} className="text-orange-500" />
            </div>
            <h3 className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-1">Bekleyen Rezervasyonlar</h3>
            <p className={`text-3xl font-black mt-2 ${defaultStats.pendingReservations > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
              {defaultStats.pendingReservations}
            </p>
            <div className="mt-4 text-[11px] font-bold text-orange-700 bg-orange-50 px-2 py-1 rounded-md inline-flex items-center gap-1 hover:underline">
              <span>Rezervasyonları Kontrol Et</span>
              <ArrowRight size={12} />
            </div>
          </Link>
        </motion.div>

        {/* Card 3: Events */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5, scale: 1.02 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden group"
        >
          <Link href="/dashboard/events" className="block h-full w-full">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300">
              <Calendar size={90} className="text-blue-600" />
            </div>
            <h3 className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-1">Aktif Etkinlikler</h3>
            <p className="text-3xl font-black text-slate-900 mt-2">{defaultStats.eventsCount}</p>
            <div className="mt-4 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md inline-flex items-center gap-1 hover:underline">
              <span>Etkinlik Yönetimi</span>
              <ArrowRight size={12} />
            </div>
          </Link>
        </motion.div>

        {/* Card 4: Halls */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -5, scale: 1.02 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all relative overflow-hidden group"
        >
          <Link href="/dashboard/halls" className="block h-full w-full">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 group-hover:scale-110 transition-all duration-300">
              <MapIcon size={90} className="text-indigo-600" />
            </div>
            <h3 className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-1">Kayıtlı Salonlar</h3>
            <p className="text-3xl font-black text-slate-900 mt-2">{defaultStats.hallsCount}</p>
            <div className="mt-4 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md inline-flex items-center gap-1 hover:underline">
              <span>Salon Tasarımcısı</span>
              <ArrowRight size={12} />
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Welcome banner */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 80 }}
        className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-8 text-white border border-blue-400/20 shadow-md relative overflow-hidden group"
      >
        {/* Decorative circle glow */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
        
        <h2 className="text-2xl font-black mb-3 flex items-center gap-2">
          👋 Hoş Geldiniz! <Sparkles size={20} className="text-blue-200 animate-pulse" />
        </h2>
        <p className="text-blue-100/90 text-sm max-w-3xl leading-relaxed font-medium">
          Bilet ve Rezervasyon yönetim sistemine hoş geldiniz. Sol taraftaki navigasyonu kullanarak 
          yeni etkinlikler oluşturabilir, salon çizimlerini hazırlayabilir, ödeme bildirimlerini 
          onaylayabilir veya gelen biletlerin kapı giriş kontrolünü (Check-in) yapabilirsiniz.
        </p>
      </motion.div>
    </div>
  );
}
