// Interfaz de combate: renderizado DOM del estado
import { CARDS, BOSS, INTENCIONES_JEFE, INFO_TIPOS } from "./gamedata.js";

// Resolución resiliente de imágenes: si el proveedor cae (503/cache_only_cold)
// se usa el fallback local en lugar de la URL remota. Resolución perezosa:
// si el cargador global aún no resolvió la URL, se muestra la remota y el
// cargador la actualizará al terminar su ciclo de reintentos.
function imagenResiliente(cargador, url) {
  return cargador ? cargador.urlFinal(url) : url;
}

export class UI {
  constructor(root) {
    this.root = root;
    this.combat = null;
    this.lastLogs = [];
    this.modalAbierto = false; // Vista de baraja completa abierta
    this.cargador = null; // Cargador de imágenes resiliente (se inyecta)
  }

  setCargador(cargador) {
    this.cargador = cargador;
  }

  setCombat(combat) {
    this.combat = combat;
    this.render();
  }

  render() {
    const c = this.combat;
    if (!c) return;

    this.root.innerHTML = `
      <div class="combate" data-fase="${c.over ? "fin" : "jugando"}">
        <!-- Campo: jefe -->
        <section class="campo">
          <div class="lado-jefe">
            <div class="intencion" title="${c.boss.intent ? c.boss.intent.detail(c.boss.intent) : ""}">
              <span class="intencion-icono">${c.boss.intent ? c.boss.intent.icon : "?"}</span>
              <span class="intencion-texto">${c.boss.intent ? c.boss.intent.detail(c.boss.intent) : ""}</span>
            </div>
            <div class="entidad" data-entidad="jefe">
              <img src="${imagenResiliente(this.cargador, BOSS.image)}" alt="${BOSS.name}" />
              <div class="entidad-info">
                <div class="entidad-nombre">${BOSS.name} ${c.boss.weak > 0 ? `<span class="estado debuff" title="Débil: inflige 25% menos de daño">Débil ${c.boss.weak}</span>` : ""}</div>
                <div class="barra-vida">
                  <div class="barra-relleno" style="width: ${(c.boss.hp / c.boss.maxHp) * 100}%"></div>
                  <span>${c.boss.hp} / ${c.boss.maxHp}</span>
                </div>
                ${c.boss.block > 0 ? `<div class="bloqueo">🛡 ${c.boss.block}</div>` : ""}
              </div>
            </div>
          </div>

          <!-- Jugador -->
          <div class="lado-jugador">
            <div class="entidad jugador" data-entidad="jugador">
              <div class="avatar-jugador"><img src="/silent.png" alt="${c.player.name}" /></div>
              <div class="entidad-info">
                <div class="entidad-nombre">${c.player.name}
                  ${c.player.weak > 0 ? `<span class="estado debuff" title="Débil: tus ataques infligen 25% menos">Débil ${c.player.weak}</span>` : ""}
                </div>
                <div class="barra-vida">
                  <div class="barra-relleno" style="width: ${(c.player.hp / c.player.maxHp) * 100}%"></div>
                  <span>${c.player.hp} / ${c.player.maxHp}</span>
                </div>
                ${c.player.block > 0 ? `<div class="bloqueo">🛡 ${c.player.block}</div>` : ""}
              </div>
            </div>
            <div class="panel-estado">
              <div class="energia"><span>Energía</span><strong>${c.player.energy}/${c.player.maxEnergy}</strong></div>
              <div class="mazos">
                <span>Pila de robo: <b>${c.deck.length}</b></span>
                <span>Descarte: <b>${c.discard.length}</b></span>
              </div>
              <div class="accion">${c.ultimaAccion || ""}</div>
              <div class="botones-accion">
                <button class="btn-fin-turno" id="btn-fin-turno" ${c.busy || c.over || c.pendingDiscard ? "disabled" : ""}>
                  Finalizar turno
                </button>
                <button class="btn-baraja" id="btn-baraja" ${c.busy ? "disabled" : ""} title="Ver todas mis cartas">
                  📖 Ver todas mis cartas
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- Mano -->
        <section class="mano" data-modo="${c.pendingDiscard ? "descarte" : "normal"}">
          ${c.pendingDiscard ? `<div class="mano-aviso">Selecciona una carta para descartar</div>` : ""}
          <div class="cartas">
            ${c.hand
              .map((cardId, i) => {
                const card = CARDS[cardId];
                const jugable = c.puedeJugar(cardId);
                return `
                <div class="carta ${jugable ? "jugable" : "no-jugable"}" data-indice="${i}">
                  <div class="carta-costo">${card.cost}</div>
                  <img src="${imagenResiliente(this.cargador, card.image)}" alt="${card.name}" />
                  <div class="carta-nombre">${card.name}</div>
                  <div class="carta-tipo">${card.type}</div>
                  <div class="carta-descripcion">${card.description}</div>
                </div>`;
              })
              .join("")}
          </div>
        </section>
      </div>

      ${c.over ? `<div class="overlay-fin"><div class="mensaje-fin">${c.boss.hp <= 0 ? "¡VICTORIA!" : "DERROTA"}<button onclick="location.reload()">Reintentar</button></div></div>` : ""}

      ${this.modalAbierto ? this.renderModalBaraja() : ""}
    `;

    // Eventos
    this.root.querySelectorAll(".carta[data-indice]").forEach((el) => {
      el.addEventListener("click", () => {
        const i = Number(el.dataset.indice);
        if (this.modalAbierto) return; // El modal bloquea jugar cartas
        if (c.pendingDiscard) c.descartarCarta(i);
        else c.jugarCarta(i);
      });
    });
    const btn = this.root.querySelector("#btn-fin-turno");
    if (btn) btn.addEventListener("click", () => c.finalizarTurno());
    const btnBaraja = this.root.querySelector("#btn-baraja");
    if (btnBaraja) btnBaraja.addEventListener("click", () => this.abrirModalBaraja());
    if (this.modalAbierto) this.bindEventosModal();
  }

