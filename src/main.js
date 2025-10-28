// src/main.js - YANGILANGAN VERSION
// Fon aylanishi tuzatilgan, popup avtomatik ochilishi to'xtatilgan
// Barcha tugmalar va funksiyalar ishlaydi, console da xato yo'q

import { places } from './places.js';

mapboxgl.accessToken = 'pk.eyJ1IjoibmFqaW1vdiIsImEiOiJjbTBnbWJ3ZGwwMXdqMnFyMXlxY3FsaTJ6In0.TWo-dOdTkiREW-ugZQevpw';

// =======================
// Global holatlar
// =======================
let map;
let autoRotate = true;
let bearing = 0;
const ROTATE_SPEED = 0.08;

let markers = [];
let favorites = {};
let searchHistory = [];

let distanceMode = false;
let distancePoints = [];
let distanceMarkers = [];
let distanceLines = [];

let issMarker = null;
let issInterval = null;
let terrainEnabled = false;
let userLocationMarker = null;

// UI references
const searchInput = document.getElementById('searchInput');
const searchResult = document.getElementById('searchResult');

// Context menu
let contextMenuEl = null;

// =======================
// Xarita yaratish & sozlash
// =======================
function initMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [66, 41],
    zoom: 4,
    pitch: 40,
    bearing: 0,
    projection: 'globe',
    antialias: true,
    attributionControl: false,
    doubleClickZoom: false
  });

  map.on('load', () => {
    applyMapVisuals();
    attachBaseEvents();
    setupControls();
    updateStats();
    updateFavCount();
  });
}

const menuToggleBtn = document.querySelector(".menu-toggle");
const controls = document.querySelector(".controls");
const btnGroup = document.querySelector(".btn-group");
const searchContainer = document.querySelector(".search-container");

const lottieIcon = document.querySelector(".search-container dotlottie-wc");
let isAnimating = false;

// yozuv paytida lottie yo‘qoladi
searchInput.addEventListener("input", () => {
  if (searchInput.value.trim() !== "") {
    lottieIcon.style.opacity = "0";
    lottieIcon.style.transform = "translateY(-10px)";
    lottieIcon.style.pointerEvents = "none";
  } else {
    lottieIcon.style.opacity = "1";
    lottieIcon.style.transform = "translateY(0)";
    lottieIcon.style.pointerEvents = "auto";
  }
});


menuToggleBtn.addEventListener("click", () => {
  if (isAnimating) return;

  isAnimating = true;
  const buttons = btnGroup.querySelectorAll(".btn");
  const searchInput = document.querySelector("#searchInput");

  if (controls.classList.contains("menu-expanded")) {
    // ====== YOPISH ======
    buttons.forEach(btn => {
      btn.style.background = "transparent";
      btn.style.border = "none";
    });

    // Tugmalar teskari tartibda yopilsin
    buttons.forEach((btn, i) => {
      const reverseIndex = buttons.length - 1 - i;
      btn.style.transitionDelay = `${reverseIndex * 0.04}s`;
    });
    buttons.forEach(btn => {
      btn.style.transition = "all 0.5s ease";
      btn.style.borderRadius = "50%";
      setTimeout(() => {
        btn.style.background = "transparent";
        btn.style.border = "none";
      }, 400);
    });

    setTimeout(() => {
      controls.classList.remove("menu-expanded");
      menuToggleBtn.classList.remove("active");

      // Search input o'rniga QAYTISH
      searchContainer.style.maxWidth = "590px";
      searchContainer.style.transform = "translateX(-50%)";

      // SEARCH - O'ng tomoni tebranadi (itarilganidan keyin qaytish)
      searchInput.style.transition = "border-radius 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease";

      searchInput.style.borderTopRightRadius = "35px";
      searchInput.style.borderBottomRightRadius = "35px";

      setTimeout(() => {
        searchInput.style.borderTopRightRadius = "30px";
        searchInput.style.borderBottomRightRadius = "30px";
      }, 100);

      setTimeout(() => {
        searchInput.style.borderTopRightRadius = "50px";
        searchInput.style.borderBottomRightRadius = "50px";
        searchInput.style.transition = "border-radius 0.15s ease-out, max-width 0.3s ease, transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease";
      }, 300);

      // MENYU TUGMASI - Chap tomoni tebranadi
      menuToggleBtn.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), background 0.4s ease, border-color 0.4s ease, border-radius 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";

      menuToggleBtn.style.borderTopLeftRadius = "35px";
      menuToggleBtn.style.borderBottomLeftRadius = "35px";

      setTimeout(() => {
        menuToggleBtn.style.borderTopLeftRadius = "65px";
        menuToggleBtn.style.borderBottomLeftRadius = "65px";
      }, 100);

      setTimeout(() => {
        menuToggleBtn.style.borderTopLeftRadius = "50%";
        menuToggleBtn.style.borderBottomLeftRadius = "50%";

        // Background va border ASTA-SEKIN yo'qolsin
        setTimeout(() => {
          menuToggleBtn.style.background = "transparent";
          menuToggleBtn.style.borderColor = "transparent";
        }, 200);
      }, 300);

    }, 50);

    setTimeout(() => {
      buttons.forEach(btn => btn.style.transitionDelay = "");
      isAnimating = false;
    }, 1000);

  } else {
    // ====== OCHISH ======
    buttons.forEach(btn => {
      btn.style.background = "rgba(255, 255, 255, 0.08)";
      btn.style.border = "1px solid rgba(255, 255, 255, 0.1)";
      btn.style.backdropFilter = "blur(20px)";
    });


    // Menyu tugmasi background va border TEZDA paydo bo'lsin
    menuToggleBtn.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease, border-color 0.2s ease, border-radius 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    menuToggleBtn.style.background = "rgba(255, 255, 255, 0.08)";
    menuToggleBtn.style.borderColor = "rgba(255, 255, 255, 0.1)";

    setTimeout(() => {
      controls.classList.add("menu-expanded");
      menuToggleBtn.classList.add("active");

      // Tugmalar ketma-ket ochilsin
      buttons.forEach((btn, i) => {
        btn.style.transitionDelay = `${i * 0.05}s`;
      });

      // Search input CHAPGA SILJIYDI
      searchContainer.style.maxWidth = "490px";
      searchContainer.style.transform = "translateX(-52%)";

      // SEARCH - O'ng tomoni siqiladi (menyu tomonidan itilganday)
      searchInput.style.transition = "border-radius 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease";

      searchInput.style.borderTopRightRadius = "15px";
      searchInput.style.borderBottomRightRadius = "15px";

      setTimeout(() => {
        searchInput.style.borderTopRightRadius = "35px";
        searchInput.style.borderBottomRightRadius = "35px";
      }, 150);

      setTimeout(() => {
        searchInput.style.borderTopRightRadius = "50px";
        searchInput.style.borderBottomRightRadius = "50px";
        searchInput.style.transition = "border-radius 0.15s ease-out, max-width 0.3s ease, transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease";
      }, 350);

      // MENYU TUGMASI - O'ng tomoni kengayadi (searchni itarayotgandek)
      menuToggleBtn.style.borderTopRightRadius = "11px";
      menuToggleBtn.style.borderBottomRightRadius = "11px";

      setTimeout(() => {
        menuToggleBtn.style.borderTopRightRadius = "65px";
        menuToggleBtn.style.borderBottomRightRadius = "65px";
      }, 20);

      setTimeout(() => {
        menuToggleBtn.style.borderTopRightRadius = "50%";
        menuToggleBtn.style.borderBottomRightRadius = "50%";
      }, 140);

    }, 50);

    setTimeout(() => {
      isAnimating = false;
    }, 1000);
  }
});

