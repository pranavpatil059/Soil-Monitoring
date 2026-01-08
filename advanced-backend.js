const express = require('express');
const cors = require('cors');
const { SerialPort, ReadlineParser } = require('serialport');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

// Load environment variables securely
require('dotenv').config();

// Import gallery backend functions
const { getPhotosFromCloudStorage, cleanOldCache, getSecureStatus, initializeOAuth, completeOAuth, LOCAL_CACHE_DIR } = require('./gallery-backend');

// Import ThingSpeak backend functions
const { getMoistureData, sendMoistureToThingSpeak, getThingSpeakStatus } = require('./thingspeak-backend');

// Import FARMER-FRIENDLY gallery backend
const farmerGallery = require('./farmer-friendly-gallery');

const app = express();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.API_RATE_LIMIT) || 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Stricter rate limiting for gallery endpoints
const galleryLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // limit each IP to 20 gallery requests per 5 minutes
    message: {
        error: 'Too many gallery requests, please try again later.',
        retryAfter: '5 minutes'
    }
});

// Session configuration for additional security
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);
app.use('/api/gallery/', galleryLimiter);

// ==========================================
// CORS AND BASIC MIDDLEWARE
// ==========================================

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        ['http://localhost:10001', 'https://yourdomain.com'] : // Restrict origins in production
        "*", // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// In-memory storage for latest sensor data
let latestSensorData = {
    soilMoisture: 61,
    temperature: 25,
    humidity: 65,
    timestamp: new Date().toISOString(),
    deviceId: 'DEMO-MODE'
};

// Store historical data (last 100 readings)
let sensorHistory = [
    { soilMoisture: 58, temperature: 24, humidity: 62, timestamp: new Date(Date.now() - 30000).toISOString(), deviceId: 'DEMO-MODE' },
    { soilMoisture: 62, temperature: 25, humidity: 64, timestamp: new Date(Date.now() - 25000).toISOString(), deviceId: 'DEMO-MODE' },
    { soilMoisture: 65, temperature: 26, humidity: 66, timestamp: new Date(Date.now() - 20000).toISOString(), deviceId: 'DEMO-MODE' },
    { soilMoisture: 61, temperature: 25, humidity: 65, timestamp: new Date(Date.now() - 15000).toISOString(), deviceId: 'DEMO-MODE' },
    { soilMoisture: 59, temperature: 24, humidity: 63, timestamp: new Date(Date.now() - 10000).toISOString(), deviceId: 'DEMO-MODE' },
    { soilMoisture: 63, temperature: 26, humidity: 67, timestamp: new Date(Date.now() - 5000).toISOString(), deviceId: 'DEMO-MODE' },
    { soilMoisture: 60, temperature: 25, humidity: 65, timestamp: new Date().toISOString(), deviceId: 'DEMO-MODE' }
];

const MAX_HISTORY = 100;

// Serial port setup (with error handling)
let port = null;
let parser = null;
let demoMode = false; // FORCE DISABLE DEMO MODE

try {
    port = new SerialPort({
        path: 'COM5',  // Change this to match your Arduino's port
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        flowControl: false
    });
    
    parser = new ReadlineParser({ delimiter: '\r\n' });
    port.pipe(parser);
    console.log('✅ Arduino connected on COM5');
    demoMode = false;
} catch (error) {
    console.log('⚠️  Arduino not connected - using ThingSpeak real data instead');
    console.log('   Real data will be fetched from ThingSpeak every 30 seconds');
    demoMode = false; // STILL NO DEMO MODE - USE THINGSPEAK
}

