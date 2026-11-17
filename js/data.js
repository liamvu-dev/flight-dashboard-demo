// ===== Static reference data =====
const REGIONS = {
  Asia:     { color: '#22e3ff', weight: 38 },
  Europe:   { color: '#3dffb5', weight: 24 },
  Americas: { color: '#ff2e88', weight: 19 },
  Mideast:  { color: '#ff9a3c', weight: 8 },
  Africa:   { color: '#b46bff', weight: 9 },
  Oceania:  { color: '#ffe14d', weight: 2 },
};

// [IATA, lat, lng, region]
const AIRPORTS = [
  // Asia
  ['BKK', 13.69, 100.75, 'Asia'], ['HKT', 8.11, 98.31, 'Asia'], ['SGN', 10.82, 106.66, 'Asia'], ['HAN', 21.22, 105.81, 'Asia'],
  ['DAD', 16.04, 108.2, 'Asia'], ['SIN', 1.36, 103.99, 'Asia'], ['KUL', 2.75, 101.71, 'Asia'], ['CGK', -6.13, 106.66, 'Asia'],
  ['DPS', -8.75, 115.17, 'Asia'], ['SUB', -7.38, 112.79, 'Asia'], ['MNL', 14.51, 121.02, 'Asia'], ['HKG', 22.31, 113.92, 'Asia'],
  ['PEK', 40.08, 116.6, 'Asia'], ['PVG', 31.14, 121.81, 'Asia'], ['CAN', 23.39, 113.3, 'Asia'], ['CTU', 30.58, 103.95, 'Asia'],
  ['ICN', 37.46, 126.44, 'Asia'], ['NRT', 35.77, 140.39, 'Asia'], ['KIX', 34.43, 135.24, 'Asia'], ['TPE', 25.08, 121.23, 'Asia'],
  ['DEL', 28.56, 77.1, 'Asia'], ['BOM', 19.09, 72.87, 'Asia'], ['BLR', 13.2, 77.71, 'Asia'], ['CMB', 7.18, 79.88, 'Asia'],
  ['KTM', 27.7, 85.36, 'Asia'], ['RGN', 16.91, 96.13, 'Asia'], ['PNH', 11.55, 104.84, 'Asia'], ['CNX', 18.77, 98.96, 'Asia'],
  // Europe
  ['LHR', 51.47, -0.45, 'Europe'], ['CDG', 49.01, 2.55, 'Europe'], ['FRA', 50.03, 8.56, 'Europe'], ['AMS', 52.31, 4.76, 'Europe'],
  ['MAD', 40.47, -3.56, 'Europe'], ['BCN', 41.3, 2.08, 'Europe'], ['FCO', 41.8, 12.25, 'Europe'], ['MXP', 45.63, 8.72, 'Europe'],
  ['MUC', 48.35, 11.79, 'Europe'], ['ZRH', 47.46, 8.55, 'Europe'], ['VIE', 48.11, 16.57, 'Europe'], ['IST', 41.26, 28.74, 'Europe'],
  ['SVO', 55.97, 37.41, 'Europe'], ['BUD', 47.44, 19.26, 'Europe'], ['ATH', 37.94, 23.94, 'Europe'], ['CPH', 55.62, 12.66, 'Europe'],
  ['DUB', 53.42, -6.27, 'Europe'], ['LIS', 38.77, -9.13, 'Europe'], ['AGP', 36.67, -4.5, 'Europe'], ['PRG', 50.1, 14.26, 'Europe'],
  // Americas
  ['JFK', 40.64, -73.78, 'Americas'], ['LAX', 33.94, -118.41, 'Americas'], ['ORD', 41.97, -87.91, 'Americas'], ['ATL', 33.64, -84.43, 'Americas'],
  ['MIA', 25.79, -80.29, 'Americas'], ['SFO', 37.62, -122.38, 'Americas'], ['SEA', 47.45, -122.31, 'Americas'], ['DFW', 32.9, -97.04, 'Americas'],
  ['BOS', 42.36, -71.01, 'Americas'], ['YYZ', 43.68, -79.63, 'Americas'], ['YVR', 49.19, -123.18, 'Americas'], ['MEX', 19.44, -99.07, 'Americas'],
  ['CUN', 21.04, -86.87, 'Americas'], ['BOG', 4.7, -74.15, 'Americas'], ['LIM', -12.02, -77.11, 'Americas'], ['GRU', -23.43, -46.47, 'Americas'],
  ['GIG', -22.81, -43.25, 'Americas'], ['EZE', -34.82, -58.54, 'Americas'], ['SCL', -33.39, -70.79, 'Americas'], ['PTY', 9.07, -79.38, 'Americas'],
  ['LGA', 40.78, -73.87, 'Americas'], ['MCO', 28.43, -81.31, 'Americas'],
  // Middle East
  ['DXB', 25.25, 55.36, 'Mideast'], ['DOH', 25.27, 51.61, 'Mideast'], ['AUH', 24.43, 54.65, 'Mideast'], ['RUH', 24.96, 46.7, 'Mideast'],
  ['JED', 21.68, 39.16, 'Mideast'], ['TLV', 32.01, 34.89, 'Mideast'], ['MCT', 23.59, 58.28, 'Mideast'],
  // Africa
  ['CAI', 30.12, 31.41, 'Africa'], ['JNB', -26.14, 28.25, 'Africa'], ['CPT', -33.97, 18.6, 'Africa'], ['ADD', 8.98, 38.8, 'Africa'],
  ['NBO', -1.32, 36.93, 'Africa'], ['LOS', 6.58, 3.32, 'Africa'], ['CMN', 33.37, -7.59, 'Africa'], ['ACC', 5.6, -0.17, 'Africa'],
  // Oceania
  ['SYD', -33.94, 151.18, 'Oceania'], ['MEL', -37.67, 144.84, 'Oceania'], ['BNE', -27.38, 153.12, 'Oceania'], ['AKL', -37.01, 174.79, 'Oceania'],
  ['ADL', -34.95, 138.53, 'Oceania'], ['PER', -31.94, 115.97, 'Oceania'],
].map(([code, lat, lng, region]) => ({ code, lat, lng, region }));

const AIRLINES = [
  { code: 'TG', name: 'Thai Airways', color: ['#1fd1f9', '#22e3ff'] },
  { code: 'SQ', name: 'Singapore Airlines', color: ['#00c6a7', '#3dffb5'] },
  { code: 'VN', name: 'Vietnam Airlines', color: ['#ff2e88', '#ff6fb1'] },
  { code: 'EK', name: 'Emirates', color: ['#ff7a18', '#ffb347'] },
  { code: 'QR', name: 'Qatar Airways', color: ['#8e2de2', '#c471ff'] },
  { code: 'CX', name: 'Cathay Pacific', color: ['#a8e000', '#e1ff4d'] },
  { code: 'LH', name: 'Lufthansa', color: ['#f7b733', '#ffe14d'] },
  { code: 'AA', name: 'American Airlines', color: ['#ff416c', '#ff7b9c'] },
  { code: 'NH', name: 'ANA', color: ['#4facfe', '#8fd3ff'] },
  { code: 'TK', name: 'Turkish Airlines', color: ['#e0e0e0', '#ffffff'] },
  { code: 'AF', name: 'Air France', color: ['#6a82fb', '#a3b4ff'] },
  { code: 'QF', name: 'Qantas', color: ['#f857a6', '#ff9ac9'] },
];
