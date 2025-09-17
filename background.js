// Background script for CSS Selector Inspector Extension

// Extension installation and startup
chrome.runtime.onInstalled.addListener((details) => {
  console.log('CSS Selector Inspector extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    hoverDelay: 1000,
    theme: 'modern'
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getSettings':
      chrome.storage.sync.get(['enabled', 'hoverDelay', 'theme'], (result) => {
        sendResponse(result);
      });
      return true; // Keep message channel open for async response
      
    case 'updateSettings':
      chrome.storage.sync.set(request.settings, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'copyToClipboard':
      // Handle clipboard operations if needed
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Context menu for right-click actions
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'css-inspector',
    title: 'Inspect CSS Selector',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'css-inspector') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showSidebar'
    });
  }
});
