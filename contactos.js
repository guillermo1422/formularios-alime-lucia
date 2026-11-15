/* Formularios Alime-Lucia - Directorio, clientes y proveedores */

function contactosActivos() {
  return Estado.contactos.filter(function (contacto) {
    return String(contacto.estado || 'ACTIVO').toUpperCase() === 'ACTIVO';
  });
}

function contactoCoincideRol(contacto, rol) {
  const tipo = String(contacto && contacto.tipo ? contacto.tipo : '').toUpperCase();
  const buscado = String(rol || '').toUpperCase();
  if (buscado === 'CLIENTE') return tipo === 'CLIENTE' || tipo === 'AMBOS';
  if (buscado === 'PROVEEDOR') return tipo === 'PROVEEDOR' || tipo === 'AMBOS';
  return true;
}

function contactosFiltrados(texto, tipo, incluirArchivados) {
  const busqueda = normalizar(texto || '');
  const digitos = soloDigitos(texto || '');

  return Estado.contactos.filter(function (contacto) {
    const estado = String(contacto.estado || 'ACTIVO').toUpperCase();
    if (!incluirArchivados && estado !== 'ACTIVO') return false;

    const tipoContacto = String(contacto.tipo || '').toUpperCase();
    if (tipo === 'CLIENTE' && tipoContacto !== 'CLIENTE' && tipoContacto !== 'AMBOS') return false;
    if (tipo === 'PROVEEDOR' && tipoContacto !== 'PROVEEDOR' && tipoContacto !== 'AMBOS') return false;
    if (tipo === 'AMBOS' && tipoContacto !== 'AMBOS') return false;

    if (!busqueda) return true;

    const campos = normalizar([
      contacto.nombre,
      contacto.razon_social,
      contacto.contacto,
      contacto.cuit_dni,
      contacto.telefono,
      contacto.email,
      contacto.direccion,
      contacto.localidad,
      contacto.provincia,
      contacto.etiquetas
    ].join(' '));

    const telefono = soloDigitos(contacto.telefono);
    const cuit = soloDigitos(contacto.cuit_dni);
    return campos.indexOf(busqueda) !== -1 ||
      (!!digitos && telefono.indexOf(digitos) !== -1) ||
      (!!digitos && cuit.indexOf(digitos) !== -1);
  }).sort(function (a, b) {
    return String(a.nombre_completo || a.nombre || '').localeCompare(
      String(b.nombre_completo || b.nombre || ''),
      'es'
    );
  });
}

function renderDirectorio() {
  const cont = $('#vista-directorio');
  if (!cont) return;

  const filtros = Estado.filtrosDirectorio || {};
  const tipos = [
    { valor: '', texto: 'Todos' },
    { valor: 'CLIENTE', texto: 'Clientes' },
    { valor: 'PROVEEDOR', texto: 'Proveedores' },
    { valor: 'AMBOS', texto: 'Clientes y proveedores' }
  ].map(function (opcion) {
    return '<option value="' + esc(opcion.valor) + '"' +
      (filtros.tipo === opcion.valor ? ' selected' : '') + '>' +
      esc(opcion.texto) + '</option>';
  }).join('');

  cont.innerHTML =
    '<div class="seccion-cabecera">' +
      '<div><h2>Directorio</h2><p>Clientes y proveedores disponibles para los documentos.</p></div>' +
      '<button class="btn btn-primario" type="button" data-accion="nuevo-contacto">Nuevo contacto</button>' +
    '</div>' +
    '<div class="filtros">' +
      '<div class="filtro-busqueda"><label for="filtro-dir-texto">Buscar</label>' +
        '<input id="filtro-dir-texto" type="search" placeholder="Nombre, CUIT, teléfono, email..." value="' + esc(filtros.texto || '') + '"></div>' +
      '<div><label for="filtro-dir-tipo">Tipo</label>' +
        '<select id="filtro-dir-tipo">' + tipos + '</select></div>' +
      '<div><label for="filtro-dir-archivados">Archivados</label>' +
        '<label class="check-inline"><input id="filtro-dir-archivados" type="checkbox"' +
          (filtros.incluir_archivados ? ' checked' : '') + '> Incluir</label></div>' +
      '<div class="filtro-acciones">' +
        '<button class="btn btn-texto" type="button" data-accion="limpiar-filtros-dir">Limpiar</button>' +
      '</div>' +
    '</div>' +
    '<div class="seccion-cabecera" style="margin-top:4px">' +
      '<p id="directorio-contador" class="nota">Cargando contactos…</p>' +
    '</div>' +
    '<div id="lista-directorio" class="lista-contactos"></div>';

  actualizarListaDirectorio();
}

