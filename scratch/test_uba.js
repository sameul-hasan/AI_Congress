async function testUba() {
  try {
    const res = await fetch('https://luftdaten.umweltbundesamt.de/api/air-data/v4/stations/json?lang=en');
    const data = await res.json();
    const stations = Object.values(data.data || {}).filter(s => (s[1] || '').toLowerCase().includes('duisburg') || (s[2] || '').toLowerCase().includes('duisburg'));
    console.log('UBA Duisburg Stations:', stations.slice(0, 3));
  } catch (e) {
    console.error('UBA Error:', e.message);
  }
}
testUba();
