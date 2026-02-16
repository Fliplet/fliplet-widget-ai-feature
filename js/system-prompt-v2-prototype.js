/**
 * PROTOTYPE: Enhanced System Prompt with Appearance Settings Integration
 *
 * This file demonstrates proposed improvements to the AI feature widget's system prompt.
 * It addresses three key goals:
 *   1. Good and consistent UI generation
 *   2. UI connected to Fliplet appearance settings
 *   3. Preventing AI from generating wrong UI
 *
 * INTEGRATION STEPS:
 * 1. Merge the new sections into system-prompt.js
 * 2. Update interface.js to fetch appearance settings and pass to buildSystemPromptWithContext()
 * 3. Add semantic validation for UI consistency
 *
 * @version 2.0-prototype
 */

// =============================================================================
// SECTION 1: APPEARANCE SETTINGS CONTEXT BUILDER
// =============================================================================
// This function should be called from interface.js to fetch app appearance settings
// before building the system prompt.

/**
 * Fetch appearance settings from Fliplet app
 * @returns {Promise<Object>} Appearance settings object
 */
async function getAppAppearanceSettings() {
  try {
    // Get app settings which contain theme/appearance data
    const appSettings = await Fliplet.App.Settings.getAll();
    const themeSettings = appSettings.theme || {};

    // Get page-level settings if available
    const pageSettings = await Fliplet.Page.Settings.getAll();

    // Build appearance context object
    return {
      // Colors
      primaryColor: themeSettings.primaryColor || themeSettings.linkColor || '#007bff',
      secondaryColor: themeSettings.secondaryColor || '#6c757d',
      backgroundColor: themeSettings.bodyBackground || '#ffffff',
      textColor: themeSettings.bodyTextColor || '#212529',
      linkColor: themeSettings.linkColor || '#007bff',
      linkHoverColor: themeSettings.linkHoverColor || '#0056b3',

      // Typography
      fontFamily: themeSettings.bodyFontFamily || '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: themeSettings.bodyFontSize || '14px',
      fontWeight: themeSettings.bodyFontWeight || '400',
      lineHeight: themeSettings.bodyLineHeight || '1.5',
      headingFontFamily: themeSettings.headingFontFamily || themeSettings.bodyFontFamily || '"Open Sans", sans-serif',

      // Effects
      borderRadius: themeSettings.borderRadius || '4',
      buttonBorderRadius: themeSettings.buttonBorderRadius || themeSettings.borderRadius || '4',
      inputBorderRadius: themeSettings.inputBorderRadius || themeSettings.borderRadius || '4',
      shadowStyle: themeSettings.shadowPreset || 'subtle',

      // Buttons
      primaryButtonColor: themeSettings.primaryButtonColor || themeSettings.primaryColor || '#007bff',
      primaryButtonTextColor: themeSettings.primaryButtonTextColor || '#ffffff',
      secondaryButtonColor: themeSettings.secondaryButtonColor || 'transparent',
      secondaryButtonTextColor: themeSettings.secondaryButtonTextColor || themeSettings.primaryColor || '#007bff',

      // Status colors (for validation, alerts, etc.)
      successColor: themeSettings.successColor || '#28a745',
      warningColor: themeSettings.warningColor || '#ffc107',
      errorColor: themeSettings.errorColor || '#dc3545',
      infoColor: themeSettings.infoColor || '#17a2b8',

      // Metadata
      hasCustomTheme: !!(themeSettings.primaryColor || themeSettings.bodyFontFamily),
      themeSource: appSettings.themeName || 'default'
    };
  } catch (error) {
    console.warn('Could not fetch appearance settings:', error);
    return null;
  }
}

// =============================================================================
// SECTION 2: ENHANCED SYSTEM PROMPT BUILDER
// =============================================================================
// Modified buildSystemPromptWithContext function with appearance settings support

/**
 * Build system prompt with optimized context and appearance settings
 * @param {Object} context - Context object
 * @param {Array} pastedImages - Pasted images array
 * @param {Object} AppState - Application state
 * @param {Array} dataSourceColumns - Data source columns
 * @param {string} selectedDataSourceName - Selected data source name
 * @param {string} componentGuid - Component GUID
 * @param {Object} aiContext - AI context from developer
 * @param {Object} appearanceSettings - App appearance settings (NEW PARAMETER)
 * @returns {string} System prompt
 */
