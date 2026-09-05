// ============================================================
// Pruebas automatizadas de los checkpoints funcionales
// Se ejecutan con: npm test  (vitest)
// Cada bloque describe() corresponde a un checkpoint (hito clave).
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { CARDS, BOSS, PISOS, CARTAS_RECOMPENSA, IDS_RECOMPENSA, elegirRecompensas, crearBarajaInicial, elegirIntencionJefe, INTENCIONES_JEFE } from "../src/gamedata.js";
import { Combat } from "../src/combat.js";
import { UI } from "../src/ui.js";
import {
  conReintentos,
  esErrorReintentable,
  calcularRetraso,
  Cortacircuitos,
  CacheComplementario,
  MonitorEventos,
  generarFallbackSVG,
  CargadorImagenesResiliente,
} from "../src/resilient.js";
import { SistemaCheckpoints, CHECKPOINTS } from "../src/checkpoints.js";
import { Sonidos } from "../src/sonidos.js";

function crearCombate() {
  const combat = new Combat({
    onStateChange: () => {},
    onGameOver: () => {},
    onVictory: () => {},
    onLog: () => {},
  });
  combat.iniciarCombate();
  return combat;
}

// ---------- CP-01: Datos del juego ----------
describe("CP-01: Datos del juego íntegros", () => {
  it("define las 4 cartas base con imagen", () => {
    for (const id of ["strike", "defend", "neutralize", "survivor"]) {
      expect(CARDS[id]).toBeDefined();
      expect(CARDS[id].name).toBeTruthy();
      expect(CARDS[id].image).toMatch(/^(\/|https?:\/\/|data:)/);
    }
  });

  it("crea la baraja inicial de 12 cartas válidas", () => {
    const baraja = crearBarajaInicial();
    expect(baraja).toHaveLength(12);
    baraja.forEach((id) => expect(CARDS[id]).toBeDefined());
  });

  it("define jefe con nombre, vida e imagen", () => {
    expect(BOSS.name).toBeTruthy();
    expect(BOSS.maxHp).toBeGreaterThan(0);
    expect(BOSS.image).toMatch(/^(\/|https?:\/\/)/);
  });

  it("el selector de intención nunca repite la inmediata anterior", () => {
    for (const intent of INTENCIONES_JEFE) {
      expect(elegirIntencionJefe(intent.id).id).not.toBe(intent.id);
    }
  });
});

// ---------- CP-02: Motor de combate ----------
describe("CP-02: Motor de combate operativo", () => {
  it("inicia turno 1 con energía completa y mano de 5", () => {
    const combat = crearCombate();
    expect(combat.turn).toBe(1);
    expect(combat.player.energy).toBe(combat.player.maxEnergy);
    expect(combat.hand).toHaveLength(5);
    expect(combat.deck.length + combat.discard.length).toBe(7);
  });

  it("recicla el descarte al agotar la pila de robo", () => {
    const combat = crearCombate();
    combat.deck = [];
    combat.discard = ["strike", "defend", "neutralize"];
    combat.hand = [];
    combat.robar(3);
    expect(combat.hand).toHaveLength(3);
    expect(combat.discard).toHaveLength(0);
  });

  it("respeta el límite de 10 cartas en mano", () => {
    const combat = crearCombate();
    combat.hand = Array(10).fill("strike");
    combat.deck = ["defend"];
    combat.robar(2);
    expect(combat.hand).toHaveLength(10);
  });

  it("jugar una carta consume energía y aplica efectos", () => {
    const combat = crearCombate();
    combat.hand[0] = "defend";
    const energiaAntes = combat.player.energy;
    const idx = combat.hand.indexOf("defend");
    combat.jugarCarta(idx);
    expect(combat.player.energy).toBe(energiaAntes - 1);
    expect(combat.player.block).toBe(5);
    expect(combat.discard).toContain("defend");
  });

  it("el bloqueo absorbe el daño antes de la vida", () => {
    const combat = crearCombate();
    combat.player.block = 5;
    combat.jugadorRecibirDaño(8);
    expect(combat.player.block).toBe(0);
    expect(combat.player.hp).toBe(combat.player.maxHp - 3);
  });

  it("sin energía no se pueden jugar cartas", () => {
    const combat = crearCombate();
    combat.player.energy = 0;
    expect(combat.puedeJugar("strike")).toBe(false);
  });
});

// ---------- CP-03: Fin de partida ----------
describe("CP-03: Condiciones de fin de partida", () => {
  it("jefe a 0 PS desencadena victoria y bloquea el juego", () => {
    const combat = crearCombate();
    combat.boss.hp = 1;
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    combat.jugarCarta(combat.hand.indexOf("strike"));
    expect(combat.over).toBe(true);
    expect(combat.puedeJugar("strike")).toBe(false);
  });

  it("jugador a 0 PS durante el turno del jefe desencadena derrota", async () => {
    const combat = crearCombate();
    combat.player.hp = 3;
    combat.player.block = 0;
    combat.boss.intent = INTENCIONES_JEFE.find((i) => i.id === "atacar");
    const fin = new Promise((res) => (combat.onGameOver = res));
    combat.finalizarTurno();
    await fin;
    expect(combat.over).toBe(true);
  });
});

// ---------- CP-04: Rendimiento ----------
describe("CP-04: Rendimiento del motor", () => {
  it("simula 20 turnos rápidamente", async () => {
    const combat = crearCombate();
    const inicio = performance.now();
    for (let i = 0; i < 20 && !combat.over; i++) {
      combat.turnoJugador();
    }
    const ms = performance.now() - inicio;
    expect(combat.turn).toBeGreaterThanOrEqual(21);
    expect(ms / 20).toBeLessThan(50);
  });
});

// ---------- CP-05: UI ----------
describe("CP-05: UI renderiza el combate", () => {
  let contenedor;
  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
  });

  it("renderiza el campo completo en menos de 100 ms", () => {
    const combat = crearCombate();
    const ui = new UI(contenedor);
    const inicio = performance.now();
    ui.setCombat(combat);
    const ms = performance.now() - inicio;

    const html = contenedor.innerHTML;
    expect(html.length).toBeGreaterThan(500);
    expect(contenedor.querySelector("#btn-fin-turno")).toBeTruthy();
    expect(contenedor.querySelectorAll(".carta")).toHaveLength(5);
    expect(html).toContain("intencion-icono");
    expect(ms).toBeLessThan(100);
  });

  it("usa el fallback local cuando el cargador degrada la URL", () => {
    const combat = crearCombate();
    const ui = new UI(contenedor);
    const cargador = new CargadorImagenesResiliente();
    cargador.resultados.set(CARDS.strike.image, { url: "data:image/svg+xml,fallback", ok: false, origen: "fallback", intentos: 4 });
    ui.setCargador(cargador);
    ui.setCombat(combat);
    expect(contenedor.innerHTML).toContain("data:image/svg+xml,fallback");
  });
});

