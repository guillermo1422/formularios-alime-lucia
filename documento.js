/* Formularios Alime-Lucia - Editor de documentos */

const CONVERSIONES_DOCUMENTO = {
  PRESUPUESTO: ['ORDEN_TRABAJO', 'RECIBO_COBRO'],
  ORDEN_TRABAJO: ['ORDEN_COMPRA', 'RECIBO_COBRO'],
  SOLICITUD_PRESUPUESTO: ['ORDEN_COMPRA']
};

function estadoInicialDocumento(tipo) {
  const estados = estadosDocumento()[tipo];
  return estados && estados.length ? estados[0] : 'BORRADOR';
}

function validezDias() {
  const dias = Number(configValor('validez_dias', 15));
  return isFinite(dias) && dias > 0 ? dias : 15;
}

function empresaEditor(doc) {
  return empresaPorId(doc.empresa_id) || empresasActivas()[0] || Estado.empresas[0] || null;
}

function itemVacioEditor(tipo) {
  return {
    tipo_linea: tipo === 'ORDEN_TRABAJO' ? 'TAREA' : (tipo === 'RECIBO_COBRO' ? 'CONCEPTO' : 'ITEM'),
    cantidad: 1,
    unidad: 'UN',
    descripcion: '',
    detalle: '',
    precio_unitario: 0,
    subtotal: 0,
    codigo_barras: ''
  };
}

function itemManoObraEditor(tipo) {
  return {
    tipo_linea: tipo === 'ORDEN_TRABAJO' ? 'TAREA' : 'ITEM',
    cantidad: 1,
    unidad: 'SERVICIO',
    descripcion: 'Mano de obra',
    detalle: '',
    precio_unitario: 0,
    subtotal: 0
  };
}

function itemsInicialesEditor(tipo) {
  return [itemVacioEditor(tipo)];
}

function clonarItemEditor(item) {
  return {
    tipo_linea: item.tipo_linea || 'ITEM',
    cantidad: Number(item.cantidad) || 1,
    unidad: item.unidad || 'UN',
    descripcion: item.descripcion || '',
    detalle: item.detalle || '',
    precio_unitario: Number(item.precio_unitario) || 0,
    subtotal: Number(item.subtotal) || 0,
    codigo_barras: item.codigo_barras || codigoEnDetalle(item.detalle)
  };
}

function subtotalItemEditor(item) {
  if (!item) return 0;
  const cantidad = Number(item.cantidad) || 0;
  const precio = Number(item.precio_unitario) || 0;
  return Math.round((cantidad * precio + Number.EPSILON) * 100) / 100;
}

function sumaItemsEditor(items) {
  return Math.round(((items || []).reduce(function (total, item) {
    return total + subtotalItemEditor(item);
  }, 0) + Number.EPSILON) * 100) / 100;
}

function conPreciosEditor(tipo) {
  return tipo === 'PRESUPUESTO' || tipo === 'ORDEN_TRABAJO';
}

function conCantidadEditor(tipo) {
  return tipo !== 'RECIBO_COBRO';
}

/* ---------- Render del editor ---------- */

function renderEditor() {
  const cont = $('#vista-editor');
  if (!cont) return;

  const d = Estado.documento;
  if (!d || !d.doc) {
    cont.innerHTML = '<div class="vacio">No hay documento abierto. ' +
      '<button class="btn btn-texto" type="button" data-accion="volver-docs">Volver a documentos</button></div>';
    return;
  }

  const doc = d.doc;
  const empresa = empresaEditor(doc);
  const color = empresa && empresa.color ? empresa.color : '#0f2b46';
  const etiqueta = tituloTipo(doc.tipo, etiquetasDocumento());
  const estadoTexto = String(doc.estado || '').toUpperCase();
  const anulado = estadoTexto === 'ANULADO' || estadoTexto === 'ANULADA';
  const puedeEditar = d.esNuevo || doc.puede_editar !== false;
  const numero = doc.numero
    ? doc.numero
    : (d.numeroPrevisto ? 'N° ' + d.numeroPrevisto + ' (previsto)' : 'BORRADOR');

  const opcionesEmpresa = d.esNuevo
    ? '<label class="toolbar-campo">Empresa <select data-campo-doc="empresa_id">' +
      empresasActivas().map(function (e) {
        return '<option value="' + esc(e.empresa_id) + '"' +
          (e.empresa_id === doc.empresa_id ? ' selected' : '') + '>' +
          esc(e.nombre) + '</option>';
      }).join('') + '</select></label>'
    : '';

  const estados = (estadosDocumento()[doc.tipo] || []).slice();
  if (doc.estado && estados.indexOf(doc.estado) === -1) estados.push(doc.estado);
  const opcionesEstado = '<label class="toolbar-campo">Estado <select data-campo-doc="estado">' +
    estados.map(function (estado) {
      return '<option value="' + esc(estado) + '"' +
        (estado === doc.estado ? ' selected' : '') + '>' +
        esc(etiquetaEstado(estado)) + '</option>';
    }).join('') + '</select></label>';

  const opcionesCopia = doc.tipo === 'ORDEN_TRABAJO'
    ? '<label class="toolbar-campo">Copia <select data-campo-doc="copia">' +
      ['Original', 'Copia cliente', 'Copia técnico'].map(function (copia) {
        return '<option value="' + esc(copia) + '"' +
          (Estado.copia === copia ? ' selected' : '') + '>' +
          esc(copia) + '</option>';
      }).join('') + '</select></label>'
    : '';

  const conversiones = (!d.esNuevo && puedeEditar ? CONVERSIONES_DOCUMENTO[doc.tipo] : null) || [];
  const opcionesConvertir = conversiones.length
    ? '<select id="doc-convertir" class="toolbar-convertir" data-accion="convertir-doc">' +
      '<option value="">Convertir a…</option>' +
      conversiones.map(function (tipo) {
        return '<option value="' + esc(tipo) + '">' +
          esc(tituloTipo(tipo, etiquetasDocumento())) + '</option>';
      }).join('') + '</select>'
    : '';

  const acciones = ['<button class="btn btn-texto" type="button" data-accion="volver-docs">← Documentos</button>'];
  if (puedeEditar) {
    acciones.push('<button class="btn btn-primario" type="button" data-accion="guardar-doc">Guardar</button>');
  }
  acciones.push('<button class="btn" type="button" data-accion="imprimir-doc-editor">Imprimir</button>');
  acciones.push('<button class="btn" type="button" data-accion="duplicar-doc">Duplicar</button>');
  if (!d.esNuevo && puedeEditar) {
    acciones.push('<button class="btn btn-peligro" type="button" data-accion="anular-doc">Anular</button>');
  }

  cont.innerHTML =
    '<div class="editor-toolbar no-imprimir">' +
      '<div class="toolbar-titulo">' +
        '<strong>' + esc(etiqueta) + ' · ' + esc(numero) + '</strong>' +
        '<small>' + esc(empresa ? empresa.nombre : doc.empresa_id) + ' · ' +
          esc(etiquetaEstado(doc.estado)) + '</small>' +
      '</div>' +
      '<div class="toolbar-acciones">' +
        opcionesEmpresa + opcionesEstado + opcionesCopia + opcionesConvertir +
        acciones.join('') +
      '</div>' +
    '</div>' +

    (anulado ? '<div class="aviso-doc no-imprimir">Documento anulado: se puede imprimir, pero no modificar.</div>' : '') +

    '<div class="editor-lienzo">' +
      '<div id="hoja-doc" class="hoja' + (anulado ? ' hoja-anulada' : '') + '" ' +
        'style="--empresa-color:' + esc(color) + '">' +
        (anulado ? '<div class="marca-anulado"><span>ANULADO</span></div>' : '') +
        '<div class="hoja-contenido">' +
          encabezadoEditor(d, empresa, etiqueta, numero) +
          '<div class="hoja-linea"></div>' +
          (doc.tipo === 'RECIBO_COBRO' ? introReciboEditor(d) : '') +
          '<div class="hoja-meta">' +
            bloqueContactoEditor(d) +
            bloqueMetaEditor(d) +
          '</div>' +
          tablaItemsEditor(d) +
          bloqueTotalesEditor(d) +
          bloqueObservacionesEditor(d) +
          bloqueFirmasEditor(d) +
          pieEditor(d, empresa) +
        '</div>' +
      '</div>' +
    '</div>';
}

