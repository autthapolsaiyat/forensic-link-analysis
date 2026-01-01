// src/config/database.js
const sql = require('mssql');
require('dotenv').config();

const config = {
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool = null;

async function getPool() {
    if (!pool) {
        pool = await sql.connect(config);
        console.log('✅ Database connected');
    }
    return pool;
}

async function query(sqlQuery, params = {}) {
    const pool = await getPool();
    const request = pool.request();
    
    // Add parameters
    Object.entries(params).forEach(([key, value]) => {
        request.input(key, value);
    });
    
    return request.query(sqlQuery);
}

module.exports = { getPool, query, sql };
