from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os
import traceback
from dotenv import load_dotenv
from datetime import datetime
import ipaddress

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
    errors = []

    # === AbuseIPDB ===
    if not source or source == "AbuseIPDB":
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    "https://api.abuseipdb.com/api/v2/blacklist",
                    params={"confidenceMinimum": 25},
                    headers={
                        "Key": ABUSEIPDB_API_KEY,
                        "Accept": "application/json"
                    }
                )
            if response.status_code == 429:
                print("[ERROR] AbuseIPDB rate limit reached")
                errors.append("AbuseIPDB")
            elif response.status_code != 200:
                print(f"[ERROR] AbuseIPDB returned {response.status_code}")
                errors.append("AbuseIPDB")
            else:
                data = response.json()
                for item in data.get("data", []):
                    entry = {
                        "indicator": item.get("ipAddress"),
                        "type": "IP",
                        "source": "AbuseIPDB",
                        "severity": "High" if item.get("abuseConfidenceScore", 0) > 75 else "Medium",
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
        headers = {"X-OTX-API-KEY": OTX_API_KEY}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    "https://otx.alienvault.com/api/v1/pulses/subscribed",
                    headers=headers
                )
            if response.status_code != 200:
                print(f"[ERROR] OTX returned {response.status_code}")
                errors.append("OTX")
            else:
                results = response.json().get("results", [])
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
        headers = {"x-apikey": VT_API_KEY}
        sample_ips = ["185.232.67.76", "8.8.8.8", "1.1.1.1"]
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                for ip in sample_ips:
                    response = await client.get(
                        f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
                        headers=headers
                    )
                    if response.status_code != 200:
                        print(f"[ERROR] VirusTotal IP {ip} returned {response.status_code}")
                        errors.append("VirusTotal")
                        continue

                    result = response.json().get("data", {})
                    stats = result.get("attributes", {}).get("last_analysis_stats", {})
                    categories = result.get("attributes", {}).get("tags", []) or []

                    detections = stats.get("malicious", 0) + stats.get("suspicious", 0)
                    severity_level = (
                        "High" if detections >= 5 else
                        "Medium" if detections >= 1 else
                        "Low"
                    )

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

    # === MalwareBazaar ===
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

                    if response.status_code != 200:
                        print(f"[ERROR] MalwareBazaar tag {tag} returned {response.status_code}")
                        errors.append("MalwareBazaar")
                        continue

                    results = response.json().get("data", [])
                    for item in results[:7]:
                        tag_list = item.get("tags", []) or []
                        signature = (item.get("signature") or "").lower()

                        severity_level = (
                            "High" if "ransomware" in tag_list or "ransom" in signature else
                            "Medium" if "stealer" in tag_list or "trojan" in signature else
                            "Low"
                        )

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

# === VirusTotal Real-Time IP Lookup Endpoint ===

def is_valid_ip(ip: str) -> bool:
    try:
        ip_obj = ipaddress.ip_address(ip)
        return not ip_obj.is_private
    except ValueError:
        return False

@app.get("/vt-lookup")
async def vt_lookup(ip: str):
    if not ip:
        raise HTTPException(status_code=400, detail="Missing IP address")
    if not is_valid_ip(ip):
        raise HTTPException(status_code=400, detail="Invalid IP format")

    headers = { "x-apikey": VT_API_KEY }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(f"https://www.virustotal.com/api/v3/ip_addresses/{ip}", headers=headers)

        if response.status_code != 200:
            return { "error": f"VirusTotal returned {response.status_code}" }

        data = response.json().get("data", {})
        attr = data.get("attributes", {})

        return {
            "malicious": attr.get("last_analysis_stats", {}).get("malicious", 0),
            "suspicious": attr.get("last_analysis_stats", {}).get("suspicious", 0),
            "tags": attr.get("tags", []) or ["Unknown"],
            "last_analysis": datetime.utcfromtimestamp(attr.get("last_analysis_date", 0)).isoformat()
            if attr.get("last_analysis_date") else "N/A"
        }

    except Exception as e:
        print("[ERROR] VT lookup failed:", e)
        return { "error": "Request failed or timed out." }
