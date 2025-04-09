// --- START OF FILE popup.js ---
// --- Make currentPageData global in the popup's script scope ---
let currentPageData = null; // Store page data including tokens
let contextData = null; // Stores { type: 'user'/'group'/'error', data: {...} }
let activeTabId = null;

// --- Popup Initialization ---
document.addEventListener('DOMContentLoaded', function() {

    // --- Popup UI Update Function ---
    function updatePopupUI() {

        // --- DOM Elements --- (Define upfront for clarity)
        const infoTable = document.getElementById('infoTable');
        const profileActivityButton = document.getElementById('profileActivityButton');
        const blockSectionHeading = document.getElementById('blockScammerHeading');
        const groupTable = document.getElementById('groupTable');
        const shrugContainer = document.getElementById('shrugContainer');
        const copyButton = document.getElementById('copyButton');
        const addToOptionsButton = document.getElementById('addToOptionsButton');
        const userNameLabel = document.getElementById('labelName');
        const userIDLabel = document.getElementById('labelID');
        const userVanityLabel = document.getElementById('labelVanity');
        const userNameDisplay = document.getElementById('userName');
        const userIDDisplay = document.getElementById('userID');
        const userVanityDisplay = document.getElementById('userVanity');
        const groupTableBody = groupTable.querySelector('tbody');

        // Reset UI state
        infoTable.style.display = 'none';
        profileActivityButton.style.display = 'none';
        blockSectionHeading.style.display = 'none';
        groupTable.style.display = 'none';
        shrugContainer.style.display = 'none';
        addToOptionsButton.style.display = 'none';
        addToOptionsButton.disabled = false;
        addToOptionsButton.textContent = 'Add to Options';
        copyButton.disabled = true;
        // Ensure onclick handlers are cleared during reset if necessary
        profileActivityButton.onclick = null;
        addToOptionsButton.onclick = null;


        userNameLabel.textContent = 'N/A';
        userIDLabel.textContent = 'N/A';
        userVanityLabel.textContent = 'N/A';
        userNameDisplay.textContent = 'Loading...';
        userIDDisplay.textContent = 'Loading...';
        userVanityDisplay.textContent = 'Loading...';


        if (!contextData) {
            console.error("FSA: updatePopupUI called but contextData is null.");
            infoTable.style.display = 'table';
            userNameLabel.textContent = 'N/A';
            userIDLabel.textContent = 'N/A';
            userVanityLabel.textContent = 'N/A';
            userNameDisplay.textContent = 'Error Loading';
            userIDDisplay.textContent = 'Error Loading';
            userVanityDisplay.textContent = 'Error Loading';
            return;
        }

        console.log('FSA: Updating Popup UI with context:', contextData);

        // --- Handle different context types ---
        switch (contextData.type) {
            case 'user':
                { // Use block scope for clarity with const declarations
                    const userData = contextData.data;
                    console.log('FSA: Displaying User Data:', userData);

                    infoTable.style.display = 'table';
                    shrugContainer.style.display = 'none';

                    // Set correct labels for user context
                    userNameLabel.textContent = 'User Name:';
                    userIDLabel.textContent = 'User ID:';
                    userVanityLabel.textContent = 'User Vanity:';
                    userNameDisplay.textContent = userData.userName || 'Not Found';
                    userIDDisplay.textContent = userData.userID || 'Not Found';
                    userVanityDisplay.textContent = userData.userVanity || 'Not Found';

                    copyButton.disabled = (userData.userID === 'Not Found');

                    // --- UPDATED Profile Activity Button Logic ---
                    if (userData.userID && userData.userID !== 'Not Found') {
                        if (userData.userName && userData.userName !== 'Not Found') {
                            // --- Both ID and Name Found: Standard Button ---
                            let nameForSearch = userData.userName;
                            const accessoryNameMatch = nameForSearch.match(/\s+\([^)]+\)$/);
                            if (accessoryNameMatch) {
                                nameForSearch = nameForSearch.substring(0, accessoryNameMatch.index).trim();
                                console.log("FSA: Accessory name removed for search URL:", nameForSearch);
                            }
                            const profileActivityUrl = constructProfileActivityUrl(nameForSearch, userData.userID);

                            profileActivityButton.disabled = (profileActivityUrl === '#');
                            profileActivityButton.style.display = 'block';
                            profileActivityButton.textContent = "Profile's Public Activity";
                            profileActivityButton.title = "Search public posts by this user on Facebook.";
                            profileActivityButton.style.backgroundColor = '#1877f2'; // Standard blue
                            profileActivityButton.style.color = 'white';
                            profileActivityButton.onclick = () => { // Set standard action
                                if (profileActivityUrl !== '#') {
                                    chrome.tabs.create({ url: profileActivityUrl });
                                }
                            };
                        } else {
                            // --- ID Found, but Name Not Found: Reload Button ---
                            profileActivityButton.style.display = 'block';
                            profileActivityButton.textContent = 'Reload Page for Activity Link';
                            profileActivityButton.disabled = false; // Make it clickable
                            profileActivityButton.title = 'User name not found. Click here to reload the page.';
                            profileActivityButton.style.backgroundColor = 'coral'; // Your chosen color
                            profileActivityButton.style.color = 'white';
                            profileActivityButton.onclick = () => { // Set reload action
                                if (activeTabId) {
                                    chrome.tabs.reload(activeTabId);
                                    window.close(); // Optional
                                } else {
                                    console.error("FSA Popup: Cannot reload, activeTabId not found.");
                                    profileActivityButton.textContent = 'Error: Tab ID missing'; // Feedback
                                    profileActivityButton.disabled = true;
                                }
                            };
                        }
                    } else {
                        // --- User ID Not Found: Keep button hidden/disabled ---
                        profileActivityButton.style.display = 'none';
                        profileActivityButton.disabled = true;
                        profileActivityButton.onclick = null;
                    }
                    // --- End UPDATED Profile Activity Button Logic ---

                    // --- Configure Blocking Section ---
                    console.log(`FSA: Checking canBlock: UserID=${userData?.userID} (Found: ${!!(userData?.userID && userData.userID !== 'Not Found')}), AdminID=${userData?.adminUserId} (Found: ${!!(userData?.adminUserId && userData.adminUserId !== 'Not Found')}), DTSG=${!!(userData?.fb_dtsg && userData.fb_dtsg !== 'Not Found')})`);
                    const canBlock = userData &&
                                     userData.userID && userData.userID !== 'Not Found' &&
                                     userData.adminUserId && userData.adminUserId !== 'Not Found' &&
                                     userData.fb_dtsg && userData.fb_dtsg !== 'Not Found';

                    blockSectionHeading.style.display = 'block';
                    if (canBlock) {
                        blockSectionHeading.textContent = 'Block Scammer:';
                        groupTable.style.display = 'table';
                        if (groupTableBody) {
                            groupTableBody.innerHTML = '';
                            chrome.storage.sync.get('groups', function(storageData) {
                                if (storageData.groups && Array.isArray(storageData.groups)) {
                                    storageData.groups.forEach((group) => {
                                        addGroupRow(group.groupName, group.groupNName, group.groupID, group.checked, canBlock, userData);
                                    });
                                }
                            });
                        } else { console.error("FSA: Group table body not found!"); }
                    } else {
                        blockSectionHeading.textContent = 'Block Scammer (Data Missing!)';
                        groupTable.style.display = 'none';
                        console.warn("FSA: Missing critical data for blocking (post-check).", userData);
                    }
                    // --- End Configure Blocking Section ---
                } // End block scope for case 'user'
                break; // Correctly placed break for case 'user'

            case 'group':
                { // Use block scope
                    const groupData = contextData.data;
                    console.log('FSA: Displaying Group Data:', groupData);

                    // Get button reference ONCE here for efficiency - ALREADY DEFINED AT TOP
                    // const addToOptionsButton = document.getElementById('addToOptionsButton');

                    infoTable.style.display = 'table';
                    shrugContainer.style.display = 'none';

                    // *** UNCOMMENT THESE LABELS ***
                    userNameLabel.textContent = 'Group Name:';
                    userIDLabel.textContent = 'Group ID:';
                    userVanityLabel.textContent = 'Group Vanity:';
                    // *** END UNCOMMENT ***

                    userNameDisplay.textContent = groupData.name || 'Not Found';
                    userIDDisplay.textContent = groupData.id || 'Not Found';
                    userVanityDisplay.textContent = groupData.vanity || 'N/A';

                    copyButton.disabled = (groupData.id === 'Not Found');

                    // --- UPDATED "Add to Options" Button Logic using .onclick ---
                    if (groupData.id && groupData.id !== 'Not Found') {
                        if (groupData.name && groupData.name !== 'Not Found') {
                            // --- Name FOUND - Standard Add/In Options Button ---
                            addToOptionsButton.style.display = 'inline-block';
                            addToOptionsButton.textContent = 'Add to Options'; // Set default before storage check
                            addToOptionsButton.disabled = false;
                            addToOptionsButton.style.backgroundColor = '#ffc107';
                            addToOptionsButton.style.color = 'black';
                            addToOptionsButton.title = 'Add this group to your configuration list.';
                            addToOptionsButton.onclick = handleAddToOptions; // Assign "add" action

                            chrome.storage.sync.get('groups', function(storageData) {
                                if (chrome.runtime.lastError) {
                                    console.error("FSA Popup: Error checking storage:", chrome.runtime.lastError);
                                    addToOptionsButton.textContent = 'Read Error';
                                    addToOptionsButton.disabled = true;
                                    addToOptionsButton.style.backgroundColor = '#dc3545';
                                    addToOptionsButton.style.color = 'white';
                                    addToOptionsButton.onclick = null;
                                    return;
                                }
                                if (storageData.groups && Array.isArray(storageData.groups)) {
                                    const exists = storageData.groups.some(g => g.groupID === groupData.id);
                                    if (exists) {
                                        addToOptionsButton.textContent = 'In Options';
                                        addToOptionsButton.disabled = true;
                                        addToOptionsButton.style.backgroundColor = '#6c757d';
                                        addToOptionsButton.style.color = 'white';
                                        addToOptionsButton.title = 'This group is already in your Options list.';
                                        addToOptionsButton.onclick = null; // No action if already added
                                    }
                                     // If not exists, the defaults + handleAddToOptions onclick remain
                                }
                            });
                        } else {
                            // --- Name NOT FOUND (but ID was found): Reload Button ---
                            addToOptionsButton.style.display = 'inline-block';
                            addToOptionsButton.textContent = 'Reload Page to Add';
                            addToOptionsButton.disabled = false; // Make it clickable
                            addToOptionsButton.title = 'Group name not found. Click here to reload the page.';
                            addToOptionsButton.style.backgroundColor = 'coral'; // Your chosen color
                            addToOptionsButton.style.color = 'white';
                            addToOptionsButton.onclick = () => { // Assign "reload" action
                                if (activeTabId) {
                                    chrome.tabs.reload(activeTabId);
                                    window.close(); // Optional
                                } else {
                                    console.error("FSA Popup: Cannot reload, activeTabId not found.");
                                    addToOptionsButton.textContent = 'Error Reloading';
                                    addToOptionsButton.disabled = true;
                                }
                            };
                        }
                    } else {
                        // ID Not Found - Hide button entirely
                        addToOptionsButton.style.display = 'none';
                        addToOptionsButton.disabled = true;
                        addToOptionsButton.onclick = null;
                    }
                    // --- End UPDATED "Add to Options" Button Logic ---
                } // End block scope for case 'group'
                break; // Correctly placed break for case 'group'


            case 'group_subpage':
                console.log('FSA: Displaying Group Sub-Page state.');
                infoTable.style.display = 'none';
                shrugContainer.style.display = 'block';
                copyButton.disabled = true;
                blockSectionHeading.style.display = 'block';
                blockSectionHeading.textContent = 'N/A (Group Sub-Page)';
                break; // End case 'group_subpage'

            case 'error':
            default: // Treat unknown types and errors similarly for UI
                { // Use block scope
                    const message = contextData?.message || 'Unknown Error';
                    console.info("FSA: Displaying Error/Unknown state:", message, contextData);
                    infoTable.style.display = 'none';
                    shrugContainer.style.display = 'block';
                    copyButton.disabled = true;
                    blockSectionHeading.style.display = 'block';
                    blockSectionHeading.textContent = message;
                    addToOptionsButton.style.display = 'none'; // Ensure hidden here too
                }
                break; // End case 'error'/default

        } // End switch
    } // End updatePopupUI


    // --- Initial Load ---
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs?.[0]?.id || !tabs[0].url || (!tabs[0].url.startsWith('https://www.facebook.com/') && !tabs[0].url.startsWith('https://m.facebook.com/') && !tabs[0].url.startsWith('https://mbasic.facebook.com/'))) {
            console.info("FSA: Not a valid Facebook tab or could not get active tab info.", tabs);
            contextData = { type: 'error', message: 'Not on Facebook' };
            updatePopupUI();
            // ... (immediate UI update for non-FB) ...
            return;
        }
        activeTabId = tabs[0].id;
        console.log("FSA: Active Tab ID:", activeTabId, "URL:", tabs[0].url);

        if (typeof extractPageContextData !== 'function') {
            // ... (Fatal error check) ...
            return;
        }

        console.log("FSA Popup: Attempting to execute extractPageContextData on tab:", activeTabId);
        chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: extractPageContextData
        }, function(results) {
            if (chrome.runtime.lastError || !results?.[0]?.result) {
                console.error("FSA: Error executing script or getting results:", chrome.runtime.lastError || "No result found");
                contextData = { type: 'error', message: 'Script execution failed' };
            } else {
                contextData = results[0].result;
                console.log('FSA: Acquired Page Context Data:', contextData);
            }
            updatePopupUI(); // Update UI based on the received contextData
        });
    }); // End chrome.tabs.query


    // --- Copy Button Event Listener ---
    copyButton.addEventListener('click', function() {
        if (!contextData || !contextData.data) {
            // Use integrated feedback instead of alert
            copyButton.textContent = 'Data N/A';
            setTimeout(() => { copyButton.textContent = 'Copy Data'; }, 1500);
            return;
        }

        let copyText = '';
        if (contextData.type === 'user') {
            // ... (construct user copy text) ...
             const currentDate = new Date();
             const options = { year: 'numeric', month: 'short', day: '2-digit' };
             const formattedDate = currentDate.toLocaleDateString('en-US', options);
             const userData = contextData.data;
             const userNameFull = userData.userName || 'Not Found';
             let nameForSearchUrl = userData.userName || 'Not Found';
             const accessoryNameMatch = nameForSearchUrl.match(/\s+\([^)]+\)$/);
             if (accessoryNameMatch && nameForSearchUrl !== 'Not Found') {
                 nameForSearchUrl = nameForSearchUrl.substring(0, accessoryNameMatch.index).trim();
             }
             const userID = userData.userID || 'Not Found';
             const userVanity = userData.userVanity || 'Not Found';
             const profileLink = (userID !== 'Not Found') ? `https://www.facebook.com/profile.php?id=${userID}` : 'Not Available';
             const profileActivityUrl = (userID !== 'Not Found' && nameForSearchUrl !== 'Not Found') ? constructProfileActivityUrl(nameForSearchUrl, userID) : 'Not Available';
             copyText = `Date: ${formattedDate}\nUser Name: ${userNameFull}\nUser ID: ${userID}\nUser Vanity: ${userVanity}\nProfile Link: ${profileLink}\nProfile's Public Activity: ${profileActivityUrl}`;

        } else if (contextData.type === 'group') {
            // ... (construct group copy text) ...
            const groupData = contextData.data;
            const groupName = groupData.name || 'Not Found';
            const groupID = groupData.id || 'Not Found';
            const groupVanity = groupData.vanity || 'Not Found';
            const groupUrl = (groupID !== 'Not Found') ? `https://www.facebook.com/groups/${groupID}/` : 'Not Available';
            const vanityText = (groupVanity !== 'Not Found' && groupVanity !== groupID) ? `\nGroup Vanity: ${groupVanity}` : '';
            copyText = `Group Name: ${groupName}\nGroup ID: ${groupID}${vanityText}\nGroup URL: ${groupUrl}`;

        } else {
             copyButton.textContent = 'Data N/A';
             setTimeout(() => { copyButton.textContent = 'Copy Data'; }, 1500);
             return;
        }

        copyToClipboard(copyText);
        // Consider changing text instead of flash
        const originalText = copyButton.textContent;
        copyButton.textContent = 'Copied!';
        setTimeout(() => { copyButton.textContent = originalText; }, 1000);
        // copyButton.classList.add('copyButtonFlash');
        // setTimeout(() => copyButton.classList.remove('copyButtonFlash'), 500);
    });


    // --- Message Listener for Block Results ---
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "blockResult") {
            console.log("FSA: Received block result message:", message);
            // *** FIX QuerySelector String ***
            const button = document.querySelector(`.blockScammerButton[data-group-id="${message.groupId}"]`);
            if (button) {
                button.disabled = true;
                if (message.success) {
                    button.textContent = 'Blocked!';
                    button.style.backgroundColor = '#28a745'; // Green
                    button.style.color = 'white';
                    button.title = 'User successfully blocked from this group.';
                } else {
                    button.textContent = 'Block Failed';
                    button.style.backgroundColor = '#dc3545'; // Red
                    button.style.color = 'white';
                    // *** FIX Template Literals ***
                    console.error(`FSA: Block failed for group ${message.groupId}, user ${message.userId}. Error: ${message.error}`);
                    button.title = `Error: ${message.error || 'Unknown error during block execution.'}`;
                }
            } else {
                // *** FIX Template Literal ***
                console.warn(`FSA: Could not find button for groupId ${message.groupId} to update status.`);
            }
        }
        else if (message.action === 'refreshPopup') {
            console.log("FSA: Received refreshPopup message. Reloading data...");
            if (activeTabId) {
                console.log("FSA Popup: Attempting to re-execute script for refresh on tab:", activeTabId);
                // *** Check if getPageData exists - likely should be extractPageContextData ***
                 chrome.scripting.executeScript({
                   target: { tabId: activeTabId },
                   // func: getPageData // << Likely should be extractPageContextData
                   func: extractPageContextData
                 }, function(results) {
                   if (chrome.runtime.lastError || !results?.[0]?.result) {
                     console.error("FSA: Error re-executing script for refresh:", chrome.runtime.lastError || "No result found");
                     // currentPageData = null; // We use contextData now
                     contextData = null;
                   } else {
                      // currentPageData = results[0].result; // We use contextData now
                      contextData = results[0].result;
                      console.log('FSA: Re-acquired Page Data after refresh request:', contextData);
                   }
                   updatePopupUI();
                 });
            } else {
                console.warn("FSA: Cannot refresh popup data, activeTabId not available.");
            }
        }
        // It's generally safer to return true if you MIGHT respond asynchronously,
        // even if not all message types do. Let's keep it.
        return true;
    });

}); // End DOMContentLoaded


