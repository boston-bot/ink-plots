const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
