import axios from "axios";
import { geocodeJobs } from "@/lib/geolocation";

// =========================
// SIMPLE CACHE 
// =========================
const cache = new Map();
const CACHE_TIME = 60 * 1000;

// =========================
// HELPERS
// =========================
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

// =========================
// REMOTIVE
// =========================
async function scrapeRemotive(query, location) {
    try {
        const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { timeout: 8000 });

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

// =========================
// ADZUNA
// =========================
async function scrapeAdzuna(query, location) {
    try {
        const APP_ID = process.env.ADZUNA_APP_ID;
        const APP_KEY = process.env.ADZUNA_APP_KEY;

        const url =
            `https://api.adzuna.com/v1/api/jobs/ca/search/1` +
            `?app_id=${APP_ID}` +
            `&app_key=${APP_KEY}` +
            `&results_per_page=30` +
            `&what=${encodeURIComponent(query)}` +
            `&where=${encodeURIComponent(location)}`;

        const { data } = await axios.get(url, { timeout: 8000 });

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

// =========================
// API ROUTE (Vercel)
// =========================
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);

        const query = searchParams.get("q") || "developer";
        const location = searchParams.get("l") || "canada";

        const cacheKey = `${query}-${location}`;
        const now = Date.now();

        const cached = cache.get(cacheKey);
        if (cached && now - cached.timestamp < CACHE_TIME) {
            return Response.json({
                jobs: cached.data,
                total: cached.data.length
            });
        }

        console.log("🔥 API HIT:", query, location);

        const [remotive, adzuna] = await Promise.all([
            scrapeRemotive(query, location),
            scrapeAdzuna(query, location)
        ]);

        let jobs = [...remotive, ...adzuna];

        // DEDUPE
        jobs = Array.from(
            new Map(
                jobs.map(j => [`${j.title}-${j.company}-${j.location}`, j])
            ).values()
        ).slice(0, 25);

        const jobsWithGeo = await geocodeJobs(jobs);

        cache.set(cacheKey, {
            data: jobsWithGeo,
            timestamp: now
        });

        return Response.json({
            jobs: jobsWithGeo,
            total: jobsWithGeo.length
        });

    } catch (err) {
        console.error("API ERROR:", err);
        return Response.json(
            { error: "Scraping failed" },
            { status: 500 }
        );
    }
}