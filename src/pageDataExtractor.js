// --- START OF FILE pageDataExtractor.js ---

function extractPageContextData() {

    // --- START HELPER DEFINITIONS ---
    // These are specialized functions for extracting specific pieces of data.

    /**
     * Decodes strings that might contain Unicode escape sequences (e.g., "\\u00e9").
     * @param {string} str The string to decode.
     * @returns {string} The decoded string.
     */
    function decodeStringIfNeeded(str) {
        if (typeof str !== 'string') return str;
        // Check for the presence of a Unicode escape sequence.
        if (str.includes('\\u')) {
            try {
                // The safest way to decode is to treat it as a JSON string.
                const decoded = JSON.parse(`"${str}"`);
                return decoded;
            } catch (e) {
                console.warn(`FSA (Helper): JSON.parse failed for decoding "${str}", using raw. Error:`, e);
                return str; // Return the original string if decoding fails.
            }
        }
        return str;
    }

    /**
     * Extracts the target user's Facebook ID from various potential sources on the page.
     * It prioritizes URL patterns, then specific JSON data structures, and finally falls back to regex patterns in scripts.
     * @returns {string} The found User ID or 'Not Found'.
     */
    function extractUserID() {
        console.log("FSA (Helper): Trying to extract target userID...");
        const url = window.location.href;

        // --- Strategy 1: URL Patterns (Highest Priority) ---
        const groupUserProfileMatch = url.match(/groups\/[^/]+\/user\/(\d+)/);
        if (groupUserProfileMatch?.[1]) {
            console.log("FSA (Helper): Target UserID found in URL (groups/.../user/):", groupUserProfileMatch[1]);
            return groupUserProfileMatch[1];
        }
        let userIDMatch = url.match(/profile\.php\?id=(\d+)/);
        if (userIDMatch?.[1]) {
          console.log("FSA (Helper): Target UserID found in URL (profile.php?id=):", userIDMatch[1]);
          return userIDMatch[1];
        }
        userIDMatch = url.match(/facebook\.com\/([^/?]+)/);
        if (userIDMatch?.[1] && /^\d+$/.test(userIDMatch[1]) && !url.includes('profile.php') && !url.includes('/groups/')) {
             console.log("FSA (Helper): Target UserID found in URL (numeric vanity):", userIDMatch[1]);
             return userIDMatch[1];
         }
        userIDMatch = url.match(/[?&]fbid=(\d+)/);
         if (userIDMatch?.[1]) {
          console.log("FSA (Helper): Target UserID found in URL (fbid=):", userIDMatch[1]);
          return userIDMatch[1];
        }
        console.log("FSA (Helper): Target UserID not in primary URL patterns. Trying JSON/Scripts as fallback...");

        // --- Strategy 2: JSON data structures and Regex fallbacks ---
        const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script');
        const idPatterns = [/"entity_id":"(\d+)"/, /"profile_id":(\d+)/, /"ownerID":"(\d+)"/, /"userID":"(\d+)"/, /"actorID":"(\d+)"/, /"USER_ID":"(\d+)"/, /"id":"(\d+)"/];
        let bestPotentialId = null;

        for (const script of scripts) {
            const textContent = script.textContent;
            if (!textContent) continue;

            // --- Sub-strategy 2a: Look for specific JSON structures first ---
            try {
                const jsonData = JSON.parse(textContent);
                const profileId = jsonData?.profile?.result?.id;
                const routeUserId = jsonData?.routeResponse?.data?.user?.id;
                if (profileId) { console.log(`FSA (Helper): Target UserID found via JSON path (profile.result.id):`, profileId); return profileId; }
                if (routeUserId) { console.log(`FSA (Helper): Target UserID found via JSON structure (routeResponse.data.user.id):`, routeUserId); return routeUserId; }

                 // Check for more complex, nested structures
                 for (const key in jsonData) {
                     if (typeof key === 'string' && key.includes('ProfileComet') && jsonData[key]?.user?.id) {
                         console.log(`FSA (Helper): Target UserID found via JSON structure (ProfileComet key):`, jsonData[key].user.id);
                         return jsonData[key].user.id; // High confidence, return immediately
                     }
                      if (typeof jsonData[key] === 'object' && jsonData[key]?.constructor?.name === 'RequireDeferredReference' && jsonData[key]?.__bbox?.result?.data?.user?.id) {
                           console.log(`FSA (Helper): Target UserID found via JSON structure (RequireDeferredReference):`, jsonData[key].__bbox.result.data.user.id);
                           return jsonData[key].__bbox.result.data.user.id; // High confidence
                      }
                 }
            } catch(e) { /* Ignore JSON parse errors, as many scripts are not valid JSON */ }

            // --- Sub-strategy 2b: Fallback to Regex Patterns if specific JSON fails ---
            for (const pattern of idPatterns) {
                const idMatch = textContent.match(pattern);
                if (idMatch?.[1] && idMatch[1].length > 5 && /^\d+$/.test(idMatch[1])) {
                    // Prioritize more specific keys like 'entity_id' over generic 'id'.
                    if (pattern.source.includes('entity_id') || pattern.source.includes('profile_id') || pattern.source.includes('ownerID')) {
                          bestPotentialId = idMatch[1];
                          break; // Found a high-quality match, no need to check other patterns in this script.
                    } else if (!bestPotentialId) {
                          bestPotentialId = idMatch[1]; // Store less specific match as the current best.
                    }
                }
            }
        } // End script loop

        if (bestPotentialId) {
             console.log(`FSA (Helper): Returning best potential target UserID found via regex:`, bestPotentialId);
             return bestPotentialId;
        }

        console.error("FSA (Helper): Target UserID extraction FAILED after all attempts.");
        return 'Not Found';
    }

    /**
     * Extracts the user's display name from the page.
     * It prioritizes JSON data, then falls back to the document title, and finally an H1 tag.
     * @returns {string} The user's name or 'Not Found'.
     */
    function extractUserName() {
        console.log("FSA (Helper): Trying to extract userName...");
        let name = 'Not Found';

        // --- Strategy 1: Specific JSON Paths ---
        const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script');
        for (const script of scripts) {
             const textContent = script.textContent;
             if (!textContent) continue;
             try {
                 const jsonData = JSON.parse(textContent);
                 let potentialJsonName = null;
                 if (jsonData?.routeResponse?.data?.user?.name) { potentialJsonName = jsonData.routeResponse.data.user.name; }
                 else if (jsonData?.profile?.result?.name) { potentialJsonName = jsonData.profile.result.name; }

                 if (potentialJsonName && typeof potentialJsonName === 'string' && potentialJsonName.length > 1) {
                     name = potentialJsonName;
                     console.log("FSA (Helper): Using userName from specific JSON structure:", name);
                     return name; // Found the best source, return immediately.
                 }
             } catch(e) {}
        }

        // --- Strategy 2: Document Title (if JSON fails) ---
        if (name === 'Not Found') {
             try {
                 const titleFacebookPattern = /^(\(\d+\+?\)\s*)?Facebook$/i;
                 const notificationPrefixPattern = /^\(\d+\+?\)\s*/;
                 if (document.title) {
                     let potentialNameFromTitle = document.title.split(/[|\-–]/)[0].trim().replace(notificationPrefixPattern, '').trim();
                     if (potentialNameFromTitle.length > 1 && !titleFacebookPattern.test(potentialNameFromTitle)) {
                         name = potentialNameFromTitle;
                         console.log("FSA (Helper): userName found via document.title (cleaned):", name);
                     }
                 }
             } catch (e) { console.error("FSA (Helper): Error processing document.title:", e); }
        }

        // --- Strategy 3: H1 Tag (Last resort) ---
        if (name === 'Not Found') {
              try {
                 const h1Element = document.querySelector('[role="main"] h1');
                 if (h1Element?.textContent) {
                     const potentialName = h1Element.textContent.trim();
                     if (potentialName.length > 1 && potentialName.toLowerCase() !== 'facebook') {
                          name = potentialName;
                          console.log("FSA (Helper): userName found via h1 in main (last resort):", name);
                     }
                 }
             } catch (e) { console.error("FSA (Helper): Error querying H1:", e); }
        }

        if (name === 'Not Found') console.error("FSA (Helper): userName extraction FAILED after all attempts.");
        return name;
    }

    /**
     * Extracts the user's vanity URL component (e.g., 'john.doe' from facebook.com/john.doe).
     * @returns {string} The vanity string or 'Not Found'.
     */
    function extractUserVanity() {
        console.log("FSA (Helper): Trying to extract userVanity...");
        const url = window.location.href;
        const ignoreList = ['profile.php', 'people', 'groups', 'watch', 'events', 'marketplace', 'gaming', 'pages', 'stories', 'reels', 'photo.php', 'permalink.php'];
        const urlMatch = url.match(/facebook\.com\/([^/?#]+)/);

        if (urlMatch?.[1] && !ignoreList.includes(urlMatch[1].toLowerCase()) && !/^\d+$/.test(urlMatch[1])) {
            console.log("FSA (Helper): userVanity found in main URL:", urlMatch[1]);
            return urlMatch[1];
        }

        // --- Fallback: Check canonical link or meta tags ---
        const metaElement = document.querySelector('meta[property="og:url"], link[rel="canonical"]');
        if (metaElement) {
            const content = metaElement.getAttribute('content') || metaElement.getAttribute('href');
            const vanityMatch = content?.match(/facebook\.com\/([^/?#]+)/);
            if (vanityMatch?.[1] && !ignoreList.includes(vanityMatch[1].toLowerCase()) && !/^\d+$/.test(vanityMatch[1])) {
                console.log(`FSA (Helper): userVanity found in meta/link tag:`, vanityMatch[1]);
                return vanityMatch[1];
            }
        }

        console.log("FSA (Helper): userVanity extraction failed.");
        return 'Not Found';
    }

    /**
     * Extracts session-critical information for making authenticated requests.
     * This includes the current logged-in user's ID and security tokens (dtsg, lsd).
     * @returns {object} An object containing { fb_dtsg, jazoest, lsd, adminUserId }.
     */
    function extractSessionInfo() {
        console.log("FSA (Helper): Trying to extract session info...");
        let fb_dtsg = 'Not Found', jazoest = 'Not Found', lsd = 'Not Found', adminUserId = 'Not Found';

        // --- Step 1: Hidden Inputs (Most reliable for tokens) ---
        const dtsgInput = document.querySelector('input[name="fb_dtsg"]');
        const jazoestInput = document.querySelector('input[name="jazoest"]');
        if (dtsgInput?.value) fb_dtsg = dtsgInput.value;
        if (jazoestInput?.value) jazoest = jazoestInput.value;

        // --- Step 2: Global Variables (Most reliable for Admin ID) ---
        if (window.CurrentUserInitialData?.USER_ID) { adminUserId = window.CurrentUserInitialData.USER_ID; }
        else if (window.Env?.userID) { adminUserId = window.Env.userID; }

        // --- Step 3: Script Search (Fallback for all) ---
        const scripts = document.querySelectorAll('script');
        const dtsgPattern = /"DTSGInitialData"\s*,\s*\[\]\s*,\s*{\s*"token"\s*:\s*"([^"]+)"/;
        const lsdPattern = /"LSD"\s*,\s*\[\]\s*,\s*{\s*"token"\s*:\s*"([^"]+)"/;
        const adminIdPattern = /"USER_ID":"(\d+)"/;

        if (fb_dtsg === 'Not Found' || lsd === 'Not Found' || adminUserId === 'Not Found') {
            for (const script of scripts) {
                 const textContent = script.textContent;
                 if (!textContent) continue;
                 if (fb_dtsg === 'Not Found' && textContent.match(dtsgPattern)) { fb_dtsg = textContent.match(dtsgPattern)[1]; }
                 if (lsd === 'Not Found' && textContent.match(lsdPattern)) { lsd = textContent.match(lsdPattern)[1]; }
                 if (adminUserId === 'Not Found' && textContent.match(adminIdPattern)) { adminUserId = textContent.match(adminIdPattern)[1]; }
                 // Exit early if all are found.
                 if (fb_dtsg !== 'Not Found' && lsd !== 'Not Found' && adminUserId !== 'Not Found') break;
            }
        }

        // --- Step 4: Final Logic ---
        if (lsd === 'Not Found' && fb_dtsg !== 'Not Found') { lsd = fb_dtsg; } // LSD often mirrors DTSG.

        const result = { fb_dtsg, jazoest, lsd, adminUserId };
        console.log("FSA (Helper): extractSessionInfo final status:", {
            fb_dtsg: result.fb_dtsg !== 'Not Found' ? 'FOUND' : 'Not Found',
            adminUserId: result.adminUserId !== 'Not Found' ? 'FOUND' : 'Not Found'
        });
        if (result.fb_dtsg === 'Not Found') console.error("FSA (Helper): CRITICAL - fb_dtsg token could not be found!");
        if (result.adminUserId === 'Not Found') console.error("FSA (Helper): CRITICAL - adminUserId could not be determined!");
        return result;
    }

    /**
     * Extracts information about the current Facebook group page.
     * @returns {object|null} Object with {id, name, vanity} or null if not a group page or ID can't be found.
     */
    function extractCurrentGroupInfo() {
        console.log("FSA (Helper): Trying to extract current group info...");
        const path = window.location.pathname;
        const groupUrlMatch = path.match(/^\/groups\/([^/?#]+)/);
        if (!groupUrlMatch) { console.log("FSA (Helper): Not a group URL pattern."); return null; }

        let groupID = 'Not Found';
        let groupName = 'Not Found';
        const potentialIdOrVanity = groupUrlMatch[1];

        // --- Step 1: Check if URL segment is the numeric Group ID ---
        if (/^\d{10,}$/.test(potentialIdOrVanity)) {
            groupID = potentialIdOrVanity;
            console.log("FSA (Helper): GroupID found directly in URL path:", groupID);
        }

        // --- Step 2: Search for Group ID in JSON data if not found in URL ---
        if (groupID === 'Not Found') {
            const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs]');
            for (const script of scripts) {
                 const textContent = script.textContent;
                 if (!textContent) continue;
                 try {
                    const jsonData = JSON.parse(textContent);
                    // This is a common path for group data in newer FB layouts.
                    const groupData = jsonData?.routeResponse?.data?.group || jsonData?.data?.group;
                    if (groupData?.id && /^\d{10,}$/.test(groupData.id)) {
                         groupID = groupData.id;
                         groupName = groupData.name || 'Not Found';
                         console.log(`FSA (Helper): GroupID (${groupID}) found via targeted JSON.`);
                         break; // Found it, exit loop.
                    }
                 } catch (e) {}
             }
        }

        // --- Step 3: Extract Group Name if not found via JSON ---
        if (groupName === 'Not Found') {
             try {
                 const h1Element = document.querySelector('[role="main"] h1');
                 if (h1Element?.textContent) groupName = h1Element.textContent.trim();
             } catch(e) {}
        }

        if (groupID === 'Not Found') {
           console.error("FSA (Helper): CRITICAL - Failed to determine Group ID after all checks.");
           return null;
        }

        const groupResult = { id: groupID, name: decodeStringIfNeeded(groupName), vanity: /^\d+$/.test(potentialIdOrVanity) ? null : potentialIdOrVanity };
        console.log("FSA (Helper): extractCurrentGroupInfo SUCCEEDED. Returning:", groupResult);
        return groupResult;
    }

    // --- END HELPER DEFINITIONS ---


    // --- START MAIN DISPATCHER LOGIC ---
    // This logic determines the type of page and calls the appropriate helpers.
    console.log("FSA (Inject): Determining page type...");
    const path = window.location.pathname;
    const isGroupPage = /^\/groups\//.test(path);
    const isGroupUserProfile = /^\/groups\/[^/]+\/user\//.test(path);
    // Any group page that isn't a user-specific profile is considered a general group page.
    const isGeneralGroupPage = isGroupPage && !isGroupUserProfile;

    let result = { type: 'error', message: 'Page type could not be determined' };

    try {
        if (isGroupUserProfile || path.includes('profile.php') || !isGroupPage) {
            // Treat as a user page if it's a group user profile, a classic profile.php, or not a group at all.
            console.log("FSA (Inject): Detected a user-type page.");
            const userInfo = {
                userID: extractUserID(),
                userName: decodeStringIfNeeded(extractUserName()),
                userVanity: extractUserVanity()
            };
            const sessionInfo = extractSessionInfo();
            // Only classify as 'user' if a valid ID was found.
            if (userInfo.userID !== 'Not Found' && userInfo.userID?.length > 5) {
                result = { type: 'user', data: { ...userInfo, ...sessionInfo } };
            } else {
                result = { type: 'other', data: { ...sessionInfo }, message: 'Could not find a valid user ID' };
            }
        } else if (isGeneralGroupPage) {
            console.log("FSA (Inject): Detected a group-type page.");
            const groupInfo = extractCurrentGroupInfo();
            const sessionInfo = extractSessionInfo();
            if (groupInfo) { // Check if groupInfo extraction was successful
                result = { type: 'group', data: { ...groupInfo, ...sessionInfo } };
            } else {
                 result = { type: 'error', message: 'Could not extract group ID', data: { ...sessionInfo } };
            }
        }
    } catch (e) {
         console.error("FSA (Inject): Error in main dispatcher logic:", e);
         result = { type: 'error', message: 'Internal script error during dispatch' };
    }

    console.log("FSA (Inject): Final result being returned:", result);
    return result;

}

// --- END OF FILE pageDataExtractor.js ---