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

// ---------- RECOMPENSAS DE VICTORIA ----------
// Cartas reales de la Silenciosa (Slay the Spire, vía wiki) con efectos
// adaptados al motor (daño / Bloqueo / Débil). Al vencer se ofrecen 3
// aleatorias y solo se puede elegir 1 para la baraja.
export const CARTAS_RECOMPENSA = {
  flyingknee: {
    id: "flyingknee",
    name: "Rodilla Voladora",
    type: "Ataque",
    cost: 1,
    damage: 8,
    description: "Inflige 8 de daño.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, assassin knee strike in mid-air, green cloak motion, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  daggerspray: {
    id: "daggerspray",
    name: "Lluvia de Dagas",
    type: "Ataque",
    cost: 1,
    damage: 7,
    description: "Inflige 7 de daño.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, fan of thrown daggers with green trails, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  bladedance: {
    id: "bladedance",
    name: "Danza de Cuchillas",
    type: "Ataque",
    cost: 1,
    damage: 9,
    description: "Inflige 9 de daño.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, whirling dance of spectral blades around a hooded figure, teal sparks, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  predator: {
    id: "predator",
    name: "Depredador",
    type: "Ataque",
    cost: 2,
    damage: 12,
    description: "Inflige 12 de daño.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, predator eyes in darkness lunging with fangs and daggers, green mist, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  poisonstab: {
    id: "poisonstab",
    name: "Puñalada Tóxica",
    type: "Ataque",
    cost: 1,
    damage: 5,
    weak: 2,
    description: "Inflige 5 de daño. Aplica 2 de Débil.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, dagger dripping purple poison striking forward, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  suckerpunch: {
    id: "suckerpunch",
    name: "Golpe Bajo",
    type: "Ataque",
    cost: 1,
    damage: 7,
    weak: 1,
    description: "Inflige 7 de daño. Aplica 1 de Débil.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, dirty underhand punch with brass knuckles in a tavern brawl, dark moody, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  legsweep: {
    id: "legsweep",
    name: "Barrido",
    type: "Ataque",
    cost: 2,
    damage: 11,
    weak: 2,
    description: "Inflige 11 de daño. Aplica 2 de Débil.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, sweeping leg kick tripping an armored foe, dust and motion, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  backflip: {
    id: "backflip",
    name: "Voltereta",
    type: "Habilidad",
    cost: 1,
    block: 7,
    description: "Gana 7 de Bloqueo.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, acrobat doing a backflip over a sword swing, green scarf flowing, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  cloakdagger: {
    id: "cloakdagger",
    name: "Capa y Daga",
    type: "Habilidad",
    cost: 1,
    block: 6,
    description: "Gana 6 de Bloqueo.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, cloak unfurling like wings hiding a drawn dagger, teal glow, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
  piercingwail: {
    id: "piercingwail",
    name: "Lamento Perforante",
    type: "Habilidad",
    cost: 1,
    block: 4,
    weak: 1,
    description: "Gana 4 de Bloqueo. Aplica 1 de Débil.",
    image: IMG + "?prompt=" + encodeURIComponent("fantasy card art, banshee scream shattering air with visible sound waves, dark background, stylized game illustration, vertical, no text") + "&image_size=portrait_4_3",
  },
};

// Todas las cartas jugables (base + recompensas) en un solo mapa
for (const [id, card] of Object.entries(CARTAS_RECOMPENSA)) CARDS[id] = card;

export const IDS_RECOMPENSA = Object.keys(CARTAS_RECOMPENSA);

// 3 opciones distintas al azar para la recompensa de victoria
export function elegirRecompensas(n = 3) {
  const pool = [...IDS_RECOMPENSA];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// ---------- JUGADOR ----------
export const PLAYER = {
  name: "La Silenciosa",
  maxHp: 72,
  image: "/silent_sin_fondo.png",
};

// ---------- JEFE ----------
// Rebalanceo: 200→120 PS y daños reducidos para una pelea de 8-10 turnos
// ganable (antes el daño medio ~11/turno durante ~15 turnos era letal).
// Intenciones variable: daño / Débil (reduce tu daño) / rompe escudo / drenado pasivo
export const BOSS = {
  name: "Centinela de la Torre",
  maxHp: 120,
  image: "/boss.png",
};

// Cada intención se ejecuta contra el objeto combat
export const INTENCIONES_JEFE = [
  {
    id: "atacar",
    icon: "⚔",
    detail: (intent) => `Inflige ${intent.valor} de daño.`,
    valor: 10,
    ejecutar(combat) {
      combat.jugadorRecibirDaño(this.valor, "slash");
    },
  },
  {
    id: "aplastar",
    icon: "🔨",
    detail: (intent) => `Inflige ${intent.valor} de daño.`,
    valor: 16,
    ejecutar(combat) {
      combat.jugadorRecibirDaño(this.valor, "heavy");
    },
  },
  {
    id: "debilitar",
    icon: "🕸",
    detail: (intent) => `Aplica ${intent.valor} de Débil. Tus ataques infligen 25% menos de daño.`,
    valor: 1,
    ejecutar(combat) {
      combat.player.weak = (combat.player.weak || 0) + this.valor;
    },
  },
  {
    id: "romperEscudo",
    icon: "🛡",
    detail: (intent) => `Elimina todo tu Bloqueo y inflige ${intent.valor} de daño.`,
    valor: 6,
    ejecutar(combat) {
      combat.player.block = 0;
      combat.jugadorRecibirDaño(this.valor, "magic");
    },
  },
  {
    id: "drenar",
    icon: "💀",
    detail: (intent) => `Drena ${intent.valor} de vida. Ignora tu Bloqueo.`,
    valor: 6,
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

// ---------- PISOS DE LA TORRE ----------
// 5 pisos con dificultad creciente. image_0/image_2 tienen transparencia
// real; image_1/image_3 traen escena pintada (la UI les funde los bordes).
// `intenciones` sobrescribe el daño de cada patrón en ese piso.
export const PISOS = [
  {
    id: "golem-cuerda",
    nombre: "Gólem de Cuerda",
    image: "/enemigo_0.png",
    maxHp: 60,
    escena: false,
    intenciones: { atacar: 7, aplastar: 11, debilitar: 1, romperEscudo: 5, drenar: 4 },
  },
  {
    id: "caballero-dorado",
    nombre: "Caballero Dorado",
    image: "/enemigo_1.png",
    maxHp: 80,
    escena: true,
    intenciones: { atacar: 8, aplastar: 13, debilitar: 1, romperEscudo: 5, drenar: 5 },
  },
  {
    id: "ent-sombrio",
    nombre: "Ent Sombrío",
    image: "/enemigo_2.png",
    maxHp: 100,
    escena: false,
    intenciones: { atacar: 9, aplastar: 14, debilitar: 1, romperEscudo: 6, drenar: 5 },
  },
  {
    id: "coloso-cenagal",
    nombre: "Coloso del Cenagal",
    image: "/enemigo_3.png",
    maxHp: 110,
    escena: true,
    intenciones: { atacar: 10, aplastar: 15, debilitar: 2, romperEscudo: 6, drenar: 6 },
  },
  {
    id: "centinela",
    nombre: BOSS.name,
    image: BOSS.image,
    maxHp: BOSS.maxHp,
    escena: false,
    intenciones: { atacar: 10, aplastar: 16, debilitar: 1, romperEscudo: 6, drenar: 6 },
  },
];

// Estado inicial del jefe para un piso dado
export function crearJefeDePiso(piso) {
  const P = PISOS[piso] ?? PISOS[0];
  return {
    piso,
    name: P.nombre,
    image: P.image,
    escena: P.escena,
    hp: P.maxHp,
    maxHp: P.maxHp,
    block: 0,
    weak: 0,
    vulnerable: 0,
    intent: null,
    lastIntentId: null,
  };
}