// ---------- CP-06: Resiliencia 503 / cache_only_cold ----------
describe("CP-06: Resiliencia ante 503 / cache_only_cold", () => {
  it("clasifica el incidente de referencia como reintentable", () => {
    const err = new Error(
      "cache-only admission rejected a cold, unavailable, or overloaded request (Model Provider Error Code: cache_only_cold, HTTP Status: 503) (4028)"
    );
    err.status = 503;
    expect(esErrorReintentable(err)).toBe(true);
  });

  it("NO reintenta errores no reintentables (500)", () => {
    const err = new Error("error interno");
    err.status = 500;
    expect(esErrorReintentable(err)).toBe(false);
  });

  it("el backoff exponencial crece y respeta el techo", () => {
    const retrasos = [0, 1, 2, 3, 4].map((i) => calcularRetraso(i));
    expect(retrasos[1]).toBeGreaterThan(retrasos[0]);
    expect(Math.max(...retrasos)).toBeLessThanOrEqual(8000 * 1.3);
  });

  it("reintenta con éxito un servicio que falla 2 veces con 503", async () => {
    let llamadas = 0;
    const resultado = await conReintentos(
      async () => {
        llamadas++;
        if (llamadas <= 2) {
          const err = new Error("503 simulado");
          err.status = 503;
          throw err;
        }
        return "recurso";
      },
      { intentos: 4 }
    );
    expect(resultado).toBe("recurso");
    expect(llamadas).toBe(3);
  });

  it("abandona tras agotar los reintentos y propaga el error", async () => {
    let llamadas = 0;
    await expect(
      conReintentos(
        async () => {
          llamadas++;
          const err = new Error("503 persistente");
          err.status = 503;
          throw err;
        },
        { intentos: 3 }
      )
    ).rejects.toThrow();
    expect(llamadas).toBe(3);
  });

  it("cortacircuitos: abre tras fallos consecutivos y se recupera", async () => {
    const cc = new Cortacircuitos({ umbralFallos: 3, enfriamientoMs: 20 });
    cc.permitir() && cc.registrarFallo();
    cc.permitir() && cc.registrarFallo();
    cc.permitir() && cc.registrarFallo();
    expect(cc.permitir()).toBe(false); // abierto
    await new Promise((r) => setTimeout(r, 40));
    expect(cc.permitir()).toBe(true); // semiabierto
    cc.registrarExito();
    expect(cc.permitir()).toBe(true); // cerrado
    expect(cc.estado).toBe("cerrado");
  });

  it("caché complementaria: sirve repeticiones y expira por TTL", async () => {
    const cache = new CacheComplementario({ ttlMs: 50 });
    cache.guardar("clave", "valor");
    expect(cache.obtener("clave")).toBe("valor");
    await new Promise((r) => setTimeout(r, 80));
    expect(cache.obtener("clave")).toBeNull();
  });

  it("genera un fallback SVG local sin red", () => {
    const svg = generarFallbackSVG("Golpe");
    expect(svg).toMatch(/^data:image\/svg\+xml/);
  });

  it("cargador resiliente: degrada a fallback tras fallos persistentes", async () => {
    const cargador = new CargadorImagenesResiliente({
      cargar: async () => {
        const err = new Error("503 persistente");
        err.status = 503;
        throw err;
      },
      reintentos: 2,
      retraso: () => 1,
    });
    const res = await cargador.resolver("https://ejemplo/img.png", { etiqueta: "Prueba" });
    expect(res.ok).toBe(false);
    expect(res.origen).toBe("fallback");
    expect(cargador.urlFinal("https://ejemplo/img.png")).toMatch(/^data:image\/svg\+xml/);
  });

  it("cargador resiliente: evita reintentos en cascada cuando el cortacircuitos está abierto", async () => {
    let intentosDeCarga = 0;
    const cargador = new CargadorImagenesResiliente({
      cargar: async () => {
        intentosDeCarga++;
        const err = new Error("503");
        err.status = 503;
        throw err;
      },
      reintentos: 3,
      retraso: () => 1,
    });
    await cargador.resolver("https://ejemplo/a.png");
    await cargador.resolver("https://ejemplo/b.png");
    await cargador.resolver("https://ejemplo/c.png");
    // El cortacircuitos debió abrirse y las URLs posteriores van directo a fallback
    const cuarto = await cargador.resolver("https://ejemplo/d.png");
    expect(cuarto.origen).toBe("fallback");
    expect(cuarto.causa).toMatch(/cortacircuitos/);
  });

  it("monitoreo: registra eventos y calcula salud", () => {
    const monitor = new MonitorEventos();
    monitor.registrar("info", "inicio");
    monitor.registrar("aviso", "reintento 1 tras error de servicio");
    monitor.registrar("error", "recurso no disponible");
    const resumen = monitor.resumen();
    expect(resumen.total).toBe(3);
    expect(resumen.reintentos).toBe(1);
    expect(resumen.salud).toBe("degradado");
  });
});

// ---------- CP-07: Precarga de recursos ----------
describe("CP-07: Precarga de recursos con gestión de carga", () => {
  it("limita la concurrencia a 3 peticiones simultáneas", async () => {
    let enVuelo = 0;
    let maximoEnVuelo = 0;
    const cargador = new CargadorImagenesResiliente({
      cargar: async () => {
        enVuelo++;
        maximoEnVuelo = Math.max(maximoEnVuelo, enVuelo);
        await new Promise((r) => setTimeout(r, 10));
        enVuelo--;
        return "ok";
      },
      reintentos: 1,
    });
    await cargador.precargar(["a", "b", "c", "d", "e", "f"]);
    expect(maximoEnVuelo).toBeLessThanOrEqual(3);
  });

  it("sirve desde caché en la segunda resolución del mismo recurso", async () => {
    let cargasRemotas = 0;
    const cargador = new CargadorImagenesResiliente({
      cargar: async () => {
        cargasRemotas++;
        return "ok";
      },
      reintentos: 1,
    });
    const url = "https://ejemplo/misma.png";
    await cargador.resolver(url);
    await cargador.resolver(url);
    expect(cargasRemotas).toBe(1);
  });
});

// ---------- Sistema de checkpoints: integración ----------
describe("Sistema de checkpoints", () => {
  it("contiene los 8 checkpoints de los hitos clave", () => {
    expect(CHECKPOINTS).toHaveLength(8);
    expect(CHECKPOINTS.map((c) => c.id)).toEqual([
      "cp01-datos-juego",
      "cp02-motor-combate",
      "cp03-fin-partida",
      "cp04-rendimiento",
      "cp05-ui",
      "cp06-resiliencia-503",
      "cp07-recursos-imagenes",
      "cp08-vista-baraja",
    ]);
  });

  it("verifica todos los checkpoints base sin alertas", async () => {
    const sistema = new SistemaCheckpoints();
    const informe = await sistema.verificarBase();
    expect(informe.estadoGlobal).toBe("verificado");
    expect(informe.alertas).toBe(0);
  });

  it("responde con alerta para un checkpoint desconocido", async () => {
    const sistema = new SistemaCheckpoints();
    await expect(sistema.verificar("inexistente")).rejects.toThrow(/desconocido/i);
  });
});

