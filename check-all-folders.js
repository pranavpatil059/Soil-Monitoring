// Check All Dropbox Folders
require('dotenv').config();
const { Dropbox } = require('dropbox');
const fetch = require('node-fetch');

async function checkAllFolders() {
    try {
        console.log('🔍 Searching entire Dropbox for image files...');
        
        const dbx = new Dropbox({ 
            accessToken: process.env.DROPBOX_ACCESS_TOKEN,
            fetch: fetch
        });
        
        // Search for all image files
        const searchResults = await dbx.filesSearchV2({
            query: '',
            options: {
                path: '',
                max_results: 100,
                file_status: 'active',
                filename_only: false
            }
        });
        
        console.log(`🔍 Found ${searchResults.result.matches.length} total files`);
        
        // Filter image files
        const imageFiles = searchResults.result.matches.filter(match => {
            const file = match.metadata.metadata;
            return file['.tag'] === 'file' && 
                   /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
        });
        
        console.log(`📸 Found ${imageFiles.length} image files in entire Dropbox:`);
        
        imageFiles.forEach(match => {
            const file = match.metadata.metadata;
            const folder = file.path_lower.substring(0, file.path_lower.lastIndexOf('/')) || '/';
            console.log(`  📁 ${folder} -> ${file.name} (${Math.round(file.size/1024)} KB)`);
        });
        
        if (imageFiles.length === 0) {
            console.log('⚠️ No image files found in entire Dropbox');
        }
        
    } catch (error) {
        console.error('❌ Search failed:', error.message);
        
        // Fallback: manually check common folders
        console.log('🔄 Trying manual folder check...');
        
        const dbx = new Dropbox({ 
            accessToken: process.env.DROPBOX_ACCESS_TOKEN,
            fetch: fetch
        });
        
        try {
            // Check root
            const root = await dbx.filesListFolder({ path: '' });
            console.log('\n📁 ROOT DIRECTORY:');
            root.result.entries.forEach(entry => {
                if (entry['.tag'] === 'file' && /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)) {
                    console.log(`  📸 ${entry.name}`);
                } else if (entry['.tag'] === 'folder') {
                    console.log(`  📁 ${entry.name}/`);
                }
            });
            
            // Check each folder
            const folders = root.result.entries.filter(entry => entry['.tag'] === 'folder');
            for (const folder of folders) {
                try {
                    console.log(`\n📁 CHECKING FOLDER: ${folder.name}`);
                    const folderContents = await dbx.filesListFolder({ path: folder.path_lower });
                    
                    const images = folderContents.result.entries.filter(entry => 
                        entry['.tag'] === 'file' && /\.(jpg|jpeg|png|gif|webp)$/i.test(entry.name)
                    );
                    
                    if (images.length > 0) {
                        images.forEach(img => {
                            console.log(`  📸 ${img.name} (${Math.round(img.size/1024)} KB)`);
                        });
                    } else {
                        console.log(`  (no images found)`);
                    }
                } catch (folderError) {
                    console.log(`  ❌ Cannot access folder: ${folderError.message}`);
                }
            }
            
        } catch (manualError) {
            console.error('❌ Manual check also failed:', manualError.message);
        }
    }
}

checkAllFolders();