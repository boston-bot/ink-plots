const { Pool } = require('pg');

// Use the local connection string provided by the user
const connectionString = process.env.DATABASE_URL || 'postgres://joe.eagan@127.0.0.1:5432/inkplots';

const pool = new Pool({
    connectionString,
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database', err.stack);
    } else {
        console.log('Connected to Postgres. Server time:', res.rows[0].now);
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
