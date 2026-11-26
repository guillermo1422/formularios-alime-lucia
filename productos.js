/* Formularios Alime-Lucia - Catálogo de productos con códigos de barras */

function buscarProductoLocal(codigo) {
  const buscado = normalizar(codigo);
  const digitos = soloDigitos(codigo);
  if (!buscado) return null;
  return (Estado.productos || []).filter(function (producto) {
    if (normalizar(producto.codigo_barras) === buscado) return true;
    return !!digitos && soloDigitos(producto.codigo_barras) === digitos;
  })[0] || null;
}

async function cargarProductos() {
  if (!Api.tieneSesion()) return Estado.productos || [];
  try {
    const lista = await Api.llamar('producto.listar', { incluir_inactivos: true });
    Estado.productos = Array.isArray(lista) ? lista : [];
  } catch (error) {
    Estado.productos = Estado.productos || [];
  }
  if (Estado.vista === 'configuracion') actualizarListaCatalogo();
  return Estado.productos;
}

function productosFiltrados() {
  const filtros = Estado.filtrosProductos || {};
  const busqueda = normalizar(filtros.texto || '');
  return (Estado.productos || []).filter(function (producto) {
    if (!filtros.incluir_inactivos && producto.activo === false) return false;
    if (!busqueda) return true;
    const campos = normalizar([
      producto.codigo_barras, producto.descripcion, producto.detalle
    ].join(' '));
    return campos.indexOf(busqueda) !== -1;
  }).sort(function (a, b) {
    return String(a.descripcion || '').localeCompare(String(b.descripcion || ''), 'es');
  });
}

function renderProductoCatalogo(producto) {
  const archivado = producto.activo === false;
  return '<div class="producto-item' + (archivado ? ' archivado' : '') + '">' +
    '<div class="producto-principal">' +
      '<span class="producto-codigo">Cód: ' + esc(producto.codigo_barras) + '</span>' +
      '<span class="producto-nombre">' + esc(producto.descripcion) + '</span>' +
      '<small>' + esc(producto.unidad || 'UN') + ' · ' +
        esc(formatearMoneda(producto.precio_unitario)) + ' · ' +
        (archivado ? 'Archivado' : 'Activo') + '</small>' +
    '</div>' +
    '<div class="producto-acciones">' +
      '<button class="btn btn-chico" type="button" data-accion="editar-producto" data-id="' +
        esc(producto.producto_id) + '">Editar</button>' +
      (archivado
        ? '<button class="btn btn-chico btn-secundario" type="button" data-accion="reactivar-producto" data-id="' +
          esc(producto.producto_id) + '">Reactivar</button>'
        : '<button class="btn btn-chico btn-peligro" type="button" data-accion="archivar-producto" data-id="' +
          esc(producto.producto_id) + '">Archivar</button>') +
    '</div>' +
  '</div>';
}

function actualizarListaCatalogo() {
  const cont = $('#lista-productos');
  if (!cont) return;
  const lista = productosFiltrados();
  const contador = $('#productos-contador');
  if (contador) contador.textContent = lista.length + ' producto(s) en el catálogo';

  if (!lista.length) {
    cont.innerHTML = '<div class="vacio">Todavía no hay productos cargados. ' +
      'Escaneá uno en un presupuesto o creá uno con «Nuevo producto».</div>';
    return;
  }

  cont.innerHTML = lista.map(renderProductoCatalogo).join('');
}

function seccionCatalogoProductos() {
  const filtros = Estado.filtrosProductos || {};
  return '<div class="seccion">' +
    '<div class="seccion-cabecera">' +
      '<div><h2>Catálogo de productos</h2>' +
        '<p>Códigos de barras disponibles para el escáner de presupuestos y pedidos.</p></div>' +
      '<button class="btn btn-primario" type="button" data-accion="nuevo-producto">Nuevo producto</button>' +
    '</div>' +
    '<div class="config-card">' +
      '<div class="filtros">' +
        '<div class="filtro-busqueda"><label for="filtro-producto-texto">Buscar</label>' +
          '<input id="filtro-producto-texto" type="search" placeholder="Código, descripción..." value="' +
            esc(filtros.texto || '') + '"></div>' +
        '<div><label for="filtro-producto-inactivos">Archivados</label>' +
          '<label class="check-inline"><input id="filtro-producto-inactivos" type="checkbox"' +
            (filtros.incluir_inactivos ? ' checked' : '') + '> Incluir</label></div>' +
      '</div>' +
      '<p id="productos-contador" class="nota"></p>' +
      '<div id="lista-productos" class="lista-productos"></div>' +
    '</div>' +
  '</div>';
}

