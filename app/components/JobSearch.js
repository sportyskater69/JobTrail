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

            console.log("RAW RESPONSE:");
            console.log(data);

            console.log("LENGTH:", data.length);

            console.log("STRINGIFIED:");
            console.log(JSON.stringify(data, null, 2));

            if (Array.isArray(data)) {
                setJobs(data);
            } else {
                console.error("Backend error:", data);
                setJobs([]);
            }
        } catch (err) {
            console.error("Error fetching jobs:", err);
            setJobs([]);
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
            <div>
                <p>Total jobs in state: {jobs.length}</p>

                {jobs.map((job, index) => (
                    <div key={index}>
                        #{index + 1} — {job.title}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default JobSearch;