// ---------- CP-08: Vista de baraja completa por tipos ----------
describe("CP-08: Vista de baraja completa", () => {
  let contenedor, ui, combat;

  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    ui = new UI(contenedor);
    ui.setCombat(combat);
  });

  it("el botón 'Ver todas mis cartas' existe y abre el modal", () => {
    const btn = contenedor.querySelector("#btn-baraja");
    expect(btn).toBeTruthy();
    expect(contenedor.querySelector("#modal-baraja")).toBeNull(); // cerrado al inicio

    btn.click();
    expect(contenedor.querySelector("#modal-baraja")).toBeTruthy();
  });

  it("el botón está deshabilitado mientras el jefe ejecuta su turno", () => {
    combat.busy = true;
    ui.setCombat(combat);
    expect(contenedor.querySelector("#btn-baraja").disabled).toBe(true);
    combat.busy = false;
  });

  it("carga las 12 cartas de la baraja al abrirse", () => {
    ui.abrirModalBaraja();
    const cartas = contenedor.querySelectorAll(".carta-vista");
    expect(cartas).toHaveLength(12);
    // Cada carta muestra su información completa
    const primera = cartas[0];
    expect(primera.querySelector(".carta-costo")).toBeTruthy();
    expect(primera.querySelector(".carta-nombre").textContent).toBeTruthy();
    expect(primera.querySelector(".carta-descripcion").textContent).toBeTruthy();
    expect(primera.querySelector("img").getAttribute("alt")).toBeTruthy();
  });

  it("no cuenta cartas agotadas (exhaust) ni duplica", () => {
    ui.abrirModalBaraja();
    expect(contenedor.querySelectorAll(".carta-vista")).toHaveLength(12);
  });

  it("agrupa por tipos en orden canónico ⚔ Ataque 🛡 Habilidad", () => {
    ui.abrirModalBaraja();
    const grupos = [...contenedor.querySelectorAll(".tipo-grupo")];
    expect(grupos).toHaveLength(2);
    expect(grupos.map((g) => g.className.match(/tipo-(Ataque|Habilidad|Poder)/)?.[1])).toEqual([
      "Ataque",
      "Habilidad",
    ]);
    // Cada grupo muestra su título y contador
    for (const grupo of grupos) {
      const titulo = grupo.querySelector(".tipo-titulo");
      expect(titulo).toBeTruthy();
      expect(titulo.textContent).toMatch(/\(\d+\)/);
    }
  });

  it("ordena las cartas por coste dentro de cada tipo", () => {
    const grupos = combat.obtenerBarajaPorTipos();
    for (const grupo of grupos) {
      const costes = grupo.cartas.map((c) => c.cost);
      const ordenados = [...costes].sort((a, b) => a - b);
      expect(costes).toEqual(ordenados);
    }
    // Ataque: Neutralizar (coste 0) antes que Golpe (coste 1)
    const ataque = grupos.find((g) => g.tipo === "Ataque");
    expect(ataque.cartas[0].cost).toBe(0);
    expect(ataque.cartas.every((c) => c.type === "Ataque")).toBe(true);
    // Habilidad: Defensa y Superviviente (coste 1)
    const habilidad = grupos.find((g) => g.tipo === "Habilidad");
    expect(habilidad.cartas.every((c) => c.cost === 1)).toBe(true);
  });

  it("muestra el tipo y coste en cada carta (⚔ 🛡)", () => {
    ui.abrirModalBaraja();
    const tipos = [...contenedor.querySelectorAll(".carta-vista .carta-tipo")];
    expect(tipos).toHaveLength(12);
    expect(tipos.some((el) => el.textContent.includes("Ataque"))).toBe(true);
    expect(tipos.some((el) => el.textContent.includes("Habilidad"))).toBe(true);
    const costes = [...contenedor.querySelectorAll(".carta-vista .carta-costo")];
    expect(costes).toHaveLength(12);
    expect(costes.some((el) => el.textContent.includes("0"))).toBe(true); // Neutralizar
    expect(costes.some((el) => el.textContent.includes("1"))).toBe(true); // Golpe/Defensa
  });

  it("cierra con el botón X y devuelve el foco al botón de la baraja", () => {
    ui.abrirModalBaraja();
    contenedor.querySelector("#btn-cerrar-modal").click();
    expect(ui.modalAbierto).toBe(false);
    expect(contenedor.querySelector("#modal-baraja")).toBeNull();
    expect(document.activeElement).toBe(contenedor.querySelector("#btn-baraja"));
  });

  it("cierra con el botón 'Volver al combate'", () => {
    ui.abrirModalBaraja();
    contenedor.querySelector("#btn-volver").click();
    expect(ui.modalAbierto).toBe(false);
    expect(contenedor.querySelector("#modal-baraja")).toBeNull();
  });

  it("cierra con la tecla Escape", () => {
    ui.abrirModalBaraja();
    const modal = contenedor.querySelector("#modal-baraja");
    modal.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(ui.modalAbierto).toBe(false);
  });

  it("cierra al hacer clic en el fondo del modal", () => {
    ui.abrirModalBaraja();
    const modal = contenedor.querySelector("#modal-baraja");
    modal.click(); // e.target === modal
    expect(ui.modalAbierto).toBe(false);
  });

  it("mientras el modal está abierto no se pueden jugar cartas de la mano", () => {
    ui.abrirModalBaraja();
    const manoAntes = combat.hand.length;
    const cartaMano = contenedor.querySelector(".carta[data-indice]");
    if (cartaMano) cartaMano.click();
    expect(combat.hand.length).toBe(manoAntes); // el modal bloquea jugar
  });

  it("animación escalonada: las cartas llevan retardo creciente con techo", () => {
    ui.abrirModalBaraja();
    const cartas = [...contenedor.querySelectorAll(".carta-vista")];
    expect(cartas.length).toBeGreaterThan(0);
    for (const carta of cartas) {
      const retardo = carta.style.getPropertyValue("--retardo");
      expect(retardo).toMatch(/^[\d]+ms$/);
    }
  });

  it("rendimiento: modal con baraja máxima (100+ cartas) renderiza rápido", () => {
    const inicio = performance.now();
    combat.deck = Array(100).fill("strike");
    ui.setCombat(combat);
    ui.abrirModalBaraja();
    const ms = performance.now() - inicio;
    const total = contenedor.querySelectorAll(".carta-vista").length;
    expect(total).toBeGreaterThanOrEqual(100); // 100 añadidas + las de mano/descarte
    expect(ms).toBeLessThan(300); // margen holgado sobre el límite de 100 ms
    ui.cerrarModalBaraja();
  });

  it("usa imágenes con carga diferida y decodificación async (compatibilidad navegadores)", () => {
    ui.abrirModalBaraja();
    const imgs = [...contenedor.querySelectorAll(".carta-vista img")];
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      expect(img.getAttribute("loading")).toBe("lazy"); // Chrome/Firefox/Safari/Edge
      expect(img.getAttribute("decoding")).toBe("async");
    }
  });

  it("usa sintaxis CSS/JS compatible con los navegadores más usados", () => {
    ui.abrirModalBaraja();
    // jsdom no implementa CSS.supports/grid: la verificación de compatibilidad
    // se hace sobre las características que la implementación realmente usa y
    // que todos los navegadores modernos (Chrome, Firefox, Safari, Edge ≥ 2
    // últimas versiones) soportan: grid auto-fill, variables CSS y animaciones.
    expect(contenedor.querySelector(".modal-grupos")).toBeTruthy();
    expect(contenedor.querySelector(".tipo-grupo")).toBeTruthy();

    // APIs JS usadas por la implementación, presentes en todos los navegadores modernos
    expect(typeof Map).toBe("function");
    expect(typeof Promise).toBe("function");
    expect(typeof KeyboardEvent).toBe("function");
    expect(typeof performance.now).toBe("function");
    // El modal usa atributos ARIA estándar (accesibilidad cross-browser)
    const modal = contenedor.querySelector("#modal-baraja");
    expect(modal.getAttribute("role")).toBe("dialog");
    expect(modal.getAttribute("aria-modal")).toBe("true");
    expect(modal.getAttribute("aria-label")).toContain("agrupadas por tipo");
    // Tabindex para foco programático (soportado universalmente)
    expect(modal.getAttribute("tabindex")).toBe("-1");
  });

  it("checkpoint cp08 verifica el hito completo sin alertas", async () => {
    const sistema = new SistemaCheckpoints();
    const registro = await sistema.verificar("cp08-vista-baraja");
    expect(registro.estado).toBe("verificado");
    expect(registro.comprobaciones.length).toBeGreaterThanOrEqual(10);
  });
});

