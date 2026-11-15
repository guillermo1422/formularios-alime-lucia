/* Formularios Alime-Lucia - Utilidades de interfaz */

function esc(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizar(texto) {
  return String(texto === null || texto === undefined ? '' : texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function soloDigitos(texto) {
  return String(texto || '').replace(/\D+/g, '');
}

function fechaISO(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dia;
}

function hoyISO() {
  return fechaISO(new Date());
}

function sumarDiasISO(iso, dias) {
  const partes = String(iso || '').split('-').map(Number);
  if (partes.length !== 3 || !partes[0]) return '';
  const d = new Date(partes[0], partes[1] - 1, partes[2], 12, 0, 0);
  d.setDate(d.getDate() + (Number(dias) || 0));
  return fechaISO(d);
}

function formatearFecha(iso) {
  const texto = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  return texto.slice(8, 10) + '/' + texto.slice(5, 7) + '/' + texto.slice(0, 4);
}

function formatearFechaHora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return String(valor);
  return String(d.getDate()).padStart(2, '0') + '/' +
    String(d.getMonth() + 1).padStart(2, '0') + '/' +
    d.getFullYear() + ' ' +
    String(d.getHours()).padStart(2, '0') + ':' +
    String(d.getMinutes()).padStart(2, '0');
}

function formatearNumero(valor, decimales) {
  const n = Number(valor);
  const dec = decimales === undefined ? 2 : decimales;
  if (!isFinite(n)) return '0';
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec
  }).format(n);
}

function formatearMoneda(valor) {
  const n = Number(valor) || 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
}

function parsearNumero(valor) {
  if (typeof valor === 'number') return isFinite(valor) ? valor : 0;
  let texto = String(valor === undefined || valor === null ? '' : valor).trim();
  if (!texto) return null;
  texto = texto.replace(/[^\d,.\-]/g, '');
  if (!texto || texto === '-' || texto === '.' || texto === ',') return 0;

  const negativo = texto.charAt(0) === '-';
  texto = texto.replace(/-/g, '');
  const tieneComa = texto.indexOf(',') !== -1;
  const tienePunto = texto.indexOf('.') !== -1;

  if (tieneComa && tienePunto) {
    if (texto.lastIndexOf(',') > texto.lastIndexOf('.')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(/,/g, '');
    }
  } else if (tieneComa) {
    texto = texto.replace(',', '.');
  } else if (tienePunto) {
    const partes = texto.split('.');
    const ultima = partes[partes.length - 1];
    if (partes.length > 2) {
      texto = ultima.length <= 2
        ? partes.slice(0, -1).join('') + '.' + ultima
        : partes.join('');
    } else if (ultima.length === 3 && partes[0] !== '0') {
      texto = partes.join('');
    }
  }

  const numero = Number(texto);
  if (!isFinite(numero)) return 0;
  return negativo ? -numero : numero;
}

function formatearMontoDocumento(doc) {
  if (!doc) return '';
  const tipo = doc.tipo;
  if (tipo === 'ORDEN_COMPRA' || tipo === 'SOLICITUD_PRESUPUESTO') return '';
  if (tipo === 'RECIBO_COBRO') return formatearMoneda(doc.monto);
  return formatearMoneda(doc.total);
}

function nombreContactoVisible(contacto) {
  if (!contacto) return '';
  return String(
    contacto.razon_social ||
    contacto.nombre ||
    contacto.contacto ||
    contacto.cuit_dni ||
    'Sin nombre'
  );
}

function etiquetaEstado(estado) {
  const texto = String(estado || '').replace(/_/g, ' ').toLowerCase().trim();
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function claseEstado(estado) {
  const e = String(estado || '').toUpperCase();
  if (e === 'ANULADO' || e === 'ANULADA') return 'badge-anulado';
  if (e === 'BORRADOR') return 'badge-borrador';
  if (e === 'ENVIADO' || e === 'ENVIADA' || e === 'EMITIDO') return 'badge-enviado';
  if (e === 'ACEPTADO' || e === 'CONFIRMADA' || e === 'RECIBIDA' || e === 'FINALIZADA') {
    return 'badge-aceptado';
  }
  if (e === 'RECHAZADO' || e === 'VENCIDO' || e === 'CERRADA') return 'badge-rechazado';
  if (e === 'EN_CURSO' || e === 'PLANIFICADA') return 'badge-en_curso';
  return 'badge';
}

function claseEmpresa(empresaId) {
  return String(empresaId || '').toUpperCase() === 'ALIME' ? 'badge-alime' : 'badge-lucia';
}

function tituloTipo(tipo, etiquetas) {
  const t = String(tipo || '').toUpperCase();
  if (etiquetas && etiquetas[t]) return etiquetas[t];
  const fallback = {
    PRESUPUESTO: 'Presupuesto',
    ORDEN_COMPRA: 'Orden de compra',
    ORDEN_TRABAJO: 'Orden de trabajo',
    SOLICITUD_PRESUPUESTO: 'Solicitud de presupuesto',
    RECIBO_COBRO: 'Recibo de cobro'
  };
  return fallback[t] || t;
}

function iconoTipo(tipo) {
  const t = String(tipo || '').toUpperCase();
  const iconos = {
    PRESUPUESTO: 'PRE',
    ORDEN_COMPRA: 'OC',
    ORDEN_TRABAJO: 'OT',
    SOLICITUD_PRESUPUESTO: 'SOL',
    RECIBO_COBRO: 'REC'
  };
  return iconos[t] || 'DOC';
}

function debounce(fn, ms) {
  let timer = null;
  return function () {
    const args = arguments;
    const ctx = this;
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(ctx, args);
    }, ms);
  };
}

