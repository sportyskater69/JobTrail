import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../components/MapView"), {
    ssr: false,
});

const JobSearch = () => {
    // =========================
    // CORE STATE (FROM PRIORITY FILE)
    // =========================
    const [query, setQuery] = useState("software developer");
    const [location, setLocation] = useState("Calgary");
    const [jobs, setJobs] = useState([]);
    const [page, setPage] = useState(1);
    const [selectedJob, setSelectedJob] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(false);

    // =========================
    // UI STATE (FROM STYLE FILE)
    // =========================
    const [remoteOnly, setRemoteOnly] = useState(false);

    // =========================
    // GET USER LOCATION
    // =========================
    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                });
            },
            (err) => console.log(err)
        );
    }, []);

    // =========================
    // FETCH JOBS (SERVER PAGINATION)
    // =========================
    const fetchJobs = async (targetPage = page) => {
        if (loading) return;
        setLoading(true);

        try {
            const res = await fetch(
                `http://localhost:3001/api/jobs?q=${query}&l=${location}&page=${targetPage}`
            );

            const data = await res.json();

            setJobs(data.jobs || []);
        } catch (err) {
            setJobs([]);
        }

        setLoading(false);
    };

    // =========================
    // AUTO FETCH ON PAGE CHANGE
    // =========================
    useEffect(() => {
        fetchJobs(page);
    }, [page]);

    // =========================
    // FILTERS (STYLE FILE FEATURE)
    // =========================
    const inPersonJobs = jobs.filter(job =>
        !job.location?.toLowerCase().includes("remote")
    );

    const remoteJobs = jobs.filter(job =>
        job.location?.toLowerCase().includes("remote")
    );

    // =========================
    // SEARCH (RESET PAGE)
    // =========================
    const handleSearch = () => {
        setPage(1);
        fetchJobs(1);
    };

    return (
        <div style={{ padding: "20px" }}>

            <h2>Job Search</h2>

            {/* =========================
                SEARCH BAR (STYLE FILE UI)
            ========================= */}
            <div className="flex items-center border rounded-xl shadow-sm overflow-hidden w-fit bg-white mb-4">

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
                    onClick={handleSearch}
                    className="bg-blue-600 text-white px-6 py-2 hover:bg-blue-700 transition"
                >
                    Search
                </button>
            </div>

            {/* =========================
                TOGGLE
            ========================= */}
            <label className="flex items-center gap-2 mb-4">
                <input
                    type="checkbox"
                    checked={remoteOnly}
                    onChange={(e) => setRemoteOnly(e.target.checked)}
                />
                Remote only
            </label>

            {/* =========================
                RESULTS HEADER
            ========================= */}
            <p className="mb-3">Total jobs: {jobs.length}</p>

            {/* =========================
                TWO COLUMN LAYOUT (STYLE FILE)
            ========================= */}
            <div className="flex gap-6">

                {/* IN PERSON */}
                <div className="flex flex-col gap-3 w-1/2">
                    <p className="font-bold text-lg">In Person</p>

                    {inPersonJobs.map((job, index) => (
                        <div
                            key={`${job.title}-${job.company}-${index}`}
                            onClick={() => setSelectedJob(job)}
                            className="border p-3 rounded-xl cursor-pointer"
                        >
                            <p className="font-bold text-xl">{job.title}</p>
                            <p>{job.company}</p>
                            <p>{job.location}</p>
                        </div>
                    ))}
                </div>

                {/* REMOTE */}
                <div className="flex flex-col gap-3 w-1/2">
                    <p className="font-bold text-lg">Remote</p>

                    {remoteJobs
                        .filter(job => !remoteOnly || job.location?.toLowerCase().includes("remote"))
                        .map((job, index) => (
                            <div
                                key={`${job.title}-${job.company}-${index}`}
                                onClick={() => setSelectedJob(job)}
                                className="border p-3 rounded-xl bg-gray-50 cursor-pointer"
                            >
                                <p className="font-bold text-xl">{job.title}</p>
                                <p>{job.company}</p>
                                <p>{job.location}</p>

                                {job.geo && (
                                    <div className="text-xs text-gray-500 mt-2">
                                        🌍 Lat: {job.geo.lat}, Lng: {job.geo.lng}
                                        <br />
                                        📍 {job.geo.displayName}
                                    </div>
                                )}
                            </div>
                        ))}
                </div>
            </div>

            {/* =========================
                MAP
            ========================= */}
            <div className="mt-6">
                <MapView
                    userLocation={userLocation}
                    jobLocation={selectedJob?.geo}
                />
            </div>

            {/* =========================
                PAGINATION (FROM PRIORITY FILE)
            ========================= */}
            <div className="flex gap-2 mt-6">
                <button
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded"
                >
                    Prev
                </button>

                <span className="px-2">Page {page}</span>

                <button
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 border rounded"
                >
                    Next
                </button>
            </div>

        </div>
    );
};

export default JobSearch;