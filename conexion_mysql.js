// PRÁCTICA 3 - PARTE 3: si existe la variable DATABASE_URL (en Render) se usa PostgreSQL (Supabase);
// si no existe (en tu ordenador) se sigue usando MySQL de XAMPP como siempre.
if (process.env.DATABASE_URL) {
    module.exports = require("./conexion_postgres.js");
} else {
    const mysql = require('mysql');
    const database = {
        host : 'localhost',
        user : 'andrea',
        password : '123',
        database : 'telemedicina2026'
    };

    const conexion = mysql.createConnection(database);

    conexion.connect(function (err) {
        if (err) {
            console.error('Error en la conexión de la base de datos:',err);
            process.exit();
        }
    });

    module.exports = conexion;
}