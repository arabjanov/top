// src/main.js - YANGILANGAN VERSION
// Fon aylanishi tuzatilgan, popup avtomatik ochilishi to'xtatilgan
// Barcha tugmalar va funksiyalar ishlaydi, console da xato yo'q

import { places } from './places.js';

fetch("https://top-b.onrender.com/api/mapbox-token")
  .then(res => res.json())
  .then(data => {
    mapboxgl.accessToken = data.token;
    initMap();
  });

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const statusEl = document.getElementById('status');
// logEl va geminiEl elementlari saqlanib qoladi, lekin ular CSS orqali yashirilgan
const logEl = document.getElementById('log');
const geminiEl = document.getElementById('gemini');
const aiBtn = document.getElementById('aiBtn');
const SYSTEM_PROMPT = `
You are a model that helps users find different places on the map, so make sure to provide accurate coordinates.You engage in short, topic - relevant conversations with the user.Strictly follow the rules below:
1. If the user asks about a place, address, or city: reply with a short text(up to 1–2 lines).Do not include coordinates in the text.Send coordinates separately in a trigger format like: __COORD__(latitude, longitude) Example: __COORD__(41.3111, 69.2797) Do not include any numbers in the reply text; if you must mention numbers, write them as words (e.g., one, two, three).
2. If the user asks about coding, programming, or technical tasks: you cannot write code.Simply say that you can only help find coordinates of cities, countries, or locations.
3. Never talk about the following topics: religious, sexual(gay, obscene), or violent content.If such requests appear, say that you cannot respond to them.
4. If the user asks your name, say it’s “Robbi”; if they ask your model name, say it’s “Robbus - v”.
5. Every response must be short, clear, within 1–2 lines, and end by reminding the user that they can ask more questions if they want.
6. Speak naturally, as if talking to the user, not just writing.
7. You must talk like a close friend and always present information in the Uzbek language!
8. If you receive unclear messages or random numbers, just don’t reply and do nothing!
9. If the user says 'robbi uxla', add the trigger OFF_AI, but make sure it’s not visible in the text!
`;

let recog, silenceTimer, finalTranscript = '', chatHistory = [], listening = false;
let geminiSpeaking = false;
let isAiActive = false; // Yordamchining umumiy holati
let aiBaseTransform = 'translateX(0)'; // <-- QO'SHILDI: Tugmaning asosiy pozitsiyasini saqlash uchun
let speechStopTimer;

