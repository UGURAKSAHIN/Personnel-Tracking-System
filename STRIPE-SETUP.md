# Stripe Checkout Setup

Bu repoda artik Stripe secret key tarayiciya acilmadan backend uzerinden Checkout Session olusturuluyor.

## Gerekli adimlar

1. Proje kokundeki `.env` veya `.env.local` dosyasina `STRIPE_SECRET_KEY=sk_test_...` ya da `STRIPE_SECRET_KEY=sk_live_...` yaz. Istersen ayni degeri isletim sistemi ortam degiskeni olarak da verebilirsin.
2. `app.base-url` degerini uygulamayi acacagin adresle ayni tut.
3. Sunucuyu `npm start` ile baslat.
4. Tarayicida `http://localhost:8080` adresini acip `Starter` veya `Growth` satin alma akisini test et.

Webhook kullanacaksan ayni dosyaya `STRIPE_WEBHOOK_SECRET=whsec_...` ekleyebilirsin.

## Bu entegrasyon ne yapiyor

- `Starter` ve `Growth` planlari icin backend tarafinda Stripe Checkout Session olusturur.
- `client_reference_id` ve plan bilgisini Stripe metadata olarak gonderir.
- Stripe secret key sadece sunucuda kalir.
- `White Label` akisi Stripe yerine e-posta taslagi hazirlamaya devam eder.

## Notlar

- Backend calismiyorsa on yuz hala local demo olarak kullanilabilir.
- Istersen daha sonra webhook ve siparis otomasyonu da ayni sunucuya eklenebilir.
