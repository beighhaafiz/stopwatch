// --- FIREBASE INIT ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAphz7fM0cvvAql1YBbiYY94AY7j6Nm5YM",
  authDomain: "time-tracker-47d27.firebaseapp.com",
  projectId: "time-tracker-47d27",
  storageBucket: "time-tracker-47d27.appspot.com",
  messagingSenderId: "255729353501",
  appId: "1:255729353501:web:bd7e67821387fa3672ec56",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- GLOBAL VARIABLES ---
let startTime = null;
let elapsedTime = 0;
let timerInterval = null;
let isRunning = false;
let currentDate = new Date().toISOString().slice(0, 10);
let viewingDate = currentDate;

// --- DOM ELEMENTS ---
const stopwatchEl = document.getElementById("stopwatch");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const resetBtn = document.getElementById("resetBtn");
const saveBtn = document.getElementById("saveBtn");

const periodSelect = document.getElementById("periodSelect");
const dateInput = document.getElementById("date");
const historyInput = document.getElementById("historyDate");
const loadHistoryBtn = document.getElementById("loadHistoryBtn");

const periodFields = {
  p1: document.getElementById("p1"),
  p2: document.getElementById("p2"),
  p3: document.getElementById("p3"),
  p4: document.getElementById("p4"),
  p5: document.getElementById("p5"),
};
const totalField = document.getElementById("total");

// --- UTILITIES ---
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

function parseTime(timeStr) {
  const [hrs, mins, secs] = timeStr.split(":").map(Number);
  return (hrs * 3600 + mins * 60 + secs) * 1000;
}

function calculateTotal() {
  let total = 0;
  for (let key in periodFields) {
    const val = periodFields[key].value;
    if (val) total += parseTime(val);
  }
  totalField.value = formatTime(total);
}

// --- FIREBASE FUNCTIONS ---
async function loadFirestoreData(dateKey) {
  showLoading(true); // Show spinner and disable input

  try {
    const docRef = doc(db, "timeData", dateKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      for (let key in periodFields) {
        periodFields[key].value = data[key] || "00:00:00";
      }
      totalField.value = data.total || "00:00:00";

      if (dateKey === currentDate) {
        isRunning = data.isRunning || false;
        startTime = data.startTime || null;
        elapsedTime = data.elapsedTime || 0;

        if (isRunning && startTime) {
          const now = Date.now();
          elapsedTime += now - startTime;
          startTime = now;
          startStopwatch();
        } else {
          updateStopwatchDisplay(elapsedTime);
        }
      } else {
        isRunning = false;
        clearInterval(timerInterval);
        updateStopwatchDisplay(0);
      }
    } else {
      for (let key in periodFields) {
        periodFields[key].value = "00:00:00";
      }
      totalField.value = "00:00:00";
      isRunning = false;
      startTime = null;
      elapsedTime = 0;
      clearInterval(timerInterval);
      updateStopwatchDisplay(0);
    }

    viewingDate = dateKey;
    const [year, month, day] = dateKey.split("-");
    dateInput.value = `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error loading Firestore data:", error);
  } finally {
    hideLoading(); // Hide spinner and enable input
  }
}


async function saveFirestoreData() {
  if (viewingDate !== currentDate) return;
  const docRef = doc(db, "timeData", currentDate);
  const payload = {
    p1: periodFields.p1.value,
    p2: periodFields.p2.value,
    p3: periodFields.p3.value,
    p4: periodFields.p4.value,
    p5: periodFields.p5.value,
    total: totalField.value,
    isRunning,
    startTime,
    elapsedTime,
  };
  await setDoc(docRef, payload);
}

// --- STOPWATCH LOGIC ---
function updateStopwatchDisplay(ms) {
  stopwatchEl.textContent = formatTime(ms);
}

function startStopwatch() {
  if (viewingDate !== currentDate || isRunning) return;
  isRunning = true;
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const now = Date.now();
    updateStopwatchDisplay(elapsedTime + (now - startTime));
  }, 1000);
  saveFirestoreData();
}

function pauseStopwatch() {
  if (viewingDate !== currentDate || !isRunning) return;
  isRunning = false;
  clearInterval(timerInterval);
  elapsedTime += Date.now() - startTime;
  updateStopwatchDisplay(elapsedTime);
  saveFirestoreData();
}

function resetStopwatch() {
  if (viewingDate !== currentDate) return;
  isRunning = false;
  clearInterval(timerInterval);
  startTime = null;
  elapsedTime = 0;
  updateStopwatchDisplay(0);
  saveFirestoreData();
}

function savePeriod() {
  if (viewingDate !== currentDate) return;
  const selected = periodSelect.value;
  const previous = parseTime(periodFields[selected].value || "00:00:00");
  const now = isRunning ? elapsedTime + (Date.now() - startTime) : elapsedTime;
  const updated = previous + now;
  periodFields[selected].value = formatTime(updated);
  calculateTotal();
  resetStopwatch();
  saveFirestoreData();
}

// --- INIT ---
function init() {
  startBtn.addEventListener("click", startStopwatch);
  stopBtn.addEventListener("click", pauseStopwatch);
  resetBtn.addEventListener("click", resetStopwatch);
  saveBtn.addEventListener("click", savePeriod);

  loadHistoryBtn.addEventListener("click", () => {
    const selectedDate = historyInput.value;
    if (selectedDate) {
      loadFirestoreData(selectedDate);
    }
  });

  loadFirestoreData(currentDate);
  historyInput.value = currentDate;
}

// Start when DOM is loaded
window.addEventListener("DOMContentLoaded", init);
function showLoading(disableUI = true) {
  document.body.style.pointerEvents = disableUI ? "none" : "";
  document.body.style.opacity = disableUI ? 0.5 : "";
  if (!document.getElementById("loadingSpinner")) {
    const spinner = document.createElement("div");
    spinner.id = "loadingSpinner";
    spinner.style.position = "fixed";
    spinner.style.top = "50%";
    spinner.style.left = "50%";
    spinner.style.transform = "translate(-50%, -50%)";
    spinner.style.zIndex = 9999;
    spinner.innerHTML = `<div class="spinner"></div>`;
    document.body.appendChild(spinner);
  }
}

function hideLoading() {
  document.body.style.pointerEvents = "";
  document.body.style.opacity = "";
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.remove();
}

