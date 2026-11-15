/* ==========================================================================
   biblionet.js
   --------------------------------------------------------------------------
   Catálogo de libros conectado a la tabla "libros" de Supabase.
   JavaScript puro (fetch + DOM), sin librerías.
   Si la página no tiene #catalogo_productos, el catálogo no se ejecuta.
   ========================================================================== */

// --- 1. Configuración de Supabase -----------------------------------------

const SUPABASE_URL = 'https://yqfpoaswllnnzvvuommb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cIYnzLORdqPG-KNnP7cO3A_inloV1dR';
const SUPABASE_HEADERS = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

// --- 2. Estado y referencias al DOM ---------------------------------------

let todosLosLibros = [];

const contenedor = document.querySelector('#catalogo_productos');
const filtrosGeneros = document.querySelector('#filtros_generos');
const selectorGenero = document.querySelector('#selector_genero');
const botonLimpiarFiltros = document.querySelector('#btn_limpiar_filtros');
const formFiltros = document.querySelector('#form_filtros');
const detalleLibro = document.querySelector('#detalle_libro');
const contenedorMiniCatalogo = document.querySelector('#mini_catalogo');

// --- 3. Traer los libros desde Supabase -----------------------------------

async function cargarLibros() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/libros?select=*&order=id.asc`,
      { headers: SUPABASE_HEADERS }
    );

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    todosLosLibros = await res.json();
    iniciarFiltrosGeneros(todosLosLibros);
    pintarCatalogo(todosLosLibros);
  } catch (error) {
    console.error('No se pudieron cargar los libros:', error);
    pintarMensaje('No se pudieron cargar los libros. Intentá de nuevo más tarde.');
  }
}

// --- 4. Mensaje dentro del catálogo ---------------------------------------

function pintarMensaje(texto, destino = contenedor) {
  destino.querySelectorAll('article, .sin_resultados').forEach((el) => el.remove());

  const mensaje = document.createElement('p');
  mensaje.className = 'sin_resultados';
  mensaje.textContent = texto;
  destino.append(mensaje);
}

// --- 5. Armar las tarjetas de cada libro ----------------------------------

function formatearGeneros(genero) {
  if (!genero) return '';

  return genero
    .split(',')
    .map((g) => {
      const limpio = g.trim();
      return limpio.startsWith('#') ? limpio : `#${limpio}`;
    })
    .join(' ');
}

function pintarCatalogo(libros, destino = contenedor) {
  // Borra solo las tarjetas anteriores: el titulo del contenedor queda intacto.
  destino.querySelectorAll('article, .sin_resultados').forEach((el) => el.remove());

  if (libros.length === 0) {
    const mensaje = todosLosLibros.length === 0
      ? 'Todavía no hay libros cargados.'
      : 'No se encontraron libros para los géneros seleccionados.';
    pintarMensaje(mensaje, destino);
    return;
  }

  libros.forEach((libro) => {
    const articulo = document.createElement('article');

    const enlace = document.createElement('a');
    enlace.className = 'tarjeta';
    enlace.href = `detalle.html?id=${libro.id}`;

    const imagen = document.createElement('img');
    imagen.src = libro.imagen;
    imagen.alt = `Libro ${libro.titulo}`;
    imagen.width = 200;
    imagen.height = 300;

    const titulo = document.createElement('h3');
    titulo.textContent = libro.titulo;

    const formato = document.createElement('p');
    formato.textContent = libro.formato || '';

    const autor = document.createElement('p');
    autor.className = 'autor';
    autor.textContent = libro.autor || '';

    const genero = document.createElement('p');
    genero.className = 'genero';
    genero.textContent = formatearGeneros(libro.genero);

    const precio = document.createElement('p');
    precio.textContent = `$${Number(libro.precio || 0).toFixed(2)}`;

    enlace.append(imagen, titulo, formato, autor, genero, precio);
    articulo.append(enlace);
    destino.append(articulo);
  });
}

// --- 6. Filtrar por género (selector múltiple con etiquetas) --------------

let generosDisponibles = [];
let generosSeleccionados = [];

// Separa palabras unidas en CamelCase: "CienciaFicción" -> "Ciencia Ficción".
function separarCamelCase(texto) {
  return texto.replace(/([a-záéíóúñü])([A-ZÁÉÍÓÚÑÜ])/g, '$1 $2');
}