function encabezadoEditor(d, empresa, etiqueta, numero) {
  const logo = empresa ? rutaLogo(empresa) : 'assets/logo-alime.jpg';
  const clase = empresa ? claseLogo(empresa) : '';
  const telefono = empresa && empresa.telefono ? empresa.telefono : '261-7752029';
  const datos = datosEmpresaEditor(empresa);
  const copia = d.doc.tipo === 'ORDEN_TRABAJO' && Estado.copia !== 'Original'
    ? '<div class="hoja-copia">' + esc(Estado.copia) + '</div>'
    : '';

  return '<div class="hoja-encabezado">' +
    '<div class="hoja-marca">' +
      '<div class="hoja-logo-caja">' +
        '<img class="hoja-logo ' + esc(clase) + '" src="' + esc(logo) + '" alt="' +
          esc(empresa ? empresa.nombre : '') + '">' +
        '<div class="hoja-telefono">Tel: ' + esc(telefono) + '</div>' +
      '</div>' +
      '<div class="hoja-empresa-texto">' +
        '<div class="hoja-empresa-nombre">' + esc(empresa ? empresa.nombre : '') + '</div>' +
        (empresa && empresa.descripcion
          ? '<div class="hoja-empresa-desc">' + esc(empresa.descripcion) + '</div>'
          : '') +
        (datos ? '<div class="hoja-empresa-datos">' + datos + '</div>' : '') +
      '</div>' +
    '</div>' +
    '<div class="hoja-titulo-caja">' +
      '<div class="hoja-titulo">' + esc(etiqueta) + '</div>' +
      '<div class="hoja-numero">' + esc(numero) + '</div>' +
      '<div class="hoja-fecha">' + esc(formatearFecha(d.doc.fecha)) + '</div>' +
      copia +
    '</div>' +
  '</div>';
}

function ciudadesEmpresaEditor(empresa) {
  const configuradas = empresa && empresa.sucursales;
  if (Array.isArray(configuradas) && configuradas.length) return configuradas;
  if (typeof configuradas === 'string' && configuradas.trim()) {
    return configuradas.split(/[,;|]/).map(function (ciudad) {
      return ciudad.trim();
    }).filter(Boolean);
  }
  return ['Mendoza', 'San Rafael', 'Malargüe'];
}

function datosEmpresaEditor(empresa) {
  if (!empresa) return '';
  const general = [];
  if (empresa.cuit) general.push('CUIT: ' + empresa.cuit);
  if (empresa.condicion_iva) general.push(empresa.condicion_iva);

  const partes = [];
  if (general.length) partes.push('<div>' + general.map(esc).join(' · ') + '</div>');
  if (empresa.direccion) partes.push('<div>' + esc(empresa.direccion) + '</div>');

  const ciudades = ciudadesEmpresaEditor(empresa);
  partes.push('<div class="hoja-ubicaciones">' +
    ciudades.map(function (ciudad) {
      return '<span>' + esc(ciudad) + '</span>';
    }).join('') +
  '</div>');

  const contacto = [empresa.email, empresa.web].filter(Boolean);
  if (contacto.length) partes.push('<div>' + contacto.map(esc).join(' · ') + '</div>');
  return partes.join('');
}

function bloqueContactoEditor(d) {
  const contacto = d.contacto || {};
  const rol = d.doc.contacto_tipo || contactoPorDocumento()[d.doc.tipo] || 'CLIENTE';
  const etiqueta = String(rol).toUpperCase() === 'PROVEEDOR' ? 'Proveedor' : 'Cliente';
  const filas = [];
  const nombre = nombreContactoVisible(contacto);

  if (nombre) filas.push(['Nombre', nombre]);
  if (contacto.razon_social && contacto.razon_social !== nombre) {
    filas.push(['Razón social', contacto.razon_social]);
  }
  if (contacto.cuit_dni) filas.push(['CUIT / DNI', contacto.cuit_dni]);
  if (contacto.contacto) filas.push(['Contacto', contacto.contacto]);
  if (contacto.telefono) filas.push(['Teléfono', contacto.telefono]);
  if (contacto.email) filas.push(['Email', contacto.email]);
  if (contacto.direccion) filas.push(['Dirección', contacto.direccion]);
  const ubicacion = [contacto.localidad, contacto.provincia].filter(Boolean).join(', ');
  if (ubicacion) filas.push(['Localidad', ubicacion]);

  const filasHtml = filas.length
    ? filas.map(function (fila) {
      return '<div class="dato-linea">' +
        '<span class="dato-etiqueta">' + esc(fila[0]) + '</span>' +
        '<span class="dato-valor">' + esc(fila[1]) + '</span>' +
      '</div>';
    }).join('')
    : '<div class="dato-linea"><span class="dato-valor">Sin ' +
      esc(etiqueta.toLowerCase()) + ' seleccionado.</span></div>';

  return '<div class="bloque-datos">' +
    '<div class="bloque-datos-titulo">' + esc(etiqueta) + '</div>' +
    filasHtml +
    '<button class="btn btn-chico no-imprimir" type="button" data-accion="elegir-contacto">' +
      (filas.length ? 'Cambiar ' + esc(etiqueta.toLowerCase()) : 'Seleccionar ' + esc(etiqueta.toLowerCase())) +
    '</button>' +
  '</div>';
}

