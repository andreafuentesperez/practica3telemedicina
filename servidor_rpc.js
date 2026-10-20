var rpc   = require("./rpc.js");
var conexion = require("./conexion_mysql.js"); // Conexión a la base de datos telemedicina2026

// Muestra el error en consola y devuelve al cliente el valor indicado (null o false)
function errorBD(err, callback, valor) {
    console.error("Error en la base de datos:", err);
    callback(valor);
}

// Devuelve el array completo de categorías
function obtenerCategorias(callback) {
    conexion.query("SELECT * FROM categorias", function(err, filas){
        if (err) return errorBD(err, callback, []);
        callback(filas);
    });
}

// Devuelve el array completo de modelos
function obtenerModelos(callback) {
    conexion.query("SELECT * FROM modelos", function(err, filas){
        if (err) return errorBD(err, callback, []);
        callback(filas);
    });
}

// Devuelve el array completo de ubicaciones
function obtenerUbicaciones(callback) {
    conexion.query("SELECT * FROM ubicaciones", function(err, filas){
        if (err) return errorBD(err, callback, []);
        callback(filas);
    });
}

// Valida las credenciales del sanitario; retorna su id si son correctas o null si no
function loginSanitario(usuario, password, callback) {
    var sql = "SELECT id FROM sanitarios WHERE usuario = ? AND password = ?";
    conexion.query(sql, [usuario, password], function(err, filas){
        if (err) return errorBD(err, callback, null);
        callback(filas.length > 0 ? filas[0].id : null);
    });
}

// Crea un nuevo sanitario; el usuario debe ser único; retorna el id creado o null si falla
function crearSanitario(datosSanitario, callback) {
    var sql = "INSERT INTO sanitarios (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
    var params = [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario, datosSanitario.password];
    conexion.query(sql, params, function(err, resultado){
        if (err) {
            if (err.code === "ER_DUP_ENTRY") return callback(null); // Usuario repetido
            return errorBD(err, callback, null);
        }
        callback(resultado.insertId);
    });
}
// Actualiza los datos de un sanitario; el usuario debe ser único; retorna true o null si falla
function actualizarSanitario(idSanitario, datosSanitario, callback) {
    var sql = "UPDATE sanitarios SET " +
              "nombre    = COALESCE(NULLIF(?, ''), nombre), " +
              "apellidos = COALESCE(NULLIF(?, ''), apellidos), " +
              "usuario   = COALESCE(NULLIF(?, ''), usuario), " +
              "password  = COALESCE(NULLIF(?, ''), password) " +
              "WHERE id = ?";
    var params = [datosSanitario.nombre, datosSanitario.apellidos, datosSanitario.usuario, datosSanitario.password, idSanitario];
    conexion.query(sql, params, function(err, resultado){
        if (err) {
            if (err.code === "ER_DUP_ENTRY") return callback(null); // Usuario repetido
            return errorBD(err, callback, null);
        }
        callback(resultado.affectedRows > 0 ? true : null); // null si el sanitario no existe
    });
}

// Devuelve los datos de un sanitario por id sin la contraseña; null si no existe
function obtenerSanitario(idSanitario, callback) {
    var sql = "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?";
    conexion.query(sql, [idSanitario], function(err, filas){
        if (err) return errorBD(err, callback, null);
        callback(filas.length > 0 ? filas[0] : null);
    });
}

// Devuelve los recursos operativos (estado=0) de un modelo, enriquecidos con el nombre de ubicación
function obtenerRecursos(idModelo, callback) {
    var sql = "SELECT r.*, COALESCE(u.nombre, 'Desconocido') AS nombre_ubicacion " +
              "FROM recursos r LEFT JOIN ubicaciones u ON r.ubicacion = u.id " +
              "WHERE r.modelo = ? AND r.estado = 0 ORDER BY r.id";
    conexion.query(sql, [idModelo], function(err, filas){
        if (err) return errorBD(err, callback, []);
        callback(filas);
    });
}

// Calcula las horas restantes hasta que el recurso esté disponible; retorna 0 si ya está libre.
// Encadena el tiempo de la reserva activa más las horas estimadas de las reservas pendientes posteriores
function tiempoPendiente(idRecurso, callback) {
    var sql = "SELECT * FROM reservas WHERE recurso = ? AND fecha_fin IS NULL ORDER BY fecha_peticion";
    conexion.query(sql, [idRecurso], function(err, activas){
        if (err) return errorBD(err, callback, 0);
        if (activas.length === 0) return callback(0);
        var ahora = new Date();
        var tiempoLibre = ahora;
        for (var i = 0; i < activas.length; i++) {
            var r = activas[i];
            if (r.fecha_inicio) {
                // Reserva en curso: termina en fecha_inicio + horas_estimadas
                var fin = new Date(new Date(r.fecha_inicio).getTime() + r.horas_estimadas * 3600000);
                if (fin > tiempoLibre) tiempoLibre = fin;
            } else {
                // Reserva pendiente: se suma al tiempo acumulado
                tiempoLibre = new Date(tiempoLibre.getTime() + r.horas_estimadas * 3600000);
            }
        }
        var h = (tiempoLibre - ahora) / 3600000;
        callback(h > 0 ? Math.round(h * 10) / 10 : 0);
    });
}

