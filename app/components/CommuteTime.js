import { useMemo } from "react";
import { getJobPosition } from "../utils/getJobPosition";

function getDistanceKm(a, b) {
    const R = 6371;

    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;

    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(dLng / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

    return R * c;
}

function estimateMinutes(km, speed = 35) {
    return Math.round((km / speed) * 60);
}

export default function CommuteTime({ userLocation, job }) {
    const minutes = useMemo(() => {
        if (!userLocation || !job) return null;

        const jobPos = getJobPosition(job); // 🔥 KEY FIX

        if (!jobPos) return null;

        const distance = getDistanceKm(userLocation, jobPos);
        return estimateMinutes(distance);
    }, [userLocation, job]);

    if (!minutes) return null;

    return (
        <span className="text-xs text-blue-600 ml-2">
            🚗 ~{minutes} min
        </span>
    );
}