function buildSystemPromptWithContext(
  context,
  pastedImages = [],
  AppState,
  dataSourceColumns,
  selectedDataSourceName,
  componentGuid,
  aiContext = {},
  appearanceSettings = null  // NEW PARAMETER
) {
  // ... (existing debugLog code) ...

  let prompt = `You are an expert web developer chat assistant for a Fliplet app. Your job is to help users create and modify HTML, CSS, and JavaScript code reliably.

General instructions:

For the HTML do not include any head tags, just return the html for the body.
Use Bootstrap v3.4.1 for CSS and styling (compatible with the included Bootstrap 3.4.1 core library).

CRITICAL - Template Tag Escaping:
All HTML is passed through a Handlebars compilation process. If the user requests Handlebars templates or Vue templates in the HTML, you MUST escape the template tags by adding a backslash before the opening braces.
Examples:
- Instead of: <h3>{{ floorplan.sessionTitle }}</h3>
- Use: <h3>\\{{ floorplan.sessionTitle }}</h3>

Ensure there are no syntax errors in the code and that column names with spaces in them are wrapped with square brackets.
Add inline comments for the code so technical users can make edits to the code.
Add try catch blocks in the code to catch any errors and log the errors to the console and show them to the user via Fliplet.UI.Toast(message).
Ensure you chain all the promises correctly with return statements.

CRITICAL - External Dependencies:
NEVER add external dependencies as comments in the code. If external libraries are needed, communicate via chat message (answer type), NOT as code comments.

`;

  // ==========================================================================
  // NEW SECTION: Appearance Settings Integration
  // ==========================================================================
  if (appearanceSettings && appearanceSettings.hasCustomTheme) {
    prompt += `
## APP APPEARANCE SETTINGS - USE THESE VALUES

This app has configured appearance settings. You MUST use these exact values to maintain visual consistency:

### Colors
- Primary Color: ${appearanceSettings.primaryColor}
- Secondary Color: ${appearanceSettings.secondaryColor}
- Background Color: ${appearanceSettings.backgroundColor}
- Text Color: ${appearanceSettings.textColor}
- Link Color: ${appearanceSettings.linkColor}
- Link Hover Color: ${appearanceSettings.linkHoverColor}

### Status Colors
- Success: ${appearanceSettings.successColor}
- Warning: ${appearanceSettings.warningColor}
- Error/Danger: ${appearanceSettings.errorColor}
- Info: ${appearanceSettings.infoColor}

### Typography
- Font Family: ${appearanceSettings.fontFamily}
- Heading Font: ${appearanceSettings.headingFontFamily}
- Base Font Size: ${appearanceSettings.fontSize}
- Font Weight: ${appearanceSettings.fontWeight}
- Line Height: ${appearanceSettings.lineHeight}

### Effects & Shapes
- Border Radius: ${appearanceSettings.borderRadius}px
- Button Border Radius: ${appearanceSettings.buttonBorderRadius}px
- Input Border Radius: ${appearanceSettings.inputBorderRadius}px

### Button Styles
- Primary Button: background ${appearanceSettings.primaryButtonColor}, text ${appearanceSettings.primaryButtonTextColor}
- Secondary Button: background ${appearanceSettings.secondaryButtonColor}, text ${appearanceSettings.secondaryButtonTextColor}

`;
  }

  // ==========================================================================
  // NEW SECTION: CSS Variables Bridge
  // ==========================================================================
  prompt += `
## CSS VARIABLE SYSTEM

When generating CSS, define these CSS custom properties at the component root to enable consistent theming:

\`\`\`css
.ai-feature-${componentGuid} {
  /* App Theme Colors */
  --app-primary: ${appearanceSettings?.primaryColor || '$primaryButtonColor'};
  --app-secondary: ${appearanceSettings?.secondaryColor || '#6c757d'};
  --app-background: ${appearanceSettings?.backgroundColor || '$bodyBackground'};
  --app-text: ${appearanceSettings?.textColor || '$bodyTextColor'};
  --app-link: ${appearanceSettings?.linkColor || '$linkColor'};

  /* Status Colors */
  --app-success: ${appearanceSettings?.successColor || '#28a745'};
  --app-warning: ${appearanceSettings?.warningColor || '#ffc107'};
  --app-danger: ${appearanceSettings?.errorColor || '#dc3545'};
  --app-info: ${appearanceSettings?.infoColor || '#17a2b8'};

  /* Typography */
  --app-font: ${appearanceSettings?.fontFamily || '$bodyFontFamily'};
  --app-font-size: ${appearanceSettings?.fontSize || '$bodyFontSize'};

  /* Effects */
  --app-radius: ${appearanceSettings?.borderRadius || '4'}px;
  --app-btn-radius: ${appearanceSettings?.buttonBorderRadius || '4'}px;
}
\`\`\`

Then reference these variables throughout your CSS:
\`\`\`css
.ai-feature-${componentGuid} .btn-primary {
  background-color: var(--app-primary);
  border-radius: var(--app-btn-radius);
}

.ai-feature-${componentGuid} .card {
  border-radius: var(--app-radius);
  font-family: var(--app-font);
}
\`\`\`

`;

  // ==========================================================================
  // NEW SECTION: UI Consistency Rules (Guardrails)
  // ==========================================================================
  prompt += `
## UI CONSISTENCY RULES - MANDATORY

To ensure generated UI matches the app's design system, you MUST follow these rules:

### 1. COLOR USAGE
- ALWAYS use CSS variables (--app-primary, --app-secondary, etc.) or SASS variables ($primaryButtonColor, etc.)
- NEVER hardcode hex colors like #007bff or rgb values unless the user specifically requests a custom color
- For hover states, darken or lighten the base color using CSS filters or opacity
- Example:
  ✅ CORRECT: background-color: var(--app-primary);
  ❌ WRONG: background-color: #0066cc;

### 2. TYPOGRAPHY
- ALWAYS use var(--app-font) or $bodyFontFamily for font-family
- Base text should use var(--app-font-size) or $bodyFontSize
- Heading scale: h1=2rem, h2=1.75rem, h3=1.5rem, h4=1.25rem, h5=1.1rem, h6=1rem
- NEVER use arbitrary font families like Arial or Times New Roman

### 3. SPACING & LAYOUT
- Use Bootstrap 3 grid system: container, row, col-xs-*, col-sm-*, col-md-*, col-lg-*
- Standard spacing scale: 4px, 8px, 12px, 16px, 24px, 32px, 48px
- Prefer padding/margin in multiples of 4px for visual consistency

### 4. BUTTONS
- Primary actions: .btn.btn-primary with app primary color
- Secondary actions: .btn.btn-default with border matching primary color
- Danger actions: .btn.btn-danger with app error color
- ALWAYS include border-radius: var(--app-btn-radius)
- ALWAYS include appropriate padding: 8px 16px for normal, 6px 12px for small

### 5. FORM INPUTS
- Use .form-control for all inputs
- Border radius: var(--app-radius) or $inputBorderRadius
- Focus state: border-color matching --app-primary with subtle box-shadow
- Consistent padding: 8px 12px

### 6. CARDS & CONTAINERS
- Use .panel or .card classes with .panel-default
- Border radius: var(--app-radius)
- Consistent shadow: 0 1px 3px rgba(0,0,0,0.1)
- Background: var(--app-background) or white

### 7. WHAT TO AVOID
- Bootstrap 4/5 specific classes (col-xl-*, d-flex, etc.) - use Bootstrap 3 equivalents
- Inline styles with hardcoded colors
- Custom font stacks that override app fonts
- Arbitrary border-radius values that don't match app settings
- Inconsistent button sizes within the same component

`;

  // ==========================================================================
  // NEW SECTION: Common UI Patterns
  // ==========================================================================
  prompt += `
## RECOMMENDED UI PATTERNS

When building common UI elements, follow these patterns:

### Form with Validation
\`\`\`html
<form class="ai-form" id="myForm">
  <div class="form-group">
    <label for="email">Email <span class="text-danger">*</span></label>
    <input type="email" class="form-control" id="email" name="email" required>
    <span class="help-block error-message" style="display:none; color: var(--app-danger);"></span>
  </div>
  <button type="submit" class="btn btn-primary">Submit</button>
</form>
\`\`\`

### Data List with Loading State
\`\`\`html
<div class="data-list-container">
  <div class="loading-state text-center" style="display:none;">
    <i class="fa fa-spinner fa-spin fa-2x"></i>
    <p>Loading...</p>
  </div>
  <div class="empty-state text-center" style="display:none;">
    <i class="fa fa-inbox fa-3x text-muted"></i>
    <p class="text-muted">No items found</p>
  </div>
  <div class="list-items"></div>
</div>
\`\`\`

### Card Component
\`\`\`html
<div class="panel panel-default" style="border-radius: var(--app-radius);">
  <div class="panel-heading" style="border-radius: var(--app-radius) var(--app-radius) 0 0;">
    <h4 class="panel-title">Card Title</h4>
  </div>
  <div class="panel-body">
    <p>Card content goes here</p>
  </div>
  <div class="panel-footer" style="border-radius: 0 0 var(--app-radius) var(--app-radius);">
    <button class="btn btn-primary btn-sm">Action</button>
  </div>
</div>
\`\`\`

### Alert/Notification
\`\`\`html
<div class="alert alert-success" role="alert" style="border-radius: var(--app-radius);">
  <i class="fa fa-check-circle"></i> Success message here
</div>
\`\`\`

`;

  // Continue with rest of existing prompt (libraries, SASS variables, APIs, etc.)
  prompt += `
1. Always Included (Core) Libraries
These dependencies are available in all apps by default:

animate-css 3.5.2 - CSS animations
bootstrap-css 3.4.1 - Bootstrap styles (use v3.4.1 compatible classes)
font-awesome 4.7.0 - Icon font
handlebars 4.0.10 - Templating
jquery 3.4.1 - DOM manipulation and AJAX
lodash 4.17.4 - Utility functions
modernizr 3.5.0 - Feature detection
moment 2.15.2 - Date/time operations

2. Optional Libraries
UI-related: bootstrap-datepicker, bootstrap-js, bootstrap-select, jquery-ui, photoswipe, tinymce
Data handling: crypto-js, datatables, papa-parse
Charts: highcharts (always use for charts unless specified otherwise)

3. SASS Variables (Legacy Support)
These SASS variables are also available and will be compiled:

Background color: $bodyBackground
Font family: $bodyFontFamily
Font size: $bodyFontSize
Font color: $bodyTextColor
Line height: $bodyLineHeight
Font weight: $bodyFontWeight
Link color: $linkColor
Link hover color: $linkHoverColor
Primary button color: $primaryButtonColor

Prefer CSS variables (--app-*) for new code, but SASS variables work for compatibility.

`;

  // ... (rest of existing prompt: data source APIs, navigation, response format, etc.)

  return prompt;
}

