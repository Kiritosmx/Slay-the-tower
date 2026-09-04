// Slay the Tower - Punto de entrada
import "./styles.css";
import { Combat } from "./combat.js";
import { UI } from "./ui.js";
import { CargadorImagenesResiliente } from "./resilient.js";
import { CARDS, BOSS } from "./gamedata.js";
import { SistemaCheckpoints } from "./checkpoints.js";

const app = document.querySelector("#app");
const ui = new UI(app);

// ---------- Resiliencia ante incidentes del proveedor de imágenes ----------
// El proveedor remoto ha presentado errores 503 (cache_only_cold) en el
// pasado: se precargan los recursos con reintentos inteligentes, caché
// complementaria, cortacircuitos y fallback local garantizado.
const cargador = new CargadorImagenesResiliente();
ui.setCargador(cargador);
if (typeof globalThis !== "undefined") globalThis.__CARGADOR_RECURSOS__ = cargador;
if (typeof window !== "undefined") window.__CARGADOR_RECURSOS__ = cargador;

const combat = new Combat({
  onStateChange: () => ui.setCombat(combat),
  onGameOver: () => console.log("Derrota"),
  onVictory: () => console.log("Victoria"),
  onLog: (msg) => console.log("[combate]", msg),
});

// Inicia el primer turno una vez que combat está inicializado
combat.iniciarCombate();

// ---------- Precarga de recursos con gestión de carga ----------
// Concurrencia limitada para no saturar al proveedor (prevención 503).
// Al completarse, se re-renderiza para mostrar imágenes remotas o fallbacks.
const urlsRecursos = [
  CARDS.strike.image,
  CARDS.defend.image,
  CARDS.neutralize.image,
  CARDS.survivor.image,
  BOSS.image,
];
cargador.precargar(urlsRecursos).then(() => {
  ui.setCombat(combat); // re-render con recursos resueltos
});

// ---------- Checkpoints funcionales ----------
// Se ejecutan al arrancar (hito: aplicación operativa) y quedan expuestos
// para su re-ejecución manual desde consola: __CHECKPOINTS__.verificarTodos()
const sistemaCheckpoints = new SistemaCheckpoints();
if (typeof globalThis !== "undefined") globalThis.__CHECKPOINTS__ = sistemaCheckpoints;
if (typeof window !== "undefined") window.__CHECKPOINTS__ = sistemaCheckpoints;

sistemaCheckpoints
  .verificarBase()
  .then(() => sistemaCheckpoints.verificar("cp06-resiliencia-503"))
  .then(() => sistemaCheckpoints.verificar("cp07-recursos-imagenes"))
  .then((informe) => {
    console.info(
      `[checkpoints] Estado global: ${informe.estadoGlobal} (${informe.verificados} verificados, ${informe.alertas} alertas)`
    );
  })
  .catch((err) => console.warn("[checkpoints] Fallo en la verificación inicial:", err));