// Los géneros vienen como "#Autoayuda #Motivación" o "#CienciaFicción, #Aventura".
function generosDeLibro(libro) {
  return String(libro.genero || '')
    .split(/[#,\s]+/)
    .map((genero) => separarCamelCase(genero.trim()))
    .filter((genero) => genero !== '');
}

// Junta los géneros de todos los libros, sin repetir y ordenados alfabéticamente.
function extraerGeneros(libros) {
  const unicos = new Map();

  libros.forEach((libro) => {
    generosDeLibro(libro).forEach((genero) => {
      const clave = normalizarTexto(genero);

      if (clave !== '' && !unicos.has(clave)) {
        unicos.set(clave, genero);
      }
    });
  });

  return [...unicos.values()].sort((a, b) => a.localeCompare(b, 'es'));
}

function crearOpcionGenero(genero) {
  const opcion = document.createElement('option');
  opcion.value = genero;
  opcion.textContent = genero;
  return opcion;
}

// Deja en el desplegable solo los géneros que todavía no están elegidos.
function poblarSelectorGenero() {
  if (!selectorGenero) return;

  const seleccionados = generosSeleccionados.map(normalizarTexto);

  selectorGenero.replaceChildren();

  const inicial = document.createElement('option');
  inicial.value = '';
  inicial.textContent = 'Agregar género...';
  selectorGenero.append(inicial);

  generosDisponibles.forEach((genero) => {
    if (!seleccionados.includes(normalizarTexto(genero))) {
      selectorGenero.append(crearOpcionGenero(genero));
    }
  });

  selectorGenero.value = '';
}

// Dibuja una etiqueta por cada género elegido, con su botón "×".
function pintarEtiquetasGeneros() {
  if (!filtrosGeneros) return;

  filtrosGeneros.replaceChildren();

  generosSeleccionados.forEach((genero) => {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta_genero';

    const texto = document.createElement('span');
    texto.textContent = genero;

    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'quitar_genero';
    quitar.textContent = '×';
    quitar.setAttribute('aria-label', `Quitar género ${genero}`);
    quitar.addEventListener('click', () => quitarGenero(genero));

    etiqueta.append(texto, quitar);
    filtrosGeneros.append(etiqueta);
  });
}

function agregarGenero(genero) {
  const clave = normalizarTexto(genero);

  if (clave === '' || generosSeleccionados.some((g) => normalizarTexto(g) === clave)) {
    return;
  }

  generosSeleccionados.push(genero);
  pintarEtiquetasGeneros();
  poblarSelectorGenero();
  aplicarFiltro();
}

function quitarGenero(genero) {
  const clave = normalizarTexto(genero);

  generosSeleccionados = generosSeleccionados.filter((g) => normalizarTexto(g) !== clave);
  pintarEtiquetasGeneros();
  poblarSelectorGenero();
  aplicarFiltro();
}

function aplicarFiltro() {
  const seleccionados = generosSeleccionados.map(normalizarTexto);

  if (seleccionados.length === 0) {
    if (botonLimpiarFiltros) botonLimpiarFiltros.hidden = true;
    pintarCatalogo(todosLosLibros);
    return;
  }

  const filtrados = todosLosLibros.filter((libro) =>
    generosDeLibro(libro).some((genero) => seleccionados.includes(normalizarTexto(genero)))
  );

  if (botonLimpiarFiltros) botonLimpiarFiltros.hidden = false;
  pintarCatalogo(filtrados);
}

function limpiarFiltros() {
  generosSeleccionados = [];
  pintarEtiquetasGeneros();
  poblarSelectorGenero();

  if (botonLimpiarFiltros) botonLimpiarFiltros.hidden = true;
  pintarCatalogo(todosLosLibros);
}

// Prepara los géneros una sola vez, después de traer los libros.
function iniciarFiltrosGeneros(libros) {
  generosDisponibles = extraerGeneros(libros);
  generosSeleccionados = [];
  pintarEtiquetasGeneros();
  poblarSelectorGenero();
}

// --- 7. Arranque: solo si esta página tiene el catálogo -------------------

if (contenedor) {
  if (botonLimpiarFiltros) {
    botonLimpiarFiltros.addEventListener('click', limpiarFiltros);
  }

  if (selectorGenero) {
    selectorGenero.addEventListener('change', () => {
      const genero = selectorGenero.value;

      if (genero !== '') {
        agregarGenero(genero);
      }
    });
  }

  if (formFiltros) {
    formFiltros.addEventListener('submit', (e) => {
      e.preventDefault();
      aplicarFiltro();
    });
  }

  cargarLibros();
}

/* ==========================================================================
   DETALLE DE PRODUCTO (detalle.html?id=...)
   ========================================================================== */

// --- 8. Traer un libro puntual por su id ----------------------------------

async function cargarDetalleLibro() {
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    mostrarErrorDetalle('No se indicó ningún libro para mostrar.');
    return;
  }

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/libros?id=eq.${encodeURIComponent(id)}&select=*`,
      { headers: SUPABASE_HEADERS }
    );

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    const libros = await res.json();

    if (libros.length === 0) {
      mostrarErrorDetalle('No encontramos el libro solicitado.');
      return;
    }

    pintarDetalle(libros[0]);
    await cargarMiniCatalogo(id);
  } catch (error) {
    console.error('No se pudo cargar el libro:', error);
    mostrarErrorDetalle('No se pudo cargar el libro. Intentá de nuevo más tarde.');
  }
}

// --- Mini catalogo: sugerencias aleatorias dentro del detalle -------------

// Mezcla una lista sin modificar la original (Fisher-Yates).
function mezclarAleatorio(lista) {
  const copia = [...lista];

  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

async function cargarMiniCatalogo(id) {
  if (!contenedorMiniCatalogo) return;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/libros?id=neq.${encodeURIComponent(id)}&select=*`,
      { headers: SUPABASE_HEADERS }
    );

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    const otrosLibros = await res.json();

    if (otrosLibros.length === 0) {
      contenedorMiniCatalogo.hidden = true;
      return;
    }

    const sugeridos = mezclarAleatorio(otrosLibros).slice(0, 3);
    pintarCatalogo(sugeridos, contenedorMiniCatalogo);
  } catch (error) {
    console.error('No se pudieron cargar las sugerencias:', error);
    contenedorMiniCatalogo.hidden = true;
  }
}

