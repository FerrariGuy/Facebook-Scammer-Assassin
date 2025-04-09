# Facebook Scammer Assassin

[![License: CC BY-NC-SA 4.0](https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png)](http://creativecommons.org/licenses/by-nc-sa/4.0/)
<br>
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/FerrariGuy/facebook-scammer-assassin)](https://github.com/FerrariGuy/facebook-scammer-assassin/releases/latest)


A browser extension for Firefox & Chrome (Manifest V3) designed to help Facebook group administrators and moderators quickly identify and block potential scammers, spammers, or problematic users directly from their profile page within the context of the groups they manage.

**Note:** This extension is currently distributed directly via GitHub Releases, not the official browser stores.

## Key Features (v2.5.0)

*   **User Info Scraping:** Extracts Target User ID, Name (including accessory names), and Vanity URL (when available) from the currently viewed Facebook profile.
*   **Group Info Scraping:** Detects when viewing a main Facebook Group page and extracts the Group Name and Group ID, useful for configuration.
*   **Session Scraping:** Extracts necessary session tokens (`fb_dtsg`, `lsd`) and the viewing Admin's User ID from the page context required for authenticated actions.
*   **Configurable Group List (Options Page):**
    *   Configure groups you manage: Group Name, Nickname, Group ID (Required), your Role (Admin/Moderator), Group URL (Optional).
    *   **Include Toggle:** Choose which configured groups appear in the popup's blocking list. (Moderator groups can now be included if desired, though blocking primarily relies on Admin permissions).
    *   **Visual Cues:** Rows are colored based on role (Admin/Moderator) or validity (Invalid).
    *   **Drag-and-Drop Reordering:** Easily reorder the group list.
    *   **Import/Export:** Back up and restore your configured group list using JSON files.
    *   **Donation Section:** Links to support development.
*   **Context-Aware Popup UI:**
    *   Displays relevant scraped info (User or Group details) based on the current page.
    *   Provides clear feedback (including a "Reload Page..." prompt) when necessary data (like User/Group Name) isn't immediately found.
    *   Shows a neutral state ("N/A", Shrug Icon) on pages where data extraction is not applicable (e.g., group sub-pages, base Facebook URL).
*   **Quick Actions (Popup):**
    *   **Copy Data:** Copies formatted User or Group information to the clipboard.
    *   **Profile's Public Activity:** Opens a new tab searching Facebook posts filtered by the target user's ID. Button prompts to reload if the username isn't initially found.
    *   **Add to Options:** Quickly add the currently viewed Group's details to your configuration list. Button prompts to reload if the group name isn't initially found.
    *   **Clickable Group Links:** Group names listed in the popup's blocking section link directly to the group page.
*   **One-Click Blocking (User Profile Context):**
    *   Displays "Block" buttons next to configured & included groups in the popup when viewing a User profile.
    *   Uses Facebook's internal GraphQL API (`useGroupsCometBlockUserMutation`) to block the target user from the selected group.
    *   Provides visual feedback on the button ("Blocking...", "Blocked!", "Block Failed", "Inject Fail").
    
    
## Disclaimer
    * Important Notice & Disclaimer: Facebook Scammer Assassin relies on accessing Facebook's underlying page data and internal GraphQL API to provide its functionality. This approach is inherently fragile and may break partially or completely if Facebook modifies its website code or APIs.
    * Additionally, please be aware that using tools that interact with Facebook in non-standard ways could be interpreted as a violation of their Terms of Service. While this tool aims to replicate actions achievable through the normal UI (blocking users from groups where you have permission), there is always a potential risk associated with using third-party extensions that interface with Facebook's platform.
    * By using this extension, you acknowledge these risks and agree to use it responsibly and at your own discretion. The developer is not responsible for any issues, account restrictions, or other consequences that may arise from using this tool.

## Screenshots

*Example: Popup on User Profile*

![Popup - User Profile](https://raw.githubusercontent.com/FerrariGuy/Facebook-Scammer-Assassin/main/images/screenshot_popup_user.png)

*Example: Popup on Group Page (showing "Add to Options")*

![Popup - Group Page](https://raw.githubusercontent.com/FerrariGuy/Facebook-Scammer-Assassin/main/images/screenshot_popup_group.png)

*Example: Popup needing reload*

![Popup - Reload Prompt](https://raw.githubusercontent.com/FerrariGuy/Facebook-Scammer-Assassin/main/images/screenshot_popup_reload.png)

*Example: Options Page*

![Options Page](https://raw.githubusercontent.com/FerrariGuy/Facebook-Scammer-Assassin/main/images/screenshot_options.png)


## Installation

Download the appropriate file for your browser from the **[Latest Release Page](https://github.com/FerrariGuy/facebook-scammer-assassin/releases/latest)** 

*   **Firefox:**
    1.  Download the `.xpi` file (e.g., `facebook_scammer_assassin-2.5.0-firefox.xpi`).
    2.  Open Firefox, navigate to `about:addons`.
    3.  Click the gear icon near the top-right -> "Install Add-on From File...".
    4.  Select the downloaded `.xpi` file.
    5.  Approve the permissions prompt.
    *   ***Note:** If an unsigned `.zip` file is provided instead of a signed `.xpi`, you must load it temporarily via `about:debugging` -> "Load Temporary Add-on..." -> select the `manifest.json` inside the unzipped folder. The add-on will unload when Firefox closes.*
    
*   **Chrome / Edge:**
    1.  Download the `.zip` file (e.g., `facebook_scammer_assassin-2.5.0-chrome.zip`).
    2.  **Unzip** the downloaded file into a dedicated folder (e.g., `fsa_chrome_v2.5.0`). **Do not delete this folder after installation.**
    3.  Open Chrome/Edge and navigate to `chrome://extensions`.
    4.  Enable **"Developer mode"** (toggle in the top right).
    5.  Click **"Load unpacked"**.
    6.  Select the folder you unzipped the files into (the one containing `manifest.json`).
    7.  The extension should now appear in your list.

## Usage Guide

*(Consider linking to your tutorial video here!)*
`[Watch the Video Tutorial](YOUR_YOUTUBE_OR_VIDEO_LINK)`

1.  **Configure Groups (Options Page):**
    *   After installation, access the Options page (right-click extension icon -> Options, or via browser's extension management).
    *   Click **Add Group**.
    *   Fill in **Group Name** and numeric **Group ID** (required). Find the ID in the group URL or use the extension popup on the group page.
    *   Select your **Role** (Admin/Moderator).
    *   Check **Include?** for groups you want in the popup block list.
    *   Optionally add a Nickname and Group URL.
    *   Drag handles (☰) to reorder.
    *   Click **Save Settings** (button turns yellow for unsaved changes).
    *   Use **Import/Export** to manage backups.
2.  **Using the Popup:**
    *   Navigate to a Facebook **User Profile** or a main **Group** page.
    *   Click the Scammer Assassin icon.
    *   **On a User Profile:**
        *   View User Name, ID, Vanity.
        *   Use **Copy Data** or **Profile's Public Activity**. (Button may prompt to reload page if name not found initially).
        *   If blocking is enabled (you're Admin, data found), the "Block Scammer:" section lists included groups. Click **Block** next to a group name.
    *   **On a Group Page:**
        *   View Group Name, ID.
        *   Use **Copy Data**.
        *   Click **Add to Options** (or **Reload Page to Add** if name not found) if the group isn't configured yet. Shows "In Options" if already added.
    *   **On Other Pages:** Popup shows a "Not Applicable" state.
    *   **Reload Action:** If a button says "Reload Page...", click it to refresh the Facebook page, then reopen the popup to get updated data. The popup closes automatically after clicking reload.

## Known Limitations

*   **Fragility:** Relies on Facebook's page structure and internal APIs. **Facebook updates can break this extension.** Requires ongoing maintenance. Use may violate FB ToS; use at your own risk.
*   **"Act as Page":** Functionality when acting as a Page is not guaranteed or tested.
*   **Data Scraping Timing:** Occasionally, User or Group Name might not be detected on the first load. Reloading the page and reopening the popup typically resolves this.
*   **Error Handling:** Basic error handling is included, but complex Facebook errors might not always be handled gracefully.

## Contributing

Bug reports and feature requests are welcome! Please use the [GitHub Issues](https://github.com/FerrariGUy/facebook-scammer-assassin/issues) tracker for this repository. 

## Support Development

If you find this extension useful, please consider supporting its ongoing development via the links on the Options page or [Donate via PayPal](https://www.paypal.com/donate/?business=PXY7769HB3QWN&no_recurring=0&item_name=Thanks+for+the+support+or+appreciation+of+whichever+object%2Fcode%2Fetc+I%27ve+published.¤cy_code=USD) (link also available in Options).

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/). See the [LICENSE](LICENSE) file for details.
