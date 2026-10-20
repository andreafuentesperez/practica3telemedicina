// =====================================================================
// PRÁCTICA 3 - PARTE 3: conexión a PostgreSQL (Supabase)
// ---------------------------------------------------------------------
// Para no reescribir servidor_rest.js ni servidor_rpc.js, este fichero
// ofrece la MISMA función que el paquete mysql:
//        conexion.query(sql, [parametros], function(err, resultado) {...})
// y por dentro traduce lo que cambia entre MySQL y PostgreSQL:
//   1) Los huecos:   MySQL usa  ?      PostgreSQL usa  $1, $2, $3...
//   2) SELECT:       se devuelve el array de filas (igual que mysql)
//   3) INSERT:       se añade "RETURNING id" para tener resultado.insertId
//   4) UPDATE/DELETE: resultado.affectedRows = filas afectadas
//   5) Errores:      los códigos de PostgreSQL se traducen a los de MySQL
//                    (23505 -> ER_DUP_ENTRY, 23503 -> ER_ROW_IS_REFERENCED_2)
// La dirección de la base de datos se lee de la variable de entorno
// DATABASE_URL (en Render se configura en "Environment").
// =====================================================================
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }   // Supabase exige conexión segura (SSL)
});

// Cambia cada ? por $1, $2, $3... (sin tocar los ? que estén dentro de un texto '...')
function traducirHuecos(sql) {
    var n = 0, dentroTexto = false, salida = "";
    for (var i = 0; i < sql.length; i++) {
        var c = sql[i];
        if (c === "'") dentroTexto = !dentroTexto;
        if (c === "?" && !dentroTexto) { n++; salida += "$" + n; }
        else salida += c;
    }
    return salida;
}

// Traduce los códigos de error de PostgreSQL a los que ya comprueba nuestro código
function traducirError(err) {
    if (err.code === "23505") err.code = "ER_DUP_ENTRY";            // valor repetido (UNIQUE)
    else if (err.code === "23503") err.code = "ER_ROW_IS_REFERENCED_2"; // clave foránea
    return err;
}

function query(sql, parametros, callback) {
    if (typeof parametros === "function") { callback = parametros; parametros = []; }

    var sqlPg = traducirHuecos(sql);
    var esInsert = /^\s*INSERT/i.test(sqlPg);
    if (esInsert && !/RETURNING/i.test(sqlPg)) sqlPg += " RETURNING id";

    pool.query(sqlPg, parametros, function(err, res) {
        if (err) return callback(traducirError(err));
        if (res.command === "SELECT") return callback(null, res.rows);
        callback(null, {
            affectedRows: res.rowCount,
            insertId: esInsert && res.rows.length > 0 ? res.rows[0].id : undefined
        });
    });
}

console.log("Usando base de datos PostgreSQL (Supabase)");
module.exports = { query: query };