function bloqueMetaEditor(d) {
  const doc = d.doc;
  const filas = [campoFechaEditor('Fecha', 'fecha', doc.fecha)];

  if (doc.tipo === 'PRESUPUESTO') {
    filas.push(campoFechaEditor('Válido hasta', 'fecha_vencimiento', doc.fecha_vencimiento));
    filas.push(campoTextoEditor('Forma de pago', 'forma_pago', doc.forma_pago, 'Ej: transferencia'));
    filas.push(campoTextoEditor('Condiciones', 'condiciones', doc.condiciones, 'Condiciones comerciales'));
  } else if (doc.tipo === 'ORDEN_COMPRA') {
    filas.push(campoFechaEditor('Fecha requerida', 'fecha_requerida', doc.fecha_requerida));
    filas.push(campoTextoEditor('Condiciones', 'condiciones', doc.condiciones, 'Condiciones de compra'));
  } else if (doc.tipo === 'ORDEN_TRABAJO') {
    filas.push(campoFechaEditor('Inicio', 'fecha_inicio', doc.fecha_inicio));
    filas.push(campoFechaEditor('Entrega', 'fecha_entrega', doc.fecha_entrega));
    filas.push(campoTextoEditor('Técnico', 'tecnico', doc.tecnico, 'Nombre del técnico'));
    filas.push(campoTextoEditor('Dirección del trabajo', 'direccion_trabajo', doc.direccion_trabajo, 'Dirección'));
    filas.push(campoTextoEditor('Presupuesto N°', 'referencia_numero', doc.referencia_numero, 'N°'));
  } else if (doc.tipo === 'SOLICITUD_PRESUPUESTO') {
    filas.push(campoFechaEditor('Fecha requerida', 'fecha_requerida', doc.fecha_requerida));
    filas.push(campoTextoEditor('Condiciones', 'condiciones', doc.condiciones, 'Condiciones'));
  } else if (doc.tipo === 'RECIBO_COBRO') {
    filas.push(campoTextoEditor('Forma de pago', 'forma_pago', doc.forma_pago, 'Ej: efectivo'));
    filas.push(campoTextoEditor('Referencia', 'referencia_texto', doc.referencia_texto, 'Referencia'));
    filas.push(campoTextoEditor('N° referencia', 'referencia_numero', doc.referencia_numero, 'Número'));
  }

  return '<div class="bloque-datos">' +
    '<div class="bloque-datos-titulo">Datos del documento</div>' +
    filas.join('') +
  '</div>';
}

function campoFechaEditor(etiqueta, campo, valor) {
  return '<div class="dato-linea">' +
    '<span class="dato-etiqueta">' + esc(etiqueta) + '</span>' +
    '<span class="dato-valor">' +
      '<input type="date" class="campo-doc oculto-impresion" data-campo-doc="' + esc(campo) + '" value="' +
        esc(valor || '') + '">' +
      '<span class="solo-impresion">' + esc(formatearFecha(valor) || '—') + '</span>' +
    '</span>' +
  '</div>';
}

function campoTextoEditor(etiqueta, campo, valor, placeholder) {
  return '<div class="dato-linea">' +
    '<span class="dato-etiqueta">' + esc(etiqueta) + '</span>' +
    '<span class="dato-valor">' +
      '<input type="text" class="campo-doc" data-campo-doc="' + esc(campo) + '" value="' +
        esc(valor || '') + '" placeholder="' + esc(placeholder || '') + '">' +
    '</span>' +
  '</div>';
}

function introReciboEditor(d) {
  const monto = Number(d.doc.monto) || 0;
  return '<div class="recibo-intro">' +
    'Recibí de <strong>' + esc(nombreContactoVisible(d.contacto) || '________________') + '</strong> ' +
    'la suma de <strong data-monto-intro>' + esc(formatearMoneda(monto)) + '</strong>.' +
  '</div>';
}

function tablaItemsEditor(d) {
  const doc = d.doc;
  const conCantidad = conCantidadEditor(doc.tipo);
  const conPrecios = conPreciosEditor(doc.tipo);
  const columnas = (conCantidad ? 2 : 0) + 1 + (conPrecios ? 2 : 0) + 1;
  const tituloDescripcion = doc.tipo === 'RECIBO_COBRO' ? 'Concepto' : 'Descripción';

  let filas = d.items.map(function (item, indice) {
    return '<tr>' +
      (conCantidad
        ? '<td class="celda-numero">' + inputNumeroItemEditor(indice, 'cantidad', item.cantidad, '0.001') + '</td>' +
          '<td>' + selectUnidadEditor(indice, item.unidad) + '</td>'
        : '') +
      '<td class="celda-descripcion">' +
        inputTextoItemEditor(indice, 'descripcion', item.descripcion, tituloDescripcion, '') +
        inputTextoItemEditor(indice, 'detalle', item.detalle, 'Detalle (opcional)', 'campo-detalle') +
      '</td>' +
      (conPrecios
        ? '<td class="celda-numero">' + inputNumeroItemEditor(indice, 'precio_unitario', item.precio_unitario, '0.01') + '</td>' +
          '<td class="celda-numero" data-subtotal-item="' + indice + '">' +
            esc(formatearMoneda(subtotalItemEditor(item))) + '</td>'
        : '') +
      '<td class="celda-centro no-imprimir">' +
        '<button class="btn-quitar" type="button" data-accion="quitar-item" data-index="' + indice + '" title="Quitar">×</button>' +
      '</td>' +
    '</tr>';
  }).join('');

  if (doc.tipo === 'ORDEN_COMPRA') {
    filas = '<tr class="fila-referencia">' +
      '<td colspan="' + columnas + '">' +
        '<div class="referencia-linea">' +
          '<input type="text" class="campo-doc" data-campo-doc="referencia_texto" value="' +
            esc(doc.referencia_texto || '') + '" placeholder="Según presupuesto N°">' +
          '<input type="text" class="campo-doc" data-campo-doc="referencia_numero" value="' +
            esc(doc.referencia_numero || '') + '" placeholder="N°">' +
        '</div>' +
      '</td>' +
    '</tr>' + filas;
  }

  const textoAgregar = doc.tipo === 'RECIBO_COBRO' ? '+ Agregar concepto' : '+ Agregar ítem';
  const puedeEscanear = doc.tipo === 'PRESUPUESTO' || doc.tipo === 'SOLICITUD_PRESUPUESTO';

  return '<table class="hoja-tabla">' +
    '<thead><tr>' +
      (conCantidad ? '<th class="col-cantidad">Cant.</th><th class="col-unidad">Unidad</th>' : '') +
      '<th>' + esc(tituloDescripcion) + '</th>' +
      (conPrecios ? '<th class="col-precio">P. unit.</th><th class="col-subtotal">Subtotal</th>' : '') +
      '<th class="col-quitar no-imprimir"></th>' +
    '</tr></thead>' +
    '<tbody>' + filas + '</tbody>' +
  '</table>' +
  '<div class="acciones-items no-imprimir">' +
    '<button class="btn-agregar" type="button" data-accion="agregar-item">' +
      esc(textoAgregar) + '</button>' +
    (puedeEscanear
      ? '<button class="btn-agregar btn-escanear" type="button" data-accion="escanear-item">' +
        'Escanear código</button>'
      : '') +
    (empresaEditor(doc) && String(empresaEditor(doc).empresa_id).toUpperCase() === 'LUCIA' &&
      doc.tipo !== 'RECIBO_COBRO'
      ? '<button class="btn-agregar" type="button" data-accion="agregar-mano-obra">' +
        '+ Mano de obra</button>'
      : '') +
  '</div>';
}

