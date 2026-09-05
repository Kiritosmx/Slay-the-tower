# Slay the Tower — Documentación Técnica del Proyecto

> Versión del documento: 1.0 — 2026-09-04
> Estado: **Operativo** (48/48 pruebas superadas · build de producción verificado)
> Responsable de mantenimiento: Equipo de desarrollo (agente Trae + Kike)

---

## 1. Objetivos del proyecto

### 1.1 Objetivo estratégico
Construir un juego de cartas roguelike por turnos inspirado en *Slay the Spire* — *"La Silenciosa" vs. el Centinela de la Torre"* — desplegable en web (Vercel) con calidad de producción y capacidad de evolucionar hacia un modo campaña completo (múltiples pisos, reliquias, pociones y más jefes).

### 1.2 Objetivos operativos
| # | Objetivo | Estado |
|---|----------|--------|
| O1 | Motor de combate por turnos funcional (energía, bloqueo, debuffs, baraja/robo/descarte) | ✅ Operativo |
| O2 | Interfaz completa: campo, intención del jefe, mano, panel de estado, modal de baraja | ✅ Operativo |
| O3 | **Checkpoints funcionales** en hitos clave con verificación de funcionalidad, rendimiento y estabilidad | ✅ Implementado (7 checkpoints, 31 pruebas) |
| O4 | **Resiliencia ante incidentes del proveedor** (503 / `cache_only_cold`): reintentos, caché, cortacircuitos, monitoreo | ✅ Implementado |
| O5 | Documentación estructurada y registro cronológico de cambios actualizado en tiempo real | ✅ Este documento |
| O6 | Despliegue continuo en Vercel (`framework: vite`) | ✅ Configurado |

### 1.3 Criterios de éxito medibles
- Cobertura de verificación: **48/48 pruebas** en `npm test`.
- Rendimiento del motor: **≤ 50 ms/turno** (medido: ~0.05 ms/turno).
- Rendimiento de la UI: **≤ 100 ms/render** (medido: ~7-46 ms).
- Degradación ante caída del proveedor de imágenes: **100 % jugable** (fallback local garantizado).

---

## 2. Arquitectura del sistema

```
Slay the tower/
├── index.html                 Punto de entrada HTML (monta #app)
├── package.json               Scripts: dev | build | test | checkpoint
├── vitest.config.js           Configuración de pruebas (jsdom)
├── vercel.json                Despliegue (vite → dist)
├── src/
│   ├── main.js                Bootstrap: UI + combate + cargador resiliente + checkpoints
│   ├── gamedata.js            Datos: cartas, baraja inicial, jefe, intenciones
│   ├── combat.js              Motor de combate (reglas y flujo de turnos)
│   ├── ui.js                  Renderizado DOM del combate (integrado con resiliencia)
│   ├── resilient.js           ⭐ Módulo de resiliencia (reintentos, caché, cortacircuitos, monitor, fallback)
│   ├── checkpoints.js         ⭐ Sistema de checkpoints funcionales (7 hitos)
│   └── styles.css             Estilos del campo de batalla
└── tests/
    └── checkpoints.test.js    Suite automatizada (31 pruebas, 1 archivo)
```

Flujo de arranque (`main.js`):
1. Se instancia `UI` y `Combat`; el combate arranca el turno 1.
2. Se crea el `CargadorImagenesResiliente` y se inyecta en la UI.
3. Se precargan los 5 recursos de imagen **con concurrencia limitada** (≤ 3 simultáneas).
4. Al resolverse (remoto/caché/fallback), se re-renderiza la UI.
5. Se ejecutan los checkpoints base + resiliencia al inicio; quedan expuestos en `window.__CHECKPOINTS__` para re-verificación manual.

---

## 3. Sistema de checkpoints funcionales

Cada checkpoint es un **hito clave** con verificaciones objetivas de **funcionalidad, rendimiento y estabilidad**. Se ejecutan automáticamente al arrancar la app, en cada `npm test` y pueden invocarse manualmente desde la consola del navegador.

### 3.1 Registro de checkpoints
| ID | Hito | Tipo | Verifica | Pruebas |
|----|------|------|----------|---------|
| `cp01-datos-juego` | Datos del juego íntegros | Funcionalidad | 4 cartas con imagen, baraja de 12, jefe, 5 intenciones, no-repetición de intención | 4 |
| `cp02-motor-combate` | Motor operativo | Funcionalidad | Turno/energía/mano, reciclaje de descarte, límite de mano, costes, bloqueo | 6 |
| `cp03-fin-partida` | Fin de partida correcto | Estabilidad | Victoria (jefe 0 PS), derrota (jugador 0 PS), bloqueo post-fin | 2 |
| `cp04-rendimiento` | Rendimiento del motor | Rendimiento | 20 turnos simulados; ≤ 50 ms/turno | 1 |
| `cp05-ui` | UI renderiza el combate | Funcionalidad + Rendimiento | HTML completo, botones, 5 cartas; render ≤ 100 ms | 2 |
| `cp06-resiliencia-503` | Resiliencia ante 503/`cache_only_cold` | Estabilidad | Clasificación de errores, backoff, reintentos, cortacircuitos, caché TTL, fallback, monitoreo | 10 |
| `cp07-recursos-imagenes` | Recursos resueltos | Estabilidad | 5 recursos críticos resueltos (remoto/caché/fallback), jugabilidad garantizada | 2 |
| `cp08-vista-baraja` | Vista de baraja completa por palos | Funcionalidad + Rendimiento | Botón presente, modal con 12 cartas, 4 grupos ♥♦♣♠, orden por valor, cierres (X/Volver/Escape/fondo), modal con 100+ cartas ≤ 100 ms | 17 |
| — | Integración del sistema | — | 8 checkpoints definidos, suite base sin alertas, error controlado | 3 |

