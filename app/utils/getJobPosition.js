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

export function getJobPosition(job) {
    if (!job?.geo) return null;

    const base = {
        lat: job.geo.lat,
        lng: job.geo.lng
    };

    const shouldJitter = job.geo.isApproximate === true;

    return shouldJitter
        ? jitterCoordinate(
            base.lat,
            base.lng,
            `${job.title}-${job.company}-${job.location}`
        )
        : base;
}