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
    const addToOptionsButton = document.getElementById('addToOptionsButton'); // <-- Get new button
    const userNameLabel = document.getElementById('labelName');
    const userIDLabel = document.getElementById('labelID');
    const userVanityLabel = document.getElementById('labelVanity');
    const userNameDisplay = document.getElementById('userName');
    const userIDDisplay = document.getElementById('userID');
    const userVanityDisplay = document.getElementById('userVanity');
    const groupTableBody = groupTable.querySelector('tbody');
  
      // Reset UI state
        infoTable.style.display = 'none'; // Hide by default
        profileActivityButton.style.display = 'none';
        blockSectionHeading.style.display = 'none';
        groupTable.style.display = 'none';
        shrugContainer.style.display = 'none';  //<-- Hide shrug icon container on reset
        addToOptionsButton.style.display = 'none'; // <-- Hide add button on reset
        addToOptionsButton.disabled = false; // Re-enable if previously disabled
        addToOptionsButton.textContent = 'Add to Options'; // Reset text
        copyButton.disabled = true;
    
      //infoTable.style.display = 'table'; // <-- Default to visible
      //profileActivityButton.style.display = 'none'; // Hide by default
      //blockSectionHeading.style.display = 'none';
      //groupTable.style.display = 'none';
      //shrugContainer.style.display = 'none'; // <-- Hide shrug icon container on reset
      //copyButton.disabled = true;
      
      userNameLabel.textContent = 'N/A'; // Default labels
      userIDLabel.textContent = 'N/A';
      userVanityLabel.textContent = 'N/A';
      userNameDisplay.textContent = 'Loading...';
      userIDDisplay.textContent = 'Loading...';
      userVanityDisplay.textContent = 'Loading...';


      if (!contextData) {
          console.error("FSA: updatePopupUI called but contextData is null.");
          
          infoTable.style.display = 'table'; // Keep table visible for loading/error text
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
            const userData = contextData.data;
            console.log('FSA: Displaying User Data:', userData);

            infoTable.style.display = 'table'; // Show table
            shrugContainer.style.display = 'none'; // Hide shrug

            userNameLabel.textContent = 'User Name:';
            userIDLabel.textContent = 'User ID:';
            userVanityLabel.textContent = 'User Vanity:';
            userNameDisplay.textContent = userData.userName || 'Not Found';
            userIDDisplay.textContent = userData.userID || 'Not Found';
            userVanityDisplay.textContent = userData.userVanity || 'Not Found';
            
            
            copyButton.disabled = (userData.userID === 'Not Found');
            if (userData.userID !== 'Not Found' && userData.userName !== 'Not Found') {
                // --- Clean name specifically for the search URL ---
                let nameForSearch = userData.userName;
                const accessoryNameMatch = nameForSearch.match(/\s+\([^)]+\)$/); // Matches " (Some Text)" at the end
                if (accessoryNameMatch) {
                    nameForSearch = nameForSearch.substring(0, accessoryNameMatch.index).trim();
                    console.log("FSA: Accessory name removed for search URL:", nameForSearch);
                }
                // --- Use cleaned name for URL ---
                const profileActivityUrl = constructProfileActivityUrl(nameForSearch, userData.userID);

                profileActivityButton.onclick = () => { if (profileActivityUrl !== '#') chrome.tabs.create({ url: profileActivityUrl }); };
                profileActivityButton.disabled = (profileActivityUrl === '#');
                profileActivityButton.style.display = 'block';
            } else {
                profileActivityButton.disabled = true;
            }

          // Configure Blocking Section
          console.log(`FSA: Checking canBlock: UserID=${userData?.userID} (Found: ${!!(userData?.userID && userData.userID !== 'Not Found')}), AdminID=${userData?.adminUserId} (Found: ${!!(userData?.adminUserId && userData.adminUserId !== 'Not Found')}), DTSG=${userData?.fb_dtsg} (Found: ${!!(userData?.fb_dtsg && userData.fb_dtsg !== 'Not Found')})`);
            const canBlock = userData && // Add check for userData object itself
                             userData.userID && userData.userID !== 'Not Found' &&
                             userData.adminUserId && userData.adminUserId !== 'Not Found' &&
                             userData.fb_dtsg && userData.fb_dtsg !== 'Not Found';

          blockSectionHeading.style.display = 'block'; // Always show heading in user mode
            if (canBlock) {
                blockSectionHeading.textContent = 'Block Scammer:';
                groupTable.style.display = 'table';
                if (groupTableBody) {
                    groupTableBody.innerHTML = '';
                    chrome.storage.sync.get('groups', function(storageData) {
                        // ... load groups logic ...
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
                console.warn("FSA: Missing critical data for blocking (post-check).", userData); // Log again here
            }
            break; // End case 'user'

        case 'group':
            const groupData = contextData.data;
            console.log('FSA: Displaying Group Data:', groupData);

            infoTable.style.display = 'table'; // Show table
            shrugContainer.style.display = 'none'; // Hide shrug

            userNameLabel.textContent = 'Group Name:';
            userIDLabel.textContent = 'Group ID:';
            userVanityLabel.textContent = 'Group Vanity:';
            userNameDisplay.textContent = groupData.name || 'Not Found';
            userIDDisplay.textContent = groupData.id || 'Not Found';
            userVanityDisplay.textContent = groupData.vanity || 'N/A';

            copyButton.disabled = (groupData.id === 'Not Found');
            // Ensure others are hidden (already done by reset)
            // profileActivityButton.style.display = 'none';
            // blockSectionHeading.style.display = 'none';
            // groupTable.style.display = 'none';
              // --- Show and Configure "Add to Options" Button ---
              if (groupData.id && groupData.id !== 'Not Found') {
                  addToOptionsButton.style.display = 'inline-block'; // Show the button
                  // Check if already added (optional visual cue)
                  chrome.storage.sync.get('groups', function(storageData) {
                       if (storageData.groups && Array.isArray(storageData.groups)) {
                           const exists = storageData.groups.some(g => g.groupID === groupData.id);
                           if (exists) {
                               addToOptionsButton.textContent = 'In Options';
                               addToOptionsButton.disabled = true;
                               addToOptionsButton.style.backgroundColor = '#6c757d'; // Grey out if exists
                           } else {
                                // Reset style if it doesn't exist (might have been greyed out previously)
                               addToOptionsButton.textContent = 'Add to Options';
                               addToOptionsButton.disabled = false;
                               addToOptionsButton.style.backgroundColor = '#ffc107'; // Default yellow/orange
                           }
                       }
                  });
              } else {
                  addToOptionsButton.style.display = 'none'; // Hide if no valid group ID detected
              }
              // --- End "Add to Options" Button Logic ---            
            break; // End case 'group'

        case 'group_subpage':
            console.log('FSA: Displaying Group Sub-Page state.');
            infoTable.style.display = 'none'; // Hide table
            shrugContainer.style.display = 'block'; // Show shrug
            // Ensure others are hidden (already done by reset)
            copyButton.disabled = true;
            blockSectionHeading.style.display = 'block'; // Show heading
            blockSectionHeading.textContent = 'N/A (Group Sub-Page)'; // Set specific heading text
            break; // End case 'group_subpage'        

        case 'error':
        default: // Treat unknown types and errors similarly for UI
             const message = contextData?.message || 'Unknown Error';
             console.error("FSA: Displaying Error/Unknown state:", message, contextData);
             infoTable.style.display = 'none'; // Hide table
             shrugContainer.style.display = 'block'; // Show shrug
             copyButton.disabled = true;
             blockSectionHeading.style.display = 'block'; // Show heading
             blockSectionHeading.textContent = message; // Display the error/state message
             addToOptionsButton.style.display = 'none';
             // Ensure others are hidden (already done by reset)
             break; // End case 'error'/default

    } // End switch
} // End updatePopupUI
  
  
  // --- Initial Load ---
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs?.[0]?.id || !tabs[0].url || (!tabs[0].url.startsWith('https://www.facebook.com/') && !tabs[0].url.startsWith('https://m.facebook.com/') && !tabs[0].url.startsWith('https://mbasic.facebook.com/'))) {
          console.warn("FSA: Not a valid Facebook tab or could not get active tab info.", tabs);
          contextData = { type: 'error', message: 'Not on Facebook' }; // Set specific error
          updatePopupUI();
          // Update UI immediately for non-FB pages
          userNameLabel.textContent = 'N/A';
          userIDLabel.textContent = 'N/A';
          userVanityLabel.textContent = 'N/A';
          userNameDisplay.textContent = 'N/A';
          userIDDisplay.textContent = 'N/A';
          userVanityDisplay.textContent = 'N/A';
          blockSectionHeading.textContent = 'Block Scammer (Not on FB)';
          copyButton.disabled = true;
          profileActivityButton.disabled = true;
          profileActivityButton.style.display = 'none';
          blockSectionHeading.style.display = 'block'; // Show heading
          groupTable.style.display = 'none';
          return;
      }
      activeTabId = tabs[0].id;
      console.log("FSA: Active Tab ID:", activeTabId, "URL:", tabs[0].url);
      
      // --- ADD THIS CHECK ---
      if (typeof extractPageContextData !== 'function') {
          console.error("FSA FATAL: extractPageContextData function is not defined globally when needed!");
          alert("Critical Error: Extraction function not loaded. Check extension console.");
          // Update UI to show a fatal error state
          userNameDisplay.textContent = 'FATAL ERROR';
          userIDDisplay.textContent = 'Function missing';
          // ... disable buttons etc. ...
          return; // Stop execution
      }
      // --- END OF CHECK ---

      console.log("FSA Popup: Attempting to execute extractPageContextData on tab:", activeTabId);
      chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          func: extractPageContextData // Use the new dispatcher function
      }, function(results) {
          if (chrome.runtime.lastError || !results?.[0]?.result) {
              console.error("FSA: Error executing script or getting results:", chrome.runtime.lastError || "No result found");
              contextData = { type: 'error', message: 'Script execution failed' };
          } else {
              contextData = results[0].result; // Store the object { type: '...', data: {...} }
              console.log('FSA: Acquired Page Context Data:', contextData);
          }
          updatePopupUI(); // Update UI based on the received contextData
      });
  }); // End chrome.tabs.query

  // --- Copy Button Event Listener ---
