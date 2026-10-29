/**
 * Offline city list. Coordinates are approximate city centres — precise enough
 * for prayer times (a 5 km difference moves a time by less than a minute).
 * Timezone identifiers come from the IANA database, which the browser already
 * ships with full historical DST rules.
 */

const RAW = [
  // Tunisia
  ['Tunis', 'Tunisia', 36.8065, 10.1815, 'Africa/Tunis'],
  ['Sfax', 'Tunisia', 34.7406, 10.7603, 'Africa/Tunis'],
  ['Sousse', 'Tunisia', 35.8256, 10.6084, 'Africa/Tunis'],
  ['Kairouan', 'Tunisia', 35.6781, 10.0963, 'Africa/Tunis'],
  ['Bizerte', 'Tunisia', 37.2744, 9.8739, 'Africa/Tunis'],
  ['Gabès', 'Tunisia', 33.8815, 10.0982, 'Africa/Tunis'],
  ['Ariana', 'Tunisia', 36.8625, 10.1956, 'Africa/Tunis'],
  ['Gafsa', 'Tunisia', 34.425, 8.7842, 'Africa/Tunis'],
  ['Monastir', 'Tunisia', 35.777, 10.8262, 'Africa/Tunis'],
  ['Nabeul', 'Tunisia', 36.4513, 10.7357, 'Africa/Tunis'],
  ['Médenine', 'Tunisia', 33.3549, 10.5055, 'Africa/Tunis'],
  ['Tataouine', 'Tunisia', 32.9297, 10.4518, 'Africa/Tunis'],
  ['Tozeur', 'Tunisia', 33.9197, 8.1335, 'Africa/Tunis'],
  ['Kébili', 'Tunisia', 33.7044, 8.9694, 'Africa/Tunis'],
  ['Jendouba', 'Tunisia', 36.5011, 8.7802, 'Africa/Tunis'],
  ['Béja', 'Tunisia', 36.7256, 9.1817, 'Africa/Tunis'],
  ['Mahdia', 'Tunisia', 35.5047, 11.0622, 'Africa/Tunis'],
  ['Zarzis', 'Tunisia', 33.5039, 11.1122, 'Africa/Tunis'],
  ['Houmt Souk', 'Tunisia', 33.8756, 10.8576, 'Africa/Tunis'],
  ['Siliana', 'Tunisia', 36.0849, 9.3708, 'Africa/Tunis'],
  ['Le Kef', 'Tunisia', 36.1742, 8.7049, 'Africa/Tunis'],
  ['Sidi Bouzid', 'Tunisia', 35.0382, 9.4849, 'Africa/Tunis'],
  ['Kasserine', 'Tunisia', 35.1676, 8.8365, 'Africa/Tunis'],
  ['Ben Arous', 'Tunisia', 36.7531, 10.2189, 'Africa/Tunis'],
  ['La Marsa', 'Tunisia', 36.8784, 10.3247, 'Africa/Tunis'],
  ['Hammamet', 'Tunisia', 36.4, 10.6167, 'Africa/Tunis'],
  // Maghreb
  ['Algiers', 'Algeria', 36.7538, 3.0588, 'Africa/Algiers'],
  ['Oran', 'Algeria', 35.6971, -0.6308, 'Africa/Algiers'],
  ['Constantine', 'Algeria', 36.365, 6.6147, 'Africa/Algiers'],
  ['Annaba', 'Algeria', 36.9, 7.7667, 'Africa/Algiers'],
  ['Casablanca', 'Morocco', 33.5731, -7.5898, 'Africa/Casablanca'],
  ['Rabat', 'Morocco', 34.0209, -6.8416, 'Africa/Casablanca'],
  ['Marrakesh', 'Morocco', 31.6295, -7.9811, 'Africa/Casablanca'],
  ['Fes', 'Morocco', 34.0331, -5.0003, 'Africa/Casablanca'],
  ['Tangier', 'Morocco', 35.7595, -5.834, 'Africa/Casablanca'],
  ['Agadir', 'Morocco', 30.4278, -9.5981, 'Africa/Casablanca'],
  ['Tripoli', 'Libya', 32.8872, 13.1913, 'Africa/Tripoli'],
  ['Benghazi', 'Libya', 32.1167, 20.0667, 'Africa/Tripoli'],
  ['Nouakchott', 'Mauritania', 18.0735, -15.9582, 'Africa/Nouakchott'],
  // Middle East
  ['Cairo', 'Egypt', 30.0444, 31.2357, 'Africa/Cairo'],
  ['Alexandria', 'Egypt', 31.2001, 29.9187, 'Africa/Cairo'],
  ['Makkah', 'Saudi Arabia', 21.3891, 39.8579, 'Asia/Riyadh'],
  ['Madinah', 'Saudi Arabia', 24.4672, 39.6111, 'Asia/Riyadh'],
  ['Riyadh', 'Saudi Arabia', 24.7136, 46.6753, 'Asia/Riyadh'],
  ['Jeddah', 'Saudi Arabia', 21.4858, 39.1925, 'Asia/Riyadh'],
  ['Dammam', 'Saudi Arabia', 26.4207, 50.0888, 'Asia/Riyadh'],
  ['Dubai', 'United Arab Emirates', 25.2048, 55.2708, 'Asia/Dubai'],
  ['Abu Dhabi', 'United Arab Emirates', 24.4539, 54.3773, 'Asia/Dubai'],
  ['Doha', 'Qatar', 25.2854, 51.531, 'Asia/Qatar'],
  ['Kuwait City', 'Kuwait', 29.3759, 47.9774, 'Asia/Kuwait'],
  ['Manama', 'Bahrain', 26.2285, 50.586, 'Asia/Bahrain'],
  ['Muscat', 'Oman', 23.588, 58.3829, 'Asia/Muscat'],
  ['Amman', 'Jordan', 31.9539, 35.9106, 'Asia/Amman'],
  ['Beirut', 'Lebanon', 33.8938, 35.5018, 'Asia/Beirut'],
  ['Damascus', 'Syria', 33.5138, 36.2765, 'Asia/Damascus'],
  ['Baghdad', 'Iraq', 33.3152, 44.3661, 'Asia/Baghdad'],
  ['Erbil', 'Iraq', 36.1901, 44.0091, 'Asia/Baghdad'],
  ['Istanbul', 'Türkiye', 41.0082, 28.9784, 'Europe/Istanbul'],
  ['Ankara', 'Türkiye', 39.9334, 32.8597, 'Europe/Istanbul'],
  ['Izmir', 'Türkiye', 38.4237, 27.1428, 'Europe/Istanbul'],
  ['Tehran', 'Iran', 35.6892, 51.389, 'Asia/Tehran'],
  ['Jerusalem', 'Palestine', 31.7683, 35.2137, 'Asia/Jerusalem'],
  ['Gaza', 'Palestine', 31.5017, 34.4668, 'Asia/Gaza'],
  // Africa
  ['Khartoum', 'Sudan', 15.5007, 32.5599, 'Africa/Khartoum'],
  ['Addis Ababa', 'Ethiopia', 9.025, 38.7469, 'Africa/Addis_Ababa'],
  ['Mogadishu', 'Somalia', 2.0469, 45.3182, 'Africa/Mogadishu'],
  ['Nairobi', 'Kenya', -1.2921, 36.8219, 'Africa/Nairobi'],
  ['Lagos', 'Nigeria', 6.5244, 3.3792, 'Africa/Lagos'],
  ['Kano', 'Nigeria', 12.0022, 8.592, 'Africa/Lagos'],
  ['Abuja', 'Nigeria', 9.0765, 7.3986, 'Africa/Lagos'],
  ['Dakar', 'Senegal', 14.7167, -17.4677, 'Africa/Dakar'],
  ['Bamako', 'Mali', 12.6392, -8.0029, 'Africa/Bamako'],
  ['Abidjan', 'Côte d’Ivoire', 5.36, -4.0083, 'Africa/Abidjan'],
  ['Accra', 'Ghana', 5.6037, -0.187, 'Africa/Accra'],
  ['Johannesburg', 'South Africa', -26.2041, 28.0473, 'Africa/Johannesburg'],
  ['Cape Town', 'South Africa', -33.9249, 18.4241, 'Africa/Johannesburg'],
  // Europe
  ['London', 'United Kingdom', 51.5074, -0.1278, 'Europe/London'],
  ['Birmingham', 'United Kingdom', 52.4862, -1.8904, 'Europe/London'],
  ['Manchester', 'United Kingdom', 53.4808, -2.2426, 'Europe/London'],
  ['Paris', 'France', 48.8566, 2.3522, 'Europe/Paris'],
  ['Marseille', 'France', 43.2965, 5.3698, 'Europe/Paris'],
  ['Lyon', 'France', 45.764, 4.8357, 'Europe/Paris'],
  ['Lille', 'France', 50.6292, 3.0573, 'Europe/Paris'],
  ['Toulouse', 'France', 43.6047, 1.4442, 'Europe/Paris'],
  ['Nice', 'France', 43.7102, 7.262, 'Europe/Paris'],
  ['Strasbourg', 'France', 48.5734, 7.7521, 'Europe/Paris'],
  ['Brussels', 'Belgium', 50.8503, 4.3517, 'Europe/Brussels'],
  ['Amsterdam', 'Netherlands', 52.3676, 4.9041, 'Europe/Amsterdam'],
  ['Rotterdam', 'Netherlands', 51.9244, 4.4777, 'Europe/Amsterdam'],
  ['The Hague', 'Netherlands', 52.0705, 4.3007, 'Europe/Amsterdam'],
  ['Utrecht', 'Netherlands', 52.0907, 5.1214, 'Europe/Amsterdam'],
  ['Eindhoven', 'Netherlands', 51.4416, 5.4697, 'Europe/Amsterdam'],
  ['Berlin', 'Germany', 52.52, 13.405, 'Europe/Berlin'],
  ['Frankfurt', 'Germany', 50.1109, 8.6821, 'Europe/Berlin'],
  ['Munich', 'Germany', 48.1351, 11.582, 'Europe/Berlin'],
  ['Hamburg', 'Germany', 53.5511, 9.9937, 'Europe/Berlin'],
  ['Cologne', 'Germany', 50.9375, 6.9603, 'Europe/Berlin'],
  ['Stuttgart', 'Germany', 48.7758, 9.1829, 'Europe/Berlin'],
  ['Madrid', 'Spain', 40.4168, -3.7038, 'Europe/Madrid'],
  ['Barcelona', 'Spain', 41.3874, 2.1686, 'Europe/Madrid'],
  ['Rome', 'Italy', 41.9028, 12.4964, 'Europe/Rome'],
  ['Milan', 'Italy', 45.4642, 9.19, 'Europe/Rome'],
  ['Geneva', 'Switzerland', 46.2044, 6.1432, 'Europe/Zurich'],
  ['Zurich', 'Switzerland', 47.3769, 8.5417, 'Europe/Zurich'],
  ['Stockholm', 'Sweden', 59.3293, 18.0686, 'Europe/Stockholm'],
  ['Malmö', 'Sweden', 55.605, 13.0038, 'Europe/Stockholm'],
  ['Oslo', 'Norway', 59.9139, 10.7522, 'Europe/Oslo'],
  ['Copenhagen', 'Denmark', 55.6761, 12.5683, 'Europe/Copenhagen'],
  ['Vienna', 'Austria', 48.2082, 16.3738, 'Europe/Vienna'],
  ['Lisbon', 'Portugal', 38.7223, -9.1393, 'Europe/Lisbon'],
  ['Dublin', 'Ireland', 53.3498, -6.2603, 'Europe/Dublin'],
  ['Warsaw', 'Poland', 52.2297, 21.0122, 'Europe/Warsaw'],
  ['Moscow', 'Russia', 55.7558, 37.6173, 'Europe/Moscow'],
  ['Kazan', 'Russia', 55.7963, 49.1088, 'Europe/Moscow'],
  ['Kyiv', 'Ukraine', 50.4501, 30.5234, 'Europe/Kyiv'],
  ['Sarajevo', 'Bosnia and Herzegovina', 43.8563, 18.4131, 'Europe/Sarajevo'],
  ['Tirana', 'Albania', 41.3275, 19.8187, 'Europe/Tirane'],
  ['Pristina', 'Kosovo', 42.6629, 21.1655, 'Europe/Belgrade'],
  ['Athens', 'Greece', 37.9838, 23.7275, 'Europe/Athens'],
  // Americas
  ['New York', 'United States', 40.7128, -74.006, 'America/New_York'],
  ['Chicago', 'United States', 41.8781, -87.6298, 'America/Chicago'],
  ['Los Angeles', 'United States', 34.0522, -118.2437, 'America/Los_Angeles'],
  ['Houston', 'United States', 29.7604, -95.3698, 'America/Chicago'],
  ['Detroit', 'United States', 42.3314, -83.0458, 'America/Detroit'],
  ['Washington', 'United States', 38.9072, -77.0369, 'America/New_York'],
  ['Miami', 'United States', 25.7617, -80.1918, 'America/New_York'],
  ['Dallas', 'United States', 32.7767, -96.797, 'America/Chicago'],
  ['Atlanta', 'United States', 33.749, -84.388, 'America/New_York'],
  ['Toronto', 'Canada', 43.6532, -79.3832, 'America/Toronto'],
  ['Montreal', 'Canada', 45.5019, -73.5674, 'America/Toronto'],
  ['Vancouver', 'Canada', 49.2827, -123.1207, 'America/Vancouver'],
  ['Ottawa', 'Canada', 45.4215, -75.6972, 'America/Toronto'],
  ['Calgary', 'Canada', 51.0447, -114.0719, 'America/Edmonton'],
  ['Mexico City', 'Mexico', 19.4326, -99.1332, 'America/Mexico_City'],
  ['São Paulo', 'Brazil', -23.5505, -46.6333, 'America/Sao_Paulo'],
  ['Buenos Aires', 'Argentina', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'],
  // Asia-Pacific
  ['Karachi', 'Pakistan', 24.8607, 67.0011, 'Asia/Karachi'],
  ['Lahore', 'Pakistan', 31.5204, 74.3587, 'Asia/Karachi'],
  ['Islamabad', 'Pakistan', 33.6844, 73.0479, 'Asia/Karachi'],
  ['Delhi', 'India', 28.6139, 77.209, 'Asia/Kolkata'],
  ['Mumbai', 'India', 19.076, 72.8777, 'Asia/Kolkata'],
  ['Hyderabad', 'India', 17.385, 78.4867, 'Asia/Kolkata'],
  ['Dhaka', 'Bangladesh', 23.8103, 90.4125, 'Asia/Dhaka'],
  ['Jakarta', 'Indonesia', -6.2088, 106.8456, 'Asia/Jakarta'],
  ['Surabaya', 'Indonesia', -7.2575, 112.7521, 'Asia/Jakarta'],
  ['Kuala Lumpur', 'Malaysia', 3.139, 101.6869, 'Asia/Kuala_Lumpur'],
  ['Singapore', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore'],
  ['Manila', 'Philippines', 14.5995, 120.9842, 'Asia/Manila'],
  ['Bangkok', 'Thailand', 13.7563, 100.5018, 'Asia/Bangkok'],
  ['Hanoi', 'Vietnam', 21.0278, 105.8342, 'Asia/Ho_Chi_Minh'],
  ['Beijing', 'China', 39.9042, 116.4074, 'Asia/Shanghai'],
  ['Shanghai', 'China', 31.2304, 121.4737, 'Asia/Shanghai'],
  ['Ürümqi', 'China', 43.8256, 87.6168, 'Asia/Urumqi'],
  ['Hong Kong', 'China', 22.3193, 114.1694, 'Asia/Hong_Kong'],
  ['Tokyo', 'Japan', 35.6762, 139.6503, 'Asia/Tokyo'],
  ['Seoul', 'South Korea', 37.5665, 126.978, 'Asia/Seoul'],
  ['Almaty', 'Kazakhstan', 43.222, 76.8512, 'Asia/Almaty'],
  ['Tashkent', 'Uzbekistan', 41.2995, 69.2401, 'Asia/Tashkent'],
  ['Baku', 'Azerbaijan', 40.4093, 49.8671, 'Asia/Baku'],
  ['Tbilisi', 'Georgia', 41.7151, 44.8271, 'Asia/Tbilisi'],
  ['Yerevan', 'Armenia', 40.1792, 44.4991, 'Asia/Yerevan'],
  ['Sydney', 'Australia', -33.8688, 151.2093, 'Australia/Sydney'],
  ['Melbourne', 'Australia', -37.8136, 144.9631, 'Australia/Melbourne'],
  ['Auckland', 'New Zealand', -36.8485, 174.7633, 'Pacific/Auckland'],
];

export const CITIES = RAW.map(([name, country, lat, lon, tz]) => ({
  name,
  country,
  lat,
  lon,
  tz,
}));

const normalize = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/** Simple, accent-insensitive city search. */
export function searchCities(query, limit = 8) {
  const q = normalize(query);
  if (!q) return CITIES.slice(0, limit);
  const starts = [];
  const contains = [];
  for (const city of CITIES) {
    const name = normalize(city.name);
    const country = normalize(city.country);
    if (name.startsWith(q)) starts.push(city);
    else if (name.includes(q) || country.includes(q)) contains.push(city);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit);
}

export function findCity(name) {
  return CITIES.find((city) => city.name === name) || null;
}

/** Best-effort guess of the timezone from coordinates (offset only, no DST id). */
export function guessTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