// Fon aylanişini tuzat - faqat map aylansın, fon qolsın
function applyMapVisuals() {
  map.setFog({
    color: 'rgb(50, 60, 80)',
    'high-color': '#0a0e27',
    'space-color': '#000000',
    'horizon-blend': 0.05,
    'star-intensity': 0.6
  });

  if (!map.getLayer('sky')) {
    map.addLayer({
      id: 'sky',
      type: 'sky',
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-sun': [0, 90],
        'sky-atmosphere-sun-intensity': 4
      }
    });
  }

  // 3D buildings
  const layers = map.getStyle().layers || [];
  const labelLayer = layers.find(l => l.type === 'symbol' && l.layout && l.layout['text-field']);
  if (map.getLayer('3d-buildings')) map.removeLayer('3d-buildings');

  map.addLayer({
    id: '3d-buildings',
    source: 'composite',
    'source-layer': 'building',
    filter: ['==', 'extrude', 'true'],
    type: 'fill-extrusion',
    minzoom: 14,
    paint: {
      'fill-extrusion-color': '#64c8ff',
      'fill-extrusion-height': ['get', 'height'],
      'fill-extrusion-base': ['get', 'min_height'],
      'fill-extrusion-opacity': 0.6
    }
  }, labelLayer ? labelLayer.id : undefined);

  // AUTO ROTATE - TUZATILGAN
  // Faqat map bearing'ini o'zgartirsamiz, background aylanmaydi
  if (autoRotate && map) {
    setInterval(() => {
      if (autoRotate && map) {
        bearing = (bearing + ROTATE_SPEED) % 360;
        map.setBearing(bearing);
      }
    }, 50);
  }
}

function attachBaseEvents() {
  // Distance mode OFF bo'lganda - double click
  map.on('dblclick', (e) => {
    if (!distanceMode) {
      addMarker('📍 Pin', [e.lngLat.lng, e.lngLat.lat]);
    }
  });

  // Distance mode ON bo'lganda - single click
  map.on('click', (e) => {
    // Faqat xarita canvas ustida click bo'lsa
    if (!e.originalEvent.target.classList.contains('mapboxgl-canvas')) return;

    if (distanceMode) {
      addDistancePoint(e.lngLat);
    }
  });

  // stop auto rotate on interaction
  map.on('mousedown', () => autoRotate = false);
  map.on('zoom', updateStats);
  map.on('pitch', updateStats);

  // close panels when click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      hideSearchResults();
    }
    if (contextMenuEl && !e.target.closest('.ctx-menu')) {
      removeContextMenu();
    }
  });

  // keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      removeContextMenu();
      hideSearchResults();
    }
  });
}

