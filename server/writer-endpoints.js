// Writer Platform Endpoints
// These will be added to server.js

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
        const { title, description, genre, tags, cover_image_url, content_text, content_file_key } = req.body;

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
                reading_time = COALESCE($8, reading_time),
                updated_at = NOW()
            WHERE id = $9 AND user_id = $10
            RETURNING *
        `, [title, description, genre, tags, cover_image_url, content_text, content_file_key, reading_time, id, userId]);

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

// Publish story
app.post('/api/writer/stories/:id/publish', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get the story
        const storyResult = await db.query(`
            SELECT * FROM story_submissions 
            WHERE id = $1 AND user_id = $2
        `, [id, userId]);

        if (storyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Story not found' });
        }

        const story = storyResult.rows[0];

        // Validation
        if (!story.title || !story.content_text) {
            return res.status(400).json({ error: 'Title and content are required to publish' });
        }

        // Insert into books table
        const bookResult = await db.query(`
            INSERT INTO books (title, author, genre, cover_color, cover_image_url, type, content, reading_time, is_featured)
            SELECT $1, u.email, $2, $3, $4, 'story', $5, $6, false
            FROM users u WHERE u.id = $7
            RETURNING id
        `, [story.title, story.genre, story.cover_color || '#E3F2FD', story.cover_image_url, story.content_text, story.reading_time, userId]);

        const bookId = bookResult.rows[0].id;

        // Create chapter
        await db.query(`
            INSERT INTO chapters (book_id, title, sequence_number, content)
            VALUES ($1, 'Full Story', 1, $2)
        `, [bookId, story.content_text]);

        // Update submission status
        await db.query(`
            UPDATE story_submissions
            SET status = 'published', published_at = NOW()
            WHERE id = $1
        `, [id]);

        res.json({ message: 'Story published successfully', bookId });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to publish story' });
    }
});
