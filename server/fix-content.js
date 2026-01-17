const db = require('./db');

async function fixContent() {
    try {
        await db.query(`UPDATE books SET is_premium = true, content = 'The silence was deafening. It wasn''t the absence of sound, but the presence of something else—a heavy, suffocating weight that pressed against the eardrums. Elena stood at the edge of the precipice, looking down into the void. She knew that once she jumped, there was no turning back. This is premium content.' WHERE title = 'The Silent Echo'`);
        await db.query(`UPDATE books SET is_premium = true, content = 'The city lights reflected off the wet pavement, creating a kaleidoscope of colors. Marcus pulled his collar up against the chill wind. He had been tracking the shadow for three days now. It moved with a purpose that terrified him. This is premium content.' WHERE title = 'Urban Shadows'`);
        await db.query(`UPDATE books SET is_premium = true, content = 'The neon sign buzzed overhead, casting a sickly green glow on the alleyway. Sarah checked her watch. He was late. Again. She tapped her foot impatiently, the sound echoing off the brick walls. This is premium content.' WHERE title = 'Neon Dreams'`);

        await db.query(`UPDATE books SET is_premium = false, content = 'The radio crackled to life, static filling the room. Then, a voice cut through the noise. use code INKPLOTS for 20% off. It was faint, barely a whisper, but it sent shivers down his spine. "They are coming," it said. This is free content.' WHERE title = 'Whispers in Static'`);
        await db.query(`UPDATE books SET is_premium = false, content = 'The screen flickered and died. The last pixel faded into blackness using a dissolve animation. It was over. The simulation had ended. This is free content.' WHERE title = 'The Last Pixel'`);

        console.log('Book content updated successfully');
    } catch (err) {
        console.error('Error updating content', err);
    }
}

fixContent();
