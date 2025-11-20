// service-worker.js

// Listen for the extension being installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log('FSA (Service Worker): Extension installed/updated.');
});

// Listen for messages from other parts of the extension (popup, options)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("FSA (Service Worker): Received message:", message);

  if (message.action === 'refreshPopup') {
    // This action doesn't make sense for a service worker to handle directly,
    // as it can't directly interact with the popup's DOM.
    // The popup should handle its own refresh logic when it opens.
    console.log("FSA (Service Worker): 'refreshPopup' message noted, but no action taken.");
  }
  // To indicate you might send a response asynchronously, you would return true.
  // Since we are not, we don't need to.
});

/*
// Example: Listen for tab updates if needed for other features (currently not used)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com')) {
    // console.log('FSA (Service Worker): Facebook tab updated:', tabId, tab.url);
    // Potentially inject scripts or perform actions based on URL changes
  }
});
*/

console.log("FSA (Service Worker): Service worker is running.");