  // ---------- Modal: baraja completa ----------
  abrirModalBaraja() {
    if (!this.combat || this.combat.busy) return;
    this.modalAbierto = true;
    this.render();
    // Accesibilidad: el foco entra en el modal para que Escape funcione de inmediato
    const modal = this.root.querySelector("#modal-baraja");
    if (modal) modal.focus();
  }

  cerrarModalBaraja() {
    this.modalAbierto = false;
    this.render();
    // Devuelve el foco al botón de la baraja para continuar jugando con teclado
    const btn = this.root.querySelector("#btn-baraja");
    if (btn) btn.focus();
  }

  renderModalBaraja() {
    const grupos = this.combat.obtenerBarajaPorTipos();
    const total = grupos.reduce((suma, g) => suma + g.cartas.length, 0);
    const resumen = grupos.map((g) => {
      const info = g.tipo ? INFO_TIPOS[g.tipo] : null;
      return `<span class="resumen-item">${info ? `${info.icono} ${info.nombre}` : "Sin tipo"} ${g.cartas.length}</span>`;
    }).join("");

    // Animación escalonada: cada grupo y carta entra con un retardo índice*40ms
    // (techo en 30 elementos para que la última carta no espere demasiado)
    const gruposHtml = grupos
      .map((grupo, gi) => {
        const info = grupo.tipo ? INFO_TIPOS[grupo.tipo] : null;
        return `
        <section class="tipo-grupo ${grupo.tipo ? `tipo-${grupo.tipo}` : "sin-tipo"}" style="--retardo: ${gi * 90}ms">
          <h3 class="tipo-titulo">
            ${info ? `<span class="tipo-icono" aria-hidden="true">${info.icono}</span> ${info.nombre}` : "Sin tipo"}
            <span class="tipo-contador">(${grupo.cartas.length})</span>
          </h3>
          <div class="modal-cartas">
            ${grupo.cartas
              .map(
                (card, ci) => `
            <div class="carta carta-vista" style="--retardo: ${Math.min(ci * 40, 30 * 40)}ms">
              <div class="carta-costo">${card.cost}</div>
              <img src="${imagenResiliente(this.cargador, card.image)}" alt="${card.name}" loading="lazy" decoding="async" />
              <div class="carta-nombre">${card.name}</div>
              <div class="carta-tipo">${card.type}</div>
              <div class="carta-descripcion">${card.description}</div>
            </div>`
              )
              .join("")}
          </div>
        </section>`;
      })
      .join("");

    return `
      <div class="modal-baraja" id="modal-baraja" role="dialog" aria-modal="true" aria-label="Mi baraja completa: ${total} cartas agrupadas por tipo" tabindex="-1">
        <div class="modal-contenido">
          <div class="modal-cabecera">
            <h2>📖 Mi baraja (${total} cartas)</h2>
            <button class="btn-cerrar-modal" id="btn-cerrar-modal" aria-label="Cerrar vista de baraja">×</button>
          </div>
          <div class="modal-resumen">${resumen}</div>
          <div class="modal-grupos">${gruposHtml}</div>
          <button class="btn-volver" id="btn-volver">Volver al combate</button>
        </div>
      </div>
    `;
  }

  bindEventosModal() {
    const modal = this.root.querySelector("#modal-baraja");
    const btnCerrar = this.root.querySelector("#btn-cerrar-modal");
    const btnVolver = this.root.querySelector("#btn-volver");
    // Cierre: botón X, botón Volver y clic en el fondo del modal
    if (btnCerrar) btnCerrar.addEventListener("click", () => this.cerrarModalBaraja());
    if (btnVolver) btnVolver.addEventListener("click", () => this.cerrarModalBaraja());
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.cerrarModalBaraja();
      });
      // Cierra con la tecla Escape
      modal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.cerrarModalBaraja();
      });
    }
  }

  log(mensaje) {
    this.lastLogs.push(mensaje);
    if (this.lastLogs.length > 5) this.lastLogs.shift();
  }
}
