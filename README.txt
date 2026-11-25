LTO PAT/SMT Logs System — Updated Package
=======================================

Key Changes Implemented:
1. Reliable Google Sheets Users Authentication (`login.html` & `app.js`):
   - Fetches and normalizes rows from the Google Sheets `Users` worksheet (`getUsers` / `sheet=Users`) with flexible header mapping (`username`/`userName`/`USER NAME`, `pass`/`password`/`PASSWORD`, `role`, `defaultPortal`, `logColor`, permission flags).
   - Verifies both exact and trimmed passwords cleanly, refreshes users on login attempts, caches normalized accounts, and avoids false login error prompts when credentials match the `Users` sheet.
2. Strict Ticket Ownership Enforcement (`app.js` & `index.html`):
   - Added `isTicketOwnedByCurrentUser`, `canMutateTicket`, and `canEndorseTicket`.
   - Non-owners see `🔒 View Only` on tickets they do not own and are blocked from editing, deleting, or endorsing tickets belonging to another operator.
3. Enhanced Settings Experience (`app.js` & `index.html`):
   - Added tabbed section navigation (`All Sections`, `Profile`, `Preferences`, `Notifications`, `Security`, `Integrations`, `Portals & Categories`) and live search filtering (`settingsGlobalSearch`).
   - Added controls for row highlight color, Responder Clipboard toggle, accent theme, default log scope, auto-refresh interval slider, dense table rows, notification toggles, idle timeout slider, and Google Sheets endpoint/tab settings.
   - Added instant validation, unsaved-changes indicators & `beforeunload` warning, save/sync status feedback, `Save Settings`, `Reset to Default`, and `Cancel`.

Dependencies & Schema Notes:
- Client-side uses Tailwind CSS CDN and PDF.js CDN (`pdf.min.js` / `pdf.worker.min.js`) as in the existing app; no extra npm packages required.
- Google Apps Script endpoint (`APPS_SCRIPT_URL`) supports `getUsers`, `saveUsers`, `getSettings`, `saveSettings`, `getOffDates`, `saveOffDates`, and ticket CRUD actions.
- Settings object now persists optional `preferences`, `notifications`, `security`, and `integrations` blocks alongside existing `reportConfig`, `endorsementForm`, `platforms`, `categoryGroups`, `ticketTypes`, `actionsTaken`, and `statuses`.