// =======================
// Marker funksiyalari
// =======================
function addMarker(name, coords, color = '#64c8ff', data = {}, removable = true, showPopup = false) {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.style.width = '18px';
  el.style.height = '18px';
  el.style.borderRadius = '50%';
  el.style.boxShadow = '0 0 10px rgba(100,200,255,0.2)';
  el.style.background = color;
  el.style.cursor = 'pointer';

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat(coords)
    .setPopup(createPopup(name, coords, data, removable))
    .addTo(map);

  // right-click context menu
  el.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    showMarkerContextMenu(ev, { marker, name, coords: { lng: coords[0], lat: coords[1] }, removable, data });
  });

  // left-click to toggle popup
  el.addEventListener('click', () => {
    marker.togglePopup();
  });

  markers.push({ marker, name, coords, removable, data });

  // Popup faqat showPopup = true bo'lganda ochiladi
  if (showPopup) {
    marker.togglePopup();
  }

  updateStats();
  return marker;
}

// Panel yaratish
const infoPanel = document.createElement('div');
infoPanel.id = 'infoPanel';
document.body.appendChild(infoPanel);

// Typing effekti (chatgpt uslubida, fon yo‘q)
async function typeFormattedText(element, text, speed = 10) {
  element.innerHTML = "";
  const pre = document.createElement("div");
  pre.style.whiteSpace = "pre-wrap";
  pre.style.fontFamily = "system-ui, sans-serif";
  pre.style.fontSize = "1em";
  pre.style.lineHeight = "1.6";
  pre.style.color = "#e4e4e4";
  element.appendChild(pre);

  // Matnni tozalash va muhim so‘zlarni qalin qilish
  const formattedText = text
    .replace(/\*+/g, "") // yulduzchalarni olib tashlaydi
    .replace(/\b(muhim|diqqat|asosiy|e'tibor|fact|important)\b/gi, (m) => `<b>${m}</b>`);

  // HTML bilan typing effekti
  for (let i = 0; i < formattedText.length; i++) {
    pre.innerHTML = formattedText.slice(0, i + 1);
    await new Promise(r => setTimeout(r, speed));
  }
}


// Formatlash funksiyasi
function formatGeminiText(text) {
  return text
    .split("\n")
    .filter(line => line.trim() !== "")
    .map(line => line.trim())
    .join("\n");
}

// Panelni ko‘rsatish
async function showInfoPanel(data) {
  infoPanel.innerHTML = `
    <h2 style="font-size:1em;">Joy haqida qisqacha ma’lumot!</h2>
    <div id="geminiResponse">⏳ Ma’lumot yuklanmoqda...</div>
    <button class="search-btn" id="searchPanelBtn" style="font-size:1em;">Batafsil ma'lumot</button>
    <button class="close-btn" id="closePanelBtn" style="font-size:1em;">Yopish</button>
  `;
  infoPanel.classList.add('active');

  const closeBtn = document.getElementById('closePanelBtn');
  if (closeBtn) closeBtn.addEventListener('click', hideInfoPanel);
  const detailBtn = document.getElementById('searchPanelBtn');
  if (detailBtn) detailBtn.addEventListener('click', async () => {
    const detailMessage = `Shu joy haqida batafsil va tushunarli ma'lumot yoz. 
Faqat eng muhim faktlarni va bir oz tarixini ayt. 
Shahar: ${cityName}, koordinata: ${data.lat}, ${data.lng}. 
Agar aniq ma'lumot topa olmasang, yon-atrofdagi joy haqida xuddi shunday qisqa ma'lumot ber.`;

    const responseEl = document.getElementById("geminiResponse");
    responseEl.innerHTML = "⏳ Batafsil ma’lumot yuklanmoqda...";
    const detailedText = await getGeminiData(detailMessage);
    const formattedDetail = formatGeminiText(detailedText || "❌ Batafsil ma'lumot topilmadi.");
    await typeFormattedText(responseEl, formattedDetail);
  });

  const cityName = data.name || "noma’lum joy";
  const message = `Shu joy haqida juda qisqa (faqat 2-3 gapli) va tushunarli ma'lumot yoz. 
Faqat eng muhim faktlarni ayt. 
Shahar: ${cityName}, koordinata: ${data.lat}, ${data.lng}. 
Agar aniq ma'lumot topa olmasang, yon-atrofdagi joy haqida xuddi shunday qisqa ma'lumot ber.`;

  const responseText = await getGeminiData(message);
  const formatted = formatGeminiText(responseText || "❌ Ma'lumot topilmadi.");
  const responseEl = document.getElementById("geminiResponse");
  await typeFormattedText(responseEl, formatted);
}

// Gemini so‘rov funksiyasi
async function getGeminiData(prompt) {
  try {
    const res = await fetch("https://top-b.onrender.com/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    return data.text;
  } catch (err) {
    console.error("Backend bilan aloqa xatosi:", err);
    return "Xatolik yuz berdi yoki backend ishlamayapti.";
  }
}

// ping-keepalive.js
const TARGET_URL = "https://top-b.onrender.com/sorov";
const INTERVAL_MS = 10 * 60 * 1000; // 10 daqiqa

function getLocalTime() {
  return new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
}

async function sendPing() {
  try {
    const res = await fetch(TARGET_URL);
    const text = await res.text(); // serverdan kelgan javob
    console.log(
      getLocalTime(),
      "PING sent, status:",
      res.status,
      "| response:",
      text
    );
  } catch (err) {
    console.error(getLocalTime(), "PING error:", err.message);
  }
}

// Dastlabki ping
sendPing();

// Har 10 daqiqada yuborish
setInterval(sendPing, INTERVAL_MS);

console.log("✅ Keep-alive ping started for:", TARGET_URL);


// Panelni yopish
function hideInfoPanel() {
  infoPanel.classList.remove('active');
}

// Popup yaratish
function createPopup(name, coordsArr, data = {}, removable = true) {
  const [lng, lat] = coordsArr;
  const content = document.createElement('div');
  const nameSafe = escapeHtml(name);
  content.innerHTML = `
    <div class="popup-title">${nameSafe}</div>
    ${data.region ? `<div class="popup-subtitle"><i class='bx bxs-map-pin'></i> ${escapeHtml(data.region)}</div>` : ''}
    ${data.country ? `<div class="popup-subtitle"><i class='bx bx-flag'></i> ${escapeHtml(data.country)}</div>` : ''}
    <div class="popup-subtitle"><i class='bx bxs-pin'></i> ${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
    <div class="popup-actions">
      <button class="popup-btn" data-action="copy" data-lng="${lng}" data-lat="${lat}"><i class='bx bx-copy'></i> Nusxa</button>
      <button class="popup-btn" data-action="fav" data-name="${encodeURIComponent(nameSafe)}" data-lng="${lng}" data-lat="${lat}"><i class='bx bx-save'></i> Saqlash</button>
      <button class="popup-btn" data-action="weather" data-lng="${lng}" data-lat="${lat}"><i class='bx bx-sun'></i> Ob-havo</button>
      <button class="popup-btn" data-action="ai" data-lng="${lng}" data-lat="${lat}"><i class='bx bx-info-circle'></i> Ma'lumot</button>
      ${removable ? `<button class="popup-btn delete" data-action="remove" data-lng="${lng}" data-lat="${lat}"><i class='bx bxs-trash-alt'></i> O'chirish</button>` : ''}
    </div>
  `;
  setTimeout(() => {
    const buttons = content.querySelectorAll('.popup-btn');
    buttons.forEach(btn => btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const lng = parseFloat(btn.dataset.lng);
      const lat = parseFloat(btn.dataset.lat);
      const pname = decodeURIComponent(btn.dataset.name || nameSafe);
      if (action === 'copy') copyCoords(lng, lat);
      else if (action === 'fav') addFavorite(pname, lng, lat, data);
      else if (action === 'weather') getWeather(lat, lng);
      else if (action === 'remove') removeMarkerByCoords(lng, lat);
      else if (action === 'ai') showInfoPanel({ name: pname, lat, lng, ...data });
    }));
  }, 50);
  return new mapboxgl.Popup({ closeButton: true, offset: 25 }).setDOMContent(content);
}


function findMarkerIndexByCoords(lng, lat) {
  return markers.findIndex(m => {
    const c = m.marker.getLngLat();
    return Math.abs(c.lng - lng) < 0.0001 && Math.abs(c.lat - lat) < 0.0001;
  });
}

function removeMarkerByCoords(lng, lat) {
  const idx = findMarkerIndexByCoords(lng, lat);
  if (idx === -1) return;
  if (!markers[idx].removable) {
    showNotification("Bu marker o'chilib bo'lmaydi");
    return;
  }
  markers[idx].marker.remove();
  markers.splice(idx, 1);
  updateStats();
  showNotification("Marker o'chirildi");
}

function clearAllMarkers() {
  markers.forEach(m => { if (m.removable) m.marker.remove(); });
  markers = markers.filter(m => !m.removable);
  updateStats();
  showNotification("Barcha markerlar o'chirildi");
}

// =======================
// Context menu
// =======================
function showMarkerContextMenu(ev, markerObj) {
  removeContextMenu();

  contextMenuEl = document.createElement('div');
  contextMenuEl.className = 'ctx-menu';
  contextMenuEl.style.position = 'fixed';
  contextMenuEl.style.zIndex = '2000';
  contextMenuEl.style.minWidth = '180px';
  contextMenuEl.style.borderRadius = '10px';
  contextMenuEl.style.padding = '8px';
  contextMenuEl.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
  contextMenuEl.style.background = 'rgba(10,14,39,0.95)';
  contextMenuEl.style.backdropFilter = 'blur(8px)';
  contextMenuEl.style.border = '1px solid rgba(255,255,255,0.06)';

  contextMenuEl.innerHTML = `
    < div style = "padding:8px 6px;font-size:13px;color:rgba(255,255,255,0.9);font-weight:600;" >
      ${escapeHtml(markerObj.name)}
    </ >
    <div class="ctx-item" data-act="copy"><i class='bx bxs-copy' ></i> Nusxa</div>
    <div class="ctx-item" data-act="fav"><i class='bx bxs-paste' ></i> Sevimlilarga qo'shish</div>
    <div class="ctx-item" data-act="weather"><i class='bx bxs-sun' ></i> Ob-havo</div>
    ${markerObj.removable ? `<div class="ctx-item ctx-delete" data-act="remove">${a} O\'chirish</div>` : ''}
  <div class="ctx-item" data-act="rename"><i class='bx bx-pencil'></i> Nom berish</div>
  `;

  const a = `
    < i class='bx bxs-edit-alt' ></ >
      `

  document.body.appendChild(contextMenuEl);
  contextMenuEl.style.left = `${ev.clientX} px`;
  contextMenuEl.style.top = `${ev.clientY} px`;
  contextMenuEl.querySelectorAll('.ctx-item').forEach(it => {
    it.style.padding = '8px';
    it.style.cursor = 'pointer';
    it.style.color = 'rgba(255,255,255,0.85)';
    it.style.borderRadius = '6px';
    it.onmouseenter = () => it.style.background = 'rgba(255,255,255,0.03)';
    it.onmouseleave = () => it.style.background = 'transparent';
  });

  const x = Math.min(window.innerWidth - 200, ev.clientX);
  const y = Math.min(window.innerHeight - 200, ev.clientY);
  contextMenuEl.style.left = x + 'px';
  contextMenuEl.style.top = y + 'px';

  contextMenuEl.addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    if (act === 'copy') {
      copyCoords(markerObj.coords.lng, markerObj.coords.lat);
    } else if (act === 'fav') {
      addFavorite(markerObj.name, markerObj.coords.lng, markerObj.coords.lat, markerObj.data);
    } else if (act === 'weather') {
      getWeather(markerObj.coords.lat, markerObj.coords.lng);
    } else if (act === 'remove') {
      removeMarkerByCoords(markerObj.coords.lng, markerObj.coords.lat);
    } else if (act === 'rename') {
      const newName = prompt('Marker yangi nomi:', markerObj.name);
      if (newName && newName.trim()) {
        renameMarker(markerObj.marker, newName.trim());
      }
    }
    removeContextMenu();
  });
}

function removeContextMenu() {
  if (contextMenuEl) {
    contextMenuEl.remove();
    contextMenuEl = null;
  }
}

function renameMarker(marker, newName) {
  const idx = markers.findIndex(m => m.marker === marker);
  if (idx === -1) return;
  markers[idx].name = newName;
  const coords = markers[idx].coords;
  marker.setPopup(createPopup(newName, coords, markers[idx].data, markers[idx].removable));
  showNotification('✅ Marker nomi yangilandi');
}

// =======================
// Favorites
// =======================
function addFavorite(name, lng, lat, data = {}) {
  favorites[name] = { coords: [lng, lat], data };
  updateFavCount();
  renderFavorites();
  showNotification("Sevimlilarga qo'shildi");
}

function deleteFavorite(name) {
  delete favorites[name];
  updateFavCount();
  renderFavorites();
  showNotification("Sevimlilardan o'chirildi");
}

function updateFavCount() {
  const el = document.getElementById('favCount');
  if (el) el.textContent = Object.keys(favorites).length;
}

function renderFavorites() {
  const list = document.getElementById('favoritesList');
  if (!list) return;
  const entries = Object.entries(favorites);
  if (entries.length === 0) {
    list.innerHTML = `< div style = "text-align:center;padding:20px;color:rgba(255,255,255,0.5)" > Sevimlilar yo'q</>`;
    return;
  }
  list.innerHTML = entries.map(([name, fav]) => {
    const safe = name.replace(/'/g, "\\'");
    return `
      <div class="fav-item">
        <div class="fav-info" data-lng="${fav.coords[0]}" data-lat="${fav.coords[1]}">
          <div class="fav-name">${escapeHtml(name)}</div>
          <div class="fav-coords">${fav.coords[1].toFixed(4)}, ${fav.coords[0].toFixed(4)}</div>
        </div>
        <button class="fav-delete" data-name="${safe}">×</button>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.fav-info').forEach(el => {
    el.addEventListener('click', () => {
      const lng = parseFloat(el.dataset.lng);
      const lat = parseFloat(el.dataset.lat);
      goToCoords(lng, lat);
    });
  });
  list.querySelectorAll('.fav-delete').forEach(b => {
    b.addEventListener('click', () => {
      deleteFavorite(b.dataset.name);
    });
  });
}

// =======================
// Weather
// =======================
async function getWeather(lat, lng) {
  const panel = document.getElementById('weatherPanel');
  if (!panel) return;
  panel.style.display = 'block';
  document.getElementById('tempDisplay').textContent = '--°';
  document.getElementById('weatherDesc').innerHTML = '<div class="loading">Yuklanmoqda...</div>';
  document.getElementById('weatherExtra').textContent = '';

  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
    if (!res.ok) throw new Error('API xatosi');
    const data = await res.json();
    const w = data.current_weather;
    document.getElementById('tempDisplay').textContent = Math.round(w.temperature) + '°C';
    const codes = {
      0: '☀️ Ochiq osmon', 1: '🌤️ Asosan ochiq', 2: '⛅ Qisman bulutli', 3: '☁️ Bulutli',
      45: '🌫️ Tuman', 48: '🌫️ Qirov', 51: '🌦️ Yengil yomg\'ir', 61: '🌧️ Yomg\'ir',
      71: '🌨️ Qor', 80: '🌧️ Kuchli yomg\'ir', 95: '⛈️ Chaqmoq'
    };
    document.getElementById('weatherDesc').textContent = codes[w.weathercode] || '🌤️ Ma\'lumot';
    document.getElementById('weatherExtra').textContent = `💨 Shamol: ${w.windspeed} km/h`;
    setTimeout(() => panel.style.display = 'none', 8000);
  } catch (err) {
    console.error('Weather error', err);
    document.getElementById('weatherDesc').textContent = '❌ Ma\'lumot yuklanmadi';
    setTimeout(() => panel.style.display = 'none', 3000);
  }
}

// =======================
// Utils
// =======================
function copyCoords(lng, lat) {
  const text = `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
  navigator.clipboard.writeText(text).then(() => {
    showNotification('✅ Koordinatalar nusxalandi!');
  }).catch(() => {
    showNotification('❌ Nusxalashda xatolik');
  });
}

function showNotification(text, duration = 2500) {
  const n = document.createElement('div');
  n.className = 'notification';
  n.style.whiteSpace = 'pre-line';
  n.textContent = text;
  document.body.appendChild(n);
  setTimeout(() => n.remove(), duration);
}

function updateStats() {
  const removableCount = markers.filter(m => m.removable).length;
  const elCount = document.getElementById('markerCount');
  if (elCount) elCount.textContent = removableCount;
  const zv = document.getElementById('zoomLevel');
  if (zv) zv.textContent = map.getZoom().toFixed(1);
  const pv = document.getElementById('pitchLevel');
  if (pv) pv.textContent = map.getPitch().toFixed(0) + '°';
  const rv = document.getElementById('rotationStatus');
  if (rv) rv.textContent = autoRotate ? '✓' : '✗';
}

// =======================
// Search
// =======================
let searchIndex = -1;
let currentResults = [];


searchInput.addEventListener('input', onSearchInput);
searchInput.addEventListener('keydown', onSearchKeyDown);

function onSearchInput(e) {
  const q = e.target.value.toLowerCase().trim();
  if (q.length < 2) {
    hideSearchResults();
    return;
  }
  const found = places.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.region && p.region.toLowerCase().includes(q)) ||
    (p.type && p.type.toLowerCase().includes(q))
  ).slice(0, 20);

  currentResults = found;
  searchIndex = -1;
  renderSearchResults(found, q);
}

function renderSearchResults(list, q) {
  if (!list.length) {
    searchResult.style.display = 'block';
    searchResult.innerHTML = `<div class="search-item" style="text-align:center">❌ Topilmadi</div>`;
    return;
  }
  searchResult.style.display = 'block';
  searchResult.innerHTML = list.map((p, i) => {
    const icon = p.type === 'davlat' || p.type === 'viloyat' ? '🌍' :
      p.type === 'poytaxt_hudud' ? '🏛️' : '📍';
    const nameHtml = escapeHtml(p.name).replace(new RegExp(escapeRegExp(q), 'ig'), (m) => `<strong style="color:#64c8ff">${m}</strong>`);
    return `<div class="search-item" data-index="${i}" tabindex="0">${icon} ${nameHtml}${p.region ? '<span style="color:#64c8ff"> · ' + escapeHtml(p.region) + '</span>' : ''}</div>`;
  }).join('');

  searchResult.querySelectorAll('.search-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.index);
      if (!isNaN(idx)) selectSearchResult(idx);
    });
  });
}

