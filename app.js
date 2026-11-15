/* Formularios Alime-Lucia - Aplicación principal */

const Estado = {
  conectado: false,
  config: null,
  empresas: [],
  contactos: [],
  documentos: [],
  resumen: null,
  vista: 'inicio',
  nuevaEmpresa: 'ALIME',
  filtrosDocs: { texto: '', empresa_id: '', tipo: '', estado: '' },
  filtrosDirectorio: { texto: '', tipo: '', incluir_archivados: false },
  seleccionContacto: null,
  hayCambios: false,
  documento: null,
  copia: 'Original',
  contactoPickerCallback: null,
  contactoPickerRol: '',
  contactoFormCallback: null,
  contactoEnEdicion: null,
  contactoDetalle: null,
  contactoDuplicadoPendiente: null,
  confirmarCallback: null
};

function $(selector, contexto) {
  return (contexto || document).querySelector(selector);
}

function $$(selector, contexto) {
  return Array.prototype.slice.call((contexto || document).querySelectorAll(selector));
}

function toast(mensaje, tipo) {
  const contenedor = $('#toasts');
  if (!contenedor) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (tipo || '');
  el.textContent = mensaje;
  contenedor.appendChild(el);
  setTimeout(function () {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    el.style.transition = 'opacity .25s, transform .25s';
    setTimeout(function () { el.remove(); }, 280);
  }, 3600);
}

function manejarError(error, contexto) {
  if (contexto) console.error(contexto, error);
  const mensaje = error && error.message ? error.message : 'Ocurrió un error inesperado.';
  toast(mensaje, 'error');
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('oculto');
}

function cerrarModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('oculto');
  if (id === 'modal-confirmar' && Estado.confirmarCallback) {
    const cb = Estado.confirmarCallback;
    Estado.confirmarCallback = null;
    cb(false);
  }
}

function confirmar(titulo, mensaje, textoSi) {
  return new Promise(function (resolve) {
    if (Estado.confirmarCallback) {
      Estado.confirmarCallback(false);
    }
    Estado.confirmarCallback = resolve;
    $('#confirmar-titulo').textContent = titulo || 'Confirmar';
    $('#confirmar-mensaje').textContent = mensaje || '';
    $('#btn-confirmar-si').textContent = textoSi || 'Confirmar';
    abrirModal('modal-confirmar');
  });
}

function empresaPorId(id) {
  const buscado = String(id || '').toUpperCase();
  return Estado.empresas.filter(function (empresa) {
    return String(empresa.empresa_id).toUpperCase() === buscado;
  })[0] || null;
}

function empresasActivas() {
  return Estado.empresas.filter(function (empresa) { return empresa.activo; });
}

function configValor(clave, defecto) {
  const config = Estado.config && Estado.config.config ? Estado.config.config : {};
  const valor = config[clave];
  return valor === undefined || valor === null || valor === '' ? defecto : valor;
}

function tiposDocumento() {
  return Estado.config && Estado.config.tipos_documento
    ? Estado.config.tipos_documento
    : ['PRESUPUESTO', 'ORDEN_COMPRA', 'ORDEN_TRABAJO', 'SOLICITUD_PRESUPUESTO', 'RECIBO_COBRO'];
}

function etiquetasDocumento() {
  return Estado.config && Estado.config.etiquetas_documento
    ? Estado.config.etiquetas_documento
    : {};
}

function estadosDocumento() {
  return Estado.config && Estado.config.estados_documento
    ? Estado.config.estados_documento
    : {};
}

function unidadesDocumento() {
  return Estado.config && Estado.config.unidades
    ? Estado.config.unidades
    : ['UN', 'M', 'M2', 'M3', 'KG', 'LT', 'HORA', 'GLOBAL', 'SERVICIO'];
}

function tiposLinea() {
  return Estado.config && Estado.config.tipos_linea
    ? Estado.config.tipos_linea
    : ['ITEM', 'TAREA', 'CONCEPTO'];
}

function contactoPorDocumento() {
  return Estado.config && Estado.config.contacto_por_documento
    ? Estado.config.contacto_por_documento
    : {
      PRESUPUESTO: 'CLIENTE',
      ORDEN_COMPRA: 'PROVEEDOR',
      ORDEN_TRABAJO: 'CLIENTE',
      SOLICITUD_PRESUPUESTO: 'PROVEEDOR',
      RECIBO_COBRO: 'CLIENTE'
    };
}

function estadosUnicos() {
  const mapa = estadosDocumento();
  const vistos = {};
  const lista = [];
  Object.keys(mapa).forEach(function (tipo) {
    (mapa[tipo] || []).forEach(function (estado) {
      if (!vistos[estado]) {
        vistos[estado] = true;
        lista.push(estado);
      }
    });
  });
  return lista;
}

function rutaLogo(empresa) {
  const logo = String(empresa && empresa.logo ? empresa.logo : '').trim();
  if (!logo) return 'assets/logo-alime.jpg';
  if (/^(https?:)?\/\//.test(logo) || logo.indexOf('assets/') === 0 || logo.charAt(0) === '/') {
    return logo;
  }
  return 'assets/' + logo;
}

