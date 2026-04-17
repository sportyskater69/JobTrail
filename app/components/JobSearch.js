"use client"

import React, { useState, useRef, useMemo } from "react";

const JobSearch = ({
    page,
    pageSize,
    setTotalJobs,
    setJobs,
    setSelectedJob
}) => {
    const [query, setQuery] = useState("");
    const [location, setLocation] = useState("");
    const [loading, setLoading] = useState(false);

    const cacheRef = useRef(new Map());

    const currentKey = useMemo(
        () => `${query.toLowerCase()}-${location.toLowerCase()}`,
        [query, location]
    );

    const isDisabled = !query.trim() || !location.trim() || loading;

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
            const res = await fetch(`/api/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`);

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

    // ✅ FULL REPLACEMENT UI
    if (loading) {
        return (
            <div style={{ padding: "20px" }}>
                <h2>Job Search</h2>

                <div className="flex items-center justify-center border rounded-xl shadow-sm w-fit bg-white px-10 py-6">
                    <p className="text-gray-600 animate-pulse">
                        Searching jobs...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <h2 className="text-xl text-[#4D531D]">Job Search</h2>

            <div className="flex items-center border rounded-xl shadow-sm overflow-hidden w-fit bg-white">

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Job title, keywords..."
                    className="px-4 py-2 outline-none w-64"
                />

                <div className="h-6 w-px bg-gray-300" />

                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City or remote"
                    className="px-4 py-2 outline-none w-48"
                />

                <button
                    onClick={() => fetchJobs(true)}
                    disabled={isDisabled}
                    className={`px-6 py-2 transition text-white
                            ${isDisabled
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-[#87A646] hover:bg-[#4D531D]"
                        }`}
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </div>
        </div>
    );
};

export default JobSearch;