function actualizarListaDirectorio() {
  const cont = $('#lista-directorio');
  if (!cont) return;

  const filtros = Estado.filtrosDirectorio || {};
  const lista = contactosFiltrados(
    filtros.texto || '',
    filtros.tipo || '',
    !!filtros.incluir_archivados
  );

  const contador = $('#directorio-contador');
  if (contador) contador.textContent = lista.length + ' contacto(s) encontrado(s)';

  if (!lista.length) {
    cont.innerHTML = '<div class="vacio">No hay contactos con estos filtros. ' +
      '<button class="btn btn-texto" type="button" data-accion="nuevo-contacto">Crear uno</button></div>';
    return;
  }

  cont.innerHTML = lista.map(renderContactoItem).join('');
}

function renderContactoItem(contacto) {
  const archivado = String(contacto.estado || '').toUpperCase() === 'ARCHIVADO';
  const nombre = nombreContactoVisible(contacto);
  const tipo = String(contacto.tipo || '').toUpperCase();
  const tipoClase = tipo === 'PROVEEDOR' ? 'badge-lucia' : 'badge-alime';
  const datos = [];

  if (contacto.telefono) datos.push(contacto.telefono);
  if (contacto.email) datos.push(contacto.email);
  if (contacto.cuit_dni) datos.push('CUIT/DNI ' + contacto.cuit_dni);
  if (!datos.length && contacto.direccion) datos.push(contacto.direccion);

  return '<button class="contacto-item' + (archivado ? ' archivado' : '') + '" type="button" ' +
    'data-accion="ver-contacto" data-id="' + esc(contacto.contacto_id) + '">' +
    '<span class="contacto-avatar">' + esc(iniciales(nombre)) + '</span>' +
    '<span class="contacto-principal">' +
      '<span class="contacto-nombre">' + esc(nombre) + '</span> ' +
      '<span class="badge ' + tipoClase + '">' + esc(tipo) + '</span> ' +
      (archivado ? '<span class="badge badge-anulado">Archivado</span>' : '') +
      '<span class="contacto-datos">' +
        (datos.length ? esc(datos.join(' · ')) : 'Sin datos de contacto') +
      '</span>' +
    '</span>' +
    '<span class="contacto-lado">' +
      '<span class="badge">' + esc(contacto.documentos_count || 0) + ' doc.</span>' +
      (contacto.ultima_fecha
        ? '<small class="nota">' + esc(formatearFecha(contacto.ultima_fecha)) + '</small>'
        : '') +
    '</span>' +
  '</button>';
}

/* ---------- Detalle de contacto ---------- */

async function abrirDetalleContacto(contactoId) {
  if (!contactoId) return;
  try {
    const detalle = await Api.llamar('contacto.historial', { contacto_id: contactoId });
    Estado.contactoDetalle = detalle;
    renderDetalleContacto(detalle);
    abrirModal('modal-detalle-contacto');
  } catch (error) {
    manejarError(error, 'contacto.historial');
  }
}