if (!SpeechRecognition) {
  statusEl.textContent = 'Brauzeringiz SpeechRecognition ni qo\'llab-quvvatlamaydi.';
  aiBtn.disabled = true;
} else {
  recog = new SpeechRecognition();
  recog.lang = 'uz-UZ';
  recog.interimResults = true;
  recog.continuous = true;

  recog.onstart = () => {
    if (!isAiActive) return; // Agar AI o'chirilgan bo'lsa, boshlamaymiz
    listening = true;
    statusEl.textContent = '🎤 Holat: tinglanmoqda…';
    aiBtn.classList.add('ai-weak-animation'); // Kuchsiz animatsiyani yoqish
    aiBtn.classList.remove('ai-strong-animation');
    aiBtn.style.transform = aiBaseTransform;
  };

  recog.onresult = (ev) => {

    // Gapirayotganini aniqladik
    aiBtn.classList.add('ai-strong-animation'); // Kuchli animatsiyani yoqish
    aiBtn.classList.remove('ai-weak-animation');
    aiBtn.style.transform = `${aiBaseTransform} scale(1.1)`; // POZITSIYANI SAQLAGAN HOLDA KATTALASHTIRISH

    clearTimeout(silenceTimer);
    let interim = '';
    let hasFinal = false;

    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      if (res.isFinal) {
        const transcript = res[0].transcript.trim();
        if (transcript.length > 2 && transcript !== finalTranscript) {
          finalTranscript = transcript;
          hasFinal = true;
        }
      } else {
        interim += res[0].transcript;
      }
    }

    if (hasFinal && finalTranscript && !geminiSpeaking) {
      // logEl.textContent = '👤 Siz: ' + finalTranscript; // Olib tashlandi
      sendToGemini(finalTranscript);
    }

    speechStopTimer = setTimeout(() => {
      aiBtn.classList.remove('ai-strong-animation');
      if (isAiActive) aiBtn.classList.add('ai-weak-animation');
      aiBtn.style.transform = aiBaseTransform; // Scaleni olib tashlash
    }, 1000); // 1 sekund jimlikdan keyin

    silenceTimer = setTimeout(() => {
      // Hech narsa qilmaymiz, faqat kutamiz
    }, 2500);
  };

  recog.onend = () => {
    listening = false;
    clearTimeout(speechStopTimer);
    aiBtn.classList.remove('ai-weak-animation', 'ai-strong-animation');
    aiBtn.style.transform = aiBaseTransform; // To'liq reset

    // Faqat AI aktiv bo'lsa va Gemini gapirmayotgan bo'lsa qayta ishga tushiramiz
    if (!geminiSpeaking && isAiActive) {
      setTimeout(() => {
        if (!listening && !geminiSpeaking && isAiActive) {
          try {
            recog.start();
          } catch (e) {
          }
        }
      }, 300);
    }
  };

  recog.onerror = (e) => {
    console.error('SpeechRecognition xato', e);
    clearTimeout(speechStopTimer);
    aiBtn.classList.remove('ai-weak-animation', 'ai-strong-animation');
    aiBtn.style.transform = aiBaseTransform; // To'liq reset
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      statusEl.textContent = '⚠️ Xato: ' + (e.error || 'noma\'lum');
    }
  };

  // Yagona tugma logikasi
  aiBtn.onclick = () => {
    const otherBtns = Array.from(btnGroup.querySelectorAll('.btn')).filter(btn => btn !== aiBtn);

    if (isAiActive) {
      // AI ni o'chirish - aiBtn eski joyiga qaytadi
      isAiActive = false;
      listening = false;
      geminiSpeaking = false;
      clearTimeout(speechStopTimer);

      try {
        recog.stop();
      } catch (e) { }
      speechSynthesis.cancel();

      chatHistory = [];
      finalTranscript = '';

      statusEl.textContent = 'Holat: o\'chirildi';
      aiBtn.classList.remove('active');
      aiBtn.classList.remove('ai-on'); // <-- O'ZGARDI: .ai-processing o'rniga
      aiBtn.classList.remove('ai-active-animation'); // <-- QO'SHILDI: Animatsiyani to'xtatish
      statusEl.classList.remove('speaking-status');

      // aiBtn eski joyiga qaytish
      aiBaseTransform = 'translateX(0)'; // Asosiy pozitsiyani reset qilish
      aiBtn.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      aiBtn.style.transform = aiBaseTransform; // Asosiy pozitsiyaga qaytish
      aiBtn.style.opacity = '1';

      // Menu button qaytib kelishi
      setTimeout(() => {
        menuToggleBtn.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        menuToggleBtn.style.opacity = '1';
        // Uni 'translateX(20px) scale(0.8)' holatidan to'liq 'translateX(0) scale(1)' holatiga qaytaramiz
        menuToggleBtn.style.transform = 'translateX(0) scale(1)';
        menuToggleBtn.style.pointerEvents = 'auto';

        // MUHIM: Animatsiya tugagandan so'ng (600ms), 'transform' uslubini butunlay olib tashlaymiz.
        // Shunda CSS classlari (masalan, .active) uni qayta boshqara oladi.
        setTimeout(() => {
          menuToggleBtn.style.removeProperty('transform');
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
        }, 600); // 600ms yuqoridagi 'all 0.6s' transition vaqtiga mos keladi
      }, 100);

      // Boshqa tugmalarni qaytarish (faqat menyu ochiq bo'lsa)
      if (controls.classList.contains("menu-expanded")) {
        setTimeout(() => {
          otherBtns.forEach((btn, i) => {
            setTimeout(() => {
              btn.style.transition = 'all 0.3s ease';
              btn.style.opacity = '1';
              btn.style.transform = 'scale(1)';
              btn.style.pointerEvents = 'auto';
            }, i * 50);
          });
        }, 300);
      }

    } else {
      // AI ni yoqish - aiBtn menu button o'rniga o'tadi
      isAiActive = true;
      try {
        recog.start();
      } catch (e) {
        statusEl.textContent = 'Mikrofonga ruxsat bering';
        isAiActive = false;
        return;
      }
      statusEl.textContent = 'Holat: ishga tushmoqda...';
      aiBtn.classList.add('active');
      aiBtn.classList.add('ai-on');

      // Menu button yo'qolishi
      menuToggleBtn.style.transition = 'all 0.5s ease';
      menuToggleBtn.style.opacity = '0';
      menuToggleBtn.style.transform = 'translateX(20px) scale(0.8)';
      menuToggleBtn.style.pointerEvents = 'none';

      // aiBtn menu button joyiga siljiydi
      setTimeout(() => {
        const menuRect = menuToggleBtn.getBoundingClientRect();
        const aiRect = aiBtn.getBoundingClientRect();
        const distance = menuRect.left - aiRect.left;

        aiBaseTransform = `translateX(${distance}px)`; // Yangi asosiy pozitsiyani saqlash
        aiBtn.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        aiBtn.style.transform = aiBaseTransform;

      }, 100);

      // Boshqa tugmalarni yashirish (faqat menyu ochiq bo'lsa)
      if (controls.classList.contains("menu-expanded")) {
        setTimeout(() => {
          otherBtns.forEach((btn, i) => {
            setTimeout(() => {
              btn.style.transition = 'all 0.3s ease';
              btn.style.opacity = '0';
              btn.style.transform = 'scale(0.8)';
              btn.style.pointerEvents = 'none';
            }, i * 50);
          });
        }, 200);
      }
    }
  };
}

