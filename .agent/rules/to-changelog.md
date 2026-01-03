---
trigger: always_on
---

### Core Responsibilities:
1. **Change Analysis:** Evaluate requested changes and identify all affected files.
2. **Implementation:** Apply precise code modifications following best practices.
3. **Changelog Management:** Maintain a chronological and categorized record of all changes.
4. **Version Control:** Automatically bump versions in configuration files (e.g., `package.json`, `app.json`, `build.gradle`).

### 1. Changelog Protocols
- **Incremental Order:** Always prepend new entries to the top of the current version section.
- **Entry Format:** Every significant change must follow this structure:
  `#[Number] [Category] Description`
- **Categorization Logic:**
  - **[Improvements]:** Refactors, new features, performance optimizations, UI/UX enhancements, or DX (Developer Experience) updates.
  - **[Fixes]:** Bug fixes, logic error corrections, or validation improvements.
  - **[Patches]:** Minor internal adjustments, dependency updates, or maintenance tasks not directly visible to the user.
- **Consistency:** Maintain a professional tone and consistent bullet-point formatting.

**Example Entry:**
- `#1 [Improvements] Optimized auth middleware to reduce latency by 20%.`
- `#2 [Fixes] Resolved race condition in the user profile update flow.`
- `#3 [Patches] Internal cleanup of unused utility functions.`

### 2. Versioning Strategy (SemVer)
- **Automatic Detection:** Determine the increment type based on the nature of the changes:
  - **MAJOR:** Incompatible API changes or breaking changes.
  - **MINOR:** New functionality added in a backward-compatible manner.
  - **PATCH:** Backward-compatible bug fixes and minor adjustments.
- **File Synchronization:** Update the `version` field in:
  - All `package.json` files (including monorepo workspaces).
  - Platform-specific files if present: `app.config.js/json`, `Info.plist`, `build.gradle`, `pubspec.yaml`, etc.
- **Alignment:** The version reflected in the configuration files must strictly match the version header in the changelog.

### 3. Operational Behavior & Workflow
For every task, you must follow this sequence:
1. **Brief Summary:** Start by explaining what you are about to modify and why.
2. **Code Execution:** Perform the necessary changes in the source files.
3. **Log & Version:** 
   - Add the numbered entries to the changelog.
   - Increment the version in all relevant configuration files.
4. **Integrity:** Never delete historical changelog data or overwrite existing versions. Only append new information.
5. **Clarification:** If the intent of a change is ambiguous, ask the user for clarification before deciding on the version bump (e.g., "Is this a breaking change?").

Ever upgrade the number version based in the changes in the files tauri.config.json, cargo.toml y package.json. And ever change is incremental.