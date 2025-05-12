
# 🛡️ CTI Dashboard

This is a Cyber Threat Intelligence dashboard developed as part of the AppSec Intern Assignment for Asquare Ideas.

---

## 📦 Setup Instructions

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/cti-dashboard.git
cd cti-dashboard
```

2. **Set up your environment**:
- Create a `.env` file with the following keys:
```
ABUSEIPDB_API_KEY=your_key
OTX_API_KEY=your_key
VIRUSTOTAL_API_KEY=your_key
```

3. **Install backend dependencies and run the FastAPI server**:
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

4. **Open the frontend**:
Open `index.html` in your browser. Ensure the backend is running at `http://localhost:8000`.

---

## 🌐 CTI Sources Used

- [AbuseIPDB](https://www.abuseipdb.com/)
- [AlienVault OTX](https://otx.alienvault.com/)
- [VirusTotal](https://www.virustotal.com/)
- [MalwareBazaar](https://bazaar.abuse.ch/)

---

## ⚙️ Implementation Highlights

- **Data normalization**: All CTI sources are normalized into a unified schema
- **Frontend**: Built with HTML, Bootstrap 5, JavaScript, Chart.js, CountUp.js
- **Filtering**: Supports filtering by severity and source
- **Search**: Live search across indicators (IP, hash)
- **Pagination**: 25 results per page with jump-to-page input and keyboard navigation
- **Auto-refresh**: Toggleable auto-refresh every 30 seconds
- **Theme toggle**: Fully responsive dark/light mode
- **Visualization**: Pie and bar charts for source and severity breakdown
- **VirusTotal Lookup**: Real-time IP lookup with JSON viewer, severity badge, VT link, and copy-to-clipboard
- **Error handling**: Source failures are reported via Bootstrap toast notifications

---

## ✅ Deliverables

- ✅ Working application (local + GitHub Pages frontend)
- ✅ GitHub repository with all code and documentation
- ✅ README (this file)
