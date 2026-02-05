# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Fliplet widget that provides AI-powered code generation capabilities within the Fliplet platform. The widget allows users to generate HTML, CSS, and JavaScript code through natural language instructions and supports image-based design references.

**Repository:** https://github.com/Fliplet/fliplet-widget-ai-feature.git

## Development Commands

No build tools or package.json exist. This widget runs directly in Fliplet Studio:

- **No build step required** - Changes are loaded directly
- **No test framework** - Manual testing in Fliplet Studio
- **Linting:** Use `.eslintrc` and `.jshintrc` configs with your editor

## Architecture

### Core Components

**1. Interface Layer** (`js/interface.js` - 5,151 lines)
- Widget configuration UI using `Fliplet.Widget.generateInterface()`
- Chat interface for user interactions
- Image upload/paste handling via `image-handler.js`
- Data source selection and column mapping
- Conversation history management

**2. Runtime Layer** (`js/build.js` - 572 lines)
- Component initialization on screen render
- Code injection into page's developer options (HTML/CSS/JS)
- GUID-based component identification
- Legacy code migration from old delimiter format
- Code persistence in widget fields vs developer options

**3. System Prompt** (`js/system-prompt.js` - 1,922 lines)
- Contains `buildSystemPromptWithContext()` - the massive prompt sent to AI
- Defines response protocols (string_replacement vs answer)
- Includes Fliplet API documentation and coding guidelines
- Handles data source context injection

### Key Data Flow

```
User Message + Images
    ↓
buildSystemPromptWithContext() → Includes current HTML/CSS/JS
    ↓
Fliplet.AI.createCompletion() → OpenAI API (gpt-5.x models) or Gemini
    ↓
Response Parser (ProtocolParser)
    ↓
String Replacement Engine (applyReplacements)
    ↓
Code Merging → Update HTML/CSS/JS
    ↓
Save to Hidden Fields + Developer Options
    ↓
Fliplet.Studio.emit("reload-page-preview")
```

### AppState Object

Central state management object with properties:
- `currentHTML`, `currentCSS`, `currentJS` - Working code
- `layoutHTML`, `css`, `javascript` - Persisted code from hidden fields
- `chatHistory` - Conversation messages
- `pastedImages` - Uploaded/pasted images
- `requestCount` - Request tracking
- `chatGUID` - Unique session identifier

### AI Response Protocol

Two response types required from AI:

1. **string_replacement** (code generation):
```json
{
  "type": "string_replacement",
  "explanation": "Brief description",
  "answer": "",
  "instructions": [{
    "target_type": "html|css|js",
    "old_string": "exact text to find",
    "new_string": "replacement text",
    "description": "what this change does",
    "replace_all": false
  }]
}
```

2. **answer** (informational):
```json
{
  "type": "answer",
  "explanation": "Brief summary",
  "answer": "Markdown formatted response",
  "instructions": []
}
```

### Code Storage Strategy

**Two-Layer Storage:**
1. **Hidden Widget Fields** - Source of truth:
   - `layoutHTML`, `css`, `javascript` fields
   - Saved via `Fliplet.Widget.save()`

2. **Developer Options** - Rendered output:
   - Injected into page's `richLayout` (HTML)
   - Injected into `customSCSS` and `customJS`
   - Wrapped with GUID-based selectors

**GUID System:**
- Each component instance has unique `guid` field
- Selectors prefixed: `.ai-feature-${guid}`
- Enables multiple instances per page
- Used for code isolation and cleanup

### Critical Implementation Details

**String Replacement Engine:**
- Exact whitespace matching required (no normalization)
- Supports blank screen detection (auto-inserts for empty code)
- Falls back to full replacement if string not found
- Each instruction processed sequentially
- Logs detailed diffs for debugging

**Image Handling:**
- Paste and drag-drop support via `setupImagePasteHandling()`
- Uploads to Fliplet Media API
- Passes image URLs in OpenAI vision format
- Deduplication via file signatures
- Status tracking: pending → uploading → uploaded

