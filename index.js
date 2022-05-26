// DESAFÍO - MI BANCO
// Hay 5 alternativas de transacción: nueva, depositar, retirar, consulta y saldo.
// Las cuentas se deben crear de antemano en la BD.
// Modo de uso: node index.js "tipo de transacción" "id cuenta" "monto" "descripcion" "fecha"

// EJ.: Para retirar de $200 de la cuenta 1, escribir en consola: "node index.js retirar 1 200 'retiro en efectivo' 25/05/2022"
// EJ.: Nueva transacción por $500 de la cuenta 1: escribir en consola: "node index.js nueva 1 500 'compra almacén' 25/05/2022"
// Ej.: consultar el saldo de la cuenta 1, escribir en consola: "node index.js saldo 1"
// Ej.: Consultar ultimas transacciones de la cuena 1, escribir en consola: "node index.js consulta 1"

/* CREATE DATABASE Banco;
CREATE TABLE transacciones (descripcion varchar ( 50 ), fecha varchar ( 10 ), monto DECIMAL , cuenta INT );
CREATE TABLE cuentas ( id INT , saldo DECIMAL CHECK (saldo >= 0 ) );

INSERT INTO cuentas values ( 1 , 20000 );
INSERT INTO cuentas values ( 2 , 20000 ); */

const { Pool } = require('pg');
const Cursor = require("pg-cursor");
const argumentos = process.argv.slice(2);
//se asigna a cada variable los valores del arreglo obtenido de preocess
let tipo = argumentos[0]; 
let cuenta = argumentos[1];
let monto = argumentos[2];
let descripcion = argumentos[3];
let fecha = argumentos[4];

// Constante del objeto de configuracion
const config = {
    user: "postgres",
    host: "localhost",
    password: "admin",
    database: "Banco",
    port: 5432,
    max: 20,
    min: 2,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 2000
};

// Se instancia la clase Pool y como parametro el objeto de configuracion, asignando su instancia a la constante pool
const pool = new Pool(config);



// Función asíncrona para transacción nueva:
const nueva = async (cuenta, monto, descripcion, fecha, client) => {
    //const sumar = `UPDATE cuentas SET saldo = saldo + ${monto} WHERE id = ${cuenta2} RETURNING *`;
    const restar = `UPDATE cuentas SET saldo = saldo - ${monto} WHERE id = ${cuenta} RETURNING *`;
    const insert = `INSERT INTO transacciones (cuenta, monto, descripcion, fecha) VALUES (${cuenta}, ${monto}, '${descripcion}', NOW())  RETURNING *;`; //${fecha}
    try {
        await client.query("BEGIN");
       // await client.query(sumar);
        await client.query(restar);
        const res = await client.query(insert);
        console.clear();
        console.log(`Transacción por $${monto} desde cuenta N°${cuenta} realizada satisfactoriamente.`);
        console.table(res.rows[0])
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.log('Mensaje error en insert: ', e.message);
        console.log('error.code: ', e.code);
        console.log('error.detail: ', e.detail);
        console.log("Tabla originaria del error: " + e.table);
        console.log("Restricción violada en el campo: " + e.constraint);
    }
}

// Función asíncrona para un depósito:
const depositar = async (cuenta, monto, descripcion, fecha, client) => {
    try {
        const sumar = `UPDATE cuentas SET saldo = saldo + ${monto} WHERE id = ${cuenta} RETURNING *`;
        const insert = `INSERT INTO transacciones (cuenta, monto, descripcion, fecha) VALUES (${cuenta}, ${monto}, '${descripcion}', '${fecha}')  RETURNING *;`;
        await client.query("BEGIN");
        await client.query(sumar);
        const res = await client.query(insert);
        console.clear();
        console.log(`Se ha realizado un depósito de $${monto} a la cuenta N°${cuenta}.`);
        console.table(res.rows[0]);
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.log('e.depositar: ', e.message);
        console.log('Error código: ', e.code);
        console.log('Detalle del error: ', e.detail);
        console.log('Tabla originaria del error: ', e.table);
        console.log('Restricción violada en el campo: ', e.constraint);
    }
}

// Función asíncrona para retiro:
const retirar = async (cuenta, monto, descripcion, fecha, client) => {
    try {
        const restar = `UPDATE cuentas SET saldo = saldo - ${monto} WHERE id = ${cuenta} RETURNING *`;
        const insert = `INSERT INTO transacciones (cuenta, monto, descripcion, fecha) VALUES (${cuenta}, ${monto}, '${descripcion}', '${fecha}')  RETURNING *;`;
        await client.query("BEGIN");
        await client.query(restar);
        const res = await client.query(insert);
        console.clear();
        console.log(`Se ha realizado un retiro por $${monto} de la cuenta N°${cuenta}`);
        console.table(res.rows[0]);
        
        await client.query("COMMIT");
    } catch (e) {
        await client.query("ROLLBACK");
        console.log('e.message: ', e.message);
        console.log('Error código: ', e.code);
        console.log('Detalle del error: ', e.detail);
        console.log('Tabla originaria del error: ', e.table);
        console.log('Restricción violada en el campo: ', e.constraint);
    }
}

// Función asíncrona para consultar las transacciones en la cuenta:
const consulta = async (cuenta, client) => {
    const select = new Cursor(`SELECT * FROM transacciones WHERE cuenta = ${cuenta}`);
    const cursor = await client.query(select);

    let rows;
    rows = await cursor.read(10);
    console.clear();
    console.log(`Las transacciones de la cuenta N°${cuenta} son:`);
    console.table(rows);
    await cursor.close();
}

// Función asíncrona para consultar saldo en la cuenta:
const saldo = async (cuenta, client) => {
    const select = new Cursor(`SELECT saldo, id FROM cuentas where id = ${cuenta}`);
    const cursor = client.query(select);
    let rows;
    rows = await cursor.read(1);
    console.clear();
    console.log(`El saldo de la cuenta N°${cuenta} es: $`, rows[0].saldo);
    await cursor.close();
}

// Funcion asincrona para registrar la nueva transacción en la base de datos con el selector por tipo 
const transaccion = async (tipo, cuenta, monto, descripcion, fecha) => {
    pool.connect(async (error_conexion, client, release) => {
        if (error_conexion)
            return console.error('Código del error: ', error_conexion.code);    
        try {
            switch (tipo) {
                case "nueva":
                    await nueva(cuenta, monto, descripcion, fecha, client)
                    break;
                case "depositar":
                    await depositar(cuenta, monto, descripcion, fecha, client)
                    break;
                case "retirar":
                    await retirar(cuenta, monto, descripcion, fecha, client)
                    break;
                case "consulta":
                    await consulta(cuenta, client)
                    break;
                case "saldo":
                    await saldo(cuenta, client)
                    break;
                default:                                            //tipo, cuenta, monto, descripcion, fecha
                    console.log("Ingresar un comando válido porfavor (nueva, depositar, retirar, consulta o saldo)")
                    break;
            }
        } catch (e) {
            console.log('Error externo de try catch: ', e.message);
            console.log('Error código: ', e.code);
            console.log('Detalle del error: ', e.detail);
            console.log('Tabla originaria del error: ', e.table);
            console.log('Restricción violada en el campo: ', e.constraint);
        }

        release();
        pool.end();
    });
}

transaccion(tipo, cuenta, monto, descripcion, fecha);