function renderDetalleContacto(detalle) {
  const cont = $('#detalle-contacto-contenido');
  if (!cont) return;

  const contacto = detalle.contacto || {};
  const documentos = detalle.documentos || [];
  const archivado = String(contacto.estado || '').toUpperCase() === 'ARCHIVADO';
  const tipo = String(contacto.tipo || '').toUpperCase();
  const nombre = nombreContactoVisible(contacto);

  $('#detalle-contacto-titulo').textContent = nombre;
  $('#btn-detalle-archivar').classList.toggle('oculto', archivado);
  $('#btn-detalle-reactivar').classList.toggle('oculto', !archivado);

  const datos = [
    ['CUIT / DNI', contacto.cuit_dni],
    ['Teléfono', contacto.telefono],
    ['Email', contacto.email],
    ['Dirección', contacto.direccion],
    ['Localidad', [contacto.localidad, contacto.provincia].filter(Boolean).join(', ')],
    ['Persona de contacto', contacto.contacto],
    ['Etiquetas', contacto.etiquetas],
    ['Notas', contacto.notas]
  ].filter(function (fila) { return fila[1]; });

  const datosHtml = datos.length
    ? '<div class="detalle-grid">' + datos.map(function (fila) {
      return '<div><span class="detalle-etiqueta">' + esc(fila[0]) + '</span>' +
        '<span class="detalle-valor">' + esc(fila[1]) + '</span></div>';
    }).join('') + '</div>'
    : '<p class="nota">Sin datos adicionales.</p>';

  const acciones = [];
  if (tipo === 'CLIENTE' || tipo === 'AMBOS') {
    acciones.push(botonDocumentoContacto('PRESUPUESTO', 'Nuevo presupuesto'));
    acciones.push(botonDocumentoContacto('ORDEN_TRABAJO', 'Nueva orden de trabajo'));
    acciones.push(botonDocumentoContacto('RECIBO_COBRO', 'Nuevo recibo'));
  }
  if (tipo === 'PROVEEDOR' || tipo === 'AMBOS') {
    acciones.push(botonDocumentoContacto('ORDEN_COMPRA', 'Nueva orden de compra'));
    acciones.push(botonDocumentoContacto('SOLICITUD_PRESUPUESTO', 'Solicitar presupuesto'));
  }

  const historialHtml = documentos.length
    ? documentos.map(function (doc) {
      const monto = formatearMontoDocumento(doc);
      return '<button class="historial-item" type="button" data-accion="abrir-doc-desde-contacto" ' +
        'data-id="' + esc(doc.documento_id) + '">' +
        '<span class="badge ' + esc(claseEmpresa(doc.empresa_id)) + '">' + esc(doc.empresa_id) + '</span>' +
        '<span class="historial-principal">' +
          '<strong>' + esc(doc.numero || '') + '</strong> ' +
          '<span class="badge ' + esc(claseEstado(doc.estado)) + '">' + esc(etiquetaEstado(doc.estado)) + '</span>' +
          '<small>' + esc(doc.etiqueta_tipo || tituloTipo(doc.tipo, etiquetasDocumento())) + ' · ' +
          esc(formatearFecha(doc.fecha)) + '</small>' +
        '</span>' +
        (monto ? '<span class="historial-monto">' + esc(monto) + '</span>' : '') +
      '</button>';
    }).join('')
    : '<div class="vacio">Este contacto todavía no tiene documentos.</div>';

  cont.innerHTML =
    '<div class="detalle-cabecera">' +
      '<span class="contacto-avatar contacto-avatar-grande">' + esc(iniciales(nombre)) + '</span>' +
      '<div>' +
        '<div class="detalle-nombre">' + esc(nombre) + '</div>' +
        '<span class="badge ' + (tipo === 'PROVEEDOR' ? 'badge-lucia' : 'badge-alime') + '">' + esc(tipo) + '</span> ' +
        (archivado ? '<span class="badge badge-anulado">Archivado</span>' : '<span class="badge badge-activo">Activo</span>') +
      '</div>' +
    '</div>' +
    datosHtml +
    (acciones.length ? '<div class="detalle-acciones">' + acciones.join('') + '</div>' : '') +
    '<div class="detalle-seccion">' +
      '<div class="seccion-cabecera" style="margin-bottom:8px">' +
        '<div><h3>Documentos</h3><p>' + esc(documentos.length) + ' documento(s) asociado(s).</p></div>' +
      '</div>' +
      '<div class="historial-lista">' + historialHtml + '</div>' +
    '</div>';
}

