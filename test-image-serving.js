// Test Image Serving
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testImageServing() {
    try {
        console.log('🔍 Testing image serving...');
        
        // First get the gallery API response
        const galleryResponse = await fetch('http://localhost:10001/api/gallery/photos');
        const galleryData = await galleryResponse.json();
        
        if (galleryData.success) {
            console.log(`✅ Gallery API working! Found ${galleryData.photos.length} photos`);
            
            // Test each image URL
            for (const photo of galleryData.photos) {
                console.log(`\n📸 Testing: ${photo.name}`);
                console.log(`   URL: ${photo.url}`);
                
                try {
                    const imageResponse = await fetch(`http://localhost:10001${photo.url}`);
                    console.log(`   Status: ${imageResponse.status} ${imageResponse.statusText}`);
                    console.log(`   Content-Type: ${imageResponse.headers.get('content-type')}`);
                    console.log(`   Content-Length: ${imageResponse.headers.get('content-length')} bytes`);
                    
                    if (imageResponse.status === 200) {
                        console.log(`   ✅ Image serving OK`);
                    } else {
                        console.log(`   ❌ Image serving FAILED`);
                    }
                } catch (imageError) {
                    console.log(`   ❌ Image request failed: ${imageError.message}`);
                }
            }
        } else {
            console.log('❌ Gallery API failed:', galleryData.error);
        }
        
        // Also check if files exist locally
        console.log('\n📁 Checking local cache files:');
        const cacheDir = path.join(__dirname, 'cached-photos');
        if (fs.existsSync(cacheDir)) {
            const files = fs.readdirSync(cacheDir);
            files.forEach(file => {
                const filePath = path.join(cacheDir, file);
                const stats = fs.statSync(filePath);
                console.log(`   📄 ${file} (${stats.size} bytes)`);
            });
        } else {
            console.log('   ❌ Cache directory not found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testImageServing();