// --- 9. Helpers: valores vacíos o nulos -----------------------------------

function dato(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return 'No especificado';
  }
  return String(valor).trim();
}

function conPrecio(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return 'No especificado';
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? `$${numero.toFixed(2)}` : String(valor).trim();
}

function conUnidades(valor, unidad) {
  if (valor === null || valor === undefined || String(valor).trim() === '') {
    return 'No especificado';
  }

  const numero = Number(valor);
  return Number.isFinite(numero) ? `${numero} ${unidad}` : String(valor).trim();
}

// --- 10. Rellenar el DOM del detalle --------------------------------------

const SIN_IMAGEN =
  'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'300\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23f1ebdf\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' fill=\'%236c7a71\' font-family=\'sans-serif\' font-size=\'16\'%3ESin imagen%3C/text%3E%3C/svg%3E';

let libroActual = null;

function pintarDetalle(libro) {
  libroActual = libro;
  document.title = `${dato(libro.titulo)} - Biblionet`;

  const imagen = document.querySelector('#detalle_imagen');
  imagen.src = libro.imagen || SIN_IMAGEN;
  imagen.alt = `Tapa del libro ${dato(libro.titulo)}`;

  document.querySelector('#detalle_titulo').textContent = dato(libro.titulo);
  document.querySelector('#detalle_autor').textContent = dato(libro.autor);
  document.querySelector('#detalle_anio').textContent = dato(libro.anio_edicion);
  document.querySelector('#detalle_editorial').textContent = dato(libro.editorial);
  document.querySelector('#detalle_formato').textContent = dato(libro.formato);
  document.querySelector('#detalle_paginas').textContent = conUnidades(libro.paginas, 'páginas');
  document.querySelector('#detalle_genero').textContent = formatearGeneros(libro.genero) || 'No especificado';
  document.querySelector('#detalle_precio').textContent = conPrecio(libro.precio);
  document.querySelector('#detalle_isbn').textContent = `ISBN: ${dato(libro.isbn)}`;
  document.querySelector('#detalle_disponibilidad').textContent =
    `Disponibilidad: ${conUnidades(libro.disponibilidad, 'U')}`;
  document.querySelector('#detalle_envio').textContent = `Envío: ${conPrecio(libro.envio)}`;
  document.querySelector('#detalle_descripcion').textContent = dato(libro.descripcion);

  document.querySelector('#detalle_dl_formato').textContent = dato(libro.formato);
  document.querySelector('#detalle_dl_edicion').textContent = dato(libro.edicion);
  document.querySelector('#detalle_dl_tapa').textContent = dato(libro.tapa);
  document.querySelector('#detalle_dl_dimensiones').textContent = dato(libro.dimensiones);
  document.querySelector('#detalle_dl_idioma').textContent = dato(libro.idioma);
  document.querySelector('#detalle_dl_editorial').textContent = dato(libro.editorial);
  document.querySelector('#detalle_dl_anio').textContent = dato(libro.anio_edicion);
  document.querySelector('#detalle_dl_paginas').textContent = conUnidades(libro.paginas, 'páginas');
  document.querySelector('#detalle_dl_clasificacion').textContent = dato(libro.clasificacion);

  document.querySelector('#detalle_comprar').href = `fin-compra.html?id=${libro.id}`;

  actualizarTextoBotonCarrito();
}

