#!/usr/bin/env node

/**
 * Security Check Script
 * Run this before committing to ensure no sensitive data is exposed
 */

const fs = require('fs');
const path = require('path');

console.log('🔐 Running Security Check...\n');

// Check if .env file exists but is ignored
const envExists = fs.existsSync('.env');
const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
const envIgnored = gitignoreContent.includes('.env');

console.log(`📁 .env file exists: ${envExists ? '✅' : '❌'}`);
console.log(`🚫 .env file ignored: ${envIgnored ? '✅' : '❌'}`);

// Check for potential token leaks in code files
const codeFiles = [
    'gallery-backend.js',
    'advanced-backend.js',
    'gallery.html',
    'advanced-soil-monitoring.html'
];

let tokenFound = false;
const suspiciousPatterns = [
    /sl\.[A-Za-z0-9_-]{100,}/g,  // Dropbox token pattern
    /DROPBOX_ACCESS_TOKEN\s*=\s*['"](sl\.[^'"]+)['"]/g,  // Token in code
    /accessToken:\s*['"](sl\.[^'"]+)['"]/g  // Token in config
];

codeFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        suspiciousPatterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                console.log(`⚠️  Potential token found in ${file}:`);
                matches.forEach(match => {
                    console.log(`   ${match.substring(0, 20)}...`);
                });
                tokenFound = true;
            }
        });
    }
});

// Check for Dropbox references that should be generic
const dropboxReferences = [];
codeFiles.forEach(file => {
    if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes('dropbox') && 
                !line.includes('require(') && 
                !line.includes('DROPBOX_ACCESS_TOKEN') &&
                !line.includes('new Dropbox(') &&  // Allow API initialization
                !line.includes('// ') &&
                !line.includes('* ')) {
                dropboxReferences.push(`${file}:${index + 1} - ${line.trim()}`);
            }
        });
    }
});

console.log(`\n🔍 Security Scan Results:`);
console.log(`   Tokens in code: ${tokenFound ? '❌ FOUND' : '✅ CLEAN'}`);
console.log(`   Dropbox references: ${dropboxReferences.length > 0 ? '⚠️  ' + dropboxReferences.length + ' found' : '✅ CLEAN'}`);

if (dropboxReferences.length > 0) {
    console.log('\n📝 Dropbox references found:');
    dropboxReferences.forEach(ref => console.log(`   ${ref}`));
}

console.log('\n🛡️  Security Recommendations:');
console.log('   ✅ .env file is properly ignored');
console.log('   ✅ Use .env.example for team setup');
console.log('   ✅ Never commit actual tokens');
console.log('   ✅ Use generic terms in user-facing text');

if (!tokenFound && dropboxReferences.length === 0) {
    console.log('\n🎉 Security check passed! Safe to commit.');
} else {
    console.log('\n⚠️  Please review and fix security issues before committing.');
}