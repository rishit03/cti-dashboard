
# 🛡️ Cyber Threat Intelligence Dashboard

A full-stack web application that fetches and visualizes real-time threat indicators from multiple public CTI sources. Built for the AppSec Intern Assessment at Asquare Ideas.

---

## 🚀 Features

- ✅ Fetches CTI data from:
  - **AbuseIPDB** — blacklisted IPs with confidence scores
  - **OTX (AlienVault)** — indicators from subscribed pulses
  - **VirusTotal** — IP threat intelligence from reputation scores
  - **GreyNoise** — classification of internet background noise
  - **MalwareBazaar** — malware hashes and tags with inferred severity
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
- ✅ Built-in refresh + auto-refresh (30s) toggle in Last Updated card
- ✅ Expandable row table:
  - Compact view shows Indicator, Severity, Source
  - Clicking on an Indicator reveals Type, Categories, Reported At
- ✅ Dark & light mode toggle with sun/moon icon
- ✅ Tooltip-enabled UI with clean spacing and mobile support
- ✅ No user login or database required

---

## 🧰 Tech Stack

- **Frontend**: HTML, CSS, Bootstrap 5, Chart.js, CountUp.js
- **Backend**: Python, FastAPI, HTTPX
- **APIs Used**:
  - [AbuseIPDB](https://www.abuseipdb.com/)
  - [AlienVault OTX](https://otx.alienvault.com/)
  - [VirusTotal](https://www.virustotal.com/)
  - [GreyNoise](https://www.greynoise.io/)
  - [MalwareBazaar](https://bazaar.abuse.ch/)

---

## 📦 Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/cti-dashboard.git
cd cti-dashboard
```

### 2. Add API keys to `.env`

Use the `.env.example` template and add the following:

```
ABUSEIPDB_API_KEY=your_abuseipdb_key
OTX_API_KEY=your_otx_key
VIRUSTOTAL_API_KEY=your_virustotal_key
GREYNOISE_API_KEY=your_greynoise_key
```

### 3. Install dependencies and start the backend

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

API available at:  
`http://localhost:8000/cti-data`

### 4. Open the frontend

Just open `index.html` in a browser.

---

## 📝 Notes

- **MalwareBazaar** entries use tag and signature heuristics to assign severity.
- Clicking an indicator row expands to show hidden details.
- The layout is mobile-friendly and supports light/dark themes.
- You can manually refresh or enable auto-refresh in the stats card.
- VirusTotal and OTX may return limited results based on API tier/subscription.

---

## Author

**Rishit Goel**  
May 2025 | AppSec Intern Assessment
