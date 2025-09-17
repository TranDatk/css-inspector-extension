// Popup script for CSS Selector Inspector Extension

document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const delayElement = document.getElementById('delay');
  const toggleBtn = document.getElementById('toggleBtn');
  const showSidebarBtn = document.getElementById('showSidebarBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsPanel = document.getElementById('settingsPanel');
  const hoverDelayInput = document.getElementById('hoverDelay');
  const themeSelect = document.getElementById('theme');
  const languageSelect = document.getElementById('language');

  // Language translations
  const translations = {
    en: {
      status: 'Status:',
      hoverDelay: 'Hover delay:',
      loading: 'Loading...',
      enabled: 'Enabled',
      disabled: 'Disabled',
      enableInspector: 'Enable Inspector',
      disableInspector: 'Disable Inspector',
      openSidebarEditor: 'Open Sidebar Editor',
      settings: 'Settings',
      close: 'Close',
      language: 'Language:',
      hoverDelayMs: 'Hover Delay (ms):',
      theme: 'Theme:',
      leftClickCopy: 'Left click: Copy selector | Right click: Open editor'
    },
    ja: {
      status: 'ステータス:',
      hoverDelay: 'ホバー遅延:',
      loading: '読み込み中...',
      enabled: '有効',
      disabled: '無効',
      enableInspector: 'インスペクターを有効化',
      disableInspector: 'インスペクターを無効化',
      openSidebarEditor: 'サイドバーエディターを開く',
      settings: '設定',
      close: '閉じる',
      language: '言語:',
      hoverDelayMs: 'ホバー遅延 (ms):',
      theme: 'テーマ:',
      leftClickCopy: '左クリック: セレクターをコピー | 右クリック: エディターを開く'
    }
  };

  let currentLanguage = 'en';

  // Update UI with current language
  function updateUI() {
    const t = translations[currentLanguage];
    
    // Update status labels
    document.querySelector('.status-item:nth-child(1) .status-label').textContent = t.status;
    document.querySelector('.status-item:nth-child(2) .status-label').textContent = t.hoverDelay;
    
    // Update button texts
    showSidebarBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      ${t.openSidebarEditor}
    `;
    
    settingsBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      ${t.settings}
    `;
    
    // Update settings labels
    document.querySelector('.setting-item:nth-child(1) .setting-label').textContent = t.language;
    document.querySelector('.setting-item:nth-child(2) .setting-label').textContent = t.hoverDelayMs;
    document.querySelector('.setting-item:nth-child(3) .setting-label').textContent = t.theme;
    
    // Update footer - check if element exists first
    const footerP = document.querySelector('.footer p');
    if (footerP) {
      footerP.textContent = t.leftClickCopy;
    }
    
    // Update status and toggle button
    updateStatus(statusElement.textContent === 'Enabled' || statusElement.textContent === '有効');
  }

  // Load settings and update UI
  loadSettings();

  // Toggle extension on/off
  toggleBtn.addEventListener('click', function() {
    chrome.storage.sync.get(['enabled'], function(result) {
      const newState = !result.enabled;
      chrome.storage.sync.set({ enabled: newState }, function() {
        updateStatus(newState);
        updateToggleButton(newState);
        
        // Send message to content script
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'toggle',
              enabled: newState
            }).catch(() => {
              // Ignore errors if content script not loaded
            });
          }
        });
      });
    });
  });

  // Show sidebar editor
  showSidebarBtn.addEventListener('click', function() {
    // Check if extension is enabled before sending message
    chrome.storage.sync.get(['enabled'], function(result) {
      const enabled = result.enabled !== false;
      if (!enabled) {
        showNotification('Extension is disabled. Please enable it first.');
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0] && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'showSidebar'
          }).catch(() => {
            // Ignore errors if content script not loaded
          });
        }
      });
    });
  });

  // Toggle settings panel
  settingsBtn.addEventListener('click', function() {
    const isVisible = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = isVisible ? 'none' : 'block';
    const t = translations[currentLanguage];
    settingsBtn.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      ${isVisible ? t.settings : t.close}
    `;
  });

  // Save hover delay setting
  hoverDelayInput.addEventListener('change', function() {
    const delay = parseInt(this.value);
    chrome.storage.sync.set({ hoverDelay: delay }, function() {
      updateDelayDisplay(delay);
      
      // Only send message to content script if extension is enabled
      chrome.storage.sync.get(['enabled'], function(result) {
        const enabled = result.enabled !== false;
        if (enabled) {
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateSettings',
                settings: { hoverDelay: delay }
              }).catch(() => {
                // Ignore errors if content script not loaded
              });
            }
          });
        }
      });
    });
  });

  // Save theme setting
  themeSelect.addEventListener('change', function() {
    const theme = this.value;
    chrome.storage.sync.set({ theme: theme }, function() {
      // Only send message to content script if extension is enabled
      chrome.storage.sync.get(['enabled'], function(result) {
        const enabled = result.enabled !== false;
        if (enabled) {
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateSettings',
                settings: { theme: theme }
              }).catch(() => {
                // Ignore errors if content script not loaded
              });
            }
          });
        }
      });
    });
  });

  // Save language setting
  languageSelect.addEventListener('change', function() {
    const language = this.value;
    currentLanguage = language;
    chrome.storage.sync.set({ language: language }, function() {
      updateUI();
      // Only send message to content script if extension is enabled
      chrome.storage.sync.get(['enabled'], function(result) {
        const enabled = result.enabled !== false;
        if (enabled) {
          chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && tabs[0].id) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateSettings',
                settings: { language: language }
              }).catch(() => {
                // Ignore errors if content script not loaded
              });
            }
          });
        }
      });
    });
  });

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(['enabled', 'hoverDelay', 'theme', 'language'], function(result) {
      const enabled = result.enabled !== false; // Default to true
      const delay = result.hoverDelay || 1000;
      const theme = result.theme || 'modern';
      currentLanguage = result.language || 'en';
      
      updateStatus(enabled);
      updateToggleButton(enabled);
      updateDelayDisplay(delay);
      updateUI();
      
      hoverDelayInput.value = delay;
      themeSelect.value = theme;
      languageSelect.value = currentLanguage;
      
      // Only send settings to content script if extension is enabled
      if (enabled) {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'updateSettings',
              settings: { 
                hoverDelay: delay,
                theme: theme,
                language: currentLanguage
              }
            }).catch(() => {
              // Ignore errors if content script not loaded
            });
          }
        });
      }
    });
  }

  // Update status display
  function updateStatus(enabled) {
    const t = translations[currentLanguage];
    if (enabled) {
      statusElement.textContent = t.enabled;
      statusElement.className = 'status-value status-enabled';
    } else {
      statusElement.textContent = t.disabled;
      statusElement.className = 'status-value status-disabled';
    }
  }

  // Update toggle button
  function updateToggleButton(enabled) {
    const t = translations[currentLanguage];
    const toggleText = document.getElementById('toggleText');
    if (enabled) {
      toggleText.textContent = t.disableInspector;
      toggleBtn.className = 'btn btn-secondary';
    } else {
      toggleText.textContent = t.enableInspector;
      toggleBtn.className = 'btn btn-primary';
    }
  }

  // Update delay display
  function updateDelayDisplay(delay) {
    delayElement.textContent = (delay / 1000).toFixed(1) + 's';
  }

  // Handle keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 't':
          e.preventDefault();
          toggleBtn.click();
          break;
        case 'e':
          e.preventDefault();
          showSidebarBtn.click();
          break;
        case ',':
          e.preventDefault();
          settingsBtn.click();
          break;
      }
    }
  });

  // Add some visual feedback
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4caf50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'showNotification') {
      showNotification(request.message);
    }
  });
});
