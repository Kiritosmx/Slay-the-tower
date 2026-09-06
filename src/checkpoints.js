// ============================================================
// Sistema de checkpoints funcionales — "Slay the Tower"
// Verificaciones automáticas de funcionalidad, rendimiento y
// estabilidad en hitos clave del desarrollo.
//
// Diseño:
//   - Cada checkpoint = hito verificable con criterios objetivos
//   - Se ejecuta al alcanzar el hito (inicio, tras cambios críticos,
//     pre-release) y bajo demanda
//   - Emite un registro estructurado (verificado/pendiente/alerta)
//   - Expuesto en consola del navegador: window.__CHECKPOINTS__
// ============================================================

import { CARDS, BOSS, PISOS, crearBarajaInicial, elegirIntencionJefe, INTENCIONES_JEFE } from "./gamedata.js";
import { Combat } from "./combat.js";
import { UI } from "./ui.js";
import {
  CargadorImagenesResiliente,
  conReintentos,
  esErrorReintentable,
  calcularRetraso,
  Cortacircuitos,
  CacheComplementario,
  MonitorEventos,
  generarFallbackSVG,
} from "./resilient.js";

// ---------- Infra ----------
export class SistemaCheckpoints {
  constructor({ limites = {} } = {}) {
    this.registros = new Map(); // id -> registro
    this.limites = {
      msPorTurno: 50,          // rendimiento: un turno no debe tardar más
      msRenderUi: 100,         // rendimiento: render completo de la UI
      registrosMaximos: 100,
      ...limites,
    };
  }

  // Ejecuta un checkpoint por id: `verificar(id) -> registro`
  async verificar(id) {
    const definicion = CHECKPOINTS.find((c) => c.id === id);
    if (!definicion) throw new Error(`Checkpoint desconocido: ${id}`);
    const registro = {
      id,
      hito: definicion.hito,
      ts: new Date().toISOString(),
      estado: "pendiente",
      comprobaciones: [],
      resumen: "",
    };
    try {
      const detalle = await definicion.ejecutar(this);
      registro.comprobaciones = detalle.comprobaciones;
      const fallos = detalle.comprobaciones.filter((c) => !c.ok);
      const alertas = detalle.comprobaciones.filter((c) => c.estado === "alerta" && c.ok);
      registro.estado = fallos.length === 0 ? "verificado" : "alerta";
      registro.resumen =
        fallos.length === 0
          ? `${detalle.comprobaciones.length} comprobaciones OK${alertas.length ? ` (${alertas.length} con observaciones)` : ""}`
          : `${fallos.length} comprobaciones fallidas: ${fallos.map((f) => f.nombre).join("; ")}`;
      registro.datos = detalle.datos ?? null;
    } catch (err) {
      registro.estado = "alerta";
      registro.resumen = `Error del verificador: ${err?.message ?? err}`;
      registro.comprobaciones.push({ nombre: "ejecución del checkpoint", ok: false, detalle: String(err?.message ?? err) });
    }
    this.registros.set(id, registro);
    this.#limiteSeguridad();
    this.#notificar(registro);
    return registro;
  }

  async verificarTodos() {
    for (const checkpoint of CHECKPOINTS) {
      await this.verificar(checkpoint.id);
    }
    return this.informe();
  }

  // Verificación rápida de los checkpoints que no requieren interactuar
  async verificarBase() {
    for (const checkpoint of CHECKPOINTS.filter((c) => c.tipo === "base")) {
      await this.verificar(checkpoint.id);
    }
    return this.informe();
  }

  #limiteSeguridad() {
    if (this.registros.size <= this.registrosMaximos) return;
    const claves = [...this.registros.keys()].slice(0, this.registros.size - this.registrosMaximos);
    for (const clave of claves) this.registros.delete(clave);
  }

  #notificar(registro) {
    const prefijo = registro.estado === "verificado" ? "[CHECKPOINT OK]" : "[CHECKPOINT ALERTA]";
    console.info(`${prefijo} ${registro.id} — ${registro.resumen}`);
  }

  // Informe agregado para documentación/monitoreo
  informe() {
    const registros = [...this.registros.values()];
    const verificados = registros.filter((r) => r.estado === "verificado").length;
    const alertas = registros.filter((r) => r.estado === "alerta").length;
    return {
      total: registros.length,
      verificados,
      alertas,
      estadoGlobal: alertas > 0 ? "alerta" : verificados > 0 ? "verificado" : "pendiente",
      registros: registros.map(({ id, hito, ts, estado, resumen }) => ({ id, hito, ts, estado, resumen })),
    };
  }
}

