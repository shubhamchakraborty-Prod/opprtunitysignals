# Evidence model: field dictionary

Every record is one observation from one source. Records are never deleted; changes are versioned (PostgreSQL trigger / file-store history) and every action is in the audit log.

| Field | Meaning | Values / rule |
|---|---|---|
| `source_id` | Stable record ID | `SIG-…` seed, `CSV-…` uploads, `VER-…` employer-direct |
| `title` | Display title | Role - employer |
| `source_url` | Link to the original page | Must be http(s); can always be opened |
| `source_url_kind` | Page type | `job_post`, `category_page`, `search_results_page`, `social_post`, `other_page` |
| `original_post_id` | Platform post ID where the URL carries one | Used for exact dedupe |
| `platform` | Where it was seen | e.g. Apna, LinkedIn, Indeed, TymblHub |
| `source_type` | Normalised source type | `public_listing`, `employer_direct`, `industry_report`, `verified_employer`, `interview`, `workforce_sentiment` |
| `evidence_type` | What the record is evidence of | `job_advertisement`, `recruiter_advertisement`, `employer_presence` (never a vacancy), `historical_post`, `employer_verification` |
| `captured_at` | Date we saw it | Required |
| `published_at`, `published_at_basis` | Post date and how we know it | `stated` or `derived_from_post_id` |
| `last_rechecked_at` | Last human recheck | Stale after 14 days |
| `employer_identity` / `recruiter_identity` | Hiring employer / third-party advertiser | Employer may be undisclosed |
| `sector` | Counted sector | `62`, `63` or empty when location is unclear |
| `geo.granularity` | Location precision | `building`, `address`, `locality`, `sector`, `citywide`, `unknown` |
| `geo.basis` | How the location is known | `stated_in_listing`, `aggregator_label_only`, `curator_transcribed`, `employer_confirmed`, `geocode_verified` |
| `geo.scope_status` | Counted or not | `in_scope`, `adjacent_or_unclear`, `out_of_scope` |
| `geo.claimed_sector`, `geo.locality_text`, `geo.lat/lon`, `geo.geocode_verified` | Claimed label, address text, verified point | Point only when verified |
| `role_title_raw` | Title as advertised | Required |
| `canonical_occupation`, `occupation_family` | Normalised occupation | Inference |
| `iti_trade_relevance` | Possibly relevant ITI trades | Inference |
| `source_text_excerpt` | Short quotation | Max 300 characters (lawful limits); null in seed |
| `curator_note` | Curator's transcription note | |
| `education` | `raw`, `accepted` tokens, `stated` | Hard gate input |
| `experience` | `raw`, `min_months`, `max_months` | Hard gate input |
| `skills` | `[{name, basis}]` | `curated` = normalised from advert |
| `certifications_required` | Named certificates or licences | Hard gate input |
| `shift` | `raw`, `night_shift`, `days_per_week` | Employment terms, not sentiment |
| `commute` | `raw`, `transport_provided` | |
| `wage` | `min`, `max`, `period`, `incentives`, `raw` | Advertised only |
| `contract_type` | `permanent`, `fixed_term`, `contract_third_party`, `apprenticeship`, `internship`, `not_stated` | |
| `vacancy_claimed` | Openings the advert claims | Never counted as verified |
| `verification_status` | Lifecycle | `observed_public`, `pending_employer_check`, `employer_confirmed`, `contradicted`, `expired`, `historical` |
| `verification_contact` | Who confirmed | Restricted: verifiers and administrators only |
| `verified_at`, `verification_id` | When and which approved verification | Required for `employer_confirmed` |
| `vacancy_count_verified` | Employer-confirmed openings | Only on `employer_confirmed` (DB check) |
| `verified_roles` | Role, trade, openings, entry pay, start date, pre-screen | From approved verification |
| `start_date` | Earliest expected start | |
| `dedupe_cluster`, `duplicate_status` | Mirror grouping | `unique`, `possible_duplicate`, `confirmed_duplicate`, `not_duplicate` |
| `expiry` | Date after which the record is not used | Verification default: +90 days |
| `accessibility_restrictions` | Access limits on the source | e.g. `may_require_login` |
| `confidence` | `level` + `rationale` | low / medium / high |
| `review` | Publication approval | `pending_review`, `approved`, `rejected` |
| `open_flags` | Follow-up flags | `broken_link`, `stale`, `possibly_closed`, `unverifiable`, `location_mismatch`, `other` |
| `inferences` | Curator inferences with basis | Shown under "Inference" |

## Verification record

| Field | Rule |
|---|---|
| `record_id` | Linked public signal, or empty for an employer-direct opening (then `evidence_url` required) |
| `verified_at`, `method` | Date of contact (not in future); `phone`, `email`, `in_person`, `employer_letter` |
| `outcome` | `confirmed`, `contradicted`, `filled_or_closed`, `no_response` |
| `roles[]` | Title, occupation group, ITI trade, openings (> 0), entry pay min/max and period, start date, interview / pre-screen |
| `work_location` | Sector, precision, address text, optional checked coordinates |
| `notes[]` | At least one dated note |
| `contact` | Restricted |
| `consent_basis` | `informed_consent_recorded`, `employer_business_contact_consent`, `legitimate_interest_business_contact` |
| `approval` | Pending until a different administrator approves |

## Interview record (sentiment layer)

No names or contact details. Requires `consent.obtained = true`, a consent basis, coded themes (`aspirations`, `commute`, `pay`, `safety`, `work_hours`, `retention`), and administrator approval. Quotes appear only with `consent.quote_allowed`.
