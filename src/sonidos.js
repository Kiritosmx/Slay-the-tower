// ============================================================
// Sonidos sintetizados — "Slay the Tower"
// Efectos generados con Web Audio API: cero archivos, cero red,
// funcionan siempre (también offline). Cada acción del juego tiene
// su sonido; el estado de silencio persiste en localStorage.
// ============================================================

const CLAVE_MUTE = "stt:silenciado";

// Partituras: [frecuencia, frecuenciaFinal, tipo, duración(s), retardo(s)]
const PARTITURAS = {
  clic: [[660, 660, "square", 0.05, 0]],
  ataque: [[220, 60, "sawtooth", 0.18, 0]],
  habilidad: [[440, 880, "triangle", 0.12, 0]],
  bloqueo: [[520, 780, "triangle", 0.14, 0]],
  "dano-enemigo": [[160, 70, "square", 0.2, 0]],
  "dano-jugador": [[110, 50, "sawtooth", 0.25, 0]],
  drenar: [[300, 90, "sine", 0.3, 0]],
  "fin-turno": [[330, 330, "triangle", 0.08, 0], [330, 330, "triangle", 0.08, 0.12]],
  abrir: [[500, 700, "sine", 0.07, 0]],
  cerrar: [[700, 500, "sine", 0.07, 0]],
  robo: [[400, 900, "sine", 0.09, 0]],
  veneno: [[220, 110, "sine", 0.16, 0], [220, 110, "sine", 0.16, 0.18]],
  poder: [[196, 196, "triangle", 0.2, 0], [294, 294, "triangle", 0.25, 0.1]],
  mejora: [[523, 523, "sine", 0.1, 0], [659, 659, "sine", 0.1, 0.09], [784, 784, "sine", 0.2, 0.18]],
  recompensa: [[880, 880, "sine", 0.15, 0], [1174, 1174, "sine", 0.25, 0.12]],
  curacion: [[520, 780, "sine", 0.25, 0]],
  victoria: [[523, 523, "triangle", 0.12, 0], [659, 659, "triangle", 0.12, 0.12], [784, 784, "triangle", 0.12, 0.24], [1046, 1046, "triangle", 0.3, 0.36]],
  derrota: [[330, 330, "sawtooth", 0.25, 0], [196, 196, "sawtooth", 0.25, 0.22], [130, 130, "sawtooth", 0.4, 0.44]],
};

export class Sonidos {
  constructor({ activado = null } = {}) {
    this.historial = [];
    this.ctx = null;
    // Por defecto suena; se respeta el silencio guardado si existe
    let guardado = null;
    try {
      guardado = typeof localStorage !== "undefined" ? localStorage.getItem(CLAVE_MUTE) : null;
    } catch {
      /* almacenamiento bloqueado: se ignora */
    }
    this.activado = activado ?? guardado !== "1";
  }

  get silenciado() {
    return !this.activado;
  }

  alternar() {
    this.activado = !this.activado;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(CLAVE_MUTE, this.activado ? "0" : "1");
    } catch {
      /* sin persistencia */
    }
    return this.activado;
  }

  desbloquear() {
    this._contexto();
  }

  reproducir(nombre) {
    this.historial.push({ nombre, ts: Date.now() });
    if (!this.activado) return;
    const ctx = this._contexto();
    if (!ctx) return;
    const notas = PARTITURAS[nombre];
    if (!notas) return;
    for (const [f0, f1, tipo, dur, retardo] of notas) {
      this._tono(ctx, { f0, f1, tipo, dur, retardo });
    }
  }

  _contexto() {
    if (this.ctx) {
      if (this.ctx.state === "suspended" && this.ctx.resume) this.ctx.resume();
      return this.ctx;
    }
    try {
      const AudioCtx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      return this.ctx;
    } catch {
      return null;
    }
  }

  _tono(ctx, { f0, f1, tipo, dur, retardo }) {
    const t0 = ctx.currentTime + retardo;
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(Math.max(30, f0), t0);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    gan.gain.setValueAtTime(0.0001, t0);
    gan.gain.exponentialRampToValueAtTime(0.25, t0 + 0.015);
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gan).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}
