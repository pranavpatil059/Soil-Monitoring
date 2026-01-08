const Dropbox = require('dropbox');
const fs = require('fs');
const path = require('path');

class DropboxManager {
    constructor() {
        this.dbx = null;
        this.isConnected = false;
        this.init();
    }

    init() {
        // Check for Dropbox access token in environment
        const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
        
        if (accessToken) {
            this.dbx = new Dropbox.Dropbox({ 
                accessToken: accessToken,
                fetch: require('node-fetch')
            });
            this.isConnected = true;
            console.log('✅ Dropbox connected successfully');
        } else {
            console.log('⚠️  Dropbox not configured - set DROPBOX_ACCESS_TOKEN in .env file');
            console.log('💡 Get token from: https://www.dropbox.com/developers/apps');
        }
    }

    // Upload sensor data as JSON backup
    async backupSensorData(sensorHistory, filename = null) {
        if (!this.isConnected) {
            throw new Error('Dropbox not connected');
        }

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = filename || `soil-data-backup-${timestamp}.json`;
            
            const backupData = {
                timestamp: new Date().toISOString(),
                totalRecords: sensorHistory.length,
                data: sensorHistory,
                metadata: {
                    system: 'Advanced Soil Monitoring - IIT Bombay',
                    version: '2.0.0',
                    exportedBy: 'Dropbox Integration'
                }
            };

            const fileContent = JSON.stringify(backupData, null, 2);
            
            const response = await this.dbx.filesUpload({
                path: `/soil-monitoring-backups/${backupFilename}`,
                contents: fileContent,
                mode: 'overwrite',
                autorename: true
            });

            console.log('✅ Sensor data backed up to Dropbox:', response.result.name);
            return {
                success: true,
                filename: response.result.name,
                path: response.result.path_display,
                size: response.result.size
            };

        } catch (error) {
            console.error('❌ Dropbox backup failed:', error.message);
            throw error;
        }
    }

    // Upload photos/images
    async uploadPhoto(photoPath, customName = null) {
        if (!this.isConnected) {
            throw new Error('Dropbox not connected');
        }

        try {
            if (!fs.existsSync(photoPath)) {
                throw new Error('Photo file not found');
            }

            const fileContent = fs.readFileSync(photoPath);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const extension = path.extname(photoPath);
            const filename = customName || `soil-photo-${timestamp}${extension}`;

            const response = await this.dbx.filesUpload({
                path: `/soil-monitoring-photos/${filename}`,
                contents: fileContent,
                mode: 'overwrite',
                autorename: true
            });

            console.log('✅ Photo uploaded to Dropbox:', response.result.name);
            return {
                success: true,
                filename: response.result.name,
                path: response.result.path_display,
                size: response.result.size
            };

        } catch (error) {
            console.error('❌ Photo upload failed:', error.message);
            throw error;
        }
    }

    // Get shared link for a file
    async getShareableLink(filePath) {
        if (!this.isConnected) {
            throw new Error('Dropbox not connected');
        }

        try {
            const response = await this.dbx.sharingCreateSharedLinkWithSettings({
                path: filePath,
                settings: {
                    requested_visibility: 'public'
                }
            });

            return {
                success: true,
                url: response.result.url,
                directUrl: response.result.url.replace('?dl=0', '?dl=1')
            };

        } catch (error) {
            console.error('❌ Failed to create shareable link:', error.message);
            throw error;
        }
    }

    // List backup files
    async listBackups() {
        if (!this.isConnected) {
            throw new Error('Dropbox not connected');
        }

        try {
            const response = await this.dbx.filesListFolder({
                path: '/soil-monitoring-backups'
            });

            const backups = response.result.entries.map(entry => ({
                name: entry.name,
                path: entry.path_display,
                size: entry.size,
                modified: entry.server_modified
            }));

            return {
                success: true,
                count: backups.length,
                backups: backups
            };

        } catch (error) {
            if (error.status === 409) {
                // Folder doesn't exist yet
                return {
                    success: true,
                    count: 0,
                    backups: []
                };
            }
            console.error('❌ Failed to list backups:', error.message);
            throw error;
        }
    }

    // Auto backup scheduler
    startAutoBackup(sensorHistory, intervalMinutes = 60) {
        if (!this.isConnected) {
            console.log('⚠️  Auto backup disabled - Dropbox not connected');
            return;
        }

        console.log(`🔄 Starting auto backup every ${intervalMinutes} minutes`);
        
        setInterval(async () => {
            try {
                await this.backupSensorData(sensorHistory);
                console.log('✅ Auto backup completed');
            } catch (error) {
                console.error('❌ Auto backup failed:', error.message);
            }
        }, intervalMinutes * 60 * 1000);
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            service: 'Dropbox',
            features: [
                'Automatic data backup',
                'Photo storage',
                'Shareable links',
                'Historical data export'
            ]
        };
    }
}

module.exports = DropboxManager;