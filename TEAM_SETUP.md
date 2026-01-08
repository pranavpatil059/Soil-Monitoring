# 🚀 TEAM SETUP GUIDE - SOIL MONITORING SYSTEM

## 🔒 SECURITY FIRST APPROACH

This project implements **maximum security** to protect all credentials and sensitive data. Follow this guide to set up your development environment safely.

## ⚡ QUICK START (5 Minutes)

### Step 1: Clone and Install
```bash
git clone <repository-url>
cd Soil-Monitoring
npm install
```

### Step 2: Secure Credentials Setup
```bash
# Run the secure setup script
npm run setup

# OR manually copy template
cp .env.example .env
# Then edit .env with your credentials
```

### Step 3: Start Development
```bash
# Start the server
npm run dev

# Visit setup page for Dropbox OAuth
# http://localhost:10001/setup-dropbox.html
```

## 🔐 CREDENTIALS YOU NEED

### 1. **Dropbox App Credentials**
- **Where to get**: https://www.dropbox.com/developers/apps
- **What you need**: App Key, App Secret
- **Setup time**: 2 minutes

### 2. **ThingSpeak API Keys**
- **Where to get**: https://thingspeak.com/channels
- **What you need**: Channel ID, Read API Key, Write API Key
- **Setup time**: 3 minutes

## 🛡️ SECURITY FEATURES

### ✅ **What's Protected**:
- All API keys and tokens
- User photos and data
- Session secrets
- Database credentials
- OAuth tokens

### ✅ **How It's Protected**:
- Environment variables (`.env` file)
- Git-ignored sensitive files
- Automatic token refresh
- Rate limiting and validation
- Secure file permissions
- Encrypted local storage

### ✅ **What You DON'T Need to Worry About**:
- Token expiration (auto-refresh)
- Manual credential rotation
- Exposing secrets in code
- Git commits with sensitive data

## 📋 DEVELOPMENT WORKFLOW

### Daily Development:
```bash
# Start development server
npm run dev

# Check security status
npm run security-check

# Validate environment
npm run validate-env
```

### Adding New Photos:
1. Upload to your Dropbox
2. Visit gallery page: http://localhost:10001/gallery.html
3. Click "Refresh Photos"
4. Photos appear instantly!

### Troubleshooting:
```bash
# Clean cache if needed
npm run clean-cache

# Backup current environment
npm run backup-env

# Re-run setup if credentials change
npm run setup
```

## 🚫 SECURITY RULES

### ❌ **NEVER DO**:
- Commit `.env` file
- Share credentials in chat/email
- Screenshot credential pages
- Use production credentials for development
- Store secrets in code comments

### ✅ **ALWAYS DO**:
- Use the setup script for credentials
- Keep credentials private
- Use different credentials per team member
- Review code before committing
- Report security issues immediately

## 🔍 FILE STRUCTURE

```
Soil-Monitoring/
├── .env                    # Your credentials (GIT-IGNORED)
├── .env.example           # Template for team members
├── .env.local             # Your local backup (GIT-IGNORED)
├── .gitignore             # Enhanced security rules
├── setup-credentials.js   # Secure setup script
├── SECURITY.md           # Detailed security guide
├── TEAM_SETUP.md         # This file
└── cached-photos/        # Local photo cache (GIT-IGNORED)
```

## 🎯 TESTING YOUR SETUP

### 1. **Server Health Check**:
```bash
curl http://localhost:10001/api/health
```

### 2. **Gallery API Check**:
```bash
curl http://localhost:10001/api/gallery/health
```

### 3. **Moisture Data Check**:
```bash
curl http://localhost:10001/api/moisture/health
```

### 4. **Security Validation**:
```bash
npm run security-check
```

## 🆘 TROUBLESHOOTING

### Problem: "Dropbox token expired"
**Solution**: Visit http://localhost:10001/setup-dropbox.html and re-authorize

### Problem: "No photos showing"
**Solution**: 
1. Check Dropbox has images
2. Click "Refresh Photos" button
3. Check console for errors

### Problem: "Environment variables missing"
**Solution**: Run `npm run setup` to configure credentials

### Problem: "Permission denied"
**Solution**: Check file permissions: `chmod 644 .env`

## 📞 SUPPORT

### For Setup Issues:
1. Check this guide first
2. Run `npm run security-check`
3. Check server console logs
4. Contact team lead if needed

### For Security Concerns:
1. Review `SECURITY.md`
2. Report immediately to team lead
3. Don't share details publicly

## 🎉 SUCCESS INDICATORS

You'll know setup is successful when:
- ✅ Server starts without errors
- ✅ Gallery page loads photos
- ✅ Moisture data displays
- ✅ No security warnings in console
- ✅ All API health checks pass

---

**🔒 Remember: Security is everyone's responsibility!**

**🚀 Happy coding with maximum security!**