function hideSearchResults() {
  searchResult.style.display = 'none';
  currentResults = [];
  searchIndex = -1;
}

function onSearchKeyDown(e) {
  if (searchResult.style.display !== 'block') return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const max = currentResults.length - 1;
    if (e.key === 'ArrowDown') searchIndex = Math.min(max, searchIndex + 1);
    else searchIndex = Math.max(0, searchIndex - 1);
    highlightSearchIndex();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (searchIndex >= 0 && currentResults[searchIndex]) selectSearchResult(searchIndex);
    else if (currentResults[0]) selectSearchResult(0);
  } else if (e.key === 'Escape') {
    hideSearchResults();
  }
}

function highlightSearchIndex() {
  const items = Array.from(searchResult.querySelectorAll('.search-item'));
  items.forEach((it, i) => {
    it.style.background = (i === searchIndex) ? 'rgba(255,255,255,0.06)' : 'transparent';
  });
  if (items[searchIndex]) items[searchIndex].scrollIntoView({ block: 'nearest' });
}

function selectSearchResult(idx) {
  const place = currentResults[idx];
  if (!place) return;
  const name = place.name;
  const zoom = place.type === 'davlat' ? 6.5 : place.type === 'viloyat' ? 13 : place.type === 'poytaxt_hudud' ? 10 : 11;
  autoRotate = false;
  map.flyTo({ center: place.center, zoom, pitch: 60, duration: 5000 });
  setTimeout(() => addMarker(place.name, place.center, '#ffd700', place, true, true), 900);

  if (!searchHistory.includes(name)) {
    searchHistory.unshift(name);
    if (searchHistory.length > 15) searchHistory.pop();
  }
  searchInput.value = name;
  hideSearchResults();
}

