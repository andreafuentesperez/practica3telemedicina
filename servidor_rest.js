var express = require("express");
var app = express();
var conexion = require("./conexion_mysql.js"); // Conexión a la base de datos telemedicina2026
var jwt = require("jwt-simple");                 // PRÁCTICA 3 - PARTE 2: tokens JWT
var clave = "claveSecretaTelemedicina2026";      // clave para firmar los tokens

app.use(express.json()); 
app.use(express.static("cliente_rest")); // Sirve la app del gestor
app.use("/sanitario", express.static("cliente_rpc")); // Sirve la app del sanitario

// Responde con un error 500 si falla una consulta
function errorBD(res, err) {
    console.error("Error en la base de datos:", err);
    res.status(500).json({error: "Error en la base de datos"});
}

// ----- SERVICIOS PÚBLICOS (sin token) -----

// Valida las credenciales del gestor; retorna {id, token} (200) o error 403
// PRÁCTICA 3 - PARTE 2: si son correctas se genera el token JWT (caduca en 1 hora)
app.post("/api/gestores/login", function(req, res){
    var sql = "SELECT id FROM gestores WHERE usuario = ? AND password = ?";
    conexion.query(sql, [req.body.login, req.body.password], function(err, filas){
        if (err) return errorBD(res, err);
        if (filas.length > 0) {
            var contenido = {
                usuario: filas[0].id,                    // id del gestor
                expira:  Date.now() + 60 * 60 * 1000     // dentro de 1 hora
            };
            var token = jwt.encode(contenido, clave);
            res.json({ id: filas[0].id, token: token });
        }
        else res.status(403).json({error: "Credenciales incorrectas"});
    });
});

// Registra un nuevo gestor; el usuario debe ser único, retorna el id creado (201) o error 400
app.post("/api/gestores", function(req, res){
    var {nombre, apellidos, usuario, password} = req.body;
    var sql = "INSERT INTO gestores (nombre, apellidos, usuario, password) VALUES (?, ?, ?, ?)";
    conexion.query(sql, [nombre, apellidos, usuario, password], function(err, resultado){
        if (err) {
            if (err.code === "ER_DUP_ENTRY") return res.status(400).json({error: "Usuario ya existe"});
            return errorBD(res, err);
        }
        res.status(201).json(resultado.insertId);
    });
});

// ===================== PRÁCTICA 3 - PARTE 2: JWT =====================
// "Portero": se ejecuta antes de TODOS los servicios /api que estén declarados DEBAJO.
// Los de arriba (login y registro) quedan públicos.
app.use("/api", function(req, res, next) {
    var token = req.query.token;
    if (!token) {
        res.status(401).json({error: "No se ha encontrado token"});
        return;
    }
    try {
        var contenidoToken = jwt.decode(token, clave);
    } catch (error) {
        res.status(401).json({error: "El token es incorrecto"});
        return;
    }
    if (!contenidoToken || !contenidoToken.expira || !contenidoToken.usuario) {
        res.status(401).json({error: "El formato del token no es adecuado"});
        return;
    }
    if (contenidoToken.expira < Date.now()) {
        res.status(401).json({error: "El token ha expirado"});
        return;
    }
    next();   // token correcto -> pasa al servicio pedido
});
// ======================================================================

// ----- SERVICIOS PROTEGIDOS (necesitan ?token=) -----

// Devuelve todas las ubicaciones
app.get("/api/ubicaciones", function(req, res){
    conexion.query("SELECT * FROM ubicaciones", function(err, filas){
        if (err) return errorBD(res, err);
        res.json(filas);
    });
});

// Devuelve todas las categorías
app.get("/api/categorias", function(req, res){
    conexion.query("SELECT * FROM categorias", function(err, filas){
        if (err) return errorBD(res, err);
        res.json(filas);
    });
});

// Devuelve todos los modelos
app.get("/api/modelos", function(req, res){
    conexion.query("SELECT * FROM modelos", function(err, filas){
        if (err) return errorBD(res, err);
        res.json(filas);
    });
});

// Devuelve los datos de un gestor por id sin incluir la contraseña; 404 si no existe
app.get("/api/gestores/:id", function(req, res){
    var sql = "SELECT id, nombre, apellidos, usuario FROM gestores WHERE id = ?";
    conexion.query(sql, [parseInt(req.params.id)], function(err, filas){
        if (err) return errorBD(res, err);
        if (filas.length === 0) return res.status(404).json({error: "No encontrado"});
        res.json(filas[0]);
    });
});

// Actualiza los datos de un gestor; el usuario debe ser único; 404 si no existe, 400 si usuario repetido
app.put("/api/gestores/:id", function(req, res){
    var id = parseInt(req.params.id);
    var {nombre, apellidos, usuario, password} = req.body;
    var sql = "UPDATE gestores SET " +
              "nombre    = COALESCE(NULLIF(?, ''), nombre), " +
              "apellidos = COALESCE(NULLIF(?, ''), apellidos), " +
              "usuario   = COALESCE(NULLIF(?, ''), usuario), " +
              "password  = COALESCE(NULLIF(?, ''), password) " +
              "WHERE id = ?";
    conexion.query(sql, [nombre, apellidos, usuario, password, id], function(err, resultado){
        if (err) {
            if (err.code === "ER_DUP_ENTRY") return res.status(400).json({error: "Usuario ya existe"});
            return errorBD(res, err);
        }
        if (resultado.affectedRows === 0) return res.status(404).json({error: "No encontrado"});
        res.json({msg: "Actualizado"});
    });
});