function inputNumeroItemEditor(indice, campo, valor) {
  const numero = valor === undefined || valor === null ? '' : valor;
  return '<input type="text" class="campo-doc celda-numero" data-item-campo="' + esc(campo) +
    '" data-index="' + indice + '" value="' + (numero === '' ? '' : esc(numero)) +
    '" inputmode="decimal" autocomplete="off" placeholder="0">';
}

function inputTextoItemEditor(indice, campo, valor, placeholder, extraClase) {
  return '<input type="text" class="campo-doc ' + esc(extraClase || '') +
    '" data-item-campo="' + esc(campo) + '" data-index="' + indice + '" value="' +
    esc(valor || '') + '" placeholder="' + esc(placeholder || '') + '">';
}

function selectUnidadEditor(indice, valor) {
  const actual = String(valor || 'UN').toUpperCase();
  const unidades = unidadesDocumento();
  if (unidades.indexOf(actual) === -1) unidades.push(actual);
  return '<select class="campo-doc" data-item-campo="unidad" data-index="' + indice + '">' +
    unidades.map(function (unidad) {
      return '<option value="' + esc(unidad) + '"' +
        (unidad === actual ? ' selected' : '') + '>' + esc(unidad) + '</option>';
    }).join('') + '</select>';
}

function bloqueTotalesEditor(d) {
  const doc = d.doc;
  if (!conPreciosEditor(doc.tipo) && doc.tipo !== 'RECIBO_COBRO') return '';

  if (doc.tipo === 'RECIBO_COBRO') {
    const monto = Number(doc.monto) || 0;
    return '<div class="hoja-totales"><div class="totales-caja">' +
      '<div class="total-linea total-final">' +
        '<span class="total-etiqueta">Monto recibido</span>' +
        '<span class="total-valor">' +
          '<input type="text" class="campo-doc campo-importe oculto-impresion" data-total-input="monto" aria-label="Monto recibido" placeholder="Escribí el monto" value="' +
            (monto ? esc(monto) : '') + '" inputmode="decimal" autocomplete="off">' +
          '<span class="solo-impresion" data-monto-impresion>' + esc(formatearMoneda(monto)) + '</span>' +
        '</span>' +
      '</div>' +
    '</div></div>' +
    '<div class="monto-letras">Son: <strong data-monto-letras>' + esc(numeroALetras(monto)) + '</strong></div>';
  }

  const subtotal = sumaItemsEditor(d.items);
  if (doc.tipo === 'PRESUPUESTO') {
    return '<div class="hoja-totales"><div class="totales-caja">' +
      '<div class="total-linea">' +
        '<span class="total-etiqueta">Subtotal</span>' +
        '<span class="total-valor" data-total-subtotal>' + esc(formatearMoneda(subtotal)) + '</span>' +
      '</div>' +
      '<div class="total-linea total-final">' +
        '<span class="total-etiqueta">Total</span>' +
        '<span class="total-valor" data-total-final>' + esc(formatearMoneda(subtotal)) + '</span>' +
      '</div>' +
    '</div></div>';
  }

  const total = d.totalManual !== null
    ? Number(d.totalManual) || 0
    : (Number(doc.total) || subtotal);
  return '<div class="hoja-totales"><div class="totales-caja">' +
    '<div class="total-linea">' +
      '<span class="total-etiqueta">Subtotal tareas</span>' +
      '<span class="total-valor" data-total-subtotal>' + esc(formatearMoneda(subtotal)) + '</span>' +
    '</div>' +
    '<div class="total-linea total-final">' +
      '<span class="total-etiqueta">Total</span>' +
      '<span class="total-valor">' +
        '<input type="text" class="campo-doc campo-importe oculto-impresion" data-total-input="total" aria-label="Total" placeholder="Escribí el total" value="' +
          (Number(total) ? esc(total) : '') + '" inputmode="decimal" autocomplete="off">' +
        '<span class="solo-impresion" data-total-impresion>' + esc(formatearMoneda(total)) + '</span>' +
      '</span>' +
    '</div>' +
  '</div></div>';
}

function bloqueObservacionesEditor(d) {
  const doc = d.doc;
  const una = doc.tipo === 'RECIBO_COBRO' || doc.tipo === 'ORDEN_COMPRA' || doc.tipo === 'SOLICITUD_PRESUPUESTO';
  let html = '<div class="hoja-observaciones' + (una ? ' una' : '') + '">' +
    bloqueTextoEditor('Observaciones', 'observaciones', doc.observaciones);
  if (!una) {
    html += bloqueTextoEditor('Condiciones', 'condiciones', doc.condiciones);
  }
  return html + '</div>';
}

function bloqueTextoEditor(titulo, campo, valor) {
  return '<div class="bloque-texto">' +
    '<div class="bloque-texto-titulo">' + esc(titulo) + '</div>' +
    '<textarea class="campo-doc" data-campo-doc="' + esc(campo) + '" rows="3" placeholder="' +
      esc(titulo) + '">' + esc(valor || '') + '</textarea>' +
  '</div>';
}

function bloqueFirmasEditor(d) {
  const doc = d.doc;

  if (doc.tipo === 'ORDEN_TRABAJO') {
    return '<div class="firmas">' +
      '<div class="firma">' +
        '<div class="linea-firma">Firma del cliente</div>' +
        '<div class="nota">' + esc(nombreContactoVisible(d.contacto)) + '</div>' +
      '</div>' +
      '<div class="firma">' +
        '<div class="linea-firma">Firma del técnico</div>' +
        '<div class="nota">' + esc(doc.tecnico || '') + '</div>' +
      '</div>' +
    '</div>';
  }

  if (doc.tipo === 'RECIBO_COBRO') {
    const empresa = empresaEditor(doc);
    return '<div class="firmas firmas-una">' +
      '<div class="firma">' +
        '<div class="linea-firma">Recibí conforme</div>' +
        '<div class="nota">' + esc(empresa ? empresa.nombre : '') + '</div>' +
      '</div>' +
    '</div>';
  }

  return '';
}

function pieEditor(d, empresa) {
  const claves = {
    PRESUPUESTO: 'pie_presupuesto',
    ORDEN_COMPRA: 'pie_orden_compra',
    ORDEN_TRABAJO: 'pie_orden_trabajo',
    SOLICITUD_PRESUPUESTO: 'pie_solicitud',
    RECIBO_COBRO: 'pie_recibo'
  };
  const texto = configValor(claves[d.doc.tipo] || '', '');
  const impuestos = configValor('texto_impuestos', '');
  return '<div class="hoja-pie">' +
    (texto ? '<div>' + esc(texto) + '</div>' : '') +
    '<div><strong>' + esc(empresa ? empresa.nombre : '') + '</strong>' +
      (impuestos ? ' · ' + esc(impuestos) : '') +
      ' · Documento generado con Formularios Alime-Lucia</div>' +
  '</div>';
}