function claseLogo(empresa) {
  return String(empresa && empresa.logo ? empresa.logo : '').toLowerCase().indexOf('lucia') !== -1
    ? 'logo-lucia'
    : '';
}

async function iniciarApp() {
  enlazarEventosGlobales();
  Api.cargarSesion();
  registrarServiceWorker();

  if (Api.tieneSesion()) {
    try {
      await conectar(Api.url, Api.pin, Api.usuario, true);
      return;
    } catch (error) {
      mostrarConexion(error.message);
      return;
    }
  }

  mostrarConexion();
}

function mostrarConexion(mensaje) {
  Estado.conectado = false;
  Estado.vista = 'inicio';
  Estado.documento = null;
  Estado.hayCambios = false;

  const pantalla = $('#pantalla-conexion');
  const app = $('#app');
  if (pantalla) pantalla.classList.remove('oculto');
  if (app) app.classList.add('oculto');

  const esLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const ayudaLocal = $('.conexion-ayuda');
  if (ayudaLocal) {
    if (esLocal) ayudaLocal.classList.remove('oculto');
    else ayudaLocal.classList.add('oculto');
  }
  const apiInput = $('#conexion-api');
  const pinInput = $('#conexion-pin');
  const usuarioInput = $('#conexion-usuario');

  if (apiInput && !apiInput.value) {
    apiInput.value = Api.url || (esLocal ? 'http://localhost:8080/api' : API_URL_PREDETERMINADA);
  }
  if (pinInput && !pinInput.value) {
    pinInput.value = Api.pin || (esLocal ? '1234' : '');
  }
  if (usuarioInput && !usuarioInput.value) {
    usuarioInput.value = Api.usuario || (esLocal ? 'Local' : '');
  }

  const error = $('#conexion-error');
  if (error) {
    if (mensaje) {
      error.textContent = mensaje;
      error.classList.remove('oculto');
    } else {
      error.textContent = '';
      error.classList.add('oculto');
    }
  }
}

function mostrarApp() {
  const pantalla = $('#pantalla-conexion');
  const app = $('#app');
  if (pantalla) pantalla.classList.add('oculto');
  if (app) app.classList.remove('oculto');
}

async function conectar(url, pin, usuario, silencioso) {
  const anterior = { url: Api.url, pin: Api.pin, usuario: Api.usuario };
  const destino = String(url || '').trim();
  const clave = String(pin || '').trim();
  const nombre = String(usuario || '').trim() || 'APP';

  if (!destino) throw new Error('Ingresá la URL de la API.');
  if (!clave) throw new Error('Ingresá el PIN de acceso.');

  Api.url = destino;
  Api.pin = clave;
  Api.usuario = nombre;

  try {
    await Api.ping(destino);
    const config = await Api.llamar('config.obtener');
    const respuestas = await Promise.all([
      Api.llamar('contacto.listar', { incluir_archivados: true }),
      Api.llamar('resumen')
    ]);

    Api.guardarSesion(destino, clave, nombre);
    Estado.conectado = true;
    Estado.config = config;
    Estado.empresas = config.empresas || [];
    Estado.contactos = respuestas[0] || [];
    Estado.resumen = respuestas[1] || null;
    Estado.documentos = [];
    Estado.filtrosDocs = { texto: '', empresa_id: '', tipo: '', estado: '' };

    if (!empresaPorId(Estado.nuevaEmpresa)) {
      const primera = empresasActivas()[0] || Estado.empresas[0];
      Estado.nuevaEmpresa = primera ? primera.empresa_id : 'ALIME';
    }

    mostrarApp();
    actualizarIndicador();
    await cambiarVista('inicio');
    if (!silencioso) toast('Conexión establecida.', 'ok');
    return true;
  } catch (error) {
    Api.url = anterior.url;
    Api.pin = anterior.pin;
    Api.usuario = anterior.usuario;
    throw error;
  }
}

async function desconectar() {
  Api.limpiarSesion();
  Estado.conectado = false;
  Estado.config = null;
  Estado.empresas = [];
  Estado.contactos = [];
  Estado.documentos = [];
  Estado.resumen = null;
  Estado.documento = null;
  Estado.hayCambios = false;
  Estado.filtrosDocs = { texto: '', empresa_id: '', tipo: '', estado: '' };
  mostrarConexion();
}

function actualizarIndicador() {
  const indicador = $('#indicador-conexion');
  const pie = $('#pie-conexion');
  if (!indicador) return;

  if (!Api.url) {
    indicador.style.color = '#f0a3a0';
    indicador.title = 'Sin conexión';
    if (pie) pie.textContent = '';
    return;
  }

  let host = Api.url;
  try {
    if (/^https?:/i.test(Api.url)) host = new URL(Api.url).host;
  } catch (error) {
    host = Api.url;
  }

  indicador.style.color = '#7ee2a8';
  indicador.title = 'Conectado a ' + host;
  if (pie) pie.textContent = 'Conectado a ' + host + ' · ' + (Api.usuario || 'APP');
}