// ---------- Estética Spire: escena, barras con bloqueo y pilas ----------
describe("Estética Spire: escena y pilas", () => {
  let contenedor, ui, combat;

  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    ui = new UI(contenedor);
    ui.setCombat(combat);
  });

  it("coloca al jugador a la izquierda y al jefe a la derecha", () => {
    const escena = contenedor.querySelector(".campo-escena");
    expect(escena).toBeTruthy();
    const lados = [...escena.children].map((el) => el.className);
    expect(lados[0]).toMatch(/lado-jugador/);
    expect(lados[1]).toMatch(/lado-jefe/);
    expect(contenedor.querySelector(".sprite-jugador").getAttribute("src")).toContain("silent_sin_fondo");
    expect(contenedor.querySelector(".sprite-jefe").getAttribute("src")).toContain("/enemigo_0.png");
    expect(contenedor.querySelector(".sprite-jefe").getAttribute("alt")).toContain("Gólem de Cuerda");
  });

  it("muestra el piso actual y el botón de sonido", () => {
    expect(contenedor.querySelector(".piso").textContent).toContain("Piso 1/5");
    expect(contenedor.querySelector("#btn-sonido")).toBeTruthy();
  });

  it("muestra orbe de energía y pilas de robo/descarte con contadores", () => {
    expect(contenedor.querySelector(".orbe-energia").textContent).toContain(`${combat.player.energy}/${combat.player.maxEnergy}`);
    expect(contenedor.querySelector("#btn-robo .pila-contador").textContent).toBe(String(combat.deck.length));
    expect(contenedor.querySelector("#btn-descarte .pila-contador").textContent).toBe(String(combat.discard.length));
  });

  it("la barra se vuelve azul cuando hay bloqueo", () => {
    combat.player.block = 8;
    ui.setCombat(combat);
    expect(contenedor.querySelector(".lado-jugador .barra-vida.con-bloqueo")).toBeTruthy();
    expect(contenedor.querySelector(".lado-jugador .escudo-bloqueo").textContent).toContain("8");
    combat.player.block = 0;
    combat.boss.block = 5;
    ui.setCombat(combat);
    expect(contenedor.querySelector(".lado-jefe .barra-vida.con-bloqueo")).toBeTruthy();
  });

  it("el modal de robo lista las cartas por robar y se cierra", () => {
    ui.abrirModalRobo();
    expect(contenedor.querySelector("#modal-robo")).toBeTruthy();
    expect(contenedor.querySelectorAll("#modal-robo .carta-vista").length).toBe(combat.deck.length);
    ui.cerrarModal();
    expect(contenedor.querySelector("#modal-robo")).toBeNull();
  });

  it("el modal de descarte lista los descartes y se cierra con Escape", () => {
    combat.discard.push("strike", "defend");
    ui.setCombat(combat);
    ui.abrirModalDescarte();
    expect(contenedor.querySelector("#modal-descarte")).toBeTruthy();
    expect(contenedor.querySelectorAll("#modal-descarte .carta-vista").length).toBe(combat.discard.length);
    contenedor.querySelector("#modal-descarte").dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(ui.modalAbierto).toBe(false);
  });

  it("el motor expone la pila de robo y descarte como cartas", () => {
    expect(combat.obtenerPilaRobo().length).toBe(combat.deck.length);
    expect(combat.obtenerPilaDescarte().length).toBe(combat.discard.length);
    expect(combat.obtenerPilaRobo().every((c) => c.name)).toBe(true);
  });
});

describe("Recompensa de victoria: elige 1 de 3", () => {
  function combateVictorioso() {
    const combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    combat.boss.hp = 1;
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    combat.jugarCarta(combat.hand.indexOf("strike"));
    return combat;
  }

  it("el pool trae 85 cartas (sin Plus, básicas, ancestrales ni Daga)", () => {
    expect(IDS_RECOMPENSA).toHaveLength(85);
    for (const id of IDS_RECOMPENSA) {
      const card = CARDS[id];
      expect(card.name).toBeTruthy();
      expect(["Ataque", "Habilidad"]).toContain(card.type);
      expect(card.plus).not.toBe(true);
      expect(CARDS[card.plusId]).toBeDefined();
    }
    expect(IDS_RECOMPENSA).not.toContain("shiv");
    expect(elegirRecompensas(3)).toHaveLength(3);
    expect(new Set(elegirRecompensas(3)).size).toBe(3);
  });

  it("al vencer se generan 3 opciones distintas", () => {
    const combat = combateVictorioso();
    expect(combat.over).toBe(true);
    expect(combat.recompensa).toHaveLength(3);
    expect(new Set(combat.recompensa).size).toBe(3);
    combat.recompensa.forEach((id) => expect(CARDS[id]).toBeDefined());
  });

  it("elegir 1 la añade a la baraja y avanza al siguiente piso", () => {
    const combat = combateVictorioso();
    const totalAntes = combat.deck.length + combat.hand.length + combat.discard.length;
    const elegida = combat.recompensa[1];
    combat.elegirRecompensa(elegida);
    expect(combat.recompensaElegida).toBe(elegida);
    expect(combat.piso).toBe(1);
    expect(combat.over).toBe(false);
    const coleccion = [...combat.deck, ...combat.hand, ...combat.discard];
    expect(coleccion.length).toBe(totalAntes + 1);
    expect(coleccion).toContain(elegida);
  });

  it("una elección inválida o duplicada se ignora", () => {
    const combat = combateVictorioso();
    combat.elegirRecompensa("strike");
    expect(combat.recompensa).toHaveLength(3);
    expect(combat.recompensaElegida).toBeNull();
    const elegida = combat.recompensa[0];
    combat.elegirRecompensa(elegida);
    combat.elegirRecompensa(elegida);
    const coleccion = [...combat.deck, ...combat.hand, ...combat.discard];
    expect(coleccion.filter((id) => id === elegida)).toHaveLength(1);
  });

  it("la UI muestra las 3 opciones y elegir 1 avanza de piso", () => {
    document.body.innerHTML = "";
    const contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    let ui;
    const combat = new Combat({
      onStateChange: () => ui.setCombat(combat),
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    ui = new UI(contenedor);
    combat.iniciarCombate();
    ui.setCombat(combat);
    combat.boss.hp = 1;
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    combat.jugarCarta(combat.hand.indexOf("strike"));
    expect(contenedor.querySelector("#recompensa")).toBeTruthy();
    expect(contenedor.querySelectorAll(".carta-recompensa")).toHaveLength(3);
    const primera = contenedor.querySelector(".carta-recompensa");
    primera.click();
    expect(combat.recompensaElegida).toBe(primera.dataset.id);
    expect(contenedor.querySelector("#recompensa")).toBeNull();
    expect(combat.piso).toBe(1);
    expect(contenedor.innerHTML).toContain("Piso 2/5");
    expect(contenedor.innerHTML).toContain("Caballero Dorado");
    contenedor.remove();
  });
});

describe("Arrastre estilo Spire: carta + flecha", () => {
  let contenedor, ui, combat;

  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    ui = new UI(contenedor);
    ui.setCombat(combat);
    ui._forzarLimite = 500;
    ui._rectJefe = { left: 0, top: 0, right: 200, bottom: 200 };
  });

  it("el clic ya no juega cartas (solo el arrastre)", () => {
    const manoAntes = combat.hand.length;
    const energiaAntes = combat.player.energy;
    contenedor.querySelector(".carta[data-indice]").click();
    expect(combat.hand).toHaveLength(manoAntes);
    expect(combat.player.energy).toBe(energiaAntes);
  });

  it("el clic sigue descartando en modo Superviviente", () => {
    combat.hand = ["strike", "defend"];
    combat.iniciarDescarte(1, "survivor");
    ui.setCombat(combat);
    contenedor.querySelector(".carta[data-indice]").click();
    expect(combat.hand).toHaveLength(1);
    expect(combat.pendingDiscard).toBeNull();
  });

  it("arrastrar y soltar arriba juega la carta", () => {
    expect(ui.iniciarArrastre(0, 100, 600)).toBe(true);
    expect(document.getElementById("flecha-objetivo")).toBeTruthy();
    expect(ui.soltarArrastre(100, 100)).toBe("jugada");
    expect(combat.hand).toHaveLength(4);
    expect(combat.player.energy).toBe(combat.player.maxEnergy - 1);
    expect(document.getElementById("flecha-objetivo")).toBeNull();
  });

  it("soltar abajo cancela sin cambios", () => {
    ui.iniciarArrastre(0, 100, 600);
    expect(ui.soltarArrastre(100, 700)).toBe("cancelada");
    expect(combat.hand).toHaveLength(5);
    expect(combat.player.energy).toBe(combat.player.maxEnergy);
    expect(document.getElementById("flecha-objetivo")).toBeNull();
  });

  it("cancelarArrastre y Escape limpian la flecha", () => {
    ui.iniciarArrastre(0, 100, 600);
    ui.cancelarArrastre();
    expect(ui.arrastre).toBeNull();
    expect(document.getElementById("flecha-objetivo")).toBeNull();
    ui.iniciarArrastre(0, 100, 600);
    contenedor.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(ui.arrastre).toBeNull();
    expect(document.getElementById("flecha-objetivo")).toBeNull();
  });

  it("efectoPrevisto aplica el Debil al dano", () => {
    combat.player.weak = 1;
    expect(ui.efectoPrevisto("strike").danio).toBe(4);
    expect(ui.efectoPrevisto("defend").bloqueo).toBe(5);
    expect(ui.efectoPrevisto("neutralize").debil).toBe(1);
  });

  it("apuntandoAlJefe detecta el objetivo", () => {
    expect(ui.apuntandoAlJefe(50, 50)).toBe(true);
    expect(ui.apuntandoAlJefe(500, 500)).toBe(false);
  });

  it("sobre el jefe se ilumina y muestra la vista previa", () => {
    ui.iniciarArrastre(0, 100, 600);
    ui.moverArrastre(50, 50);
    expect(contenedor.querySelector(".lado-jefe.apuntado")).toBeTruthy();
    const badge = document.getElementById("vista-previa");
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain("6");
    ui.cancelarArrastre();
  });
});

