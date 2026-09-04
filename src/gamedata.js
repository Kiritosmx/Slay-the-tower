// Datos de cartas: las 91 de la Silenciosa (Slay the Spire 2, vía wiki)
// Catálogos en cartas_basicas.js (básicas + comunes) y cartas_avanzadas.js
// (infrecuentes + raras + ancestrales + Daga). Aquí se registran en CARDS
// en versión base y Plus ("id+"), con espejos legacy (damage/block/weak/
// discard/cost) para compatibilidad con el motor clásico.
import { CATALOGO_I } from "./cartas_basicas.js";
import { CATALOGO_II } from "./cartas_avanzadas.js";

// ---------- Tipos de carta (vista de baraja completa) ----------
// Agrupación fiel al juego: Ataque ⚔, Habilidad 🛡, Poder ✦
// (orden canónico de presentación en la vista de baraja)
export const TIPOS = ["Ataque", "Habilidad", "Poder"];
export const INFO_TIPOS = {
  Ataque:    { icono: "⚔", nombre: "Ataque",    color: "#e5534b" },
  Habilidad: { icono: "🛡", nombre: "Habilidad", color: "#6e95d7" },
  Poder:     { icono: "✦", nombre: "Poder",     color: "#b083f0" },
};

// Daga: ficha sin arte oficial (las Dagas son fichas, no recompensas)
const IMAGEN_DAGA = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="86" viewBox="0 0 150 86">` +
  `<rect width="150" height="86" fill="#1b2027"/>` +
  `<text x="75" y="58" text-anchor="middle" font-size="44">🗡️</text></svg>`
);

function imagenCarta(img, plus) {
  if (!img) return IMAGEN_DAGA;
  return `/cartas/${img}${plus ? "Plus" : ""}.png`;
}

function registrar(def, version) {
  const v = version === "+" ? def.plus : def.base;
  const id = version === "+" ? def.id + "+" : def.id;
  const nombre = version === "+" ? def.name + "+" : def.name;
  return {
    id,
    name: nombre,
    type: def.type,
    rarity: def.rarity,
    cost: v.cost,
    description: v.text,
    image: imagenCarta(def.img, version === "+"),
    fx: v.fx,
    // Espejos legacy para el motor clásico
    damage: v.fx.dmg,
    block: v.fx.block,
    weak: v.fx.weak,
    discard: v.fx.discardN,
    plus: version === "+",
    baseId: version === "+" ? def.id : null,
    plusId: version === "+" ? null : def.id + "+",
  };
}

export const CATALOGO = [...CATALOGO_I, ...CATALOGO_II];

export const CARDS = {};
for (const def of CATALOGO) {
  CARDS[def.id] = registrar(def, "");
  CARDS[def.id + "+"] = registrar(def, "+");
}

// Baraja inicial: 5 Golpe + 5 Defensa + 1 Neutralizar + 1 Superviviente
export function crearBarajaInicial() {
  return [
    ...Array(5).fill("strike"),
    ...Array(5).fill("defend"),
    "neutralize",
    "survivor",
  ];
}

// Pool de recompensas: comunes + infrecuentes + raras (sin Plus,
// sin básicas, sin ancestrales y sin fichas como la Daga)
export const IDS_RECOMPENSA = CATALOGO.filter(
  (d) => d.id !== "shiv" && (d.rarity === "Común" || d.rarity === "Infrecuente" || d.rarity === "Rara")
).map((d) => d.id);

// 3 opciones distintas al azar para la recompensa de victoria
export function elegirRecompensas(n = 3) {
  const pool = [...IDS_RECOMPENSA];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// Cartas mejorables: toda la colección salvo versiones Plus y la Daga
export function esMejorable(id) {
  const card = CARDS[id];
  return Boolean(card && !card.plus && id !== "shiv" && CARDS[card.plusId]);
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
