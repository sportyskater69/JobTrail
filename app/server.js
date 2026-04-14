// server.js
const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());

const PORT = 3000;

// Helper: clean location text
function cleanLocation(loc) {
    if (!loc) return null;
    if (loc.toLowerCase().includes("remote")) return null;
    return loc.replace(" in ", ", ").trim();
}

// Main scraper endpoint
app.get("/api/jobs", async (req, res) => {
    try {
        const query = req.query.q || "software developer";
        const location = req.query.l || "Calgary";

        const jobs = [];

        for (let start = 0; start <= 20; start += 10) {
            const url = `https://ca.indeed.com/jobs?q=${encodeURIComponent(
                query
            )}&l=${encodeURIComponent(location)}&start=${start}`;

            const { data } = await axios.get(url, {
                headers: { "User-Agent": "Mozilla/5.0" },
            });

            const $ = cheerio.load(data);

            $(".job_seen_beacon").each((i, el) => {
                const title = $(el).find("h2 span").text().trim();
                const company = $(el).find(".companyName").text().trim();
                const locationText = $(el).find(".companyLocation").text().trim();

                if (company && locationText && !locationText.toLowerCase().includes("remote")) {
                    jobs.push({
                        title,
                        company,
                        location: locationText,
                        mapQuery: `${company} ${locationText}`,
                    });
                }
            });

            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        res.json(jobs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Scraping failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});