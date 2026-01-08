const express = require('express');
const cors = require('cors');
const { SerialPort, ReadlineParser } = require('serialport');
require('dotenv').config();
const DropboxManager = require('./dropbox-integration');

const app = express();

// Initialize Dropbox
const dropboxManager = new DropboxManager();

// Middleware
app.use(cors({
    origin: "*",
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
let demoMode = true;

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
    console.log('⚠️  Arduino not connected - running in demo mode');
    console.log('   Connect Arduino to COM5 and restart to use real sensors');
    demoMode = true;
}

// Demo mode - generate realistic sensor data
if (demoMode) {
    console.log('🎬 Starting advanced demo mode with AI-powered sensor simulation');
    
    setInterval(() => {
        // Generate realistic sensor variations
        const baseTemp = 25;
        const baseHumidity = 65;
        const baseMoisture = latestSensorData.soilMoisture;
        
        // Simulate natural variations
        const tempVariation = (Math.random() - 0.5) * 4; // ±2°C
        const humidityVariation = (Math.random() - 0.5) * 10; // ±5%
        const moistureVariation = (Math.random() - 0.5) * 8; // ±4%
        
        const newData = {
            soilMoisture: Math.max(30, Math.min(80, baseMoisture + moistureVariation)),
            temperature: Math.max(20, Math.min(35, baseTemp + tempVariation)),
            humidity: Math.max(40, Math.min(80, baseHumidity + humidityVariation)),
            timestamp: new Date().toISOString(),
            deviceId: 'DEMO-MODE'
        };
        
        // Round values for realism
        newData.soilMoisture = Math.round(newData.soilMoisture * 10) / 10;
        newData.temperature = Math.round(newData.temperature * 10) / 10;
        newData.humidity = Math.round(newData.humidity * 10) / 10;
        
        latestSensorData = newData;
        
        // Add to history
        sensorHistory.push({ ...newData });
        if (sensorHistory.length > MAX_HISTORY) {
            sensorHistory.shift();
        }
        
        console.log('🎬 Generated demo data:', newData);
    }, 5000); // Update every 5 seconds
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

// API Routes - IoT Sensor Data
app.post('/api/iot/sensor-data', (req, res) => {
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

        console.log('📡 Received sensor data via API:', latestSensorData);

        res.json({ 
            success: true, 
            message: 'Data received successfully',
            data: latestSensorData
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

// Dropbox API Routes
app.get('/api/dropbox/status', (req, res) => {
    res.json({
        success: true,
        dropbox: dropboxManager.getStatus()
    });
});

app.post('/api/dropbox/backup', async (req, res) => {
    try {
        const result = await dropboxManager.backupSensorData(sensorHistory);
        res.json({
            success: true,
            message: 'Data backed up successfully',
            backup: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/dropbox/backups', async (req, res) => {
    try {
        const result = await dropboxManager.listBackups();
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/dropbox/upload-photo', async (req, res) => {
    try {
        const { photoPath, customName } = req.body;
        
        if (!photoPath) {
            return res.status(400).json({
                success: false,
                error: 'photoPath is required'
            });
        }

        const result = await dropboxManager.uploadPhoto(photoPath, customName);
        res.json({
            success: true,
            message: 'Photo uploaded successfully',
            photo: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
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

// Catch all route for undefined endpoints
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Route not found', 
        path: req.originalUrl,
        message: 'Advanced Soil Monitoring API - Route not found'
    });
});

const PORT = process.env.PORT || 10001;

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
    console.log(`☁️  Dropbox Status: http://localhost:${PORT}/api/dropbox/status`);
    console.log('=' * 60);
    console.log('✅ Ready to monitor soil conditions!');
    
    if (demoMode) {
        console.log('💡 Connect Arduino to COM5 and restart for real sensor data');
    }
    
    // Start auto backup if Dropbox is connected
    if (dropboxManager.getStatus().connected) {
        dropboxManager.startAutoBackup(sensorHistory, 30); // Backup every 30 minutes
    }
});