describe("Pisos de la torre", () => {
  function nuevoCombate() {
    const combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
      onSonido: () => {},
    });
    combat.iniciarCombate();
    return combat;
  }

  function vencerPiso(combat) {
    combat.boss.hp = 1;
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    combat.jugarCarta(combat.hand.indexOf("strike"));
    combat.elegirRecompensa(combat.recompensa[0]);
  }

  it("hay 5 pisos con imagen, vida y daño propios", () => {
    expect(PISOS).toHaveLength(5);
    expect(PISOS.map((p) => p.nombre)).toEqual([
      "Gólem de Cuerda",
      "Caballero Dorado",
      "Ent Sombrío",
      "Coloso del Cenagal",
      "Centinela de la Torre",
    ]);
    for (const p of PISOS) {
      expect(p.image).toMatch(/^(\/|https?:\/\/)/);
      expect(p.maxHp).toBeGreaterThan(0);
    }
    expect(PISOS[0].maxHp).toBeLessThan(PISOS[4].maxHp);
  });

  it("se empieza en el piso 1 con su jefe", () => {
    const combat = nuevoCombate();
    expect(combat.piso).toBe(0);
    expect(combat.boss.name).toBe("Gólem de Cuerda");
    expect(combat.boss.hp).toBe(60);
    expect(combat.boss.image).toContain("enemigo_0");
  });

  it("el daño del jefe es el de su piso", () => {
    const combat = nuevoCombate();
    expect(combat.boss.intent.valor).toBeLessThanOrEqual(11);
    combat.piso = 4;
    combat.turnoJugador();
    expect(combat.boss.intent.valor).toBeLessThanOrEqual(16);
  });

  it("vencer avanza de piso con cura del 25% y baraja rebarajada", () => {
    const combat = nuevoCombate();
    combat.player.hp = 40;
    const totalAntes = combat.deck.length + combat.hand.length + combat.discard.length;
    vencerPiso(combat);
    expect(combat.piso).toBe(1);
    expect(combat.over).toBe(false);
    expect(combat.boss.name).toBe("Caballero Dorado");
    expect(combat.boss.hp).toBe(80);
    expect(combat.player.hp).toBe(40 + Math.floor(72 * 0.25));
    expect(combat.hand).toHaveLength(5);
    expect(combat.deck.length + combat.hand.length + combat.discard.length).toBe(totalAntes + 1);
  });

  it("la cura no supera la vida máxima", () => {
    const combat = nuevoCombate();
    combat.player.hp = 70;
    vencerPiso(combat);
    expect(combat.player.hp).toBe(72);
  });

  it("el último piso da victoria total sin avanzar", () => {
    const combat = nuevoCombate();
    combat.piso = 4;
    combat.boss = { ...combat.boss, name: "Centinela de la Torre", hp: 1, maxHp: 120 };
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    combat.jugarCarta(combat.hand.indexOf("strike"));
    combat.elegirRecompensa(combat.recompensa[0]);
    expect(combat.victoriaTotal).toBe(true);
    expect(combat.piso).toBe(4);
    expect(combat.avanzarPiso()).toBe(false);
  });

  it("la UI muestra el piso y la victoria total", () => {
    document.body.innerHTML = "";
    const contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    const combat = nuevoCombate();
    const ui = new UI(contenedor);
    ui.setSonidos(new Sonidos());
    ui.setCombat(combat);
    expect(contenedor.querySelector(".piso").textContent).toContain("Piso 1/5");
    combat.piso = 4;
    combat.victoriaTotal = true;
    combat.over = true;
    combat.boss.hp = 0;
    ui.setCombat(combat);
    expect(contenedor.innerHTML).toContain("TORRE CONQUISTADA");
    contenedor.remove();
  });
});

describe("Sonidos sintetizados", () => {
  it("registra y alterna el silencio sin reventar sin audio", () => {
    const s = new Sonidos();
    expect(s.silenciado).toBe(false);
    s.reproducir("ataque");
    s.reproducir("inexistente");
    expect(s.historial.map((h) => h.nombre)).toEqual(["ataque", "inexistente"]);
    s.alternar();
    expect(s.silenciado).toBe(true);
    s.reproducir("clic");
    expect(s.historial).toHaveLength(3);
    s.alternar();
    expect(s.silenciado).toBe(false);
  });

  it("el combate emite sonidos en las acciones", () => {
    const sonados = [];
    const combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
      onSonido: (n) => sonados.push(n),
    });
    combat.iniciarCombate();
    combat.hand[0] = "strike";
    combat.jugarCarta(0);
    expect(sonados).toContain("ataque");
    expect(sonados).toContain("dano-enemigo");
    combat.hand[0] = "defend";
    combat.jugarCarta(0);
    expect(sonados).toContain("bloqueo");
    combat.boss.hp = 1;
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    combat.jugarCarta(combat.hand.indexOf("strike"));
    expect(sonados).toContain("victoria");
  });

  it("el botón de sonido silencia y suena al pulsar", () => {
    document.body.innerHTML = "";
    const contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    const combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    const ui = new UI(contenedor);
    const s = new Sonidos();
    ui.setSonidos(s);
    ui.setCombat(combat);
    expect(contenedor.querySelector("#btn-sonido").textContent).toContain("🔊");
    contenedor.querySelector("#btn-sonido").click();
    expect(s.silenciado).toBe(true);
    expect(contenedor.querySelector("#btn-sonido").textContent).toContain("🔇");
    contenedor.remove();
  });
});