copyButton.addEventListener('click', function() {
    if (!contextData || !contextData.data) {
        alert("Data not loaded yet.");
        return;
    }

    let copyText = '';
    // --- No need for date here if it's only for user profiles ---
    // const currentDate = new Date();
    // const options = { year: 'numeric', month: 'short', day: '2-digit' };
    // const formattedDate = currentDate.toLocaleDateString('en-US', options);

    if (contextData.type === 'user') {
        const currentDate = new Date();
        const options = { year: 'numeric', month: 'short', day: '2-digit' };
        const formattedDate = currentDate.toLocaleDateString('en-US', options);
        const userData = contextData.data;
        // --- Get FULL user name for display in copy text ---
        const userNameFull = userData.userName || 'Not Found'; // Keep the original name

        //const userName = userData.userName || 'Not Found';
        
        // --- Clean name ONLY for the activity URL generation ---
        let nameForSearchUrl = userData.userName || 'Not Found';
        const accessoryNameMatch = nameForSearchUrl.match(/\s+\([^)]+\)$/);
        if (accessoryNameMatch && nameForSearchUrl !== 'Not Found') {
            nameForSearchUrl = nameForSearchUrl.substring(0, accessoryNameMatch.index).trim();
            console.log("FSA: Accessory name removed for generating Activity URL in copy text:", nameForSearchUrl);
        }
         // --- End name cleaning for URL ---                
        
        const userID = userData.userID || 'Not Found';
        const userVanity = userData.userVanity || 'Not Found';
        const profileLink = (userID !== 'Not Found') ? `https://www.facebook.com/profile.php?id=${userID}` : 'Not Available';
        // --- Generate activity URL using the CLEANED name ---
        const profileActivityUrl = (userID !== 'Not Found' && nameForSearchUrl !== 'Not Found') ? constructProfileActivityUrl(nameForSearchUrl, userID) : 'Not Available';
        // --- Construct copy text using FULL name for display, but URL generated with CLEANED name ---
        copyText = `Date: ${formattedDate}\nUser Name: ${userNameFull}\nUser ID: ${userID}\nUser Vanity: ${userVanity}\nProfile Link: ${profileLink}\nProfile's Public Activity: ${profileActivityUrl}`;

    } else if (contextData.type === 'group') {
        const groupData = contextData.data;
        const groupName = groupData.name || 'Not Found';
        const groupID = groupData.id || 'Not Found';
        const groupVanity = groupData.vanity || 'Not Found';
        const groupUrl = (groupID !== 'Not Found') ? `https://www.facebook.com/groups/${groupID}/` : 'Not Available';
        const vanityText = (groupVanity !== 'Not Found' && groupVanity !== groupID) ? `\nGroup Vanity: ${groupVanity}` : '';
        // --- Exclude Date from Group copy text ---
        copyText = `Group Name: ${groupName}\nGroup ID: ${groupID}${vanityText}\nGroup URL: ${groupUrl}`;
        // --- End Exclude Date ---

    } else {
        alert("Cannot copy data, unknown context type.");
        return;
    }

    copyToClipboard(copyText);
    copyButton.classList.add('copyButtonFlash');
    setTimeout(() => copyButton.classList.remove('copyButtonFlash'), 500);
});
  
    // --- NEW "Add to Options" Button Event Listener ---
  addToOptionsButton.addEventListener('click', function() {
      if (contextData?.type !== 'group' || !contextData?.data?.id || contextData.data.id === 'Not Found') {
          console.error("Add to Options clicked but no valid group data available.");
          alert("Cannot add group: Invalid group data detected.");
          return;
      }

      const groupToAdd = contextData.data; // Contains { id, name, vanity }
      const newGroupEntry = {
          groupName: groupToAdd.name || `Group ID ${groupToAdd.id}`, // Use name or fallback
          groupNName: "", // Nickname starts empty
          groupID: groupToAdd.id,
          groupURL: `https://www.facebook.com/groups/${groupToAdd.id}/`, // Construct standard URL
          checked: true, // Default to included
          role: "admin" // Default to admin (user must change in options if mod)
      };

      console.log("Attempting to add group to options:", newGroupEntry);
      addToOptionsButton.disabled = true; // Disable button immediately
      addToOptionsButton.textContent = 'Adding...';

      chrome.storage.sync.get('groups', function(data) {
          if (chrome.runtime.lastError) {
              console.error("Storage get error:", chrome.runtime.lastError);
              alert("Error reading existing groups: " + chrome.runtime.lastError.message);
              addToOptionsButton.disabled = false; // Re-enable on error
              addToOptionsButton.textContent = 'Add to Options';
              return;
          }

          const existingGroups = data.groups || [];
          if (!Array.isArray(existingGroups)) {
               console.error("Stored groups data is not an array:", existingGroups);
               alert("Error: Stored group configuration is corrupted.");
                addToOptionsButton.disabled = false; // Re-enable on error
                addToOptionsButton.textContent = 'Add to Options';
               return;
          }

          // Check if already exists
          const alreadyExists = existingGroups.some(g => g.groupID === newGroupEntry.groupID);

          if (alreadyExists) {
              console.log("Group already exists in options.");
              alert("This group is already configured in the options.");
              addToOptionsButton.textContent = 'In Options'; // Keep disabled, update text
              addToOptionsButton.style.backgroundColor = '#6c757d'; // Grey out
          } else {
              // Add the new group and save
              existingGroups.push(newGroupEntry);
              chrome.storage.sync.set({ groups: existingGroups }, function() {
                  if (chrome.runtime.lastError) {
                      console.error("Storage set error:", chrome.runtime.lastError);
                      alert("Error saving updated group list: " + chrome.runtime.lastError.message);
                      addToOptionsButton.disabled = false; // Re-enable on save error
                      addToOptionsButton.textContent = 'Add to Options';
                  } else {
                      console.log("Group successfully added to options.");
                      alert(`Group "${newGroupEntry.groupName}" added to options.`);
                      addToOptionsButton.textContent = 'Added!'; // Keep disabled, update text
                      addToOptionsButton.style.backgroundColor = '#28a745'; // Green
                      // Optional: Send refresh message if options page might be open
                      chrome.runtime.sendMessage({ action: 'optionsUpdated' }).catch(e => {});
                  }
              });
          }
      });
  }); // --- End "Add to Options" Listener ---
  
  
   // --- Message Listener for Block Results ---
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "blockResult") {
            console.log("FSA: Received block result message:", message);
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
                    console.error(`FSA: Block failed for group ${message.groupId}, user ${message.userId}. Error: ${message.error}`);
                    button.title = `Error: ${message.error || 'Unknown error during block execution.'}`;
                }
            } else {
                console.warn(`FSA: Could not find button for groupId ${message.groupId} to update status.`);
            }
        }
        else if (message.action === 'refreshPopup') {
            console.log("FSA: Received refreshPopup message. Reloading data...");
             if (activeTabId) {
                 console.log("FSA Popup: Attempting to re-execute script for refresh on tab:", activeTabId);
                 chrome.scripting.executeScript({
                   target: { tabId: activeTabId },
                   func: getPageData
                 }, function(results) {
                   if (chrome.runtime.lastError || !results?.[0]?.result) {
                     console.error("FSA: Error re-executing script for refresh:", chrome.runtime.lastError || "No result found");
                     currentPageData = null;
                   } else {
                      currentPageData = results[0].result;
                      console.log('FSA: Re-acquired Page Data after refresh request:', currentPageData);
                   }
                   updatePopupUI();
                 });
             } else {
                 console.warn("FSA: Cannot refresh popup data, activeTabId not available.");
             }
        }
        return true; // Keep channel open for async responses
    });

}); // End DOMContentLoaded

