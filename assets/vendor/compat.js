/* Parche de compatibilidad para navegadores de teles (anos 2018-2019). Solo agrega lo que FALTA:
 * en un navegador moderno no hace nada. Se carga antes de la libreria de Supabase.
 * Cubre: globalThis, Object.fromEntries, queueMicrotask y AbortController/AbortSignal.
 * (los pedidos viejos ignoran la senal de cancelacion; el limite de tiempo de la aplicacion
 * no depende de ella, ver nucleo/cliente.js). */
(function () {
  'use strict';

  if (typeof globalThis === 'undefined') {
    Object.defineProperty(window, 'globalThis', { value: window, writable: true, configurable: true });
  }

  if (typeof Object.fromEntries !== 'function') {
    Object.fromEntries = function (entradas) {
      var salida = {};
      for (var par of entradas) salida[par[0]] = par[1];
      return salida;
    };
  }

  if (typeof window.queueMicrotask !== 'function') {
    window.queueMicrotask = function (funcion) { Promise.resolve().then(funcion); };
  }

  if (typeof window.AbortController === 'undefined') {
    var Senal = function () {
      this.aborted = false;
      this.reason = undefined;
      this.onabort = null;
      this._oyentes = [];
    };
    Senal.prototype.addEventListener = function (tipo, funcion) {
      if (tipo === 'abort' && this._oyentes.indexOf(funcion) < 0) this._oyentes.push(funcion);
    };
    Senal.prototype.removeEventListener = function (tipo, funcion) {
      this._oyentes = this._oyentes.filter(function (f) { return f !== funcion; });
    };
    Senal.prototype.throwIfAborted = function () { if (this.aborted) throw this.reason; };

    var Controlador = function () { this.signal = new Senal(); };
    Controlador.prototype.abort = function (motivo) {
      var senal = this.signal;
      if (senal.aborted) return;
      senal.aborted = true;
      var error = motivo;
      if (error === undefined) { error = new Error('The operation was aborted.'); error.name = 'AbortError'; }
      senal.reason = error;
      var evento = { type: 'abort', target: senal };
      if (typeof senal.onabort === 'function') senal.onabort(evento);
      senal._oyentes.slice().forEach(function (f) { f(evento); });
    };
    window.AbortController = Controlador;
    window.AbortSignal = Senal;
  }
})();
