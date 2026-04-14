import React, { useState } from "react";

const JobSearch = () => {
    const [query, setQuery] = useState("software developer");
    const [location, setLocation] = useState("Calgary");
    const [jobs, setJobs] = useState([]);

    const [loading, setLoading] = useState(false);

    const fetchJobs = async () => {
        if (loading) return;
        setLoading(true);

        try {
            const res = await fetch(
                `http://localhost:3001/api/jobs?q=${query}&l=${location}`
            );

            const data = await res.json();

            if (Array.isArray(data)) {
                setJobs(data);
            } else {
                setJobs([]);
            }
        } catch (err) {
            setJobs([]);
        }

        setLoading(false);
    };

    return (
        <div style={{ padding: "20px" }}>

            <h2>Job Search</h2>

            {/* 🔍 Query input */}
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Job title (e.g. developer)"
            />

            {/* 📍 Location input */}
            <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location (e.g. Calgary)"
                style={{ marginLeft: "10px" }}
            />

            {/* 🔘 Search button */}
            <button onClick={fetchJobs} style={{ marginLeft: "10px" }}>
                Search
            </button>

            {/* 📋 Results */}
            <div>
                <p>Total jobs in state: {jobs.length}</p>

                {jobs.map((job, index) => (
                    <div key={`${job.title}-${job.company}-${job.location}-${index}`}>
                        #{index + 1} — {job.title} — {job.company} ({job.location})
                    </div>
                ))}
            </div>
        </div>
    );
};

export default JobSearch;