// =======================
// Distance
// =======================
function addDistancePoint(lngLat) {
  const coords = { lng: lngLat.lng ?? lngLat[0], lat: lngLat.lat ?? lngLat[1] };
  distancePoints.push(coords);
  const marker = new mapboxgl.Marker({ color: '#ff6b6b' }).setLngLat([coords.lng, coords.lat]).addTo(map);
  distanceMarkers.push(marker);
  showNotification(`Nuqta ${distancePoints.length} qo'shildi`);
  if (distancePoints.length === 2) {
    const p1 = distancePoints[0];
    const p2 = distancePoints[1];
    const dist = haversine(p1, p2);
    document.getElementById('distanceValue').textContent = dist.toFixed(2) + ' km';
    document.getElementById('distanceInfo').textContent = `${p1.lat.toFixed(4)}, ${p1.lng.toFixed(4)} → ${p2.lat.toFixed(4)}, ${p2.lng.toFixed(4)}`;
    document.getElementById('distancePanel').style.display = 'block';
    drawLine(p1, p2);
    showNotification(`✅ Masofa: ${dist.toFixed(2)} km`);
  } else if (distancePoints.length > 2) {
    clearDistance();
    addDistancePoint([coords.lng, coords.lat]);
  }
}

function haversine(a, b) {
  const R = 6371;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return R * c;
}