// --- Helper Functions ---

// --- NEW Handler Function for Adding Group to Options ---
function handleAddToOptions() {
    // Find the button reference again INSIDE the handler scope
     const addToOptionsButton = document.getElementById('addToOptionsButton'); // <<< Ensure button ref is valid here

    // Basic check
    if (contextData?.type !== 'group' || !contextData?.data?.id || contextData.data.id === 'Not Found' || !contextData?.data?.name || contextData.data.name === 'Not Found') {
        console.error("FSA Popup: handleAddToOptions called in invalid state.");
        if(addToOptionsButton) { // Check if button exists before modifying
            addToOptionsButton.textContent = 'Error: Invalid State';
            addToOptionsButton.style.backgroundColor = '#dc3545';
            addToOptionsButton.disabled = true;
        }
        return;
    }

    const groupToAdd = contextData.data;
    const newGroupEntry = {
        groupName: groupToAdd.name,
        groupNName: "",
        groupID: groupToAdd.id,
        groupURL: `https://www.facebook.com/groups/${groupToAdd.id}/`,
        checked: true,
        role: "admin"
    };

    console.log("FSA Popup: Attempting to add group to options:", newGroupEntry);

    // Ensure button exists before modifying
    if (!addToOptionsButton) {
        console.error("FSA Popup: addToOptionsButton not found in handleAddToOptions scope!");
        return;
    }

    addToOptionsButton.disabled = true;
    addToOptionsButton.textContent = 'Adding...';
    addToOptionsButton.style.backgroundColor = '#6c757d';
    addToOptionsButton.style.color = 'white';


    chrome.storage.sync.get('groups', function(data) {
         // Ensure button ref is STILL valid within async callback scope
         const currentAddToOptionsButton = document.getElementById('addToOptionsButton');
         if (!currentAddToOptionsButton) return; // Exit if popup closed or button removed

        if (chrome.runtime.lastError) {
            console.error("FSA Popup: Storage get error:", chrome.runtime.lastError);
            currentAddToOptionsButton.textContent = 'Read Error';
            currentAddToOptionsButton.style.backgroundColor = '#dc3545';
            currentAddToOptionsButton.title = "Error reading groups: " + chrome.runtime.lastError.message;
            return;
        }

        const existingGroups = data.groups || [];
        if (!Array.isArray(existingGroups)) {
            console.error("FSA Popup: Stored groups data is not an array:", existingGroups);
            currentAddToOptionsButton.textContent = 'Storage Corrupt';
            currentAddToOptionsButton.style.backgroundColor = '#dc3545';
            currentAddToOptionsButton.title = "Error: Stored group configuration is corrupted.";
            return;
        }

        const alreadyExists = existingGroups.some(g => g.groupID === newGroupEntry.groupID);

        if (alreadyExists) {
            console.log("FSA Popup: Group already exists (handleAddToOptions unexpected state).");
            currentAddToOptionsButton.textContent = 'In Options';
            currentAddToOptionsButton.style.backgroundColor = '#6c757d';
            currentAddToOptionsButton.style.color = 'white';
            currentAddToOptionsButton.title = "This group is already in your Options list.";
        } else {
            existingGroups.push(newGroupEntry);
            chrome.storage.sync.set({ groups: existingGroups }, function() {
                 // Ensure button ref is STILL valid within nested async callback
                 const finalAddToOptionsButton = document.getElementById('addToOptionsButton');
                 if (!finalAddToOptionsButton) return; // Exit if popup closed

                if (chrome.runtime.lastError) {
                    console.error("FSA Popup: Storage set error:", chrome.runtime.lastError);
                    finalAddToOptionsButton.textContent = 'Save Error';
                    finalAddToOptionsButton.style.backgroundColor = '#dc3545';
                    finalAddToOptionsButton.title = "Error saving: " + chrome.runtime.lastError.message;
                } else {
                    console.log("FSA Popup: Group successfully added to options.");
                    finalAddToOptionsButton.textContent = 'Added!';
                    finalAddToOptionsButton.style.backgroundColor = '#28a745';
                    finalAddToOptionsButton.title = `Group "${newGroupEntry.groupName}" added to options.`;
                    chrome.runtime.sendMessage({ action: 'optionsUpdated' }).catch(e => {});
                }
                // Button remains disabled after action
                finalAddToOptionsButton.disabled = true;
            });
        }
    });
}
// --- End Handler Function ---