// --- 11. Mensaje cuando el libro no existe --------------------------------

function mostrarErrorDetalle(mensaje) {
  const titulo = document.createElement('h2');
  titulo.textContent = mensaje;

  const volver = document.createElement('a');
  volver.className = 'volver';
  volver.href = 'index.html';
  volver.textContent = 'Volver al inicio';

  detalleLibro.replaceChildren(titulo, volver);
}

// --- 12. Arranque: solo si esta página es el detalle ----------------------

if (detalleLibro) {
  cargarDetalleLibro();
}

/* ==========================================================================
   Carrito
   ========================================================================== */

// --- 13. localStorage: leer y guardar -------------------------------------

const CLAVE_CARRITO = 'carritobibionet';

function leerCarrito() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO));
    return Array.isArray(guardado) ? guardado : [];
  } catch (error) {
    console.error('No se pudo leer el carrito:', error);
    return [];
  }
}

function guardarCarrito(carrito) {
  localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
}

// --- 14. Precios y totales ------------------------------------------------

function numeroDePrecio(valor) {
  if (valor === null || valor === undefined) return 0;

  const texto = String(valor).trim();
  if (texto === '' || /no especificado|no aplica/i.test(texto)) return 0;

  // Acepta "$8.964,00" (formato argentino) y "$8964.00" (formato de la base).
  const limpio = texto.replace(/[^\d.,-]/g, '');
  if (limpio === '') return 0;

  const numero = limpio.includes(',')
    ? Number(limpio.replace(/\./g, '').replace(',', '.'))
    : Number(limpio);

  return Number.isFinite(numero) ? numero : 0;
}

function formatearMonto(valor) {
  return `$${Number(valor || 0).toFixed(2)}`;
}

function esFormatoFisico(formato) {
  return String(formato || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .includes('fisico');
}

function calcularTotales(carrito) {
  let subtotal = 0;
  let envio = 0;

  carrito.forEach((item) => {
    const cantidad = Number(item.cantidad) || 1;
    subtotal += (Number(item.precio) || 0) * cantidad;

    if (esFormatoFisico(item.formato)) {
      envio += numeroDePrecio(item.envio) * cantidad;
    }
  });

  return { subtotal, envio, total: subtotal + envio };
}

// --- 15. Agregar, actualizar y quitar productos ---------------------------

function agregarAlCarrito(libro) {
  const carrito = leerCarrito();
  const existente = carrito.find((item) => String(item.id) === String(libro.id));

  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({
      id: libro.id,
      titulo: libro.titulo,
      autor: libro.autor,
      formato: libro.formato,
      precio: Number(libro.precio) || 0,
      envio: libro.envio,
      imagen: libro.imagen,
      cantidad: 1
    });
  }

  guardarCarrito(carrito);
}

function actualizarCantidad(id, cantidad) {
  const carrito = leerCarrito();
  const item = carrito.find((producto) => String(producto.id) === String(id));

  if (!item) return;

  item.cantidad = cantidad;
  guardarCarrito(carrito);
  pintarCarrito();
}

function eliminarDelCarrito(id) {
  const carrito = leerCarrito().filter((item) => String(item.id) !== String(id));
  guardarCarrito(carrito);
  pintarCarrito();
}

function vaciarCarrito() {
  guardarCarrito([]);
  pintarCarrito();
}

// --- 16. Filas de la tabla del carrito ------------------------------------