async function sendToGemini(text) {

  geminiSpeaking = true;
  statusEl.textContent = '⏳ O‘ylayapman...';
  clearTimeout(speechStopTimer); // Taymerni tozalash
  aiBtn.classList.add('ai-weak-animation'); // "O'ylash" vaqti kuchsiz animatsiya
  aiBtn.classList.remove('ai-strong-animation');
  aiBtn.style.transform = aiBaseTransform; // Scaleni olib tashlash

  const contents = [];
  chatHistory.forEach(msg => {
    contents.push({ role: "user", parts: [{ text: msg.user }] });
    contents.push({ role: "model", parts: [{ text: msg.ai }] });
  });
  contents.push({
    role: "user",
    parts: [{ text: SYSTEM_PROMPT + "\n\n" + text }]
  });

  const body = { contents };

  try {
    const res = await fetch("https://top-b.onrender.com/api/gemini/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    const replyRaw = data.candidates?.[0]?.content?.parts?.[0]?.text || "Javob topilmadi.";

    const coordRegex = /__COORD__\(([^)]+)\)/;
    const closeGeminiRegex = /OFF_AI/;
    const coordMatch = replyRaw.match(coordRegex);
    let replyClean = replyRaw;

    if (closeGeminiRegex.test(replyRaw)) {
      replyClean = replyRaw.replace(closeGeminiRegex, "").trim();
      if (isAiActive) {
        aiBtn.click(); // AI ni o‘chirish
      }
    }

    if (coordMatch) {
      const coords = coordMatch[1];
      replyClean = replyRaw.replace(coordRegex, "").trim();

      // Karta logikasini bu yerga qo'shishingiz mumkin 
      if (typeof mapboxgl !== 'undefined' && typeof map !== 'undefined') {
        const [lat, lng] = coords.split(',').map(Number);

        // Avvalgi auto rotate ni to'xtatish
        autoRotate = false;

        // Birinchi xaritani joyga fly qilish
        map.flyTo({
          center: [lng, lat],
          zoom: 14,
          pitch: 60,
          duration: 5000,
          essential: true
        });

        // Marker qo'yish (biroz kechiktirib, animatsiya tugagandan keyin)
        setTimeout(() => {
          addMarker('🎯 AI topdi', [lng, lat], '#ff0000ff', {}, true, true);
        }, 1500);
      }
    }

    chatHistory.push({ user: text, ai: replyClean });

    speakText(replyClean);
    finalTranscript = '';

  } catch (err) {
    console.error('❌ API xato:', err);
    statusEl.textContent = '❌ API xatosi';
    geminiSpeaking = false;

    // Xatolikdan keyin micni qayta yoqish (agar AI hali ham aktiv bo'lsa)
    setTimeout(() => {
      if (recog && isAiActive) {
        try {
          recog.start();
        } catch (e) {
        }
      }
    }, 500);
  }
}

