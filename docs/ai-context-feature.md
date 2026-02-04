# AI Context Feature

## Overview

The AI Feature component can read custom documentation from your JavaScript code to provide better, more contextual code generation. This allows you to document app-specific APIs, conventions, and patterns that the AI will use when generating code.

## How It Works

Add special comment blocks to your code using `@ai-context-start` and `@ai-context-end` markers:

- **Global JavaScript** - Context applies to all screens in your app
- **Screen JavaScript** - Context specific to one screen

The AI reads both and prioritizes them when generating code.

## Syntax

### Block Comment Style (recommended)

Use this for longer, multi-line documentation:

```javascript
/* @ai-context-start
AVAILABLE APIs:
- MyApp.formatDate(date) - Format dates consistently
- MyApp.showLoading() / MyApp.hideLoading() - Loading indicators

DATA SOURCES:
- "Users" - User profiles (Name, Email, Role)
- "Orders" - Order records (OrderID, CustomerEmail, Total)

CONVENTIONS:
- Use Bootstrap 3 classes for layout
- All forms should validate before submit
@ai-context-end */
```

### Line Comment Style

Use this for shorter context blocks:

```javascript
// @ai-context-start
// This screen shows user profile.
// URL param: ?userId=123
// Required fields: Name, Email, Phone
// @ai-context-end
```

## Best Practices

1. **Be concise** - Include only information the AI needs to generate correct code
2. **Document APIs** - List available functions with brief descriptions and parameters
3. **Describe data** - Include column names, data types, and their purpose
4. **Explain conventions** - Patterns and standards the AI should follow
5. **Keep it updated** - Update the context when your APIs or conventions change

## Example Use Cases

### Registration Flow App

```javascript
/* @ai-context-start
REGISTRATION FLOW:
- RegistrationAPI.getCurrentData() - Get current ticket data
- RegistrationAPI.navigateToScreen(name) - Navigate with context preserved
- RegistrationAPI.saveProgress() - Save current form state

URL params: dataSourceEntryId, ticket, invitation
Data source: "Tickets" (Email, First Name, Last Name, Status, Ticket Type)

CONVENTIONS:
- Always validate email format before submission
- Show loading indicator during API calls
- Use Fliplet.UI.Toast for success/error messages
@ai-context-end */
```

### E-commerce App

```javascript
/* @ai-context-start
CART FUNCTIONS:
- Cart.add(productId, qty) - Add item to cart
- Cart.remove(productId) - Remove item from cart
- Cart.update(productId, qty) - Update quantity
- Cart.getTotal() - Get cart total (returns Promise)
- Cart.getItems() - Get all cart items (returns Promise)

Data sources:
- "Products" (SKU, Name, Price, Stock, Category, ImageURL)
- "Cart Items" (UserID, SKU, Quantity, AddedAt)

CONVENTIONS:
- Check stock availability before adding to cart
- Format prices using formatCurrency(amount) helper
- Cart persists across sessions via local storage
@ai-context-end */
```

### Dashboard App

```javascript
/* @ai-context-start
DASHBOARD UTILITIES:
- Dashboard.refreshData() - Reload all dashboard widgets
- Dashboard.exportToPDF() - Export current view to PDF
- Dashboard.setDateRange(start, end) - Filter all widgets by date

CHART CONFIGURATION:
- Use Highcharts for all charts
- Company colors: primary=#1a73e8, secondary=#34a853, accent=#ea4335
- Always include chart title and legend

Data sources:
- "Sales" (Date, Amount, Region, Product)
- "Targets" (Month, Target, Region)
@ai-context-end */
```

## Where to Add Context

### Global JavaScript (App-wide)

1. Open Fliplet Studio
2. Go to **Developer Tools** > **Global** > **JavaScript**
3. Add your `@ai-context-start/end` block at the top of the file

This context will be available on ALL screens in your app.

### Screen JavaScript (Screen-specific)

1. Open Fliplet Studio
2. Navigate to the specific screen
3. Go to **Developer Tools** > **JavaScript**
4. Add your `@ai-context-start/end` block

This context will only be available when using the AI Feature on that specific screen.

## Cascading Behavior

When both global and screen context are present:

1. **App-level context** is included first (general utilities, app-wide conventions)
2. **Screen-level context** is added second (screen-specific APIs, data structures)

The AI considers both when generating code, with screen-specific context taking precedence for any overlapping information.

## Tips for Effective Context

| Do | Don't |
|-----|-------|
| List function signatures with brief descriptions | Include full function implementations |
| Document data source column names | Include sample data |
| Describe conventions and patterns | Write lengthy explanations |
| Update when APIs change | Let context become stale |
| Keep context under 500 words | Write extensive documentation |

## Troubleshooting

### Context not being used

1. Ensure markers are exactly `@ai-context-start` and `@ai-context-end`
2. Check that the block comment is properly closed with `*/`
3. Verify JavaScript has no syntax errors that prevent parsing
4. Refresh the AI Feature component to reload context

### AI not following conventions

1. Make conventions explicit and specific
2. Use imperative language ("Always use...", "Never...")
3. Provide examples of correct usage
4. Keep the most important conventions near the top

## Related Resources

- [AI Feature Component Documentation](https://help.fliplet.com/ai-feature-component/)
- [Global JavaScript Documentation](https://developers.fliplet.com/API/helpers/Global-JS-CSS.html)
