// Polyfill for Node 14 compatibility
if (!Object.hasOwn) {
    Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123'; // In prod, use .env!

app.use(cors());
app.use(bodyParser.json());

// Basic health check
app.get('/', (req, res) => {
    res.json({ message: 'Ink Plots API is running' });
});

// Example endpoint: Get all users (demo)
app.get('/users', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM users LIMIT 10');
        res.json(rows);
    } catch (err) {
        // If the table doesn't exist, provide a helpful message
        if (err.code === '42P01') {
            return res.status(500).json({ error: "Table 'users' does not exist yet. Please create it in your Postgres database." });
        }
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Placeholder for S3 uploads (Presigned URLs would go here)
app.post('/api/upload-url', async (req, res) => {
    // In a real app, this would use aws-sdk to generate a presigned PUT URL
    res.json({
        url: 'https://s3.amazonaws.com/your-bucket/fake-presigned-url',
        message: 'This is a placeholder. Configure AWS credentials to enable real uploads.'
    });
});


// Setup endpoint to create tables (WordPress style)
app.get('/api/setup', async (req, res) => {
    try {
        await db.query(`

      CREATE TABLE IF NOT EXISTS users(
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        await db.query(`
      CREATE TABLE IF NOT EXISTS books(
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NOT NULL,
            cover_color VARCHAR(50),
            is_featured BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // Seed data if empty
        const countRes = await db.query('SELECT COUNT(*) FROM books');
        if (countRes.rows[0].count === '0') {
            await db.query(`
            INSERT INTO books(title, author, cover_color, is_featured) VALUES
            ('The Silent Echo', 'Elena Fisher', '#E0F7FA', true),
            ('Urban Shadows', 'Marcus Thorne', '#F3E5F5', true),
            ('Neon Dreams', 'Sarah Jenkins', '#FFF3E0', true),
            ('Whispers in Static', 'Joe Eagan', '#E8F5E9', false),
            ('The Last Pixel', 'Bot AI', '#FFEBEE', false);
        `);
        }

        res.json({ message: 'Database Setup Complete. "books" table created and seeded.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Utility to fix colors for existing data
app.get('/api/fix-colors', async (req, res) => {
    try {
        await db.query(`UPDATE books SET cover_color = '#E0F7FA' WHERE title = 'The Silent Echo'`);
        await db.query(`UPDATE books SET cover_color = '#F3E5F5' WHERE title = 'Urban Shadows'`);
        await db.query(`UPDATE books SET cover_color = '#FFF3E0' WHERE title = 'Neon Dreams'`);
        await db.query(`UPDATE books SET cover_color = '#E8F5E9' WHERE title = 'Whispers in Static'`);
        await db.query(`UPDATE books SET cover_color = '#FFEBEE' WHERE title = 'The Last Pixel'`);
        res.json({ message: 'Colors updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Auth: Register
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    try {
        const hash = await bcrypt.hash(password, 10);
        const result = await db.query(
            'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
            [email, hash]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
        res.status(500).json({ error: err.message });
    }
});

// Auth: Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all books (Admin view)
app.get('/api/books', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM books ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Toggle Featured Status
app.put('/api/books/:id/feature', async (req, res) => {
    const { id } = req.params;
    const { is_featured } = req.body; // Expect boolean

    try {
        await db.query('UPDATE books SET is_featured = $1 WHERE id = $2', [is_featured, id]);
        res.json({ message: `Book ${id} updated` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Run "curl http://localhost:${port}/api/setup" to initialize DB.`);
});