// --- START of Corrected constructProfileActivityUrl function (Using v1.x Style) ---
function constructProfileActivityUrl(userName, userID) {
    if (!userName || userName === 'Not Found' || !userID || userID === 'Not Found') {
        console.warn("FSA: Cannot construct activity URL, missing userName or userID.");
        return '#';
    }

    const encodedUserName = encodeURIComponent(userName);

    // *** FIX Template Literals and Escaping ***
    const filterJsonString = `{"name":"author","args":"${userID}"}`;
    // Escaping for JSON within JSON: only need to escape backslash and double quote
    const escapedFilterJsonString = filterJsonString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const filterParamValue = `{"rp_author:0":"${escapedFilterJsonString}"}`;

    let encodedFilterString = '';
    try {
        encodedFilterString = btoa(filterParamValue);
    } catch (e) {
        console.error("FSA: Error Base64 encoding filter string:", e, "Input:", filterParamValue);
        return '#';
    }

    // *** FIX Template Literal ***
    const url = `https://www.facebook.com/search/posts/?q=${encodedUserName}&filters=${encodedFilterString}`;

    console.log("FSA: Generated Profile Activity URL (v1.x style):", url);
    return url;
}
// --- END of Corrected constructProfileActivityUrl function ---


// --- addGroupRow --- (Looks OK from previous review)
function addGroupRow(groupName, groupNName, groupID, checked, canBlock, userData) {
    if (!checked) { return; }

    const groupTableBody = document.querySelector('#groupTable tbody');
    if (!groupTableBody) { console.error("FSA: Cannot add group row, tbody not found."); return; }

    console.log(`FSA: Adding group row for ${groupNName || groupName} (ID: ${groupID}), checked=${checked}, canBlock=${canBlock}`);

    const newRow = document.createElement('tr');
    const nicknameCell = document.createElement('td');
    const displayName = groupNName || groupName;
    const constructedGroupUrl = `https://www.facebook.com/groups/${groupID}/`;
    const link = document.createElement('a');
    link.href = constructedGroupUrl;
    link.textContent = displayName;
    link.title = `Open group: ${groupName}` + (groupNName ? ` (Nickname: ${groupNName})` : '');
    link.target = "_blank";
    link.style.color = 'inherit';
    link.style.textDecoration = 'underline';
    link.style.cursor = 'pointer';
    link.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: constructedGroupUrl });
    });
    nicknameCell.appendChild(link);
    newRow.appendChild(nicknameCell);

    const buttonCell = document.createElement('td');
    const blockScammerButton = document.createElement('button');
    blockScammerButton.textContent = 'Block';
    blockScammerButton.className = 'blockScammerButton';
    blockScammerButton.dataset.groupId = groupID;
    blockScammerButton.disabled = !canBlock;
    blockScammerButton.title = canBlock ? `Block user from group ${displayName}` : "Blocking disabled (missing required page data)";

    blockScammerButton.addEventListener('click', function(event) {
        console.log(`FSA Popup: Click detected for GroupID: ${event.target.dataset.groupId}`);
        console.log("FSA Popup: UserData available in listener:", userData);

        if (!userData || !userData.userID || userData.userID === 'Not Found' ||
            !userData.adminUserId || userData.adminUserId === 'Not Found' ||
            !userData.fb_dtsg || userData.fb_dtsg === 'Not Found') {
            // Use integrated feedback? For now, alert is clear for blocking failure.
            alert('Cannot block: Missing required user or session data. Reload the profile page and the popup.');
            console.error("FSA Popup: Block attempt failed in listener due to missing userData fields.", userData);
            return;
        }
        if (!activeTabId) {
             alert('Cannot block: Active tab information is missing.');
             console.error("FSA Popup: Block attempt failed, activeTabId missing.");
             return;
        }

        const targetUserID = userData.userID;
        const clickedGroupID = event.target.dataset.groupId;
        const adminUserId = userData.adminUserId;
        const fbDtsg = userData.fb_dtsg;
        const jazoest = userData.jazoest;
        const lsd = userData.lsd;

        console.log(`FSA: Initiating block request - User: ${targetUserID}, Group: ${clickedGroupID}, Admin: ${adminUserId}, HasDTSG: ${!!(fbDtsg && fbDtsg !== 'Not Found')}, HasLSD: ${!!(lsd && lsd !== 'Not Found')}`);
        event.target.textContent = 'Blocking...';
        event.target.disabled = true;

        chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: executeGraphQLBlock,
            args: [targetUserID, clickedGroupID, fbDtsg, jazoest, lsd, adminUserId]
        }, (injectionResults) => {
             if (chrome.runtime.lastError) {
                console.error(`FSA: Error injecting graphQLBlocker script: ${chrome.runtime.lastError.message}`);
                // Update button state to show injection failure
                event.target.textContent = 'Inject Fail';
                event.target.style.backgroundColor = '#dc3545'; // Red
                event.target.style.color = 'white';
                event.target.title = `Error injecting script: ${chrome.runtime.lastError.message}`;
                // Keep disabled
            } else {
                console.log("FSA: graphQLBlocker script injected successfully (or no immediate error). Waiting for blockResult message.");
                // Assume success for now, wait for message to confirm/deny
            }
        });
    });

    buttonCell.appendChild(blockScammerButton);
    newRow.appendChild(buttonCell);

    groupTableBody.appendChild(newRow);
} // --- End of addGroupRow ---


// --- copyToClipboard --- (Looks OK)
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('FSA: Text copied to clipboard');
    }).catch(err => {
        console.error('FSA: Failed to copy text using navigator.clipboard: ', err);
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed'; textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus(); textarea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (successful) { console.log('FSA: Text copied using fallback execCommand'); }
            else { console.error('FSA: Fallback execCommand copying failed'); /* alert removed */ }
         } catch (e) {
             console.error('FSA: Error during fallback execCommand copying:', e);
             /* alert removed */
         }
    });
}
// --- END OF FILE popup.js ---