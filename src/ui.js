// Interfaz de combate: renderizado DOM del estado
import { CARDS, BOSS, INTENCIONES_JEFE } from "./gamedata.js";

export class UI {
  constructor(root) {
    this.root = root;
    this.combat = null;
    this.lastLogs = [];
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
              <img src="${BOSS.image}" alt="${BOSS.name}" />
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
              <button class="btn-fin-turno" id="btn-fin-turno" ${c.busy || c.over || c.pendingDiscard ? "disabled" : ""}>
                Finalizar turno
              </button>
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
                  <img src="${card.image}" alt="${card.name}" />
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
    `;

    // Eventos
    this.root.querySelectorAll(".carta").forEach((el) => {
      el.addEventListener("click", () => {
        const i = Number(el.dataset.indice);
        if (c.pendingDiscard) c.descartarCarta(i);
        else c.jugarCarta(i);
      });
    });
    const btn = this.root.querySelector("#btn-fin-turno");
    if (btn) btn.addEventListener("click", () => c.finalizarTurno());
  }

  log(mensaje) {
    this.lastLogs.push(mensaje);
    if (this.lastLogs.length > 5) this.lastLogs.shift();
  }
}
