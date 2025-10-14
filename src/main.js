import { places } from './places.js';


mapboxgl.accessToken = 'pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbTBnbWJ3ZGwwMXdqMnFyMXlxY3FsaTJ6In0.TWo-dOdTkiREW-ugZQevpw';

let map, autoRotate = true, bearing = 0;
const ROTATE_SPEED = 0.1;
let searchTimeout, markersList = [];
let isDarkMode = true;
let distanceMode = false;
let distancePoints = [];

// Particle effektlari
function createParticles() {
  const container = document.getElementById('particles');
  for (let i = 0; i < 30; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.width = Math.random() * 4 + 2 + 'px';
    particle.style.height = particle.style.width;
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 15 + 's';
    particle.style.animationDuration = Math.random() * 10 + 10 + 's';
    container.appendChild(particle);
  }
}

function createMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [5, 80],
    zoom: 3.0,
    pitch: 55,
    bearing: 0,
    projection: 'globe',
    antialias: true,
    attributionControl: false
  });

  map.on('load', () => {
    addSkyAndFog();
    add3DBuildings();
    startRotation();
    addClickHandler();
    updateSunlight();
    updateStats();

    // ✅ foydalanuvchi aylantirsa, autoRotate to‘xtaydi
    map.on('mousedown', () => autoRotate = false);
    map.on('dragstart', () => autoRotate = false);
    map.on('touchstart', () => autoRotate = false);

    setInterval(updateSunlight, 100000);
  });

  map.on('zoom', () => {
    showCountryLabel();
    updateStats();
  });
  map.on('pitch', updateStats);
}


function add3DBuildings() {
  const layers = map.getStyle().layers;
  const labelLayerId = layers.find(layer => layer.type === 'symbol' && layer.layout['text-field']).id;

  map.addLayer({
    'id': '3d-buildings',
    'source': 'composite',
    'source-layer': 'building',
    'filter': ['==', 'extrude', 'true'],
    'type': 'fill-extrusion',
    'minzoom': 15,
    'paint': {
      'fill-extrusion-color': '#00ffe7',
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
      'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
      'fill-extrusion-opacity': 0.6
    }
  }, labelLayerId);
}

function addSkyAndFog() {
  map.setFog({
    color: 'rgb(186, 210, 235)',
    'high-color': '#0b1d42',
    'space-color': '#000000',
    'horizon-blend': 0.1,
    'star-intensity': 0.35
  });

  map.addLayer({
    'id': 'sky',
    'type': 'sky',
    'paint': {
      'sky-type': 'atmosphere',
      'sky-atmosphere-sun': getSunPosition(),
      'sky-atmosphere-sun-intensity': 5
    }
  });
}

function startRotation() {
  function rotate() {
    if (autoRotate && map) {
      bearing = (bearing + ROTATE_SPEED) % 360;
      map.setBearing(bearing);
    }
    requestAnimationFrame(rotate);
  }
  rotate();
}

let lastClickTime = 0;

function addClickHandler() {
  // Double click zoomni o‘chirib qo‘yamiz
  map.doubleClickZoom.disable();

  // Endi ikki marta bosishda ishlaydigan event
  map.on('dblclick', (e) => {
    if (distanceMode) {
      addDistancePoint(e.lngLat);
    } else {
      const coords = e.lngLat;
      addPin(
        '📍 Koordinata',
        coords,
        '#00ffe7',
        `${coords.lng.toFixed(4)}, ${coords.lat.toFixed(4)}`
      );
    }
  });
}


function addDistancePoint(coords) {
  distancePoints.push(coords);

  new mapboxgl.Marker({ color: '#ff00ff' })
    .setLngLat(coords)
    .addTo(map);

  if (distancePoints.length === 2) {
    const dist = turf.distance(
      [distancePoints[0].lng, distancePoints[0].lat],
      [distancePoints[1].lng, distancePoints[1].lat]
    );
    document.getElementById('distanceValue').textContent = dist.toFixed(2) + ' km';
    document.getElementById('distanceTool').style.display = 'block';
  }
}

window.clearDistance = function () {
  distancePoints = [];
  document.getElementById('distanceTool').style.display = 'none';
}

function updateSunlight() {
  if (!map || !map.getLayer('sky')) return;
  map.setPaintProperty('sky', 'sky-atmosphere-sun', getSunPosition());
}

function getSunPosition() {
  const now = new Date();
  const center = map.getCenter();
  const sunPos = SunCalc.getPosition(now, center.lat, center.lng);
  const sunAzimuth = sunPos.azimuth * 180 / Math.PI + 180;
  const sunAltitude = sunPos.altitude * 180 / Math.PI;
  return [sunAzimuth, sunAltitude];
}

