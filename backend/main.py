from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ABUSEIPDB_API_KEY = os.getenv("ABUSEIPDB_API_KEY")
OTX_API_KEY = os.getenv("OTX_API_KEY")
VT_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")

@app.get("/cti-data")
async def get_cti_data(severity: str = Query(None), source: str = Query(None)):
    normalized = []

    # === AbuseIPDB ===
    if not source or source == "AbuseIPDB":
        headers = {
            "Key": ABUSEIPDB_API_KEY,
            "Accept": "application/json"
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            abuseipdb_response = await client.get(
                "https://api.abuseipdb.com/api/v2/blacklist",
                params={"confidenceMinimum": 25},
                headers=headers
            )
        abuse_data = abuseipdb_response.json()
        for item in abuse_data.get("data", []):
            severity_level = "High" if item.get("abuseConfidenceScore", 0) > 75 else "Medium"
            entry = {
                "indicator": item.get("ipAddress"),
                "type": "IP",
                "source": "AbuseIPDB",
                "severity": severity_level,
                "categories": ["Blacklisted"],
                "reported_at": "N/A"
            }
            if severity and entry["severity"] != severity:
                continue
            normalized.append(entry)

    # === OTX (Improved severity) ===
    if not source or source == "OTX":
        headers = {
            "X-OTX-API-KEY": OTX_API_KEY
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                otx_response = await client.get(
                    "https://otx.alienvault.com/api/v1/pulses/subscribed",
                    headers=headers
                )
            if otx_response.status_code == 200:
                results = otx_response.json().get("results", [])
                for pulse in results[:10]:
                    pulse_name = pulse.get("name", "").lower()
                    for indicator in pulse.get("indicators", []):
                        indicator_type = indicator.get("type", "").lower()

                        # Inferred severity
                        if "apt" in pulse_name or "ransomware" in pulse_name:
                            severity_level = "High"
                        elif indicator_type in ["ipv4", "domain"]:
                            severity_level = "Medium"
                        else:
                            severity_level = "Low"

                        entry = {
                            "indicator": indicator.get("indicator"),
                            "type": indicator.get("type"),
                            "source": "OTX",
                            "severity": severity_level,
                            "categories": [pulse.get("name", "OTX Pulse")],
                            "reported_at": pulse.get("modified")
                        }
                        if severity and entry["severity"] != severity:
                            continue
                        normalized.append(entry)
        except Exception as e:
            print(f"[ERROR] OTX request failed: {e}")

    # === VirusTotal (lowered thresholds) ===
    if not source or source == "VirusTotal":
        headers = {
            "x-apikey": VT_API_KEY
        }
        sample_ips = ["185.232.67.76", "8.8.8.8", "1.1.1.1"]  # Replace 8.8.8.8 with a real malicious IP for better testing

        async with httpx.AsyncClient(timeout=20.0) as client:
            for ip in sample_ips:
                try:
                    vt_response = await client.get(
                        f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
                        headers=headers
                    )
                    if vt_response.status_code == 200:
                        result = vt_response.json().get("data", {})
                        stats = result.get("attributes", {}).get("last_analysis_stats", {})
                        categories = result.get("attributes", {}).get("tags", []) or []

                        detections = stats.get("malicious", 0) + stats.get("suspicious", 0)

                        # Lowered thresholds
                        if detections >= 5:
                            severity_level = "High"
                        elif detections >= 1:
                            severity_level = "Medium"
                        else:
                            severity_level = "Low"

                        entry = {
                            "indicator": ip,
                            "type": "IP",
                            "source": "VirusTotal",
                            "severity": severity_level,
                            "categories": categories or ["Unknown"],
                            "reported_at": result.get("attributes", {}).get("last_analysis_date", "N/A")
                        }

                        if isinstance(entry["reported_at"], int):
                            entry["reported_at"] = datetime.utcfromtimestamp(entry["reported_at"]).isoformat() + "Z"

                        if severity and entry["severity"] != severity:
                            continue
                        normalized.append(entry)
                except Exception as e:
                    print(f"[ERROR] VT IP {ip} failed: {e}")

    return {"data": normalized}