### 3.2 Estados y salida
- **verificado** — todas las comprobaciones OK (consola: `[CHECKPOINT OK]`).
- **alerta** — al menos una comprobación fallida (consola: `[CHECKPOINT ALERTA]` + detalle).
- Informe agregado: `__CHECKPOINTS__.informe()` → `{ total, verificados, alertas, estadoGlobal }`.

### 3.3 Comandos
```bash
npm test        # Suite completa (vitest, jsdom): 48 pruebas
npm run checkpoint   # Pruebas + build de producción (verificación de hito)
```
```js
// En consola del navegador:
__CHECKPOINTS__.verificarTodos()   // re-ejecuta los 7 checkpoints
__CHECKPOINTS__.verificar("cp06-resiliencia-503")
__CHECKPOINTS__.informe()
__CARGADOR_RECURSOS__.monitor.resumen()   // salud del monitoreo
```

### 3.4 Cuándo ejecutar los checkpoints
- **Al arrancar** la aplicación (automático).
- **Tras cada cambio** en `gamedata.js`, `combat.js`, `ui.js`, `resilient.js` o `checkpoints.js` → `npm test`.
- **Antes de desplegar** a Vercel → `npm run checkpoint` (pruebas + build).
- **En incidente de producción** → verificar manualmente `cp06` y `cp07` desde la consola del navegador.

---

## 4. Incidente de referencia: error `cache_only_cold` (HTTP 503 / código 4028)

### 4.1 Descripción del error
```
cache-only admission rejected a cold, unavailable, or overloaded request
(Model Provider Error Code: cache_only_cold, HTTP Status: 503) (4028)
```

### 4.2 Análisis de causas raíz
| # | Causa raíz | Explicación |
|---|-----------|-------------|
| C1 | **Caché fría (cold cache)** | El proveedor opera en modo *cache-only*: si el recurso solicitado no está en su caché (fría tras un reinicio, despliegue o expiración), rechaza la petición en lugar de generarla. |
| C2 | **Sobrecarga del proveedor** | El 503 indica capacidad saturada: demasiadas peticiones simultáneas de clientes (posible *thundering herd* de reintentos no coordinados). |
| C3 | **Indisponibilidad temporal** | Ventanas de mantenimiento, reinicios o fallos de nodos del proveedor. |
| C4 | **Falta de capa de resiliencia en el cliente** | El proyecto original solicitaba las imágenes del proveedor directamente desde el `<img>` sin reintentos, caché local ni alternativa: **cualquier 503 = imagen rota en el juego**. |

### 4.3 Medidas preventivas y de resolución implementadas
Todas están implementadas en [src/resilient.js](../src/resilient.js) e integradas en el ciclo de vida de la app:

| Medida | Implementación | Mitiga |
|--------|----------------|--------|
| **Reintentos inteligentes** | `conReintentos()`: hasta 4 intentos con **backoff exponencial (800 ms → 8 s) + jitter ±30 %**. Solo reintenta errores clasificados como reintentables (503/429/408/`cache_only_cold`); los 4xx/500 no se reintentan para no añadir carga inútil. | C1, C3 |
| **Gestión de carga** | `precargar()` con **concurrencia limitada a 3 peticiones simultáneas** (semáforo de trabajadoras). | C2 |
| **Caché complementaria** | `CacheComplementario`: memoria + `sessionStorage` con **TTL de 24 h**. Un recurso servido una vez no se vuelve a pedir al proveedor (también entre sesiones del mismo navegador). | C1, C2, C3 |
| **Cortacircuitos** | `Cortacircuitos`: 3 fallos consecutivos → **abierto** (bloquea peticiones 30 s, degradación inmediata a fallback sin reintentos inútiles) → **semiabierto** (1 petición de prueba) → **cerrado** con éxito. Evita tormentas de reintentos contra un proveedor caído. | C2, C3 |
| **Fallback local garantizado** | `generarFallbackSVG()`: si tras agotar reintentos el recurso no llega, se genera una **imagen SVG embebida local (data URI)** con el nombre del recurso → **el juego es 100 % jugable sin proveedor**. | C1, C2, C3, C4 |
| **Monitoreo continuo** | `MonitorEventos`: registra cada intento/reintento/fallback con marca temporal, nivel (info/aviso/error) y contexto; expone `resumen()` con salud del sistema (`ok`/`degradado`/`critico`) y permite suscripciones en tiempo real. | Detección y trazabilidad |

### 4.4 Clasificación de errores (política)
| Error | ¿Reintenta? | Motivo |
|-------|-------------|--------|
| 503 / `cache_only_cold` | ✅ Sí (hasta 3 reintentos con backoff) | Transitorio: caché fría o sobrecarga |
| 429 (rate limit) | ✅ Sí | Transitorio con espera |
| 408 (timeout) | ✅ Sí | Transitorio |
| 500 (error interno) | ❌ No | No transitorio: reintento = carga inútil |

### 4.5 Verificación automatizada del incidente
El checkpoint `cp06-resiliencia-503` (10 pruebas) reproduce el error exacto del incidente y verifica **cada** medida:
- El mensaje literal del incidente se clasifica como reintentable.
- Un servicio simulado que falla 2 veces con 503 se recupera en el 3.er intento.
- El cortacircuitos abre tras 3 fallos y se recupera gradualmente.
- La caché sirve repeticiones y expira por TTL.
- El fallback SVG se genera sin red.
- El monitoreo calcula la salud correcta (`degradado` con 1 error).

