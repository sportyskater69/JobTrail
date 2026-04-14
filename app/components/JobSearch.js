import React, { useState } from "react";

const JobSearch = () => {
    const [query, setQuery] = useState("software developer");
    const [location, setLocation] = useState("Calgary");
    const [jobs, setJobs] = useState([]);

    const fetchJobs = async () => {
        try {
            const res = await fetch(
                `http://localhost:3001/api/jobs?q=${query}&l=${location}`
            );

            const data = await res.json();
            setJobs(data); // store jobs in state
        } catch (err) {
            console.error("Error fetching jobs:", err);
        }
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
            <ul>
                {jobs.map((job, index) => (
                    <li key={index}>
                        <strong>{job.title}</strong> — {job.company} ({job.location})
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default JobSearch;