/* ---------- Estado y eventos del editor ---------- */

function mostrarEditor() {
  Estado.vista = 'editor';
  actualizarNav();
  mostrarSoloVista('editor');
  renderEditor();
}

function enlazarEventosEditor() {
  const vista = $('#vista-editor');
  if (!vista) return;

  vista.addEventListener('click', function (evento) {
    const accion = evento.target.closest('[data-accion]');
    if (!accion) return;
    const tipo = accion.getAttribute('data-accion');

    if (tipo === 'volver-docs') {
      cambiarVista('documentos');
    } else if (tipo === 'guardar-doc') {
      guardarDocumento({});
    } else if (tipo === 'imprimir-doc-editor') {
      imprimirDocumento();
    } else if (tipo === 'duplicar-doc') {
      duplicarDocumento();
    } else if (tipo === 'anular-doc') {
      anularDocumentoEditor();
    } else if (tipo === 'agregar-item') {
      agregarItemEditor();
    } else if (tipo === 'agregar-mano-obra') {
      agregarManoObraEditor();
    } else if (tipo === 'escanear-item') {
      if (typeof abrirEscanerParaDocumento === 'function') {
        abrirEscanerParaDocumento();
      } else {
        toast('El lector de códigos no está disponible.', 'error');
      }
    } else if (tipo === 'quitar-item') {
      quitarItemEditor(Number(accion.getAttribute('data-index')));
    } else if (tipo === 'elegir-contacto') {
      elegirContactoEditor();
    }
  });

  vista.addEventListener('input', function (evento) {
    const campo = evento.target.getAttribute('data-campo-doc');
    if (campo) {
      actualizarCampoDocEditor(campo, evento.target.value);
      if (evento.target.type === 'date') {
        actualizarSpanFechaEditor(evento.target, evento.target.value);
      }
      return;
    }

    const itemCampo = evento.target.getAttribute('data-item-campo');
    if (itemCampo) {
      actualizarItemCampoEditor(evento.target, itemCampo);
      return;
    }

    const totalCampo = evento.target.getAttribute('data-total-input');
    if (totalCampo) actualizarTotalCampoEditor(totalCampo, evento.target.value);
  });

  vista.addEventListener('change', function (evento) {
    const campo = evento.target.getAttribute('data-campo-doc');
    if (campo === 'empresa_id') {
      cambiarEmpresaEditor(evento.target.value);
      return;
    }
    if (campo === 'estado') {
      cambiarEstadoEditor(evento.target.value);
      return;
    }
    if (campo === 'copia') {
      cambiarCopiaEditor(evento.target.value);
      return;
    }
    if (campo) {
      actualizarCampoDocEditor(campo, evento.target.value);
      if (evento.target.type === 'date') {
        actualizarSpanFechaEditor(evento.target, evento.target.value);
        if (campo === 'fecha') manejarCambioFechaEditor();
      }
      return;
    }

    const itemCampo = evento.target.getAttribute('data-item-campo');
    if (itemCampo) {
      actualizarItemCampoEditor(evento.target, itemCampo);
      return;
    }

    const accion = evento.target.getAttribute('data-accion');
    if (accion === 'convertir-doc') {
      const destino = evento.target.value;
      evento.target.value = '';
      if (destino) convertirDocumento(destino);
    }
  });
}

function actualizarCampoDocEditor(campo, valor) {
  const d = Estado.documento;
  if (!d) return;
  d.doc[campo] = valor;
  if (campo === 'fecha_vencimiento') d.vencimientoManual = true;
  Estado.hayCambios = true;
}

function actualizarSpanFechaEditor(input, valor) {
  const contenedor = input.parentNode;
  if (!contenedor) return;
  const span = contenedor.querySelector('.solo-impresion');
  if (span) span.textContent = formatearFecha(valor) || '—';
}

function manejarCambioFechaEditor() {
  const d = Estado.documento;
  if (!d || d.doc.tipo !== 'PRESUPUESTO' || d.vencimientoManual) return;
  d.doc.fecha_vencimiento = sumarDiasISO(d.doc.fecha, validezDias());
  const input = $('[data-campo-doc="fecha_vencimiento"]', $('#vista-editor'));
  if (input) {
    input.value = d.doc.fecha_vencimiento;
    actualizarSpanFechaEditor(input, d.doc.fecha_vencimiento);
  }
}

function actualizarItemCampoEditor(input, campo) {
  const d = Estado.documento;
  if (!d) return;
  const indice = Number(input.getAttribute('data-index'));
  const item = d.items[indice];
  if (!item) return;

  if (campo === 'cantidad' || campo === 'precio_unitario') {
    item[campo] = parsearNumero(input.value) || 0;
    item.subtotal = subtotalItemEditor(item);
    const celda = $('[data-subtotal-item="' + indice + '"]', $('#vista-editor'));
    if (celda) celda.textContent = formatearMoneda(item.subtotal);
    actualizarTotalesUI();
  } else {
    item[campo] = input.value;
  }
  Estado.hayCambios = true;
}

function actualizarTotalCampoEditor(campo, valor) {
  const d = Estado.documento;
  if (!d) return;
  const numero = parsearNumero(valor);

  if (campo === 'total') {
    d.totalManual = numero;
    d.doc.total = numero === null ? sumaItemsEditor(d.items) : numero;
  } else if (campo === 'monto') {
    d.montoManual = numero === null ? 0 : numero;
    d.doc.monto = d.montoManual;
  }
  Estado.hayCambios = true;
  actualizarTotalesUI();
}

function actualizarTotalesUI() {
  const d = Estado.documento;
  const vista = $('#vista-editor');
  if (!d || !vista) return;
  const doc = d.doc;
  const subtotal = sumaItemsEditor(d.items);

  $$('[data-total-subtotal]', vista).forEach(function (el) {
    el.textContent = formatearMoneda(subtotal);
  });

  if (doc.tipo === 'PRESUPUESTO') {
    doc.total = subtotal;
    $$('[data-total-final]', vista).forEach(function (el) {
      el.textContent = formatearMoneda(subtotal);
    });
  } else if (doc.tipo === 'ORDEN_TRABAJO') {
    if (d.totalManual === null) doc.total = subtotal;
    const total = Number(doc.total) || 0;
    const input = $('[data-total-input="total"]', vista);
    if (input && document.activeElement !== input) {
      input.value = total ? total : '';
    }
    const impresion = $('[data-total-impresion]', vista);
    if (impresion) impresion.textContent = formatearMoneda(total);
  } else if (doc.tipo === 'RECIBO_COBRO') {
    const monto = Number(doc.monto) || 0;
    const letras = $('[data-monto-letras]', vista);
    if (letras) letras.textContent = numeroALetras(monto);
    const intro = $('[data-monto-intro]', vista);
    if (intro) intro.textContent = formatearMoneda(monto);
    const impresion = $('[data-monto-impresion]', vista);
    if (impresion) impresion.textContent = formatearMoneda(monto);
  }
}

