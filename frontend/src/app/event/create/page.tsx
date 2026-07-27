"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicNavbar from '@/components/PublicNavbar';
import StepEventType from '@/components/EventWizard/StepEventType';
import StepBasicInfo, { BasicInfoData } from '@/components/EventWizard/StepBasicInfo';
import StepLayout, { LayoutData } from '@/components/EventWizard/StepLayout';
import StepSummary from '@/components/EventWizard/StepSummary';
import { Check } from 'lucide-react';

export default function CreateEventPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States
  const [eventType, setEventType] = useState<string>('');
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    name: '',
    description: '',
    coverImage: '',
    date: '',
    startTime: '',
    endTime: '',
    visibility: 'PUBLIC'
  });
  const [layout, setLayout] = useState<LayoutData>({
    isSeated: false,
    capacity: 0,
    hallId: null
  });

  const steps = [
    { num: 1, title: 'Tür' },
    { num: 2, title: 'Bilgi' },
    { num: 3, title: 'Düzen' },
    { num: 4, title: 'Özet' }
  ];

  // Helper to fetch effective capacity from layout component logic
  // (In a real scenario, StepLayout passes it or we calculate it here. For simplicity we just use the capacity field. If hall, we don't have the exact number here unless we lifted it up, but let's assume it was passed correctly via layout.capacity if we added it, but wait! LayoutData doesn't store calculatedSeatCount.)
  // Actually, we can fetch hall details or simply pass a callback to StepLayout to update effectiveCapacity.
  // To avoid refactoring StepLayout right now, let's keep an effectiveCapacity state in the parent.
  const [effectiveCapacity, setEffectiveCapacity] = useState<number>(0);

  // We will patch StepLayout to pass effectiveCapacity upwards.
  // Wait, let's just make StepLayout update capacity if it's seated!

  const handleNext = () => setCurrentStep(prev => prev + 1);
  const handleBack = () => setCurrentStep(prev => prev - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
      if (!token) {
        alert("Giriş yapmanız gerekiyor.");
        router.push('/login');
        return;
      }

      // We need to send price = 0 for now as wizard doesn't have price field yet
      const payload = {
        name: basicInfo.name,
        description: basicInfo.description,
        date: `${basicInfo.date}T${basicInfo.startTime}:00.000Z`,
        price: 0,
        visibility: basicInfo.visibility,
        isSeated: layout.isSeated,
        capacity: !layout.isSeated ? layout.capacity : undefined,
        hallId: layout.isSeated ? layout.hallId : undefined
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created = await res.json();
        // Redirect to profile or event details
        router.push(`/profile?success=true&eventId=${created.id}`);
      } else {
        const errorData = await res.json();
        alert(`Hata: ${errorData.error}`);
      }
    } catch (error) {
      alert("Sunucuya bağlanılamadı.");
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
                <div key={step.num} className="relative z-10 flex flex-col items-center">
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
                </div>
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
              onNext={handleNext} 
            />
          )}
          {currentStep === 2 && (
            <StepBasicInfo 
              data={basicInfo} 
              onChange={setBasicInfo} 
              onNext={handleNext} 
              onBack={handleBack} 
            />
          )}
          {currentStep === 3 && (
            <StepLayout 
              data={layout} 
              onChange={(data) => {
                setLayout(data);
                // Trick: to avoid refactoring StepLayout heavily right now, we can pass it down or update it via a different callback, but since StepSummary needs effectiveCapacity, we'll fetch halls in StepLayout. 
                // Let's rely on StepSummary getting effectiveCapacity passed down. We need to lift up effectiveCapacity.
              }} 
              onNext={handleNext} 
              onBack={handleBack} 
              // We will pass setEffectiveCapacity down to StepLayout in a moment
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
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

      </main>
    </div>
  );
}
