const express = require("express");
const axios = require("axios");
const cors = require("cors");
const { geocodeLocation, geocodeJobs } = require("./services/geolocation");

const app = express();
app.use(cors());

const PORT = 3001;

// =====================================================
// WORKER QUEUE SYSTEM 
// =====================================================
class Queue {
    constructor(concurrency = 8) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }

    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.next();
        });
    }

    next() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;

        const { task, resolve, reject } = this.queue.shift();
        this.running++;

        task()
            .then(resolve)
            .catch(reject)
            .finally(() => {
                this.running--;
                this.next();
            });
    }
}

const scrapeQueue = new Queue(10);

// queued axios (ALL requests go through worker pool)
const queuedGet = (url, options = {}) =>
    scrapeQueue.add(() => axios.get(url, options));

// =====================================================
// CACHE
// =====================================================
const cache = new Map();
const CACHE_TIME = 60 * 1000;

// =====================================================
// HELPERS
// =====================================================
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

    return loc.includes(search) || loc.includes("remote");
}

// =====================================================
// REMOTIVE
// =====================================================
async function scrapeRemotive(query, location) {
    try {
        const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`;

        const { data } = await queuedGet(url, { timeout: 8000 });

        if (!data?.jobs) return [];

        return data.jobs
            .filter(job =>
                matchesQuery(job.title || "", query) &&
                matchesLocation(job.candidate_required_location || "", location)
            )
            .map(job => ({
                title: job.title,
                company: job.company_name,
                location: job.candidate_required_location || "Remote",
                source: "Remotive"
            }));

    } catch (err) {
        console.log("Remotive error:", err.message);
        return [];
    }
}

// =====================================================
// ADZUNA
// =====================================================
async function scrapeAdzuna(query, location) {
    try {
        const APP_ID = "3652d8fd";
        const APP_KEY = "868d60544868de9706ab43a1d5981fe2";

        const url =
            `https://api.adzuna.com/v1/api/jobs/ca/search/1` +
            `?app_id=${APP_ID}` +
            `&app_key=${APP_KEY}` +
            `&results_per_page=30` +
            `&what=${encodeURIComponent(query)}` +
            `&where=${encodeURIComponent(location)}`;

        const { data } = await queuedGet(url, { timeout: 8000 });

        if (!data?.results) return [];

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



// =====================================================
// MAIN ENDPOINT
// =====================================================
app.get("/api/jobs", async (req, res) => {
    try {
        const query = req.query.q || "developer";
        const location = req.query.l || "canada";

        const page = parseInt(req.query.page || "1");
        const pageSize = 10;

        const cacheKey = `${query.toLowerCase()}-${location.toLowerCase()}`;
        const now = Date.now();

        const cached = cache.get(cacheKey);
        if (cached && now - cached.timestamp < CACHE_TIME) {
            console.log("⚡ Cache hit:", cacheKey);

            const start = (page - 1) * pageSize;
            const end = start + pageSize;

            return res.json({
                page,
                pageSize,
                total: cached.data.length,
                jobs: cached.data.slice(start, end)
            });
        }

        console.log("🔥 API HIT:", new Date().toISOString());
        console.log("Query:", query, "| Location:", location);

        const [remotive, adzuna] = await Promise.all([
            scrapeRemotive(query, location),
            scrapeAdzuna(query, location)
        ]);

        const jobs = [...remotive, ...adzuna];

        const uniqueJobs = Array.from(
            new Map(
                jobs.map(job => [
                    `${job.title}-${job.company}-${job.location}`,
                    job
                ])
            ).values()
        );

        const jobsWithGeo = await geocodeJobs(uniqueJobs);

        const validJobs = jobsWithGeo.filter(job =>
            job.geo &&
            typeof job.geo.lat === "number" &&
            typeof job.geo.lng === "number"
        );

        cache.set(cacheKey, {
            data: validJobs,
            timestamp: now
        });

        const start = (page - 1) * pageSize;
        const end = start + pageSize;

        const paginatedJobs = validJobs.slice(start, end);

        console.log("TOTAL JOBS FOUND:", validJobs.length);

        return res.json({
            page,
            pageSize,
            total: validJobs.length,
            jobs: paginatedJobs
        });

    } catch (err) {
        console.error("API ERROR:", err);
        return res.status(500).json({ error: "Scraping failed" });
    }
});

// =====================================================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});