// --- Helper Functions ---

// --- START of Corrected constructProfileActivityUrl function (Using v1.x Style) ---
function constructProfileActivityUrl(userName, userID) {
  // Basic validation
  if (!userName || userName === 'Not Found' || !userID || userID === 'Not Found') {
      console.warn("FSA: Cannot construct activity URL, missing userName or userID.");
      return '#'; // Return safe non-functional link
  }

  // Encode username for the q= parameter (standard encoding is fine here)
  const encodedUserName = encodeURIComponent(userName); // .replace(/%20/g, '+'); // Using + is optional, %20 works

  // Construct the specific filter JSON string - matching v1.x
  // Note the escaped quotes (\") inside the string value
  const filterJsonString = `{"name":"author","args":"${userID}"}`; // The inner JSON part
  // Need to escape the inner JSON string correctly for the outer structure
  const escapedFilterJsonString = filterJsonString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const filterParamValue = `{"rp_author:0":"${escapedFilterJsonString}"}`; // The outer structure with escaped inner JSON

  // Base64 encode the outer structure
  let encodedFilterString = '';
   try {
       encodedFilterString = btoa(filterParamValue); // Use the correctly escaped value
   } catch (e) {
       console.error("FSA: Error Base64 encoding filter string:", e, "Input:", filterParamValue);
       return '#'; // Return safe link on encoding error
   }

  // Construct the final URL - without &epa=FILTERS
  const url = `https://www.facebook.com/search/posts/?q=${encodedUserName}&filters=${encodedFilterString}`;

  console.log("FSA: Generated Profile Activity URL (v1.x style):", url);
  return url;
}
// --- END of Corrected constructProfileActivityUrl function ---