### 4.6 Protocolo de actuación ante recurrencia
1. **Automático**: reintentos → caché → cortacircuitos → fallback SVG. El juego **nunca se rompe**.
2. **Detección**: consola del navegador → `__CARGADOR_RECURSOS__.monitor.resumen()`.
3. **Diagnóstico**: `__CHECKPOINTS__.verificar("cp06-resiliencia-503")` y `verificar("cp07-recursos-imagenes")`.
4. **Si el proveedor persiste caído**: el cortacircuitos mantiene degradación elegante; revisar estado del proveedor externo antes de actuar.
5. **Post-incidente**: documentar en el registro cronológico (sección 6) con causa, detección y resolución.

### 4.7 Medidas operativas (entorno de desarrollo)
Las mismas políticas se aplican a las herramientas de desarrollo:
- `npm install` ejecutado con `--fetch-retries=5 --fetch-retry-mintimeout=20000 --fetch-retry-maxtimeout=120000` (reintentos ante fallos de red del registro npm).
- Node.js portable (v22.14.0) instalado en `.tools/node` para independencia del PATH del sistema.
- Las instalaciones se verifican comprobando `node_modules` y `package.json` tras cada paso (patrón checkpoint aplicado al propio despliegue de herramientas).

---

## 5. Registro cronológico de cambios

> Convención: cada entrada registra fecha, archivo(s), propósito, responsable e impacto.
> Responsables: **TA** = agente Trae (automatizado), **KIKE** = propietario del proyecto.