// Devuelve los datos de un sanitario por id sin incluir la contraseña; 404 si no existe
app.get("/api/sanitarios/:id", function(req, res){
    var sql = "SELECT id, nombre, apellidos, usuario FROM sanitarios WHERE id = ?";
    conexion.query(sql, [parseInt(req.params.id)], function(err, filas){
        if (err) return errorBD(res, err);
        if (filas.length === 0) return res.status(404).json({error: "No encontrado"});
        res.json(filas[0]);
    });
});

// Devuelve todos los recursos; admite filtros opcionales por categoria, modelo, ubicacion y estado
app.get("/api/recursos", function(req, res){
    var sql = "SELECT r.* FROM recursos r JOIN modelos m ON r.modelo = m.id WHERE 1 = 1";
    var params = [];
    if (req.query.categoria && req.query.categoria !== "Todos") { sql += " AND m.categoria = ?"; params.push(req.query.categoria); }
    if (req.query.modelo    && req.query.modelo    !== "Todos") { sql += " AND r.modelo = ?";    params.push(req.query.modelo); }
    if (req.query.ubicacion && req.query.ubicacion !== "Todos") { sql += " AND r.ubicacion = ?"; params.push(req.query.ubicacion); }
    if (req.query.estado    && req.query.estado    !== "Todos") { sql += " AND r.estado = ?";    params.push(req.query.estado); }
    sql += " ORDER BY r.id";
    conexion.query(sql, params, function(err, filas){
        if (err) return errorBD(res, err);
        res.json(filas);
    });
});

// Devuelve un recurso concreto por id; 404 si no existe
app.get("/api/recursos/:id", function(req, res){
    conexion.query("SELECT * FROM recursos WHERE id = ?", [parseInt(req.params.id)], (err, filas) => {
        if (err) return errorBD(res, err);
        if (filas.length === 0) return res.status(404).json({error: "No encontrado"});
        res.json(filas[0]);
    });
});

// Crea un nuevo recurso con los datos del body; retorna el id creado (201)
app.post("/api/recursos", function(req, res){
    var sql = "INSERT INTO recursos (modelo, ubicacion, numero_serie, estado) VALUES (?, ?, ?, ?)";
    var params = [
        parseInt(req.body.modelo),
        parseInt(req.body.ubicacion),
        req.body.numero_serie,
        parseInt(req.body.estado)
    ];
    conexion.query(sql, params, function(err, resultado){
        if (err) return errorBD(res, err);
        res.status(201).json(resultado.insertId);
    });
});

// Actualiza los campos indicados de un recurso; 404 si no existe
// Los campos no enviados conservan su valor actual
app.put("/api/recursos/:id", function(req, res){
    var id = parseInt(req.params.id);
    var b = req.body;
    var sql = "UPDATE recursos SET " +
              "modelo       = COALESCE(?, modelo), " +
              "ubicacion    = COALESCE(?, ubicacion), " +
              "numero_serie = COALESCE(NULLIF(?, ''), numero_serie), " +
              "estado       = COALESCE(?, estado) " +
              "WHERE id = ?";
    var params = [
        b.modelo    !== undefined ? parseInt(b.modelo)    : null,
        b.ubicacion !== undefined ? parseInt(b.ubicacion) : null,
        b.numero_serie,
        b.estado    !== undefined ? parseInt(b.estado)    : null,
        id
    ];
    conexion.query(sql, params, function(err, resultado){
        if (err) return errorBD(res, err);
        if (resultado.affectedRows === 0) return res.status(404).json({error: "No encontrado"});
        res.json({msg: "Actualizado"});
    });
});

// Elimina un recurso por id; 404 si no existe, 409 si tiene reservas o reseñas asociadas
app.delete("/api/recursos/:id", function(req, res){
    conexion.query("DELETE FROM recursos WHERE id = ?", [parseInt(req.params.id)], function(err, resultado){
        if (err) {
            if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED")
                return res.status(409).json({error: "El recurso tiene reservas o reseñas asociadas"});
            return errorBD(res, err);
        }
        if (resultado.affectedRows === 0) return res.status(404).json({error: "No encontrado"});
        res.status(200).json({msg: "Borrado"});
    });
});

// Devuelve las reservas de un recurso enriquecidas con el nombre del sanitario
app.get("/api/recursos/:id/reservas", function(req, res){
    var sql = "SELECT r.*, COALESCE(CONCAT(s.nombre, ' ', s.apellidos), 'Desconocido') AS sanitario_nombre " +
              "FROM reservas r LEFT JOIN sanitarios s ON r.sanitario = s.id " +
              "WHERE r.recurso = ? ORDER BY r.fecha_peticion";
    conexion.query(sql, [parseInt(req.params.id)], function(err, filas){
        if (err) return errorBD(res, err);
        res.json(filas);
    });
});

// Devuelve las reseñas de un recurso enriquecidas con el nombre del sanitario
app.get("/api/recursos/:id/resenyas", function(req, res){
    var sql = "SELECT r.*, COALESCE(CONCAT(s.nombre, ' ', s.apellidos), 'Desconocido') AS sanitario_nombre " +
              "FROM resenyas r LEFT JOIN sanitarios s ON r.sanitario = s.id " +
              "WHERE r.recurso = ? ORDER BY r.fecha";
    conexion.query(sql, [parseInt(req.params.id)], function(err, filas){
        if (err) return errorBD(res, err);
        res.json(filas);
    });
});

// El servidor HTTP lo levanta servidor.js para poder compartirlo con WebSocket
module.exports = app;