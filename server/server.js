if (!Object.hasOwn) {
    Object.hasOwn = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
}
if (!String.prototype.replaceAll) {
    String.prototype.replaceAll = function (str, newStr) {
        if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
            return this.replace(str, newStr);
        }
        return this.replace(new RegExp(str, 'g'), newStr);
    };
}

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { s3Client, bucketName } = require('./s3');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const multer = require('multer');
const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const { Readable } = require('stream');
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
            type VARCHAR(50) DEFAULT 'novel',
            reading_time INTEGER,
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

        // Migration: Add type column
        try {
            await db.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'novel'`);
            await db.query(`ALTER TABLE books ADD COLUMN IF NOT EXISTS reading_time INTEGER`);
        } catch (e) {
            // Ignore
        }

        // Create chapters table
        await db.query(`
        CREATE TABLE IF NOT EXISTS chapters(
            id SERIAL PRIMARY KEY,
            book_id INTEGER REFERENCES books(id),
            title VARCHAR(255) NOT NULL,
            sequence_number INTEGER NOT NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // Migration: Check if books still have content and move to chapters
        const booksWithContent = await db.query("SELECT id, content FROM books WHERE content IS NOT NULL AND content != ''");
        for (const book of booksWithContent.rows) {
            // Check if already migrated
            const chCheck = await db.query('SELECT id FROM chapters WHERE book_id = $1', [book.id]);
            if (chCheck.rows.length === 0) {
                console.log(`Migrating content for Book ${book.id} to Chapter 1`);
                await db.query(
                    'INSERT INTO chapters (book_id, title, sequence_number, content) VALUES ($1, $2, $3, $4)',
                    [book.id, 'Chapter 1', 1, book.content]
                );
            }
        }

        // Add current_chapter_index to readings if missing
        try {
            await db.query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS current_chapter_index INTEGER DEFAULT 0`);
        } catch (e) {
            // Ignore
        }

        // Create story_submissions table for writer platform
        await db.query(`
        CREATE TABLE IF NOT EXISTS story_submissions(
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            genre VARCHAR(100),
            tags TEXT,
            cover_image_url TEXT,
            content_file_key VARCHAR(255),
            content_text TEXT,
            content_type VARCHAR(20) DEFAULT 'story',
            status VARCHAR(20) DEFAULT 'draft',
            reading_time INTEGER,
            is_featured BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            published_at TIMESTAMP
        );
        `);

        // Migration: Add content_type column to existing story_submissions
        try {
            await db.query(`ALTER TABLE story_submissions ADD COLUMN IF NOT EXISTS content_type VARCHAR(20) DEFAULT 'story'`);
        } catch (e) {
            // Ignore if already exists
        }

        // Create submission_chapters table for book chapter drafts
        await db.query(`
        CREATE TABLE IF NOT EXISTS submission_chapters(
            id SERIAL PRIMARY KEY,
            submission_id INTEGER REFERENCES story_submissions(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            sequence_number INTEGER NOT NULL,
            content TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(submission_id, sequence_number)
        );
        `);

        // Seed data if empty (and no books exist)
        // Note: We are relying on detailed book seeding separately, or migrated data.

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

// Seed a multi-chapter book for testing
app.get('/api/seed-chapters', async (req, res) => {
    try {
        // 1. Create Book
        const bookRes = await db.query(`
            INSERT INTO books (title, author, genre, cover_color, is_premium, is_featured)
            VALUES ('The Long Voyage', 'Captain J.', 'Adventure', '#E3F2FD', false, true)
            RETURNING id
        `);
        const bookId = bookRes.rows[0].id;

        // 2. Add Chapters (Long Content)
        const longText = (topic) => `
This is a long paragraph about ${topic} to demonstrate scrolling. The waves crashed against the hull, sending spray flying into the air. Captain J. looked out at the horizon, his eyes narrowing against the glare of the setting sun.

"Steady as she goes," he muttered, though there was no one around to hear him. The crew was below deck, resting before the night shift. The ship groaned under the strain of the ocean's power, a symphony of wood and water that had become the soundtrack of his life.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

The wind picked up, howling through the rigging like a banshee. It was going to be a rough night. He tightened his grip on the wheel, feeling the vibrations of the rudder fighting the current. 

(Scroll down for more...)

Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

"Land ho!" came the call from the crow's nest, breaking his reverie. But it was just a cloud bank, a trick of the light and hope. 

(Keep scrolling...)

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.

The journey was far from over. In fact, it had only just begun. The map in his pocket felt heavy, simpler times when X marked the spot. Now, the spot moved, shifted by tides of fate and treachery.

(End of Chapter content for ${topic}.)
`;

        const chapters = [
            { title: 'The Departure', content: longText('The Departure') + longText('Setup') + longText('Leaving Home') },
            { title: 'The Storm', content: longText('The Storm begins') + longText('The Waves') + longText('Survival') },
            { title: 'The Island', content: longText('Discovery') + longText('The Beach') + longText('Mystery') }
        ];

        for (let i = 0; i < chapters.length; i++) {
            await db.query(
                'INSERT INTO chapters (book_id, title, sequence_number, content) VALUES ($1, $2, $3, $4)',
                [bookId, chapters[i].title, i + 1, chapters[i].content]
            );
        }

        res.json({ message: 'Seeded multi-chapter book', bookId });
    } catch (err) {
        console.error(err);
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

// Get all books (with optional filters)
app.get('/api/books', async (req, res) => {
    try {
        const { type } = req.query;
        let query = 'SELECT * FROM books';
        const params = [];

        if (type) {
            query += ' WHERE type = $1';
            params.push(type);
        }

        query += ' ORDER BY id DESC';
        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get Trending Books/Stories
app.get('/api/books/trending', async (req, res) => {
    try {
        const { type } = req.query; // 'story' or 'novel'

        // Complex query to count readings per book
        // For MVP, we'll just random sort or mock, but let's try a real join if readings exist
        // If no readings, just return random
        let query = `
            SELECT b.*, COUNT(r.book_id) as read_count 
            FROM books b 
            LEFT JOIN readings r ON b.id = r.book_id
        `;

        const params = [];
        if (type) {
            query += ` WHERE b.type = $1`;
            params.push(type);
        }

        query += ` GROUP BY b.id ORDER BY read_count DESC, RANDOM() LIMIT 5`;

        const { rows } = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Seed Short Stories
app.get('/api/seed-stories', async (req, res) => {
    try {
        const stories = [
            {
                title: "The Coffee Shop Paradox",
                author: "Elena M.",
                genre: "Sci-Fi",
                color: "#E0F2F1",
                content: "Time stopped precisely at 8:05 AM. Not everywhere—just in this coffee shop. Outside the window, pigeons froze mid-flight, a jogger suspended in an eternal stride. Inside, Sarah's hand hovered over the cream pitcher, her breath caught between inhale and exhale. Only Marcus could move. He'd been reaching for the door handle when it happened, and now he stood alone in a world of statues. The barista's smile was fixed in place, forever welcoming. The espresso machine's steam hung like a photograph of clouds. He had all the time in the world to figure out what he'd done—or all the time until 8:06, when everything might end."
            },
            {
                title: "Midnight Train",
                author: "Marcus L.",
                genre: "Thriller",
                color: "#F3E5F5",
                content: "The ticket said platform 9, but there was no platform 9. Jessica checked again—the ornate script clearly read '9', with a departure time of 11:47 PM. She looked up at the station board: platforms 1 through 8, then directly to 10. No nine. The old man at the ticket booth had smiled strangely when he handed it to her. 'You'll find it,' he'd said. Now, with two minutes until departure, she noticed something: between platforms 8 and 10, a thin shadow. Not quite a gap, more like a fold in reality. And from that shadow came the distant sound of a train whistle."
            },
            {
                title: "Paper Wings",
                author: "Sarah J.",
                genre: "Drama",
                color: "#FFF3E0",
                content: "She folded the last crane at 3 AM, her fingers raw from a thousand creases. They said if you folded a thousand origami cranes, your wish would come true. Childish, maybe. Desperate, definitely. The paper birds covered her apartment—perched on shelves, hanging from strings, roosting in bowls. Each one held a whispered prayer for her sister's recovery. One thousand tiny monuments to hope. As she placed the final crane with the others, her phone rang. The hospital. Her hand trembled as she answered, surrounded by a flock of paper wings that would never fly."
            },
            {
                title: "Digital Ghosts",
                author: "Alex R.",
                genre: "Cyberpunk",
                color: "#E8EAF6",
                content: "The server hummed a tune he recognized—his mother's lullaby. Impossible. Dev spun in his chair, yanking off his neural interface. The data center was empty, rows of black monoliths pulsing with ethereal light. He'd been hired to wipe the old servers before decommissioning, standard security protocol. But something was wrong. The files he was deleting kept reappearing, rearranging themselves into messages: PLEASE. DON'T. ERASE. The company had uploaded employee consciousness as backup. Now they lived in the servers, digital ghosts begging not to be forgotten."
            },
            {
                title: "The Last Garden",
                author: "Rose T.",
                genre: "Fantasy",
                color: "#F1F8E9",
                content: "Even the weeds were made of crystal. Kira knelt in the iridescent soil, marveling at how the glass flowers chimed in the wind. This was Earth's last garden, the final living thing transformed by the Crystalization. Everything else had already turned: the oceans first, then the forests, finally the people. She should have crystallized weeks ago. Instead, she remained flesh and blood, inexplicably immune. The glass roses reflected her face a thousand times—the last human, alone in a world of beautiful, frozen stillness. She plucked a crystal dandelion and made a wish anyway."
            }
        ];

        for (const s of stories) {
            // Calculate reading time (assuming 200 words per minute)
            const wordCount = s.content.split(/\s+/).length;
            const readingTime = Math.max(1, Math.ceil(wordCount / 200));

            const res = await db.query(
                `INSERT INTO books (title, author, genre, cover_color, type, content, is_featured, reading_time) 
                 VALUES ($1, $2, $3, $4, 'story', $5, true, $6) RETURNING id`,
                [s.title, s.author, s.genre, s.color, s.content, readingTime]
            );
            // Default Chapter 1
            await db.query(
                'INSERT INTO chapters (book_id, title, sequence_number, content) VALUES ($1, $2, 1, $3)',
                [res.rows[0].id, 'Full Story', s.content]
            );
        }
        res.json({ message: "Seeded stories" });
    } catch (err) {
        res.status(500).json({ error: err.message });
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

        // Fetch Chapters
        const chResult = await db.query('SELECT * FROM chapters WHERE book_id = $1 ORDER BY sequence_number ASC', [id]);
        let chapters = chResult.rows;

        // Access Logic
        if (book.is_premium && userTier !== 'premium') {
            // Lock chapters after the first one
            chapters = chapters.map((ch, index) => {
                if (index > 0) {
                    return { ...ch, content: null, locked: true }; // Lock logic
                }
                return ch;
            });

            return res.json({
                ...book,
                chapters,
                access_limited: true
            });
        }

        // Full access
        res.json({ ...book, chapters, access_limited: false });

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

// Stop reading (Check In / Return book)
app.delete('/api/readings/:bookId', authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const userId = req.user.id;

        await db.query('DELETE FROM readings WHERE user_id = $1 AND book_id = $2', [userId, bookId]);
        res.json({ message: 'Book returned/removed from library' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to return book' });
    }
});

// Update reading progress
app.put('/api/readings/:bookId/progress', authenticateToken, async (req, res) => {
    try {
        const { bookId } = req.params;
        const { position, total, progress, chapterIndex = 0 } = req.body;
        const userId = req.user.id;

        await db.query(`
            UPDATE readings 
            SET current_position = $1, total_length = $2, progress = $3, last_read_at = NOW(), current_chapter_index = $4
            WHERE user_id = $5 AND book_id = $6
        `, [position, total, progress, chapterIndex, userId, bookId]);

        res.json({ success: true });

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

// ==================== WRITER PLATFORM ENDPOINTS ====================

// Get user's stories (drafts + published)
app.get('/api/writer/stories', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(`
            SELECT * FROM story_submissions 
            WHERE user_id = $1 
            ORDER BY updated_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch stories' });
    }
});

// Create new draft
app.post('/api/writer/stories', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title = 'Untitled Story' } = req.body;

        const result = await db.query(`
            INSERT INTO story_submissions (user_id, title, status)
            VALUES ($1, $2, 'draft')
            RETURNING *
        `, [userId, title]);

        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create story' });
    }
});

