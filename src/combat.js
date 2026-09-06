// Motor de combate por turnos estilo Slay the Spire
import { CARDS, crearBarajaInicial, BOSS, PLAYER, PISOS, crearJefeDePiso, elegirIntencionJefe, elegirRecompensas, esMejorable, INTENCIONES_JEFE, TIPOS } from "./gamedata.js";

function barajar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export class Combat {
  constructor({ onStateChange, onGameOver, onVictory, onLog, onSonido }) {
    // Jugador
    this.player = {
      name: PLAYER.name,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      oro: 75, // Para la futura tienda
      block: 0,
      energy: 3,
      maxEnergy: 3,
      weak: 0,          // Débil: ataques del jugador -25%
      vulnerable: 0,
      intangible: 0,    // Intangible: el daño recibido baja a 1
    };
    // Jefe (enemigo del piso actual)
    this.piso = 0;
    this.boss = crearJefeDePiso(0);
    this.victoriaTotal = false;
    // Mazos
    this.deck = barajar(crearBarajaInicial()); // Pila de robo
    this.hand = [];
    this.discard = [];
    this.exhaust = [];
    this.turn = 0;
    this.over = false;
    this.busy = false;
    this.ultimaAccion = "";
    // Modo descarte pendiente (elegir N descartes tras jugar)
    this.pendingDiscard = null;
    // Mejora pendiente (elegir 1 carta para Plus al empezar cada piso)
    this.mejoraPendiente = false;
    // Pesadilla pendiente: id elegido que dará 3 copias el próximo turno
    this.pendingNightmare = null;
    // Poderes y contadores del motor extendido
    this.powers = {};
    this.destrezaPerm = 0;
    this.destrezaTurno = 0;
    this.espinas = 0;
    this.dobleBloqueo = false;
    this.manoGratis = false;
    this.sinRobo = false;
    this.pounceFree = false;
    this.doubleNext = false;
    this.retenerMano = false;
    this.expertiseRetain = false;
    this.concoctN = 0;
    this.strangleN = 0;
    this.doubleSkill = 0;
    this.nextBlock = 0;
    this.nextEnergy = 0;
    this.nextDraw = 0;
    this.corrosiveN = 0;
    this.ataquesTurno = 0;
    this.habilidadesTurno = 0;
    this.robadasCombate = 0;
    this.descartadasTurno = 0;
    this.esPrimerTurno = true;
    this.ultimaCartaJugada = null;
    this.recompensaBonus = false;
    this.bonusUsado = false;
    this.conservarBloqueo = false;
    this._origenYaDescartado = false;
    this._ultimoX = 0;
    // Recompensa de victoria: 3 opciones, se elige 1 para la baraja
    this.recompensa = null;
    this.recompensaElegida = null;

    // Callbacks para la UI
    this.onStateChange = onStateChange || (() => {});
    this.onGameOver = onGameOver || (() => {});
    this.onVictory = onVictory || (() => {});
    this.onLog = onLog || (() => {});
    this.onSonido = onSonido || (() => {});
  }

  // ---------- Flujo de combate ----------
  iniciarCombate() {
    this.turnoJugador();
  }

  turnoJugador() {
    this.turn++;
    this.player.energy = this.player.maxEnergy;
    // El bloqueo no persiste, salvo Desenfoque (1 turno)
    if (this.conservarBloqueo) this.conservarBloqueo = false;
    else this.player.block = 0;
    // Bloqueo/energía/robo programados para este turno
    if (this.nextBlock > 0) { this.player.block += this.nextBlock; this.nextBlock = 0; }
    if (this.nextEnergy > 0) { this.player.energy += this.nextEnergy; this.nextEnergy = 0; }
    // Reducir debuffs al inicio del turno del jugador
    if (this.player.weak > 0) this.player.weak--;
    if (this.player.vulnerable > 0) this.player.vulnerable--;
    if (this.player.intangible > 0) this.player.intangible--;
    // Destreza y banderas de "este turno" se reinician
    this.destrezaTurno = 0;
    this.dobleBloqueo = false;
    this.manoGratis = false;
    this.sinRobo = false;
    this.pounceFree = false;
    this.retenerMano = false;
    this.expertiseRetain = false;
    this.concoctN = 0;
    this.strangleN = 0;
    this.corrosiveN = 0;
    this.ataquesTurno = 0;
    this.habilidadesTurno = 0;
    this.descartadasTurno = 0;
    if (this.powers.phantom) this.powers.phantomUsado = false;
    // Poderes de inicio de turno
    if (this.powers.fumes) this.aplicarVeneno(this.powers.fumes);
    if (this.powers.infBlades) this.anadirDagas(this.powers.infBlades);
    if (this.powers.tools) { this.robar(1); this.forzarDescarte(1); }
    // Pesadilla: las 3 copias llegan a la mano
    if (this.pendingNightmare) {
      for (let k = 0; k < 3 && this.hand.length < 10; k++) this.hand.push(this.pendingNightmare);
      this.ultimaAccion = "La Pesadilla se hace realidad";
      this.pendingNightmare = null;
    }
    // Depredador: robo programado
    if (this.nextDraw > 0) { const n = this.nextDraw; this.nextDraw = 0; this.robar(n); }
    // Innatas del primer turno garantizadas en la mano inicial.
    // Rasgo de la Silenciosa: cada combate abre con 2 cartas adicionales.
    const abreConExtra = this.esPrimerTurno;
    if (this.esPrimerTurno) {
      this.esPrimerTurno = false;
      const innatas = this.deck.filter((id) => CARDS[id]?.fx?.innate);
      for (const id of innatas) {
        if (this.hand.length >= 10) break;
        this.deck.splice(this.deck.indexOf(id), 1);
        this.hand.push(id);
      }
    }
    // Nueva intención del jefe (se muestra durante el turno del jugador).
    // Se clona con el daño de este piso para no contaminar la base.
    const base = elegirIntencionJefe(this.boss.lastIntentId);
    const valorPiso = PISOS[this.piso]?.intenciones[base.id];
    this.boss.intent = { ...base, valor: valorPiso ?? base.valor };
    this.boss.lastIntentId = base.id;
    // El jefe pierde su bloqueo al inicio de su turno
    this.boss.block = 0;
    this.robar(abreConExtra ? 7 : 5);
    this.ultimaAccion = `Turno ${this.turn} — Tu turno`;
    this.notify();
  }

  robar(n) {
    const robadas = [];
    for (let i = 0; i < n; i++) {
      if (this.sinRobo) break;
      if (this.hand.length >= 10) break;
      if (this.deck.length === 0) {
        if (this.discard.length === 0) break;
        this.deck = barajar([...this.discard]);
        this.discard = [];
      }
      const id = this.deck.pop();
      this.hand.push(id);
      robadas.push(id);
      this.robadasCombate++;
      // Ganchos al robar durante tu turno
      if (this.powers.speedster) this.danoDirectoJefe(this.powers.speedster, "speed");
      if (this.corrosiveN > 0) this.aplicarVeneno(this.corrosiveN);
    }
    if (robadas.length > 0) this.onSonido("robo");
    return robadas;
  }

  // ---------- Ayudas del motor extendido ----------
  aplicarVeneno(n) {
    if (!n || n <= 0 || this.over) return;
    this.boss.poison = (this.boss.poison || 0) + n;
    this.onSonido("veneno");
    this.onLog(`El jefe sufre ${n} de Veneno.`);
  }

  // Daño directo que ignora Bloqueo (veneno, serpiente, estrangular...)
  danoDirectoJefe(n, tipo = "poison") {
    if (!n || n <= 0 || this.over) return;
    this.boss.hp = Math.max(0, this.boss.hp - n);
    this.flashBoss(tipo);
  }

  anadirDagas(n) {
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 10) { this.discard.push("shiv"); continue; }
      this.hand.push("shiv");
    }
    if (n > 0) this.onLog(`Añades ${n} Daga(s) a tu mano.`);
  }

  // Daño de una Daga con Precisión y primera fantasma
  danoDaga() {
    let dmg = 4 + (this.powers.accuracy || 0);
    if (this.powers.phantom && !this.powers.phantomUsado) {
      dmg += this.powers.phantom;
      this.powers.phantomUsado = true;
    }
    return dmg;
  }

  forzarDescarte(n) {
    // Descarta sin elección (Herramientas del Oficio al robar)
    for (let i = 0; i < n && this.hand.length > 0; i++) {
      this._descartar(this.hand[this.hand.length - 1]);
    }
  }

  // Descarte central: Escurridiza y Mente Maestra juegan gratis al descartar
  _descartar(cardId) {
    const idx = this.hand.indexOf(cardId);
    if (idx < 0) return;
    const card = CARDS[cardId];
    this.hand.splice(idx, 1);
    this.descartadasTurno++;
    const esSly = card?.fx?.sly || (card?.type === "Habilidad" && this.powers.masterplanner);
    if (esSly && !this.over) {
      this.ultimaAccion = `${card.name} se juega sola (Escurridiza)`;
      this._efectos(card, cardId);
      this.discard.push(cardId);
    } else {
      this.discard.push(cardId);
    }
  }

  // ---------- Jugando cartas ----------
  // Coste real: X consume toda la energía; Punto de Mira descuenta por
  // habilidad; la próxima Habilidad y Tiempo Bala la dejan en 0.
  costeEfectivo(card) {
    if (!card) return 99;
    if (card.cost === "X") return this.player.energy;
    let coste = card.cost ?? 0;
    if (card.fx?.pin) coste = Math.max(0, coste - this.habilidadesTurno);
    if (card.type === "Habilidad" && this.pounceFree) coste = 0;
    if (this.manoGratis) coste = 0;
    return coste;
  }

  puedeJugar(cardId) {
    const card = CARDS[cardId];
    if (!card || this.over || this.busy) return false;
    if (this.pendingDiscard || this.mejoraPendiente || this.pendingNightmare) return false;
    if (card.cost === "X" && this.player.energy <= 0) return false;
    if (this.player.energy < this.costeEfectivo(card)) return false;
    if (card.fx?.grandFinale && this.deck.length > 0) return false;
    return true;
  }

  jugarCarta(indiceMano) {
    const cardId = this.hand[indiceMano];
    if (!this.puedeJugar(cardId)) return;
    const card = CARDS[cardId];
    this.hand.splice(indiceMano, 1);
    const coste = this.costeEfectivo(card);
    this._ultimoX = card.cost === "X" ? this.player.energy : 0;
    this.player.energy -= coste;
    if (card.type === "Habilidad" && this.pounceFree) this.pounceFree = false;
    this.ultimaCartaJugada = cardId;

    this._efectos(card, cardId);
    // Ráfaga: la Habilidad se juega una segunda vez
    if (card.type === "Habilidad" && this.doubleSkill > 0 && !this.over) {
      this.doubleSkill--;
      this._efectos(card, cardId);
    }

    if (card.type === "Ataque") this.ataquesTurno++;
    if (card.type === "Habilidad") {
      this.habilidadesTurno++;
      if (this.powers.afterimage) this.ganarBloqueo(this.powers.afterimage);
    }
    if (this.powers.serpent && !this.over) this.danoDirectoJefe(this.powers.serpent, "serpent");
    if (this.strangleN > 0 && !this.over) this.danoDirectoJefe(this.strangleN, "strangle");
    if (this.powers.sneaky && card.type === "Ataque") this.ganarBloqueo(this.powers.sneaky);

    // Destino de la carta jugada
    if (card.fx?.exhaust) {
      this.exhaust.push(cardId);
    } else if (this.pendingDiscard) {
      // Se resuelve al elegir los descartes (la carta espera fuera)
      this.pendingOrigen = cardId;
    } else if (!this._origenYaDescartado) {
      this.discard.push(cardId);
    }
    this._origenYaDescartado = false;

    if (this.boss.hp <= 0) return this.ganar();
    this.notify();
  }

  // Bloqueo con Destreza (permanente + turno) y Fusión Sombría
  ganarBloqueo(base) {
    let total = base + this.destrezaPerm + this.destrezaTurno;
    if (this.dobleBloqueo) total *= 2;
    if (total > 0) {
      this.player.block += total;
      this.onSonido("bloqueo");
    }
    return total;
  }

  // Aplica los efectos de una carta (una vez). Orden: defensa, daño,
  // estados, robo/energía, invocaciones, descartes y poderes.
  _efectos(card, cardId) {
    const fx = card.fx || {};
    // --- Bloqueo (con Destreza y Fusión) ---
    if (fx.block) this.ganarBloqueo(fx.block);
    // --- Daño directo ---
    let dmg = 0;
    if (fx.dmg) dmg = this.calcularDañoJugador(this.danoDagaSiEs(card, fx.dmg));
    if (fx.finisher) dmg = this.calcularDañoJugador(fx.finisher * Math.max(1, this.ataquesTurno));
    if (fx.flechettes) {
      const n = this.hand.filter((id) => CARDS[id]?.type === "Habilidad").length;
      dmg = this.calcularDañoJugador(fx.flechettes * Math.max(1, n));
    }
    if (fx.memento) dmg = this.calcularDañoJugador((fx.dmgBase ?? 0) + fx.memento * this.descartadasTurno);
    if (fx.murder) dmg = this.calcularDañoJugador(fx.murder + this.robadasCombate);
    if (fx.precise != null) dmg = this.calcularDañoJugador(Math.max(0, fx.precise - 2 * this.hand.length));
    if (fx.skewerX != null) dmg = this.calcularDañoJugador(fx.skewerX * Math.max(1, this._ultimoX || 1));
    if (fx.grandFinale != null) dmg = this.calcularDañoJugador(fx.grandFinale);
    if (dmg > 0) {
      if (this.doubleNext) { dmg *= 2; this.doubleNext = false; }
      const hpAntes = this.boss.hp;
      this.jefeRecibirDaño(dmg, "slash");
      this.onSonido(card.type === "Ataque" ? "ataque" : "habilidad");
      const sinBloqueo = hpAntes - this.boss.hp;
      if (sinBloqueo > 0) {
        if (this.powers.envenom) this.aplicarVeneno(this.powers.envenom);
        if (this.concoctN > 0) this.aplicarVeneno(this.concoctN);
      }
      if ((cardId === "thehunt" || cardId === "thehunt+") && this.boss.hp <= 0) {
        this.recompensaBonus = true;
      }
    } else if (fx.block || card.type === "Habilidad") {
      this.onSonido("habilidad");
    }
    // --- Estados del jefe ---
    if (fx.weak) this.boss.weak += fx.weak;
    if (fx.vuln) this.boss.vulnerable += fx.vuln;
    if (fx.poison) this.aplicarVeneno(fx.poison);
    if (fx.poisonSiHay && (this.boss.poison || 0) > 0) this.aplicarVeneno(fx.poisonSiHay);
    if (fx.mirage) this.ganarBloqueo(this.boss.poison || 0);
    if (fx.expose) { this.boss.block = 0; this.boss.vulnerable += fx.expose; }
    if (fx.outbreak && (this.boss.poison || 0) > 0) {
      for (let t = 0; t < (this.powers.accelerant || 0) + 1 && !this.over; t++) {
        this.danoDirectoJefe(this.boss.poison, "poison");
      }
      this.boss.poison = Math.max(0, (this.boss.poison || 0) - 1);
    }
    if (fx.knivesTrap != null) {
      const dagas = this.exhaust.filter((id) => id === "shiv" || id === "shiv+");
      const porDaga = this.danoDaga() + (fx.knivesTrap || 0);
      for (const _ of dagas) { if (this.over) break; this.danoDirectoJefe(porDaga, "knife"); }
      if (dagas.length > 0) this.onSonido("ataque");
    }
    // --- Robo y energía ---
    if (fx.draw) this.robar(fx.draw);
    if (fx.energy) { this.player.energy += fx.energy; this.onSonido("robo"); }
    if (fx.predatorNext) this.nextDraw += fx.predatorNext;
    if (fx.escapeCheck) {
      const robadas = this.robar(1);
      if (robadas.length > 0 && CARDS[robadas[robadas.length - 1]]?.type === "Habilidad") {
        this.ganarBloqueo(fx.escapeCheck);
      }
    }
    if (fx.calcGamble) {
      const n = this.hand.length;
      while (this.hand.length > 0) this._descartar(this.hand[0]);
      this.robar(n);
    }
    if (fx.bulletTime) { this.sinRobo = true; this.manoGratis = true; }
    // --- Invocaciones ---
    if (fx.shivs) this.anadirDagas(fx.shivs);
    // --- Descartes como coste ---
    if (fx.discardN) this.iniciarDescarte(fx.discardN, cardId);
    if (fx.discardHand) {
      while (this.hand.length > 0) this._descartar(this.hand[0]);
    }
    if (fx.stormShivs) {
      let n = 0;
      while (this.hand.length > 0) { this._descartar(this.hand[0]); n++; }
      this.anadirDagas(n);
    }
    if (fx.shadowDouble) this.doubleNext = true;
    // --- Mejoras y banderas de turno ---
    if (fx.dexTemp) { this.destrezaTurno += fx.dexTemp; this.onSonido("poder"); }
    if (fx.dodgeNext) this.nextBlock += fx.dodgeNext;
    if (fx.sidestepEnergy) this.nextEnergy += fx.sidestepEnergy;
    if (fx.pounceFree) this.pounceFree = true;
    if (fx.shadowmeld) this.dobleBloqueo = true;
    if (fx.flanking) this.doubleNext = true;
    if (fx.upEnergy) this.player.energy += fx.upEnergy;
    if (fx.concoct) this.concoctN = fx.concoct;
    if (fx.strangle) this.strangleN = fx.strangle;
    if (fx.corrosive) this.corrosiveN = fx.corrosive;
    if (fx.doubleSkill || fx.burstN) { this.doubleSkill += fx.doubleSkill || fx.burstN; this.onSonido("poder"); }
    if (fx.blur) this.conservarBloqueo = true;
    if (fx.expertiseRetain) this.retenerMano = true;
    if (fx.malaiseX != null) {
      const x = Math.max(0, this._ultimoX || 0) + fx.malaiseX;
      this.boss.weak += x;
      this.boss.vulnerable += x;
    }
    if (fx.nightmare) this.iniciarPesadilla();
    // --- Poderes permanentes del combate ---
    if (fx.power) {
      const { id, n } = fx.power;
      if (id === "footwork" || id === "abrasiveDex") this.destrezaPerm += n;
      else if (id === "wraith") this.player.intangible += n;
      else this.powers[id] = (this.powers[id] || 0) + n;
      if (id === "phantom") this.powers.phantomUsado = false;
      this.onSonido("poder");
    }
    if (fx.thorns) { this.espinas += fx.thorns; this.onSonido("poder"); }
  }

  danoDagaSiEs(card, base) {
    if (card.id === "shiv" || card.id === "shiv+") return this.danoDaga();
    return base;
  }

  // Descarta N cartas a elegir. La carta origen espera fuera y entra al
  // resolverse, como hacía Superviviente.
  iniciarDescarte(n, origenId) {
    // Si había un origen anterior sin resolver (Ráfaga), se archiva
    if (this.pendingDiscard?.origen) this.discard.push(this.pendingDiscard.origen);
    if (this.hand.length === 0) {
      if (origenId) {
        this.discard.push(origenId);
        this._origenYaDescartado = true;
      }
      return;
    }
    this.pendingDiscard = { restan: Math.min(n, this.hand.length), origen: origenId };
    this.ultimaAccion = `${CARDS[origenId]?.name ?? "Carta"}: elige ${this.pendingDiscard.restan} para descartar`;
  }

  descartarCarta(indiceMano) {
    if (!this.pendingDiscard) return;
    const cardId = this.hand[indiceMano];
    if (cardId == null) return;
    this._descartar(cardId);
    this.pendingDiscard.restan--;
    if (this.pendingDiscard.restan <= 0) {
      if (this.pendingDiscard.origen) this.discard.push(this.pendingDiscard.origen);
      this.pendingDiscard = null;
      this.ultimaAccion = "Carta descartada";
    } else {
      this.ultimaAccion = `Elige ${this.pendingDiscard.restan} para descartar`;
    }
    this.notify();
  }

  // Pesadilla: elige 1 carta de la mano; el próximo turno trae 3 copias
  iniciarPesadilla() {
    if (this.hand.length === 0) return;
    this.pendingNightmare = true;
    this.ultimaAccion = "Pesadilla: elige una carta de tu mano";
  }

  elegirPesadilla(indiceMano) {
    if (!this.pendingNightmare) return;
    const cardId = this.hand[indiceMano];
    if (cardId == null) return;
    this.pendingNightmare = cardId;
    this.ultimaAccion = "La Pesadilla tomará forma el próximo turno";
    this.notify();
  }

  // Mejora: sustituye 1 copia por su versión Plus
  elegirMejora(cardId) {
    if (!this.mejoraPendiente) return;
    const zonas = [this.deck, this.hand, this.discard];
    for (const zona of zonas) {
      const i = zona.indexOf(cardId);
      if (i >= 0) {
        const card = CARDS[cardId];
        if (!card || !esMejorable(cardId)) return;
        zona[i] = card.plusId;
        this.mejoraPendiente = false;
        this.ultimaAccion = `${card.name} mejorada a ${CARDS[card.plusId].name}`;
        this.onSonido("mejora");
        this.notify();
        return;
      }
    }
  }

  // ---------- Insignias de estado (para la UI) ----------
  // Describen todos los efectos activos con icono, texto y ayuda.
  estadosJugador() {
    const e = [];
    const dex = this.destrezaPerm + this.destrezaTurno;
    if (dex > 0) {
      e.push({
        id: "destreza", icono: "🎯", texto: `Des ${dex}`,
        titulo: `Destreza: +${dex} al Bloqueo` + (this.destrezaTurno > 0 ? ` (${this.destrezaPerm} perm. + ${this.destrezaTurno} este turno)` : " permanente"),
        clase: "poder",
      });
    }
    if (this.espinas > 0) {
      e.push({ id: "espinas", icono: "🌵", texto: `${this.espinas}`, titulo: `Espinas: devuelve ${this.espinas} de daño al atacante`, clase: "temp" });
    }
    if (this.player.intangible > 0) {
      e.push({ id: "intangible", icono: "👻", texto: `${this.player.intangible}`, titulo: "Intangible: el daño recibido baja a 1", clase: "temp" });
    }
    const P = this.powers;
    const poderes = [
      ["accuracy", "Precisión", (n) => `+${n}`, `Dagas +N de daño`],
      ["fumes", "Humos", (n) => `${n}`, `Veneno +N cada turno`],
      ["infBlades", "Dagas", () => "/turno", `Una Daga cada turno`],
      ["afterimage", "Réplica", (n) => `+${n}`, `Bloqueo +N por carta jugada`],
      ["envenom", "Envenenar", (n) => `+${n}`, `Tus Ataques aplican N de Veneno`],
      ["tracking", "Rastreo", () => "", `+50% a objetivos Vulnerables`],
      ["serpent", "Serpiente", (n) => `+${n}`, `Cada carta jugada inflige N`],
      ["speedster", "Velocista", (n) => `+${n}`, `Robar inflige N de daño`],
      ["sneaky", "Sigilo", (n) => `+${n}`, `Tus Ataques dan N de Bloqueo`],
      ["phantom", "Fantasma", (n) => `+${n}`, `Primera Daga +N y se conservan`],
      ["masterplanner", "Estratega", () => "", `Tus Habilidades ganan Escurridiza`],
      ["accelerant", "Acelerante", (n) => `x${n + 1}`, `El Veneno actúa N veces`],
      ["tools", "Oficio", () => "", `Robas y descartas 1 cada turno`],
      ["welllaid", "Plan", () => "", `No descartas tu mano`],
    ];
    for (const [id, nombre, fmt, ayuda] of poderes) {
      if (P[id]) e.push({ id, icono: "✦", texto: `${nombre} ${fmt(P[id])}`.trim(), titulo: ayuda.replace("N", P[id]), clase: "poder" });
    }
    if (this.nextBlock > 0) e.push({ id: "nextBlock", icono: "⏭", texto: `+${this.nextBlock} 🛡`, titulo: "Bloqueo programado para el próximo turno", clase: "temp" });
    if (this.nextEnergy > 0) e.push({ id: "nextEnergy", icono: "⏭", texto: `+${this.nextEnergy} ⚡`, titulo: "Energía programada para el próximo turno", clase: "temp" });
    if (this.nextDraw > 0) e.push({ id: "nextDraw", icono: "⏭", texto: `+${this.nextDraw} 🂠`, titulo: "Robo programado para el próximo turno", clase: "temp" });
    if (this.concoctN > 0) e.push({ id: "concoct", icono: "⚗", texto: `Veneno +${this.concoctN}`, titulo: "Tus Ataques aplican Veneno este turno", clase: "temp" });
    if (this.strangleN > 0) e.push({ id: "strangle", icono: "🗡", texto: `-${this.strangleN} PS`, titulo: "Tus cartas quitan PS este turno", clase: "temp" });
    if (this.corrosiveN > 0) e.push({ id: "corrosive", icono: "☣", texto: `Veneno +${this.corrosiveN}`, titulo: "Robar aplica Veneno este turno", clase: "temp" });
    if (this.doubleNext) e.push({ id: "doubleNext", icono: "✖", texto: "Doble", titulo: "Tu próximo Ataque inflige el doble", clase: "temp" });
    if (this.pounceFree) e.push({ id: "pounceFree", icono: "🆓", texto: "Hab. gratis", titulo: "Tu próxima Habilidad cuesta 0", clase: "temp" });
    return e;
  }

  estadosJefe() {
    const e = [];
    if (this.boss.weak > 0) {
      e.push({ id: "weak", icono: "", texto: `Débil ${this.boss.weak}`, titulo: "Débil: inflige 25% menos de daño", clase: "debuff" });
    }
    if (this.boss.vulnerable > 0) {
      e.push({ id: "vulnerable", icono: "", texto: `Vuln. ${this.boss.vulnerable}`, titulo: "Vulnerable: recibe 50% más de daño", clase: "vulnerable" });
    }
    if ((this.boss.poison || 0) > 0) {
      e.push({ id: "poison", icono: "☠", texto: `${this.boss.poison}`, titulo: "Veneno: pierde vida al empezar su turno", clase: "veneno" });
    }
    return e;
  }
  // Colección del jugador: pila de robo + mano + descarte, ordenada por nombre
  // ---------- Baraja completa ----------
  // Colección del jugador: pila de robo + mano + descarte, ordenada por nombre
  obtenerBarajaCompleta() {
    return [...this.deck, ...this.hand, ...this.discard]
      .map((id) => CARDS[id])
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  // Baraja agrupada por tipo de carta (⚔ Ataque, 🛡 Habilidad, ✦ Poder) y
  // ordenada por coste de energía dentro de cada grupo (empates por nombre).
  // Las cartas con tipo desconocido van al grupo final "sin tipo".
  obtenerBarajaPorTipos() {
    const grupos = new Map();
    for (const tipo of TIPOS) grupos.set(tipo, []);
    const sinTipo = [];
    for (const id of [...this.deck, ...this.hand, ...this.discard]) {
      const card = CARDS[id];
      if (!card) continue;
      if (grupos.has(card.type)) grupos.get(card.type).push(card);
      else sinTipo.push(card);
    }
    const ordenarPorCoste = (a, b) => (a.cost ?? 0) - (b.cost ?? 0) || a.name.localeCompare(b.name, "es");
    const resultado = [];
    for (const tipo of TIPOS) {
      const cartas = grupos.get(tipo);
      if (cartas.length === 0) continue;
      cartas.sort(ordenarPorCoste);
      resultado.push({ tipo, cartas });
    }
    if (sinTipo.length > 0) {
      sinTipo.sort(ordenarPorCoste);
      resultado.push({ tipo: null, cartas: sinTipo });
    }
    return resultado;
  }

  // ---------- Pilas de robo y descarte (vista estilo Spire) ----------
  // Devuelven las cartas con su id para poder renderizarlas en modales.
  obtenerPilaRobo() {
    return this.deck.map((id) => ({ id, ...CARDS[id] })).filter((c) => c.name);
  }

  obtenerPilaDescarte() {
    return this.discard.map((id) => ({ id, ...CARDS[id] })).filter((c) => c.name);
  }

  calcularDañoJugador(base) {
    let dmg = base;
    if (this.player.weak > 0) dmg = Math.floor(dmg * 0.75);
    return Math.max(0, dmg);
  }

  // Daño que el enemigo va a realizar con su intención actual, ya con
  // el Débil aplicado. Drenar ignora el Bloqueo pero no el Débil... en
  // realidad el drenado es directo: solo atacar/aplastar/romper se reducen.
  valorIntencionEfectivo() {
    const intent = this.boss.intent;
    if (!intent || intent.valor == null) return null;
    if (["atacar", "aplastar", "romperEscudo"].includes(intent.id) && this.boss.weak > 0) {
      return Math.floor(intent.valor * 0.75);
    }
    return intent.valor;
  }

  // ---------- Daño ----------
  jefeRecibirDaño(cantidad, tipo = "slash") {
    // Vulnerable: +50% (y otro +50% con Rastreo)
    if (this.boss.vulnerable > 0) {
      cantidad = Math.floor(cantidad * 1.5);
      if (this.powers.tracking) cantidad = Math.floor(cantidad * 1.5);
    }
    let restante = cantidad;
    if (this.boss.block > 0) {
      const absorbed = Math.min(this.boss.block, restante);
      this.boss.block -= absorbed;
      restante -= absorbed;
    }
    if (restante > 0) {
      this.boss.hp = Math.max(0, this.boss.hp - restante);
      this.flashBoss(tipo);
      this.onSonido("dano-enemigo");
    }
    this.onLog(`Infliges ${cantidad} de daño al jefe.`);
  }

  jugadorRecibirDaño(cantidad, tipo = "slash") {
    // Débil del jefe: sus ataques hacen 25% menos
    if (this.boss.weak > 0) cantidad = Math.floor(cantidad * 0.75);
    // Intangible: el daño recibido baja a 1
    if (this.player.intangible > 0 && cantidad > 0) cantidad = 1;
    let restante = cantidad;
    if (this.player.block > 0) {
      const absorbed = Math.min(this.player.block, restante);
      this.player.block -= absorbed;
      restante -= absorbed;
    }
    if (restante > 0) {
      this.player.hp = Math.max(0, this.player.hp - restante);
      this.flashPlayer(tipo);
      this.onSonido("dano-jugador");
    }
    // Espinas: el atacante sufre daño al golpear
    if (cantidad > 0 && this.espinas > 0 && !this.over) {
      this.danoDirectoJefe(this.espinas, "thorns");
      this.onLog(`Tus espinas devuelven ${this.espinas} de daño.`);
    }
    this.onLog(`El jefe te inflige ${cantidad} de daño.`);
  }

  jugadorRecibirDañoDirecto(cantidad, tipo) {
    // Ignora el bloqueo (drenado pasivo)
    this.player.hp = Math.max(0, this.player.hp - cantidad);
    this.flashPlayer(tipo);
    this.onSonido("drenar");
    this.onLog(`El jefe drena ${cantidad} de vida.`);
  }

  // ---------- Fin de turno ----------
  async finalizarTurno() {
    if (this.over || this.busy || this.pendingDiscard || this.mejoraPendiente || this.pendingNightmare) return;
    this.busy = true;
    this.onSonido("fin-turno");
    // La mano se descarta, salvo Retener, Plan Perfecto o Pericia
    const conservarToda = this.retenerMano || this.expertiseRetain || this.powers.welllaid;
    for (const id of [...this.hand]) {
      if (conservarToda || CARDS[id]?.fx?.retain) continue;
      this._descartar(id);
    }
    this.notify();

    // Turno del jefe: el Veneno actúa antes de su intención
    await this.esperar(400);
    if ((this.boss.poison || 0) > 0) {
      const ticks = (this.powers.accelerant || 0) + 1;
      for (let t = 0; t < ticks && !this.over; t++) {
        this.danoDirectoJefe(this.boss.poison, "poison");
        this.onSonido("veneno");
      }
      this.boss.poison = Math.max(0, (this.boss.poison || 0) - 1);
      this.notify();
      if (this.boss.hp <= 0) {
        this.busy = false;
        return this.ganar();
      }
    }

    // Turno del jefe
    await this.esperar(400);
    const intent = this.boss.intent;
    this.ultimaAccion = `El jefe usa ${intent.id}`;
    this.notify();
    await this.esperar(300);
    intent.ejecutar(this); // `this` dentro de ejecutar es la intención
    this.notify();

    // El débil del jefe se reduce al final de su turno
    if (this.boss.weak > 0) this.boss.weak--;
    if (this.boss.vulnerable > 0) this.boss.vulnerable--;

    if (this.player.hp <= 0) {
      this.over = true;
      this.busy = false;
      this.ultimaAccion = "Has sido derrotado";
      this.notify();
      this.onSonido("derrota");
      return this.onGameOver();
    }
    if (this.boss.hp <= 0) {
      this.over = true;
      this.busy = false;
      return this.ganar();
    }

    this.busy = false;
    this.turnoJugador();
  }

  ganar() {
    this.over = true;
    this.player.oro += 35;
    this.ultimaAccion = `¡${this.boss.name} derrotado! +35 de Oro. Elige tu recompensa`;
    this.recompensa = elegirRecompensas(3);
    this.notify();
    this.onSonido("victoria");
    this.onSonido("oro");
    this.onVictory();
  }

  // Elige 1 de las 3 cartas de recompensa: entra en la baraja y, si quedan
  // pisos, se avanza al siguiente (vida persistente + 25% de cura).
  // La Caza letal otorga una elección extra antes de avanzar.
  elegirRecompensa(cardId) {
    if (!this.over || this.boss.hp > 0) return;
    if (!this.recompensa || !this.recompensa.includes(cardId)) return;
    this.discard.push(cardId);
    this.recompensaElegida = cardId;
    this.recompensa = null;
    this.onSonido("recompensa");
    if (this.recompensaBonus && !this.bonusUsado && this.piso < PISOS.length - 1) {
      this.bonusUsado = true;
      this.recompensaBonus = false;
      this.recompensa = elegirRecompensas(3);
      this.ultimaAccion = "¡La Caza otorga otra recompensa! Elige 1 más";
      this.notify();
      return;
    }
    if (this.piso >= PISOS.length - 1) {
      this.victoriaTotal = true;
      this.ultimaAccion = `${CARDS[cardId].name} se une a tu baraja. ¡Torre conquistada!`;
      this.notify();
      return;
    }
    this.ultimaAccion = `${CARDS[cardId].name} se une a tu baraja`;
    this.avanzarPiso();
  }

  // Sube al siguiente piso: el jefe cambia, la baraja (con la carta nueva)
  // se rebaraja, la vida persiste y se cura un 25% del máximo.
  avanzarPiso() {
    if (this.piso >= PISOS.length - 1) return false;
    this.piso++;
    this.boss = crearJefeDePiso(this.piso);
    const coleccion = [...this.deck, ...this.hand, ...this.discard];
    this.deck = barajar(coleccion);
    this.hand = [];
    this.discard = [];
    this.turn = 0;
    this.over = false;
    this.busy = false;
    this.pendingDiscard = null;
    this.recompensa = null;
    this.recompensaBonus = false;
    this.bonusUsado = false;
    this.mejoraPendiente = true;
    this.esPrimerTurno = true;
    const cura = Math.floor(this.player.maxHp * 0.25);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + cura);
    this.player.block = 0;
    this.onSonido("curacion");
    this.ultimaAccion = `Piso ${this.piso + 1}/${PISOS.length}: ${this.boss.name} (+${cura} PS)`;
    this.turnoJugador();
    return true;
  }

  // ---------- Utilidades ----------
  esperar(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  flashPlayer(tipo) { this.onLog(`[fx] ${tipo}`); }
  flashBoss(tipo) { this.onLog(`[fx] ${tipo}`); }

  notify() {
    this.onStateChange(this);
  }
}
