# Website development

## Scientific display rules

Rainfall and river-level charts share the exported `reporting_windows` for the 24-hour and five-day views. The trailing 24-hour summary uses the same cleaned depth series as the chart. Completed-day historical statistics use calendar days and can differ from rolling summaries.

The historical scatter shows every published completed day, with daily water-depth range on the x-axis and maximum daily depth on the y-axis. Coerce coordinates to numbers and derive extents from the full point set so extremes remain visible.

The heatmap compares each completed day's maximum depth with the observation-weighted average across completed-day aggregates since deployment. Missing values remain missing, never zero. Each hydrological year runs from 1 October to 30 September, with 53 calendar-week columns and horizontal scrolling on narrow screens. Future days must not receive invented observations.

The optional `panels.depth.minimum_axis_max` provides a minimum upper axis bound, with a 0.173 m fallback. The corresponding flow bound in `analysis_panels.response.minimum_axis_max` comes from the producer's rating curve; the browser must not guess discharge. Axes expand for larger observations. Rainfall axes have a minimum upper bound of 1 mm.

A successful rainfall query with no readings represents a zero-rain window. A failed feed uses an explicit empty-state message. Event Analysis can show flow without rainfall when the rainfall feed is unavailable.

## Accessibility and appearance

Each of the four charts has a keyboard-operable “View chart data” disclosure. Tables use the same public, window-filtered series as the charts; event-analysis rainfall and flow retain their separate timestamps and units. Historical readings retain their full published range. Table rows are built only when expanded and are excluded from the established narration. No payload schema or scientific calculation changes are required.

On narrow screens the observatory-location row scrolls away, while the identity and section navigation remain sticky. Below 360px the summary metrics use full-width rows. The narrative spans the content width with serif headings.

The browser caches the last successfully rendered public payload and displays it immediately on the next visit while checking for a newer update. It checks for updates every minute while visible and when returning to the page, with a 15-second request timeout. A failed, malformed or older response retains the last usable update and shows its timestamp. Without a previous update, the loading error includes a Retry button; automatic checks continue. Successful updates retain chart and summary selections and replace audio controls without duplicating listeners. Storage errors are non-fatal. Expired summaries retain dated observations, and relative-day tabs become calendar dates after local midnight. Official status checks expire after one hour and retain the EA source link for current information.

The appearance initially follows the system setting. The light/dark button remembers a manual choice. Theme changes retain chart selections.

## Optional narration preview

Use Node.js 22 and Python 3.12, matching the Pages workflow. From the repository root:

```sh
npm ci --ignore-scripts
python3.12 -m venv .cache/audio-venv
.cache/audio-venv/bin/pip install -r scripts/requirements-audio.txt
npm run audio:text
.cache/audio-venv/bin/python scripts/build_audio.py
python3 -m http.server 8769 --bind 127.0.0.1 --directory public
```

The build renders the dashboard in JSDOM and collects narration for both chart windows and every hydrological year. The browser and build share `readAloudText`; clip names include the normalised text hash and voice version. Production narration uses the British English Alba medium voice. See the [audio credits](../public/assets/audio-credits.txt) for model and dataset licensing.

Models and synthesis dependencies stay in `.cache/`. Generated MP3 files are ignored by Git and included in the Pages artifact. Current clips and clips used during the preceding 48 hours are retained so an already-open page can continue playback. Keep browser voice versions and the build's supported versions aligned when changing synthesis.

Narration generation has a five-minute workflow limit. If it fails, publishing continues with current observations and playback reports unavailable audio. Review voice quality by listening to a generated preview.
