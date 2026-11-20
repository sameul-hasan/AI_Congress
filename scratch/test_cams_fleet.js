const facilities = [
  { id: 'DU-03', name: 'Duisburg', lat: 51.4344, lng: 6.7623 },
  { id: 'RT-07', name: 'Rotterdam', lat: 51.9244, lng: 4.4777 },
  { id: 'MI-02', name: 'Milan', lat: 45.5333, lng: 9.1333 },
  { id: 'WA-04', name: 'Warsaw', lat: 52.2297, lng: 21.0122 },
  { id: 'MD-01', name: 'Madrid', lat: 40.3917, lng: -3.6529 }
];

async function check() {
  for (const f of facilities) {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${f.lat}&longitude=${f.lng}&current=pm10,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide&hourly=pm10,nitrogen_dioxide,sulphur_dioxide&domains=cams_europe&forecast_days=1`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      console.log(`[SUCCESS] ${f.id} (${f.name}):`, {
        time: data.current.time,
        SO2: data.current.sulphur_dioxide,
        NO2: data.current.nitrogen_dioxide,
        PM10: data.current.pm10,
        CO: data.current.carbon_monoxide,
        hourlyCount: data.hourly ? data.hourly.time.length : 0
      });
    } catch (e) {
      console.error(`[ERROR] ${f.id}:`, e.message);
    }
  }
}
check();
