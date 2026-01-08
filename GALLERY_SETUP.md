# 🔐 Security Setup

## Environment Variables Setup

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Get your Cloud Storage Access Token:**
   - Go to your cloud storage provider's developer console
   - Create a new app or use existing one
   - Generate an access token
   - Copy the token

3. **Configure your .env file:**
   ```bash
   # Replace with your actual token
   DROPBOX_ACCESS_TOKEN=your_actual_token_here
   
   # Change to a random secret
   SESSION_SECRET=your-random-secret-key
   ```

4. **Important Security Notes:**
   - ⚠️ **NEVER commit .env file to git**
   - ⚠️ **Keep your access token private**
   - ⚠️ **Don't share .env file with anyone**
   - ✅ The .env file is already in .gitignore
   - ✅ Use .env.example for team setup

## Gallery Setup Guide

The gallery system uses secure cloud storage integration. Follow these steps:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Setup environment variables** (see above)

3. **Start the server:**
   ```bash
   npm run dev
   ```

4. **Access gallery:**
   - Main dashboard: `http://localhost:10001`
   - Click "Gallery" button to view photos

## Security Features

- 🔒 **Token Protection**: Access tokens never exposed to frontend
- 🔒 **Secure Headers**: Helmet.js for security headers
- 🔒 **Rate Limiting**: API rate limiting to prevent abuse
- 🔒 **Input Validation**: All inputs validated and sanitized
- 🔒 **Path Protection**: Prevents path traversal attacks
- 🔒 **File Size Limits**: Prevents large file abuse
- 🔒 **Secure Caching**: Local photo caching with security measures

## For Team Members

If you're setting up this project:

1. **Clone the repository**
2. **Copy .env.example to .env**
3. **Ask the project owner for the access token**
4. **Never commit your .env file**
5. **Follow the security guidelines above**

## Troubleshooting

- If photos don't load, check your .env configuration
- Ensure your access token has proper permissions
- Check server console for error messages
- Try refreshing photos using the "Refresh Photos" button