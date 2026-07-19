"""
maps_backend/main.py
FastAPI micro-service — Real-world traffic data, NO Google API key required.

Data sources (all free, no key):
  • Nominatim  (OSM)   — geocoding & reverse geocoding
  • OSRM               — real routing & travel-time
  • Overpass API (OSM) — road network density, POIs, toll plazas
  • OpenMeteo          — weather (used to modulate traffic estimate)

Run:
    cd maps_backend
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

import os, re, math, asyncio, time, random
from datetime import datetime
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Traffic Maps API — Free Edition", version="2.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NOMINATIM = "https://nominatim.openstreetmap.org"
OSRM      = "https://router.project-osrm.org"
OVERPASS  = "https://overpass-api.de/api/interpreter"
WEATHER   = "https://api.open-meteo.com/v1/forecast"
HEADERS   = {"User-Agent": "AITrafficSystem/2.1 (contact@traffic.ai)"}

# In-memory store for user-reported incidents
_reported_incidents: list = []

# ── Pydantic models ────────────────────────────────────────────────────────────

class GeoResult(BaseModel):
    place_name: str
    lat: float
    lng: float
    formatted_address: str
    place_type: str = ""
    city: str = ""
    state: str = ""
    country: str = ""

class VehicleBreakdown(BaseModel):
    cars: int
    bikes: int
    buses: int
    trucks: int
    autos: int
    emergency: int
    total: int

class TrafficInfo(BaseModel):
    location: GeoResult
    vehicle_count: int
    vehicle_breakdown: VehicleBreakdown
    congestion_level: str        # Low | Medium | High | Very High
    congestion_pct: float        # 0–100
    avg_speed_kmh: float
    traffic_status: str          # Low | Medium | High | Very High
    traffic_color: str
    traffic_description: str
    road_type: str
    nearby_roads: list[str]
    last_updated: str
    is_estimated: bool
    routes: list[dict]
    weather_note: str = ""

class IncidentReport(BaseModel):
    lat: float
    lng: float
    type: str          # accident | jam | roadblock | pothole
    description: str = ""
    reporter: str = "Anonymous"

# ── Helpers ────────────────────────────────────────────────────────────────────

def _congestion_from_speed(speed: float, road_type: str) -> tuple[str, float]:
    limits = {
        "motorway": 100, "trunk": 80, "primary": 60,
        "secondary": 50, "tertiary": 40, "residential": 30,
        "unclassified": 35, "service": 20, "default": 50,
    }
    limit = limits.get(road_type, limits["default"])
    ratio = speed / limit
    pct   = max(0, min(100, (1 - ratio) * 100))
    if pct < 25:
        return "Low", pct
    if pct < 50:
        return "Medium", pct
    if pct < 75:
        return "High", pct
    return "Very High", pct

def _estimate_vehicles(road_density: int, road_type: str, hour: int, congestion_pct: float) -> VehicleBreakdown:
    base = {
        "motorway": 18, "trunk": 14, "primary": 12,
        "secondary": 8, "tertiary": 6, "residential": 3,
        "default": 5,
    }.get(road_type, 5)

    peak_mult = 1.0
    if 7 <= hour <= 10 or 17 <= hour <= 20:
        peak_mult = 1.6
    elif 11 <= hour <= 16:
        peak_mult = 1.2
    elif 21 <= hour <= 23 or 0 <= hour <= 6:
        peak_mult = 0.5

    cong_mult = 1 + (congestion_pct / 100) * 0.8
    total = max(10, int(road_density * base * peak_mult * cong_mult))
    total = min(total, 600)

    return VehicleBreakdown(
        cars      = int(total * 0.40),
        bikes     = int(total * 0.38),
        buses     = int(total * 0.06),
        trucks    = int(total * 0.08),
        autos     = int(total * 0.06),
        emergency = max(1, int(total * 0.02)),
        total     = total,
    )

def _color(level: str) -> str:
    return {"Low": "#22c55e", "Medium": "#f59e0b", "High": "#ef4444", "Very High": "#dc2626"}.get(level, "#6366f1")

def _describe(level: str) -> str:
    return {
        "Low":       "Traffic is flowing smoothly — clear roads.",
        "Medium":    "Moderate traffic — minor delays possible.",
        "High":      "Heavy congestion — significant delays expected.",
        "Very High": "Severe gridlock — avoid this area if possible.",
    }.get(level, "")

def _haversine(lat1, lng1, lat2, lng2) -> float:
    """Returns distance in km between two coordinates."""
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = math.sin(d_lat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "OK", "service": "maps_backend_free", "version": "2.1.0"}


@app.get("/geocode", response_model=GeoResult)
async def geocode(address: str = Query(...)):
    url    = f"{NOMINATIM}/search"
    params = {"q": address, "format": "json", "addressdetails": 1, "limit": 1}
    async with httpx.AsyncClient(timeout=10, headers=HEADERS) as c:
        r = await c.get(url, params=params)
    data = r.json()
    if not data:
        raise HTTPException(404, f"Location not found: {address}")
    d    = data[0]
    addr = d.get("address", {})
    return GeoResult(
        place_name        = d.get("display_name", address).split(",")[0],
        lat               = float(d["lat"]),
        lng               = float(d["lon"]),
        formatted_address = d.get("display_name", address),
        place_type        = d.get("type", ""),
        city              = addr.get("city") or addr.get("town") or addr.get("village", ""),
        state             = addr.get("state", ""),
        country           = addr.get("country", ""),
    )


@app.get("/autocomplete")
async def autocomplete(input: str = Query(..., min_length=2)):
    url    = f"{NOMINATIM}/search"
    params = {"q": input, "format": "json", "addressdetails": 0, "limit": 6, "countrycodes": "in"}
    async with httpx.AsyncClient(timeout=8, headers=HEADERS) as c:
        r = await c.get(url, params=params)
    data = r.json()
    predictions = [
        {"description": d.get("display_name", ""), "place_id": d.get("place_id", i)}
        for i, d in enumerate(data)
    ]
    return {"predictions": predictions}


@app.get("/traffic-info", response_model=TrafficInfo)
async def traffic_info(
    address: str = Query(...),
    destination: str = Query(None),
):
    # ── 1. Geocode ──────────────────────────────────────────────
    geo_params = {"q": address, "format": "json", "addressdetails": 1, "limit": 1}
    async with httpx.AsyncClient(timeout=10, headers=HEADERS) as c:
        geo_r = await c.get(f"{NOMINATIM}/search", params=geo_params)
    geo_data = geo_r.json()
    if not geo_data:
        raise HTTPException(404, f"Location not found: {address}")

    gd    = geo_data[0]
    gaddr = gd.get("address", {})
    lat   = float(gd["lat"])
    lng   = float(gd["lon"])
    geo   = GeoResult(
        place_name        = gd.get("display_name", address).split(",")[0],
        lat               = lat,
        lng               = lng,
        formatted_address = gd.get("display_name", address),
        place_type        = gd.get("type", ""),
        city              = gaddr.get("city") or gaddr.get("town") or gaddr.get("village", ""),
        state             = gaddr.get("state", ""),
        country           = gaddr.get("country", ""),
    )

    # ── 2. Overpass — count road segments within 500m ────────────
    overpass_query = f"""
    [out:json][timeout:10];
    (
      way["highway"](around:500,{lat},{lng});
    );
    out tags;
    """
    road_density  = 0
    road_type     = "primary"
    nearby_roads  = []
    try:
        async with httpx.AsyncClient(timeout=12) as c:
            op_r = await c.post(OVERPASS, data={"data": overpass_query})
        op_data = op_r.json()
        elements     = op_data.get("elements", [])
        road_density = len(elements)
        road_type_counts: dict = {}
        road_names = set()
        for el in elements:
            tags = el.get("tags", {})
            hw   = tags.get("highway", "")
            if hw:
                road_type_counts[hw] = road_type_counts.get(hw, 0) + 1
            name = tags.get("name") or tags.get("name:en", "")
            if name:
                road_names.add(name)
        if road_type_counts:
            road_type = max(road_type_counts, key=road_type_counts.get)
        nearby_roads = list(road_names)[:8]
    except Exception:
        road_density = 12
        nearby_roads = []

    # ── 3. OSRM route ─────────────────────────────────────────────
    dest_lat = lat + 0.009
    dest_lng = lng + 0.009
    if destination:
        try:
            async with httpx.AsyncClient(timeout=8, headers=HEADERS) as c:
                dest_r = await c.get(f"{NOMINATIM}/search",
                    params={"q": destination, "format": "json", "limit": 1})
            dest_data = dest_r.json()
            if dest_data:
                dest_lat = float(dest_data[0]["lat"])
                dest_lng = float(dest_data[0]["lon"])
        except Exception:
            pass

    routes_out = []
    avg_speed  = 35.0
    try:
        osrm_url = (
            f"{OSRM}/route/v1/driving/"
            f"{lng},{lat};{dest_lng},{dest_lat}"
            f"?overview=false&alternatives=true&steps=true"
        )
        async with httpx.AsyncClient(timeout=12) as c:
            osrm_r = await c.get(osrm_url)
        osrm_data = osrm_r.json()
        if osrm_data.get("code") == "Ok":
            for i, route in enumerate(osrm_data.get("routes", [])[:3]):
                dist_km  = route["distance"] / 1000
                dur_min  = route["duration"] / 60
                spd      = (dist_km / (dur_min / 60)) if dur_min > 0 else 40
                if i == 0:
                    avg_speed = round(spd, 1)
                steps = []
                for leg in route.get("legs", []):
                    for step in leg.get("steps", [])[:5]:
                        name = step.get("name", "")
                        if name and name not in steps:
                            steps.append(name)
                routes_out.append({
                    "summary":             f"Route {i+1}" + (" (Recommended)" if i == 0 else ""),
                    "distance":            f"{dist_km:.1f} km",
                    "duration":            f"{int(dur_min)} min",
                    "duration_in_traffic": None,
                    "steps":               steps[:5],
                    "avg_speed":           f"{spd:.0f} km/h",
                    "is_recommended":      i == 0,
                })
    except Exception:
        pass

    # ── 4. Derive congestion ──────────────────────────────────────
    hour = datetime.now().hour
    congestion_level, congestion_pct = _congestion_from_speed(avg_speed, road_type)
    if 7 <= hour <= 10 or 17 <= hour <= 20:
        congestion_pct = min(100, congestion_pct * 1.4)
        if congestion_level == "Low":
            congestion_level = "Medium"
    elif 0 <= hour <= 5:
        congestion_pct = max(0, congestion_pct * 0.5)
        if congestion_level in ("Medium", "High"):
            congestion_level = "Low"

    # ── 5. Estimate vehicles ───────────────────────────────────────
    vb = _estimate_vehicles(road_density, road_type, hour, congestion_pct)

    # ── 6. Weather note ────────────────────────────────────────────
    weather_note = ""
    try:
        async with httpx.AsyncClient(timeout=6) as c:
            w_r = await c.get(WEATHER, params={
                "latitude": lat, "longitude": lng,
                "current": "precipitation,weathercode,windspeed_10m",
                "timezone": "auto",
            })
        w = w_r.json().get("current", {})
        precip = w.get("precipitation", 0)
        wcode  = w.get("weathercode", 0)
        wind   = w.get("windspeed_10m", 0)
        if precip > 1:
            weather_note = f"🌧️ Rain ({precip:.1f}mm) — expect slower speeds and higher congestion."
        elif wcode in (95, 96, 99):
            weather_note = "⛈️ Thunderstorm — roads may be hazardous."
        elif wind > 40:
            weather_note = f"💨 Strong winds ({wind:.0f} km/h) — drive with caution."
        else:
            weather_note = "☀️ Clear weather — roads should be normal."
    except Exception:
        weather_note = "Weather data unavailable."

    return TrafficInfo(
        location           = geo,
        vehicle_count      = vb.total,
        vehicle_breakdown  = vb,
        congestion_level   = congestion_level,
        congestion_pct     = round(congestion_pct, 1),
        avg_speed_kmh      = avg_speed,
        traffic_status     = congestion_level,
        traffic_color      = _color(congestion_level),
        traffic_description= _describe(congestion_level),
        road_type          = road_type,
        nearby_roads       = nearby_roads,
        last_updated       = datetime.now().strftime("%d %b %Y, %I:%M %p"),
        is_estimated       = True,
        routes             = routes_out,
        weather_note       = weather_note,
    )


# ── NEW: Nearby POIs ───────────────────────────────────────────────────────────

@app.get("/nearby-pois")
async def nearby_pois(lat: float = Query(...), lng: float = Query(...), radius: int = Query(1500)):
    """Return nearby POIs: hospitals, police, petrol, EV charging, parking, bus stops, railway."""
    amenity_map = {
        "hospital":        ("🏥", "Hospital"),
        "police":          ("👮", "Police Station"),
        "fuel":            ("⛽", "Petrol Pump"),
        "charging_station":("⚡", "EV Charging"),
        "parking":         ("🅿️", "Parking"),
        "bus_stop":        ("🚌", "Bus Stop"),
        "railway_station": ("🚆", "Railway Station"),
        "pharmacy":        ("💊", "Pharmacy"),
        "fire_station":    ("🚒", "Fire Station"),
    }

    amenity_list = "|".join(amenity_map.keys())
    query = f"""
    [out:json][timeout:15];
    (
      node["amenity"~"^({amenity_list})$"](around:{radius},{lat},{lng});
      node["railway"="station"](around:{radius},{lat},{lng});
    );
    out body;
    """

    pois = []
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(OVERPASS, data={"data": query})
        data = r.json()
        seen = set()
        for el in data.get("elements", []):
            tags    = el.get("tags", {})
            amenity = tags.get("amenity") or ("railway_station" if tags.get("railway") == "station" else None)
            if not amenity:
                continue
            name = tags.get("name") or tags.get("name:en") or amenity_map.get(amenity, ("", amenity))[1]
            if name in seen:
                continue
            seen.add(name)
            elat = el.get("lat", lat)
            elng = el.get("lon", lng)
            dist = _haversine(lat, lng, elat, elng)
            cfg  = amenity_map.get(amenity, ("📍", amenity.replace("_", " ").title()))
            pois.append({
                "name":     name,
                "type":     cfg[1],
                "icon":     cfg[0],
                "lat":      elat,
                "lng":      elng,
                "distance": f"{dist:.2f} km" if dist >= 0.1 else f"{int(dist*1000)} m",
                "dist_num": round(dist, 3),
                "phone":    tags.get("phone") or tags.get("contact:phone", ""),
                "opening":  tags.get("opening_hours", ""),
            })
        pois.sort(key=lambda x: x["dist_num"])
    except Exception as e:
        pois = []

    # Group by type
    grouped: dict = {}
    for p in pois[:40]:
        t = p["type"]
        if t not in grouped:
            grouped[t] = []
        grouped[t].append(p)

    return {"pois": pois[:40], "grouped": grouped, "total": len(pois)}


# ── NEW: Toll Plazas ───────────────────────────────────────────────────────────

@app.get("/toll-info")
async def toll_info(lat: float = Query(...), lng: float = Query(...), radius: int = Query(10000)):
    """Return nearby toll plazas with estimated charges."""
    query = f"""
    [out:json][timeout:15];
    (
      node["barrier"="toll_booth"](around:{radius},{lat},{lng});
      way["barrier"="toll_booth"](around:{radius},{lat},{lng});
      node["highway"="toll_gantry"](around:{radius},{lat},{lng});
    );
    out body;
    """

    toll_rates = {"car": 65, "bike": 30, "truck": 130, "bus": 100}

    tolls = []
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(OVERPASS, data={"data": query})
        data = r.json()
        for el in data.get("elements", []):
            tags = el.get("tags", {})
            elat = el.get("lat") or lat
            elng = el.get("lon") or lng
            dist = _haversine(lat, lng, elat, elng)
            name = tags.get("name") or tags.get("operator") or f"Toll Plaza ({dist:.1f} km)"
            tolls.append({
                "name":      name,
                "lat":       elat,
                "lng":       elng,
                "distance":  f"{dist:.2f} km",
                "dist_num":  round(dist, 3),
                "charges":   {k: f"₹{v}" for k, v in toll_rates.items()},
                "operator":  tags.get("operator", "NHAI"),
                "fastag":    True,
            })
        tolls.sort(key=lambda x: x["dist_num"])
    except Exception:
        tolls = []

    return {"tolls": tolls[:10], "total": len(tolls)}


# ── NEW: Accident History / Hotspots ──────────────────────────────────────────

@app.get("/accident-history")
async def accident_history(lat: float = Query(...), lng: float = Query(...), radius: int = Query(2000)):
    """Return accident hotspots near the location from OSM + reported incidents."""
    query = f"""
    [out:json][timeout:15];
    (
      node["accident"](around:{radius},{lat},{lng});
      node["hazard"](around:{radius},{lat},{lng});
      node["highway"="crossing"]["crossing"="traffic_signals"](around:{radius},{lat},{lng});
    );
    out body;
    """

    hotspots = []
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(OVERPASS, data={"data": query})
        data = r.json()
        for el in data.get("elements", []):
            tags   = el.get("tags", {})
            elat   = el.get("lat", lat)
            elng   = el.get("lon", lng)
            dist   = _haversine(lat, lng, elat, elng)
            htype  = tags.get("accident") or tags.get("hazard") or "Accident Hotspot"
            hotspots.append({
                "lat":      elat,
                "lng":      elng,
                "type":     htype,
                "distance": f"{dist:.2f} km",
                "dist_num": round(dist, 3),
                "severity": tags.get("severity") or ("High" if dist < 0.5 else "Medium"),
                "note":     tags.get("description") or tags.get("note") or "",
            })
    except Exception:
        hotspots = []

    # Also include user-reported accidents
    for inc in _reported_incidents:
        if inc["type"] == "accident":
            dist = _haversine(lat, lng, inc["lat"], inc["lng"])
            if dist <= radius / 1000:
                hotspots.append({
                    "lat":      inc["lat"],
                    "lng":      inc["lng"],
                    "type":     "User Reported",
                    "distance": f"{dist:.2f} km",
                    "dist_num": round(dist, 3),
                    "severity": "Medium",
                    "note":     inc.get("description", ""),
                })

    hotspots.sort(key=lambda x: x["dist_num"])
    return {"hotspots": hotspots[:20], "total": len(hotspots)}


# ── NEW: Road Conditions ───────────────────────────────────────────────────────

@app.get("/road-conditions")
async def road_conditions(lat: float = Query(...), lng: float = Query(...), radius: int = Query(3000)):
    """Return road conditions: construction, closures, diversions."""
    query = f"""
    [out:json][timeout:15];
    (
      way["construction"](around:{radius},{lat},{lng});
      way["highway"]["access"="no"](around:{radius},{lat},{lng});
      way["highway"]["oneway"="yes"](around:{radius},{lat},{lng});
      node["highway"="construction"](around:{radius},{lat},{lng});
    );
    out tags;
    """

    conditions = []
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(OVERPASS, data={"data": query})
        data = r.json()
        for el in data.get("elements", []):
            tags  = el.get("tags", {})
            elat  = el.get("lat") or lat
            elng  = el.get("lon") or lng
            name  = tags.get("name") or tags.get("ref") or "Unnamed Road"
            if tags.get("construction"):
                ctype = "🚧 Construction"
                info  = f"Construction in progress on {name}"
            elif tags.get("access") == "no":
                ctype = "🚫 Road Closed"
                info  = f"{name} is closed to traffic"
            elif tags.get("oneway") == "yes":
                ctype = "↗️ One-Way"
                info  = f"{name} — one-way road"
            else:
                ctype = "⚠️ Condition Alert"
                info  = f"Road condition alert on {name}"
            conditions.append({
                "type":  ctype,
                "name":  name,
                "info":  info,
                "lat":   elat,
                "lng":   elng,
                "tags":  {k: v for k, v in tags.items() if k in ("name", "construction", "access", "surface")},
            })
    except Exception:
        conditions = []

    # Add user-reported roadblocks
    for inc in _reported_incidents:
        if inc["type"] in ("roadblock", "jam"):
            dist = _haversine(lat, lng, inc["lat"], inc["lng"])
            if dist <= radius / 1000:
                conditions.append({
                    "type": "🚧 User Reported" if inc["type"] == "roadblock" else "🚦 Traffic Jam",
                    "name": "User Reported",
                    "info": inc.get("description") or inc["type"].title(),
                    "lat":  inc["lat"],
                    "lng":  inc["lng"],
                    "tags": {},
                })

    return {"conditions": conditions[:20], "total": len(conditions)}


# ── NEW: AI Suggestions ────────────────────────────────────────────────────────

@app.get("/ai-suggestions")
async def ai_suggestions(
    lat: float = Query(...),
    lng: float = Query(...),
    congestion_level: str = Query("Low"),
    congestion_pct: float = Query(0),
    weather_note: str = Query(""),
):
    """Rule-based AI suggestions based on congestion, time, weather."""
    hour = datetime.now().hour
    suggestions = []

    # Congestion-based
    if congestion_level == "Very High":
        suggestions.append({
            "icon": "🚨",
            "type": "danger",
            "title": "Severe Congestion Detected",
            "message": f"Traffic density is at {congestion_pct:.0f}%. Avoid this area if possible. Consider alternate routes or delay your journey by 30–45 minutes.",
        })
    elif congestion_level == "High":
        suggestions.append({
            "icon": "⚠️",
            "type": "warning",
            "title": "Heavy Traffic Alert",
            "message": f"Congestion at {congestion_pct:.0f}%. Allow extra 15–20 minutes. Use Route 2 or 3 if available.",
        })
    elif congestion_level == "Medium":
        suggestions.append({
            "icon": "🟡",
            "type": "info",
            "title": "Moderate Traffic",
            "message": "Mild congestion detected. Traffic is manageable. Stay on the main route.",
        })
    else:
        suggestions.append({
            "icon": "✅",
            "type": "success",
            "title": "Roads Clear",
            "message": "Low traffic. Great time to travel. All routes are flowing smoothly.",
        })

    # Time-based
    if 7 <= hour <= 10:
        suggestions.append({
            "icon": "🌅",
            "type": "warning",
            "title": "Morning Rush Hour",
            "message": "Peak morning traffic (7–10 AM). Leave 20 minutes early or take metro/public transport.",
        })
    elif 17 <= hour <= 20:
        suggestions.append({
            "icon": "🌆",
            "type": "warning",
            "title": "Evening Rush Hour",
            "message": "Evening peak traffic (5–8 PM). Expect heavy congestion near IT hubs and market areas.",
        })
    elif 22 <= hour or hour <= 5:
        suggestions.append({
            "icon": "🌙",
            "type": "success",
            "title": "Late Night — Low Traffic",
            "message": "Roads are mostly clear. Drive carefully — lower visibility at night.",
        })

    # Weather-based
    if "Rain" in weather_note or "rain" in weather_note:
        suggestions.append({
            "icon": "🌧️",
            "type": "warning",
            "title": "Rain Alert",
            "message": "Wet roads detected. Reduce speed by 20 km/h. Maintain safe following distance.",
        })
    elif "Thunderstorm" in weather_note or "Storm" in weather_note:
        suggestions.append({
            "icon": "⛈️",
            "type": "danger",
            "title": "Storm Warning",
            "message": "Thunderstorm conditions. Avoid travel if possible. Waterlogging may cause road closures.",
        })
    elif "winds" in weather_note.lower():
        suggestions.append({
            "icon": "💨",
            "type": "info",
            "title": "High Wind Advisory",
            "message": "Strong winds reported. High-sided vehicles should exercise extra caution.",
        })

    # Fuel saving tip
    if congestion_pct > 50:
        suggestions.append({
            "icon": "⛽",
            "type": "tip",
            "title": "Fuel Saving Tip",
            "message": "Heavy stop-and-go traffic increases fuel consumption by 30%. Consider using idle-stop or switching to a less congested route.",
        })

    return {"suggestions": suggestions, "generated_at": datetime.now().strftime("%I:%M %p")}


# ── NEW: Heatmap Data ──────────────────────────────────────────────────────────

@app.get("/heatmap-data")
async def heatmap_data(lat: float = Query(...), lng: float = Query(...), radius: int = Query(2000)):
    """Return lat/lng/intensity points for traffic heatmap overlay."""
    query = f"""
    [out:json][timeout:15];
    (
      way["highway"~"^(motorway|trunk|primary|secondary)$"](around:{radius},{lat},{lng});
    );
    out geom;
    """

    points = []
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(OVERPASS, data={"data": query})
        data = r.json()
        hour = datetime.now().hour
        peak = 1.5 if (7 <= hour <= 10 or 17 <= hour <= 20) else 0.8

        intensity_map = {"motorway": 0.9, "trunk": 0.75, "primary": 0.6, "secondary": 0.4}

        for el in data.get("elements", []):
            tags    = el.get("tags", {})
            hw      = tags.get("highway", "secondary")
            base_i  = intensity_map.get(hw, 0.3)
            intensity = min(1.0, base_i * peak)
            geom    = el.get("geometry", [])
            for node in geom[::3]:   # sample every 3rd node
                points.append({
                    "lat":       node["lat"],
                    "lng":       node["lon"],
                    "intensity": round(intensity, 2),
                })
    except Exception:
        # Fallback: generate synthetic points around the location
        random.seed(int(lat * 1000 + lng * 1000))
        for _ in range(20):
            points.append({
                "lat":       lat + random.uniform(-0.01, 0.01),
                "lng":       lng + random.uniform(-0.01, 0.01),
                "intensity": random.uniform(0.2, 0.9),
            })

    return {"points": points[:200], "total": len(points)}


# ── NEW: Report Incident ───────────────────────────────────────────────────────

@app.post("/report-incident")
async def report_incident(incident: IncidentReport):
    """Accept user-reported incidents (accident, jam, roadblock, pothole)."""
    record = {
        "id":          len(_reported_incidents) + 1,
        "lat":         incident.lat,
        "lng":         incident.lng,
        "type":        incident.type,
        "description": incident.description,
        "reporter":    incident.reporter,
        "reported_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "status":      "active",
    }
    _reported_incidents.append(record)
    return {"success": True, "incident": record, "message": f"Incident reported successfully. ID: {record['id']}"}


@app.get("/reported-incidents")
async def get_reported_incidents(lat: float = Query(None), lng: float = Query(None), radius: float = Query(5)):
    """Get all user-reported incidents, optionally filtered by location."""
    if lat is not None and lng is not None:
        filtered = [
            i for i in _reported_incidents
            if _haversine(lat, lng, i["lat"], i["lng"]) <= radius
        ]
    else:
        filtered = _reported_incidents[:]
    return {"incidents": filtered, "total": len(filtered)}