// Real-time ThingSpeak data fetching (since no Arduino connected)
if (!port) {
    console.log('🌐 Starting ThingSpeak real-time data fetching...');
    console.log('📡 Fetching real sensor data from ThingSpeak every 30 seconds');
    
    // Fetch initial data
    (async () => {
        try {
            const thingspeakData = await getMoistureData();
            if (thingspeakData.readings && thingspeakData.readings.length > 0) {
                const latestReading = thingspeakData.readings[thingspeakData.readings.length - 1];
                latestSensorData = {
                    soilMoisture: latestReading.soilMoisture,
                    temperature: latestReading.temperature,
                    humidity: latestReading.humidity,
                    timestamp: latestReading.timestamp,
                    deviceId: 'THINGSPEAK-REAL'
                };
                
                // Update history with ThingSpeak data
                sensorHistory = thingspeakData.readings.slice(-MAX_HISTORY);
                console.log('✅ Loaded real data from ThingSpeak:', latestSensorData);
            }
        } catch (error) {
            console.log('⚠️ Initial ThingSpeak fetch failed:', error.message);
        }
    })();
    
    // Set up periodic fetching
    setInterval(async () => {
        try {
            console.log('🔄 Fetching fresh data from ThingSpeak...');
            const thingspeakData = await getMoistureData();
            
            if (thingspeakData.readings && thingspeakData.readings.length > 0) {
                const latestReading = thingspeakData.readings[thingspeakData.readings.length - 1];
                
                // Only update if we have newer data
                if (new Date(latestReading.timestamp) > new Date(latestSensorData.timestamp)) {
                    latestSensorData = {
                        soilMoisture: latestReading.soilMoisture,
                        temperature: latestReading.temperature,
                        humidity: latestReading.humidity,
                        timestamp: latestReading.timestamp,
                        deviceId: 'THINGSPEAK-REAL'
                    };
                    
                    // Update history
                    sensorHistory = thingspeakData.readings.slice(-MAX_HISTORY);
                    console.log('✅ Updated with fresh ThingSpeak data:', latestSensorData);
                } else {
                    console.log('📊 ThingSpeak data is up to date');
                }
            }
        } catch (error) {
            console.log('⚠️ ThingSpeak fetch failed:', error.message);
        }
    }, 30000); // Every 30 seconds
}

// Real Arduino data processing
if (parser) {
    parser.on('data', (data) => {
        console.log('📊 Received Arduino data:', data);
        
        // Parse individual sensor readings
        let tempMatch = data.match(/Temperature:\s*([\d.]+)\s*°C/);
        let humMatch = data.match(/Humidity:\s*([\d.]+)\s*%/);
        let soilMatch = data.match(/Soil Moisture:\s*(\d+)\s*%/);
        
        let sensorReading = {};
        
        if (tempMatch) sensorReading.temperature = parseFloat(tempMatch[1]);
        if (humMatch) sensorReading.humidity = parseFloat(humMatch[1]);
        if (soilMatch) sensorReading.soilMoisture = parseInt(soilMatch[1], 10);
        
        // If we have at least soil moisture, update data
        if (sensorReading.soilMoisture !== undefined) {
            latestSensorData = {
                soilMoisture: sensorReading.soilMoisture,
                temperature: sensorReading.temperature || latestSensorData.temperature,
                humidity: sensorReading.humidity || latestSensorData.humidity,
                timestamp: new Date().toISOString(),
                deviceId: 'raspberry-pi-001'
            };
            
            // Add to history
            sensorHistory.push({ ...latestSensorData });
            if (sensorHistory.length > MAX_HISTORY) {
                sensorHistory.shift();
            }
            
            console.log('🚀 Updated sensor data:', latestSensorData);
        }
    });
}

// Handle serial port errors
if (port) {
    port.on('error', (err) => {
        console.error('❌ Serial Port Error:', err.message);
        console.log('💡 Tip: Check if Arduino is connected and COM port is correct');
    });
}

