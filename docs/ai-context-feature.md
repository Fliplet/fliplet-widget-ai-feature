# Custom AI Context (v2.0.0+)

You can provide custom documentation that the AI will use when generating code. This is useful for apps with custom utilities, APIs, or conventions that the AI should follow.

## How to Add Context

Add special comment blocks to your JavaScript code:

**Global JavaScript** (Developer Tools > Global > JavaScript) - Applies to all screens:

```javascript
/* @ai-context-start
Available utilities:
- AppUtils.showLoader() - Display loading spinner
- AppUtils.formatDate(date) - Format dates consistently

Data sources:
- "Users" (Email, Name, Role)
@ai-context-end */
```

**Screen JavaScript** (Developer Tools > JavaScript) - Applies to specific screen only:

```javascript
/* @ai-context-start
This screen displays user profiles.
Required fields: Name, Email, Phone
@ai-context-end */
```

## Tips for Effective Context

- **Document custom functions** with brief descriptions
- **List data source columns** the AI should reference
- **Describe conventions** (e.g., "Always validate forms before submit")
- **Keep it concise** - include only what the AI needs

The AI will prioritize your documented APIs and patterns when generating code.