function crearFilaCarrito(item) {
  const fila = document.createElement('tr');

  const celdaImagen = document.createElement('td');
  const imagen = document.createElement('img');
  imagen.src = item.imagen || SIN_IMAGEN;
  imagen.alt = `Tapa del libro ${item.titulo || ''}`;
  imagen.width = 60;
  imagen.height = 90;
  celdaImagen.append(imagen);

  const celdaTitulo = document.createElement('td');
  const enlace = document.createElement('a');
  enlace.href = `detalle.html?id=${encodeURIComponent(item.id)}`;
  enlace.textContent = item.titulo || '';
  celdaTitulo.append(enlace);

  const celdaAutor = document.createElement('td');
  celdaAutor.textContent = item.autor || '';

  const celdaFormato = document.createElement('td');
  celdaFormato.textContent = item.formato || '';

  const celdaPrecio = document.createElement('td');
  celdaPrecio.textContent = formatearMonto(item.precio);

  const celdaCantidad = document.createElement('td');
  const inputCantidad = document.createElement('input');
  inputCantidad.type = 'number';
  inputCantidad.min = '1';
  inputCantidad.value = item.cantidad;
  inputCantidad.setAttribute('value', String(item.cantidad));
  inputCantidad.setAttribute('aria-label', `Cantidad de ${item.titulo || 'libro'}`);
  inputCantidad.addEventListener('change', () => {
    let cantidad = parseInt(inputCantidad.value, 10);

    if (!Number.isFinite(cantidad) || cantidad < 1) {
      cantidad = 1;
    }

    inputCantidad.value = cantidad;
    actualizarCantidad(item.id, cantidad);
  });
  celdaCantidad.append(inputCantidad);

  const celdaAccion = document.createElement('td');
  const botonEliminar = document.createElement('button');
  botonEliminar.type = 'button';
  botonEliminar.className = 'btn_eliminar';
  botonEliminar.textContent = 'Eliminar';
  botonEliminar.addEventListener('click', () => eliminarDelCarrito(item.id));
  celdaAccion.append(botonEliminar);

  fila.append(
    celdaImagen,
    celdaTitulo,
    celdaAutor,
    celdaFormato,
    celdaPrecio,
    celdaCantidad,
    celdaAccion
  );

  return fila;
}

// --- 17. Pintar el carrito y sus totales ----------------------------------

const tablaCarrito = document.querySelector('.productos_carrito tbody');
const tablaCarritoCompleta = document.querySelector('.productos_carrito table');
const mensajeCarritoVacio = document.querySelector('#carrito_vacio');
const subtotalCarrito = document.querySelector('#carrito_subtotal');
const envioCarrito = document.querySelector('#carrito_envio');
const totalCarrito = document.querySelector('#carrito_total');
const botonVaciar = document.querySelector('.btn_vaciar');

function pintarCarrito() {
  const carrito = leerCarrito();

  tablaCarrito.replaceChildren();
  carrito.forEach((item) => tablaCarrito.append(crearFilaCarrito(item)));

  const vacio = carrito.length === 0;
  tablaCarritoCompleta.hidden = vacio;
  mensajeCarritoVacio.hidden = !vacio;

  const totales = calcularTotales(carrito);
  subtotalCarrito.textContent = formatearMonto(totales.subtotal);
  envioCarrito.textContent = formatearMonto(totales.envio);
  totalCarrito.textContent = formatearMonto(totales.total);
}

// --- 18. Botón "Agregar al carrito" del detalle ---------------------------

function cantidadEnCarrito(id) {
  const item = leerCarrito().find((producto) => String(producto.id) === String(id));
  return item ? Number(item.cantidad) || 1 : 0;
}

function textoBotonAgregado(cantidad) {
  if (cantidad <= 0) return 'Agregar al carrito';
  return cantidad === 1 ? 'Agregado' : `Agregado (${cantidad})`;
}

function actualizarTextoBotonCarrito() {
  if (!botonAgregarCarrito || !libroActual) return;

  botonAgregarCarrito.textContent = textoBotonAgregado(cantidadEnCarrito(libroActual.id));
}

const botonAgregarCarrito = document.querySelector('.btn-carrito');

if (botonAgregarCarrito) {
  botonAgregarCarrito.addEventListener('click', () => {
    if (!libroActual) return;

    agregarAlCarrito(libroActual);
    actualizarTextoBotonCarrito();
  });
}

// --- 19. Arranque: solo si esta página es el carrito ----------------------

if (tablaCarrito) {
  botonVaciar.addEventListener('click', vaciarCarrito);
  pintarCarrito();
}

/* ==========================================================================
   Carrito ------------------------------------------------------------------
   --------....-n
   ========================================================================== */

/* ==========================================================================
   FINALIZAR COMPRA (fin-compra.html)
   --------------------------------------------------------------------------
   Resumen del pedido desde el carrito (localStorage) o desde ?id=, y registro
   de la compra en la tabla "compras" de Supabase.
   ========================================================================== */

// --- 20. Referencias al DOM de fin-compra.html ----------------------------

const ID_CUENTA = 'Fulano_213';

const seccionFinCompra = document.querySelector('.finalizar_compra');
const tablaResumenPedido = document.querySelector('.resumen_pedido table tbody');
const formFinCompra = document.querySelector('.finalizar_compra form');
const botonConfirmarCompra = document.querySelector('.finalizar_compra form button[type="submit"]');
const pedidoSubtotal = document.querySelector('#pedido_subtotal');
const pedidoEnvio = document.querySelector('#pedido_envio');
const pedidoTotal = document.querySelector('#pedido_total');

