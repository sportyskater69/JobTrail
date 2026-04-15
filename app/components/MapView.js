"use client";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMap
} from "react-leaflet";

import { getJobPosition } from "../utils/getJobPosition";
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

            try { current.setWaypoints([]); } catch { }
            try { map.removeControl(current); } catch { }
        };
    }, [map, from.lat, from.lng, to.lat, to.lng, from, to]);

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
    // ✅ hooks ALWAYS run first
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

    // ❗ AFTER ALL HOOKS
    if (!userLocation) return <p>Loading map...</p>;

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
                />
            )}
        </MapContainer>
    );
}