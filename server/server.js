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
const { s3Client, bucketName } = require('./s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

app.use(cors());
app.use(bodyParser.json());

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

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

// Generate a presigned URL for uploading to S3/MinIO
app.post('/api/upload-url', async (req, res) => {
    const { fileName, contentType } = req.body;
    if (!fileName || !contentType) {
        return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    const fileKey = `uploads/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: contentType,
    });

    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        res.json({
            url,
            fileKey,
            publicUrl: process.env.USE_LOCAL_S3 === 'true'
                ? `${process.env.S3_ENDPOINT}/${bucketName}/${fileKey}`
                : `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`
        });
    } catch (err) {
        console.error('Error generating presigned URL', err);
        res.status(500).json({ error: 'Could not generate upload URL' });
    }
});


// Setup endpoint to create tables (WordPress style)
app.get('/api/setup', async (req, res) => {
    try {
        // Create users table
        await db.query(`
        CREATE TABLE IF NOT EXISTS users(
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            subscription_tier VARCHAR(50) DEFAULT 'free',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // Check if subscription_tier column exists, add it if not (migration)
        try {
            await db.query(`ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(50) DEFAULT 'free'`);
        } catch (e) {
            // Ignore error if column already exists
        }

        // Create books table
        await db.query(`
        CREATE TABLE IF NOT EXISTS books(
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(255) NOT NULL,
            genre VARCHAR(100),
            cover_color VARCHAR(50),
            cover_image_url TEXT,
            file_key VARCHAR(255),
            content TEXT,
            is_premium BOOLEAN DEFAULT FALSE,
            is_featured BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // Check columns for books (migration)
        try {
            await db.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS content TEXT`);
            await db.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE`);
            await db.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS cover_image_url TEXT`);
            await db.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS file_key VARCHAR(255)`);
            await db.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS genre VARCHAR(100)`);

            // Create readings table
            await db.query(`
            CREATE TABLE IF NOT EXISTS readings(
                user_id INTEGER REFERENCES users(id),
                book_id INTEGER REFERENCES books(id),
                current_position INTEGER DEFAULT 0,
                total_length INTEGER DEFAULT 0,
                progress FLOAT DEFAULT 0.0,
                status VARCHAR(20) DEFAULT 'reading',
                last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, book_id)
            );
            `);
        } catch (e) {
            console.error('Migration error:', e);
        }

        // Seed data if empty
        const countRes = await db.query('SELECT COUNT(*) FROM books');
        if (countRes.rows[0].count === '0') {
            await db.query(`
            INSERT INTO books(title, author, cover_color, is_premium, content, is_featured) VALUES
            ('The Silent Echo', 'Elena Fisher', '#E0F7FA', true, 'The silence was deafening. It wasn''t the absence of sound, but the presence of something else—a heavy, suffocating weight that pressed against the eardrums. Elena stood at the edge of the precipice, looking down into the void. She knew that once she jumped, there was no turning back. This is premium content.', true),
            ('Urban Shadows', 'Marcus Thorne', '#F3E5F5', true, 'The city lights reflected off the wet pavement, creating a kaleidoscope of colors. Marcus pulled his collar up against the chill wind. He had been tracking the shadow for three days now. It moved with a purpose that terrified him. This is premium content.', true),
            ('Neon Dreams', 'Sarah Jenkins', '#FFF3E0', true, 'The neon sign buzzed overhead, casting a sickly green glow on the alleyway. Sarah checked her watch. He was late. Again. She tapped her foot impatiently, the sound echoing off the brick walls. This is premium content.', true),
            ('Whispers in Static', 'Joe Eagan', '#E8F5E9', false, 'The radio crackled to life, static filling the room. Then, a voice cut through the noise. use code INKPLOTS for 20% off. It was faint, barely a whisper, but it sent shivers down his spine. "They are coming," it said. This is free content.', false),
            ('The Last Pixel', 'Bot AI', '#FFEBEE', false, 'The screen flickered and died. The last pixel faded into blackness using a dissolve animation. It was over. The simulation had ended. This is free content.', false);
        `);
        }

        res.json({ message: 'Database Setup Complete. Tables updated and seeded.' });
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

        const token = jwt.sign({ id: user.id, email: user.email, subscription_tier: user.subscription_tier }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, email: user.email, subscription_tier: user.subscription_tier } });
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

// Get single book with access control
app.get('/api/books/:id', async (req, res) => {
    const { id } = req.params;
    const authHeader = req.headers.authorization;
    let userTier = 'free';

    // Decode token if present to check tier
    if (authHeader) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            // Fetch latest tier from DB to be sure
            const userRes = await db.query('SELECT subscription_tier FROM users WHERE id = $1', [decoded.id]);
            if (userRes.rows.length > 0) {
                userTier = userRes.rows[0].subscription_tier || 'free';
            }
        } catch (e) {
            console.error('Invalid token', e.message);
        }
    }

    try {
        const result = await db.query('SELECT * FROM books WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Book not found' });

        const book = result.rows[0];

        // Access Logic
        if (book.is_premium && userTier !== 'premium') {
            // Truncate content
            const sentences = book.content ? book.content.match(/[^\.!\?]+[\.!\?]+/g) : [];
            const preview = sentences ? sentences.slice(0, 2).join(' ') : (book.content || '').substring(0, 100);

            return res.json({
                ...book,
                content: preview,
                access_limited: true
            });
        }

        // Full access
        res.json({ ...book, access_limited: false });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Subscribe user (Mock payment)
app.post('/api/subscribe', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        await db.query(`UPDATE users SET subscription_tier = 'premium' WHERE id = $1`, [decoded.id]);

        // Return new token with updated claims
        const newToken = jwt.sign({ id: decoded.id, email: decoded.email, subscription_tier: 'premium' }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Subscribed successfully', token: newToken, user: { id: decoded.id, email: decoded.email, subscription_tier: 'premium' } });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token or server error' });
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

// --- READING PROGRESS ENDPOINTS ---

// Start reading a book (Check out provided book)
app.post('/api/readings/:bookId', authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.id;

        // Upsert reading record
        await db.query(`
            INSERT INTO readings (user_id, book_id, last_read_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id, book_id) 
            DO UPDATE SET last_read_at = NOW()
        `, [userId, bookId]);

        res.json({ message: 'Book checked out / started', bookId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to start book' });
    }
});

// Update reading progress
app.put('/api/readings/:bookId/progress', authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { position, total, progress } = req.body;
        const userId = req.user.id;

        await db.query(`
            UPDATE readings 
            SET current_position = $1, total_length = $2, progress = $3, last_read_at = NOW()
            WHERE user_id = $4 AND book_id = $5
        `, [position, total, progress, userId, bookId]);

        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// Get currently reading books
app.get('/api/readings', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(`
            SELECT r.*, b.title, b.author, b.cover_color, b.cover_image_url
            FROM readings r
            JOIN books b ON r.book_id = b.id
            WHERE r.user_id = $1
            ORDER BY r.last_read_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch readings' });
    }
});

// Get specific reading status
app.get('/api/readings/:bookId', authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.id;
        const result = await db.query(`
            SELECT * FROM readings WHERE user_id = $1 AND book_id = $2
        `, [userId, bookId]);

        if (result.rows.length === 0) return res.json(null);
        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch reading status' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Run "curl http://localhost:${port}/api/setup" to initialize DB.`);
});
