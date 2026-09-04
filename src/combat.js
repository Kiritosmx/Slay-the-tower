// Motor de combate por turnos estilo Slay the Spire
import { CARDS, crearBarajaInicial, BOSS, PLAYER, PISOS, crearJefeDePiso, elegirIntencionJefe, elegirRecompensas, INTENCIONES_JEFE, TIPOS } from "./gamedata.js";

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
      block: 0,
      energy: 3,
      maxEnergy: 3,
      weak: 0,          // Débil: ataques del jugador -25%
      vulnerable: 0,
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
    // Modo descarte pendiente (Superviviente)
    this.pendingDiscard = null;
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
    this.player.block = 0; // El bloqueo no persiste entre turnos del jugador
    // Reducir debuffs al inicio del turno del jugador
    if (this.player.weak > 0) this.player.weak--;
    if (this.player.vulnerable > 0) this.player.vulnerable--;
    // Nueva intención del jefe (se muestra durante el turno del jugador).
    // Se clona con el daño de este piso para no contaminar la base.
    const base = elegirIntencionJefe(this.boss.lastIntentId);
    const valorPiso = PISOS[this.piso]?.intenciones[base.id];
    this.boss.intent = { ...base, valor: valorPiso ?? base.valor };
    this.boss.lastIntentId = base.id;
    // El jefe pierde su bloqueo al inicio de su turno
    this.boss.block = 0;
    this.robar(5);
    this.ultimaAccion = `Turno ${this.turn} — Tu turno`;
    this.notify();
  }

  robar(n) {
    for (let i = 0; i < n; i++) {
      if (this.hand.length >= 10) break;
      if (this.deck.length === 0) {
        if (this.discard.length === 0) break;
        this.deck = barajar([...this.discard]);
        this.discard = [];
      }
      this.hand.push(this.deck.pop());
    }
  }

  // ---------- Jugando cartas ----------
  puedeJugar(cardId) {
    const card = CARDS[cardId];
    if (!card || this.over || this.busy) return false;
    if (this.pendingDiscard) return false;
    if (this.player.energy < card.cost) return false;
    return true;
  }

  jugarCarta(indiceMano) {
    if (!this.puedeJugar(this.hand[indiceMano])) return;
    const cardId = this.hand[indiceMano];
    const card = CARDS[cardId];
    this.hand.splice(indiceMano, 1);
    this.player.energy -= card.cost;

    // --- Efectos de la carta ---
    if (card.block) {
      this.player.block += card.block;
      this.onSonido("bloqueo");
    }
    if (card.damage) {
      const dmg = this.calcularDañoJugador(card.damage);
      this.jefeRecibirDaño(dmg, "slash");
      this.onSonido("ataque");
    } else if (!card.block) {
      this.onSonido("habilidad");
    }
    if (card.weak) {
      this.boss.weak += card.weak;
    }

    // Superviviente: requiere descartar 1 carta
    if (card.discard) {
      if (this.hand.length > 0) {
        this.pendingDiscard = true;
        this.ultimaAccion = `${card.name}: elige una carta para descartar`;
      } else {
        // Si es la última carta de la mano no hay nada que descartar: se resuelve igual
        this.discard.push(cardId);
      }
    } else {
      this.discard.push(cardId);
    }

    if (this.boss.hp <= 0) return this.ganar();
    this.notify();
  }

  descartarCarta(indiceMano) {
    if (!this.pendingDiscard) return;
    const cardId = this.hand[indiceMano];
    this.hand.splice(indiceMano, 1);
    this.discard.push(cardId);
    this.discard.push("survivor");
    this.pendingDiscard = false;
    this.ultimaAccion = "Carta descartada";
    this.notify();
  }

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

  // ---------- Daño ----------
  jefeRecibirDaño(cantidad, tipo = "slash") {
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
    if (this.over || this.busy || this.pendingDiscard) return;
    this.busy = true;
    this.onSonido("fin-turno");
    // Cartas de la mano van al descarte
    this.discard.push(...this.hand);
    this.hand = [];
    this.notify();

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
    this.ultimaAccion = `¡${this.boss.name} derrotado! Elige tu recompensa`;
    this.recompensa = elegirRecompensas(3);
    this.notify();
    this.onSonido("victoria");
    this.onVictory();
  }

  // Elige 1 de las 3 cartas de recompensa: entra en la baraja y, si quedan
  // pisos, se avanza al siguiente (vida persistente + 25% de cura).
  elegirRecompensa(cardId) {
    if (!this.over || this.boss.hp > 0) return;
    if (!this.recompensa || !this.recompensa.includes(cardId)) return;
    this.discard.push(cardId);
    this.recompensaElegida = cardId;
    this.recompensa = null;
    this.onSonido("recompensa");
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
