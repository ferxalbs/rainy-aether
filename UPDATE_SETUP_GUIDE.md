# Update System Setup Guide

This guide explains how to set up the automatic update system for Rainy Code in production.

## 🔐 Setting up Code Signing

### 1. Generate Signing Keys

The signing keys were already generated during development. You'll find them in your repository:

- **Private key**: `~/.tauri/rainy-aether.key` (Keep this secret!)
- **Public key**: `~/.tauri/rainy-aether.key.pub` (Already configured in `tauri.conf.json`)

### 2. GitHub Secrets Setup

Add these secrets to your GitHub repository:

```bash
# The private key content (base64 encoded)
TAURI_PRIVATE_KEY=$(cat ~/.tauri/rainy-aether.key | base64 -w 0)

# Your private key password (the one you entered during key generation)
TAURI_KEY_PASSWORD=your_password_here
```

Add them in: **GitHub Repo → Settings → Secrets and variables → Actions**

## 🌐 Production Update Server

### Option 1: GitHub Pages (Recommended)

1. **Create a new repository** for your update server (e.g., `yourusername/rainy-aether-updates`)

2. **Copy the update server files**:
   ```bash
   cp scripts/update-server.js your-update-repo/
   cp package.json your-update-repo/  # For dependencies
   ```

3. **Configure for production**:
   ```bash
   export GITHUB_REPO=yourusername/rainy-aether
   export TAURI_PRIVATE_KEY=your_private_key_path
   export TAURI_KEY_PASSWORD=your_password
   ```

4. **Deploy to GitHub Pages**:
   - Push to `gh-pages` branch
   - Enable Pages in repository settings
   - Your update URL will be: `https://yourusername.github.io/rainy-aether-updates`

### Option 2: Vercel/Netlify

1. **Deploy the update server** to your preferred hosting service
2. **Set environment variables** in your hosting dashboard
3. **Update the endpoint** in `tauri.conf.json`

### Option 3: Self-hosted

1. **Deploy to a VPS** (Heroku, DigitalOcean, etc.)
2. **Set environment variables** on your server
3. **Configure SSL** (required for updates)

## 📋 Pre-release Checklist

Before creating a new release:

### 1. Update Version
```bash
# Update version in package.json
npm version patch  # or minor/major
```

### 2. Create Release Notes
Create a `CHANGELOG.md` file:
```markdown
# Changelog

## [0.2.0] - 2025-11-04

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Breaking change description
```

### 3. Test Locally
```bash
# Install dependencies
pnpm install

# Test update server
pnpm update-server &
pnpm test-update-server

# Build and test app
pnpm tauri build
```

### 4. Create Git Tag
```bash
git add .
git commit -m "Release v0.2.0"
git tag v0.2.0
git push origin main --tags
```

## 🔄 Update Flow

1. **GitHub Actions** automatically builds signed releases for all platforms
2. **Users get notified** when updates are available
3. **Downloads are verified** using your public key
4. **Automatic installation** with platform-specific installers
5. **App restarts** to apply the update

## 🧪 Testing Updates

### Local Testing
```bash
# Start local update server
pnpm update-server

# Test endpoints
curl http://localhost:8080/health
curl http://localhost:8080/info
curl http://localhost:8080/windows/x86_64/0.0.1
```

### End-to-End Testing
1. Build version 0.1.0
2. Install and run the app
3. Update package.json to 0.2.0
4. Build version 0.2.0
5. Run update server with v0.2.0
6. Check for updates in the app

## 🚨 Troubleshooting

### Updates Not Working
- Check GitHub secrets are set correctly
- Verify update server is accessible
- Check browser console for error messages
- Ensure HTTPS is used (HTTP will be rejected)

### Signature Verification Failed
- Confirm public key in `tauri.conf.json` matches your generated key
- Check private key is correct in GitHub secrets
- Verify password is correct

### Build Failures
- Check Tauri CLI version compatibility
- Ensure all dependencies are installed
- Verify signing key format

## 📞 Support

For issues with the update system:
1. Check this documentation
2. Review GitHub Actions logs
3. Test locally first
4. Open an issue with logs and configuration details
