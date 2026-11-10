# Genesis · Letting Agent (Figma Make)

Clickable prototype of the **Letting Agent** portal (LSP calls letting agents **Clients**). Signed in as Claire Rose, Admin at Rosewood Lettings. It uses the same design system as the Supervisor (`sadaqat786921/genesis-supervisor-platform`), Office Admin (`genesis-officeadmin-platform`), Landlord (`genesis-landlord-platform`) and Tenant (`genesis-tenant-platform`) portals for Landlord Service Plans (LSP): the client-approved design **"Dashboard Variation 04"** (Figma: Genesis page, node 342:2369, and the "Genesis · Design System" section). React 19 + Vite + TypeScript, running inside Figma Make.

## Do not redesign
The client has approved this design. When editing:
- Keep the layout: a 264px white sidebar card on the left (logo, 5 menu groups, live counts, the user at the bottom), with content on the right inside 24px page padding and 20px gaps between blocks.
- Keep the colours, font, radii and shadows listed below. Use the CSS variables in `src/styles/app.css` and never hard-code new colours.
- Keep the existing classes and components (`.card`, `.kpi`, `.chip`, `.btn`, `Drawer`, `Modal`, `Tabs` and so on). Add new screens by reusing them.
- Do not add Tailwind's base reset (preflight). `src/index.css` loads only Tailwind's theme and utilities, on purpose.
- Tailwind utilities are switched on, so never name a custom class after a Tailwind utility (`outline`, `ring`, `shadow`, `border`, `hidden`…). That is why the outline button uses the class `.btn.line` and the dashboard ring uses `.gring`.
- Do not swap the icon set (lucide-react, stroke width 1.8) or the font (Montserrat).
- Images are relative paths under `public/images/` (`images/home1.jpg`). Keep them as normal git files, not LFS.
- Besides React, only two packages are needed: `react-router-dom` and `lucide-react`. If an import fails, add the missing package to package.json — never delete screens or swap libraries.
- Routing uses `HashRouter`. Paths look like `#/landlords/L1`.

## Design tokens (`src/styles/app.css`)
| Token | Value |
|---|---|
| Font | Montserrat 400/500/600/700/800 (self-hosted in `src/fonts`, loaded by `src/styles/fonts.css` — no font package needed) |
| Page background | `#F3F5F9` |
| Surface (cards) | `#FFFFFF`, border `#E9EDF3`, radius 22, padding 20, shadow `0 8px 24px rgba(15,24,40,.04)` |
| Brand navy | `#153D91` (hover `#0F3279`, subtle `#EEF3FC`) |
| Deep navy (hero / inverse) | `#001649` |
| Accent green | `#5BAF00` |
| Text | primary `#0F1828`, secondary `#475467`, tertiary `#667085`, placeholder `#98A2B3` |
| Status | ok `#3C7300` / `#E8F4DB` · warning `#B54708` / `#FEF0C7` · error `#C8102E` / `#FDE8EB` · info `#0B6FB8` / `#E0F2FE` |
| Radius | 6, 8, 10, 12 (buttons and inputs), 14, 20 (sidebar), 22 (cards), 24 (hero), 999 (chips) |
| Type | H1 24/800 · H2 15/700 · metric 26/800 · body 13/500 · small 12.5/500 · caption 11/500 · hero number 56/800 |

## Letting agent rules (this portal)
- A letting agent's homes are **unmanaged**: the agent looks after the tenants, rent, deposits and the landlord. LSP only does the contractor work the agent books, with a **quote first and then an invoice**. No plans, job limits, maintenance budgets, rent or payouts here.
- Signed in as `ME_NAME` = Claire Rose (Admin) at `ME` = `A1`, Rosewood Lettings (`AGENT` in `src/data.ts`). Demo login: any email/password, code `123456`. "First time? Set your password" and "Forgot password?" work as in the other portals. 5 wrong codes lock the account. Session key `genesis-la-signed-in`.
- The store (`src/store.tsx`, `SCOPE`) loads only this agency's homes (P9, P10, P17, P18), their jobs and the agency's invoices. LSP's Office Admin for them is Emma Thompson (`admin: 'et'`).
- The agent **never sees the contractor's cost, hours or LSP's margin**: only the quote price and the invoice. Contractors show name and trade only.
- Things only LSP does show a dashed "Prototype: LSP's answer" box (`DemoAnswer` in `lib.tsx`) so every step of the flow can be clicked through without the staff portals.
- Web only, desktop first (same layout as the staff portals).

