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
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_123';

app.use(cors());
app.use(bodyParser.json());

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    // Join a story room to receive updates for that story
    socket.on('join_story', (storyId) => {
        socket.join(`story_${storyId}`);
        console.log(`[Socket] ${socket.id} joined story_${storyId}`);
    });

    // Leave a story room
    socket.on('leave_story', (storyId) => {
        socket.leave(`story_${storyId}`);
        console.log(`[Socket] ${socket.id} left story_${storyId}`);
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
    });
});

// Make io accessible to routes
app.set('io', io);

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

        // Migration: Add username column with case-insensitive unique constraint
        try {
            await db.query(`ALTER TABLE users ADD COLUMN username VARCHAR(50)`);
            await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx ON users (LOWER(username))`);
        } catch (e) {
            // Ignore if exists
        }

        // Migration: Add first_name, last_name, date_of_birth columns
        try {
            await db.query(`ALTER TABLE users ADD COLUMN first_name VARCHAR(100)`);
        } catch (e) { /* exists */ }
        try {
            await db.query(`ALTER TABLE users ADD COLUMN last_name VARCHAR(100)`);
        } catch (e) { /* exists */ }
        try {
            await db.query(`ALTER TABLE users ADD COLUMN date_of_birth DATE`);
        } catch (e) { /* exists */ }

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

        // Create comments table
        await db.query(`
        CREATE TABLE IF NOT EXISTS comments(
            id SERIAL PRIMARY KEY,
            story_id INTEGER REFERENCES story_submissions(id) ON DELETE CASCADE,
            chapter_id INTEGER REFERENCES submission_chapters(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            paragraph_index INTEGER,
            content TEXT NOT NULL,
            parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // Create likes table
        await db.query(`
        CREATE TABLE IF NOT EXISTS likes(
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            story_id INTEGER REFERENCES story_submissions(id) ON DELETE CASCADE,
            book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, story_id, book_id)
        );
        `);

        // Migration: Add book_id to likes table
        try {
            await db.query(`ALTER TABLE likes ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES books(id) ON DELETE CASCADE`);
            // Drop old constraint if exists (tricky in postgres without knowing name, but we can try generic approaches or ignore)
            // For now, we assume standard usage: either story_id OR book_id is set
        } catch (e) {
            // Ignore
        }

        // Create notifications table
        await db.query(`
        CREATE TABLE IF NOT EXISTS notifications(
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL, -- 'comment', 'system', 'featured', 'like'
            source_id INTEGER,
            source_type VARCHAR(50), -- 'comment', 'story'
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // Migration: Add last_email_notification_at to users
        try {
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_notification_at TIMESTAMP`);
        } catch (e) {
            // Ignore
        }

        // Migration: Add parent_id to comments if missing
        try {
            await db.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE`);
        } catch (e) {
            // Ignore
        }

        // Migration: Add status WIP support (no schema change needed for string, but good to document)
        // Existing status column is VARCHAR(20)

        // Migration: Add reading goal fields to users table
        try {
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reading_goal_type VARCHAR(20) DEFAULT 'books'`);
            await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reading_goal_value INTEGER DEFAULT 1`);
        } catch (e) {
            // Ignore if already exists
        }

        // Create reading_sessions table for tracking reading activity
        await db.query(`
        CREATE TABLE IF NOT EXISTS reading_sessions(
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ended_at TIMESTAMP,
            pages_read INTEGER DEFAULT 0,
            minutes_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
// Check username availability (case-insensitive)
app.get('/api/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const result = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
            [username]
        );
        res.json({ available: result.rows.length === 0 });
    } catch (e) {
        res.status(500).json({ error: 'Failed to check username' });
    }
});

