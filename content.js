// CSS Selector Inspector Content Script
class CSSSelectorInspector {
  constructor() {
    this.hoverTimeout = null;
    this.currentElement = null;
    this.popup = null;
    this.sidebar = null;
    this.leftSidebar = null;
    this.leftSidebarToggle = null;
    this.isEnabled = true;
    this.isPopupEnabled = true; // Separate flag for popup functionality
    this.hoverDelay = 1000; // 1 second
    this.isMouseOverPopup = false;
    this.language = 'en';
    this.savedSelectors = [];
    
    // Drag and drop properties
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.popupStartX = 0;
    this.popupStartY = 0;
    this.mouseMoveHandler = null;
    this.mouseUpHandler = null;
    
    this.init();
  }

  async init() {
    this.createPopup();
    this.createSidebar();
    this.createLeftSidebar();
    this.createLeftSidebarToggle();
    this.injectStyles();
    await this.loadSettings();
    await this.loadSavedSelectors();
    
    // Apply initial enabled state to UI elements immediately after loading settings
    this.applyEnabledState();
    
    this.setupMessageListener();
    this.bindEvents();
  }

  // Language translations
  getTranslations() {
    return {
      en: {
        copySelector: 'Copy CSS Selector',
        runSelector: 'Run Selector',
        saveSelector: 'Save Selector',
        openEditor: 'Open Editor',
        closePopup: 'Close popup',
        elementInformation: 'Element Information',
        tag: 'Tag',
        id: 'ID',
        classes: 'Classes',
        customSelector: 'Custom Selector',
        domTreePath: 'DOM Tree Path',
        previewResults: 'Preview Results',
        copyFinalSelector: 'Copy Final Selector',
        resetToDefault: 'Reset to default selector',
        testSelector: 'Test selector',
        domTreePlaceholder: 'DOM tree path will be displayed here',
        previewPlaceholder: 'Test selector to see results',
        noElementsFound: 'No elements found',
        foundElements: 'Found {count} element(s)',
        invalidSelector: 'Invalid selector: {error}',
        andMore: '... and {count} more element(s)',
        showLess: 'Show Less',
        copySuccess: 'CSS Selector copied!',
        customSelectorCopied: 'Custom Selector copied!',
        cannotCopy: 'Cannot copy, please select and copy manually',
        na: 'N/A',
        cannotCreateDomTree: 'Cannot create DOM tree',
        savedSelectors: 'Saved Selectors',
        selectorName: 'Selector Name',
        addNewSelector: 'Add New Selector',
        enterSelectorName: 'Enter selector name...',
        selectorSaved: 'Selector saved successfully!',
        selectorDeleted: 'Selector deleted successfully!'
      },
      ja: {
        copySelector: 'CSSセレクターをコピー',
        runSelector: 'セレクターを実行',
        saveSelector: 'セレクターを保存',
        openEditor: 'エディターを開く',
        closePopup: 'ポップアップを閉じる',
        elementInformation: '要素情報',
        tag: 'タグ',
        id: 'ID',
        classes: 'クラス',
        customSelector: 'カスタムセレクター',
        domTreePath: 'DOMツリーパス',
        previewResults: 'プレビュー結果',
        copyFinalSelector: '最終セレクターをコピー',
        resetToDefault: 'デフォルトセレクターにリセット',
        testSelector: 'セレクターをテスト',
        domTreePlaceholder: 'DOMツリーパスがここに表示されます',
        previewPlaceholder: 'セレクターをテストして結果を確認',
        noElementsFound: '要素が見つかりません',
        foundElements: '{count}個の要素が見つかりました',
        invalidSelector: '無効なセレクター: {error}',
        andMore: '... 他{count}個の要素',
        showLess: '少なく表示',
        copySuccess: 'CSSセレクターがコピーされました！',
        customSelectorCopied: 'カスタムセレクターがコピーされました！',
        cannotCopy: 'コピーできません。手動で選択してコピーしてください',
        na: 'なし',
        cannotCreateDomTree: 'DOMツリーを作成できません',
        savedSelectors: '保存されたセレクター',
        selectorName: 'セレクター名',
        addNewSelector: '新しいセレクターを追加',
        enterSelectorName: 'セレクター名を入力...',
        selectorSaved: 'セレクターが正常に保存されました！',
        selectorDeleted: 'セレクターが正常に削除されました！'
      }
    };
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['enabled', 'hoverDelay', 'theme', 'language']);
      this.isEnabled = result.enabled !== false;
      this.hoverDelay = result.hoverDelay || 1500;
      this.language = result.language || 'en';
    } catch (error) {
      console.log('Extension not loaded in extension context, using defaults');
    }
  }

  // Listen for messages from popup
  setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        switch (request.action) {
          case 'toggle':
            this.isEnabled = request.enabled;
            // Clear all highlights and hide popup when disabled
            if (!this.isEnabled) {
              this.disableExtension();
            } else {
              this.enableExtension();
            }
            break;
          case 'updateSettings':
            if (request.settings.hoverDelay) {
              this.hoverDelay = request.settings.hoverDelay;
            }
            if (request.settings.language) {
              this.language = request.settings.language;
              // Recreate popup and sidebar with new language
              this.createPopup();
              this.createSidebar();
            }
            break;
          case 'showSidebar':
            this.showSidebar();
            break;
        }
      });
    }
  }

  createPopup() {
    this.popup = document.createElement('div');
    this.popup.id = 'css-selector-popup';
    this.popup.innerHTML = `
      <div class="popup-content">
        <div class="popup-drag-handle" id="popup-drag-handle"></div>
        <div class="popup-body">
          <div class="selector-display">
            <code id="selector-text"></code>
          </div>
          <div class="popup-actions">
            <button class="btn-copy" title="${this.getTranslations()[this.language].copySelector}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="btn-run" title="${this.getTranslations()[this.language].runSelector}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polygon points="5,3 19,12 5,21"></polygon>
              </svg>
            </button>
            <button class="btn-save" title="${this.getTranslations()[this.language].saveSelector}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17,21 17,13 7,13 7,21"></polyline>
                <polyline points="7,3 7,8 15,8"></polyline>
              </svg>
            </button>
            <button class="btn-edit" title="${this.getTranslations()[this.language].openEditor}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-close" title="${this.getTranslations()[this.language].closePopup}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.popup);
  }

  createLeftSidebar() {
    this.leftSidebar = document.createElement('div');
    this.leftSidebar.id = 'css-selector-left-sidebar';
    this.leftSidebar.innerHTML = `
      <div class="saved-selectors-container">
        <div class="saved-selectors-header">
          <h3 class="saved-selectors-title">${this.getTranslations()[this.language].savedSelectors}</h3>
          <button class="add-selector-btn" id="add-selector-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            ${this.getTranslations()[this.language].addNewSelector}
          </button>
        </div>
        <div id="saved-selectors-table-container">
          <table class="saved-selectors-table" id="saved-selectors-table">
            <thead>
              <tr>
                <th>${this.getTranslations()[this.language].selectorName}</th>
                <th>CSS Selector</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="saved-selectors-tbody">
              <!-- Dynamic content will be inserted here -->
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.body.appendChild(this.leftSidebar);
  }

  createLeftSidebarToggle() {
    this.leftSidebarToggle = document.createElement('div');
    this.leftSidebarToggle.className = 'left-sidebar-toggle';
    this.leftSidebarToggle.style.display = 'none'; // Hide initially
    this.leftSidebarToggle.style.visibility = 'hidden'; // Also hide with visibility
    this.leftSidebarToggle.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="9,18 15,12 9,6"></polyline>
      </svg>
    `;
    document.body.appendChild(this.leftSidebarToggle);
  }

  createSidebar() {
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'css-selector-sidebar';
    this.sidebar.innerHTML = `
      <div class="sidebar-content">
        <div class="sidebar-header">
          <div class="header-left">
            <div class="header-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div class="header-text">
              <h3>CSS Selector Editor</h3>
              <p>Edit and test CSS selectors</p>
            </div>
          </div>
          <button class="sidebar-close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="sidebar-body">
          <!-- Element Info Card -->
          <div class="info-card">
            <div class="card-header" data-card="info">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <path d="M9 9h6v6H9z"></path>
                </svg>
                <span>${this.getTranslations()[this.language].elementInformation}</span>
              </div>
              <button class="card-toggle" data-toggle="info">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>
            </div>
            <div class="card-content expanded" data-content="info">
              <div class="element-info">
                <div class="info-item">
                  <div class="info-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                    <span>${this.getTranslations()[this.language].tag}</span>
                  </div>
                  <div class="info-value" id="element-tag">-</div>
                </div>
                <div class="info-item">
                  <div class="info-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                    </svg>
                    <span>${this.getTranslations()[this.language].id}</span>
                  </div>
                  <div class="info-value" id="element-id">-</div>
                </div>
                <div class="info-item">
                  <div class="info-label">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M9 12l2 2 4-4"></path>
                      <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                      <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                    </svg>
                    <span>${this.getTranslations()[this.language].classes}</span>
                  </div>
                  <div class="info-value" id="element-classes">-</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Selector Editor Card -->
          <div class="editor-card">
            <div class="card-header" data-card="editor">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>${this.getTranslations()[this.language].customSelector}</span>
              </div>
              <button class="card-toggle" data-toggle="editor">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>
            </div>
            <div class="card-content expanded" data-content="editor">
              <div class="editor-container">
                <textarea id="custom-selector" placeholder="Enter custom CSS selector..."></textarea>
                <div class="editor-actions">
                  <button class="btn-reset" title="${this.getTranslations()[this.language].resetToDefault}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                      <path d="M3 3v5h5"></path>
                    </svg>
                  </button>
                  <button class="btn-test" title="${this.getTranslations()[this.language].testSelector}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M9 12l2 2 4-4"></path>
                      <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                      <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- DOM Tree Card -->
          <div class="dom-tree-card">
            <div class="card-header" data-card="dom">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <span>${this.getTranslations()[this.language].domTreePath}</span>
              </div>
              <button class="card-toggle collapsed" data-toggle="dom">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>
            </div>
            <div class="card-content collapsed" data-content="dom">
              <div id="dom-tree" class="dom-tree-box">
                <div class="dom-tree-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                  <p>${this.getTranslations()[this.language].domTreePlaceholder}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Preview Card -->
          <div class="preview-card">
            <div class="card-header" data-card="preview">
              <div style="display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span>${this.getTranslations()[this.language].previewResults}</span>
              </div>
              <button class="card-toggle" data-toggle="preview">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="6,9 12,15 18,9"></polyline>
                </svg>
              </button>
            </div>
            <div class="card-content expanded" data-content="preview">
              <div id="selector-preview" class="preview-box">
                <div class="preview-placeholder">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 12l2 2 4-4"></path>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
                  </svg>
                  <p>${this.getTranslations()[this.language].previewPlaceholder}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="sidebar-actions">
            <button class="btn-copy-final">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>${this.getTranslations()[this.language].copyFinalSelector}</span>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.sidebar);
  }

  bindEvents() {
    // Track if mouse is over popup
    this.isMouseOverPopup = false;
    
    // Hover events for elements
    document.addEventListener('mouseover', (e) => {
      // Early return if extension is disabled or popup is disabled
      if (!this.isEnabled || !this.isPopupEnabled) return;
      
      // If hovering over popup, mark it and clear any hide timeout
      if (e.target.closest('#css-selector-popup')) {
        this.isMouseOverPopup = true;
        clearTimeout(this.hoverTimeout);
        return;
      }
      
      // If hovering over sidebar, ignore
      if (e.target.closest('#css-selector-sidebar')) {
        return;
      }
      
      // If hovering over left sidebar or toggle, ignore
      if (e.target.closest('#css-selector-left-sidebar') || e.target.closest('.left-sidebar-toggle')) {
        return;
      }
      
      // Add highlight immediately (no delay) - check enabled inside addHighlight
      this.addHighlight(e.target);
      
      // For other elements, show popup after delay
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = setTimeout(() => {
        this.showPopup(e.target, e);
      }, this.hoverDelay);
    });

    // Mouse out events
    document.addEventListener('mouseout', (e) => {
      // Early return if extension is disabled or popup is disabled
      if (!this.isEnabled || !this.isPopupEnabled) return;
      
      // If leaving popup, mark it and set timeout to hide
      if (e.target.closest('#css-selector-popup')) {
        this.isMouseOverPopup = false;
        this.hoverTimeout = setTimeout(() => {
          if (!this.isMouseOverPopup) {
            this.hidePopup();
          }
        }, 1000); // 1s delay when leaving popup
        return;
      }
      
      // If leaving sidebar, ignore
      if (e.target.closest('#css-selector-sidebar')) {
        return;
      }
      
      // If leaving left sidebar or toggle, ignore
      if (e.target.closest('#css-selector-left-sidebar') || e.target.closest('.left-sidebar-toggle')) {
        return;
      }
      
      // Remove highlight when leaving element - check enabled inside removeHighlight
      this.removeHighlight(e.target);
      
      // For other elements, hide popup after delay
      clearTimeout(this.hoverTimeout);
      this.hoverTimeout = setTimeout(() => {
        if (!this.isMouseOverPopup) {
          this.hidePopup();
        }
      }, 1000); // 1s delay to move to popup
    });

    // Click events
    document.addEventListener('click', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      if (e.target.closest('#css-selector-popup')) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.target.classList.contains('btn-copy') || e.target.closest('.btn-copy')) {
          this.copySelector();
        } else if (e.target.classList.contains('btn-run') || e.target.closest('.btn-run')) {
          this.runSelector();
        } else if (e.target.classList.contains('btn-save') || e.target.closest('.btn-save')) {
          this.saveSelector();
        } else if (e.target.classList.contains('btn-edit') || e.target.closest('.btn-edit')) {
          this.showSidebar();
        } else if (e.target.classList.contains('btn-close') || e.target.closest('.btn-close')) {
          this.hidePopup();
        }
        return;
      }
    });

    // Right click events - disabled, using button instead

    // Sidebar events - moved outside bindEvents for better reliability
    document.addEventListener('click', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      if (e.target.closest('#css-selector-sidebar')) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.target.classList.contains('sidebar-close') || e.target.closest('.sidebar-close')) {
          this.hideSidebar();
        } else if (e.target.classList.contains('btn-test') || e.target.closest('.btn-test')) {
          this.testSelector();
        } else if (e.target.classList.contains('btn-copy-final') || e.target.closest('.btn-copy-final')) {
          this.copyFinalSelector();
        } else if (e.target.classList.contains('btn-reset') || e.target.closest('.btn-reset')) {
          this.resetSelector();
        }
        return;
      }
    });

    // Left sidebar events - using event delegation with capture phase
    document.addEventListener('click', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      try {
        // Handle add selector button
        if (e.target.closest('#css-selector-left-sidebar .add-selector-btn')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.addNewSelector();
          return;
        }
        
        // Handle table action buttons - check if target is actually a button
        const actionBtn = e.target.closest('#css-selector-left-sidebar .selector-action-btn');
        if (actionBtn && actionBtn.dataset && actionBtn.dataset.action) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const action = actionBtn.dataset.action;
          const selectorId = actionBtn.dataset.selectorId;
          
          if (action === 'edit') {
            this.editSelector(selectorId);
          } else if (action === 'delete') {
            this.deleteSelector(selectorId);
          } else if (action === 'save') {
            this.saveSelectorEdit(selectorId);
          } else if (action === 'cancel') {
            this.cancelSelectorEdit(selectorId);
          }
          return;
        }
      } catch (error) {
        console.error('Error in left sidebar click handler:', error);
      }
    }, true); // Use capture phase for higher priority

    // Handle input events for editing
    document.addEventListener('keydown', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      if (e.target.classList.contains('selector-edit-input')) {
        const row = e.target.closest('tr[data-selector-id]');
        if (!row) return;
        
        const selectorId = row.dataset.selectorId;
        if (e.key === 'Enter') {
          e.preventDefault();
          this.saveSelectorEdit(selectorId);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancelSelectorEdit(selectorId);
        }
      }
    });

    // Handle expand/collapse buttons
    document.addEventListener('click', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      if (e.target.closest('.expand-btn[data-action="expand"]')) {
        e.preventDefault();
        e.stopPropagation();
        const expandableText = e.target.closest('.expandable-text');
        if (expandableText) {
          expandableText.classList.toggle('expanded');
        }
      } else if (e.target.closest('.image-expand-btn[data-action="expand-image"]')) {
        e.preventDefault();
        e.stopPropagation();
        const expandBtn = e.target.closest('.image-expand-btn');
        const imageSrc = expandBtn.dataset.src;
        this.openImageModal(imageSrc);
      } else if (e.target.closest('.url-preview-btn[data-action="open-url"]')) {
        e.preventDefault();
        e.stopPropagation();
        const urlBtn = e.target.closest('.url-preview-btn');
        const url = urlBtn.dataset.url;
        this.openUrl(url);
      }
    });

    // Handle load more buttons
    document.addEventListener('click', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      if (e.target.closest('.load-more-btn[data-action="load-more"]')) {
        e.preventDefault();
        e.stopPropagation();
        const loadMoreBtn = e.target.closest('.load-more-btn');
        const offset = parseInt(loadMoreBtn.dataset.offset);
        const selector = document.getElementById('selector-text').textContent;
        this.renderResults(selector, offset);
      } else if (e.target.closest('.load-more-btn[data-action="load-more-sidebar"]')) {
        e.preventDefault();
        e.stopPropagation();
        const loadMoreBtn = e.target.closest('.load-more-btn');
        const offset = parseInt(loadMoreBtn.dataset.offset);
        const selector = document.getElementById('custom-selector').value;
        this.renderSidebarResults(selector, offset);
      } else if (e.target.closest('.load-more-btn[data-action="show-less"]')) {
        e.preventDefault();
        e.stopPropagation();
        const selector = document.getElementById('selector-text').textContent;
        this.renderResults(selector, 0);
      } else if (e.target.closest('.load-more-btn[data-action="show-less-sidebar"]')) {
        e.preventDefault();
        e.stopPropagation();
        const selector = document.getElementById('custom-selector').value;
        this.renderSidebarResults(selector, 0);
      }
    });

    // Left sidebar toggle events
    document.addEventListener('click', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      if (e.target.closest('.left-sidebar-toggle')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleLeftSidebar();
      }
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      // Don't close if clicking on extension elements or dynamic content
      if (e.target.closest('#css-selector-sidebar') || 
          e.target.closest('#css-selector-popup') || 
          e.target.closest('#css-selector-left-sidebar') ||
          e.target.closest('.left-sidebar-toggle') ||
          e.target.closest('.load-more-btn') ||
          e.target.closest('.show-less-btn') ||
          e.target.closest('.expand-btn') ||
          e.target.closest('.image-expand-btn') ||
          e.target.closest('.image-modal') ||
          e.target.closest('.selector-action-btn') ||
          e.target.closest('.add-selector-btn') ||
          e.target.closest('.image-modal-backdrop') ||
          e.target.closest('.image-modal-content') ||
          e.target.closest('.image-modal-close')) {
        return;
      }
      
      this.hideSidebar();
      // Don't hide popup when clicking outside, let hover logic handle it
    });

    // Custom selector input events
    document.addEventListener('input', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      if (e.target.id === 'custom-selector') {
        // Only handle input when sidebar is open (which means extension was enabled)
        this.updatePreview();
        // Auto-expand preview when typing
        this.expandCard('preview');
        // Auto-resize textarea
        this.autoResizeTextarea(e.target);
      }
    });

    // Card collapse/expand events
    document.addEventListener('click', (e) => {
      // Early return if extension is disabled
      if (!this.isEnabled) return;
      
      if (e.target.closest('.card-header')) {
        const cardName = e.target.closest('.card-header').dataset.card;
        this.toggleCard(cardName);
      }
    });

    // Drag and drop events for popup
    this.setupDragAndDrop();
  }

  setupDragAndDrop() {
    const dragHandle = document.getElementById('popup-drag-handle');
    if (!dragHandle) return;

    // Mouse down on drag handle
    dragHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left mouse button
      
      e.preventDefault();
      e.stopPropagation();
      
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      
      const rect = this.popup.getBoundingClientRect();
      this.popupStartX = rect.left;
      this.popupStartY = rect.top;
      
      this.popup.classList.add('dragging');
      document.body.style.userSelect = 'none';
      
      // Create bound handlers
      this.mouseMoveHandler = this.handleMouseMove.bind(this);
      this.mouseUpHandler = this.handleMouseUp.bind(this);
      
      // Add global mouse events
      document.addEventListener('mousemove', this.mouseMoveHandler);
      document.addEventListener('mouseup', this.mouseUpHandler);
    });
  }

  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - this.dragStartX;
    const deltaY = e.clientY - this.dragStartY;
    
    let newX = this.popupStartX + deltaX;
    let newY = this.popupStartY + deltaY;
    
    // Keep popup within viewport bounds
    const popupRect = this.popup.getBoundingClientRect();
    const maxX = window.innerWidth - popupRect.width;
    const maxY = window.innerHeight - popupRect.height;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));
    
    this.popup.style.left = newX + 'px';
    this.popup.style.top = newY + 'px';
    this.popup.style.transform = 'none'; // Override any transform
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.popup.classList.remove('dragging');
    document.body.style.userSelect = '';
    
    // Remove global mouse events
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler);
    }
  }

  showPopup(element, event) {
    if (!this.isEnabled || !this.isPopupEnabled) return;
    
    // Don't show popup if left sidebar is open
    if (this.leftSidebar && this.leftSidebar.classList.contains('show')) {
      return;
    }
    
    this.currentElement = element;
    const selector = this.generateSelector(element);
    
    document.getElementById('selector-text').textContent = selector;
    
    // Clear any existing results when showing new popup
    this.clearResults();
    
    // Position popup
    const rect = element.getBoundingClientRect();
    
    // Force a reflow to get accurate dimensions
    this.popup.style.visibility = 'hidden';
    this.popup.style.display = 'block';
    const popupRect = this.popup.getBoundingClientRect();
    this.popup.style.visibility = 'visible';
    this.popup.style.display = '';
    
    let left = rect.left + (rect.width / 2) - (popupRect.width / 2);
    let top = rect.top - popupRect.height - 10;
    
    // Adjust if popup goes off screen horizontally
    if (left < 10) left = 10;
    if (left + popupRect.width > window.innerWidth - 10) {
      left = window.innerWidth - popupRect.width - 10;
    }
    
    // Adjust if popup goes off screen vertically
    if (top < 10) {
      // Try to position below the element
      top = rect.bottom + 10;
      // If still off screen, position above
      if (top + popupRect.height > window.innerHeight - 10) {
        top = rect.top - popupRect.height - 10;
        // If still off screen, center vertically in viewport
        if (top < 10) {
          top = Math.max(10, (window.innerHeight - popupRect.height) / 2);
        }
      }
    }
    
    // Ensure popup is always within viewport bounds
    left = Math.max(10, Math.min(left, window.innerWidth - popupRect.width - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - popupRect.height - 10));
    
    this.popup.style.left = left + 'px';
    this.popup.style.top = top + 'px';
      
      // Ensure popup is always on top of modals/dialogs
      this.popup.style.zIndex = this.getMaxZIndex() + 1;
      
      this.popup.classList.add('show');
    
    // Add a small delay to prevent immediate hiding
    setTimeout(() => {
      this.popup.classList.add('visible');
    }, 50);
  }

  addHighlight(element) {
    // Always check if extension is enabled before adding highlight
    if (!this.isEnabled || !this.isPopupEnabled) {
      // If disabled, make sure to remove any existing highlights
      this.removeAllHighlights();
      return;
    }
    
    // Don't highlight if left sidebar is open
    if (this.leftSidebar && this.leftSidebar.classList.contains('show')) {
      return;
    }
    
    // Don't highlight if mouse is over left sidebar
    if (element.closest('#css-selector-left-sidebar') || element.closest('.left-sidebar-toggle')) {
      return;
    }
    
    // Remove any existing highlight
    this.removeAllHighlights();
    
    // Add highlight to current element
    element.classList.add('css-selector-highlight');
    
    // Ensure highlight is visible above modals/dialogs but below left sidebar
    const maxZIndex = this.getMaxZIndex();
    const highlightZIndex = Math.min(maxZIndex + 2, 10000); // Cap at 10000 to stay below left sidebar (10002)
    
    // Store original z-index and position
    const originalZIndex = element.style.zIndex;
    const originalPosition = element.style.position;
    
    // Apply high z-index with proper positioning
    element.style.zIndex = highlightZIndex;
    
    // If element doesn't have positioning, add relative positioning
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }
    
    // Store original values for restoration
    element.dataset.originalZIndex = originalZIndex;
    element.dataset.originalPosition = originalPosition;
  }

  removeHighlight(element) {
    // Always remove highlight, even when disabled
    element.classList.remove('css-selector-highlight');
    
    // Restore original styles
    if (element.dataset.originalZIndex !== undefined) {
      element.style.zIndex = element.dataset.originalZIndex;
      delete element.dataset.originalZIndex;
    }
    
    if (element.dataset.originalPosition !== undefined) {
      element.style.position = element.dataset.originalPosition;
      delete element.dataset.originalPosition;
    }
  }

  removeAllHighlights() {
    // Remove highlight from all elements
    const highlightedElements = document.querySelectorAll('.css-selector-highlight');
    highlightedElements.forEach(el => {
      this.removeHighlight(el);
    });
  }

  getMaxZIndex() {
    // Find the highest z-index on the page
    let maxZ = 0;
    const elements = document.querySelectorAll('*');
    
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const zIndex = parseInt(style.zIndex);
      
      if (!isNaN(zIndex) && zIndex > maxZ) {
        maxZ = zIndex;
      }
    });
    
    // Ensure minimum z-index for modals/dialogs
    return Math.max(maxZ, 9999);
  }

  hidePopup() {
    this.popup.classList.remove('show', 'visible');
    this.isMouseOverPopup = false;
    // Clear results when hiding popup
    this.clearResults();
    // Remove highlight when popup is hidden - only if enabled
    if (this.isEnabled) {
      this.removeAllHighlights();
    }
  }

  showSidebar() {
    if (!this.isEnabled || !this.currentElement) return;
    
    // Store original popup enabled state
    const wasPopupEnabled = this.isPopupEnabled;
    
    // Temporarily disable popup when sidebar is open (but keep extension enabled)
    this.isPopupEnabled = false;
    
    // Ensure sidebar is above modals/dialogs
    this.sidebar.style.zIndex = this.getMaxZIndex() + 3;
    
    // Populate sidebar with element info
    const t = this.getTranslations()[this.language];
    document.getElementById('element-tag').textContent = this.currentElement.tagName.toLowerCase();
    document.getElementById('element-id').textContent = this.currentElement.id || t.na;
    document.getElementById('element-classes').textContent = this.currentElement.className || t.na;
    
    const defaultSelector = this.generateSelector(this.currentElement);
    const textarea = document.getElementById('custom-selector');
    textarea.value = defaultSelector;
    
    // Auto-resize textarea
    this.autoResizeTextarea(textarea);
    
    // Generate DOM tree
    this.generateDOMTree();
    
    this.sidebar.classList.add('show');
    this.hidePopup();
    
    // Store the original state to restore later
    this.sidebar.dataset.originalPopupEnabled = wasPopupEnabled;
  }

  hideSidebar() {
    this.sidebar.classList.remove('show');
    // Restore original popup enabled state when sidebar is closed
    const originalPopupEnabled = this.sidebar.dataset.originalPopupEnabled;
    if (originalPopupEnabled !== undefined) {
      this.isPopupEnabled = originalPopupEnabled === 'true';
      delete this.sidebar.dataset.originalPopupEnabled;
    } else {
      // Default to true if no original state stored
      this.isPopupEnabled = true;
    }
  }

  generateDOMTree() {
    if (!this.currentElement) return;

    const domTree = document.getElementById('dom-tree');
    const path = [];
    let element = this.currentElement;

    // Build path from current element to document root
    while (element && element !== document.documentElement) {
      path.unshift(element);
      element = element.parentElement;
    }

    if (path.length === 0) {
      domTree.innerHTML = `
        <div class="dom-tree-placeholder">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <p>${this.getTranslations()[this.language].cannotCreateDomTree}</p>
        </div>
      `;
      return;
    }

    // Generate DOM tree HTML with proper nesting
    const treeHTML = path.map((el, index) => {
      const isCurrent = el === this.currentElement;
      const tagName = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
      const isLast = index === path.length - 1;
      
      // Create indentation based on depth
      const indent = '  '.repeat(index);
      const connector = isLast ? '└─' : '├─';
      
      // Add children count if element has children
      const childCount = el.children.length;
      const childInfo = childCount > 0 ? ` (${childCount} children)` : '';

      // Get direct text content (not from children)
      const directText = Array.from(el.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .join(' ')
        .trim();
      const textDisplay = directText ? `"${directText.substring(0, 50)}${directText.length > 50 ? '...' : ''}"` : '';

      return `
        <div class="dom-tree-item ${isCurrent ? 'dom-tree-current' : ''}" style="margin-left: ${index * 20}px;">
          <span class="dom-tree-connector">${connector}</span>
          <span class="dom-tree-tag">&lt;${tagName}&gt;</span>
          ${id ? `<span class="dom-tree-id">${id}</span>` : ''}
          ${classes ? `<span class="dom-tree-class">${classes}</span>` : ''}
          ${childInfo ? `<span class="dom-tree-children">${childInfo}</span>` : ''}
          ${textDisplay ? `<div class="dom-tree-text">${textDisplay}</div>` : ''}
        </div>
      `;
    }).join('');

    domTree.innerHTML = `
      <div class="dom-tree-path">
        <div class="dom-tree-root">
          <span class="dom-tree-connector">📄</span>
          <span class="dom-tree-tag">document</span>
        </div>
        ${treeHTML}
      </div>
    `;
  }

  generateSelector(element) {
    // Check if element has a valid ID (string and not empty)
    if (element.id && typeof element.id === 'string' && element.id.trim()) {
      return `#${element.id}`;
    }

    // Find the nearest parent with ID to start from
    let startElement = null;
    let current = element.parentElement;
    
    while (current && current !== document.documentElement) {
      if (current.id && typeof current.id === 'string' && current.id.trim()) {
        startElement = current;
        break;
      }
      current = current.parentElement;
    }

    // Build path from target element up to start element
    const path = [];
    current = element;

    while (current && current !== startElement) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id && typeof current.id === 'string' && current.id.trim()) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break; // Stop here if we find an ID
      } else if (current.className) {
        // Filter out highlight classes and escape class names properly
        const filteredClasses = current.className.split(' ')
          .filter(c => c.trim() && c !== 'css-selector-highlight') // Filter out highlight class
          .map(c => {
            // Escape special characters in CSS class names
            return c.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
          })
          .join('.');
        
        if (filteredClasses) {
          selector = `${current.tagName.toLowerCase()}.${filteredClasses}`;
          
          // Check if there are siblings with the same tag AND same classes
          const siblings = Array.from(current.parentElement?.children || [])
            .filter(sibling => sibling.tagName === current.tagName);
          
          // Only add nth-child if there are multiple siblings with same tag AND same classes
          if (siblings.length > 1) {
            const siblingsWithSameClasses = siblings.filter(sibling => {
              const siblingClasses = sibling.className.split(' ')
                .filter(c => c.trim() && c !== 'css-selector-highlight')
                .map(c => c.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&'))
                .join('.');
              return siblingClasses === filteredClasses;
            });
            
            // Only add nth-child if there are multiple siblings with same classes
            if (siblingsWithSameClasses.length > 1) {
              // Count position among ALL siblings (not just same tag)
              const allSiblings = Array.from(current.parentElement?.children || []);
              const index = allSiblings.indexOf(current) + 1;
              selector += `:nth-child(${index})`;
            }
          }
        } else {
          // No classes, check for other attributes like name
          if (current.name && typeof current.name === 'string' && current.name.trim()) {
            selector = `${current.tagName.toLowerCase()}[name="${current.name}"]`;
          } else {
            // Use nth-child as fallback
            const siblings = Array.from(current.parentElement?.children || [])
              .filter(sibling => sibling.tagName === current.tagName);
            
            if (siblings.length > 1) {
              // Count position among ALL siblings (not just same tag)
              const allSiblings = Array.from(current.parentElement?.children || []);
              const index = allSiblings.indexOf(current) + 1;
              selector += `:nth-child(${index})`;
            }
          }
        }
      } else {
        // For elements without id or class, check for name attribute first
        if (current.name && typeof current.name === 'string' && current.name.trim()) {
          selector = `${current.tagName.toLowerCase()}[name="${current.name}"]`;
        } else {
          // Use nth-child as fallback
          const siblings = Array.from(current.parentElement?.children || [])
            .filter(sibling => sibling.tagName === current.tagName);
          
          if (siblings.length > 1) {
            // Count position among ALL siblings (not just same tag)
            const allSiblings = Array.from(current.parentElement?.children || []);
            const index = allSiblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
          }
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }

    // Add the start element with ID if found
    if (startElement && startElement.id && typeof startElement.id === 'string' && startElement.id.trim()) {
      path.unshift(`#${startElement.id}`);
    }

    return path.join(' > ');
  }


  copySelector() {
    if (!this.isEnabled) return;
    
    const selector = document.getElementById('selector-text').textContent;
    const t = this.getTranslations()[this.language];
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(selector).then(() => {
        this.showNotification(t.copySuccess);
      }).catch(() => {
        this.fallbackCopy(selector);
      });
    } else {
      this.fallbackCopy(selector);
    }
  }

  fallbackCopy(text) {
    // Fallback method for older browsers
    const t = this.getTranslations()[this.language];
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      this.showNotification(t.copySuccess);
    } catch (err) {
      this.showNotification(t.cannotCopy);
    }
    
    document.body.removeChild(textArea);
  }

  copyFinalSelector() {
    const selector = document.getElementById('custom-selector').value;
    const t = this.getTranslations()[this.language];
    if (selector.trim()) {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(selector).then(() => {
          this.showNotification(t.customSelectorCopied);
        }).catch(() => {
          this.fallbackCopy(selector);
        });
      } else {
        this.fallbackCopy(selector);
      }
    }
  }

  testSelector() {
    const selector = document.getElementById('custom-selector').value;
    const preview = document.getElementById('selector-preview');
    const t = this.getTranslations()[this.language];
    
    if (!selector.trim()) {
      preview.innerHTML = `
        <div class="preview-placeholder">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 12l2 2 4-4"></path>
            <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
            <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
          </svg>
          <p>${t.previewPlaceholder}</p>
        </div>
      `;
      return;
    }
    
    try {
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        preview.innerHTML = `<div class="preview-error">❌ ${t.noElementsFound}</div>`;
      } else {
        // Store elements and render with load more functionality
        this.sidebarElements = Array.from(elements);
        this.renderSidebarResults(selector, 0);
      }
    } catch (error) {
      const errorText = t.invalidSelector.replace('{error}', error.message);
      preview.innerHTML = `<div class="preview-error">❌ ${errorText}</div>`;
    }
  }

  updatePreview() {
    this.testSelector();
  }

  toggleCard(cardName) {
    const content = document.querySelector(`[data-content="${cardName}"]`);
    const toggle = document.querySelector(`[data-toggle="${cardName}"]`);
    
    if (content.classList.contains('collapsed')) {
      this.expandCard(cardName);
    } else {
      this.collapseCard(cardName);
    }
  }

  expandCard(cardName) {
    const content = document.querySelector(`[data-content="${cardName}"]`);
    const toggle = document.querySelector(`[data-toggle="${cardName}"]`);
    
    content.classList.remove('collapsed');
    content.classList.add('expanded');
    toggle.classList.remove('collapsed');
  }

  collapseCard(cardName) {
    const content = document.querySelector(`[data-content="${cardName}"]`);
    const toggle = document.querySelector(`[data-toggle="${cardName}"]`);
    
    content.classList.remove('expanded');
    content.classList.add('collapsed');
    toggle.classList.add('collapsed');
  }

  autoResizeTextarea(textarea) {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    // Set height to scrollHeight, but cap it at max-height
    const maxHeight = 300; // matches CSS max-height
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = newHeight + 'px';
  }

  resetSelector() {
    if (this.currentElement) {
      const defaultSelector = this.generateSelector(this.currentElement);
      document.getElementById('custom-selector').value = defaultSelector;
      this.updatePreview();
    }
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 2000);
  }

  disableExtension() {
    // Hide all UI elements
    this.hidePopup();
    this.hideSidebar();
    this.hideLeftSidebar();
    
    // Hide left sidebar toggle button
    if (this.leftSidebarToggle) {
      this.leftSidebarToggle.style.display = 'none';
      this.leftSidebarToggle.style.visibility = 'hidden';
    }
    
    // Remove all highlights
    this.removeAllHighlights();
    
    // Clear any pending timeouts
    clearTimeout(this.hoverTimeout);
    
    // Reset state
    this.isMouseOverPopup = false;
    this.currentElement = null;
    this.isPopupEnabled = true; // Reset popup state
    
    // Clear any stored state
    if (this.sidebar) {
      delete this.sidebar.dataset.originalPopupEnabled;
    }
  }

  enableExtension() {
    // Show left sidebar toggle button when enabling
    if (this.leftSidebarToggle) {
      this.leftSidebarToggle.style.display = 'flex';
      this.leftSidebarToggle.style.visibility = 'visible';
    }
  }

  // Apply enabled state to UI elements
  applyEnabledState() {
    if (this.leftSidebarToggle) {
      if (this.isEnabled) {
        this.leftSidebarToggle.style.display = 'flex';
        this.leftSidebarToggle.style.visibility = 'visible';
      } else {
        this.leftSidebarToggle.style.display = 'none';
        this.leftSidebarToggle.style.visibility = 'hidden';
      }
    }
    
    // Also hide other UI elements if disabled
    if (!this.isEnabled) {
      this.hidePopup();
      this.hideSidebar();
      this.hideLeftSidebar();
      this.removeAllHighlights();
    }
  }

  injectStyles() {
    // Styles are in separate CSS file
  }

  // Run selector and show results in popup
  runSelector() {
    if (!this.isEnabled || !this.currentElement) return;
    
    const selector = document.getElementById('selector-text').textContent;
    const t = this.getTranslations()[this.language];
    
    if (!selector.trim()) {
      this.showNotification('No selector to run');
      return;
    }
    
    try {
      const elements = document.querySelectorAll(selector);
      const resultsContainer = document.querySelector('.selector-results');
      
      if (!resultsContainer) {
        // Create results container if it doesn't exist
        const selectorDisplay = document.querySelector('.selector-display');
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'selector-results';
        selectorDisplay.appendChild(resultsDiv);
      }
      
      const resultsDiv = document.querySelector('.selector-results');
      
      if (elements.length === 0) {
        resultsDiv.innerHTML = `
          <div class="selector-results-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            Results
          </div>
          <div class="selector-results-error">❌ ${t.noElementsFound}</div>
        `;
      } else {
        // Store elements and render with load more functionality
        this.currentElements = Array.from(elements);
        this.renderResults(selector, 0);
      }
    } catch (error) {
      const resultsDiv = document.querySelector('.selector-results') || this.createResultsContainer();
      const errorText = t.invalidSelector.replace('{error}', error.message);
      resultsDiv.innerHTML = `
        <div class="selector-results-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Results
        </div>
        <div class="selector-results-error">❌ ${errorText}</div>
      `;
    }
  }

  createResultsContainer() {
    const selectorDisplay = document.querySelector('.selector-display');
    const resultsDiv = document.createElement('div');
    resultsDiv.className = 'selector-results';
    selectorDisplay.appendChild(resultsDiv);
    return resultsDiv;
  }

  // Clear any existing results from popup
  clearResults() {
    const resultsDiv = document.querySelector('.selector-results');
    if (resultsDiv) {
      resultsDiv.remove();
    }
  }

  // Create expandable text component
  createExpandableText(text, maxLength = 50) {
    if (text.length <= maxLength) {
      return `"${text}"`;
    }
    
    const shortText = text.substring(0, maxLength);
    const uniqueId = `expandable-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
      <div class="expandable-text" data-id="${uniqueId}">
        <span class="text-preview">"${shortText}..."</span>
        <span class="text-full" style="display: none;">"${text}"</span>
        <button class="expand-btn" data-action="expand">
          <span class="expand-icon">▼</span>
        </button>
      </div>
    `;
  }

  // Create image preview component
  createImagePreview(src, alt) {
    const uniqueId = `image-preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return `
      <div class="image-preview" data-id="${uniqueId}">
        <div class="image-preview-container">
          <img src="${src}" alt="${alt || 'Image preview'}" class="image-preview-img" loading="lazy">
          <div class="image-preview-overlay">
            <div class="image-preview-info">
              <div class="image-src">${src}</div>
              ${alt ? `<div class="image-alt">Alt: ${alt}</div>` : ''}
            </div>
            <button class="image-expand-btn" data-action="expand-image" data-src="${src}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M15 3h6v6"></path>
                <path d="M10 14H4v6"></path>
                <path d="M21 3l-7 7"></path>
                <path d="M3 21l7-7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Create URL preview component for links
  createUrlPreview(href, text) {
    const uniqueId = `url-preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate URL
    let isValidUrl = false;
    let displayUrl = href;
    try {
      const url = new URL(href, window.location.href);
      isValidUrl = true;
      displayUrl = url.href;
    } catch (e) {
      // Invalid URL, keep original
    }
    
    return `
      <div class="url-preview" data-id="${uniqueId}">
        <div class="url-preview-container">
          <div class="url-preview-info">
            <div class="url-preview-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </div>
            <div class="url-preview-details">
              <div class="url-preview-text">${text || 'Link'}</div>
              <div class="url-preview-url ${isValidUrl ? 'valid' : 'invalid'}">${displayUrl}</div>
            </div>
          </div>
          <button class="url-preview-btn" data-action="open-url" data-url="${displayUrl}" title="Open link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15,3 21,3 21,9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  // Open image in modal
  openImageModal(src) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.image-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
      <div class="image-modal-backdrop"></div>
      <div class="image-modal-content">
        <button class="image-modal-close" data-action="close-image-modal">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <img src="${src}" alt="Full size image" class="image-modal-img">
        <div class="image-modal-info">
          <div class="image-modal-src">${src}</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal when clicking backdrop or close button
    modal.addEventListener('click', (e) => {
      if (e.target.classList.contains('image-modal-backdrop') || 
          e.target.closest('.image-modal-close')) {
        modal.remove();
      }
    });

    // Close modal with Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  // Open URL in new tab
  openUrl(url) {
    try {
      // Validate URL before opening
      const validUrl = new URL(url, window.location.href);
      window.open(validUrl.href, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Invalid URL:', url);
      this.showNotification('Invalid URL: ' + url);
    }
  }

  // Render results with load more functionality
  renderResults(selector, offset = 0) {
    if (!this.currentElements) return;
    
    const t = this.getTranslations()[this.language];
    const elements = this.currentElements;
    const itemsPerPage = 5;
    const startIndex = offset;
    const endIndex = Math.min(startIndex + itemsPerPage, elements.length);
    const currentElements = elements.slice(startIndex, endIndex);
    const hasMore = endIndex < elements.length;
    const showLess = offset > 0;
    
    const resultsDiv = document.querySelector('.selector-results');
    if (!resultsDiv) return;
    
    const foundText = t.foundElements.replace('{count}', elements.length);
    const moreText = hasMore ? t.andMore.replace('{count}', elements.length - endIndex) : '';
    const lessText = t.showLess || 'Show Less';
    
    resultsDiv.innerHTML = `
      <div class="selector-results-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12l2 2 4-4"></path>
          <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
          <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
        </svg>
        Results
      </div>
      <div class="selector-results-success">✅ ${foundText}</div>
      <div class="selector-results-list">
        ${currentElements.map((el, index) => {
          const tagName = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : '';
          const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
          const directText = Array.from(el.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent.trim())
            .join(' ')
            .trim();
          const textDisplay = directText ? this.createExpandableText(directText, 50) : '';
          
          // Check if element is an image
          const isImage = tagName === 'img';
          const imageSrc = isImage ? el.src : null;
          const imageAlt = isImage ? el.alt : null;
          const imagePreview = isImage && imageSrc ? this.createImagePreview(imageSrc, imageAlt) : '';
          
          // Check if element is a link
          const isLink = tagName === 'a';
          const linkHref = isLink ? el.href : null;
          const linkText = isLink ? (el.textContent || el.title || 'Link') : null;
          const urlPreview = isLink && linkHref ? this.createUrlPreview(linkHref, linkText) : '';
          
          return `
            <div class="selector-result-item">
              <div>
                <span class="selector-result-tag">${tagName}</span>
                ${id ? `<span class="selector-result-id">${id}</span>` : ''}
                ${classes ? `<span class="selector-result-class">${classes}</span>` : ''}
              </div>
              ${textDisplay ? `<div class="selector-result-text">${textDisplay}</div>` : ''}
              ${imagePreview ? `<div class="selector-result-image">${imagePreview}</div>` : ''}
              ${urlPreview ? `<div class="selector-result-url">${urlPreview}</div>` : ''}
            </div>
          `;
        }).join('')}
        <div class="load-more-controls">
          ${hasMore ? `<div class="load-more-btn" data-action="load-more" data-offset="${endIndex}">${moreText}</div>` : ''}
          ${showLess ? `<div class="load-more-btn show-less-btn" data-action="show-less">${lessText}</div>` : ''}
        </div>
      </div>
    `;
  }

  // Render sidebar results with load more functionality
  renderSidebarResults(selector, offset = 0) {
    if (!this.sidebarElements) return;
    
    const t = this.getTranslations()[this.language];
    const elements = this.sidebarElements;
    const itemsPerPage = 5;
    const startIndex = offset;
    const endIndex = Math.min(startIndex + itemsPerPage, elements.length);
    const currentElements = elements.slice(startIndex, endIndex);
    const hasMore = endIndex < elements.length;
    const showLess = offset > 0;
    
    const preview = document.querySelector('.preview-box');
    if (!preview) return;
    
    const foundText = t.foundElements.replace('{count}', elements.length);
    const moreText = hasMore ? t.andMore.replace('{count}', elements.length - endIndex) : '';
    const lessText = t.showLess || 'Show Less';
    
    preview.innerHTML = `
      <div class="preview-success">
        ✅ ${foundText}
        <div class="preview-elements">
          ${currentElements.map((el, index) => {
            const tagName = el.tagName.toLowerCase();
            const id = el.id ? `#${el.id}` : '';
            const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
            const directText = Array.from(el.childNodes)
              .filter(node => node.nodeType === Node.TEXT_NODE)
              .map(node => node.textContent.trim())
              .join(' ')
              .trim();
            const textDisplay = directText ? this.createExpandableText(directText, 50) : '';
            
            // Check if element is an image
            const isImage = tagName === 'img';
            const imageSrc = isImage ? el.src : null;
            const imageAlt = isImage ? el.alt : null;
            const imagePreview = isImage && imageSrc ? this.createImagePreview(imageSrc, imageAlt) : '';
            
            // Check if element is a link
            const isLink = tagName === 'a';
            const linkHref = isLink ? el.href : null;
            const linkText = isLink ? (el.textContent || el.title || 'Link') : null;
            const urlPreview = isLink && linkHref ? this.createUrlPreview(linkHref, linkText) : '';
            
            return `
              <div class="preview-element">
                <div class="preview-element-header">
                  <span class="preview-element-index">${startIndex + index + 1}.</span>
                  <span class="preview-element-tag">${tagName}</span>
                  ${id ? `<span class="preview-element-id">${id}</span>` : ''}
                  ${classes ? `<span class="preview-element-class">${classes}</span>` : ''}
                </div>
                ${textDisplay ? `<div class="preview-element-text">${textDisplay}</div>` : ''}
                ${imagePreview ? `<div class="preview-element-image">${imagePreview}</div>` : ''}
                ${urlPreview ? `<div class="preview-element-url">${urlPreview}</div>` : ''}
              </div>
            `;
          }).join('')}
          <div class="load-more-controls">
            ${hasMore ? `<div class="load-more-btn" data-action="load-more-sidebar" data-offset="${endIndex}">${moreText}</div>` : ''}
            ${showLess ? `<div class="load-more-btn show-less-btn" data-action="show-less-sidebar">${lessText}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Save selector to left sidebar
  saveSelector() {
    if (!this.isEnabled || !this.currentElement) return;
    
    const selector = document.getElementById('selector-text').textContent;
    const t = this.getTranslations()[this.language];
    
    if (!selector.trim()) {
      this.showNotification('No selector to save');
      return;
    }
    
    const name = prompt(t.enterSelectorName);
    if (!name || !name.trim()) {
      return;
    }
    
    const newSelector = {
      id: Date.now().toString(),
      name: name.trim(),
      selector: selector.trim(),
      createdAt: new Date().toISOString()
    };
    
    this.savedSelectors.push(newSelector);
    this.saveSelectorsToStorage();
    this.updateSavedSelectorsTable();
    this.showNotification(t.selectorSaved);
    
    // Auto-open left sidebar to show the saved result
    this.showLeftSidebar();
  }

  // Toggle left sidebar
  toggleLeftSidebar() {
    if (this.leftSidebar.classList.contains('show')) {
      this.hideLeftSidebar();
    } else {
      this.showLeftSidebar();
    }
  }

  showLeftSidebar() {
    this.leftSidebar.classList.add('show');
    this.leftSidebarToggle.classList.add('collapsed', 'sidebar-open');
    this.updateSavedSelectorsTable();
    
    // Hide popup and remove highlights when left sidebar is open
    this.hidePopup();
    this.removeAllHighlights();
  }

  hideLeftSidebar() {
    this.leftSidebar.classList.remove('show');
    this.leftSidebarToggle.classList.remove('collapsed', 'sidebar-open');
  }

  // Add new selector manually
  addNewSelector() {
    const t = this.getTranslations()[this.language];
    const name = prompt(t.enterSelectorName);
    if (!name || !name.trim()) {
      return;
    }
    
    const selector = prompt('Enter CSS selector:');
    if (!selector || !selector.trim()) {
      return;
    }
    
    const newSelector = {
      id: Date.now().toString(),
      name: name.trim(),
      selector: selector.trim(),
      createdAt: new Date().toISOString()
    };
    
    this.savedSelectors.push(newSelector);
    this.saveSelectorsToStorage();
    this.updateSavedSelectorsTable();
    this.showNotification(t.selectorSaved);
    
    // Auto-open left sidebar to show the saved result
    this.showLeftSidebar();
  }

  // Edit a saved selector
  editSelector(selectorId) {
    const selector = this.savedSelectors.find(s => s.id === selectorId);
    if (!selector) {
      console.log('Selector not found');
      return;
    }
    
    const row = document.querySelector(`tr[data-selector-id="${selectorId}"]`);
    if (!row) {
      return;
    }
    
    const nameCell = row.querySelector('.selector-name-cell');
    const valueCell = row.querySelector('.selector-value-cell');
    const actionsCell = row.querySelector('.selector-actions');
    
    // Create edit inputs
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'selector-edit-input selector-name-input';
    nameInput.value = selector.name;
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'selector-edit-input selector-value-input';
    valueInput.value = selector.selector;
    
    // Replace cell content with inputs
    nameCell.innerHTML = '';
    nameCell.className = 'selector-name-cell editing';
    nameCell.appendChild(nameInput);
    
    valueCell.innerHTML = '';
    valueCell.className = 'selector-value-cell editing';
    valueCell.appendChild(valueInput);
    
    // Replace actions with save/cancel buttons
    actionsCell.innerHTML = `
      <button class="selector-action-btn save" data-action="save" data-selector-id="${selectorId}" title="Save changes">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
      </button>
      <button class="selector-action-btn cancel" data-action="cancel" data-selector-id="${selectorId}" title="Cancel">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    `;
    
    // Focus on name input
    nameInput.focus();
    nameInput.select();
    
    // Click outside to cancel
    const handleClickOutside = (e) => {
      if (!e.target.closest(`tr[data-selector-id="${selectorId}"]`)) {
        this.cancelSelectorEdit(selectorId);
        document.removeEventListener('click', handleClickOutside);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
  }

  // Save selector edit
  saveSelectorEdit(selectorId) {
    const selector = this.savedSelectors.find(s => s.id === selectorId);
    if (!selector) return;
    
    const row = document.querySelector(`tr[data-selector-id="${selectorId}"]`);
    if (!row) return;
    
    const nameInput = row.querySelector('.selector-name-input');
    const valueInput = row.querySelector('.selector-value-input');
    
    const newName = nameInput.value.trim();
    const newSelector = valueInput.value.trim();
    
    if (!newName || !newSelector) {
      this.showNotification('Name and selector cannot be empty');
      return;
    }
    
    // Update selector
    selector.name = newName;
    selector.selector = newSelector;
    selector.updatedAt = new Date().toISOString();
    
    this.saveSelectorsToStorage();
    this.updateSavedSelectorsTable();
    this.showNotification('Selector updated successfully!');
  }

  // Cancel selector edit
  cancelSelectorEdit(selectorId) {
    this.updateSavedSelectorsTable();
  }

  // Delete a saved selector
  deleteSelector(selectorId) {
    const t = this.getTranslations()[this.language];
    if (confirm('Are you sure you want to delete this selector?')) {
      this.savedSelectors = this.savedSelectors.filter(s => s.id !== selectorId);
      this.saveSelectorsToStorage();
      this.updateSavedSelectorsTable();
      this.showNotification(t.selectorDeleted);
    }
  }

  // Update the saved selectors table
  updateSavedSelectorsTable() {
    const tbody = document.getElementById('saved-selectors-tbody');
    if (!tbody) return;
    
    if (this.savedSelectors.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3">
            <div class="empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 12l2 2 4-4"></path>
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"></path>
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"></path>
              </svg>
              <p>No saved selectors</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    
    tbody.innerHTML = this.savedSelectors.map(selector => `
      <tr data-selector-id="${selector.id}">
        <td class="selector-name-cell" title="${selector.name}">${selector.name}</td>
        <td class="selector-value-cell" title="${selector.selector}">${selector.selector}</td>
        <td class="selector-actions">
          <button class="selector-action-btn edit" data-action="edit" data-selector-id="${selector.id}" title="Edit selector">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="selector-action-btn delete" data-action="delete" data-selector-id="${selector.id}" title="Delete selector">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  // Load saved selectors from storage
  async loadSavedSelectors() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['savedSelectors']);
        this.savedSelectors = result.savedSelectors || [];
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem('css-selector-saved-selectors');
        this.savedSelectors = stored ? JSON.parse(stored) : [];
      }
    } catch (error) {
      console.log('Error loading saved selectors:', error);
      this.savedSelectors = [];
    }
  }

  // Save selectors to storage
  async saveSelectorsToStorage() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({ savedSelectors: this.savedSelectors });
      } else {
        // Fallback to localStorage
        localStorage.setItem('css-selector-saved-selectors', JSON.stringify(this.savedSelectors));
      }
    } catch (error) {
      console.log('Error saving selectors:', error);
    }
  }
}

// Initialize the inspector
const inspector = new CSSSelectorInspector();
