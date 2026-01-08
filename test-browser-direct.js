// Test Direct Browser Access
const fs = require('fs');
const path = require('path');

console.log('🔍 Testing direct image access...');

// Check each cached image
const cacheDir = path.join(__dirname, 'cached-photos');
const files = fs.readdirSync(cacheDir);

files.forEach(file => {
    const filePath = path.join(cacheDir, file);
    const stats = fs.statSync(filePath);
    
    console.log(`\n📄 ${file}:`);
    console.log(`   Size: ${stats.size} bytes`);
    console.log(`   Direct URL: http://localhost:10001/cached-photos/${file}`);
    
    if (stats.size < 1000) {
        // Small file - might be placeholder, let's check content
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`   Content: ${content.substring(0, 100)}...`);
    } else {
        console.log(`   ✅ Proper image file`);
    }
});

console.log('\n🌐 Test these URLs directly in browser:');
files.forEach(file => {
    console.log(`http://localhost:10001/cached-photos/${file}`);
});