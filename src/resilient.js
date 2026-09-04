// ============================================================
// Módulo de resiliencia — "Slay the Tower"
// Mitiga incidentes de servicios remotos: 503 / cache_only_cold,
// sobrecarga del proveedor y cachés frías (cold cache).
//
// Capacidades:
//   1. Reintentos inteligentes: backoff exponencial + jitter
//   2. Gestión de carga: concurrencia limitada en precargas
//   3. Caché complementaria: memoria + sessionStorage con TTL
//   4. Cortacircuitos (circuit breaker): evita tormentas de peticiones
//   5. Fallbacks locales: SVG generado, cero dependencia de red
//   6. Monitoreo continuo: eventos, métricas y salud del sistema
// ============================================================

// ---------- Políticas por defecto ----------
export const POLITICA_POR_DEFECTO = {
  reintentos: 4,          // intentos totales (1 inicial + 3 reintentos)
  retrasoBaseMs: 800,     // primer reintento
  retrasoMaxMs: 8000,     // techo del backoff
  jitter: 0.3,            // ±30% de variación aleatoria
  umbralCortacircuitos: 3,     // fallos consecutivos para abrir
  enfriamientoCortacircuitosMs: 30000,
  concurrencia: 3,        // peticiones simultáneas máximas en precarga
  ttlCacheMs: 24 * 60 * 60 * 1000, // 24 h
};

export const dormir = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

// ---------- Backoff exponencial con jitter ----------
// Evita que todos los clientes reintenten a la vez (thundering herd),
// causa agravante del incidente cache_only_cold.
export function calcularRetraso(
  intento,
  { base = POLITICA_POR_DEFECTO.retrasoBaseMs, max = POLITICA_POR_DEFECTO.retrasoMaxMs, jitter = POLITICA_POR_DEFECTO.jitter } = {}
) {
  const exponencial = Math.min(base * 2 ** intento, max);
  const factor = 1 - jitter + Math.random() * (jitter * 2);
  return Math.round(exponencial * factor);
}

// ---------- Clasificación de errores reintentables ----------
// El incidente de referencia: "cache-only admission rejected a cold,
// unavailable, or overloaded request (cache_only_cold, HTTP 503)"
export function esErrorReintentable(err) {
  if (!err) return false;
  if (err.reintentable === false) return false;
  if (err.code === "cache_only_cold") return true;

  const codigo = err.status ?? err.statusCode ?? err.httpStatus;
  // 503: no disponible/sobrecargado; 429: límite de peticiones; 408: timeout
  if (codigo === 503 || codigo === 429 || codigo === 408) return true;

  const mensaje = String(err.message ?? err);
  return /503|cache[-_ ]?only|overload|unavailable|cold/i.test(mensaje);
}

// ---------- Reintentos inteligentes ----------
// Ejecuta `fn(intento)` con política de reintentos. Reintenta solo errores
// reintentables y notifica cada reintento vía `alReintentar`.
export async function conReintentos(fn, opciones = {}) {
  const {
    intentos = POLITICA_POR_DEFECTO.reintentos,
    esReintentable = esErrorReintentable,
    alReintentar = () => {},
    retraso = calcularRetraso,
  } = opciones;

  let ultimoError;
  for (let intento = 0; intento < intentos; intento++) {
    try {
      return await fn(intento);
    } catch (err) {
      ultimoError = err;
      if (intento === intentos - 1 || !esReintentable(err)) throw err;
      const ms = retraso(intento);
      alReintentar(err, intento + 1, ms);
      await dormir(ms);
    }
  }
  throw ultimoError;
}

// ---------- Cortacircuitos ----------
// Estados: "cerrado" (operación normal) → "abierto" (bloquea peticiones)
// → "semiabierto" (permite una petición de prueba tras el enfriamiento).
export class Cortacircuitos {
  constructor({ umbralFallos = POLITICA_POR_DEFECTO.umbralCortacircuitos, enfriamientoMs = POLITICA_POR_DEFECTO.enfriamientoCortacircuitosMs, reloj = Date.now } = {}) {
    this.umbralFallos = umbralFallos;
    this.enfriamientoMs = enfriamientoMs;
    this.reloj = reloj;
    this.estado = "cerrado";
    this.fallosConsecutivos = 0;
    this.abiertoEn = 0;
  }

  permitir() {
    if (this.estado === "cerrado") return true;
    if (this.estado === "abierto") {
      if (this.reloj() - this.abiertoEn >= this.enfriamientoMs) {
        this.estado = "semiabierto";
        return true; // petición de prueba
      }
      return false;
    }
    return this.estado === "semiabierto";
  }

  registrarExito() {
    this.estado = "cerrado";
    this.fallosConsecutivos = 0;
  }

