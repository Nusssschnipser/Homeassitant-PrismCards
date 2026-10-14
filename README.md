# Prism Cards

A set of 18 Lovelace cards for Home Assistant. One shared visual language, one shared type scale, no dependencies, no build step — a single JavaScript file.

![Version](https://img.shields.io/badge/version-v52-blue) ![HACS](https://img.shields.io/badge/HACS-custom-orange) ![License](https://img.shields.io/badge/license-MIT-green)

> **Language note:** the card interface is currently **German only** — status words,
> labels, weekdays and the visual editor. The code is fully functional in any
> Home Assistant instance, but if your dashboard is in English you will see German
> strings such as *„Alles zu"* (all closed) or *„Akku schwach"* (low battery).
> Translations are welcome — see [Contributing](#contributing).
> German documentation: [README.de.md](README.de.md).

---

## Installation

### Via HACS

1. Open HACS, three-dot menu top right, **Custom repositories**.
2. Add this repository's URL, category **Lovelace**.
3. Search for "Prism Cards" and install.
4. Reload Home Assistant.

### Manual

1. Copy `dist/prism-cards.js` to `/config/www/prism-cards.js`.
2. **Settings → Dashboards → Resources → Add resource**:
   - URL: `/local/prism-cards.js?v=52`
   - Type: JavaScript module
3. Hard-reload the page (Ctrl+Shift+R).

> The `?v=52` parameter forces the browser to reload the file. Increment it on
> every update — otherwise the cache keeps serving the old version.

**Check which version is loaded:** the browser console prints a line on load,
`PRISM-CARDS v52 · 15 Quadrate + 11 Doppel + 2 Mini`. You can also type
`PRISM_VERSION` in the console.

---

## The cards

### Square — `grid_columns: 6`

| Card | What it shows |
|---|---|
| `prism-light-card` | All lights, rooms as rows, a dot per lamp, fill level = share switched on |
| `prism-security-card` | Open windows by label, front door, garage, alarm |
| `prism-room-card` | Room tile: light, windows, presence, temperature — pulled from the area |
| `prism-temperature-card` | Indoor temperature with history, warmest and coldest room |
| `prism-weather-card` | Animated weather background, four-day forecast, moon phase at night |
| `prism-media-card` | Cover art as background, transport controls, picks the active player |
| `prism-network-card` | Online pulse, download and upload with history |
| `prism-system-card` | Terminal style: low batteries by label, offline Zigbee devices, pending updates |
| `prism-heizung-card` | Boiler gauge, burner and pump, four readings, gas consumption |

### Four squares — `grid_columns: 12`, square

| Card | What it shows |
|---|---|
| `prism-calendar-card` | Events from several calendars grouped by day, one colour per calendar |

### Double — `grid_columns: 12`, 2:1

| Card | What it shows |
|---|---|
| `prism-energy-card` | Mirrored graph: production above the axis, consumption below; battery as a glowing tube |
| `prism-vehicle-card` | Vehicle image, charge ring, locks, windows, location |
| `prism-ev-card` | Plugged in: EVCC values with mode switching. Otherwise: vehicle view |
| `prism-printer-card` | Bambu Lab: preview image, progress, AMS slots, power switch with confirmation |
| `prism-clock-card` | Clock in three styles: seven-segment, split-flap, plain |
| `prism-camera-card` | Doorbell image with an event list from your outdoor sensors |

### Quarter — `grid_columns: 3`

| Card | What it shows |
|---|---|
| `prism-mini-card` | Value, state, navigation, or a device with remaining time |
| `prism-vacuum-card` | One robot per card; icon, colour and value follow its state |

Four quarters make a square, two squares make a double — like iOS widgets.

---

## Examples

```yaml
# Weather
type: custom:prism-weather-card
weather: weather.home
moon_phase: sensor.moon_phase
outside_temp: sensor.outdoor_temperature

# Energy and PV
type: custom:prism-energy-card
pv_power: sensor.pv_power
consumption_power: sensor.house_consumption
battery_soc: sensor.home_battery_soc
battery_charge: sensor.home_battery_charge
battery_capacity: 5

# Vacuum
type: custom:prism-vacuum-card
entity: vacuum.ground_floor
battery: sensor.ground_floor_battery_level
last_clean: sensor.ground_floor_cleaning_history
```

Replace the entities with your own — the names above are placeholders.

Every card ships with a visual editor: add a card, type "Prism", pick your
entities. The YAML above is only the short form.

---

## Styling

All cards share one type scale. The base unit is `--u`, the width of a single
dashboard grid column. That way a three-column mini card renders text at exactly
the same size as a twelve-column double card.

```css
--t-title    card title
--t-state    status line
--t-hero     the one big number
--t-value    values in tiles and rows
--t-label    uppercase labels
```

Colours and metrics can be overridden from your theme:

```yaml
# themes.yaml
my-theme:
  prism-radius: 24px
  prism-grid-gap: 8px        # your dashboard's grid gap
  prism-ink: "#0B0A14"
  prism-hz-accent: "#FF8A3D" # accent of the heating card
```

`prism-grid-gap` makes double cards exactly as tall as the squares next to them.
A 12-column card spans twelve columns *plus eleven gaps*, a square six plus five —
so at a strict 2:1 ratio the double card ends up half a gap taller. Set this if
your dashboard uses a gap other than 8 px.

---

## Requirements

- Home Assistant 2024.2 or newer (sections dashboard with `grid_options`)
- A current browser — the cards use CSS container queries
- History graphs need the recorder to keep the relevant entities

---

## Contributing

Issues and feature requests welcome. For layout problems, a screenshot plus the
card width helps a lot — most bugs in this collection turned out to be sizing
and height issues, and those are hard to find without an image.

**Translations:** the interface strings are currently hard-coded German. If you
want to help make the cards multilingual, open an issue first so we can agree on
the approach before someone starts moving two hundred strings around.

## License

MIT — see [LICENSE](LICENSE).