function cambiarEmpresaEditor(empresaId) {
  const d = Estado.documento;
  if (!d || !d.esNuevo) return;
  d.doc.empresa_id = String(empresaId || '').toUpperCase();
  Estado.hayCambios = true;
  renderEditor();
  cargarNumeroPrevisto();
}

async function cambiarEstadoEditor(estado) {
  const d = Estado.documento;
  if (!d) return;

  if (d.esNuevo) {
    d.doc.estado = estado;
    Estado.hayCambios = true;
    renderEditor();
    return;
  }

  if (Estado.hayCambios) {
    const guardado = await guardarDocumento({ silencioso: true });
    if (!guardado) {
      renderEditor();
      return;
    }
  }

  try {
    const detalle = await Api.llamar('documento.estado', {
      documento_id: Estado.documento.doc.documento_id,
      estado: estado,
      motivo: 'Cambio desde la app'
    });
    cargarDetalleEnEditor(detalle, false);
    renderEditor();
    toast('Estado actualizado.', 'ok');
    refrescarResumenSilencioso();
  } catch (error) {
    manejarError(error, 'documento.estado');
    renderEditor();
  }
}

function cambiarCopiaEditor(copia) {
  Estado.copia = copia || 'Original';
  renderEditor();
}

function elegirContactoEditor() {
  const d = Estado.documento;
  if (!d) return;
  const rol = contactoPorDocumento()[d.doc.tipo] || 'CLIENTE';
  abrirSelectorContacto(rol, function (contacto) {
    aplicarContactoEditor(contacto);
  });
}

function aplicarContactoEditor(contacto) {
  const d = Estado.documento;
  if (!d || !contacto) return;
  d.contacto = contacto;
  d.doc.contacto_id = contacto.contacto_id;
  d.doc.contacto_tipo = contactoPorDocumento()[d.doc.tipo] || '';
  d.doc.contacto_nombre = nombreContactoVisible(contacto);
  if (d.doc.tipo === 'ORDEN_TRABAJO' && !d.doc.direccion_trabajo) {
    d.doc.direccion_trabajo = contacto.direccion || '';
  }
  Estado.hayCambios = true;
  renderEditor();
}

function agregarItemEditor() {
  const d = Estado.documento;
  if (!d) return;
  d.items.push(itemVacioEditor(d.doc.tipo));
  Estado.hayCambios = true;
  renderEditor();
  const inputs = $$('[data-item-campo="descripcion"]', $('#vista-editor'));
  const ultimo = inputs[inputs.length - 1];
  if (ultimo) ultimo.focus();
}

function agregarManoObraEditor() {
  const d = Estado.documento;
  if (!d) return;
  d.items.push(itemManoObraEditor(d.doc.tipo));
  Estado.hayCambios = true;
  renderEditor();
  const inputs = $$('[data-item-campo="descripcion"]', $('#vista-editor'));
  const ultimo = inputs[inputs.length - 1];
  if (ultimo) ultimo.focus();
}

function quitarItemEditor(indice) {
  const d = Estado.documento;
  if (!d) return;
  if (d.items.length <= 1) {
    d.items[0] = itemVacioEditor(d.doc.tipo);
  } else {
    d.items.splice(indice, 1);
  }
  Estado.hayCambios = true;
  renderEditor();
}

function itemsValidosEditor(d) {
  return d.items.filter(function (item) {
    return String(item.descripcion || '').trim();
  }).map(function (item) {
    return {
      tipo_linea: item.tipo_linea || 'ITEM',
      cantidad: Number(item.cantidad) || 1,
      unidad: item.unidad || 'UN',
      descripcion: String(item.descripcion).trim(),
      detalle: item.detalle || '',
      precio_unitario: conPreciosEditor(d.doc.tipo) ? (Number(item.precio_unitario) || 0) : 0
    };
  });
}

function validarDocumentoEditor(d) {
  const doc = d.doc;
  const rol = contactoPorDocumento()[doc.tipo] || 'CLIENTE';

  if (!doc.contacto_id) {
    return 'Seleccioná el ' + (rol === 'PROVEEDOR' ? 'proveedor' : 'cliente') + ' del documento.';
  }
  if (!doc.fecha) return 'Ingresá la fecha del documento.';

  const items = itemsValidosEditor(d);
  if (doc.tipo === 'RECIBO_COBRO') {
    if (!(Number(doc.monto) > 0)) return 'Ingresá el monto del recibo.';
    return '';
  }
  if (doc.tipo === 'ORDEN_TRABAJO') {
    if (!items.length && !(Number(doc.total) > 0)) {
      return 'Agregá al menos una tarea o un total.';
    }
    return '';
  }
  if (!items.length) return 'Agregá al menos un ítem con descripción.';
  return '';
}

async function guardarDocumento(opciones) {
  const d = Estado.documento;
  if (!d) return false;
  const silencioso = !!(opciones && opciones.silencioso);
  const doc = d.doc;
  const estadoTexto = String(doc.estado || '').toUpperCase();
  const anulado = estadoTexto === 'ANULADO' || estadoTexto === 'ANULADA';

  if (anulado && !d.esNuevo) {
    toast('El documento está anulado y no se puede modificar.', 'error');
    return false;
  }

  const errorValidacion = validarDocumentoEditor(d);
  if (errorValidacion) {
    toast(errorValidacion, 'error');
    return false;
  }

  const boton = $('[data-accion="guardar-doc"]', $('#vista-editor'));
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Guardando…';
  }

  const payloadDoc = {
    empresa_id: doc.empresa_id,
    tipo: doc.tipo,
    estado: doc.estado,
    fecha: doc.fecha,
    fecha_vencimiento: doc.fecha_vencimiento || '',
    fecha_entrega: doc.fecha_entrega || '',
    fecha_requerida: doc.fecha_requerida || '',
    fecha_inicio: doc.fecha_inicio || '',
    contacto_id: doc.contacto_id,
    direccion_trabajo: doc.direccion_trabajo || '',
    tecnico: doc.tecnico || '',
    referencia_texto: doc.referencia_texto || '',
    referencia_numero: doc.referencia_numero || '',
    moneda: doc.moneda || 'ARS',
    forma_pago: doc.forma_pago || '',
    condiciones: doc.condiciones || '',
    observaciones: doc.observaciones || '',
    documento_origen_id: doc.documento_origen_id || ''
  };
  if (doc.documento_id) payloadDoc.documento_id = doc.documento_id;
  if (doc.tipo === 'ORDEN_TRABAJO') payloadDoc.total = Number(doc.total) || 0;
  if (doc.tipo === 'RECIBO_COBRO') payloadDoc.monto = Number(doc.monto) || 0;

  const payload = {
    documento: payloadDoc,
    items: itemsValidosEditor(d)
  };

  try {
    const respuesta = doc.documento_id
      ? await Api.llamar('documento.actualizar', payload)
      : await Api.llamar('documento.crear', payload);
    cargarDetalleEnEditor(respuesta, false);
    renderEditor();
    if (!silencioso) {
      toast(doc.documento_id ? 'Documento guardado.' : 'Documento creado.', 'ok');
    }
    refrescarResumenSilencioso();
    return true;
  } catch (error) {
    manejarError(error, 'documento.guardar');
    return false;
  } finally {
    const actual = $('[data-accion="guardar-doc"]', $('#vista-editor'));
    if (actual) {
      actual.disabled = false;
      actual.textContent = 'Guardar';
    }
  }
}