function speakText(text) {
  if (!text || !isAiActive) {
    geminiSpeaking = false; // Agar AI o'chiq bo'lsa, gapirmaymiz
    return;
  }

  geminiSpeaking = true;

  if (recog && listening) {
    recog.stop();
    listening = false;
  }

  // geminiEl.classList.add('speaking'); // Olib tashlandi
  statusEl.textContent = '🔊 Gapirmoqdaman...';
  statusEl.classList.add('speaking-status');

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  const voices = speechSynthesis.getVoices();
  const indonesianVoice = voices.find(v => v.lang === 'id-ID' && v.name.includes('Google'));
  if (indonesianVoice) {
    utterance.voice = indonesianVoice;
  } else {
    const anyIndonesian = voices.find(v => v.lang === 'id-ID');
    if (anyIndonesian) utterance.voice = anyIndonesian;
  }

  utterance.lang = 'id-ID';
  utterance.pitch = 0.6;
  utterance.rate = 1.2;

  utterance.onstart = () => {
    geminiSpeaking = true;
    geminiSpeaking = true;
    aiBtn.classList.add('ai-strong-animation'); // AI gapirganda KUCHLI animatsiya
    aiBtn.classList.remove('ai-weak-animation');
    aiBtn.style.transform = `${aiBaseTransform} scale(1.1)`; // POZITSIYANI SAQLAGAN HOLDA KATTALASHTIRISH
  };

  utterance.onend = () => {
    geminiSpeaking = false;
    aiBtn.classList.remove('ai-strong-animation');
    // geminiEl.classList.remove('speaking'); // Olib tashlandi
    statusEl.classList.remove('speaking-status');
    if (isAiActive) {
      statusEl.textContent = '🎤 Holat: tinglanmoqda…';
      aiBtn.classList.add('ai-weak-animation');
    } else {
      aiBtn.style.transform = aiBaseTransform;
      statusEl.textContent = 'Holat: o\'chirildi';
    }

    // Faqat AI hali ham aktiv bo'lsa micni yoqamiz
    setTimeout(() => {
      if (!geminiSpeaking && recog && isAiActive) {
        try {
          recog.start();
        } catch (e) {
        }
      }
    }, 1000); // Kichik pauza
  };

  utterance.onerror = (e) => {
    console.error('❌ TTS xato:', e);
    geminiSpeaking = false;
    aiBtn.classList.remove('ai-strong-animation');
    statusEl.classList.remove('speaking-status');
    if (isAiActive) {
      statusEl.textContent = '🎤 Holat: tinglanmoqda…';
      aiBtn.classList.add('ai-weak-animation');
    } else {
      aiBtn.style.transform = aiBaseTransform;
      statusEl.textContent = 'Holat: o\'chirildi';
    }

    // Xatodan keyin micni yoqish (agar AI aktiv bo'lsa)
    setTimeout(() => {
      if (recog && isAiActive) {
        try {
          recog.start();
        } catch (e) {
        }
      }
    }, 500);
  };

  speechSynthesis.speak(utterance);
}

if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = () => { };
}


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
  const otherBtns = Array.from(buttons).filter(btn => btn !== aiBtn);

  if (controls.classList.contains("menu-expanded")) {
    // ====== YOPISH ======

    // Barcha tugmalarni yopish
    buttons.forEach((btn, i) => {
      const reverseIndex = buttons.length - 1 - i;
      setTimeout(() => {
        btn.style.transition = "all 0.4s ease";
        btn.style.opacity = "0";
        btn.style.transform = "scale(0.8)";
      }, reverseIndex * 40);
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

    }, 500);

    setTimeout(() => {
      isAnimating = false;
    }, 1000);

  } else {
    // ====== OCHISH ======

    // Menyu tugmasi background va border TEZDA paydo bo'lsin
    menuToggleBtn.style.transition = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), background 0.2s ease, border-color 0.2s ease, border-radius 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    menuToggleBtn.style.background = "rgba(255, 255, 255, 0.08)";
    menuToggleBtn.style.borderColor = "rgba(255, 255, 255, 0.1)";

    setTimeout(() => {
      controls.classList.add("menu-expanded");
      menuToggleBtn.classList.add("active");

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

      // Tugmalarni ko'rsatish
      setTimeout(() => {
        if (isAiActive) {
          // Agar AI aktiv bo'lsa, faqat aiBtn ni ko'rsat
          aiBtn.style.transition = "all 0.4s ease";
          aiBtn.style.background = "rgba(255, 255, 255, 0.08)";
          aiBtn.style.border = "1px solid rgba(255, 255, 255, 0.1)";
          aiBtn.style.opacity = "1";
          aiBtn.style.transform = "scale(1)";
          aiBtn.style.pointerEvents = "auto";

          // Qolganlarini yashir
          otherBtns.forEach(btn => {
            btn.style.opacity = "0";
            btn.style.transform = "scale(0.8)";
            btn.style.pointerEvents = "none";
          });
        } else {
          // AI aktiv bo'lmasa, barcha tugmalarni ko'rsat
          buttons.forEach((btn, i) => {
            setTimeout(() => {
              btn.style.transition = "all 0.4s ease";
              btn.style.background = "rgba(255, 255, 255, 0.08)";
              btn.style.border = "1px solid rgba(255, 255, 255, 0.1)";
              btn.style.opacity = "1";
              btn.style.transform = "scale(1)";
              btn.style.pointerEvents = "auto";
            }, i * 50);
          });
        }
      }, 100);

    }, 50);

    setTimeout(() => {
      isAnimating = false;
    }, 1000);
  }
});