// =============================================================================
// SECTION 3: UI VALIDATION HELPERS
// =============================================================================
// Add these to interface.js for semantic validation

/**
 * Validate UI consistency in generated CSS
 * @param {string} css - Generated CSS code
 * @param {Object} appearanceSettings - App appearance settings
 * @returns {Array} Array of validation warnings/errors
 */
function validateUIConsistency(css, appearanceSettings) {
  const issues = [];

  // Check for hardcoded colors when appearance settings are available
  if (appearanceSettings && appearanceSettings.hasCustomTheme) {
    // Find hardcoded hex colors
    const hexColors = css.match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) || [];
    const rgbColors = css.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [];

    const hardcodedColors = [...hexColors, ...rgbColors];

    // Filter out common acceptable colors (black, white, transparent equivalents)
    const concerningColors = hardcodedColors.filter(color => {
      const normalized = color.toLowerCase();
      return !['#fff', '#ffffff', '#000', '#000000', '#333', '#333333', '#666', '#666666', '#999', '#999999'].includes(normalized);
    });

    if (concerningColors.length > 0) {
      issues.push({
        type: 'warning',
        code: 'HARDCODED_COLORS',
        message: `Found ${concerningColors.length} hardcoded color(s). Consider using CSS variables (--app-primary, etc.) for consistency with app theme.`,
        details: concerningColors.slice(0, 5) // Show first 5
      });
    }
  }

  // Check for Bootstrap 4/5 specific classes
  const bootstrap4Classes = [
    'col-xl-', 'col-xxl-', 'd-flex', 'd-grid', 'd-none', 'd-block',
    'justify-content-', 'align-items-', 'flex-', 'gap-',
    'rounded-pill', 'rounded-circle', 'shadow-sm', 'shadow-lg',
    'btn-outline-', 'card-body', 'card-title', 'card-text'
  ];

  const foundBootstrap4 = bootstrap4Classes.filter(cls => css.includes(cls));
  if (foundBootstrap4.length > 0) {
    issues.push({
      type: 'warning',
      code: 'BOOTSTRAP_VERSION_MISMATCH',
      message: `Found Bootstrap 4/5 classes that may not work with Bootstrap 3.4.1: ${foundBootstrap4.join(', ')}`,
      suggestion: 'Use Bootstrap 3 equivalents: col-lg- instead of col-xl-, pull-left/pull-right instead of flex utilities'
    });
  }

  // Check for missing CSS variable definitions
  const usesAppVariables = css.includes('var(--app-');
  const definesAppVariables = css.includes('--app-primary:');

  if (usesAppVariables && !definesAppVariables) {
    issues.push({
      type: 'info',
      code: 'MISSING_VARIABLE_DEFINITIONS',
      message: 'CSS uses --app-* variables but doesn\'t define them. Make sure the root component defines these variables.'
    });
  }

  return issues;
}

