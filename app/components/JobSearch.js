"use client"

import React, { useState, useEffect, useRef, useMemo } from "react";


const JobSearch = ({
    page,
    pageSize,
    setTotalJobs,
    setJobs,
    setSelectedJob
}) => {
    const [query, setQuery] = useState(() => "");
    const [location, setLocation] = useState(() => "");
    const [loading, setLoading] = useState(false);

    const cacheRef = useRef(new Map());

    const currentKey = useMemo(
        () => `${query.toLowerCase()}-${location.toLowerCase()}`,
        [query, location]
    );



    // =========================
    // FETCH JOBS
    // =========================
    const fetchJobs = async (force = false) => {
        if (loading) return;

        setLoading(true);

        const cache = cacheRef.current;

        if (!force && cache.has(currentKey)) {
            const data = cache.get(currentKey);
            setJobs(data.jobs);
            setTotalJobs(data.total);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(
                `http://localhost:3001/api/jobs?q=${query}&l=${location}`
            );

            const data = await res.json();

            const fullData = {
                jobs: data.jobs || [],
                total: data.total || 0
            };

            cache.set(currentKey, fullData);

            setJobs(fullData.jobs);
            setTotalJobs(fullData.total);

        } catch (err) {
            setJobs([]);
            setTotalJobs(0);
        }

        setLoading(false);
    };



    return (
        <div style={{ padding: "20px" }}>

            <h2>Job Search</h2>

            {/* SEARCH BAR */}
            <div className="flex items-center border rounded-xl shadow-sm overflow-hidden w-fit bg-white">

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    placeholder="Job title, keywords..."
                    className="px-4 py-2 outline-none w-64"
                    suppressHydrationWarning
                />

                <div className="h-6 w-px bg-gray-300" />

                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    autoComplete="off"
                    placeholder="City or remote"
                    className="px-4 py-2 outline-none w-48"
                    suppressHydrationWarning
                />

                <button
                    onClick={() => fetchJobs(true)}
                    className="bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 transition"
                >
                    Search
                </button>
            </div>

        </div>
    );
};

export default JobSearch;