async function imprimirDocumento() {
  const d = Estado.documento;
  if (!d) return;
  if (d.esNuevo || Estado.hayCambios) {
    const guardado = await guardarDocumento({ silencioso: true });
    if (!guardado) return;
  }
  setTimeout(function () { window.print(); }, 150);
}

async function anularDocumentoEditor() {
  const d = Estado.documento;
  if (!d) return;
  if (d.esNuevo) {
    toast('Guardá el documento antes de anularlo.', 'error');
    return;
  }

  const ok = await confirmar(
    'Anular documento',
    'El documento quedará marcado como anulado y no se podrá modificar. ¿Querés anularlo?',
    'Anular'
  );
  if (!ok) return;

  try {
    const detalle = await Api.llamar('documento.anular', {
      documento_id: d.doc.documento_id,
      motivo: 'Anulado desde la app'
    });
    cargarDetalleEnEditor(detalle, false);
    renderEditor();
    toast('Documento anulado.', 'ok');
    refrescarResumenSilencioso();
  } catch (error) {
    manejarError(error, 'documento.anular');
  }
}

async function duplicarDocumento() {
  const d = Estado.documento;
  if (!d) return;

  if (Estado.hayCambios) {
    const ok = await confirmar(
      'Duplicar documento',
      'Se creará un nuevo borrador con los datos actuales. Los cambios sin guardar del documento actual se perderán.',
      'Duplicar'
    );
    if (!ok) return;
  }

  const opciones = {
    items: d.items.map(clonarItemEditor),
    contacto: d.contacto,
    totalManual: d.totalManual,
    montoManual: d.montoManual,
    tecnico: d.doc.tecnico,
    direccion_trabajo: d.doc.direccion_trabajo,
    referencia_texto: d.doc.referencia_texto,
    referencia_numero: d.doc.referencia_numero,
    forma_pago: d.doc.forma_pago,
    condiciones: d.doc.condiciones,
    observaciones: d.doc.observaciones,
    monto: d.doc.monto,
    total: d.doc.total,
    documento_origen_id: ''
  };

  Estado.hayCambios = false;
  const creado = await nuevoDocumento(d.doc.empresa_id, d.doc.tipo, d.contacto, opciones);
  if (creado) toast('Borrador duplicado. Guardalo para asignarle número.', 'ok');
}

async function convertirDocumento(tipoDestino) {
  const d = Estado.documento;
  if (!d) return;
  const destino = String(tipoDestino || '').toUpperCase();
  const permitidos = CONVERSIONES_DOCUMENTO[d.doc.tipo] || [];
  if (permitidos.indexOf(destino) === -1) return;

  if (d.esNuevo) {
    toast('Guardá el documento antes de convertirlo.', 'error');
    return;
  }

  if (Estado.hayCambios) {
    const ok = await confirmar(
      'Cambios sin guardar',
      'Se perderán los cambios que no guardaste. ¿Querés convertirlo igual?',
      'Convertir'
    );
    if (!ok) return;
    Estado.hayCambios = false;
  }

  const rol = contactoPorDocumento()[destino];
  if (!contactoCoincideRol(d.contacto, rol)) {
    abrirSelectorContacto(rol, function (contacto) {
      ejecutarConversion(destino, contacto);
    });
    return;
  }
  ejecutarConversion(destino, d.contacto);
}

function ejecutarConversion(tipoDestino, contacto) {
  const d = Estado.documento;
  if (!d) return;
  const origen = d.doc;
  const tipoOrigen = origen.tipo;
  const numeroOrigen = origen.numero || '';
  const opciones = {
    contacto: contacto,
    items: d.items.map(clonarItemEditor),
    totalManual: d.totalManual,
    montoManual: d.montoManual,
    tecnico: origen.tecnico,
    direccion_trabajo: origen.direccion_trabajo,
    forma_pago: origen.forma_pago,
    condiciones: origen.condiciones,
    observaciones: origen.observaciones,
    documento_origen_id: origen.documento_id,
    referencia_texto: '',
    referencia_numero: numeroOrigen
  };

  if (tipoDestino === 'ORDEN_COMPRA') {
    opciones.referencia_texto = tipoOrigen === 'ORDEN_TRABAJO'
      ? 'Según orden de trabajo N°'
      : 'Según solicitud N°';
    opciones.items = d.items.map(function (item) {
      const clon = clonarItemEditor(item);
      clon.precio_unitario = 0;
      clon.subtotal = 0;
      return clon;
    });
  } else if (tipoDestino === 'ORDEN_TRABAJO') {
    opciones.referencia_texto = 'Según presupuesto N°';
    opciones.totalManual = d.totalManual !== null ? d.totalManual : (Number(origen.total) || null);
    opciones.total = Number(origen.total) || 0;
    opciones.direccion_trabajo = origen.direccion_trabajo || (contacto && contacto.direccion) || '';
  } else if (tipoDestino === 'RECIBO_COBRO') {
    const monto = Number(origen.total) || Number(origen.monto) || 0;
    const etiquetaOrigen = tipoOrigen === 'ORDEN_TRABAJO' ? 'orden de trabajo' : 'presupuesto';
    opciones.referencia_texto = tipoOrigen === 'ORDEN_TRABAJO'
      ? 'Según orden de trabajo N°'
      : 'Según presupuesto N°';
    opciones.montoManual = monto;
    opciones.monto = monto;
    opciones.items = [{
      tipo_linea: 'CONCEPTO',
      cantidad: 1,
      unidad: 'UN',
      descripcion: 'Cobro según ' + etiquetaOrigen + ' N° ' + numeroOrigen,
      detalle: '',
      precio_unitario: 0,
      subtotal: 0
    }];
  }

  Estado.hayCambios = false;
  nuevoDocumento(origen.empresa_id, tipoDestino, contacto, opciones).then(function (creado) {
    if (creado) {
      toast('Borrador de ' + tituloTipo(tipoDestino, etiquetasDocumento()) +
        ' creado. Guardalo para asignarle número.', 'ok');
    }
  });
}

