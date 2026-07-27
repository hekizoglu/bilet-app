"use client";

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Ticket, Sparkles, UserCheck, ShieldCheck, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const LOCAL_AUTH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_LOCAL_AUTH !== 'false';

  const storeToken = (token: string) => {
    const secureAttribute = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `token=${token}; path=/; max-age=43200; SameSite=Strict${secureAttribute}`;
  };

  const handleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError('Giriş bilgisi alınamadı.');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });

      const data = await res.json();

      if (res.ok) {
        storeToken(data.token);
        if (data.user?.role === 'ADMIN' || data.user?.role === 'ORGANIZER') {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
      } else {
        setError(`Giriş yapılamadı: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sunucuya bağlanılamadı.';
      setError(`Bağlantı hatası: ${message}`);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 overflow-hidden font-sans">
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -40, 30, 0] }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "mirror" }}
        className="absolute top-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, 50, -40, 0] }}
        transition={{ duration: 12, repeat: Infinity, repeatType: "mirror" }}
        className="absolute bottom-1/4 right-1/4 h-[350px] w-[350px] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none"
      />

      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
        className="relative z-10 w-full max-w-md p-8 bg-slate-900/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800/80 mx-4"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-t-3xl opacity-75" />

        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 150 }}
            className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl mb-4 text-blue-400 shadow-inner"
          >
            <Ticket size={32} className="stroke-[1.5]" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2"
          >
            Bilet Sistemi <Sparkles size={18} className="text-blue-400 animate-pulse" />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-slate-400 mt-2 text-sm"
          >
            Devam etmek için giriş yapın
          </motion.p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-amber-950/40 text-amber-300 rounded-xl text-xs border border-amber-500/30 text-center break-words backdrop-blur-sm"
          >
            {error}
          </motion.div>
        )}

        {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID" ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center mb-6"
          >
            <div className="w-full flex justify-center hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200">
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <GoogleLogin
                  onSuccess={handleSuccess}
                  onError={() => setError("Google giriş penceresi tamamlanamadı. Lütfen tekrar deneyin.")}
                  theme="filled_blue"
                  shape="pill"
                  size="large"
                />
              </GoogleOAuthProvider>
            </div>
          </motion.div>
        ) : null}

        {LOCAL_AUTH_ENABLED && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="space-y-3"
          >
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-4 text-xs text-slate-500 font-medium">Hızlı Giriş Seçenekleri</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSuccess({ credential: "LOCAL_ADMIN_TOKEN" })}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-2xl text-sm transition-all border border-blue-400/20 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <ShieldCheck size={18} />
              Yönetici (Admin) Girişi
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSuccess({ credential: "LOCAL_ORGANIZER_TOKEN" })}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-2xl text-sm transition-all border border-indigo-400/20 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <UserCheck size={18} />
              Organizatör Girişi
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSuccess({ credential: "LOCAL_CUSTOMER_TOKEN" })}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-2xl text-sm transition-all border border-slate-700/50 flex items-center justify-center gap-2"
            >
              <User size={18} />
              Kullanıcı (Müşteri) Girişi
            </motion.button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
