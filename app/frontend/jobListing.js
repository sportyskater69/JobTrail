"use client";

import { useEffect, useState } from "react";
import JobSearch from "../components/JobSearch";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("../components/MapView"), {
  ssr: false,
});

export default function JobListing() {
  const pageSize = 10;

  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);

  const [page, setPage] = useState(1);

  const [selectedJob, setSelectedJob] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // ✅ FIX: hydration lock (prevents SSR/client mismatch)
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // safer pagination math (never produces unstable 0/NaN edge states)
  const totalPages = Math.max(
    1,
    Math.ceil((totalJobs || 0) / pageSize)
  );

  const paginatedJobs = jobs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    });
  }, []);

  // ✅ CRITICAL: ensure identical first render on server + client
  if (!hydrated) {
    return <main style={{ padding: 20 }} />;
  }

  return (
    <main style={{ padding: 20 }}>

      {/* SEARCH */}
      <JobSearch
        page={page}
        pageSize={pageSize}
        setJobs={setJobs}
        setTotalJobs={setTotalJobs}
        setSelectedJob={setSelectedJob}
      />

      {/* RESULTS */}
      <div className="flex flex-col gap-3 mt-4">
        <p>Total jobs: {totalJobs}</p>

        {paginatedJobs.map((job, index) => (
          <div
            key={`${job.title}-${job.company}-${index}`}
            onClick={() => setSelectedJob(job)}
            className="border p-3 rounded-xl cursor-pointer"
          >
            <p className="font-bold text-xl">{job.title}</p>
            <p>{job.company}</p>
            <p>{job.location}</p>

            {job.geo && (
              <div className="text-xs text-gray-500 mt-2">
                🌍 {job.geo.lat}, {job.geo.lng}
                <br />
                📍 {job.geo.displayName}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MAP */}
      <MapView
        userLocation={userLocation}
        jobs={paginatedJobs}
        selectedJob={selectedJob}
        setSelectedJob={setSelectedJob}
      />

      {/* PAGINATION */}
      <div className="flex gap-2 mt-6 items-center">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page <= 1}
          className="px-3 py-1 border rounded"
        >
          Prev
        </button>

        <span>
          Page {page} / {totalPages}
        </span>

        <button
          onClick={() =>
            setPage((p) => Math.min(p + 1, totalPages))
          }
          disabled={totalJobs === 0 || page >= totalPages}
          className="px-3 py-1 border rounded"
        >
          Next
        </button>
      </div>

    </main>
  );
}