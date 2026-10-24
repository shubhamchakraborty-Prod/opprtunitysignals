# Street maps: providers, API keys and OpenStreetMap credit

Every street map option here draws **OpenStreetMap** data. The site always credits "© OpenStreetMap contributors" with a link to https://www.openstreetmap.org/copyright: on the map itself, under each map, and in the navigation footer.

## Does openstreetmap.org give API keys?

No. openstreetmap.org does not issue API keys for map tiles.

| Option | Key | Use it for | Notes |
|---|---|---|---|
| OpenFreeMap (default) | None | Pilots and demos | Vector tiles, free, no key. |
| OpenStreetMap's own tile server (`tile.openstreetmap.org`) | None | Light use only | Volunteer-run, so it has a strict [tile usage policy](https://operations.osmfoundation.org/policies/tiles/): visible attribution, no bulk download, no heavy traffic. The OSM Foundation can block apps that break it. |
| MapTiler | Yes | Production | Free tier for testing and non-commercial use, then paid. Credit: © MapTiler © OpenStreetMap contributors. |
| Stadia Maps | Yes, or domain sign-in | Production | Credit: © Stadia Maps © OpenMapTiles © OpenStreetMap contributors. |
| Thunderforest | Yes | Production | Credit: Maps © Thunderforest, data © OpenStreetMap contributors. |
| Self-hosted tiles | None | Large scale | Run your own server from an OSM extract (for example Planetiler with OpenMapTiles). |

The API on `api.openstreetmap.org` is for **editing** map data. It signs people in with OAuth 2.0. It is not used for showing maps and this site does not use it.

## How to set a provider

The provider is chosen when the site is built.

| Where you host | What to do |
|---|---|
| Netlify | Go to Site settings > Environment variables. Add `MAP_PROVIDER` (`maptiler`, `stadia`, `thunderforest`, `osm` or `openfreemap`) and `MAP_API_KEY`, then redeploy. |
| Your own server | `MAP_PROVIDER=maptiler MAP_API_KEY=your-key npm run build`, then `npm start`. |

How to get a key:

1. **MapTiler.** Sign up at cloud.maptiler.com, then copy the key from **API keys**.
2. **Stadia Maps.** Sign up at client.stadiamaps.com and create a property. Either add your domain (no key needed) or create an API key.
3. **Thunderforest.** Sign up at manage.thunderforest.com and copy the API key.

The site sends only its domain as the Referer (`strict-origin-when-cross-origin`). OpenStreetMap's tile policy requires a Referer, and keyed providers use it for domain restrictions.

Browsers can see the key. In the provider's dashboard, restrict it to your site's domain, for example `your-site.netlify.app`.

If a keyed provider is chosen but no key is given, the site falls back to OpenFreeMap. When tiles cannot load at all (offline, blocked, or no WebGL), it shows the zoomable sketch, labelled "not geographically exact".

The site's Content Security Policy (`netlify.toml`, `src/server/app.js`) already allows all of these tile hosts.

## Where it is in the code

| File | What |
|---|---|
| `web/src/geo-map.js` | `PROVIDERS` (style URL and credit for each), `mapProvider()` |
| `scripts/build-web.mjs` | Reads `MAP_PROVIDER` and `MAP_API_KEY` and writes `window.__MAP_CONFIG__` into the page |
