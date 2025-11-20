# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.0] - 2025-11-15

### Added
- **Full Internationalization (i18n):** Refactored the entire extension to support multiple languages. This release includes 19 initial language translations.
- **New Application Icon:** Replaced the original icon with a new design for better clarity and visibility.

### Fixed
- **Critical:** Fixed a regression bug where the "Block" button in the popup was non-functional due to a variable scope issue in `popup.js`.
- Fixed the "Export Groups" button on the options page, which was unresponsive.
- Corrected various minor internationalization display issues, such as untranslated text in generated content (e.g., "Profile Link" in copied text).

### Changed
- **Manifest:** The `manifest.json` file is now a universal hybrid model, using both `"service_worker"` and `"scripts"` keys to ensure compatibility with both Chrome/Edge and Firefox's AMO linter from a single file.
- **Codebase:** Significant refactoring and cleanup of `popup.js` and `options.js` for improved readability, performance, and maintainability.

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

### Fixed
- Updated internal parameters (`doc_id` and input flags) for the GraphQL block mutation based on recent network analysis. This should more reliably trigger enhanced blocking options like "delete recent content" and "block future accounts" when performed via the extension, aligning better with Facebook's current implementation from the Member List context.

## [2.5.3] - 2025-11-11

### Fixed
- **Critical blocking functionality restored.** Updated the internal GraphQL `doc_id` to the latest version required by Facebook, fixing the primary "Block" action which had stopped working.
- Implemented a more robust blocking mechanism that automatically retries with a "simple" block if the initial "aggressive" block (with content deletion flags) fails. This transparently fixes blocking for Facebook Pages, which do not support the aggressive flags.
- Updated `manifest.json` to be compliant with Mozilla's `data_collection` policy, resolving AMO validation errors.

### Changed
- Refactored the internal blocking script (`graphQLBlocker.js`) to use constants for API parameters, making future maintenance and updates significantly easier.
- Refactored the page data scraping script (`pageDataExtractor.js`) for improved clarity, performance, and maintainability.
- Standardized console log prefixes across all extension components (`popup.js`, `options.js`, etc.) to make debugging easier.

## Disclaimer:
This extension interacts with Facebook's internal structure and APIs. Facebook may change its platform at any time, which could break this extension's functionality without warning. Furthermore, automating actions or accessing data in ways not intended by the standard user interface may potentially violate Facebook's Terms of Service. Use this extension responsibly and at your own risk. The developer assumes no liability for any consequences resulting from its use.

**Note:** Install via the files attached below. See main [README](https://github.com/FerrariGuy/Facebook-Scammer-Assassin#installation) for instructions. 