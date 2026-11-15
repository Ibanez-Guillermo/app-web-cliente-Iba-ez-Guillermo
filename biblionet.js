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
const inputGenero = document.querySelector('#filtro_genero');
const formFiltros = document.querySelector('#form_filtros');
const detalleLibro = document.querySelector('#detalle_libro');

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
    pintarCatalogo(todosLosLibros);
  } catch (error) {
    console.error('No se pudieron cargar los libros:', error);
    pintarMensaje('No se pudieron cargar los libros. Intentá de nuevo más tarde.');
  }
}

// --- 4. Mensaje dentro del catálogo ---------------------------------------

function pintarMensaje(texto) {
  contenedor.querySelectorAll('article, .sin_resultados').forEach((el) => el.remove());

  const mensaje = document.createElement('p');
  mensaje.className = 'sin_resultados';
  mensaje.textContent = texto;
  contenedor.append(mensaje);
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

function pintarCatalogo(libros) {
  // Borra solo las tarjetas anteriores: el <h2>Catalogo</h2> queda intacto.
  contenedor.querySelectorAll('article, .sin_resultados').forEach((el) => el.remove());

  if (libros.length === 0) {
    const mensaje = todosLosLibros.length === 0
      ? 'Todavía no hay libros cargados.'
      : 'No se encontraron libros para ese género.';
    pintarMensaje(mensaje);
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
    contenedor.append(articulo);
  });
}

// --- 6. Filtrar por género ------------------------------------------------

function aplicarFiltro() {
  const texto = inputGenero.value.trim().toLowerCase();

  const filtrados = todosLosLibros.filter((libro) =>
    (libro.genero || '').toLowerCase().includes(texto)
  );

  pintarCatalogo(filtrados);
}

// --- 7. Arranque: solo si esta página tiene el catálogo -------------------

if (contenedor) {
  inputGenero.addEventListener('input', aplicarFiltro);

  formFiltros.addEventListener('submit', (e) => {
    e.preventDefault();
    aplicarFiltro();
  });

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
  } catch (error) {
    console.error('No se pudo cargar el libro:', error);
    mostrarErrorDetalle('No se pudo cargar el libro. Intentá de nuevo más tarde.');
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
