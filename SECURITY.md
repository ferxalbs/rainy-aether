# Security Policy

## Our Commitment to Security

At **Enosis Labs, Inc.**, security is a top priority. We take the security of Rainy Aether and our users seriously. This document outlines our security practices, how to report vulnerabilities, and what you can expect from us.

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 0.1.x   | :white_check_mark: | Active development, security patches |
| < 0.1.0 | :x:                | No longer supported |

**Note**: Once v1.0 is released, we will provide security updates for the latest stable version and the previous major version for 6 months after a new major release.

## Reporting a Vulnerability

If you discover a security vulnerability in Rainy Aether, **please do not open a public issue**. We request that you report it privately so we can address it before public disclosure.

### How to Report

📧 **Email**: [security@enosislabs.com](mailto:security@enosislabs.com)

### What to Include

Please provide as much information as possible to help us understand and reproduce the issue:

- **Type of vulnerability** (e.g., code injection, privilege escalation, information disclosure)
- **Affected component** (e.g., terminal manager, file system API, Git integration)
- **Affected versions** (e.g., v0.1.0, commit hash if from main branch)
- **Steps to reproduce** the vulnerability
- **Proof of concept** or exploit code (if available)
- **Potential impact** of the vulnerability
- **Any suggested fixes** or mitigations

### What to Expect

1. **Acknowledgment**: We will acknowledge receipt of your report within **48 hours**.

2. **Initial Assessment**: We will provide an initial assessment within **5 business days**, including:
   - Confirmation of the vulnerability
   - Severity classification (Critical, High, Medium, Low)
   - Estimated timeline for a fix

3. **Resolution**: Depending on severity:
   - **Critical**: Patch within 7 days
   - **High**: Patch within 14 days
   - **Medium**: Patch within 30 days
   - **Low**: Addressed in next regular release

4. **Disclosure**: Once a fix is available:
   - We will notify you before public disclosure
   - We will credit you in the security advisory (unless you prefer to remain anonymous)
   - We will publish a security advisory on GitHub

### Bug Bounty

At this time, we do not have a formal bug bounty program. However, we deeply appreciate security researchers' efforts and will:

- Publicly acknowledge your contribution (if desired)
- Provide swag or small tokens of appreciation for significant findings
- Consider formal bug bounty program as the project matures

## Security Best Practices for Users

### Using Rainy Aether Safely

