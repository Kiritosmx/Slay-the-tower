// Interfaz de combate estilo Slay the Spire sobre fondo de cueva (solo CSS).
// Layout según entorno1: jugador a la izquierda, jefe a la derecha,
// barras de vida bajo cada sprite, intención sobre el jefe y barra
// inferior con orbe de energía + pila de robo + mano + fin de turno + descarte.
import { CARDS, BOSS, PLAYER, INFO_TIPOS } from "./gamedata.js";

// Resolución resiliente de imágenes: si el proveedor cae (503/cache_only_cold)
// se usa el fallback local en lugar de la URL remota. Resolución perezosa:
// si el cargador global aún no resolvió la URL, se muestra la remota y el
// cargador la actualizará al terminar su ciclo de reintentos.
function imagenResiliente(cargador, url) {
  return cargador ? cargador.urlFinal(url) : url;
}

function barraVida(entidad, esJefe) {
  const pct = Math.max(0, (entidad.hp / entidad.maxHp) * 100);
  const conBloqueo = entidad.block > 0;
  return `
    <div class="barra-vida-wrap">
      ${conBloqueo ? `<div class="escudo-bloqueo" title="Bloqueo">🛡 ${entidad.block}</div>` : ""}
      <div class="barra-vida ${conBloqueo ? "con-bloqueo" : ""}" role="progressbar"
        aria-valuenow="${entidad.hp}" aria-valuemin="0" aria-valuemax="${entidad.maxHp}"
        aria-label="Vida ${esJefe ? "del jefe" : "del jugador"}">
        <div class="barra-relleno" style="width: ${pct}%"></div>
        <span>${entidad.hp} / ${entidad.maxHp}</span>
      </div>
    </div>`;
}

