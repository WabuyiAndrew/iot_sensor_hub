const bcrypt = require('bcryptjs');

async function hashPassword() {
    const password = 'admin123';
    const saltRounds = 12; // Cost factor
    const hash = await bcrypt.hash(password, saltRounds);
    console.log('The bcrypt hash for "admin123" is:');
    console.log(hash);
}

hashPassword();