  registrarFallo() {
    this.fallosConsecutivos++;
    if (this.estado === "semiabierto" || this.fallosConsecutivos >= this.umbralFallos) {
      this.estado = "abierto";
      this.abiertoEn = this.reloj();
    }
  }
}

// ---------- Caché complementaria ----------
// Memoria + almacenamiento de sesión (navegador) con TTL. Reduce las
// peticiones al proveedor: si un recurso ya se sirvió, no se vuelve a pedir.
function almacenSesionSeguro() {
  try {
    if (typeof sessionStorage !== "undefined") return sessionStorage;
  } catch {
    /* modo privado o entorno sin DOM */
  }
  return null;
}

export class CacheComplementario {
  constructor({ ttlMs = POLITICA_POR_DEFECTO.ttlCacheMs, prefijo = "stt:cache:", reloj = Date.now, almacen = almacenSesionSeguro() } = {}) {
    this.ttlMs = ttlMs;
    this.prefijo = prefijo;
    this.reloj = reloj;
    this.almacen = almacen;
    this.memoria = new Map();
  }

  guardar(clave, valor) {
    const registro = { valor, expira: this.ttlMs > 0 ? this.reloj() + this.ttlMs : null };
    this.memoria.set(clave, registro);
    try {
      this.almacen?.setItem(this.prefijo + clave, JSON.stringify(registro));
    } catch {
      /* cuota llena o almacenamiento bloqueado: la memoria sigue activa */
    }
    return valor;
  }

  #leer(clave) {
    if (this.memoria.has(clave)) return this.memoria.get(clave);
    try {
      const crudo = this.almacen?.getItem(this.prefijo + clave);
      if (crudo) {
        const registro = JSON.parse(crudo);
        this.memoria.set(clave, registro); // promoción a memoria
        return registro;
      }
    } catch {
      /* registro corrupto: se ignora */
    }
    return null;
  }

  obtener(clave) {
    const registro = this.#leer(clave);
    if (!registro) return null;
    if (registro.expira != null && this.reloj() >= registro.expira) {
      this.eliminar(clave);
      return null;
    }
    return registro.valor;
  }

  eliminar(clave) {
    this.memoria.delete(clave);
    try {
      this.almacen?.removeItem(this.prefijo + clave);
    } catch {
      /* sin consecuencias */
    }
  }
}

// ---------- Monitoreo continuo ----------
export class MonitorEventos {
  constructor({ maximo = 250 } = {}) {
    this.eventos = [];
    this.suscriptores = new Set();
    this.maximo = maximo;
  }

  registrar(nivel, mensaje, datos = {}) {
    const evento = { ts: Date.now(), nivel, mensaje, datos };
    this.eventos.push(evento);
    if (this.eventos.length > this.maximo) {
      this.eventos.splice(0, this.eventos.length - this.maximo);
    }
    for (const suscriptor of this.suscriptores) {
      try {
        suscriptor(evento);
      } catch {
        /* un suscriptor no debe romper el monitoreo */
      }
    }
    return evento;
  }

  sobre(suscriptor) {
    this.suscriptores.add(suscriptor);
    return () => this.suscriptores.delete(suscriptor);
  }

  // Métricas resumidas del estado del sistema
  resumen() {
    const porNivel = {};
    for (const evento of this.eventos) {
      porNivel[evento.nivel] = (porNivel[evento.nivel] || 0) + 1;
    }
    const errores = porNivel.error || 0;
    const reintentos = this.eventos.filter((e) => e.nivel === "aviso" && /reintento/i.test(e.mensaje)).length;
    let salud = "ok";
    if (errores > 0) salud = "degradado";
    if (errores >= 5) salud = "critico";
    return { total: this.eventos.length, porNivel, reintentos, salud, ultimo: this.eventos[this.eventos.length - 1] || null };
  }
}

