export interface CountryLocation {
  country: string;
  lat: number;
  lon: number;
  city: string;
}

/**
 * Country-to-city mapping for IP-based location detection
 * Maps country codes to major city coordinates
 */
export const COUNTRY_COORDINATES: Record<string, CountryLocation> = {
  // North America
  'US': { country: 'US', lat: 40.7128, lon: -74.0060, city: 'New York, USA' },
  'CA': { country: 'CA', lat: 43.6532, lon: -79.3832, city: 'Toronto, Canada' },
  'MX': { country: 'MX', lat: 19.4326, lon: -99.1332, city: 'Mexico City, Mexico' },
  'GT': { country: 'GT', lat: 14.6349, lon: -90.5069, city: 'Guatemala City, Guatemala' },
  'CR': { country: 'CR', lat: 9.9281, lon: -84.0907, city: 'San José, Costa Rica' },
  'PA': { country: 'PA', lat: 8.9824, lon: -79.5237, city: 'Panama City, Panama' },
  'CU': { country: 'CU', lat: 23.1136, lon: -82.3666, city: 'Havana, Cuba' },
  'DO': { country: 'DO', lat: 18.4861, lon: -69.9312, city: 'Santo Domingo, Dominican Republic' },
  'HT': { country: 'HT', lat: 18.5944, lon: -72.3074, city: 'Port-au-Prince, Haiti' },
  'JM': { country: 'JM', lat: 17.9714, lon: -76.7931, city: 'Kingston, Jamaica' },
  'BB': { country: 'BB', lat: 13.1132, lon: -59.6239, city: 'Bridgetown, Barbados' },
  'TT': { country: 'TT', lat: 10.6918, lon: -61.2225, city: 'Port of Spain, Trinidad and Tobago' },
  'BS': { country: 'BS', lat: 25.0343, lon: -77.3963, city: 'Nassau, Bahamas' },
  'BZ': { country: 'BZ', lat: 17.2510, lon: -88.7740, city: 'Belmopan, Belize' },
  'SV': { country: 'SV', lat: 13.6989, lon: -89.1914, city: 'San Salvador, El Salvador' },
  'HN': { country: 'HN', lat: 14.0723, lon: -87.1921, city: 'Tegucigalpa, Honduras' },
  'NI': { country: 'NI', lat: 12.1149, lon: -86.2362, city: 'Managua, Nicaragua' },

  // South America
  'BR': { country: 'BR', lat: -23.5505, lon: -46.6333, city: 'São Paulo, Brazil' },
  'AR': { country: 'AR', lat: -34.6037, lon: -58.3816, city: 'Buenos Aires, Argentina' },
  'CL': { country: 'CL', lat: -33.4489, lon: -70.6693, city: 'Santiago, Chile' },
  'CO': { country: 'CO', lat: 4.7110, lon: -74.0721, city: 'Bogotá, Colombia' },
  'PE': { country: 'PE', lat: -12.0464, lon: -77.0428, city: 'Lima, Peru' },
  'VE': { country: 'VE', lat: 10.4806, lon: -66.9036, city: 'Caracas, Venezuela' },
  'EC': { country: 'EC', lat: -0.1807, lon: -78.4678, city: 'Quito, Ecuador' },
  'BO': { country: 'BO', lat: -16.2902, lon: -63.5887, city: 'Sucre, Bolivia' },
  'PY': { country: 'PY', lat: -25.2637, lon: -57.5759, city: 'Asunción, Paraguay' },
  'UY': { country: 'UY', lat: -34.9011, lon: -56.1645, city: 'Montevideo, Uruguay' },
  'GY': { country: 'GY', lat: 6.8013, lon: -58.1551, city: 'Georgetown, Guyana' },
  'SR': { country: 'SR', lat: 5.8664, lon: -55.1668, city: 'Paramaribo, Suriname' },
  'GF': { country: 'GF', lat: 4.9333, lon: -52.3333, city: 'Cayenne, French Guiana' },

  // Europe
  'GB': { country: 'GB', lat: 51.5074, lon: -0.1278, city: 'London, UK' },
  'DE': { country: 'DE', lat: 52.5200, lon: 13.4050, city: 'Berlin, Germany' },
  'FR': { country: 'FR', lat: 48.8566, lon: 2.3522, city: 'Paris, France' },
  'IT': { country: 'IT', lat: 41.9028, lon: 12.4964, city: 'Rome, Italy' },
  'ES': { country: 'ES', lat: 40.4168, lon: -3.7038, city: 'Madrid, Spain' },
  'NL': { country: 'NL', lat: 52.3676, lon: 4.9041, city: 'Amsterdam, Netherlands' },
  'BE': { country: 'BE', lat: 50.8503, lon: 4.3517, city: 'Brussels, Belgium' },
  'CH': { country: 'CH', lat: 46.2044, lon: 6.1432, city: 'Bern, Switzerland' },
  'AT': { country: 'AT', lat: 48.2082, lon: 16.3738, city: 'Vienna, Austria' },
  'SE': { country: 'SE', lat: 59.3293, lon: 18.0686, city: 'Stockholm, Sweden' },
  'NO': { country: 'NO', lat: 59.9139, lon: 10.7522, city: 'Oslo, Norway' },
  'DK': { country: 'DK', lat: 55.6761, lon: 12.5683, city: 'Copenhagen, Denmark' },
  'FI': { country: 'FI', lat: 60.1695, lon: 24.9384, city: 'Helsinki, Finland' },
  'PL': { country: 'PL', lat: 52.2297, lon: 21.0122, city: 'Warsaw, Poland' },
  'CZ': { country: 'CZ', lat: 50.0755, lon: 14.4378, city: 'Prague, Czech Republic' },
  'HU': { country: 'HU', lat: 47.4979, lon: 19.0402, city: 'Budapest, Hungary' },
  'GR': { country: 'GR', lat: 37.9838, lon: 23.7275, city: 'Athens, Greece' },
  'PT': { country: 'PT', lat: 38.7223, lon: -9.1393, city: 'Lisbon, Portugal' },
  'IE': { country: 'IE', lat: 53.3498, lon: -6.2603, city: 'Dublin, Ireland' },
  'RU': { country: 'RU', lat: 55.7558, lon: 37.6173, city: 'Moscow, Russia' },
  'UA': { country: 'UA', lat: 50.4501, lon: 30.5234, city: 'Kyiv, Ukraine' },
  'RO': { country: 'RO', lat: 44.4268, lon: 26.1025, city: 'Bucharest, Romania' },
  'BG': { country: 'BG', lat: 42.6977, lon: 23.3219, city: 'Sofia, Bulgaria' },
  'RS': { country: 'RS', lat: 44.7866, lon: 20.4489, city: 'Belgrade, Serbia' },
  'HR': { country: 'HR', lat: 45.8150, lon: 15.9785, city: 'Zagreb, Croatia' },
  'SI': { country: 'SI', lat: 46.0569, lon: 14.5058, city: 'Ljubljana, Slovenia' },
  'SK': { country: 'SK', lat: 48.1482, lon: 17.1071, city: 'Bratislava, Slovakia' },
  'EE': { country: 'EE', lat: 59.4370, lon: 24.7536, city: 'Tallinn, Estonia' },
  'LV': { country: 'LV', lat: 56.9465, lon: 24.1049, city: 'Riga, Latvia' },
  'LT': { country: 'LT', lat: 54.6892, lon: 25.2798, city: 'Vilnius, Lithuania' },
  'IS': { country: 'IS', lat: 64.1466, lon: -21.9426, city: 'Reykjavík, Iceland' },
  'MT': { country: 'MT', lat: 35.8992, lon: 14.5142, city: 'Valletta, Malta' },
  'CY': { country: 'CY', lat: 35.1856, lon: 33.3823, city: 'Nicosia, Cyprus' },
  'LU': { country: 'LU', lat: 49.6116, lon: 6.1319, city: 'Luxembourg City, Luxembourg' },
  'AD': { country: 'AD', lat: 42.5462, lon: 1.6016, city: 'Andorra la Vella, Andorra' },
  'MC': { country: 'MC', lat: 43.7347, lon: 7.4206, city: 'Monaco' },
  'LI': { country: 'LI', lat: 47.1660, lon: 9.5554, city: 'Vaduz, Liechtenstein' },
  'SM': { country: 'SM', lat: 43.9424, lon: 12.4578, city: 'San Marino' },
  'VA': { country: 'VA', lat: 41.9029, lon: 12.4534, city: 'Vatican City' },

  // Asia
  'CN': { country: 'CN', lat: 39.9042, lon: 116.4074, city: 'Beijing, China' },
  'JP': { country: 'JP', lat: 35.6895, lon: 139.6917, city: 'Tokyo, Japan' },
  'KR': { country: 'KR', lat: 37.5665, lon: 126.9780, city: 'Seoul, South Korea' },
  'IN': { country: 'IN', lat: 19.0760, lon: 72.8777, city: 'Mumbai, India' },
  'TH': { country: 'TH', lat: 13.7563, lon: 100.5018, city: 'Bangkok, Thailand' },
  'SG': { country: 'SG', lat: 1.3521, lon: 103.8198, city: 'Singapore' },
  'ID': { country: 'ID', lat: -6.2088, lon: 106.8456, city: 'Jakarta, Indonesia' },
  'PH': { country: 'PH', lat: 14.5995, lon: 120.9842, city: 'Manila, Philippines' },
  'MY': { country: 'MY', lat: 3.1390, lon: 101.6869, city: 'Kuala Lumpur, Malaysia' },
  'VN': { country: 'VN', lat: 21.0285, lon: 105.8542, city: 'Hanoi, Vietnam' },
  'HK': { country: 'HK', lat: 22.3193, lon: 114.1694, city: 'Hong Kong' },
  'TW': { country: 'TW', lat: 25.0330, lon: 121.5654, city: 'Taipei, Taiwan' },
  'TR': { country: 'TR', lat: 41.0082, lon: 28.9784, city: 'Istanbul, Turkey' },
  'IL': { country: 'IL', lat: 32.0853, lon: 34.7818, city: 'Tel Aviv, Israel' },
  'SA': { country: 'SA', lat: 24.7136, lon: 46.7219, city: 'Riyadh, Saudi Arabia' },
  'AE': { country: 'AE', lat: 25.2048, lon: 55.2708, city: 'Dubai, UAE' },
  'PK': { country: 'PK', lat: 24.8607, lon: 67.0011, city: 'Karachi, Pakistan' },
  'BD': { country: 'BD', lat: 23.8103, lon: 90.4125, city: 'Dhaka, Bangladesh' },
  'LK': { country: 'LK', lat: 6.9271, lon: 79.8612, city: 'Colombo, Sri Lanka' },
  'NP': { country: 'NP', lat: 27.7172, lon: 85.3240, city: 'Kathmandu, Nepal' },
  'BT': { country: 'BT', lat: 27.4714, lon: 89.6419, city: 'Thimphu, Bhutan' },
  'MM': { country: 'MM', lat: 16.8409, lon: 96.1952, city: 'Yangon, Myanmar' },
  'KH': { country: 'KH', lat: 11.5564, lon: 104.9282, city: 'Phnom Penh, Cambodia' },
  'LA': { country: 'LA', lat: 17.9757, lon: 102.6061, city: 'Vientiane, Laos' },
  'MN': { country: 'MN', lat: 47.8864, lon: 106.9057, city: 'Ulaanbaatar, Mongolia' },
  'KZ': { country: 'KZ', lat: 51.1605, lon: 71.4704, city: 'Nur-Sultan, Kazakhstan' },
  'UZ': { country: 'UZ', lat: 41.3111, lon: 69.2797, city: 'Tashkent, Uzbekistan' },
  'KG': { country: 'KG', lat: 42.8746, lon: 74.5698, city: 'Bishkek, Kyrgyzstan' },
  'TJ': { country: 'TJ', lat: 38.5598, lon: 68.7864, city: 'Dushanbe, Tajikistan' },
  'TM': { country: 'TM', lat: 37.9601, lon: 58.3261, city: 'Ashgabat, Turkmenistan' },
  'AF': { country: 'AF', lat: 34.5205, lon: 69.1778, city: 'Kabul, Afghanistan' },

  // Africa
  'EG': { country: 'EG', lat: 30.0444, lon: 31.2357, city: 'Cairo, Egypt' },
  'NG': { country: 'NG', lat: 6.5244, lon: 3.3792, city: 'Lagos, Nigeria' },
  'ZA': { country: 'ZA', lat: -26.2041, lon: 28.0473, city: 'Johannesburg, South Africa' },
  'KE': { country: 'KE', lat: -1.2921, lon: 36.8219, city: 'Nairobi, Kenya' },
  'MA': { country: 'MA', lat: 33.5731, lon: -7.5898, city: 'Casablanca, Morocco' },
  'ET': { country: 'ET', lat: 9.0320, lon: 38.7469, city: 'Addis Ababa, Ethiopia' },
  'GH': { country: 'GH', lat: 5.6037, lon: -0.1870, city: 'Accra, Ghana' },
  'TN': { country: 'TN', lat: 36.8065, lon: 10.1815, city: 'Tunis, Tunisia' },
  'DZ': { country: 'DZ', lat: 36.7538, lon: 3.0588, city: 'Algiers, Algeria' },
  'LY': { country: 'LY', lat: 32.8872, lon: 13.1913, city: 'Tripoli, Libya' },
  'SD': { country: 'SD', lat: 15.5007, lon: 32.5599, city: 'Khartoum, Sudan' },
  'TZ': { country: 'TZ', lat: -6.7924, lon: 39.2083, city: 'Dodoma, Tanzania' },
  'UG': { country: 'UG', lat: 0.3476, lon: 32.5825, city: 'Kampala, Uganda' },
  'RW': { country: 'RW', lat: -1.9403, lon: 30.0603, city: 'Kigali, Rwanda' },
  'BI': { country: 'BI', lat: -3.3731, lon: 29.9189, city: 'Bujumbura, Burundi' },
  'MW': { country: 'MW', lat: -13.9626, lon: 33.7704, city: 'Lilongwe, Malawi' },
  'ZM': { country: 'ZM', lat: -15.3875, lon: 28.3228, city: 'Lusaka, Zambia' },
  'ZW': { country: 'ZW', lat: -17.8292, lon: 31.0539, city: 'Harare, Zimbabwe' },
  'BW': { country: 'BW', lat: -24.6570, lon: 25.9089, city: 'Gaborone, Botswana' },
  'NA': { country: 'NA', lat: -22.5609, lon: 17.0658, city: 'Windhoek, Namibia' },
  'SZ': { country: 'SZ', lat: -26.5225, lon: 31.4659, city: 'Mbabane, Eswatini' },
  'LS': { country: 'LS', lat: -29.6100, lon: 28.2337, city: 'Maseru, Lesotho' },
  'MG': { country: 'MG', lat: -18.8792, lon: 47.5079, city: 'Antananarivo, Madagascar' },
  'MU': { country: 'MU', lat: -20.1609, lon: 57.5012, city: 'Port Louis, Mauritius' },
  'SC': { country: 'SC', lat: -4.6796, lon: 55.4915, city: 'Victoria, Seychelles' },
  'KM': { country: 'KM', lat: -11.8755, lon: 43.8722, city: 'Moroni, Comoros' },
  'RE': { country: 'RE', lat: -21.1151, lon: 55.5364, city: 'Saint-Denis, Réunion' },
  'YT': { country: 'YT', lat: -12.8275, lon: 45.1662, city: 'Mamoudzou, Mayotte' },

  // Oceania
  'AU': { country: 'AU', lat: -33.8688, lon: 151.2093, city: 'Sydney, Australia' },
  'NZ': { country: 'NZ', lat: -36.8485, lon: 174.7633, city: 'Auckland, New Zealand' },
  'FJ': { country: 'FJ', lat: -18.1248, lon: 178.4501, city: 'Suva, Fiji' },
  'PG': { country: 'PG', lat: -9.4438, lon: 147.1803, city: 'Port Moresby, Papua New Guinea' },
  'SB': { country: 'SB', lat: -9.4456, lon: 159.9725, city: 'Honiara, Solomon Islands' },
  'VU': { country: 'VU', lat: -17.7354, lon: 168.3246, city: 'Port Vila, Vanuatu' },
  'NC': { country: 'NC', lat: -22.2735, lon: 166.4584, city: 'Nouméa, New Caledonia' },
  'PF': { country: 'PF', lat: -17.5350, lon: -149.5696, city: 'Papeete, French Polynesia' },
  'WS': { country: 'WS', lat: -13.8506, lon: -171.7513, city: 'Apia, Samoa' },
  'KI': { country: 'KI', lat: 1.8709, lon: -157.3624, city: 'Tarawa, Kiribati' },
  'TO': { country: 'TO', lat: -21.1789, lon: -175.1982, city: 'Nukuʻalofa, Tonga' },
  'NR': { country: 'NR', lat: -0.5475, lon: 166.9180, city: 'Yaren District, Nauru' },
  'TV': { country: 'TV', lat: -7.1095, lon: 179.3785, city: 'Funafuti, Tuvalu' },
  'FM': { country: 'FM', lat: 7.4255, lon: 150.5508, city: 'Palikir, Federated States of Micronesia' },
  'PW': { country: 'PW', lat: 7.4848, lon: 134.5400, city: 'Ngerulmud, Palau' },
  'MH': { country: 'MH', lat: 7.1315, lon: 171.1845, city: 'Majuro, Marshall Islands' },

  // Other/Unknown
  'XX': { country: 'XX', lat: 0.0, lon: 0.0, city: 'Unknown Location' }
};

/**
 * Get country location by country code
 * @param countryCode - 2-letter country code (e.g., 'US', 'JP')
 * @returns Country location info or null if not found
 */
export function getCountryLocation(countryCode: string): CountryLocation | null {
  const code = countryCode.toUpperCase();
  return COUNTRY_COORDINATES[code] || null;
}

/**
 * Get a random country location
 * Useful as fallback when country detection fails
 * @returns Random country location
 */
export function getRandomCountryLocation(): CountryLocation {
  const countries = Object.keys(COUNTRY_COORDINATES);
  const randomCountry = countries[Math.floor(Math.random() * countries.length)];
  return COUNTRY_COORDINATES[randomCountry];
}

/**
 * Get country location or fallback to random
 * @param countryCode - 2-letter country code
 * @returns Country location (detected or random)
 */
export function getCountryLocationWithFallback(countryCode: string): CountryLocation {
  const location = getCountryLocation(countryCode);
  if (location) {
    console.log(`🌍 Country detected: ${countryCode} -> ${location.city}`);
    return location;
  }

  console.log(`❌ Country not found: ${countryCode}, using random location`);
  return getRandomCountryLocation();
}