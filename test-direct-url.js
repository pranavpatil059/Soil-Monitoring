// Test Direct URL Access
const fetch = require('node-fetch');

async function testDirectURL() {
    try {
        console.log('🔍 Testing direct image URL access...');
        
        // Test the URLs from gallery API
        const urls = [
            'http://localhost:10001/cached-photos/17f80db7d2a14970.png',
            'http://localhost:10001/cached-photos/4d51de6efba27a00.png', 
            'http://localhost:10001/cached-photos/582e16cd86f8404a.png',
            'http://localhost:10001/cached-photos/3aff97abb89e7344.png'
        ];
        
        for (const url of urls) {
            try {
                console.log(`\n📸 Testing: ${url}`);
                const response = await fetch(url);
                console.log(`   Status: ${response.status} ${response.statusText}`);
                console.log(`   Content-Type: ${response.headers.get('content-type')}`);
                console.log(`   Content-Length: ${response.headers.get('content-length')} bytes`);
                
                if (response.status === 200) {
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.startsWith('image/')) {
                        console.log(`   ✅ Image URL working properly`);
                    } else {
                        console.log(`   ⚠️ Not an image content type: ${contentType}`);
                    }
                } else {
                    console.log(`   ❌ URL not accessible`);
                }
            } catch (error) {
                console.log(`   ❌ Request failed: ${error.message}`);
            }
        }
        
        console.log('\n🌐 BROWSER TEST:');
        console.log('Copy these URLs and test in browser:');
        urls.forEach(url => console.log(url));
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testDirectURL();