| Fecha | Archivo(s) | Cambio | Propósito | Responsable | Impacto |
|-------|-----------|--------|-----------|-------------|---------|
| 2026-09-03 | `package-lock.json` | Cierre inicial de dependencias (vite 7.x) | Base de build | KIKE | Bajo |
| 2026-09-04 12:20 | `node_modules/` | Instalación de dependencias base (`npm install` con política de reintentos npm: `--fetch-retries=5`) | Preparar entorno de build | TA | Medio |
| 2026-09-04 13:05 | `.tools/node/` | Instalación de Node.js v22.14.0 portable (desde nodejs.org) dentro del proyecto | `node`/`npm` no disponibles en PATH del sandbox; garantiza builds y pruebas reproducibles | TA | Alto |
| 2026-09-04 13:10 | `package.json` | Nuevas devDependencies: `vitest@^5.0.0`, `jsdom@^29.1.1` | Infraestructura de pruebas para checkpoints | TA | Alto |
| 2026-09-04 13:12 | `package.json` | Scripts nuevos: `test`, `test:watch`, `checkpoint` (`vitest run && vite build`) | Automatizar verificación de hitos | TA | Medio |
| 2026-09-04 13:15 | `src/resilient.js` **(nuevo)** | Módulo de resiliencia: `conReintentos` (backoff+jitter), `Cortacircuitos`, `CacheComplementario` (TTL), `MonitorEventos`, `generarFallbackSVG`, `CargadorImagenesResiliente` (concurrencia limitada) | Mitigar el incidente `cache_only_cold`/503 y garantizar jugabilidad sin proveedor | TA | **Crítico** |
| 2026-09-04 13:20 | `src/checkpoints.js` **(nuevo)** | Sistema de checkpoints: clase `SistemaCheckpoints` + 7 checkpoints (CP-01…CP-07) con verificaciones de funcionalidad/rendimiento/estabilidad; expuesto en `window.__CHECKPOINTS__` | Verificación continua en hitos clave | TA | **Crítico** |
| 2026-09-04 13:22 | `src/ui.js` | Integración de resiliencia: `setCargador()`, helper `imagenResiliente()`; las 3 `<img>` (jefe, mano, modal) usan URL resuelta (remota o fallback) | Que la UI refleje degradación elegante | TA | Alto |
| 2026-09-04 13:25 | `src/main.js` | Bootstrap ampliado: cargador resiliente global (`__CARGADOR_RECURSOS__`), precarga con concurrencia ≤3, re-render al resolver, ejecución automática de checkpoints al inicio | Conectar resiliencia y checkpoints con el ciclo de vida de la app | TA | Alto |
| 2026-09-04 13:30 | `vitest.config.js` **(nuevo)** | Configuración de pruebas (jsdom, globals) | Ejecutar la suite de checkpoints | TA | Medio |
| 2026-09-04 13:32 | `tests/checkpoints.test.js` **(nuevo)** | Suite de 31 pruebas automatizadas (CP-01…CP-07 + integración del sistema) | Verificación reproducible de todos los hitos | TA | **Crítico** |
| 2026-09-04 13:40 | `src/checkpoints.js` | Corrección CP-02: combate fresco para las pruebas de reglas de cartas (evitaba contaminación de estado entre comprobaciones) | Exactitud del checkpoint | TA | Corrección |
| 2026-09-04 13:45 | `src/checkpoints.js` | Corrección CP-05: eliminado `push` anidado erróneo; aislamiento de DOM ante ids duplicados (jsdom) y selector por clase `.btn-fin-turno` | Exactitud del checkpoint | TA | Corrección |
| 2026-09-04 13:58 | `src/checkpoints.js` | Imports dinámicos → estáticos (ui.js, resilient.js) | Build sin advertencias de chunking | TA | Bajo |
| 2026-09-04 13:59 | `tests/`, `dist/` | **Verificación de hito**: 31/31 pruebas OK + build de producción OK (31.54 kB JS / gzip 10.65 kB) | Confirmar estado operativo | TA | Hito ✅ |
| 2026-09-04 14:05 | `docs/DOCUMENTACION_TECNICA.md` **(nuevo)** | Documentación técnica completa (este documento) | Trazabilidad y transferencia de conocimiento | TA | Alto |
| 2026-09-04 16:40 | `src/gamedata.js` | Nuevos datos de palos y valores: `PALOS` (♥♦♣♠ orden canónico), `INFO_PALOS` (icono/nombre/color por palo), `VALORES` (2→A), `etiquetaValor()`; cada carta recibe `palo` y `valor` (Golpe=♠7, Defensa=♥7, Neutralizar=♣A, Superviviente=♦Q) | Habilitar la vista de baraja agrupada por palo y ordenada por valor | TA | Alto |
| 2026-09-04 16:45 | `src/combat.js` | Nuevo método `obtenerBarajaPorPalos()`: agrupa pila+mano+descarte por palo (orden canónico) y ordena cada grupo por valor (2→A); cartas sin palo van a grupo final "sin palo" | Lógica de ordenamiento solicitada para la vista de baraja | TA | Alto |
| 2026-09-04 16:50 | `src/ui.js` | Modal de baraja rediseñado: render por grupos con título/contador/color de palo, etiqueta de valor (7/J/Q/K/A) en cada carta, animación escalonada (`--retardo` por grupo y carta con techo), foco automático al abrir y devolución de foco al botón al cerrar, `aria-label` descriptivo | Experiencia de usuario completa, accesible y fluida | TA | Alto |
| 2026-09-04 16:52 | `src/styles.css` | +210 líneas: estilo del botón `.btn-baraja` (paleta azul acorde al proyecto), modal (`backdrop-filter`, grid fluido `auto-fill minmax`), colores por palo, animaciones `modalEntrar`/`cartaAparecer`, responsive en 3 breakpoints (900px tablets / 600px móviles / escritorio), `prefers-reduced-motion` | Integración armónica + responsive total | TA | Alto |
| 2026-09-04 16:55 | `src/checkpoints.js` | Nuevo checkpoint `cp08-vista-baraja` (11 comprobaciones): botón, apertura, 12 cartas, 4 palos en orden, orden por valor, títulos, cierres, rendimiento con 100+ cartas; aislamiento de ids residuales | Verificación del nuevo hito clave | TA | Alto |
| 2026-09-04 16:57 | `tests/checkpoints.test.js` | +18 pruebas (48 total): botón abre/deshabilita, carga 12 cartas, agrupación ♥♦♣♠, orden por valor, etiquetas de valor, 4 cierres (X/Volver/Escape/fondo), bloqueo de juego con modal abierto, animación escalonada, rendimiento baraja máxima, carga diferida `loading=lazy`+`decoding=async`, compatibilidad cross-browser (ARIA/APIs) | Verificar botón, carga completa y compatibilidad | TA | **Crítico** |
| 2026-09-04 16:58 | `tests/`, `dist/` | **Verificación de hito**: 48/48 pruebas OK + build OK (35.50 kB JS / gzip 11.87 kB) | Confirmar integración sin conflictos | TA | Hito ✅ |
| 2026-09-04 23:00 | `public/silent_sin_fondo.png`, `public/boss2_sin_fondo.png` | Copia de `Images/*_sin_fondo.png` a `public/` para servir en Vercel; jugador izq / jefe dcha según `entorno1.jpg` | Assets locales sin fondo listos para producción | KIKE+TA | Alto |
| 2026-09-04 23:05 | `src/gamedata.js` | `BOSS.image` → `/boss2_sin_fondo.png` local; nuevo `PLAYER` (`La Silenciosa`, `/silent_sin_fondo.png`); se retiran URLs remotas de jefe (las cartas siguen con fallback resiliente) | Jefe y jugador con sprites propios, sin dependencia del proveedor | TA | Alto |
| 2026-09-04 23:10 | `src/combat.js` | Nuevos `obtenerPilaRobo()` y `obtenerPilaDescarte()` (id+datos, solo cartas válidas) | Soportar modales de robo/descarte estilo Spire | TA | Medio |
| 2026-09-04 23:15 | `src/ui.js` | Re-layout Spire: `.barra-superior` (ficha+piso/turno+baraja), `.campo-escena` (jugador izq/jefe dcha, intención sobre jefe), `barraVida()` roja → azul con `.con-bloqueo`+`.escudo-bloqueo`, `.barra-inferior` (orbe Energía + `#btn-robo` + mano + `#btn-fin-turno` + `#btn-descarte`), modales `#modal-robo`/`#modal-descarte` con `vistaModal`, cierres X/Volver/Escape/fondo preservados | Estética de ejemplo + pilas inspeccionables, sin romper ids/clases de tests | TA | **Crítico** |
| 2026-09-04 23:20 | `src/styles.css` | Fondo cueva solo CSS (capas radiales+viñeta, sin usar la captura), sprites sin marco con sombra-suelo elíptica, barras 260px rojas→azules, orbe energía circular, pilas con contador, fin de turno hexagonal, responsive 900/600px | Fondo parecido al ejemplo + layout Spire completo | TA | Alto |
| 2026-09-04 23:25 | `tests/checkpoints.test.js` | Jefe acepta imagen local `/...`; nuevo bloque `Estética Spire` (6 pruebas): reparto izq/dcha, orbe+contadores, barra azul con bloqueo, modales robo/descarte, métodos del motor | Fijar el nuevo hito visual (54 pruebas) | TA | Alto |
| 2026-09-04 23:30 | `tests/`, `dist/` | **Verificación de hito**: 54/54 pruebas OK + build OK (39.12 kB JS / gzip 12.63 kB) | Confirmar estética sin regresiones | TA | Hito ✅ |
| 2026-09-05 00:10 | `src/styles.css`, `src/ui.js` | Barras recolocadas justo bajo cada sprite (`.entidad` en columna centrada); jefe al doble de tamaño (170×220 → 340×440, 2x en tablet/móvil); cartas rediseñadas estilo Spire (`data-tipo`, marco por tipo, retrato enmarcado, orbe hexagonal, banda de nombre, pergamino de descripción) | Layout y cartas fieles al ejemplo | TA | Alto |
| 2026-09-05 00:15 | `src/gamedata.js`, `src/combat.js` | Rebalanceo: jugador 60→72 PS (`PLAYER.maxHp`, el motor ya no hardcodea), jefe 200→120 PS; intenciones 15→10, 22→16, Débil 2→1, rompe-escudo 8→6, drenar 10→6. Pelea de 8-10 turnos ganable (antes ~15 turnos a ~11 daño/turno = letal) | Dificultad justa pero exigente | TA | **Crítico** |
| 2026-09-05 00:20 | `src/checkpoints.js`, `tests/checkpoints.test.js` | Checkpoints y tests deterministas: Golpe/Defensa garantizados en mano para CP-02/CP-03 (la mano aleatoria podía no traerlos, ~2.6% de falsos fallos) | Eliminar flaky preexistente | TA | Corrección |
| 2026-09-05 00:25 | `tests/`, `dist/` | **Verificación de hito**: 54/54 pruebas OK (x2) + build OK (39.29 kB JS / gzip 12.66 kB) | Confirmar layout+balance sin regresiones | TA | Hito ✅ |
| 2026-09-05 01:00 | `src/styles.css` | Jefe fijado al doble exacto vía `calc(var(--sprite-w)*2)` en escritorio/tablet/móvil; `.sprite-jefe` con `mix-blend-mode:screen` (funde el negro) + `clip-path:inset(8% 3% 11% 3%)` (oculta flecha y barra 252/252 horneadas) + máscara radial (funde bordes) | `boss2_sin_fondo.png` como apariencia real del enemigo | TA | Alto |
| 2026-09-05 01:05 | `public/fondo-batalla.svg` **(nuevo)** | Fondo de batalla generado estilo Spire (cueva 1600×900: estalactitas, costillas orgánicas, rocas, suelo con reflejo, partículas y viñeta); `body` lo usa con degradados de respaldo | Fondo parecido al original sin depender de capturas | TA | Alto |
| 2026-09-05 01:10 | `src/ui.js`, `src/styles.css` | Cartas como el original: orden coste→nombre→retrato→tipo→descripción, 150×214 (modal igual, móvil 118×178), retrato 86px enmarcado, banda de nombre con hueco para el orbe hexagonal | Cartas legibles y proporcionadas | TA | Alto |
| 2026-09-05 01:15 | `tests/`, `dist/` | **Verificación de hito**: 54/54 pruebas OK + build OK (39.29 kB JS / gzip 12.66 kB) | Confirmar jefe/fondo/cartas sin regresiones | TA | Hito ✅ |
| 2026-09-05 01:30 | `Images/image.png` → `Images/boss.png` + `public/boss.png` | Nueva apariencia del jefe desde `image.png` (1024×1024 RGB): fondo blanco eliminado por script propio (Node nativo, umbral por canal mínimo, 85.5% transparente) → `BOSS.image` = `/boss.png`; retirados blend/recorte (era para el PNG anterior) | Jefe limpio sobre la cueva, tamaño 2x intacto | TA | Alto |
| 2026-09-05 01:35 | `tests/`, `dist/` | **Verificación de hito**: 54/54 pruebas OK + build OK (39.28 kB JS / gzip 12.66 kB) | Confirmar nueva apariencia sin regresiones | TA | Hito ✅ |
| 2026-09-05 02:00 | `public/boss.png`, `Images/boss.png` | Recorte del padding transparente (1024×1024 → 647×735): el ciervo llena su caja y el 2x sobre la Silenciosa ya es visible real, no solo de caja | Tamaño 2x efectivo | TA | Medio |
| 2026-09-05 02:05 | `src/gamedata.js` | Pool `CARTAS_RECOMPENSA` (10 cartas reales de la Silenciosa vía wiki: Rodilla Voladora, Lluvia de Dagas, Danza de Cuchillas, Depredador, Puñalada Tóxica, Golpe Bajo, Barrido, Voltereta, Capa y Daga, Lamento Perforante) con efectos adaptados al motor + `elegirRecompensas(3)` | Recompensas fieles al original | TA | Alto |
| 2026-09-05 02:10 | `src/combat.js`, `src/ui.js`, `src/styles.css` | `ganar()` genera 3 opciones; `elegirRecompensa(id)` valida y añade 1 a la baraja; overlay `#recompensa` estilo Spire (clic/Enter/Espacio) y mensaje de carta ganada; inválidas y duplicadas se ignoran | Elige 1 de 3 al vencer | TA | **Crítico** |
| 2026-09-05 02:15 | `tests/checkpoints.test.js` | Nuevo bloque (5 pruebas, 59 total): pool válido, 3 opciones al vencer, elección suma 1 a la baraja, inválidas ignoradas, flujo UI completo | Fijar la recompensa | TA | Alto |
| 2026-09-05 02:20 | `tests/`, `dist/` | **Verificación de hito**: 59/59 pruebas OK (x2) + build OK (44.74 kB JS / gzip 13.83 kB) | Confirmar recompensa sin regresiones | TA | Hito ✅ |
| 2026-09-05 02:30 | `src/ui.js`, `src/styles.css` | Arrastre estilo Spire: las cartas SOLO se juegan arrastrando hacia arriba y soltando en zona de juego; flecha SVG curva con punta (dorada en zona, gris fuera), carta que sigue al puntero, jefe iluminado + vista previa (`−daño`/`+bloqueo`/`Débil`) al apuntarle; cancela soltar abajo, Escape y clic derecho; el clic solo sigue descartando en modo Superviviente | Interacción fiel al original | TA | **Crítico** |
| 2026-09-05 02:35 | `tests/checkpoints.test.js` | Nuevo bloque (8 pruebas, 67 total): clic no juega, clic sí descarta, soltar arriba juega, soltar abajo cancela, Escape limpia, `efectoPrevisto` con Débil, detección del jefe, vista previa visible | Fijar el arrastre | TA | Alto |
| 2026-09-05 02:40 | `tests/`, `dist/` | **Verificación de hito**: 67/67 pruebas OK (x2) + build OK (50.71 kB JS / gzip 15.57 kB) | Confirmar arrastre sin regresiones | TA | Hito ✅ |
| 2026-09-05 03:00 | `Images/enemigo_*.png`, `public/enemigo_*.png` | Pisos 1-4 desde `image_0..3`: 0 y 2 con fondo blanco eliminado+recorte (863×882, 881×989), 1 y 3 con escena pintada (se funden bordes por CSS) | 4 apariencias listas | TA | Alto |
| 2026-09-05 03:05 | `src/gamedata.js` | `PISOS` (5, dificultad creciente 60→120 PS con daño por piso), `crearJefeDePiso()`, `detail` de Débil dinámico | Torre de 5 pisos, sin jefe final aparte | TA | Alto |
| 2026-09-05 03:10 | `src/combat.js` | `piso`, `victoriaTotal`, `avanzarPiso()` (rebaraja con la carta nueva, vida persistente + cura 25%, turno a 1), intenciones clonadas con daño del piso, `onSonido` en 8 acciones | Avance + ganchos de sonido | TA | **Crítico** |
| 2026-09-05 03:15 | `src/sonidos.js` **(nuevo)** | 13 efectos WebAudio sintetizados (ataque, bloqueo, daños, drenar, fin-turno, victoria, derrota, recompensa, curación, clics), sin archivos; silencio persistente; historial para pruebas; el sonido nunca rompe el juego | Sonido en todas las acciones | TA | Alto |
| 2026-09-05 03:20 | `src/ui.js`, `src/main.js`, `src/styles.css` | `Piso X/5`, botón 🔊/🔇, sprite del piso (`fondo-escena` en 2 y 4), overlay `¡TORRE CONQUISTADA!`, precarga de 9 recursos, desbloqueo de audio al primer toque | Integración total | TA | Alto |
| 2026-09-05 03:25 | `src/checkpoints.js`, `tests/checkpoints.test.js` | CP-05 usa el nombre del jefe del piso, CP-07 verifica 9 recursos (robusto a caché compartida); +11 pruebas (67→78): pisos, avance, cura, victoria total, sonidos, botón mute | Cobertura de pisos+sonido | TA | Alto |
| 2026-09-05 03:30 | `tests/`, `dist/` | **Verificación de hito**: 78/78 pruebas OK (x2) + build OK (55.93 kB JS / gzip 17.25 kB) | Confirmar pisos+sonidos sin regresiones | TA | Hito ✅ |
| 2026-09-05 04:00 | `cartas/` **(nueva)** | 182 imágenes oficiales de la Silenciosa (91 base + 91 Plus) a tamaño completo 734×916 desde la wiki, nombres ingleses originales; verificadas una a una (firma PNG) | Galería local de cartas | TA | Medio |
| 2026-09-05 05:00 | `public/cartas/` (182) + `src/cartas_basicas.js` + `src/cartas_avanzadas.js` **(nuevos)** | Las 91 cartas reales con costes/textos de la wiki y efectos implementados: veneno con ticks, Dagas, robo, energía, agotar, conservar, innatas, Escurridiza, Destreza, Espinas, Vulnerable ×1.5, costes X, 12 poderes, Gran Final condicionado, Caza con bonus y Pesadilla con elección; galería movida a `public/cartas` para el deploy | Roster completo jugable | TA | **Crítico** |
| 2026-09-05 05:10 | `src/combat.js`, `src/gamedata.js` | Motor extendido (`_efectos` central, `_descartar` con Escurridiza, costes efectivos, ticks de veneno, contadores de turno/combate); `CARDS` con base+Plus, pool de 85 recompensas (sin Plus); `elegirMejora()` sustituye 1 copia | Base del sistema | TA | **Crítico** |
| 2026-09-05 05:15 | `src/ui.js`, `src/main.js`, `src/sonidos.js`, `src/styles.css` | Modal de mejora obligatorio al empezar cada piso con vista previa base→Plus; modal de elección de Pesadilla; mejora pendiente bloquea jugar/cerrar turno; sonidos nuevos (veneno, robo, mejora, poder) | Mejora elegida con previa | TA | Alto |
| 2026-09-05 05:20 | `tests/checkpoints.test.js` | +19 pruebas (78→97): catálogo, veneno, dagas, robo/energía, conservar/innata, Escurridiza, Destreza/Vulnerable, costes X, Ráfaga, escalados, Espinas, Intangible, Tiempo Bala, Brote, mejora, Pesadilla, Plan Perfecto, Caza bonus, UI de mejora | Cobertura total | TA | Alto |
| 2026-09-05 05:25 | `tests/`, `dist/` | **Verificación de hito**: 97/97 pruebas OK + build OK (90.36 kB JS / gzip 24.75 kB) | Confirmar 91 cartas sin regresiones | TA | Hito ✅ |
| 2026-09-05 06:00 | `src/ui.js`, `src/styles.css` | Recompensa en grande (190px, overlay 920px); arrastre en capa fija z-60 con flecha z-55 que sale del centro de la carta; al apuntar la carta se difumina (solo flecha) | Arrastre siempre visible | TA | Alto |
| 2026-09-05 06:05 | `src/combat.js`, `src/ui.js`, `src/styles.css` | `valorIntencionEfectivo()` (Débil −25% en atacar/aplastar/romper); intención debilitada con `→ N` pulsante; insignias de Vulnerable y Veneno en el jefe | Ataque previsto reactivo | TA | Alto |
| 2026-09-05 06:10 | `tests/checkpoints.test.js` | +6 pruebas (97→103): efectivo con/sin Débil, insignias, carta en capa fija, difuminado al apuntar, recompensa grande | Cobertura visual | TA | Medio |
| 2026-09-05 06:15 | `tests/`, `dist/` | **Verificación de hito**: 103/103 pruebas OK (×3) + build OK (91.59 kB JS / gzip 25.17 kB) | Confirmar visuales sin regresiones | TA | Hito ✅ |
| 2026-09-05 06:30 | `src/ui.js`, `src/styles.css` | Recompensa solo-imagen: se elimina el marco propio (duplicaba el arte oficial) y se muestra el PNG tal cual a 230px con tooltip del efecto en español | Carta completa y ampliada | TA | Medio |
| 2026-09-05 06:35 | `tests/`, `dist/` | **Verificación de hito**: 103/103 pruebas OK + build OK (91.35 kB JS / gzip 25.17 kB) | Confirmar recompensa sin regresiones | TA | Hito ✅ |
| 2026-09-05 07:00 | `src/ui.js`, `src/styles.css` | Mano con arte oficial solo-imagen (150px, sin marco duplicado); arrastre como antes (carta visible a 1.12) con fundido a flecha al salir del marco (transición + flecha intensa con brillo) | Mano fiel y arrastre fluido | TA | Alto |
| 2026-09-05 07:05 | `tests/`, `dist/` | **Verificación de hito**: 103/103 pruebas OK + build OK (91.59 kB JS / gzip 25.27 kB) | Confirmar mano+arrastre sin regresiones | TA | Hito ✅ |
| 2026-09-05 07:20 | `src/ui.js`, `src/styles.css` | Arrastre nativo del navegador desactivado (`draggable=false` en las 9 imágenes, `preventDefault` en pointerdown, `dragstart` anulado, `user-drag:none`); el gesto vuelve al arrastre propio | Se puede volver a jugar | TA | **Crítico** |
| 2026-09-05 07:25 | `tests/`, `dist/` | **Verificación de hito**: 106/106 pruebas OK + build OK (91.83 kB JS / gzip 25.30 kB) | Confirmar gesto sin regresiones | TA | Hito ✅ |
| 2026-09-05 07:40 | `src/ui.js`, `src/styles.css` | Reversión del sistema de flecha al anterior (carta visible a 1.12 sin fundidos, flecha fina z-45); se conservan las correcciones funcionales (capa fija anti-ocultación, anti-fantasma nativo) | Flecha como estaba | TA | Corrección |
| 2026-09-05 07:45 | `tests/`, `dist/` | **Verificación de hito**: 106/106 pruebas OK + build OK (91.30 kB JS / gzip 25.15 kB) | Confirmar reversión sin regresiones | TA | Hito ✅ |
| 2026-09-05 08:00 | `src/ui.js`, `src/styles.css` | Flecha estilo original: sale de la carta, es gruesa con punta grande y al apuntar al jefe se clava en su centro (ya no flota en el cursor); cursor oculto durante el arrastre | Flecha hasta el objetivo | TA | Corrección |
| 2026-09-05 08:05 | `tests/`, `dist/` | **Verificación de hito**: 109/109 pruebas OK + build OK (91.72 kB JS / gzip 25.29 kB) | Confirmar flecha sin regresiones | TA | Hito ✅ |
| 2026-09-05 08:20 | `src/ui.js`, `src/styles.css` | Flecha como en el original: origen fijo en la carta de la mano (la carta se queda, solo se eleva), punta libre que sigue al cursor para elegir objetivo; se quita el clavado al enemigo | Origen fijo, punta libre | TA | Corrección |
| 2026-09-05 08:25 | `tests/`, `dist/` | **Verificación de hito**: 109/109 pruebas OK + build OK (90.92 kB JS / gzip 25.00 kB) | Confirmar concepto sin regresiones | TA | Hito ✅ |
| 2026-09-05 08:40 | `src/ui.js`, `src/styles.css` | Punta de flecha como polígono orientado (sin marcador, siempre visible y grande); mano en abanico solapado con `data-n` que encoge a 6+/8+ cartas (orbe, robo, fin y descarte siempre caben); responsive 420px, apaisado bajo, táctil sin zoom fantasma | Punta real + HUD adaptable + móvil | TA | Alto |
| 2026-09-05 08:45 | `tests/`, `dist/` | **Verificación de hito**: 112/112 pruebas OK + build OK (90.87 kB JS / gzip 24.99 kB) | Confirmar punta+HUD+móvil sin regresiones | TA | Hito ✅ |
| 2026-09-05 09:00 | `src/styles.css` | Horizontal real (apaisado ≤500px alto): barra fina en fila, sprites 76px, escena sin altura mínima, barra inferior en una fila con mano flexible y cartas de 92px, recompensa y modales compactos | Se juega en horizontal | TA | Medio |
| 2026-09-05 09:05 | `tests/`, `dist/` | **Verificación de hito**: 112/112 pruebas OK + build OK (90.87 kB JS / gzip 24.99 kB) | Confirmar horizontal sin regresiones | TA | Hito ✅ |
| 2026-09-05 09:20 | `src/main.js` | La mejora ya no se ofrece al empezar a jugar, solo al derrotar enemigos (avanzarPiso) | Flujo correcto | TA | Corrección |
| 2026-09-05 09:25 | `tests/`, `dist/` | **Verificación de hito**: 114/114 pruebas OK + build OK (90.85 kB JS / gzip 24.98 kB) | Confirmar flujo sin regresiones | TA | Hito ✅ |
| 2026-09-05 09:40 | `src/combat.js`, `src/ui.js`, `src/styles.css` | `estadosJugador()`/`estadosJefe()`: insignias de Destreza, Espinas, Intangible, los 14 poderes, bloqueos/energía/robos programados y temporales de turno; jefe con Débil, Vulnerable y Veneno | Todos los efectos visibles | TA | Alto |
| 2026-09-05 09:45 | `tests/`, `dist/` | **Verificación de hito**: 119/119 pruebas OK + build OK (94.09 kB JS / gzip 25.84 kB) | Confirmar insignias sin regresiones | TA | Hito ✅ |

