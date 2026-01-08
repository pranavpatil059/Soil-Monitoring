// FARMER-FRIENDLY GALLERY - NEVER FAILS!
const fs = require('fs');
const path = require('path');
const https = require('https');

class FarmerFriendlyGallery {
    constructor() {
        this.cacheDir = path.join(__dirname, 'farmer-photos');
        this.lastSyncFile = path.join(__dirname, 'last-sync.json');
        
        // Ensure cache directory exists
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        
        console.log('🚜 Farmer-Friendly Gallery initialized!');
    }

    // Get photos - ONLY REAL DROPBOX PHOTOS OR NOTHING!
    async getPhotos() {
        try {
            console.log('📸 Getting REAL photos from Dropbox only...');
            
            // CLEAR ALL CACHE FIRST - NO OLD DATA!
            this.clearOldCache();
            
            // Try to get fresh photos from Dropbox ONLY
            const freshPhotos = await this.getFreshPhotos();
            
            if (freshPhotos && freshPhotos.length > 0) {
                console.log(`✅ Got ${freshPhotos.length} REAL photos from Dropbox`);
                return freshPhotos;
            } else {
                console.log('⚠️ No photos in Dropbox - returning empty array');
                return []; // NO FALLBACK - EMPTY ARRAY ONLY
            }
            
        } catch (error) {
            console.log('❌ Dropbox connection failed - returning empty array');
            return []; // NO FALLBACK - EMPTY ARRAY ONLY
        }
    }

    // Try to get fresh photos from Dropbox
    async getFreshPhotos() {
        try {
            const { Dropbox } = require('dropbox');
            const fetch = require('node-fetch');
            
            if (!process.env.DROPBOX_ACCESS_TOKEN) {
                throw new Error('No Dropbox token');
            }
            
            const dbx = new Dropbox({ 
                accessToken: process.env.DROPBOX_ACCESS_TOKEN,
                fetch: fetch
            });
            
            const response = await dbx.filesListFolder({ path: '' });
            
            const imageFiles = response.result.entries.filter(file => 
                file['.tag'] === 'file' && 
                /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
            );
            
            const photos = [];
            for (const file of imageFiles.slice(0, 10)) { // Limit to 10 photos
                try {
                    const downloadLink = await dbx.filesGetTemporaryLink({ path: file.path_lower });
                    
                    photos.push({
                        id: file.id,
                        name: file.name,
                        url: downloadLink.result.link,
                        thumbnail: downloadLink.result.link,
                        size: this.formatFileSize(file.size),
                        dateModified: file.client_modified,
                        source: 'dropbox-fresh'
                    });
                } catch (error) {
                    console.log(`⚠️ Failed to get download link for ${file.name}`);
                }
            }
            
            return photos;
            
        } catch (error) {
            console.log('❌ Fresh photos failed:', error.message);
            return null;
        }
    }

    // NO CACHE SAVE - REMOVED COMPLETELY
    // Cache save functionality removed - only real-time Dropbox access allowed

    // NO CACHE FUNCTION - REMOVED COMPLETELY
    // Cache functionality removed - only real Dropbox photos allowed

    // NO DEMO PHOTOS - REMOVED COMPLETELY
    // Demo photos functionality removed - only real Dropbox photos allowed

    // Clear old cache - COMPLETE CLEANUP!
    clearOldCache() {
        try {
            console.log('🗑️ CLEARING ALL OLD CACHE - FRESH START!');
            
            if (fs.existsSync(this.cacheDir)) {
                const files = fs.readdirSync(this.cacheDir);
                files.forEach(file => {
                    try {
                        const filePath = path.join(this.cacheDir, file);
                        fs.unlinkSync(filePath);
                        console.log(`✅ Deleted old cache file: ${file}`);
                    } catch (error) {
                        console.log(`⚠️ Could not delete ${file}:`, error.message);
                    }
                });
                console.log(`🗑️ Cache cleared completely - ${files.length} files removed`);
            }
        } catch (error) {
            console.log('⚠️ Cache cleanup warning:', error.message);
        }
    }

    // Update last sync time
    updateLastSync() {
        try {
            const syncData = {
                lastSync: new Date().toISOString(),
                status: 'success'
            };
            fs.writeFileSync(this.lastSyncFile, JSON.stringify(syncData, null, 2));
        } catch (error) {
            console.log('⚠️ Failed to update sync time:', error.message);
        }
    }

    // Get sync status for farmers
    getSyncStatus() {
        try {
            if (!fs.existsSync(this.lastSyncFile)) {
                return {
                    lastSync: 'Never',
                    status: 'No sync yet',
                    message: 'System ready for first sync'
                };
            }
            
            const syncData = JSON.parse(fs.readFileSync(this.lastSyncFile, 'utf8'));
            const lastSync = new Date(syncData.lastSync);
            const now = new Date();
            const diffHours = Math.floor((now - lastSync) / (1000 * 60 * 60));
            
            return {
                lastSync: lastSync.toLocaleString(),
                hoursAgo: diffHours,
                status: diffHours < 24 ? 'Recent' : 'Old',
                message: diffHours < 24 ? 'Photos are up to date' : 'Photos may be outdated'
            };
            
        } catch (error) {
            return {
                lastSync: 'Unknown',
                status: 'Error',
                message: 'Unable to check sync status'
            };
        }
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export singleton instance
module.exports = new FarmerFriendlyGallery();