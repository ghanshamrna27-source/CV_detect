# CV-TRUST offline assurance prototype

## Outcome
Replace the blank home screen with a complete, responsive CV-TRUST demonstration for dataset, model, and inference integrity assurance. Keep it browser-only: no backend, account service, database, cloud connection, or external analysis API. Clearly label simulated assessment results so the prototype does not imply real machine-learning analysis or official government affiliation.

## Build
- Establish the brief's restrained institutional visual system, semantic status colors, accessible controls, responsive shell, and distinct public and console experiences.
- Add the public information pages and an explicitly simulated demo-access flow into the console.
- Build the console navigation and requested dashboard, dataset upload and results, model verification, inference provenance, distribution shift, findings, audit logs, report export, settings, and coverage screens.
- Use deterministic sample records and local browser calculations/file metadata; implement working search, filters, navigation, review dispositions, file selection, and JSON/PDF report downloads. Persist only demo preferences and actions locally where useful.
- Add unique page metadata and ensure every navigation item and primary action works.

## Technical approach
- Preserve the existing TanStack Start and file-based routing instead of replacing the project's router with React Router.
- Keep app logic client-side; use local mock data and browser APIs only. Do not add backend or cloud functionality.
- Verify the main demo path, page rendering, responsive layout, and build diagnostics.
