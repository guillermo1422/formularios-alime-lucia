/* Formularios Alime-Lucia - Cliente de API */

const API_URL_PREDETERMINADA = 'https://script.google.com/macros/s/AKfycbxcpnATADjph23r4F4hD_RNYpsjQl5RA1bQbpmvPVMgoHp8QFF8U_JNT4WZ2bX0c4dk/exec';

const API_CLAVES = {
  url: 'fal_api_url',
  pin: 'fal_pin',
  usuario: 'fal_usuario'
};

const Api = {
  url: '',
  pin: '',
  usuario: '',
  timeoutMs: 45000,

  cargarSesion: function () {
    try {
      this.url = localStorage.getItem(API_CLAVES.url) || '';
      this.pin = localStorage.getItem(API_CLAVES.pin) || '';
      this.usuario = localStorage.getItem(API_CLAVES.usuario) || '';
    } catch (error) {
      this.url = '';
      this.pin = '';
      this.usuario = '';
    }
    return this;
  },

  guardarSesion: function (url, pin, usuario) {
    this.url = String(url || '').trim();
    this.pin = String(pin || '').trim();
    this.usuario = String(usuario || '').trim() || 'APP';
    try {
      localStorage.setItem(API_CLAVES.url, this.url);
      localStorage.setItem(API_CLAVES.pin, this.pin);
      localStorage.setItem(API_CLAVES.usuario, this.usuario);
    } catch (error) {
      /* almacenamiento no disponible */
    }
  },

  limpiarSesion: function () {
    this.url = '';
    this.pin = '';
    this.usuario = '';
    try {
      localStorage.removeItem(API_CLAVES.url);
      localStorage.removeItem(API_CLAVES.pin);
      localStorage.removeItem(API_CLAVES.usuario);
    } catch (error) {
      /* almacenamiento no disponible */
    }
  },

  tieneSesion: function () {
    return !!(this.url && this.pin);
  },

  construirCuerpo: function (accion, datos) {
    return JSON.stringify(Object.assign({}, datos || {}, {
      accion: accion,
      pin: this.pin,
      usuario: this.usuario || 'APP'
    }));
  },

  interpretarRespuesta: async function (respuesta) {
    const texto = await respuesta.text();
    if (!respuesta.ok) {
      throw new Error('La API respondió HTTP ' + respuesta.status + '.');
    }
    if (!texto) {
      throw new Error('La API devolvió una respuesta vacía.');
    }

    let json;
    try {
      json = JSON.parse(texto);
    } catch (error) {
      if (texto.trim().charAt(0) === '<') {
        throw new Error(
          'La URL devolvió una página HTML en lugar de JSON. ' +
          'Revisá que el despliegue de Apps Script sea "Aplicación web", ' +
          'que ejecute como el propietario y que el acceso sea "Cualquier persona".'
        );
      }
      throw new Error('La API devolvió una respuesta que no es JSON.');
    }

    if (!json || json.ok !== true) {
      const detalle = json && json.error ? json.error : {};
      const err = new Error(detalle.mensaje || 'La API devolvió un error.');
      err.codigo = detalle.codigo || 'ERROR';
      err.datos = detalle.datos || null;
      throw err;
    }

    return json.datos;
  },

  llamar: async function (accion, datos) {
    if (!this.url) throw new Error('Falta configurar la URL de la API.');
    if (!this.pin) throw new Error('Falta configurar el PIN.');

    const controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const temporizador = controlador
      ? setTimeout(function () { controlador.abort(); }, this.timeoutMs)
      : null;

    try {
      const respuesta = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: this.construirCuerpo(accion, datos),
        redirect: 'follow',
        signal: controlador ? controlador.signal : undefined
      });
      return await this.interpretarRespuesta(respuesta);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('La API tardó demasiado en responder. Revisá la conexión e intentá de nuevo.');
      }
      throw error;
    } finally {
      if (temporizador) clearTimeout(temporizador);
    }
  },

  ping: async function (url) {
    const destino = String(url || this.url || '').trim();
    if (!destino) throw new Error('Falta la URL de la API.');

    const separador = destino.indexOf('?') === -1 ? '?' : '&';
    const controlador = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const temporizador = controlador
      ? setTimeout(function () { controlador.abort(); }, 15000)
      : null;

    try {
      const respuesta = await fetch(
        destino + separador + 'accion=ping&_=' + Date.now(),
        {
          method: 'GET',
          redirect: 'follow',
          signal: controlador ? controlador.signal : undefined
        }
      );
      return await this.interpretarRespuesta(respuesta);
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new Error('La API no respondió a tiempo.');
      }
      throw error;
    } finally {
      if (temporizador) clearTimeout(temporizador);
    }
  }
};