/* ---------- Formulario de producto ---------- */

function poblarUnidadesProducto(valor) {
  const select = $('#producto-unidad');
  if (!select) return;
  const actual = String(valor || 'UN').toUpperCase();
  const unidades = unidadesDocumento().slice();
  if (unidades.indexOf(actual) === -1) unidades.push(actual);
  select.innerHTML = unidades.map(function (unidad) {
    return '<option value="' + esc(unidad) + '"' +
      (unidad === actual ? ' selected' : '') + '>' + esc(unidad) + '</option>';
  }).join('');
}

function abrirFormularioProducto(producto, opciones, callback) {
  const form = $('#form-producto');
  if (!form) return;

  if (typeof opciones === 'function') {
    callback = opciones;
    opciones = {};
  }
  const config = opciones || {};

  Estado.productoEnEdicion = producto || null;
  Estado.productoFormCallback = callback || null;
  Estado.productoFormOpciones = config;

  form.reset();
  $('#producto-id').value = producto ? (producto.producto_id || '') : '';
  $('#producto-codigo').value = producto
    ? (producto.codigo_barras || '')
    : (config.codigoInicial || '');
  $('#producto-descripcion').value = producto ? (producto.descripcion || '') : '';
  $('#producto-detalle').value = producto ? (producto.detalle || '') : '';
  $('#producto-precio').value = producto && Number(producto.precio_unitario)
    ? Number(producto.precio_unitario)
    : '';
  $('#producto-activo').checked = producto ? producto.activo !== false : true;
  poblarUnidadesProducto(producto ? producto.unidad : 'UN');

  $('#modal-producto-titulo').textContent = producto ? 'Editar producto' : 'Nuevo producto';
  $('#btn-guardar-producto').textContent = producto ? 'Guardar cambios' : 'Guardar producto';

  const btnSoloCodigo = $('#btn-producto-solo-codigo');
  if (btnSoloCodigo) {
    const mostrar = !producto && config.permiteSoloCodigo && typeof config.onSoloCodigo === 'function';
    btnSoloCodigo.classList.toggle('oculto', !mostrar);
  }

  mostrarErrorProducto('');
  abrirModal('modal-producto');
  setTimeout(function () {
    const foco = $('#producto-descripcion').value ? $('#producto-precio') : $('#producto-descripcion');
    if (foco) foco.focus();
  }, 60);
}

function leerFormularioProducto() {
  return {
    codigo_barras: $('#producto-codigo').value.trim(),
    descripcion: $('#producto-descripcion').value.trim(),
    detalle: $('#producto-detalle').value.trim(),
    unidad: $('#producto-unidad').value,
    precio_unitario: parsearNumero($('#producto-precio').value) || 0,
    activo: $('#producto-activo').checked
  };
}

function mostrarErrorProducto(mensaje) {
  const error = $('#producto-error');
  if (!error) return;
  error.textContent = mensaje || '';
  error.classList.toggle('oculto', !mensaje);
}

async function guardarProducto() {
  const boton = $('#btn-guardar-producto');
  const editando = !!Estado.productoEnEdicion;
  const datos = leerFormularioProducto();

  if (!datos.codigo_barras) {
    mostrarErrorProducto('Ingresá el código de barras.');
    $('#producto-codigo').focus();
    return;
  }
  if (!datos.descripcion) {
    mostrarErrorProducto('Ingresá la descripción del producto.');
    $('#producto-descripcion').focus();
    return;
  }

  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Guardando…';
  }
  mostrarErrorProducto('');

  const id = Estado.productoEnEdicion ? Estado.productoEnEdicion.producto_id : '';
  const payload = {
    producto: editando ? Object.assign({}, datos, { producto_id: id }) : datos
  };

  try {
    const guardado = editando
      ? await Api.llamar('producto.actualizar', payload)
      : await Api.llamar('producto.crear', payload);

    const lista = Estado.productos || [];
    const indice = lista.findIndex(function (producto) {
      return producto.producto_id === guardado.producto_id;
    });
    if (indice === -1) lista.push(guardado);
    else lista[indice] = guardado;
    Estado.productos = lista;

    const cb = Estado.productoFormCallback;
    cerrarModal('modal-producto');
    toast(editando ? 'Producto actualizado.' : 'Producto guardado.', 'ok');

    if (typeof cb === 'function') {
      cb(guardado);
    } else if (Estado.vista === 'configuracion') {
      actualizarListaCatalogo();
    }
  } catch (error) {
    if (error && error.codigo === 'CODIGO_DUPLICADO' && error.datos && error.datos.producto) {
      mostrarErrorProducto('Ese código ya está cargado: ' + error.datos.producto.descripcion);
    } else {
      mostrarErrorProducto(error && error.message ? error.message : 'No se pudo guardar el producto.');
      manejarError(error, 'producto.guardar');
    }
  } finally {
    const actual = $('#btn-guardar-producto');
    if (actual) {
      actual.disabled = false;
      actual.textContent = editando ? 'Guardar cambios' : 'Guardar producto';
    }
  }
}

