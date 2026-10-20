var http = require("http");
var app  = require("./servidor_rest.js");   // Exporta la app Express
// var ws   = require("./servidor_ws.js");

// PRÁCTICA 3 - PARTE 3: el servidor RPC del sanitario usa MySQL (XAMPP), que en Render no existe.
// Render crea automáticamente la variable RENDER, así que el RPC solo se arranca en tu ordenador.
if (!process.env.RENDER) {
    require("./servidor_rpc.js");
}

// Crear servidor HTTP sobre la app Express para poder compartirlo con WebSocket
var servidor = http.createServer(app);

// Iniciar WebSocket sobre el mismo servidor HTTP
// ws.iniciarServidorWS(servidor);

// PRÁCTICA 3 - PARTE 3: Render indica el puerto en la variable PORT; en local se usa el 3000
var PUERTO = process.env.PORT || 3000;

servidor.listen(PUERTO, function() {
    console.log("Servidor iniciado en el puerto " + PUERTO);
});