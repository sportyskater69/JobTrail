"use client";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap
} from "react-leaflet";

import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet-routing-machine";
import "leaflet/dist/leaflet.css";

// ===============================
// ICON FIX
// ===============================
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// ===============================
// JITTER
// ===============================
function jitterCoordinate(lat, lng, seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const jitterLat = ((hash % 100) / 100 - 0.5) * 0.02;
    const jitterLng = ((hash % 73) / 73 - 0.5) * 0.02;

    return {
        lat: Number(lat) + jitterLat,
        lng: Number(lng) + jitterLng
    };
}

// ===============================
// ROUTING
// ===============================
function Routing({ from, to }) {
    const map = useMap();
    const routingRef = useRef(null);

    useEffect(() => {
        if (!map || !from || !to) return;

        const control = L.Routing.control({
            waypoints: [
                L.latLng(from.lat, from.lng),
                L.latLng(to.lat, to.lng)
            ],
            routeWhileDragging: false,
            addWaypoints: false,
            show: false,
            lineOptions: {
                styles: [{ color: "blue", weight: 4 }],
            },
            router: L.Routing.osrmv1({
                serviceUrl: "https://router.project-osrm.org/route/v1"
            })
        });

        control.addTo(map);
        routingRef.current = control;

        return () => {
            const current = routingRef.current;

            routingRef.current = null;

            if (!current) return;

            try {
                current.setWaypoints([]);
            } catch { }

            try {
                map.removeControl(current);
            } catch { }
        };
    }, [map, from?.lat, from?.lng, to?.lat, to?.lng]);

    return null;
}

// ===============================
// MAP
// ===============================
export default function MapView({
    userLocation,
    jobs,
    selectedJob,
    setSelectedJob
}) {
    if (!userLocation) return <p>Loading map...</p>;

    const safeJobs = Array.isArray(jobs) ? jobs : [];

    // 🔥 CRITICAL FIX: one source of truth per job
    const jobPositions = useMemo(() => {
        return safeJobs
            .filter(job => job?.geo?.lat && job?.geo?.lng)
            .map(job => {

                const base = {
                    lat: job.geo.lat,
                    lng: job.geo.lng
                };

                // 🔥 ONLY jitter city-center / fallback results
                const shouldJitter = job.geo.isApproximate === true;

                const finalPos = shouldJitter
                    ? jitterCoordinate(
                        base.lat,
                        base.lng,
                        `${job.title}-${job.company}-${job.location}`
                    )
                    : base;

                return {
                    job,
                    lat: finalPos.lat,
                    lng: finalPos.lng
                };
            });
    }, [safeJobs]);

    const selectedPosition = useMemo(() => {
        if (!selectedJob?.geo) return null;

        const base = {
            lat: selectedJob.geo.lat,
            lng: selectedJob.geo.lng
        };

        const shouldJitter = selectedJob.geo.isApproximate === true;

        return shouldJitter
            ? jitterCoordinate(
                base.lat,
                base.lng,
                `${selectedJob.title}-${selectedJob.company}-${selectedJob.location}`
            )
            : base;

    }, [selectedJob]);

    return (
        <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={10}
            style={{ height: "400px", width: "100%" }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
            />

            {/* USER */}
            <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>You are here</Popup>
            </Marker>

            {/* JOB MARKERS */}
            {jobPositions.map(({ job, lat, lng }, i) => (
                <Marker
                    key={`${job.title}-${job.company}-${i}`}
                    position={[lat, lng]}
                    eventHandlers={{
                        click: () => setSelectedJob(job)
                    }}
                >
                    <Popup>
                        <b>{job.title}</b>
                        <br />
                        {job.company}
                    </Popup>
                </Marker>
            ))}

            {/* ROUTING (NOW MATCHES PIN EXACTLY) */}
            {selectedPosition && (
                <Routing
                    from={{
                        lat: userLocation.lat,
                        lng: userLocation.lng
                    }}
                    to={selectedPosition}
                />
            )}
        </MapContainer>
    );
}