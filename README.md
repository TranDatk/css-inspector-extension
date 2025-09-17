# CSS Selector Inspector Extension

A powerful Chrome extension that helps developers inspect and generate CSS selectors for web elements with an intuitive interface and advanced features.

## Features

### 🎯 Core Functionality
- **Hover Inspection**: Hover over any element to see its CSS selector
- **Smart Selector Generation**: Automatically generates unique and reliable CSS selectors
- **Visual Highlighting**: Elements are highlighted when hovered for better visibility
- **Drag & Drop Popup**: Move the popup anywhere on the page

### 🛠️ Advanced Tools
- **Sidebar Editor**: Full-featured editor for customizing and testing selectors
- **DOM Tree Visualization**: See the complete DOM path from element to document root
- **Selector Testing**: Test selectors and see matching elements in real-time
- **Saved Selectors**: Save frequently used selectors for quick access
- **Left Sidebar**: Quick access to saved selectors with management features

### 🌐 Internationalization
- **Multi-language Support**: English and Japanese
- **Localized Interface**: All UI elements are translated

### ⚙️ Customization
- **Hover Delay**: Adjustable delay before showing popup (500ms - 5000ms)
- **Theme Support**: Modern, Dark, and Light themes
- **Language Selection**: Switch between supported languages

## Installation

### From Source
1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension icon should appear in your toolbar

### Files Structure
```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Background script
├── content.js            # Main content script
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── styles.css            # Extension styles
├── README.md             # This file
└── INSTALL.md            # Installation instructions
```

## Usage

### Basic Usage
1. **Enable the Extension**: Click the extension icon and toggle it on
2. **Hover Over Elements**: Move your mouse over any element on the page
3. **View Selector**: The CSS selector will appear in a popup
4. **Copy Selector**: Click the copy button to copy the selector to clipboard

### Advanced Usage

#### Using the Sidebar Editor
1. Click the "Open Sidebar Editor" button in the popup
2. Edit the CSS selector in the text area
3. Test the selector to see matching elements
4. Copy the final selector when satisfied

#### Managing Saved Selectors
1. Click the left sidebar toggle button (arrow icon)
2. Add new selectors manually or save from hover inspection
3. Edit, delete, or test saved selectors
4. Quick access to frequently used selectors

#### Keyboard Shortcuts (in popup)
- `Ctrl/Cmd + T`: Toggle extension on/off
- `Ctrl/Cmd + E`: Open sidebar editor
- `Ctrl/Cmd + ,`: Open settings

## Configuration

### Settings Panel
Access settings through the extension popup:
- **Language**: Choose interface language
- **Hover Delay**: Set delay before popup appears (500-5000ms)
- **Theme**: Select visual theme (Modern/Dark/Light)

### Default Settings
- **Enabled**: true
- **Hover Delay**: 1000ms
- **Theme**: modern
- **Language**: en

## Technical Details

### Selector Generation Algorithm
The extension uses a smart algorithm to generate reliable CSS selectors:

1. **ID Priority**: If element has a unique ID, use `#id`
2. **Class-based**: Use classes with nth-child when needed for uniqueness
3. **Attribute-based**: Fall back to name attributes for form elements
4. **Position-based**: Use nth-child as last resort for positioning

### Browser Compatibility
- Chrome 88+
- Chromium-based browsers (Edge, Brave, etc.)

### Performance
- Lightweight and fast
- Minimal impact on page performance
- Efficient event handling with proper cleanup

## Development

### Building from Source
1. Clone the repository
2. No build process required - pure JavaScript/CSS/HTML
3. Load as unpacked extension in Chrome

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Structure
- **content.js**: Main extension logic, DOM manipulation, event handling
- **popup.js**: Popup interface logic and settings management
- **background.js**: Background tasks and context menu
- **styles.css**: All extension styling and themes

## Troubleshooting

### Common Issues

**Extension not working:**
- Ensure extension is enabled in Chrome extensions page
- Check if the page allows content scripts
- Try refreshing the page

**Selectors not accurate:**
- The extension prioritizes uniqueness over simplicity
- Use the sidebar editor to customize selectors
- Test selectors before using in automation

**Performance issues:**
- Reduce hover delay in settings
- Disable extension on heavy pages if needed

### Debug Mode
Open browser console to see extension logs and debug information.

## License

This project is open source and available under the MIT License.

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section
2. Open an issue on GitHub
3. Review the code for customization options

## Changelog

### Version 1.0.0
- Initial release
- Basic hover inspection
- Sidebar editor
- Saved selectors management
- Multi-language support
- Theme customization
- Drag & drop popup

---

**Made with ❤️ for developers who love clean, reliable CSS selectors**
