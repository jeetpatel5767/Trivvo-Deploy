/**
 * C2 arrival: a soft location guard. We ask the browser for the hunter's position and
 * measure the distance to the hunt. Being outside the radius (or denying location) never
 * blocks the check-in — it only shows a gentle "you look far from the venue" note. The
 * real gate is the World human check + the one-scan-per-hunt rule on the backend.
 */

export interface LocationResult {
  /** 'ok' inside radius · 'far' outside · 'denied' no permission · 'unavailable' no geolocation/error */
  status: 'ok' | 'far' | 'denied' | 'unavailable';
  distanceM?: number;
}

/** Great-circle distance between two lat/lng points, in metres (haversine). */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Resolve the hunter's distance to (lat,lng) against a radius. Never rejects. */
export function checkLocation(lat: number, lng: number, radiusM = 150): Promise<LocationResult> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ status: 'unavailable' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distanceM = distanceMeters(pos.coords.latitude, pos.coords.longitude, lat, lng);
        resolve({ status: distanceM <= radiusM ? 'ok' : 'far', distanceM });
      },
      (err) => {
        resolve({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable' });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    );
  });
}
