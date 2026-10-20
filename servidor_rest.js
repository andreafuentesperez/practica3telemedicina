var express = require("express");
var app = express();
var jwt = require("jwt-simple");                 // PRÁCTICA 3 - PARTE 2: tokens JWT
var clave = "claveSecretaTelemedicina2026";      // clave para firmar los tokens

// ===================== PRÁCTICA 3 - PARTE 3: SUPABASE =====================
// 1. Importar el cliente de Supabase
const { createClient } = require("@supabase/supabase-js");

// 2. Configurar con la URL del proyecto y la Public Key (anon key)
//    (Supabase > Project Settings > API)
const supabaseUrl = "https://kcxndoizmbppipkbsheh.supabase.co";   // <--- Pega aquí tu Project URL
const supabaseKey = "sb_publishable_0sG2TyTonRtphymsNML8eg_gS7v4ZuV";           // <--- Pega aquí tu anon public key
const supabase = createClient(supabaseUrl, supabaseKey);
// ==========================================================================

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
app.post("/api/gestores/login", async function(req, res){
    const { data: gestores, error } = await supabase
        .from("gestores")
        .select("id")
        .eq("usuario", req.body.login)
        .eq("password", req.body.password);

    if (error) return errorBD(res, error);
    if (gestores.length > 0) {
        var contenido = {
            usuario: gestores[0].id,                 // id del gestor
            expira:  Date.now() + 60 * 60 * 1000     // dentro de 1 hora
        };
        var token = jwt.encode(contenido, clave);
        res.json({ id: gestores[0].id, token: token });
    }
    else res.status(403).json({error: "Credenciales incorrectas"});
});

