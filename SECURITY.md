# 🔒 SECURITY GUIDELINES - SOIL MONITORING SYSTEM

## ⚠️ CRITICAL SECURITY WARNINGS

### 🚨 NEVER COMMIT THESE FILES:
- `.env` (contains your actual credentials)
- Any file with `token`, `key`, `secret`, or `credential` in the name
- `cached-photos/` directory (contains user data)
- Any backup files with sensitive data

### 🛡️ MAXIMUM SECURITY MEASURES IMPLEMENTED:

#### 1. **Environment Variables Protection**
- All sensitive data stored in `.env` file (git-ignored)
- Multiple layers of `.gitignore` protection
- Template file (`.env.example`) with no real credentials
- Automatic validation of credential formats

#### 2. **API Security**
- Rate limiting on all endpoints
- Session management with secure cookies
- CORS protection with restricted origins
- Helmet.js for security headers
- Input validation and sanitization

#### 3. **Token Management**
- Automatic token refresh system
- Encrypted token storage
- No tokens exposed in frontend code
- Secure OAuth 2.0 flow implementation

#### 4. **File System Security**
- Secure filename generation (prevents path traversal)
- File size limits (prevents abuse)
- Secure file permissions (644 for files, 755 for directories)
- Automatic cleanup of old cached files

#### 5. **Network Security**
- HTTPS enforcement in production
- Secure headers (X-Frame-Options, X-Content-Type-Options)
- Content Security Policy (CSP)
- Protection against XSS and CSRF attacks

## 🔧 SETUP FOR TEAM MEMBERS

### Step 1: Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd Soil-Monitoring

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Step 2: Configure Credentials
1. **Get Dropbox Credentials:**
   - Visit: https://www.dropbox.com/developers/apps
   - Create new app or use existing
   - Copy `App Key` and `App Secret`
   - Add to `.env` file

2. **Get ThingSpeak Credentials:**
   - Visit: https://thingspeak.com
   - Create account and new channel
   - Copy `Channel ID` and API keys
   - Add to `.env` file

3. **Generate Session Secret:**
   ```bash
   # Generate random 32-character string
   openssl rand -base64 32
   ```

### Step 3: Automatic Setup
```bash
# Start the server
npm run dev

# Visit setup page
# http://localhost:10001/setup-dropbox.html

# Follow the setup wizard
```

## 🚫 WHAT NOT TO DO

### ❌ NEVER:
- Commit `.env` file to git
- Share credentials in chat/email
- Use production credentials for development
- Store credentials in code comments
- Upload credentials to cloud services
- Screenshot credential pages

### ❌ NEVER COMMIT FILES CONTAINING:
- API keys or tokens
- Database passwords
- Session secrets
- OAuth credentials
- User data or photos
- Configuration with real values

## ✅ SECURITY BEST PRACTICES

### 🔐 For Developers:
1. **Use separate credentials** for each team member
2. **Rotate credentials** regularly (every 3 months)
3. **Use strong session secrets** (32+ random characters)
4. **Enable 2FA** on all external services (Dropbox, ThingSpeak)
5. **Review code** before committing (check for hardcoded secrets)

### 🛡️ For Production:
1. **Use environment-specific credentials**
2. **Enable HTTPS** (SSL/TLS certificates)
3. **Set up monitoring** and alerting
4. **Regular security audits**
5. **Backup encryption keys** securely

### 📋 For Team Collaboration:
1. **Use `.env.example`** as template
2. **Document setup process** clearly
3. **Share setup instructions** (not credentials)
4. **Use secure communication** for sensitive discussions
5. **Regular security training**

## 🔍 SECURITY CHECKLIST

Before committing code, verify:
- [ ] No `.env` file in commit
- [ ] No hardcoded credentials in code
- [ ] No sensitive files in commit
- [ ] `.gitignore` is up to date
- [ ] Code review completed
- [ ] Security scan passed

## 🚨 INCIDENT RESPONSE

If credentials are accidentally exposed:
1. **Immediately revoke** exposed credentials
2. **Generate new credentials**
3. **Update all team members**
4. **Review git history** for exposure
5. **Document the incident**

## 📞 SECURITY CONTACTS

For security issues or questions:
- Review this document first
- Check setup documentation
- Contact team lead for credential issues
- Report security vulnerabilities immediately

---

**Remember: Security is everyone's responsibility!**