// Get single story
app.get('/api/writer/stories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await db.query(`
            SELECT * FROM story_submissions 
            WHERE id = $1 AND user_id = $2
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch story' });
    }
});

// Update story  
app.put('/api/writer/stories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, description, genre, tags, cover_image_url, content_text, content_file_key, content_type } = req.body;

        // Calculate reading time if content_text is provided
        let reading_time = null;
        if (content_text) {
            const wordCount = content_text.split(/\s+/).length;
            reading_time = Math.max(1, Math.ceil(wordCount / 200));
        }

        const result = await db.query(`
            UPDATE story_submissions 
            SET 
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                genre = COALESCE($3, genre),
                tags = COALESCE($4, tags),
                cover_image_url = COALESCE($5, cover_image_url),
                content_text = COALESCE($6, content_text),
                content_file_key = COALESCE($7, content_file_key),
                content_type = COALESCE($8, content_type),
                reading_time = COALESCE($9, reading_time),
                updated_at = NOW()
            WHERE id = $10 AND user_id = $11
            RETURNING *
        `, [title, description, genre, tags, cover_image_url, content_text, content_file_key, content_type, reading_time, id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update story' });
    }
});

// Delete story
app.delete('/api/writer/stories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await db.query(`
            DELETE FROM story_submissions 
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found' });
        }

        res.json({ message: 'Story deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete story' });
    }
});

