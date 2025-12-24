# Git Integration

Rainy Aether IDE includes a native Git integration powered by **libgit2** for maximum performance and cross-platform compatibility.

## Current Status

### ✅ Fully Supported

| Feature | Description |
|---------|-------------|
| **Clone** | Clone repositories via HTTPS with automatic credential handling |
| **Commit** | Stage files and create commits with messages |
| **Push/Pull** | Sync changes with remote repositories |
| **Branches** | Create, switch, rename, and delete branches |
| **Stash** | Save and restore uncommitted changes |
| **Merge** | Merge branches with conflict detection |
| **History** | View commit log with diffs |
| **Status** | Real-time file change tracking |

### HTTPS Authentication

For HTTPS repositories, the IDE uses your system's Git credential helper:

- **macOS**: Uses `osxkeychain` (configured automatically with Git installation)
- **Windows**: Uses Windows Credential Manager
- **Linux**: Uses `libsecret` or configured credential helper

**Setup:** No additional configuration needed if you've used Git from the command line before. Your stored credentials are automatically used.

### SSH Authentication

SSH authentication works with:
- SSH keys in `~/.ssh/` (id_ed25519, id_rsa, id_ecdsa)
- SSH agent (including macOS Keychain integration)

---

## Known Limitations

### Current Version

1. **SSH passphrase prompts** - If your SSH key requires a passphrase and isn't loaded in ssh-agent, authentication will fail silently. 
   
   **Workaround:** Add your key to ssh-agent before using:
   ```bash
   ssh-add ~/.ssh/id_ed25519
   ```

2. **Credential prompts** - The IDE cannot prompt for credentials if they're not already stored.
   
   **Workaround:** Clone the repository once from terminal to store credentials:
   ```bash
   git clone <repo-url> /tmp/test
   ```

---

## Roadmap

### Planned Improvements

| Feature | Priority | Description |
|---------|----------|-------------|
| **Native SSH** | High | Full libssh2 integration without requiring ssh-agent |
| **Credential prompts** | High | In-app prompts for username/password when needed |
| **GPG Signing** | Medium | Support for signed commits |
| **Worktrees** | Medium | Multiple working trees for a single repository |
| **Submodules** | Medium | Initialize and update submodules |
| **LFS Support** | Low | Git Large File Storage integration |

### Design Goal

Our goal is **100% native performance** using libgit2 without spawning any CLI processes. This ensures:
- Faster operations
- Lower memory usage
- No dependency on system Git installation
- Consistent behavior across platforms

---

## Troubleshooting

### "No valid authentication method available"

1. **For HTTPS:** Ensure credentials are stored in your system credential manager
2. **For SSH:** Ensure your key is loaded in ssh-agent: `ssh-add -l`

### Clone fails with "exists and is not empty"

Select a **parent folder** (e.g., `/Users/you/Projects`) and the IDE will automatically create a subfolder with the repository name.

### Push/Pull fails

1. Check if the remote is configured: Go to Git panel → Settings → Remotes
2. Ensure you have network connectivity
3. Verify your credentials are valid (tokens may expire)

---

## Technical Details

- **Backend:** Rust with [libgit2](https://libgit2.org/) via [git2-rs](https://github.com/rust-lang/git2-rs)
- **Frontend:** React with real-time status updates
- **Cross-platform:** macOS, Windows, and Linux support

For issues or feedback, please open an issue on our GitHub repository.
