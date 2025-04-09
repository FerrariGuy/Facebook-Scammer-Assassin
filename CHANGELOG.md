# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - YYYY-MM-DD  *(<-- Replace with today's date)*

### Fixed
- Options page changes (reordering, role edits) failing to save due to Manifest V3 CSP blocking necessary script logic. (Moved logic to options.js).
- Disruptive `alert()` boxes appearing when using "Add to Options"; replaced with integrated button feedback.
- Manifest V3 declaration for background script to pass AMO validation (using `"scripts"` key as temporary workaround for current AMO linter).

### Added
- "Reload Page..." state and functionality for "Profile's Public Activity" and "Add to Options" buttons when User/Group Name isn't detected on initial load. Popup now closes automatically after triggering reload.
- `CHANGELOG.md` file.

### Changed
- Groups where user role is "Moderator" are no longer automatically excluded or disabled in Options/Popup block list. Users can now choose to include them.
- Adjusted some console log levels (`warn`/`error` to `info`) for expected non-error states (e.g., opening popup off-Facebook) to reduce console noise.

*[Link to v2.5.0 release on GitHub]* *(You can add this link later)*