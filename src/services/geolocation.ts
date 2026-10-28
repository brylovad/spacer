export interface Coordinates {
  lat: number;
  lon: number;
  accuracy: number;
}

export type GeolocationErrorCode = "permissionDenied" | "positionUnavailable" | "timeout" | "unsupported";

export class GeolocationError extends Error {
  constructor(public code: GeolocationErrorCode) {
    super(code);
  }
}

export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new GeolocationError("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        const code: GeolocationErrorCode =
          err.code === err.PERMISSION_DENIED
            ? "permissionDenied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "positionUnavailable";
        reject(new GeolocationError(code));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}
