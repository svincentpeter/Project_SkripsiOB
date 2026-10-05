# Bank group matching and fixed-asset capital corrections — design

Date: 2026-10-05. Follows the post-pull review of SP4 (findings #5 and #6). Amends
[2026-09-30-sak-emkm-completeness-design.md](2026-09-30-sak-emkm-completeness-design.md).

## Problems

1. **Bank reconciliation is strictly 1:1.** Every QRIS sale posts its own 1-1001 debit (net of MDR), but Midtrans
   settles a day's QRIS sales as one BCA credit. That credit can never be matched, every QRIS sale stays a "deposit in
   transit", and the UI offers "Bukukan bunga bank" on the credit, which books the day's sales a second time as 4-3000.
2. **1-3000 / 1-3999 cannot be corrected.** Both are control accounts (manual journals refuse them), the account
   opening balance is one-shot, AJP only takes 6-xxxx, and voiding an `OPENING` asset posts nothing. An asset found
   after go-live, an asset the owner contributes in kind, or an overstated opening asset cannot be booked.

## Decisions

### Bank: split a statement line across several journal lines (B1–B6)

- **B1.** `POST /accounting/bank-reconciliation/lines/{id}/match` accepts `journal_item_ids: int[]` (1–200) as well
  as the old `journal_item_id`. One id behaves exactly as before.
- **B2.** With several ids the statement line is **split**: it is flagged `is_split` and one child line per journal
  line is created (`parent_id`, same date, description and source, `amount` = that line's debit − credit), each matched
  1:1. Every existing 1:1 rule (unique `journal_item_id`, the as-of-month-end status, outstanding items) then applies
  per child without change. A partly late group reconciles correctly: each child counts on its own date pair.
- **B3.** Validation: every journal line passes the 1:1 checks (1-1001, POSTED, not the account opening balance, not
  already taken), has the same direction as the statement line, and Σ(debit − credit) equals the statement amount to
  the cent. Rows are locked in id order (statement line, then journal items).
- **B4.** Split parents are hidden from the report, unrecorded list, auto-match, manual match, adjustment posting and
  deletion. Children are hidden from the CSV duplicate check, so re-importing the same file still skips the parent.
- **B5.** Unmatching any child undoes the whole group: children are deleted and the parent is unflagged. Children
  never exist unmatched.
- **B6.** The UI adds "Cocokkan beberapa jurnal" (checkbox picker filtered to the line's direction, with a running
  total), labels children as part of a combined credit, and asks for confirmation before "Bukukan bunga bank" or
  "Bukukan biaya admin", warning that QRIS/transfer settlements must be matched instead.

### Fixed assets: capital funding and ledger correction on void (A1–A4)

- **A1.** New funding `MODAL` (owner contribution in kind, or an asset missing from the opening balance). It takes the
  same fields as `OPENING` (depreciation start, opening accumulated depreciation) and posts
  Dr 1-3000 cost / Cr 1-3999 opening accumulation / Cr 3-1000 net book value, reference `FIXED_ASSET_ACQUISITION`.
  3-1000 is the account the account opening balance already balances against, so the correction lands where the
  original error did. It has no cash line, so the cash flow statement ignores it; the equity statement shows it as a
  contribution.
- **A2.** Voiding a `MODAL` asset reuses the existing mirror of its acquisition journal.
- **A3.** Voiding an `OPENING` asset accepts `correct_ledger: true`, which posts today
  Dr 3-1000 net book value / Dr 1-3999 opening accumulation / Cr 1-3000 cost (`FIXED_ASSET_VOID`, reference = the
  asset code). Without the flag nothing is posted, as before (the register entry was a duplicate). Any other funding
  with the flag is 422.
- **A4.** The CALK fixed-asset note needs no change: a voided asset still counts cost and opening accumulation until
  its void date, which is exactly when the mirror or correction journal is dated.

## Out of scope

Auto-matching groups (e.g. summing a day's QRIS lines automatically), and matching one journal line to several
statement lines.

## Tests

Backend: group match success and each refusal (sum, direction, taken item, split parent), unmatch of a child restores
the parent, re-import skips a split parent, report reconciles with a group whose items straddle month end; `MODAL`
asset journal and void mirror; `OPENING` void with and without `correct_ledger`, register = ledger afterwards; 403 for
a role without the key is already covered per endpoint.
