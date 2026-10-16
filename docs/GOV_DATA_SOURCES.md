# Government data feeds: setup

The **Government data** tab tracks official sources. The server checks every 15 minutes which sources are due and fetches them on their own schedule. Each fetch is logged (time, rows, SHA-256 of the response, changed or not), the raw response is kept in `data/gov/raw/`, and every run goes into the audit log. Figures appear only after a successful fetch; nothing is estimated.

## Sources

| Source | Portal | Access | Refresh | What you need to do |
|---|---|---|---|---|
| Labour force figures, Uttar Pradesh (PLFS) | MoSPI eSankhyiki, `https://api.mospi.gov.in` | Open API, no key | Daily | Allow the address in the server's network settings |
| ITIs by state | data.gov.in | Free API key + dataset resource ID | Weekly | Get a key, pick the dataset |
| Any other data.gov.in dataset | data.gov.in | Free API key + resource ID | Weekly | Optional |
| Vacancies on National Career Service | ncs.gov.in | No open API found | - | Data-sharing request to the Directorate General of Employment |
| ITI pass-outs by trade | NCVT MIS / Skill India Digital Hub | No open API found | - | Data-sharing approval from DGT or the UP directorate |
| e-Shram registrations | eshram.gov.in | No open API found | - | Request to the Ministry of Labour and Employment |

MoSPI endpoint paths come from NSO's official client ([nso-india/mospi-esankhyiki](https://github.com/nso-india/mospi-esankhyiki), MIT licence): `/api/plfs/getIndicatorListByFrequency`, `/api/plfs/getFilterByIndicatorId`, `/api/plfs/getData`. The connector looks up indicator codes and the Uttar Pradesh state code from those lists at run time, so it does not depend on hard-coded codes.

## How to get the keys

### data.gov.in API key (free)

1. Go to https://data.gov.in and choose **Sign Up** (or Login).
2. After logging in, open **My Account** (profile menu). Your **API key** is shown there; generate one if it is empty.
3. Add it to the server as an environment variable: `DATA_GOV_IN_API_KEY=<your key>`.
   - Cloud session: environment settings → **Secrets / environment variables**.
   - Own server: put it in the service's environment (not in the repository).

### data.gov.in dataset (resource ID)

1. On data.gov.in search for the dataset, e.g. "State/UT-wise number of ITIs".
2. Open the dataset, then its **API** tab or link. The long code in the API address (`/resource/<this part>`) is the resource ID.
3. Set `OGD_RESOURCE_ITI_STATEWISE=<resource ID>` (and optionally `OGD_RESOURCE_CUSTOM` for a second dataset).

### MoSPI

No key needed. The server only needs network access to `api.mospi.gov.in`.

### NCS, NCVT MIS / Skill India Digital Hub, e-Shram

These do not publish an open API that we could find. They need a formal data-sharing request. Once access is granted, add a connector in `src/server/gov/connectors.js` and set the source's `access` in `config/gov-sources.json`.

## Running

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server with the scheduler on (file or PostgreSQL store) |
| `npm run gov:sync` | Fetch every ready source now and write `data/gov/snapshot.json` |
| `npm run gov:sync -- --source mospi-plfs-up` | Fetch one source |
| `GOV_SYNC=off npm run dev` | Server without the scheduler |
| Administrator in the app | **Check all sources now** / **Check now** buttons on the Government data tab |

Network: the server must be allowed to reach `api.mospi.gov.in` and `api.data.gov.in`. In a Claude Code cloud environment add them under **Network access → Allowed domains** ([steps](https://code.claude.com/docs/en/cloud-environments#network-access)).

The offline file and the claude.ai page show the last snapshot taken at build time (`npm run gov:sync` then `npm run build`). Only the running server is live.

## Safeguards

- Read-only GET requests, identified user agent, 30-second timeout, one retry on 429/5xx honouring `Retry-After`, 0.5-second gap between calls.
- API keys are read from the environment only. They are never stored in run logs, raw files, the audit log or the API response; the dashboard only shows whether a key is configured.
- A failed fetch never deletes the last good figures; the dashboard shows both the last good date and the error in plain words.
- Status meanings: Live, Out of date (no success for twice the refresh interval), Failing (portal error), Cannot reach portal (network), Needs API key, Needs dataset ID, Needs data-sharing agreement, Not checked yet.
