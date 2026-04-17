"use client";

import { useEffect, useState } from "react";
import JobSearch from "../components/JobSearch";
import CommuteTime from "../components/CommuteTime";
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

  return (
    <main className="bg-[#F5F5F0] min-h-screen p-5">

      {/* SEARCH */}
      <JobSearch
        page={page}
        pageSize={pageSize}
        setJobs={setJobs}
        setTotalJobs={setTotalJobs}
        setSelectedJob={setSelectedJob}
      />

      {/* MAIN LAYOUT */}
      <div className="flex w-full h-[80vh] gap-4 mt-4">

        {/* LEFT - JOB LIST */}
        <div className="w-1/2 h-full overflow-y-auto flex flex-col gap-3 pr-2">
          <p className="ml-2">Total jobs: {totalJobs}</p>

          {paginatedJobs.map((job, index) => (
            <div
              key={`${job.title}-${job.company}-${index}`}
              onClick={() => setSelectedJob(job)}
              className="border p-3 rounded-xl cursor-pointer bg-white"
            >
              <p className="font-bold text-xl">{job.title}</p>
              <p>{job.company}</p>
              <p>{job.location}</p>

              <CommuteTime
                userLocation={userLocation}
                job={job}
              />
            </div>
          ))}
        </div>

        {/* RIGHT - MAP (FULL HEIGHT FIX) */}
        <div className="w-1/2 h-full rounded-xl overflow-hidden">
          <div className="h-full w-full">
            <MapView
              userLocation={userLocation}
              jobs={paginatedJobs}
              selectedJob={selectedJob}
              setSelectedJob={setSelectedJob}
            />
          </div>
        </div>

      </div>

      {/* PAGINATION */}
      <div className="flex gap-2 mt-6 items-center">
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page <= 1}
          className="px-3 py-1 border rounded bg-[#87A646]"
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
          className="px-3 py-1 border rounded bg-[#87A646]"
        >
          Next
        </button>
      </div>

    </main>
  );
}