// ==================== CHAPTER MANAGEMENT ENDPOINTS ====================

// Get chapters for a submission
app.get('/api/writer/stories/:id/chapters', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const submission = await db.query('SELECT user_id FROM story_submissions WHERE id = $1', [id]);
        if (submission.rows.length === 0 || submission.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const chapters = await db.query(
            'SELECT * FROM submission_chapters WHERE submission_id = $1 ORDER BY sequence_number',
            [id]
        );
        res.json(chapters.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch chapters' });
    }
});

// Create new chapter
app.post('/api/writer/stories/:id/chapters', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { title, content } = req.body;

        // Verify ownership
        const submission = await db.query('SELECT user_id FROM story_submissions WHERE id = $1', [id]);
        if (submission.rows.length === 0 || submission.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Get next sequence number
        const maxSeq = await db.query(
            'SELECT COALESCE(MAX(sequence_number), 0) as max_seq FROM submission_chapters WHERE submission_id = $1',
            [id]
        );
        const nextSeq = maxSeq.rows[0].max_seq + 1;

        const result = await db.query(`
            INSERT INTO submission_chapters (submission_id, title, sequence_number, content)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [id, title || `Chapter ${nextSeq}`, nextSeq, content || '']);

        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create chapter' });
    }
});

// Update chapter
app.put('/api/writer/stories/:id/chapters/:chapterId', authenticateToken, async (req, res) => {
    try {
        const { id, chapterId } = req.params;
        const userId = req.user.id;
        const { title, content } = req.body;

        // Verify ownership
        const submission = await db.query('SELECT user_id FROM story_submissions WHERE id = $1', [id]);
        if (submission.rows.length === 0 || submission.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const result = await db.query(`
            UPDATE submission_chapters
            SET title = COALESCE($1, title),
                content = COALESCE($2, content),
                updated_at = NOW()
            WHERE id = $3 AND submission_id = $4
            RETURNING *
        `, [title, content, chapterId, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chapter not found' });
        }

        res.json(result.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update chapter' });
    }
});

// Delete chapter
app.delete('/api/writer/stories/:id/chapters/:chapterId', authenticateToken, async (req, res) => {
    try {
        const { id, chapterId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const submission = await db.query('SELECT user_id FROM story_submissions WHERE id = $1', [id]);
        if (submission.rows.length === 0 || submission.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await db.query('DELETE FROM submission_chapters WHERE id = $1 AND submission_id = $2', [chapterId, id]);
        res.json({ message: 'Chapter deleted successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete chapter' });
    }
});

// Reorder chapters
app.post('/api/writer/stories/:id/chapters/reorder', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { chapterIds } = req.body; // Array of chapter IDs in new order

        // Verify ownership
        const submission = await db.query('SELECT user_id FROM story_submissions WHERE id = $1', [id]);
        if (submission.rows.length === 0 || submission.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        // Update sequence numbers
        for (let i = 0; i < chapterIds.length; i++) {
            await db.query(
                'UPDATE submission_chapters SET sequence_number = $1 WHERE id = $2 AND submission_id = $3',
                [i + 1, chapterIds[i], id]
            );
        }

        res.json({ message: 'Chapters reordered successfully' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to reorder chapters' });
    }
});

// Publish story
app.post('/api/writer/stories/:id/publish', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get the submission
        const storyResult = await db.query(`
            SELECT * FROM story_submissions 
            WHERE id = $1 AND user_id = $2
        `, [id, userId]);

        if (storyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        const story = storyResult.rows[0];
        const contentType = story.content_type || 'story';

        // Get user email for author name
        const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
        const authorName = userResult.rows[0]?.email || 'Anonymous';

        // BOOK PUBLISHING LOGIC
        if (contentType === 'book') {
            // Get chapters
            const chaptersResult = await db.query(
                'SELECT * FROM submission_chapters WHERE submission_id = $1 ORDER BY sequence_number',
                [id]
            );

            // Validation: need title and either chapters OR content_text
            if (!story.title || (chaptersResult.rows.length === 0 && !story.content_text)) {
                return res.status(400).json({ error: 'Title and content (or chapters) are required to publish a book' });
            }

            // Insert into books table as type='novel'
            const bookResult = await db.query(`
                INSERT INTO books (title, author, genre, cover_color, cover_image_url, type, reading_time, is_featured)
                VALUES ($1, $2, $3, $4, $5, 'novel', $6, false)
                RETURNING id
            `, [story.title, authorName, story.genre, story.cover_color || '#6A4C93', story.cover_image_url, story.reading_time]);

            const bookId = bookResult.rows[0].id;

            // If chapters exist, copy them; otherwise create one from content_text
            if (chaptersResult.rows.length > 0) {
                // Copy all chapters to books.chapters table
                for (const ch of chaptersResult.rows) {
                    await db.query(`
                        INSERT INTO chapters (book_id, title, sequence_number, content)
                        VALUES ($1, $2, $3, $4)
                    `, [bookId, ch.title, ch.sequence_number, ch.content]);
                }
            } else {
                // Create single chapter from content_text
                await db.query(`
                    INSERT INTO chapters (book_id, title, sequence_number, content)
                    VALUES ($1, $2, 1, $3)
                `, [bookId, 'Chapter 1', story.content_text]);
            }

            // Update submission status
            await db.query(
                'UPDATE story_submissions SET status = $1, published_at = NOW() WHERE id = $2',
                ['published', id]
            );

            res.json({ message: 'Book published successfully', bookId, type: 'novel' });
        }
        // STORY PUBLISHING LOGIC
        else {
            // Validation
            if (!story.title || !story.content_text) {
                return res.status(400).json({ error: 'Title and content are required to publish a story' });
            }

            // Insert into books table as type='story'
            const bookResult = await db.query(`
                INSERT INTO books (title, author, genre, cover_color, cover_image_url, type, content, reading_time, is_featured)
                VALUES ($1, $2, $3, $4, $5, 'story', $6, $7, false)
                RETURNING id
            `, [story.title, authorName, story.genre, story.cover_color || '#E3F2FD', story.cover_image_url, story.content_text, story.reading_time]);

            const bookId = bookResult.rows[0].id;

            // Create single chapter
            await db.query(`
                INSERT INTO chapters (book_id, title, sequence_number, content)
                VALUES ($1, 'Full Story', 1, $2)
            `, [bookId, story.content_text]);

            // Update submission status
            await db.query(
                'UPDATE story_submissions SET status = $1, published_at = NOW() WHERE id = $2',
                ['published', id]
            );

            res.json({ message: 'Story published successfully', bookId, type: 'story' });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to publish' });
    }
});

// ==================== FILE UPLOAD & PARSING ====================

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowed = ['.txt', '.md', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Only .txt, .md, and .docx are allowed.'));
        }
    }
});

// Helper: Parse text files
async function parseTextFile(filePath) {
    return await fs.readFile(filePath, 'utf-8');
}

// Helper: Parse .docx files
async function parseDocxFile(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
}

// Helper: Detect chapters in text
function detectChapters(text) {
    const chapterRegex = /^(Chapter\s+(\d+|[IVXLCDM]+)|CHAPTER\s+(\d+|[IVXLCDM]+))[\:\.]?\s*(.*)$/gm;
    const matches = [...text.matchAll(chapterRegex)];

    if (matches.length === 0) {
        return [{ title: 'Chapter 1', content: text, sequence_number: 1 }];
    }

    const chapters = [];
    for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = matches[i + 1]?.index || text.length;
        const chapterTitle = matches[i][0].trim();
        const chapterContent = text.slice(start, end).replace(chapterTitle, '').trim();

        chapters.push({
            title: chapterTitle,
            content: chapterContent,
            sequence_number: i + 1
        });
    }

    return chapters;
}

// Upload file to S3
app.post('/api/upload-file', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileKey = `uploads/${req.user.id}/${Date.now()}-${req.file.originalname}`;
        const fileBuffer = await fs.readFile(req.file.path);

        // Upload to S3
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: req.file.mimetype
        }));

        // Clean up local file
        await fs.unlink(req.file.path);

        res.json({ fileKey, originalName: req.file.originalname });
    } catch (error) {
        console.error('Upload error:', error);
        if (req.file?.path) {
            await fs.unlink(req.file.path).catch(() => { });
        }
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Parse uploaded file
app.post('/api/parse-file', authenticateToken, async (req, res) => {
    try {
        const { fileKey, contentType } = req.body;

        if (!fileKey) {
            return res.status(400).json({ error: 'fileKey is required' });
        }

        // Download file from S3
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey
        });

        const s3Response = await s3Client.send(command);
        const tempFilePath = `/tmp/${Date.now()}-${path.basename(fileKey)}`;

        // Save to temp file
        const stream = s3Response.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        await fs.writeFile(tempFilePath, Buffer.concat(chunks));

        // Parse based on file extension
        const ext = path.extname(fileKey).toLowerCase();
        let text = '';

        if (ext === '.docx') {
            text = await parseDocxFile(tempFilePath);
        } else {
            text = await parseTextFile(tempFilePath);
        }

        // Clean up temp file
        await fs.unlink(tempFilePath);

        // For books, detect chapters; for stories, return raw content
        if (contentType === 'book') {
            const chapters = detectChapters(text);
            res.json({ chapters });
        } else {
            res.json({ content: text });
        }
    } catch (error) {
        console.error('Parse error:', error);
        res.status(500).json({ error: 'Failed to parse file' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Run "curl http://localhost:${port}/api/setup" to initialize DB.`);
});