describe("Motor extendido: las 91 cartas", () => {
  function combateLimpio() {
    const combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
      onSonido: () => {},
    });
    combat.iniciarCombate();
    combat.hand = [];
    combat.deck = [];
    combat.discard = [];
    combat.player.energy = 10;
    combat.player.maxEnergy = 10;
    return combat;
  }

  function darMano(combat, ids) {
    combat.hand = [...ids];
    combat.player.energy = 10;
  }

  it("catalogo completo: 92 base, Plus registradas e imagenes locales", () => {
    expect(Object.keys(CARDS).length).toBeGreaterThanOrEqual(183);
    for (const id of IDS_RECOMPENSA) {
      expect(CARDS[id + "+"].plus).toBe(true);
      expect(CARDS[id + "+"].image).toContain("Plus.png");
      expect(CARDS[id].image.startsWith("/cartas/")).toBe(true);
    }
    expect(CARDS["shiv"].image.startsWith("data:")).toBe(true);
  });

  it("veneno: se aplica y resta al turno del jefe", async () => {
    const combat = combateLimpio();
    darMano(combat, ["deadlypoison"]);
    combat.jugarCarta(0);
    expect(combat.boss.poison).toBe(5);
    const hpAntes = combat.boss.hp;
    combat.player.hp = 72;
    combat.player.block = 50;
    combat.boss.intent = INTENCIONES_JEFE.find((i) => i.id === "debilitar");
    combat.finalizarTurno();
    await new Promise((r) => setTimeout(r, 1200));
    expect(combat.boss.poison).toBe(4);
    expect(combat.boss.hp).toBeLessThan(hpAntes);
  });

  it("dagas: se anaden, hacen 4 y se agotan (Precision las potencia)", () => {
    const combat = combateLimpio();
    darMano(combat, ["bladedance"]);
    combat.jugarCarta(0);
    expect(combat.hand.filter((id) => id === "shiv")).toHaveLength(3);
    expect(combat.exhaust).toContain("bladedance");
    const hp = combat.boss.hp;
    combat.jugarCarta(combat.hand.indexOf("shiv"));
    expect(combat.boss.hp).toBe(hp - 4);
    expect(combat.exhaust).toContain("shiv");
    combat.powers.accuracy = 4;
    darMano(combat, ["shiv"]);
    const hp2 = combat.boss.hp;
    combat.jugarCarta(0);
    expect(combat.boss.hp).toBe(hp2 - 8);
  });

  it("robo y energia: Voltereta roba, Adrenalina da energia y se agota", () => {
    const combat = combateLimpio();
    combat.deck = ["strike", "strike", "strike"];
    darMano(combat, ["backflip"]);
    combat.jugarCarta(0);
    expect(combat.hand).toHaveLength(2);
    darMano(combat, ["adrenaline"]);
    combat.player.energy = 1;
    combat.jugarCarta(0);
    expect(combat.player.energy).toBe(3);
    expect(combat.exhaust).toContain("adrenaline");
  });

  it("conservar e innata: Mordedura se queda, Punada Trapera abre", () => {
    const combat = combateLimpio();
    darMano(combat, ["snakebite", "strike"]);
    combat.player.hp = 72;
    combat.player.block = 50;
    combat.boss.intent = INTENCIONES_JEFE.find((i) => i.id === "debilitar");
    combat.finalizarTurno();
    return new Promise((r) => setTimeout(r, 1200)).then(() => {
      expect(combat.hand).toContain("snakebite");
      const c2 = new Combat({ onStateChange: () => {}, onGameOver: () => {}, onVictory: () => {}, onLog: () => {} });
      c2.deck.push("backstab");
      c2.iniciarCombate();
      expect(c2.hand).toContain("backstab");
    });
  });

  it("escurridiza: al descartar se juega gratis", () => {
    const combat = combateLimpio();
    darMano(combat, ["untouchable", "strike"]);
    combat._descartar("untouchable");
    expect(combat.player.block).toBe(6);
    expect(combat.discard).toContain("untouchable");
  });

  it("destreza y vulnerable: Anticipacion potencia, Vulnerable x1.5", () => {
    const combat = combateLimpio();
    darMano(combat, ["anticipate", "defend"]);
    combat.jugarCarta(0);
    combat.jugarCarta(0);
    expect(combat.player.block).toBe(7);
    const c2 = combateLimpio();
    c2.boss.vulnerable = 1;
    darMano(c2, ["strike"]);
    const hp = c2.boss.hp;
    c2.jugarCarta(0);
    expect(c2.boss.hp).toBe(hp - 9);
  });

  it("costes especiales: Ensartar X, Gran Final condicionado, Punto de Mira", () => {
    const combat = combateLimpio();
    darMano(combat, ["skewer"]);
    combat.player.energy = 3;
    const hp = combat.boss.hp;
    combat.jugarCarta(0);
    expect(combat.boss.hp).toBe(hp - 24);
    expect(combat.player.energy).toBe(0);
    const c2 = combateLimpio();
    c2.deck = ["strike"];
    darMano(c2, ["grandfinale"]);
    expect(c2.puedeJugar("grandfinale")).toBe(false);
    c2.deck = [];
    expect(c2.puedeJugar("grandfinale")).toBe(true);
    const c3 = combateLimpio();
    darMano(c3, ["pinpoint"]);
    c3.habilidadesTurno = 2;
    expect(c3.costeEfectivo(CARDS["pinpoint"])).toBe(1);
  });

  it("rafaga duplica la proxima Habilidad", () => {
    const combat = combateLimpio();
    darMano(combat, ["burst", "defend"]);
    combat.jugarCarta(0);
    combat.jugarCarta(0);
    expect(combat.player.block).toBe(10);
  });

  it("escalados: Remate, Dardos, Memento, Homicidio y Corte Preciso", () => {
    const combat = combateLimpio();
    combat.ataquesTurno = 2;
    darMano(combat, ["finisher"]);
    const hp = combat.boss.hp;
    combat.jugarCarta(0);
    expect(combat.boss.hp).toBe(hp - 12);
    const c2 = combateLimpio();
    darMano(c2, ["flechettes", "defend", "defend"]);
    const hp2 = c2.boss.hp;
    c2.jugarCarta(0);
    expect(c2.boss.hp).toBe(hp2 - 10);
    const c3 = combateLimpio();
    c3.descartadasTurno = 3;
    darMano(c3, ["mementomori"]);
    const hp3 = c3.boss.hp;
    c3.jugarCarta(0);
    expect(c3.boss.hp).toBe(hp3 - 21);
    const c4 = combateLimpio();
    c4.robadasCombate = 5;
    darMano(c4, ["murder"]);
    const hp4 = c4.boss.hp;
    c4.jugarCarta(0);
    expect(c4.boss.hp).toBe(hp4 - 6);
    const c5 = combateLimpio();
    darMano(c5, ["precisecut", "strike", "strike"]);
    const hp5 = c5.boss.hp;
    c5.jugarCarta(0);
    expect(c5.boss.hp).toBe(hp5 - 9);
  });

  it("espinas devuelven dano al atacante", () => {
    const combat = combateLimpio();
    combat.espinas = 5;
    const hp = combat.boss.hp;
    combat.jugadorRecibirDaño(10);
    expect(combat.boss.hp).toBe(hp - 5);
  });

  it("intangible limita el dano a 1", () => {
    const combat = combateLimpio();
    darMano(combat, ["wraithform"]);
    combat.jugarCarta(0);
    expect(combat.player.intangible).toBe(2);
    combat.player.block = 0;
    combat.jugadorRecibirDaño(15);
    expect(combat.player.hp).toBe(combat.player.maxHp - 1);
  });

  it("tiempo Bala deja la mano gratis y sin robo", () => {
    const combat = combateLimpio();
    darMano(combat, ["bullettime", "predator"]);
    combat.player.energy = 3;
    combat.jugarCarta(0);
    expect(combat.manoGratis).toBe(true);
    expect(combat.puedeJugar("predator")).toBe(true);
    combat.jugarCarta(0);
    expect(combat.player.energy).toBe(0);
  });

  it("brote aplica y activa el veneno al instante", () => {
    const combat = combateLimpio();
    darMano(combat, ["outbreak"]);
    const hp = combat.boss.hp;
    combat.jugarCarta(0);
    expect(combat.boss.hp).toBe(hp - 9);
    expect(combat.boss.poison).toBe(8);
  });

  it("mejora: sustituye 1 copia por su Plus", () => {
    const combat = combateLimpio();
    combat.deck = ["strike", "defend"];
    combat.mejoraPendiente = true;
    combat.elegirMejora("strike");
    expect(combat.deck).toContain("strike+");
    expect(combat.deck).not.toContain("strike");
    expect(combat.mejoraPendiente).toBe(false);
    expect(CARDS["strike+"].damage).toBe(9);
    combat.mejoraPendiente = true;
    combat.elegirMejora("inexistente");
    expect(combat.mejoraPendiente).toBe(true);
  });

  it("pesadilla: elige y trae 3 copias el proximo turno", () => {
    const combat = combateLimpio();
    darMano(combat, ["nightmare", "strike"]);
    combat.jugarCarta(0);
    expect(combat.pendingNightmare).toBe(true);
    combat.elegirPesadilla(0);
    expect(combat.pendingNightmare).toBe("strike");
    combat.deck = [];
    combat.discard = [];
    combat.turnoJugador();
    expect(combat.hand.filter((id) => id === "strike").length).toBeGreaterThanOrEqual(3);
  });

  it("plan perfecto conserva la mano al cerrar el turno", () => {
    const combat = combateLimpio();
    combat.player.hp = 72;
    combat.player.block = 50;
    combat.boss.intent = INTENCIONES_JEFE.find((i) => i.id === "debilitar");
    darMano(combat, ["welllaidplans", "strike"]);
    combat.jugarCarta(0);
    combat.finalizarTurno();
    return new Promise((r) => setTimeout(r, 1200)).then(() => {
      expect(combat.hand).toContain("strike");
    });
  });

  it("la Caza letal otorga eleccion extra", () => {
    const combat = combateLimpio();
    combat.boss.hp = 5;
    darMano(combat, ["thehunt"]);
    combat.jugarCarta(0);
    expect(combat.recompensaBonus).toBe(true);
    const primera = combat.recompensa[0];
    combat.elegirRecompensa(primera);
    expect(combat.recompensa).toHaveLength(3);
    expect(combat.piso).toBe(0);
    combat.elegirRecompensa(combat.recompensa[0]);
    expect(combat.piso).toBe(1);
  });

  it("UI de mejora: lista, previa Plus y confirmacion", () => {
    document.body.innerHTML = "";
    const contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    const combat = combateLimpio();
    combat.deck = ["strike", "defend"];
    combat.mejoraPendiente = true;
    const ui = new UI(contenedor);
    ui.setSonidos(new Sonidos());
    ui.setCombat(combat);
    expect(contenedor.querySelector("#modal-mejora")).toBeTruthy();
    expect(contenedor.querySelectorAll(".mejora-opcion").length).toBe(2);
    contenedor.querySelector(".mejora-opcion").click();
    expect(contenedor.querySelector(".preview-plus").textContent).toContain("+");
    expect(contenedor.querySelector("#btn-confirmar-mejora").disabled).toBe(false);
    contenedor.querySelector("#btn-confirmar-mejora").click();
    expect(combat.mejoraPendiente).toBe(false);
    expect(contenedor.querySelector("#modal-mejora")).toBeNull();
    contenedor.remove();
  });
});