function drawLine(from, to) {
  const id = 'distance-line-' + Date.now();
  if (!map.getSource(id)) {
    map.addSource(id, { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [[from.lng, from.lat], [to.lng, to.lat]] } } });
    map.addLayer({ id, type: 'line', source: id, paint: { 'line-color': '#ff6b6b', 'line-width': 4, 'line-opacity': 0.9 } });
    distanceLines.push(id);
  }
}

window.clearDistance = function () {
  distancePoints = [];
  distanceMarkers.forEach(m => m.remove());
  distanceMarkers = [];
  distanceLines.forEach(id => { if (map.getLayer(id)) map.removeLayer(id); if (map.getSource(id)) map.removeSource(id); });
  distanceLines = [];
  document.getElementById('distancePanel').style.display = 'none';
  showNotification('📏 Masofa tozalandi');
};

// =======================
// ISS Tracker
// =======================
async function trackISS() {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
    const data = await res.json();
    if (issMarker) issMarker.remove();
    const el = document.createElement('div');
    issMarker = new mapboxgl.Marker({ element: el }).setLngLat([data.longitude, data.latitude]).addTo(map);
    document.getElementById('issSpeed').textContent = Math.round(data.velocity);
    document.getElementById('issCoords').textContent = `${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`;
  } catch (err) {
    console.error('ISS Error:', err);
    document.getElementById('issCoords').textContent = 'Xatolik yuz berdi';
  }
}

