"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicNavbar from '@/components/PublicNavbar';
import StepEventType from '@/components/EventWizard/StepEventType';
import StepBasicInfo, { BasicInfoData } from '@/components/EventWizard/StepBasicInfo';
import StepLayout, { LayoutData } from '@/components/EventWizard/StepLayout';
import StepSummary from '@/components/EventWizard/StepSummary';
import { Check } from 'lucide-react';
import { apiFetch, ApiError, getToken } from '@/lib/api';

export default function CreateEventPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // States
  const [eventType, setEventType] = useState<string>('');
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    visibility: 'PUBLIC',
    price: '0',
    paymentType: 'free'
  });
  const [layout, setLayout] = useState<LayoutData>({
    isSeated: false,
    capacity: 0,
    hallId: null
  });
  const [effectiveCapacity, setEffectiveCapacity] = useState<number>(0);

  const steps = [
    { num: 1, title: 'Tür' },
    { num: 2, title: 'Bilgi' },
    { num: 3, title: 'Düzen' },
    { num: 4, title: 'Özet' }
  ];

  const goToStep = (step: number) => {
    // Sadece tamamlanmış adımlara geri dönülebilir
    if (step < currentStep) setCurrentStep(step);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const token = getToken();
      if (!token) {
        setSubmitError('Giriş yapmanız gerekiyor. Giriş sayfasına yönlendiriliyorsunuz...');
        setTimeout(() => router.push('/login'), 1200);
        return;
      }

      // Yerel saat dilimindeki seçimi UTC'ye doğru çevir (saat kayması hatası düzeltildi)
      const localDate = new Date(`${basicInfo.date}T${basicInfo.startTime}:00`);
      if (isNaN(localDate.getTime())) {
        setSubmitError('Geçersiz tarih/saat seçimi.');
        return;
      }

      const payload = {
        name: basicInfo.name.trim(),
        description: basicInfo.description.trim() || null,
        date: localDate.toISOString(),
        price: Number(basicInfo.price) || 0,
        visibility: basicInfo.visibility,
        // 50 kişi altındaysa anında yayınla; üzerindeyse backend zaten onaya gönderir
        status: effectiveCapacity > 50 ? 'Taslak' : 'Aktif',
        isSeated: layout.isSeated,
        capacity: !layout.isSeated ? layout.capacity : undefined,
        hallId: layout.isSeated ? layout.hallId : undefined,
        paymentType: layout.isSeated ? basicInfo.paymentType : (Number(basicInfo.price) > 0 ? basicInfo.paymentType : 'free'),
      };

      const created = await apiFetch('/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Başarılı: yeni etkinliğe veya profile yönlendir
      router.push(created?.id ? `/event/${created.id}` : '/profile?success=true');
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(err.message);
      } else {
        setSubmitError('Bilinmeyen bir hata oluştu, lütfen tekrar deneyin.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 pt-24">

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 rounded-full z-0"></div>
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            ></div>

            {steps.map((step) => {
              const isActive = step.num === currentStep;
              const isCompleted = step.num < currentStep;

              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => goToStep(step.num)}
                  disabled={!isCompleted}
                  className={`relative z-10 flex flex-col items-center ${isCompleted ? 'cursor-pointer' : 'cursor-default'}`}
                  aria-label={`Adım ${step.num}: ${step.title}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${
                    isActive ? 'bg-blue-600 text-white border-blue-600' :
                    isCompleted ? 'bg-blue-600 text-white border-blue-600' :
                    'bg-white text-gray-400 border-gray-200'
                  }`}>
                    {isCompleted ? <Check size={20} /> : step.num}
                  </div>
                  <span className={`mt-2 text-xs font-semibold ${isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10">
          {currentStep === 1 && (
            <StepEventType
              value={eventType}
              onChange={setEventType}
              onNext={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 2 && (
            <StepBasicInfo
              data={basicInfo}
              onChange={setBasicInfo}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <StepLayout
              data={layout}
              onChange={setLayout}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
              setEffectiveCapacity={setEffectiveCapacity}
            />
          )}
          {currentStep === 4 && (
            <StepSummary
              eventType={eventType}
              basicInfo={basicInfo}
              layout={layout}
              effectiveCapacity={effectiveCapacity}
              onSubmit={handleSubmit}
              onBack={() => setCurrentStep(3)}
              isSubmitting={isSubmitting}
              error={submitError}
            />
          )}
        </div>

      </main>
    </div>
  );
}