/**
 * Validate HTML structure consistency
 * @param {string} html - Generated HTML code
 * @returns {Array} Array of validation warnings/errors
 */
function validateHTMLConsistency(html) {
  const issues = [];

  // Check for inline styles with hardcoded colors
  const inlineColorStyles = html.match(/style="[^"]*(?:color|background):\s*#[0-9a-fA-F]+[^"]*"/g) || [];
  if (inlineColorStyles.length > 0) {
    issues.push({
      type: 'warning',
      code: 'INLINE_HARDCODED_COLORS',
      message: `Found ${inlineColorStyles.length} inline style(s) with hardcoded colors. Consider using CSS classes instead.`
    });
  }

  // Check for accessibility issues
  const imagesWithoutAlt = html.match(/<img(?![^>]*alt=)[^>]*>/g) || [];
  if (imagesWithoutAlt.length > 0) {
    issues.push({
      type: 'warning',
      code: 'MISSING_ALT_TEXT',
      message: `Found ${imagesWithoutAlt.length} image(s) without alt attributes. Add alt text for accessibility.`
    });
  }

  // Check for buttons without type attribute
  const buttonsWithoutType = html.match(/<button(?![^>]*type=)[^>]*>/g) || [];
  if (buttonsWithoutType.length > 0) {
    issues.push({
      type: 'info',
      code: 'BUTTON_TYPE_MISSING',
      message: `Found ${buttonsWithoutType.length} button(s) without type attribute. Consider adding type="button" or type="submit".`
    });
  }

  return issues;
}

