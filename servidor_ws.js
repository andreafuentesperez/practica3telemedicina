var WebSocket = require("ws");
var datos = require("./datos.js");

// Mapa de clientes conectados: ws -> { tipo: "sanitario"|"gestor", id: number, nombre: string }
var clientes = new Map();

function iniciarServidorWS(httpServer) {
    var wss = new WebSocket.Server({ server: httpServer });

    wss.on("connection", function(ws) {

        ws.on("message", function(mensaje) {
            var msg;
            try { msg = JSON.parse(mensaje); } catch(e) { return; }

            // El cliente se identifica al conectarse
            if (msg.tipo === "identificar") {
                clientes.set(ws, { tipo: msg.rol, id: msg.id, nombre: msg.nombre });
                return;
            }

            var info = clientes.get(ws);
            if (!info) return;

            // --- AVISO TIPO A: sanitario inicia o finaliza una reserva ---
            // Enviar a todos los sanitarios conectados con reserva activa sobre ese recurso
            if (msg.tipo === "accion_reserva") {
                var idRecurso = msg.idRecurso;
                // Sanitarios con reserva activa (no finalizada) sobre ese recurso
                var idsSanitariosAfectados = datos.reservas
                    .filter(function(r) { return r.recurso === idRecurso && r.fecha_fin === null && r.sanitario !== info.id; })
                    .map(function(r) { return r.sanitario; });
                // Eliminar duplicados
                idsSanitariosAfectados = idsSanitariosAfectados.filter(function(v, i, a) { return a.indexOf(v) === i; });

                var aviso = {
                    tipo:   "aviso",
                    color:  "rojo",
                    fecha:  new Date().toLocaleString(),
                    origen: info.nombre,
                    texto:  "SE HA " + msg.accion + " LA RESERVA DEL " + msg.nombreCategoria +
                            " MODELO " + msg.nombreModelo + " CON CÓDIGO " + msg.numeroSerie
                };

                clientes.forEach(function(c, clienteWs) {
                    if (c.tipo === "sanitario" && idsSanitariosAfectados.indexOf(c.id) !== -1) {
                        if (clienteWs.readyState === WebSocket.OPEN) {
                            clienteWs.send(JSON.stringify(aviso));
                        }
                    }
                });
            }

            // --- AVISO TIPO B: gestor crea un recurso nuevo ---
            // Enviar a todos los sanitarios conectados
            if (msg.tipo === "nuevo_recurso") {
                var aviso = {
                    tipo:   "aviso",
                    color:  "azul",
                    fecha:  new Date().toLocaleString(),
                    origen: info.nombre,
                    texto:  "SE HA CREADO UN NUEVO RECURSO " + msg.nombreCategoria +
                            " MODELO " + msg.nombreModelo + " CON CÓDIGO " + msg.numeroSerie
                };

                clientes.forEach(function(c, clienteWs) {
                    if (c.tipo === "sanitario") {
                        if (clienteWs.readyState === WebSocket.OPEN) {
                            clienteWs.send(JSON.stringify(aviso));
                        }
                    }
                });
            }

            // --- AVISO TIPO C: sanitario crea una reseña ---
            // Enviar a todos los gestores conectados
            if (msg.tipo === "nueva_resenya") {
                var aviso = {
                    tipo:   "aviso",
                    color:  "verde",
                    fecha:  new Date().toLocaleString(),
                    origen: info.nombre,
                    texto:  "SE HA CREADO UNA RESEÑA PARA EL " + msg.nombreCategoria +
                            " MODELO " + msg.nombreModelo + " CON CÓDIGO " + msg.numeroSerie +
                            " Y PUNTUACIÓN " + msg.puntuacion
                };

                clientes.forEach(function(c, clienteWs) {
                    if (c.tipo === "gestor") {
                        if (clienteWs.readyState === WebSocket.OPEN) {
                            clienteWs.send(JSON.stringify(aviso));
                        }
                    }
                });
            }
        });

        ws.on("close", function() {
            clientes.delete(ws);
        });
    });

    console.log("Servidor WebSocket iniciado (integrado en el servidor HTTP)");
}

module.exports = { iniciarServidorWS };
