// ------------------------------
// TÍTULO (tu código original)
// ------------------------------
const tituloOriginal = document.title;
document.addEventListener("visibilitychange", () => {
  document.title = document.hidden ? "👋 No te vayas..." : tituloOriginal;
});

// ------------------------------
// CONFIG (colores desde CSS :root)
// ------------------------------
const rootStyles = getComputedStyle(document.documentElement);

const COLOR_NAMES = ["Blue", "Red", "Gre", "Yell", "Aqua", "Oran", "Mag"];
const COLORS = [
    rootStyles.getPropertyValue("--color-azul").trim(),
    rootStyles.getPropertyValue("--color-rojo").trim(),
    rootStyles.getPropertyValue("--color-verde").trim(),
    rootStyles.getPropertyValue("--color-amarillo").trim(),
    rootStyles.getPropertyValue("--color-aqua").trim(),
    rootStyles.getPropertyValue("--color-orange").trim(),
    rootStyles.getPropertyValue("--color-magenta").trim(),
];

// Perfiles disponibles (Font Awesome)
const PROFILES = [
    "fa-chess-pawn",
    "fa-chess-bishop",
    "fa-chess-knight",
    "fa-chess-rook",
    "fa-chess-queen",
    "fa-chess-king",
];

// ------------------------------
// STORAGE
// ------------------------------
const STORAGE_KEY = "escaleras_serpientes_usuarios_v1";

// ------------------------------
// DOM
// ------------------------------
const container = document.querySelector(".cont-player-card");
const cards = Array.from(document.querySelectorAll(".player-card"));

// ------------------------------
// MODELO: Array de usuarios (4)
// ------------------------------
let usuarios = createDefaultUsersFromUI();

// Exponlo si quieres usarlo desde otros scripts:
window.usuarios = usuarios;

// ------------------------------
// INIT: aplicar estado + cargar storage
// ------------------------------
initCards();          // asegura dataset y selects
loadUsuarios();       // si hay en localStorage, pisa el estado
applyUsuariosToUI();  // pinta UI desde array final

// ------------------------------
// FUNCIONES PRINCIPALES
// ------------------------------

function createDefaultUsersFromUI() {
    return cards.map((card, i) => {
        const input = card.querySelector(".player-name");
        const nombre = input?.value?.trim() || ""; // inicialmente vacío
        const colorIndex = Number(card.dataset.colorIndex ?? 0);
        const profileIndex = Number(card.dataset.profileIndex ?? 0);

        return {
            id: i,
            nombre,
            colorIndex,
            profileIndex,
        };
    });
}

function initCards() {
    cards.forEach((card, i) => {
        // Guardamos índice de usuario para mapear card -> usuarios[i]
        card.dataset.userIndex = String(i);

        // Inicializa índices si no están
        card.dataset.colorIndex = card.dataset.colorIndex ?? "0";
        card.dataset.profileIndex = card.dataset.profileIndex ?? "0";

        // Pinta el estado
        applyColor(card);
        initColorSelect(card);
        applyProfile(card);
    });
}

function applyUsuariosToUI() {
    cards.forEach((card) => {
        const idx = getUserIndex(card);
        const user = usuarios[idx];
        if (!user) return;

        // Nombre
        const input = card.querySelector(".player-name");
        if (input) input.value = user.nombre ?? "";

        // Color y perfil
        card.dataset.colorIndex = String(user.colorIndex ?? 0);
        card.dataset.profileIndex = String(user.profileIndex ?? 0);

        applyColor(card);
        initColorSelect(card);
        const select = card.querySelector(".player-color-select");
        if (select) select.value = card.dataset.colorIndex;

        applyProfile(card);
        syncProfileColor(card);
    });
}

function saveUsuarios() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios));
}

function loadUsuarios() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
        const parsed = JSON.parse(raw);

        // Validación mínima: array y longitud 4
        if (!Array.isArray(parsed) || parsed.length !== cards.length) return;

        // Normaliza valores y asigna
        usuarios = parsed.map((u, i) => ({
            id: i,
            nombre: typeof u.nombre === "string" ? u.nombre : "",
            colorIndex: clampIndex(u.colorIndex, COLORS.length),
            profileIndex: clampIndex(u.profileIndex, PROFILES.length),
        }));

        window.usuarios = usuarios;
    } catch {
    // Si el JSON está mal, lo ignoramos
    }
}

function clampIndex(value, length) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    const mod = ((n % length) + length) % length;
    return mod;
}

function getUserIndex(card) {
    return Number(card.dataset.userIndex ?? 0);
}

// ------------------------------
// PINTADO (tu lógica + pequeñas mejoras)
// ------------------------------
function applyColor(card) {
    const idx = Number(card.dataset.colorIndex ?? 0);
    card.style.setProperty("--player-color", COLORS[idx]);
}