function actualizarNav() {
  const vistaActiva = Estado.vista === 'editor' ? 'documentos' : Estado.vista;
  $$('.nav-btn').forEach(function (btn) {
    btn.classList.toggle('activo', btn.getAttribute('data-vista') === vistaActiva);
  });
}

async function cambiarVista(vista) {
  if (Estado.vista === 'editor' && Estado.hayCambios && vista !== 'editor') {
    const salir = await confirmar(
      'Cambios sin guardar',
      'Si salís ahora se perderán los cambios que no guardaste. ¿Querés salir igual?',
      'Salir sin guardar'
    );
    if (!salir) {
      actualizarNav();
      return;
    }
    Estado.hayCambios = false;
  }

  if (vista === 'editor' && !Estado.documento) vista = 'inicio';
  Estado.vista = vista;
  actualizarNav();
  renderVista();
}

function mostrarSoloVista(vista) {
  ['inicio', 'documentos', 'directorio', 'editor', 'configuracion'].forEach(function (nombre) {
    const seccion = document.getElementById('vista-' + nombre);
    if (seccion) seccion.classList.toggle('oculto', nombre !== vista);
  });
}

function renderVista() {
  mostrarSoloVista(Estado.vista);
  if (Estado.vista === 'inicio') {
    renderInicio();
  } else if (Estado.vista === 'documentos') {
    renderDocumentos();
    actualizarListaDocumentos();
  } else if (Estado.vista === 'directorio') {
    renderDirectorio();
  } else if (Estado.vista === 'editor') {
    renderEditor();
  } else if (Estado.vista === 'configuracion') {
    renderConfiguracion();
  }
}

/* ---------- Inicio ---------- */

function renderInicio() {
  const cont = $('#vista-inicio');
  if (!cont) return;

  const activas = empresasActivas();
  let empresa = empresaPorId(Estado.nuevaEmpresa);
  if (!empresa || !empresa.activo) {
    empresa = activas[0] || Estado.empresas[0] || null;
    if (empresa) Estado.nuevaEmpresa = empresa.empresa_id;
  }

  const resumen = Estado.resumen || {};
  const contactos = resumen.contactos || { total: 0 };
  const docs = resumen.documentos || { total: 0, por_tipo: {} };
  const porTipo = docs.por_tipo || {};
  const ordenes = (porTipo.ORDEN_COMPRA || 0) +
    (porTipo.ORDEN_TRABAJO || 0) +
    (porTipo.SOLICITUD_PRESUPUESTO || 0);

  const empresasHtml = activas.length
    ? activas.map(function (e) {
      const sel = empresa && e.empresa_id === empresa.empresa_id;
      return '<button class="empresa-opcion' + (sel ? ' seleccionada' : '') + '" ' +
        'data-accion="elegir-empresa" data-empresa="' + esc(e.empresa_id) + '" type="button">' +
        '<img src="' + esc(rutaLogo(e)) + '" alt="' + esc(e.nombre) + '" class="' + claseLogo(e) + '">' +
        '<span><strong>' + esc(e.nombre) + '</strong>' +
        '<small>' + esc(e.descripcion || '') + '</small></span>' +
        '</button>';
    }).join('')
    : '<div class="vacio">No hay empresas activas. Activalas en Configuración.</div>';

  const tiposHtml = tiposDocumento().map(function (tipo) {
    const descripciones = {
      PRESUPUESTO: 'Cliente · precios y validez',
      ORDEN_COMPRA: 'Proveedor · sin precios',
      ORDEN_TRABAJO: 'Cliente y técnico · firmas',
      SOLICITUD_PRESUPUESTO: 'Proveedor · pedido de cotización',
      RECIBO_COBRO: 'Cliente · monto y firma'
    };
    return '<button class="tipo-opcion" type="button" data-accion="nuevo-doc" ' +
      'data-empresa="' + esc(empresa ? empresa.empresa_id : '') + '" data-tipo="' + esc(tipo) + '">' +
      '<span class="tipo-icono">' + esc(iconoTipo(tipo)) + '</span>' +
      '<strong>' + esc(tituloTipo(tipo, etiquetasDocumento())) + '</strong>' +
      '<small>' + esc(descripciones[tipo] || '') + '</small>' +
      '</button>';
  }).join('');

  const ultimos = (resumen.ultimos || []).map(function (doc) {
    const monto = formatearMontoDocumento(doc);
    return '<button class="item-reciente" type="button" data-accion="abrir-doc" ' +
      'data-id="' + esc(doc.documento_id) + '">' +
      '<span class="badge ' + esc(claseEmpresa(doc.empresa_id)) + '">' + esc(doc.empresa_id) + '</span>' +
      '<span class="item-principal">' +
      '<span class="item-numero">' + esc(doc.numero) + '</span> ' +
      '<span class="badge ' + esc(claseEstado(doc.estado)) + '">' + esc(etiquetaEstado(doc.estado)) + '</span>' +
      '<div class="item-contacto">' + esc(doc.contacto_nombre || '') + ' · ' +
      esc(formatearFecha(doc.fecha)) + '</div>' +
      '</span>' +
      (monto ? '<span class="item-monto">' + esc(monto) + '</span>' : '') +
      '</button>';
  }).join('');

  cont.innerHTML =
    '<div class="hero">' +
      '<div>' +
        '<h1>Documentos claros, listos para imprimir.</h1>' +
        '<p>Emití presupuestos, órdenes y recibos con la identidad de ALIME o LUCIA A. SEPULVEDA. ' +
        'Todo queda guardado en tu planilla de Google y se sincroniza entre la PC y el celular.</p>' +
        '<div class="hero-acciones">' +
          '<button class="btn btn-secundario" type="button" data-accion="ver-docs">Ver documentos</button>' +
          '<button class="btn btn-texto hero-btn-claro" type="button" data-accion="ver-directorio">Directorio</button>' +
        '</div>' +
      '</div>' +
      '<div class="hero-logos">' +
        '<img src="assets/logo-alime.jpg" alt="ALIME">' +
        '<img src="assets/logo-lucia.png" alt="LUCIA" class="logo-lucia">' +
      '</div>' +
    '</div>' +

    '<div class="seccion">' +
      '<div class="seccion-cabecera">' +
        '<div><h2>Nuevo documento</h2><p>Elegí la empresa y el tipo de comprobante.</p></div>' +
      '</div>' +
      '<div class="selector-empresa">' + empresasHtml + '</div>' +
      '<div class="tipos-grid" style="margin-top:12px">' + tiposHtml + '</div>' +
    '</div>' +

    '<div class="seccion">' +
      '<div class="seccion-cabecera"><div><h2>Resumen</h2><p>Estado general del sistema.</p></div></div>' +
      '<div class="resumen-grid">' +
        statCard(contactos.total || 0, 'Contactos') +
        statCard(porTipo.PRESUPUESTO || 0, 'Presupuestos') +
        statCard(ordenes, 'Órdenes') +
        statCard(porTipo.RECIBO_COBRO || 0, 'Recibos') +
      '</div>' +
    '</div>' +

    '<div class="seccion">' +
      '<div class="seccion-cabecera">' +
        '<div><h2>Últimos documentos</h2><p>Accedé rápido a lo que estuviste trabajando.</p></div>' +
        '<button class="btn btn-texto" type="button" data-accion="ver-docs">Ver todos</button>' +
      '</div>' +
      '<div class="lista-reciente">' +
        (ultimos || '<div class="vacio">Todavía no hay documentos. Creá el primero arriba.</div>') +
      '</div>' +
    '</div>';
}