function botonDocumentoContacto(tipo, texto) {
  return '<button class="btn btn-secundario btn-chico" type="button" ' +
    'data-accion="doc-desde-contacto" data-tipo="' + esc(tipo) + '">' +
    esc(texto) + '</button>';
}

function crearDocumentoDesdeContacto(tipo) {
  const detalle = Estado.contactoDetalle;
  if (!detalle || !detalle.contacto) return;
  const contacto = detalle.contacto;
  const empresa = empresaPorId(Estado.nuevaEmpresa) || empresasActivas()[0] || Estado.empresas[0];
  if (!empresa) {
    toast('No hay empresas activas.', 'error');
    return;
  }
  cerrarModal('modal-detalle-contacto');
  nuevoDocumento(empresa.empresa_id, tipo, contacto);
}

/* ---------- Formulario de contacto ---------- */

function abrirFormularioContacto(contacto, tipoSugerido, callback) {
  const form = $('#form-contacto');
  if (!form) return;

  Estado.contactoEnEdicion = contacto || null;
  Estado.contactoFormCallback = callback || null;
  Estado.contactoDuplicadoPendiente = null;

  if (!contacto) {
    form.reset();
    $('#contacto-id').value = '';
    $('#contacto-tipo').value = tipoSugerido || 'CLIENTE';
    $('#modal-contacto-titulo').textContent = 'Nuevo contacto';
    $('#btn-guardar-contacto').textContent = 'Guardar contacto';
    cerrarModal('modal-duplicados');
  } else {
    $('#contacto-id').value = contacto.contacto_id || '';
    $('#contacto-tipo').value = contacto.tipo || 'CLIENTE';
    $('#contacto-nombre').value = contacto.nombre || '';
    $('#contacto-razon').value = contacto.razon_social || '';
    $('#contacto-persona').value = contacto.contacto || '';
    $('#contacto-cuit').value = contacto.cuit_dni || '';
    $('#contacto-telefono').value = contacto.telefono || '';
    $('#contacto-email').value = contacto.email || '';
    $('#contacto-direccion').value = contacto.direccion || '';
    $('#contacto-localidad').value = contacto.localidad || '';
    $('#contacto-provincia').value = contacto.provincia || '';
    $('#contacto-etiquetas').value = contacto.etiquetas || '';
    $('#contacto-notas').value = contacto.notas || '';
    $('#modal-contacto-titulo').textContent = 'Editar contacto';
    $('#btn-guardar-contacto').textContent = 'Guardar cambios';
  }

  const error = $('#contacto-error');
  if (error) {
    error.textContent = '';
    error.classList.add('oculto');
  }

  abrirModal('modal-contacto');
  setTimeout(function () { $('#contacto-nombre').focus(); }, 50);
}

function leerFormularioContacto() {
  return {
    tipo: $('#contacto-tipo').value,
    nombre: $('#contacto-nombre').value.trim(),
    razon_social: $('#contacto-razon').value.trim(),
    contacto: $('#contacto-persona').value.trim(),
    cuit_dni: $('#contacto-cuit').value.trim(),
    telefono: $('#contacto-telefono').value.trim(),
    email: $('#contacto-email').value.trim(),
    direccion: $('#contacto-direccion').value.trim(),
    localidad: $('#contacto-localidad').value.trim(),
    provincia: $('#contacto-provincia').value.trim(),
    etiquetas: $('#contacto-etiquetas').value.trim(),
    notas: $('#contacto-notas').value.trim()
  };
}

function mostrarErrorContacto(mensaje) {
  const error = $('#contacto-error');
  if (!error) return;
  error.textContent = mensaje;
  error.classList.remove('oculto');
}

