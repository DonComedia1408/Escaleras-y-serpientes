
// ==============================
// CONFIG: Debe coincidir con index
// ==============================
// OJO: usa la misma clave que guardas en index.
// En el script adaptado era:
const STORAGE_KEY = "escaleras_serpientes_usuarios_v1";

// Perfiles (igual que en index) [2](https://stevensolutions-my.sharepoint.com/personal/alejandro_radoi_stevensolutions_es/Documents/Archivos%20de%20Microsoft%C2%A0Copilot%20Chat/script.js)
const PROFILES = [
  "fa-chess-pawn",
  "fa-chess-bishop",
  "fa-chess-knight",
  "fa-chess-rook",
  "fa-chess-queen",
  "fa-chess-king",
];

// Colores desde CSS variables (igual que en index) [2](https://stevensolutions-my.sharepoint.com/personal/alejandro_radoi_stevensolutions_es/Documents/Archivos%20de%20Microsoft%C2%A0Copilot%20Chat/script.js)
const rootStyles = getComputedStyle(document.documentElement);
const COLORS = [
  rootStyles.getPropertyValue("--color-azul").trim(),
  rootStyles.getPropertyValue("--color-rojo").trim(),
  rootStyles.getPropertyValue("--color-verde").trim(),
  rootStyles.getPropertyValue("--color-amarillo").trim(),
  rootStyles.getPropertyValue("--color-aqua").trim(),
  rootStyles.getPropertyValue("--color-orange").trim(),
  rootStyles.getPropertyValue("--color-magenta").trim(),
];

// ==============================
// SERPIENTES Y ESCALERAS (EJEMPLO)
// ==============================
// Cambia este mapa a TU diseño fijo.
// Formato: casillaInicio : casillaDestino
const JUMPS = {
  // Escaleras
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91,

  // Serpientes
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 36,
  93: 73,
  95: 75,
  99: 78,
};


// ==============================
// SÍMBOLOS PARA RELACIONAR PAREJAS
// ==============================
// Puedes cambiar el orden o los símbolos a tu gusto.
// (Evita emojis raros si quieres máxima compatibilidad)
const JUMP_SYMBOLS = ["◆", "▲", "●", "■", "★", "✚", "✖", "⬟", "⬢", "⬣"];

// Construye mapas para saber:
// - qué casillas son de ladder/snake
// - qué símbolo le toca a cada pareja
const jumpMeta = buildJumpMeta(JUMPS);

// jumpMeta.from.get(n) => { type: "ladder"|"snake", symbol: "◆", to: 14 }
// jumpMeta.to.get(n)   => { type: "ladder"|"snake", symbol: "◆", from: 4 }
function buildJumpMeta(jumpsObj) {
  const entries = Object.entries(jumpsObj)
    .map(([from, to]) => ({ from: Number(from), to: Number(to) }))
    .sort((a, b) => a.from - b.from);

  const fromMap = new Map();
  const toMap = new Map();

  entries.forEach((pair, idx) => {
    const type = pair.to > pair.from ? "ladder" : "snake";
    const symbol = JUMP_SYMBOLS[idx % JUMP_SYMBOLS.length];

    fromMap.set(pair.from, { type, symbol, to: pair.to });
    toMap.set(pair.to, { type, symbol, from: pair.from });
  });

  return { from: fromMap, to: toMap };
}

// ==============================
// DOM
// ==============================
const boardEl = document.getElementById("board");
const playersHudEl = document.getElementById("playersHud");
const diceValueEl = document.getElementById("diceValue");
const diceInfoEl = document.getElementById("diceInfo");
const btnRoll = document.getElementById("btnRoll");
const btnBack = document.getElementById("btnBack");

// ==============================
// ESTADO DE PARTIDA
// ==============================
const usuarios = loadUsuariosOrDefault(); // [{id,nombre,colorIndex,profileIndex}]
const numPlayers = usuarios.length;

const positions = new Array(numPlayers).fill(1); // todos arrancan en 1
let currentPlayer = 0;
let gameOver = false;

// Map casilla -> elemento cell
const cellMap = new Map();
// tokens DOM por jugador
const tokenEls = [];
// cards HUD por jugador
const hudCards = [];

// ==============================
// INIT
// ==============================
createBoard();
createHud();
createTokens();
renderAll();

btnRoll.addEventListener("click", onRoll);
btnBack.addEventListener("click", () => history.back());

// ==============================
// FUNCIONES
// ==============================
function loadUsuariosOrDefault() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return makeDefaultUsers();

  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return makeDefaultUsers();

    // Normaliza y evita nulls
    return arr.map((u, i) => ({
      id: i,
      nombre: typeof u.nombre === "string" && u.nombre.trim() ? u.nombre.trim() : `Jugador ${i + 1}`,
      colorIndex: clampIndex(u.colorIndex, COLORS.length),
      profileIndex: clampIndex(u.profileIndex, PROFILES.length),
    }));
  } catch {
    return makeDefaultUsers();
  }
}