async function nuevoDocumento(empresaId, tipo, contacto, opciones) {
  if (Estado.vista === 'editor' && Estado.hayCambios) {
    const continuar = await confirmar(
      'Cambios sin guardar',
      'Si continuás se perderán los cambios que no guardaste. ¿Querés continuar?',
      'Continuar'
    );
    if (!continuar) return false;
  }

  const empresa = empresaPorId(empresaId) || empresasActivas()[0] || Estado.empresas[0];
  if (!empresa) {
    toast('No hay empresas activas.', 'error');
    return false;
  }

  const tipoFinal = String(tipo || 'PRESUPUESTO').toUpperCase();
  if (tiposDocumento().indexOf(tipoFinal) === -1) {
    toast('El tipo de documento no es válido.', 'error');
    return false;
  }

  const datos = opciones || {};
  if (datos.contacto) contacto = datos.contacto;
  const fecha = hoyISO();
  const doc = {
    documento_id: '',
    numero: '',
    empresa_id: empresa.empresa_id,
    tipo: tipoFinal,
    estado: estadoInicialDocumento(tipoFinal),
    fecha: fecha,
    fecha_vencimiento: tipoFinal === 'PRESUPUESTO' ? sumarDiasISO(fecha, validezDias()) : '',
    fecha_entrega: '',
    fecha_requerida: '',
    fecha_inicio: '',
    contacto_id: contacto ? contacto.contacto_id : '',
    contacto_tipo: contactoPorDocumento()[tipoFinal] || '',
    contacto_nombre: contacto ? nombreContactoVisible(contacto) : '',
    contacto_snapshot: {},
    direccion_trabajo: tipoFinal === 'ORDEN_TRABAJO' && contacto ? (contacto.direccion || '') : '',
    tecnico: '',
    referencia_texto: tipoFinal === 'ORDEN_COMPRA' ? 'Según presupuesto N°' : '',
    referencia_numero: '',
    moneda: 'ARS',
    subtotal: 0,
    total: 0,
    monto: 0,
    monto_letras: '',
    forma_pago: '',
    condiciones: '',
    observaciones: '',
    documento_origen_id: '',
    puede_editar: true
  };

  Object.keys(datos).forEach(function (clave) {
    if (clave === 'items' || clave === 'contacto' || clave === 'totalManual' ||
        clave === 'montoManual' || clave === 'origen') return;
    if (datos[clave] !== undefined) doc[clave] = datos[clave];
  });

  const items = Array.isArray(datos.items) && datos.items.length
    ? datos.items.map(clonarItemEditor)
    : itemsInicialesEditor(tipoFinal);

  if (contacto) {
    doc.contacto_id = contacto.contacto_id;
    doc.contacto_tipo = contactoPorDocumento()[tipoFinal] || '';
    doc.contacto_nombre = nombreContactoVisible(contacto);
    if (tipoFinal === 'ORDEN_TRABAJO' && !doc.direccion_trabajo) {
      doc.direccion_trabajo = contacto.direccion || '';
    }
  }

  const suma = sumaItemsEditor(items);
  let totalManual = datos.totalManual !== undefined ? datos.totalManual : null;
  if (totalManual === null && tipoFinal === 'ORDEN_TRABAJO' && Number(doc.total) > 0 &&
      Math.abs(Number(doc.total) - suma) > 0.009) {
    totalManual = Number(doc.total);
  }

  Estado.documento = {
    doc: doc,
    items: items,
    contacto: contacto || null,
    origen: datos.origen || null,
    totalManual: totalManual,
    montoManual: datos.montoManual !== undefined ? datos.montoManual : null,
    vencimientoManual: false,
    contactoCambiado: false,
    esNuevo: true,
    numeroPrevisto: ''
  };
  Estado.copia = 'Original';
  Estado.hayCambios = true;
  mostrarEditor();
  cargarNumeroPrevisto();
  return true;
}

function cargarDetalleEnEditor(detalle, esNuevo) {
  const doc = detalle && detalle.documento ? detalle.documento : null;
  if (!doc) {
    toast('No se pudo cargar el documento.', 'error');
    return;
  }

  const items = (detalle.items || []).filter(function (item) {
    return String(item.tipo_linea || '').toUpperCase() !== 'REFERENCIA';
  }).map(clonarItemEditor);
  if (!items.length) items.push(itemVacioEditor(doc.tipo));

  const contacto = detalle.contacto || detalle.contacto_snapshot || null;
  const suma = sumaItemsEditor(items);
  let totalManual = null;
  if (doc.tipo === 'ORDEN_TRABAJO' && Math.abs((Number(doc.total) || 0) - suma) > 0.009) {
    totalManual = Number(doc.total) || 0;
  }
  const montoManual = doc.tipo === 'RECIBO_COBRO' ? (Number(doc.monto) || 0) : null;

  Estado.documento = {
    doc: doc,
    items: items,
    contacto: contacto,
    origen: detalle.origen || null,
    totalManual: totalManual,
    montoManual: montoManual,
    vencimientoManual: false,
    contactoCambiado: false,
    esNuevo: !!esNuevo,
    numeroPrevisto: ''
  };
  Estado.copia = 'Original';
  Estado.hayCambios = false;
}

async function abrirDocumento(id, imprimir) {
  if (!id) return;

  if (Estado.vista === 'editor' && Estado.hayCambios) {
    const continuar = await confirmar(
      'Cambios sin guardar',
      'Si abrís otro documento se perderán los cambios que no guardaste. ¿Querés continuar?',
      'Abrir otro'
    );
    if (!continuar) return;
  }

  try {
    const detalle = await Api.llamar('documento.obtener', { documento_id: id });
    cargarDetalleEnEditor(detalle, false);
    mostrarEditor();
    if (imprimir) setTimeout(function () { window.print(); }, 250);
  } catch (error) {
    manejarError(error, 'documento.obtener');
  }
}

async function cargarNumeroPrevisto() {
  const d = Estado.documento;
  if (!d || !d.esNuevo) return;
  const empresaId = d.doc.empresa_id;
  const tipo = d.doc.tipo;

  try {
    const data = await Api.llamar('documento.siguiente_numero', {
      empresa_id: empresaId,
      tipo: tipo
    });
    const actual = Estado.documento;
    if (!actual || !actual.esNuevo) return;
    if (actual.doc.empresa_id !== empresaId || actual.doc.tipo !== tipo) return;
    actual.numeroPrevisto = data && data.numero ? data.numero : '';
    const el = $('#hoja-doc .hoja-numero');
    if (el && actual.numeroPrevisto) {
      el.textContent = 'N° ' + actual.numeroPrevisto + ' (previsto)';
    }
  } catch (error) {
    /* la previsualización del número es opcional */
  }
}

async function refrescarResumenSilencioso() {
  try {
    Estado.resumen = await Api.llamar('resumen');
  } catch (error) {
    /* el resumen se actualiza en la próxima conexión */
  }
}

enlazarEventosEditor();