function addPin(name, coords, color = '#ffd700', subtitle = '') {
  const marker = new mapboxgl.Marker({ color: color })
    .setLngLat(coords)
    .setPopup(new mapboxgl.Popup().setHTML(`
          <div style="color: white; font-family: Orbitron;">
            <h3 style="margin: 0 0 8px 0; color: #00ffe7;">${name}</h3>
            ${subtitle ? `<p style="margin: 0; color: #99e5ff; font-size: 12px;">${subtitle}</p>` : ''}
          </div>
        `))
    .addTo(map);

  markersList.push(marker);
  marker.togglePopup();

  if (markersList.length > 8) {
    markersList.shift().remove();
  }
  updateStats();
}

function updateStats() {
  document.getElementById('markerCount').textContent = markersList.length;
  document.getElementById('zoomLevel').textContent = map.getZoom().toFixed(1);
  document.getElementById('pitchLevel').textContent = map.getPitch().toFixed(0) + '°';
  document.getElementById('rotationStatus').textContent = autoRotate ? '✓' : '✗';
}

function showCountryLabel() {
  const label = document.getElementById('countryLabel');

  if (map.getZoom() < 3.5) {
    label.style.display = 'none';
    return;
  }

  const center = map.getCenter();
  let closest = null;
  let minDist = Infinity;

  places.filter(p => p.type === 'davlat').forEach(country => {
    const dist = Math.sqrt(Math.pow(center.lng - country.center[0], 2) + Math.pow(center.lat - country.center[1], 2));
    if (dist < minDist) {
      minDist = dist;
      closest = country;
    }
  });

  if (closest) {
    label.style.display = 'block';
    label.textContent = "🌍 " + closest.name;
  }
}

// Qidiruv
const searchInput = document.getElementById("searchInput");
const searchResult = document.getElementById("searchResult");

searchInput.addEventListener("input", function () {
  clearTimeout(searchTimeout);
  const q = searchInput.value.toLowerCase();

  if (!q || q.length < 2) {
    searchResult.style.display = "none";
    return;
  }

  searchTimeout = setTimeout(() => {
    const found = places.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.country && p.country.toLowerCase().includes(q))
    );

    if (found.length) {
      searchResult.style.display = "block";
      searchResult.innerHTML = found.map(obj =>
        `<div><a href="#" onclick="zoomSearch('${obj.name}'); return false;">
              <b>${obj.type === 'davlat' ? '🏳️' : '🏙️'}</b> ${obj.name}
              ${obj.country ? ', <span style="color:#00ffe7">' + obj.country + '</span>' : ''}
            </a></div>`
      ).join('');
    } else {
      searchResult.style.display = "block";
      searchResult.innerHTML = `<div style='padding: 15px; text-align: center; color:#ffc;'>❌ Hech nima topilmadi!</div>`;
    }
  }, 250);
});

window.zoomSearch = function (name) {
  const found = places.find(p => p.name === name);
  if (found) {
    autoRotate = false;
    map.flyTo({
      center: found.center,
      zoom: found.type === 'davlat' ? 4.5 : 11,
      pitch: 55,
      speed: 0.8
    });
    addPin(found.name, found.center, '#ffd700', found.country);
    searchInput.value = found.name;
    searchResult.style.display = "none";
    updateStats();
  }
}

// Tugmalar
document.getElementById('locBtn').addEventListener('click', function () {
  if (!navigator.geolocation) return alert('Geolokatsiya qo\'llab-quvvatlanmaydi');

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    autoRotate = false;
    map.flyTo({ center: [longitude, latitude], zoom: 14, pitch: 60 });
    addPin("📍 Sizning joylashuvingiz", [longitude, latitude], "#00ffe7");
    updateStats();
  }, err => alert('Xatolik: ' + err.message));
});

document.getElementById('resetBtn').addEventListener('click', function () {
  autoRotate = true;
  map.flyTo({ center: [0, 20], zoom: 1.7, pitch: 30, speed: 1 });
  updateStats();
});

document.getElementById('modeBtn').addEventListener('click', function () {
  isDarkMode = !isDarkMode;
  map.setStyle('mapbox://styles/mapbox/' + (isDarkMode ? 'dark-v11' : 'light-v11'));
  setTimeout(() => {
    addSkyAndFog();
    add3DBuildings();
  }, 1000);
});

document.getElementById('distanceBtn').addEventListener('click', function () {
  distanceMode = !distanceMode;
  this.style.background = distanceMode ? 'rgba(0, 255, 231, 0.4)' : 'rgba(11, 29, 66, 0.95)';
  if (!distanceMode) clearDistance();
});

// Turf.js for distance (simple implementation)
const turf = {
  distance: function (from, to) {
    const R = 6371;
    const dLat = (to[1] - from[1]) * Math.PI / 180;
    const dLon = (to[0] - from[0]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from[1] * Math.PI / 180) * Math.cos(to[1] * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
};

createParticles();
createMap();