#!/usr/bin/env node

import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Configuration
const GITHUB_REPO = process.env.GITHUB_REPO || 'yourusername/rainy-aether';
const PRIVATE_KEY_PATH = process.env.TAURI_PRIVATE_KEY || '~/.tauri/rainy-aether.key';
const PRIVATE_KEY_PASSWORD = process.env.TAURI_KEY_PASSWORD;

// Read package.json for version info
function getPackageInfo() {
  try {
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return {
      version: packageJson.version,
      name: packageJson.name
    };
  } catch (error) {
    console.error('Error reading package.json:', error);
    return { version: '0.1.0', name: 'rainy-aether' };
  }
}

// Generate signature for a file
function generateSignature(filePath) {
  try {
    // Use tauri signer sign command
    const command = `cargo tauri signer sign "${PRIVATE_KEY_PATH}" "${filePath}"`;
    const output = execSync(command, { encoding: 'utf8' });

    // Extract signature from output (tauri signer outputs to .sig file)
    const sigFile = `${filePath}.sig`;
    if (fs.existsSync(sigFile)) {
      const signature = fs.readFileSync(sigFile, 'utf8').trim();
      // Clean up sig file
      fs.unlinkSync(sigFile);
      return signature;
    }
  } catch (error) {
    console.error('Error generating signature:', error);
  }
  return null;
}

// Get platform-specific download URL
function getDownloadUrl(target, arch, version) {
  const baseUrl = `https://github.com/${GITHUB_REPO}/releases/download/v${version}`;
  const appName = getPackageInfo().name;

  const platformMap = {
    'windows': {
      'x86_64': `${appName}_${version}_x64-setup.exe`,
      'aarch64': `${appName}_${version}_arm64-setup.exe`
    },
    'darwin': {
      'x86_64': `${appName}_${version}_x64.dmg`,
      'aarch64': `${appName}_${version}_arm64.dmg`
    },
    'linux': {
      'x86_64': `${appName}_${version}_amd64.AppImage`,
      'aarch64': `${appName}_${version}_arm64.AppImage`
    }
  };

  const platform = platformMap[target]?.[arch];
  return platform ? `${baseUrl}/${platform}` : null;
}

// Read release notes from CHANGELOG.md or generate basic ones
function getReleaseNotes(version) {
  try {
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const content = fs.readFileSync(changelogPath, 'utf8');
      // Extract notes for this version (basic implementation)
      const lines = content.split('\n');
      const versionIndex = lines.findIndex(line => line.includes(`## ${version}`));
      if (versionIndex >= 0) {
        const notes = [];
        for (let i = versionIndex + 1; i < lines.length; i++) {
          if (lines[i].startsWith('## ')) break;
          notes.push(lines[i]);
        }
        return notes.join('\n').trim();
      }
    }
  } catch (error) {
    console.error('Error reading changelog:', error);
  }

  // Default release notes
  return `## What's New in ${version}\n\n- Bug fixes and improvements\n- Performance enhancements\n- Security updates`;
}

// Middleware
app.use(express.json());

// Update manifest endpoint
app.get('/:target/:arch/:currentVersion', (req, res) => {
  const { target, arch, currentVersion } = req.params;

  console.log(`Update request: ${target}/${arch} from ${currentVersion}`);

  const currentPackage = getPackageInfo();
  const latestVersion = currentPackage.version;

  // Simple version comparison (you might want more sophisticated logic)
  const isNewer = compareVersions(latestVersion, currentVersion) > 0;

  if (!isNewer) {
    return res.json({
      available: false,
      currentVersion: currentVersion,
      message: 'You are running the latest version'
    });
  }

  const downloadUrl = getDownloadUrl(target, arch, latestVersion);

  if (!downloadUrl) {
    return res.status(404).json({
      error: 'No download available for this platform/architecture'
    });
  }

  // Generate signature (in production, you'd pre-sign releases)
  let signature = null;
  try {
    // For demo purposes, we'll try to sign a dummy file
    // In production, you'd sign the actual release files
    const dummyFile = path.join(__dirname, 'dummy.txt');
    fs.writeFileSync(dummyFile, `dummy content for ${latestVersion}`);
    signature = generateSignature(dummyFile);
    fs.unlinkSync(dummyFile);
  } catch (error) {
    console.warn('Could not generate signature:', error.message);
    signature = 'SIGNATURE_PLACEHOLDER';
  }

  const manifest = {
    version: latestVersion,
    date: new Date().toISOString(),
    body: getReleaseNotes(latestVersion),
    download_url: downloadUrl,
    signature: signature
  };

  console.log(`Serving update manifest for ${latestVersion}`);
  res.json(manifest);
});

// Version comparison utility
function compareVersions(version1, version2) {
  const v1 = version1.split('.').map(Number);
  const v2 = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

// Health check
app.get('/health', (req, res) => {
  const packageInfo = getPackageInfo();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: packageInfo.version,
    name: packageInfo.name
  });
});

// Info endpoint
app.get('/info', (req, res) => {
  const packageInfo = getPackageInfo();
  res.json({
    name: packageInfo.name,
    version: packageInfo.version,
    repository: GITHUB_REPO,
    supported_platforms: ['windows', 'darwin', 'linux'],
    supported_architectures: ['x86_64', 'aarch64']
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Update server running on port ${PORT}`);
  console.log(`📦 Serving updates for ${getPackageInfo().name} v${getPackageInfo().version}`);
  console.log(`🔗 Example endpoint: http://localhost:${PORT}/windows/x86_64/0.1.0`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
  console.log(`ℹ️  Info: http://localhost:${PORT}/info`);

  if (!PRIVATE_KEY_PATH || !PRIVATE_KEY_PASSWORD) {
    console.warn('⚠️  Warning: TAURI_PRIVATE_KEY and/or TAURI_KEY_PASSWORD not set. Signatures will be placeholders.');
  }
});