---

## 6. Guías de operación

### 6.1 Desarrollo local
```powershell
# Node portable (si node/npm no están en PATH):
$node  = "C:\Users\Kike\Desktop\Proyectos\.tools\node\node-v22.14.0-win-x64\node.exe"
$npm   = "C:\Users\Kike\Desktop\Proyectos\.tools\node\node-v22.14.0-win-x64\node_modules\npm\bin\npm-cli.js"
& $node $npm run dev          # servidor de desarrollo Vite
```

### 6.2 Verificación de hito (checkpoint completo)
```powershell
& $node $npm run checkpoint   # = vitest run + vite build
```

### 6.3 Despliegue
- Vercel está configurado (`vercel.json`: framework vite, build `npm run build`, output `dist`).
- **Requisito previo de despliegue**: `npm run checkpoint` en verde.
- El proyecto Vercel vinculado es `trae_y1nm6h6k` (`.vercel/project.json`).

### 6.4 Reglas de trabajo a partir de ahora (acordadas)
1. **Cada cambio de código → `npm test`** antes de considerarse terminado.
2. **Cada hito → `npm run checkpoint`** (pruebas + build) y anotación en el registro cronológico (sección 5).
3. **Toda edición relevante se documenta** en la sección 5 con: fecha, archivos, propósito, responsable, impacto.
4. **El incidente `cache_only_cold` se considera mitigado por diseño**: cualquier nuevo recurso externo (API, imagen, servicio) debe integrarse a través de `resilient.js` (reintentos + caché + cortacircuitos + fallback), nunca con llamadas directas.
5. Nuevos checkpoints se añaden en `src/checkpoints.js` con: id `cpNN-<tema>`, hito, tipo y comprobaciones; y su prueba correspondiente en `tests/checkpoints.test.js`.