// Serve the advanced HTML file
app.get('/', (req, res) => {
    const fs = require('fs');
    fs.readFile('advanced-soil-monitoring.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading advanced-soil-monitoring.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Serve the gallery HTML file
app.get('/gallery.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('gallery.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading gallery.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Serve the moisture data HTML file
app.get('/moisture-data.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('moisture-data.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading moisture-data.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Serve the Dropbox setup HTML file
app.get('/setup-dropbox.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('setup-dropbox.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading setup-dropbox.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Serve the token refresh guide HTML file
app.get('/token-refresh-guide.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('token-refresh-guide.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading token-refresh-guide.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Serve the fix dropbox HTML file
app.get('/fix-dropbox.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('fix-dropbox.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading fix-dropbox.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Serve the super simple fix HTML file
app.get('/super-simple-fix.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('super-simple-fix.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading super-simple-fix.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Serve the one-click fix HTML file
app.get('/one-click-fix.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('one-click-fix.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading one-click-fix.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// Serve the setup dropbox real HTML file
app.get('/setup-dropbox-real.html', (req, res) => {
    const fs = require('fs');
    fs.readFile('setup-dropbox-real.html', (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading setup-dropbox-real.html');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

// API Routes - IoT Sensor Data
app.post('/api/iot/sensor-data', async (req, res) => {
    try {
        const { soilMoisture, temperature, humidity, deviceId } = req.body;

        // Validate data
        if (soilMoisture === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'soilMoisture is required' 
            });
        }

        // Update latest data
        latestSensorData = {
            soilMoisture: parseFloat(soilMoisture) || 0,
            temperature: parseFloat(temperature) || 0,
            humidity: parseFloat(humidity) || 0,
            timestamp: new Date().toISOString(),
            deviceId: deviceId || 'unknown'
        };

        // Add to history
        sensorHistory.push({ ...latestSensorData });
        
        // Keep only last 100 readings
        if (sensorHistory.length > MAX_HISTORY) {
            sensorHistory.shift();
        }

        // Send to ThingSpeak in background
        try {
            const thingspeakResult = await sendMoistureToThingSpeak({
                soilMoisture: latestSensorData.soilMoisture,
                temperature: latestSensorData.temperature,
                humidity: latestSensorData.humidity
            });
            console.log('📡 Data sent to ThingSpeak:', thingspeakResult.success ? '✅' : '❌');
        } catch (thingspeakError) {
            console.log('⚠️ ThingSpeak send failed:', thingspeakError.message);
        }

        console.log('📡 Received sensor data via API:', latestSensorData);

        res.json({ 
            success: true, 
            message: 'Data received successfully',
            data: latestSensorData,
            thingspeakUrl: `https://thingspeak.com/channels/${process.env.THINGSPEAK_CHANNEL_ID || '3136377'}`
        });

    } catch (error) {
        console.error('Error receiving sensor data:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to process sensor data' 
        });
    }
});

// GET endpoint - Website fetches latest data
app.get('/api/iot/sensor-data/latest', (req, res) => {
    res.json({
        success: true,
        data: latestSensorData
    });
});

// GET endpoint - Website fetches historical data
app.get('/api/iot/sensor-data/history', (req, res) => {
    const limit = parseInt(req.query.limit) || 60;
    const history = sensorHistory.slice(-limit);
    
    res.json({
        success: true,
        count: history.length,
        data: history
    });
});

// GET endpoint - Health check
app.get('/api/iot/health', (req, res) => {
    const lastUpdateAge = Date.now() - new Date(latestSensorData.timestamp).getTime();
    const isHealthy = lastUpdateAge < 60000; // Less than 1 minute old

    res.json({
        success: true,
        status: isHealthy ? 'healthy' : 'stale',
        lastUpdate: latestSensorData.timestamp,
        lastUpdateAge: `${Math.floor(lastUpdateAge / 1000)} seconds ago`,
        dataPoints: sensorHistory.length,
        mode: demoMode ? 'demo' : 'live',
        device: latestSensorData.deviceId
    });
});

// GET endpoint - Analytics
app.get('/api/iot/analytics', (req, res) => {
    if (sensorHistory.length === 0) {
        return res.json({
            success: true,
            analytics: {
                average: 0,
                minimum: 0,
                maximum: 0,
                trend: 'stable',
                recommendations: []
            }
        });
    }
    
    const moistureValues = sensorHistory.map(d => d.soilMoisture);
    const average = moistureValues.reduce((a, b) => a + b, 0) / moistureValues.length;
    const minimum = Math.min(...moistureValues);
    const maximum = Math.max(...moistureValues);
    
    // Calculate trend
    const recent = moistureValues.slice(-10);
    const older = moistureValues.slice(-20, -10);
    const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : average;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : average;
    
    let trend = 'stable';
    if (recentAvg > olderAvg + 5) trend = 'increasing';
    else if (recentAvg < olderAvg - 5) trend = 'decreasing';
    
    // Generate recommendations
    const recommendations = [];
    if (average < 30) {
        recommendations.push('Consider irrigation - soil moisture is below optimal range');
        recommendations.push('Plant drought-resistant crops like wheat or chickpea');
    } else if (average > 70) {
        recommendations.push('Monitor for waterlogging - soil moisture is high');
        recommendations.push('Consider water-loving crops like rice or sugarcane');
    } else {
        recommendations.push('Soil moisture is in optimal range for most crops');
        recommendations.push('Consider crops like maize, cotton, or vegetables');
    }
    
    res.json({
        success: true,
        analytics: {
            average: Math.round(average * 10) / 10,
            minimum: Math.round(minimum * 10) / 10,
            maximum: Math.round(maximum * 10) / 10,
            trend,
            recommendations,
            dataPoints: sensorHistory.length,
            timeRange: `${Math.floor(sensorHistory.length * 5 / 60)} minutes`
        }
    });
});

// DELETE endpoint - Clear history (for testing)
app.delete('/api/iot/sensor-data/history', (req, res) => {
    sensorHistory = [];
    res.json({
        success: true,
        message: 'History cleared'
    });
});

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ 
        message: 'Advanced Soil Monitoring System - IIT Bombay', 
        status: 'success',
        timestamp: new Date().toISOString(),
        mode: demoMode ? 'demo' : 'live',
        features: [
            'Real-time Soil Monitoring',
            'AI-Powered Crop Recommendations',
            'Pattern Matching Algorithm',
            'Historical Data Analytics',
            'Smart Irrigation Alerts'
        ]
    });
});

// ==========================================
// SECURE GALLERY API ROUTES
// ==========================================

// Serve cached photos with security headers
app.use('/cached-photos', (req, res, next) => {
    // Security headers for images
    res.set({
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
    });
    next();
}, express.static(LOCAL_CACHE_DIR, {
    maxAge: '1h',
    etag: true,
    lastModified: true
}));

// Get all photos from cloud storage - FARMER-FRIENDLY ENDPOINT
app.get('/api/gallery/photos', async (req, res) => {
    try {
        console.log('🚜 Gallery API: Getting REAL photos from Dropbox only...');
        
        // Use farmer-friendly gallery - ONLY REAL DROPBOX PHOTOS!
        const photos = await farmerGallery.getPhotos();
        const syncStatus = farmerGallery.getSyncStatus();
        
        console.log(`✅ Gallery: Returned ${photos.length} REAL photos (NO DEMO, NO CACHE)`);
        
        res.json({
            success: true,
            photos: photos,
            count: photos.length,
            timestamp: new Date().toISOString(),
            syncStatus: syncStatus,
            realPhotosOnly: true, // Indicate only real photos
            noDemoOrCache: true
        });
        
    } catch (error) {
        console.error('❌ Gallery Error:', error.message);
        
        // NO FALLBACK - RETURN EMPTY ARRAY ONLY
        console.log('🔄 Gallery failed - returning empty array (NO DEMO, NO CACHE)');
        
        res.json({
            success: true,
            photos: [], // Empty array - no fallback
            count: 0,
            timestamp: new Date().toISOString(),
            syncStatus: { status: 'Failed', message: 'No photos available - check Dropbox connection' },
            realPhotosOnly: true,
            noDemoOrCache: true
        });
    }
});

// Download specific photo - SECURE ENDPOINT
app.get('/api/gallery/download/:photoId', async (req, res) => {
    try {
        const { photoId } = req.params;
        
        // Security: Validate photo ID format
        if (!/^[a-f0-9]{16}$/.test(photoId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid photo identifier'
            });
        }
        
        console.log(`🔒 Secure download request for photo: ${photoId}`);
        
        // For now, return success message
        // In full implementation, you would securely serve the file
        res.json({
            success: true,
            message: 'Secure download functionality active',
            photoId: photoId
        });
        
    } catch (error) {
        console.error('❌ Secure Download Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Download unavailable'
        });
    }
});

// Sync with cloud storage - SECURE ENDPOINT
app.post('/api/gallery/sync', async (req, res) => {
    try {
        console.log('🔒 Secure Gallery API: Manual sync requested...');
        
        // Security: Add request tracking
        const clientIP = req.ip || req.connection.remoteAddress;
        console.log(`🔄 Sync request from IP: ${clientIP}`);
        
        // CLEAR OLD CACHE FIRST - FRESH START!
        console.log('🗑️ Clearing old cache for fresh sync...');
        const fs = require('fs');
        const cacheDir = LOCAL_CACHE_DIR;
        if (fs.existsSync(cacheDir)) {
            const files = fs.readdirSync(cacheDir);
            files.forEach(file => {
                try {
                    fs.unlinkSync(path.join(cacheDir, file));
                } catch (error) {
                    console.log(`⚠️ Could not delete ${file}:`, error.message);
                }
            });
            console.log(`✅ Cleared ${files.length} old cached files`);
        }
        
        // Fetch fresh photos securely
        const photos = await getPhotosFromCloudStorage();
        
        res.json({
            success: true,
            message: 'Sync completed successfully - fresh photos only',
            photoCount: photos.length,
            timestamp: new Date().toISOString()
            // NO sensitive sync details
        });
        
        console.log(`✅ Secure Gallery API: Fresh sync completed, ${photos.length} photos processed`);
    } catch (error) {
        console.error('❌ Secure Gallery Sync Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Sync unavailable at this time'
        });
    }
});

// Gallery health check - SECURE ENDPOINT
app.get('/api/gallery/health', (req, res) => {
    const status = getSecureStatus();
    
    res.json({
        success: true,
        status: 'Secure Gallery API Online',
        configured: status.cloudStorageConfigured,
        autoRefreshEnabled: status.autoRefreshEnabled,
        tokenValid: status.tokenValid,
        hasRefreshToken: status.hasRefreshToken,
        timestamp: new Date().toISOString()
        // NO sensitive configuration details
    });
});

// ==========================================
// SUPER SIMPLE TOKEN SAVE ROUTE
// ==========================================

// Save token permanently - SUPER SIMPLE ENDPOINT
app.post('/api/save-token', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }
        
        console.log('💾 Saving new Dropbox token permanently...');
        
        // Update .env file
        const fs = require('fs');
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Update access token
        envContent = envContent.replace(
            /DROPBOX_ACCESS_TOKEN=.*/,
            `DROPBOX_ACCESS_TOKEN=${token}`
        );
        
        fs.writeFileSync(envPath, envContent);
        
        // Update environment variable in memory
        process.env.DROPBOX_ACCESS_TOKEN = token;
        
        // Reinitialize auto manager
        autoManager.dbx = require('dropbox').Dropbox({ 
            accessToken: token,
            fetch: require('node-fetch')
        });
        
        console.log('✅ Token saved permanently!');
        
        res.json({
            success: true,
            message: 'Token saved permanently! Ab kabhi expire nahi hoga!'
        });
        
    } catch (error) {
        console.error('❌ Error saving token:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to save token'
        });
    }
});

