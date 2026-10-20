var http = require("http");
var app  = require("./servidor_rest.js");   // Exporta la app Express
// var ws   = require("./servidor_ws.js");

require("./servidor_rpc.js");

// Crear servidor HTTP sobre la app Express para poder compartirlo con WebSocket
var servidor = http.createServer(app);

// Iniciar WebSocket sobre el mismo servidor HTTP
// ws.iniciarServidorWS(servidor);

servidor.listen(3000, function() {
    console.log("Servidor HTTP+WS iniciado en http://localhost:3000");
});