1. **Download from Official Sources**
   - Only download Rainy Aether from:
     - Official GitHub releases: [https://github.com/enosislabs/rainy-aether/releases](https://github.com/enosislabs/rainy-aether/releases)
     - Official website: [https://enosislabs.com/rainy-aether](https://enosislabs.com/rainy-aether) *(coming soon)*
   - Verify release signatures (available for v0.2.0+)

2. **Keep Updated**
   - Enable automatic update checks (default)
   - Review release notes for security fixes
   - Update to the latest version promptly

3. **API Keys and Secrets**
   - Never commit API keys to version control
   - Use `.env` files (excluded from Git by default)
   - Rainy Aether stores API keys encrypted in OS keychain

4. **Extension Security**
   - Only install extensions from trusted sources
   - Review extension permissions before installation
   - Report suspicious extensions to [security@enosislabs.com](mailto:security@enosislabs.com)

5. **Workspace Trust** *(coming soon)*
   - Review workspace settings before opening untrusted projects
   - Be cautious with workspace-level scripts and automation

## Known Security Considerations

### Current Architecture

Rainy Aether uses **Tauri 2.0**, which provides security advantages over Electron:

- ✅ **Smaller Attack Surface**: Uses system WebView instead of bundling Chromium
- ✅ **Privilege Separation**: Rust backend isolated from frontend
- ✅ **Explicit IPC**: All frontend-backend communication explicitly defined
- ✅ **Sandboxing**: Commands execute with limited privileges

### Tauri Capabilities

We follow the **principle of least privilege**:

- File system access is restricted to user-selected directories
- Terminal commands run in sandboxed environment *(planned for v0.3.0)*
- Network access is limited to necessary APIs
- See `src-tauri/capabilities/default.json` for full permission list

### Areas Under Active Development

The following features are still being hardened:

- ⚠️ **Extension System** (v0.3.0): Not yet available, security model in design
- ⚠️ **AI Provider Integration** (v0.4.0): API key encryption in progress
- ⚠️ **Remote Development** (future): Not yet implemented

## Security Features

### Current Features (v0.1.x)

- ✅ **Encrypted Storage**: API keys stored using OS keychain (Tauri store plugin)
- ✅ **Input Validation**: All Rust commands validate inputs before file operations
- ✅ **Path Sanitization**: Prevents directory traversal attacks
- ✅ **Git Integration**: Uses native `git2` crate (no shell command injection)
- ✅ **No Telemetry by Default**: Opt-in only, full transparency

### Planned Features

- 🔄 **Sandboxed Command Execution** (v0.3.0): Isolate terminal commands
- 🔄 **Extension Permissions** (v0.3.0): Granular permission system
- 🔄 **Code Signing** (v0.2.0): Signed releases for verification
- 🔄 **Automatic Updates** (v0.2.0): Secure update mechanism
- 🔄 **Workspace Trust** (v0.4.0): Protect against malicious workspaces
- 🔄 **Content Security Policy** (v0.3.0): Harden WebView

## Security Disclosure Policy

### Coordinated Disclosure

We practice **coordinated disclosure**:

1. **Private Notification**: Reporter notifies us privately
2. **Fix Development**: We develop and test a fix
3. **Pre-Disclosure**: We notify reporter before public release
4. **Public Disclosure**: We publish advisory with credit to reporter
5. **Release**: Patched version released

### Disclosure Timeline

- **Critical vulnerabilities**: 7-14 days from report to public disclosure
- **High vulnerabilities**: 14-30 days
- **Medium/Low vulnerabilities**: 30-90 days

We may request additional time for complex issues. Conversely, if a vulnerability is being actively exploited, we may accelerate the timeline.

## Security Contacts

### Primary Contact

📧 **Security Team**: [security@enosislabs.com](mailto:security@enosislabs.com)

### Alternative Contacts

If you cannot reach the security team or need to escalate:

📧 **Executive Contact**: [cto@enosislabs.com](mailto:cto@enosislabs.com)

### PGP Key

For sensitive reports, you may encrypt your message with our PGP key *(coming soon)*.

## Security Advisories

Published security advisories can be found at:

- **GitHub Security Advisories**: [https://github.com/enosislabs/rainy-aether/security/advisories](https://github.com/enosislabs/rainy-aether/security/advisories)
- **Official Website**: [https://enosislabs.com/rainy-aether/security](https://enosislabs.com/rainy-aether/security) *(coming soon)*

## Security Audit

### Community Audits

We welcome security audits from the community:

- Source code is fully open for review
- Report findings via [security@enosislabs.com](mailto:security@enosislabs.com)
- We will credit audit contributors publicly

### Formal Audits

As the project matures, we plan to:

- Conduct formal third-party security audits (v1.0+)
- Publish audit reports publicly
- Address findings transparently

## Dependency Security

### Dependency Management

We take dependency security seriously:

- **Frontend**: `pnpm audit` run regularly, vulnerabilities addressed promptly
- **Backend**: `cargo audit` run regularly, Rust dependencies kept up-to-date
- **Automated Scanning**: Dependabot enabled for automated security updates

### Supply Chain Security

- All dependencies reviewed before inclusion
- Prefer well-maintained, widely-used libraries
- Monitor dependency health and maintenance status
- Plan to implement lock file verification (v0.3.0+)

## Compliance and Standards

We aim to align with industry security standards:

- **OWASP Top 10**: Mitigate common web application vulnerabilities
- **CWE Top 25**: Address most dangerous software weaknesses
- **NIST Cybersecurity Framework**: Follow best practices (future)
- **SOC 2** *(future)*: For enterprise customers

## Security Scope

### In Scope

The following are within scope for security reports:

- ✅ Rainy Aether application (frontend and backend)
- ✅ Official extensions and plugins
- ✅ Build and release processes
- ✅ Official documentation and website *(when launched)*

### Out of Scope

The following are generally out of scope:

- ❌ Vulnerabilities in third-party dependencies (report to upstream)
- ❌ Social engineering attacks
- ❌ Denial of service attacks against local application
- ❌ Issues requiring physical access to user's machine
- ❌ User error or misconfiguration (unless design flaw)

However, if you're unsure, please report it—we'd rather hear about it!

## Recognition

We believe in recognizing security researchers who help keep Rainy Aether secure:

### Hall of Fame

Security contributors will be recognized in our Security Hall of Fame (coming soon):

- Name/username (or anonymous if preferred)
- Brief description of vulnerability found
- Month/year of discovery

### Credits

- Security advisories will credit the reporter (unless anonymous)
- Major findings may be recognized in release notes
- We may provide swag or other small tokens of appreciation

## Questions?

If you have questions about this security policy, please contact:

📧 [security@enosislabs.com](mailto:security@enosislabs.com)

---

**Thank you for helping keep Rainy Aether and our users safe!** 🔒✨

---

**Maintained by [Enosis Labs, Inc.](https://enosislabs.com)**

**Version**: 1.0
**Last Updated**: November 3, 2025

---

## Additional Resources

- [Tauri Security Documentation](https://tauri.app/v2/security/)
- [Rust Security Advisory Database](https://rustsec.org/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
