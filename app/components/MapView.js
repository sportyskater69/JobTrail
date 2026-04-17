"use client";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap
} from "react-leaflet";

import { getJobPosition } from "../utils/getJobPosition";
import { useEffect, useRef, useMemo, useState } from "react";
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
// USER ICON (RED PIN)
// ===============================
const userIcon = new L.Icon({
    iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl:
        "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

// ===============================
// ROUTING
// ===============================
function Routing({ from, to, onRouteReady }) {
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

            createMarker: () => null,

            router: L.Routing.osrmv1({
                serviceUrl: "https://router.project-osrm.org/route/v1"
            })
        });

        control.addTo(map);
        routingRef.current = control;


        if (typeof window !== "undefined" && onRouteReady) {
            const container = control.getContainer();
            onRouteReady(container);
        }

        return () => {
            const current = routingRef.current;
            routingRef.current = null;

            if (!current) return;

            try { map.removeControl(current); } catch { }
        };
    }, [map, from?.lat, from?.lng, to?.lat, to?.lng, onRouteReady]);

    return null;
}

// ===============================
// MAP VIEW
// ===============================
export default function MapView({
    userLocation,
    jobs,
    selectedJob,
    setSelectedJob
}) {
    const [directionsEl, setDirectionsEl] = useState(null);
    const [mounted, setMounted] = useState(false);

    // hydration safety
    useEffect(() => {
        setMounted(true);
    }, []);

    const safeJobs = useMemo(() => {
        return Array.isArray(jobs) ? jobs : [];
    }, [jobs]);

    const jobPositions = useMemo(() => {
        return safeJobs
            .map(job => {
                const pos = getJobPosition(job);
                if (!pos) return null;

                return {
                    job,
                    lat: pos.lat,
                    lng: pos.lng
                };
            })
            .filter(Boolean);
    }, [safeJobs]);

    const selectedPosition = useMemo(() => {
        return getJobPosition(selectedJob);
    }, [selectedJob]);

    if (!mounted) return <p>Loading map...</p>;
    if (!userLocation) return <p>Loading location...</p>;

    return (
        <div className="w-full flex flex-col gap-4">

            {/* MAP */}
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
                <Marker
                    position={[userLocation.lat, userLocation.lng]}
                    icon={userIcon}
                >
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

                {/* ROUTING */}
                {selectedPosition && (
                    <Routing
                        from={{
                            lat: userLocation.lat,
                            lng: userLocation.lng
                        }}
                        to={selectedPosition}
                        onRouteReady={setDirectionsEl}
                    />
                )}
            </MapContainer>

            {/* DIRECTIONS BELOW MAP */}
            {directionsEl && (
                <div className="bg-white p-4 rounded-xl shadow-md max-h-64 overflow-auto text-[#87A646]">
                    <div
                        ref={(node) => {
                            if (node && directionsEl && !node.contains(directionsEl)) {
                                node.appendChild(directionsEl);
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
}