function statCard(numero, etiqueta) {
  return '<div class="stat-card"><div class="stat-numero">' + esc(numero) + '</div>' +
    '<div class="stat-etiqueta">' + esc(etiqueta) + '</div></div>';
}

/* ---------- Documentos ---------- */

function renderDocumentos() {
  const cont = $('#vista-documentos');
  if (!cont) return;

  const filtros = Estado.filtrosDocs;
  const empresas = Estado.empresas.map(function (empresa) {
    return '<option value="' + esc(empresa.empresa_id) + '"' +
      (filtros.empresa_id === empresa.empresa_id ? ' selected' : '') + '>' +
      esc(empresa.nombre) + '</option>';
  }).join('');

  const tipos = tiposDocumento().map(function (tipo) {
    return '<option value="' + esc(tipo) + '"' +
      (filtros.tipo === tipo ? ' selected' : '') + '>' +
      esc(tituloTipo(tipo, etiquetasDocumento())) + '</option>';
  }).join('');

  const estadosDisponibles = filtros.tipo && estadosDocumento()[filtros.tipo]
    ? estadosDocumento()[filtros.tipo]
    : estadosUnicos();
  const estados = estadosDisponibles.map(function (estado) {
    return '<option value="' + esc(estado) + '"' +
      (filtros.estado === estado ? ' selected' : '') + '>' +
      esc(etiquetaEstado(estado)) + '</option>';
  }).join('');

  cont.innerHTML =
    '<div class="seccion-cabecera">' +
      '<div><h2>Documentos</h2><p>Todos los comprobantes emitidos y sus estados.</p></div>' +
      '<button class="btn btn-primario" type="button" data-accion="nuevo-doc-desde-lista">Nuevo documento</button>' +
    '</div>' +
    '<div class="filtros">' +
      '<div class="filtro-busqueda"><label for="filtro-doc-texto">Buscar</label>' +
        '<input id="filtro-doc-texto" type="search" placeholder="Número, contacto, CUIT, teléfono..." value="' + esc(filtros.texto) + '"></div>' +
      '<div><label for="filtro-doc-empresa">Empresa</label>' +
        '<select id="filtro-doc-empresa"><option value="">Todas</option>' + empresas + '</select></div>' +
      '<div><label for="filtro-doc-tipo">Tipo</label>' +
        '<select id="filtro-doc-tipo"><option value="">Todos</option>' + tipos + '</select></div>' +
      '<div><label for="filtro-doc-estado">Estado</label>' +
        '<select id="filtro-doc-estado"><option value="">Todos</option>' + estados + '</select></div>' +
      '<div class="filtro-acciones">' +
        '<button class="btn btn-texto" type="button" data-accion="limpiar-filtros">Limpiar</button>' +
      '</div>' +
    '</div>' +
    '<div class="seccion-cabecera" style="margin-top:4px">' +
      '<p id="docs-contador" class="nota">Cargando documentos…</p>' +
    '</div>' +
    '<div id="lista-docs" class="lista-documentos"></div>';
}

