// Facebook Scammer Assassin Service Worker

// Listen for the extension being installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('Facebook Scammer Assassin service worker installed/updated!');
  // Perform any first-time setup here if needed (e.g., setting default options)
});

// Listen for messages from other parts of the extension (popup, options)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Service Worker received message:", message);

  if (message.action === 'refreshPopup') {
    // This action doesn't make sense for a service worker to handle directly,
    // as it can't directly interact with the popup's DOM.
    // The popup should handle its own refresh logic when opened or when it receives data.
    // Kept here for reference but likely unused effectively.
    console.log("Received refreshPopup message, but SW cannot directly refresh popup DOM.");
    // Potential alternative: Store a flag that the popup checks on opening?
  }

  // Add other message handlers if needed in the future

  // Return true to indicate you might send a response asynchronously
  // (even if you don't in this specific handler)
  // return true;
});

// Example: Listen for tab updates if needed for other features (currently not used)
/*
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com')) {
    // console.log('Facebook tab updated:', tabId, tab.url);
    // Potentially inject scripts or perform actions based on URL changes
  }
});
*/

console.log("Facebook Scammer Assassin service worker running.");