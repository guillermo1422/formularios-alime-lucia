/* Formularios Alime-Lucia - Lector de códigos de barras */

let escanerHtml5 = null;
let escanerActivo = false;
let escanerUltimoCodigo = '';
let escanerUltimoMomento = 0;

function escanerSoportado() {
  return typeof Html5Qrcode !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function';
}

function construirConfigEscaner() {
  const config = {
    fps: 10,
    aspectRatio: 1.4,
    rememberLastUsedCamera: false,
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    qrbox: function (anchoVista, altoVista) {
      const ancho = Math.floor(anchoVista * 0.86);
      const alto = Math.max(110, Math.floor(Math.min(altoVista * 0.38, ancho * 0.32)));
      return { width: ancho, height: alto };
    }
  };

  try {
    const F = Html5QrcodeSupportedFormats;
    const formatos = [
      F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E,
      F.CODE_128, F.CODE_39, F.CODE_93, F.ITF, F.CODABAR,
      F.QR_CODE, F.DATA_MATRIX
    ].filter(function (formato) {
      return formato !== undefined && formato !== null;
    });
    if (formatos.length) config.formatsToSupport = formatos;
  } catch (error) {
    /* si no están los formatos, el lector prueba con todos */
  }

  return config;
}

function mostrarEstadoEscaner(texto, esError) {
  const estado = $('#escaner-estado');
  if (!estado) return;
  estado.textContent = texto || '';
  estado.classList.toggle('error', !!esError);
}

function mensajeErrorCamara(error) {
  const nombre = error && (error.name || (error.error && error.error.name));
  const mensaje = String(error && error.message ? error.message : '');

  if (nombre === 'NotAllowedError' || /permission|denied/i.test(mensaje)) {
    return 'Permiso de cámara denegado. Habilitalo en el navegador o escribí el código a mano.';
  }
  if (nombre === 'NotFoundError' || nombre === 'DevicesNotFoundError') {
    return 'No se encontró una cámara. Podés escribir el código a mano.';
  }
  if (nombre === 'NotReadableError' || nombre === 'TrackStartError') {
    return 'La cámara está en uso por otra aplicación.';
  }
  return 'No se pudo iniciar la cámara' + (mensaje ? ': ' + mensaje : '.');
}

let escanerGeneracion = 0;

function escanerModalAbierto() {
  const modal = $('#modal-escaner');
  return !!modal && !modal.classList.contains('oculto');
}

function detenerInstanciaEscaner(instancia) {
  if (!instancia) return;
  try {
    instancia.stop().then(function () {
      try { instancia.clear(); } catch (error) { /* sin cambios */ }
    }).catch(function () {
      try { instancia.clear(); } catch (error) { /* sin cambios */ }
    });
  } catch (error) {
    try { instancia.clear(); } catch (limpiarError) { /* sin cambios */ }
  }
}

async function iniciarEscaner() {
  const cont = $('#escaner-lector');
  if (!escanerModalAbierto() || !cont) return;

  escanerUltimoCodigo = '';
  escanerUltimoMomento = 0;
  cont.innerHTML = '';

  if (!window.isSecureContext) {
    mostrarEstadoEscaner(
      'La cámara necesita una conexión segura (HTTPS). Abrí la app desde GitHub Pages ' +
      'o escribí el código a mano.',
      true
    );
    return;
  }
  if (!escanerSoportado()) {
    mostrarEstadoEscaner(
      'Este navegador no soporta el lector de cámara. Podés escribir el código a mano.',
      true
    );
    return;
  }

  if (escanerHtml5) {
    detenerInstanciaEscaner(escanerHtml5);
    escanerHtml5 = null;
  }

  const generacion = ++escanerGeneracion;
  const vigente = function () {
    return generacion === escanerGeneracion && escanerModalAbierto();
  };

  mostrarEstadoEscaner('Encendiendo cámara…');
  const config = construirConfigEscaner();
  const sinError = function () {};

  const instancia = new Html5Qrcode('escaner-lector', { verbose: false });
  escanerHtml5 = instancia;

  try {
    await instancia.start({ facingMode: 'environment' }, config, onEscanerExito, sinError);
    if (!vigente()) {
      detenerInstanciaEscaner(instancia);
      return;
    }
    escanerActivo = true;
    mostrarEstadoEscaner('Apuntá al código de barras. Se detecta automáticamente.');
    return;
  } catch (error) {
    if (!vigente()) {
      detenerInstanciaEscaner(instancia);
      return;
    }
    try { instancia.clear(); } catch (limpiarError) { /* sin cambios */ }
  }

  try {
    const camaras = await Html5Qrcode.getCameras();
    if (!vigente()) {
      detenerInstanciaEscaner(instancia);
      return;
    }
    if (!camaras || !camaras.length) throw new Error('No se encontraron cámaras.');
    await instancia.start(camaras[0].id, config, onEscanerExito, sinError);
    if (!vigente()) {
      detenerInstanciaEscaner(instancia);
      return;
    }
    escanerActivo = true;
    mostrarEstadoEscaner('Apuntá al código de barras. Se detecta automáticamente.');
  } catch (error) {
    if (!vigente()) {
      detenerInstanciaEscaner(instancia);
      return;
    }
    escanerActivo = false;
    mostrarEstadoEscaner(mensajeErrorCamara(error), true);
  }
}

