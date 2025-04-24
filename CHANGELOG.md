# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2025-04-02  

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

*https://github.com/FerrariGuy/Facebook-Scammer-Assassin/releases* 

## [2.5.1] - 2025-04-23

This is a patch release that improves the reliability of the blocking function.

**Note:** Install via the files attached below. See main [README](https://github.com/FerrariGuy/Facebook-Scammer-Assassin#installation) for instructions. 

### Fixed
- Updated internal parameters (`doc_id` and input flags) for the GraphQL block mutation based on recent network analysis. This should more reliably trigger enhanced blocking options like "delete recent content" and "block future accounts" when performed via the extension, aligning better with Facebook's current implementation from the Member List context.

## Disclaimer:
This extension interacts with Facebook's internal structure and APIs. Facebook may change its platform at any time, which could break this extension's functionality without warning. Furthermore, automating actions or accessing data in ways not intended by the standard user interface may potentially violate Facebook's Terms of Service. Use this extension responsibly and at your own risk. The developer assumes no liability for any consequences resulting from its use.