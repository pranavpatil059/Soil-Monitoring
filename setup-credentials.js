#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('🔧 Advanced Soil Monitoring System - Credentials Setup');
console.log('=' * 60);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupCredentials() {
    try {
        console.log('\n📋 Setting up environment variables...\n');

        // Check if .env already exists
        const envPath = path.join(__dirname, '.env');
        let existingEnv = {};
        
        if (fs.existsSync(envPath)) {
            console.log('⚠️  .env file already exists. Current values will be shown in [brackets]');
            const envContent = fs.readFileSync(envPath, 'utf8');
            envContent.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    existingEnv[key.trim()] = value.trim();
                }
            });
        }

        // Collect credentials
        const credentials = {};

        // Dropbox Setup
        console.log('\n☁️  DROPBOX CONFIGURATION:');
        console.log('   Get your token from: https://www.dropbox.com/developers/apps');
        const currentDropbox = existingEnv.DROPBOX_ACCESS_TOKEN || 'not set';
        credentials.DROPBOX_ACCESS_TOKEN = await question(`   Dropbox Access Token [${currentDropbox}]: `);
        if (!credentials.DROPBOX_ACCESS_TOKEN) {
            credentials.DROPBOX_ACCESS_TOKEN = existingEnv.DROPBOX_ACCESS_TOKEN || '';
        }

        // Server Configuration
        console.log('\n🚀 SERVER CONFIGURATION:');
        const currentPort = existingEnv.PORT || '10001';
        credentials.PORT = await question(`   Server Port [${currentPort}]: `);
        if (!credentials.PORT) {
            credentials.PORT = currentPort;
        }

        const currentEnv = existingEnv.NODE_ENV || 'development';
        credentials.NODE_ENV = await question(`   Environment (development/production) [${currentEnv}]: `);
        if (!credentials.NODE_ENV) {
            credentials.NODE_ENV = currentEnv;
        }

        // Arduino Configuration
        console.log('\n🔌 ARDUINO CONFIGURATION:');
        const currentPort = existingEnv.ARDUINO_PORT || 'COM5';
        credentials.ARDUINO_PORT = await question(`   Arduino COM Port [${currentPort}]: `);
        if (!credentials.ARDUINO_PORT) {
            credentials.ARDUINO_PORT = currentPort;
        }

        const currentBaud = existingEnv.ARDUINO_BAUD_RATE || '9600';
        credentials.ARDUINO_BAUD_RATE = await question(`   Arduino Baud Rate [${currentBaud}]: `);
        if (!credentials.ARDUINO_BAUD_RATE) {
            credentials.ARDUINO_BAUD_RATE = currentBaud;
        }

        // Demo Mode
        console.log('\n🎬 DEMO MODE:');
        const currentDemo = existingEnv.DEMO_MODE || 'true';
        credentials.DEMO_MODE = await question(`   Enable Demo Mode (true/false) [${currentDemo}]: `);
        if (!credentials.DEMO_MODE) {
            credentials.DEMO_MODE = currentDemo;
        }

        // Create .env content
        const envContent = `# Advanced Soil Monitoring System - Environment Configuration
# Generated on: ${new Date().toISOString()}

# Dropbox Configuration
# Get your access token from: https://www.dropbox.com/developers/apps
DROPBOX_ACCESS_TOKEN=${credentials.DROPBOX_ACCESS_TOKEN}

# Server Configuration
NODE_ENV=${credentials.NODE_ENV}
PORT=${credentials.PORT}

# Arduino Configuration
ARDUINO_PORT=${credentials.ARDUINO_PORT}
ARDUINO_BAUD_RATE=${credentials.ARDUINO_BAUD_RATE}

# Demo Mode (set to false when Arduino is connected)
DEMO_MODE=${credentials.DEMO_MODE}

# Security Settings
SESSION_SECRET=${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}
`;

        // Write .env file
        fs.writeFileSync(envPath, envContent);
        
        console.log('\n✅ Credentials setup completed!');
        console.log(`📁 Configuration saved to: ${envPath}`);
        
        // Create cached-photos directory if it doesn't exist
        const photosDir = path.join(__dirname, 'cached-photos');
        if (!fs.existsSync(photosDir)) {
            fs.mkdirSync(photosDir);
            console.log('📁 Created cached-photos directory');
        }

        console.log('\n🚀 Next steps:');
        console.log('   1. Run: npm start (or npm run dev for development)');
        console.log('   2. Open: http://localhost:' + credentials.PORT);
        console.log('   3. Connect Arduino to ' + credentials.ARDUINO_PORT + ' for real sensor data');
        
        if (credentials.DROPBOX_ACCESS_TOKEN) {
            console.log('   4. Dropbox backup will be enabled automatically');
        } else {
            console.log('   4. Add Dropbox token later for cloud backup');
        }

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Run setup
setupCredentials();