// ---------- Fallback local (sin red) ----------
// Genera una imagen SVG embebida (data URI) con el nombre del recurso.
// Garantiza jugabilidad total aunque el proveedor de imágenes caiga.
export function generarFallbackSVG(texto, { ancho = 512, alto = 384, fondo = "#161b22", color = "#d4af37" } = {}) {
  const seguro = String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}">`
    + `<rect width="100%" height="100%" fill="${fondo}"/>`
    + `<rect x="8" y="8" width="${ancho - 16}" height="${alto - 16}" fill="none" stroke="${color}" stroke-width="4" rx="12"/>`
    + `<text x="50%" y="47%" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, sans-serif" font-size="${Math.max(18, ancho / 16)}" font-weight="700" fill="${color}">${seguro}</text>`
    + `<text x="50%" y="60%" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="${Math.max(12, ancho / 28)}" fill="#9aa4b2">Recurso no disponible (resiliencia activa)</text>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------- Cargador de imágenes resiliente ----------
// Carga por defecto en navegador vía objeto Image.
export function cargarImagenNavegador(url) {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(url);
    img.onerror = () => {
      // El <img> no expone el código HTTP: se trata como error de servicio
      const err = new Error(`Imagen no disponible (posible 503/cache_only_cold): ${url}`);
      err.code = "cache_only_cold"; // clasificado como reintentable
      rechazar(err);
    };
    img.src = url;
  });
}

export class CargadorImagenesResiliente {
  constructor({
    cargar = cargarImagenNavegador,
    monitor = new MonitorEventos(),
    cache = new CacheComplementario(),
    cortacircuitos = new Cortacircuitos(),
    reintentos = POLITICA_POR_DEFECTO.reintentos,
    concurrencia = POLITICA_POR_DEFECTO.concurrencia,
    retraso = calcularRetraso,
    fallback = generarFallbackSVG,
  } = {}) {
    this.cargar = cargar;
    this.monitor = monitor;
    this.cache = cache;
    this.cortacircuitos = cortacircuitos;
    this.reintentos = reintentos;
    this.concurrencia = concurrencia;
    this.retraso = retraso;
    this.fallback = fallback;
    this.resultados = new Map(); // url -> { url, ok, origen, intentos }
  }

  // URL final para render: original si cargó, fallback si falló.
  urlFinal(url) {
    const resultado = this.resultados.get(url);
    return resultado ? resultado.url : url;
  }

  async resolver(url, { etiqueta = "" } = {}) {
    if (this.resultados.has(url)) return this.resultados.get(url);

    // 1) Caché complementaria: evita volver a golpear al proveedor
    const enCache = this.cache.obtener(url);
    if (enCache) {
      const resultado = { url: enCache, ok: true, origen: "cache", intentos: 0 };
      this.resultados.set(url, resultado);
      this.monitor.registrar("info", "recurso servido desde caché complementaria", { url, etiqueta });
      return resultado;
    }

    // 2) Cortacircuitos abierto: degradación elegante inmediata
    if (!this.cortacircuitos.permitir()) {
      const resultado = this.#fallback(url, etiqueta, "cortacircuitos abierto (proveedor degradado)");
      this.resultados.set(url, resultado);
      return resultado;
    }

    // 3) Carga con reintentos inteligentes (backoff + jitter)
    let intentoFallidos = 0;
    try {
      const cargada = await conReintentos(() => this.cargar(url), {
        intentos: this.reintentos,
        retraso: this.retraso,
        alReintentar: (err, intento, ms) => {
          intentoFallidos = intento;
          this.monitor.registrar("aviso", `reintento ${intento} tras error de servicio (espera ${ms} ms)`, {
            url,
            etiqueta,
            error: String(err?.message ?? err),
          });
        },
      });
      this.cortacircuitos.registrarExito();
      this.cache.guardar(url, url); // ¡éxito persistido para próximas sesiones!
      const resultado = { url: cargada, ok: true, origen: "remoto", intentos: intentoFallidos };
      this.resultados.set(url, resultado);
      this.monitor.registrar("info", "recurso cargado del proveedor", { url, etiqueta, intentos: intentoFallidos });
      return resultado;
    } catch (err) {
      this.cortacircuitos.registrarFallo();
      const resultado = this.#fallback(url, etiqueta, String(err?.message ?? err));
      this.resultados.set(url, resultado);
      return resultado;
    }
  }

  #fallback(url, etiqueta, causa) {
    const nombre = etiqueta || decodeURIComponent(url.split("prompt=")[1]?.split("&")[0] || "").slice(0, 60) || url.slice(0, 60);
    const urlFallback = this.fallback(nombre);
    this.monitor.registrar("error", "recurso no disponible tras reintentos: usando fallback local", {
      url,
      etiqueta,
      causa,
      fallback: "svg-local",
    });
    return { url: urlFallback, ok: false, origen: "fallback", intentos: this.reintentos, causa };
  }

  // Precarga en lote con gestión de carga: concurrencia limitada para no
  // saturar al proveedor (prevención del 503 por sobrecarga).
  async precargar(urls, { concurrencia = this.concurrencia } = {}) {
    const cola = [...urls];
    const total = cola.length;
    let completadas = 0;
    const trabajadoras = Array.from({ length: Math.min(concurrencia, cola.length) }, async () => {
      while (cola.length > 0) {
        const url = cola.shift();
        await this.resolver(url);
        completadas++;
      }
    });
    await Promise.all(trabajadoras);
    this.monitor.registrar("info", "precarga de recursos finalizada", { total, completadas });
    return this.resultados;
  }
}
