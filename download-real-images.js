// Download Real Images from Dropbox
require('dotenv').config();
const { Dropbox } = require('dropbox');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadRealImages() {
    try {
        console.log('📸 Downloading real images from Dropbox...');
        
        const dbx = new Dropbox({ 
            accessToken: process.env.DROPBOX_ACCESS_TOKEN,
            fetch: fetch
        });
        
        // Get file list
        const response = await dbx.filesListFolder({ path: '' });
        const imageFiles = response.result.entries.filter(file => 
            file['.tag'] === 'file' && 
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
        );
        
        console.log(`Found ${imageFiles.length} images to download`);
        
        // Ensure cache directory exists
        const cacheDir = path.join(__dirname, 'cached-photos');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        
        // Download each image
        for (const file of imageFiles) {
            try {
                console.log(`⬇️ Downloading: ${file.name}`);
                
                // Get download link
                const downloadLink = await dbx.filesGetTemporaryLink({ path: file.path_lower });
                const url = downloadLink.result.link;
                
                // Generate secure filename
                const crypto = require('crypto');
                const ext = path.extname(file.name).toLowerCase();
                const hash = crypto.createHash('sha256').update(file.id + file.name).digest('hex').substring(0, 16);
                const secureFilename = `${hash}${ext}`;
                
                const localPath = path.join(cacheDir, secureFilename);
                
                // Download file
                await downloadFile(url, localPath);
                console.log(`✅ Downloaded: ${file.name} -> ${secureFilename}`);
                
            } catch (error) {
                console.error(`❌ Failed to download ${file.name}:`, error.message);
            }
        }
        
        console.log('🎯 All downloads completed!');
        
    } catch (error) {
        console.error('❌ Download process failed:', error.message);
    }
}

function downloadFile(url, localPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(localPath);
        
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Download failed: ${response.statusCode}`));
                return;
            }
            
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                resolve();
            });
            
            file.on('error', (error) => {
                fs.unlink(localPath, () => {});
                reject(error);
            });
            
        }).on('error', (error) => {
            reject(error);
        });
    });
}

downloadRealImages();