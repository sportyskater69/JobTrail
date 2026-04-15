"use client";

import { useEffect, useState } from "react";

export default function CommuteTime({ userLocation, job }) {
    const [minutes, setMinutes] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userLocation || !job?.geo) return;

        const fetchRoute = async () => {
            setLoading(true);

            try {
                const url = `https://router.project-osrm.org/route/v1/driving/` +
                    `${userLocation.lng},${userLocation.lat};` +
                    `${job.geo.lng},${job.geo.lat}?overview=false`;

                const res = await fetch(url);
                const data = await res.json();

                if (data?.routes?.length > 0) {
                    const durationSeconds = data.routes[0].duration;
                    const mins = Math.round(durationSeconds / 60);
                    setMinutes(mins);
                } else {
                    setMinutes(null);
                }

            } catch (err) {
                setMinutes(null);
            }

            setLoading(false);
        };

        fetchRoute();
    }, [userLocation, job]);

    if (!job?.geo) return null;

    return (
        <span className="text-xs text-blue-600 ml-2">
            {loading
                ? "Calculating..."
                : minutes !== null
                    ? `🚗 ~${minutes} min commute`
                    : "Commute unavailable"}
        </span>
    );
}