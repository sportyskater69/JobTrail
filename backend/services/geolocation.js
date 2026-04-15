const axios = require("axios");

const geoCache = new Map();

// =====================================================
// MAIN GEOCODER
// =====================================================
async function geocodeLocation(job) {
    if (!job?.location) return null;

    const key = `${job.company || ""}-${job.location}`.toLowerCase();

    if (geoCache.has(key)) return geoCache.get(key);

    const queries = [
        `${job.company || ""}, ${job.location}, Canada`,
        `${job.location}, Canada`,
        `${job.location}`
    ];

    for (const q of queries) {
        try {
            const { data } = await axios.get(
                "https://nominatim.openstreetmap.org/search",
                {
                    params: {
                        q,
                        format: "json",
                        limit: 1
                    },
                    headers: {
                        "User-Agent": "job-finder-app/1.0"
                    }
                }
            );

            if (data?.length > 0) {
                const result = {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon),
                    displayName: data[0].display_name
                };

                geoCache.set(key, result);
                return result;
            }

        } catch (err) {
            if (err.response?.status === 429) {
                console.log("Rate limited - backing off...");
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    }

    return null;
}

// =====================================================
// GEO BATCH (FIXED + NO LIMIT BREAKAGE)
// =====================================================
async function geocodeJobs(uniqueJobs) {

    if (!Array.isArray(uniqueJobs)) return [];

    const geoMap = new Map();

    // dedupe by location only
    for (const job of uniqueJobs) {
        const key = job.location?.toLowerCase();
        if (!key) continue;

        if (!geoMap.has(key)) {
            geoMap.set(key, job);
        }
    }

    const uniqueLocationJobs = Array.from(geoMap.values());

    const geoResults = new Map();

    for (const job of uniqueLocationJobs) {
        const key = job.location?.toLowerCase();
        if (!key) continue;

        const geo = await geocodeLocation(job);
        geoResults.set(key, geo);
    }

    return uniqueJobs.map(job => {
        const key = job.location?.toLowerCase();
        return {
            ...job,
            geo: geoResults.get(key) || null
        };
    });
}

module.exports = {
    geocodeLocation,
    geocodeJobs
};