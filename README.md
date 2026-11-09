# FreightFlow

FreightFlow is an early-stage AI-assisted freight document extraction and review MVP built with Next.js, TypeScript, Gemini, Zod, and ExcelJS.

## Features

- Upload PDF, JPG, PNG, and WEBP freight documents (up to 20 MB).
- Upload multiple documents to `/workspace/compare` and compare common shipment fields, aggregate cargo weights, and individual cargo line items.
- Group likely matching cargo lines across documents using normalized descriptions and HS codes; compare quantity, packages, net/gross weight, dimensions, volume, unit price, and line amount.
- Keep unmatched cargo lines visible instead of silently dropping them.
- Process documents sequentially in the comparison workspace to reduce Gemini request bursts.
- Extract shipment and cargo fields with Gemini structured output.
- Validate and normalize the model response before it reaches the UI.
- Preserve useful non-standard fields in an editable additional-fields section.
- Review and edit shipment and cargo data.
- Keep in-progress guest work in the current browser.
- Export shipment overview, cargo details, and additional fields to Excel.
- Retry temporary Gemini availability / rate-limit failures.

## Requirements

- Node.js 20 or later
- npm or pnpm
- A Gemini API key with access to the configured model

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`.

   `GEMINI_MODEL` is optional. The default is `gemini-2.5-flash`; set it to a model enabled for your API key if needed.

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open http://localhost:3000.

## Useful commands

```bash
npm run typecheck
npm run build
npm run start
```

## Current MVP limitations

- Drafts are stored only in the current browser; there is no cloud database, user account, or team workspace yet.
- Cargo line matching currently uses a conservative browser-side heuristic based on normalized descriptions and HS codes. It is not a semantic AI match and may require manual review for translated, abbreviated, or substantially different product descriptions.
- Comparison does not yet provide page-level source traceability or highlight the exact source text for a discrepancy.
- Comparison workspace state is held in browser memory; reloading the page clears the current comparison. It is not a persisted shipment record.
- Extraction results must be reviewed by a human before being used operationally. Confidence scores are model estimates, not verified accuracy metrics.
- Do not upload confidential customer documents without the customer's authorization and an agreed data-handling process.

## Step 5 — Cross-document validation

The comparison workspace now runs deterministic validation rules after parsing at least two documents:

- Shared shipment fields: shipper, consignee, destination, carrier and vehicle identifiers.
- Cargo line checks: HS code, quantity, packages, net/gross weight, dimensions, volume, unit price and amount.
- Shipment aggregates: total packages and total net/gross weight when present in multiple documents.
- Invoice arithmetic: line amount vs quantity × unit price, line-item sum vs subtotal, and invoice total vs its components.
- Data-quality checks: gross weight below net weight, invoice currency differences, and fields/items missing from some documents.

Findings are grouped into **Error**, **Review**, and **Incomplete / info**. Numeric comparisons use a 1% tolerance with a minimum absolute tolerance of 0.02. Missing information is not treated as a mismatch. The checks are rule-based and depend on extracted data; they do not replace review of original documents.

## Step 6 — Validation report & export

The multi-document comparison workspace now provides two report exports once at least two documents have been parsed successfully:

- **PDF report:** opens a print-ready report in a separate browser window. Use the browser print dialog and choose **Save as PDF** to save it. The report includes shipment status, document summary, shipment-level comparison, cargo matching rows, validation findings, and review limitations.
- **Excel report:** downloads a workbook with separate `Report Overview`, `Document Comparison`, `Cargo Matching`, and `Validation Issues` sheets, including filters, frozen headers, readable column widths, and severity highlighting.

Exports are generated in the browser from the current comparison state. The PDF export uses the browser's native print-to-PDF capability; no server-side PDF service is required.

## Step 7 — Shipment management

The workspace now includes a shipment register at `/workspace/shipments` and shipment detail pages at `/workspace/shipments/[id]`.

- Create shipment records with a reference, shipper, consignee and destination.
- Search shipment records and review document counts and saved validation totals.
- Update shipment status (Draft, Processing, Validated, Completed), edit shipment metadata, and delete records.
- At this stage shipment records were initially stored in local storage. Step 8 replaces this persistence path with Firebase for signed-in users and adds import of earlier local records.
- Step 8 also upgrades saved shipment records to include parsed document data, validation findings, and original files in private cloud storage.


## Step 8 — Firebase, optional accounts, and database-independent architecture

FreightFlow now follows a **guest-first** access model:

- Guests can open the workspace and use document upload, Gemini extraction, comparison, validation, and exports without creating an account.
- Sign-in is required only for cloud shipment history and saved workspace features.
- Email/password registration, sign-in, sign-out, and password reset are provided through Firebase Authentication.
- A guest who chooses **Save to history** or **Save shipment** is sent to sign in/register. Pending shipment metadata and original file bytes are temporarily preserved in this browser's IndexedDB for up to 24 hours; after authentication they are uploaded to the user's private Firebase Storage path and the shipment is saved to Firestore.
- Existing local shipment records can be imported from the browser into the signed-in user's cloud account.

### Configure Firebase

1. Create a Firebase project and register a Web App.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. Create a Cloud Firestore database.
4. Set up Firebase Storage for the project.
5. Copy `.env.example` to `.env.local` and fill in all `NEXT_PUBLIC_FIREBASE_*` values from **Project settings → Your apps**. Keep `GEMINI_API_KEY` server-side; never prefix it with `NEXT_PUBLIC_`.
6. Publish the included `firestore.rules` and `storage.rules` in the Firebase Console (or deploy them with the Firebase CLI using `firebase.json`).
7. Run `npm install` so the Firebase SDK dependency is added to the local lockfile, then `npm run dev`.

### Database-independent design

- `core/entities` contains portable TypeScript domain types and does not import Firebase.
- `core/interfaces` defines repository and file-storage contracts.
- `core/services` contains business rules and works against those contracts.
- `infrastructure/firebase` contains Firebase-specific adapters.
- React pages call the service/composition layer rather than Firestore APIs directly.

Firestore stores each shipment under `users/{uid}/shipments/{shipmentId}` and each document's metadata/parsed data in a `documents` subcollection. Original files are stored separately under `users/{uid}/shipments/{shipmentId}/documents/`. This maps cleanly to future SQL tables such as `users`, `shipments`, `shipment_documents`, and `validation_issues`.

To migrate to PostgreSQL later, implement the same `ShipmentRepository` contract with a SQL adapter, migrate records and document rows, then switch the composition root in `infrastructure/firebase/repositories.ts`. Authentication and file storage can remain Firebase services if desired.

### Data handling notes

- Guest conversion and comparison do not create Firebase accounts or write shipment history to Firestore.
- Guest files are temporarily held in browser IndexedDB for up to 24 hours only if the user chooses to save work and sign in; otherwise the app does not retain them as account history.
- Authenticated original files are stored in private per-user Storage paths. Firestore/Storage security rules restrict access to the matching Firebase UID.
- Saved single-document and multi-document records include document names/types, extracted structured data, validation findings (where available), and original file storage paths. Download links are generated only after checking the authenticated user's Storage access.
- Do not store Firebase Admin credentials or Gemini API keys in client-side environment variables.

### Current limitations in this step

- Email/password authentication is implemented; social login, team invitations, organization roles, and multi-tenant billing are not included yet.
- The current Firestore list query is capped at 100 records; cursor-based pagination is the next data-access improvement before larger workspaces.
- The repository interface is database-independent, but a PostgreSQL adapter and migration utility have not been built yet.
- Firebase configuration and rules must be added to your own Firebase project before cloud account features can run. Guest document tools remain available without Firebase configuration.
- Build/typecheck could not be confirmed in this packaging environment because dependencies could not be downloaded. Run `npm install`, `npm run typecheck`, and `npm run build` locally after adding Firebase configuration.
