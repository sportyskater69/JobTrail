const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = 3001;

// ----------------------------
// Helpers
// ----------------------------
function cleanLocation(loc) {
    if (!loc) return "Unknown";
    if (loc.toLowerCase().includes("remote")) return "Remote";
    return loc.replace(" in ", ", ").trim();
}

// ----------------------------
// GREENHOUSE (only valid companies)
// ----------------------------
async function scrapeGreenhouse(query, location) {
    const companies = ["airbnb", "stripe", "doordash"];

    let results = [];

    for (const company of companies) {
        try {
            const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=true`;

            const { data } = await axios.get(url, {
                timeout: 8000
            });

            data.jobs.forEach(job => {
                const title = job.title || "";
                const loc = job.location?.name || "Unknown";

                if (
                    title.toLowerCase().includes(query.toLowerCase())
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
// LEVER (only valid companies)
// ----------------------------
async function scrapeLever(query, location) {
    const companies = ["netflix", "vercel"];

    let results = [];

    for (const company of companies) {
        try {
            const url = `https://api.lever.co/v0/postings/${company}?mode=json`;

            const { data } = await axios.get(url, {
                timeout: 8000
            });

            data.forEach(job => {
                const title = job.text || "";
                const loc = job.categories?.location || "Unknown";

                if (
                    title.toLowerCase().includes(query.toLowerCase()) &&
                    loc.toLowerCase().includes(location.toLowerCase())
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
// REMOTIVE (🔥 BEST FIX - ALWAYS WORKS)
// ----------------------------
async function scrapeRemotive(query) {
    try {
        const url = `https://remotive.com/api/remote-jobs?search=${query}`;

        const { data } = await axios.get(url, { timeout: 8000 });

        return data.jobs.map(job => ({
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
// MAIN ENDPOINT
// ----------------------------
app.get("/api/jobs", async (req, res) => {
    try {
        const query = req.query.q || "developer";
        const location = req.query.l || "canada";

        const [greenhouse, lever, remotive] = await Promise.all([
            scrapeGreenhouse(query, location),
            scrapeLever(query, location),
            scrapeRemotive(query)
        ]);

        const jobs = [...greenhouse, ...lever, ...remotive];

        console.log("TOTAL JOBS FOUND:", jobs.length);

        res.json(jobs);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Scraping failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});