export class UI {
  constructor(root) {
    this.root = root;
    this.combat = null;
    this.lastLogs = [];
    this.modalAbierto = false; // Cualquier modal abierto (baraja / robo / descarte)
    this.vistaModal = null; // null | "baraja" | "robo" | "descarte"
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
        <!-- Barra superior: nombre, piso/turno, acción y baraja completa -->
        <header class="barra-superior">
          <div class="jugador-ficha">
            <span class="ficha-nombre">${c.player.name}</span>
            <span class="ficha-hp">❤ ${c.player.hp}/${c.player.maxHp}</span>
          </div>
          <div class="piso-turno">
            <span class="piso">Piso 1</span>
            <span class="turno">Turno ${c.turn}</span>
          </div>
          <div class="botones-accion">
            <span class="accion">${c.ultimaAccion || ""}</span>
            <button class="btn-baraja" id="btn-baraja" ${c.busy ? "disabled" : ""} title="Ver todas mis cartas">
              📖 Ver todas mis cartas
            </button>
          </div>
        </header>

        <!-- Escena: jugador izquierda, jefe derecha (como en entorno1) -->
        <section class="campo campo-escena">
          <div class="lado-jugador">
            <div class="entidad jugador" data-entidad="jugador">
              <img class="sprite sprite-jugador" src="${PLAYER.image}" alt="${c.player.name}" />
              <div class="entidad-info">
                <div class="entidad-nombre">${c.player.name}
                  ${c.player.weak > 0 ? `<span class="estado debuff" title="Débil: tus ataques infligen 25% menos">Débil ${c.player.weak}</span>` : ""}
                </div>
                ${barraVida(c.player, false)}
              </div>
            </div>
          </div>

          <div class="lado-jefe">
            <div class="intencion" title="${c.boss.intent ? c.boss.intent.detail(c.boss.intent) : ""}">
              <span class="intencion-icono">${c.boss.intent ? c.boss.intent.icon : "?"}</span>
              <span class="intencion-texto">${c.boss.intent ? c.boss.intent.detail(c.boss.intent) : ""}</span>
            </div>
            <div class="entidad jefe" data-entidad="jefe">
              <img class="sprite sprite-jefe" src="${imagenResiliente(this.cargador, BOSS.image)}" alt="${BOSS.name}" />
              <div class="entidad-info">
                <div class="entidad-nombre">${BOSS.name} ${c.boss.weak > 0 ? `<span class="estado debuff" title="Débil: inflige 25% menos de daño">Débil ${c.boss.weak}</span>` : ""}</div>
                ${barraVida(c.boss, true)}
              </div>
            </div>
          </div>
        </section>

        <!-- Barra inferior estilo Spire -->
        <footer class="barra-inferior">
          <div class="orbe-energia" title="Energía disponible" aria-label="Energía ${c.player.energy} de ${c.player.maxEnergy}">
            <span class="orbe-valor">${c.player.energy}/${c.player.maxEnergy}</span>
            <span class="orbe-nombre">Energía</span>
          </div>
          <button class="pila pila-robo" id="btn-robo" title="Ver cartas por robar (${c.deck.length})">
            <span class="pila-icono">🂠</span>
            <span class="pila-nombre">Robo</span>
            <span class="pila-contador">${c.deck.length}</span>
          </button>
          <section class="mano" data-modo="${c.pendingDiscard ? "descarte" : "normal"}">
            ${c.pendingDiscard ? `<div class="mano-aviso">Selecciona una carta para descartar</div>` : ""}
            <div class="cartas">
              ${c.hand
                .map((cardId, i) => {
                  const card = CARDS[cardId];
                  const jugable = c.puedeJugar(cardId);
                  return `
                  <div class="carta ${jugable ? "jugable" : "no-jugable"}" data-indice="${i}" data-tipo="${card.type}">
                    <div class="carta-costo">${card.cost}</div>
                    <div class="carta-nombre">${card.name}</div>
                    <img src="${imagenResiliente(this.cargador, card.image)}" alt="${card.name}" />
                    <div class="carta-tipo">${card.type}</div>
                    <div class="carta-descripcion">${card.description}</div>
                  </div>`;
                })
                .join("")}
            </div>
          </section>
          <div class="zona-fin">
            <button class="btn-fin-turno" id="btn-fin-turno" ${c.busy || c.over || c.pendingDiscard ? "disabled" : ""}>
              Finalizar turno
            </button>
          </div>
          <button class="pila pila-descarte" id="btn-descarte" title="Ver pila de descartes (${c.discard.length})">
            <span class="pila-icono">🗑</span>
            <span class="pila-nombre">Descarte</span>
            <span class="pila-contador">${c.discard.length}</span>
          </button>
        </footer>

        <div class="panel-estado" hidden>
          <div class="energia"><span>Energía</span><strong>${c.player.energy}/${c.player.maxEnergy}</strong></div>
          <div class="mazos">
            <span>Pila de robo: <b>${c.deck.length}</b></span>
            <span>Descarte: <b>${c.discard.length}</b></span>
          </div>
        </div>
      </div>

      ${c.over ? this.renderOverlayFin(c) : ""}

      ${this.modalAbierto && this.vistaModal === "baraja" ? this.renderModalBaraja() : ""}
      ${this.modalAbierto && this.vistaModal === "robo" ? this.renderModalPila("robo") : ""}
      ${this.modalAbierto && this.vistaModal === "descarte" ? this.renderModalPila("descarte") : ""}
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
    // Recompensa de victoria: solo se puede elegir 1 de las 3
    this.root.querySelectorAll(".carta-recompensa[data-id]").forEach((el) => {
      const elegir = () => c.elegirRecompensa(el.dataset.id);
      el.addEventListener("click", elegir);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); }
      });
    });
    const btn = this.root.querySelector("#btn-fin-turno");
    if (btn) btn.addEventListener("click", () => c.finalizarTurno());
    const btnBaraja = this.root.querySelector("#btn-baraja");
    if (btnBaraja) btnBaraja.addEventListener("click", () => this.abrirModalBaraja());
    const btnRobo = this.root.querySelector("#btn-robo");
    if (btnRobo) btnRobo.addEventListener("click", () => this.abrirModalRobo());
    const btnDescarte = this.root.querySelector("#btn-descarte");
    if (btnDescarte) btnDescarte.addEventListener("click", () => this.abrirModalDescarte());
    if (this.modalAbierto) this.bindEventosModal();
  }

  // ---------- Modales ----------
  abrirModalBaraja() {
    if (!this.combat || this.combat.busy) return;
    this.modalAbierto = true;
    this.vistaModal = "baraja";
    this.render();
    const modal = this.root.querySelector("#modal-baraja");
    if (modal) modal.focus();
  }

  abrirModalRobo() {
    if (!this.combat || this.combat.busy) return;
    this.modalAbierto = true;
    this.vistaModal = "robo";
    this.render();
    const modal = this.root.querySelector("#modal-robo");
    if (modal) modal.focus();
  }

  abrirModalDescarte() {
    if (!this.combat || this.combat.busy) return;
    this.modalAbierto = true;
    this.vistaModal = "descarte";
    this.render();
    const modal = this.root.querySelector("#modal-descarte");
    if (modal) modal.focus();
  }

  cerrarModal() {
    this.modalAbierto = false;
    this.vistaModal = null;
    this.render();
    const btn = this.root.querySelector("#btn-baraja");
    if (btn) btn.focus();
  }

  cerrarModalBaraja() {
    this.cerrarModal();
  }

  // ---------- Overlay de fin: recompensa (elige 1 de 3) o resultado ----------
  renderOverlayFin(c) {
    if (c.boss.hp > 0) {
      return `<div class="overlay-fin"><div class="mensaje-fin">DERROTA<button onclick="location.reload()">Reintentar</button></div></div>`;
    }
    // Victoria con recompensa pendiente: elegir 1 de 3 (estilo Spire)
    if (c.recompensa && c.recompensa.length > 0) {
      return `
      <div class="overlay-fin overlay-recompensa" id="recompensa" role="dialog" aria-modal="true" aria-label="Recompensa de victoria: elige 1 carta de 3">
        <div class="mensaje-fin mensaje-recompensa">
          <span>¡VICTORIA!</span>
          <span class="recompensa-sub">Elige 1 carta para tu baraja</span>
          <div class="recompensa-cartas">
            ${c.recompensa.map((cardId) => {
              const card = CARDS[cardId];
              return `
              <div class="carta carta-recompensa" data-id="${cardId}" data-tipo="${card.type}" role="button" tabindex="0" aria-label="Elegir ${card.name}">
                <div class="carta-costo">${card.cost}</div>
                <div class="carta-nombre">${card.name}</div>
                <img src="${imagenResiliente(this.cargador, card.image)}" alt="${card.name}" loading="lazy" decoding="async" />
                <div class="carta-tipo">${card.type}</div>
                <div class="carta-descripcion">${card.description}</div>
              </div>`;
            }).join("")}
          </div>
        </div>
      </div>`;
    }
    const ganada = c.recompensaElegida ? CARDS[c.recompensaElegida] : null;
    return `<div class="overlay-fin"><div class="mensaje-fin">¡VICTORIA!${ganada ? `<span class="recompensa-ganada">🃏 ${ganada.name} se une a tu baraja</span>` : ""}<button onclick="location.reload()">Reintentar</button></div></div>`;
  }

  renderModalBaraja() {
    const grupos = this.combat.obtenerBarajaPorTipos();
    const total = grupos.reduce((suma, g) => suma + g.cartas.length, 0);
    const resumen = grupos.map((g) => {
      const info = g.tipo ? INFO_TIPOS[g.tipo] : null;
      return `<span class="resumen-item">${info ? `${info.icono} ${info.nombre}` : "Sin tipo"} ${g.cartas.length}</span>`;
    }).join("");

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
            <div class="carta carta-vista" data-tipo="${card.type}" style="--retardo: ${Math.min(ci * 40, 30 * 40)}ms">
              <div class="carta-costo">${card.cost}</div>
              <div class="carta-nombre">${card.name}</div>
              <img src="${imagenResiliente(this.cargador, card.image)}" alt="${card.name}" loading="lazy" decoding="async" />
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

  renderModalPila(cual) {
    const esRobo = cual === "robo";
    const ids = esRobo ? this.combat.deck : this.combat.discard;
    const cartas = ids.map((id) => CARDS[id]).filter(Boolean);
    const idModal = esRobo ? "modal-robo" : "modal-descarte";
    const titulo = esRobo ? `🂠 Pila de robo (${cartas.length} por robar)` : `🗑 Pila de descartes (${cartas.length})`;
    const aria = esRobo ? `Pila de robo: ${cartas.length} cartas por robar` : `Pila de descartes: ${cartas.length} cartas`;
    const vacio = esRobo ? "No quedan cartas por robar." : "Aún no hay descartes.";
    return `
      <div class="modal-baraja modal-pila" id="${idModal}" role="dialog" aria-modal="true" aria-label="${aria}" tabindex="-1">
        <div class="modal-contenido">
          <div class="modal-cabecera">
            <h2>${titulo}</h2>
            <button class="btn-cerrar-modal" id="btn-cerrar-modal" aria-label="Cerrar vista de pila">×</button>
          </div>
          <div class="modal-grupos">
            ${cartas.length === 0 ? `<p class="pila-vacia">${vacio}</p>` : `
            <div class="modal-cartas">
              ${cartas.map((card, ci) => `
              <div class="carta carta-vista" data-tipo="${card.type}" style="--retardo: ${Math.min(ci * 40, 30 * 40)}ms">
                <div class="carta-costo">${card.cost}</div>
                <div class="carta-nombre">${card.name}</div>
                <img src="${imagenResiliente(this.cargador, card.image)}" alt="${card.name}" loading="lazy" decoding="async" />
                <div class="carta-tipo">${card.type}</div>
                <div class="carta-descripcion">${card.description}</div>
              </div>`).join("")}
            </div>`}
          </div>
          <button class="btn-volver" id="btn-volver">Volver al combate</button>
        </div>
      </div>
    `;
  }

  bindEventosModal() {
    const modal = this.root.querySelector("#modal-baraja, #modal-robo, #modal-descarte");
    const btnCerrar = this.root.querySelector("#btn-cerrar-modal");
    const btnVolver = this.root.querySelector("#btn-volver");
    if (btnCerrar) btnCerrar.addEventListener("click", () => this.cerrarModal());
    if (btnVolver) btnVolver.addEventListener("click", () => this.cerrarModal());
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.cerrarModal();
      });
      modal.addEventListener("keydown", (e) => {
        if (e.key === "Escape") this.cerrarModal();
      });
    }
  }

  log(mensaje) {
    this.lastLogs.push(mensaje);
    if (this.lastLogs.length > 5) this.lastLogs.shift();
  }
}
