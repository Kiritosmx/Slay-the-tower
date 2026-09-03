// Slay the Tower - Punto de entrada
import "./styles.css";
import { Combat } from "./combat.js";
import { UI } from "./ui.js";

const app = document.querySelector("#app");
const ui = new UI(app);

const combat = new Combat({
  onStateChange: () => ui.setCombat(combat),
  onGameOver: () => console.log("Derrota"),
  onVictory: () => console.log("Victoria"),
  onLog: (msg) => console.log("[combate]", msg),
});

// Inicia el primer turno una vez que combat está inicializado
combat.iniciarCombate();