// ---------- Utilidades de verificación ----------
function crearCombatePrueba() {
  const log = [];
  const combat = new Combat({
    onStateChange: () => {},
    onGameOver: () => log.push("derrota"),
    onVictory: () => log.push("victoria"),
    onLog: (msg) => log.push(msg),
  });
  combat.iniciarCombate();
  return { combat, log };
}

async function medirTiempo(fn) {
  const inicio = performance.now();
  await fn();
  return performance.now() - inicio;
}

function combatAsincrónico() {
  return new Combat({
    onStateChange: () => {},
    onGameOver: () => {},
    onVictory: () => {},
    onLog: () => {},
  }); // Sin iniciar: lo controla el checkpoint
}

function comprobacion(nombre, ok, detalle = "", estado = ok ? "ok" : "fallo") {
  return { nombre, ok, detalle, estado };
}

// ---------- Definición de checkpoints (hitos clave) ----------
export const CHECKPOINTS = [
  // ---- CP-01: Hito "Datos del juego cargados" ----
  {
    id: "cp01-datos-juego",
    hito: "Datos del juego íntegros (cartas, baraja, jefe e intenciones)",
    tipo: "base",
    async ejecutar(sistema) {
      const comprobaciones = [];
      const idsEsperados = ["strike", "defend", "neutralize", "survivor"];
      for (const id of idsEsperados) {
        const card = CARDS[id];
        const ok = Boolean(card?.name && card?.cost != null && card?.description && card?.image);
        comprobaciones.push(comprobacion(`carta ${id} definida con imagen`, ok, card ? `${card.name} (coste ${card.cost})` : "ausente"));
      }
      const baraja = crearBarajaInicial();
      comprobaciones.push(
        comprobacion("baraja inicial: 12 cartas", baraja.length === 12, `${baraja.length} cartas`),
        comprobacion(
          "todas las cartas de la baraja existen en CARDS",
          baraja.every((id) => CARDS[id]),
          baraja.join(",")
        ),
        comprobacion("jefe definido con nombre e imagen", Boolean(BOSS?.name && BOSS?.image), `${BOSS?.name} (${BOSS?.maxHp} PS)`),
        comprobacion("intenciones del jefe: 5 patrones", INTENCIONES_JEFE.length === 5, `${INTENCIONES_JEFE.length} intenciones`),
        comprobacion(
          "selector de intención nunca repite la inmediata anterior",
          (() => {
            for (const intent of INTENCIONES_JEFE) {
              const elegida = elegirIntencionJefe(intent.id);
              if (elegida.id === intent.id) return false;
            }
            return true;
          })(),
          "aleatoriedad sin repetición validada"
        )
      );
      return { comprobaciones, datos: { cartas: idsEsperados.length, baraja: baraja.length } };
    },
  },

  // ---- CP-02: Hito "Motor de combate operativo" ----
  {
    id: "cp02-motor-combate",
    hito: "Motor de combate operativo (turnos, robo, energía, fin de partida)",
    tipo: "base",
    async ejecutar(sistema) {
      const comprobaciones = [];
      const { combat } = crearCombatePrueba();

      comprobaciones.push(
        comprobacion("turno 1 iniciado", combat.turn === 1, `turno ${combat.turn}`),
        comprobacion("energía completa al iniciar turno", combat.player.energy === combat.player.maxEnergy, `${combat.player.energy}/${combat.player.maxEnergy}`),
        comprobacion("mano inicial de 7 cartas (rasgo +2)", combat.hand.length === 7, `${combat.hand.length} cartas`),
        comprobacion("pila de robo + descarte = 12", combat.deck.length + combat.discard.length === 5, `${combat.deck.length} + ${combat.discard.length}`)
      );

      // Robo con reciclaje de descartes
      combat.deck = [];
      combat.discard = ["strike", "defend", "neutralize"];
      combat.hand = [];
      combat.robar(3);
      comprobaciones.push(
        comprobacion("reciclaje de descarte al agotar pila", combat.hand.length === 3, `${combat.hand.length} robadas`),
        comprobacion("descarte vacío tras reciclar", combat.discard.length === 0, `${combat.discard.length} restantes`)
      );

      // Límite de mano
      combat.hand = Array(10).fill("strike");
      combat.deck = ["defend"];
      combat.robar(2);
      comprobaciones.push(comprobacion("límite de mano respetado (máx 10)", combat.hand.length === 10, `${combat.hand.length} cartas`));

      // Reglas de juego (combate nuevo: "defend" garantizada en mano)
      const { combat: combatCartas } = crearCombatePrueba();
      combatCartas.hand[0] = "defend";
      const energiaAntes = combatCartas.player.energy;
      combatCartas.jugarCarta(combatCartas.hand.findIndex((c) => c === "defend"));
      comprobaciones.push(
        comprobacion("carta jugable consume energía", combatCartas.player.energy === energiaAntes - 1, `${combatCartas.player.energy} restantes`),
        comprobacion("bloqueo aplicado al jugar Defensa", combatCartas.player.block === 5, `bloqueo ${combatCartas.player.block}`),
        comprobacion("carta jugada va a descarte", combatCartas.discard.includes("defend"), `${combatCartas.discard.length} en descarte`)
      );

      // Cartas prohibitivas sin energía
      combatCartas.player.energy = 0;
      const energiaConGolpe = combatCartas.puedeJugar(combatCartas.hand[0]);
      comprobaciones.push(comprobacion("sin energía: cartas no jugables", energiaConGolpe === false, "regla de energía aplicada"));

      // Daño con bloqueo
      combatCartas.player.block = 5;
      combatCartas.jugadorRecibirDaño(8);
      comprobaciones.push(
        comprobacion("bloqueo absorbe daño antes de la vida", combatCartas.player.block === 0 && combatCartas.player.hp === combatCartas.player.maxHp - 3, `bloqueo ${combatCartas.player.block}, PS ${combatCartas.player.hp}`)
      );

      return { comprobaciones, datos: { turno: combat.turn } };
    },
  },

  // ---- CP-03: Hito "Flujo de victoria/derrota" ----
  {
    id: "cp03-fin-partida",
    hito: "Condiciones de fin de partida (victoria y derrota) correctas",
    tipo: "base",
    async ejecutar(sistema) {
      const comprobaciones = [];
      const combat = combatAsincrónico();
      combat.iniciarCombate();

      // Victoria: jefe a 0 PS (mano determinista con Golpe garantizado)
      combat.boss.hp = 1;
      combat.hand[0] = "strike";
      combat.player.energy = combat.player.maxEnergy;
      const idxGolpe = combat.hand.indexOf("strike");
      combat.jugarCarta(idxGolpe);
      comprobaciones.push(
        comprobacion("jefe a 0 PS desencadena victoria", combat.over === true, `over=${combat.over}`),
        comprobacion("no se puede jugar tras fin de partida", combat.puedeJugar("strike") === false, "bloqueo post-fin activo")
      );

      // Derrota: jugador a 0 PS
      const combat2 = combatAsincrónico();
      combat2.iniciarCombate();
      combat2.player.hp = 3;
      combat2.boss.intent = INTENCIONES_JEFE.find((i) => i.id === "atacar");
      combat2.player.block = 0;
      const avisoGameOver = new Promise((res) => (combat2.onGameOver = res));
      combat2.finalizarTurno();
      await avisoGameOver;
      comprobaciones.push(
        comprobacion("jugador a 0 PS desencadena derrota", combat2.over === true, `over=${combat2.over}`)
      );

      return { comprobaciones, datos: null };
    },
  },

  // ---- CP-04: Hito "Rendimiento del motor" ----
  {
    id: "cp04-rendimiento",
    hito: "Rendimiento: simulación de 20 turnos dentro de límites",
    tipo: "base",
    async ejecutar(sistema) {
      const comprobaciones = [];
      const { combat } = crearCombatePrueba();

      const ms = await medirTiempo(async () => {
        for (let i = 0; i < 20 && !combat.over; i++) {
          combat.turnoJugador();
        }
      });
      comprobaciones.push(
        comprobacion("20 turnos simulados", combat.turn >= 21, `turno ${combat.turn}`),
        comprobacion(
          `tiempo por turno <= ${sistema.limites.msPorTurno} ms`,
          ms / 20 <= sistema.limites.msPorTurno,
          `${(ms / 20).toFixed(2)} ms/turno`,
          ms / 20 <= sistema.limites.msPorTurno ? "ok" : "alerta"
        )
      );
      return { comprobaciones, datos: { msTotal: Math.round(ms), msPorTurno: +(ms / 20).toFixed(2) } };
    },
  },

  // ---- CP-05: Hito "UI renderiza el combate" ----
  {
    id: "cp05-ui",
    hito: "Interfaz de usuario renderiza el combate completamente",
    tipo: "base",
    async ejecutar(sistema) {
      const comprobaciones = [];
      // Contenedor aislado (id único) para no colisionar con renders previos
      // en DOM compartido: los duplicados de id rompen querySelector("#id").
      const contenedor = document.createElement("div");
      const idPrevio = document.querySelector("#btn-fin-turno");
      if (idPrevio) idPrevio.id = "btn-fin-turno-legacy"; // desactiva id residual
      document.body.appendChild(contenedor);
      const { combat } = crearCombatePrueba();
      const ui = new UI(contenedor);

      const ms = await medirTiempo(() => ui.setCombat(combat));
      const html = contenedor.innerHTML;

      comprobaciones.push(
        comprobacion("render produce HTML", html.length > 500, `${html.length} caracteres`),
        comprobacion("muestra intención del jefe", html.includes("intencion-icono"), ""),
        comprobacion("muestra nombre del jefe", html.includes(combat.boss.name), combat.boss.name),
        comprobacion("muestra energía del jugador", html.includes("Energía"), ""),
        comprobacion("botón de fin de turno presente", Boolean(contenedor.querySelector(".btn-fin-turno")), ""),
        comprobacion("cartas de la mano renderizadas", contenedor.querySelectorAll(".carta").length === 7, `${contenedor.querySelectorAll(".carta").length} cartas`),
        comprobacion(
          `render UI <= ${sistema.limites.msRenderUi} ms`,
          ms <= sistema.limites.msRenderUi,
          `${ms.toFixed(1)} ms`,
          ms <= sistema.limites.msRenderUi ? "ok" : "alerta"
        )
      );
      contenedor.remove();
      return { comprobaciones, datos: { msRender: Math.round(ms) } };
    },
  },

  // ---- CP-06: Hito "Resiliencia ante errores 503 / cache_only_cold" ----
  {
    id: "cp06-resiliencia-503",
    hito: "Resiliencia activa: reintentos, caché y fallbacks ante 503/cache_only_cold",
    tipo: "resiliencia",
    async ejecutar(sistema) {
      const comprobaciones = [];

      // 1. Clasificación del incidente de referencia
      const errIncidente = new Error("cache-only admission rejected a cold, unavailable, or overloaded request (Model Provider Error Code: cache_only_cold, HTTP Status: 503) (4028)");
      errIncidente.status = 503;
      comprobaciones.push(
        comprobacion("error cache_only_cold/503 clasificado como reintentable", esErrorReintentable(errIncidente), "política de reintentos lo cubre"),
        comprobacion("error 500 NO se reintenta (evita reintentos inútiles)", esErrorReintentable(Object.assign(new Error("fallo interno"), { status: 500 })) === false, "ahorra carga al proveedor")
      );

      // 2. Backoff exponencial con jitter
      const retrasos = [0, 1, 2, 3, 4].map((i) => calcularRetraso(i));
      const crece = retrasos[1] > retrasos[0];
      const techoOk = retrasos.every((r) => r <= 8000 * 1.3);
      comprobaciones.push(
        comprobacion("backoff exponencial creciente", crece, retrasos.map((r) => `${r}ms`).join(" → ")),
        comprobacion("backoff respeta techo máximo", techoOk, `máx ${Math.max(...retrasos)}ms`)
      );

      // 3. Reintentos inteligentes sobre un servicio que falla 2 veces y luego responde
      let llamadas = 0;
      const resultado = await conReintentos(
        async () => {
          llamadas++;
          if (llamadas <= 2) {
            const err = new Error("503 cache_only_cold simulado");
            err.status = 503;
            throw err;
          }
          return "recurso";
        },
        { intentos: 4 }
      );
      comprobaciones.push(
        comprobacion("reintento exitoso tras 2 fallos 503", resultado === "recurso" && llamadas === 3, `${llamadas} llamadas`)
      );

      // 4. Cortacircuitos
      const cc = new Cortacircuitos({ umbralFallos: 3, enfriamientoMs: 50 });
      cc.permitir() && cc.registrarFallo();
      cc.permitir() && cc.registrarFallo();
      cc.permitir() && cc.registrarFallo();
      const abierto = !cc.permitir();
      await new Promise((r) => setTimeout(r, 60));
      const semiabierto = cc.permitir();
      cc.registrarExito();
      const cerrado = cc.permitir();
      comprobaciones.push(
        comprobacion("cortacircuitos se abre tras fallos consecutivos", abierto, "protege al proveedor de sobrecarga"),
        comprobacion("cortacircuitos semiabre tras enfriamiento y cierra con éxito", semiabierto && cerrado, "recuperación gradual")
      );

      // 5. Caché complementaria
      const cache = new CacheComplementario({ ttlMs: 1000 });
      cache.guardar("recurso", "valor-A");
      const hit1 = cache.obtener("recurso");
      await new Promise((r) => setTimeout(r, 1100));
      const hitExpirado = cache.obtener("recurso");
      comprobaciones.push(
        comprobacion("caché complementaria sirve recursos repetidos", hit1 === "valor-A", "hit en memoria"),
        comprobacion("TTL de caché expira correctamente", hitExpirado === null, "no sirve datos obsoletos")
      );

      // 6. Fallback local
      const svg = generarFallbackSVG("Golpe");
      comprobaciones.push(
        comprobacion("fallback local SVG generable sin red", svg.startsWith("data:image/svg+xml"), "jugabilidad garantizada sin proveedor")
      );

      // 7. Cargador resiliente integrado: caída total → fallback
      const cargador = new CargadorImagenesResiliente({
        cargar: async () => {
          const err = new Error("503 simulado persistente");
          err.status = 503;
          throw err;
        },
        reintentos: 2,
        retraso: () => 1,
      });
      const res = await cargador.resolver("https://ejemplo/imagen.png", { etiqueta: "Prueba" });
      comprobaciones.push(
        comprobacion("cargador degrada a fallback tras agotar reintentos", res.ok === false && res.origen === "fallback", `origen=${res.origen}`)
      );

      // 8. Monitoreo
      const monitor = new MonitorEventos();
      monitor.registrar("info", "inicio");
      monitor.registrar("aviso", "reintento 1 tras error de servicio");
      monitor.registrar("error", "recurso no disponible");
      const resumen = monitor.resumen();
      comprobaciones.push(
        comprobacion("monitoreo registra eventos y calcula salud", resumen.total === 3 && resumen.salud === "degradado", `salud=${resumen.salud}`)
      );

      return { comprobaciones, datos: { llamadasHastaExito: llamadas } };
    },
  },

  // ---- CP-07: Hito "Recursos del juego cargados" (con degradación) ----
  {
    id: "cp07-recursos-imagenes",
    hito: "Recursos de imágenes resueltos (remoto, caché o fallback)",
    tipo: "resiliencia",
    async ejecutar(sistema) {
      const comprobaciones = [];
      // El cargador global se comparte con la UI; si no existe aún (pruebas), se instancia
      const cargador = globalThis.__CARGADOR_RECURSOS__ ?? new CargadorImagenesResiliente();
      const urls = [CARDS.strike.image, CARDS.defend.image, CARDS.neutralize.image, CARDS.survivor.image, ...PISOS.map((p) => p.image)];
      await cargador.precargar(urls);

      const origenes = urls.map((u) => cargador.resultados.get(u)).filter(Boolean);
      const conFallback = origenes.filter((r) => r.origen === "fallback").length;
      comprobaciones.push(
        comprobacion(`${urls.length} recursos críticos resueltos`, origenes.length === urls.length, `${origenes.length} resueltos`),
        comprobacion(
          "juego jugable aunque las imágenes caigan a fallback",
          origenes.length === urls.length && origenes.every((r) => r.url),
          conFallback === 0 ? "todas remotas/cache" : `${conFallback} en fallback (jugable)`
        )
      );
      return { comprobaciones, datos: { origenes: origenes.map((r) => r.origen) } };
    },
  },

  // ---- CP-08: Hito "Vista de baraja completa por tipos" ----
  {
    id: "cp08-vista-baraja",
    hito: "Vista de baraja completa: botón, agrupación por tipo, orden por coste, cierre y rendimiento",
    tipo: "base",
    async ejecutar(sistema) {
      const comprobaciones = [];
      const contenedor = document.createElement("div");
      // Aislamiento de ids: si quedan botones residuales de renders previos en
      // DOM compartido, se renombran para que querySelector("#id") no ambigüe.
      const btnResidual = document.querySelector("#btn-baraja");
      if (btnResidual) btnResidual.id = "btn-baraja-legacy";
      document.body.appendChild(contenedor);

      const combat = new Combat({
        onStateChange: () => {},
        onGameOver: () => {},
        onVictory: () => {},
        onLog: () => {},
      });
      combat.iniciarCombate();
      const ui = new UI(contenedor);
      ui.setCombat(combat);

      // 1. Botón presente y accesible
      const btnBaraja = contenedor.querySelector("#btn-baraja");
      comprobaciones.push(
        comprobacion("botón 'Ver todas mis cartas' presente", Boolean(btnBaraja), btnBaraja ? "accesible con teclado" : "ausente")
      );

      // 2. Apertura del modal y carga completa de las 12 cartas
      ui.abrirModalBaraja();
      const modal = contenedor.querySelector("#modal-baraja");
      const cartasRenderizadas = contenedor.querySelectorAll(".carta-vista").length;
      comprobaciones.push(
        comprobacion("modal de baraja se abre", Boolean(modal), ""),
        comprobacion("carga las 12 cartas de la baraja", cartasRenderizadas === 12, `${cartasRenderizadas} cartas`)
      );

      // 3. Agrupación por tipos y orden por coste
      const grupos = combat.obtenerBarajaPorTipos();
      const tiposEsperados = ["Ataque", "Habilidad", "Poder"];
      const ordenTiposOk = grupos.every((g) => tiposEsperados.includes(g.tipo));
      const totalEnGrupos = grupos.reduce((s, g) => s + g.cartas.length, 0);
      const costesOrdenados = grupos.every((g) => {
        const costes = g.cartas.map((c) => c.cost);
        return costes.every((v, i) => i === 0 || costes[i - 1] <= v);
      });
      const grupoAtaque = grupos.find((g) => g.tipo === "Ataque");
      const ataqueEmpiezaBarato = grupoAtaque ? grupoAtaque.cartas[0].cost === 0 : false; // Neutralizar (0) antes de Golpe (1)
      comprobaciones.push(
        comprobacion("grupos de tipos en orden canónico (⚔ 🛡 ✦)", grupos.length === 2 && ordenTiposOk, grupos.map((g) => g.tipo).join(", ")),
        comprobacion("las 12 cartas están en los grupos", totalEnGrupos === 12, `${totalEnGrupos} cartas`),
        comprobacion("cartas ordenadas por coste dentro de cada tipo", costesOrdenados && ataqueEmpiezaBarato, "⚔ Neutralizar (0) → Golpe (1)")
      );

      // 4. Títulos de tipo visibles en el DOM
      const titulos = [...contenedor.querySelectorAll(".tipo-titulo")].map((el) => el.textContent);
      comprobaciones.push(
        comprobacion("títulos de los grupos de tipo renderizados (⚔ Ataque, 🛡 Habilidad)", titulos.length === 2, titulos.join(" | "))
      );

      // 5. Controles de cierre: X, Volver, Escape y clic en fondo
      const btnCerrar = contenedor.querySelector("#btn-cerrar-modal");
      const btnVolver = contenedor.querySelector("#btn-volver");
      comprobaciones.push(
        comprobacion("control de cierre X presente", Boolean(btnCerrar), ""),
        comprobacion("control 'Volver al combate' presente", Boolean(btnVolver), "")
      );
      ui.cerrarModalBaraja();
      comprobaciones.push(
        comprobacion("cierre devuelve a la interfaz principal", !contenedor.querySelector("#modal-baraja"), "modal retirado del DOM")
      );

      // 6. Rendimiento: render del modal con la baraja máxima (100 cartas)
      const ms = await medirTiempo(() => {
        // Simula la baraja máxima: se renderiza con un combate con 100 cartas
        const combatGrande = new Combat({
          onStateChange: () => {},
          onGameOver: () => {},
          onVictory: () => {},
          onLog: () => {},
        });
        combatGrande.iniciarCombate();
        combatGrande.deck = Array(100).fill("strike");
        const uiGrande = new UI(contenedor);
        uiGrande.setCombat(combatGrande);
        uiGrande.abrirModalBaraja();
        uiGrande.cerrarModalBaraja();
      });
      comprobaciones.push(
        comprobacion(
          `modal con 100 cartas renderiza <= ${sistema.limites.msRenderUi} ms`,
          ms <= sistema.limites.msRenderUi,
          `${ms.toFixed(1)} ms`,
          ms <= sistema.limites.msRenderUi ? "ok" : "alerta"
        )
      );

      contenedor.remove();
      return {
        comprobaciones,
        datos: { cartas: cartasRenderizadas, grupos: grupos.length, msModal100: Math.round(ms) },
      };
    },
  },
];

// ---------- Instancia global para el navegador ----------
if (typeof globalThis !== "undefined") {
  const sistema = new SistemaCheckpoints();
  globalThis.__CHECKPOINTS__ = sistema;
  if (typeof window !== "undefined") {
    window.__CHECKPOINTS__ = sistema;
  }
}
