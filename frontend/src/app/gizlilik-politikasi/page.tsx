import React from 'react';

export default function GizlilikPolitikasi() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Gizlilik Politikası</h1>
        <p className="text-sm text-gray-500 mb-8">Son güncellenme tarihi: {new Date().toLocaleDateString('tr-TR')}</p>
        
        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Bilgi Toplama ve Kullanım</h2>
            <p>
              BiletApp olarak, hizmetlerimizi sağlamak ve geliştirmek amacıyla çeşitli türde bilgiler toplamaktayız.
              Kayıt olduğunuzda veya bilet satın aldığınızda, adınız, e-posta adresiniz ve iletişim bilgileriniz
              gibi kişisel verilerinizi toplamaktayız.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Çerezler (Cookies)</h2>
            <p>
              Platformumuz, oturum yönetimi, güvenlik ve analitik amaçlarla çerezler (cookies) kullanmaktadır.
              "Tümünü Kabul Et" seçeneği ile hedefleme ve analiz amaçlı çerezleri onaylamış olursunuz. Sadece "Zorunlu"
              çerezleri seçtiğinizde ise yalnızca sitenin çalışması için temel olan çerezler (oturum vb.) kullanılır.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Veri Güvenliği</h2>
            <p>
              Kişisel verilerinizin güvenliği bizim için önemlidir. Verileriniz, SSL/TLS şifreleme teknolojileri
              kullanılarak iletilmekte ve güvenli sunucularda saklanmaktadır. Kredi kartı gibi ödeme bilgileriniz
              tarafımızca saklanmaz, doğrudan BDDK onaylı ödeme kuruluşlarına iletilir.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Haklarınız</h2>
            <p>
              Kişisel verilerinize erişme, düzeltme, silme veya işlenmesini kısıtlama haklarına sahipsiniz.
              Bu konudaki taleplerinizi bize iletişim kanallarımız üzerinden iletebilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. İletişim</h2>
            <p>
              Bu Gizlilik Politikası hakkında sorularınız varsa, lütfen bizimle destek@biletapp.com adresi
              üzerinden iletişime geçin.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}