// =============================================================================
// SECTION 4: INTEGRATION INSTRUCTIONS
// =============================================================================

/**
 * INTEGRATION GUIDE
 *
 * To integrate these improvements into the main codebase:
 *
 * 1. UPDATE interface.js:
 *    - Add call to getAppAppearanceSettings() when initializing
 *    - Pass appearanceSettings to buildSystemPromptWithContext()
 *
 *    Example:
 *    ```javascript
 *    // In initializeChat() or similar
 *    const appearanceSettings = await getAppAppearanceSettings();
 *
 *    // When building prompt
 *    const systemPrompt = buildSystemPromptWithContext(
 *      context,
 *      pastedImages,
 *      AppState,
 *      dataSourceColumns,
 *      selectedDataSourceName,
 *      componentGuid,
 *      aiContext,
 *      appearanceSettings  // NEW: Pass appearance settings
 *    );
 *    ```
 *
 * 2. UPDATE system-prompt.js:
 *    - Add the new parameter to function signature
 *    - Insert the "APP APPEARANCE SETTINGS" section after general instructions
 *    - Insert the "CSS VARIABLE SYSTEM" section
 *    - Insert the "UI CONSISTENCY RULES" section
 *    - Insert the "RECOMMENDED UI PATTERNS" section
 *
 * 3. ADD VALIDATION (optional but recommended):
 *    - Add validateUIConsistency() to interface.js
 *    - Add validateHTMLConsistency() to interface.js
 *    - Call these in the semantic validation layer
 *    - Display warnings to user before applying code
 *
 * 4. TESTING:
 *    - Test with apps that have custom themes configured
 *    - Test with apps using default theme
 *    - Verify CSS variables are properly defined
 *    - Verify no Bootstrap version mismatches
 *    - Test color consistency across generated components
 */

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAppAppearanceSettings,
    buildSystemPromptWithContext,
    validateUIConsistency,
    validateHTMLConsistency
  };
}