// Auth: Register
app.post('/api/register', async (req, res) => {
    const { email, password, username, first_name, last_name, date_of_birth } = req.body;

    // Validate required fields
    if (!email || !password || !username || !first_name) {
        return res.status(400).json({ error: 'Email, password, username, and first name are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate email length
    if (email.length > 255) {
        return res.status(400).json({ error: 'Email is too long' });
    }

    // Validate password strength
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (password.length > 128) {
        return res.status(400).json({ error: 'Password is too long' });
    }

    // Validate username format (alphanumeric, underscores, 3-30 chars)
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' });
    }

    // Validate first_name (letters, spaces, hyphens, apostrophes, 1-100 chars)
    const nameRegex = /^[a-zA-Z\s\-']{1,100}$/;
    if (!nameRegex.test(first_name)) {
        return res.status(400).json({ error: 'First name must be 1-100 characters with only letters, spaces, hyphens, or apostrophes' });
    }

    // Validate last_name if provided
    if (last_name && !nameRegex.test(last_name)) {
        return res.status(400).json({ error: 'Last name must be 1-100 characters with only letters, spaces, hyphens, or apostrophes' });
    }

    // Validate date_of_birth format if provided (YYYY-MM-DD)
    if (date_of_birth) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date_of_birth)) {
            return res.status(400).json({ error: 'Date of birth must be in YYYY-MM-DD format' });
        }
        // Check if it's a valid date and user is at least 13 years old
        const dob = new Date(date_of_birth);
        const today = new Date();
        const age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
        if (isNaN(dob.getTime())) {
            return res.status(400).json({ error: 'Invalid date of birth' });
        }
        if (age < 13) {
            return res.status(400).json({ error: 'You must be at least 13 years old to register' });
        }
        if (age > 150) {
            return res.status(400).json({ error: 'Invalid date of birth' });
        }
    }

    // Trim and sanitize inputs
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedUsername = username.trim();
    const sanitizedFirstName = first_name.trim();
    const sanitizedLastName = last_name ? last_name.trim() : null;

    try {
        // Check if username already exists (case-insensitive)
        const usernameCheck = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
            [sanitizedUsername]
        );
        if (usernameCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const hash = await bcrypt.hash(password, 10);
        const result = await db.query(
            `INSERT INTO users (email, password_hash, username, first_name, last_name, date_of_birth) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, email, username, first_name, last_name, date_of_birth`,
            [sanitizedEmail, hash, sanitizedUsername, sanitizedFirstName, sanitizedLastName, date_of_birth || null]
        );
        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint?.includes('username')) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            return res.status(400).json({ error: 'Email already exists' });
        }
        console.error('[Register Error]', err);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
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

        const token = jwt.sign({
            id: user.id,
            email: user.email,
            username: user.username,
            subscription_tier: user.subscription_tier
        }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                subscription_tier: user.subscription_tier
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Get all categories with hierarchical structure\napp.get('/api/categories', async (req, res) => {\n    try {\n        // Fetch all groups\n        const groupsRes = await db.query('SELECT * FROM category_groups ORDER BY section_order');\n        const groups = groupsRes.rows;\n\n        // Fetch all categories\n        const categoriesRes = await db.query('SELECT * FROM categories ORDER BY level, display_order, name');\n        const allCategories = categoriesRes.rows;\n\n        // Build hierarchical structure\n        const result = groups.map(group => {\n            // Get level-1 categories for this group\n            const level1Categories = allCategories.filter(\n                c => c.group_id === group.id && c.level === 1\n            );\n\n            // For each level-1, attach its level-2 children\n            const categoriesWithChildren = level1Categories.map(parent => ({\n                ...parent,\n                children: allCategories.filter(\n                    c => c.parent_category_id === parent.id && c.level === 2\n                )\n            }));\n\n            return {\n                ...group,\n                categories: categoriesWithChildren\n            };\n        });\n\n        res.json(result);\n    } catch (err) {\n        console.error(err);\n        res.status(500).json({ error: 'Failed to fetch categories' });\n    }\n});\n\n// Get all books (with optional filters)
app.get('/api/books', async (req, res) => {
    try {
        const { type } = req.query;
        let query = `
            SELECT b.*, 
            (SELECT COUNT(*)::int FROM likes WHERE book_id = b.id) as like_count
            FROM books b
        `;
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
        const { position, total, progress, chapterIndex = 0, minutesRead = 0 } = req.body;
        const userId = req.user.id;

        // Update progress in readings table
        await db.query(`
            UPDATE readings 
            SET current_position = $1, total_length = $2, progress = $3, last_read_at = NOW(), current_chapter_index = $4
            WHERE user_id = $5 AND book_id = $6
        `, [position, total, progress, chapterIndex, userId, bookId]);

        // Create reading session record if minutesRead is provided and > 0
        if (minutesRead && minutesRead > 0) {
            // Estimate pages read (rough estimate: ~2 pages per minute)
            const estimatedPages = Math.round(minutesRead * 2);

            await db.query(`
                INSERT INTO reading_sessions (user_id, book_id, minutes_read, pages_read, started_at, ended_at)
                VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 minute' * $3, NOW())
            `, [userId, bookId, minutesRead, estimatedPages]);
        }

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

// Get weekly reading stats
app.get('/api/user/reading-stats', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { week } = req.query; // Optional: YYYY-MM-DD format for start of week

        // Calculate week start (Monday) and end (Sunday)
        let weekStart, weekEnd;
        if (week) {
            weekStart = new Date(week);
        } else {
            const today = new Date();
            const dayOfWeek = today.getDay();
            const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get Monday
            weekStart = new Date(today);
            weekStart.setDate(today.getDate() + diff);
        }
        weekStart.setHours(0, 0, 0, 0);

        weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // Get user's reading goal
        const userGoalRes = await db.query(
            'SELECT reading_goal_type, reading_goal_value FROM users WHERE id = $1',
            [userId]
        );
        const userGoal = userGoalRes.rows[0] || { reading_goal_type: 'books', reading_goal_value: 1 };

        // Get books completed this week (reached 100% progress)
        const completedBooksRes = await db.query(`
            SELECT DISTINCT ON (r.book_id) 
                r.book_id, b.title, b.author, b.cover_image_url, b.cover_color,
                r.progress, r.last_read_at
            FROM readings r
            JOIN books b ON r.book_id = b.id
            WHERE r.user_id = $1 
                AND r.progress >= 1.0
                AND r.last_read_at >= $2
                AND r.last_read_at < $3
            ORDER BY r.book_id, r.last_read_at DESC
        `, [userId, weekStart, weekEnd]);

        const completedBooks = completedBooksRes.rows;

        // Get daily reading activity (reading sessions)
        const dailyActivityRes = await db.query(`
            SELECT 
                DATE(started_at) as read_date,
                SUM(minutes_read) as total_minutes,
                SUM(pages_read) as total_pages,
                COUNT(*) as session_count
            FROM reading_sessions
            WHERE user_id = $1
                AND started_at >= $2
                AND started_at < $3
            GROUP BY DATE(started_at)
            ORDER BY read_date ASC
        `, [userId, weekStart, weekEnd]);

        // Create 7-day array with activity data
        const dailyActivity = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            const dayData = dailyActivityRes.rows.find(row => row.read_date === dateStr);
            dailyActivity.push({
                date: dateStr,
                day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
                minutes: dayData ? parseInt(dayData.total_minutes) : 0,
                pages: dayData ? parseInt(dayData.total_pages) : 0,
                sessions: dayData ? parseInt(dayData.session_count) : 0
            });
        }

        // Calculate progress toward goal
        let progressValue = 0;
        let goalValue = userGoal.reading_goal_value || 1;

        if (userGoal.reading_goal_type === 'books') {
            progressValue = completedBooks.length;
        } else if (userGoal.reading_goal_type === 'minutes') {
            progressValue = dailyActivity.reduce((sum, day) => sum + day.minutes, 0);
        }

        const progressPercent = Math.min(100, Math.round((progressValue / goalValue) * 100));

        res.json({
            week_start: weekStart.toISOString().split('T')[0],
            week_end: weekEnd.toISOString().split('T')[0],
            goal: {
                type: userGoal.reading_goal_type,
                value: goalValue,
                progress: progressValue,
                percentage: progressPercent,
                achieved: progressValue >= goalValue
            },
            completed_books: completedBooks,
            daily_activity: dailyActivity
        });
    } catch (e) {
        console.error('Reading stats error:', e);
        res.status(500).json({ error: 'Failed to fetch reading stats' });
    }
});

// Update user's reading goal
app.post('/api/user/reading-goal', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { goal_type, goal_value } = req.body;

        // Validate input
        if (!['books', 'minutes'].includes(goal_type)) {
            return res.status(400).json({ error: 'Invalid goal type. Must be "books" or "minutes"' });
        }

        if (!goal_value || goal_value < 1 || goal_value > 100) {
            return res.status(400).json({ error: 'Goal value must be between 1 and 100' });
        }

        await db.query(
            'UPDATE users SET reading_goal_type = $1, reading_goal_value = $2 WHERE id = $3',
            [goal_type, goal_value, userId]
        );

        res.json({
            success: true,
            goal: { type: goal_type, value: goal_value }
        });
    } catch (e) {
        console.error('Update goal error:', e);
        res.status(500).json({ error: 'Failed to update reading goal' });
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
        const {
            title = 'Untitled Story',
            description,
            content_type,
            file_upload_key,
            is_file_upload,
            category_ids = []
        } = req.body;

        // Insert submission
        const result = await db.query(`
            INSERT INTO story_submissions (
                user_id, title, description, content_type, 
                file_upload_key, is_file_upload, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'draft')
            RETURNING *
        `, [userId, title, description, content_type, file_upload_key, is_file_upload]);

        const submission = result.rows[0];

        // Link categories if provided
        if (category_ids && category_ids.length > 0) {
            for (const categoryId of category_ids) {
                await db.query(
                    'INSERT INTO submission_categories (submission_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [submission.id, categoryId]
                );
            }
        }

        res.json(submission);
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

        res.json({ message: 'Story deleted' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to delete story' });
    }
});

// Publish story (Draft -> Published or WIP)
app.post('/api/writer/stories/:id/publish', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const body = req.body || {};
        const status = body.status || 'published'; // 'published' or 'wip'

        console.log('[DEBUG] Publish request:', { id, userId, status, body: req.body });


        const ValidStatuses = ['published', 'wip'];
        if (!ValidStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get the submission first to validate
        const storyResult = await db.query(`
            SELECT * FROM story_submissions 
            WHERE id = $1 AND user_id = $2
        `, [id, userId]);

        if (storyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found' });
        }

        const story = storyResult.rows[0];

        // Basic validation
        if (!story.title) {
            return res.status(400).json({ error: 'Title is required to publish' });
        }

        // Update status
        const result = await db.query(`
            UPDATE story_submissions 
            SET status = $1, published_at = NOW(), updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `, [status, id, userId]);

        console.log('[DEBUG] Publish success:', { id, status });
        res.json(result.rows[0]);
    } catch (e) {
        console.error('[DEBUG] Publish error:', e.message, e.detail || '');
        res.status(500).json({ error: 'Failed to publish story' });
    }
});

// Get public story (WIP or Published)
app.get('/api/stories/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const storyRes = await db.query(`
            SELECT s.*, u.email as author_name 
            FROM story_submissions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = $1 AND (s.status = 'published' OR s.status = 'wip')
        `, [id]);

        if (storyRes.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found' });
        }

        const story = storyRes.rows[0];

        // Fetch Chapters
        const chapRes = await db.query(`
            SELECT * FROM submission_chapters 
            WHERE submission_id = $1 
            ORDER BY sequence_number ASC
        `, [id]);

        story.chapters = chapRes.rows;

        // If no chapters, use content_text as pseudo-chapter
        if (story.chapters.length === 0 && story.content_text) {
            story.chapters = [{
                id: null,
                title: 'Full Story',
                content: story.content_text,
                sequence_number: 1
            }];
        }

        res.json(story);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch story' });
    }
});


// ==================== COMMENTS & NOTIFICATIONS ====================

// Add Comment
app.post('/api/comments', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { story_id, chapter_id, paragraph_index, content } = req.body;

        console.log('[DEBUG] Posting comment:', { userId, story_id, chapter_id, paragraph_index, content: content?.substring(0, 50) });

        // 1. Insert Comment
        const commentRes = await db.query(`
            INSERT INTO comments(story_id, chapter_id, user_id, paragraph_index, content)
        VALUES($1, $2, $3, $4, $5)
        RETURNING *
            `, [story_id, chapter_id, userId, paragraph_index, content]);
        const comment = commentRes.rows[0];

        // 2. Notify Writer
        // Get story owner
        const storyRes = await db.query('SELECT user_id, title FROM story_submissions WHERE id = $1', [story_id]);
        if (storyRes.rows.length > 0) {
            const story = storyRes.rows[0];
            const writerId = story.user_id;

            // Don't notify if commenting on own story
            if (writerId !== userId) {
                // a. In-App Notification
                await db.query(`
                    INSERT INTO notifications(user_id, type, source_id, source_type)
        VALUES($1, 'comment', $2, 'comment')
            `, [writerId, comment.id]);

                // b. Email (Mock with Throttling)
                const writerUserRes = await db.query('SELECT email, last_email_notification_at FROM users WHERE id = $1', [writerId]);
                const writer = writerUserRes.rows[0];

                const now = new Date();
                const lastSent = writer.last_email_notification_at ? new Date(writer.last_email_notification_at) : new Date(0);
                const diffHours = (now - lastSent) / 1000 / 60 / 60;

                if (diffHours >= 1) {
                    // Send Email (Mock)
                    console.log(`[EMAIL MOCK] Sending 'New Comment' email to ${writer.email} for story "${story.title}"`);

                    // Update timestamp
                    await db.query('UPDATE users SET last_email_notification_at = NOW() WHERE id = $1', [writerId]);
                } else {
                    console.log(`[EMAIL MOCK] Suppressing email to ${writer.email} (Throttled)`);
                }
            }
        }

        // Return populated comment
        const userRes = await db.query('SELECT id, email FROM users WHERE id = $1', [userId]);
        comment.user = userRes.rows[0]; // Simple user object

        // 3. Broadcast via Socket.io to all users reading this story
        const io = req.app.get('io');
        io.to(`story_${story_id}`).emit('new_comment', {
            ...comment,
            replies: []
        });

        res.json(comment);
    } catch (e) {
        console.error('[DEBUG] Comment POST error:', e.message, e.detail || '', e.code || '');
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

// Get Comments for Story
app.get('/api/stories/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT c.*, u.email as user_email
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.story_id = $1
            ORDER BY c.created_at ASC
            `, [id]);

        // Map for cleaner frontend consumption
        const comments = result.rows.map(row => ({
            ...row,
            user: { id: row.user_id, email: row.user_email } // pseudo-populate
        }));

        res.json(comments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Get WIP Stories (Public Feed)
app.get('/api/wip', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT s.*, u.email as author_name,
                   (SELECT COUNT(*) FROM likes WHERE story_id = s.id) as like_count
            FROM story_submissions s
            JOIN users u ON s.user_id = u.id
            WHERE s.status = 'wip'
            ORDER BY s.updated_at DESC
        `);
        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch WIP stories' });
    }
});

// Get User's Own Comments on a Story (Private View)
app.get('/api/stories/:id/my-comments', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get top-level comments by this user
        const result = await db.query(`
            SELECT c.*, u.email as user_email
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.story_id = $1 AND c.user_id = $2 AND c.parent_id IS NULL
            ORDER BY c.created_at ASC
        `, [id, userId]);

        // For each comment, get replies (from writer)
        const comments = await Promise.all(result.rows.map(async (row) => {
            const repliesRes = await db.query(`
                SELECT r.*, u.email as user_email
                FROM comments r
                JOIN users u ON r.user_id = u.id
                WHERE r.parent_id = $1
                ORDER BY r.created_at ASC
            `, [row.id]);

            return {
                ...row,
                user: { id: row.user_id, email: row.user_email },
                replies: repliesRes.rows.map(r => ({
                    ...r,
                    user: { id: r.user_id, email: r.user_email }
                }))
            };
        }));

        res.json(comments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Writer Reply to Comment
app.post('/api/comments/:id/reply', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params; // Parent comment ID
        const userId = req.user.id;
        const { content } = req.body;

        // Get parent comment to verify writer ownership
        const parentRes = await db.query(`
            SELECT c.*, s.user_id as writer_id
            FROM comments c
            JOIN story_submissions s ON c.story_id = s.id
            WHERE c.id = $1
        `, [id]);

        if (parentRes.rows.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        const parent = parentRes.rows[0];

        // Only story owner can reply
        if (parent.writer_id !== userId) {
            return res.status(403).json({ error: 'Only the story author can reply' });
        }

        // Insert reply
        const replyRes = await db.query(`
            INSERT INTO comments(story_id, chapter_id, user_id, content, parent_id)
            VALUES($1, $2, $3, $4, $5)
            RETURNING *
        `, [parent.story_id, parent.chapter_id, userId, content, id]);

        const reply = replyRes.rows[0];

        // Notify the original commenter
        await db.query(`
            INSERT INTO notifications(user_id, type, source_id, source_type)
            VALUES($1, 'reply', $2, 'comment')
        `, [parent.user_id, reply.id]);

        // Add user info
        const userRes = await db.query('SELECT id, email FROM users WHERE id = $1', [userId]);
        reply.user = userRes.rows[0];

        // Broadcast reply via Socket.io
        const io = req.app.get('io');
        io.to(`story_${parent.story_id}`).emit('new_reply', {
            parentId: parseInt(id),
            reply: reply
        });

        res.json(reply);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to post reply' });
    }
});

// Like a Story
app.post('/api/stories/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if already liked
        const existing = await db.query('SELECT id FROM likes WHERE user_id = $1 AND story_id = $2', [userId, id]);

        if (existing.rows.length > 0) {
            return res.json({ liked: true, message: 'Already liked' });
        }

        await db.query('INSERT INTO likes(user_id, story_id) VALUES($1, $2)', [userId, id]);

        // Get new count
        const countRes = await db.query('SELECT COUNT(*) as count FROM likes WHERE story_id = $1', [id]);

        res.json({ liked: true, count: parseInt(countRes.rows[0].count) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to like story' });
    }
});

// Unlike a Story
app.delete('/api/stories/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await db.query('DELETE FROM likes WHERE user_id = $1 AND story_id = $2', [userId, id]);

        // Get new count
        const countRes = await db.query('SELECT COUNT(*) as count FROM likes WHERE story_id = $1', [id]);

        res.json({ liked: false, count: parseInt(countRes.rows[0].count) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to unlike story' });
    }
});

// Get Like Status and Count
app.get('/api/stories/:id/likes', async (req, res) => {
    try {
        const { id } = req.params;

        const countRes = await db.query('SELECT COUNT(*) as count FROM likes WHERE story_id = $1', [id]);

        res.json({ count: parseInt(countRes.rows[0].count) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to get likes' });
    }
});

// Get Like Status for Authenticated User
app.get('/api/stories/:id/liked', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await db.query('SELECT id FROM likes WHERE user_id = $1 AND story_id = $2', [userId, id]);
        const countRes = await db.query('SELECT COUNT(*) as count FROM likes WHERE story_id = $1', [id]);

        res.json({
            liked: result.rows.length > 0,
            count: parseInt(countRes.rows[0].count)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to check like status' });
    }
});

// Like a Book
app.post('/api/books/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if already liked
        const existing = await db.query('SELECT id FROM likes WHERE user_id = $1 AND book_id = $2', [userId, id]);

        if (existing.rows.length > 0) {
            return res.json({ liked: true, message: 'Already liked' });
        }

        await db.query('INSERT INTO likes(user_id, book_id) VALUES($1, $2)', [userId, id]);

        // Get new count
        const countRes = await db.query('SELECT COUNT(*) as count FROM likes WHERE book_id = $1', [id]);

        res.json({ liked: true, count: parseInt(countRes.rows[0].count) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to like book' });
    }
});

// Unlike a Book
app.delete('/api/books/:id/like', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        await db.query('DELETE FROM likes WHERE user_id = $1 AND book_id = $2', [userId, id]);

        // Get new count
        const countRes = await db.query('SELECT COUNT(*) as count FROM likes WHERE book_id = $1', [id]);

        res.json({ liked: false, count: parseInt(countRes.rows[0].count) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to unlike book' });
    }
});

// Get Like Status for Authenticated User (Book)
app.get('/api/books/:id/liked', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const result = await db.query('SELECT id FROM likes WHERE user_id = $1 AND book_id = $2', [userId, id]);
        const countRes = await db.query('SELECT COUNT(*) as count FROM likes WHERE book_id = $1', [id]);

        res.json({
            liked: result.rows.length > 0,
            count: parseInt(countRes.rows[0].count)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to check like status' });
    }
});

// Get Public Like Count (Book)
app.get('/api/books/:id/likes', async (req, res) => {
    try {
        const { id } = req.params;
        const countRes = await db.query('SELECT COUNT(*) as count FROM likes WHERE book_id = $1', [id]);
        res.json({ count: parseInt(countRes.rows[0].count) });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to get likes' });
    }
});

// Get All Comments on Writer's Stories (Writer Inbox View)
app.get('/api/writer/comments', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all top-level comments on stories owned by this user
        const result = await db.query(`
            SELECT c.*, u.email as commenter_email, s.title as story_title
            FROM comments c
            JOIN users u ON c.user_id = u.id
            JOIN story_submissions s ON c.story_id = s.id
            WHERE s.user_id = $1 AND c.parent_id IS NULL
            ORDER BY c.created_at DESC
        `, [userId]);

        // Get replies for each comment
        const comments = await Promise.all(result.rows.map(async (row) => {
            const repliesRes = await db.query(`
                SELECT r.*, u.email as user_email
                FROM comments r
                JOIN users u ON r.user_id = u.id
                WHERE r.parent_id = $1
                ORDER BY r.created_at ASC
            `, [row.id]);

            return {
                ...row,
                commenter: { id: row.user_id, email: row.commenter_email },
                replies: repliesRes.rows.map(r => ({
                    ...r,
                    user: { id: r.user_id, email: r.user_email }
                }))
            };
        }));

        res.json(comments);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch writer comments' });
    }
});

// Get Notifications (Inbox)
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(`
            SELECT n.*,
            c.content as comment_content,
            s.title as story_title
            FROM notifications n
            LEFT JOIN comments c ON n.source_id = c.id AND n.source_type = 'comment'
            LEFT JOIN story_submissions s ON c.story_id = s.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
            `, [userId]);

        res.json(result.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark Notification Read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [id, userId]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to update notification' });
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
            INSERT INTO submission_chapters(submission_id, title, sequence_number, content)
        VALUES($1, $2, $3, $4)
        RETURNING *
            `, [id, title || `Chapter ${nextSeq} `, nextSeq, content || '']);

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

        const fileKey = `uploads / ${req.user.id}/${Date.now()}-${req.file.originalname}`;
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

// Force fix likes table schema
app.get('/api/fix-likes-schema', async (req, res) => {
    try {
        await db.query(`ALTER TABLE likes ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES books(id) ON DELETE CASCADE`);
        res.json({ message: 'Likes schema updated: book_id added' });
    } catch (e) {
        console.error("Schema Fix Error:", e);
        res.status(500).json({ error: e.message });
    }
});

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Socket.io enabled for real-time updates`);
    console.log(`Run "curl http://localhost:${port}/api/setup" to initialize DB.`);
});
