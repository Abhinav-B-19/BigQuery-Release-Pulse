# BigQuery Release Pulse 🚀

**BigQuery Release Pulse** is a premium, real-time release notes tracker and dashboard built for Google Cloud BigQuery. It fetches official BigQuery release feeds, parses daily logs into granular update cards, and lets you search, filter, and share updates on X (formerly Twitter) instantly.

## 🌟 Features

* **Granular Feed Parsing**: Daily release entries containing multiple notes are split into clean, individual cards categorized by type (Features, Changes, Deprecations, Bug Fixes).
* **Modern Glassmorphic UI**: Beautiful, premium dark-mode interface with neon accents, custom gradients, and micro-animations.
* **Interactive Stats Dashboard**: At-a-glance counters showcasing the volume of different update types with load animations.
* **Live Search & Filter**: Instantly search updates by keywords, dates, or types. Use filter pills to narrow down notes.
* **Tweet to X Integration**: Compose custom tweets inside a character-validated modal overlay and post them directly to X.
* **Smart Local Caching**: An in-memory cache duration of 10 minutes ensures lighting-fast page loads.
* **Manual Refresh Option**: Sync the latest notes on-demand with a beautiful loading animation.

---

## 🛠️ Built With

* **Backend**: Python, Flask, Feedparser (for XML RSS parsing), Requests
* **Frontend**: HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Grid), Vanilla JavaScript (ES6+), Font Awesome (Icons), Google Fonts (Plus Jakarta Sans, Fira Code)

---

## 🚀 Getting Started

### 📋 Prerequisites

Ensure you have Python 3.8+ installed on your system.

### 🔧 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Abhinav-B-19/BigQuery-Release-Pulse.git
   cd BigQuery-Release-Pulse
   ```

2. **Install dependencies**:
   ```bash
   pip install flask requests feedparser
   ```

3. **Start the development server**:
   ```bash
   python app.py
   ```

4. **Open in browser**:
   Navigate to `http://127.0.0.1:5000` in your web browser.

---

## 📂 Project Structure

```text
├── app.py                  # Flask web server and caching logic
├── templates/
│   └── index.html          # HTML dashboard structure
├── static/
│   ├── style.css           # Responsive glassmorphism theme stylesheet
│   └── script.js           # Client-side dynamic parser and events controller
├── .gitignore              # Files to ignore in git control
└── README.md               # Project documentation
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
