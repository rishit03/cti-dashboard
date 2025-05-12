
# 🛡️ Cyber Threat Intelligence Dashboard

A CTI web application that fetches and visualizes threat indicators from public sources.

---

## 📦 Setup Instructions

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/cti-dashboard.git
cd cti-dashboard
```

2. **Create `.env` file with your API keys:**

```
ABUSEIPDB_API_KEY=your_abuseipdb_key
OTX_API_KEY=your_otx_key
VIRUSTOTAL_API_KEY=your_virustotal_key
```

3. **Install dependencies and start backend:**

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

4. **Open `index.html` in your browser** and make sure the backend is running.

---

## 🔗 CTI Sources Used

- [AbuseIPDB](https://www.abuseipdb.com/)
- [AlienVault OTX](https://otx.alienvault.com/)
- [VirusTotal](https://www.virustotal.com/)
- [MalwareBazaar](https://bazaar.abuse.ch/)

---

## ⚙️ Implementation Notes

- Backend uses **FastAPI** with **HTTPX** for async API calls
- CTI data is normalized across sources
- Frontend uses **Bootstrap 5**, **Chart.js**, and **CountUp.js**
- Table supports:
  - Pagination (25 rows per page)
  - Expandable details
  - Search by indicator
  - Jump-to-page input
  - Auto-refresh toggle
- Added real-time **VirusTotal IP lookup** via a backend `/vt-lookup` endpoint