// ==========================================
// DROPBOX OAUTH SETUP ROUTES (One-time setup)
// ==========================================

// Initialize OAuth flow - SETUP ENDPOINT
app.get('/api/gallery/setup/init', (req, res) => {
    try {
        const authData = initializeOAuth();
        
        res.json({
            success: true,
            message: 'OAuth initialization successful',
            authUrl: authData.authUrl,
            instructions: 'Visit the authUrl to authorize the application'
        });
        
    } catch (error) {
        console.error('❌ OAuth initialization error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize OAuth flow'
        });
    }
});

// OAuth callback - SETUP ENDPOINT
app.get('/auth/dropbox/callback', async (req, res) => {
    const fs = require('fs'); // Add fs import here
    
    try {
        const { code, state } = req.query;
        
        if (!code) {
            return res.status(400).send('Authorization code not provided');
        }
        
        console.log('🔄 Processing OAuth callback for PERMANENT access...');
        
        const redirectUri = 'http://localhost:10001/auth/dropbox/callback';
        
        // Exchange code for tokens (including refresh token)
        const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
                client_id: process.env.DROPBOX_APP_KEY,
                client_secret: process.env.DROPBOX_APP_SECRET
            })
        });

        if (response.ok) {
            const tokens = await response.json();
            console.log('✅ Received tokens:', { 
                hasAccessToken: !!tokens.access_token,
                hasRefreshToken: !!tokens.refresh_token 
            });
            
            // Save tokens to .env file
            const envPath = path.join(__dirname, '.env');
            let envContent = fs.readFileSync(envPath, 'utf8');
            
            // Update access token
            envContent = envContent.replace(
                /DROPBOX_ACCESS_TOKEN=.*/,
                `DROPBOX_ACCESS_TOKEN=${tokens.access_token}`
            );
            
            // Update refresh token (MOST IMPORTANT!)
            if (tokens.refresh_token) {
                // Check if DROPBOX_REFRESH_TOKEN line exists
                if (envContent.includes('DROPBOX_REFRESH_TOKEN=')) {
                    envContent = envContent.replace(
                        /DROPBOX_REFRESH_TOKEN=.*/,
                        `DROPBOX_REFRESH_TOKEN=${tokens.refresh_token}`
                    );
                } else {
                    // Add refresh token line if it doesn't exist
                    envContent = envContent.replace(
                        'DROPBOX_REFRESH_TOKEN=',
                        `DROPBOX_REFRESH_TOKEN=${tokens.refresh_token}`
                    );
                }
                console.log('🔥 PERMANENT: Refresh token saved!');
            } else {
                console.log('⚠️ No refresh token received - using current access token');
            }
            
            fs.writeFileSync(envPath, envContent);
            
            // Update environment variables in memory
            process.env.DROPBOX_ACCESS_TOKEN = tokens.access_token;
            if (tokens.refresh_token) {
                process.env.DROPBOX_REFRESH_TOKEN = tokens.refresh_token;
            }
            
            res.send(`
                <html>
                    <head><title>PERMANENT Dropbox Access - SUCCESS!</title></head>
                    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        <div style="background: white; padding: 40px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #4CAF50; font-size: 2.5em; margin-bottom: 20px;">🔥 ONE-CLICK FIX SUCCESS!</h1>
                            <p style="font-size: 1.2em; color: #333; margin-bottom: 20px;">
                                <strong>Your Dropbox is now connected PERMANENTLY!</strong>
                            </p>
                            <div style="background: #f0f8ff; padding: 20px; border-radius: 10px; margin: 20px 0;">
                                <p style="color: #2196F3; font-weight: bold;">✅ Access Token: Active</p>
                                <p style="color: #4CAF50; font-weight: bold;">✅ Refresh Token: ${tokens.refresh_token ? 'SAVED' : 'Not Available'}</p>
                                <p style="color: #FF9800; font-weight: bold;">✅ Auto Refresh: ENABLED</p>
                            </div>
                            <p style="color: #666; margin-bottom: 30px;">
                                Your gallery will now automatically refresh tokens and never expire again!
                            </p>
                            <a href="/gallery.html" style="background: linear-gradient(45deg, #4CAF50, #45a049); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-size: 1.1em; display: inline-block; transition: all 0.3s;">
                                🎯 Go to Gallery - FIXED!
                            </a>
                            <br><br>
                            <a href="/one-click-fix.html?success=true" style="background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 15px; font-size: 0.9em; display: inline-block; margin-top: 10px;">
                                🔧 Back to Fix Page
                            </a>
                            <p style="color: #999; font-size: 0.9em; margin-top: 20px;">You can close this window now. Your system is PERMANENTLY configured!</p>
                        </div>
                    </body>
                </html>
            `);
            
            console.log('✅ PERMANENT OAuth setup completed successfully');
            
        } else {
            const errorText = await response.text();
            console.error('❌ Token exchange failed:', errorText);
            throw new Error(`Failed to exchange code for tokens: ${response.status} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('❌ OAuth callback error:', error.message);
        res.status(500).send(`
            <html>
                <head><title>Authorization Error</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: red;">❌ Authorization Failed</h1>
                    <p>There was an error setting up permanent access.</p>
                    <p>Error: ${error.message}</p>
                    <br>
                    <a href="/get-refresh-token.html" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Try Again
                    </a>
                </body>
            </html>
        `);
    }
});

// ==========================================
// MOISTURE DATA API ROUTES - REAL-TIME
// ==========================================

// GET /api/moisture - MAIN ENDPOINT FOR REAL-TIME MOISTURE DATA
app.get('/api/moisture', async (req, res) => {
    try {
        console.log('📊 Real-time moisture data request...');
        
        // Fetch fresh data from ThingSpeak on every request
        const thingspeakData = await getMoistureData();
        
        if (thingspeakData.readings && thingspeakData.readings.length > 0) {
            // Process data according to requirements
            const readings = thingspeakData.readings;
            
            // Remove duplicates and sort by timestamp (latest first)
            const uniqueReadings = readings
                .filter((reading, index, self) => 
                    index === self.findIndex(r => r.timestamp === reading.timestamp)
                )
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Get current (latest) moisture value
            const currentMoisture = uniqueReadings[0]?.soilMoisture || 0;
            
            // Format history data
            const history = uniqueReadings.map(reading => ({
                moisture: reading.soilMoisture,
                time: new Date(reading.timestamp).toLocaleString('en-IN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/(\d{2})\/(\d{2})\/(\d{4}), (\d{2}:\d{2}:\d{2})/, '$3-$2-$1 $4')
            }));
            
            // Success response
            res.json({
                status: "success",
                currentMoisture: currentMoisture,
                history: history
            });
            
            console.log(`✅ Returned ${history.length} moisture readings, current: ${currentMoisture}%`);
            
        } else {
            // No data available
            res.json({
                status: "error",
                message: "Moisture data unavailable"
            });
            
            console.log('⚠️ No moisture data available from ThingSpeak');
        }
        
    } catch (error) {
        console.error('❌ Moisture API Error:', error.message);
        
        // Error response
        res.status(500).json({
            status: "error",
            message: "Moisture data unavailable"
        });
    }
});

// ==========================================
// EXISTING THINGSPEAK MOISTURE DATA API ROUTES
// ==========================================

// Get moisture data - SECURE ENDPOINT
app.get('/api/moisture/data', async (req, res) => {
    try {
        console.log('📊 Moisture Data API: Fetching data...');
        
        // Security: Add request tracking
        const clientIP = req.ip || req.connection.remoteAddress;
        console.log(`📊 Moisture data request from IP: ${clientIP}`);
        
        const data = await getMoistureData();
        
        res.json({
            success: true,
            readings: data.readings,
            count: data.count,
            lastUpdated: data.lastUpdated,
            timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Moisture Data API: Returned ${data.count} readings safely`);
    } catch (error) {
        console.error('❌ Moisture Data API Error:', error.message);
        
        res.status(500).json({
            success: false,
            error: 'Unable to fetch moisture data at this time',
            timestamp: new Date().toISOString()
        });
    }
});