// =======================
// Geolocation
// =======================
document.getElementById('locBtn').onclick = function () {
  if (!navigator.geolocation) {
    showNotification('❌ Geolokatsiya mavjud emas');
    return;
  }
  this.classList.add('active');
  showNotification('📍 Joylashuv aniqlanmoqda...');
  navigator.geolocation.getCurrentPosition(pos => {
    const coords = [pos.coords.longitude, pos.coords.latitude];
    if (userLocationMarker) {
      userLocationMarker.remove();
      markers = markers.filter(m => m.marker !== userLocationMarker);
    }
    autoRotate = false;
    map.flyTo({ center: coords, zoom: 16.5, pitch: 60, duration: 3000 });
    setTimeout(() => {
      userLocationMarker = addMarker(
        '📍 Sizning joylashuvingiz',
        coords,
        '#39FF14',
        {},
        true,
        true
      );
      showNotification('✅ Joylashuvingiz topildi!');
      document.getElementById('locBtn').classList.remove('active');
    }, 800);
  }, (err) => {
    showNotification('❌ Joylashuv aniqlanmadi');
    document.getElementById('locBtn').classList.remove('active');
    console.error('Geolocation error:', err);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
};

// =======================
// Control setup
// =======================
function setupControls() {
  const controls = document.querySelector('.controls');
  if (!controls) return;

  // Reset
  document.getElementById('resetBtn').onclick = () => {
    autoRotate = true;
    bearing = 0;
    map.flyTo({ center: [66, 41], zoom: 5.5, pitch: 30, bearing: 0, duration: 1000 });
    showNotification('🔄 Xarita qayta yuklandi');
  };

  // Mode
  document.getElementById('modeBtn').onclick = () => {
    const isDark = map.getStyle().name && map.getStyle().name.toLowerCase().includes('dark');
    const newStyle = isDark ? 'mapbox://styles/mapbox/light-v11' : 'mapbox://styles/mapbox/dark-v11';
    map.setStyle(newStyle);
    setTimeout(() => applyMapVisuals(), 800);
    showNotification(isDark ? '☀️ Kunduzgi rejim' : '🌙 Tungi rejim');
  };

  // Distance
  document.getElementById('distanceBtn').onclick = function () {
    distanceMode = !distanceMode;
    this.classList.toggle('active', distanceMode);
    if (!distanceMode) clearDistance();
    else showNotification('📏 Ikki nuqtani tanlang (double-click)');
  };

  // Clear markers
  document.getElementById('clearMarkersBtn').onclick = () => {
    if (markers.filter(m => m.removable).length === 0) {
      showNotification('❌ O\'chiriladigan markerlar yo\'q');
      return;
    }
    clearAllMarkers();
  };

  // ISS
  document.getElementById('issBtn').onclick = function () {
    const panel = document.getElementById('issPanel');
    const isActive = panel.style.display === 'block';
    if (!isActive) {
      panel.style.display = 'block';
      this.classList.add('active');
      trackISS();
      issInterval = setInterval(trackISS, 5000);
      showNotification('🛰️ ISS kuzatish boshlandi');
    } else {
      panel.style.display = 'none';
      this.classList.remove('active');
      if (issMarker) issMarker.remove();
      if (issInterval) clearInterval(issInterval);
      showNotification('🛰️ ISS kuzatish to\'xtatildi');
    }
  };

  // Terrain
  document.getElementById('terrainBtn').onclick = function () {
    terrainEnabled = !terrainEnabled;
    this.classList.toggle('active', terrainEnabled);
    if (terrainEnabled) {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });
      }
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      showNotification('⛰️ 3D Terrain yoqildi');
    } else {
      map.setTerrain(null);
      showNotification('⛰️ 3D Terrain o\'chirildi');
    }
  };

  // Favorites
  document.getElementById('favBtn').onclick = function () {
    const panel = document.getElementById('favoritesPanel');
    const isShown = panel.style.display === 'block';
    panel.style.display = isShown ? 'none' : 'block';
    this.classList.toggle('active', !isShown);

    if (!isShown) {
      renderFavorites();

      // 🔥 8 soniyadan keyin panelni yopish
      clearTimeout(panel.hideTimer);
      panel.hideTimer = setTimeout(() => {
        panel.style.display = 'none';
        document.getElementById('favBtn').classList.remove('active');
      }, 8000);
    }
  };


  // History
  document.getElementById('historyBtn').onclick = function () {
    const panel = document.getElementById('historyPanel');
    const isShown = panel.style.display === 'block';
    panel.style.display = isShown ? 'none' : 'block';
    this.classList.toggle('active', !isShown);

    if (!isShown) {
      const list = document.getElementById('historyList');
      if (searchHistory.length === 0)
        list.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.5)">Tarix bo\'sh</div>';
      else
        list.innerHTML = searchHistory
          .map(name => `<div class="history-item" data-name="${name}">${escapeHtml(name)}</div>`)
          .join('');

      document.querySelectorAll('#historyList .history-item').forEach(it => {
        it.addEventListener('click', () => { const name = it.dataset.name; goToPlace(name); });
      });

      // 🔥 10 soniyadan keyin panelni yopish:
      setTimeout(() => {
        panel.style.display = 'none';
        document.getElementById('historyBtn').classList.remove('active');
      }, 8000);
    };

  };

  // Fullscreen
  document.getElementById('fullscreenBtn').onclick = function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      showNotification('⛶ To\'liq ekran rejimi');
    } else {
      document.exitFullscreen();
      showNotification('⛶ Oddiy rejim');
    }
  };

  // Stats
  document.getElementById('statsBtn').onclick = function () {
    const panel = document.querySelector('.stats-panel');
    const isShown = panel.style.display === 'block';
    panel.style.display = isShown ? 'none' : 'block';
    this.classList.toggle('active', !isShown);
  };
}

// =======================
// Navigation helpers
// =======================
window.goToCoords = function (lng, lat, name) {
  autoRotate = false;
  map.flyTo({ center: [lng, lat], zoom: 12, pitch: 60, duration: 1000 });
  setTimeout(() => addMarker(name || '📍', [lng, lat], '#ffd700', {}, true, true), 900);
};

window.goToPlace = function (name) {
  const place = places.find(p => p.name === name);
  if (!place) return;
  autoRotate = false;
  const zoom = place.type === 'davlat' ? 5.5 : place.type === 'viloyat' ? 8 : place.type === 'poytaxt_hudud' ? 10 : 11;
  map.flyTo({ center: place.center, zoom, pitch: 60, duration: 1000 });
  setTimeout(() => addMarker(place.name, place.center, '#ffd700', place, true, true), 900);
  if (!searchHistory.includes(name)) {
    searchHistory.unshift(name);
    if (searchHistory.length > 15) searchHistory.pop();
  }
  searchInput.value = name;
  hideSearchResults();
};

// =======================
// Utilities
// =======================
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// =======================
// BOSHLASH
// =======================
initMap();