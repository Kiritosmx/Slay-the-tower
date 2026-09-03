// Motor de combate por turnos estilo Slay the Spire
import { CARDS, crearBarajaInicial, BOSS, elegirIntencionJefe, INTENCIONES_JEFE } from "./gamedata.js";

function barajar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export class Combat {
  constructor({ onStateChange, onGameOver, onVictory, onLog }) {
    // Jugador
    this.player = {
      name: "La Silenciosa",
      hp: 60,
      maxHp: 60,
      block: 0,
      energy: 3,
      maxEnergy: 3,
      weak: 0,          // Débil: ataques del jugador -25%
      vulnerable: 0,
    };
    // Jefe
    this.boss = {
      name: BOSS.name,
      hp: BOSS.maxHp,
      maxHp: BOSS.maxHp,
      block: 0,
      weak: 0,
      vulnerable: 0,
      intent: null,
      lastIntentId: null,
    };
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

    // Callbacks para la UI
    this.onStateChange = onStateChange || (() => {});
    this.onGameOver = onGameOver || (() => {});
    this.onVictory = onVictory || (() => {});
    this.onLog = onLog || (() => {});
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
    // Nueva intención del jefe (se muestra durante el turno del jugador)
    this.boss.intent = elegirIntencionJefe(this.boss.lastIntentId);
    this.boss.lastIntentId = this.boss.intent.id;
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
    }
    if (card.damage) {
      const dmg = this.calcularDañoJugador(card.damage);
      this.jefeRecibirDaño(dmg, "slash");
    }
    if (card.weak) {
      this.boss.weak += card.weak;
    }

    // Superviviente: requiere descartar 1 carta
    if (card.discard) {
      if (this.hand.length > 0) {
        this.pendingDiscard = true;
        this.ultimaAccion = `${card.name}: elige una carta para descartar`;
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
    }
    this.onLog(`El jefe te inflige ${cantidad} de daño.`);
  }

  jugadorRecibirDañoDirecto(cantidad, tipo) {
    // Ignora el bloqueo (drenado pasivo)
    this.player.hp = Math.max(0, this.player.hp - cantidad);
    this.flashPlayer(tipo);
    this.onLog(`El jefe drena ${cantidad} de vida.`);
  }

  // ---------- Fin de turno ----------
  async finalizarTurno() {
    if (this.over || this.busy || this.pendingDiscard) return;
    this.busy = true;
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
    this.ultimaAccion = "¡Jefe derrotado!";
    this.notify();
    this.onVictory();
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