**Data Source Integration:**
- User selects data source from dropdown
- Columns injected into system prompt context
- Per-message data source context supported
- Column names with spaces require bracket notation in code

**Template Escaping:**
- All Handlebars templates must be escaped: `\{{ variable }}`
- System processes HTML through Handlebars compilation
- Prevents premature template evaluation

## Fliplet-Specific APIs

This widget heavily uses Fliplet's proprietary APIs:

- `Fliplet.Widget.generateInterface()` - Create config UI
- `Fliplet.Helper.field()` - Access/set widget fields
- `Fliplet.Widget.save()` - Persist widget data
- `Fliplet.AI.createCompletion()` - AI API proxy
- `Fliplet.Studio.emit()` - Trigger Studio events
- `Fliplet.Media.Files.upload()` - Upload files
- `Fliplet.DataSources.connectByName()` - Query data sources

See system-prompt.js for complete Fliplet API documentation embedded in the prompt.

## Code Organization Patterns

**Interface.js Structure:**
1. Widget configuration (fields, sections)
2. DOM references setup
3. Helper functions (CodeAnalyzer, ProtocolParser, StringReplacements)
4. Image handling utilities
5. Chat message processing
6. Code application and persistence
7. Event handlers

**Naming Conventions:**
- `debugLog()`, `debugError()`, `debugWarn()` - Conditional console logging
- `setupXxx()` - Initialization functions
- `handleXxx()` - Event handlers
- `applyXxx()` - Code transformation functions

**Error Handling:**
- Try-catch blocks around API calls
- Detailed console logging with prefixes (`[AI]`, `[StringReplacement]`)
- User-facing errors via chat messages
- Retry logic for failed replacements

## Testing Approach

No automated tests. Manual testing workflow:

1. Open widget in Fliplet Studio
2. Test code generation with various prompts
3. Verify string replacement accuracy
4. Test image upload/paste
5. Check data source integration
6. Validate multi-instance scenarios
7. Test legacy code migration

## Important Constraints

- **No external dependencies** - Only Fliplet-provided libraries
- **Bootstrap 3.4.1** - CSS framework version locked
- **jQuery 3.4.1** - Available globally
- **No npm/webpack** - Pure JavaScript
- **Code comments required** - AI must generate inline documentation
- **Selector scoping mandatory** - Always use GUID-based parent selectors
- **Promise chaining** - All async operations must chain properly

## Development Workflow

1. Make changes to `js/interface.js`, `js/build.js`, or `js/system-prompt.js`
2. Commit to git (main branch: `main`)
3. Push to GitHub
4. Fliplet Studio auto-deploys from repository

## System Prompt Maintenance

When updating AI behavior, edit `js/system-prompt.js`:
- Add/modify API examples
- Update response protocol
- Adjust code generation guidelines
- Include new Fliplet API documentation

The system prompt is ~1,900 lines and includes complete documentation for Fliplet APIs, coding standards, and response protocols.

## Key Files

- `widget.json` - Widget metadata and dependencies
- `interface.html` - Minimal wrapper (delegates to interface.js)
- `build.html` - Component render template
- `js/interface.js` - Main configuration and chat interface
- `js/build.js` - Runtime component behavior
- `js/system-prompt.js` - AI prompt builder with embedded documentation
- `js/image-handler.js` - Image upload/paste functionality
- `js/showdown.js` - Markdown parser for chat messages
- `css/interface.css` - Chat UI styling

## Common Gotchas

1. **Whitespace in string replacements** - Must match exactly, no normalization
2. **GUID changes** - Code becomes orphaned if GUID field is lost
3. **Template escaping** - Forget `\{{` and save fails
4. **Column spaces** - Must use bracket notation: `data['First Name']`
5. **Promise chains** - Missing `return` breaks async flow
6. **Selector specificity** - Forgetting `.ai-feature-${guid}` causes style conflicts
7. **Legacy migration** - Old widgetId-based delimiters must be converted to GUID format
