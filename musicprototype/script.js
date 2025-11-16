// Theme toggle (prefers system, allows manual override)
const themeToggle = document.getElementById("themeToggle");
const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;

function applyInitialTheme() {
  const saved = localStorage.getItem("tp_theme");
  const mode = saved || (prefersLight ? "light" : "dark");
  document.body.classList.toggle("light", mode === "light");
}
applyInitialTheme();

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light");
    localStorage.setItem("tp_theme", isLight ? "light" : "dark");
  });
}

// Tabs
const tabs = document.querySelectorAll(".tab");
const tabBtns = document.querySelectorAll(".tab-btn");
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.tab;
    tabs.forEach(t => t.classList.toggle("active", t.id === id));
  });
});

// Clicker
const scoreEl = document.getElementById("score");
const perClickEl = document.getElementById("perClick");
const upgradeCostEl = document.getElementById("upgradeCost");
const clickerMsg = document.getElementById("clickerMsg");
let score = 0;
let perClick = 1;
let upgradeCost = 10;

document.getElementById("bigClick").addEventListener("click", () => {
  score += perClick;
  scoreEl.textContent = score;
});

document.getElementById("buyUpgrade").addEventListener("click", () => {
  if (score >= upgradeCost) {
    score -= upgradeCost;
    perClick += 1;
    upgradeCost = Math.floor(upgradeCost * 1.6);
    scoreEl.textContent = score;
    perClickEl.textContent = perClick;
    upgradeCostEl.textContent = upgradeCost;
    clickerMsg.textContent = "Upgrade purchased.";
    setTimeout(() => (clickerMsg.textContent = ""), 1200);
  } else {
    clickerMsg.textContent = "Not enough points.";
    setTimeout(() => (clickerMsg.textContent = ""), 1200);
  }
});

// Reaction Timer
const stage = document.getElementById("reactionStage");
const startBtn = document.getElementById("reactionStart");
const lastEl = document.getElementById("reactionLast");
const bestEl = document.getElementById("reactionBest");
const reactionMsg = document.getElementById("reactionMsg");

let waiting = false;
let ready = false;
let goTime = 0;
let best = null;

const resetStage = (cls = "idle", text = "Idle") => {
  stage.className = `stage ${cls}`;
  stage.textContent = text;
};

startBtn.addEventListener("click", () => {
  reactionMsg.textContent = "";
  waiting = true;
  ready = false;
  resetStage("wait", "Wait for green...");
  const delay = 1000 + Math.random() * 2500;
  const timer = setTimeout(() => {
    ready = true;
    goTime = performance.now();
    resetStage("go", "Click!");
  }, delay);

  const earlyClick = () => {
    if (waiting && !ready) {
      clearTimeout(timer);
      waiting = false;
      resetStage("idle", "Too soon.");
      reactionMsg.textContent = "False start.";
      stage.removeEventListener("click", earlyClick);
      stage.removeEventListener("click", measure);
    }
  };
  const measure = () => {
    if (waiting && ready) {
      const rt = Math.round(performance.now() - goTime);
      lastEl.textContent = `${rt} ms`;
      if (best === null || rt < best) {
        best = rt;
        bestEl.textContent = `${best} ms`;
      }
      waiting = false;
      resetStage("idle", "Nice!");
      stage.removeEventListener("click", earlyClick);
      stage.removeEventListener("click", measure);
    }
  };

  stage.addEventListener("click", earlyClick);
  stage.addEventListener("click", measure);
});

// Doodle Pad
const canvas = document.getElementById("pad");
if (canvas) {
  const ctx = canvas.getContext("2d");
  ctx.lineCap = "round";
  const colorInput = document.getElementById("brushColor");
  const sizeInput = document.getElementById("brushSize");
  const clearBtn = document.getElementById("clearCanvas");

  let drawing = false;
  let last = null;

  const getPos = e => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    // scale to canvas resolution
    return {
      x: x * (canvas.width / rect.width),
      y: y * (canvas.height / rect.height)
    };
  };

  const start = e => {
    drawing = true;
    last = getPos(e);
  };
  const move = e => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.strokeStyle = colorInput.value;
    ctx.lineWidth = Number(sizeInput.value);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    last = pos;
    e.preventDefault();
  };
  const end = () => {
    drawing = false;
    last = null;
  };

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);

  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  window.addEventListener("touchend", end);

  clearBtn.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

// Trivia
const triviaQ = document.getElementById("triviaQ");
const triviaChoices = document.getElementById("triviaChoices");
const triviaStart = document.getElementById("triviaStart");
const triviaNext = document.getElementById("triviaNext");
const triviaScoreEl = document.getElementById("triviaScore");
const triviaTotalEl = document.getElementById("triviaTotal");
const triviaMsg = document.getElementById("triviaMsg");

const QUESTIONS = [
  { q: "Which language runs in a browser?", a: ["Java", "C", "Python", "JavaScript"], i: 3 },
  { q: "What does CSS stand for?", a: ["Cascading Style Sheets", "Creative Style System", "Computer Styled Sections", "Central Style Source"], i: 0 },
  { q: "Which HTML tag creates a hyperlink?", a: ["<div>", "<span>", "<a>", "<link>"], i: 2 },
  { q: "Performance API method for high-res time?", a: ["Date.now()", "performance.now()", "time()", "moment()"], i: 1 },
  { q: "What is the box used to draw on a page?", a: ["<svg>", "<canvas>", "<img>", "<paint>"], i: 1 },
];

let tqIndex = -1;
let tScore = 0;

function renderQuestion() {
  const item = QUESTIONS[tqIndex];
  triviaQ.textContent = item.q;
  triviaChoices.innerHTML = "";
  item.a.forEach((text, idx) => {
    const b = document.createElement("button");
    b.className = "choice";
    b.textContent = text;
    b.addEventListener("click", () => {
      const correct = idx === item.i;
      b.classList.add(correct ? "correct" : "wrong");
      Array.from(triviaChoices.children).forEach(c => (c.disabled = true));
      if (correct) {
        tScore++;
        triviaScoreEl.textContent = tScore;
        triviaMsg.textContent = "Correct.";
      } else {
        triviaMsg.textContent = "Oops.";
      }
      triviaNext.disabled = false;
    });
    triviaChoices.appendChild(b);
  });
  triviaTotalEl.textContent = QUESTIONS.length;
  triviaNext.disabled = true;
  triviaMsg.textContent = "";
}

triviaStart.addEventListener("click", () => {
  tScore = 0;
  tqIndex = 0;
  triviaScoreEl.textContent = tScore;
  renderQuestion();
});

triviaNext.addEventListener("click", () => {
  tqIndex++;
  if (tqIndex >= QUESTIONS.length) {
    triviaQ.textContent = "Done.";
    triviaChoices.innerHTML = "";
    triviaMsg.textContent = `Final score: ${tScore}/${QUESTIONS.length}`;
    triviaNext.disabled = true;
    return;
  }
  renderQuestion();
});