## 2026-01-27 - Icon-Only Buttons Missing Labels
**Learning:** A common pattern in this codebase is using `Button` with `size="icon"` (or similar variants) without providing an `aria-label`. This makes navigation and interaction difficult for screen reader users as they only hear "button".
**Action:** When adding or modifying icon-only buttons, always include an `aria-label` describing the action (e.g., `aria-label="Send message"`). Also, check for "Settings" or other navigational links that collapse into icons without labels.

## 2026-01-27 - SVGs as Data Visualizations
**Learning:** The application uses SVGs for data visualization (like match scores). These are often read as "group" or ignored by screen readers if not properly labeled.
**Action:** When using SVGs for data visualization, add `role="img"` and a descriptive `aria-label` to the container, and `aria-hidden="true"` to the SVG itself if the label covers the content.
