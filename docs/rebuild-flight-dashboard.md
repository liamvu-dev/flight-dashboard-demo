# Rebuild the flight dashboard in an existing app

This handoff describes the Onefly dashboard as implemented on `main` at [`5ac1abe1ae8e550bdf7e86ec8112bedc4cbe4bfc`](https://github.com/liamvu-dev/flight-dashboard-demo/tree/5ac1abe1ae8e550bdf7e86ec8112bedc4cbe4bfc). Use it as the behavioral reference for the destination app. The dashboard generates all booking activity in the browser and needs no API, credentials, or database.

## Run the reference

From the root of a checkout of the reference commit, run the following command and open [localhost:8080](http://localhost:8080). The HTTP server lets the browser load the native ES modules and relative image URLs.

```sh
python -m http.server 8080
```

On Windows, [start.bat](../start.bat) opens the same URL and starts the server. Use `python3` if that is how your system exposes Python. The reference needs network access to load its scripts and fonts. With Node installed, run `node --check js/main.js` for the same syntax check the project applies to the entry point.

## Architecture and dependencies

[index.html](../index.html) defines the header, five KPI cards, left panels, center globe with region buttons, right panels, and the Exit Zen control. [css/style.css](../css/style.css) applies the layout and sci-fi theme, including the cyan `#1fd1f9` accent, translucent dark panels, starfield, and CSS globe ring.

The page loads Three.js **0.160.0** (`THREE`), Apache ECharts **5.5.1** (`echarts`), and globe.gl **2.33.1** (`Globe`) from jsDelivr in that order. Google Fonts supplies Orbitron (500/700/900), Rajdhani (500/600/700), and Share Tech Mono. There is no build step or package manifest. The bundled globe.gl browser build and the separate `THREE` global are the reference combination. When importing packages in the host app, pin and test a compatible combination of globe.gl and Three.js before sharing Three.js objects with the globe scene.

| Source | Responsibility and initialization order |
| --- | --- |
| [data.js](../js/data.js) | A classic script at the end of the body defines `REGIONS`, `AIRPORTS`, and `AIRLINES`. Load these before the entry module, or export and import them in the host. |
| [main.js](../js/main.js) | The entry ES module loads preferences, creates shared state and airport indexes, and warms up the aggregates. Initializes the toolbar, globe, charts, then panels, in that order. Wires resize handling and starts the live feed and refresh timers. |
| [storage.js](../js/storage.js) | Supplies layout validation, preference defaults, and guarded JSON persistence. Called by the entry module and toolbar. |
| [toolbar.js](../js/toolbar.js) | Applies the saved layout and visibility before renderers measure their containers. Owns the clock, keyboard shortcuts, fullscreen state, and globe control buttons. Calls back into the entry module as other parts initialize. |
| [globe.js](../js/globe.js) | Owns the globe renderer, camera and orbit controls, region caption, airport beacons, aircraft and trails, pulses, and PNG capture. Exposes resize, region synchronization, camera reset, and live booking effects. |
| [charts.js](../js/charts.js) | Initializes the donut and airline bars with ECharts. Reads shared counts and selection, emits region selections from the donut and legend, and resizes charts. Uses a 1 px dimension when its container starts hidden. |
| [panels.js](../js/panels.js) | Owns the KPI targets and count-up, rotating route rankings, and table history, search, pause, and scrolling. Exposes row insertion and region synchronization. |

After the first render, `main.js` observes `#globe`, `#donut`, and `#bars` with `ResizeObserver`. Its fallback uses window resize and a `MutationObserver` on the app's class and layout attributes. Keep the observer when possible so revealing a panel or resizing a host sidebar updates the actual drawing area. The renderers skip zero-size containers.

### DOM hooks

Keep these IDs and selector relationships if porting the modules as written. A component-based host can pass element refs and render the same states through its own components instead.

| Area | Hook contract |
| --- | --- |
| Layout | `#app` carries `data-layout`, `data-globe-paused`, `.hide-left`, `.hide-kpis`, `.hide-right`, and `.zen-mode`. Its `.body` contains `#col-left.col.left`, `.center`, and `#col-right.col.right`. Place `#globe` and `.globe-ring` inside the sized `.globe-view`. `#stars` is a decorative sibling in the reference. |
| Header and toolbar | `.header`, `#control-toolbar [data-layout]`, `#btn-toggle-left`, `#btn-toggle-kpis`, `#btn-toggle-right`, `#btn-toggle-zen`, `#btn-zen-restore`, `#btn-globe-rotate`, `#btn-globe-reset`, `#btn-fullscreen`, `#btn-snapshot`, `#clock-time`, and `#clock-date`. Preserve button names, focus states, and pressed/hidden state where applicable. |
| KPIs | `#kpis` contains `#kpi-sales`, `#kpi-routes`, `#kpi-airports`, `#kpi-airlines`, and `#kpi-countries`. |
| Region and chart controls | `#globe-caption` and `#legend-left` / `#legend-right` receive generated `button[data-region]` controls. Provide sized `#donut` and `#bars` containers and `#routes-title`, `#top-routes`, and `#btn-reset-region` for rankings. |
| Booking panel | Keep `#rows` inside the scroll container `#table-body`. Provide `#live-badge .live-text`, `#btn-live-toggle`, `#route-search`, `#btn-clear-search`, and `#records-count`. The reference scroll step and row height are both 38 px. |

### Assets and browser support

| Asset | Source and use |
| --- | --- |
| [img/earth-hd.jpg](../img/earth-hd.jpg) | Bundled 4096 × 2048 Earth color and emissive texture. |
| [img/earth-topology.png](../img/earth-topology.png) | Bundled 2048 × 1024 relief bump map. |
| Logo, controls, starfield, ring, aircraft, and beacons | Inline SVG in the HTML, gradients in CSS, or geometry and Canvas 2D textures generated by `globe.js`. |
| [screenshot.png](../screenshot.png) | README preview only. |

The two textures are served from relative URLs at runtime. The [commit that added the bundled files](https://github.com/liamvu-dev/flight-dashboard-demo/commit/ebe9e6d14c4de88e932d81cdbd5d5f73910d057a) records their introduction. Upstream provenance and licensing are unrecorded in the reference, so confirm reuse rights or choose compatible textures through the host asset pipeline. Resolve URLs through that pipeline so they also work from nested routes. Serve images from the same origin or configure CORS so the renderer can load them and the canvas can export pixels.

Use a modern browser with WebGL 2 enabled for the pinned globe bundle, Canvas 2D for overlays and PNG compositing, and support for native ES modules. CSS uses container queries and units, dynamic viewport units, and `touch-action`. The toolbar uses `inert` for hidden controls and standard and WebKit fullscreen APIs. Fullscreen depends on browser and embedding permissions and must be requested from a user action. The reference has no WebGL fallback UI. Its early return guards absent globals or a missing mount, while a context creation failure can interrupt initialization.

## Data and shared state

The records below show the shapes used by the reference. Latitudes and longitudes are decimal degrees. A booking carries airport records and an airline code, and its `region` is the origin region even on intercontinental routes. Use unique airport codes, valid region keys, and enough distinct airports for the generator to pick a different destination.

```js
const region = { color: '#ffcc33', weight: 38 }; // REGIONS.Asia
const from = { code: 'BKK', lat: 13.69, lng: 100.75, region: 'Asia' };
const to = { code: 'SIN', lat: 1.36, lng: 103.99, region: 'Asia' };
const airline = { code: 'TG', name: 'Thai Airways', color: ['#1fd1f9', '#22e3ff'] };

const booking = {
  from, to, region: 'Asia', airline: 'TG', price: 420,
  orderTime: new Date('2026-11-19T03:00:00Z'),
  depTime: new Date('2026-11-20T08:30:00Z'),
};
const routeCounts = { Asia: new Map([['BKK – SIN', 245]]) };
const arc = {
  region: 'Asia', from, to,
  startLat: from.lat, startLng: from.lng, endLat: to.lat, endLng: to.lng,
}; // globe.js attaches the private plane state when it creates an arc
const salesKpi = {
  el: document.querySelector('#kpi-sales'), value: 15025940, shown: 0, prefix: '$',
};
```

There is no standalone route catalog. The leaderboard uses a directional route key (`FROM – TO`) in a map per region, and the globe derives endpoint coordinates from each booking. Use the six region keys in source order for legends and rank rotation. The names and starting weights are Asia 38, Europe 24, Americas 19, Mideast 8, Africa 9, and Oceania 2. The donut reads `regionCounts[region]` and the bars read `airlineCounts[code]`. KPI targets start at $15,025,940 sales, 27,461 available routes, 26,682 covered airports, 256 partner airlines, and 91 covered countries/regions. These are dashboard totals supplied by the simulation. Sales and routes change after startup while the other three settle at their initial targets.

### Simulation and update cadence

- The generator picks an origin region using the weights above, then chooses a local origin. It draws the destination from that same region 72% of the time and from all airports otherwise, retrying if it picks the origin. It selects a weighted airline, picks a whole-dollar price from $60 to $1,500, and schedules departure 0.2–120 days after generation time. The table formats both dates in browser-local time.
- Warm up aggregates with 900 random bookings and 12 forced bookings per region before creating charts. Region counts start at `weight × 1000`, airline counts start from a randomized descending baseline, and route maps start empty. History is seeded separately with 120 recent rows plus enough bookings for at least 10 per region. The globe separately seeds 65 arcs at varied flight positions.
- The first live booking arrives after 1.2 s. Each next booking is scheduled after a random 0.9–1.8 s. Every event adds one regional count, adds 1–3 to the airline count, adds 1–4 to its route count (20–400 in warm-up), and adds its price to sales. Each event offers the row to the table and adds an arc and a destination pulse to the globe.
- Sales also drift upward by $5–$60 every 700 ms. Available routes have a 30% chance to increase by one every 5 s. The donut and airline chart refresh every 3 s, and the leaderboard refreshes every 4 s. The leaderboard cycles through regions about every 10 s with a 400 ms fade when all regions are selected. KPI display values ease toward targets on animation frames.

### Selection and persistence

Use one `selectedRegion` value (`null` for all regions). A globe caption button, main donut slice, or donut legend button sends its region to `main.js`. Selecting the same region again, clicking All Regions or Reset, or pressing Escape outside an input/Zen/fullscreen clears the selection. A change updates the globe, redraws the donut and its legend, and refreshes the table and route rankings. The globe flies to the regional camera position, stops auto-rotation on selection, hides other regions' flight trails, aircraft, and pulses, and dims their airport beacons. Clearing restores the default viewpoint and the saved rotation preference. The donut keeps the global denominator, highlights the selected slice, and shows that region's share. The table uses booking origin and combines the region with any search. The route leaderboard stays on the selected region. Sales, other KPIs, airline rankings, and simulated generation remain global.

`localStorage` key `onefly_dashboard_prefs_v1` stores `layout`, `showLeft`, `showKpis`, `showRight`, `zen`, and `autoRotate`. Defaults are `classic`, all three groups visible, Zen off, and rotation on. Invalid fields fall back individually, while unreadable storage or invalid JSON falls back to defaults. Layout and visibility apply before measurement. Bookings, search, pause state, selection, camera, counters, and fullscreen start fresh on reload.

## Feature parity checklist

Use the reference in one tab and the destination in another. Verify behavior and data invariants with the same viewport and settings. For repeatable data assertions, inject a fixed clock and seeded fixtures into the destination's simulation adapter.

| Feature and source | Required inputs or state | Verification |
| --- | --- | --- |
| Interactive globe ([globe.js](../js/globe.js), [style.css](../css/style.css)) | Sized mount, textures, WebGL, default camera at lat 20°, lng 30°, altitude 1.46, and orbit controls. | Drag the night Earth and verify the camera orbits. Check the atmosphere and beacons and confirm the globe stays in frame on a tall canvas. Wheel/pinch zoom is disabled. |
| Regional arcs and aircraft ([globe.js](../js/globe.js)) | Endpoint coordinates and origin-region color. The path is a raised cubic Bézier using great-circle interpolation for its control points. | Watch an aircraft start small, align to its path, and shrink near landing. The bright trail grows from origin to tail. Select Oceania and check that other regions' aircraft and trails disappear. Selecting a region ensures at least 10 matching arcs, and the overall list is capped at 80. |
| Airport pulses ([globe.js](../js/globe.js), [main.js](../js/main.js)) | Booking and arrival destination coordinates, event region, beacon textures. | Watch for glowing target markers and expanding rings on new bookings and visible aircraft arrivals. With a region selected, only matching rings remain visible and unmatched static beacons fade. Rings are capped at 14. |
| Region synchronization ([main.js](../js/main.js), [globe.js](../js/globe.js), [charts.js](../js/charts.js), [panels.js](../js/panels.js)) | Shared selection, region centers and colors, chart totals, booking origin region. | Select Europe on the globe caption, then Asia on the donut and a third region on its legend. On each change, check the camera, arcs and pills, donut highlight and percentage, table rows, and pinned route title. Click an active region again, then test the All Regions and Reset controls. Check that switching regions preserves an active table query. |
| Five KPI cards ([panels.js](../js/panels.js), [main.js](../js/main.js)) | Target and displayed values, dollar prefix on sales. | Reload and watch all five count up. Sales keeps rising and available routes occasionally increment. Check the three static totals after the animation and confirm region changes preserve the global scope. |
| Global route donut and airline ranking ([charts.js](../js/charts.js), [main.js](../js/main.js)) | Six region counts, airline counts by code, color gradients, current preset. | Verify the six legends report rounded global shares and the main ring accepts selection. `Partner Airlines` appears in the center with all regions active. The bar chart shows up to ten airlines sorted by count and continues updating in a region. |
| Regional route ranking ([panels.js](../js/panels.js), [main.js](../js/main.js)) | Route maps by region, rotation index, selection. | With all regions shown, wait for the title to cycle and check descending order, up to ten routes, medals for the top three, and leading bar at full width. Select one region and wait through a cycle to verify the title stays pinned. |
| Live bookings and pause ([panels.js](../js/panels.js), [main.js](../js/main.js)) | Local booking history, pause state, route and timestamp fields. | Watch the last 18 rows in oldest-to-newest order with new rows flashing at the bottom. Pause and confirm `PAUSED`, no new rows, and manual scrolling while sales and globe activity continue. Resume and confirm the next eligible row arrives without backfill. The table discards bookings received while paused, and its 240-entry history favors keeping at least 12 rows per region when trimming. |
| Route search ([panels.js](../js/panels.js), [style.css](../css/style.css)) | Raw and normalized query, retained history, selected region, pause state. | Pause and search using a visible airport code in lowercase, then the full route with hyphen, en dash, or spaces. Search a substring of the ordered `FROM TO` codes. Verify newest-first matches, scrollable results and count, and a clear empty state for `ZZZZ`. Use the clear button and Escape in the input to restore recent rows. With search active and the stream resumed, only matching events enter the displayed results. |
| Presets and panel visibility ([toolbar.js](../js/toolbar.js), [style.css](../css/style.css), [charts.js](../js/charts.js)) | Preset and visibility preferences, root classes, measured sizes. | Use buttons and `1`/`2`/`3` to switch layouts. Toggle each of Left, KPI, and Right. Check that controls reflect state, hidden panel controls leave the tab order, and visible canvases resize as panels are restored. |
| Zen, camera reset, and rotation ([toolbar.js](../js/toolbar.js), [globe.js](../js/globe.js), [style.css](../css/style.css)) | Zen and auto-rotate preferences, selected region, camera. | Use `Z` to hide header, groups, and caption, leaving the globe and Exit Zen control. Exit with the button, `Z`, or Escape and check previous visibility returns. Use `R` to toggle orbit auto-rotation and CSS ring animation while aircraft continue. Selecting a region initially stops orbit auto-rotation. Toggling rotation while selected can resume it. Drag and use `0` to restore the default camera while keeping the region filter. |
| Fullscreen and shortcuts ([toolbar.js](../js/toolbar.js)) | Browser fullscreen APIs and events, focused target. | Enter with the fullscreen button or `F`, then exit with `F` or the browser's Escape action. Verify the control's pressed state and label follow actual fullscreen state. Type `f123zr0` into search and check that dashboard shortcuts do not fire. Ctrl, Meta, and Alt combinations are ignored. |
| Header clock ([toolbar.js](../js/toolbar.js)) | Browser-local time and date. | Confirm the clock ticks every second and the date shows the local calendar date and weekday. |
| PNG snapshot ([globe.js](../js/globe.js)) | Rendered WebGL canvas with `preserveDrawingBuffer`, texture URLs, Canvas 2D and blob or data URL download support. | Capture after moving the globe or selecting a region. Open `onefly-snapshot-YYYYMMDD-HHmmss.png` and verify the current camera view and visible globe effects, a dark radial background, and dimensions matching the renderer buffer. The PNG contains the globe composition only. |
| Persistence ([storage.js](../js/storage.js), [toolbar.js](../js/toolbar.js)) | One validated preference record per origin in the reference. | Set Dock, hide two groups, turn off rotation, and enter Zen. Reload and exit Zen to verify the underlying choices. Check that the region, query and pause are reset. Try a malformed stored value and verify default settings load. |

### Responsive parity

All viewport thresholds are in CSS pixels. [style.css](../css/style.css) controls layout and coarse-pointer behavior. [globe.js](../js/globe.js) caps pixel ratio at 2 and adjusts vertical field of view for portrait canvas shapes without moving the camera.

- [ ] **Desktop, 1024 px and up.** At 1600 px or wider, check the default three-column order of left panels, globe, then right panels, and verify a single-row header. In Split Focus, the globe moves first with narrower panel columns to its right. In Bottom Dock, the globe spans the top and the two panel groups sit below. At 1440 px and wider, Dock lays the panels within each group side by side. Below 1600 px, the toolbar moves to its own header row.
- [ ] **Tablet, 768–1023 px.** At about 900 px, verify the globe spans both columns above two panel groups. Hiding one group lets the other span both columns. The KPI cards arrange as three then two and the header puts title and controls on separate rows.
- [ ] **Mobile, below 768 px.** At about 390 px, verify the globe appears first in a single scrolling content column under the header and KPIs, across all presets. Sales spans two KPI columns, with the other cards paired. Check that toolbar groups and the region caption fit or wrap and that the table and charts stay within their panels.
- [ ] **Narrow panels, container width below 390 px.** Shrink a panel across the threshold and check that the donut moves above two columns of legend buttons, with smaller table text and more compact rankings. This can happen on any viewport.
- [ ] **Touch.** On a coarse pointer, swipe vertically starting on the globe in normal mode to scroll the page and drag horizontally to orbit. Tap a region pill and verify the same selection as a mouse click. In Zen, the page-scroll override is lifted so the globe can capture touch gestures. Check on a real device or with touch emulation, including the back-out control and downloads.

## Integration checklist for the destination repository

- [ ] **Choose the host route and ownership.** Decide where the dashboard lives in the existing navigation, which header or shell surrounds it, and whether it runs as one full-page view or an embedded panel. Mount in the browser after refs exist. For SSR, pull the WebGL/chart initialization into the host's client lifecycle. Keep one instance of state per dashboard, with a single selection action and an explicit disposal path.
- [ ] **Port the data first.** Reuse the fixtures and simulation rules from `data.js` and `main.js`. Expose a booking feed, region selection, and aggregate updates from a module or the host's state store. If connecting a host data source, adapt IDs, origin regions, timestamp strings, and currency into the contracts above. Keep the fixture feed for local parity checks. Render external strings as text through the host framework because the reference's `innerHTML` templates assume fixed local fixtures.
- [ ] **Build the layout and preferences before initializing renderers.** Reuse the CSS tokens, panel styling, layout rules, and toolbar interaction patterns. Scope resets, theme variables, and selectors such as `.body`, `.row`, and `.header` to the dashboard root. In an embedded view, anchor the starfield to that root and size the shell within the host's layout and scroll region. Use root-relative refs and host components in place of document-wide queries. Decide whether an embedded dashboard should follow host container widths, and size globe/chart mounts explicitly. Use the host settings store or an instance-scoped key and preserve validation and defaults.
- [ ] **Add charts and panels, then the globe.** Reuse ECharts option builders and the procedural globe geometry. Supply the host's dependencies, asset URLs, and DOM refs through adapters. Choose how to load packages, fonts, and textures, and how to handle unavailable WebGL. Wire the table, donut, caption, and ranking to the same selection before enabling the feed. Observe renderer container sizes and handle preset, visibility, and orientation changes.
- [ ] **Integrate browser controls and verify the route.** Choose a fullscreen target (the reference uses the document root), keyboard shortcut scope, and download behavior that fit the host. Bind shortcuts only while the route is active and respect interactive or editable targets. Preserve accessible labels, pressed states, and focus restoration. Run the parity checklist in the destination, exercise its back/forward navigation, and verify that two mount/unmount cycles leave one active feed and one renderer set on return.

### Unmount and remount

The reference runs for the lifetime of a static page. In the host, return a disposer from each mounted subsystem and run cleanup before removing its DOM. Keep handles and an inactive flag so deferred callbacks cannot restart work after teardown.

- Stop subscriptions and cancel the recursive booking timeout, clock interval, sales and route drift, chart refresh, and route ranking timers. Clear pending fade, table-scroll, material polling, button feedback, and download cleanup timers. Revoke any outstanding download object URLs and guard delayed image loads and `toBlob` callbacks.
- Cancel the KPI and aircraft animation frames. Disconnect `ResizeObserver` or its fallback `MutationObserver`, and remove window resize, keydown, fullscreen, and DOM button/input listeners. Exit fullscreen if this instance owns it.
- Remove ECharts handlers and call `dispose()` on both chart instances. Stop the globe's render loop (the pinned version exposes `pauseAnimation()`) and cancel pending camera/renderer work through the selected version's lifecycle adapter. Pausing is only one step of teardown. Dispose controls and renderer, and release dashboard-owned geometries, materials, and textures, including cached beacon/aura textures and shared trail geometry. Release shared resources once and remove the globe DOM. Keep library-owned resource disposal with the globe adapter so it can follow the pinned version's lifecycle.
- Navigate away while the stream is active, a camera is moving, or a panel is resizing. Return and confirm one globe canvas, one instance of each chart, one response per shortcut, and booking updates at the expected cadence. Repeat with saved hidden panels or Zen enabled, then reveal the panels to check they measure correctly.
