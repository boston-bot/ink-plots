const fetch = require('node-fetch');

async function restoreUser() {
    try {
        console.log('Running Setup...');
        const setup = await fetch('http://localhost:3000/api/setup');
        console.log(await setup.json());

        console.log('Fixing Content...');
        // We can just run the logic from fix-content.js or import it, 
        // but let's just use the server endpoints if possible. 
        // Since fix-content was a script, let's just allow the server to do its thing first.

        console.log('Registering Writer...');
        const res = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'writer@inkplots.com',
                password: 'password123'
            })
        });

        const data = await res.json();
        console.log('Registration Result:', data);

    } catch (e) {
        console.error(e);
    }
}

restoreUser();