const inputMetodoPago = document.querySelector('#metodo_pago');
const camposTarjeta = document.querySelectorAll('.metodo_pago .campo_tarjeta');
const inputNumeroTarjeta = document.querySelector('#numero_tarjeta');
const inputVencimiento = document.querySelector('#vencimiento');
const inputCvc = document.querySelector('#cvc');
const avisoMetodoPago = document.querySelector('#aviso_metodo_pago');
const camposMercadoPago = document.querySelectorAll('.metodo_pago .campo_mercado_pago');
const botonCopiarAlias = document.querySelector('#btn_copiar_alias');
const checkConfirmoTransferencia = document.querySelector('#confirmo_transferencia');

const ALIAS_BIBLIONET = 'BIBLIONET.PAGOS';

let temporizadorAlias;

let itemsPedido = [];

// --- 21. Armar el pedido: libro puntual o carrito -------------------------

async function cargarItemsPedido() {
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    return leerCarrito().map((item) => ({
      ...item,
      cantidad: Number(item.cantidad) || 1
    }));
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/libros?id=eq.${encodeURIComponent(id)}&select=*`,
    { headers: SUPABASE_HEADERS }
  );

  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const libros = await res.json();

  if (libros.length === 0) return [];

  return [{ ...libros[0], cantidad: 1 }];
}

// --- 22. Filas del resumen del pedido -------------------------------------

function crearFilaResumen(item) {
  const cantidad = Number(item.cantidad) || 1;
  const titulo = item.titulo || '';

  const fila = document.createElement('tr');

  const celdaTitulo = document.createElement('td');
  const enlace = document.createElement('a');
  enlace.href = `detalle.html?id=${encodeURIComponent(item.id)}`;
  enlace.textContent = cantidad > 1 ? `${titulo} (x${cantidad})` : titulo;
  celdaTitulo.append(enlace);

  const celdaAutor = document.createElement('td');
  celdaAutor.textContent = item.autor || '';

  const celdaFormato = document.createElement('td');
  celdaFormato.textContent = item.formato || '';

  const celdaPrecio = document.createElement('td');
  celdaPrecio.textContent = formatearMonto((Number(item.precio) || 0) * cantidad);

  fila.append(celdaTitulo, celdaAutor, celdaFormato, celdaPrecio);

  return fila;
}

// --- 23. Pintar resumen, totales y estado del botón -----------------------

function mostrarAvisoPedido(texto) {
  let aviso = document.querySelector('#pedido_aviso');

  if (!aviso) {
    aviso = document.createElement('p');
    aviso.id = 'pedido_aviso';
    aviso.className = 'carrito_vacio';
    aviso.setAttribute('role', 'alert');
    seccionFinCompra.querySelector('.resumen_pedido').append(aviso);
  }

  aviso.textContent = texto;
}

function pintarResumenPedido(items, mensajeVacio) {
  tablaResumenPedido.replaceChildren();
  items.forEach((item) => tablaResumenPedido.append(crearFilaResumen(item)));

  const totales = calcularTotales(items);
  pedidoSubtotal.textContent = formatearMonto(totales.subtotal);
  pedidoEnvio.textContent = formatearMonto(totales.envio);
  pedidoTotal.textContent = formatearMonto(totales.total);

  if (items.length === 0) {
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    celda.colSpan = 4;
    celda.textContent = mensajeVacio || 'No hay productos seleccionados para comprar.';
    fila.append(celda);
    tablaResumenPedido.append(fila);

    botonConfirmarCompra.disabled = true;
  } else {
    botonConfirmarCompra.disabled = false;
  }
}

async function iniciarFinCompra() {
  let mensajeVacio;

  try {
    itemsPedido = await cargarItemsPedido();
  } catch (error) {
    console.error('No se pudo preparar el resumen del pedido:', error);
    itemsPedido = [];
    mensajeVacio = 'No se pudo cargar el libro. Intentá de nuevo más tarde.';
  }

  pintarResumenPedido(itemsPedido, mensajeVacio);
}

// --- 24. Datos de la compra: fecha y método de pago -----------------------

function fechaDeHoy() {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');

  return `${dia}/${mes}/${hoy.getFullYear()}`;
}

function metodoPagoSanitizado() {
  const inputMetodo = document.querySelector('#metodo_pago');
  const inputNumero = document.querySelector('#numero_tarjeta');

  const metodo = inputMetodo ? inputMetodo.value.trim() : '';
  const digitos = inputNumero ? inputNumero.value.replace(/\D/g, '') : '';

  if (/tarjeta/i.test(metodo) && digitos.length >= 4) {
    return `${metodo} **** ${digitos.slice(-4)}`;
  }

  return metodo;
}

function armarRegistrosCompra(items) {
  const metodoPago = metodoPagoSanitizado();
  const fecha = fechaDeHoy();
  const pagoConMercadoPago = normalizarTexto(inputMetodoPago.value).includes('mercado pago');

  return items.map((item) => {
    const cantidad = Number(item.cantidad) || 1;
    const fisico = esFormatoFisico(item.formato);

    let estadoEnvio = 'No aplica';

    if (fisico) {
      estadoEnvio = pagoConMercadoPago ? 'Pendiente de acreditación' : 'Preparando envío';
    }

    return {
      id_account: ID_CUENTA,
      libro_id: Number(item.id),
      titulo: cantidad > 1 ? `${item.titulo} (x${cantidad})` : item.titulo,
      formato: item.formato || 'No especificado',
      fecha: fecha,
      precio: (Number(item.precio) || 0) * cantidad,
      envio: fisico ? numeroDePrecio(item.envio) * cantidad : 0,
      estado_envio: estadoEnvio,
      metodo_pago: metodoPago
    };
  });
}

// --- 25. Método de pago dinámico ------------------------------------------

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function limpiarCamposTarjeta() {
  [inputNumeroTarjeta, inputVencimiento, inputCvc].forEach((input) => {
    if (input) input.value = '';
  });
}

function aplicarMetodoPago() {
  const metodo = normalizarTexto(inputMetodoPago.value);
  const esTarjeta = metodo.startsWith('tarjeta');
  const esMercadoPago = metodo.includes('mercado pago');

  // Los datos de la tarjeta solo se muestran y se exigen si el pago es con tarjeta.
  camposTarjeta.forEach((campo) => {
    campo.hidden = !esTarjeta;
  });

  [inputNumeroTarjeta, inputVencimiento, inputCvc].forEach((input) => {
    if (input) input.required = esTarjeta;
  });

  // Los datos de transferencia y su confirmación solo aplican a Mercado Pago.
  camposMercadoPago.forEach((campo) => {
    campo.hidden = !esMercadoPago;
  });

  if (checkConfirmoTransferencia) {
    checkConfirmoTransferencia.required = esMercadoPago;

    if (!esMercadoPago) {
      checkConfirmoTransferencia.checked = false;
    }
  }

  if (!esTarjeta) {
    limpiarCamposTarjeta();
  }

  avisoMetodoPago.textContent =
    'Al confirmar la compra se generará el comprobante o enlace de pago correspondiente.';
  avisoMetodoPago.hidden = esTarjeta;
}

// --- 26. Copiar el alias de Mercado Pago ---------------------------------

function copiarAliasConSeleccionTemporal(texto) {
  const area = document.createElement('textarea');
  area.value = texto;
  area.setAttribute('readonly', '');
  area.setAttribute('aria-hidden', 'true');
  area.style.position = 'fixed';
  area.style.top = '-1000px';
  document.body.append(area);
  area.select();

  let copiado = false;

  try {
    copiado = document.execCommand('copy');
  } catch (error) {
    console.error('No se pudo copiar el alias:', error);
  }

  area.remove();

  return copiado;
}

function mostrarAliasCopiado() {
  clearTimeout(temporizadorAlias);
  botonCopiarAlias.textContent = '¡Alias copiado!';

  temporizadorAlias = setTimeout(() => {
    botonCopiarAlias.textContent = 'Copiar alias';
  }, 2000);
}

async function copiarAlias() {
  let copiado = false;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(ALIAS_BIBLIONET);
      copiado = true;
    } else {
      copiado = copiarAliasConSeleccionTemporal(ALIAS_BIBLIONET);
    }
  } catch (error) {
    console.error('No se pudo copiar el alias:', error);
    copiado = copiarAliasConSeleccionTemporal(ALIAS_BIBLIONET);
  }

  if (copiado) {
    mostrarAliasCopiado();
  }
}

// --- 27. Confirmar la compra e insertarla en Supabase --------------------

function mostrarCompraExitosa() {
  const accionesCompra = seccionFinCompra.querySelector('.acciones_compra');
  let mensaje = document.querySelector('#compra_exitosa');

  if (!mensaje) {
    mensaje = document.createElement('p');
    mensaje.id = 'compra_exitosa';
    mensaje.className = 'nota_envio';
    mensaje.setAttribute('role', 'status');
    accionesCompra.append(mensaje);
  }

  mensaje.textContent =
    '¡Compra registrada con éxito! Te redirigimos a tu cuenta en unos segundos.';
}

async function confirmarCompra(evento) {
  evento.preventDefault();

  if (itemsPedido.length === 0) return;

  const vinoDelCarrito = !new URLSearchParams(window.location.search).get('id');
  const registros = armarRegistrosCompra(itemsPedido);

  botonConfirmarCompra.disabled = true;

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/compras`, {
      method: 'POST',
      headers: SUPABASE_HEADERS,
      body: JSON.stringify(registros)
    });

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    if (vinoDelCarrito) {
      guardarCarrito([]);
    }

    mostrarCompraExitosa();

    setTimeout(() => {
      window.location.href = 'cuenta.html';
    }, 2000);
  } catch (error) {
    console.error('No se pudo registrar la compra:', error);
    botonConfirmarCompra.disabled = false;
    mostrarAvisoPedido('No se pudo registrar la compra. Intentá de nuevo más tarde.');
  }
}

