const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = 3001;

// ----------------------------
// CACHE (per query + location)
// ----------------------------
const cache = new Map();
const CACHE_TIME = 60 * 1000; // 1 minute

// ----------------------------
// Helpers
// ----------------------------
const safeRun = async (fn) => {
    try {
        return await fn;
    } catch (err) {
        console.log("Safe run error:", err.message);
        return [];
    }
};

function cleanLocation(loc) {
    if (!loc) return "Unknown";
    if (loc.toLowerCase().includes("remote")) return "Remote";
    return loc.replace(" in ", ", ").trim();
}

function matchesQuery(title, query) {
    const words = query.toLowerCase().split(" ").filter(Boolean);
    const lowerTitle = title.toLowerCase();

    return words.some(word => lowerTitle.includes(word));
}

function matchesLocation(jobLocation, searchLocation) {
    if (!searchLocation) return true;

    const loc = jobLocation.toLowerCase();
    const search = searchLocation.toLowerCase();

    // Match local OR remote
    return loc.includes(search) || loc.includes("remote");
}

// ----------------------------
// GREENHOUSE
// ----------------------------
async function scrapeGreenhouse(query, location) {
    const companies = [
        "airbnb", "stripe", "doordash", "shopify", "slack",
        "coinbase", "dropbox", "reddit", "pinterest",
        "square", "lyft", "instacart", "robinhood",
        "figma", "datadog", "snowflake", "twilio"
    ];
    let results = [];

    for (const company of companies) {
        try {
            const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;

            const { data } = await axios.get(url, { timeout: 8000 });

            data.jobs.forEach(job => {
                const title = job.title || "";
                const loc = job.location?.name || "Unknown";

                if (
                    matchesQuery(title, query) &&
                    matchesLocation(loc, location)
                ) {
                    results.push({
                        title,
                        company,
                        location: cleanLocation(loc),
                        source: "Greenhouse"
                    });
                }
            });

        } catch (err) {
            console.log(`Greenhouse error (${company}) skipped`);
        }
    }

    return results;
}

// ----------------------------
// LEVER
// ----------------------------
async function scrapeLever(query, location) {
    const companies = [
        "netflix", "vercel", "shopify", "discord",
        "robinhood", "figma", "segment", "notion"
    ];
    let results = [];

    for (const company of companies) {
        try {
            const url = `https://api.lever.co/v0/postings/${company}?mode=json`;

            const { data } = await axios.get(url, { timeout: 8000 });

            data.forEach(job => {
                const title = job.text || "";
                const loc = job.categories?.location || "Unknown";

                if (
                    matchesQuery(title, query) &&
                    matchesLocation(loc, location)
                ) {
                    results.push({
                        title,
                        company,
                        location: cleanLocation(loc),
                        source: "Lever"
                    });
                }
            });

        } catch (err) {
            console.log(`Lever error (${company}) skipped`);
        }
    }

    return results;
}

// ----------------------------
// REMOTIVE
// ----------------------------
async function scrapeRemotive(query, location) {
    try {
        const url = `https://remotive.com/api/remote-jobs?search=${query}`;

        const { data } = await axios.get(url, { timeout: 8000 });

        return data.jobs
            .filter(job =>
                matchesQuery(job.title, query) &&
                matchesLocation(job.candidate_required_location || "", location)
            )
            .map(job => ({
                title: job.title,
                company: job.company_name,
                location: job.candidate_required_location || "Remote",
                source: "Remotive"
            }));

    } catch (err) {
        console.log("Remotive error");
        return [];
    }
}

// ----------------------------
// ADZUNA
// ----------------------------
async function scrapeAdzuna(query, location) {
    try {
        const APP_ID = "3652d8fd";
        const APP_KEY = "868d60544868de9706ab43a1d5981fe2";

        const url = `https://api.adzuna.com/v1/api/jobs/ca/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=20&what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}`;

        const { data } = await axios.get(url, { timeout: 8000 });

        if (!data || !data.results) return [];

        return data.results.map(job => ({
            title: job.title || "Unknown",
            company: job.company?.display_name || "Unknown",
            location: job.location?.display_name || "Unknown",
            source: "Adzuna"
        }));

    } catch (err) {
        console.log("Adzuna error:", err.message);
        return [];
    }
}

// ----------------------------
// MAIN ENDPOINT
// ----------------------------
app.get("/api/jobs", async (req, res) => {
    try {
        const query = req.query.q || "developer";
        const location = req.query.l || "canada";

        const cacheKey = `${query.toLowerCase()}-${location.toLowerCase()}`;
        const now = Date.now();

        // Serve cache
        const cached = cache.get(cacheKey);
        if (cached && now - cached.timestamp < CACHE_TIME) {
            console.log("⚡ Cache hit:", cacheKey);
            return res.json(cached.data);
        }

        console.log("🔥 API HIT:", new Date().toISOString());
        console.log("Query:", query, "| Location:", location);

        const [greenhouse, lever, remotive, adzuna] = await Promise.all([
            scrapeGreenhouse(query, location),
            scrapeLever(query, location),
            scrapeRemotive(query, location),
            scrapeAdzuna(query, location)
        ]);

        const jobs = [...greenhouse, ...lever, ...remotive, ...adzuna];

        // dedupe
        const uniqueJobs = Array.from(
            new Map(
                jobs.map(job => [
                    `${job.title}-${job.company}-${job.location}`,
                    job
                ])
            ).values()
        );

        // sort local first
        uniqueJobs.sort((a, b) => {
            const aLocal = a.location.toLowerCase().includes(location.toLowerCase());
            const bLocal = b.location.toLowerCase().includes(location.toLowerCase());
            return bLocal - aLocal;
        });

        cache.set(cacheKey, {
            data: uniqueJobs,
            timestamp: now
        });

        console.log("TOTAL JOBS FOUND:", uniqueJobs.length);

        return res.json(uniqueJobs);

    } catch (err) {
        console.error("API ERROR:", err);
        return res.status(500).json({ error: "Scraping failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});