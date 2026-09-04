// ============================================================
// Catálogo de cartas II: infrecuentes + raras + ancestrales.
// Mismo formato que cartas_basicas.js (ver su cabecera).
// ============================================================

export const CATALOGO_II = [
{
  id: "accelerant", name: "Acelerante", type: "Habilidad", rarity: "Infrecuente", img: "Accelerant",
  base: { cost: 1, text: "El Veneno se activa 1 vez adicional.", fx: { power: { id: "accelerant", n: 1 } } },
  plus: { cost: 1, text: "El Veneno se activa 2 veces adicionales.", fx: { power: { id: "accelerant", n: 2 } } },
},
{
  id: "accuracy", name: "Precisión", type: "Habilidad", rarity: "Infrecuente", img: "Accuracy",
  base: { cost: 1, text: "Tus Dagas infligen 4 de daño adicional.", fx: { power: { id: "accuracy", n: 4 } } },
  plus: { cost: 1, text: "Tus Dagas infligen 6 de daño adicional.", fx: { power: { id: "accuracy", n: 6 } } },
},
{
  id: "acrobatics", name: "Acrobacia", type: "Habilidad", rarity: "Infrecuente", img: "Acrobatics",
  base: { cost: 1, text: "Roba 3 cartas. Descarta 1 carta.", fx: { draw: 3, discardN: 1 } },
  plus: { cost: 1, text: "Roba 4 cartas. Descarta 1 carta.", fx: { draw: 4, discardN: 1 } },
},
{
  id: "backstab", name: "Puñalada Trapera", type: "Ataque", rarity: "Infrecuente", img: "Backstab",
  base: { cost: 0, text: "Innata. Inflige 11 de daño. Se agota.", fx: { innate: true, dmg: 11, exhaust: true } },
  plus: { cost: 0, text: "Innata. Inflige 15 de daño. Se agota.", fx: { innate: true, dmg: 15, exhaust: true } },
},
{
  id: "bladesymphony", name: "Sinfonía de Cuchillas", type: "Habilidad", rarity: "Infrecuente", img: "BladeSymphony",
  base: { cost: 2, text: "Añade 2 Dagas a tu mano.", fx: { shivs: 2 } },
  plus: { cost: 2, text: "Añade 2 Dagas a tu mano.", fx: { shivs: 2 } },
},
{
  id: "blur", name: "Desenfoque", type: "Habilidad", rarity: "Infrecuente", img: "Blur",
  base: { cost: 1, text: "Gana 5 de Bloqueo. No se pierde al empezar tu turno.", fx: { block: 5, blur: true } },
  plus: { cost: 1, text: "Gana 8 de Bloqueo. No se pierde al empezar tu turno.", fx: { block: 8, blur: true } },
},
{
  id: "bouncingflask", name: "Frasco Rebotante", type: "Habilidad", rarity: "Infrecuente", img: "BouncingFlask",
  base: { cost: 2, text: "Aplica 9 de Veneno.", fx: { poison: 9 } },
  plus: { cost: 2, text: "Aplica 12 de Veneno.", fx: { poison: 12 } },
},
{
  id: "bubblebubble", name: "Doble Burbuja", type: "Habilidad", rarity: "Infrecuente", img: "BubbleBubble",
  base: { cost: 1, text: "Si el enemigo tiene Veneno, aplica 9 de Veneno.", fx: { poisonSiHay: 9 } },
  plus: { cost: 1, text: "Si el enemigo tiene Veneno, aplica 12 de Veneno.", fx: { poisonSiHay: 12 } },
},
{
  id: "calculatedgamble", name: "Apuesta Calculada", type: "Habilidad", rarity: "Infrecuente", img: "CalculatedGamble",
  base: { cost: 0, text: "Descarta tu mano y roba las mismas cartas.", fx: { calcGamble: true } },
  plus: { cost: 0, text: "Descarta tu mano y roba las mismas cartas.", fx: { calcGamble: true } },
},
{
  id: "concoct", name: "Brebaje", type: "Habilidad", rarity: "Infrecuente", img: "Concoct",
  base: { cost: 0, text: "Tus Ataques aplican 3 de Veneno este turno.", fx: { concoct: 3 } },
  plus: { cost: 0, text: "Tus Ataques aplican 4 de Veneno este turno.", fx: { concoct: 4 } },
},
{
  id: "dash", name: "Embestida", type: "Ataque", rarity: "Infrecuente", img: "Dash",
  base: { cost: 2, text: "Gana 10 de Bloqueo. Inflige 10 de daño.", fx: { block: 10, dmg: 10 } },
  plus: { cost: 2, text: "Gana 13 de Bloqueo. Inflige 13 de daño.", fx: { block: 13, dmg: 13 } },
},
{
  id: "echoingslash", name: "Tajo Resonante", type: "Ataque", rarity: "Infrecuente", img: "EchoingSlash",
  base: { cost: 1, text: "Inflige 12 de daño.", fx: { dmg: 12 } },
  plus: { cost: 1, text: "Inflige 15 de daño.", fx: { dmg: 15 } },
},
{
  id: "escapeplan", name: "Plan de Fuga", type: "Habilidad", rarity: "Infrecuente", img: "EscapePlan",
  base: { cost: 0, text: "Roba 1 carta. Si es Habilidad, gana 3 de Bloqueo.", fx: { escapeCheck: 3 } },
  plus: { cost: 0, text: "Roba 1 carta. Si es Habilidad, gana 5 de Bloqueo.", fx: { escapeCheck: 5 } },
},
{
  id: "expertise", name: "Pericia", type: "Habilidad", rarity: "Infrecuente", img: "Expertise",
  base: { cost: 1, text: "Roba 2 cartas. Tu mano se conserva este turno.", fx: { draw: 2, expertiseRetain: true } },
  plus: { cost: 1, text: "Roba 3 cartas. Tu mano se conserva este turno.", fx: { draw: 3, expertiseRetain: true } },
},
{
  id: "expose", name: "Exposición", type: "Habilidad", rarity: "Infrecuente", img: "Expose",
  base: { cost: 0, text: "Anula el Bloqueo enemigo. Aplica 2 de Vulnerable. Se agota.", fx: { expose: 2, exhaust: true } },
  plus: { cost: 0, text: "Anula el Bloqueo enemigo. Aplica 3 de Vulnerable. Se agota.", fx: { expose: 3, exhaust: true } },
},
{
  id: "fade", name: "Desvanecimiento", type: "Habilidad", rarity: "Infrecuente", img: "Fade",
  base: { cost: 0, text: "Se conserva. Gana 6 de Destreza este turno.", fx: { retain: true, dexTemp: 6 } },
  plus: { cost: 0, text: "Se conserva. Gana 9 de Destreza este turno.", fx: { retain: true, dexTemp: 9 } },
},
{
  id: "finisher", name: "Remate", type: "Ataque", rarity: "Infrecuente", img: "Finisher",
  base: { cost: 1, text: "Inflige 6 de daño por cada Ataque jugado este turno.", fx: { finisher: 6 } },
  plus: { cost: 1, text: "Inflige 8 de daño por cada Ataque jugado este turno.", fx: { finisher: 8 } },
},
{
  id: "flechettes", name: "Dardos", type: "Ataque", rarity: "Infrecuente", img: "Flechettes",
  base: { cost: 1, text: "Inflige 5 de daño por cada Habilidad en tu mano.", fx: { flechettes: 5 } },
  plus: { cost: 1, text: "Inflige 7 de daño por cada Habilidad en tu mano.", fx: { flechettes: 7 } },
},
{
  id: "footwork", name: "Juego de Pies", type: "Habilidad", rarity: "Infrecuente", img: "Footwork",
  base: { cost: 1, text: "Gana 2 de Destreza.", fx: { power: { id: "footwork", n: 2 } } },
  plus: { cost: 1, text: "Gana 3 de Destreza.", fx: { power: { id: "footwork", n: 3 } } },
},
{
  id: "handtrick", name: "Truco de Manos", type: "Habilidad", rarity: "Infrecuente", img: "HandTrick",
  base: { cost: 1, text: "Gana 7 de Bloqueo. Tu próxima Habilidad cuesta 0.", fx: { block: 7, pounceFree: true } },
  plus: { cost: 1, text: "Gana 10 de Bloqueo. Tu próxima Habilidad cuesta 0.", fx: { block: 10, pounceFree: true } },
},
{
  id: "haze", name: "Neblina", type: "Habilidad", rarity: "Infrecuente", img: "Haze",
  base: { cost: 2, text: "Aplica 4 de Veneno y 1 de Débil.", fx: { poison: 4, weak: 1 } },
  plus: { cost: 2, text: "Aplica 6 de Veneno y 2 de Débil.", fx: { poison: 6, weak: 2 } },
},
{
  id: "hiddendaggers", name: "Dagas Ocultas", type: "Habilidad", rarity: "Infrecuente", img: "HiddenDaggers",
  base: { cost: 0, text: "Descarta 2 cartas. Añade 2 Dagas a tu mano.", fx: { discardN: 2, shivs: 2 } },
  plus: { cost: 0, text: "Descarta 2 cartas. Añade 3 Dagas a tu mano.", fx: { discardN: 2, shivs: 3 } },
},
{
  id: "infiniteblades", name: "Hojas Infinitas", type: "Habilidad", rarity: "Infrecuente", img: "InfiniteBlades",
  base: { cost: 1, text: "Cada turno, añade 1 Daga a tu mano.", fx: { power: { id: "infBlades", n: 1 } } },
  plus: { cost: 1, text: "Cada turno, añade 1 Daga a tu mano.", fx: { power: { id: "infBlades", n: 1 } } },
},
{
  id: "legsweep", name: "Barrido", type: "Habilidad", rarity: "Infrecuente", img: "LegSweep",
  base: { cost: 2, text: "Aplica 2 de Débil. Gana 11 de Bloqueo.", fx: { weak: 2, block: 11 } },
  plus: { cost: 2, text: "Aplica 3 de Débil. Gana 14 de Bloqueo.", fx: { weak: 3, block: 14 } },
},
{
  id: "mementomori", name: "Memento Mori", type: "Ataque", rarity: "Infrecuente", img: "MementoMori",
  base: { cost: 1, text: "Inflige 9 de daño, +4 por carta descartada este turno.", fx: { memento: 4, dmgBase: 9 } },
  plus: { cost: 1, text: "Inflige 11 de daño, +5 por carta descartada este turno.", fx: { memento: 5, dmgBase: 11 } },
},
{
  id: "mirage", name: "Espejismo", type: "Habilidad", rarity: "Infrecuente", img: "Mirage",
  base: { cost: 1, text: "Gana Bloqueo igual al Veneno enemigo. Se agota.", fx: { mirage: true, exhaust: true } },
  plus: { cost: 1, text: "Gana Bloqueo igual al Veneno enemigo.", fx: { mirage: true } },
},
{
  id: "noxiousfumes", name: "Humos Nocivos", type: "Habilidad", rarity: "Infrecuente", img: "NoxiousFumes",
  base: { cost: 1, text: "Cada turno, aplica 2 de Veneno.", fx: { power: { id: "fumes", n: 2 } } },
  plus: { cost: 1, text: "Cada turno, aplica 3 de Veneno.", fx: { power: { id: "fumes", n: 3 } } },
},
{
  id: "phantomblades", name: "Hojas Fantasma", type: "Habilidad", rarity: "Infrecuente", img: "PhantomBlades",
  base: { cost: 1, text: "Tus Dagas se conservan. La primera +9 de daño.", fx: { power: { id: "phantom", n: 9 } } },
  plus: { cost: 1, text: "Tus Dagas se conservan. La primera +12 de daño.", fx: { power: { id: "phantom", n: 12 } } },
},
{
  id: "pinpoint", name: "Punto de Mira", type: "Ataque", rarity: "Infrecuente", img: "Pinpoint",
  base: { cost: 3, text: "Inflige 15 de daño. Cuesta 1 menos por Habilidad jugada.", fx: { dmg: 15, pin: true } },
  plus: { cost: 3, text: "Inflige 19 de daño. Cuesta 1 menos por Habilidad jugada.", fx: { dmg: 19, pin: true } },
},
{
  id: "pounce", name: "Salto Felino", type: "Ataque", rarity: "Infrecuente", img: "Pounce",
  base: { cost: 2, text: "Inflige 14 de daño. Tu próxima Habilidad cuesta 0.", fx: { dmg: 14, pounceFree: true } },
  plus: { cost: 2, text: "Inflige 20 de daño. Tu próxima Habilidad cuesta 0.", fx: { dmg: 20, pounceFree: true } },
},
{
  id: "precisecut", name: "Corte Preciso", type: "Ataque", rarity: "Infrecuente", img: "PreciseCut",
  base: { cost: 0, text: "Inflige 13 de daño, −2 por otra carta en mano.", fx: { precise: 13 } },
  plus: { cost: 0, text: "Inflige 16 de daño, −2 por otra carta en mano.", fx: { precise: 16 } },
},
{
  id: "reflex", name: "Reflejos", type: "Habilidad", rarity: "Infrecuente", img: "Reflex",
  base: { cost: 3, text: "Escurridiza. Roba 2 cartas.", fx: { sly: true, draw: 2 } },
  plus: { cost: 3, text: "Escurridiza. Roba 3 cartas.", fx: { sly: true, draw: 3 } },
},
{
  id: "sidestep", name: "Paso Lateral", type: "Habilidad", rarity: "Infrecuente", img: "Sidestep",
  base: { cost: 0, text: "El próximo turno, gana 1 de Energía.", fx: { sidestepEnergy: 1 } },
  plus: { cost: 0, text: "El próximo turno, gana 2 de Energía.", fx: { sidestepEnergy: 2 } },
},
{
  id: "skewer", name: "Ensartar", type: "Ataque", rarity: "Infrecuente", img: "Skewer",
  base: { cost: "X", text: "Inflige 8 de daño X veces.", fx: { skewerX: 8 } },
  plus: { cost: "X", text: "Inflige 11 de daño X veces.", fx: { skewerX: 11 } },
},
{
  id: "speedster", name: "Velocista", type: "Habilidad", rarity: "Infrecuente", img: "Speedster",
  base: { cost: 2, text: "Innata. Al robar, inflige 2 de daño.", fx: { innate: true, power: { id: "speedster", n: 2 } } },
  plus: { cost: 2, text: "Innata. Al robar, inflige 2 de daño.", fx: { innate: true, power: { id: "speedster", n: 2 } } },
},
{
  id: "strangle", name: "Estrangular", type: "Ataque", rarity: "Infrecuente", img: "Strangle",
  base: { cost: 1, text: "Inflige 8 de daño. Tus cartas quitan 2 PS este turno.", fx: { dmg: 8, strangle: 2 } },
  plus: { cost: 1, text: "Inflige 10 de daño. Tus cartas quitan 3 PS este turno.", fx: { dmg: 10, strangle: 3 } },
},
{
  id: "tactician", name: "Estratega", type: "Habilidad", rarity: "Infrecuente", img: "Tactician",
  base: { cost: 3, text: "Escurridiza. Gana 1 de Energía.", fx: { sly: true, energy: 1 } },
  plus: { cost: 3, text: "Escurridiza. Gana 2 de Energía.", fx: { sly: true, energy: 2 } },
},
{
  id: "upmysleeve", name: "As en la Manga", type: "Habilidad", rarity: "Infrecuente", img: "UpMySleeve",
  base: { cost: 2, text: "Añade 3 Dagas a tu mano. Gana 1 de Energía.", fx: { shivs: 3, upEnergy: 1 } },
  plus: { cost: 2, text: "Añade 4 Dagas a tu mano. Gana 1 de Energía.", fx: { shivs: 4, upEnergy: 1 } },
},
{
  id: "abrasive", name: "Abrasivo", type: "Habilidad", rarity: "Rara", img: "Abrasive",
  base: { cost: 3, text: "Escurridiza. Gana 1 de Destreza y 4 de Espinas.", fx: { sly: true, power: { id: "abrasiveDex", n: 1 }, thorns: 4 } },
  plus: { cost: 3, text: "Escurridiza. Gana 1 de Destreza y 6 de Espinas.", fx: { sly: true, power: { id: "abrasiveDex", n: 1 }, thorns: 6 } },
},
{
  id: "adrenaline", name: "Adrenalina", type: "Habilidad", rarity: "Rara", img: "Adrenaline",
  base: { cost: 0, text: "Gana 2 de Energía. Roba 2 cartas. Se agota.", fx: { energy: 2, draw: 2, exhaust: true } },
  plus: { cost: 0, text: "Gana 3 de Energía. Roba 2 cartas. Se agota.", fx: { energy: 3, draw: 2, exhaust: true } },
},
{
  id: "afterimage", name: "Imagen Residual", type: "Habilidad", rarity: "Rara", img: "Afterimage",
  base: { cost: 1, text: "Cada carta jugada da 1 de Bloqueo.", fx: { power: { id: "afterimage", n: 1 } } },
  plus: { cost: 1, text: "Cada carta jugada da 1 de Bloqueo.", fx: { power: { id: "afterimage", n: 1 } } },
},
{
  id: "assassinate", name: "Asesinato", type: "Ataque", rarity: "Rara", img: "Assassinate",
  base: { cost: 0, text: "Innata. Inflige 10 de daño y 1 de Vulnerable. Se agota.", fx: { innate: true, dmg: 10, vuln: 1, exhaust: true } },
  plus: { cost: 0, text: "Innata. Inflige 13 de daño y 2 de Vulnerable. Se agota.", fx: { innate: true, dmg: 13, vuln: 2, exhaust: true } },
},
{
  id: "bladeofink", name: "Filo de Tinta", type: "Habilidad", rarity: "Rara", img: "BladeOfInk",
  base: { cost: 1, text: "Añade 2 Dagas con tinta y aplica 2 de Veneno.", fx: { shivs: 2, poison: 2 } },
  plus: { cost: 1, text: "Añade 3 Dagas con tinta y aplica 3 de Veneno.", fx: { shivs: 3, poison: 3 } },
},
{
  id: "bullettime", name: "Tiempo Bala", type: "Habilidad", rarity: "Rara", img: "BulletTime",
  base: { cost: 3, text: "No robas más. Tu mano es gratis este turno.", fx: { bulletTime: true } },
  plus: { cost: 3, text: "No robas más. Tu mano es gratis este turno.", fx: { bulletTime: true } },
},
{
  id: "burst", name: "Ráfaga", type: "Habilidad", rarity: "Rara", img: "Burst",
  base: { cost: 1, text: "Tu próxima Habilidad se juega 2 veces.", fx: { burstN: 1 } },
  plus: { cost: 1, text: "Tus próximas 2 Habilidades se juegan 2 veces.", fx: { burstN: 2 } },
},
{
  id: "corrosivewave", name: "Ola Corrosiva", type: "Habilidad", rarity: "Rara", img: "CorrosiveWave",
  base: { cost: 1, text: "Al robar, aplica 2 de Veneno este turno.", fx: { corrosive: 2 } },
  plus: { cost: 1, text: "Al robar, aplica 3 de Veneno este turno.", fx: { corrosive: 3 } },
},
{
  id: "envenom", name: "Envenenar", type: "Habilidad", rarity: "Rara", img: "Envenom",
  base: { cost: 2, text: "Tus Ataques aplican 1 de Veneno.", fx: { power: { id: "envenom", n: 1 } } },
  plus: { cost: 2, text: "Tus Ataques aplican 2 de Veneno.", fx: { power: { id: "envenom", n: 2 } } },
},
{
  id: "fanofknives", name: "Abanico de Cuchillos", type: "Habilidad", rarity: "Rara", img: "FanOfKnives",
  base: { cost: 2, text: "Añade 4 Dagas a tu mano.", fx: { shivs: 4 } },
  plus: { cost: 2, text: "Añade 5 Dagas a tu mano.", fx: { shivs: 5 } },
},
{
  id: "flanking", name: "Flanqueo", type: "Habilidad", rarity: "Rara", img: "Flanking",
  base: { cost: 2, text: "Tu próximo Ataque inflige el doble.", fx: { doubleNext: true } },
  plus: { cost: 2, text: "Tu próximo Ataque inflige el doble.", fx: { doubleNext: true } },
},
{
  id: "grandfinale", name: "Gran Final", type: "Ataque", rarity: "Rara", img: "GrandFinale",
  base: { cost: 0, text: "Solo sin robo. Inflige 60 de daño.", fx: { grandFinale: 60 } },
  plus: { cost: 0, text: "Solo sin robo. Inflige 75 de daño.", fx: { grandFinale: 75 } },
},
{
  id: "knifetrap", name: "Trampa de Cuchillos", type: "Habilidad", rarity: "Rara", img: "KnifeTrap",
  base: { cost: 2, text: "Lanza las Dagas de tu pila de agotadas.", fx: { knivesTrap: 0 } },
  plus: { cost: 2, text: "Mejora y lanza las Dagas de tu pila de agotadas.", fx: { knivesTrap: 2 } },
},
{
  id: "malaise", name: "Malestar", type: "Habilidad", rarity: "Rara", img: "Malaise",
  base: { cost: "X", text: "Aplica X de Débil y X de Vulnerable. Se agota.", fx: { malaiseX: 0, exhaust: true } },
  plus: { cost: "X", text: "Aplica X+1 de Débil y X+1 de Vulnerable. Se agota.", fx: { malaiseX: 1, exhaust: true } },
},
{
  id: "masterplanner", name: "Mente Maestra", type: "Habilidad", rarity: "Rara", img: "MasterPlanner",
  base: { cost: 2, text: "Tus Habilidades ganan Escurridiza.", fx: { power: { id: "masterplanner", n: 1 } } },
  plus: { cost: 2, text: "Tus Habilidades ganan Escurridiza.", fx: { power: { id: "masterplanner", n: 1 } } },
},
{
  id: "murder", name: "Homicidio", type: "Ataque", rarity: "Rara", img: "Murder",
  base: { cost: 3, text: "Inflige 1 de daño +1 por carta robada.", fx: { murder: 1 } },
  plus: { cost: 3, text: "Inflige 1 de daño +1 por carta robada.", fx: { murder: 1 } },
},
{
  id: "nightmare", name: "Pesadilla", type: "Habilidad", rarity: "Rara", img: "Nightmare",
  base: { cost: 3, text: "Elige una carta: el próximo turno añade 3 copias.", fx: { nightmare: true } },
  plus: { cost: 3, text: "Elige una carta: el próximo turno añade 3 copias.", fx: { nightmare: true } },
},
{
  id: "outbreak", name: "Brote", type: "Habilidad", rarity: "Rara", img: "Outbreak",
  base: { cost: 3, text: "Aplica 9 de Veneno. Se activa al instante.", fx: { poison: 9, outbreak: true } },
  plus: { cost: 3, text: "Aplica 12 de Veneno. Se activa al instante.", fx: { poison: 12, outbreak: true } },
},
{
  id: "serpentform", name: "Forma de Serpiente", type: "Habilidad", rarity: "Rara", img: "SerpentForm",
  base: { cost: 3, text: "Cada carta jugada inflige 4.", fx: { power: { id: "serpent", n: 4 } } },
  plus: { cost: 3, text: "Cada carta jugada inflige 6.", fx: { power: { id: "serpent", n: 6 } } },
},
{
  id: "shadowstep", name: "Paso Sombrío", type: "Habilidad", rarity: "Rara", img: "ShadowStep",
  base: { cost: 1, text: "Descarta tu mano. Tus Ataques hacen doble.", fx: { discardHand: true, shadowDouble: true } },
  plus: { cost: 1, text: "Descarta tu mano. Tus Ataques hacen doble.", fx: { discardHand: true, shadowDouble: true } },
},
{
  id: "shadowmeld", name: "Fusión Sombría", type: "Habilidad", rarity: "Rara", img: "Shadowmeld",
  base: { cost: 1, text: "Duplica tu Bloqueo ganado este turno.", fx: { shadowmeld: true } },
  plus: { cost: 1, text: "Duplica tu Bloqueo ganado este turno.", fx: { shadowmeld: true } },
},
{
  id: "sneaky", name: "Sigilo", type: "Habilidad", rarity: "Rara", img: "Sneaky",
  base: { cost: 2, text: "Escurridiza. Tus Ataques dan 1 de Bloqueo.", fx: { sly: true, power: { id: "sneaky", n: 1 } } },
  plus: { cost: 2, text: "Escurridiza. Tus Ataques dan 2 de Bloqueo.", fx: { sly: true, power: { id: "sneaky", n: 2 } } },
},
{
  id: "stormofsteel", name: "Tormenta de Acero", type: "Habilidad", rarity: "Rara", img: "StormOfSteel",
  base: { cost: 1, text: "Descarta tu mano. Añade 1 Daga por carta.", fx: { stormShivs: true } },
  plus: { cost: 1, text: "Descarta tu mano. Añade 1 Daga por carta.", fx: { stormShivs: true } },
},
{
  id: "thehunt", name: "La Caza", type: "Ataque", rarity: "Rara", img: "TheHunt",
  base: { cost: 1, text: "Inflige 10 de daño. Si es letal, bonus.", fx: { dmg: 10, theHunt: true } },
  plus: { cost: 1, text: "Inflige 15 de daño. Si es letal, bonus.", fx: { dmg: 15, theHunt: true } },
},
{
  id: "toolsofthetrade", name: "Herramientas del Oficio", type: "Habilidad", rarity: "Rara", img: "ToolsOfTheTrade",
  base: { cost: 1, text: "Cada turno: roba 1 y descarta 1.", fx: { power: { id: "tools", n: 1 } } },
  plus: { cost: 1, text: "Cada turno: roba 1 y descarta 1.", fx: { power: { id: "tools", n: 1 } } },
},
{
  id: "tracking", name: "Rastreo", type: "Habilidad", rarity: "Rara", img: "Tracking",
  base: { cost: 2, text: "Tus Ataques hacen +50% a objetivos Vulnerables.", fx: { power: { id: "tracking", n: 1 } } },
  plus: { cost: 2, text: "Tus Ataques hacen +50% a objetivos Vulnerables.", fx: { power: { id: "tracking", n: 1 } } },
},
{
  id: "welllaidplans", name: "Plan Perfecto", type: "Habilidad", rarity: "Rara", img: "WellLaidPlans",
  base: { cost: 2, text: "Al final del turno no descartas tu mano.", fx: { power: { id: "welllaid", n: 1 } } },
  plus: { cost: 2, text: "Al final del turno no descartas tu mano.", fx: { power: { id: "welllaid", n: 1 } } },
},
{
  id: "suppress", name: "Supresión", type: "Ataque", rarity: "Ancestral", img: "Suppress",
  base: { cost: 0, text: "Innata. Inflige 11 de daño y 3 de Débil.", fx: { innate: true, dmg: 11, weak: 3 } },
  plus: { cost: 0, text: "Innata. Inflige 17 de daño y 5 de Débil.", fx: { innate: true, dmg: 17, weak: 5 } },
},
{
  id: "wraithform", name: "Forma Espectral", type: "Habilidad", rarity: "Ancestral", img: "WraithForm",
  base: { cost: 3, text: "Gana 2 de Intangible.", fx: { power: { id: "wraith", n: 2 } } },
  plus: { cost: 3, text: "Gana 3 de Intangible.", fx: { power: { id: "wraith", n: 3 } } },
},
{
  id: "shiv", name: "Daga", type: "Ataque", rarity: "Especial", img: null,
  base: { cost: 0, text: "Inflige 4 de daño. Se agota.", fx: { dmg: 4, exhaust: true, esDaga: true } },
  plus: { cost: 0, text: "Inflige 4 de daño. Se agota.", fx: { dmg: 4, exhaust: true, esDaga: true } },
},
];
