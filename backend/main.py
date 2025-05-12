from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import traceback
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
GREYNOISE_API_KEY = os.getenv("GREYNOISE_API_KEY")

@app.get("/cti-data")
async def get_cti_data(severity: str = Query(None), source: str = Query(None)):
    normalized = []
    errors = []

    # === AbuseIPDB ===
    if not source or source == "AbuseIPDB":
        headers = {
            "Key": ABUSEIPDB_API_KEY,
            "Accept": "application/json"
        }
        try:
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
        except Exception:
            print("[ERROR] AbuseIPDB request failed:")
            traceback.print_exc()
            errors.append("AbuseIPDB")

    # === OTX ===
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
                        if "ransomware" in pulse_name or "apt" in pulse_name:
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
        except Exception:
            print("[ERROR] OTX request failed:")
            traceback.print_exc()
            errors.append("OTX")

    # === VirusTotal ===
    if not source or source == "VirusTotal":
        headers = {
            "x-apikey": VT_API_KEY
        }
        sample_ips = ["185.232.67.76", "8.8.8.8", "1.1.1.1"]

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                for ip in sample_ips:
                    vt_response = await client.get(
                        f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
                        headers=headers
                    )
                    if vt_response.status_code == 200:
                        result = vt_response.json().get("data", {})
                        stats = result.get("attributes", {}).get("last_analysis_stats", {})
                        categories = result.get("attributes", {}).get("tags", []) or []

                        detections = stats.get("malicious", 0) + stats.get("suspicious", 0)
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
        except Exception:
            print("[ERROR] VirusTotal request failed:")
            traceback.print_exc()
            errors.append("VirusTotal")

    # === GreyNoise ===
    if not source or source == "GreyNoise":
        headers = {
            "key": GREYNOISE_API_KEY
        }
        sample_ips = [
            "185.220.101.4", "104.244.72.115", "195.54.160.149",
            "185.156.73.62", "64.227.79.24"
        ]

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                for ip in sample_ips:
                    gn_response = await client.get(
                        f"https://api.greynoise.io/v3/community/{ip}",
                        headers=headers
                    )
                    if gn_response.status_code == 200:
                        result = gn_response.json()
                        classification = result.get("classification", "unknown")

                        if classification == "malicious":
                            severity_level = "High"
                        elif classification == "unknown":
                            severity_level = "Medium"
                        else:
                            severity_level = "Low"

                        entry = {
                            "indicator": ip,
                            "type": "IP",
                            "source": "GreyNoise",
                            "severity": severity_level,
                            "categories": [result.get("name", "Unknown")],
                            "reported_at": "N/A"
                        }

                        if severity and entry["severity"] != severity:
                            continue
                        normalized.append(entry)
        except Exception:
            print("[ERROR] GreyNoise request failed:")
            traceback.print_exc()
            errors.append("GreyNoise")

    # === MalwareBazaar (Multi-tag with severity & signature)
    if not source or source == "MalwareBazaar":
        tags = ["exe", "stealer", "ransomware"]
        try:
            async with httpx.AsyncClient(timeout=40.0) as client:
                for tag in tags:
                    response = await client.post(
                        "https://mb-api.abuse.ch/api/v1/",
                        headers={"Content-Type": "application/x-www-form-urlencoded"},
                        data={"query": "get_taginfo", "tag": tag}
                    )
                    if response.status_code == 200:
                        results = response.json().get("data", [])
                        for item in results[:7]:
                            tag_list = item.get("tags", []) or []
                            signature = (item.get("signature") or "").lower()

                            if "ransomware" in tag_list or "ransom" in signature:
                                severity_level = "High"
                            elif "stealer" in tag_list or "trojan" in signature:
                                severity_level = "Medium"
                            else:
                                severity_level = "Low"

                            entry = {
                                "indicator": item.get("sha256_hash"),
                                "type": "Hash",
                                "source": "MalwareBazaar",
                                "severity": severity_level,
                                "categories": tag_list + [signature] if signature else tag_list,
                                "reported_at": item.get("first_seen", "N/A")
                            }

                            if severity and entry["severity"] != severity:
                                continue
                            normalized.append(entry)
        except Exception:
            print("[ERROR] MalwareBazaar request failed:")
            traceback.print_exc()
            errors.append("MalwareBazaar")

    return { "data": normalized, "errors": errors }