// Modified addGroupRow - Constructs URL from groupID, correctly creates link
// --- addGroupRow --- (Modify to accept userData for blocking logic)
// Needs access to userData which includes fb_dtsg, adminUserId etc.
function addGroupRow(groupName, groupNName, groupID, checked, canBlock, userData) { // Added userData
    if (!checked) { return; } // Filter remains

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
    blockScammerButton.disabled = !canBlock; // Initial disable based on page load data
    blockScammerButton.title = canBlock ? `Block user from group ${displayName}` : "Blocking disabled (missing required page data)";

    blockScammerButton.addEventListener('click', function(event) {
        console.log(`FSA Popup: Click detected for GroupID: ${event.target.dataset.groupId}`);
        // **Use userData passed into addGroupRow**
        console.log("FSA Popup: UserData available in listener:", userData);

        // Re-validate required data using userData
        if (!userData || !userData.userID || userData.userID === 'Not Found' ||
            !userData.adminUserId || userData.adminUserId === 'Not Found' ||
            !userData.fb_dtsg || userData.fb_dtsg === 'Not Found') {
            alert('Cannot block: Missing required user or session data. Reload the profile page and the popup.');
            console.error("FSA Popup: Block attempt failed in listener due to missing userData fields.", userData);
            // ... (set error style on button)
            return;
        }
        if (!activeTabId) { /* ... tab error check ... */ return; }

        // Extract data from userData
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
            func: executeGraphQLBlock, // Assumes loaded from graphQLBlocker.js
            args: [targetUserID, clickedGroupID, fbDtsg, jazoest, lsd, adminUserId]
        }, (injectionResults) => { /* ... injection result handling ... */ });
    }); // End blockScammerButton listener

    buttonCell.appendChild(blockScammerButton);
    newRow.appendChild(buttonCell);

    groupTableBody.appendChild(newRow);
} // --- End of addGroupRow ---
 

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    console.log('FSA: Text copied to clipboard');
  }).catch(err => {
    console.error('FSA: Failed to copy text using navigator.clipboard: ', err);
    try { // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus(); textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (successful) { console.log('FSA: Text copied using fallback execCommand'); }
        else { console.error('FSA: Fallback execCommand copying failed'); alert('Failed to copy data automatically. Please copy manually.'); }
     } catch (e) {
         console.error('FSA: Error during fallback execCommand copying:', e);
         alert('Failed to copy data automatically. Please copy manually.');
     }
  });
}
// --- END OF FILE popup.js ---