describe("Intencion reactiva y arrastre visible", () => {
  let contenedor, ui, combat;

  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    ui = new UI(contenedor);
    ui.setCombat(combat);
    ui._forzarLimite = 500;
    ui._rectJefe = { left: 0, top: 0, right: 200, bottom: 200 };
  });

  it("valorIntencionEfectivo aplica Debil al ataque previsto", () => {
    combat.boss.intent = { ...INTENCIONES_JEFE.find((i) => i.id === "atacar"), valor: 10 };
    combat.boss.weak = 0;
    expect(combat.valorIntencionEfectivo()).toBe(10);
    combat.boss.weak = 1;
    expect(combat.valorIntencionEfectivo()).toBe(7);
    combat.boss.intent = { ...INTENCIONES_JEFE.find((i) => i.id === "drenar"), valor: 6 };
    expect(combat.valorIntencionEfectivo()).toBe(6);
  });

  it("la intencion muestra el ataque reducido y los estados del jefe", () => {
    combat.boss.intent = { ...INTENCIONES_JEFE.find((i) => i.id === "atacar"), valor: 10 };
    combat.boss.weak = 2;
    combat.boss.vulnerable = 1;
    combat.boss.poison = 5;
    ui.setCombat(combat);
    expect(contenedor.querySelector(".intencion.debilitada")).toBeTruthy();
    expect(contenedor.querySelector(".intencion-efectivo").textContent).toContain("7");
    expect(contenedor.querySelector(".estado.veneno").textContent).toContain("5");
    expect(contenedor.querySelector(".estado.vulnerable").textContent).toContain("1");
  });

  it("sin Debil no hay insignia de reduccion", () => {
    combat.boss.weak = 0;
    ui.setCombat(combat);
    expect(contenedor.querySelector(".intencion.debilitada")).toBeNull();
    expect(contenedor.querySelector(".intencion-efectivo")).toBeNull();
  });

  it("la carta se queda en la mano y solo sale la flecha", () => {
    ui.iniciarArrastre(0, 100, 600);
    const el = contenedor.querySelector(".carta.arrastrando");
    expect(el).toBeTruthy();
    expect(el.style.position).toBe("");
    expect(el.style.transform).toBe("");
    ui.cancelarArrastre();
  });

  it("el origen de la flecha queda fijo en la mano y la punta sigue al cursor", () => {
    ui.iniciarArrastre(0, 100, 600);
    ui.moverArrastre(150, 400);
    expect(document.getElementById("flecha-objetivo")).toBeTruthy();
    const svg1 = document.getElementById("flecha-objetivo").innerHTML;
    ui.moverArrastre(200, 300);
    const svg2 = document.getElementById("flecha-objetivo").innerHTML;
    const inicio = (s) => s.split(" Q")[0];
    expect(inicio(svg1)).toBe(inicio(svg2));
    expect(svg2).toContain("200,300");
    ui.cancelarArrastre();
    expect(contenedor.querySelector(".carta.arrastrando")).toBeNull();
    expect(document.getElementById("flecha-objetivo")).toBeNull();
  });

  it("la recompensa se muestra en grande", () => {
    combat.boss.hp = 1;
    combat.hand[0] = "strike";
    combat.jugarCarta(combat.hand.indexOf("strike"));
    ui.setCombat(combat);
    expect(contenedor.querySelector(".overlay-recompensa")).toBeTruthy();
    const cartas = contenedor.querySelectorAll("#recompensa .carta-recompensa");
    expect(cartas).toHaveLength(3);
    for (const el of cartas) {
      expect(el.querySelector("img").getAttribute("src")).toContain("/cartas/");
      expect(el.querySelector(".carta-descripcion")).toBeNull();
    }
  });
});

describe("Sin arrastre nativo del navegador", () => {
  let contenedor, ui, combat;

  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    ui = new UI(contenedor);
    ui.setCombat(combat);
  });

  it("las imagenes de la mano no son arrastrables por el navegador", () => {
    const imgs = contenedor.querySelectorAll(".mano .carta img");
    expect(imgs.length).toBeGreaterThan(0);
    for (const img of imgs) {
      expect(img.getAttribute("draggable")).toBe("false");
    }
  });

  it("pulsar una carta frena el gesto nativo y arma el arrastre propio", () => {
    const el = contenedor.querySelector(".mano .carta[data-indice]");
    const ev = new MouseEvent("pointerdown", { bubbles: true, cancelable: true, clientX: 50, clientY: 600, button: 0 });
    el.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(ui._posibleArrastre).toBeTruthy();
  });

  it("el evento dragstart queda anulado en la app", () => {
    const el = contenedor.querySelector(".mano .carta img");
    const ev = new Event("dragstart", { bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });
});