async function guardarContacto(forzar) {
  const boton = $('#btn-guardar-contacto');
  const editando = !!Estado.contactoEnEdicion;
  let datos;

  if (forzar && Estado.contactoDuplicadoPendiente) {
    datos = Estado.contactoDuplicadoPendiente.datos;
  } else {
    datos = leerFormularioContacto();
  }

  if (!datos.nombre) {
    mostrarErrorContacto('Ingresá el nombre del contacto.');
    $('#contacto-nombre').focus();
    return;
  }

  if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
    mostrarErrorContacto('El email no tiene un formato válido.');
    $('#contacto-email').focus();
    return;
  }

  const id = editando
    ? (Estado.contactoEnEdicion.contacto_id || $('#contacto-id').value)
    : '';

  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Guardando…';
  }

  try {
    let guardado;
    if (editando) {
      guardado = await Api.llamar('contacto.actualizar', {
        contacto: Object.assign({}, datos, { contacto_id: id }),
        forzar: !!forzar
      });
    } else {
      guardado = await Api.llamar('contacto.crear', {
        contacto: datos,
        forzar: !!forzar
      });
    }

    cerrarModal('modal-duplicados');
    cerrarModal('modal-contacto');
    Estado.contactoDuplicadoPendiente = null;
    Estado.contactoEnEdicion = null;

    const callback = Estado.contactoFormCallback;
    Estado.contactoFormCallback = null;

    await recargarContactos();

    if (callback) {
      callback(guardado);
      return;
    }

    toast(editando ? 'Contacto actualizado.' : 'Contacto creado.', 'ok');

    if (editando) {
      await abrirDetalleContacto(guardado.contacto_id);
    } else if (Estado.vista === 'directorio') {
      actualizarListaDirectorio();
    }
  } catch (error) {
    if (error && error.codigo === 'DUPLICADO') {
      const duplicados = error.datos && error.datos.duplicados ? error.datos.duplicados : [];
      Estado.contactoDuplicadoPendiente = {
        datos: datos,
        esEdicion: editando,
        contactoId: id,
        duplicados: duplicados
      };
      renderDuplicados(duplicados);
      abrirModal('modal-duplicados');
    } else {
      mostrarErrorContacto(error && error.message ? error.message : 'No se pudo guardar el contacto.');
      manejarError(error, 'contacto.guardar');
    }
  } finally {
    if (boton) {
      boton.disabled = false;
      boton.textContent = editando ? 'Guardar cambios' : 'Guardar contacto';
    }
  }
}

function renderDuplicados(duplicados) {
  const cont = $('#duplicados-lista');
  if (!cont) return;

  if (!duplicados.length) {
    cont.innerHTML = '<div class="vacio">No se recibieron coincidencias.</div>';
    return;
  }

  cont.innerHTML = duplicados.map(function (contacto) {
    const nombre = nombreContactoVisible(contacto);
    const datos = [contacto.telefono, contacto.email, contacto.cuit_dni].filter(Boolean).join(' · ');
    return '<div class="duplicado-item">' +
      '<strong>' + esc(nombre) + '</strong>' +
      '<small>' + esc(String(contacto.tipo || '').toUpperCase()) + ' · ' +
        esc(datos || 'Sin datos') + '</small>' +
      (contacto.motivo ? '<small>Coincide por: ' + esc(contacto.motivo) + '</small>' : '') +
      '<button class="btn btn-chico btn-secundario" type="button" ' +
        'data-accion="usar-duplicado" data-id="' + esc(contacto.contacto_id) + '">Usar este contacto</button>' +
    '</div>';
  }).join('');
}

