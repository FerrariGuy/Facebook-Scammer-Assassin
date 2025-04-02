// --- START OF FILE pageDataExtractor.js ---

function extractPageContextData() {

    // --- START HELPER DEFINITIONS ---

    function decodeStringIfNeeded(str) {
        if (typeof str !== 'string') return str;
        if (str.includes('\\u')) {
            try {
                const decoded = JSON.parse(`"${str}"`);
                // console.log(`FSA: Decoded string: "${str}" -> "${decoded}"`); // Optional: reduce verbosity
                return decoded;
            } catch (e) {
                console.warn(`FSA: JSON.parse failed for decoding "${str}", using raw. Error:`, e);
                return str;
            }
        }
        return str;
    }

    function extractUserID() {
        console.log("FSA: [Helper] Trying to extract target userID...");
        const url = window.location.href;
        const groupUserProfileMatch = url.match(/groups\/[^/]+\/user\/(\d+)/);
        if (groupUserProfileMatch && groupUserProfileMatch[1]) {
            console.log("FSA: [Helper] Target UserID found in URL (groups/.../user/):", groupUserProfileMatch[1]);
            return groupUserProfileMatch[1];
        }
        let userIDMatch = url.match(/profile\.php\?id=(\d+)/);
        if (userIDMatch && userIDMatch[1]) {
          console.log("FSA: [Helper] Target UserID found in URL (profile.php?id=):", userIDMatch[1]);
          return userIDMatch[1];
        }
        userIDMatch = url.match(/facebook\.com\/([^/?]+)/);
        // Ensure it's ONLY digits and not inside /groups/ path (numeric vanity check)
        if (userIDMatch && userIDMatch[1] && /^\d+$/.test(userIDMatch[1]) && !url.includes('profile.php') && !url.includes('/groups/')) {
             console.log("FSA: [Helper] Target UserID found in URL (numeric vanity):", userIDMatch[1]);
             return userIDMatch[1];
         }
        userIDMatch = url.match(/[?&]fbid=(\d+)/);
         if (userIDMatch && userIDMatch[1]) {
          console.log("FSA: [Helper] Target UserID found in URL (fbid=):", userIDMatch[1]);
          return userIDMatch[1];
        }
        console.log("FSA: [Helper] Target UserID not in primary URL patterns. Trying JSON/Scripts as fallback...");
        const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script');
        const idPatterns = [/"entity_id":"(\d+)"/, /"profile_id":(\d+)/, /"ownerID":"(\d+)"/, /"userID":"(\d+)"/, /"actorID":"(\d+)"/, /"USER_ID":"(\d+)"/, /"id":"(\d+)"/];
        let bestPotentialId = null;
        let foundVia = null;

        scriptLoop:
        for (const script of scripts) {
            const textContent = script.textContent;
            if (!textContent) continue;
            try { // Prioritize Specific JSON Structures
                const jsonData = JSON.parse(textContent);
                 // Added nullish coalescing for safety
                const profileId = jsonData?.profile?.result?.id;
                const routeUserId = jsonData?.routeResponse?.data?.user?.id;
                let cometUserId = null;
                let deferredUserId = null;

                 if (profileId) { console.log(`FSA: [Helper] Target UserID found via JSON path (profile.result.id):`, profileId); return profileId; }
                 if (routeUserId) { console.log(`FSA: [Helper] Target UserID found via JSON structure (routeResponse.data.user.id):`, routeUserId); return routeUserId; }

                 // Check complex structures
                 for (const key in jsonData) {
                     if (typeof key === 'string' && key.includes('ProfileComet') && jsonData[key]?.user?.id) {
                         cometUserId = jsonData[key].user.id;
                         console.log(`FSA: [Helper] Target UserID found via JSON structure (ProfileComet key):`, cometUserId);
                         return cometUserId; // High confidence, return immediately
                     }
                      if (typeof jsonData[key] === 'object' && jsonData[key]?.constructor?.name === 'RequireDeferredReference' && jsonData[key]?.__bbox?.result?.data?.user?.id) {
                           deferredUserId = jsonData[key].__bbox.result.data.user.id;
                           console.log(`FSA: [Helper] Target UserID found via JSON structure (RequireDeferredReference):`, deferredUserId);
                           return deferredUserId; // High confidence, return immediately
                      }
                 }
            } catch(e) { /* Ignore JSON parse errors */ }

            // Fallback to Regex Patterns if JSON fails
            for (const pattern of idPatterns) {
                const idMatch = textContent.match(pattern);
                if (idMatch && idMatch[1] && idMatch[1].length > 5 && /^\d+$/.test(idMatch[1])) {
                    const currentMatchId = idMatch[1];
                    // console.log(`FSA: [Helper] Potential target UserID found via pattern ${pattern} in script:`, currentMatchId); // Reduce verbosity
                     if (pattern.source.includes('entity_id') || pattern.source.includes('profile_id') || pattern.source.includes('ownerID')) {
                          // console.log("FSA: [Helper] Prioritizing specific ID pattern match.");
                          bestPotentialId = currentMatchId;
                          foundVia = `Regex (${pattern})`;
                     } else if (!bestPotentialId && (pattern.source.includes('actorID') || pattern.source.includes('userID') || pattern.source.includes('USER_ID') || pattern.source.includes('"id"'))) {
                          bestPotentialId = currentMatchId;
                          foundVia = `Regex (${pattern})`;
                          // console.log("FSA: [Helper] Storing less specific ID pattern match as current best.");
                     }
                }
            } // End pattern loop
        } // End scriptLoop

        if (bestPotentialId) {
             console.log(`FSA: [Helper] Returning best potential target UserID found (${foundVia}):`, bestPotentialId);
             return bestPotentialId;
        }
        console.error("FSA: [Helper] Target UserID extraction FAILED after all attempts.");
        return 'Not Found';
    } // --- End of extractUserID ---

    function extractUserName() {
        console.log("FSA: [Helper] Trying to extract userName...");
        let name = 'Not Found';
        const url = window.location.href;
        const isGroupUserProfile = /groups\/[^/]+\/user\//.test(url);

        // 1. Try Specific JSON Paths
        console.log("FSA: [Helper] Trying specific JSON paths for user name...");
        const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script');
        let jsonNameFound = false;
        scriptLoopJson:
        for (const script of scripts) {
             const textContent = script.textContent;
             if (!textContent) continue;
             try {
                 const jsonData = JSON.parse(textContent);
                 let potentialJsonName = null;
                 if (jsonData?.routeResponse?.data?.user?.name && typeof jsonData.routeResponse.data.user.name === 'string') { potentialJsonName = jsonData.routeResponse.data.user.name; console.log(`FSA: [Helper] Name found (routeResponse):`, potentialJsonName); }
                 else if (jsonData?.profile?.result?.name && typeof jsonData.profile.result.name === 'string') { potentialJsonName = jsonData.profile.result.name; console.log(`FSA: [Helper] Name found (profile.result):`, potentialJsonName); }
                 // --- VERIFY PATHS BELOW for group user pages ---
                 // else if (jsonData?.data?.group_member_profile?.user?.name) { potentialJsonName = jsonData.data.group_member_profile.user.name; console.log(`FSA: [Helper] Name found (group_member_profile):`, potentialJsonName); }
                 // else if (jsonData?.viewer?.user?.name_renderer?.text && isGroupUserProfile) { potentialJsonName = jsonData.viewer.user.name_renderer.text; console.log(`FSA: [Helper] Name found (viewer.user.name_renderer):`, potentialJsonName); }

                 if (potentialJsonName && potentialJsonName.length > 1 && potentialJsonName.length < 70) {
                     name = potentialJsonName; jsonNameFound = true;
                     console.log("FSA: [Helper] Using userName from specific JSON structure:", name);
                     break scriptLoopJson;
                 }
             } catch(e) {}
        }
        if (!jsonNameFound) console.log("FSA: [Helper] Name not found via specific JSON.");

        // 2. Try Title Tag (ONLY if JSON failed)
        if (name === 'Not Found') {
            console.log("FSA: [Helper] Trying document.title...");
             try {
                 const titleFacebookPattern = /^(\(\d+\+?\)\s*)?Facebook$/i;
                 const notificationPrefixPattern = /^\(\d+\+?\)\s*/;
                 if (document.title) {
                     let potentialNameFromTitle = document.title.split(/[|\-–]/)[0].trim();
                     potentialNameFromTitle = potentialNameFromTitle.replace(notificationPrefixPattern, '').trim();
                     if (potentialNameFromTitle && potentialNameFromTitle.length > 1 && !titleFacebookPattern.test(potentialNameFromTitle)) {
                         console.log("FSA: [Helper] userName found via document.title (cleaned):", potentialNameFromTitle);
                         name = potentialNameFromTitle;
                     } else { console.log("FSA: [Helper] userName from title rejected."); }
                 } else { console.log("FSA: [Helper] document.title is empty."); }
             } catch (e) { console.error("FSA: [Helper] Error accessing/processing document.title:", e); }
        }

        // 3. Try H1 (ONLY if JSON and Title failed)
        if (name === 'Not Found') {
             console.log("FSA: [Helper] Trying H1 in main...");
              try {
                 const mainArea = document.querySelector('[role="main"]');
                 const h1Element = mainArea?.querySelector('h1');
                 if (h1Element?.textContent) {
                     const potentialName = h1Element.textContent.replace(/\s+/g, ' ').trim();
                     if (potentialName && potentialName.length > 1 && potentialName.length < 70 && potentialName.toLowerCase() !== 'facebook' && !/^\(\d+\+?\)\s*Facebook$/i.test(potentialName)) {
                         const groupWords = /\b(group|members|admins|mods|discussion|about|events|files|media)\b/i;
                         if (isGroupUserProfile && groupWords.test(potentialName)) {
                              console.log("FSA: [Helper] userName from H1 rejected on group user page (contained group words):", potentialName);
                         } else {
                              console.log("FSA: [Helper] userName found via h1 in main (last resort):", potentialName);
                              name = potentialName;
                         }
                     } else { console.log("FSA: [Helper] userName from H1 rejected (empty/facebook/length)."); }
                 } else { console.log("FSA: [Helper] H1 in main not found or no text."); }
             } catch (e) { console.error("FSA: [Helper] Error querying H1:", e); }
        }

        // Final Logging
        if (name === 'Not Found') {
            console.error("FSA: [Helper] userName extraction FAILED after all attempts.");
        } else {
             console.log("FSA: [Helper] extractUserName SUCCEEDED. Returning candidate:", name);
        }
        return name;
    } // --- End of extractUserName ---

    function extractUserVanity() {
        console.log("FSA: [Helper] Trying to extract userVanity...");
        const url = window.location.href;
        const urlMatch = url.match(/facebook\.com\/([^/?#]+)/);
        const ignoreList = ['profile.php', 'people', 'groups', 'watch', 'events', 'marketplace', 'gaming', 'pages', 'stories', 'reels', 'photo.php', 'permalink.php', 'video.php', 'notes', 'media', 'questions', 'reviews', 'help', 'settings', 'notifications', 'friends', 'about', 'photos', 'videos'];
        if (urlMatch && urlMatch[1] && !ignoreList.includes(urlMatch[1].toLowerCase()) && !/^\d+$/.test(urlMatch[1])) {
            console.log("FSA: [Helper] userVanity found in main URL:", urlMatch[1]);
            return urlMatch[1];
        }
        // console.log("FSA: [Helper] userVanity not in main URL path. Trying meta tags/canonical link..."); // Reduce verbosity
        const selectors = ['meta[property="og:url"]', 'link[rel="canonical"]'];
        for (const selector of selectors) {
           try { /* ... */ } catch (e) { /* ... */ } // Keep try/catch
           // ... rest of logic ...
            try {
                const element = document.querySelector(selector);
                if (element) {
                    const content = element.getAttribute(selector.startsWith('link') ? 'href' : 'content');
                    if (content) {
                         const vanityMatch = content.match(/facebook\.com\/([^/?#]+)/);
                         if (vanityMatch && vanityMatch[1] && !ignoreList.includes(vanityMatch[1].toLowerCase()) && !/^\d+$/.test(vanityMatch[1])) {
                             console.log(`FSA: [Helper] userVanity found in ${selector}:`, vanityMatch[1]);
                             return vanityMatch[1];
                         }
                    }
                }
            } catch (e) { console.error(`FSA: [Helper] Error querying vanity selector ${selector}:`, e); }
        }
        console.log("FSA: [Helper] userVanity extraction failed.");
        return 'Not Found';
    } // --- End of extractUserVanity ---

    function extractSessionInfo() {
        console.log("FSA: [Helper] Trying to extract session info..."); // Added Helper tag
        let fb_dtsg = 'Not Found', jazoest = 'Not Found', lsd = 'Not Found', adminUserId = 'Not Found';
        try {
            // --- Step 1: Hidden Inputs ---
            console.log("FSA: [Helper] Checking hidden inputs...");
            const dtsgInput = document.querySelector('input[name="fb_dtsg"]');
            const jazoestInput = document.querySelector('input[name="jazoest"]');
            const lsdInput = document.querySelector('input[name="lsd"]');
            if (dtsgInput?.value) { fb_dtsg = dtsgInput.value; console.log("FSA: [Helper] Found fb_dtsg in input."); }
            if (jazoestInput?.value) { jazoest = jazoestInput.value; console.log("FSA: [Helper] Found jazoest in input."); }
            if (lsdInput?.value) { lsd = lsdInput.value; console.log("FSA: [Helper] Found lsd in input."); }
            console.log(`FSA: [Helper] Status after inputs: fb_dtsg=${fb_dtsg !== 'Not Found'}, lsd=${lsd !== 'Not Found'}`);

            // --- Step 2: Script Search (if needed) ---
            if (fb_dtsg === 'Not Found' || lsd === 'Not Found') {
                console.log("FSA: [Helper] Searching scripts for DTSG/LSD tokens...");
                const scripts = document.querySelectorAll('script');
                const dtsgPattern = /\[\s*"DTSGInitialData"\s*,\s*\[\]\s*,\s*{\s*"token"\s*:\s*"([^"]+)"/;
                const lsdPattern = /\[\s*"LSD"\s*,\s*\[\]\s*,\s*{\s*"token"\s*:\s*"([^"]+)"/;
                let foundDtsgInScript = false;
                let foundLsdInScript = false;
                for (const script of scripts) { /* ... */
                     const textContent = script.textContent;
                     if (!textContent) continue;
                     if (fb_dtsg === 'Not Found') {
                         const dtsgMatch = textContent.match(dtsgPattern);
                         if (dtsgMatch?.[1]) { fb_dtsg = dtsgMatch[1]; console.log("FSA: [Helper] Found fb_dtsg via regex in script."); foundDtsgInScript = true;}
                     }
                     if (lsd === 'Not Found') {
                          const lsdMatch = textContent.match(lsdPattern);
                          if (lsdMatch?.[1]) { lsd = lsdMatch[1]; console.log("FSA: [Helper] Found lsd via regex in script."); foundLsdInScript = true; }
                      }
                     if ((fb_dtsg !== 'Not Found' || foundDtsgInScript) && (lsd !== 'Not Found' || foundLsdInScript)) break; // Exit loop once found potentially
                 }
                 if (!foundDtsgInScript && fb_dtsg === 'Not Found') console.log("FSA: [Helper] fb_dtsg not found in scripts via regex.");
                 if (!foundLsdInScript && lsd === 'Not Found') console.log("FSA: [Helper] lsd not found in scripts via regex.");
            }

            // --- Step 3: Admin User ID ---
            console.log("FSA: [Helper] Extracting Admin User ID...");
            if (window.CurrentUserInitialData?.USER_ID) { adminUserId = window.CurrentUserInitialData.USER_ID; console.log("FSA: [Helper] Found adminUserId (CurrentUserInitialData):", adminUserId); }
            else if (window.Env?.userID) { adminUserId = window.Env.userID; console.log("FSA: [Helper] Found adminUserId (window.Env):", adminUserId); }
            else if (window.__accessToken) { const match = window.__accessToken.match(/"USER_ID":"(\d+)"/); if (match?.[1]) { adminUserId = match[1]; console.log("FSA: [Helper] Found adminUserId via regex in window.__accessToken:", adminUserId); } }
            else {
                 console.log("FSA: [Helper] Admin User ID not in primary globals, searching scripts...");
                 const scripts = document.querySelectorAll('script');
                 const adminIdPatterns = [/"USER_ID":"(\d+)"/, /"ACCOUNT_ID":"(\d+)"/, /"viewerID":"(\d+)"/];
                 let foundAdminInScript = false;
                 scriptAdminLoop:
                 for (const script of scripts) { /* ... */
                     const textContent = script.textContent; if (!textContent) continue;
                      for (const pattern of adminIdPatterns) {
                          const idMatch = textContent.match(pattern);
                          if (idMatch?.[1] && idMatch[1].length > 5 && /^\d+$/.test(idMatch[1])) {
                              const occurrences = (textContent.match(new RegExp(`"${idMatch[1]}"`, 'g')) || []).length;
                              if (occurrences > 4) { // Threshold might need adjustment
                                  adminUserId = idMatch[1];
                                  console.log(`FSA: [Helper] Found potential adminUserId via pattern ${pattern} (occurrences: ${occurrences}):`, adminUserId);
                                  foundAdminInScript = true;
                                  break scriptAdminLoop; // Found it, exit both loops
                              }
                          }
                      }
                 } // End scriptAdminLoop
                 if (!foundAdminInScript) console.log("FSA: [Helper] Admin User ID not found in scripts either.");
            }

            // --- Step 4: Final Fallbacks & Logging ---
            if (lsd === 'Not Found' && fb_dtsg !== 'Not Found') {
                lsd = fb_dtsg; console.log("FSA: [Helper] Using fb_dtsg as fallback for lsd.");
            } else if (lsd === 'Not Found' && fb_dtsg === 'Not Found') {
                 console.warn("FSA: [Helper] lsd token not found, and fb_dtsg fallback also not found.");
            }

            const result = { fb_dtsg, jazoest, lsd, adminUserId };
            console.log("FSA Helper: extractSessionInfo returning final status:", {
                fb_dtsg: fb_dtsg !== 'Not Found' ? 'FOUND' : 'Not Found',
                jazoest: jazoest !== 'Not Found' ? 'FOUND' : 'Not Found',
                lsd: lsd !== 'Not Found' ? 'FOUND' : 'Not Found',
                adminUserId: adminUserId !== 'Not Found' ? 'FOUND' : 'Not Found'
             });
            if (fb_dtsg === 'Not Found') console.error("FSA: CRITICAL - fb_dtsg token could not be found!");
            if (adminUserId === 'Not Found') console.error("FSA: CRITICAL - adminUserId could not be determined!");

            return result;

        } catch (e) {
            console.error("FSA: [Helper] Uncaught Error during session info extraction:", e);
            // Ensure we return 'Not Found' values on error
             return { fb_dtsg: 'Not Found', jazoest: 'Not Found', lsd: 'Not Found', adminUserId: 'Not Found' };
        }
    } // --- End of extractSessionInfo ---


// pageDataExtractor.js -> extractPageContextData -> (nested) extractCurrentGroupInfo

function extractCurrentGroupInfo() {
    console.log("FSA: [Helper] Trying to extract current group info..."); // Added logging
    const url = window.location.href;
    const groupUrlMatch = url.match(/facebook\.com\/groups\/([^/?#]+)/);
    if (!groupUrlMatch) { console.log("FSA: [Helper] Not a group URL."); return null; }

    let groupVanity = null;
    let groupID = 'Not Found';
    let groupName = 'Not Found';

    if (groupUrlMatch[1] && !/^\d+$/.test(groupUrlMatch[1])) {
        groupVanity = groupUrlMatch[1];
        console.log("FSA: [Helper] Group vanity found in URL:", groupVanity);
    }

    // Group ID extraction (JSON preferred)
    const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script');
    const groupIDPattern = /"groupID":"(\d+)"/;
    // const legacyGroupIDPattern = /"group_id":(\d+)/; // Keep commented for now

    let foundGroupId = false; // Flag to stop searching once found

    groupLoop: // Label to break outer loop
    for (const script of scripts) {
        const textContent = script.textContent;
        if (!textContent) continue;

        // Prioritize specific JSON structures if known
        try {
            const jsonData = JSON.parse(textContent);
            // Example - VERIFY THESE PATHS from group page source
            const jsonGroupIdPath1 = jsonData?.data?.group?.id; // Example Path 1
            const jsonGroupIdPath2 = jsonData?.response?.group?.id; // Example Path 2
            // Add other known reliable paths here...
            // const jsonGroupIdPath3 = jsonData?.some?.other?.path?.group_id;

            if (jsonGroupIdPath1) {
                groupID = jsonGroupIdPath1;
                console.log("FSA: [Helper] GroupID found via JSON (data.group.id):", groupID);
                foundGroupId = true; break groupLoop;
            }
            if (jsonGroupIdPath2) {
                groupID = jsonGroupIdPath2;
                console.log("FSA: [Helper] GroupID found via JSON (response.group.id):", groupID);
                foundGroupId = true; break groupLoop;
            }
            // if (jsonGroupIdPath3) { ... break groupLoop; }

        } catch (e) { /* Ignore JSON parse errors for this script */ }

        // Regex Fallbacks (check occurrences for reliability) - ONLY IF JSON FAILED
        // REMOVED the 'if (groupID === 'Not Found')' check here - it was preventing regex from running if JSON parse failed but didn't find ID
        const idMatch = textContent.match(groupIDPattern);
        if (idMatch && idMatch[1]) {
            const occurrences = (textContent.match(new RegExp(`"${idMatch[1]}"`, 'g')) || []).length;
            if (occurrences > 5) { // Threshold might need adjustment
                 groupID = idMatch[1];
                 console.log(`FSA: [Helper] GroupID found via regex ${groupIDPattern} (occurrences: ${occurrences}):`, groupID);
                 foundGroupId = true; break groupLoop; // Found via regex, stop searching
            }
        }
        // Legacy pattern fallback (if needed)
        /*
        const legacyIdMatch = textContent.match(legacyGroupIDPattern);
        if (legacyIdMatch && legacyIdMatch[1]) { ... }
        */
    } // End groupLoop

    if (!foundGroupId) {
         console.error("FSA: [Helper] GroupID extraction FAILED (JSON and Regex).");
         return null; // Explicitly return null if ID extraction failed
    }

    // Group Name extraction (H1 preferred on group pages)
    try { /* ... H1 logic ... */ } catch(e) { /* ... */ }
    // ... existing name extraction ...
     try {
        const mainArea = document.querySelector('[role="main"]');
        const h1Element = mainArea?.querySelector('h1');
        if (h1Element?.textContent) {
             const potentialName = h1Element.textContent.replace(/\s+/g, ' ').trim();
             if (potentialName && potentialName.length > 1) { // Simple check
                 groupName = potentialName;
                 console.log("FSA: [Helper] Group Name found via H1:", groupName);
             }
        } // Add JSON fallback for name if needed
    } catch(e) { console.error("FSA: [Helper] Error extracting group name:", e); }


    // Only return success object if groupID was found
    const groupResult = { id: groupID, name: decodeStringIfNeeded(groupName), vanity: groupVanity };
    console.log("FSA: [Helper] extractCurrentGroupInfo SUCCEEDED. Returning:", groupResult);
    return groupResult;

} // --- End of extractCurrentGroupInfo ---

    // --- END HELPER DEFINITIONS ---


    // --- START MAIN LOGIC ---
    console.log("FSA Inject: Determining page type...");
    const url = window.location.href;
    const path = window.location.pathname;

    const isGroupPage = /^\/groups\//.test(path);
    const isGroupUserProfile = /^\/groups\/[^/]+\/user\//.test(path);
    const isKnownGroupSubpage = /^\/groups\/[^/]+\/(?:members|files|photos|videos|about|discussion|events|search|media|reels)\b/.test(path);
    const isBaseUrl = (path === '/' || path === '/home.php' || path === '/index.php');

    let result = { type: 'error', message: 'Unknown page type determination logic error' }; // Default to error

    if (isBaseUrl) {
         console.log("FSA Inject: Detected base Facebook URL. Skipping detailed extraction.");
         result = { type: 'group_subpage', data: null, message: 'Base URL - Info N/A' }; // Use message for clarity

    } else if (isGroupUserProfile) {
         console.log("FSA Inject: Detected group user profile page.");
         const userInfo = {
             userID: extractUserID(),
             userName: extractUserName(), // Decoding happens below
             userVanity: extractUserVanity()
         };
         const sessionInfo = extractSessionInfo();
         userInfo.userName = decodeStringIfNeeded(userInfo.userName); // Decode name here
         console.log("FSA Inject: UserInfo extracted (Group User Page):", userInfo);
         console.log("FSA Inject: SessionInfo extracted (Group User Page):", { l:sessionInfo.lsd != 'Not Found', d:sessionInfo.fb_dtsg != 'Not Found', a: sessionInfo.adminUserId != 'Not Found'}); // Log status only
         result = { type: 'user', data: { ...userInfo, ...sessionInfo } };

    } else if (isKnownGroupSubpage) {
        console.log("FSA Inject: Detected known group sub-page. Skipping detailed extraction.");
        result = { type: 'group_subpage', data: null, message: 'Group Sub-Page - Info N/A' };

    } else if (isGroupPage) {
        console.log("FSA Inject: Detected main group page. Attempting group info extraction.");
        const groupInfo = extractCurrentGroupInfo();
        if (groupInfo) {
            result = { type: 'group', data: groupInfo };
        } else {
             console.warn("FSA Inject: On main group page but failed to extract group info.");
             result = { type: 'error', message: 'Could not extract group info' };
        }
    } else {
        // --- Assume Standard User Profile ---
        console.log("FSA Inject: Detected standard user profile page (or other).");
         const userInfo = {
             userID: extractUserID(),
             userName: extractUserName(), // Decoding happens below
             userVanity: extractUserVanity()
         };
         const sessionInfo = extractSessionInfo();
         userInfo.userName = decodeStringIfNeeded(userInfo.userName); // Decode name here
         console.log("FSA Inject: UserInfo extracted (Standard User Page):", userInfo);
          console.log("FSA Inject: SessionInfo extracted (Standard User Page):", { l:sessionInfo.lsd != 'Not Found', d:sessionInfo.fb_dtsg != 'Not Found', a: sessionInfo.adminUserId != 'Not Found'}); // Log status only
         result = { type: 'user', data: { ...userInfo, ...sessionInfo } };
    }

    console.log("FSA Inject: Final result being returned:", result);
    return result;
    // --- END MAIN LOGIC ---

} // <-- End of extractPageContextData definition
// --- END OF FILE pageDataExtractor.js ---