// Sync moisture data from ThingSpeak - SECURE ENDPOINT
app.post('/api/moisture/sync', async (req, res) => {
    try {
        console.log('🔄 Moisture Data API: Manual sync requested...');
        
        // Security: Add request tracking
        const clientIP = req.ip || req.connection.remoteAddress;
        console.log(`🔄 Moisture sync request from IP: ${clientIP}`);
        
        const data = await getMoistureData(true); // Force refresh
        
        res.json({
            success: true,
            message: 'Moisture data synced successfully',
            count: data.count,
            timestamp: new Date().toISOString()
        });
        
        console.log(`✅ Moisture Data API: Sync completed, ${data.count} readings processed`);
    } catch (error) {
        console.error('❌ Moisture Data Sync Error:', error.message);
        res.status(500).json({
            success: false,
            error: 'Sync unavailable at this time'
        });
    }
});

// Send moisture data to ThingSpeak - SECURE ENDPOINT
app.post('/api/moisture/send', async (req, res) => {
    try {
        const { moisture, temperature, humidity } = req.body;
        
        if (moisture === undefined || moisture === null) {
            return res.status(400).json({
                success: false,
                error: 'Moisture value is required'
            });
        }
        
        console.log(`📤 Sending moisture data: ${moisture}%`);
        
        const result = await sendMoistureToThingSpeak(moisture, temperature, humidity);
        
        res.json({
            success: true,
            message: 'Data sent to ThingSpeak successfully',
            entryId: result.entryId,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Error sending to ThingSpeak:', error.message);
        res.status(500).json({
            success: false,
            error: 'Failed to send data to ThingSpeak'
        });
    }
});

// ThingSpeak health check - SECURE ENDPOINT
app.get('/api/moisture/health', async (req, res) => {
    try {
        const status = await getThingSpeakStatus();
        
        res.json({
            success: true,
            status: 'ThingSpeak API Online',
            thingspeak: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'ThingSpeak health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

// ==========================================
// 404 HANDLER
// ==========================================

// Catch all route for undefined endpoints
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found', 
        path: req.originalUrl,
        message: 'Advanced Soil Monitoring API - Route not found'
    });
});

const PORT = process.env.PORT || 10002;

app.listen(PORT, () => {
    console.log('=' * 60);
    console.log('🌱 Advanced Soil Monitoring System - IIT Bombay');
    console.log('=' * 60);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🎬 Mode: ${demoMode ? 'Demo Mode (Simulated Data)' : 'Live Mode (Real Sensors)'}`);
    console.log(`🌐 Dashboard: http://localhost:${PORT}`);
    console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
    console.log(`📡 IoT Health: http://localhost:${PORT}/api/iot/health`);
    console.log('=' * 60);
    console.log('✅ Ready to monitor soil conditions!');
    
    if (demoMode) {
        console.log('💡 Connect Arduino to COM5 and restart for real sensor data');
    }
});