// Devuelve todas las reservas de un sanitario enriquecidas con nombre de recurso, modelo, categoría y ubicación
function obtenerReservas(idSanitario, callback) {
    var sql = "SELECT r.*, " +
              "COALESCE(rec.numero_serie, 'Desconocido') AS numero_serie, " +
              "COALESCE(m.nombre, 'Desconocido')         AS nombre_modelo, " +
              "COALESCE(c.nombre, 'Desconocido')         AS nombre_categoria, " +
              "COALESCE(u.nombre, 'Desconocido')         AS nombre_ubicacion " +
              "FROM reservas r " +
              "LEFT JOIN recursos    rec ON r.recurso     = rec.id " +
              "LEFT JOIN modelos     m   ON rec.modelo    = m.id " +
              "LEFT JOIN categorias  c   ON m.categoria   = c.id " +
              "LEFT JOIN ubicaciones u   ON rec.ubicacion = u.id " +
              "WHERE r.sanitario = ? ORDER BY r.fecha_peticion";
    conexion.query(sql, [idSanitario], function(err, filas){
        if (err) return errorBD(err, callback, []);
        callback(filas);
    });
}
// Devuelve las reseñas de un recurso enriquecidas con el nombre del sanitario que las hizo
function obtenerResenyas(idRecurso, callback) {
    var sql = "SELECT r.*, COALESCE(CONCAT(s.nombre, ' ', s.apellidos), 'Desconocido') AS sanitario_nombre " +
              "FROM resenyas r LEFT JOIN sanitarios s ON r.sanitario = s.id " +
              "WHERE r.recurso = ? ORDER BY r.fecha";
    conexion.query(sql, [idRecurso], function(err, filas){
        if (err) return errorBD(err, callback, []);
        callback(filas);
    });
}

// Registra una nueva reseña para un recurso; retorna el id creado o null si faltan datos
function crearResenya(idRecurso, idSanitario, valoracion, descripcion, callback) {
    if (!idRecurso || !idSanitario || !valoracion) return callback(null);
    var sql = "INSERT INTO resenyas (recurso, sanitario, fecha, valor, descripcion) VALUES (?, ?, NOW(), ?, ?)";
    conexion.query(sql, [idRecurso, idSanitario, valoracion, descripcion || ""], function(err, resultado){
        if (err) return errorBD(err, callback, null);
        callback(resultado.insertId);
    });
}

// Crea una reserva pendiente para un recurso; retorna el id de la reserva o null si faltan datos
function reservarRecurso(idRecurso, idSanitario, horasEstimadas, callback) {
    if (!idRecurso || !idSanitario || !horasEstimadas) return callback(null);
    var sql = "INSERT INTO reservas (recurso, sanitario, horas_estimadas, fecha_peticion, fecha_inicio, fecha_fin) " +
              "VALUES (?, ?, ?, NOW(), NULL, NULL)";
    conexion.query(sql, [idRecurso, idSanitario, horasEstimadas], function(err, resultado){
        if (err) return errorBD(err, callback, null);
        callback(resultado.insertId);
    });
}

// Elimina una reserva pendiente; retorna true si se borró o false si no se encontró
function cancelarReserva(idReserva, callback) {
    conexion.query("DELETE FROM reservas WHERE id = ?", [idReserva], function(err, resultado){
        if (err) return errorBD(err, callback, false);
        callback(resultado.affectedRows > 0);
    });
}

// Marca la fecha_inicio de una reserva (el sanitario retira el recurso); retorna true o false
function iniciarReserva(idReserva, callback) {
    conexion.query("UPDATE reservas SET fecha_inicio = NOW() WHERE id = ?", [idReserva], function(err, resultado){
        if (err) return errorBD(err, callback, false);
        callback(resultado.affectedRows > 0);
    });
}

// Marca la fecha_fin de una reserva (el sanitario devuelve el recurso); retorna true o false
function finalizarReserva(idReserva, callback) {
    conexion.query("UPDATE reservas SET fecha_fin = NOW() WHERE id = ?", [idReserva], function(err, resultado){
        if (err) return errorBD(err, callback, false);
        callback(resultado.affectedRows > 0);
    });
}

// Devuelve los datos de un recurso concreto por id, o null si no existe
function obtenerRecurso(idRecurso, callback) {
    conexion.query("SELECT * FROM recursos WHERE id = ?", [idRecurso], function(err, filas){
        if (err) return errorBD(err, callback, null);
        callback(filas.length > 0 ? filas[0] : null);
    });
}


// Crea el servidor RPC en el puerto 3501 y registra todos los procedimientos bajo la app "hospital"
var servidor = rpc.server(3501, () => console.log("Servidor RPC iniciado en puerto 3501"));
var appRPC = servidor.createApp("hospital");

appRPC.registerAsync(obtenerCategorias);
appRPC.registerAsync(obtenerModelos);
appRPC.registerAsync(obtenerUbicaciones);
appRPC.registerAsync(loginSanitario);
appRPC.registerAsync(crearSanitario);
appRPC.registerAsync(actualizarSanitario);
appRPC.registerAsync(obtenerSanitario);
appRPC.registerAsync(obtenerRecursos);
appRPC.registerAsync(tiempoPendiente);
appRPC.registerAsync(obtenerReservas);
appRPC.registerAsync(obtenerResenyas);
appRPC.registerAsync(crearResenya);
appRPC.registerAsync(reservarRecurso);
appRPC.registerAsync(cancelarReserva);
appRPC.registerAsync(iniciarReserva);
appRPC.registerAsync(finalizarReserva);
appRPC.registerAsync(obtenerRecurso);