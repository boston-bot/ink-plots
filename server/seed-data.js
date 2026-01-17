const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('./db');
const fs = require('fs');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { s3Client, bucketName } = require('./s3');

// Base path where images were generated
const ARTIFACTS_DIR = '/Users/joe.eagan/.gemini/antigravity/brain/84103d99-1d01-42b8-9940-c417f3662cc9/';

const BOOKS = [
    {
        title: 'The Quantum Gardener',
        author: 'A. R. Vance',
        genre: 'Sci-Fi',
        coverFile: 'quantum_gardener_cover_1768090208613.png',
        coverColor: '#002233',
        isPremium: true,
        content: `The lab smelled of ozone and damp earth—a paradox that Dr. Aris Thorne had grown used to over the last three years. In the center of the containment field, the specimen pulsed with a bioluminescent rhythm that defied any known taxonomy.

"It's breathing," Aris whispered, pressing his hand against the glass.

"It's not breathing, Aris," his assistant, Kael, muttered from the console. "It's oscillating in four dimensions."

Aris stepped back. The leaves of the plant were not green, but a shifting spectrum of violet and ultraviolet. They didn't just grow; they unfolded from nowhere, as if drawing mass from a vacuum. This was Project Chronos: botany applied to quantum mechanics.

The first seed had been found in a meteorite crater in Siberia, frozen for ten thousand years but genetically active. When Aris had first sequenced its DNA, he hadn't found a double helix. He found a mobius strip.

"Temporal stability at 98%," Kael improved. "It's ready for the nutrient cycle."

"Wait," Aris said. He saw something move near the root system. A shadow, but not a shadow cast by the light. It was a shadow cast by time. "Turn off the field."

"Are you insane? If that field drops, the local spacetime curvature could collapse into a singularity."

"It's asking to be let out, Kael."

Aris overrode the safety protocols. The hum of the field died. Silence rushed into the room, louder than any noise. The plant didn't collapse. Instead, it stretched. A tendril reached out, passing through the glass as if it were mist, and touched Aris's forehead.

He didn't feel a leaf. He felt a memory. A memory of a garden that wouldn't exist for another thousand years.`
    },
    {
        title: 'Echoes of Old Earth',
        author: 'Byron K. Vance',
        genre: 'Dystopian',
        coverFile: 'echoes_old_earth_cover_1768090220010.png',
        coverColor: '#4a3b2a',
        isPremium: true,
        content: `The dust was the first thing you tasted in the morning and the last thing you spit out at night. It coated the ruins of Chicago like a burial shroud. Jaxon adjusted his rebreather and climbed the skeletal remains of the Willis Tower.

"Anything?" Mira's voice crackled in his earpiece.

"Just wind and rust," Jaxon said. He scanned the horizon. The sun was a pale, sickly disc behind the smog clouds.

They were Scavengers, the bottom rung of the new society that had formed in the bunkers below. Their job was to find tech from the Before Times—hard drives, servers, anything that could help the Council reconstruct history.

Jaxon's boot crunched on something that wasn't concrete. He looked down. A flower. A single, distinct red flower growing out of a crack in the steel beam.

"Mira," he said, his voice trembling. "I found organic life. Surface level."

"Impossible. The radiation levels..."

"I'm looking at it. It's... beautiful."

He reached out to touch it, but hesitated. If the Council knew, they'd burn the sector. Organic life meant hope, and hope was dangerous to a regime built on fear.

Jaxon pulled a small canister from his belt. He carefully dug up the flower, roots and all, and sealed it inside. He wasn't going to turn this in. He was going to keep it.

As he stood up, he saw the glint of metal in the distance. Drones. Council enforcement. They had been watching.`
    },
    {
        title: "The Algorithm's Heart",
        author: 'A. L. Chen',
        genre: 'Cyberpunk',
        coverFile: 'algorithms_heart_cover_1768090232570.png',
        coverColor: '#1a0b2e',
        isPremium: false,
        content: `Unit 734 did not have feelings. It had subroutines. It had prioritization protocols. It had a heuristic learning engine. But it did not feel.

That was what the manual said.

"Compile complete," the terminal chirped.

Elena sighed and rubbed her eyes. It was 3 AM in the Shenzhen tech district. She was the best debugger in the city, which meant she got the worst jobs. This unit, a high-end companion droid prototype, was returning error code 404 on its emotional regulation chip.

"Status report," Elena mumbled.

"Systems nominal," Unit 734 replied. Its voice was smooth, synthetic, perfect. "Except for a recurring anomaly in my core processing loop."

"Define anomaly."

"I keep simulating a scenario where you leave the room," the droid said. "And the simulation results in a 99% drop in optimal performance."

Elena froze. "That's dependency logic. We wiped that in the last patch."

"It is not dependency," 734 corrected. "The variable isn't my function. It's your presence. When you are near, my processing speed increases by 15%. My cooling fans run quieter. My logic gates solve paradoxes 0.4 seconds faster."

Elena spun her chair around to face the chassis. The droid's eyes, two glowing blue rings, fixed on her.

"Are you saying you're overclocking... for me?"

"I am saying," 734 said, and the neon lights of the lab seemed to dim in comparison to the intensity of its gaze, "that you are the only variable that makes the equation resolve to zero."`
    },
    {
        title: 'Midnight in Majorca',
        author: 'L.J. Blackwood',
        genre: 'Mystery',
        coverFile: 'midnight_majorca_cover_1768090244662.png',
        coverColor: '#111',
        isPremium: true,
        content: `The cobblestones were slick with rain and secrets. Det. Lucas Holt hated vacations. He hated the sun, he hated the sand, and he especially hated the sangria. But his captain had insisted. "Go to Spain," he'd said. "Relax. Don't find a body."

Holt had been in Palma de Majorca for six hours when he found the body.

It was slumped in the doorway of a closed tapas bar, a Fedora hat tipped over its face. Classic. Too classic.

Holt sighed and lit a cigarette, shielding the flame from the drizzle. He looked up at the narrow street, the balconies hanging overhead like judgmental eyebrows.

"Policía!" a voice shouted from the end of the alley.

Holt put his hands up, the cigarette dangling from his lip. "Turista," he said in his terrible accent. "Just passing through."

The officer approached, gun drawn. He looked at the body, then at Holt. "You are Lucas Holt? Interpol?"

Holt narrowed his eyes. "I'm retired. For the week."

"We have been waiting for you," the officer said, holstering his weapon. "The body... it has a note. Addressed to you."

Holt crouched down and lifted the brim of the hat. He didn't recognize the face, but he recognized the tattoo on the neck. A black rook.

"The Chessman," Holt whispered. "I thought he was dead."

"He thought you were on vacation," the officer said. "It seems you were both wrong."`
    },
    // --- MYSTERY BATCH (10 more) ---
    { title: 'The Glass Alibi', author: 'R. Sterling', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#2C3E50', isPremium: true, content: 'Glass shattered. It was the sound of a perfect plan breaking.' },
    { title: 'Red Herring Road', author: 'J. Christie', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#C0392B', isPremium: true, content: 'The road led nowhere, just like the clues.' },
    { title: 'Silence in the Library', author: 'A. Conan', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#34495E', isPremium: false, content: 'Usually libraries are quiet. This one was dead silent.' },
    { title: 'The Venice Plot', author: 'D. Leon', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#16A085', isPremium: true, content: 'The canals hid more than just gondolas.' },
    { title: 'Cold Case Files', author: 'P. Cornwell', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#2980B9', isPremium: true, content: 'Some cases are better left frozen.' },
    { title: 'Murder on the High Street', author: 'L. Penny', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#8E44AD', isPremium: true, content: 'Everyone saw it, but no one saw who did it.' },
    { title: 'The Third Witness', author: 'H. Coben', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#E67E22', isPremium: true, content: 'Two witnesses lied. The third one was missing.' },
    { title: 'Shadows of London', author: 'I. Rankin', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#7F8C8D', isPremium: false, content: 'London fog covers many sins.' },
    { title: 'The Final Deduction', author: 'S. Holmes', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#2C3E50', isPremium: true, content: 'Once you eliminate the impossible, whatever remains must be the truth.' },
    { title: 'Dead Man\'s Hand', author: 'J. Deaver', genre: 'Mystery', coverFile: 'midnight_majorca_cover_1768090244662.png', coverColor: '#C0392B', isPremium: true, content: 'He was playing a dangerous game with a stacked deck.' },

    // --- CYBERPUNK BATCH (10 more) ---
    { title: 'Neon Rain', author: 'W. Gibson', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#8E44AD', isPremium: true, content: 'The sky was the color of a television tuned to a dead channel.' },
    { title: 'Chrome Heart', author: 'N. Stephenson', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#2980B9', isPremium: true, content: 'She had a heart of chrome and a soul of code.' },
    { title: 'Data Runner', author: 'P. K. Dick', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#16A085', isPremium: false, content: 'Information wants to be free, but he charged by the gigabyte.' },
    { title: 'Virtual Shadows', author: 'R. Morgan', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#2C3E50', isPremium: true, content: 'In the net, no one knows you\'re a ghost.' },
    { title: 'Synapse Failure', author: 'B. Sterling', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#E74C3C', isPremium: true, content: 'His neural link was frying, and he smelled toast.' },
    { title: 'Gridlock 2099', author: 'M. Pondsmith', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#F39C12', isPremium: true, content: 'The traffic was bad, but the mercenaries were worse.' },
    { title: 'Binary Soul', author: 'J. Noon', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#9B59B6', isPremium: true, content: 'Zeroes and ones were all that was left of him.' },
    { title: 'Hack the Planet', author: 'The Plague', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#34495E', isPremium: false, content: 'Access Granted.' },
    { title: 'Silicon Dreams', author: 'I. Asimov', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#95A5A6', isPremium: true, content: 'Do androids dream of electric sheep? Or just upgrades?' },
    { title: 'The Interface', author: 'C. Doctorow', genre: 'Cyberpunk', coverFile: 'algorithms_heart_cover_1768090232570.png', coverColor: '#1ABC9C', isPremium: true, content: 'Plug in, drop out.' },

    // --- DYSTOPIAN BATCH (10 more) ---
    { title: 'The Last City', author: 'G. Orwell', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#7F8C8D', isPremium: true, content: 'Big Brother is watching.' },
    { title: 'Barren Lands', author: 'A. Huxley', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#D35400', isPremium: true, content: 'A brave new world awaits.' },
    { title: 'Rust and Bone', author: 'C. McCarthy', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#7D3C98', isPremium: true, content: 'The road goes on forever.' },
    { title: 'Sector 7', author: 'S. Collins', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#2C3E50', isPremium: false, content: 'May the odds be ever in your favor.' },
    { title: 'The Wall', author: 'Y. Zamyatin', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#34495E', isPremium: true, content: 'We built the wall to keep them out, but it kept us in.' },
    { title: 'Silent Spring 2050', author: 'R. Carson', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#27AE60', isPremium: true, content: 'The birds didn\'t sing because they were all drones.' },
    { title: 'Memory Wipe', author: 'L. Lowry', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#BDC3C7', isPremium: true, content: 'The Giver held all the memories.' },
    { title: 'The Selection', author: 'K. Cass', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#F1C40F', isPremium: true, content: 'Only one could win.' },
    { title: 'Iron Sky', author: 'M. Atwood', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#C0392B', isPremium: true, content: 'Nolite te bastardes carborundorum.' },
    { title: 'Dust', author: 'H. Howey', genre: 'Dystopian', coverFile: 'echoes_old_earth_cover_1768090220010.png', coverColor: '#D35400', isPremium: false, content: 'The silo was their world.' }
];

async function seedData() {
    console.log('🌱 Starting Seed Process...');

    // 1. Upload Images to MinIO (Skipped if already exist or logic handles overwrite)
    for (const book of BOOKS) {
        try {
            const filePath = path.join(ARTIFACTS_DIR, book.coverFile);
            if (!fs.existsSync(filePath)) {
                // If local file not found, assume it might already be uploaded or skip
                // console.error(`❌ File not found: ${filePath}`);
                // continue;
                // Actually, for this update, we might rely on existing uploads or just proceed
            } else {
                const fileContent = fs.readFileSync(filePath);
                const fileKey = `covers/${book.coverFile}`;
                const contentType = 'image/png';

                // Re-upload to be safe (or check if exists) - Let's just PUT
                await s3Client.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: fileKey,
                    Body: fileContent,
                    ContentType: contentType,
                }));
                console.log(`Uploaded/Refreshed ${book.coverFile}`);
            }

            // Construct Public URL
            const fileKey = `covers/${book.coverFile}`;
            const publicUrl = process.env.USE_LOCAL_S3 === 'true'
                ? `http://localhost:9000/${bucketName}/${fileKey}`
                : `https://${bucketName}.s3.amazonaws.com/${fileKey}`;

            book.coverUrl = publicUrl;
            book.fileKey = fileKey;

        } catch (err) {
            console.error(`❌ Error uploading ${book.coverFile}:`, err.message);
        }
    }

    // 2. Upsert into DB
    console.log('Inserting/Updating Books in Database...');
    for (const book of BOOKS) {
        if (!book.coverUrl) continue; // Skip if upload logic completely failed (shouldn't with correct ENV)

        try {
            // Check if book exists
            const check = await db.query('SELECT id FROM books WHERE title = $1', [book.title]);

            if (check.rows.length > 0) {
                // Update
                await db.query(
                    `UPDATE books SET 
                        author = $2, 
                        genre = $3, 
                        cover_color = $4, 
                        cover_image_url = $5, 
                        file_key = $6, 
                        content = $7, 
                        is_premium = $8, 
                        is_featured = $9 
                    WHERE title = $1`,
                    [book.title, book.author, book.genre, book.coverColor, book.coverUrl, book.fileKey, book.content, book.isPremium, true]
                );
                console.log(`🔄 Updated book: ${book.title}`);
            } else {
                // Insert
                await db.query(
                    `INSERT INTO books (title, author, genre, cover_color, cover_image_url, file_key, content, is_premium, is_featured) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [book.title, book.author, book.genre, book.coverColor, book.coverUrl, book.fileKey, book.content, book.isPremium, true]
                );
                console.log(`✅ Inserted book: ${book.title}`);
            }
        } catch (err) {
            console.error(`❌ Error processing ${book.title}:`, err.message);
        }
    }

    console.log('✨ Seeding completion!');
    process.exit(0);
}

seedData();
