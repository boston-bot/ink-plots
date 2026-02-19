const db = require('./db');

async function seedCategories() {
    try {
        console.log('Creating category tables...');

        // 1. Create category_groups table
        await db.query(`
        CREATE TABLE IF NOT EXISTS category_groups(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            emoji VARCHAR(10),
            section_order INTEGER,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // 2. Create categories table with hierarchical structure
        await db.query(`
        CREATE TABLE IF NOT EXISTS categories(
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            group_id INTEGER REFERENCES category_groups(id),
            parent_category_id INTEGER REFERENCES categories(id),
            slug VARCHAR(100) UNIQUE NOT NULL,
            level INTEGER DEFAULT 1,
            display_order INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        `);

        // 3. Create junction table for submission categories
        await db.query(`
        CREATE TABLE IF NOT EXISTS submission_categories(
            submission_id INTEGER REFERENCES story_submissions(id) ON DELETE CASCADE,
            category_id INTEGER REFERENCES categories(id),
            PRIMARY KEY (submission_id, category_id)
        );
        `);

        // 4. Add file upload columns to story_submissions
        try {
            await db.query(`ALTER TABLE story_submissions ADD COLUMN IF NOT EXISTS file_upload_key VARCHAR(255)`);
            await db.query(`ALTER TABLE story_submissions ADD COLUMN IF NOT EXISTS is_file_upload BOOLEAN DEFAULT FALSE`);
        } catch (e) {
            // Columns may already exist
        }

        console.log('Tables created successfully!');
        console.log('Seeding category groups...');

        // 5. Seed Category Groups
        const groups = [
            { name: 'Fiction', emoji: '📖', order: 1, desc: 'Fictional narratives and imaginative storytelling' },
            { name: 'Non-Fiction', emoji: '📚', order: 2, desc: 'Factual, informational, and educational content' },
            { name: 'Poetry & Spoken Word', emoji: '✍️', order: 3, desc: 'Poetic and performative writing' },
            { name: 'Young Readers', emoji: '🧒', order: 4, desc: 'Content for children and young adults' },
            { name: 'Genre-Blending & Indie', emoji: '🌀', order: 5, desc: 'Cross-genre and experimental works' },
            { name: 'Fan & Community', emoji: '🎭', order: 6, desc: 'Fan fiction and collaborative creations' },
            { name: 'Essays & Short-Form', emoji: '📰', order: 7, desc: 'Essays, articles, and commentary' }
        ];

        const groupIds = {};
        for (const g of groups) {
            const result = await db.query(
                `INSERT INTO category_groups (name, emoji, section_order, description) 
                 VALUES ($1, $2, $3, $4) 
                 ON CONFLICT DO NOTHING 
                 RETURNING id`,
                [g.name, g.emoji, g.order, g.desc]
            );
            groupIds[g.name] = result.rows[0]?.id;
        }

        // Fallback: fetch existing IDs if already seeded
        for (const g of groups) {
            if (!groupIds[g.name]) {
                const existing = await db.query('SELECT id FROM category_groups WHERE name = $1', [g.name]);
                groupIds[g.name] = existing.rows[0]?.id;
            }
        }

        console.log('Category groups seeded!');
        console.log('Seeding categories...');

        // 6. Define all categories
        const categoryData = [
            // Fiction Group
            { name: 'Literary & General', group: 'Fiction', level: 1, parent: null },
            { name: 'Literary Fiction', group: 'Fiction', level: 2, parent: 'Literary & General' },
            { name: 'General Fiction', group: 'Fiction', level: 2, parent: 'Literary & General' },
            { name: 'Contemporary Fiction', group: 'Fiction', level: 2, parent: 'Literary & General' },
            { name: 'Short Stories', group: 'Fiction', level: 2, parent: 'Literary & General' },
            { name: 'Flash Fiction', group: 'Fiction', level: 2, parent: 'Literary & General' },
            { name: 'Novellas', group: 'Fiction', level: 2, parent: 'Literary & General' },

            { name: 'Speculative & Imaginative', group: 'Fiction', level: 1, parent: null },
            { name: 'Fantasy', group: 'Fiction', level: 2, parent: 'Speculative & Imaginative' },
            { name: 'High Fantasy', group: 'Fiction', level: 2, parent: 'Speculative & Imaginative' },
            { name: 'Low Fantasy', group: 'Fiction', level: 2, parent: 'Speculative & Imaginative' },
            { name: 'Urban Fantasy', group: 'Fiction', level: 2, parent: 'Speculative & Imaginative' },
            { name: 'Dark Fantasy', group: 'Fiction', level: 2, parent: 'Speculative & Imaginative' },
            { name: 'Epic Fantasy', group: 'Fiction', level: 2, parent: 'Speculative & Imaginative' },
            { name: 'Mythic / Folklore', group: 'Fiction', level: 2, parent: 'Speculative & Imaginative' },
            { name: 'Fairy Tales & Retellings', group: 'Fiction', level: 2, parent: 'Speculative & Imaginative' },

            { name: 'Science Fiction', group: 'Fiction', level: 1, parent: null },
            { name: 'Soft Sci-Fi', group: 'Fiction', level: 2, parent: 'Science Fiction' },
            { name: 'Hard Sci-Fi', group: 'Fiction', level: 2, parent: 'Science Fiction' },
            { name: 'Dystopian', group: 'Fiction', level: 2, parent: 'Science Fiction' },
            { name: 'Post-Apocalyptic', group: 'Fiction', level: 2, parent: 'Science Fiction' },
            { name: 'Cyberpunk', group: 'Fiction', level: 2, parent: 'Science Fiction' },
            { name: 'Steampunk', group: 'Fiction', level: 2, parent: 'Science Fiction' },
            { name: 'Space Opera', group: 'Fiction', level: 2, parent: 'Science Fiction' },
            { name: 'Time Travel', group: 'Fiction', level: 2, parent: 'Science Fiction' },

            { name: 'Horror & Thriller', group: 'Fiction', level: 1, parent: null },
            { name: 'Horror', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },
            { name: 'Psychological Horror', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },
            { name: 'Gothic Horror', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },
            { name: 'Supernatural Horror', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },
            { name: 'Cosmic / Lovecraftian', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },
            { name: 'Thriller', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },
            { name: 'Psychological Thriller', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },
            { name: 'Suspense', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },
            { name: 'Crime Thriller', group: 'Fiction', level: 2, parent: 'Horror & Thriller' },

            { name: 'Mystery & Crime', group: 'Fiction', level: 1, parent: null },
            { name: 'Mystery', group: 'Fiction', level: 2, parent: 'Mystery & Crime' },
            { name: 'Cozy Mystery', group: 'Fiction', level: 2, parent: 'Mystery & Crime' },
            { name: 'Detective Fiction', group: 'Fiction', level: 2, parent: 'Mystery & Crime' },
            { name: 'Noir', group: 'Fiction', level: 2, parent: 'Mystery & Crime' },
            { name: 'Crime Fiction', group: 'Fiction', level: 2, parent: 'Mystery & Crime' },
            { name: 'True Crime (Narrative)', group: 'Fiction', level: 2, parent: 'Mystery & Crime' },

            { name: 'Romance', group: 'Fiction', level: 1, parent: null },
            { name: 'Contemporary Romance', group: 'Fiction', level: 2, parent: 'Romance' },
            { name: 'Historical Romance', group: 'Fiction', level: 2, parent: 'Romance' },
            { name: 'Paranormal Romance', group: 'Fiction', level: 2, parent: 'Romance' },
            { name: 'Fantasy Romance (Romantasy)', group: 'Fiction', level: 2, parent: 'Romance' },
            { name: 'Dark Romance', group: 'Fiction', level: 2, parent: 'Romance' },
            { name: 'Romantic Suspense', group: 'Fiction', level: 2, parent: 'Romance' },
            { name: 'LGBTQ+ Romance', group: 'Fiction', level: 2, parent: 'Romance' },

            { name: 'Historical', group: 'Fiction', level: 1, parent: null },
            { name: 'Historical Fiction', group: 'Fiction', level: 2, parent: 'Historical' },
            { name: 'Alternate History', group: 'Fiction', level: 2, parent: 'Historical' },
            { name: 'Period Drama', group: 'Fiction', level: 2, parent: 'Historical' },

            { name: 'Adventure & Action', group: 'Fiction', level: 1, parent: null },
            { name: 'Adventure', group: 'Fiction', level: 2, parent: 'Adventure & Action' },
            { name: 'Action', group: 'Fiction', level: 2, parent: 'Adventure & Action' },
            { name: 'Military Fiction', group: 'Fiction', level: 2, parent: 'Adventure & Action' },
            { name: 'Survival Fiction', group: 'Fiction', level: 2, parent: 'Adventure & Action' },

            // Non-Fiction Group
            { name: 'Personal & Narrative', group: 'Non-Fiction', level: 1, parent: null },
            { name: 'Memoir', group: 'Non-Fiction', level: 2, parent: 'Personal & Narrative' },
            { name: 'Autobiography', group: 'Non-Fiction', level: 2, parent: 'Personal & Narrative' },
            { name: 'Biography', group: 'Non-Fiction', level: 2, parent: 'Personal & Narrative' },
            { name: 'Personal Essays', group: 'Non-Fiction', level: 2, parent: 'Personal & Narrative' },

            { name: 'History & Society', group: 'Non-Fiction', level: 1, parent: null },
            { name: 'History', group: 'Non-Fiction', level: 2, parent: 'History & Society' },
            { name: 'Cultural Studies', group: 'Non-Fiction', level: 2, parent: 'History & Society' },
            { name: 'Social Commentary', group: 'Non-Fiction', level: 2, parent: 'History & Society' },
            { name: 'Political Commentary', group: 'Non-Fiction', level: 2, parent: 'History & Society' },

            { name: 'True Crime & Investigation', group: 'Non-Fiction', level: 1, parent: null },
            { name: 'True Crime', group: 'Non-Fiction', level: 2, parent: 'True Crime & Investigation' },
            { name: 'Investigative Journalism', group: 'Non-Fiction', level: 2, parent: 'True Crime & Investigation' },
            { name: 'Legal & Courtroom Narratives', group: 'Non-Fiction', level: 2, parent: 'True Crime & Investigation' },

            { name: 'Psychology & Self-Development', group: 'Non-Fiction', level: 1, parent: null },
            { name: 'Psychology', group: 'Non-Fiction', level: 2, parent: 'Psychology & Self-Development' },
            { name: 'Mental Health', group: 'Non-Fiction', level: 2, parent: 'Psychology & Self-Development' },
            { name: 'Self-Help', group: 'Non-Fiction', level: 2, parent: 'Psychology & Self-Development' },
            { name: 'Personal Growth', group: 'Non-Fiction', level: 2, parent: 'Psychology & Self-Development' },
            { name: 'Productivity', group: 'Non-Fiction', level: 2, parent: 'Psychology & Self-Development' },

            { name: 'Business & Professional', group: 'Non-Fiction', level: 1, parent: null },
            { name: 'Business', group: 'Non-Fiction', level: 2, parent: 'Business & Professional' },
            { name: 'Entrepreneurship', group: 'Non-Fiction', level: 2, parent: 'Business & Professional' },
            { name: 'Finance', group: 'Non-Fiction', level: 2, parent: 'Business & Professional' },
            { name: 'Economics', group: 'Non-Fiction', level: 2, parent: 'Business & Professional' },
            { name: 'Leadership', group: 'Non-Fiction', level: 2, parent: 'Business & Professional' },
            { name: 'Career Development', group: 'Non-Fiction', level: 2, parent: 'Business & Professional' },

            { name: 'Science & Education', group: 'Non-Fiction', level: 1, parent: null },
            { name: 'Science', group: 'Non-Fiction', level: 2, parent: 'Science & Education' },
            { name: 'Technology', group: 'Non-Fiction', level: 2, parent: 'Science & Education' },
            { name: 'Medicine', group: 'Non-Fiction', level: 2, parent: 'Science & Education' },
            { name: 'Education', group: 'Non-Fiction', level: 2, parent: 'Science & Education' },
            { name: 'Academic Essays', group: 'Non-Fiction', level: 2, parent: 'Science & Education' },

            // Poetry Group
            { name: 'Poetry', group: 'Poetry & Spoken Word', level: 1, parent: null },
            { name: 'Free Verse', group: 'Poetry & Spoken Word', level: 2, parent: 'Poetry' },
            { name: 'Structured Poetry', group: 'Poetry & Spoken Word', level: 2, parent: 'Poetry' },
            { name: 'Prose Poetry', group: 'Poetry & Spoken Word', level: 2, parent: 'Poetry' },
            { name: 'Spoken Word', group: 'Poetry & Spoken Word', level: 2, parent: 'Poetry' },
            { name: 'Slam Poetry', group: 'Poetry & Spoken Word', level: 2, parent: 'Poetry' },

            // Young Readers
            { name: 'Children', group: 'Young Readers', level: 1, parent: null },
            { name: "Children's Fiction", group: 'Young Readers', level: 2, parent: 'Children' },
            { name: 'Picture Books', group: 'Young Readers', level: 2, parent: 'Children' },
            { name: 'Early Readers', group: 'Young Readers', level: 2, parent: 'Children' },
            { name: 'Middle Grade', group: 'Young Readers', level: 2, parent: 'Children' },

            { name: 'Young Adult', group: 'Young Readers', level: 1, parent: null },
            { name: 'Young Adult (YA)', group: 'Young Readers', level: 2, parent: 'Young Adult' },
            { name: 'YA Fantasy', group: 'Young Readers', level: 2, parent: 'Young Adult' },
            { name: 'YA Romance', group: 'Young Readers', level: 2, parent: 'Young Adult' },
            { name: 'YA Dystopian', group: 'Young Readers', level: 2, parent: 'Young Adult' },

            // Genre-Blending
            { name: 'Romantasy (Romance + Fantasy)', group: 'Genre-Blending & Indie', level: 1, parent: null },
            { name: 'Horror Romance', group: 'Genre-Blending & Indie', level: 1, parent: null },
            { name: 'Speculative Romance', group: 'Genre-Blending & Indie', level: 1, parent: null },
            { name: 'Genre-Blending / Cross-Genre', group: 'Genre-Blending & Indie', level: 1, parent: null },
            { name: 'Experimental Fiction', group: 'Genre-Blending & Indie', level: 1, parent: null },
            { name: 'Serialized Fiction', group: 'Genre-Blending & Indie', level: 1, parent: null },
            { name: 'Web Fiction', group: 'Genre-Blending & Indie', level: 1, parent: null },

            // Fan & Community
            { name: 'Fan Fiction (Original IP Only)', group: 'Fan & Community', level: 1, parent: null },
            { name: 'Retellings & Reimaginings', group: 'Fan & Community', level: 1, parent: null },
            { name: 'Alternate POV Stories', group: 'Fan & Community', level: 1, parent: null },

            // Essays
            { name: 'Essays', group: 'Essays & Short-Form', level: 1, parent: null },
            { name: 'Opinion / Editorial', group: 'Essays & Short-Form', level: 2, parent: 'Essays' },
            { name: 'Creative Non-Fiction', group: 'Essays & Short-Form', level: 2, parent: 'Essays' },
            { name: 'Literary Criticism', group: 'Essays & Short-Form', level: 2, parent: 'Essays' },
            { name: 'Reviews', group: 'Essays & Short-Form', level: 2, parent: 'Essays' },
        ];

        // 7. Insert categories in two passes
        const categoryIds = {};

        // Pass 1: Level 1 categories (parents)
        const level1 = categoryData.filter(c => c.level === 1);
        console.log(`Inserting ${level1.length} level-1 categories...`);
        for (const cat of level1) {
            const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const result = await db.query(
                `INSERT INTO categories (name, group_id, parent_category_id, slug, level, display_order) 
                 VALUES ($1, $2, NULL, $3, $4, 0) 
                 ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
                 RETURNING id`,
                [cat.name, groupIds[cat.group], slug, cat.level]
            );
            categoryIds[cat.name] = result.rows[0].id;
        }

        // Pass 2: Level 2 categories (children)
        const level2 = categoryData.filter(c => c.level === 2);
        console.log(`Inserting ${level2.length} level-2 categories...`);
        for (const cat of level2) {
            const slug = cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const parentId = categoryIds[cat.parent];
            await db.query(
                `INSERT INTO categories (name, group_id, parent_category_id, slug, level, display_order) 
                 VALUES ($1, $2, $3, $4, $5, 0) 
                 ON CONFLICT (slug) DO NOTHING`,
                [cat.name, groupIds[cat.group], parentId, slug, cat.level]
            );
        }

        console.log('✓ Categories seeded successfully!')
        console.log(`  Total: ${categoryData.length} categories across 7 groups`);
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err);
        process.exit(1);
    }
}

seedCategories();