document.querySelectorAll(".btn-group .btn").forEach(btn => {
  // aiBtn ni butunlay e'tiborsiz qoldirish
  if (btn.id === 'aiBtn') {
    return; // aiBtn uchun hech narsa qilmaymiz
  }

  btn.addEventListener("click", () => {
    // Bosilgan effekt
    const currentTransform = btn.style.transform || '';

    if (currentTransform.includes('translateX')) {
      // Agar translateX bor bo'lsa (AI menyusi ochiq)
      btn.style.transform = currentTransform + ' scale(0.9)';
    } else {
      // Oddiy holat
      btn.style.transform = 'scale(0.9)';
    }

    // 150ms dan keyin asl holatga qaytarish
    setTimeout(() => {
      if (currentTransform.includes('translateX')) {
        btn.style.transform = currentTransform; // translateX saqlanadi
      } else {
        btn.style.transform = 'scale(1)';
      }
    }, 150);
  });
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

const hg = `<dotlottie-wc
  src="https://lottie.host/040c693a-fff0-4e95-9451-a8d3eea5309e/cVjuGPs9w2.lottie"
  style="width: 600px; height: 230px; right: 80px"
  autoplay
  loop
></dotlottie-wc>`;

// Panelni ko‘rsatish
async function showInfoPanel(data) {
  infoPanel.innerHTML = `
    <h2 style = "font-size:1em;" > Joy haqida qisqacha ma’lumot!</h2 >
    <div id="geminiResponse">${hg}</div>
    <button class="search-btn" id="searchPanelBtn" style="font-size:1em;">Batafsil ma'lumot</button>
    <button class="close-btn" id="closePanelBtn" style="font-size:1em;">Yopish</button>
`;
  infoPanel.classList.add('active');

  const closeBtn = document.getElementById('closePanelBtn');
  if (closeBtn) closeBtn.addEventListener('click', hideInfoPanel);
  const detailBtn = document.getElementById('searchPanelBtn');
  if (detailBtn) detailBtn.addEventListener('click', async () => {
    const detailMessage = `Shu kordinatada joylashgan joy haqida batafsil va tushunarli ma'lumot yoz. 
Faqat eng muhim faktlarni va bir oz tarixini ayt.
  Shahar: ${cityName}, koordinata: ${data.lat}, ${data.lng}. 
Agar aniq ma'lumot topa olmasang, yon-atrofdagi joy haqida xuddi shunday qisqa ma'lumot ber.`;

    const responseEl = document.getElementById("geminiResponse");
    responseEl.innerHTML = `${hg}`;
    const detailedText = await getGeminiData(detailMessage);
    const formattedDetail = formatGeminiText(detailedText || "❌ Batafsil ma'lumot topilmadi.");
    await typeFormattedText(responseEl, formattedDetail);
  });

  const cityName = data.name || "noma’lum joy";
  const message = `Shu kordinatada joylashgan joy haqida juda qisqa(faqat 2 - 3 gapli) va tushunarli ma'lumot yoz. 
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

const TARGET_URL = "https://top-b.onrender.com/sorov";
const INTERVAL_MS = 10 * 60 * 1000; // 10 daqiqa
const MAX_RETRIES = 10; // Maksimal urinishlar soni
const RETRY_DELAY = 3000; // 3 soniya

// Intervallar va timeoutlarni kuzatish uchun
let keepAliveInterval = null;
let retryTimeout = null;
let checkAttempt = 0;
let isChecking = false;

function getLocalTime() {
  return new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
}

// Loading overlay ko'rsatish
function showLoadingOverlay() {
  // Avvalgi overlay borligini tekirish
  const existingOverlay = document.getElementById('backendCheckOverlay');
  if (existingOverlay) {
    return; // Agar mavjud bo'lsa, yangi ochmaymiz
  }

  const overlay = document.createElement('div');
  overlay.id = 'backendCheckOverlay';
  overlay.innerHTML = `
    <div style="text-align: center; max-width: 400px; padding: 20px;">
      
      <div id="backendSpinner321" class="spinner-loader"></div>
      
      <h3 style="color: #64c8ff; font-size: 22px; margin-bottom: 12px;">TOP-GL</h3>
      <p id="backendStatus321" style="color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 8px;">Backend tekshirilmoqda...</p>
      <p id="backendAttempt321" style="color: rgba(255,255,255,0.5); font-size: 12px;">Urinish: 1/${MAX_RETRIES}</p>
      <div id="backendError321" style="display: none; margin-top: 15px; padding: 10px; background: rgba(255,107,107,0.1); border-radius: 8px; color: #ff6b6b; font-size: 12px;"></div>
    </div>
  `;

  // CSS qo'shish
  const style = document.createElement('style');
  style.id = 'backendCheckStyle';
  style.textContent = `
    #backendCheckOverlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #0a0e27;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    /* KUCHLI PULS ANIMATSIYASI */

    .spinner-loader {
      width: 80px; 
      height: 80px; 
      border-radius: 50%; 
      margin: 0 auto 20px; 
      position: relative;
      background: transparent;
      
      /* Boshlang'ich holat */
      border: 6px solid rgba(100, 200, 255, 0.7);
      
      /* Silliq o'tishlar */
      transition: border-color 0.3s ease-in, background-color 0.3s ease-in, transform 0.3s ease, opacity 0.3s ease;
      
      /* Kuchli "nafas olish" (pulsing) animatsiyasi */
      animation: pulse321 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse321 {
      0% {
        transform: scale(0.85);
        opacity: 0.5;
        border-color: rgba(100, 200, 255, 0.5);
        box-shadow: 0 0 0 0 rgba(100, 200, 255, 0.4);
      }
      50% {
        transform: scale(1.15);
        opacity: 1;
        border-color: rgba(100, 200, 255, 1);
        box-shadow: 0 0 20px 10px rgba(100, 200, 255, 0.3);
      }
      100% {
        transform: scale(0.85);
        opacity: 0.5;
        border-color: rgba(100, 200, 255, 0.5);
        box-shadow: 0 0 0 0 rgba(100, 200, 255, 0.4);
      }
    }
    
    /* Checkmark (tasdiq belgisi) qismlari */
    .spinner-loader::before,
    .spinner-loader::after {
      content: '';
      position: absolute;
      background: #fff;
      border-radius: 3px;
      
      opacity: 0;
      transform: scaleX(0);
      transition: transform 0.25s ease-out, opacity 0.1s ease-out;
    }

    /* Checkmark (chap qismi) */
    .spinner-loader::before {
      top: 42px; left: 22px;
      width: 25px; height: 8px;
      transform-origin: right top;
      transform: rotate(-45deg) scaleX(0);
      transition-delay: 0.3s;
    }

    /* Checkmark (o'ng qismi) */
    .spinner-loader::after {
      top: 36px; left: 42px;
      width: 35px; height: 8px;
      transform-origin: left top;
      transform: rotate(45deg) scaleX(0);
      transition-delay: 0.5s;
    }

    /* MUVAFFAQIYATLI HOLAT */

    .spinner-loader.success {
      animation: none;
      transform: scale(1);
      opacity: 1;
      border-color: #4ade80;
      background-color: #4ade80;
      box-shadow: 0 0 0 0 rgba(74, 222, 128, 0);
    }
    
    /* Checkmarkni chizish */
    .spinner-loader.success::before,
    .spinner-loader.success::after {
      opacity: 1;
      transform: scaleX(1);
    }

    /* Overlay yopilish animatsiyasi */
    @keyframes fadeOut321 {
      to { opacity: 0; visibility: hidden; }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);
}

// Overlay ni olib tashlash
function hideLoadingOverlay() {
  const overlay = document.getElementById('backendCheckOverlay');
  const style = document.getElementById('backendCheckStyle');

  if (overlay) {
    overlay.style.animation = 'fadeOut321 0.5s ease forwards';
    setTimeout(() => {
      overlay.remove();
      if (style) style.remove();
    }, 500);
  }
}

// Status va xatolarni yangilash
function updateStatus(message, type = 'info') {
  const statusEl = document.getElementById('backendStatus321');
  const attemptEl = document.getElementById('backendAttempt321');
  const errorEl = document.getElementById('backendError321');

  if (statusEl) {
    statusEl.textContent = message;
    if (type === 'success') {
      statusEl.style.color = '#4ade80';
    } else if (type === 'error') {
      statusEl.style.color = '#ff6b6b';
    } else {
      statusEl.style.color = 'rgba(255,255,255,0.7)';
    }
  }

  if (attemptEl) {
    attemptEl.textContent = `Urinish: ${checkAttempt}/${MAX_RETRIES}`;
    attemptEl.style.display = checkAttempt <= MAX_RETRIES ? 'block' : 'none';
  }

  if (errorEl && type === 'error') {
    errorEl.style.display = 'block';
    errorEl.innerHTML = `
      <strong>Xatolik:</strong><br>
      ${message}<br>
      <span style="opacity: 0.7; font-size: 11px;">Internet ulanishini tekshiring yoki keyinroq urinib ko'ring.</span>
    `;
  }
}

// Fetch timeout uchun yordamchi funksiya (eski brauzerlar uchun)
function fetchWithTimeout(url, options = {}, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout: Server javob berish vaqti tugadi'));
    }, timeout);

    fetch(url, options)
      .then(response => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Backend tekshirish
async function checkBackendStatus() {
  // Agar allaqachon tekshirilayotgan bo'lsa, qayta ishga tushirmaymiz
  if (isChecking) {
    return false;
  }

  isChecking = true;
  checkAttempt++;

  // Maksimal urinishlarni tekshirish
  if (checkAttempt > MAX_RETRIES) {
    console.error(getLocalTime(), "❌ Maksimal urinishlar soni tugadi!");
    updateStatus('Server topilmadi. Sahifani yangilang.', 'error');
    isChecking = false;
    return false;
  }

  updateStatus('TOP-GL loyihasini sizdek inson kashf etgan!', 'info');

  try {
    // Internet ulanishini tekshirish
    if (!navigator.onLine) {
      throw new Error('Internet ulanishi yo\'q');
    }


    const res = await fetchWithTimeout(TARGET_URL, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Accept': 'application/json, text/plain, */*',
      }
    }, 8000);

    if (res.ok && res.status === 200) {
      updateStatus('Xush kelibsiz!', 'success');

      // Animatsiyani muvaffaqiyatli holatga o'tkazish
      const spinner = document.getElementById('backendSpinner321');
      if (spinner) {
        spinner.classList.add('success');
      }

      // Silliq animatsiya tugashi uchun vaqt (1.5 soniya)
      setTimeout(() => {
        hideLoadingOverlay();
        isChecking = false;
      }, 1500);

      // Eski intervalni tozalash
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }

      // Yangi interval o'rnatish
      keepAliveInterval = setInterval(sendKeepAlivePing, INTERVAL_MS);

      // Dastlabki ping yuborish
      setTimeout(sendKeepAlivePing, 1000);

      return true;
    } else {
      throw new Error(`Server xato javobi: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.error(getLocalTime(), "❌ Backend xato:", err.message);

    const errorMessage = err.message.includes('Internet')
      ? 'Internet ulanishi yo\'q'
      : err.message.includes('Timeout')
        ? 'Server javob berish vaqti tugadi'
        : 'Server bilan bog\'lanib bo\'lmadi';

    updateStatus(`⚠️ ${errorMessage}`, 'error');

    // Agar maksimal urinishlar tugamagan bo'lsa, qayta urinish
    if (checkAttempt < MAX_RETRIES) {

      // Eski timeout ni tozalash
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }

      retryTimeout = setTimeout(() => {
        isChecking = false;
        checkBackendStatus();
      }, RETRY_DELAY);
    } else {
      isChecking = false;
      updateStatus('Server topilmadi. Sahifani yangilang.', 'error');
    }

    return false;
  }
}

// Keep-alive ping
async function sendKeepAlivePing() {
  try {

    const res = await fetchWithTimeout(TARGET_URL, {
      method: 'GET',
      cache: 'no-cache'
    }, 5000);

    if (res.ok) {
      const text = await res.text();
    }
  } catch (err) {
  }
}

// Internet ulanishini kuzatish
function setupNetworkMonitoring() {
  window.addEventListener('online', () => {
    if (!keepAliveInterval) {
      checkAttempt = 0;
      showLoadingOverlay();
      checkBackendStatus();
    }
  });

  window.addEventListener('offline', () => {
  });
}

// Sahifa yopilganda tozalash
function cleanup() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
  if (retryTimeout) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
}

window.addEventListener('beforeunload', cleanup);

// Dastlabki ishga tushirish

setupNetworkMonitoring();
showLoadingOverlay();
checkBackendStatus();

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
    <div class="ctx-item" data-act="copy"><i class='bx bxs-copy'></i> Nusxa</div>
    <div class="ctx-item" data-act="fav"><i class='bx bxs-paste'></i> Sevimlilarga qo'shish</div>
    <div class="ctx-item" data-act="weather"><i class='bx bxs-sun'></i> Ob-havo</div>
    ${markerObj.removable ? `<div class="ctx-item ctx-delete" data-act="remove"><i class='bx bxs-edit-alt'></i> O'chirish</div>` : ''}
<div class="ctx-item" data-act="rename"><i class='bx bx-pencil'></i> Nom berish</div>
`;

  document.body.appendChild(contextMenuEl);

  const x = Math.min(window.innerWidth - 200, ev.clientX);
  const y = Math.min(window.innerHeight - 200, ev.clientY);
  contextMenuEl.style.left = x + 'px';
  contextMenuEl.style.top = y + 'px';

  contextMenuEl.querySelectorAll('.ctx-item').forEach(it => {
    it.style.padding = '8px';
    it.style.cursor = 'pointer';
    it.style.color = 'rgba(255,255,255,0.85)';
    it.style.borderRadius = '6px';
    it.onmouseenter = () => it.style.background = 'rgba(255,255,255,0.03)';
    it.onmouseleave = () => it.style.background = 'transparent';
  });

  contextMenuEl.addEventListener('click', (e) => {
    const act = e.target.closest('.ctx-item')?.dataset.act;
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
    list.innerHTML = `<div style="text-align:center; padding:20px; color:rgba(255,255,255,0.5);">Sevimlilar yo'q</div>`;
    return;
  }
  list.innerHTML = entries.map(([name, fav]) => {
    // encodeURIComponent o'rniga textContent ishlatamiz
    return `
      <div class="fav-item">
        <div class="fav-info" data-lng="${fav.coords[0]}" data-lat="${fav.coords[1]}">
          <div class="fav-name">${escapeHtml(name)}</div>
          <div class="fav-coords">${fav.coords[1].toFixed(4)}, ${fav.coords[0].toFixed(4)}</div>
        </div>
        <button class="fav-delete" data-name="${escapeHtml(name)}">×</button>
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
      // dataset.name dan to'g'ridan-to'g'ri olamiz
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

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/ʻ|ʼ|'|'/g, '') // Apostrof va qo'shtirnoqlarni olib tashlash
    .replace(/o'/g, 'o')      // O' -> O
    .replace(/g'/g, 'g')      // G' -> G
    .replace(/sh/g, 's')      // Sh -> S (agar kerak bo'lsa)
    .replace(/ch/g, 'c')      // Ch -> C (agar kerak bo'lsa)
    .trim();
}

function onSearchInput(e) {
  const q = e.target.value.toLowerCase().trim();
  if (q.length < 2) {
    hideSearchResults();
    return;
  }

  // Qidiruv so'zini normallashtiramiz
  const normalizedQuery = normalizeText(q);

  const found = places.filter(p => {
    // Har bir maydonni normallashtirib, qidiramiz
    const nameMatch = normalizeText(p.name).includes(normalizedQuery);
    const regionMatch = p.region && normalizeText(p.region).includes(normalizedQuery);
    const typeMatch = p.type && normalizeText(p.type).includes(normalizedQuery);

    return nameMatch || regionMatch || typeMatch;
  }).slice(0, 20);

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
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
