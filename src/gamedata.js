// Datos de cartas basados en Slay the Spire 2 (La Silenciosa)
const IMG = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image";

// ---------- Tipos de carta (vista de baraja completa) ----------
// Agrupación fiel al juego: Ataque ⚔, Habilidad 🛡, Poder ✦
// (orden canónico de presentación en la vista de baraja)
export const TIPOS = ["Ataque", "Habilidad", "Poder"];
export const INFO_TIPOS = {
  Ataque:    { icono: "⚔", nombre: "Ataque",    color: "#e5534b" },
  Habilidad: { icono: "🛡", nombre: "Habilidad", color: "#6e95d7" },
  Poder:     { icono: "✦", nombre: "Poder",     color: "#b083f0" },
};

export const CARDS = {
  strike: {
    id: "strike",
    name: "Golpe",
    type: "Ataque",
    cost: 1,
    damage: 6,
    description: "Inflige 6 de daño.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy playing card art, a swift dagger strike with green poison mist, dark assassin theme, dark green and teal palette, vertical composition, stylized game illustration, no text") + "&image_size=portrait_4_3",
  },
  defend: {
    id: "defend",
    name: "Defensa",
    type: "Habilidad",
    cost: 1,
    block: 5,
    description: "Gana 5 de Bloqueo.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy playing card art, a glowing magical shield barrier with arcane runes, teal and green energy, dark background, stylized game illustration, vertical composition, no text") + "&image_size=portrait_4_3",
  },
  neutralize: {
    id: "neutralize",
    name: "Neutralizar",
    type: "Ataque",
    cost: 0,
    damage: 3,
    weak: 1,
    description: "Inflige 3 de daño. Aplica 1 de Débil.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy playing card art, a hooded assassin striking with dual daggers, purple poison smoke swirl, dark moody atmosphere, stylized game illustration, vertical composition, no text") + "&image_size=portrait_4_3",
  },
  survivor: {
    id: "survivor",
    name: "Superviviente",
    type: "Habilidad",
    cost: 1,
    block: 8,
    discard: 1,
    description: "Gana 8 de Bloqueo. Descarta 1 carta.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy playing card art, a cloaked figure evading away in smoke and shadows, green scarf trailing, dark fantasy, stylized game illustration, vertical composition, no text") + "&image_size=portrait_4_3",
  },
};

// Baraja inicial: 5 Golpe + 5 Defensa + 1 Neutralizar + 1 Superviviente
export function crearBarajaInicial() {
  return [
    ...Array(5).fill("strike"),
    ...Array(5).fill("defend"),
    "neutralize",
    "survivor",
  ];
}

// ---------- JUGADOR ----------
export const PLAYER = {
  name: "La Silenciosa",
  maxHp: 60,
  image: "/silent_sin_fondo.png",
};

// ---------- JEFE ----------
// Intenciones variable: daño / Débil (reduce tu daño) / rompe escudo / drenado pasivo
export const BOSS = {
  name: "Centinela de la Torre",
  maxHp: 200,
  image: "/boss2_sin_fondo.png",
};

// Cada intención se ejecuta contra el objeto combat
export const INTENCIONES_JEFE = [
  {
    id: "atacar",
    icon: "⚔",
    detail: (intent) => `Inflige ${intent.valor} de daño.`,
    valor: 15,
    ejecutar(combat) {
      combat.jugadorRecibirDaño(this.valor, "slash");
    },
  },
  {
    id: "aplastar",
    icon: "🔨",
    detail: (intent) => `Inflige ${intent.valor} de daño.`,
    valor: 22,
    ejecutar(combat) {
      combat.jugadorRecibirDaño(this.valor, "heavy");
    },
  },
  {
    id: "debilitar",
    icon: "🕸",
    detail: () => "Aplica 2 de Débil. Tus ataques infligen 25% menos de daño.",
    valor: 2,
    ejecutar(combat) {
      combat.player.weak = (combat.player.weak || 0) + this.valor;
    },
  },
  {
    id: "romperEscudo",
    icon: "🛡",
    detail: (intent) => `Elimina todo tu Bloqueo y inflige ${intent.valor} de daño.`,
    valor: 8,
    ejecutar(combat) {
      combat.player.block = 0;
      combat.jugadorRecibirDaño(this.valor, "magic");
    },
  },
  {
    id: "drenar",
    icon: "💀",
    detail: (intent) => `Drena ${intent.valor} de vida. Ignora tu Bloqueo.`,
    valor: 10,
    ejecutar(combat) {
      combat.jugadorRecibirDañoDirecto(this.valor, "drain");
    },
  },
];

// Selector de intención pseudoaleatoria sin repetir la inmediata anterior
export function elegirIntencionJefe(ultimaIntencionId) {
  const pool = INTENCIONES_JEFE.filter((i) => i.id !== ultimaIntencionId);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick;
}