function initColorSelect(card) {
    const select = card.querySelector(".player-color-select");
    if (!select) return;

  // Rellenar una sola vez
    if (select.options.length === 0) {
        COLORS.forEach((_, i) => {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = COLOR_NAMES?.[i] ?? `Color ${i + 1}`;
        select.appendChild(opt);
        });
    }

    // Sincronizar con el estado actual
    select.value = card.dataset.colorIndex ?? "0";
}

function ensureProfileIcon(card) {
    const profileBox = card.querySelector(".player-profile");
    if (!profileBox) return null;

    let icon = profileBox.querySelector("i");

    // Si la tarjeta no trae icono (jugadores 1-4), lo creamos
    if (!icon) {
        icon = document.createElement("i");
        icon.className = "fa-solid fa-chess-pawn profile";
        profileBox.appendChild(icon);
    }

    return icon;
}

function applyProfile(card) {
    const idx = Number(card.dataset.profileIndex ?? 0);
    const icon = ensureProfileIcon(card);
    if (!icon) return;

    icon.className = `fa-solid ${PROFILES[idx]} profile`;
    icon.style.color = "var(--player-color)";
}

function syncProfileColor(card) {
    const icon = card.querySelector(".player-profile i");
    if (icon) icon.style.color = "var(--player-color)";
}

// ------------------------------
// EVENTOS: sincronizan UI -> usuarios -> localStorage
// ------------------------------

// 1) Botones (delegación): color y perfil
container.addEventListener("click", (e) => {
    const card = e.target.closest(".player-card");
    if (!card) return;

    const userIndex = getUserIndex(card);
    const user = usuarios[userIndex];
    if (!user) return;

    // --- Cambio de COLOR ---
    const nextColorBtn = e.target.closest(".player-color-next");
    const backColorBtn = e.target.closest(".player-color-back");

    if (nextColorBtn || backColorBtn) {
        const current = Number(card.dataset.colorIndex ?? 0);
        const step = nextColorBtn ? 1 : -1;
        const total = COLORS.length;

        const nextIndex = (current + step + total) % total;
        card.dataset.colorIndex = String(nextIndex);

        // UI
        applyColor(card);
        const select = card.querySelector(".player-color-select");
        if (select) select.value = card.dataset.colorIndex;
        syncProfileColor(card);

        // ARRAY
        user.colorIndex = nextIndex;
        saveUsuarios();
        return;
    }

    // --- Cambio de PERFIL ---
    const nextProfileBtn = e.target.closest(".player-profile-next");
    const backProfileBtn = e.target.closest(".player-profile-back");

    if (nextProfileBtn || backProfileBtn) {
        const current = Number(card.dataset.profileIndex ?? 0);
        const step = nextProfileBtn ? 1 : -1;
        const total = PROFILES.length;

        const nextIndex = (current + step + total) % total;
        card.dataset.profileIndex = String(nextIndex);

        // UI
        applyProfile(card);

        // ARRAY
        user.profileIndex = nextIndex;
        saveUsuarios();
        return;
    }
});

// 2) Select de color
container.addEventListener("change", (e) => {
    const select = e.target.closest(".player-color-select");
    if (!select) return;

    const card = select.closest(".player-card");
    if (!card) return;

    const userIndex = getUserIndex(card);
    const user = usuarios[userIndex];
    if (!user) return;

    card.dataset.colorIndex = select.value;

    // UI
    applyColor(card);
    syncProfileColor(card);

    // ARRAY
    user.colorIndex = clampIndex(select.value, COLORS.length);
    saveUsuarios();
});

// 3) Input de nombre (en tiempo real)
container.addEventListener("input", (e) => {
    const input = e.target.closest(".player-name");
    if (!input) return;

    const card = input.closest(".player-card");
    if (!card) return;

    const userIndex = getUserIndex(card);
    const user = usuarios[userIndex];
    if (!user) return;

    user.nombre = input.value;
    saveUsuarios();
});

// ------------------------------
// START: Normalizar nombres y pasar a partida
// ------------------------------
const startBtn = document.querySelector(".btn-start");

if (startBtn) {
    startBtn.addEventListener("click", () => {
        // 1) Normaliza nombres: si vacío -> placeholder
        cards.forEach((card) => {
        const userIndex = getUserIndex(card);
        const user = usuarios[userIndex];
        if (!user) return;

        const input = card.querySelector(".player-name");
        if (!input) return;

        const limpio = input.value.trim();

        // Placeholder como fallback (si no hay placeholder, crea uno por defecto)
        const fallback = (input.placeholder && input.placeholder.trim())
            ? input.placeholder.trim()
            : `Jugador ${userIndex + 1}`;

        const finalName = limpio === "" ? fallback : limpio;

        // Actualiza UI + array
        input.value = finalName;
        user.nombre = finalName;
        });

        // 2) Guarda en localStorage para usar en partida.html luego
        saveUsuarios();

        // 3) Redirige a la siguiente página
        window.location.href = "partida.html";
    });
}