function iniciales(texto) {
  const partes = String(texto || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
}

/* ---------- Importe en letras ---------- */

function concordarUnLetras(texto) {
  if (texto === 'UNO') return 'UN';
  if (/VEINTIUNO$/.test(texto)) return texto.replace(/VEINTIUNO$/, 'VEINTIUN');
  return texto.replace(/ UNO$/, ' UN');
}

function convertirCentenasLetras(numero) {
  const unidades = [
    '', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS',
    'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO',
    'VEINTIDOS', 'VEINTITRES', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS',
    'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
  ];
  const decenas = [
    '', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA',
    'OCHENTA', 'NOVENTA'
  ];
  const centenas = [
    '', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
    'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
  ];

  const n = Math.floor(Math.abs(numero));
  if (n <= 0) return '';
  if (n < 30) return unidades[n];
  if (n < 100) {
    const decena = Math.floor(n / 10);
    const unidad = n % 10;
    return decenas[decena] + (unidad ? ' Y ' + unidades[unidad] : '');
  }
  if (n === 100) return 'CIEN';
  const centena = Math.floor(n / 100);
  const resto = n % 100;
  return centenas[centena] + (resto ? ' ' + convertirCentenasLetras(resto) : '');
}

function convertirEnteroLetras(numero) {
  const n = Math.floor(Math.abs(numero));
  if (n === 0) return 'CERO';
  if (n < 1000) return convertirCentenasLetras(n);

  if (n < 1000000) {
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;
    let texto = miles === 1 ? 'MIL' : concordarUnLetras(convertirCentenasLetras(miles)) + ' MIL';
    if (resto) texto += ' ' + convertirCentenasLetras(resto);
    return texto;
  }

  if (n < 1000000000) {
    const millones = Math.floor(n / 1000000);
    const resto = n % 1000000;
    let texto = millones === 1
      ? 'UN MILLON'
      : concordarUnLetras(convertirCentenasLetras(millones)) + ' MILLONES';
    if (resto) texto += ' ' + convertirEnteroLetras(resto);
    return texto;
  }

  const milesMillones = Math.floor(n / 1000000000);
  const resto = n % 1000000000;
  let texto = milesMillones === 1
    ? 'MIL MILLONES'
    : concordarUnLetras(convertirCentenasLetras(milesMillones)) + ' MIL MILLONES';
  if (resto) texto += ' ' + convertirEnteroLetras(resto);
  return texto;
}

function numeroALetras(valor) {
  const n = Math.abs(Number(valor) || 0);
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);
  let texto;

  if (entero === 0) texto = 'CERO PESOS';
  else if (entero === 1) texto = 'UN PESO';
  else texto = concordarUnLetras(convertirEnteroLetras(entero)) + ' PESOS';

  if (centavos > 0) {
    texto += ' CON ' + (centavos === 1
      ? 'UN CENTAVO'
      : concordarUnLetras(convertirEnteroLetras(centavos)) + ' CENTAVOS');
  }
  return texto;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    esc: esc,
    normalizar: normalizar,
    soloDigitos: soloDigitos,
    fechaISO: fechaISO,
    hoyISO: hoyISO,
    sumarDiasISO: sumarDiasISO,
    formatearFecha: formatearFecha,
    formatearFechaHora: formatearFechaHora,
    formatearNumero: formatearNumero,
    formatearMoneda: formatearMoneda,
    parsearNumero: parsearNumero,
    nombreContactoVisible: nombreContactoVisible,
    etiquetaEstado: etiquetaEstado,
    claseEstado: claseEstado,
    numeroALetras: numeroALetras
  };
}
