// ============================================================
// Catálogo de cartas I: básicas + comunes de la Silenciosa.
// Datos fieles a la wiki (Slay the Spire 2); textos en español.
// Cada definición trae base y plus. El registro en CARDS (incluidas
// las versiones "+" y el pool de recompensas) lo hace gamedata.js.
//
// Claves de fx (todas opcionales):
// dmg, block, weak, vuln, poison, draw, energy, shivs,
// exhaust, retain, innate, sly, discardN, discardHand,
// calcGamble, stormShivs, shadowDouble, bulletTime, burstN,
// grandFinale, pin, pounceFree, precise, finisher, flechettes,
// memento, murder, nightmare, outbreak, mirage, knivesTrap,
// theHunt, malaiseX, skewerX, expose, shadowmeld, concoct,
// flanking, upEnergy, predatorNext, dodgeNext, sidestepEnergy,
// escapeCheck, expertiseRetain, dexTemp, dexPerm, thorns,
// nextBlock, nextEnergy, nextDraw, doubleNext, power:{id,n}
// ============================================================

export const CATALOGO_I = [
{
  id: "strike", name: "Golpe", type: "Ataque", rarity: "Básica", img: "Strike",
  base: { cost: 1, text: "Inflige 6 de daño.", fx: { dmg: 6 } },
  plus: { cost: 1, text: "Inflige 9 de daño.", fx: { dmg: 9 } },
},
{
  id: "defend", name: "Defensa", type: "Habilidad", rarity: "Básica", img: "Defend",
  base: { cost: 1, text: "Gana 5 de Bloqueo.", fx: { block: 5 } },
  plus: { cost: 1, text: "Gana 8 de Bloqueo.", fx: { block: 8 } },
},
{
  id: "neutralize", name: "Neutralizar", type: "Ataque", rarity: "Básica", img: "Neutralize",
  base: { cost: 0, text: "Inflige 3 de daño. Aplica 1 de Débil.", fx: { dmg: 3, weak: 1 } },
  plus: { cost: 0, text: "Inflige 4 de daño. Aplica 2 de Débil.", fx: { dmg: 4, weak: 2 } },
},
{
  id: "survivor", name: "Superviviente", type: "Habilidad", rarity: "Básica", img: "Survivor",
  base: { cost: 1, text: "Gana 8 de Bloqueo. Descarta 1 carta.", fx: { block: 8, discardN: 1 } },
  plus: { cost: 1, text: "Gana 11 de Bloqueo. Descarta 1 carta.", fx: { block: 11, discardN: 1 } },
},
{
  id: "anticipate", name: "Anticipación", type: "Habilidad", rarity: "Común", img: "Anticipate",
  base: { cost: 0, text: "Gana 2 de Destreza este turno.", fx: { dexTemp: 2 } },
  plus: { cost: 0, text: "Gana 4 de Destreza este turno.", fx: { dexTemp: 4 } },
},
{
  id: "backflip", name: "Voltereta", type: "Habilidad", rarity: "Común", img: "Backflip",
  base: { cost: 1, text: "Gana 5 de Bloqueo. Roba 2 cartas.", fx: { block: 5, draw: 2 } },
  plus: { cost: 1, text: "Gana 8 de Bloqueo. Roba 2 cartas.", fx: { block: 8, draw: 2 } },
},
{
  id: "bladedance", name: "Danza de Cuchillas", type: "Habilidad", rarity: "Común", img: "BladeDance",
  base: { cost: 1, text: "Añade 3 Dagas a tu mano. Se agota.", fx: { shivs: 3, exhaust: true } },
  plus: { cost: 1, text: "Añade 4 Dagas a tu mano. Se agota.", fx: { shivs: 4, exhaust: true } },
},
{
  id: "cloakanddagger", name: "Capa y Daga", type: "Habilidad", rarity: "Común", img: "CloakAndDagger",
  base: { cost: 1, text: "Gana 6 de Bloqueo. Añade 1 Daga a tu mano.", fx: { block: 6, shivs: 1 } },
  plus: { cost: 1, text: "Gana 6 de Bloqueo. Añade 2 Dagas a tu mano.", fx: { block: 6, shivs: 2 } },
},
{
  id: "daggerspray", name: "Lluvia de Dagas", type: "Ataque", rarity: "Común", img: "DaggerSpray",
  base: { cost: 1, text: "Inflige 8 de daño.", fx: { dmg: 8 } },
  plus: { cost: 1, text: "Inflige 12 de daño.", fx: { dmg: 12 } },
},
{
  id: "daggerthrow", name: "Lanzadagas", type: "Ataque", rarity: "Común", img: "DaggerThrow",
  base: { cost: 1, text: "Inflige 9 de daño. Roba 1 carta. Descarta 1 carta.", fx: { dmg: 9, draw: 1, discardN: 1 } },
  plus: { cost: 1, text: "Inflige 12 de daño. Roba 1 carta. Descarta 1 carta.", fx: { dmg: 12, draw: 1, discardN: 1 } },
},
{
  id: "deadlypoison", name: "Veneno Mortal", type: "Habilidad", rarity: "Común", img: "DeadlyPoison",
  base: { cost: 1, text: "Aplica 5 de Veneno.", fx: { poison: 5 } },
  plus: { cost: 1, text: "Aplica 7 de Veneno.", fx: { poison: 7 } },
},
{
  id: "deflect", name: "Desvío", type: "Habilidad", rarity: "Común", img: "Deflect",
  base: { cost: 0, text: "Gana 4 de Bloqueo.", fx: { block: 4 } },
  plus: { cost: 0, text: "Gana 7 de Bloqueo.", fx: { block: 7 } },
},
{
  id: "dodgeandroll", name: "Esquiva", type: "Habilidad", rarity: "Común", img: "DodgeAndRoll",
  base: { cost: 1, text: "Gana 4 de Bloqueo. El próximo turno, gana 4 de Bloqueo.", fx: { block: 4, dodgeNext: 4 } },
  plus: { cost: 1, text: "Gana 6 de Bloqueo. El próximo turno, gana 6 de Bloqueo.", fx: { block: 6, dodgeNext: 6 } },
},
{
  id: "flickflack", name: "Flic-Flac", type: "Ataque", rarity: "Común", img: "FlickFlack",
  base: { cost: 1, text: "Escurridiza. Inflige 7 de daño.", fx: { sly: true, dmg: 7 } },
  plus: { cost: 1, text: "Escurridiza. Inflige 9 de daño.", fx: { sly: true, dmg: 9 } },
},
{
  id: "leadingstrike", name: "Golpe Inicial", type: "Ataque", rarity: "Común", img: "LeadingStrike",
  base: { cost: 1, text: "Inflige 3 de daño. Añade 2 Dagas a tu mano.", fx: { dmg: 3, shivs: 2 } },
  plus: { cost: 1, text: "Inflige 6 de daño. Añade 2 Dagas a tu mano.", fx: { dmg: 6, shivs: 2 } },
},
{
  id: "piercingwail", name: "Lamento Perforante", type: "Habilidad", rarity: "Común", img: "PiercingWail",
  base: { cost: 1, text: "El enemigo pierde fuerza: aplica 2 de Débil.", fx: { weak: 2 } },
  plus: { cost: 1, text: "El enemigo pierde fuerza: aplica 3 de Débil.", fx: { weak: 3 } },
},
{
  id: "poisonedstab", name: "Puñalada Tóxica", type: "Ataque", rarity: "Común", img: "PoisonedStab",
  base: { cost: 1, text: "Inflige 6 de daño. Aplica 3 de Veneno.", fx: { dmg: 6, poison: 3 } },
  plus: { cost: 1, text: "Inflige 8 de daño. Aplica 4 de Veneno.", fx: { dmg: 8, poison: 4 } },
},
{
  id: "predator", name: "Depredador", type: "Ataque", rarity: "Común", img: "Predator",
  base: { cost: 2, text: "Inflige 15 de daño. El próximo turno, roba 2 cartas.", fx: { dmg: 15, predatorNext: 2 } },
  plus: { cost: 2, text: "Inflige 20 de daño. El próximo turno, roba 2 cartas.", fx: { dmg: 20, predatorNext: 2 } },
},
{
  id: "prepared", name: "Preparación", type: "Habilidad", rarity: "Común", img: "Prepared",
  base: { cost: 0, text: "Roba 1 carta. Descarta 1 carta.", fx: { draw: 1, discardN: 1 } },
  plus: { cost: 0, text: "Roba 2 cartas. Descarta 2 cartas.", fx: { draw: 2, discardN: 2 } },
},
{
  id: "ricochet", name: "Rebote", type: "Ataque", rarity: "Común", img: "Ricochet",
  base: { cost: 2, text: "Escurridiza. Inflige 12 de daño.", fx: { sly: true, dmg: 12 } },
  plus: { cost: 2, text: "Escurridiza. Inflige 15 de daño.", fx: { sly: true, dmg: 15 } },
},
{
  id: "slice", name: "Corte", type: "Ataque", rarity: "Común", img: "Slice",
  base: { cost: 0, text: "Inflige 6 de daño.", fx: { dmg: 6 } },
  plus: { cost: 0, text: "Inflige 9 de daño.", fx: { dmg: 9 } },
},
{
  id: "snakebite", name: "Mordedura", type: "Habilidad", rarity: "Común", img: "Snakebite",
  base: { cost: 2, text: "Se conserva. Aplica 7 de Veneno.", fx: { retain: true, poison: 7 } },
  plus: { cost: 2, text: "Se conserva. Aplica 10 de Veneno.", fx: { retain: true, poison: 10 } },
},
{
  id: "suckerpunch", name: "Golpe Bajo", type: "Ataque", rarity: "Común", img: "SuckerPunch",
  base: { cost: 1, text: "Inflige 8 de daño. Aplica 1 de Débil.", fx: { dmg: 8, weak: 1 } },
  plus: { cost: 1, text: "Inflige 10 de daño. Aplica 2 de Débil.", fx: { dmg: 10, weak: 2 } },
},
{
  id: "untouchable", name: "Intocable", type: "Habilidad", rarity: "Común", img: "Untouchable",
  base: { cost: 2, text: "Escurridiza. Gana 6 de Bloqueo.", fx: { sly: true, block: 6 } },
  plus: { cost: 2, text: "Escurridiza. Gana 9 de Bloqueo.", fx: { sly: true, block: 9 } },
},
];