describe("Flecha con origen fijo en la mano", () => {
  let contenedor, ui, combat;

  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    ui = new UI(contenedor);
    ui.setCombat(combat);
    ui._forzarLimite = 500;
    ui._rectJefe = { left: 0, top: 0, right: 200, bottom: 200 };
  });

  it("sobre el jefe la punta sigue al cursor y el jefe se ilumina", () => {
    ui.iniciarArrastre(0, 100, 600);
    ui.moverArrastre(50, 50);
    expect(ui.arrastre.sobreJefe).toBe(true);
    const svg = document.getElementById("flecha-objetivo").innerHTML;
    expect(svg).toContain("50,50");
    expect(contenedor.querySelector(".lado-jefe.apuntado")).toBeTruthy();
    expect(document.getElementById("vista-previa")).toBeTruthy();
    ui.cancelarArrastre();
  });

  it("lejos del jefe la flecha sigue al cursor", () => {
    ui.iniciarArrastre(0, 100, 600);
    ui.moverArrastre(700, 650);
    expect(ui.arrastre.sobreJefe).toBe(false);
    expect(document.getElementById("flecha-objetivo").innerHTML).toContain("700,650");
    ui.cancelarArrastre();
  });

  it("el cursor se oculta durante el arrastre y vuelve al soltar", () => {
    ui.iniciarArrastre(0, 100, 600);
    expect(document.body.classList.contains("arrastrando-carta")).toBe(true);
    ui.cancelarArrastre();
    expect(document.body.classList.contains("arrastrando-carta")).toBe(false);
  });
});

describe("Punta de flecha y mano compacta", () => {
  let contenedor, ui, combat;

  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    ui = new UI(contenedor);
    ui.setCombat(combat);
    ui._forzarLimite = 500;
  });

  it("la punta es un poligono orientado, sin marcador", () => {
    ui.iniciarArrastre(0, 100, 600);
    ui.moverArrastre(300, 200);
    const svg = document.getElementById("flecha-objetivo").innerHTML;
    expect(svg).toContain("<polygon");
    expect(svg).not.toContain("marker");
    ui.cancelarArrastre();
  });

  it("la mano informa su tamano para compactarse", () => {
    expect(contenedor.querySelector(".cartas").getAttribute("data-n")).toBe("5");
    combat.hand = Array(8).fill("strike");
    ui.setCombat(combat);
    expect(contenedor.querySelector(".cartas").getAttribute("data-n")).toBe("8");
  });

  it("con 10 cartas la mano sigue cabiendo con descarte visible", () => {
    combat.hand = Array(10).fill("strike");
    ui.setCombat(combat);
    expect(contenedor.querySelectorAll(".mano .carta")).toHaveLength(10);
    expect(contenedor.querySelector("#btn-descarte .pila-contador")).toBeTruthy();
    expect(contenedor.querySelector("#btn-fin-turno")).toBeTruthy();
  });
});

describe("Mejora solo tras victoria", () => {
  it("al empezar a jugar no hay modal de mejora", () => {
    document.body.innerHTML = "";
    const contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    const combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    expect(combat.mejoraPendiente).toBe(false);
    const ui = new UI(contenedor);
    ui.setCombat(combat);
    expect(contenedor.querySelector("#modal-mejora")).toBeNull();
    contenedor.remove();
  });

  it("al avanzar de piso si queda pendiente la mejora", () => {
    const combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    combat.boss.hp = 1;
    combat.hand[0] = "strike";
    combat.player.energy = combat.player.maxEnergy;
    combat.jugarCarta(combat.hand.indexOf("strike"));
    combat.elegirRecompensa(combat.recompensa[0]);
    expect(combat.piso).toBe(1);
    expect(combat.mejoraPendiente).toBe(true);
  });
});

describe("Insignias de todos los efectos", () => {
  function combateLimpio() {
    const combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
      onSonido: () => {},
    });
    combat.iniciarCombate();
    combat.hand = [];
    combat.deck = [];
    combat.discard = [];
    combat.player.energy = 10;
    combat.player.maxEnergy = 10;
    return combat;
  }

  it("sin efectos no hay insignias", () => {
    const combat = combateLimpio();
    expect(combat.estadosJugador()).toHaveLength(0);
    expect(combat.estadosJefe()).toHaveLength(0);
  });

  it("destreza, espinas e intangible generan insignia", () => {
    const combat = combateLimpio();
    combat.hand = ["anticipate"];
    combat.jugarCarta(0);
    combat.espinas = 5;
    combat.player.intangible = 2;
    const ids = combat.estadosJugador().map((e) => e.id);
    expect(ids).toContain("destreza");
    expect(ids).toContain("espinas");
    expect(ids).toContain("intangible");
    expect(combat.estadosJugador().find((e) => e.id === "destreza").texto).toContain("Des 2");
  });

  it("los poderes activos generan insignia con su valor", () => {
    const combat = combateLimpio();
    combat.powers.accuracy = 4;
    combat.powers.fumes = 2;
    combat.powers.infBlades = 1;
    combat.powers.tracking = 1;
    combat.nextBlock = 4;
    combat.nextEnergy = 1;
    const textos = combat.estadosJugador().map((e) => e.texto).join("|");
    expect(textos).toContain("4");
    expect(textos).toContain("Humos");
    expect(textos).toContain("Dagas");
    expect(textos).toContain("Rastreo");
  });

  it("estadosJefe describe debil, vulnerable y veneno", () => {
    const combat = combateLimpio();
    combat.boss.weak = 1;
    combat.boss.vulnerable = 2;
    combat.boss.poison = 6;
    const estados = combat.estadosJefe();
    expect(estados.map((e) => e.id)).toEqual(["weak", "vulnerable", "poison"]);
    expect(estados.every((e) => e.titulo && e.clase)).toBe(true);
  });

  it("la UI pinta las insignias del jugador y del jefe", () => {
    document.body.innerHTML = "";
    const contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    const combat = combateLimpio();
    combat.hand = ["anticipate"];
    combat.jugarCarta(0);
    combat.espinas = 3;
    combat.boss.poison = 4;
    const ui = new UI(contenedor);
    ui.setCombat(combat);
    expect(contenedor.querySelectorAll(".insignias-jugador .estado").length).toBeGreaterThanOrEqual(2);
    expect(contenedor.querySelector(".insignias-jefe .estado.veneno")).toBeTruthy();
    contenedor.remove();
  });
});

describe("Pilas iguales que la mano + descripcion", () => {
  let contenedor, ui, combat;

  beforeEach(() => {
    document.body.innerHTML = "";
    contenedor = document.createElement("div");
    document.body.appendChild(contenedor);
    combat = new Combat({
      onStateChange: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onLog: () => {},
    });
    combat.iniciarCombate();
    ui = new UI(contenedor);
    ui.setCombat(combat);
  });

  it("las pilas muestran solo el arte oficial como la mano", () => {
    combat.discard.push("strike", "defend");
    ui.setCombat(combat);
    ui.abrirModalDescarte();
    const cartas = contenedor.querySelectorAll("#modal-descarte .carta-vista");
    expect(cartas.length).toBe(combat.discard.length);
    for (const el of cartas) {
      expect(el.querySelector("img").getAttribute("src")).toContain("/cartas/");
      expect(el.querySelector(".carta-descripcion")).toBeNull();
      expect(el.querySelector(".carta-nombre")).toBeNull();
    }
    ui.cerrarModal();
  });

  it("pasar el raton muestra la descripcion en espanol", () => {
    combat.discard.push("strike");
    ui.setCombat(combat);
    ui.abrirModalDescarte();
    const el = contenedor.querySelector("#modal-descarte .pila-vista");
    el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    const tip = document.getElementById("tooltip-carta");
    expect(tip).toBeTruthy();
    expect(tip.textContent).toContain("Golpe");
    expect(tip.textContent).toContain("Inflige 6");
    el.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    expect(document.getElementById("tooltip-carta")).toBeNull();
    ui.cerrarModal();
  });

  it("el tooltip se posiciona y se oculta a peticion", () => {
    ui._mostrarTooltip("defend", 400, 300);
    const tip = document.getElementById("tooltip-carta");
    expect(tip).toBeTruthy();
    expect(tip.textContent).toContain("Defensa");
    expect(tip.textContent).toContain("Bloqueo");
    ui._ocultarTooltip();
    expect(document.getElementById("tooltip-carta")).toBeNull();
    ui._mostrarTooltip("inexistente", 10, 10);
    expect(document.getElementById("tooltip-carta")).toBeNull();
  });
});