// --- 28. Arranque: solo si esta página es fin-compra.html ----------------

if (seccionFinCompra) {
  inputMetodoPago.addEventListener('change', aplicarMetodoPago);
  botonCopiarAlias.addEventListener('click', copiarAlias);

  aplicarMetodoPago();

  formFinCompra.addEventListener('submit', confirmarCompra);
  botonConfirmarCompra.disabled = true;
  iniciarFinCompra();
}

/* ==========================================================================
   HISTORIAL DE COMPRAS (cuenta.html)
   --------------------------------------------------------------------------
   Lee las compras del usuario desde la tabla "compras" de Supabase.
   ========================================================================== */

// --- 29. Referencia al DOM y filas del historial -------------------------

const tablaHistorialCompras = document.querySelector('.historial_compras tbody');

function crearFilaHistorial(compra) {
  const fila = document.createElement('tr');

  const celdaTitulo = document.createElement('td');
  const enlace = document.createElement('a');
  enlace.href = `detalle.html?id=${encodeURIComponent(compra.libro_id)}`;
  enlace.textContent = compra.titulo || '';
  celdaTitulo.append(enlace);

  const celdaFormato = document.createElement('td');
  celdaFormato.textContent = compra.formato || '';

  const celdaFecha = document.createElement('td');
  celdaFecha.textContent = compra.fecha || '';

  const celdaPrecio = document.createElement('td');
  celdaPrecio.textContent = formatearMonto(compra.precio);

  const celdaEnvio = document.createElement('td');
  celdaEnvio.textContent = Number(compra.envio) === 0 ? 'No aplica' : formatearMonto(compra.envio);

  const celdaEstado = document.createElement('td');
  celdaEstado.textContent = compra.estado_envio || '';

  const celdaMetodo = document.createElement('td');
  celdaMetodo.textContent = compra.metodo_pago || '';

  fila.append(
    celdaTitulo,
    celdaFormato,
    celdaFecha,
    celdaPrecio,
    celdaEnvio,
    celdaEstado,
    celdaMetodo
  );

  return fila;
}