// Registra un nuevo gestor; el usuario debe ser único, retorna el id creado (201) o error 400
app.post("/api/gestores", async function(req, res){
    var {nombre, apellidos, usuario, password} = req.body;
    const { data, error } = await supabase
        .from("gestores")
        .insert({ nombre: nombre, apellidos: apellidos, usuario: usuario, password: password })
        .select("id")      // para que devuelva el id del gestor creado
        .single();         // devuelve un objeto en vez de un array

    if (error) {
        if (error.code === "23505") return res.status(400).json({error: "Usuario ya existe"}); // 23505 = valor repetido
        return errorBD(res, error);
    }
    res.status(201).json(data.id);
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
app.get("/api/ubicaciones", async function(req, res){
    const { data, error } = await supabase.from("ubicaciones").select("*").order("id");
    if (error) return errorBD(res, error);
    res.json(data);
});

// Devuelve todas las categorías
app.get("/api/categorias", async function(req, res){
    const { data, error } = await supabase.from("categorias").select("*").order("id");
    if (error) return errorBD(res, error);
    res.json(data);
});

// Devuelve todos los modelos
app.get("/api/modelos", async function(req, res){
    const { data, error } = await supabase.from("modelos").select("*").order("id");
    if (error) return errorBD(res, error);
    res.json(data);
});

// Devuelve los datos de un gestor por id sin incluir la contraseña; 404 si no existe
app.get("/api/gestores/:id", async function(req, res){
    const { data, error } = await supabase
        .from("gestores")
        .select("id, nombre, apellidos, usuario")
        .eq("id", parseInt(req.params.id));

    if (error) return errorBD(res, error);
    if (data.length === 0) return res.status(404).json({error: "No encontrado"});
    res.json(data[0]);
});

// Actualiza los datos de un gestor; el usuario debe ser único; 404 si no existe, 400 si usuario repetido
// Solo se cambian los campos que llegan rellenos (los vacíos conservan su valor)
app.put("/api/gestores/:id", async function(req, res){
    var id = parseInt(req.params.id);
    var cambios = {};
    if (req.body.nombre)    cambios.nombre    = req.body.nombre;
    if (req.body.apellidos) cambios.apellidos = req.body.apellidos;
    if (req.body.usuario)   cambios.usuario   = req.body.usuario;
    if (req.body.password)  cambios.password  = req.body.password;

    var resultado;
    if (Object.keys(cambios).length === 0) {
        // No hay nada que cambiar: solo se comprueba que el gestor existe
        resultado = await supabase.from("gestores").select("id").eq("id", id);
    } else {
        resultado = await supabase.from("gestores").update(cambios).eq("id", id).select("id");
    }

    if (resultado.error) {
        if (resultado.error.code === "23505") return res.status(400).json({error: "Usuario ya existe"});
        return errorBD(res, resultado.error);
    }
    if (resultado.data.length === 0) return res.status(404).json({error: "No encontrado"});
    res.json({msg: "Actualizado"});
});

// Devuelve los datos de un sanitario por id sin incluir la contraseña; 404 si no existe
app.get("/api/sanitarios/:id", async function(req, res){
    const { data, error } = await supabase
        .from("sanitarios")
        .select("id, nombre, apellidos, usuario")
        .eq("id", parseInt(req.params.id));

    if (error) return errorBD(res, error);
    if (data.length === 0) return res.status(404).json({error: "No encontrado"});
    res.json(data[0]);
});

// Devuelve todos los recursos; admite filtros opcionales por categoria, modelo, ubicacion y estado
app.get("/api/recursos", async function(req, res){
    var consulta = supabase.from("recursos").select("*").order("id");

    // La categoría no está en recursos sino en modelos: se buscan los modelos de esa categoría
    if (req.query.categoria && req.query.categoria !== "Todos") {
        const { data: modelos, error } = await supabase
            .from("modelos")
            .select("id")
            .eq("categoria", parseInt(req.query.categoria));
        if (error) return errorBD(res, error);
        var idsModelos = modelos.map(function(m) { return m.id; });
        consulta = consulta.in("modelo", idsModelos);   // recursos cuyo modelo está en esa lista
    }
    if (req.query.modelo    && req.query.modelo    !== "Todos") consulta = consulta.eq("modelo",    parseInt(req.query.modelo));
    if (req.query.ubicacion && req.query.ubicacion !== "Todos") consulta = consulta.eq("ubicacion", parseInt(req.query.ubicacion));
    if (req.query.estado    && req.query.estado    !== "Todos") consulta = consulta.eq("estado",    parseInt(req.query.estado));

    const { data, error } = await consulta;
    if (error) return errorBD(res, error);
    res.json(data);
});

// Devuelve un recurso concreto por id; 404 si no existe
app.get("/api/recursos/:id", async function(req, res){
    const { data, error } = await supabase.from("recursos").select("*").eq("id", parseInt(req.params.id));
    if (error) return errorBD(res, error);
    if (data.length === 0) return res.status(404).json({error: "No encontrado"});
    res.json(data[0]);
});

// Crea un nuevo recurso con los datos del body; retorna el id creado (201)
app.post("/api/recursos", async function(req, res){
    const { data, error } = await supabase
        .from("recursos")
        .insert({
            modelo:       parseInt(req.body.modelo),
            ubicacion:    parseInt(req.body.ubicacion),
            numero_serie: req.body.numero_serie,
            estado:       parseInt(req.body.estado)
        })
        .select("id")
        .single();

    if (error) return errorBD(res, error);
    res.status(201).json(data.id);
});

// Actualiza los campos indicados de un recurso; 404 si no existe
// Los campos no enviados conservan su valor actual
app.put("/api/recursos/:id", async function(req, res){
    var id = parseInt(req.params.id);
    var b = req.body;
    var cambios = {};
    if (b.modelo    !== undefined) cambios.modelo    = parseInt(b.modelo);
    if (b.ubicacion !== undefined) cambios.ubicacion = parseInt(b.ubicacion);
    if (b.numero_serie)            cambios.numero_serie = b.numero_serie;
    if (b.estado    !== undefined) cambios.estado    = parseInt(b.estado);

    var resultado;
    if (Object.keys(cambios).length === 0) {
        resultado = await supabase.from("recursos").select("id").eq("id", id);
    } else {
        resultado = await supabase.from("recursos").update(cambios).eq("id", id).select("id");
    }

    if (resultado.error) return errorBD(res, resultado.error);
    if (resultado.data.length === 0) return res.status(404).json({error: "No encontrado"});
    res.json({msg: "Actualizado"});
});

// Elimina un recurso por id; 404 si no existe, 409 si tiene reservas o reseñas asociadas
app.delete("/api/recursos/:id", async function(req, res){
    const { data, error } = await supabase
        .from("recursos")
        .delete()
        .eq("id", parseInt(req.params.id))
        .select("id");     // devuelve las filas borradas (para saber si existía)

    if (error) {
        if (error.code === "23503")   // 23503 = clave foránea: tiene reservas o reseñas
            return res.status(409).json({error: "El recurso tiene reservas o reseñas asociadas"});
        return errorBD(res, error);
    }
    if (data.length === 0) return res.status(404).json({error: "No encontrado"});
    res.status(200).json({msg: "Borrado"});
});

// Junta nombre y apellidos del sanitario (que Supabase devuelve en un objeto aparte)
// en el campo sanitario_nombre, como hacía antes el CONCAT de MySQL
function anyadirNombreSanitario(filas) {
    return filas.map(function(fila) {
        var s = fila.sanitarios;
        fila.sanitario_nombre = s ? s.nombre + " " + s.apellidos : "Desconocido";
        delete fila.sanitarios;
        return fila;
    });
}

// Devuelve las reservas de un recurso enriquecidas con el nombre del sanitario
app.get("/api/recursos/:id/reservas", async function(req, res){
    const { data, error } = await supabase
        .from("reservas")
        .select("*, sanitarios(nombre, apellidos)")   // trae también los datos del sanitario (clave foránea)
        .eq("recurso", parseInt(req.params.id))
        .order("fecha_peticion");

    if (error) return errorBD(res, error);
    res.json(anyadirNombreSanitario(data));
});

// Devuelve las reseñas de un recurso enriquecidas con el nombre del sanitario
app.get("/api/recursos/:id/resenyas", async function(req, res){
    const { data, error } = await supabase
        .from("resenyas")
        .select("*, sanitarios(nombre, apellidos)")
        .eq("recurso", parseInt(req.params.id))
        .order("fecha");

    if (error) return errorBD(res, error);
    res.json(anyadirNombreSanitario(data));
});

// El servidor HTTP lo levanta servidor.js
module.exports = app;
