var gestorJS = {
    gestorActual: null,  // Objeto con los datos del gestor logueado
    token: null,         // PRÁCTICA 3 - PARTE 2: token JWT recibido al hacer login
    recursoActual: null, // ID del recurso abierto en la ficha (null si es nuevo)
    ws: null,            // Conexión WebSocket activa
    datosRef: {          // Datos de referencia cargados al iniciar sesión
        categorias: [],
        modelos: [],
        ubicaciones: []
    },

    // ===================== PRÁCTICA 3 - PARTE 2: JWT =====================
    // Añade el token a la URL: con "?" si la URL no tenía parámetros, o con "&" si ya los tenía
    // (si ya acaba en "?" o "&", como la de buscarRecursos, no se añade nada más)
    conToken: function(url) {
        var ultimo = url.charAt(url.length - 1);
        var separador = (ultimo === "?" || ultimo === "&") ? "" : (url.indexOf("?") === -1 ? "?" : "&");
        return url + separador + "token=" + encodeURIComponent(gestorJS.token);
    },

    // Si el servidor responde 401 (sin token, token incorrecto o caducado) se vuelve al login
    comprobarToken: function(callback) {
        return function(s, respuesta) {
            if (s == 401) {
                alert("La sesión ha caducado o no es válida. Vuelve a iniciar sesión.");
                gestorJS.salir();
                return;
            }
            callback(s, respuesta);
        };
    },

    // Igual que rest.get/post/put/delete pero con el token y la comprobación anterior.
    // Se usa para TODAS las llamadas a nuestro servidor (menos login y registro).
    api: {
        get:    function(url, cb)       { rest.get(gestorJS.conToken(url), gestorJS.comprobarToken(cb)); },
        post:   function(url, data, cb) { rest.post(gestorJS.conToken(url), data, gestorJS.comprobarToken(cb)); },
        put:    function(url, data, cb) { rest.put(gestorJS.conToken(url), data, gestorJS.comprobarToken(cb)); },
        delete: function(url, cb)       { rest.delete(gestorJS.conToken(url), gestorJS.comprobarToken(cb)); }
    },
    // ======================================================================

    // Oculta todas las vistas y muestra solo la indicada por idVista
    cambiarVista: function(idVista) {
        document.querySelectorAll('.vista').forEach(function(v) {
            v.classList.remove('activa');
        });
        document.getElementById(idVista).classList.add('activa');
    },

    // Envía las credenciales al servidor; si son correctas carga los datos del gestor y muestra la vista principal
    hacerLogin: function() {
        var u = document.getElementById("loginUser").value;
        var p = document.getElementById("loginPass").value;
        rest.post("/api/gestores/login", { login: u, password: p }, function(status, response) {
            if (status == 200) {
                gestorJS.token = response.token;   // PRÁCTICA 3 - PARTE 2: guardar el token
                gestorJS.api.get("/api/gestores/" + response.id, function(s, gestor) {
                    gestorJS.gestorActual = gestor;
                    document.getElementById("saludo").innerText = "Bienvenido " + gestor.nombre + " " + gestor.apellidos;
                    gestorJS.inicializarApp();
                    gestorJS.iniciarMinisterio();   // PRÁCTICA 3
                    gestorJS.abrirWS();
                    gestorJS.cambiarVista("vistaPrincipal");
                });
            } else {
                alert("Credenciales incorrectas");
            }
        });
    },

    // Limpia la sesión y vuelve a la pantalla de login
    salir: function() {
        if (gestorJS.ws) { gestorJS.ws.close(); gestorJS.ws = null; }
        gestorJS.gestorActual = null;
        gestorJS.token = null;          // PRÁCTICA 3 - PARTE 2: borrar el token
        document.getElementById("loginUser").value = "";
        document.getElementById("loginPass").value = "";
        gestorJS.cambiarVista("vistaLogin");
    },

    // Limpia el formulario de registro y muestra la vista de registro
    mostrarRegistro: function() {
        document.getElementById("regNombre").value    = "";
        document.getElementById("regApellidos").value = "";
        document.getElementById("regUser").value      = "";
        document.getElementById("regPass").value      = "";
        gestorJS.cambiarVista("vistaRegistro");
    },

    // Cancela el formulario: vuelve al login si no hay sesión activa, o a la vista principal si la hay
    cancelarRegistro: function() {
        if (gestorJS.gestorActual) {
            gestorJS.cambiarVista("vistaPrincipal");
        } else {
            gestorJS.cambiarVista("vistaLogin");
        }
    },

    // Guarda los datos del gestor: crea uno nuevo (POST) o actualiza el existente (PUT) según haya sesión activa
    guardarGestor: function() {
        var data = {
            nombre:    document.getElementById("regNombre").value,
            apellidos: document.getElementById("regApellidos").value,
            usuario:   document.getElementById("regUser").value,
            password:  document.getElementById("regPass").value
        };
        if (!data.nombre || !data.apellidos || !data.usuario || !data.password) {
            alert("Todos los campos son obligatorios");
            return;
        }
        if (gestorJS.gestorActual) {
            // Actualiza el gestor logueado y refresca el saludo con los nuevos datos
            gestorJS.api.put("/api/gestores/" + gestorJS.gestorActual.id, data, function(status) {
                if (status == 200) {
                    gestorJS.api.get("/api/gestores/" + gestorJS.gestorActual.id, function(s, g) {
                        gestorJS.gestorActual = g;
                        document.getElementById("saludo").innerText = "Bienvenido " + g.nombre + " " + g.apellidos;
                        gestorJS.cambiarVista("vistaPrincipal");
                    });
                } else {
                    alert("Error al actualizar. El usuario puede estar repetido.");
                }
            });
        } else {
            // Registra un nuevo gestor y vuelve al login para que inicie sesión
            rest.post("/api/gestores", data, function(status) {
                if (status == 201) {
                    alert("Registrado correctamente. Ahora haz login.");
                    gestorJS.cambiarVista("vistaLogin");
                } else {
                    alert("Error en el registro. El usuario puede estar repetido.");
                }
            });
        }
    },

    // Rellena el formulario con los datos del gestor logueado y abre la vista de edición
    editarGestor: function() {
        document.getElementById("regNombre").value    = gestorJS.gestorActual.nombre;
        document.getElementById("regApellidos").value = gestorJS.gestorActual.apellidos;
        document.getElementById("regUser").value      = gestorJS.gestorActual.usuario;
        document.getElementById("regPass").value      = "";
        gestorJS.cambiarVista("vistaRegistro");
    },

    // Carga categorías, modelos y ubicaciones del servidor y rellena los selectores de filtros y ficha
    inicializarApp: function() {
        gestorJS.api.get("/api/categorias", function(s, data) {
            gestorJS.datosRef.categorias = data;
            gestorJS.llenarSelect("filtroCategoria", data, true);
            gestorJS.llenarSelect("fichaCategoria", data, false);
        });
        gestorJS.api.get("/api/modelos", function(s, data) {
            gestorJS.datosRef.modelos = data;
            gestorJS.llenarSelect("filtroModelo", data, true);
        });
        gestorJS.api.get("/api/ubicaciones", function(s, data) {
            gestorJS.datosRef.ubicaciones = data;
            gestorJS.llenarSelect("filtroUbicacion", data, true);
            gestorJS.llenarSelect("fichaUbicacion", data, false);
        });
    },

    // Rellena el <select> indicado con el array de {id, nombre}; si conTodos=true añade la opción "Todos" al inicio
    llenarSelect: function(idSelect, arrayDatos, conTodos) {
        var sel = document.getElementById(idSelect);
        sel.innerHTML = conTodos ? '<option value="Todos">Todos</option>' : '';
        arrayDatos.forEach(function(item) {
            var opt = document.createElement("option");
            opt.value = item.id;
            opt.text  = item.nombre;
            sel.appendChild(opt);
        });
    },

    // Construye la URL con los filtros seleccionados y pide los recursos al servidor; los muestra en la tabla
    buscarRecursos: function() {
        var cat = document.getElementById("filtroCategoria").value;
        var mod = document.getElementById("filtroModelo").value;
        var ubi = document.getElementById("filtroUbicacion").value;
        var est = document.getElementById("filtroEstado").value;

        var url = "/api/recursos?";
        if (cat !== "Todos") url += "categoria=" + cat + "&";
        if (mod !== "Todos") url += "modelo="    + mod + "&";
        if (ubi !== "Todos") url += "ubicacion=" + ubi + "&";
        if (est !== "Todos") url += "estado="    + est + "&";

        gestorJS.api.get(url, function(status, data) {
            var tbody = document.querySelector("#tablaRecursos tbody");
            tbody.innerHTML = "";
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">No hay recursos</td></tr>';
                return;
            }
            data.forEach(function(r) {
                // Resuelve los IDs a nombres usando los datos de referencia locales
                var modelo    = gestorJS.datosRef.modelos.find(m => m.id == r.modelo);
                var categoria = modelo ? gestorJS.datosRef.categorias.find(c => c.id == modelo.categoria) : null;
                var ubicacion = gestorJS.datosRef.ubicaciones.find(u => u.id == r.ubicacion);
                var nombreEstado = ["Operativo", "Baja", "Mantenimiento"][r.estado] || r.estado;

                var tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" + r.numero_serie + "</td>" +
                    "<td>" + (categoria ? categoria.nombre : "?") + "</td>" +
                    "<td>" + (modelo    ? modelo.nombre    : "?") + "</td>" +
                    "<td>" + (ubicacion ? ubicacion.nombre : "?") + "</td>" +
                    "<td>" + nombreEstado + "</td>" +
                    "<td>" +
                        "<button class='btn-accion' onclick='gestorJS.abrirRecurso(" + r.id + ")'>Abrir</button>" +
                        "<button class='btn-accion btn-borrar' onclick='gestorJS.borrarRecurso(" + r.id + ")'>X</button>" +
                    "</td>";
                tbody.appendChild(tr);
            });
        });
    },

    // Pide confirmación y borra el recurso del servidor; refresca el listado si tiene éxito
    borrarRecurso: function(id) {
        if (!confirm("¿Borrar este recurso?")) return;
        gestorJS.api.delete("/api/recursos/" + id, function(status) {
            if (status == 200) {
                gestorJS.buscarRecursos();
            } else {
                alert("Error al borrar el recurso");
            }
        });
    },

    // Prepara la ficha en blanco para crear un recurso nuevo y vacía las tablas de reservas y reseñas
    nuevoRecurso: function() {
        gestorJS.recursoActual = null;
        document.getElementById("fichaSerie").value  = "";
        document.getElementById("fichaEstado").value = "0";
        // Selecciona la primera categoría disponible y actualiza el selector de modelos
        if (gestorJS.datosRef.categorias.length > 0) {
            document.getElementById("fichaCategoria").value = gestorJS.datosRef.categorias[0].id;
            gestorJS.cambioCategoria();
        }
        document.querySelector("#tablaReservas tbody").innerHTML = "";
        document.querySelector("#tablaResenyas tbody").innerHTML = "";
        gestorJS.cambiarVista("vistaFicha");
    },

    // Carga los datos de un recurso existente del servidor, los muestra en la ficha y carga sus reservas y reseñas
    abrirRecurso: function(id) {
        gestorJS.recursoActual = id;
        gestorJS.api.get("/api/recursos/" + id, function(status, recurso) {
            if (status != 200) { alert("Error al cargar el recurso"); return; }
            var modelo = gestorJS.datosRef.modelos.find(m => m.id == recurso.modelo);
            if (modelo) {
                // Selecciona la categoría y filtra los modelos; luego selecciona el modelo del recurso
                document.getElementById("fichaCategoria").value = modelo.categoria;
                gestorJS.cambioCategoria(function() {
                    document.getElementById("fichaModelo").value = recurso.modelo;
                });
            }
            document.getElementById("fichaSerie").value     = recurso.numero_serie;
            document.getElementById("fichaUbicacion").value = recurso.ubicacion;
            document.getElementById("fichaEstado").value    = recurso.estado;
            gestorJS.cargarReservas(id);
            gestorJS.cargarResenyas(id);
        });
        gestorJS.cambiarVista("vistaFicha");
    },

    // Filtra el selector de modelos de la ficha según la categoría elegida; ejecuta el callback opcional al terminar
    cambioCategoria: function(callback) {
        var catId = parseInt(document.getElementById("fichaCategoria").value);
        var modelosFiltrados = gestorJS.datosRef.modelos.filter(m => m.categoria === catId);
        var sel = document.getElementById("fichaModelo");
        sel.innerHTML = "";
        modelosFiltrados.forEach(function(m) {
            var opt = document.createElement("option");
            opt.value = m.id;
            opt.text  = m.nombre;
            sel.appendChild(opt);
        });
        if (callback) callback();
    },

    // Recoge los datos de la ficha y crea (POST) o actualiza (PUT) el recurso según recursoActual
    guardarRecurso: function() {
        var data = {
            modelo:       parseInt(document.getElementById("fichaModelo").value),
            ubicacion:    parseInt(document.getElementById("fichaUbicacion").value),
            numero_serie: document.getElementById("fichaSerie").value,
            estado:       parseInt(document.getElementById("fichaEstado").value)
        };
        if (!data.numero_serie) {
            alert("El número de serie es obligatorio");
            return;
        }
        if (gestorJS.recursoActual) {
            gestorJS.api.put("/api/recursos/" + gestorJS.recursoActual, data, function(status) {
                if (status == 200) {
                    gestorJS.volverListado();
                } else {
                    alert("Error al actualizar el recurso");
                }
            });
        } else {
            gestorJS.api.post("/api/recursos", data, function(status, idNuevo) {
                if (status == 201) {
                    // Notificar por WS a todos los sanitarios
                    var modelo    = gestorJS.datosRef.modelos.find(function(m) { return m.id === data.modelo; });
                    var categoria = modelo ? gestorJS.datosRef.categorias.find(function(c) { return c.id === modelo.categoria; }) : null;
                    gestorJS.enviarWS({
                        tipo:          "nuevo_recurso",
                        numeroSerie:   data.numero_serie,
                        nombreModelo:  modelo    ? modelo.nombre    : "?",
                        nombreCategoria: categoria ? categoria.nombre : "?"
                    });
                    gestorJS.volverListado();
                } else {
                    alert("Error al crear el recurso");
                }
            });
        }
    },

    // Abre la conexión WebSocket e identifica al gestor
    abrirWS: function() {
        gestorJS.ws = new WebSocket("ws://localhost:3000");
        gestorJS.ws.onopen = function() {
            gestorJS.ws.send(JSON.stringify({
                tipo:   "identificar",
                rol:    "gestor",
                id:     gestorJS.gestorActual.id,
                nombre: gestorJS.gestorActual.nombre + " " + gestorJS.gestorActual.apellidos
            }));
        };
        gestorJS.ws.onmessage = function(evento) {
            var msg;
            try { msg = JSON.parse(evento.data); } catch(e) { return; }
            if (msg.tipo === "aviso") gestorJS.recibirAviso(msg);
        };
    },

    // Envía un mensaje por WebSocket si la conexión está abierta
    enviarWS: function(msg) {
        if (gestorJS.ws && gestorJS.ws.readyState === WebSocket.OPEN) {
            gestorJS.ws.send(JSON.stringify(msg));
        }
    },

    // Añade una fila a la tabla de avisos con el color correspondiente
    recibirAviso: function(aviso) {
        var tbody = document.querySelector("#tablaAvisos tbody");
        var tr = document.createElement("tr");
        if      (aviso.color === "rojo")  tr.className = "aviso-rojo";
        else if (aviso.color === "azul")  tr.className = "aviso-azul";
        else if (aviso.color === "verde") tr.className = "aviso-verde";
        tr.innerHTML = "<td>" + aviso.fecha + "</td><td>" + aviso.origen + "</td><td>" + aviso.texto + "</td>";
        tbody.appendChild(tr);
    },

    // Carga las reservas del recurso y las colorea: blanco=finalizada, azul=en uso sin exceder, rojo=excedida, verde=pendiente
    cargarReservas: function(recursoId) {
        gestorJS.api.get("/api/recursos/" + recursoId + "/reservas", function(status, data) {
            var tbody = document.querySelector("#tablaReservas tbody");
            tbody.innerHTML = "";
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">No hay reservas</td></tr>';
                return;
            }
            data.forEach(function(r) {
                var tr = document.createElement("tr");
                if (r.fecha_fin) {
                    tr.className = "reserva-finalizada";
                } else if (r.fecha_inicio) {
                    var horasUso = (new Date() - new Date(r.fecha_inicio)) / 3600000;
                    tr.className = horasUso > r.horas_estimadas ? "reserva-excedida" : "reserva-uso-normal";
                } else {
                    tr.className = "reserva-pendiente";
                }
                var fPeticion = new Date(r.fecha_peticion).toLocaleString();
                var fInicio   = r.fecha_inicio ? new Date(r.fecha_inicio).toLocaleString() : "";
                var fFin      = r.fecha_fin    ? new Date(r.fecha_fin).toLocaleString()    : "";
                tr.innerHTML =
                    "<td>" + r.sanitario_nombre + "</td>" +
                    "<td>" + r.horas_estimadas  + "</td>" +
                    "<td>" + fPeticion          + "</td>" +
                    "<td>" + fInicio            + "</td>" +
                    "<td>" + fFin               + "</td>";
                tbody.appendChild(tr);
            });
        });
    },

    // Carga las reseñas del recurso y las muestra con fecha, sanitario, valoración numérica y comentario
    cargarResenyas: function(recursoId) {
        gestorJS.api.get("/api/recursos/" + recursoId + "/resenyas", function(status, data) {
            var tbody = document.querySelector("#tablaResenyas tbody");
            tbody.innerHTML = "";
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">No hay reseñas</td></tr>';
                return;
            }
            data.forEach(function(r) {
                var tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" + new Date(r.fecha).toLocaleString() + "</td>" +
                    "<td>" + r.sanitario_nombre + "</td>" +
                    "<td>" + r.valor            + "</td>" +
                    "<td>" + r.descripcion      + "</td>";
                tbody.appendChild(tr);
            });
        });
    },

    // ===================== PRÁCTICA 3 - PARTE 1 =====================

    URL_MINISTERIO: "https://undefined.ua.es/telemedicina/api/datos",
    ID_AREA: 12,         // Código de área asignado por el profesor (12 = Neurología)

    // Áreas médicas con los códigos que da el enunciado (id_area); se usan para los nombres del ranking
    areas: [
        { id: 1,  nombre: "Alergología" },
        { id: 2,  nombre: "Anestesiología" },
        { id: 3,  nombre: "Cardiología" },
        { id: 4,  nombre: "Cirugía General" },
        { id: 5,  nombre: "Dermatología" },
        { id: 6,  nombre: "Aparato Digestivo" },
        { id: 7,  nombre: "Endocrinología" },
        { id: 8,  nombre: "Ginecología" },
        { id: 9,  nombre: "Hematología" },
        { id: 10, nombre: "Medicina Interna" },
        { id: 11, nombre: "Neumología" },
        { id: 12, nombre: "Neurología" },
        { id: 13, nombre: "Oftalmología" },
        { id: 14, nombre: "Oncología" },
        { id: 15, nombre: "Pediatría" },
        { id: 16, nombre: "Psiquiatría" },
        { id: 17, nombre: "Traumatología" },
        { id: 18, nombre: "Urología" }
    ],

    // Se llama al entrar en la vista principal: carga el ranking
    iniciarMinisterio: function() {
        gestorJS.cargarRanking();
    },

    // PASO 1: pide todos los recursos y, uno a uno, sus reservas (no hay un servicio que las dé todas juntas)
    enviarReservasMinisterio: function() {
        var idArea = gestorJS.ID_AREA;
        gestorJS.api.get("/api/recursos", function(status, recursos) {
            if (status != 200) { alert("Error al obtener los recursos"); return; }
            var todasReservas = [];

            // Función recursiva: pide las reservas del recurso i y luego pasa al siguiente
            function pedirReservas(i) {
                if (i >= recursos.length) {           // ya están todas -> siguiente paso
                    gestorJS.prepararDatos(idArea, recursos, todasReservas);
                    return;
                }
                gestorJS.api.get("/api/recursos/" + recursos[i].id + "/reservas", function(s, reservas) {
                    if (s == 200) {
                        reservas.forEach(function(r) { todasReservas.push(r); });
                    }
                    pedirReservas(i + 1);
                });
            }
            pedirReservas(0);
        });
    },

    // PASO 2: pide los sanitarios (para tener nombre y apellidos separados) y monta el array "datos"
    prepararDatos: function(idArea, recursos, reservas) {
        if (reservas.length === 0) { alert("No hay reservas que enviar"); return; }

        // Lista de ids de sanitarios sin repetir
        var idsSanitarios = [];
        reservas.forEach(function(r) {
            if (idsSanitarios.indexOf(r.sanitario) === -1) idsSanitarios.push(r.sanitario);
        });

        var sanitarios = [];
        function pedirSanitario(i) {
            if (i >= idsSanitarios.length) {          // ya están todos -> montar y enviar
                var datos = reservas.map(function(r) {
                    var sanitario = sanitarios.find(s => s.id == r.sanitario);
                    var recurso   = recursos.find(rec => rec.id == r.recurso);
                    var modelo    = recurso ? gestorJS.datosRef.modelos.find(m => m.id == recurso.modelo) : null;
                    var categoria = modelo  ? gestorJS.datosRef.categorias.find(c => c.id == modelo.categoria) : null;
                    return {
                        "nombre":          sanitario ? sanitario.nombre    : "Desconocido",
                        "apellidos":       sanitario ? sanitario.apellidos : "Desconocido",
                        "categoría":       categoria ? categoria.nombre    : "Desconocida",
                        "horas_estimadas": r.horas_estimadas,
                        "fec_pet":         r.fecha_peticion,
                        "fec_ini":         r.fecha_inicio,
                        "fecha_fin":       r.fecha_fin
                    };
                });
                gestorJS.enviarAlMinisterio(idArea, datos);
                return;
            }
            gestorJS.api.get("/api/sanitarios/" + idsSanitarios[i], function(s, sanitario) {
                if (s == 200) sanitarios.push(sanitario);
                pedirSanitario(i + 1);
            });
        }
        pedirSanitario(0);
    },

    // PASO 3: POST al Ministerio con el objeto {id_area, fecha, datos}
    enviarAlMinisterio: function(idArea, datos) {
        var envio = {
            id_area: idArea,
            fecha:   new Date().toISOString().substring(0, 10),   // YYYY-MM-DD
            datos:   datos
        };
        console.log("Enviando al Ministerio:", envio);
        rest.post(gestorJS.URL_MINISTERIO, envio, function(status) {
            if (status == 200 || status == 201) {
                alert("Se han enviado " + datos.length + " reservas al Ministerio");
                gestorJS.cargarRanking();             // refrescar el ranking con lo nuevo
            } else {
                alert("Error al enviar al Ministerio (" + status + ")");
            }
        });
    },

    // RANKING: GET al Ministerio, cuenta las reservas de cada área, ordena de mayor a menor y pinta la tabla
    cargarRanking: function() {
        rest.get(gestorJS.URL_MINISTERIO, function(status, contenido) {
            var tbody = document.querySelector("#tablaRanking tbody");
            tbody.innerHTML = "";
            if (status != 200 || !contenido) {
                tbody.innerHTML = '<tr><td colspan="3">No se han podido obtener los datos del Ministerio</td></tr>';
                return;
            }

            // Un contador por área, empezando en 0
            var ranking = gestorJS.areas.map(function(a) {
                return { id: a.id, nombre: a.nombre, total: 0 };
            });

            // Cada envío trae su id_area y un array "datos" (cada elemento = 1 reserva)
            contenido.forEach(function(envio) {
                var area = ranking.find(a => a.id == envio.id_area);
                if (area && envio.datos) area.total += envio.datos.length;
            });

            // Ordenar de mayor a menor número de reservas
            ranking.sort(function(a, b) { return b.total - a.total; });

            ranking.forEach(function(a, i) {
                var tr = document.createElement("tr");
                tr.innerHTML =
                    "<td>" + (i + 1)  + "</td>" +
                    "<td>" + a.nombre + "</td>" +
                    "<td>" + a.total  + "</td>";
                tbody.appendChild(tr);
            });
        });
    },

    // =================================================================

    // Refresca el listado de recursos y vuelve a la vista principal
    volverListado: function() {
        gestorJS.buscarRecursos();
        gestorJS.cambiarVista("vistaPrincipal");
    }
};