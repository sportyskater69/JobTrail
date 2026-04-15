"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

function Routing({ from, to }) {
    const map = useMap();
    const routingRef = useRef(null);

    useEffect(() => {
        if (!map || !from || !to) return;

        // cleanup previous route first
        if (routingRef.current) {
            try {
                map.removeControl(routingRef.current);
            } catch { }
        }

        const control = L.Routing.control({
            waypoints: [
                L.latLng(from.lat, from.lng),
                L.latLng(to.lat, to.lng),
            ],
            lineOptions: {
                styles: [{ color: "blue", weight: 4 }],
            },
            routeWhileDragging: false,
            addWaypoints: false,
            show: false,
        });

        control.addTo(map);
        routingRef.current = control;

        return () => {
            try {
                if (map && routingRef.current) {
                    map.removeControl(routingRef.current);
                    routingRef.current = null;
                }
            } catch (e) {
                console.warn("Route cleanup skipped");
            }
        };
    }, [map, from, to]);

    return null;
}

export default function MapView({ userLocation, jobLocation }) {
    if (!userLocation) return <p>Loading map...</p>;

    return (
        <MapContainer
            center={[userLocation.lat, userLocation.lng]}
            zoom={10}
            style={{ height: "400px", width: "100%" }}
        >
            <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User marker */}
            <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>You are here</Popup>
            </Marker>

            {/* Job marker */}
            {jobLocation && (
                <Marker position={[jobLocation.lat, jobLocation.lng]}>
                    <Popup>Job Location</Popup>
                </Marker>
            )}

            {/* Route */}
            {jobLocation && (
                <Routing from={userLocation} to={jobLocation} />
            )}
        </MapContainer>
    );
}