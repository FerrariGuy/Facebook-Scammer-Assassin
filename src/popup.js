// --- popup.js ---

document.addEventListener('DOMContentLoaded', function() {
    
    // ** THE FIX IS HERE: These variables are now in the correct (outer) scope **
    let contextData = null;
    let activeTabId = null;

    localizeHtmlPage();

    function updatePopupUI() {
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

        // Reset UI elements
        infoTable.style.display = 'none';
        profileActivityButton.style.display = 'none';
        blockSectionHeading.style.display = 'none';
        groupTable.style.display = 'none';
        shrugContainer.style.display = 'none';
        addToOptionsButton.style.display = 'none';

        // Reset text content using i18n
        userNameDisplay.textContent = chrome.i18n.getMessage("loadingText");
        userIDDisplay.textContent = chrome.i18n.getMessage("loadingText");
        userVanityDisplay.textContent = chrome.i18n.getMessage("loadingText");

        if (!contextData) {
            infoTable.style.display = 'table';
            userNameDisplay.textContent = chrome.i18n.getMessage("errorLoadingText");
            userIDDisplay.textContent = chrome.i18n.getMessage("errorLoadingText");
            userVanityDisplay.textContent = chrome.i18n.getMessage("errorLoadingText");
            return;
        }

        switch (contextData.type) {
            case 'user':
                {
                    const userData = contextData.data;
                    infoTable.style.display = 'table';
                    userNameLabel.textContent = chrome.i18n.getMessage("userNameLabel");
                    userIDLabel.textContent = chrome.i18n.getMessage("userIDLabel");
                    userVanityLabel.textContent = chrome.i18n.getMessage("userVanityLabel");
                    userNameDisplay.textContent = userData.userName || chrome.i18n.getMessage("notFoundText");
                    userIDDisplay.textContent = userData.userID || chrome.i18n.getMessage("notFoundText");
                    userVanityDisplay.textContent = userData.userVanity || chrome.i18n.getMessage("notFoundText");
                    copyButton.disabled = !userData.userID;
                    if (userData.userID) {
                        if (userData.userName) {
                            profileActivityButton.style.display = 'block';
                            profileActivityButton.disabled = false;
                            profileActivityButton.onclick = () => {
                                const url = constructProfileActivityUrl(userData.userName, userData.userID);
                                if (url !== '#') chrome.tabs.create({ url });
                            };
                        } else {
                            profileActivityButton.style.display = 'block';
                            profileActivityButton.textContent = chrome.i18n.getMessage("reloadActivityButtonText");
                            profileActivityButton.disabled = false;
                            profileActivityButton.style.backgroundColor = 'coral';
                            profileActivityButton.onclick = () => { if (activeTabId) { chrome.tabs.reload(activeTabId); window.close(); } };
                        }
                    }
                    const canBlock = userData.userID && userData.adminUserId && userData.fb_dtsg;
                    blockSectionHeading.style.display = 'block';
                    if (canBlock) {
                        blockSectionHeading.textContent = chrome.i18n.getMessage("blockScammerHeading");
                        groupTable.style.display = 'table';
                        groupTableBody.innerHTML = '';
                        chrome.storage.sync.get('groups', (storageData) => {
                            if (storageData.groups) {
                                storageData.groups.forEach((group) => addGroupRow(group, canBlock, userData));
                            }
                        });
                    } else {
                        blockSectionHeading.textContent = chrome.i18n.getMessage("blockScammerMissingDataHeading");
                    }
                }
                break;
            case 'group':
                {
                    const groupData = contextData.data;
                    infoTable.style.display = 'table';
                    userNameLabel.textContent = chrome.i18n.getMessage("groupNameLabel");
                    userIDLabel.textContent = chrome.i18n.getMessage("groupIDLabel");
                    userVanityLabel.textContent = chrome.i18n.getMessage("groupVanityLabel");
                    userNameDisplay.textContent = groupData.name || chrome.i18n.getMessage("notFoundText");
                    userIDDisplay.textContent = groupData.id || chrome.i18n.getMessage("notFoundText");
                    userVanityDisplay.textContent = groupData.vanity || chrome.i18n.getMessage("notApplicable");
                    copyButton.disabled = !groupData.id;
                    if (groupData.id && groupData.name) {
                        addToOptionsButton.style.display = 'inline-block';
                        addToOptionsButton.onclick = () => handleAddToOptions(groupData);
                        chrome.storage.sync.get('groups', (storageData) => {
                            if (storageData.groups?.some(g => g.groupID === groupData.id)) {
                                addToOptionsButton.textContent = chrome.i18n.getMessage("inOptionsButtonText");
                                addToOptionsButton.disabled = true;
                                addToOptionsButton.style.backgroundColor = '#6c757d';
                                addToOptionsButton.onclick = null;
                            }
                        });
                    }
                }
                break;
            default:
                blockSectionHeading.textContent = chrome.i18n.getMessage("notOnFacebookError");
                shrugContainer.style.display = 'block';
                blockSectionHeading.style.display = 'block';
                break;
        }
    }
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs?.[0]?.id || !tabs[0].url?.startsWith('https://www.facebook.com/')) {
            contextData = { type: 'error', message: 'Not on Facebook' };
            updatePopupUI(); return;
        }
        activeTabId = tabs[0].id;
        chrome.scripting.executeScript({
            target: { tabId: activeTabId },
            func: extractPageContextData
        }, (results) => {
            if (chrome.runtime.lastError || !results?.[0]?.result) {
                contextData = { type: 'error', message: 'Script execution failed' };
            } else { contextData = results[0].result; }
            updatePopupUI();
        });
    });

    document.getElementById('copyButton').addEventListener('click', () => {
        if (!contextData?.data) return;
        let copyText = '';
        const naText = chrome.i18n.getMessage("notApplicable");
        if (contextData.type === 'user') {
             const userData = contextData.data;
             const profileLink = userData.userID ? `https://www.facebook.com/profile.php?id=${userData.userID}` : naText;
             const activityLink = (userData.userID && userData.userName) ? constructProfileActivityUrl(userData.userName, userData.userID) : naText;
             copyText = `${chrome.i18n.getMessage("userNameLabel")} ${userData.userName || naText}\n` +
                        `${chrome.i18n.getMessage("userIDLabel")} ${userData.userID || naText}\n` +
                        `${chrome.i18n.getMessage("userVanityLabel")} ${userData.userVanity || naText}\n` +
                        `${chrome.i18n.getMessage("profileLinkLabel")} ${profileLink}\n` +
                        `${chrome.i18n.getMessage("profileActivityButtonText")}: ${activityLink}`;
        } else if (contextData.type === 'group') {
            const groupData = contextData.data;
            const groupUrl = groupData.id ? `https://www.facebook.com/groups/${groupData.id}/` : naText;
            copyText = `${chrome.i18n.getMessage("groupNameLabel")} ${groupData.name || naText}\n` +
                       `${chrome.i18n.getMessage("groupIDLabel")} ${groupData.id || naText}\n` +
                       `Group URL: ${groupUrl}`;
        }
        if (copyText) {
            copyToClipboard(copyText);
            const copyButton = document.getElementById('copyButton');
            copyButton.textContent = chrome.i18n.getMessage("copiedButtonText");
            setTimeout(() => { copyButton.textContent = chrome.i18n.getMessage("copyButtonText"); }, 1000);
        }
    });

    // The onMessage listener should be in the service worker, but we need one here for block results.
    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "blockResult") {
            const button = document.querySelector(`.blockScammerButton[data-group-id="${message.groupId}"]`);
            if (button) {
                button.disabled = true;
                if (message.success) {
                    button.textContent = chrome.i18n.getMessage("blockedButtonText");
                    button.style.backgroundColor = '#28a745';
                } else {
                    button.textContent = chrome.i18n.getMessage("blockFailedButtonText");
                    button.style.backgroundColor = '#dc3545';
                    button.title = `Error: ${message.error || 'Unknown'}`;
                }
            }
        }
    });

    // --- Helper Functions ---

    function localizeHtmlPage() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const messageKey = element.getAttribute('data-i18n');
            const message = chrome.i18n.getMessage(messageKey);
            if (message) element.textContent = message;
        });
    }

    function handleAddToOptions(groupData) {
        const newGroupEntry = { groupName: groupData.name, groupNName: "", groupID: groupData.id, groupURL: `https://www.facebook.com/groups/${groupData.id}/`, checked: true, role: "admin" };
        const button = document.getElementById('addToOptionsButton');
        button.disabled = true;
        button.textContent = chrome.i18n.getMessage("addingButtonText");
        chrome.storage.sync.get({ groups: [] }, (data) => {
            if (!data.groups.some(g => g.groupID === newGroupEntry.groupID)) {
                const updatedGroups = [...data.groups, newGroupEntry];
                chrome.storage.sync.set({ groups: updatedGroups }, () => {
                    if (!chrome.runtime.lastError) {
                        button.textContent = chrome.i18n.getMessage("addedButtonText");
                        button.style.backgroundColor = '#28a745';
                    }
                });
            }
        });
    }

    function constructProfileActivityUrl(userName, userID) {
        const nameForSearch = userName.replace(/\s+\([^)]+\)$/, '').trim();
        const encodedUserName = encodeURIComponent(nameForSearch);
        const filterJsonString = `{"name":"author","args":"${userID}"}`;
        const escapedFilterJsonString = filterJsonString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        const filterParamValue = `{"rp_author:0":"${escapedFilterJsonString}"}`;
        return `https://www.facebook.com/search/posts/?q=${encodedUserName}&filters=${btoa(filterParamValue)}`;
    }

    function addGroupRow(group, canBlock, userData) {
        if (!group.checked) return;
        const groupTableBody = document.querySelector('#groupTable tbody');
        const newRow = document.createElement('tr');
        const link = document.createElement('a');
        link.href = `https://www.facebook.com/groups/${group.groupID}/`;
        link.textContent = group.groupNName || group.groupName;
        link.target = "_blank";
        const nicknameCell = newRow.insertCell();
        nicknameCell.appendChild(link);
        const buttonCell = newRow.insertCell();
        const blockButton = document.createElement('button');
        blockButton.textContent = chrome.i18n.getMessage("blockButtonText");
        blockButton.className = 'blockScammerButton';
        blockButton.dataset.groupId = group.groupID;
        blockButton.disabled = !canBlock;
        blockButton.addEventListener('click', () => {
            const { userID, adminUserId, fb_dtsg, jazoest, lsd } = userData;
            blockButton.textContent = chrome.i18n.getMessage("blockingButtonText");
            blockButton.disabled = true;
            chrome.scripting.executeScript({
                target: { tabId: activeTabId },
                func: executeGraphQLBlock,
                args: [userID, group.groupID, fb_dtsg, jazoest, lsd, adminUserId]
            }, () => {
                 if (chrome.runtime.lastError) {
                    blockButton.textContent = chrome.i18n.getMessage("injectFailButtonText");
                    blockButton.style.backgroundColor = '#dc3545';
                 }
            });
        });
        buttonCell.appendChild(blockButton);
        groupTableBody.appendChild(newRow);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        });
    }
});