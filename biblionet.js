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

function pintarDetalle(libro) {
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