function renderListaDocumentos(docs) {
  if (!docs.length) {
    return '<div class="vacio">No hay documentos para mostrar con estos filtros. ' +
      '<button class="btn btn-texto" type="button" data-accion="nuevo-doc-desde-lista">Crear uno</button></div>';
  }

  return docs.map(function (doc) {
    const monto = formatearMontoDocumento(doc);
    return '<div class="documento-item">' +
      '<button class="doc-principal" type="button" data-accion="abrir-doc" data-id="' + esc(doc.documento_id) + '">' +
        '<div class="doc-linea-1">' +
          '<span class="badge ' + esc(claseEmpresa(doc.empresa_id)) + '">' + esc(doc.empresa_id) + '</span>' +
          '<span class="doc-numero">' + esc(doc.numero) + '</span>' +
          '<span class="badge ' + esc(claseEstado(doc.estado)) + '">' + esc(etiquetaEstado(doc.estado)) + '</span>' +
          '<span class="badge">' + esc(doc.etiqueta_tipo || tituloTipo(doc.tipo, etiquetasDocumento())) + '</span>' +
        '</div>' +
        '<div class="doc-contacto">' + esc(doc.contacto_nombre || 'Sin contacto') + '</div>' +
        '<div class="doc-linea-2">' +
          '<span>' + esc(formatearFecha(doc.fecha)) + '</span>' +
          (doc.items_count ? '<span>· ' + esc(doc.items_count) + ' ítem(s)</span>' : '') +
        '</div>' +
      '</button>' +
      '<div class="doc-lado">' +
        (monto ? '<span class="doc-monto">' + esc(monto) + '</span>' : '<span class="nota">Sin importes</span>') +
        '<div class="doc-acciones">' +
          '<button class="btn btn-chico" type="button" data-accion="abrir-doc" data-id="' + esc(doc.documento_id) + '">Abrir</button>' +
          '<button class="btn btn-chico" type="button" data-accion="imprimir-doc" data-id="' + esc(doc.documento_id) + '">Imprimir</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

async function actualizarListaDocumentos() {
  const cont = $('#lista-docs');
  if (!cont) return;
  cont.innerHTML = '<div class="vacio">Cargando documentos…</div>';
  const contador = $('#docs-contador');
  if (contador) contador.textContent = 'Cargando documentos…';

  try {
    const docs = await Api.llamar('documento.listar', Estado.filtrosDocs);
    Estado.documentos = docs || [];
    cont.innerHTML = renderListaDocumentos(Estado.documentos);
    if (contador) {
      contador.textContent = Estado.documentos.length + ' documento(s) encontrado(s)';
    }
  } catch (error) {
    cont.innerHTML = '<div class="vacio">No se pudieron cargar los documentos.</div>';
    if (contador) contador.textContent = '';
    manejarError(error, 'documento.listar');
  }
}

function leerFiltrosDocs() {
  Estado.filtrosDocs = {
    texto: $('#filtro-doc-texto') ? $('#filtro-doc-texto').value : '',
    empresa_id: $('#filtro-doc-empresa') ? $('#filtro-doc-empresa').value : '',
    tipo: $('#filtro-doc-tipo') ? $('#filtro-doc-tipo').value : '',
    estado: $('#filtro-doc-estado') ? $('#filtro-doc-estado').value : ''
  };
}

/* ---------- Configuración ---------- */

function renderConfiguracion() {
  const cont = $('#vista-configuracion');
  if (!cont) return;

  const config = Estado.config || {};
  const cfg = config.config || {};
  const app = config.app || {};
  let host = Api.url;
  try {
    if (/^https?:/i.test(Api.url)) host = new URL(Api.url).host;
  } catch (error) {
    host = Api.url;
  }

  const empresasHtml = Estado.empresas.map(function (empresa) {
    const id = empresa.empresa_id;
    return '<div class="config-card" data-empresa-card="' + esc(id) + '">' +
      '<div class="empresa-config-cabecera">' +
        '<img src="' + esc(rutaLogo(empresa)) + '" alt="' + esc(empresa.nombre) + '" class="' + claseLogo(empresa) + '">' +
        '<div><h2>' + esc(empresa.nombre) + '</h2>' +
        '<p class="config-desc" style="margin:0">' + esc(empresa.descripcion || 'Datos de la empresa') + '</p></div>' +
      '</div>' +
      '<div class="grilla grilla-2">' +
        campoEmpresa('Nombre', 'nombre', empresa.nombre) +
        campoEmpresa('Descripción', 'descripcion', empresa.descripcion) +
        campoEmpresa('CUIT', 'cuit', empresa.cuit) +
        campoEmpresa('Condición IVA', 'condicion_iva', empresa.condicion_iva) +
        campoEmpresa('Teléfono', 'telefono', empresa.telefono) +
        campoEmpresa('Email', 'email', empresa.email) +
        campoEmpresa('Dirección', 'direccion', empresa.direccion) +
        campoEmpresa('Localidad', 'localidad', empresa.localidad) +
        campoEmpresa('Provincia', 'provincia', empresa.provincia) +
        campoEmpresa('Web', 'web', empresa.web) +
        campoEmpresa('Condiciones de pago', 'condiciones_pago', empresa.condiciones_pago) +
        campoEmpresa('Alias / CBU', 'alias_cbu', empresa.alias_cbu) +
        campoEmpresa('Color', 'color', empresa.color) +
      '</div>' +
      '<label class="check-linea"><input type="checkbox" data-empresa-campo="activo"' +
        (empresa.activo ? ' checked' : '') + '> Empresa activa</label>' +
      '<p class="nota">Logo: <code>' + esc(empresa.logo || '') + '</code></p>' +
      '<div class="config-acciones">' +
        '<button class="btn btn-primario" type="button" data-accion="guardar-empresa" data-empresa="' + esc(id) + '">Guardar ' + esc(empresa.nombre) + '</button>' +
      '</div>' +
    '</div>';
  }).join('');

  cont.innerHTML =
    '<div class="seccion-cabecera">' +
      '<div><h2>Configuración</h2><p>Datos de las empresas, textos y conexión.</p></div>' +
      '<button class="btn" type="button" data-accion="recargar-config">Recargar</button>' +
    '</div>' +
    '<div class="config-grid">' +
      '<div class="config-card">' +
        '<h2>Conexión</h2>' +
        '<p class="config-desc">La app se conecta a tu planilla de Google mediante Apps Script.</p>' +
        '<div class="grilla grilla-2">' +
          '<div><label>URL de la API</label><input type="text" value="' + esc(Api.url) + '" readonly></div>' +
          '<div><label>Servidor</label><input type="text" value="' + esc(host) + '" readonly></div>' +
          '<div><label>Usuario</label><input type="text" value="' + esc(Api.usuario) + '" readonly></div>' +
          '<div><label>Versión</label><input type="text" value="' + esc(app.version || '1.0.0') + '" readonly></div>' +
        '</div>' +
        '<p class="nota">El PIN se guarda en este dispositivo. Para cambiarlo, usá la función <code>establecerPin()</code> en Apps Script y luego volvé a conectar.</p>' +
        '<div class="config-acciones">' +
          '<button class="btn btn-peligro" type="button" data-accion="cambiar-conexion">Cambiar conexión / PIN</button>' +
        '</div>' +
      '</div>' +

      '<div class="config-card">' +
        '<h2>Textos y valores por defecto</h2>' +
        '<p class="config-desc">Estos textos aparecen en los documentos y se pueden ajustar cuando quieras.</p>' +
        '<div class="grilla grilla-2">' +
          '<div><label for="cfg-validez">Validez del presupuesto (días)</label>' +
            '<input id="cfg-validez" data-config-campo="validez_dias" type="number" min="1" max="365" value="' + esc(cfg.validez_dias || '15') + '"></div>' +
          '<div><label for="cfg-impuestos">Leyenda de impuestos</label>' +
            '<input id="cfg-impuestos" data-config-campo="texto_impuestos" type="text" value="' + esc(cfg.texto_impuestos || '') + '"></div>' +
        '</div>' +
        '<label for="cfg-pie-presupuesto">Pie del presupuesto</label>' +
        '<textarea id="cfg-pie-presupuesto" data-config-campo="pie_presupuesto" rows="2">' + esc(cfg.pie_presupuesto || '') + '</textarea>' +
        '<label for="cfg-pie-oc">Pie de la orden de compra</label>' +
        '<textarea id="cfg-pie-oc" data-config-campo="pie_orden_compra" rows="2">' + esc(cfg.pie_orden_compra || '') + '</textarea>' +
        '<label for="cfg-pie-ot">Pie de la orden de trabajo</label>' +
        '<textarea id="cfg-pie-ot" data-config-campo="pie_orden_trabajo" rows="2">' + esc(cfg.pie_orden_trabajo || '') + '</textarea>' +
        '<label for="cfg-pie-sol">Pie de la solicitud de presupuesto</label>' +
        '<textarea id="cfg-pie-sol" data-config-campo="pie_solicitud" rows="2">' + esc(cfg.pie_solicitud || '') + '</textarea>' +
        '<label for="cfg-pie-rec">Pie del recibo de cobro</label>' +
        '<textarea id="cfg-pie-rec" data-config-campo="pie_recibo" rows="2">' + esc(cfg.pie_recibo || '') + '</textarea>' +
        '<div class="config-acciones">' +
          '<button class="btn btn-primario" type="button" data-accion="guardar-config-general">Guardar textos</button>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="seccion">' +
      '<div class="seccion-cabecera">' +
        '<div><h2>Datos de las empresas</h2><p>Completá los datos legales y comerciales de cada logo.</p></div>' +
      '</div>' +
      '<div class="config-empresas">' + empresasHtml + '</div>' +
    '</div>';
}

function campoEmpresa(etiqueta, campo, valor) {
  return '<div><label>' + esc(etiqueta) + '</label>' +
    '<input data-empresa-campo="' + esc(campo) + '" type="text" value="' + esc(valor || '') + '"></div>';
}

async function guardarConfigGeneral() {
  const config = {};
  $$('[data-config-campo]').forEach(function (input) {
    config[input.getAttribute('data-config-campo')] = input.value.trim();
  });

  try {
    const data = await Api.llamar('config.guardar', { config: config });
    aplicarConfigPublica(data);
    toast('Textos y valores guardados.', 'ok');
    renderConfiguracion();
  } catch (error) {
    manejarError(error, 'config.guardar');
  }
}

async function guardarEmpresaConfig(empresaId) {
  const id = String(empresaId || '').toUpperCase();
  const actual = empresaPorId(id);
  if (!actual) {
    toast('No se encontró la empresa.', 'error');
    return;
  }

  const card = $('[data-empresa-card="' + id + '"]');
  if (!card) return;

  const empresa = Object.assign({}, actual, { empresa_id: id });
  $$('[data-empresa-campo]', card).forEach(function (input) {
    const campo = input.getAttribute('data-empresa-campo');
    if (input.type === 'checkbox') {
      empresa[campo] = input.checked ? 'SI' : 'NO';
    } else {
      empresa[campo] = input.value.trim();
    }
  });

  try {
    const guardada = await Api.llamar('empresa.guardar', { empresa: empresa });
    Estado.empresas = Estado.empresas.map(function (e) {
      return e.empresa_id === guardada.empresa_id ? guardada : e;
    });
    if (Estado.config && Estado.config.empresas) {
      Estado.config.empresas = Estado.empresas;
    }
    toast('Datos de ' + guardada.nombre + ' guardados.', 'ok');
    renderConfiguracion();
  } catch (error) {
    manejarError(error, 'empresa.guardar');
  }
}

function aplicarConfigPublica(data) {
  if (!data) return;
  Estado.config = data;
  Estado.empresas = data.empresas || Estado.empresas;
}

async function recargarConfiguracion() {
  try {
    const data = await Api.llamar('config.obtener');
    aplicarConfigPublica(data);
    renderConfiguracion();
    toast('Configuración actualizada.', 'ok');
  } catch (error) {
    manejarError(error, 'config.obtener');
  }
}

/* ---------- Eventos globales ---------- */

function enlazarEventosGlobales() {
  const form = $('#form-conexion');
  if (form) {
    form.addEventListener('submit', async function (evento) {
      evento.preventDefault();
      const boton = $('#btn-conectar');
      const error = $('#conexion-error');
      if (error) {
        error.textContent = '';
        error.classList.add('oculto');
      }
      if (boton) {
        boton.disabled = true;
        boton.textContent = 'Conectando…';
      }

      try {
        await conectar(
          $('#conexion-api').value,
          $('#conexion-pin').value,
          $('#conexion-usuario').value,
          false
        );
      } catch (err) {
        if (error) {
          error.textContent = err.message;
          error.classList.remove('oculto');
        }
      } finally {
        if (boton) {
          boton.disabled = false;
          boton.textContent = 'Conectar';
        }
      }
    });
  }

  const btnLocal = $('#btn-usar-local');
  if (btnLocal) {
    btnLocal.addEventListener('click', function () {
      $('#conexion-api').value = 'http://localhost:8080/api';
      $('#conexion-pin').value = '1234';
      $('#conexion-usuario').value = 'Local';
    });
  }

  $$('.nav-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const vista = btn.getAttribute('data-vista');
      if (vista) cambiarVista(vista);
    });
  });

  const btnSalir = $('#btn-salir');
  if (btnSalir) {
    btnSalir.addEventListener('click', async function () {
      const salir = await confirmar(
        'Salir',
        'Se cerrará la sesión en este dispositivo. Los datos siguen guardados en la planilla.',
        'Salir'
      );
      if (salir) await desconectar();
    });
  }

  document.addEventListener('click', function (evento) {
    const cerrar = evento.target.closest ? evento.target.closest('[data-cerrar]') : null;
    if (cerrar) {
      evento.preventDefault();
      cerrarModal(cerrar.getAttribute('data-cerrar'));
      return;
    }

    if (evento.target.classList && evento.target.classList.contains('modal')) {
      cerrarModal(evento.target.id);
    }
  });

  const btnConfirmarSi = $('#btn-confirmar-si');
  if (btnConfirmarSi) {
    btnConfirmarSi.addEventListener('click', function () {
      const cb = Estado.confirmarCallback;
      Estado.confirmarCallback = null;
      cerrarModal('modal-confirmar');
      if (cb) cb(true);
    });
  }

  const btnConfirmarNo = $('#btn-confirmar-no');
  if (btnConfirmarNo) {
    btnConfirmarNo.addEventListener('click', function () {
      const cb = Estado.confirmarCallback;
      Estado.confirmarCallback = null;
      cerrarModal('modal-confirmar');
      if (cb) cb(false);
    });
  }

  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape') {
      const modales = $$('.modal:not(.oculto)');
      if (modales.length) {
        cerrarModal(modales[modales.length - 1].id);
      }
    }
  });

  const vistaInicio = $('#vista-inicio');
  if (vistaInicio) {
    vistaInicio.addEventListener('click', function (evento) {
      const accion = evento.target.closest('[data-accion]');
      if (!accion) return;
      const tipo = accion.getAttribute('data-accion');

      if (tipo === 'elegir-empresa') {
        Estado.nuevaEmpresa = accion.getAttribute('data-empresa');
        renderInicio();
      } else if (tipo === 'nuevo-doc') {
        nuevoDocumento(
          accion.getAttribute('data-empresa'),
          accion.getAttribute('data-tipo')
        );
      } else if (tipo === 'abrir-doc') {
        abrirDocumento(accion.getAttribute('data-id'));
      } else if (tipo === 'ver-docs') {
        cambiarVista('documentos');
      } else if (tipo === 'ver-directorio') {
        cambiarVista('directorio');
      }
    });
  }

  const vistaDocumentos = $('#vista-documentos');
  if (vistaDocumentos) {
    const buscarDebounce = debounce(function () {
      leerFiltrosDocs();
      actualizarListaDocumentos();
    }, 320);

    vistaDocumentos.addEventListener('click', function (evento) {
      const accion = evento.target.closest('[data-accion]');
      if (!accion) return;
      const tipo = accion.getAttribute('data-accion');

      if (tipo === 'abrir-doc') {
        abrirDocumento(accion.getAttribute('data-id'));
      } else if (tipo === 'imprimir-doc') {
        abrirDocumento(accion.getAttribute('data-id'), true);
      } else if (tipo === 'nuevo-doc-desde-lista') {
        cambiarVista('inicio');
        toast('Elegí la empresa y el tipo de documento.');
      } else if (tipo === 'limpiar-filtros') {
        Estado.filtrosDocs = { texto: '', empresa_id: '', tipo: '', estado: '' };
        renderDocumentos();
        actualizarListaDocumentos();
      }
    });

    vistaDocumentos.addEventListener('change', function (evento) {
      const id = evento.target.id;
      if (id === 'filtro-doc-empresa' || id === 'filtro-doc-tipo' || id === 'filtro-doc-estado') {
        leerFiltrosDocs();
        if (id === 'filtro-doc-tipo') {
          Estado.filtrosDocs.estado = '';
          renderDocumentos();
        }
        actualizarListaDocumentos();
      }
    });

    vistaDocumentos.addEventListener('input', function (evento) {
      if (evento.target.id === 'filtro-doc-texto') {
        buscarDebounce();
      }
    });
  }

  const vistaConfiguracion = $('#vista-configuracion');
  if (vistaConfiguracion) {
    vistaConfiguracion.addEventListener('click', async function (evento) {
      const accion = evento.target.closest('[data-accion]');
      if (!accion) return;
      const tipo = accion.getAttribute('data-accion');

      if (tipo === 'guardar-config-general') {
        await guardarConfigGeneral();
      } else if (tipo === 'guardar-empresa') {
        await guardarEmpresaConfig(accion.getAttribute('data-empresa'));
      } else if (tipo === 'recargar-config') {
        await recargarConfiguracion();
      } else if (tipo === 'cambiar-conexion') {
        const cambiar = await confirmar(
          'Cambiar conexión',
          'Se cerrará la sesión en este dispositivo para que puedas ingresar otra URL o PIN. ' +
          'Los datos guardados en la planilla no se borran.',
          'Continuar'
        );
        if (cambiar) await desconectar();
      }
    });
  }
}

function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const protocolo = location.protocol;
  const host = location.hostname;
  if (protocolo !== 'https:' && host !== 'localhost' && host !== '127.0.0.1') return;

  navigator.serviceWorker.register('service-worker.js').catch(function (error) {
    console.warn('Service worker no registrado:', error);
  });
}

document.addEventListener('DOMContentLoaded', iniciarApp);
