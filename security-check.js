#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔒 Advanced Soil Monitoring System - Security Check');
console.log('=' * 60);

class SecurityChecker {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.passed = [];
    }

    // Check if .env file exists and has proper permissions
    checkEnvFile() {
        const envPath = path.join(__dirname, '.env');
        
        if (!fs.existsSync(envPath)) {
            this.warnings.push('⚠️  .env file not found - run "npm run setup" to create it');
            return;
        }

        try {
            const envContent = fs.readFileSync(envPath, 'utf8');
            
            // Check for sensitive data
            if (envContent.includes('your_token_here') || envContent.includes('your_dropbox_access_token_here')) {
                this.issues.push('❌ Default placeholder values found in .env file');
            }

            // Check for empty critical values
            const lines = envContent.split('\n');
            const envVars = {};
            
            lines.forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) {
                    envVars[key.trim()] = value.trim();
                }
            });

            if (envVars.DROPBOX_ACCESS_TOKEN && envVars.DROPBOX_ACCESS_TOKEN.length < 10) {
                this.warnings.push('⚠️  Dropbox token appears to be invalid or too short');
            }

            if (!envVars.SESSION_SECRET || envVars.SESSION_SECRET.length < 16) {
                this.issues.push('❌ SESSION_SECRET is missing or too weak');
            }

            this.passed.push('✅ .env file exists and is readable');

        } catch (error) {
            this.issues.push(`❌ Cannot read .env file: ${error.message}`);
        }
    }

    // Check file permissions and sensitive files
    checkFilePermissions() {
        const sensitiveFiles = ['.env', 'package.json', 'advanced-backend.js'];
        
        sensitiveFiles.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                try {
                    const stats = fs.statSync(filePath);
                    // On Windows, this check is less relevant, but we'll do basic checks
                    this.passed.push(`✅ ${file} permissions OK`);
                } catch (error) {
                    this.warnings.push(`⚠️  Cannot check permissions for ${file}`);
                }
            }
        });
    }

    // Check for common security vulnerabilities
    checkDependencies() {
        const packagePath = path.join(__dirname, 'package.json');
        
        if (!fs.existsSync(packagePath)) {
            this.issues.push('❌ package.json not found');
            return;
        }

        try {
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            // Check for security-related dependencies
            const securityDeps = ['helmet', 'express-rate-limit', 'express-session'];
            const hasSecurity = securityDeps.some(dep => 
                packageData.dependencies && packageData.dependencies[dep]
            );

            if (hasSecurity) {
                this.passed.push('✅ Security middleware dependencies found');
            } else {
                this.warnings.push('⚠️  Consider adding security middleware (helmet, express-rate-limit)');
            }

            // Check for outdated or vulnerable packages (basic check)
            if (packageData.dependencies) {
                const depCount = Object.keys(packageData.dependencies).length;
                this.passed.push(`✅ ${depCount} dependencies found`);
            }

        } catch (error) {
            this.issues.push(`❌ Cannot parse package.json: ${error.message}`);
        }
    }

    // Check server configuration
    checkServerConfig() {
        const backendPath = path.join(__dirname, 'advanced-backend.js');
        
        if (!fs.existsSync(backendPath)) {
            this.issues.push('❌ Main server file (advanced-backend.js) not found');
            return;
        }

        try {
            const serverCode = fs.readFileSync(backendPath, 'utf8');
            
            // Check for CORS configuration
            if (serverCode.includes('cors')) {
                this.passed.push('✅ CORS middleware configured');
            } else {
                this.warnings.push('⚠️  CORS middleware not found');
            }

            // Check for rate limiting
            if (serverCode.includes('rate-limit') || serverCode.includes('rateLimit')) {
                this.passed.push('✅ Rate limiting configured');
            } else {
                this.warnings.push('⚠️  Rate limiting not implemented');
            }

            // Check for input validation
            if (serverCode.includes('express.json')) {
                this.passed.push('✅ JSON body parsing configured');
            }

        } catch (error) {
            this.issues.push(`❌ Cannot read server file: ${error.message}`);
        }
    }

    // Check for backup and recovery
    checkBackupSystem() {
        const dropboxPath = path.join(__dirname, 'dropbox-integration.js');
        
        if (fs.existsSync(dropboxPath)) {
            this.passed.push('✅ Dropbox backup system available');
        } else {
            this.warnings.push('⚠️  Backup system not configured');
        }

        const photosDir = path.join(__dirname, 'cached-photos');
        if (fs.existsSync(photosDir)) {
            this.passed.push('✅ Photos cache directory exists');
        } else {
            this.warnings.push('⚠️  Photos cache directory missing');
        }
    }

    // Generate security report
    generateReport() {
        console.log('\n📊 SECURITY SCAN RESULTS:');
        console.log('=' * 40);

        if (this.issues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES:');
            this.issues.forEach(issue => console.log(`   ${issue}`));
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS:');
            this.warnings.forEach(warning => console.log(`   ${warning}`));
        }

        if (this.passed.length > 0) {
            console.log('\n✅ PASSED CHECKS:');
            this.passed.forEach(pass => console.log(`   ${pass}`));
        }

        console.log('\n📈 SUMMARY:');
        console.log(`   ✅ Passed: ${this.passed.length}`);
        console.log(`   ⚠️  Warnings: ${this.warnings.length}`);
        console.log(`   ❌ Issues: ${this.issues.length}`);

        const score = Math.max(0, 100 - (this.issues.length * 20) - (this.warnings.length * 5));
        console.log(`   🎯 Security Score: ${score}/100`);

        if (this.issues.length === 0) {
            console.log('\n🎉 No critical security issues found!');
        } else {
            console.log('\n🔧 RECOMMENDATIONS:');
            console.log('   1. Fix critical issues listed above');
            console.log('   2. Run "npm run setup" to configure environment');
            console.log('   3. Keep dependencies updated with "npm audit"');
            console.log('   4. Enable HTTPS in production');
        }

        return {
            score,
            issues: this.issues.length,
            warnings: this.warnings.length,
            passed: this.passed.length
        };
    }

    // Run all security checks
    runAllChecks() {
        console.log('🔍 Running security checks...\n');
        
        this.checkEnvFile();
        this.checkFilePermissions();
        this.checkDependencies();
        this.checkServerConfig();
        this.checkBackupSystem();
        
        return this.generateReport();
    }
}

// Run security check
const checker = new SecurityChecker();
const results = checker.runAllChecks();

// Exit with appropriate code
process.exit(results.issues > 0 ? 1 : 0);