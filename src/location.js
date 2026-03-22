/**
 * Location service — uses the browser Geolocation API
 * and Nominatim (OpenStreetMap) for reverse geocoding.
 */

/**
 * Get the user's current GPS position.
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tarayıcınız konum özelliğini desteklemiyor.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Konum izni reddedildi.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Konum bilgisi alınamıyor.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Konum isteği zaman aşımına uğradı.'));
            break;
          default:
            reject(new Error('Konum alınırken bir hata oluştu.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Reverse geocode coordinates to an address using Nominatim (free, no API key).
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<string>}
 */
export async function getAddressFromCoords(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr`,
      {
        headers: {
          'User-Agent': 'YGA-HazardReporter/1.0',
        },
      }
    );

    if (!response.ok) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const data = await response.json();

    if (data.display_name) {
      // Shorten the address — take first 3 parts
      const parts = data.display_name.split(', ');
      return parts.slice(0, 3).join(', ');
    }

    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
