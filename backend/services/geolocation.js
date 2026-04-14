const axios = require("axios");

// simple in-memory cache
const geoCache = new Map();

/**
 * Geocode location using OpenStreetMap (Nominatim)
 */
async function geocodeLocation(location) {
    if (!location || location.toLowerCase() === "remote") {
        return null;
    }

    const key = location.toLowerCase();

    if (geoCache.has(key)) {
        return geoCache.get(key);
    }

    try {
        const url = "https://nominatim.openstreetmap.org/search";

        const { data } = await axios.get(url, {
            params: {
                q: location,
                format: "json",
                limit: 1
            },
            headers: {
                "User-Agent": "job-finder-app/1.0"
            },
            timeout: 8000
        });

        if (!data || data.length === 0) return null;

        const result = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name
        };

        geoCache.set(key, result);

        return result;

    } catch (err) {
        console.log("OSM geocode error:", err.message);
        return null;
    }
}

module.exports = {
    geocodeLocation
};