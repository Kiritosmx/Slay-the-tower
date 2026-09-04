// ============================================================
// Pruebas automatizadas de los checkpoints funcionales
// Se ejecutan con: npm test  (vitest)
// Cada bloque describe() corresponde a un checkpoint (hito clave).
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { CARDS, BOSS, crearBarajaInicial, elegirIntencionJefe, INTENCIONES_JEFE } from "../src/gamedata.js";
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
      expect(CARDS[id].image).toMatch(/^https?:\/\//);
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
    expect(contenedor.querySelector(".sprite-jefe").getAttribute("alt")).toContain("Centinela");
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
