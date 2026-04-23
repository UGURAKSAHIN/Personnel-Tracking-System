# 🚀 Personnel Tracking System Pro

A modern, offline-first personnel management dashboard designed for **small teams, agencies, and freelancers**.


## ✨ Why This Product?

Managing personnel with spreadsheets can quickly become messy and inefficient.

**Personnel Tracking System Pro** gives you a clean, fast, and fully offline solution to:

* Organize departments and statuses
* Export and backup data anytime


## 🔥 Key Features

* 🧑‍💼 Personnel management (department, status, salary, notes)
* 🔍 Search, filter, and sorting system
* 📊 Clean and modern dashboard UI
* 💾 JSON backup & restore support
* 📁 Filtered CSV export
* 📦 Ready-to-use demo dataset
* 📱 Progressive Web App (PWA) support
* ⚡ Fully offline (no server required)


## 🖥️ Live Demo

https://uguraksahin.github.io/Personnel-Tracking-System/


## 📦 Project Structure

```
.
├── index.html          # Main application
├── style.css           # UI styling
├── app.js              # Core logic & state management
├── sw.js               # Service worker (offline support)
├── site.webmanifest    # PWA config
├── icons/              # App icons
├── dist/               # Build outputs
```


## ⚡ Quick Start

1. Download or clone the repository
2. Install nothing extra if you only want the static demo
3. Open `index.html` in your browser
4. Load demo data from the UI
5. Start managing your personnel

## Backend Mode

This repo now includes a lightweight Node backend so the same UI can:

* persist personnel data on the server
* create Stripe Checkout Sessions with your secret key kept off the client
* serve the frontend and API together from `http://localhost:8080`

Start the full app:

```bash
npm start
```

Run the automated smoke tests:

```bash
npm run test
```

Configuration lives in `application.properties`:

```properties
server.port=8080
stripe.secret.key=${STRIPE_SECRET_KEY}
app.base-url=http://localhost:8080
```


## 🛠️ Build & Packaging

Run project checks:

```bash
npm run check
```

Build distributable package:

```bash
npm run build:package
```

👉 Output:

```
dist/package/
```

The package bundle now includes the backend runtime (`server.js`), checkout configuration (`application.properties`), Stripe setup notes, and the smoke tests.



## 🌐 Deployment (GitHub Pages)

Prepare deployable version:

```bash
npm run build:pages
```

Then:

1. Push repository to GitHub
2. Go to Settings → Pages
3. Select **GitHub Actions**
4. Deploy automatically

## 📄 License

MIT License — free to use, modify, and distribute.



## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first.



## ⭐ Support

If you like this project, consider giving it a star ⭐



## 👨‍💻 Author

Developed by Uğur Akşahin

* GitHub: https://github.com/UGURAKSAHIN
* LinkedIn: https://linkedin.com/in/uguraksahin