---

## 7. Referencias rápidas de API interna

### resilient.js
| Export | Descripción |
|--------|-------------|
| `conReintentos(fn, {intentos, esReintentable, alReintentar, retraso})` | Ejecuta `fn` con política de reintentos |
| `esErrorReintentable(err)` | Clasifica 503/429/408/`cache_only_cold` como reintentables |
| `calcularRetraso(intento)` | Backoff exponencial + jitter (800 ms → 8 s) |
| `Cortacircuitos` | Estados cerrado/abierto/semiabierto (umbral 3, enfriamiento 30 s) |
| `CacheComplementario` | Caché memoria+sessionStorage con TTL (24 h por defecto) |
| `MonitorEventos` | Log de eventos con suscriptores y `resumen()` de salud |
| `generarFallbackSVG(texto)` | Imagen SVG embebida (data URI) sin red |
| `CargadorImagenesResiliente` | Orquestador: caché → cortacircuitos → reintentos → fallback; `urlFinal()`, `resolver()`, `precargar()` |

### checkpoints.js
| Export | Descripción |
|--------|-------------|
| `SistemaCheckpoints` | `verificar(id)`, `verificarBase()`, `verificarTodos()`, `informe()` |
| `CHECKPOINTS` | Definición de los 8 checkpoints (extensible) |

### gamedata.js (vista de baraja)
| Export | Descripción |
|--------|-------------|
| `PALOS` | Orden canónico de palos: `["corazones", "diamantes", "treboles", "picas"]` (♥ ♦ ♣ ♠) |
| `INFO_PALOS` | Por palo: icono, nombre en español y color de acento |
| `VALORES` | Etiquetas 2-10, J, Q, K, A |
| `etiquetaValor(valor)` | Convierte valor numérico (2-14) en etiqueta (7, J, Q, K, A) |
| `CARDS[x].palo / .valor` | Cada carta lleva palo y valor para la agrupación/orden |

---

*Fin del documento. Actualizar la sección 5 con cada cambio; este documento es la fuente única de verdad del proyecto.*
