# 🛡️ Cyber Threat Intelligence Dashboard

A full-stack web application that fetches and visualizes real-time threat indicators from multiple public CTI sources. Built for the AppSec Intern Assessment at Asquare Ideas.

---

## 🚀 Features

- ✅ Fetches CTI data from:
  - **AbuseIPDB** — blacklisted IPs with confidence scores
  - **OTX (AlienVault)** — indicators from subscribed pulses
  - **VirusTotal** — IP threat intelligence from reputation scores
- ✅ Normalizes all data into a unified structure
- ✅ Supports filtering by severity and source
- ✅ Visualizes data with:
  - 🥧 Pie chart (threats by source)
  - 📊 Bar chart (indicators by severity)
- ✅ Animated quick stats cards:
  - Total indicators
  - High severity
  - Unique sources
  - Last updated time
- ✅ Modern, responsive frontend with tooltips and hover effects
- ✅ No user login or database required

---

## 🧰 Tech Stack

- **Frontend**: HTML, CSS, Bootstrap 5, Chart.js, CountUp.js
- **Backend**: Python, FastAPI, HTTPX
- **APIs Used**:
  - [AbuseIPDB](https://www.abuseipdb.com/)
  - [AlienVault OTX](https://otx.alienvault.com/)
  - [VirusTotal](https://www.virustotal.com/)

---

## 📦 Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/cti-dashboard.git
cd cti-dashboard
```

### 2. Add API keys to `.env` (inside `/backend` folder)

**Important:** Do not commit your real `.env` file. Instead, use the provided `.env.example` as a template.

**On Render:**
- You must manually add the same variables to the *Environment Variables* section in your Render web service settings.

**Locally:**
- Copy `.env.example` to `.env`
- Paste your actual keys into `.env`


Create a file named `.env` and paste in your API keys:

```
ABUSEIPDB_API_KEY=your_abuseipdb_key
OTX_API_KEY=your_otx_key
VIRUSTOTAL_API_KEY=your_virustotal_key
```

### 3. Install dependencies and start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

By default, the API will be available at `http://localhost:8000/cti-data`.

### 4. Open the frontend

Simply open `index.html` in a browser (Chrome/Edge recommended).

Make sure the backend is running.

---

## 📝 Notes

- The **VirusTotal** integration uses a small hardcoded list of test IPs.
- The **OTX** section only returns data if you're subscribed to pulses.
- **AbuseIPDB** is limited to 1000 requests/day on the free tier.
- No login, user auth, or persistent database is required or included.
- Layout is responsive and adjusts across devices.

---

## Author

**Rishit Goel**  
May 2025 | AppSec Intern Assessment