function makeDefaultUsers() {
  // 4 jugadores por defecto
  return Array.from({ length: 4 }, (_, i) => ({
    id: i,
    nombre: `Jugador ${i + 1}`,
    colorIndex: i % COLORS.length,
    profileIndex: 0,
  }));
}

function clampIndex(value, length) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return ((n % length) + length) % length;
}

// Crea tablero 10x10 con numeración serpenteante clásica (1 abajo izq, 10 abajo der, 11 arriba de 10, etc.)
function createBoard() {
  boardEl.innerHTML = "";

  for (let n = 1; n <= 100; n++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.n = String(n);

    // --- Marcar escaleras/serpientes + símbolo ---
    const metaFrom = jumpMeta.from.get(n); // entrada
    const metaTo = jumpMeta.to.get(n);     // salida

    if (metaFrom || metaTo) {
    const meta = metaFrom || metaTo; // el que exista
    cell.classList.add(meta.type);   // ladder o snake

    const marker = document.createElement("div");
    marker.className = "jump-marker";

    // Si esta casilla es salida (to), bajamos opacidad para diferenciar
    if (metaTo) marker.classList.add("to");

    // Símbolo compartido entre entrada y salida
    marker.textContent = meta.symbol + (metaFrom ? "I" : "F");

    cell.appendChild(marker);
    }

    const rowFromBottom = Math.floor((n - 1) / 10); // 0..9
    const row = 10 - rowFromBottom; // 10..1 (CSS grid rows)
    const colInRow = (n - 1) % 10; // 0..9
    const col = rowFromBottom % 2 === 0 ? (colInRow + 1) : (10 - colInRow);

    cell.style.gridRow = String(row);
    cell.style.gridColumn = String(col);

    const num = document.createElement("div");
    num.className = "cell-number";
    num.textContent = String(n);

    const tokensBox = document.createElement("div");
    tokensBox.className = "cell-tokens";

    cell.appendChild(num);
    cell.appendChild(tokensBox);
    boardEl.appendChild(cell);

    cellMap.set(n, cell);
  }
}

function createHud() {
  playersHudEl.innerHTML = "";

  usuarios.forEach((u, i) => {
    const card = document.createElement("div");
    card.className = "player-hud-card";
    card.dataset.player = String(i);

    const iconBox = document.createElement("div");
    iconBox.className = "player-hud-icon";
    iconBox.style.setProperty("--player-color", COLORS[u.colorIndex]);

    const icon = document.createElement("i");
    icon.className = `fa-solid ${PROFILES[u.profileIndex]}`;
    iconBox.appendChild(icon);

    const name = document.createElement("div");
    name.className = "player-hud-name";
    name.textContent = u.nombre;

    const pos = document.createElement("div");
    pos.className = "player-hud-pos";
    pos.textContent = `Casilla: 1`;

    card.appendChild(iconBox);
    card.appendChild(name);
    card.appendChild(pos);

    playersHudEl.appendChild(card);
    hudCards.push({ card, posEl: pos });
  });
}

function createTokens() {
  usuarios.forEach((u, i) => {
    const token = document.createElement("div");
    token.className = "token";
    token.dataset.player = String(i);
    token.style.setProperty("--token-color", COLORS[u.colorIndex]);

    const icon = document.createElement("i");
    icon.className = `fa-solid ${PROFILES[u.profileIndex]}`;
    token.appendChild(icon);

    tokenEls.push(token);
  });

  // Colocarlos al inicio
  usuarios.forEach((_, i) => moveTokenTo(i, 1));
}

function renderAll() {
  // HUD activo
  hudCards.forEach(({ card }, i) => {
    card.classList.toggle("active", i === currentPlayer);
  });

  // Texto turno
  diceInfoEl.textContent = `Turno de: ${usuarios[currentPlayer].nombre}`;

  // Actualiza posiciones en HUD
  hudCards.forEach(({ posEl }, i) => {
    posEl.textContent = `Casilla: ${positions[i]}`;
  });
}

function onRoll() {
  if (gameOver) return;

  const roll = randInt(1, 6);
  diceValueEl.textContent = String(roll);

  const name = usuarios[currentPlayer].nombre;
  const from = positions[currentPlayer];

  let to = from + roll;

  // Regla actual: si se pasa, lo ajusta a 100 (puedes cambiarla)
  if (to > 100) to = 100;

  // Aplica salto por serpiente/escalera
  if (JUMPS[to]) {
    to = JUMPS[to];
  }

  positions[currentPlayer] = to;
  moveTokenTo(currentPlayer, to);

  if (to === 100) {
    gameOver = true;
    diceInfoEl.textContent = `Ganador: ${name}`;
    btnRoll.disabled = true;
    renderAll();
    return;
  }

  // Siguiente turno
  currentPlayer = (currentPlayer + 1) % numPlayers;
  renderAll();
}

function moveTokenTo(playerIndex, cellNumber) {
  const cell = cellMap.get(cellNumber);
  if (!cell) return;

  const box = cell.querySelector(".cell-tokens");
  if (!box) return;

  // Mueve el token DOM dentro de la celda
  box.appendChild(tokenEls[playerIndex]);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}