async function usarDuplicado(contactoId) {
  const pendiente = Estado.contactoDuplicadoPendiente;
  const contacto = pendiente && pendiente.duplicados
    ? pendiente.duplicados.filter(function (c) { return c.contacto_id === contactoId; })[0]
    : null;

  let elegido = contacto;
  if (!elegido) {
    try {
      elegido = await Api.llamar('contacto.obtener', { contacto_id: contactoId });
    } catch (error) {
      manejarError(error, 'contacto.obtener');
      return;
    }
  }

  cerrarModal('modal-duplicados');
  cerrarModal('modal-contacto');
  Estado.contactoDuplicadoPendiente = null;
  Estado.contactoEnEdicion = null;

  const callback = Estado.contactoFormCallback;
  Estado.contactoFormCallback = null;

  if (callback) {
    callback(elegido);
  } else {
    toast('Se usó el contacto existente.', 'ok');
    await abrirDetalleContacto(elegido.contacto_id);
  }
}

async function recargarContactos() {
  try {
    Estado.contactos = await Api.llamar('contacto.listar', { incluir_archivados: true });
    if (Estado.vista === 'directorio') actualizarListaDirectorio();
    try {
      Estado.resumen = await Api.llamar('resumen');
    } catch (errorResumen) {
      /* el resumen se actualiza luego */
    }
  } catch (error) {
    manejarError(error, 'contacto.listar');
  }
}

/* ---------- Selector de contacto para documentos ---------- */

function abrirSelectorContacto(rol, callback) {
  Estado.contactoPickerRol = String(rol || '').toUpperCase();
  Estado.contactoPickerCallback = callback || null;

  const titulo = $('#picker-titulo');
  if (titulo) {
    titulo.textContent = Estado.contactoPickerRol === 'PROVEEDOR'
      ? 'Buscar proveedor'
      : 'Buscar cliente';
  }

  const buscar = $('#picker-buscar');
  if (buscar) buscar.value = '';

  filtrarPicker();
  abrirModal('modal-picker');
  setTimeout(function () { if (buscar) buscar.focus(); }, 60);
}

function contactosPicker() {
  return contactosActivos().filter(function (contacto) {
    return contactoCoincideRol(contacto, Estado.contactoPickerRol);
  });
}

function filtrarPicker() {
  const cont = $('#picker-lista');
  if (!cont) return;

  const texto = $('#picker-buscar') ? $('#picker-buscar').value : '';
  const busqueda = normalizar(texto);
  const digitos = soloDigitos(texto);

  const lista = contactosPicker().filter(function (contacto) {
    if (!busqueda) return true;
    const campos = normalizar([
      contacto.nombre,
      contacto.razon_social,
      contacto.contacto,
      contacto.cuit_dni,
      contacto.telefono,
      contacto.email,
      contacto.direccion,
      contacto.localidad,
      contacto.etiquetas
    ].join(' '));
    const telefono = soloDigitos(contacto.telefono);
    const cuit = soloDigitos(contacto.cuit_dni);
    return campos.indexOf(busqueda) !== -1 ||
      (!!digitos && telefono.indexOf(digitos) !== -1) ||
      (!!digitos && cuit.indexOf(digitos) !== -1);
  });

  if (!lista.length) {
    cont.innerHTML = '<div class="vacio">No se encontraron contactos. ' +
      'Podés crear uno nuevo con el botón de arriba.</div>';
    return;
  }

  cont.innerHTML = lista.map(function (contacto) {
    const nombre = nombreContactoVisible(contacto);
    const datos = [contacto.telefono, contacto.email, contacto.cuit_dni]
      .filter(Boolean)
      .join(' · ');
    return '<button class="picker-item" type="button" ' +
      'data-accion="elegir-contacto-picker" data-id="' + esc(contacto.contacto_id) + '">' +
      '<span class="contacto-avatar">' + esc(iniciales(nombre)) + '</span>' +
      '<span class="picker-principal">' +
        '<strong>' + esc(nombre) + '</strong>' +
        '<small>' + esc(String(contacto.tipo || '').toUpperCase()) + '</small>' +
        '<small>' + esc(datos || 'Sin datos de contacto') + '</small>' +
      '</span>' +
    '</button>';
  }).join('');
}