function detenerEscaner() {
  escanerGeneracion++;
  const instancia = escanerHtml5;
  escanerHtml5 = null;
  escanerActivo = false;

  if (!instancia) {
    const cont = $('#escaner-lector');
    if (cont) cont.innerHTML = '';
    return;
  }

  detenerInstanciaEscaner(instancia);
}

function onEscanerExito(texto) {
  const codigo = String(texto || '').trim();
  if (!codigo) return;

  const ahora = Date.now();
  if (codigo === escanerUltimoCodigo && ahora - escanerUltimoMomento < 1500) return;
  escanerUltimoCodigo = codigo;
  escanerUltimoMomento = ahora;

  entregarCodigoEscaner(codigo);
}

function entregarCodigoEscaner(codigo) {
  const limpio = String(codigo || '').trim();
  if (!limpio) return;
  const cb = Estado.escanerCallback;
  cerrarModal('modal-escaner');
  if (typeof cb === 'function') cb(limpio);
}

function usarCodigoManualEscaner() {
  const input = $('#escaner-codigo-manual');
  const codigo = input ? input.value.trim() : '';
  if (!codigo) {
    toast('Escribí un código o apuntá la cámara al código de barras.', 'error');
    if (input) input.focus();
    return;
  }
  entregarCodigoEscaner(codigo);
}

function abrirEscanerParaDocumento() {
  const d = Estado.documento;
  if (!d) return;
  const tipo = String(d.doc.tipo || '').toUpperCase();
  if (tipo !== 'PRESUPUESTO' && tipo !== 'SOLICITUD_PRESUPUESTO') {
    toast('El escáner está disponible para presupuesto y pedido de presupuesto.', 'error');
    return;
  }

  Estado.escanerCallback = function (codigo) {
    procesarCodigoEscaneado(codigo);
  };

  const input = $('#escaner-codigo-manual');
  if (input) input.value = '';
  mostrarEstadoEscaner('Encendiendo cámara…');
  abrirModal('modal-escaner');
  setTimeout(iniciarEscaner, 120);
}

function procesarCodigoEscaneado(codigo) {
  const d = Estado.documento;
  if (!d) return;

  const producto = buscarProductoLocal(codigo);
  if (producto) {
    if (producto.activo === false) {
      toast('El producto «' + producto.descripcion + '» está archivado. ' +
        'Reactivalo en Configuración.', 'error');
      return;
    }
    agregarProductoAEditor(producto, codigo);
    return;
  }

  abrirFormularioProducto(null, {
    codigoInicial: codigo,
    permiteSoloCodigo: true,
    onSoloCodigo: function () {
      agregarItemConCodigo(codigo);
    }
  }, function (guardado) {
    agregarProductoAEditor(guardado, guardado.codigo_barras || codigo);
  });
}

function colocarItemEnEditor(d, nuevo) {
  for (let i = 0; i < d.items.length; i++) {
    const actual = d.items[i];
    const vacio = !String(actual.descripcion || '').trim() &&
      !String(actual.detalle || '').trim() &&
      !(Number(actual.precio_unitario) > 0);
    if (vacio) {
      d.items[i] = nuevo;
      return;
    }
  }
  d.items.push(nuevo);
}

function agregarProductoAEditor(producto, codigo) {
  const d = Estado.documento;
  if (!d) return;
  const tipo = d.doc.tipo;
  const codigoFinal = String(codigo || producto.codigo_barras || '').trim();

  const existente = codigoFinal
    ? d.items.filter(function (item) {
      return String(item.codigo_barras || codigoEnDetalle(item.detalle)) === codigoFinal;
    })[0]
    : null;

  if (existente && conCantidadEditor(tipo)) {
    existente.cantidad = (Number(existente.cantidad) || 0) + 1;
    existente.subtotal = subtotalItemEditor(existente);
    Estado.hayCambios = true;
    renderEditor();
    toast('Cantidad aumentada: ' + producto.descripcion, 'ok');
    return;
  }

  const item = itemVacioEditor(tipo);
  item.descripcion = producto.descripcion || codigoFinal;
  item.detalle = detalleConCodigo(producto.detalle, codigoFinal);
  item.unidad = producto.unidad || 'UN';
  item.precio_unitario = conPreciosEditor(tipo) ? (Number(producto.precio_unitario) || 0) : 0;
  item.cantidad = 1;
  item.codigo_barras = codigoFinal;
  item.subtotal = subtotalItemEditor(item);

  colocarItemEnEditor(d, item);
  Estado.hayCambios = true;
  renderEditor();
  toast('Agregado: ' + item.descripcion, 'ok');
}

function agregarItemConCodigo(codigo) {
  const d = Estado.documento;
  if (!d) return;
  const item = itemVacioEditor(d.doc.tipo);
  item.descripcion = codigo;
  item.detalle = 'Código escaneado';
  item.codigo_barras = codigo;
  item.subtotal = subtotalItemEditor(item);

  colocarItemEnEditor(d, item);
  Estado.hayCambios = true;
  renderEditor();
  toast('Código agregado. Completá la descripción del ítem.', 'ok');
}

function enlazarEventosEscaner() {
  const btnManual = $('#btn-escaner-manual');
  if (btnManual) {
    btnManual.addEventListener('click', usarCodigoManualEscaner);
  }

  const input = $('#escaner-codigo-manual');
  if (input) {
    input.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        usarCodigoManualEscaner();
      }
    });
  }
}

enlazarEventosEscaner();
