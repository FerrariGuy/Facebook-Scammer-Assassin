// --- START OF FILE pageDataExtractor.js ---

function extractPageContextData() {

    // --- START HELPER DEFINITIONS ---

    function decodeStringIfNeeded(str) {
        if (typeof str !== 'string') return str;
        if (str.includes('\\u')) {
            try { return JSON.parse(`"${str}"`); } catch (e) { return str; }
        }
        return str;
    }

    function extractUserVanity() {
        const url = window.location.href;
        // ** THE FIX IS HERE **
        const ignoreList = ['profile.php', 'people', 'groups', 'watch', 'events', 'marketplace', 'gaming', 'pages', 'stories', 'reels', 'photo.php', 'permalink.php', 'search'];
        const urlMatch = url.match(/facebook\.com\/([^/?#]+)/);
        if (urlMatch?.[1] && !ignoreList.includes(urlMatch[1].toLowerCase()) && !/^\d+$/.test(urlMatch[1])) return urlMatch[1];
        const metaElement = document.querySelector('meta[property="og:url"], link[rel="canonical"]');
        if (metaElement) {
            const content = metaElement.getAttribute('content') || metaElement.getAttribute('href');
            const vanityMatch = content?.match(/facebook\.com\/([^/?#]+)/);
            if (vanityMatch?.[1] && !ignoreList.includes(vanityMatch[1].toLowerCase()) && !/^\d+$/.test(vanityMatch[1])) return vanityMatch[1];
        }
        return null;
    }

    // ... The rest of the functions (extractUserID, extractUserName, etc.) are unchanged ...
    // ... I'm omitting them here for brevity, you only need to update extractUserVanity ...
    // ... Or, to be safe, I will provide the full file again.

    function extractUserID() {
        const url = window.location.href;
        const groupUserProfileMatch = url.match(/groups\/[^/]+\/user\/(\d+)/);
        if (groupUserProfileMatch?.[1]) return groupUserProfileMatch[1];
        let userIDMatch = url.match(/profile\.php\?id=(\d+)/);
        if (userIDMatch?.[1]) return userIDMatch[1];
        userIDMatch = url.match(/facebook\.com\/([^/?#]+)/);
        if (userIDMatch?.[1] && /^\d+$/.test(userIDMatch[1]) && !url.includes('profile.php') && !url.includes('/groups/')) return userIDMatch[1];
        userIDMatch = url.match(/[?&]fbid=(\d+)/);
        if (userIDMatch?.[1]) return userIDMatch[1];

        const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script');
        const idPatterns = [/"entity_id":"(\d+)"/, /"profile_id":(\d+)"/, /"ownerID":"(\d+)"/, /"userID":"(\d+)"/, /"actorID":"(\d+)"/, /"USER_ID":"(\d+)"/, /"id":"(\d+)"/];
        let bestPotentialId = null;

        for (const script of scripts) {
            const textContent = script.textContent;
            if (!textContent) continue;
            try {
                const jsonData = JSON.parse(textContent);
                const profileId = jsonData?.profile?.result?.id;
                if (profileId) return profileId;
                const routeUserId = jsonData?.routeResponse?.data?.user?.id;
                if (routeUserId) return routeUserId;
                 for (const key in jsonData) {
                     if (typeof key === 'string' && key.includes('ProfileComet') && jsonData[key]?.user?.id) return jsonData[key].user.id;
                      if (typeof jsonData[key] === 'object' && jsonData[key]?.constructor?.name === 'RequireDeferredReference' && jsonData[key]?.__bbox?.result?.data?.user?.id) return jsonData[key].__bbox.result.data.user.id;
                 }
            } catch(e) {}
            for (const pattern of idPatterns) {
                const idMatch = textContent.match(pattern);
                if (idMatch?.[1] && idMatch[1].length > 5 && /^\d+$/.test(idMatch[1])) {
                    if (pattern.source.includes('entity_id') || pattern.source.includes('profile_id') || pattern.source.includes('ownerID')) {
                          bestPotentialId = idMatch[1]; break;
                    } else if (!bestPotentialId) { bestPotentialId = idMatch[1]; }
                }
            }
        }
        if (bestPotentialId) return bestPotentialId;
        return null;
    }

    function extractUserName() {
        let name = null;
        const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs], script');
        for (const script of scripts) {
             const textContent = script.textContent; if (!textContent) continue;
             try {
                 const jsonData = JSON.parse(textContent);
                 let potentialJsonName = jsonData?.routeResponse?.data?.user?.name || jsonData?.profile?.result?.name;
                 if (potentialJsonName && typeof potentialJsonName === 'string' && potentialJsonName.length > 1) return potentialJsonName;
             } catch(e) {}
        }
        try {
            const titleFacebookPattern = /^(\(\d+\+?\)\s*)?Facebook$/i;
            const notificationPrefixPattern = /^\(\d+\+?\)\s*/;
            if (document.title) {
                let potentialNameFromTitle = document.title.split(/[|\-–]/)[0].trim().replace(notificationPrefixPattern, '').trim();
                if (potentialNameFromTitle.length > 1 && !titleFacebookPattern.test(potentialNameFromTitle)) name = potentialNameFromTitle;
            }
        } catch (e) {}
        if (!name) {
              try {
                 const h1Element = document.querySelector('[role="main"] h1');
                 if (h1Element?.textContent) {
                     const potentialName = h1Element.textContent.trim();
                     if (potentialName.length > 1 && potentialName.toLowerCase() !== 'facebook') name = potentialName;
                 }
             } catch (e) {}
        }
        return name;
    }

    function extractSessionInfo() {
        let fb_dtsg = null, jazoest = null, lsd = null, adminUserId = null;
        const dtsgInput = document.querySelector('input[name="fb_dtsg"]');
        if (dtsgInput?.value) fb_dtsg = dtsgInput.value;
        const jazoestInput = document.querySelector('input[name="jazoest"]');
        if (jazoestInput?.value) jazoest = jazoestInput.value;
        if (window.CurrentUserInitialData?.USER_ID) { adminUserId = window.CurrentUserInitialData.USER_ID; }
        else if (window.Env?.userID) { adminUserId = window.Env.userID; }

        const scripts = document.querySelectorAll('script');
        const dtsgPattern = /"DTSGInitialData"\s*,\s*\[\]\s*,\s*{\s*"token"\s*:\s*"([^"]+)"/;
        const lsdPattern = /"LSD"\s*,\s*\[\]\s*,\s*{\s*"token"\s*:\s*"([^"]+)"/;
        const adminIdPattern = /"USER_ID":"(\d+)"/;

        if (!fb_dtsg || !lsd || !adminUserId) {
            for (const script of scripts) {
                 const textContent = script.textContent; if (!textContent) continue;
                 if (!fb_dtsg && textContent.match(dtsgPattern)) fb_dtsg = textContent.match(dtsgPattern)[1];
                 if (!lsd && textContent.match(lsdPattern)) lsd = textContent.match(lsdPattern)[1];
                 if (!adminUserId && textContent.match(adminIdPattern)) adminUserId = textContent.match(adminIdPattern)[1];
                 if (fb_dtsg && lsd && adminUserId) break;
            }
        }
        if (!lsd && fb_dtsg) lsd = fb_dtsg;
        return { fb_dtsg, jazoest, lsd, adminUserId };
    }

    function extractCurrentGroupInfo() {
        const path = window.location.pathname;
        const groupUrlMatch = path.match(/^\/groups\/([^/?#]+)/);
        if (!groupUrlMatch) return null;
        let groupID = null, groupName = null;
        const potentialIdOrVanity = groupUrlMatch[1];
        if (/^\d{10,}$/.test(potentialIdOrVanity)) groupID = potentialIdOrVanity;

        if (!groupID) {
            const scripts = document.querySelectorAll('script[type="application/json"], script[data-sjs]');
            for (const script of scripts) {
                 const textContent = script.textContent; if (!textContent) continue;
                 try {
                    const jsonData = JSON.parse(textContent);
                    const groupData = jsonData?.routeResponse?.data?.group || jsonData?.data?.group;
                    if (groupData?.id && /^\d{10,}$/.test(groupData.id)) {
                         groupID = groupData.id; groupName = groupData.name || null; break;
                    }
                 } catch (e) {}
             }
        }
        if (!groupName) {
             try {
                 const h1Element = document.querySelector('[role="main"] h1');
                 if (h1Element?.textContent) groupName = h1Element.textContent.trim();
             } catch(e) {}
        }
        if (!groupID) return null;
        return { id: groupID, name: decodeStringIfNeeded(groupName), vanity: /^\d+$/.test(potentialIdOrVanity) ? null : potentialIdOrVanity };
    }

    const path = window.location.pathname;
    const isGroupPage = /^\/groups\//.test(path);
    const isGroupUserProfile = /^\/groups\/[^/]+\/user\//.test(path);
    const isGeneralGroupPage = isGroupPage && !isGroupUserProfile;
    let result = { type: 'error', message: 'Page type could not be determined' };
    try {
        if (isGroupUserProfile || path.includes('profile.php') || !isGroupPage) {
            const userInfo = { userID: extractUserID(), userName: decodeStringIfNeeded(extractUserName()), userVanity: extractUserVanity() };
            const sessionInfo = extractSessionInfo();
            if (userInfo.userID) {
                result = { type: 'user', data: { ...userInfo, ...sessionInfo } };
            } else {
                result = { type: 'other', data: { ...sessionInfo }, message: 'Could not find a valid user ID' };
            }
        } else if (isGeneralGroupPage) {
            const groupInfo = extractCurrentGroupInfo();
            const sessionInfo = extractSessionInfo();
            if (groupInfo) {
                result = { type: 'group', data: { ...groupInfo, ...sessionInfo } };
            } else {
                 result = { type: 'error', message: 'Could not extract group ID', data: { ...sessionInfo } };
            }
        }
    } catch (e) {
         result = { type: 'error', message: 'Internal script error' };
    }
    return result;
}
// --- END OF FILE pageDataExtractor.js ---