## The job flow (same as the staff "Client homes" flow)
Agent steps (`STEPS` in `lib.tsx`): Requested → Quote sent → **You accept** → Contractor booked → Work in progress → Checked by LSP → Invoiced → Paid. Staff statuses: `New` → `Quote sent` → `Quote accepted` → `Assigned` → `In progress` → `Proof uploaded` (or `Sent back`) → `Approved` → `Invoiced`; `Declined` for a declined quote or a cancelled request (`cancelled`).
- **Book a job** (`#/jobs/new`, `new~<home>` or `new~~<service>` to prefill): home, room, what the job is, type of work (auto-guessed), urgency (emergency = call LSP too), details, photos, access and keys (from the home), who to call for access, best days, the agent's **order number** (required when the account setting "Order number on every job" is on) and who booked it.
- **Quotes** (`Quotes.tsx`, `#/quotes/<job>`): the quote on LSP paper (FOR APPROVAL). **Accept** (who accepts, order number, tick "I can approve this work for the landlord and agree to pay") → `Quote accepted`. **Ask for a change** (message + history). **Decline** (reason) → nothing charged. Quotes have a valid-until date; an **expired** quote asks LSP to update it.
- Job page: steps, next step, photo proof, certificate (safety checks), quote, invoice, history with date and time, visit and access, ask for another visit time, cancel while `New`, **report a problem with the work** after it is done, job report PDF, book it again after a decline.
- Nothing is booked until the agent accepts. The invoice matches the quote unless the agent accepts extra work.

## Money
- Invoices go to the agent's billing contact with their own terms (`terms`, e.g. 30 days). Overdue = past the due date with money left. Part payments are allowed; the rest stays on the account.
- Pay **by card** (paid straight away, receipt) or **by bank transfer** ("I've paid", LSP checks the bank; prototype "LSP receives" box records it). **Statement of account** (every invoice and payment, running balance, PDF).
- An invoice can cover jobs at more than one home; `homeShare` splits it by job for the home pages.

## Screens (`src/pages/`)
- `Home.tsx`: balance hero (to pay, overdue, jobs done ring), Quotes to accept, KPIs, jobs under way, coming up (visits, quote end dates, invoice due dates), your homes, your LSP contact.
- `Quotes.tsx` (**Quotes to accept**): list (waiting, accepted, declined; search, type, year; days left) and the quote page with Accept / Ask for a change / Decline.
- `Jobs.tsx`: list (open, quotes to accept, done, all; filters), **Book a job**, job page with every step and the prototype answers.
- `Properties.tsx` (**Homes**): cards (let / empty / removed), **Add a home** (address, postcode, type, rooms, your ref, landlord name, tenant to call, access and keys, notes, photo; duplicate check), home page tabs: Overview (getting in, jobs under way, about), Rooms (view only, `Rooms.tsx` + `src/rooms.ts` shared with every portal), Jobs, Quotes & invoices, Documents, History. Edit details, remove a home (blocked while jobs are open) and add it back.
- `Services.tsx` (**Services & Prices**): safety checks, repairs and changeover services with guide prices and Book.
- `Invoices.tsx` (**Invoices & Payments**): to pay / paid / all / statement, how to pay, coming next.
- `Documents.tsx`: certificates, job reports, quotes, invoices, statement, terms of business (search, type, year).
- `Messages.tsx`: conversation with LSP and **Requests** (billing details, payment terms, order numbers, stop work at a home, close the account) with LSP's answers.
- `Activity.tsx`; `Account.tsx` (**Account & Team**): agency details, billing (request to change), "Order number on every job" setting, **team** (invite, role Admin / Property manager / Accounts, which emails each person gets, resend, remove), sign-in and security, terms and data.
- `lib.tsx`: status wording (`jobView`, `quoteView`, `invoiceView`), money (`balanceOf`, `statementRows`, `homeShare`), the LSP paper template (`DocSheet`, `QuoteSheet`), invoice / card / bank / job report / statement pop-ups, `AskModal`, `DemoAnswer`.
