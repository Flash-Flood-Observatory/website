# Public payload reference

The dashboard consumes `public/data/site_payload.json`. This document describes the existing public contract; it does not introduce schema changes.


Top-level keys:

- `site`
- `status`
- `official_alert`
- `default_time_window`
- `time_windows`
- `reporting_window`
- `reporting_windows`
- `summary_metrics`
- `panels`
- `analysis_panels`
- `notes`
- `footer`

### `site`

- `eyebrow`
- `name`
- `location`
- `strapline`
- `timezone`
- `logo.src`
- `logo.alt`

### `status`

- `state`
- `message`
- `published_at`

### `official_alert`

- `eyebrow`
- `state`
- `label`
- `message`
- `severity_level`
- `severity`
- `updated_at`
- `source_name`
- `source_url`
- `api_url`
- `disclaimer`
- `count`
- optional `area_label`

This banner is supplementary official Environment Agency flood-warning context. It should not be presented as a bespoke flash-flood warning produced by the observatory.

Supported `official_alert.state` values are `none`, `flood_alert`, `flood_warning`, `severe_flood_warning`, `warning_no_longer_in_force`, and `unavailable`.

### `default_time_window`

- string id for the default chart mode, currently `24h`

### `time_windows`

Array of chart toggle options, each with:

- `id`
- `label`

### `reporting_window`

- `start_timestamp`
- `end_timestamp`

This remains the default 24-hour compatibility window.

### `reporting_windows`

Object keyed by window id, currently:

- `24h.start_timestamp`
- `24h.end_timestamp`
- `5d.start_timestamp`
- `5d.end_timestamp`

The website uses these values to keep the rainfall and depth charts on the same x-axis window while switching between 24 hours and 5 days.

### `summary_metrics`

Array of cards, each with:

- `label`
- `value`
- `unit`
- `decimals`
- `signed`
- `note`

Current live meaning:

- current river level
- maximum water depth over the trailing last 24 hours
- minimum water depth over the trailing last 24 hours
- water depth range over the trailing last 24 hours
- maximum recorded trailing 24-hour water-depth range since deployment, with its record date

These trailing 24-hour cards can legitimately differ from completed-day CSV summaries, because the dashboard metrics are rolling windows rather than midnight-to-midnight calendar days.

### `panels.rainfall` and `panels.depth`

- `eyebrow`
- `title`
- `description`
- `descriptions.24h`
- `descriptions.5d`
- `y_axis_label`
- `points`
- `empty_message`

Rainfall also currently carries:

- `source_name`
- `source_url`
- `data_url`
- `station_id`
- `last_updated`

Point shape:

- `{ "timestamp": "2026-03-24T12:00:00Z", "value": 0.0 }`

### `analysis_panels`

- `response.eyebrow`
- `response.title`
- `response.description`
- `response.subtitle`
- `response.descriptions.24h`
- `response.descriptions.5d`
- `response.footer_description`
- `response.footer_descriptions.24h`
- `response.footer_descriptions.5d`
- `response.mode`
- `response.points`
- `response.rainfall_y_axis_label`
- `response.y_axis_label`
- `response.empty_message`
- `historical_range.eyebrow`
- `historical_range.title`
- `historical_range.subtitle`
- `historical_range.description`
- `historical_range.footer_description`
- `historical_range.x_axis_label`
- `historical_range.y_axis_label`
- `historical_range.points`
- `historical_range.empty_message`
- `level_heatmap.eyebrow`
- `level_heatmap.title`
- `level_heatmap.description`
- `level_heatmap.footer_description`
- `level_heatmap.average_label`
- `level_heatmap.average_level_m`
- `level_heatmap.deployment_label`
- `level_heatmap.x_axis_label`
- `level_heatmap.y_axis_label`
- `level_heatmap.weekday_labels`
- `level_heatmap.month_ticks[]`
- `level_heatmap.cells[]`
- `level_heatmap.default_hydrological_year`
- `level_heatmap.hydrological_years[].id`
- `level_heatmap.hydrological_years[].label`
- `level_heatmap.hydrological_years[].period_label`
- `level_heatmap.hydrological_years[].start_date`
- `level_heatmap.hydrological_years[].end_date`
- `level_heatmap.hydrological_years[].month_ticks[]`
- `level_heatmap.hydrological_years[].cells[]`
- `level_heatmap.legend`
- `level_heatmap.value_label`
- `level_heatmap.empty_message`

The website now treats `analysis_panels.response` as a payload-driven Event Analysis chart when `response.points` are present, while `historical_range` and `level_heatmap` both come directly from the sidecar payload. When rainfall points are also available, Event Analysis overlays rainfall bars against the river-flow line; when the rainfall feed is temporarily unavailable, the panel should remain visible as a flow-only line chart rather than disappearing with the rainfall panel. For rainfall itself, a successful Environment Agency query that returns no readings for the requested window should still render a zero-valued rainfall chart rather than hiding the panel, while real feed failures should leave the panel visible with its empty-state message. The historical scatter is deployment-to-date with `x = Daily Water Depth Range (m)` and `y = Maximum Daily Water Depth (m)`, and the frontend should coerce those values to numbers before plotting and derive the linear axis extents from the plotted point set so the largest events remain visible. The heatmap colours represent each day's maximum daily water depth as a stepped percent of the observatory-wide average carried in the same payload, with 20-point legend bands and an open-ended top legend label of `>450`, plus a blue-to-purple high-end palette chosen to avoid confusion with missing-data cells on the dark dashboard.

### `notes`

Array of note cards:

- `label`
- `text`

### `footer`

- `title`
- `text`
- `contact.title`
- `contact.items[]`
- `partners`

Contact item shape:

- `label`
- `value`
- `href`
- `email_base64` (optional): base64-encoded public email; the browser decodes it into selectable text and a `mailto:` link. For this variant, `value` and `href` are omitted. This deters basic text harvesting, not bots that execute JavaScript.

Partner shape:

- `name`
- `logo`
- `href`

## Calendar summary

Optional `observatory_summary`: `{title, timezone, periods}`. Each period has
`id` (`today`, `yesterday`, `five_days`), `label`, `headline`, `paragraph`, `speech`,
`valid_until` (ISO timestamp), and `stale: {headline, paragraph, speech}`. Calculations
and scientific classifications belong to the producer, not the browser. Speech
expands measurement units and percentages. The normal and stale text are both
included in the audio manifest. Old payloads without this object hide the panel.
The `stale` content retains the measured headline and observation narrative,
prefixed with the publication date, and excludes any current EA warning claim.
Expiry changes freshness and relative-date labels, not the recorded measurements.
The renderer also retains observations from older publishers whose `stale` field
contained only a refresh instruction, omitting their current-alert sentences.
Partial rainfall totals use “Available readings recorded”, without the previous
“rainfall total is incomplete” clause. No payload fields or numeric values change.

`panels.rainfall.synthetic_zero` identifies the legacy empty-response chart series.
It must never establish coverage or a zero-rain narrative. `official_alert.checked_at`
is the feed retrieval time, separate from the notice's issue/update time, and
`official_alert.notices` contains active `{severity_level, area_label}` entries.
