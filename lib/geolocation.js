import axios from "axios";

const geoCache = new Map();

// =====================================================
// CITY FALLBACKS
// =====================================================
const cityFallbacks = {
    calgary: { lat: 51.0447, lng: -114.0719 },
    toronto: { lat: 43.6532, lng: -79.3832 },
    vancouver: { lat: 49.2827, lng: -123.1207 },
    edmonton: { lat: 53.5461, lng: -113.4938 },
    montreal: { lat: 45.5019, lng: -73.5674 },
    ottawa: { lat: 45.4215, lng: -75.6972 }
};

// =====================================================
// QUEUE SYSTEM
// =====================================================
const geocodeQueue = [];
let geocodeRunning = false;

const GEO_DELAY = 1200;

// =====================================================
// PROCESS QUEUE
// =====================================================
async function processQueue() {
    if (geocodeRunning) return;
    geocodeRunning = true;

    while (geocodeQueue.length > 0) {
        const { query, resolve } = geocodeQueue.shift();
        const key = query.toLowerCase();

        if (geoCache.has(key)) {
            resolve(geoCache.get(key));
            continue;
        }

        try {
            const { data } = await axios.get(
                "https://nominatim.openstreetmap.org/search",
                {
                    params: {
                        q: query,
                        format: "json",
                        limit: 1
                    },
                    headers: {
                        "User-Agent": "job-finder-app/1.0"
                    },
                    timeout: 8000
                }
            );

            let result = null;
            let isApproximate = false;

            if (data && data.length > 0) {
                result = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    displayName: data[0].display_name
                };

                // REAL LOCATION FOUND → NOT APPROXIMATE
                isApproximate = false;
            }

            const geo = {
                ...result,
                isApproximate
            };

            geoCache.set(key, geo);
            resolve(geo);

        } catch (err) {
            console.log("Geocode error:", err.message);

            if (err.response?.status === 429) {
                console.log("Rate limited — backing off");
                await new Promise(r => setTimeout(r, 5000));
            }

            resolve(null);
        }

        await new Promise(r => setTimeout(r, GEO_DELAY));
    }

    geocodeRunning = false;
}

// =====================================================
async function tryGeocode(query) {
    return new Promise((resolve) => {
        geocodeQueue.push({ query, resolve });
        processQueue();
    });
}

// =====================================================
// MAIN GEOCODER
// =====================================================
async function geocodeLocation(jobOrQuery) {
    if (!jobOrQuery) return null;

    const location =
        typeof jobOrQuery === "object"
            ? jobOrQuery.location
            : jobOrQuery;

    if (!location || location.toLowerCase().includes("remote")) {
        return null;
    }

    const key = location.toLowerCase();

    // ⚠️ IMPORTANT: return cached FULL object
    if (geoCache.has(key)) {
        return geoCache.get(key);
    }

    const query = `${location}, Canada`;

    let result = await tryGeocode(query);

    // =========================
    // CASE 1: REAL GEOCODE
    // =========================
    if (result && result.displayName) {
        const geo = {
            lat: result.lat,
            lng: result.lng,
            displayName: result.displayName,
            isApproximate: false
        };

        geoCache.set(key, geo);
        return geo;
    }

    // =========================
    // CASE 2: CITY FALLBACK
    // =========================
    const cityKey = Object.keys(cityFallbacks)
        .find(city => location.toLowerCase().includes(city));

    if (cityKey) {
        const geo = {
            ...cityFallbacks[cityKey],
            displayName: null,
            isApproximate: true
        };

        geoCache.set(key, geo);
        return geo;
    }

    // =========================
    // CASE 3: GLOBAL FALLBACK
    // =========================
    const geo = {
        lat: 56.1304,
        lng: -106.3468,
        displayName: null,
        isApproximate: true
    };

    geoCache.set(key, geo);
    return geo;
}

// =====================================================
async function geocodeJobs(uniqueJobs) {
    const geoMap = new Map();

    for (const job of uniqueJobs) {
        const key = job.location?.toLowerCase();
        if (!key) continue;

        if (!geoMap.has(key)) {
            geoMap.set(key, job.location);
        }
    }

    const geoResults = new Map();

    for (const location of geoMap.values()) {
        const geo = await geocodeLocation(location);
        geoResults.set(location.toLowerCase(), geo);
    }

    return uniqueJobs.map(job => ({
        ...job,
        geo: geoResults.get(job.location?.toLowerCase()) || null
    }));
}

export { geocodeLocation, geocodeJobs };