async function seleccionarContactoPicker(contactoId) {
  let contacto = Estado.contactos.filter(function (c) {
    return c.contacto_id === contactoId;
  })[0];

  if (!contacto) {
    try {
      contacto = await Api.llamar('contacto.obtener', { contacto_id: contactoId });
    } catch (error) {
      manejarError(error, 'contacto.obtener');
      return;
    }
  }

  const callback = Estado.contactoPickerCallback;
  Estado.contactoPickerCallback = null;
  Estado.contactoPickerRol = '';
  cerrarModal('modal-picker');

  if (callback) callback(contacto);
}

function nuevoContactoDesdePicker() {
  const rol = Estado.contactoPickerRol;
  const tipo = rol === 'PROVEEDOR' ? 'PROVEEDOR' : 'CLIENTE';

  abrirFormularioContacto(null, tipo, function (guardado) {
    const callback = Estado.contactoPickerCallback;
    Estado.contactoPickerCallback = null;
    Estado.contactoPickerRol = '';
    cerrarModal('modal-picker');
    if (callback) callback(guardado);
  });
}

/* ---------- Eventos del directorio ---------- */

function enlazarEventosDirectorio() {
  const vista = $('#vista-directorio');
  if (vista) {
    const buscarDebounce = debounce(function () {
      Estado.filtrosDirectorio.texto = $('#filtro-dir-texto')
        ? $('#filtro-dir-texto').value
        : '';
      actualizarListaDirectorio();
    }, 220);

    vista.addEventListener('click', function (evento) {
      const accion = evento.target.closest('[data-accion]');
      if (!accion) return;
      const tipo = accion.getAttribute('data-accion');

      if (tipo === 'nuevo-contacto') {
        abrirFormularioContacto(null, null, null);
      } else if (tipo === 'ver-contacto') {
        abrirDetalleContacto(accion.getAttribute('data-id'));
      } else if (tipo === 'limpiar-filtros-dir') {
        Estado.filtrosDirectorio = { texto: '', tipo: '', incluir_archivados: false };
        renderDirectorio();
      }
    });

    vista.addEventListener('input', function (evento) {
      if (evento.target.id === 'filtro-dir-texto') buscarDebounce();
    });

    vista.addEventListener('change', function (evento) {
      const id = evento.target.id;
      if (id === 'filtro-dir-tipo') {
        Estado.filtrosDirectorio.tipo = evento.target.value;
        actualizarListaDirectorio();
      } else if (id === 'filtro-dir-archivados') {
        Estado.filtrosDirectorio.incluir_archivados = evento.target.checked;
        actualizarListaDirectorio();
      }
    });
  }

  const form = $('#form-contacto');
  if (form) {
    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      guardarContacto(false);
    });
  }

  const btnGuardar = $('#btn-guardar-contacto');
  if (btnGuardar) {
    btnGuardar.addEventListener('click', function () {
      guardarContacto(false);
    });
  }

  const btnForzar = $('#btn-duplicados-forzar');
  if (btnForzar) {
    btnForzar.addEventListener('click', function () {
      guardarContacto(true);
    });
  }

  const duplicados = $('#duplicados-lista');
  if (duplicados) {
    duplicados.addEventListener('click', function (evento) {
      const accion = evento.target.closest('[data-accion]');
      if (!accion) return;
      if (accion.getAttribute('data-accion') === 'usar-duplicado') {
        usarDuplicado(accion.getAttribute('data-id'));
      }
    });
  }

  const detalleContenido = $('#detalle-contacto-contenido');
  if (detalleContenido) {
    detalleContenido.addEventListener('click', function (evento) {
      const accion = evento.target.closest('[data-accion]');
      if (!accion) return;
      const tipo = accion.getAttribute('data-accion');
      if (tipo === 'doc-desde-contacto') {
        crearDocumentoDesdeContacto(accion.getAttribute('data-tipo'));
      } else if (tipo === 'abrir-doc-desde-contacto') {
        cerrarModal('modal-detalle-contacto');
        abrirDocumento(accion.getAttribute('data-id'));
      }
    });
  }

  const btnEditar = $('#btn-detalle-editar');
  if (btnEditar) {
    btnEditar.addEventListener('click', function () {
      const detalle = Estado.contactoDetalle;
      if (!detalle || !detalle.contacto) return;
      const contacto = detalle.contacto;
      cerrarModal('modal-detalle-contacto');
      abrirFormularioContacto(contacto, null, null);
    });
  }

  const btnArchivar = $('#btn-detalle-archivar');
  if (btnArchivar) {
    btnArchivar.addEventListener('click', async function () {
      const detalle = Estado.contactoDetalle;
      if (!detalle || !detalle.contacto) return;
      const contacto = detalle.contacto;
      const ok = await confirmar(
        'Archivar contacto',
        'El contacto dejará de aparecer en las búsquedas, pero sus documentos y datos se conservan. ' +
        '¿Querés archivarlo?',
        'Archivar'
      );
      if (!ok) return;

      try {
        await Api.llamar('contacto.archivar', {
          contacto_id: contacto.contacto_id,
          motivo: 'Archivado desde la app'
        });
        cerrarModal('modal-detalle-contacto');
        await recargarContactos();
        toast('Contacto archivado.', 'ok');
      } catch (error) {
        manejarError(error, 'contacto.archivar');
      }
    });
  }

  const btnReactivar = $('#btn-detalle-reactivar');
  if (btnReactivar) {
    btnReactivar.addEventListener('click', async function () {
      const detalle = Estado.contactoDetalle;
      if (!detalle || !detalle.contacto) return;
      const contacto = detalle.contacto;
      try {
        await Api.llamar('contacto.reactivar', { contacto_id: contacto.contacto_id });
        cerrarModal('modal-detalle-contacto');
        await recargarContactos();
        toast('Contacto reactivado.', 'ok');
      } catch (error) {
        manejarError(error, 'contacto.reactivar');
      }
    });
  }

  const pickerLista = $('#picker-lista');
  if (pickerLista) {
    pickerLista.addEventListener('click', function (evento) {
      const accion = evento.target.closest('[data-accion]');
      if (!accion) return;
      if (accion.getAttribute('data-accion') === 'elegir-contacto-picker') {
        seleccionarContactoPicker(accion.getAttribute('data-id'));
      }
    });
  }

  const pickerBuscar = $('#picker-buscar');
  if (pickerBuscar) {
    pickerBuscar.addEventListener('input', filtrarPicker);
  }

  const btnPickerNuevo = $('#btn-picker-nuevo');
  if (btnPickerNuevo) {
    btnPickerNuevo.addEventListener('click', nuevoContactoDesdePicker);
  }

  const modalPicker = $('#modal-picker');
  if (modalPicker) {
    modalPicker.addEventListener('click', function (evento) {
      const cerrar = evento.target.closest
        ? evento.target.closest('[data-cerrar="modal-picker"]')
        : null;
      if (cerrar || evento.target.id === 'modal-picker') {
        Estado.contactoPickerCallback = null;
        Estado.contactoPickerRol = '';
      }
    });
  }

  const modalContacto = $('#modal-contacto');
  if (modalContacto) {
    modalContacto.addEventListener('click', function (evento) {
      const cerrar = evento.target.closest
        ? evento.target.closest('[data-cerrar="modal-contacto"]')
        : null;
      if (cerrar || evento.target.id === 'modal-contacto') {
        Estado.contactoFormCallback = null;
        Estado.contactoEnEdicion = null;
      }
    });
  }

  const modalDuplicados = $('#modal-duplicados');
  if (modalDuplicados) {
    modalDuplicados.addEventListener('click', function (evento) {
      const cerrar = evento.target.closest
        ? evento.target.closest('[data-cerrar="modal-duplicados"]')
        : null;
      if (cerrar || evento.target.id === 'modal-duplicados') {
        Estado.contactoDuplicadoPendiente = null;
      }
    });
  }
}

enlazarEventosDirectorio();
