/**
 * 🏘️ Towns/Cities extraction from GPS coordinates
 * Provider: OpenStreetMap Nominatim
 */

const axios = require('axios');

const CACHE = {};

/**
 * Extract towns from a list of coordinates using reverse geocoding
 * @param {Array} coordinates - Array of [lat, lng] pairs from activity track
 * @returns {Promise<Array>} - Array of unique town objects
 */
async function extractTownsFromTrack(coordinates) {
  if (!coordinates || coordinates.length === 0) return [];

  const uniqueTowns = new Map();
  const maxSamples = Math.min(24, Math.max(8, Math.floor(coordinates.length / 40)));
  const sampleInterval = Math.max(1, Math.floor(coordinates.length / maxSamples));

  const sampleIndexes = new Set([0, Math.floor(coordinates.length / 2), coordinates.length - 1]);
  for (let i = 0; i < coordinates.length; i += sampleInterval) {
    sampleIndexes.add(i);
  }
  const orderedIndexes = Array.from(sampleIndexes).filter(i => i >= 0 && i < coordinates.length).sort((a, b) => a - b);

  try {
    for (const i of orderedIndexes) {
      const [lat, lng] = coordinates[i] || [];
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;

      const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      let townData = CACHE[cacheKey];

      if (!townData) {
        townData = await reverseGeocode(lat, lng);
        if (townData) CACHE[cacheKey] = townData;
      }

      if (townData?.name) {
        const dedupeKey = `${townData.name}|${townData.province || ''}|${townData.country || ''}`;
        if (!uniqueTowns.has(dedupeKey)) {
          uniqueTowns.set(dedupeKey, townData);
        }
      }

      await new Promise(r => setTimeout(r, 450));
    }
  } catch (err) {
    console.error('[Towns] Error extracting towns from track:', err.message);
  }

  return Array.from(uniqueTowns.values());
}

/**
 * Reverse geocode a single lat/lng coordinate
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<Object|null>}
 */
async function reverseGeocode(lat, lng) {
  return reverseGeocodeNominatim(lat, lng);
}

async function reverseGeocodeNominatim(lat, lng) {
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat,
        lon: lng,
        format: 'jsonv2',
        'accept-language': 'es',
        zoom: 14,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'RideMetrics/1.0 (town-extraction; contact: local-dev)'
      },
      timeout: 7000
    });

    const address = response?.data?.address;
    if (!address) return null;

    const townName = address.town || address.city || address.village || address.municipality || address.suburb || address.county;
    const province = address.state || address.province || null;
    const country = address.country || null;

    if (!townName) return null;

    return {
      name: townName,
      lat,
      lng,
      province,
      country,
      formatted_address: response?.data?.display_name || null
    };
  } catch {
    return null;
  }
}

module.exports = {
  extractTownsFromTrack,
  reverseGeocode,
  CACHE
};