// --- 30. Pintar el historial o su mensaje --------------------------------

function pintarMensajeHistorial(texto) {
  const fila = document.createElement('tr');
  const celda = document.createElement('td');
  celda.colSpan = 7;
  celda.textContent = texto;
  fila.append(celda);

  tablaHistorialCompras.replaceChildren(fila);
}

function pintarHistorialCompras(compras) {
  if (compras.length === 0) {
    pintarMensajeHistorial('Todavía no realizaste compras.');
    return;
  }

  const fragmento = document.createDocumentFragment();
  compras.forEach((compra) => fragmento.append(crearFilaHistorial(compra)));

  tablaHistorialCompras.replaceChildren(fragmento);
}

// --- 31. Traer las compras desde Supabase --------------------------------

async function cargarHistorialCompras() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/compras?id_account=eq.${ID_CUENTA}&order=id.desc`,
      { headers: SUPABASE_HEADERS }
    );

    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    const compras = await res.json();
    pintarHistorialCompras(compras);
  } catch (error) {
    console.error('No se pudo cargar el historial de compras:', error);
    pintarMensajeHistorial('No se pudo cargar el historial de compras. Intentá de nuevo más tarde.');
  }
}

// --- 32. Arranque: solo si esta página es cuenta.html --------------------

if (tablaHistorialCompras) {
  cargarHistorialCompras();
}