function usarSoloCodigoProducto() {
  const opciones = Estado.productoFormOpciones;
  const cb = opciones && typeof opciones.onSoloCodigo === 'function' ? opciones.onSoloCodigo : null;
  cerrarModal('modal-producto');
  if (cb) cb();
}

async function archivarProductoUI(productoId) {
  const producto = (Estado.productos || []).filter(function (p) {
    return p.producto_id === productoId;
  })[0];
  if (!producto) return;

  const ok = await confirmar(
    'Archivar producto',
    'El producto «' + producto.descripcion + '» dejará de aparecer en el escáner. ' +
    '¿Querés archivarlo?',
    'Archivar'
  );
  if (!ok) return;

  try {
    const guardado = await Api.llamar('producto.archivar', {
      producto_id: productoId,
      motivo: 'Archivado desde la app'
    });
    Estado.productos = (Estado.productos || []).map(function (p) {
      return p.producto_id === guardado.producto_id ? guardado : p;
    });
    actualizarListaCatalogo();
    toast('Producto archivado.', 'ok');
  } catch (error) {
    manejarError(error, 'producto.archivar');
  }
}

async function reactivarProductoUI(productoId) {
  try {
    const guardado = await Api.llamar('producto.reactivar', { producto_id: productoId });
    Estado.productos = (Estado.productos || []).map(function (p) {
      return p.producto_id === guardado.producto_id ? guardado : p;
    });
    actualizarListaCatalogo();
    toast('Producto reactivado.', 'ok');
  } catch (error) {
    manejarError(error, 'producto.reactivar');
  }
}

/* ---------- Eventos ---------- */

function enlazarEventosProductos() {
  const form = $('#form-producto');
  if (form) {
    form.addEventListener('submit', function (evento) {
      evento.preventDefault();
      guardarProducto();
    });
  }

  const btnGuardar = $('#btn-guardar-producto');
  if (btnGuardar) {
    btnGuardar.addEventListener('click', function () {
      guardarProducto();
    });
  }

  const btnSoloCodigo = $('#btn-producto-solo-codigo');
  if (btnSoloCodigo) {
    btnSoloCodigo.addEventListener('click', usarSoloCodigoProducto);
  }

  const vista = $('#vista-configuracion');
  if (vista) {
    const buscarDebounce = debounce(function () {
      Estado.filtrosProductos.texto = $('#filtro-producto-texto')
        ? $('#filtro-producto-texto').value
        : '';
      actualizarListaCatalogo();
    }, 220);

    vista.addEventListener('click', function (evento) {
      const accion = evento.target.closest('[data-accion]');
      if (!accion) return;
      const tipo = accion.getAttribute('data-accion');
      const id = accion.getAttribute('data-id');

      if (tipo === 'nuevo-producto') {
        abrirFormularioProducto(null, {}, null);
      } else if (tipo === 'editar-producto') {
        const producto = (Estado.productos || []).filter(function (p) {
          return p.producto_id === id;
        })[0];
        if (producto) abrirFormularioProducto(producto, {}, null);
      } else if (tipo === 'archivar-producto') {
        archivarProductoUI(id);
      } else if (tipo === 'reactivar-producto') {
        reactivarProductoUI(id);
      }
    });

    vista.addEventListener('input', function (evento) {
      if (evento.target.id === 'filtro-producto-texto') buscarDebounce();
    });

    vista.addEventListener('change', function (evento) {
      if (evento.target.id === 'filtro-producto-inactivos') {
        Estado.filtrosProductos.incluir_inactivos = evento.target.checked;
        actualizarListaCatalogo();
      }
    });
  }
}

enlazarEventosProductos();
