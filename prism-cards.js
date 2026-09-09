/*
 * Prism Cards — Home Assistant Kachel-Sammlung  ·  v2
 * ============================================================
 * Funktionen und Config-Schlüssel wie in neomint-cards.js.
 * Layout, Raster und Farbsystem neu.
 *
 * ── GRÖSSENRASTER ─────────────────────────────────────────────
 *   Standard-Quadrat   grid_columns: 6    Seitenverhältnis 1:1
 *     custom:prism-light-card
 *     custom:prism-security-card
 *     custom:prism-room-card
 *     custom:prism-temperature-card
 *     custom:prism-weather-card
 *     custom:prism-media-card
 *     custom:prism-network-card
 *
 *   Doppel-Quadrat     grid_columns: 12   Seitenverhältnis 2:1
 *     custom:prism-energy-card
 *     custom:prism-vehicle-card
 *     custom:prism-printer-card
 *
 *   Viertel-Quadrat    grid_columns: 3    Seitenverhältnis 1:1
 *     custom:prism-mini-card      (vier davon ergeben ein Quadrat)
 *     custom:prism-vacuum-card    (ein Saugroboter je Karte)
 *
 *   Die Höhe rechnet die Karte über aspect-ratio selbst (rows: "auto").
 *   Wird die Breite im Layout verändert, bleibt das Verhältnis erhalten —
 *   ein Doppel-Quadrat ist immer exakt zwei Quadrate breit.
 *
 * ── ZONEN ─────────────────────────────────────────────────────
 *   Jede Karte hat dieselbe Anatomie, damit nebeneinander nichts kippt:
 *
 *     Quadrat                    Doppel-Quadrat
 *     ┌──────────────┐           ┌──────────────┬──────────────┐
 *     │ KOPF         │           │ KOPF         │              │
 *     ├──────────────┤           ├──────────────┤   DETAIL     │
 *     │ INHALT   1fr │           │ INHALT   1fr │   (Graph,    │
 *     ├──────────────┤           ├──────────────┤    Zeilen,   │
 *     │ SOCKEL       │           │ SOCKEL       │    Aktionen) │
 *     └──────────────┘           └──────────────┴──────────────┘
 *
 *   KOPF   Icon, Name, Statuswort, Absprungpfeil
 *   INHALT füllt den Rest: Punkteraster, Zeilenliste, Graph, Ring, Cover
 *   SOCKEL große Kennzahl und Chips
 *
 *   Jede Zone ist ein eigener CSS-Container. Schriftgrößen richten sich
 *   nach der Zonenbreite, nicht nach der Kartenbreite — eine Doppelkarte
 *   setzt Text also genauso groß wie ein Quadrat daneben.
 *
 * ── FARBE ─────────────────────────────────────────────────────
 *   Verlauf aus zwei Tönen (--c1/--c2), abgeleitet aus HA-Theme-Variablen
 *   mit Fallback. Überschreibbar per Theme-Token (--prism-amber …), per
 *   gradient_from / gradient_to oder über die alten color_*-Schlüssel.
 *
 * ── FÜLLSTAND ─────────────────────────────────────────────────
 *   Wo es einen Prozentwert gibt, steigt eine Lichtkante von unten bis
 *   zu diesem Wert. Die Kachel ist ihr eigener Balken.
 *
 * ── MIGRATION ─────────────────────────────────────────────────
 *   custom:neomint-*-card  ->  custom:prism-*-card. Alles andere bleibt.
 *
 * ── INSTALLATION ──────────────────────────────────────────────
 *   1. Datei nach /config/www/prism-cards.js
 *   2. Einstellungen -> Dashboards -> ⋮ -> Ressourcen -> Hinzufügen:
 *        URL: /local/prism-cards.js    Typ: JavaScript-Modul
 *   3. Strg+F5.
 */

(function () {
"use strict";

const PRISM_VERSION = "v45";
window.customCards = window.customCards || [];
window.PRISM_VERSION = PRISM_VERSION;

/* Schriften — optional, fällt sauber auf die HA-Schrift zurück */
try {
  if (!document.getElementById("prism-cards-fonts")) {
    const l = document.createElement("link");
    l.id = "prism-cards-fonts";
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=JetBrains+Mono:wght@500;700&family=Orbitron:wght@600;900&display=swap";
    document.head.appendChild(l);
  }
} catch (e) { /* offline oder gesperrt */ }

/* ══════════════════════════════════════════════════════════════
   Helfer
   ══════════════════════════════════════════════════════════════ */

const toList = (v) => (Array.isArray(v) ? v : v ? [v] : []);

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const num = (hass, id) => {
  if (!id || !hass.states[id]) return null;
  const v = parseFloat(hass.states[id].state);
  return isNaN(v) ? null : v;
};
const stateOf = (hass, id) => (id && hass.states[id] ? hass.states[id].state : null);
const uom = (hass, id, def) =>
  (id && hass.states[id] && hass.states[id].attributes.unit_of_measurement) || def;

const fmt = (v, d = 1) => (v === null || v === undefined || isNaN(v)) ? "–" :
  Number(v).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmt0 = (v) => (v === null || v === undefined || isNaN(v)) ? "–" :
  Number(v).toLocaleString("de-DE", { maximumFractionDigits: 0 });
const fmt1 = (v) => (v === null || v === undefined || isNaN(v)) ? "–" :
  Number(v).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const mmss = (sec) => {
  if (sec === null || sec === undefined || isNaN(sec) || sec < 0) return "–";
  const s = Math.floor(sec % 60), m = Math.floor(sec / 60);
  return m + ":" + String(s).padStart(2, "0");
};

function friendly(hass, id) {
  const s = hass.states[id];
  return (s && s.attributes.friendly_name) || id;
}
function areaOf(hass, id) {
  try {
    const reg = hass.entities ? hass.entities[id] : null;
    if (!reg) return null;
    if (reg.area_id) return reg.area_id;
    if (reg.device_id && hass.devices) {
      const dev = hass.devices[reg.device_id];
      return dev ? dev.area_id || null : null;
    }
  } catch (e) { /* Registry nicht verfügbar */ }
  return null;
}
function areaNameFor(hass, id) {
  const a = areaOf(hass, id);
  return a && hass.areas && hass.areas[a] ? hass.areas[a].name : null;
}
function entityLabels(hass, id) {
  const e = hass.entities ? hass.entities[id] : null;
  return e && Array.isArray(e.labels) ? e.labels : [];
}
function labelIdsFor(hass, wanted) {
  const out = new Set();
  const want = toList(wanted).map((w) => String(w).toLowerCase());
  if (!want.length) return out;
  const reg = hass.labels || {};
  for (const id in reg) {
    const name = (reg[id] && reg[id].name ? reg[id].name : id).toLowerCase();
    if (want.includes(id.toLowerCase()) || want.includes(name)) out.add(id);
  }
  if (!Object.keys(reg).length) want.forEach((w) => out.add(w));
  return out;
}
/* Label an der Entität ODER am Gerät, tolerant gegen "#" und Groß/Klein */
function hasLabel(hass, id, wanted) {
  const want = toList(wanted).map((w) => String(w).toLowerCase().replace(/^#/, "").trim());
  if (!want.length) return false;
  const reg = hass.labels || {};
  const collect = [];
  const e = hass.entities ? hass.entities[id] : null;
  if (e && Array.isArray(e.labels)) collect.push(...e.labels);
  if (e && e.device_id && hass.devices && hass.devices[e.device_id]) {
    const d = hass.devices[e.device_id];
    if (Array.isArray(d.labels)) collect.push(...d.labels);
  }
  for (const lid of collect) {
    if (want.includes(String(lid).toLowerCase())) return true;
    const name = reg[lid] && reg[lid].name ? String(reg[lid].name).toLowerCase() : null;
    if (name && want.includes(name)) return true;
  }
  return false;
}
const isHidden = (hass, id) => {
  const reg = hass.entities ? hass.entities[id] : null;
  return !!(reg && (reg.hidden || reg.disabled_by));
};

function readTemp(hass, entityId) {
  if (!entityId) return { val: null, unit: "°C" };
  const st = hass.states[entityId];
  if (!st) return { val: null, unit: "°C" };
  if (entityId.startsWith("climate.")) {
    const v = st.attributes.current_temperature;
    return { val: typeof v === "number" ? v : null, unit: "°C" };
  }
  const v = parseFloat(st.state);
  return { val: isNaN(v) ? null : v, unit: st.attributes.unit_of_measurement || "°C" };
}
/* Gruppen gelten als aktiv, wenn ein Mitglied aktiv ist */
function isOpenLike(hass, id) {
  const s = hass.states[id];
  if (!s) return false;
  const dom = id.split(".")[0];
  if (dom === "lock") return s.state === "unlocked" || s.state === "open";
  if (dom === "cover") return s.state !== "closed";
  if (dom === "group" && Array.isArray(s.attributes.entity_id)) {
    return s.attributes.entity_id.some((m) => isOpenLike(hass, m));
  }
  return s.state === "on" || s.state === "open";
}
function toCssColor(v) {
  if (Array.isArray(v) && v.length >= 3) return "rgb(" + v.slice(0, 3).join(",") + ")";
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function pathsFrom(series, w, h, pad) {
  const live = series.filter((s) => s.pts && s.pts.length > 1);
  if (!live.length) return null;
  let min = Infinity, max = -Infinity, t0 = Infinity, t1 = -Infinity;
  live.forEach((s) => s.pts.forEach((p) => {
    if (p.v < min) min = p.v;
    if (p.v > max) max = p.v;
    if (p.t < t0) t0 = p.t;
    if (p.t > t1) t1 = p.t;
  }));
  if (min > 0 && live.some((s) => s.zero)) min = 0;
  const span = max - min || 1, tspan = t1 - t0 || 1;
  const X = (t) => pad + ((t - t0) / tspan) * (w - 2 * pad);
  const Y = (v) => (h - pad) - ((v - min) / span) * (h - 2 * pad);
  return live.map((s) => {
    const line = s.pts.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1)).join(" ");
    const area = s.area
      ? "M" + X(s.pts[0].t).toFixed(1) + " " + h + " " +
        s.pts.map((p) => "L" + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1)).join(" ") +
        " L" + X(s.pts[s.pts.length - 1].t).toFixed(1) + " " + h + " Z"
      : null;
    return { cls: s.cls, line, area, min, max };
  });
}

async function fetchHistory(hass, ids, hours) {
  const now = Date.now();
  const res = await hass.callWS({
    type: "history/history_during_period",
    start_time: new Date(now - Math.max(1, hours) * 3600 * 1000).toISOString(),
    end_time: new Date(now).toISOString(),
    entity_ids: ids,
    minimal_response: true,
    no_attributes: true,
  });
  const out = {};
  ids.forEach((id) => {
    const arr = res && res[id] ? res[id] : [];
    const pts = [];
    for (const r of arr) {
      const v = parseFloat(r.s), t = (r.lu || r.last_updated || 0) * 1000;
      if (!isNaN(v) && t) pts.push({ t, v });
    }
    out[id] = pts;
  });
  return out;
}

const WX = {
  "clear-night": ["Klar", "mdi:weather-night"],
  cloudy: ["Bewölkt", "mdi:weather-cloudy"],
  fog: ["Nebel", "mdi:weather-fog"],
  hail: ["Hagel", "mdi:weather-hail"],
  lightning: ["Gewitter", "mdi:weather-lightning"],
  "lightning-rainy": ["Gewitter", "mdi:weather-lightning-rainy"],
  partlycloudy: ["Teils bewölkt", "mdi:weather-partly-cloudy"],
  pouring: ["Starkregen", "mdi:weather-pouring"],
  rainy: ["Regen", "mdi:weather-rainy"],
  snowy: ["Schnee", "mdi:weather-snowy"],
  "snowy-rainy": ["Schneeregen", "mdi:weather-snowy-rainy"],
  sunny: ["Sonnig", "mdi:weather-sunny"],
  windy: ["Windig", "mdi:weather-windy"],
  "windy-variant": ["Windig", "mdi:weather-windy-variant"],
  exceptional: ["Extrem", "mdi:alert"],
};
function pollenShort(name) {
  return String(name)
    .replace(/pollenflug[- ]?gefahrenindex/i, "")
    .replace(/pollen(flug)?/i, "")
    .replace(/index/i, "")
    .replace(/[:\-–]/g, " ")
    .trim() || name;
}

/* ══════════════════════════════════════════════════════════════
   Farbsystem
   ══════════════════════════════════════════════════════════════ */

const TONES = {
  amber:    ["var(--prism-amber)", "var(--prism-rose)"],
  sunset:   ["var(--prism-gold)", "var(--prism-magenta)"],
  grid:     ["var(--prism-gold)", "var(--prism-red)"],
  sand:     ["var(--prism-sand)", "var(--prism-bronze)"],
  ember:    ["var(--prism-ember)", "var(--prism-wine)"],
  coral:    ["var(--prism-coral)", "var(--prism-berry)"],
  rose:     ["var(--prism-rose)", "var(--prism-magenta)"],
  berry:    ["var(--prism-blush)", "var(--prism-berry)"],
  crimson:  ["var(--prism-coral)", "var(--prism-wine)"],
  violet:   ["var(--prism-violet)", "var(--prism-magenta)"],
  plum:     ["var(--prism-lilac)", "var(--prism-plum)"],
  night:    ["var(--prism-indigo)", "var(--prism-violet)"],
  sky:      ["var(--prism-cyan)", "var(--prism-blue)"],
  battery:  ["var(--prism-cyan)", "var(--prism-indigo)"],
  ice:      ["var(--prism-frost)", "var(--prism-steel)"],
  ocean:    ["var(--prism-azure)", "var(--prism-navy)"],
  teal:     ["var(--prism-teal)", "var(--prism-blue)"],
  mint:     ["var(--prism-mint)", "var(--prism-jade)"],
  forest:   ["var(--prism-fern)", "var(--prism-forest)"],
  solar:    ["var(--prism-lime)", "var(--prism-green)"],
  olive:    ["var(--prism-olive)", "var(--prism-moss)"],
  slate:    ["var(--prism-fog)", "var(--prism-slate)"],
  graphite: ["var(--prism-silver)", "var(--prism-graphite)"],
};

const ROOT_TOKENS = `
  /* Basis — greift Theme-Variablen ab, sonst Fallback */
  --prism-amber:   var(--state-light-active-color, #FFC24B);
  --prism-gold:    var(--warning-color, #FBBF24);
  --prism-rose:    var(--error-color, #FF6B6B);
  --prism-red:     var(--label-badge-red, #EF4444);
  --prism-magenta: var(--energy-grid-return-color, #C13584);
  --prism-teal:    var(--state-climate-cool-color, #5EEAD4);
  --prism-blue:    var(--info-color, #3B82F6);
  --prism-cyan:    var(--energy-battery-in-color, #22D3EE);
  --prism-indigo:  var(--accent-color, #6366F1);
  --prism-violet:  var(--state-media_player-active-color, #A78BFA);
  --prism-lime:    var(--energy-solar-color, #D9F99D);
  --prism-green:   var(--success-color, #34D399);
  /* Erweiterung — feste Töne der Sammlung */
  --prism-olive:   #C3D186;  --prism-moss:     #4E6B2F;
  --prism-coral:   #FF8A5B;  --prism-berry:    #C81E6B;
  --prism-blush:   #FFA8C5;  --prism-wine:     #7F1D1D;
  --prism-ember:   #F97316;  --prism-bronze:   #9A5B22;
  --prism-sand:    #F2C879;  --prism-jade:     #12886A;
  --prism-mint:    #7EE8B5;  --prism-fern:     #8FD46B;
  --prism-forest:  #2C6B41;  --prism-frost:    #CFE9FF;
  --prism-steel:   #3E6C99;  --prism-azure:    #38BDF8;
  --prism-navy:    #12315C;  --prism-lilac:    #D8B4FE;
  --prism-plum:    #6D28D9;  --prism-fog:      #B7C1D9;
  --prism-slate:   #4A5878;  --prism-silver:   #D5DBEA;
  --prism-graphite:#2B3350;
`;

/* ══════════════════════════════════════════════════════════════
   Gemeinsames CSS
   ══════════════════════════════════════════════════════════════ */

const BASE_CSS = `
:host{
  display:block;
  container-type:inline-size;
  ${ROOT_TOKENS}
  --p-radius: var(--ha-card-border-radius, 24px);
  --p-ink: #0B0A14;
  --p-display: "Bricolage Grotesque", var(--ha-card-header-font-family, var(--paper-font-headline_-_font-family)), system-ui, sans-serif;
  --p-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
  --c1: var(--prism-teal);
  --c2: var(--prism-blue);
}
*{box-sizing:border-box}

/* ---------- Karte & Zonen ---------- */
.card{
  container-type:inline-size;
  /* Breite einer Rasterspalte — die einzige Größe, die auf dem ganzen
     Dashboard gleich ist. Jede Karte setzt --cols nach ihrem Raster. */
  --cols:6;
  --u:calc(100cqi / var(--cols));
  /* Abstände richten sich wie die Schrift nach der Rasterspalte. Die
     Werte entsprechen dem, was Quadratkarten bisher hatten — dadurch
     sitzt der Kopf auf jeder Karte gleich weit vom Rand. */
  --p-pad:clamp(11px, calc(var(--u) * 0.252), 22px);
  --p-gap:clamp(5px,  calc(var(--u) * 0.144), 14px);
  /* Schriftskala: neue Karten verwenden diese Marken statt eigener Werte */
  --t-title: clamp(14px,  calc(var(--u) * 0.336), 22px);
  --t-state: clamp(9px,   calc(var(--u) * 0.192), 12.5px);
  --t-hero:  clamp(24px,  calc(var(--u) * 1.02),  54px);
  --t-big:   clamp(18px,  calc(var(--u) * 0.66),  34px);
  --t-value: clamp(11px,  calc(var(--u) * 0.28),  22px);
  --t-body:  clamp(9.5px, calc(var(--u) * 0.21),  14px);
  --t-label: clamp(7.5px, calc(var(--u) * 0.13),  11.5px);
  --t-micro: clamp(7px,   calc(var(--u) * 0.115), 10.5px);

  position:relative; isolation:isolate; overflow:hidden;
  max-width:100%; min-width:0;
  aspect-ratio:1/1;
  border-radius:var(--p-radius);
  border:1px solid rgba(255,255,255,.16);
  padding:var(--p-pad, 18px);
  color:var(--p-ink);
  font-family:var(--ha-card-header-font-family, var(--paper-font-body1_-_font-family)), system-ui, sans-serif;
  box-shadow:var(--ha-card-box-shadow, 0 18px 40px -26px rgba(0,0,0,.85));
  display:grid;
  grid-template-rows:auto minmax(0,1fr) auto;
  grid-template-areas:"h" "b" "f";
  gap:var(--p-gap, 10px);
}
.card.dbl{
  /* Eine Doppelkarte ist 12 Spalten plus 11 Zwischenräume breit, ein
     Quadrat 6 Spalten plus 5. Bei striktem 2:1 wäre sie deshalb um einen
     halben Zwischenraum höher als das Quadrat daneben. Der Abzug gleicht
     das aus; --prism-grid-gap lässt sich im Theme anpassen. */
  aspect-ratio:auto;
  height:calc(50cqi - var(--prism-grid-gap, 8px) / 2);
  grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  grid-template-areas:"h d" "b d" "f d";
  column-gap:0;
}
.card.free{aspect-ratio:auto; height:100%}
/* Karten mit Zustandsbalken bekommen eine vierte Zeile über die volle Breite */
.card.solo{grid-template-rows:minmax(0,1fr); grid-template-areas:"b"}
.card.has-bar{grid-template-rows:auto minmax(0,1fr) auto auto; grid-template-areas:"h" "b" "f" "s"}
.card.dbl.has-bar{grid-template-areas:"h d" "b d" "f d" "s s"}

/* Keine Zone darf breiter werden als ihre Spalte — sonst schiebt sich
   Inhalt über den Kartenrand hinaus und wird abgeschnitten. */
.zh,.zb,.zf,.zd,.zs{min-width:0; max-width:100%}
.zh{grid-area:h}
.zb{grid-area:b; min-height:0; overflow:hidden; display:flex; flex-direction:column; justify-content:center; gap:var(--p-gap, 10px)}
.zf{grid-area:f; min-width:0; max-width:100%; overflow:hidden}
.zd{
  grid-area:d; min-height:0; min-width:0; overflow:hidden;
  display:flex; flex-direction:column; justify-content:center; gap:var(--p-gap, 10px);
  margin-left:var(--p-pad, 18px); padding-left:var(--p-pad, 18px);
  border-left:1px solid rgba(11,10,20,.16);
}
.card.quiet .zd{border-left-color:var(--divider-color, rgba(127,127,127,.28))}
/* Jede Zone ist ein eigener Container: cqi misst die Zonenbreite,
   damit eine Doppelkarte genauso groß setzt wie ein Quadrat daneben. */
.zs{grid-area:s; min-width:0}
/* Die Karte ist der einzige Container. Alle Größen messen sich an der
   Rasterspalte (--u), nicht an der Zone — dadurch ist Schrift auf jeder
   Karte gleich groß, egal wie viele Spalten sie belegt. */

/* ---------- Zustandsbalken ---------- */
.soc{cursor:pointer}
.soc .lg{
  display:flex; align-items:baseline; justify-content:space-between; gap:1em;
  font-size:clamp(9.5px,calc(var(--u) * 0.144),12.5px); margin-bottom:.45em;
}
.soc .lg .k{opacity:.75; font-weight:600}
.soc .lg .v{font-family:var(--p-mono); font-weight:700; font-size:clamp(13px,calc(var(--u) * 0.216),19px); letter-spacing:-.02em}
.soc .tr{
  position:relative; height:clamp(8px,calc(var(--u) * 0.108),13px); border-radius:999px;
  background:rgba(11,10,20,.20); overflow:hidden;
}
.card.quiet .soc .tr{background:rgba(127,127,127,.22)}
.soc .tr i{
  display:block; height:100%; border-radius:999px;
  background:rgba(255,255,255,.88); transition:width .6s cubic-bezier(.2,.8,.2,1);
}
.card.quiet .soc .tr i{background:var(--primary-text-color)}
.soc .tr u{
  position:absolute; top:-2px; bottom:-2px; width:2px; border-radius:2px;
  background:rgba(11,10,20,.55); transform:translateX(-1px);
}
.soc .mk{display:flex; justify-content:space-between; font-size:clamp(8.5px,calc(var(--u) * 0.132),11px); opacity:.62; margin-top:.4em}
@media (prefers-reduced-motion: reduce){.soc .tr i{transition:none}}

/* ---------- Hintergrund ---------- */
.wash{position:absolute; inset:0; z-index:-3; background:linear-gradient(150deg,var(--c1) 0%,var(--c2) 100%)}
.rise{
  position:absolute; left:0; right:0; bottom:0; z-index:-2; pointer-events:none;
  height:var(--fill,0%);
  background:linear-gradient(to top, rgba(255,255,255,.34), rgba(255,255,255,0));
  transition:height .55s cubic-bezier(.2,.8,.2,1);
}
.gloss{
  position:absolute; inset:0; z-index:-1; pointer-events:none;
  background:radial-gradient(120% 90% at 6% -4%, rgba(255,255,255,.45), transparent 58%);
  mix-blend-mode:soft-light;
}
.card.quiet{color:var(--primary-text-color); border-color:var(--divider-color, rgba(255,255,255,.10))}
.card.quiet .wash{background:var(--ha-card-background, var(--card-background-color, #16181F))}
.card.quiet .rise,.card.quiet .gloss{display:none}
.cover{position:absolute; inset:0; z-index:-3; background-size:cover; background-position:center}
.scrim{position:absolute; inset:0; z-index:-2; background:linear-gradient(180deg, rgba(6,6,12,.20) 0%, rgba(6,6,12,.84) 100%)}
.on-cover{color:#fff}

/* ---------- Kopf ---------- */
.top{display:flex; align-items:center; gap:clamp(7px,calc(var(--u) * 0.168),12px); cursor:pointer}
.badge{
  width:clamp(28px,calc(var(--u) * 0.66),42px); height:clamp(28px,calc(var(--u) * 0.66),42px);
  border-radius:calc(var(--p-radius) * .45);
  background:rgba(255,255,255,.30);
  display:grid; place-items:center; flex:none;
}
.card.quiet .badge{background:rgba(127,127,127,.16)}
.on-cover .badge{background:rgba(255,255,255,.20)}
.badge ha-icon{--mdc-icon-size:clamp(16px,calc(var(--u) * 0.36),24px)}
.lbl{min-width:0; flex:1 1 auto}
.name{
  font-family:var(--p-display); font-weight:800; letter-spacing:-.02em; line-height:1.12;
  font-size:clamp(14px,calc(var(--u) * 0.336),22px); margin:0;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.state{
  display:block; font-family:var(--p-mono); font-weight:700;
  font-size:clamp(9px,calc(var(--u) * 0.192),12.5px); letter-spacing:.1em; text-transform:uppercase;
  opacity:.7; white-space:nowrap; margin-top:.25em;
}
.go{opacity:.45; --mdc-icon-size:clamp(15px,calc(var(--u) * 0.3),20px); flex:none}

/* ---------- Sockel ---------- */
.val{
  font-family:var(--p-mono); font-weight:700; font-variant-numeric:tabular-nums;
  letter-spacing:-.035em; line-height:.92;
  font-size:clamp(24px,calc(var(--u) * 1.02),52px);
  display:flex; align-items:baseline; gap:.14em;
}
.val small{font-size:.38em; font-weight:500; opacity:.72; letter-spacing:0}
.val.mid{font-size:clamp(18px,calc(var(--u) * 0.66),34px)}
.val.txt{font-family:var(--p-display); font-size:clamp(15px,calc(var(--u) * 0.48),26px); letter-spacing:-.02em}
.sub{font-size:clamp(10px,calc(var(--u) * 0.216),13.5px); opacity:.78; line-height:1.35; margin-top:.4em}
.sub b{font-weight:700; opacity:1; font-family:var(--p-mono)}

/* ---------- Chips ---------- */
.chips{display:flex; flex-wrap:wrap; gap:clamp(4px,calc(var(--u) * 0.108),7px); overflow:hidden; max-height:2.4em; margin-top:.55em}
.chip{
  display:inline-flex; align-items:center; gap:.4em;
  font-size:clamp(9.5px,calc(var(--u) * 0.192),12px); font-weight:600; line-height:1;
  padding:.5em .7em; border-radius:999px; white-space:nowrap;
  background:rgba(11,10,20,.18);
}
.card.quiet .chip{background:rgba(127,127,127,.16)}
.on-cover .chip{background:rgba(255,255,255,.18)}
.chip.hot{background:rgba(11,10,20,.34)}
.chip ha-icon{--mdc-icon-size:1.15em}
.chip .lvl{font-family:var(--p-mono); font-weight:700}

/* ---------- Zeilenliste (füllt die Inhaltszone) ---------- */
.rows{display:flex; flex-direction:column; gap:clamp(3px,calc(var(--u) * 0.084),7px)}
.rw{
  display:flex; align-items:center; gap:.55em;
  font-size:clamp(10px,calc(var(--u) * 0.21),13px); line-height:1.2;
  padding:clamp(3px,calc(var(--u) * 0.072),6px) 0;
  border-bottom:1px solid rgba(11,10,20,.10);
}
.rw:last-child{border-bottom:0}
.card.quiet .rw{border-bottom-color:var(--divider-color, rgba(127,127,127,.2))}
.on-cover .rw{border-bottom-color:rgba(255,255,255,.16)}
.rw ha-icon{--mdc-icon-size:1.3em; opacity:.8; flex:none}
.rw .k{flex:1 1 auto; min-width:0; opacity:.78; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.rw .v{font-family:var(--p-mono); font-weight:700; white-space:nowrap; flex:none}
.rw.hot ha-icon,.rw.hot .v{opacity:1}
.rw.hot .k{opacity:.95; font-weight:600}
.rw.mute{opacity:.55}

/* ---------- Graph ---------- */
.graph{position:relative; width:100%; max-width:100%; min-width:0; flex:1 1 auto; min-height:0; display:flex}
.graph{overflow:hidden}
.graph svg{width:100%; height:100%; display:block; overflow:hidden}
.graph path{fill:none; stroke-linecap:round; stroke-linejoin:round; vector-effect:non-scaling-stroke}
.graph .ln{stroke:rgba(11,10,20,.62); stroke-width:2.4}
.graph .ar{fill:rgba(255,255,255,.26); stroke:none}
.graph .use{stroke:rgba(11,10,20,.45); stroke-width:2; stroke-dasharray:3 4}
.card.quiet .graph .ln,.card.quiet .graph .use{stroke:var(--secondary-text-color)}
.card.quiet .graph .ar{fill:rgba(127,127,127,.18)}
.glabel{display:flex; justify-content:space-between; font-family:var(--p-mono); font-size:clamp(8.5px,calc(var(--u) * 0.168),11px); opacity:.6}
.empty{font-size:clamp(10px,calc(var(--u) * 0.204),13px); opacity:.6; margin:auto}

/* ---------- Mini-Karte ---------- */
.mini{display:flex; flex-direction:column; height:100%; gap:.35em}
.mini.center{align-items:center; justify-content:center; text-align:center; gap:.5em}
.mini.nav{align-items:center; text-align:center}
.mini.nav .nm{white-space:normal; overflow:visible; line-height:1.2}
.mini .hero{
  flex:1 1 auto; min-height:0; min-width:0; width:100%;
  display:grid; place-items:center; margin-bottom:.15em;
}
.mini .hero ha-icon{--mdc-icon-size:min(calc(var(--u) * 3.48), 100%); width:auto; height:auto}
.mini .sp{flex:1 1 auto; min-height:0}
.mini .ic{
  width:clamp(26px,calc(var(--u) * 1.56),46px); height:clamp(26px,calc(var(--u) * 1.56),46px); flex:none;
  border-radius:calc(var(--p-radius) * .4);
  background:rgba(255,255,255,.30); display:grid; place-items:center;
}
.card.quiet .mini .ic{background:rgba(127,127,127,.16)}
.mini .ic ha-icon{--mdc-icon-size:clamp(16px,calc(var(--u) * 0.9),27px)}
.mini.center .ic{width:clamp(30px,calc(var(--u) * 1.8),54px); height:clamp(30px,calc(var(--u) * 1.8),54px)}
.mini .nm{
  font-family:var(--p-display); font-weight:700; letter-spacing:-.015em; line-height:1.15;
  font-size:clamp(11px,calc(var(--u) * 0.54),16px);
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.mini.center .nm{white-space:normal; overflow:visible}
.mini .vl{
  font-family:var(--p-mono); font-weight:700; font-variant-numeric:tabular-nums;
  letter-spacing:-.03em; line-height:1;
  font-size:clamp(17px,calc(var(--u) * 1.02),32px);
  display:flex; align-items:baseline; gap:.14em; min-width:0;
}
.mini .vl span{overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.mini .vl small{font-size:.44em; font-weight:500; opacity:.72}
.mini .vl.txt{font-family:var(--p-display); font-size:clamp(13px,calc(var(--u) * 0.72),22px); letter-spacing:-.02em}
.mini .sc{font-size:clamp(9px,calc(var(--u) * 0.39),12px); opacity:.72; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.mini .bg{font-family:var(--p-display); font-weight:800; letter-spacing:-.02em; line-height:1; font-size:clamp(14px,calc(var(--u) * 0.78),22px)}
.mini .hd{display:flex; align-items:center; gap:.45em; min-width:0}
.mini .hd .dt{width:clamp(5px,calc(var(--u) * 0.18),7px); aspect-ratio:1; border-radius:50%; background:rgba(11,10,20,.6); flex:none}
.card.quiet .mini .hd .dt{background:var(--secondary-text-color)}
.mini .hd .lb{
  font-family:var(--p-mono); font-weight:700; font-size:clamp(8px,calc(var(--u) * 0.324),10.5px);
  letter-spacing:.1em; text-transform:uppercase; opacity:.72;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.mini .pb{
  height:clamp(5px,calc(var(--u) * 0.156),10px); border-radius:999px; overflow:hidden;
  background:rgba(11,10,20,.20); margin-top:.5em; flex:none;
}
.card.quiet .mini .pb{background:rgba(127,127,127,.22)}
.mini .pb i{
  display:block; height:100%; border-radius:999px;
  background:rgba(255,255,255,.9); transition:width .6s cubic-bezier(.2,.8,.2,1);
}
.card.quiet .mini .pb i{background:var(--primary-text-color)}
.mini .scrow{display:flex; align-items:baseline; justify-content:space-between; gap:.5em; min-width:0}
.mini .scrow .nmx{overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.mini .scrow b{font-family:var(--p-mono); font-weight:700; opacity:.8; flex:none}
@media (prefers-reduced-motion: reduce){.mini .pb i{transition:none}}

/* ---------- Mini-Karte: Ringvariante ---------- */
.mini .phase{display:flex; align-items:center; gap:.45em; min-width:0}
.mini .phase .dt{
  width:clamp(5px,calc(var(--u) * 0.12),7px); aspect-ratio:1; border-radius:50%; flex:none;
  background:rgba(11,10,20,.6); animation:prism-blink 1.8s ease-in-out infinite;
}
.card.quiet .mini .phase .dt{background:var(--secondary-text-color); animation:none}
.mini .phase .lb{
  font-family:var(--p-mono); font-weight:700; letter-spacing:.1em; text-transform:uppercase;
  font-size:clamp(8px,calc(var(--u) * 0.324),10.5px); opacity:.72;
  overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.rgw{position:relative; flex:1 1 auto; min-height:0; display:grid; place-items:center; margin-top:.25em}
.rgw svg{position:absolute; inset:0; width:100%; height:100%; transform:rotate(-90deg)}
.rgw circle{fill:none; stroke-linecap:round}
.rgw .tr{stroke:rgba(11,10,20,.18); stroke-width:6}
.rgw .pr{stroke:rgba(11,10,20,.72); stroke-width:6; transition:stroke-dashoffset .6s ease}
.card.quiet .rgw .tr{stroke:rgba(127,127,127,.22)}
.card.quiet .rgw .pr{stroke:var(--primary-text-color)}
.rgc{position:relative; text-align:center; line-height:1; padding:0 6px; min-width:0}
.rgc .t{
  font-family:var(--p-mono); font-weight:700; font-variant-numeric:tabular-nums;
  letter-spacing:-.04em; font-size:clamp(15px,calc(var(--u) * 1.02),30px);
}
.rgc .t small{font-size:.42em; font-weight:500; opacity:.72; margin-left:.12em}
.rgc .p{font-family:var(--p-mono); font-size:clamp(8px,calc(var(--u) * 0.336),11px); opacity:.62; margin-top:.35em}
/* Sehr schmale Kachel: Prozentwert weicht, die Zahl bleibt lesbar */
@container (max-width: 118px){ .rgc .p{display:none} }

/* ---------- Aktionen ---------- */
.acts{display:flex; flex-wrap:wrap; gap:clamp(4px,calc(var(--u) * 0.108),7px)}
.act{
  display:inline-flex; align-items:center; gap:.4em; cursor:pointer;
  font-size:clamp(9.5px,calc(var(--u) * 0.192),12px); font-weight:600; line-height:1;
  padding:.55em .75em; border-radius:999px;
  background:rgba(11,10,20,.16); border:1px solid transparent;
  transition:background .18s, border-color .18s;
}
.act:hover{background:rgba(11,10,20,.3)}
.act.on{background:rgba(255,255,255,.34)}
.act.warn{background:rgba(11,10,20,.32); border-color:rgba(11,10,20,.5)}
.card.quiet .act{background:rgba(127,127,127,.16)}
.on-cover .act{background:rgba(255,255,255,.18)}
.act ha-icon{--mdc-icon-size:1.2em}

/* ---------- Medien ---------- */
.bar{height:4px; border-radius:999px; background:rgba(11,10,20,.22); overflow:hidden}
.on-cover .bar{background:rgba(255,255,255,.26)}
.bar i{display:block; height:100%; border-radius:999px; background:currentColor; opacity:.9}
.times{display:flex; justify-content:space-between; font-family:var(--p-mono); font-size:clamp(8.5px,calc(var(--u) * 0.168),11px); opacity:.75; margin-top:.35em}
.ctrl{display:flex; align-items:center; gap:clamp(6px,calc(var(--u) * 0.18),14px); margin-top:.6em}
.ctrl .btn{cursor:pointer; opacity:.85; --mdc-icon-size:clamp(17px,calc(var(--u) * 0.39),24px)}
.ctrl .btn:hover{opacity:1}
.pp{
  width:clamp(30px,calc(var(--u) * 0.72),46px); height:clamp(30px,calc(var(--u) * 0.72),46px); border-radius:50%;
  display:grid; place-items:center; cursor:pointer; background:rgba(255,255,255,.32); flex:none;
}
.pp ha-icon{--mdc-icon-size:clamp(17px,calc(var(--u) * 0.42),26px)}

/* ---------- Sonstiges ---------- */
.stage{position:relative; flex:1 1 auto; min-height:0; min-width:0; overflow:hidden; display:grid; place-items:center}
/* Bild absolut einpassen: contain skaliert auf die Bühne, nichts wird beschnitten */
.stage img{
  position:absolute; inset:0; width:100%; height:100%;
  object-fit:contain; object-position:center; display:block;
  filter:drop-shadow(0 14px 22px rgba(0,0,0,.4));
}
.stage.pad img{padding:clamp(2px,calc(var(--u) * 0.09),10px)}

.row{display:flex; align-items:center; gap:clamp(8px,calc(var(--u) * 0.24),18px)}
.grow{flex:1 1 auto; min-width:0}
.blink{animation:prism-blink 1.6s ease-in-out infinite}
@keyframes prism-blink{0%,100%{opacity:1}50%{opacity:.4}}
@media (prefers-reduced-motion: reduce){
  .rise,.soc .tr i{transition:none}
  .blink{animation:none}
}
`;

/* ══════════════════════════════════════════════════════════════
   Basisklasse
   ══════════════════════════════════════════════════════════════ */

const SQUARE_GRID = { columns: 6, min_columns: 4, rows: "auto" };
const DOUBLE_GRID = { columns: 12, min_columns: 8, rows: "auto" };
/* Vier Minis (3 Spalten, 1:1) ergeben zusammen genau ein Standard-Quadrat */
const MINI_GRID = { columns: 3, min_columns: 2, rows: "auto" };

class PrismCard extends HTMLElement {
  static getConfigElement() { return document.createElement(this.editorTag); }
  static getStubConfig() { return Object.assign({}, this.stub || {}); }

  setConfig(config) {
    this._config = Object.assign({}, this.constructor.defaults || {}, config || {});
    this._sig = null;
    this._render();
  }
  set hass(hass) {
    this._hass = hass;
    if (this.onHass) this.onHass();
    this._render();
  }
  getCardSize() { return this.constructor.double ? 6 : 3; }
  getGridOptions() {
    return Object.assign({}, this.constructor.gridOpts
      || (this.constructor.double ? DOUBLE_GRID : SQUARE_GRID));
  }
  disconnectedCallback() { if (this._tick) { clearInterval(this._tick); this._tick = null; } }

/* ---------- Aktionen ---------- */
  _fire(name, detail) {
    const ev = new Event(name, { bubbles: true, composed: true });
    ev.detail = detail;
    this.dispatchEvent(ev);
  }
  _moreInfo(id) { if (id) this._fire("hass-more-info", { entityId: id }); }
  _headTap(fallbackEntity) {
    const a = this._config.tap_action;
    if (!a || a.action === "none") return;
    this._fire("hass-action", { config: { tap_action: a, entity: this._config.entity || fallbackEntity }, action: "tap" });
  }
  _domainToggle(id) {
    const hass = this._hass, s = stateOf(hass, id), d = id.split(".")[0];
    if (d === "lock") hass.callService("lock", s === "locked" ? "unlock" : "lock", { entity_id: id });
    else if (d === "climate") hass.callService("climate", s === "off" ? "turn_on" : "turn_off", { entity_id: id });
    else hass.callService("homeassistant", "toggle", { entity_id: id });
  }
  _act(entity, actionCfg, fallback) {
    if (!entity) return;
    const a = actionCfg && actionCfg.action ? actionCfg : { action: fallback };
    if (a.action === "none") return;
    if (a.action === "toggle") { this._domainToggle(entity); return; }
    if (a.action === "more-info") { this._moreInfo(entity); return; }
    this._fire("hass-action", { config: { entity, tap_action: a }, action: "tap" });
  }
  _on(id, fn) {
    const el = this.shadowRoot.getElementById(id);
    if (el) el.addEventListener("click", (ev) => { ev.stopPropagation(); fn(ev); });
  }
  _wireHead(fallbackEntity) {
    const el = this.shadowRoot.getElementById("head");
    if (el) el.addEventListener("click", () => this._headTap(fallbackEntity));
    this.shadowRoot.querySelectorAll("[data-mi]").forEach((n) => {
      n.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(n.getAttribute("data-mi")); });
    });
  }

  /* ---------- Bausteine ---------- */
  head(icon, title, stateTxt, opts) {
    const o = opts || {};
    return `<div class="top" id="head">
      <span class="badge"><ha-icon icon="${icon}"></ha-icon></span>
      <span class="lbl">
        <p class="name">${esc(title)}</p>
        ${stateTxt ? `<span class="state">${stateTxt}</span>` : ""}
      </span>
      ${o.go === false ? "" : `<ha-icon class="go" icon="mdi:chevron-right"></ha-icon>`}
    </div>`;
  }
  value(main, unit, cls) {
    return `<div class="val ${cls || ""}">${main}${unit ? `<small>${esc(unit)}</small>` : ""}</div>`;
  }
  /* Zeilenliste — der Standardfüller für die Inhaltszone */
  rows(list) {
    const live = (list || []).filter(Boolean);
    if (!live.length) return "";
    return `<div class="rows">${live.map((r) =>
      `<div class="rw${r.hot ? " hot" : ""}${r.mute ? " mute" : ""}"${r.mi ? ` data-mi="${r.mi}" style="cursor:pointer"` : ""}>
         ${r.icon ? `<ha-icon icon="${r.icon}"></ha-icon>` : ""}
         <span class="k">${esc(r.k)}</span>
         <span class="v">${r.v === undefined ? "" : esc(r.v)}</span>
       </div>`).join("")}</div>`;
  }
  /* Zustandsbalken über die volle Kartenbreite, Fußzeile der Karte */
  socBar(o) {
    const pct = o.pct === null || o.pct === undefined || isNaN(o.pct)
      ? null : Math.max(0, Math.min(100, o.pct));
    return `<div class="soc"${o.id ? ` id="${o.id}"` : ""}>
      <div class="lg"><span class="k">${esc(o.label || "Akkustand")}</span>
        <span class="v">${pct === null ? "–" : fmt0(pct) + " %"}</span></div>
      <div class="tr"><i style="width:${pct === null ? 0 : pct}%"></i>${
        o.limit !== null && o.limit !== undefined && !isNaN(o.limit)
          ? `<u style="left:${Math.max(0, Math.min(100, o.limit))}%"></u>` : ""}</div>
      ${o.left || o.right
        ? `<div class="mk"><span>${esc(o.left || "")}</span><span>${esc(o.right || "")}</span></div>` : ""}
    </div>`;
  }
  chips(list) {
    const live = (list || []).filter(Boolean);
    if (!live.length) return "";
    return `<div class="chips" id="chips">${live.map((c) =>
      `<span class="chip${c.hot ? " hot" : ""}"${c.mi ? ` data-mi="${c.mi}"` : ""}>${
        c.icon ? `<ha-icon icon="${c.icon}"></ha-icon>` : ""}${esc(c.txt)}${
        c.lvl !== undefined ? ` <span class="lvl">${esc(c.lvl)}</span>` : ""}</span>`).join("")}</div>`;
  }
  graph(paths, w, h, emptyTxt, legend) {
    if (!paths) return `<div class="graph"><div class="empty">${esc(emptyTxt)}</div></div>`;
    return `<div class="graph"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        ${paths.map((p) => (p.area ? `<path class="ar" d="${p.area}"></path>` : "")).join("")}
        ${paths.map((p) => `<path class="${p.cls}" d="${p.line}"></path>`).join("")}
      </svg></div>
      ${legend ? `<div class="glabel">${legend.map((l) => `<span>${esc(l)}</span>`).join("")}</div>` : ""}`;
  }

  /* Chip-Überlauf: nur was in EINE Reihe passt, Rest als "+N" */
  _fitChips() {
    if (!this.shadowRoot) return;
    const box = this.shadowRoot.getElementById("chips");
    if (!box) return;
    const kids = [...box.querySelectorAll(".chip:not(.more)")];
    let more = box.querySelector(".chip.more");
    kids.forEach((k) => { k.style.display = ""; });
    if (more) more.style.display = "none";
    if (kids.length < 2) return;
    const top0 = kids[0].offsetTop;
    if (kids.every((k) => k.offsetTop <= top0)) return;
    if (!more) {
      more = document.createElement("span");
      more.className = "chip more";
      box.appendChild(more);
    }
    let keep = kids.length;
    const apply = (n) => {
      kids.forEach((k, i) => { k.style.display = i < n ? "" : "none"; });
      more.textContent = "+" + (kids.length - n);
      more.style.display = "";
    };
    do {
      keep--;
      apply(keep);
      if (kids.slice(0, keep).every((k) => k.offsetTop <= top0) && more.offsetTop <= top0) break;
    } while (keep > 1);
    if (keep < 1) apply(1);
  }

  /* ---------- Farben ---------- */
  _paintCSS(view) {
    const cfg = this._config;
    const tone = TONES[view.tone] || TONES.teal;
    const from = toCssColor(cfg.gradient_from) || toCssColor(cfg.color_accent) || view.from || tone[0];
    const to = toCssColor(cfg.gradient_to) || view.to || tone[1];
    const map = {
      "--prism-amber": cfg.color_light,
      "--prism-gold": cfg.color_warm,
      "--prism-rose": cfg.color_alert,
      "--prism-red": cfg.color_alert,
      "--prism-teal": cfg.color_cool,
      "--ha-card-background": cfg.color_surface,
    };
    const extra = Object.keys(map)
      .map((k) => { const c = toCssColor(map[k]); return c ? `${k}:${c};` : ""; })
      .join("");
    return `:host{${extra}}.card{--c1:${from}; --c2:${to}}`
      + (view.ink ? `.card{color:${view.ink}}` : "");
  }

  /* Spaltenzahl der Karte — daraus leitet das CSS die Rasterspalte ab.
     Eine im Dashboard geänderte Breite hat Vorrang vor dem Standard. */
  _columns() {
    const layout = this._config && this._config.grid_options;
    const fromLayout = layout && parseInt(layout.columns);
    if (fromLayout) return fromLayout;
    const g = this.getGridOptions() || {};
    return parseInt(g.columns) || 6;
  }

  /* ---------- Renderzyklus ---------- */
  _render() {
    if (!this._config || !this._hass) return;
    let v;
    try { v = this.view(this._hass, this._config); } catch (e) { return; }
    if (!v) return;

    const sig = JSON.stringify([v.sig, this._config]);
    if (sig === this._sig) return;
    this._sig = sig;

    const dbl = this.constructor.double && this._config.shape !== "square";
    const bar = !!v.bar;
    const solo = !v.head && !v.foot && !dbl;
    const free = this._config.shape === "free";
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML =
      `<style>${BASE_CSS}${this.constructor.css || ""}${this._paintCSS(v)}</style>
       <div class="card${v.quiet ? " quiet" : ""}${dbl ? " dbl" : ""}${bar ? " has-bar" : ""}${solo ? " solo" : ""}${free ? " free" : ""}${v.cover ? " on-cover" : ""}"
            style="--cols:${this._columns()}; --fill:${Math.max(0, Math.min(100, Number(v.fill) || 0))}%">
         ${v.cover
            ? `<div class="cover" style="background-image:url('${esc(v.cover)}')"></div><div class="scrim"></div>`
            : `<div class="wash"></div><div class="rise"></div><div class="gloss"></div>`}
         ${v.layers || ""}
         ${v.head ? `<div class="zh">${v.head}</div>` : ""}
         <div class="zb">${v.body || ""}</div>
         ${v.foot ? `<div class="zf">${v.foot}</div>` : ""}
         ${dbl ? `<div class="zd">${v.detail || ""}</div>` : ""}
         ${bar ? `<div class="zs">${v.bar}</div>` : ""}
       </div>`;

    if (this.wire) this.wire(v);
    requestAnimationFrame(() => this._fitChips());
  }
}

/* ══════════════════════════════════════════════════════════════
   Generischer GUI-Editor
   ══════════════════════════════════════════════════════════════ */

function makeEditor(schema, labels) {
  return class extends HTMLElement {
    setConfig(config) { this._config = Object.assign({}, config); this._update(); }
    set hass(hass) { this._hass = hass; this._update(); }
    _update() {
      if (!this._hass || !this._config) return;
      if (!this._form) {
        this._form = document.createElement("ha-form");
        this._form.computeLabel = (s) => labels[s.name] || s.name;
        this._form.addEventListener("value-changed", (ev) => {
          const value = Object.assign({}, ev.detail.value);
          for (const k in value) {
            if (k === "title" || k === "name") continue;
            const v = value[k];
            if (v === "" || v === null || (Array.isArray(v) && !v.length)) delete value[k];
          }
          this._config = value;
          const e = new Event("config-changed", { bubbles: true, composed: true });
          e.detail = { config: value };
          this.dispatchEvent(e);
        });
        this.appendChild(this._form);
      }
      this._form.hass = this._hass;
      this._form.data = this._config;
      this._form.schema = schema;
    }
  };
}

const STYLE_SCHEMA = [
  { name: "gradient_from", selector: { text: {} } },
  { name: "gradient_to", selector: { text: {} } },
  { name: "color_surface", selector: { text: {} } },
];
const STYLE_LABELS = {
  gradient_from: "Verlauf: Startfarbe (leer = Theme-Ton der Karte)",
  gradient_to: "Verlauf: Endfarbe (leer = Theme-Ton der Karte)",
  color_surface: "Farbe: Kartenfläche im Ruhezustand (leer = Theme)",
};
/* Doppelkarten dürfen auf ein Quadrat oder auf freie Höhe umgestellt werden */
const SHAPE_SCHEMA = [
  { name: "shape", selector: { select: { mode: "dropdown", options: [
    { value: "double", label: "Doppel-Quadrat (Standard)" },
    { value: "square", label: "Ein Quadrat" },
    { value: "free", label: "Freie Höhe" },
  ] } } },
];
const SHAPE_LABELS = { shape: "Form der Karte" };

function register(tag, cls, meta, schema, labels) {
  const editorTag = tag + "-editor";
  cls.editorTag = editorTag;
  const full = schema.concat(STYLE_SCHEMA, cls.double ? SHAPE_SCHEMA : []);
  const lab = Object.assign({}, labels, STYLE_LABELS, cls.double ? SHAPE_LABELS : {});
  if (!customElements.get(tag)) customElements.define(tag, cls);
  if (!customElements.get(editorTag)) customElements.define(editorTag, makeEditor(full, lab));
  window.customCards.push({ type: tag, name: meta.name, description: meta.description, preview: true });
}

/* ══════════════════════════════════════════════════════════════
   1 — Light Card  ·  Quadrat
   ══════════════════════════════════════════════════════════════ */

class PrismLightCard extends PrismCard {
  static defaults = { title: "Licht", exclude_label: "no-dashboard", include_switches: false };
  static stub = { title: "Licht", exclude_label: "no-dashboard" };

  _collect() {
    const hass = this._hass, cfg = this._config;
    const exclIds = labelIdsFor(hass, cfg.exclude_label);
    const domains = ["light"].concat(cfg.include_switches ? ["switch"] : []);
    const manual = toList(cfg.entities);
    const result = [];
    const push = (id) => {
      const s = hass.states[id];
      if (!s) return;
      if (!domains.includes(id.split(".")[0])) return;
      if (entityLabels(hass, id).some((l) => exclIds.has(l))) return;
      if (isHidden(hass, id)) return;
      result.push(id);
    };
    if (manual.length) manual.forEach(push);
    else for (const id in hass.states) push(id);
    result.sort((a, b) => {
      const ra = areaNameFor(hass, a) || "\uffff", rb = areaNameFor(hass, b) || "\uffff";
      if (ra !== rb) return ra.localeCompare(rb, "de");
      return friendly(hass, a).localeCompare(friendly(hass, b), "de");
    });
    return result;
  }

  view(hass, cfg) {
    const lights = this._collect();
    const on = lights.filter((e) => hass.states[e].state === "on");

    /* Räume mit aktiven Lichtern — Zeilen statt Chips, das füllt die Fläche */
    const byArea = {};
    on.forEach((e) => {
      const a = areaNameFor(hass, e) || "Ohne Raum";
      (byArea[a] = byArea[a] || []).push(e);
    });
    const areas = Object.keys(byArea).sort((a, b) => a.localeCompare(b, "de"));

    /* Alle Räume mit Lampen — für den Ruhezustand */
    const byAll = {};
    lights.forEach((e) => {
      const a = areaNameFor(hass, e) || "Ohne Raum";
      (byAll[a] = byAll[a] || []).push(e);
    });

    const body = on.length
      ? this.rows(areas.slice(0, 4).map((a) => ({
          icon: "mdi:lightbulb-on", hot: true, k: a,
          v: byArea[a].length > 1 ? byArea[a].length + "×" : "an",
          mi: byArea[a][0],
        })).concat(areas.length > 4
          ? [{ icon: "mdi:dots-horizontal", k: "weitere Räume", v: "+" + (areas.length - 4), mute: true }]
          : []))
      : this.rows(Object.keys(byAll).sort((a, b) => a.localeCompare(b, "de")).slice(0, 5).map((a) => ({
          icon: "mdi:lightbulb-outline", mute: true, k: a,
          v: byAll[a].length + (byAll[a].length === 1 ? " Lampe" : " Lampen"),
          mi: byAll[a][0],
        })));

    return {
      tone: "amber",
      fill: lights.length ? (on.length / lights.length) * 100 : 0,
      quiet: on.length === 0,
      sig: [lights.length, on],
      head: this.head("mdi:lightbulb-group", cfg.title, on.length ? "Aktiv" : "Alles aus"),
      body,
      foot: this.value(on.length ? String(on.length) : String(lights.length),
                       on.length ? "von " + lights.length + " an" : "Lichter aus"),
    };
  }
  wire() { this._wireHead(); }
}

register("prism-light-card", PrismLightCard, {
  name: "Prism Light Card",
  description: "Quadrat. Übersicht aller Lichter: Räume mit Licht als Zeilen, Punkteraster je Lampe, Füllstand = Anteil an.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "exclude_label", selector: { label: {} } },
  { name: "include_switches", selector: { boolean: {} } },
  { name: "entities", selector: { entity: { multiple: true, filter: [{ domain: "light" }, { domain: "switch" }] } } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  title: "Titel",
  exclude_label: "Label ausschließen (Standard: no-dashboard)",
  include_switches: "Schalter (switch) mit einbeziehen",
  entities: "Nur diese Entitäten (leer = alle Lichter automatisch)",
  tap_action: "Aktion beim Klick auf den Kopf (z. B. Navigation)",
});

/* ══════════════════════════════════════════════════════════════
   2 — Security Card  ·  Quadrat
   ══════════════════════════════════════════════════════════════ */

class PrismSecurityCard extends PrismCard {
  static defaults = { title: "Sicherheit", window_label: "fenster" };
  static stub = { title: "Sicherheit", window_label: "fenster" };

  _openWindows() {
    const hass = this._hass, cfg = this._config;
    const wantLabel = cfg.window_label || "fenster";
    const groups = new Map();
    for (const id in hass.states) {
      if (id.split(".")[0] !== "binary_sensor") continue;
      if (!hasLabel(hass, id, wantLabel)) continue;
      if (isHidden(hass, id)) continue;
      if (hass.states[id].state !== "on") continue;
      const name = areaNameFor(hass, id) || friendly(hass, id);
      const g = groups.get(name);
      if (g) g.ids.push(id); else groups.set(name, { name, ids: [id] });
    }
    return [...groups.values()].map((g) => ({ id: g.ids[0], name: g.name, count: g.ids.length }));
  }

  view(hass, cfg) {
    const openWindows = this._openWindows();
    const openCount = openWindows.reduce((n, w) => n + w.count, 0);
    const alert = openCount > 0;

    const fd = toList(cfg.front_door)[0];
    const ga = toList(cfg.garage)[0];
    const fdOpen = fd ? isOpenLike(hass, fd) : null;
    const gaOpen = ga ? isOpenLike(hass, ga) : null;

    const alarmState = cfg.alarm && hass.states[cfg.alarm] ? hass.states[cfg.alarm].state : null;
    const alarmArmed = alarmState && alarmState.startsWith("armed");
    const alarmTxt = !alarmState ? null
      : alarmState === "disarmed" ? "bereit"
      : alarmState === "triggered" ? "AUSGELÖST"
      : alarmArmed ? "scharf" : alarmState;

    /* Inhaltszone: Türen und Alarm als feste Zeilen, danach offene Räume */
    const rows = [];
    if (fd) rows.push({ icon: fdOpen ? "mdi:door-open" : "mdi:door-closed-lock", k: "Haustür", v: fdOpen ? "offen" : "zu", hot: !!fdOpen, mi: fd });
    if (ga) rows.push({ icon: gaOpen ? "mdi:garage-open-variant" : "mdi:garage-variant", k: "Garage", v: gaOpen ? "offen" : "zu", hot: !!gaOpen, mi: ga });
    if (alarmTxt) rows.push({ icon: alarmArmed ? "mdi:shield-lock" : "mdi:shield-check", k: "Alarm", v: alarmTxt, hot: alarmArmed || alarmState === "triggered", mi: cfg.alarm });
    /* Alle offenen Fenster stehen in derselben Liste wie Türen und Alarm.
       Passt nicht alles, zählt die letzte Zeile den Rest — nichts wandert nach unten. */
    const MAX_ROWS = 6;
    const free = Math.max(0, MAX_ROWS - rows.length);
    const shown = openWindows.length > free ? free - 1 : free;
    openWindows.slice(0, Math.max(0, shown)).forEach((w) => rows.push({
      icon: "mdi:window-open-variant", hot: true, k: w.name,
      v: w.count > 1 ? w.count + "×" : "offen", mi: w.id,
    }));
    const rest = openWindows.slice(Math.max(0, shown));
    if (rest.length) rows.push({
      icon: "mdi:dots-horizontal", k: "weitere Räume",
      v: "+" + rest.reduce((n, w) => n + w.count, 0), mute: true,
    });

    return {
      tone: alert ? "rose" : "teal",
      fill: alert ? 100 : 0,
      quiet: !alert && !alarmArmed,
      sig: [openWindows, fdOpen, gaOpen, alarmState],
      head: this.head(alert ? "mdi:shield-alert" : "mdi:shield-check", cfg.title, alert ? "Offen" : "Gesichert"),
      body: this.rows(rows) || `<div class="empty">Keine Kontakte mit Label „${esc(cfg.window_label)}“.</div>`,
      foot: alert
        ? this.value(String(openCount), openCount === 1 ? "Fenster offen" : "Fenster offen")
        : this.value("Alles zu", "", "txt"),
    };
  }
  wire() { this._wireHead(); }
}

register("prism-security-card", PrismSecurityCard, {
  name: "Prism Security Card",
  description: "Quadrat. Offene Fenster per Label, Haustür, Garage und Alarm als Zeilen; Zähler offener Kontakte im Sockel.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "window_label", selector: { label: {} } },
  { name: "front_door", selector: { entity: { filter: [{ domain: "lock" }, { domain: "binary_sensor" }, { domain: "cover" }, { domain: "group" }] } } },
  { name: "garage", selector: { entity: { filter: [{ domain: "cover" }, { domain: "binary_sensor" }, { domain: "group" }] } } },
  { name: "alarm", selector: { entity: { filter: [{ domain: "alarm_control_panel" }] } } },
  { name: "color_alert", selector: { text: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  title: "Titel",
  window_label: "Fenster-Label (Standard: fenster)",
  front_door: "Haustür (Entität oder Gruppe)",
  garage: "Garage (Entität oder Gruppe)",
  alarm: "Alarmanlage (optional)",
  color_alert: "Farbe: Alarm / offen (leer = Theme)",
  tap_action: "Aktion beim Klick auf den Kopf (z. B. Navigation)",
});

/* ══════════════════════════════════════════════════════════════
   3 — Room Card  ·  Quadrat
   ══════════════════════════════════════════════════════════════ */

const WINDOW_CLASSES = ["window", "door", "opening", "garage_door"];
function looksLikeWindow(entityId, st) {
  const hay = (entityId + " " + (st.attributes.friendly_name || "")).toLowerCase();
  return hay.includes("fenster") || hay.includes("window");
}
function discoverArea(hass, areaId) {
  const out = { lights: [], windows: [] };
  if (!areaId || !hass.entities) return out;
  for (const entityId in hass.entities) {
    if (areaOf(hass, entityId) !== areaId) continue;
    const st = hass.states[entityId];
    if (!st) continue;
    const domain = entityId.split(".")[0];
    const dc = st.attributes.device_class || "";
    if (domain === "light") out.lights.push(entityId);
    else if (domain === "binary_sensor" && (WINDOW_CLASSES.includes(dc) || looksLikeWindow(entityId, st)))
      out.windows.push(entityId);
  }
  return out;
}
function resolveRoom(hass, cfg) {
  const area = cfg.area && hass.areas ? hass.areas[cfg.area] : null;
  let lights = toList(cfg.lights);
  let windows = toList(cfg.windows);
  if (cfg.area && (!lights.length || !windows.length)) {
    const d = discoverArea(hass, cfg.area);
    if (!lights.length) lights = d.lights;
    if (!windows.length) windows = d.windows;
  }
  return {
    lights, windows,
    temperature: cfg.temperature || (area && area.temperature_entity_id) || null,
    presence: cfg.presence || null,
    name: cfg.name || (area && area.name) || "Raum",
    icon: cfg.icon || (area && area.icon) || "mdi:sofa",
  };
}

class PrismRoomCard extends PrismCard {
  static stub = { name: "Raum", icon: "mdi:sofa", lights: [], windows: [] };

  view(hass, cfg) {
    const r = resolveRoom(hass, cfg);
    const isOn = (e) => hass.states[e] && hass.states[e].state === "on";
    const lightsOn = r.lights.filter(isOn);
    const winsOpen = r.windows.filter(isOn);
    const anyLight = lightsOn.length > 0;
    const anyWin = winsOpen.length > 0;
    const present = r.presence ? isOn(r.presence) : false;

    const showLight = cfg.hide_light !== true;
    const showWindow = cfg.hide_window !== true;
    const showPres = cfg.hide_presence !== true;
    const showTemp = cfg.hide_temperature !== true;
    const showText = cfg.hide_text !== true;

    const t = readTemp(hass, r.temperature);
    const tone = anyWin ? "rose" : anyLight ? "amber" : (t.val !== null && t.val >= 22.5) ? "grid" : "teal";

    const rows = [];
    if (showLight) rows.push({
      icon: anyLight ? "mdi:lightbulb-on" : "mdi:lightbulb-outline", hot: anyLight, k: "Licht",
      v: showText ? (anyLight ? lightsOn.length + " an" : "aus") : (anyLight ? String(lightsOn.length) : "–"),
      mi: r.lights[0],
    });
    if (showWindow) rows.push({
      icon: anyWin ? "mdi:window-open-variant" : "mdi:window-closed-variant", hot: anyWin, k: "Fenster",
      v: showText ? (anyWin ? winsOpen.length + " offen" : "geschlossen") : (anyWin ? String(winsOpen.length) : "–"),
      mi: r.windows[0],
    });
    if (showPres) rows.push({
      icon: present ? "mdi:account" : "mdi:account-outline", hot: present, k: "Präsenz",
      v: showText ? (present ? "anwesend" : "leer") : "", mi: r.presence,
    });
    /* Temperatur steht groß im Sockel — als Zeile nur, wenn der Sockel sie nicht zeigt */
    if (showTemp && r.temperature && t.val === null) rows.push({
      icon: "mdi:thermometer", k: "Temperatur", v: "–", mute: true, mi: r.temperature,
    });

    /* Sockel: Temperatur groß, sonst Lichtzustand */
    const foot = showTemp && t.val !== null
      ? this.value(fmt1(t.val), t.unit)
      : this.value(anyLight ? String(lightsOn.length) : "Alles aus", anyLight ? "Licht an" : "", anyLight ? "" : "txt");

    return {
      tone,
      fill: r.lights.length ? (lightsOn.length / r.lights.length) * 100 : (anyLight ? 100 : 0),
      quiet: !anyLight && !anyWin && !present,
      sig: [lightsOn, winsOpen, t.val, present, r],
      head: this.head(r.icon, r.name, anyWin ? "Offen" : anyLight ? "Licht an" : "Ruhe"),
      body: this.rows(rows),
      foot,
    };
  }
  wire() {
    const cfg = this._config;
    const head = this.shadowRoot.getElementById("head");
    if (head) head.addEventListener("click", () => {
      const action = cfg.tap_action && cfg.tap_action.action;
      const r = resolveRoom(this._hass, cfg);
      if (!action || action === "toggle-lights") {
        if (r.lights.length) this._hass.callService("homeassistant", "toggle", { entity_id: r.lights });
        return;
      }
      if (action === "none") return;
      this._fire("hass-action", {
        config: {
          entity: cfg.entity || r.lights[0] || r.temperature || r.windows[0] || r.presence,
          tap_action: cfg.tap_action,
        },
        action: "tap",
      });
    });
    this.shadowRoot.querySelectorAll("[data-mi]").forEach((n) => {
      n.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(n.getAttribute("data-mi")); });
    });
  }
}

register("prism-room-card", PrismRoomCard, {
  name: "Prism Room Card",
  description: "Quadrat. Raumkachel: Licht, Fenster, Präsenz und Temperatur als Zeilen; Bereich liefert Name, Icon und Entitäten.",
}, [
  { name: "area", selector: { area: {} } },
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "lights", selector: { entity: { multiple: true, filter: [{ domain: "light" }, { domain: "switch" }, { domain: "group" }] } } },
  { name: "windows", selector: { entity: { multiple: true, filter: [{ domain: "binary_sensor" }, { domain: "group" }] } } },
  { name: "temperature", selector: { entity: { filter: [{ domain: "sensor" }, { domain: "climate" }] } } },
  { name: "presence", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "tap_action", selector: { ui_action: {} } },
  { name: "color_light", selector: { color_rgb: {} } },
  { name: "color_alert", selector: { color_rgb: {} } },
  { name: "color_cool", selector: { color_rgb: {} } },
  { name: "hide_light", selector: { boolean: {} } },
  { name: "hide_window", selector: { boolean: {} } },
  { name: "hide_presence", selector: { boolean: {} } },
  { name: "hide_temperature", selector: { boolean: {} } },
  { name: "hide_text", selector: { boolean: {} } },
], {
  area: "Bereich (liefert Name, Icon, Lichter, Fenster & Temperatursensor)",
  name: "Raumname (Override — leer = Bereichsname)",
  icon: "Icon (Override — leer = Bereichs-Icon)",
  lights: "Lichter (Override — leer = Lichter des Bereichs)",
  windows: "Fensterkontakte (Override — leer = Fenster des Bereichs)",
  temperature: "Temperatursensor (Override — leer = Sensor des Bereichs)",
  presence: "Präsenzsensor (optional)",
  tap_action: "Aktion beim Antippen (Standard: Lichter umschalten)",
  color_light: "Farbe: Licht an",
  color_alert: "Farbe: Fenster offen",
  color_cool: "Farbe: Ruhezustand",
  hide_light: "Licht ausblenden",
  hide_window: "Fenster ausblenden",
  hide_presence: "Präsenz ausblenden",
  hide_temperature: "Temperatur ausblenden",
  hide_text: "Statustexte ausblenden (nur Werte)",
});

/* ══════════════════════════════════════════════════════════════
   4 — Temperature Card  ·  Quadrat
   ══════════════════════════════════════════════════════════════ */

const TEMP_CSS = `
/* Die Karte stapelt Kopf, Graph und Sockel. Ohne feste Anteile schrumpft
   der Graph zwischen den beiden anderen zusammen. */
.card > .zb{justify-content:stretch}
.zb .graph{flex:1 1 auto; min-height:clamp(28px, calc(var(--u) * 0.7), 90px)}
.zb .glabel{flex:none}
/* Sockel: große Zahl nach der Skala, Zeilen dürfen nicht mitwachsen */
.zf .val{font-size:var(--t-hero)}
.zf .rows{flex:none}
.zf .rw{font-size:var(--t-value); padding:clamp(2px, calc(var(--u) * 0.05), 5px) 0}
`;

class PrismTemperatureCard extends PrismCard {
  static css = TEMP_CSS;
  static defaults = { title: "Temperatur", exclude_label: "no_DBoard", hours: 24 };
  static stub = { title: "Temperatur", exclude_label: "no_DBoard", hours: 24 };

  setConfig(config) {
    super.setConfig(config);
    this._points = null; this._histTs = 0; this._histFor = null;
  }
  onHass() { this._maybeFetchHistory(); }

  async _maybeFetchHistory() {
    const hass = this._hass, cfg = this._config;
    const ent = cfg.inside;
    if (!ent || !hass.states[ent]) return;
    const now = Date.now();
    if (this._histFor === ent && now - this._histTs < 5 * 60 * 1000) return;
    this._histFor = ent; this._histTs = now;
    try {
      const res = await fetchHistory(hass, [ent], parseInt(cfg.hours) || 24);
      this._points = res[ent] || [];
      this._sig = null;
      this._render();
    } catch (e) { this._points = []; }
  }

  _tempSensors() {
    const hass = this._hass, cfg = this._config;
    const excl = labelIdsFor(hass, cfg.exclude_label);
    const out = [];
    for (const id in hass.states) {
      if (id.split(".")[0] !== "sensor") continue;
      if (hass.states[id].attributes.device_class !== "temperature") continue;
      if (entityLabels(hass, id).some((l) => excl.has(l))) continue;
      if (isHidden(hass, id)) continue;
      const v = parseFloat(hass.states[id].state);
      if (isNaN(v)) continue;
      out.push({ id, v, room: areaNameFor(hass, id) || friendly(hass, id) });
    }
    return out;
  }

  view(hass, cfg) {
    const insideState = cfg.inside ? hass.states[cfg.inside] : null;
    const inside = insideState ? parseFloat(insideState.state) : null;
    const unit = (insideState && insideState.attributes.unit_of_measurement) || "°C";

    const sensors = this._tempSensors();
    let minS = null, maxS = null;
    sensors.forEach((s) => {
      if (!minS || s.v < minS.v) minS = s;
      if (!maxS || s.v > maxS.v) maxS = s;
    });

    const paths = pathsFrom([{ pts: this._points, cls: "ln", area: true }], 300, 60, 3);
    const hours = parseInt(cfg.hours) || 24;
    const legend = paths ? [`vor ${hours} h`, `${fmt1(paths[0].min)}–${fmt1(paths[0].max)} ${unit}`, "jetzt"] : null;

    const tone = inside === null ? "teal" : inside >= 22.5 ? "grid" : inside <= 18 ? "sky" : "teal";
    const fill = inside === null ? 0 : Math.max(0, Math.min(100, ((inside - 15) / 11) * 100));

    return {
      tone, fill,
      quiet: inside === null,
      sig: [inside, unit, minS, maxS, (this._points || []).length],
      head: this.head("mdi:thermometer", cfg.title, `Innen · ${sensors.length} Sensoren`),
      body: this.graph(paths, 300, 60,
        cfg.inside ? "Verlauf wird geladen…" : "Keine Innentemperatur gewählt.", legend),
      foot: this.value(fmt1(inside), unit) +
        this.rows([
          maxS ? { icon: "mdi:thermometer-high", hot: true, k: maxS.room, v: fmt1(maxS.v) + "°", mi: maxS.id } : null,
          minS ? { icon: "mdi:thermometer-low", k: minS.room, v: fmt1(minS.v) + "°", mi: minS.id } : null,
        ]),
    };
  }
  wire() { this._wireHead(this._config.inside); }
}

register("prism-temperature-card", PrismTemperatureCard, {
  name: "Prism Temperature Card",
  description: "Quadrat. Innentemperatur groß, Verlaufsgraph aus der History, wärmster und kältester Raum automatisch.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "inside", selector: { entity: { filter: [{ domain: "sensor", device_class: "temperature" }, { domain: "climate" }] } } },
  { name: "exclude_label", selector: { label: {} } },
  { name: "hours", selector: { number: { min: 1, max: 168, mode: "box", unit_of_measurement: "h" } } },
  { name: "color_cool", selector: { text: {} } },
  { name: "color_warm", selector: { text: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  title: "Titel",
  inside: "Innentemperatur (eine Entität)",
  exclude_label: "Label ausschließen (Standard: no_DBoard)",
  hours: "Verlauf: Zeitraum in Stunden",
  color_cool: "Farbe: kalt (leer = Theme)",
  color_warm: "Farbe: warm (leer = Theme)",
  tap_action: "Aktion beim Klick auf den Kopf (z. B. Navigation)",
});

/* ══════════════════════════════════════════════════════════════
   5 — Weather Card  ·  Standard-Quadrat
   ══════════════════════════════════════════════════════════════
   Animierter Hintergrund je Wetterlage, Vier-Tage-Vorhersage in der
   Mitte, Außentemperatur groß im Sockel. Nachts eigener Verlauf mit
   Sternen und dem Mond in seiner echten Phase.

   Konfiguration: Wetter-Entität, Mondphase, Außentemperatur.
   Die Vorhersage kommt über weather/subscribe_forecast, weil das
   Attribut forecast in Home Assistant nicht mehr gefüllt wird.
   ══════════════════════════════════════════════════════════════ */

const WICON = {
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.4M12 19.6V22M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2 12h2.4M19.6 12H22M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7"/>',
  moon: '<path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.3 8.3 0 1 0 20 14.5z"/>',
  partly: '<circle cx="8.5" cy="8" r="3.2"/><path d="M8.5 1.6v1.6M3.4 8H1.8M4.9 4.4 3.8 3.3"/><path d="M17 20H8a4 4 0 0 1 0-8 5.2 5.2 0 0 1 9.8 1.4A3.3 3.3 0 0 1 17 20z"/>',
  partlynight: '<path d="M15.4 8.6A5 5 0 0 1 10 3.3a5 5 0 1 0 5.4 5.3z"/><path d="M17 20H8a4 4 0 0 1 0-8 5.2 5.2 0 0 1 9.8 1.4A3.3 3.3 0 0 1 17 20z"/>',
  cloud: '<path d="M17.5 19h-10a4.5 4.5 0 0 1 0-9 6 6 0 0 1 11.3 1.6A3.7 3.7 0 0 1 17.5 19z"/>',
  rain: '<path d="M17 16H7.5a4.2 4.2 0 0 1 0-8.4A5.6 5.6 0 0 1 18 9.1 3.5 3.5 0 0 1 17 16z"/><path d="M8.5 19l-1 2.4M12.5 19l-1 2.4M16.5 19l-1 2.4"/>',
  pour: '<path d="M17 15H7.5a4.2 4.2 0 0 1 0-8.4A5.6 5.6 0 0 1 18 8.1 3.5 3.5 0 0 1 17 15z"/><path d="M8 18l-1.4 4M12 18l-1.4 4M16 18l-1.4 4"/>',
  bolt: '<path d="M17 14H7.5a4.2 4.2 0 0 1 0-8.4A5.6 5.6 0 0 1 18 7.1 3.5 3.5 0 0 1 17 14z"/><path d="M13 16l-3 4h3l-1.5 4"/>',
  snow: '<path d="M17 15H7.5a4.2 4.2 0 0 1 0-8.4A5.6 5.6 0 0 1 18 8.1 3.5 3.5 0 0 1 17 15z"/><path d="M9 19h.01M12.5 21h.01M16 19h.01"/>',
  hail: '<path d="M17 15H7.5a4.2 4.2 0 0 1 0-8.4A5.6 5.6 0 0 1 18 8.1 3.5 3.5 0 0 1 17 15z"/><circle cx="9.5" cy="19.5" r=".9"/><circle cx="14.5" cy="19.5" r=".9"/><circle cx="12" cy="22" r=".9"/>',
  fog: '<path d="M17.5 12h-10a4.5 4.5 0 0 1 .4-9A6 6 0 0 1 19 5.6 3.5 3.5 0 0 1 17.5 12z"/><path d="M4 16h16M6 20h12"/>',
  wind: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h8a2.6 2.6 0 1 1-2.6 2.6"/>',
  alert: '<path d="M12 3.5 22 20H2z"/><path d="M12 10v4M12 17h.01"/>',
};

/* Wetterlagen von Home Assistant, jeweils Tag- und Nachtfassung.
   fx nennt die Ebenen, die für diese Lage eingeblendet werden. */
const WX_LOOK = {
  "sunny":           { l: "Sonnig",           i: "sun",    d: ["#FFD873", "#FF8A3D", "#241205"], n: ["#2B3272", "#0B1030", "#EEF1FF"], fx: ["sun", "rays"],            nfx: ["stars", "stars2"] },
  "clear-night":     { l: "Klar",             i: "moon",   d: ["#2B3272", "#0B1030", "#EEF1FF"], n: ["#2B3272", "#0B1030", "#EEF1FF"], fx: ["stars", "stars2"],        nfx: ["stars", "stars2"] },
  "partlycloudy":    { l: "Teils bewölkt",    i: "partly", d: ["#8FD3F4", "#3B82F6", "#08182E"], n: ["#33407A", "#0E1533", "#EEF1FF"], fx: ["sun", "clouds", "clouds2"], nfx: ["stars", "clouds", "clouds2"] },
  "cloudy":          { l: "Bewölkt",          i: "cloud",  d: ["#B8C2D4", "#5C6B85", "#121A2B"], n: ["#3A4460", "#141A2C", "#EEF1FF"], fx: ["clouds", "clouds2"],      nfx: ["clouds", "clouds2"] },
  "rainy":           { l: "Regen",            i: "rain",   d: ["#7FB3D5", "#33506E", "#F1F6FF"], n: ["#334C68", "#101B2B", "#EEF1FF"], fx: ["clouds2", "drops"],       nfx: ["clouds2", "drops"] },
  "pouring":         { l: "Starkregen",       i: "pour",   d: ["#4D7BA6", "#1B2C42", "#EFF6FF"], n: ["#263B55", "#0A1220", "#EEF1FF"], fx: ["clouds2", "drops"],       nfx: ["clouds2", "drops"] },
  "lightning":       { l: "Gewitter",         i: "bolt",   d: ["#6B6FA6", "#22254A", "#F2F4FF"], n: ["#3A3E70", "#0E1128", "#EEF1FF"], fx: ["clouds", "clouds2", "flash"], nfx: ["clouds", "clouds2", "flash"] },
  "lightning-rainy": { l: "Gewitter",         i: "bolt",   d: ["#4A4E7C", "#161A33", "#F2F4FF"], n: ["#2F3358", "#0C0F21", "#EEF1FF"], fx: ["clouds2", "drops", "flash"], nfx: ["clouds2", "drops", "flash"] },
  "snowy":           { l: "Schnee",           i: "snow",   d: ["#DCE9F7", "#7C93B8", "#12203A"], n: ["#7D8FB0", "#232E45", "#EEF1FF"], fx: ["clouds2", "snow", "snow2"], nfx: ["clouds2", "snow", "snow2"] },
  "snowy-rainy":     { l: "Schneeregen",      i: "snow",   d: ["#B9CDE2", "#5A7292", "#0E1B2E"], n: ["#6B7E9C", "#1C2739", "#EEF1FF"], fx: ["snow", "drops"],          nfx: ["snow", "drops"] },
  "hail":            { l: "Hagel",            i: "hail",   d: ["#9FB6CC", "#3D5470", "#F0F5FF"], n: ["#5D7391", "#182335", "#EEF1FF"], fx: ["hail", "drops"],          nfx: ["hail", "drops"] },
  "fog":             { l: "Nebel",            i: "fog",    d: ["#C3CBD6", "#6F7A8C", "#161C26"], n: ["#5A6377", "#1B202B", "#EEF1FF"], fx: ["fog1", "fog2"],           nfx: ["fog1", "fog2"] },
  "windy":           { l: "Windig",           i: "wind",   d: ["#A8E0D2", "#3E8E8B", "#06231F"], n: ["#3E6E70", "#12262A", "#EEF1FF"], fx: ["wind", "wind2", "wind3", "clouds2"], nfx: ["wind", "wind2", "wind3", "clouds2"] },
  "windy-variant":   { l: "Windig, bewölkt",  i: "wind",   d: ["#9EC6D8", "#4A6C82", "#06202B"], n: ["#3C5468", "#111C26", "#EEF1FF"], fx: ["wind", "wind2", "wind3", "clouds", "clouds2"], nfx: ["wind", "wind2", "wind3", "clouds", "clouds2"] },
  "exceptional":     { l: "Unwetter",         i: "alert",  d: ["#FFB199", "#B02E2E", "#2A0808"], n: ["#8C3B3B", "#2A0A0A", "#EEF1FF"], fx: ["wind", "wind2", "flash"], nfx: ["wind", "wind2", "flash"] },
};
/* Nachts bekommen Sonnenlagen ein eigenes Icon und Wort */
const WX_NIGHT_ICON = { sun: "moon", partly: "partlynight" };
const WX_NIGHT_LABEL = { sunny: "Klar", partlycloudy: "Teils klar" };

/* Tropfen je Lage: Anzahl, Dauer, Länge, Deckkraft */
const WX_RAIN = {
  rainy:             { n: 30, dur: [1.9, 2.8], len: [10, 20], op: [.45, .80] },
  pouring:           { n: 55, dur: [1.2, 1.8], len: [16, 30], op: [.55, .95] },
  lightning:         { n: 0,  dur: [1, 1],     len: [1, 1],   op: [0, 0] },
  "lightning-rainy": { n: 38, dur: [1.5, 2.2], len: [12, 24], op: [.50, .85] },
  "snowy-rainy":     { n: 14, dur: [3.2, 4.6], len: [8, 14],  op: [.30, .55] },
  hail:              { n: 16, dur: [1.3, 1.9], len: [6, 10],  op: [.40, .70] },
};

const MOON_LABEL = {
  new_moon: "Neumond", waxing_crescent: "zunehmende Sichel", first_quarter: "erstes Viertel",
  waxing_gibbous: "zunehmend", full_moon: "Vollmond", waning_gibbous: "abnehmend",
  last_quarter: "letztes Viertel", waning_crescent: "abnehmende Sichel",
};

/* Beleuchteter Teil als Pfad: Halbkreis plus Terminator-Ellipse.
   Die Wölbung trennt Sichel von dreiviertelvollem Mond, abnehmende
   Phasen sind die gespiegelte Form. */
function moonSVG(phase) {
  const R = 10, C = 12;
  const shape = {
    waxing_crescent: [5.5, 1], first_quarter: [0, 1], waxing_gibbous: [5.5, 0],
    waning_crescent: [5.5, 1], last_quarter: [0, 1], waning_gibbous: [5.5, 0],
  }[phase];
  const mirror = String(phase).startsWith("waning") || phase === "last_quarter";
  let inner;
  if (phase === "new_moon") {
    inner = `<circle class="w-dark" cx="${C}" cy="${C}" r="${R}"/>`;
  } else if (phase === "full_moon" || !shape) {
    inner = `<circle class="w-disc" cx="${C}" cy="${C}" r="${R}"/>`;
  } else {
    const [rx, sweep] = shape;
    const d = rx === 0
      ? `M${C} ${C - R} A${R} ${R} 0 0 1 ${C} ${C + R} Z`
      : `M${C} ${C - R} A${R} ${R} 0 0 1 ${C} ${C + R} A${rx} ${R} 0 0 ${sweep} ${C} ${C - R} Z`;
    inner = `<path class="w-disc" d="${d}"/><circle class="w-dark" cx="${C}" cy="${C}" r="${R}"/>`;
  }
  return `<svg viewBox="0 0 24 24"${mirror ? ' style="transform:scaleX(-1)"' : ""}>${inner}</svg>`;
}

const WEATHER_CSS = `
/* ---------- Schichtung ----------
   Die Basiskarte legt ihren Verlauf auf z-index -3. Läge die Animation
   wie im Mockup darunter, wäre sie unsichtbar. Diese Karte bringt den
   Verlauf deshalb direkt auf .card und staffelt darüber:
     0  Wettereffekte
     1  Glanz
     2  Inhalt
   Damit bleibt alles innerhalb der abgerundeten Karte geklippt. */
.card{
  background:linear-gradient(165deg,var(--c1),var(--c2));
  /* Safari klippt overflow:hidden mit Radius nicht zuverlässig, sobald ein
     Kind einen Filter oder eine Transformation hat — auf dem iPad wurde die
     Karte dadurch eckig und die Animation lief über den Rand. Die Maske
     erzwingt die Rundung. */
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
}
.card > .wash,.card > .rise{display:none}
.card > .gloss{z-index:1}
.card > .zh,.card > .zb,.card > .zf{position:relative;z-index:2}

/* ---------- Ebenen ---------- */
.w-fx{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;border-radius:inherit}
.w-sun{background:radial-gradient(circle at 78% 16%,rgba(255,255,255,.95) 0%,rgba(255,240,190,.55) 14%,transparent 42%);
  animation:w-breathe 7s ease-in-out infinite}
.w-rays{opacity:.5;transform-origin:78% 16%;animation:w-spin 60s linear infinite;
  background:conic-gradient(from 0deg at 78% 16%,rgba(255,255,255,.30) 0deg,transparent 14deg,
    rgba(255,255,255,.30) 28deg,transparent 42deg,rgba(255,255,255,.30) 56deg,transparent 70deg,
    rgba(255,255,255,.30) 84deg,transparent 98deg,rgba(255,255,255,.30) 112deg,transparent 126deg,
    rgba(255,255,255,.30) 140deg,transparent 154deg,rgba(255,255,255,.30) 168deg,transparent 182deg,
    rgba(255,255,255,.30) 196deg,transparent 210deg,rgba(255,255,255,.30) 224deg,transparent 238deg,
    rgba(255,255,255,.30) 252deg,transparent 266deg,rgba(255,255,255,.30) 280deg,transparent 294deg,
    rgba(255,255,255,.30) 308deg,transparent 322deg,rgba(255,255,255,.30) 336deg,transparent 350deg)}
@keyframes w-spin{to{transform:rotate(360deg)}}
@keyframes w-breathe{0%,100%{opacity:.85}50%{opacity:1}}

.w-moon .glow{position:absolute;left:64%;top:8%;width:26%;aspect-ratio:1;border-radius:50%;
  background:radial-gradient(circle,rgba(226,232,255,.55),transparent 65%);filter:blur(6px);
  animation:w-breathe 9s ease-in-out infinite}
.w-moon svg{position:absolute;left:68%;top:12%;width:18%;height:auto;overflow:visible}
.w-moon .w-disc{fill:#F4F7FF}
.w-moon .w-dark{fill:none;stroke:rgba(244,247,255,.35);stroke-width:.8}

.w-stars{opacity:.85;animation:w-twinkle 4.5s ease-in-out infinite;background-image:
  radial-gradient(1.6px 1.6px at 18% 24%,#fff,transparent),
  radial-gradient(1.3px 1.3px at 42% 12%,#fff,transparent),
  radial-gradient(1.8px 1.8px at 63% 33%,#fff,transparent),
  radial-gradient(1.2px 1.2px at 86% 48%,#fff,transparent),
  radial-gradient(1.5px 1.5px at 28% 58%,#fff,transparent),
  radial-gradient(1.1px 1.1px at 54% 72%,#fff,transparent),
  radial-gradient(1.7px 1.7px at 12% 78%,#fff,transparent),
  radial-gradient(1.2px 1.2px at 72% 62%,#fff,transparent)}
.w-stars2{opacity:.6;animation:w-twinkle 6.5s ease-in-out .8s infinite;background-image:
  radial-gradient(1.4px 1.4px at 33% 40%,#fff,transparent),
  radial-gradient(1.1px 1.1px at 77% 18%,#fff,transparent),
  radial-gradient(1.6px 1.6px at 48% 85%,#fff,transparent),
  radial-gradient(1.2px 1.2px at 92% 72%,#fff,transparent)}
@keyframes w-twinkle{0%,100%{opacity:.30}50%{opacity:.95}}

.w-clouds,.w-clouds2{background-repeat:no-repeat;filter:blur(1px)}
.w-clouds{animation:w-drift 34s linear infinite;background-image:
  radial-gradient(46% 30% at 22% 34%,rgba(255,255,255,.85),transparent 70%),
  radial-gradient(34% 24% at 48% 26%,rgba(255,255,255,.75),transparent 70%),
  radial-gradient(40% 26% at 74% 38%,rgba(255,255,255,.65),transparent 70%)}
.w-clouds2{animation:w-driftback 52s linear infinite;background-image:
  radial-gradient(52% 30% at 60% 62%,rgba(255,255,255,.5),transparent 70%),
  radial-gradient(38% 22% at 18% 70%,rgba(255,255,255,.42),transparent 70%)}
@keyframes w-drift{from{transform:translateX(-14%)}to{transform:translateX(14%)}}
@keyframes w-driftback{from{transform:translateX(12%)}to{transform:translateX(-12%)}}
.card.w-night .w-clouds,.card.w-night .w-clouds2{opacity:.45;filter:blur(2px)}

/* Regen: jeder Tropfen ein eigenes Element */
.w-drop{position:absolute;top:-24px;width:1.6px;height:var(--h,14px);border-radius:2px;
  background:linear-gradient(to bottom,rgba(255,255,255,0),rgba(255,255,255,.9));
  opacity:var(--o,.7);animation:w-drop var(--d,2s) linear var(--dl,0s) infinite;will-change:transform}
@keyframes w-drop{from{transform:translate3d(0,0,0)}to{transform:translate3d(-22px,var(--fall,320px),0)}}
.card.w-night .w-drop{opacity:calc(var(--o,.7) * .8)}

.w-snow,.w-snow2{animation:w-snowfall 7s linear infinite;background-image:
  radial-gradient(2.6px 2.6px at 15% 10%,#fff,transparent),
  radial-gradient(2px 2px at 42% 30%,#fff,transparent),
  radial-gradient(3px 3px at 68% 8%,#fff,transparent),
  radial-gradient(2.2px 2.2px at 88% 26%,#fff,transparent),
  radial-gradient(2.4px 2.4px at 28% 62%,#fff,transparent),
  radial-gradient(2px 2px at 58% 78%,#fff,transparent);background-size:100% 130px}
.w-snow2{opacity:.6;background-size:100% 190px;animation:w-snowfall2 11s linear infinite}
@keyframes w-snowfall{from{background-position:0 0}to{background-position:0 130px}}
@keyframes w-snowfall2{from{background-position:0 0}to{background-position:0 190px}}
.w-hail{animation:w-hailfall 1.1s linear infinite;background-size:100% 90px;background-image:
  radial-gradient(2.4px 3.4px at 20% 10%,#fff,transparent),
  radial-gradient(2px 3px at 52% 26%,#fff,transparent),
  radial-gradient(2.6px 3.6px at 78% 14%,#fff,transparent),
  radial-gradient(2.2px 3.2px at 36% 66%,#fff,transparent)}
@keyframes w-hailfall{from{background-position:0 0}to{background-position:0 90px}}

.w-fog1,.w-fog2{filter:blur(7px)}
.w-fog1{animation:w-drift 26s ease-in-out infinite alternate;
  background:linear-gradient(0deg,transparent 12%,rgba(255,255,255,.5) 32%,transparent 48%,rgba(255,255,255,.38) 66%,transparent 84%)}
.w-fog2{animation:w-driftback 38s ease-in-out infinite alternate;
  background:linear-gradient(0deg,transparent 22%,rgba(255,255,255,.34) 44%,transparent 62%)}

.w-wind,.w-wind2,.w-wind3{filter:blur(6px);inset:-10%}
.w-wind{animation:w-gust 7s ease-in-out infinite;background-image:
  radial-gradient(38% 3.5% at 30% 30%,rgba(255,255,255,.75),transparent 70%),
  radial-gradient(26% 2.5% at 68% 44%,rgba(255,255,255,.55),transparent 70%)}
.w-wind2{filter:blur(9px);animation:w-gust 11s ease-in-out 1.6s infinite;background-image:
  radial-gradient(46% 4.5% at 45% 62%,rgba(255,255,255,.6),transparent 70%),
  radial-gradient(30% 3% at 20% 74%,rgba(255,255,255,.42),transparent 70%)}
.w-wind3{filter:blur(14px);animation:w-gust 16s ease-in-out .8s infinite;
  background-image:radial-gradient(60% 8% at 50% 20%,rgba(255,255,255,.35),transparent 72%)}
@keyframes w-gust{0%{transform:translateX(-55%) scaleX(.85);opacity:0}
  15%{opacity:.85}55%{transform:translateX(5%) scaleX(1.12);opacity:.7}
  85%{opacity:.5}100%{transform:translateX(60%) scaleX(.9);opacity:0}}

.w-flash{z-index:0;opacity:0;animation:w-strike 7s linear infinite;
  background:linear-gradient(180deg,rgba(255,255,255,.95),rgba(255,255,255,.2))}
@keyframes w-strike{0%,88%{opacity:0}89%{opacity:.75}90%{opacity:.05}91%{opacity:.6}93%{opacity:0}100%{opacity:0}}

/* ---------- Inhalt ---------- */
.w-badge svg{width:58%;height:58%;stroke:currentColor;stroke-width:1.8;fill:none;stroke-linecap:round;stroke-linejoin:round}
.w-fc{display:grid;grid-template-columns:repeat(4,1fr);align-items:center;gap:clamp(3px,calc(var(--u) * 0.12),10px);height:100%}
.w-fd{display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:clamp(3px,calc(var(--u) * 0.108),8px);min-width:0;height:100%}
.w-dy{font-family:var(--p-mono);font-size:clamp(9.5px,calc(var(--u) * 0.24),14px);font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;opacity:.8}
.w-ic{width:clamp(22px,calc(var(--u) * 0.78),46px);height:clamp(22px,calc(var(--u) * 0.78),46px);opacity:.95}
.w-ic svg{width:100%;height:100%;stroke:currentColor;stroke-width:1.6;fill:none;stroke-linecap:round;stroke-linejoin:round}
.w-tp{font-family:var(--p-mono);font-size:clamp(12px,calc(var(--u) * 0.324),19px);font-weight:700;line-height:1.15;text-align:center}
.w-tp span{opacity:.6;font-weight:500;font-size:.85em}
.w-val{font-family:var(--p-mono);font-weight:700;font-variant-numeric:tabular-nums;
  font-size:clamp(30px,calc(var(--u) * 1.26),62px);letter-spacing:-.035em;line-height:.92;display:flex;align-items:baseline;gap:.1em}
.w-val small{font-size:.33em;font-weight:500;opacity:.7}
@media (prefers-reduced-motion: reduce){.w-fx,.w-fx *{animation:none !important}}
`;

const WDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

class PrismWeatherCard extends PrismCard {
  static defaults = {};
  static stub = { weather: "weather.home" };
  static css = WEATHER_CSS;

  setConfig(config) {
    super.setConfig(config);
    this._fcKey = null;
    this._subscribe();
  }
  onHass() { this._subscribe(); }

  /* Vorhersage abonnieren — das Attribut forecast wird nicht mehr gefüllt */
  async _subscribe() {
    const cfg = this._config, hass = this._hass;
    if (!hass || !cfg || !cfg.weather || !hass.connection) return;
    if (this._fcKey === cfg.weather) return;
    this._fcKey = cfg.weather;
    if (this._unsub) { try { (await this._unsub)(); } catch (e) { /* schon weg */ } this._unsub = null; }
    try {
      this._unsub = hass.connection.subscribeMessage(
        (ev) => { this._fc = (ev && ev.forecast) || []; this._sig = null; this._render(); },
        { type: "weather/subscribe_forecast", forecast_type: "daily", entity_id: cfg.weather }
      );
    } catch (e) { this._fc = null; }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) { Promise.resolve(this._unsub).then((u) => { try { u(); } catch (e) {} }); this._unsub = null; }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
  }

  _night(hass, cond) {
    const sun = hass.states["sun.sun"];
    if (sun) return sun.state === "below_horizon";
    return cond === "clear-night";
  }

  _forecast(hass) {
    let list = this._fc;
    if (!list || !list.length) {
      const wx = hass.states[this._config.weather];
      list = (wx && wx.attributes.forecast) || [];
    }
    return list.slice(0, 4).map((f) => {
      const dt = new Date(f.datetime);
      const look = WX_LOOK[f.condition] || WX_LOOK.cloudy;
      return {
        day: isNaN(dt) ? "–" : WDAYS[dt.getDay()],
        icon: look.i === "moon" ? "sun" : look.i,
        hi: f.temperature,
        lo: f.templow !== undefined && f.templow !== null ? f.templow : null,
      };
    });
  }

  view(hass, cfg) {
    const wx = cfg.weather ? hass.states[cfg.weather] : null;
    const cond = wx ? wx.state : "cloudy";
    const look = WX_LOOK[cond] || WX_LOOK.cloudy;
    const night = this._night(hass, cond);
    const [c1, c2, ink] = night ? look.n : look.d;

    /* Temperatur: eigener Sensor, sonst die der Wetter-Entität */
    let temp = null, unit = "°C";
    if (cfg.outside_temp && hass.states[cfg.outside_temp]) {
      temp = parseFloat(hass.states[cfg.outside_temp].state);
      unit = hass.states[cfg.outside_temp].attributes.unit_of_measurement || "°C";
    } else if (wx) {
      temp = wx.attributes.temperature;
      unit = wx.attributes.temperature_unit || "°C";
    }

    const phase = cfg.moon_phase && hass.states[cfg.moon_phase]
      ? hass.states[cfg.moon_phase].state : "full_moon";

    const icon = (night && WX_NIGHT_ICON[look.i]) || look.i;
    const label = (night && WX_NIGHT_LABEL[cond]) || look.l;
    const fc = this._forecast(hass);

    /* Ebenen: nur die, die diese Lage braucht */
    const names = night ? look.nfx : look.fx;
    const rain = WX_RAIN[cond];
    const layer = (n) => {
      if (n === "drops") {
        if (!rain || !rain.n) return "";
        return `<div class="w-fx w-drops" id="drops">${this._drops(rain)}</div>`;
      }
      if (n === "moon") return "";
      return `<div class="w-fx w-${n}"></div>`;
    };
    let layers = names.map(layer).join("");
    if (night) {
      layers += `<div class="w-fx w-moon"><span class="glow"></span>${moonSVG(phase)}</div>`;
    }

    return {
      tone: "sky", from: c1, to: c2, ink,
      fill: 0, quiet: false,
      sig: [cond, night, phase, temp, unit, fc, cfg.weather],
      layers,
      head: `<div class="top" id="head">
               <span class="badge w-badge"><svg viewBox="0 0 24 24">${WICON[icon]}</svg></span>
               <span class="lbl">
                 <p class="name">${esc(cfg.name || "Wetter")}</p>
                 <span class="state">${esc(label)}${night ? " · " + esc(MOON_LABEL[phase] || "") : ""}</span>
               </span>
             </div>`,
      body: fc.length
        ? `<div class="w-fc">${fc.map((f) => `
            <div class="w-fd">
              <span class="w-dy">${esc(f.day)}</span>
              <span class="w-ic"><svg viewBox="0 0 24 24">${WICON[f.icon] || WICON.cloud}</svg></span>
              <span class="w-tp">${fmt0(f.hi)}°${f.lo !== null ? `<br><span>${fmt0(f.lo)}°</span>` : ""}</span>
            </div>`).join("")}</div>`
        : `<div class="empty">Vorhersage wird geladen…</div>`,
      foot: `<div class="w-val">${fmt0(temp)}<small>${esc(unit)}</small></div>`,
    };
  }

  /* Tropfen mit gestreuter Position, Länge, Dauer und Verzögerung */
  _drops(cfg) {
    const rnd = ([a, b]) => a + Math.random() * (b - a);
    let out = "";
    for (let i = 0; i < cfg.n; i++) {
      const d = rnd(cfg.dur);
      out += `<span class="w-drop" style="left:${(Math.random() * 116 - 8).toFixed(1)}%;`
        + `--h:${rnd(cfg.len).toFixed(0)}px;--d:${d.toFixed(2)}s;`
        + `--dl:-${(Math.random() * d).toFixed(2)}s;--o:${rnd(cfg.op).toFixed(2)}"></span>`;
    }
    return out;
  }

  wire() {
    this._wireHead(this._config.weather);
    /* Fallweite aus der echten Kartenhöhe, sonst endet der Regen auf halber Strecke */
    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;
    const measure = () => {
      const h = card.clientHeight;
      if (h) card.style.setProperty("--fall", Math.round(h + 48) + "px");
    };
    measure();
    if (!this._ro && window.ResizeObserver) {
      this._ro = new ResizeObserver(() => {
        const c = this.shadowRoot && this.shadowRoot.querySelector(".card");
        if (c && c.clientHeight) c.style.setProperty("--fall", Math.round(c.clientHeight + 48) + "px");
      });
      this._ro.observe(this);
    }
  }
}

register("prism-weather-card", PrismWeatherCard, {
  name: "Prism Weather Card",
  description: "Quadrat. Animierter Wetterhintergrund, Vier-Tage-Vorhersage, Außentemperatur; nachts Sterne und Mondphase.",
}, [
  { name: "weather", selector: { entity: { filter: [{ domain: "weather" }] } } },
  { name: "moon_phase", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "outside_temp", selector: { entity: { filter: [{ domain: "sensor", device_class: "temperature" }] } } },
], {
  weather: "Wetter-Entität",
  moon_phase: "Mondphase (sensor.moon_phase)",
  outside_temp: "Außentemperatur (leer = Wert der Wetter-Entität)",
});

/* ══════════════════════════════════════════════════════════════
   6 — Media Card  ·  Quadrat
   ══════════════════════════════════════════════════════════════ */

const ACTIVE_STATES = ["playing", "paused", "buffering"];

class PrismMediaCard extends PrismCard {
  static defaults = { title: "Medien", exclude_label: "no_DBoard" };
  static stub = { title: "Medien", exclude_label: "no_DBoard" };

  onHass() { this._ensureTicker(); }
  _ensureTicker() {
    const playing = this._player && this._hass.states[this._player] &&
      this._hass.states[this._player].state === "playing";
    if (playing && !this._tick) {
      this._tick = setInterval(() => { this._sig = null; this._render(); }, 1000);
    } else if (!playing && this._tick) {
      clearInterval(this._tick); this._tick = null;
    }
  }
  _candidates() {
    const hass = this._hass, cfg = this._config;
    if (cfg.entity) return [cfg.entity];
    const manual = toList(cfg.entities);
    const src = manual.length ? manual : Object.keys(hass.states).filter((id) => id.startsWith("media_player."));
    return src.filter((id) => {
      if (!hass.states[id]) return false;
      if (cfg.exclude_label && hasLabel(hass, id, cfg.exclude_label)) return false;
      if (isHidden(hass, id)) return false;
      return true;
    });
  }
  _pick() {
    const hass = this._hass, cfg = this._config;
    if (cfg.entity) return cfg.entity;
    const cand = this._candidates();
    const playing = cand.find((id) => hass.states[id].state === "playing");
    if (playing) return playing;
    return cand.find((id) => ACTIVE_STATES.includes(hass.states[id].state)) || null;
  }
  _pos(st) {
    if (!st) return null;
    const base = st.attributes.media_position;
    if (base === undefined || base === null) return null;
    if (st.state !== "playing") return base;
    const upd = st.attributes.media_position_updated_at;
    if (!upd) return base;
    return base + Math.max(0, (Date.now() - new Date(upd).getTime()) / 1000);
  }
  _svc(service) {
    if (!this._player) return;
    this._hass.callService("media_player", service, { entity_id: this._player });
  }

  view(hass, cfg) {
    this._player = this._pick();
    const st = this._player ? hass.states[this._player] : null;
    const active = st && ACTIVE_STATES.includes(st.state);
    const playing = st && st.state === "playing";

    const a = st ? st.attributes : {};
    const cover = active ? (a.entity_picture || a.media_image_url || null) : null;
    const title = a.media_title || null;
    const artist = a.media_artist || a.media_series_title || a.app_name || null;
    const dur = a.media_duration ?? null;
    const pos = this._pos(st);
    const pct = (dur && pos !== null && dur > 0) ? Math.min(100, (pos / dur) * 100) : null;
    const vol = a.volume_level !== undefined && a.volume_level !== null ? Math.round(a.volume_level * 100) : null;
    const muted = !!a.is_volume_muted;

    const name = cfg.title || (this._player ? (areaNameFor(hass, this._player) || friendly(hass, this._player)) : "Medien");
    const cand = this._candidates();

    const body = active
      ? `<div>
           <div class="val txt" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(title || friendly(hass, this._player))}</div>
           ${artist ? `<div class="sub">${esc(artist)}</div>` : ""}
           ${this._player && areaNameFor(hass, this._player)
              ? `<div class="sub" style="opacity:.6">${esc(areaNameFor(hass, this._player))}</div>` : ""}
         </div>`
      : this.rows(cand.slice(0, 4).map((id) => ({
          icon: "mdi:speaker", k: areaNameFor(hass, id) || friendly(hass, id),
          v: hass.states[id].state === "off" ? "aus" : "bereit", mute: true, mi: id,
        })));

    const foot = active
      ? `${pct !== null ? `<div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div>
           <div class="times"><span>${mmss(pos)}</span><span>${mmss(dur)}</span></div>` : ""}
         <div class="ctrl">
           <ha-icon class="btn" id="prev" icon="mdi:skip-previous"></ha-icon>
           <span class="pp" id="pp"><ha-icon icon="${playing ? "mdi:pause" : "mdi:play"}"></ha-icon></span>
           <ha-icon class="btn" id="next" icon="mdi:skip-next"></ha-icon>
           ${vol !== null ? `<span class="chip grow" id="mute" style="cursor:pointer;justify-content:center">
             <ha-icon icon="${muted ? "mdi:volume-off" : "mdi:volume-high"}"></ha-icon>${muted ? "stumm" : vol + "\u2009%"}</span>` : ""}
         </div>`
      : this.value("Nichts läuft", "", "txt") +
        `<div class="sub">${cand.length} ${cand.length === 1 ? "Player" : "Player"} verfügbar</div>`;

    return {
      tone: "violet",
      fill: pct === null ? 0 : pct,
      quiet: !active && !cover,
      cover,
      sig: [this._player, st && st.state, cover, title, artist,
        pct === null ? null : Math.round(pct), vol, muted, cand.length, active ? Math.floor(pos || 0) : 0],
      head: this.head("mdi:music-note", name, active ? (playing ? "Spielt" : "Pause") : "Bereit"),
      body, foot,
    };
  }
  wire() {
    this._wireHead(this._player);
    this._on("prev", () => this._svc("media_previous_track"));
    this._on("next", () => this._svc("media_next_track"));
    this._on("pp", () => this._svc("media_play_pause"));
    this._on("mute", () => {
      if (!this._player) return;
      const s = this._hass.states[this._player];
      this._hass.callService("media_player", "volume_mute", {
        entity_id: this._player,
        is_volume_muted: !(s && s.attributes.is_volume_muted),
      });
    });
  }
}

register("prism-media-card", PrismMediaCard, {
  name: "Prism Media Card",
  description: "Quadrat. Cover als Hintergrund, Titel und Interpret, Fortschritt und Steuerung; wählt automatisch den aktiven Player.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "entity", selector: { entity: { filter: [{ domain: "media_player" }] } } },
  { name: "entities", selector: { entity: { multiple: true, filter: [{ domain: "media_player" }] } } },
  { name: "exclude_label", selector: { label: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  title: "Titel",
  entity: "Fester Player (leer = automatisch der aktive)",
  entities: "Auswahl für Auto-Modus (leer = alle Player)",
  exclude_label: "Label ausschließen (Standard: no_DBoard)",
  tap_action: "Aktion beim Klick auf den Kopf (z. B. Navigation)",
});

/* ══════════════════════════════════════════════════════════════
   7 — Energy Card  ·  Doppel-Quadrat
   ══════════════════════════════════════════════════════════════
   Spiegelgraph: Erzeugung nach oben, Verbrauch nach unten von einer
   Mittelachse. Darüber beide Leistungen groß, darunter der Akku als
   leuchtende Röhre mit wanderndem Glanz.

   Leistungen dürfen in W oder kW vorliegen — die Karte rechnet um.
   ══════════════════════════════════════════════════════════════ */

/* Leistung immer in kW, egal ob der Sensor W oder kW liefert */
function kwOf(hass, id) {
  const v = num(hass, id);
  if (v === null) return null;
  const u = String(uom(hass, id, "W")).toLowerCase();
  if (u === "w") return v / 1000;
  if (u === "mw") return v * 1000;
  return v;
}
function kwSeries(pts, unit) {
  const u = String(unit || "W").toLowerCase();
  const f = u === "w" ? 1 / 1000 : u === "mw" ? 1000 : 1;
  return pts.map((p) => ({ t: p.t, v: p.v * f }));
}

const ENERGY_CSS = `
/* Eigener Grund und eigene Schichtung — die Basisfläche entfällt */
.card{
  background:radial-gradient(120% 140% at 80% -20%,#123244 0%,#08131F 55%,#04070E 100%);
  border-color:rgba(45,212,191,.24);
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
}
.card > .wash,.card > .rise{display:none}
.card > .gloss{z-index:1;opacity:.5}
.card > .zh,.card > .zb,.card > .zf{position:relative;z-index:2}
/* Eine Spalte über die volle Breite: Kopf, Zahlen, Graph, Akku */
.card.dbl.e-full{
  grid-template-columns:minmax(0,1fr);
  grid-template-areas:"h" "b" "f";
  grid-template-rows:auto minmax(0,1fr) auto;
}
.card.e-full > .zd{display:none}
/* Kopfgrößen kommen aus der Basis — siehe .name, .state, .badge. */

.e-nums{display:grid;grid-template-columns:1fr 1fr;gap:var(--p-pad,20px);margin-top:clamp(6px,calc(var(--u) * 0.24),12px)}
.e-big{
  font-family:var(--p-mono);font-weight:700;font-variant-numeric:tabular-nums;
  letter-spacing:-.04em;line-height:.9;display:flex;align-items:baseline;gap:.1em;
  font-size:clamp(23px,calc(var(--u) * 1.056),48px);
}
.e-big small{font-size:.36em;font-weight:500;opacity:.75}
.e-pv{color:#A3E635;text-shadow:0 0 20px rgba(163,230,53,.6)}
.e-use{color:#FB7185;text-shadow:0 0 20px rgba(251,113,133,.5)}
.e-cap{font-size:clamp(9px,calc(var(--u) * 0.276),12px);opacity:.72;margin-top:.35em}

.e-plot{position:relative;min-height:0;height:100%;display:flex}
.e-plot svg{display:block;width:100%;height:100%;overflow:visible}
.e-plot .axis{stroke:rgba(255,255,255,.28);stroke-width:.8;stroke-dasharray:3 4}
.e-empty{margin:auto;font-size:clamp(10px,calc(var(--u) * 0.312),13px);opacity:.6}

.e-lbl{display:flex;justify-content:space-between;gap:1em;
  font-family:var(--p-mono);font-size:clamp(8px,calc(var(--u) * 0.24),11px);opacity:.7;margin-bottom:5px}
.e-tube{
  position:relative;height:clamp(12px,calc(var(--u) * 0.312),20px);border-radius:999px;overflow:hidden;
  background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);cursor:pointer;
}
.e-tube i{display:block;height:100%;border-radius:999px;
  background:linear-gradient(90deg,#A3E635,#22D3EE);box-shadow:0 0 22px rgba(120,230,200,.7);
  transition:width .6s cubic-bezier(.2,.8,.2,1)}
.e-tube span.pct{position:absolute;inset:0;display:grid;place-items:center;
  font-family:var(--p-mono);font-weight:700;font-size:clamp(8.5px,calc(var(--u) * 0.24),11px);
  color:#04121A;text-shadow:0 1px 0 rgba(255,255,255,.3)}
.e-tube .sheen{position:absolute;top:0;bottom:0;width:34%;left:-40%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent);
  animation:e-sheen 3.4s linear infinite}
@keyframes e-sheen{to{left:110%}}
.card.e-idle .e-tube .sheen{display:none}
@media (prefers-reduced-motion: reduce){.e-tube .sheen{display:none}.e-tube i{transition:none}}
`;

class PrismEnergyCard extends PrismCard {
  static defaults = { title: "Energie & PV", hours: 24 };
  static stub = { title: "Energie & PV", hours: 24 };
  static double = true;
  static css = ENERGY_CSS;

  setConfig(config) {
    super.setConfig(config);
    this._pv = null; this._use = null; this._histTs = 0; this._histKey = null;
  }
  onHass() { this._maybeFetch(); }

  async _maybeFetch() {
    const hass = this._hass, cfg = this._config;
    const ids = [cfg.pv_power, cfg.consumption_power].filter(Boolean);
    if (!ids.length) return;
    const key = ids.join("|");
    const now = Date.now();
    if (this._histKey === key && now - this._histTs < 5 * 60 * 1000) return;
    this._histKey = key; this._histTs = now;
    try {
      const res = await fetchHistory(hass, ids, parseInt(cfg.hours) || 24);
      if (cfg.pv_power) this._pv = kwSeries(res[cfg.pv_power] || [], uom(hass, cfg.pv_power, "W"));
      if (cfg.consumption_power) this._use = kwSeries(res[cfg.consumption_power] || [], uom(hass, cfg.consumption_power, "W"));
      this._sig = null;
      this._render();
    } catch (e) { /* History nicht verfügbar */ }
  }

  /* Zwei Kurven um eine Mittelachse: PV nach oben, Verbrauch nach unten */
  _mirror(w, h) {
    const pv = this._pv || [], use = this._use || [];
    if (pv.length < 2 && use.length < 2) return null;
    const all = pv.concat(use);
    let t0 = Infinity, t1 = -Infinity, max = 0;
    all.forEach((p) => {
      if (p.t < t0) t0 = p.t;
      if (p.t > t1) t1 = p.t;
      if (p.v > max) max = p.v;
    });
    if (!max) max = 1;
    const mid = h / 2, span = t1 - t0 || 1;
    const X = (t) => ((t - t0) / span) * w;
    const build = (pts, up) => {
      if (pts.length < 2) return null;
      const d = pts.map((p, i) =>
        (i ? "L" : "M") + X(p.t).toFixed(1) + " " +
        (mid + (up ? -1 : 1) * (p.v / max) * (mid - 2)).toFixed(1)).join(" ");
      const area = `M${X(pts[0].t).toFixed(1)} ${mid} ` + d.slice(1) +
        ` L${X(pts[pts.length - 1].t).toFixed(1)} ${mid} Z`;
      return { line: d, area };
    };
    return { pv: build(pv, true), use: build(use, false), max, mid };
  }

  view(hass, cfg) {
    const pvNow = kwOf(hass, cfg.pv_power);
    const useNow = kwOf(hass, cfg.consumption_power);
    const soc = num(hass, cfg.battery_soc);
    const charge = kwOf(hass, cfg.battery_charge);
    const discharge = kwOf(hass, cfg.battery_discharge);
    const gridNow = kwOf(hass, cfg.grid_power);

    const charging = charge !== null && charge > 0.05;
    const discharging = discharge !== null && discharge > 0.05;
    const surplus = pvNow !== null && useNow !== null ? pvNow - useNow : null;

    /* Restdauer aus Kapazität und Lade- bzw. Entladeleistung */
    const cap = parseFloat(cfg.battery_capacity);
    let eta = "";
    if (cap && soc !== null) {
      if (charging && charge > 0.1) {
        const h = ((100 - soc) / 100) * cap / charge;
        eta = "voll in ca. " + (h >= 1 ? fmt(h, 1) + " h" : Math.round(h * 60) + " min");
      } else if (discharging && discharge > 0.1) {
        const h = (soc / 100) * cap / discharge;
        eta = "leer in ca. " + (h >= 1 ? fmt(h, 1) + " h" : Math.round(h * 60) + " min");
      }
    }

    const status = charging ? "Überschuss · Akku lädt"
      : discharging ? "Akku versorgt das Haus"
      : gridNow !== null && gridNow < -0.05 ? "Einspeisung"
      : gridNow !== null && gridNow > 0.05 ? "Netzbezug"
      : pvNow !== null && pvNow > 0.05 ? "Erzeugt" : "Ruhe";

    const w = 600, h = 130;
    const m = this._mirror(w, h);
    const powerTxt = charging ? fmt(charge, 2) + " kW" : discharging ? fmt(discharge, 2) + " kW" : "im Ruhezustand";

    return {
      tone: "solar", ink: "#EAFDFF",
      fill: 0, quiet: false,
      idle: !charging && !discharging,
      sig: [pvNow, useNow, soc, charge, discharge, gridNow, eta,
        (this._pv || []).length, (this._use || []).length],
      head: this.head("mdi:solar-power-variant", cfg.title, status, { go: true }) +
        `<div class="e-nums">
           <div>
             <div class="e-big e-pv">${fmt(pvNow, 2)}<small>kW</small></div>
             <div class="e-cap">PV-Erzeugung${surplus !== null && surplus > 0.05 ? " · Überschuss " + fmt(surplus, 2) + " kW" : ""}</div>
           </div>
           <div>
             <div class="e-big e-use">${fmt(useNow, 2)}<small>kW</small></div>
             <div class="e-cap">Hausverbrauch</div>
           </div>
         </div>`,
      body: m
        ? `<div class="e-plot"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
             <defs>
               <filter id="e-glow" x="-20%" y="-50%" width="140%" height="220%">
                 <feGaussianBlur stdDeviation="3.2" result="b"/>
                 <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
               </filter>
               <linearGradient id="e-pv" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0" stop-color="#A3E635" stop-opacity=".6"/>
                 <stop offset="1" stop-color="#A3E635" stop-opacity=".02"/>
               </linearGradient>
               <linearGradient id="e-use" x1="0" y1="1" x2="0" y2="0">
                 <stop offset="0" stop-color="#FB7185" stop-opacity=".5"/>
                 <stop offset="1" stop-color="#FB7185" stop-opacity=".02"/>
               </linearGradient>
             </defs>
             <line class="axis" x1="0" y1="${m.mid}" x2="${w}" y2="${m.mid}"/>
             ${m.pv ? `<path d="${m.pv.area}" fill="url(#e-pv)"/>` : ""}
             ${m.use ? `<path d="${m.use.area}" fill="url(#e-use)"/>` : ""}
             ${m.use ? `<path d="${m.use.line}" fill="none" stroke="#FB7185" stroke-width="2"
                 filter="url(#e-glow)" vector-effect="non-scaling-stroke"/>` : ""}
             ${m.pv ? `<path d="${m.pv.line}" fill="none" stroke="#A3E635" stroke-width="2.4"
                 filter="url(#e-glow)" vector-effect="non-scaling-stroke"/>` : ""}
           </svg></div>`
        : `<div class="e-plot"><div class="e-empty">${
            cfg.pv_power || cfg.consumption_power ? "Verlauf wird geladen…" : "Keine Verlaufs-Entitäten gewählt."
          }</div></div>`,
      foot: `<div class="e-lbl">
               <span>AKKU · ${esc(powerTxt)}</span>
               <span>${esc(eta || (soc === null ? "" : (charging ? "lädt" : discharging ? "entlädt" : "hält")))}</span>
             </div>
             <div class="e-tube" id="e-bat">
               <i style="width:${soc === null ? 0 : Math.max(0, Math.min(100, soc))}%"></i>
               <span class="pct">${soc === null ? "–" : fmt0(soc) + " %"}</span>
               <span class="sheen"></span>
             </div>`,
    };
  }

  wire(view) {
    const cfg = this._config;
    const card = this.shadowRoot.querySelector(".card");
    if (card) {
      card.classList.add("e-full");
      if (view && view.idle) card.classList.add("e-idle");
    }
    this._wireHead(cfg.pv_power);
    this._on("e-bat", () => this._moreInfo(cfg.battery_soc));
  }
}

register("prism-energy-card", PrismEnergyCard, {
  name: "Prism Energy Card",
  description: "Doppel-Quadrat. Spiegelgraph aus Erzeugung und Verbrauch, beide Leistungen groß, Akku als leuchtende Röhre.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "pv_power", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "consumption_power", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "battery_soc", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "battery_charge", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "battery_discharge", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "battery_capacity", selector: { number: { min: 0.5, max: 200, step: 0.1, mode: "box", unit_of_measurement: "kWh" } } },
  { name: "grid_power", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "hours", selector: { number: { min: 1, max: 168, mode: "box", unit_of_measurement: "h" } } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  title: "Titel",
  pv_power: "PV-Leistung jetzt (W oder kW)",
  consumption_power: "Hausverbrauch jetzt (W oder kW)",
  battery_soc: "Akkustand (%)",
  battery_charge: "Ladeleistung des Akkus",
  battery_discharge: "Entladeleistung des Akkus",
  battery_capacity: "Akkukapazität in kWh (für „voll in ca. …“)",
  grid_power: "Netz-Leistung (negativ = Einspeisung, optional)",
  hours: "Verlauf: Zeitraum in Stunden",
  tap_action: "Aktion beim Klick auf den Kopf (z. B. Navigation)",
});

/* ══════════════════════════════════════════════════════════════
   8 — Vehicle Card  ·  Doppel-Quadrat
   ══════════════════════════════════════════════════════════════ */

/* Keine Vorbelegung mit konkreten Entitäten — die Karte wird über den
   Editor eingerichtet. Wer eine Marken-Integration nutzt, findet die
   passenden Entitäten dort unter dem Fahrzeugnamen. */
const VEHICLE_DEFAULTS = {
  name: "Fahrzeug",
};

class PrismVehicleCard extends PrismCard {
  static defaults = VEHICLE_DEFAULTS;
  static stub = {};
  static double = true;

  _imageUrl() {
    const cfg = this._config;
    if (cfg.image_url) return cfg.image_url;
    if (cfg.image_entity && this._hass.states[cfg.image_entity]) {
      const s = this._hass.states[cfg.image_entity];
      if (s.attributes.entity_picture) return s.attributes.entity_picture;
    }
    return null;
  }

  view(hass, cfg) {
    const soc = num(hass, cfg.battery);
    const range = num(hass, cfg.range);
    const power = num(hass, cfg.charging_power);
    const rate = num(hass, cfg.charge_rate);
    const limit = num(hass, cfg.charge_limit);
    const remaining = num(hass, cfg.remaining_time);

    const statusRaw = (stateOf(hass, cfg.charging_status) || "").toLowerCase();
    const charging = statusRaw === "charging";
    const plugged = stateOf(hass, cfg.cable) === "on";
    const method = (stateOf(hass, cfg.charge_method) || "").toUpperCase();
    const locked = stateOf(hass, cfg.lock) === "locked";
    const lockKnown = !!(cfg.lock && hass.states[cfg.lock]);
    const climateOn = cfg.climate && hass.states[cfg.climate] && stateOf(hass, cfg.climate) !== "off";
    const winOpen = stateOf(hass, cfg.windows) === "on";
    const locName = cfg.location && hass.states[cfg.location]
      ? (hass.states[cfg.location].state === "not_home" ? "Unterwegs"
         : hass.states[cfg.location].state === "home" ? "Zuhause" : hass.states[cfg.location].state)
      : "–";
    const alert = (lockKnown && !locked) || winOpen;

    let remainingTxt = "";
    if (charging && remaining !== null) {
      remainingTxt = remaining >= 60
        ? Math.floor(remaining / 60) + " h " + Math.round(remaining % 60) + " min"
        : Math.round(remaining) + " min";
    }
    const statusTxt = charging
      ? "Lädt" + (method ? " · " + method : "") + (power !== null ? " " + fmt(power) + " kW" : "")
      : plugged ? "Angesteckt" : "Geparkt";

    const imgUrl = cfg.hide_image === true ? null : this._imageUrl();

    const rows = [];
    if (remainingTxt) rows.push({ icon: "mdi:timer-sand", k: "Restzeit", v: remainingTxt, hot: true, mi: cfg.remaining_time });
    if (charging && rate !== null) rows.push({ icon: "mdi:speedometer", k: "Laderate", v: "+" + fmt0(rate) + " km/h", hot: true, mi: cfg.charge_rate });
    rows.push({ icon: "mdi:ev-plug-type2", k: "Ladekabel", v: plugged ? "steckt" : "getrennt", hot: plugged, mi: cfg.cable });
    if (lockKnown) rows.push({ icon: locked ? "mdi:lock" : "mdi:lock-open-variant", k: "Verriegelung", v: locked ? "verriegelt" : "offen", hot: !locked, mi: cfg.lock });
    if (cfg.windows && hass.states[cfg.windows]) rows.push({ icon: winOpen ? "mdi:car-door" : "mdi:car-door-lock", k: "Fenster", v: winOpen ? "offen" : "zu", hot: winOpen, mi: cfg.windows });
    rows.push({ icon: "mdi:map-marker", k: "Standort", v: locName, mi: cfg.location });

    return {
      tone: alert ? "rose" : "olive",
      fill: soc === null ? 0 : soc,
      quiet: soc === null,
      sig: [soc, range, power, rate, limit, remaining, statusRaw, plugged, locked, lockKnown,
        climateOn, winOpen, locName, imgUrl],
      head: this.head(cfg.icon || "mdi:car-electric", cfg.name,
        charging ? `<span class="blink">${esc(statusTxt)}</span>` : esc(statusTxt), { go: false }),
      /* Linke Spalte: nur das Fahrzeug, rechts die Details.
         Der Akkustand läuft als Balken über die volle Kartenbreite. */
      body: imgUrl
        ? `<div class="stage"><img src="${esc(imgUrl)}" alt="${esc(cfg.name)}"></div>`
        : `<div class="stage"><ha-icon icon="${cfg.icon || "mdi:car-electric"}"
             style="--mdc-icon-size:clamp(48px,calc(var(--u) * 2.04),110px);opacity:.28"></ha-icon></div>`,
      /* Schaltflächen links unter dem Fahrzeug, Detailzeilen rechts */
      foot: `${range !== null ? this.value(fmt0(range), "km", "mid") : this.value(soc === null ? "–" : fmt0(soc), "%", "mid")}
             <div class="sub">${range !== null ? "Reichweite" : "Akkustand"}</div>
             <div class="acts" style="margin-top:.7em">
               <span class="act ${lockKnown ? (locked ? "on" : "warn") : ""}" id="b-lock">
                 <ha-icon icon="${locked ? "mdi:lock" : "mdi:lock-open-variant"}"></ha-icon>${locked ? "Entriegeln" : "Verriegeln"}</span>
               <span class="act ${climateOn ? "on" : ""}" id="b-climate"><ha-icon icon="mdi:snowflake"></ha-icon>Klima</span>
               <span class="act" id="b-loc"><ha-icon icon="mdi:map-marker"></ha-icon>Karte</span>
             </div>`,
      detail: this.rows(rows.slice(0, 7)),
      bar: this.socBar({
        pct: soc, id: "ring", label: "Akkustand", limit: limit,
        left: charging ? (power !== null ? "lädt · " + fmt(power) + " kW" : "lädt")
                       : plugged ? "angesteckt" : "nicht verbunden",
        right: remainingTxt ? "noch " + remainingTxt : (limit !== null ? "Limit " + fmt0(limit) + " %" : ""),
      }),
    };
  }

  wire() {
    const cfg = this._config;
    this._on("ring", () => this._act(cfg.battery, cfg.battery_tap_action, "more-info"));
    this._on("b-lock", () => this._act(cfg.lock, cfg.lock_tap_action, "toggle"));
    this._on("b-climate", () => this._act(cfg.climate, cfg.climate_tap_action, "more-info"));
    this._on("b-loc", () => this._act(cfg.location, cfg.location_tap_action, "more-info"));
    this.shadowRoot.querySelectorAll("[data-mi]").forEach((n) => {
      n.addEventListener("click", (ev) => { ev.stopPropagation(); this._moreInfo(n.getAttribute("data-mi")); });
    });
    if (cfg.windows_tap_action) {
      const w = this.shadowRoot.querySelector(`[data-mi="${cfg.windows}"]`);
      if (w) w.addEventListener("click", (ev) => { ev.stopPropagation(); this._act(cfg.windows, cfg.windows_tap_action, "more-info"); });
    }
    if (cfg.tap_action && cfg.tap_action.action) {
      const card = this.shadowRoot.querySelector(".card");
      if (card) card.addEventListener("click", () => this._act(cfg.entity || cfg.battery, cfg.tap_action, "none"));
    }
  }
}

register("prism-vehicle-card", PrismVehicleCard, {
  name: "Prism Vehicle Card",
  description: "Doppel-Quadrat. Links Fahrzeugbild und SoC-Ring, rechts Ladedetails, Verriegelung, Fenster, Standort und Schnellzugriffe.",
}, [
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "battery", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "range", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "charging_status", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "charging_power", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "charge_method", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "charge_rate", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "remaining_time", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "charge_limit", selector: { entity: { filter: [{ domain: "number" }, { domain: "sensor" }] } } },
  { name: "cable", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "lock", selector: { entity: { filter: [{ domain: "lock" }, { domain: "binary_sensor" }] } } },
  { name: "climate", selector: { entity: { filter: [{ domain: "climate" }, { domain: "switch" }] } } },
  { name: "windows", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "location", selector: { entity: { filter: [{ domain: "device_tracker" }, { domain: "person" }] } } },
  { name: "image_entity", selector: { entity: { filter: [{ domain: "image" }, { domain: "camera" }] } } },
  { name: "image_url", selector: { text: {} } },
  { name: "hide_image", selector: { boolean: {} } },
  { name: "battery_tap_action", selector: { ui_action: {} } },
  { name: "lock_tap_action", selector: { ui_action: {} } },
  { name: "climate_tap_action", selector: { ui_action: {} } },
  { name: "windows_tap_action", selector: { ui_action: {} } },
  { name: "location_tap_action", selector: { ui_action: {} } },
], {
  name: "Fahrzeugname",
  icon: "Icon (Standard: mdi:car-electric)",
  battery: "Batteriestand (%)",
  range: "Reichweite (km)",
  charging_status: "Ladestatus (charging = lädt)",
  charging_power: "Ladeleistung (kW)",
  charge_method: "Ladeverfahren (AC/DC)",
  charge_rate: "Laderate (km/h)",
  remaining_time: "Verbleibende Ladezeit (min)",
  charge_limit: "Ladelimit (%)",
  cable: "Ladekabel angesteckt",
  lock: "Verriegelung",
  climate: "Klimaanlage",
  windows: "Fenster (on = offen)",
  location: "Standort",
  image_entity: "Fahrzeugbild: Entität",
  image_url: "Fahrzeugbild: eigene URL (übersteuert Entität)",
  hide_image: "Fahrzeugbild ausblenden",
  battery_tap_action: "Klick auf SoC-Ring (Standard: mehr Infos)",
  lock_tap_action: "Klick auf Verriegelung (Standard: ver-/entriegeln)",
  climate_tap_action: "Klick auf Klima (Standard: Dialog öffnen)",
  windows_tap_action: "Klick auf Fenster (Standard: mehr Infos)",
  location_tap_action: "Klick auf Standort (Standard: Karte öffnen)",
});


/* ══════════════════════════════════════════════════════════════
   9 — Mini Card  ·  Viertel-Quadrat
   ══════════════════════════════════════════════════════════════
   Vier Minis (grid_columns: 3) ergeben zusammen ein Standard-Quadrat.
   Bewusst generisch: Icon plus Text für Navigation, oder Icon plus
   Wert für alles, was eine Zahl, eine Restzeit oder einen Zustand hat.
   ══════════════════════════════════════════════════════════════ */

/* Home-Connect-Enums wie "BSH.Common.EnumType.OperationState.Run" auf "run" kürzen */
function shortState(raw) {
  const t = String(raw == null ? "" : raw).trim();
  if (!t.includes(".")) return t;
  if (/\.Program\./.test(t)) return t.split(".Program.").pop();
  return t.split(".").pop();
}
/* CamelCase auftrennen und übersetzen: "DelayedStart" -> "Startvorwahl" */
const ENUM_WORDS = {
  run: "Läuft", ready: "Bereit", finished: "Fertig", inactive: "Aus", pause: "Pause",
  delayedstart: "Startvorwahl", actionrequired: "Eingriff nötig", aborting: "Abbruch",
  error: "Fehler", on: "An", off: "Aus", standby: "Standby",
  washing: "Waschen", rinsing: "Spülen", spinning: "Schleudern", drying: "Trocknen",
  prewash: "Vorwäsche", mainwash: "Hauptwäsche", rinsehold: "Spülstopp",
};
function prettyEnum(raw) {
  const short = shortState(raw);
  const key = short.replace(/[.\s]/g, "").toLowerCase();
  if (ENUM_WORDS[key]) return ENUM_WORDS[key];
  return short
    .replace(/\./g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
}
/* Restzeit aus Zahl, "H:MM" oder Zeitstempel in Minuten umrechnen */
function toMinutes(raw, unit) {
  if (raw === null || raw === undefined || raw === "") return null;
  const t = String(raw).trim();
  const n = parseFloat(t);
  if (!isNaN(n) && /^-?[\d.,]+$/.test(t)) {
    return unit === "s" ? n / 60 : unit === "h" ? n * 60 : n;
  }
  const hm = t.match(/^(\d+):([0-5]\d)(?::([0-5]\d))?$/);
  if (hm) return parseInt(hm[1]) * 60 + parseInt(hm[2]);
  const ts = new Date(t).getTime();
  if (!isNaN(ts)) return Math.max(0, (ts - Date.now()) / 60000);
  return null;
}

const MINI_ACTIVE = ["on", "open", "playing", "home", "charging", "running", "heat", "cool",
  "cleaning", "unlocked", "active", "true", "detected", "wet", "occupied",
  "run", "pause", "delayedstart", "actionrequired", "aborting"];
const MINI_DONE = ["finished", "done", "complete", "completed", "fertig", "end"];
const MINI_OFF = ["inactive", "ready", "off", "standby", "unavailable", "unknown", "none", "idle"];

const STATE_WORDS = {
  on: "An", off: "Aus", open: "Offen", closed: "Zu", home: "Zuhause", not_home: "Unterwegs",
  locked: "Verriegelt", unlocked: "Offen", playing: "Spielt", paused: "Pause", idle: "Bereit",
  standby: "Standby", cleaning: "Reinigt", docked: "Dock", charging: "Lädt", running: "Läuft",
  finished: "Fertig", unavailable: "n. v.", unknown: "–", true: "Ja", false: "Nein",
};

/* Laufzeit lesbar: unter einer Stunde "48 min", darüber "1:15 h" */
function compactDuration(v, unit) {
  if (v === null || v === undefined || isNaN(v)) return null;
  let min = unit === "s" ? v / 60 : unit === "h" ? v * 60 : v;
  min = Math.max(0, Math.round(min));
  if (min < 60) return [String(min), "min"];
  const h = Math.floor(min / 60), m = min % 60;
  return [m ? h + ":" + String(m).padStart(2, "0") : String(h), "h"];
}
function humanDuration(v, unit) {
  const c = compactDuration(v, unit);
  if (!c) return null;
  return c[1] === "min" ? c[0] + " min" : c[0].replace(":", " h ").replace(/ h $/, " h");
}
/* Zeitstempel relativ zu jetzt */
function relTime(iso) {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const diff = Math.round((t - Date.now()) / 60000);
  const abs = Math.abs(diff);
  const body = abs < 60 ? abs + " min"
    : abs < 1440 ? Math.floor(abs / 60) + " h" + (abs % 60 ? " " + (abs % 60) : "")
    : Math.round(abs / 1440) + " Tg";
  return diff >= 0 ? "in " + body : "vor " + body;
}

class PrismMiniCard extends PrismCard {
  static defaults = { layout: "value", tone: "teal", format: "auto", duration_unit: "min" };
  static stub = { layout: "value", tone: "teal" };
  static gridOpts = MINI_GRID;

  onHass() {
    /* Bei laufender Restzeit jede Minute nachrechnen, damit der Wert nicht einfriert */
    const needTick = this._config && this._config.layout === "ring";
    if (needTick && !this._tick) {
      this._tick = setInterval(() => { this._sig = null; this._render(); }, 30000);
    } else if (!needTick && this._tick) {
      clearInterval(this._tick); this._tick = null;
    }
  }

  _read(id, attr) {
    const st = id ? this._hass.states[id] : null;
    if (!st) return { st: null, raw: null };
    return { st, raw: attr ? st.attributes[attr] : st.state };
  }

  _format(raw, cfg, st) {
    if (raw === null || raw === undefined || raw === "") return { txt: "–", unit: "", n: null };
    const f = cfg.format || "auto";
    const n = parseFloat(raw);
    const numeric = !isNaN(n) && String(raw).trim() !== "" && isFinite(n);

    if (f === "duration") return { txt: humanDuration(n, cfg.duration_unit) || "–", unit: "", n };
    if (f === "relative" || f === "timestamp") {
      return { txt: relTime(raw) || String(raw), unit: "", n: null };
    }
    if (f === "text") return { txt: STATE_WORDS[String(raw)] || prettyEnum(raw), unit: "", n: numeric ? n : null };
    if (f === "number" || (f === "auto" && numeric)) {
      const d = cfg.decimals !== undefined && cfg.decimals !== null
        ? parseInt(cfg.decimals)
        : (Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : Math.round(n) === n ? 0 : 1);
      const unit = cfg.unit !== undefined ? cfg.unit
        : (!cfg.attribute && st ? (st.attributes.unit_of_measurement || "") : "");
      return { txt: fmt(n, d), unit, n };
    }
    if (f === "auto" && /^\d{4}-\d{2}-\d{2}T/.test(String(raw))) {
      const r = relTime(raw);
      if (r) return { txt: r, unit: "", n: null };
    }
    return { txt: STATE_WORDS[String(raw)] || prettyEnum(raw), unit: cfg.unit || "", n: null };
  }

  /* Welche Entität entscheidet über an / aus / fertig */
  _phase(cfg) {
    const id = cfg.state_entity || cfg.entity;
    const st = id ? this._hass.states[id] : null;
    const cur = st ? String(st.state).toLowerCase() : null;
    const list = (v, def) => v
      ? String(v).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)
      : def;
    if (!id) return "on";
    if (!st) return "off";
    /* Enum-Zustände zusätzlich in Kurzform vergleichen */
    const shortCur = shortState(cur).toLowerCase();
    const hit = (arr) => arr.includes(cur) || arr.includes(shortCur);
    if (hit(list(cfg.done_states, MINI_DONE))) return "done";
    if (cfg.active_states) return hit(list(cfg.active_states, [])) ? "on" : "off";
    if (hit(MINI_OFF)) return "off";
    const n = parseFloat(cur);
    if (!isNaN(n) && isFinite(n)) return n > 0 ? "on" : "off";
    return hit(MINI_ACTIVE) ? "on" : "off";
  }

  _progress(cfg) {
    const id = cfg.progress_entity || cfg.fill_entity;
    if (!id) return null;
    const { st, raw } = this._read(id, cfg.progress_attribute);
    const v = parseFloat(raw);
    if (isNaN(v)) return null;
    const max = parseFloat(cfg.progress_max) || 100;
    return Math.max(0, Math.min(100, (v / max) * 100));
  }

  _secondary(cfg) {
    if (cfg.secondary_text) return cfg.secondary_text;
    if (!cfg.secondary_entity) return "";
    const sec = this._read(cfg.secondary_entity, cfg.secondary_attribute);
    const sv = this._format(sec.raw, {
      format: cfg.secondary_format || "auto",
      duration_unit: cfg.duration_unit,
      attribute: cfg.secondary_attribute,
    }, sec.st);
    return sv.txt + (sv.unit ? " " + sv.unit : "");
  }

  view(hass, cfg) {
    const layout = cfg.layout || "value";
    const { st, raw } = this._read(cfg.entity, cfg.attribute);
    const phase = this._phase(cfg);
    const name = cfg.name || (st ? friendly(hass, cfg.entity) : "Mini");
    const icon = cfg.icon || (st && st.attributes.icon) || "mdi:square-rounded-outline";
    const secondary = this._secondary(cfg);

    /* ---------- Navigationskachel ---------- */
    if (layout === "icon") {
      return {
        tone: cfg.tone || "teal", fill: 0, quiet: cfg.quiet === true,
        sig: ["icon", name, icon, secondary, cfg.tone],
        head: "", foot: "",
        /* Icon füllt die Kachel, unten bleibt eine Zeile für den Freitext */
        body: `<div class="mini nav">
                 <div class="hero"><ha-icon icon="${icon}"></ha-icon></div>
                 <div class="nm">${esc(name)}</div>
                 ${secondary ? `<div class="sc">${esc(secondary)}</div>` : ""}
               </div>`,
      };
    }

    /* ---------- Gerät mit Restzeit: Ring ---------- */
    if (layout === "ring") {
      if (phase === "off" || phase === "done") {
        const done = phase === "done";
        return {
          tone: done ? (cfg.done_tone || "olive") : (cfg.tone || "teal"),
          fill: done ? 100 : 0,
          quiet: !done,
          sig: [layout, phase, name, secondary],
          head: "", foot: "",
          body: `<div class="mini">
                   <span class="ic"><ha-icon icon="${done ? (cfg.done_icon || "mdi:check-circle-outline") : icon}"></ha-icon></span>
                   <span class="sp"></span>
                   <div class="bg">${esc(done ? (cfg.done_text || "Fertig") : (cfg.off_text || "Aus"))}</div>
                   <div class="sc">${esc(secondary || name)}</div>
                 </div>`,
        };
      }

      const pct = this._progress(cfg);
      const mins = toMinutes(raw, cfg.duration_unit);
      let big;
      if (mins !== null && (!cfg.format || cfg.format === "auto" || cfg.format === "duration")) {
        big = compactDuration(mins, "min");
      } else {
        const rv = this._format(raw, cfg, st);
        big = [rv.txt, rv.unit];
      }

      /* Kopfzeile: fester Text, sonst Phasen-Entität, sonst Zustandsentität, sonst Name.
         Nicht verfügbare Phasensensoren (Home Connect meldet oft "unavailable") fallen durch. */
      const readLabel = (id) => {
        const e = id ? hass.states[id] : null;
        if (!e) return null;
        const raw2 = String(e.state);
        if (["unavailable", "unknown", "none", ""].includes(raw2.toLowerCase())) return null;
        return STATE_WORDS[raw2] || prettyEnum(raw2);
      };
      const label = cfg.phase_text
        || readLabel(cfg.phase_entity)
        || readLabel(cfg.state_entity || cfg.entity)
        || name;

      return {
        tone: cfg.tone || "violet",
        fill: cfg.hide_fill === true ? 0 : (pct === null ? 0 : pct),
        quiet: false,
        sig: [layout, raw, pct, label, name, secondary, cfg.tone],
        head: "", foot: "",
        body: `<div class="mini">
                 <div class="hd"><span class="dt blink"></span><span class="lb">${esc(label)}</span></div>
                 <span class="sp"></span>
                 <div class="vl"><span>${esc(big[0])}</span>${big[1] ? `<small>${esc(big[1])}</small>` : ""}</div>
                 <div class="sc scrow">
                   <span class="nmx">${esc(secondary || name)}</span>
                   ${pct !== null && cfg.hide_percent !== true ? `<b>${fmt0(pct)} %</b>` : ""}
                 </div>
                 ${pct !== null ? `<div class="pb"><i style="width:${pct.toFixed(1)}%"></i></div>` : ""}
               </div>`,
      };
    }

    /* ---------- Zustandskachel ---------- */
    if (layout === "state") {
      const txt = cfg.state_text || (st ? (STATE_WORDS[String(st.state)] || prettyEnum(st.state)) : "–");
      return {
        tone: cfg.tone || "teal", fill: 0, quiet: phase === "off",
        sig: [layout, st && st.state, name, secondary],
        head: "", foot: "",
        body: `<div class="mini">
                 <span class="ic"><ha-icon icon="${icon}"></ha-icon></span>
                 <span class="sp"></span>
                 <div class="bg">${esc(txt)}</div>
                 <div class="sc">${esc(secondary || name)}</div>
               </div>`,
      };
    }

    /* ---------- Wertkachel (Standard) ---------- */
    const v = this._format(raw, cfg, st);
    let fill = 0;
    const pct = this._progress(cfg);
    if (pct !== null) fill = pct;
    else if (v.n !== null && (v.unit === "%" || cfg.progress_max)) {
      fill = (v.n / (parseFloat(cfg.progress_max) || 100)) * 100;
    }

    return {
      tone: cfg.tone || "teal",
      fill,
      quiet: phase === "off",
      sig: [layout, raw, secondary, phase, fill, icon, name],
      head: "", foot: "",
      body: `<div class="mini">
               <span class="ic"><ha-icon icon="${icon}"></ha-icon></span>
               <span class="sp"></span>
               <div class="vl ${v.n === null ? "txt" : ""}"><span>${esc(v.txt)}</span>${
                 v.unit ? `<small>${esc(v.unit)}</small>` : ""}</div>
               <div class="sc">${esc(secondary || name)}</div>
             </div>`,
    };
  }

  wire() {
    const cfg = this._config;
    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      if (cfg.tap_action && cfg.tap_action.action) {
        this._act(cfg.entity || cfg.state_entity || "sun.sun", cfg.tap_action, "none");
        return;
      }
      if (cfg.navigation_path) {
        this._fire("hass-action", {
          config: { tap_action: { action: "navigate", navigation_path: cfg.navigation_path } },
          action: "tap",
        });
        return;
      }
      const id = cfg.entity || cfg.state_entity;
      if (id) this._moreInfo(id);
    });
  }
}

const TONE_OPTIONS = [
  { value: "amber", label: "Bernstein" },
  { value: "sunset", label: "Sonnenuntergang" },
  { value: "grid", label: "Gold" },
  { value: "sand", label: "Sand" },
  { value: "ember", label: "Glut" },
  { value: "coral", label: "Koralle" },
  { value: "rose", label: "Rosé" },
  { value: "berry", label: "Beere" },
  { value: "crimson", label: "Karmin" },
  { value: "violet", label: "Violett" },
  { value: "plum", label: "Pflaume" },
  { value: "night", label: "Nacht" },
  { value: "sky", label: "Himmel" },
  { value: "battery", label: "Cyan" },
  { value: "ice", label: "Eis" },
  { value: "ocean", label: "Ozean" },
  { value: "teal", label: "Türkis" },
  { value: "mint", label: "Minze" },
  { value: "forest", label: "Wald" },
  { value: "solar", label: "Solar" },
  { value: "olive", label: "Oliv" },
  { value: "slate", label: "Schiefer" },
  { value: "graphite", label: "Graphit" },
];

register("prism-mini-card", PrismMiniCard, {
  name: "Prism Mini Card",
  description: "Viertel-Quadrat (grid_columns: 3). Vier Verwendungen: Wert, Zustand, Navigation oder Gerät mit Restzeit und Fortschrittsbalken.",
}, [
  { name: "layout", selector: { select: { mode: "dropdown", options: [
    { value: "value", label: "Wert — Icon oben, Zahl unten (Sensor, Zähler)" },
    { value: "state", label: "Zustand — Icon oben, Zustandswort unten (Schalter, Tür)" },
    { value: "icon", label: "Navigation — Icon mit Text, zentriert" },
    { value: "ring", label: "Gerät mit Restzeit — Balken zeigt den Fortschritt" },
  ] } } },
  { name: "entity", selector: { entity: {} } },
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "tone", selector: { select: { mode: "dropdown", options: TONE_OPTIONS } } },

  /* Wert */
  { name: "attribute", selector: { text: {} } },
  { name: "format", selector: { select: { mode: "dropdown", options: [
    { value: "auto", label: "Automatisch" },
    { value: "number", label: "Zahl" },
    { value: "duration", label: "Laufzeit / Restzeit" },
    { value: "relative", label: "Zeitstempel relativ (in 1 h 20)" },
    { value: "text", label: "Text / Zustandswort" },
  ] } } },
  { name: "duration_unit", selector: { select: { mode: "dropdown", options: [
    { value: "min", label: "Minuten" }, { value: "s", label: "Sekunden" }, { value: "h", label: "Stunden" },
  ] } } },
  { name: "unit", selector: { text: {} } },
  { name: "decimals", selector: { number: { min: 0, max: 3, mode: "box" } } },

  /* Ring */
  { name: "progress_entity", selector: { entity: {} } },
  { name: "progress_attribute", selector: { text: {} } },
  { name: "progress_max", selector: { number: { min: 1, mode: "box" } } },
  { name: "phase_entity", selector: { entity: {} } },
  { name: "phase_text", selector: { text: {} } },
  { name: "hide_percent", selector: { boolean: {} } },
  { name: "hide_fill", selector: { boolean: {} } },

  /* Zustände */
  { name: "state_entity", selector: { entity: {} } },
  { name: "active_states", selector: { text: {} } },
  { name: "off_text", selector: { text: {} } },
  { name: "done_states", selector: { text: {} } },
  { name: "done_text", selector: { text: {} } },
  { name: "done_icon", selector: { icon: {} } },
  { name: "done_tone", selector: { select: { mode: "dropdown", options: TONE_OPTIONS } } },

  /* Zweitzeile und Aktion */
  { name: "secondary_entity", selector: { entity: {} } },
  { name: "secondary_attribute", selector: { text: {} } },
  { name: "secondary_text", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  layout: "Verwendung",
  entity: "Entität — beim Ring die Restlaufzeit (leer = reine Navigationskachel)",
  name: "Beschriftung (leer = Name der Entität)",
  icon: "Icon (leer = Icon der Entität)",
  tone: "Farbton",
  attribute: "Attribut statt Zustand (z. B. remaining_time)",
  format: "Formatierung des Werts",
  duration_unit: "Einheit der Laufzeit",
  unit: "Einheit (leer = Einheit der Entität)",
  decimals: "Nachkommastellen",
  progress_entity: "Fortschritt: Entität für den Balken",
  progress_attribute: "Fortschritt: Attribut",
  progress_max: "Fortschritt: Maximalwert (Standard 100)",
  phase_entity: "Kopfzeile: Entität (z. B. Programmphase)",
  phase_text: "Kopfzeile: fester Text",
  hide_percent: "Prozentwert neben der Beschriftung ausblenden",
  hide_fill: "Lichtkante im Hintergrund ausblenden",
  state_entity: "Zustandsquelle (leer = die Entität oben)",
  active_states: "Aktive Zustände, kommagetrennt (Standard: on, running, open …)",
  off_text: "Text im Aus-Zustand (Standard: Aus)",
  done_states: "Fertig-Zustände, kommagetrennt (Standard: finished, done, fertig …)",
  done_text: "Text im Fertig-Zustand (Standard: Fertig)",
  done_icon: "Icon im Fertig-Zustand",
  done_tone: "Farbton im Fertig-Zustand (Standard: Oliv)",
  secondary_entity: "Zweitzeile: Entität",
  secondary_attribute: "Zweitzeile: Attribut",
  secondary_text: "Zweitzeile: fester Text",
  navigation_path: "Navigationsziel beim Antippen",
  tap_action: "Aktion beim Antippen (übersteuert das Navigationsziel)",
});


/* ══════════════════════════════════════════════════════════════
   10 — Network Card  ·  Standard-Quadrat
   ══════════════════════════════════════════════════════════════
   Spiegelgraph im Puls-Look: Download nach oben, Upload nach unten.
   Pulsierender Online-Punkt, wandernder Lichtstreifen, unten beide
   Geschwindigkeiten als große Zahlen.
   ══════════════════════════════════════════════════════════════ */

/* Erreichbarkeit — wird auch von der Druckerkarte genutzt */
const ONLINE_STATES = ["on", "home", "connected", "online", "streaming", "playing", "idle", "ok", "normal", "true"];
const OFFLINE_STATES = ["unavailable", "unknown", "off", "not_home", "disconnected", "offline"];
function isReachable(hass, id) {
  const st = hass.states[id];
  if (!st) return false;
  const v = String(st.state).toLowerCase();
  if (OFFLINE_STATES.includes(v)) return false;
  if (ONLINE_STATES.includes(v)) return true;
  const n = parseFloat(v);
  return !isNaN(n) ? n > 0 : true;
}

const NICON = {
  net: '<path d="M12 19.5h.01"/><path d="M8.4 15.6a5 5 0 0 1 7.2 0"/><path d="M5 12.2a9.6 9.6 0 0 1 14 0"/><path d="M2 8.9a14 14 0 0 1 20 0"/>',
  off: '<path d="M12 19.5h.01"/><path d="M8.4 15.6a5 5 0 0 1 7.2 0"/><path d="M5 12.2a9.6 9.6 0 0 1 14 0"/><path d="M3 3l18 18"/>',
  down: '<path d="M12 4v13"/><path d="M6.5 11.5 12 17l5.5-5.5"/>',
  up: '<path d="M12 20V7"/><path d="M6.5 12.5 12 7l5.5 5.5"/>',
};

const NETWORK_CSS = `
/* Eigener Grund, Basisfläche entfällt */
.card{
  background:linear-gradient(160deg,#0E7490,#083344 60%,#04161C);
  border-color:rgba(34,211,238,.28);
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
}
.card.n-off{background:linear-gradient(160deg,#3F2A34,#241923 60%,#120C11);border-color:rgba(251,113,133,.30)}
.card > .wash,.card > .rise{display:none}
.card > .gloss{z-index:3;opacity:.55}
.card > .zh,.card > .zb,.card > .zf{position:relative;z-index:4}

/* Lichtstreifen */
.n-sweep{position:absolute;top:0;bottom:0;width:26%;left:-30%;z-index:5;pointer-events:none;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);
  animation:n-sweep 4.5s linear infinite}
@keyframes n-sweep{to{left:110%}}
.card.n-off .n-sweep{display:none}

/* Kopf: Größen kommen aus der Basis, nur der Punkt kommt dazu */
.n-badge{background:rgba(255,255,255,.12)}
.n-badge svg{width:56%;height:56%;stroke:currentColor;stroke-width:1.8;fill:none;
  stroke-linecap:round;stroke-linejoin:round}
.card .state{display:flex;align-items:center;gap:.45em}
.n-ping{position:relative;display:inline-flex;width:.7em;height:.7em;flex:none}
.n-ping .core{width:100%;height:100%;border-radius:50%;background:#4ADE80;box-shadow:0 0 12px #4ADE80}
.n-ping .ring{position:absolute;inset:-.2em;border-radius:50%;border:1.5px solid rgba(74,222,128,.85);
  animation:n-ping 2.2s ease-out infinite}
@keyframes n-ping{0%{transform:scale(.45);opacity:.9}100%{transform:scale(1.5);opacity:0}}
.card.n-off .n-ping .core{background:#FB7185;box-shadow:0 0 12px #FB7185}
.card.n-off .n-ping .ring{border-color:rgba(251,113,133,.8);animation-duration:3.2s}

/* Spiegelgraph */
.n-plot{position:relative;min-height:0;height:100%;display:flex}
.n-plot svg{display:block;width:100%;height:100%;overflow:visible}
.n-axis{stroke:rgba(255,255,255,.26);stroke-width:.8}
.n-grid{stroke:#EAFDFF;opacity:.10;stroke-width:.5;stroke-dasharray:3 4}
.n-empty{margin:auto;font-size:clamp(10px,calc(var(--u) * 0.192),13px);opacity:.6}

/* Werte */
.n-nums{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.n-big{font-family:var(--p-mono);font-weight:700;font-variant-numeric:tabular-nums;
  letter-spacing:-.04em;line-height:.9;display:flex;align-items:baseline;gap:.08em;
  font-size:clamp(20px,calc(var(--u) * 0.78),40px)}
.n-big small{font-size:.34em;font-weight:500;opacity:.72}
.n-dn{color:#67E8F9;text-shadow:0 0 18px rgba(103,232,249,.5)}
.n-up{color:#A7F3D0;text-shadow:0 0 18px rgba(167,243,208,.45)}
.card.n-off .n-dn,.card.n-off .n-up{color:#FBD5DC;text-shadow:none;opacity:.8}
.n-cap{font-size:clamp(9px,calc(var(--u) * 0.18),12px);opacity:.75;margin-top:.3em;display:flex;align-items:center;gap:.3em}
.n-cap svg{width:1.05em;height:1.05em;stroke:currentColor;stroke-width:2.1;fill:none;
  stroke-linecap:round;stroke-linejoin:round}
@media (prefers-reduced-motion: reduce){.n-sweep,.n-ping .ring{animation:none}}
`;

class PrismNetworkCard extends PrismCard {
  static defaults = { title: "Netzwerk", hours: 24 };
  static stub = { title: "Netzwerk", hours: 24 };
  static css = NETWORK_CSS;

  setConfig(config) {
    super.setConfig(config);
    this._dn = null; this._up = null; this._histTs = 0; this._histKey = null;
  }
  onHass() { this._maybeFetch(); }

  async _maybeFetch() {
    const hass = this._hass, cfg = this._config;
    const ids = [cfg.download, cfg.upload].filter(Boolean);
    if (!ids.length) return;
    const key = ids.join("|");
    const now = Date.now();
    if (this._histKey === key && now - this._histTs < 5 * 60 * 1000) return;
    this._histKey = key; this._histTs = now;
    try {
      const res = await fetchHistory(hass, ids, parseInt(cfg.hours) || 24);
      if (cfg.download) this._dn = res[cfg.download] || [];
      if (cfg.upload) this._up = res[cfg.upload] || [];
      this._sig = null;
      this._render();
    } catch (e) { /* History nicht verfügbar */ }
  }

  /* Beide Kurven auf gemeinsamer Grundlinie, gemeinsame Skala.
     Kein Spiegel mehr — bei stark unterschiedlichen Werten bliebe
     sonst eine Hälfte der Karte leer. */
  _curves(w, h) {
    const dn = this._dn || [], up = this._up || [];
    if (dn.length < 2 && up.length < 2) return null;
    const all = dn.concat(up);
    let t0 = Infinity, t1 = -Infinity, max = 0;
    all.forEach((p) => {
      if (p.t < t0) t0 = p.t;
      if (p.t > t1) t1 = p.t;
      if (p.v > max) max = p.v;
    });
    if (!max) max = 1;
    const base = h, span = t1 - t0 || 1, top = 6;
    const X = (t) => ((t - t0) / span) * w;
    const Y = (v) => base - (v / max) * (h - top);
    const build = (pts) => {
      if (pts.length < 2) return null;
      const line = pts.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(1) + " " + Y(p.v).toFixed(1)).join(" ");
      const area = `M${X(pts[0].t).toFixed(1)} ${base} ` + line.slice(1) +
        ` L${X(pts[pts.length - 1].t).toFixed(1)} ${base} Z`;
      return { line, area };
    };
    return { dn: build(dn), up: build(up), max, base };
  }

  view(hass, cfg) {
    const dn = num(hass, cfg.download);
    const up = num(hass, cfg.upload);
    const ping = num(hass, cfg.ping);
    const unitDn = uom(hass, cfg.download, "Mbit/s");
    const unitUp = uom(hass, cfg.upload, "Mbit/s");

    /* Online: eigener Sensor, sonst am Durchsatz erkannt */
    let online;
    if (cfg.online_entity) online = isReachable(hass, cfg.online_entity);
    else online = dn !== null && dn > 0;

    const status = online
      ? "Online" + (ping !== null ? " · " + fmt0(ping) + " ms" : "")
      : "Offline";

    const w = 300, h = 130;
    const m = online ? this._curves(w, h) : null;

    return {
      tone: "ocean",
      from: online ? "#0E7490" : "#3F2A34",
      to: online ? "#04161C" : "#120C11",
      ink: "#EAFDFF",
      fill: 0, quiet: false,
      online,
      sig: [dn, up, ping, online, (this._dn || []).length, (this._up || []).length],
      layers: `<span class="n-sweep"></span>`,
      head: `<div class="top" id="head">
               <span class="badge n-badge"><svg viewBox="0 0 24 24">${online ? NICON.net : NICON.off}</svg></span>
               <span class="lbl">
                 <p class="name">${esc(cfg.title)}</p>
                 <span class="state">
                   <span class="n-ping"><span class="core"></span><span class="ring"></span></span>${esc(status)}
                 </span>
               </span>
             </div>`,
      body: m
        ? `<div class="n-plot"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
             <defs>
               <filter id="n-glow" x="-20%" y="-50%" width="140%" height="220%">
                 <feGaussianBlur stdDeviation="2.6" result="b"/>
                 <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
               </filter>
               <linearGradient id="n-gd" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0" stop-color="#22D3EE" stop-opacity=".5"/>
                 <stop offset="1" stop-color="#22D3EE" stop-opacity=".02"/>
               </linearGradient>
               <linearGradient id="n-gu" x1="0" y1="0" x2="0" y2="1">
                 <stop offset="0" stop-color="#A7F3D0" stop-opacity=".42"/>
                 <stop offset="1" stop-color="#A7F3D0" stop-opacity=".02"/>
               </linearGradient>
             </defs>
             ${[.33, .66].map((f) => `<line class="n-grid" x1="0" y1="${(h * f).toFixed(0)}" x2="${w}" y2="${(h * f).toFixed(0)}"/>`).join("")}
             <line class="n-axis" x1="0" y1="${h}" x2="${w}" y2="${h}"/>
             ${m.dn ? `<path d="${m.dn.area}" fill="url(#n-gd)"/>` : ""}
             ${m.up ? `<path d="${m.up.area}" fill="url(#n-gu)"/>` : ""}
             ${m.up ? `<path d="${m.up.line}" fill="none" stroke="#A7F3D0" stroke-width="1.9"
                 filter="url(#n-glow)" vector-effect="non-scaling-stroke"/>` : ""}
             ${m.dn ? `<path d="${m.dn.line}" fill="none" stroke="#67E8F9" stroke-width="2.3"
                 filter="url(#n-glow)" vector-effect="non-scaling-stroke"/>` : ""}
           </svg></div>`
        : `<div class="n-plot"><div class="n-empty">${
            !online ? "Keine Verbindung"
              : (cfg.download || cfg.upload) ? "Verlauf wird geladen…" : "Keine Entitäten gewählt."
          }</div></div>`,
      foot: `<div class="n-nums">
               <div>
                 <div class="n-big n-dn">${online ? fmt(dn) : "–"}<small>${esc(unitDn)}</small></div>
                 <div class="n-cap"><svg viewBox="0 0 24 24">${NICON.down}</svg>Download</div>
               </div>
               <div>
                 <div class="n-big n-up">${online ? fmt(up) : "–"}<small>${esc(unitUp)}</small></div>
                 <div class="n-cap"><svg viewBox="0 0 24 24">${NICON.up}</svg>Upload</div>
               </div>
             </div>`,
    };
  }

  wire(view) {
    const card = this.shadowRoot.querySelector(".card");
    if (card && view && !view.online) card.classList.add("n-off");
    this._wireHead(this._config.download);
  }
}

register("prism-network-card", PrismNetworkCard, {
  name: "Prism Network Card",
  description: "Quadrat. Online-Zustand mit Puls, Spiegelgraph aus Download und Upload, beide Geschwindigkeiten groß.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "download", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "upload", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "ping", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "online_entity", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "hours", selector: { number: { min: 1, max: 168, mode: "box", unit_of_measurement: "h" } } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  title: "Titel",
  download: "Download-Geschwindigkeit",
  upload: "Upload-Geschwindigkeit",
  ping: "Ping (erscheint in der Statuszeile)",
  online_entity: "Verbindungssensor (leer = am Durchsatz erkannt)",
  hours: "Verlauf: Zeitraum in Stunden",
  tap_action: "Aktion beim Klick auf den Kopf (z. B. Navigation)",
});

/* ══════════════════════════════════════════════════════════════
   11 — Printer Card  ·  Doppel-Quadrat
   ══════════════════════════════════════════════════════════════
   Umsetzung des Entwurfs aus Claude Design: Kopfzeile mit Status-
   pille, links Vorschaubild und Ein-/Ausschalter mit Rückfrage,
   rechts Auftrag, Fortschritt, vier Kacheln und die AMS-Fächer.
   Ist der Drucker aus, zeigt die rechte Spalte den letzten Druck.
   ══════════════════════════════════════════════════════════════ */

/* Farbe eines AMS-Fachs — die Integration liefert RRGGBBAA */
function trayColor(raw) {
  if (!raw) return "#3d4644";
  const hex = String(raw).replace("#", "").slice(0, 6);
  return /^[0-9a-fA-F]{6}$/.test(hex) ? "#" + hex : "#3d4644";
}
/* Minuten als "2h 31m" bzw. "48m" */
function printerLeft(min) {
  if (min === null || isNaN(min)) return "–";
  const m = Math.max(0, Math.round(min));
  return m >= 60 ? Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0") + "m" : m + "m";
}
const PRINT_STAGES = {
  idle: "bereit", printing: "druckt", paused: "pausiert", pause: "pausiert",
  finish: "fertig", failed: "fehler", prepare: "vorbereiten", running: "druckt",
  auto_bed_leveling: "bett nivellieren", heatbed_preheating: "bett heizen",
  heating_hotend: "düse heizen", cleaning_nozzle_tip: "düse reinigen",
  inspecting_first_layer: "erste schicht", calibrating_extrusion: "kalibrieren",
  scanning_bed_surface: "bett scannen", homing_toolhead: "referenzfahrt",
  offline: "standby",
};

const PRINTER_CSS = `
.card{
  color:#EEF1EF;
  border-color:rgba(255,255,255,.09);
  background-color:#121514;
  background-image:
    linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px),
    radial-gradient(90% 80% at 15% 0%, rgba(0,198,94,.09) 0%, rgba(0,0,0,0) 65%);
  background-size:18px 18px, 18px 18px, auto;
  padding:0;
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
}
.card > .wash,.card > .rise,.card > .gloss{display:none}
.card.dbl.pr-full{grid-template-columns:minmax(0,1fr);grid-template-areas:"b";grid-template-rows:minmax(0,1fr)}
.card.pr-full > .zd{display:none}
.card > .zb{position:relative;z-index:3;padding:0;overflow:hidden}

.pr{display:flex;flex-direction:column;height:100%;min-height:0;--ac:#00C65E}
.pr.paused{--ac:#F0A12A}
.pr.off{--ac:#6F7A76}
.pr.err{--ac:#FF5648}

/* Kopfzeile */
.pr-hd{flex:none;display:flex;align-items:center;gap:clamp(7px,calc(var(--u) * .168),12px);
  padding:calc(var(--p-pad) * .82) var(--p-pad);
  border-bottom:1px solid rgba(255,255,255,.07);
  background:linear-gradient(100deg, rgba(0,198,94,.16) 0%, rgba(0,198,94,.05) 55%, rgba(0,0,0,0) 100%)}
.pr.off .pr-hd,.pr.err .pr-hd{background:linear-gradient(100deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,.02) 55%, rgba(0,0,0,0) 100%)}
.pr-badge{width:clamp(28px,calc(var(--u) * .66),42px);height:clamp(28px,calc(var(--u) * .66),42px);flex:none;
  border-radius:calc(var(--p-radius) * .45);background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);
  display:grid;place-items:center}
.pr-badge ha-icon{--mdc-icon-size:clamp(16px,calc(var(--u) * .36),24px);color:#B9E9CD}
.pr-title{min-width:0;display:flex;flex-direction:column;gap:2px}
.pr-name{font-family:var(--p-display);font-weight:800;letter-spacing:-.02em;line-height:1.12;
  font-size:var(--t-title);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-sub{font-family:var(--p-mono);font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:rgba(200,222,210,.58);line-height:1.2;margin-top:.25em;
  font-size:var(--t-state);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-pill{margin-left:auto;flex:none;display:flex;align-items:center;gap:.55em;
  padding:calc(var(--u) * .13) calc(var(--u) * .26) calc(var(--u) * .13) calc(var(--u) * .2);
  border-radius:999px;background:rgba(0,0,0,.32);border:1px solid rgba(0,198,94,.35)}
.pr.paused .pr-pill{border-color:rgba(240,161,42,.35)}
.pr.off .pr-pill,.pr.err .pr-pill{border-color:rgba(255,255,255,.12)}
.pr-dot{width:clamp(7px,calc(var(--u) * .17),10px);aspect-ratio:1;border-radius:50%;background:var(--ac)}
.pr.live .pr-dot{animation:pr-pulse 1.8s ease-in-out infinite}
@keyframes pr-pulse{0%,100%{opacity:1}50%{opacity:.35}}
.pr-status{font-family:var(--p-display);font-weight:700;color:#5CE09A;
  font-size:clamp(10px,calc(var(--u) * .281),16px);white-space:nowrap}
.pr.paused .pr-status{color:#F0B45C}
.pr.off .pr-status{color:#98A39F}
.pr.err .pr-status{color:#FF9184}

/* Zwei Spalten */
.pr-body{flex:1;min-height:0;display:flex}
.pr-left{width:31%;flex:none;box-sizing:border-box;background:rgba(6,8,7,.5);
  border-right:1px solid rgba(255,255,255,.07);
  padding:calc(var(--p-pad) * .9) var(--p-pad);
  display:flex;flex-direction:column;gap:calc(var(--u) * .2)}
.pr-shot{flex:1;min-height:0;position:relative;border-radius:12px;overflow:hidden;
  background-color:rgba(0,0,0,.45);
  background-image:repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 7px, transparent 7px 14px);
  border:1px solid rgba(255,255,255,.08);display:grid;place-items:center;padding:8px}
.pr-shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pr-shot .ph{font-family:var(--p-mono);letter-spacing:.6px;text-align:center;line-height:1.5;
  font-size:clamp(8px,calc(var(--u) * .206),12px);color:#5D6864;white-space:pre-line}
.pr.off .pr-shot .ph{color:#8E9995}
.pr-live{position:absolute;top:8px;left:8px;display:flex;align-items:center;gap:6px;
  padding:4px 9px;border-radius:7px;background:rgba(0,0,0,.66);z-index:2}
.pr-live i{width:6px;height:6px;border-radius:50%;background:#FF5648;animation:pr-pulse 1.6s ease-in-out infinite}
.pr-live b{font-family:var(--p-mono);font-weight:700;letter-spacing:1px;color:#E2E7E4;
  font-size:clamp(8px,calc(var(--u) * .206),12px)}

.pr-btn{flex:none;width:100%;display:flex;align-items:center;justify-content:center;gap:.5em;
  border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#B3BCB8;
  font-family:var(--p-display);font-weight:600;cursor:pointer;
  font-size:clamp(10px,calc(var(--u) * .3),17px);
  padding:calc(var(--u) * .19) 0;border-radius:12px;transition:filter .18s,background .18s}
.pr-btn:hover{filter:brightness(1.35)}
.pr-btn.go{border-color:rgba(0,198,94,.45);background:rgba(0,198,94,.18);color:#6EE7A5}
.pr-btn.warn{border-color:rgba(255,86,72,.55);background:rgba(255,86,72,.22);color:#FF9184;font-weight:700}
.pr-btn.ghost{border-color:rgba(255,255,255,.14);background:transparent;color:#A8B2AE;
  font-size:clamp(9.5px,calc(var(--u) * .28),16px);padding:calc(var(--u) * .13) 0}
.pr-confirm{flex:none;display:flex;flex-direction:column;gap:calc(var(--u) * .13)}

.pr-right{flex:1;min-width:0;box-sizing:border-box;
  padding:calc(var(--p-pad) * .9) var(--p-pad);
  display:flex;flex-direction:column;gap:calc(var(--u) * .19);min-height:0}
.pr-jobline{flex:none;display:flex;align-items:baseline;gap:.7em}
.pr-job{min-width:0;flex:1;line-height:1.35;font-family:var(--p-display);font-weight:600;letter-spacing:-.2px;
  font-size:clamp(11px,calc(var(--u) * .338),20px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-eta{font-family:var(--p-mono);color:#9AA5A1;white-space:nowrap;flex:none;
  font-size:clamp(9px,calc(var(--u) * .263),15px)}

.pr-prog{flex:none;display:flex;flex-direction:column;gap:calc(var(--u) * .13)}
.pr-progtop{display:flex;align-items:baseline;gap:.7em}
.pr-pct{display:flex;align-items:baseline;gap:3px}
.pr-pct b{font-family:var(--p-display);font-weight:700;letter-spacing:-1.3px;line-height:1;
  font-size:clamp(20px,calc(var(--u) * .6),36px)}
.pr-pct i{font-family:var(--p-display);font-style:normal;font-weight:600;color:#7D8985;
  font-size:clamp(11px,calc(var(--u) * .319),19px)}
.pr-lbl{font-family:var(--p-mono);letter-spacing:1px;color:#6F7A76;
  font-size:clamp(8px,calc(var(--u) * .225),13px)}
.pr-rest{font-family:var(--p-display);font-weight:700;letter-spacing:-.6px;
  font-size:clamp(13px,calc(var(--u) * .394),23px)}
.pr-bar{height:clamp(7px,calc(var(--u) * .206),13px);border-radius:999px;background:rgba(0,0,0,.45);
  border:1px solid rgba(255,255,255,.06);overflow:hidden}
.pr-bar i{display:block;height:100%;border-radius:999px;background-color:var(--ac);
  background-image:repeating-linear-gradient(115deg, rgba(255,255,255,.3) 0 7px, transparent 7px 16px);
  transition:width .4s ease}
.pr.live .pr-bar i{animation:pr-crawl 1.1s linear infinite}
@keyframes pr-crawl{to{background-position:16px 0}}

.pr-tiles{flex:none;display:flex;gap:calc(var(--u) * .13)}
.pr-tile{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;
  padding:calc(var(--u) * .15) calc(var(--u) * .17);border-radius:11px;
  background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.07)}
.pr.off .pr-tile{background:rgba(0,0,0,.28);border-color:rgba(255,255,255,.05)}
.pr-tile .k{font-family:var(--p-mono);letter-spacing:.8px;color:#6F7A76;
  font-size:clamp(7.5px,calc(var(--u) * .206),12px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-tile .v{font-family:var(--p-display);font-weight:700;letter-spacing:-.6px;line-height:1.15;
  font-size:clamp(10px,calc(var(--u) * .356),20px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr.off .pr-tile .v{color:#9AA5A1}

.pr-ams{flex:none;display:flex;align-items:center;gap:.6em;min-width:0}
.pr-ams > .k{font-family:var(--p-mono);letter-spacing:1px;color:#6F7A76;flex:none;
  font-size:clamp(8px,calc(var(--u) * .225),13px)}
.pr-slots{display:flex;gap:calc(var(--u) * .11);flex:1;min-width:0}
.pr-slot{flex:1;min-width:0;display:flex;align-items:center;gap:.45em;
  padding:calc(var(--u) * .09) calc(var(--u) * .15) calc(var(--u) * .09) calc(var(--u) * .09);
  border-radius:999px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.14)}
.pr-slot.active{border-color:var(--ac);box-shadow:0 0 0 1px var(--ac) inset}
.pr-slot i{width:clamp(11px,calc(var(--u) * .28),17px);aspect-ratio:1;flex:none;border-radius:4px;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)}
.pr-slot b{font-family:var(--p-mono);font-weight:400;color:#C3CCC8;
  font-size:clamp(8px,calc(var(--u) * .234),13px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* Ausgeschaltet: AMS groß */
.pr-amsbig{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:calc(var(--u) * .13)}
.pr-bigrow{flex:1;min-height:0;display:flex;gap:calc(var(--u) * .13)}
.pr-bigslot{flex:1;min-width:0;display:flex;flex-direction:column;gap:calc(var(--u) * .1);
  border-radius:12px;padding:calc(var(--u) * .13);background:rgba(0,0,0,.32);
  border:1px solid rgba(255,255,255,.08)}
.pr-bigslot i{flex:1;min-height:clamp(14px,calc(var(--u) * .5),34px);border-radius:8px;
  box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)}
.pr-bigslot b{font-family:var(--p-mono);font-weight:400;color:#C3CCC8;text-align:center;
  font-size:clamp(8px,calc(var(--u) * .234),13px);line-height:1.2;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-bigslot.empty i{background:repeating-linear-gradient(135deg,rgba(255,255,255,.06) 0 6px,transparent 6px 12px) !important}
.pr-bigslot.empty b{color:#6F7A76}

/* Ausgeschaltet */
.pr-blockk{font-family:var(--p-mono);letter-spacing:1px;color:#6F7A76;
  font-size:clamp(8px,calc(var(--u) * .225),13px)}
.pr-off-big{font-family:var(--p-display);font-weight:700;letter-spacing:-.8px;line-height:1.2;color:#B9C2BE;
  font-size:clamp(14px,calc(var(--u) * .431),25px)}
.pr-last{font-family:var(--p-display);font-weight:600;line-height:1.35;letter-spacing:-.2px;color:#D5DBD8;
  font-size:clamp(11px,calc(var(--u) * .319),19px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-lastmeta{font-family:var(--p-mono);color:#8E9995;
  font-size:clamp(9px,calc(var(--u) * .244),14px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-grow{flex:1;min-height:0}
@media (prefers-reduced-motion: reduce){.pr .pr-dot,.pr-bar i,.pr-live i{animation:none}}
`;

class PrismPrinterCard extends PrismCard {
  static defaults = { name: "Bambu P1S", model: "P1S", confirm_power: true };
  static stub = { name: "Bambu P1S" };
  static double = true;
  static css = PRINTER_CSS;

  setConfig(config) {
    super.setConfig(config);
    this._confirm = false;
  }

  _trays(hass, cfg) {
    const list = toList(cfg.ams_trays);
    return list.map((id) => {
      const st = hass.states[id];
      if (!st) return null;
      const a = st.attributes || {};
      const empty = a.empty === true || ["unknown", "unavailable", "empty", ""].includes(String(st.state).toLowerCase());
      return {
        name: empty ? "leer" : (a.name || st.state),
        color: empty ? "#1C1F1E" : trayColor(a.color),
        active: a.active === true,
        empty,
      };
    }).filter(Boolean);
  }

  view(hass, cfg) {
    const powerSt = cfg.power_entity ? hass.states[cfg.power_entity] : null;
    const online = cfg.online_entity ? isReachable(hass, cfg.online_entity) : true;
    const on = powerSt ? powerSt.state === "on" : online;

    const statusRaw = String(stateOf(hass, cfg.status_entity) || "").toLowerCase();
    const stageRaw = String(stateOf(hass, cfg.stage_entity) || "").toLowerCase();
    const errors = cfg.error_entity ? stateOf(hass, cfg.error_entity) === "on" : false;
    const paused = statusRaw === "pause" || statusRaw === "paused";
    const printing = on && ["running", "printing", "prepare"].includes(statusRaw);
    const finished = statusRaw === "finish";

    const pct = num(hass, cfg.progress_entity);
    const layer = num(hass, cfg.layer_entity);
    const layers = num(hass, cfg.layers_entity);
    const nozzle = num(hass, cfg.nozzle_temp);
    const bed = num(hass, cfg.bed_temp);
    const chamber = num(hass, cfg.chamber_temp);
    const remain = num(hass, cfg.remaining_entity);
    const job = stateOf(hass, cfg.task_entity);
    const jobTxt = job && !["unknown", "unavailable", ""].includes(String(job).toLowerCase()) ? job : "Kein Auftrag";
    const weight = num(hass, cfg.weight_entity);
    const length = num(hass, cfg.length_entity);
    const total = num(hass, cfg.total_entity);
    const trays = this._trays(hass, cfg);

    /* Endzeit: eigener Sensor, sonst aus der Restzeit gerechnet */
    let eta = stateOf(hass, cfg.end_entity);
    const etaDate = eta ? new Date(eta) : null;
    if (!etaDate || isNaN(etaDate)) {
      eta = remain !== null && remain > 0
        ? new Date(Date.now() + remain * 60000).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
        : "–";
    } else {
      eta = etaDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    }

    const mode = !on ? "off" : errors ? "err" : paused ? "paused" : "";
    const statusLabel = !on ? "Offline" : errors ? "Fehler" : paused ? "Pausiert"
      : printing ? "Printing" : finished ? "Fertig" : "Bereit";
    const sub = (cfg.model || "P1S") + " · " +
      (!on ? "standby · lan" : PRINT_STAGES[stageRaw] || PRINT_STAGES[statusRaw] || statusRaw || "bereit");

    const picture = cfg.hide_image === true ? null
      : (cfg.image_url || (hass.states[cfg.image_entity] && hass.states[cfg.image_entity].attributes.entity_picture));

    const temp = (v) => v === null ? "–" : fmt0(v) + "°C";
    /* Ausgeschaltet ist Platz frei — dann bekommen die Fächer eine eigene
       Reihe mit großen Farbfeldern statt schmaler Pillen. */
    const bigSlots = () => !trays.length ? "" : `
      <div class="pr-amsbig">
        <span class="pr-blockk">AMS</span>
        <div class="pr-bigrow">${trays.map((t) => `
          <span class="pr-bigslot ${t.empty ? "empty" : ""}">
            <i style="background:${esc(t.color)}"></i>
            <b>${esc(t.name)}</b>
          </span>`).join("")}</div>
      </div>`;

    const slots = () => trays.length ? `<div class="pr-ams"><span class="k">AMS</span>
        <div class="pr-slots">${trays.map((s) => `<span class="pr-slot ${s.active ? "active" : ""}">
          <i style="background:${esc(s.color)}"></i><b>${esc(s.name)}</b></span>`).join("")}</div></div>` : "";

    /* Rechte Spalte, laufender Betrieb */
    const running = `
      <div class="pr-jobline">
        <span class="pr-job">${esc(jobTxt)}</span>
        <span class="pr-eta">fertig ${esc(eta)}</span>
      </div>
      <div class="pr-prog">
        <div class="pr-progtop">
          <span class="pr-pct"><b>${pct === null ? "–" : fmt0(pct)}</b><i>%</i></span>
          <span style="flex:1"></span>
          <span class="pr-lbl">RESTZEIT</span>
          <span class="pr-rest">${esc(printerLeft(remain))}</span>
        </div>
        <div class="pr-bar" id="pr-bar"><i style="width:${pct === null ? 0 : Math.max(0, Math.min(100, pct))}%"></i></div>
      </div>
      <div class="pr-tiles">
        <div class="pr-tile" data-mi="${esc(cfg.layer_entity || "")}">
          <span class="k">LAYER</span><span class="v">${layers ? fmt0(layer) + "/" + fmt0(layers) : "–"}</span></div>
        <div class="pr-tile" data-mi="${esc(cfg.nozzle_temp || "")}">
          <span class="k">DÜSE</span><span class="v">${temp(nozzle)}</span></div>
        <div class="pr-tile" data-mi="${esc(cfg.bed_temp || "")}">
          <span class="k">BETT</span><span class="v">${temp(bed)}</span></div>
        <div class="pr-tile" data-mi="${esc(cfg.chamber_temp || cfg.weight_entity || "")}">
          <span class="k">${chamber !== null ? "KAMMER" : "GEWICHT"}</span>
          <span class="v">${chamber !== null ? temp(chamber) : (weight === null ? "–" : fmt(weight, 1) + " g")}</span></div>
      </div>
      <span class="pr-grow"></span>
      ${slots()}`;

    /* Rechte Spalte, ausgeschaltet */
    const lastMeta = [
      length !== null ? fmt(length, 2) + " m" : null,
      weight !== null ? fmt(weight, 1) + " g" : null,
      total !== null ? fmt0(total) + " h gesamt" : null,
    ].filter(Boolean).join(" · ");
    const offView = `
      <div style="flex:none;display:flex;flex-direction:column;gap:1px">
        <span class="pr-blockk">DRUCKER</span>
        <span class="pr-off-big">Ausgeschaltet</span>
      </div>
      <div style="flex:none;display:flex;flex-direction:column;gap:1px">
        <span class="pr-blockk">LETZTER DRUCK</span>
        <span class="pr-last">${esc(jobTxt)}</span>
        <span class="pr-lastmeta">${esc(lastMeta || "keine Daten")}</span>
      </div>
      <span class="pr-grow"></span>
      ${bigSlots()}`;

    /* Linke Spalte */
    const powerBlock = !cfg.power_entity ? "" : (this._confirm
      ? `<div class="pr-confirm">
           <button class="pr-btn warn" id="pr-yes">Wirklich aus</button>
           <button class="pr-btn ghost" id="pr-no">Abbrechen</button>
         </div>`
      : `<button class="pr-btn ${on ? "" : "go"}" id="pr-power">⏻ ${on ? "Drucker aus" : "Einschalten"}</button>`);

    return {
      tone: "forest", ink: "#EEF1EF",
      fill: 0, quiet: false,
      mode, live: printing,
      sig: [on, statusRaw, stageRaw, errors, pct, layer, layers, nozzle, bed, chamber, remain,
        jobTxt, eta, trays.map((t) => t.name + t.color + t.active).join("|"), this._confirm],
      head: "", foot: "",
      body: `<div class="pr ${mode} ${printing ? "live" : ""}">
        <div class="pr-hd">
          <span class="pr-badge"><ha-icon icon="${cfg.icon || "mdi:printer-3d"}"></ha-icon></span>
          <span class="pr-title">
            <span class="pr-name">${esc(cfg.name)}</span>
            <span class="pr-sub">${esc(sub)}</span>
          </span>
          <span class="pr-pill" id="pr-head">
            <span class="pr-dot"></span><span class="pr-status">${esc(statusLabel)}</span>
          </span>
        </div>
        <div class="pr-body">
          <div class="pr-left">
            <div class="pr-shot" id="pr-shot">
              ${picture ? `<img src="${esc(picture)}" alt="${esc(jobTxt)}">` : ""}
              ${!picture ? `<span class="ph">${on ? "druckbild\n" + esc(String(jobTxt).slice(0, 22)) : "kein signal"}</span>` : ""}
              ${printing ? `<span class="pr-live"><i></i><b>LIVE</b></span>` : ""}
            </div>
            ${powerBlock}
          </div>
          <div class="pr-right">${on ? running : offView}</div>
        </div>
      </div>`,
    };
  }

  wire(view) {
    const cfg = this._config;
    const card = this.shadowRoot.querySelector(".card");
    if (card) card.classList.add("pr-full");

    this._on("pr-power", () => {
      if (!cfg.power_entity) return;
      const on = this._hass.states[cfg.power_entity] &&
        this._hass.states[cfg.power_entity].state === "on";
      /* Ausschalten wird abgefragt, Einschalten sofort ausgeführt */
      if (on && cfg.confirm_power !== false) { this._confirm = true; this._sig = null; this._render(); return; }
      this._hass.callService("switch", on ? "turn_off" : "turn_on", { entity_id: cfg.power_entity });
    });
    this._on("pr-yes", () => {
      this._confirm = false;
      this._hass.callService("switch", "turn_off", { entity_id: cfg.power_entity });
      this._sig = null; this._render();
    });
    this._on("pr-no", () => { this._confirm = false; this._sig = null; this._render(); });
    this._on("pr-shot", () => this._moreInfo(cfg.camera_entity || cfg.image_entity));
    this._on("pr-head", () => this._moreInfo(cfg.status_entity));
    this.shadowRoot.querySelectorAll(".pr-tile[data-mi]").forEach((el) => {
      const id = el.getAttribute("data-mi");
      if (id) el.addEventListener("click", () => this._moreInfo(id));
    });
    this._on("pr-bar", () => this._moreInfo(cfg.progress_entity));
  }
}

register("prism-printer-card", PrismPrinterCard, {
  name: "Prism Printer Card",
  description: "Doppel-Quadrat. Bambu-Lab-Drucker mit Vorschaubild, Fortschritt, Kacheln und AMS-Fächern.",
}, [
  { name: "name", selector: { text: {} } },
  { name: "model", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "status_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "stage_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "progress_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "remaining_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "end_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "task_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "layer_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "layers_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "nozzle_temp", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "bed_temp", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "chamber_temp", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "weight_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "length_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "total_entity", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "ams_trays", selector: { entity: { multiple: true, filter: [{ domain: "sensor" }] } } },
  { name: "image_entity", selector: { entity: { filter: [{ domain: "image" }] } } },
  { name: "image_url", selector: { text: {} } },
  { name: "hide_image", selector: { boolean: {} } },
  { name: "camera_entity", selector: { entity: { filter: [{ domain: "camera" }] } } },
  { name: "error_entity", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "online_entity", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "power_entity", selector: { entity: { filter: [{ domain: "switch" }] } } },
  { name: "confirm_power", selector: { boolean: {} } },
], {
  name: "Titel",
  model: "Modell in der Statuszeile",
  icon: "Icon im Kopf",
  status_entity: "Druckstatus",
  stage_entity: "Aktuelle Phase",
  progress_entity: "Fortschritt in Prozent",
  remaining_entity: "Restzeit in Minuten",
  end_entity: "Endzeit (leer = aus der Restzeit gerechnet)",
  task_entity: "Name des Auftrags",
  layer_entity: "Aktuelle Schicht",
  layers_entity: "Schichten gesamt",
  nozzle_temp: "Düsentemperatur",
  bed_temp: "Betttemperatur",
  chamber_temp: "Kammertemperatur (leer = vierte Kachel zeigt das Druckgewicht)",
  weight_entity: "Gewicht des Drucks",
  length_entity: "Filamentlänge",
  total_entity: "Gesamtnutzung in Stunden",
  ams_trays: "AMS-Fächer (Reihenfolge = Anzeige)",
  image_entity: "Titelbild",
  image_url: "Eigenes Bild per URL",
  hide_image: "Bild ausblenden",
  camera_entity: "Kamera (öffnet sich beim Klick aufs Bild)",
  error_entity: "Fehlermelder",
  online_entity: "Erreichbarkeit",
  power_entity: "Steckdose zum Ein- und Ausschalten",
  confirm_power: "Ausschalten mit Rückfrage",
});

/* ══════════════════════════════════════════════════════════════
   12 — Vacuum Card  ·  Viertel-Quadrat
   ══════════════════════════════════════════════════════════════
   Ein Roboter je Karte, Größe wie die Mini-Karte (grid_columns: 3).
   Aufbau nach Entwurf A: großes Icon, darunter Name und der Wert des
   Moments, unten die Zusatzzeile. Icon, Farbe und große Zahl wechseln
   mit dem Zustand.
   ══════════════════════════════════════════════════════════════ */

/* Zustand → Icon, Ton, Wort. Reihenfolge der Prüfung steht in _phase(). */
const VAC_LOOK = {
  cleaning:  { icon: "mdi:robot-vacuum-variant", tone: "violet", word: "Reinigt",       spin: true },
  mopping:   { icon: "mdi:robot-vacuum-variant", tone: "sky",    word: "Wischt",        spin: true },
  returning: { icon: "mdi:home-import-outline",  tone: "sky",    word: "Rückweg",       blink: true },
  paused:    { icon: "mdi:pause-circle-outline", tone: "sand",   word: "Pause" },
  charging:  { icon: "mdi:battery-charging-60",  tone: "solar",  word: "Lädt",          blink: true },
  docked:    { icon: "mdi:robot-vacuum",         tone: "mint",   word: "Station" },
  idle:      { icon: "mdi:robot-vacuum",         tone: "teal",   word: "Bereit" },
  low:       { icon: "mdi:battery-alert-variant-outline", tone: "ember", word: "Akku schwach", blink: true },
  error:     { icon: "mdi:robot-vacuum-alert",   tone: "rose",   word: "Fehler",        blink: true },
  offline:   { icon: "mdi:lan-disconnect",       tone: "slate",  word: "Offline" },
};

const VACUUM_CSS = `
/* Icon als Wasserzeichen hinter dem Text. Es liegt auf Kartenebene,
   ragt über den Rand hinaus und wird von der Karte rund beschnitten —
   dadurch überlagert es den Text nicht mehr. */
.v-wm{position:absolute;right:-12%;bottom:-14%;z-index:0;line-height:0;
  opacity:.24;pointer-events:none}
.v-wm ha-icon{--mdc-icon-size:clamp(70px,calc(var(--u) * 2.76),200px);width:auto;height:auto;display:block}
.card.quiet .v-wm{opacity:.16}
.v-wm .spin{animation:v-spin 4s linear infinite;transform-origin:50% 50%;display:block}
@keyframes v-spin{to{transform:rotate(360deg)}}

.v-l{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;gap:.15em}
.v-sp{flex:1;min-height:0}
.v-pill{align-self:flex-start;display:inline-flex;align-items:center;gap:.4em;
  font-family:var(--p-mono);font-weight:700;font-size:clamp(7.5px,calc(var(--u) * 0.15),11px);
  letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;max-width:100%;
  padding:.4em .7em;border-radius:999px;background:rgba(11,10,20,.20);
  overflow:hidden;text-overflow:ellipsis}
.card.quiet .v-pill{background:rgba(255,255,255,.10)}
.v-pill .dt{width:.55em;height:.55em;border-radius:50%;background:currentColor;flex:none}
.v-pill .dt.blink{animation:v-blink 1.7s ease-in-out infinite}
@keyframes v-blink{0%,100%{opacity:1}50%{opacity:.35}}

.v-val{font-family:var(--p-mono);font-weight:700;font-variant-numeric:tabular-nums;
  letter-spacing:-.04em;line-height:.95;font-size:clamp(19px,calc(var(--u) * 0.63),44px);
  display:flex;align-items:baseline;gap:.06em}
.v-val small{font-size:.38em;font-weight:500;opacity:.72}
.v-val.txt{font-family:var(--p-display);font-size:clamp(15px,calc(var(--u) * 0.45),30px);letter-spacing:-.02em}
/* Der Name darf umbrechen statt abzuschneiden — bei zwei Spalten Breite
   passen längere Gerätenamen sonst nicht in eine Zeile. Zwei Zeilen sind das
   Maximum, danach wird gekürzt. */
.v-nm{font-family:var(--p-display);font-weight:700;letter-spacing:-.02em;line-height:1.12;
  font-size:clamp(9.5px,calc(var(--u) * 0.258),18px);margin-top:.2em;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
  overflow:hidden;overflow-wrap:anywhere;hyphens:auto}
@media (prefers-reduced-motion: reduce){.v-wm .spin,.v-pill .dt.blink{animation:none}}
`;

class PrismVacuumCard extends PrismCard {
  static defaults = { low_battery: 20, service_warn: 20 };
  static stub = {};
  static gridOpts = MINI_GRID;
  static css = VACUUM_CSS;

  /* Akkustand: eigener Sensor, sonst das Attribut der Vacuum-Entität */
  _battery(hass, cfg) {
    const b = num(hass, cfg.battery);
    if (b !== null) return b;
    const st = cfg.entity ? hass.states[cfg.entity] : null;
    const v = st && st.attributes.battery_level;
    return typeof v === "number" ? v : null;
  }
  /* Verbrauchsmaterial steckt in den Attributen der Vacuum-Entität */
  _consumable(hass, cfg) {
    const st = cfg.entity ? hass.states[cfg.entity] : null;
    if (!st) return null;
    const keys = {
      main_brush_left: "Hauptbürste", side_brush_left: "Seitenbürste",
      filter_left: "Filter", sensor_dirty_left: "Sensoren",
      mop_pad_left: "Wischpad", detergent_left: "Reinigungsmittel",
    };
    let worst = null;
    for (const k in keys) {
      const v = st.attributes[k];
      if (typeof v !== "number") continue;
      if (!worst || v < worst.v) worst = { v, name: keys[k] };
    }
    return worst;
  }

  _phase(hass, cfg, batt) {
    const st = cfg.entity ? hass.states[cfg.entity] : null;
    if (!st || ["unavailable", "unknown"].includes(st.state)) return "offline";
    const s = String(st.state).toLowerCase();
    const a = st.attributes || {};

    const errTxt = cfg.error_entity ? stateOf(hass, cfg.error_entity) : a.error;
    const hasError = s === "error"
      || (errTxt && !["no_error", "none", "ok", "unknown", "unavailable", ""].includes(String(errTxt).toLowerCase()));
    if (hasError) return "error";

    if (s === "cleaning") {
      const mode = String(a.cleaning_mode || stateOf(hass, cfg.mode_entity) || "").toLowerCase();
      return mode.includes("mop") || mode.includes("wisch") ? "mopping" : "cleaning";
    }
    if (s === "returning") return "returning";
    if (s === "paused") return "paused";

    const charging = a.charging === true
      || (cfg.charging_entity && stateOf(hass, cfg.charging_entity) === "on");
    if (charging && batt !== null && batt < 100) return "charging";

    if (batt !== null && batt <= (parseFloat(cfg.low_battery) || 20) && s !== "docked") return "low";
    if (s === "docked") return "docked";
    return "idle";
  }

  view(hass, cfg) {
    const st = cfg.entity ? hass.states[cfg.entity] : null;
    const batt = this._battery(hass, cfg);
    const phase = this._phase(hass, cfg, batt);
    const look = VAC_LOOK[phase] || VAC_LOOK.idle;

    const name = cfg.name || (st ? friendly(hass, cfg.entity) : "Staubsauger");
    const area = num(hass, cfg.area) !== null ? num(hass, cfg.area)
      : (st && typeof st.attributes.cleaned_area === "number" ? st.attributes.cleaned_area : null);
    const mins = num(hass, cfg.duration) !== null ? num(hass, cfg.duration)
      : (st && typeof st.attributes.cleaning_time === "number" ? st.attributes.cleaning_time : null);
    const room = cfg.room ? stateOf(hass, cfg.room) : null;
    const roomTxt = room && !["unknown", "unavailable", "none"].includes(String(room).toLowerCase()) ? room : null;

    const lastRaw = cfg.last_clean ? stateOf(hass, cfg.last_clean) : null;
    let lastTxt = null;
    if (lastRaw && !["unknown", "unavailable"].includes(String(lastRaw).toLowerCase())) {
      const d = new Date(lastRaw);
      if (!isNaN(d)) {
        const sameDay = d.toDateString() === new Date().toDateString();
        lastTxt = sameDay
          ? d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
          : d.toLocaleDateString("de-DE", { weekday: "short" });
      }
    }
    const worst = this._consumable(hass, cfg);

    /* Große Zahl: unterwegs die Fläche, sonst der Akku, bei Störung das Wort */
    /* Fälliges Verbrauchsmaterial — meldet sich in der Zusatzzeile,
       übernimmt aber nicht die ganze Karte. */
    const warn = parseFloat(cfg.service_warn);
    const service = worst && worst.v <= (isNaN(warn) ? 20 : warn)
      && ["docked", "idle", "charging"].includes(phase);

    let big;
    if (phase === "offline") big = { v: "Offline", txt: true };
    else if (phase === "error") big = { v: "Fehler", txt: true };
    else if ((phase === "cleaning" || phase === "mopping" || phase === "paused") && area !== null)
      big = { v: fmt0(area), u: "m²" };
    else big = { v: batt === null ? "–" : fmt0(batt), u: "%" };

    /* Zusatzzeile: Zustand plus der nächstwichtige Hinweis */
    let sub;
    if (phase === "offline") sub = "Keine Verbindung";
    else if (phase === "error") sub = (roomTxt ? roomTxt + " · " : "") + "Eingriff nötig";
    else if (service) sub = worst.name + (worst.v <= 0 ? " überfällig" : " bei " + fmt0(worst.v) + " %");
    else if (phase === "cleaning" || phase === "mopping")
      sub = look.word + (roomTxt ? " · " + roomTxt : mins !== null ? " · " + fmt0(mins) + " min" : "");
    else if (phase === "paused") sub = "Pause" + (roomTxt ? " · " + roomTxt : "");
    else if (phase === "returning") sub = "Rückweg zur Station";
    else if (phase === "charging") sub = "Lädt";
    else sub = look.word + (lastTxt ? " · " + lastTxt : "");

    return {
      tone: service ? "sand" : look.tone,
      fill: cfg.hide_fill === true || batt === null ? 0 : batt,
      quiet: phase === "offline",
      sig: [phase, service, batt, area, mins, roomTxt, lastTxt, worst && worst.v, name],
      head: "", foot: "",
      layers: `<div class="v-wm"><ha-icon icon="${cfg.icon || (service ? "mdi:broom" : look.icon)}"
                 class="${look.spin ? "spin" : ""}"></ha-icon></div>`,
      body: `<div class="v-l">
               <span class="v-pill"><span class="dt${look.blink ? " blink" : ""}"></span>${esc(
                 service ? "Wartung" : look.word)}</span>
               <span class="v-sp"></span>
               <div class="v-val ${big.txt ? "txt" : ""}">${esc(big.v)}${
                 big.u ? `<small>${esc(big.u)}</small>` : ""}</div>
               <div class="v-nm">${esc(name)}</div>
             </div>`,
    };
  }

  wire() {
    const cfg = this._config;
    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;
    card.style.cursor = "pointer";
    card.addEventListener("click", () => {
      if (cfg.tap_action && cfg.tap_action.action) {
        this._act(cfg.entity, cfg.tap_action, "none");
        return;
      }
      this._moreInfo(cfg.entity);
    });
  }
}

register("prism-vacuum-card", PrismVacuumCard, {
  name: "Prism Vacuum Card",
  description: "Viertel-Quadrat, ein Roboter je Karte. Icon, Farbe und große Zahl wechseln mit dem Zustand.",
}, [
  { name: "entity", selector: { entity: { filter: [{ domain: "vacuum" }] } } },
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "battery", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "area", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "duration", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "room", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "last_clean", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "error_entity", selector: { entity: { filter: [{ domain: "sensor" }, { domain: "binary_sensor" }] } } },
  { name: "charging_entity", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "mode_entity", selector: { entity: { filter: [{ domain: "select" }, { domain: "sensor" }] } } },
  { name: "low_battery", selector: { number: { min: 5, max: 50, mode: "box", unit_of_measurement: "%" } } },
  { name: "service_warn", selector: { number: { min: 0, max: 50, mode: "box", unit_of_measurement: "%" } } },
  { name: "hide_fill", selector: { boolean: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  entity: "Staubsauger (vacuum-Entität)",
  name: "Beschriftung (leer = Name der Entität)",
  icon: "Icon fest vorgeben (leer = wechselt mit dem Zustand)",
  battery: "Akkustand (leer = Attribut der Vacuum-Entität)",
  area: "Gereinigte Fläche (leer = Attribut cleaned_area)",
  duration: "Reinigungsdauer (leer = Attribut cleaning_time)",
  room: "Aktueller Raum",
  last_clean: "Letzte Reinigung (Zeitstempel)",
  error_entity: "Fehlermelder (leer = Attribut error)",
  charging_entity: "Ladezustand (leer = Attribut charging)",
  mode_entity: "Reinigungsmodus (trennt Saugen von Wischen)",
  low_battery: "Schwelle für „Akku schwach“",
  service_warn: "Schwelle für „Wartung fällig“ (Verbrauchsmaterial)",
  hide_fill: "Lichtkante für den Akkustand ausblenden",
  tap_action: "Aktion beim Antippen (Standard: Dialog öffnen)",
});

/* ══════════════════════════════════════════════════════════════
   13 — System Card  ·  Standard-Quadrat
   ══════════════════════════════════════════════════════════════
   Boot-Log-Optik: Zeilen mit [ OK ], [WARN] und [FAIL], blinkender
   Cursor am Ende, Rasterzeilen und weiches Leuchten wie auf einer
   Röhre. Inhalt: schwache Batterien (nur mit Label), nicht
   erreichbare Zigbee-Geräte, offene Updates.
   ══════════════════════════════════════════════════════════════ */

const SYSTEM_CSS = `
.card{
  color:#B7F7C8;
  background:linear-gradient(160deg,#0B1F14,#061009 60%,#040A07);
  border-color:rgba(74,222,128,.26);
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
}
.card.s-amber{color:#FFD9A0;border-color:rgba(251,191,36,.28);
  background:linear-gradient(160deg,#231605,#150D03 60%,#0B0702)}
.card.s-ice{color:#CFE9FF;border-color:rgba(125,211,252,.28);
  background:linear-gradient(160deg,#0B1B2E,#071120 60%,#040A12)}
.card > .wash,.card > .rise,.card > .gloss{display:none}
.card > .zh,.card > .zb,.card > .zf{position:relative;z-index:3}

/* Röhrenoptik */
.s-scan{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.28;
  background:repeating-linear-gradient(180deg,rgba(255,255,255,.10) 0 1px,transparent 1px 3px)}
.s-vig{position:absolute;inset:0;z-index:2;pointer-events:none;
  background:radial-gradient(120% 90% at 50% 40%,transparent 55%,rgba(0,0,0,.55))}

.card .name{color:#EAFDF0}
.card.s-amber .name{color:#FFF3E0}
.card.s-ice .name{color:#EAF4FF}
.card .badge{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.12)}

/* Log — Schriftgröße skaliert mit der Karte */
.s-code{font-family:var(--p-mono);display:flex;flex-direction:column;justify-content:center;
  min-height:0;overflow:hidden;gap:clamp(2px,calc(var(--u) * 0.072),6px);
  font-size:clamp(8px,calc(var(--u) * 0.204),15px);line-height:1.4}
.s-ln{display:flex;align-items:baseline;gap:.5em;white-space:nowrap;min-width:0}
.s-tag{font-weight:700;flex:none;letter-spacing:-.02em}
.s-txt{overflow:hidden;text-overflow:ellipsis}
.s-ok{color:#4ADE80}.s-wr{color:#FDE047}.s-er{color:#FB7185}
.card.s-amber .s-ok{color:#FCD34D}.card.s-amber .s-wr{color:#FDBA74}
.card.s-ice .s-ok{color:#7DD3FC}.card.s-ice .s-wr{color:#FDE047}
.s-item{opacity:.82;padding-left:1.2em}
.s-dim{opacity:.6}
.s-cur{display:inline-block;width:.6em;height:1.05em;background:currentColor;
  vertical-align:-.15em;margin-left:.35em;animation:s-blink 1.1s steps(2) infinite}
@keyframes s-blink{50%{opacity:0}}
.s-foot{font-family:var(--p-mono);font-size:clamp(7.5px,calc(var(--u) * 0.156),11px);opacity:.6;
  display:flex;justify-content:space-between;gap:1em;white-space:nowrap}
@media (prefers-reduced-motion: reduce){.s-cur{animation:none}}
`;

class PrismSystemCard extends PrismCard {
  static defaults = {
    title: "System", battery_label: "", battery_threshold: 20,
    zigbee_platform: "zha", max_list: 3, theme: "green",
  };
  static stub = { title: "System", battery_label: "" };
  static css = SYSTEM_CSS;

  /* Batterien: nur Sensoren mit dem gewählten Label */
  _batteries(hass, cfg) {
    const limit = parseFloat(cfg.battery_threshold);
    const thr = isNaN(limit) ? 20 : limit;
    const out = [];
    for (const id in hass.states) {
      if (!id.startsWith("sensor.")) continue;
      const st = hass.states[id];
      if (st.attributes.device_class !== "battery") continue;
      if (!hasLabel(hass, id, cfg.battery_label)) continue;
      const v = parseFloat(st.state);
      if (isNaN(v) || v > thr) continue;
      out.push({ id, v, name: friendly(hass, id).replace(/\s*(Battery Level|Batterie(stand)?|Battery)\s*$/i, "") });
    }
    return out.sort((a, b) => a.v - b.v);
  }

  /* Zigbee: nicht erreichbare Entitäten der Integration, nach Gerät zusammengefasst */
  _zigbeeOffline(hass, cfg) {
    const platform = cfg.zigbee_platform || "zha";
    const reg = hass.entities || {};
    const devs = new Map();
    for (const id in reg) {
      const e = reg[id];
      if (!e || e.platform !== platform) continue;
      const st = hass.states[id];
      if (!st || st.state !== "unavailable") continue;
      const did = e.device_id;
      if (!did || devs.has(did)) continue;
      const d = (hass.devices || {})[did] || {};
      devs.set(did, d.name_by_user || d.name || id);
    }
    return [...devs.values()];
  }

  /* Updates: offene Update-Entitäten */
  _updates(hass, cfg) {
    const excl = labelIdsFor(hass, cfg.exclude_label);
    const out = [];
    for (const id in hass.states) {
      if (!id.startsWith("update.")) continue;
      if (hass.states[id].state !== "on") continue;
      if (isHidden(hass, id)) continue;
      if (excl.size && entityLabels(hass, id).some((l) => excl.has(l))) continue;
      out.push({ id, name: friendly(hass, id).replace(/\s*(Firmware|Update)\s*$/i, "") });
    }
    return out;
  }

  view(hass, cfg) {
    const batts = this._batteries(hass, cfg);
    const zig = this._zigbeeOffline(hass, cfg);
    const upd = this._updates(hass, cfg);
    const max = Math.max(1, parseInt(cfg.max_list) || 3);

    const L = [];
    const line = (cls, tag, txt) =>
      `<div class="s-ln"><span class="s-tag ${cls}">${tag}</span><span class="s-txt">${esc(txt)}</span></div>`;
    const item = (txt) => `<div class="s-ln s-item"><span class="s-txt">${esc(txt)}</span></div>`;
    const rest = (n) => `<div class="s-ln s-item s-dim"><span class="s-txt">… und ${n} weitere</span></div>`;

    /* Batterien */
    if (batts.length) {
      L.push(line("s-wr", "[WARN]", batts.length === 1 ? "1 Batterie schwach" : batts.length + " Batterien schwach"));
      batts.slice(0, max).forEach((b) => L.push(item(b.name + " " + fmt0(b.v) + " %")));
      if (batts.length > max) L.push(rest(batts.length - max));
    } else {
      L.push(line("s-ok", "[ OK ]", "Batterien in Ordnung"));
    }

    /* Zigbee */
    if (zig.length) {
      L.push(line("s-er", "[FAIL]", zig.length + (zig.length === 1 ? " Zigbee-Gerät offline" : " Zigbee-Geräte offline")));
      zig.slice(0, max).forEach((n) => L.push(item(n)));
      if (zig.length > max) L.push(rest(zig.length - max));
    } else {
      L.push(line("s-ok", "[ OK ]", "Alle Zigbee-Geräte erreichbar"));
    }

    /* Updates */
    if (upd.length) {
      L.push(line("s-wr", "[WARN]", upd.length === 1 ? "1 Update offen" : upd.length + " Updates offen"));
      upd.slice(0, max).forEach((u) => L.push(item(u.name)));
      if (upd.length > max) L.push(rest(upd.length - max));
    } else {
      L.push(line("s-ok", "[ OK ]", "Alles aktuell"));
    }

    const issues = (batts.length ? 1 : 0) + (zig.length ? 1 : 0) + (upd.length ? 1 : 0);
    const hints = batts.length + zig.length + upd.length;
    L.push(`<div class="s-ln s-dim"><span class="s-txt">check beendet — ${
      hints ? hints + (hints === 1 ? " Hinweis" : " Hinweise") : "keine Hinweise"
    }</span><span class="s-cur"></span></div>`);

    const core = cfg.version_entity
      ? (stateOf(hass, cfg.version_entity) || "")
      : (hass.states["update.home_assistant_core_update"]
          ? hass.states["update.home_assistant_core_update"].attributes.installed_version || "" : "");

    const now = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    return {
      tone: "forest", ink: undefined,
      fill: 0, quiet: false,
      theme: cfg.theme,
      sig: [batts, zig, upd, core, cfg.theme, max],
      layers: `<span class="s-scan"></span><span class="s-vig"></span>`,
      head: this.head("mdi:cog-play-outline", cfg.title,
        issues ? "systemcheck · " + hints + (hints === 1 ? " Hinweis" : " Hinweise") : "systemcheck · sauber",
        { go: false }),
      body: `<div class="s-code">${L.join("")}</div>`,
      foot: `<div class="s-foot"><span>${esc(now)}</span><span>${
        core ? "core " + esc(core) : esc(zig.length + upd.length + batts.length + " offen")}</span></div>`,
    };
  }

  wire(view) {
    const card = this.shadowRoot.querySelector(".card");
    if (card && view && view.theme && view.theme !== "green") card.classList.add("s-" + view.theme);
    this._wireHead();
  }
}

register("prism-system-card", PrismSystemCard, {
  name: "Prism System Card",
  description: "Quadrat im Terminal-Look. Schwache Batterien nach Label, nicht erreichbare Zigbee-Geräte und offene Updates als Boot-Log.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "theme", selector: { select: { mode: "dropdown", options: [
    { value: "green", label: "Grün" }, { value: "amber", label: "Bernstein" }, { value: "ice", label: "Eisblau" },
  ] } } },
  { name: "battery_label", selector: { label: {} } },
  { name: "battery_threshold", selector: { number: { min: 1, max: 100, mode: "box", unit_of_measurement: "%" } } },
  { name: "zigbee_platform", selector: { select: { mode: "dropdown", options: [
    { value: "zha", label: "ZHA" }, { value: "mqtt", label: "Zigbee2MQTT" }, { value: "deconz", label: "deCONZ" },
  ] } } },
  { name: "exclude_label", selector: { label: {} } },
  { name: "version_entity", selector: { entity: { filter: [{ domain: "sensor" }, { domain: "update" }] } } },
  { name: "max_list", selector: { number: { min: 1, max: 8, mode: "box" } } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  title: "Titel",
  theme: "Farbe der Röhre",
  battery_label: "Label der überwachten Batteriesensoren",
  battery_threshold: "Schwelle für „schwach“",
  zigbee_platform: "Zigbee-Integration",
  exclude_label: "Label, dessen Updates nicht gezählt werden",
  version_entity: "Version für die Fußzeile (leer = Core-Version)",
  max_list: "Wie viele Einträge je Abschnitt aufgelistet werden",
  tap_action: "Aktion beim Klick auf den Kopf (z. B. Navigation)",
});

/* ══════════════════════════════════════════════════════════════
   14 — Calendar Card  ·  Standard-Quadrat
   ══════════════════════════════════════════════════════════════
   Termine mehrerer Kalender, nach Tagen gruppiert. Datumsspalte
   links, Termine rechts, farbiger Balken je Kalender.
   Daten über die Kalender-API von Home Assistant.
   ══════════════════════════════════════════════════════════════ */

const CAL_DAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const CAL_MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
/* Farbfolge für Kalender ohne eigene Farbe */
const CAL_COLORS = ["#67E8F9", "#A78BFA", "#FDE047", "#7EE8B5", "#FB7185", "#F0ABFC"];

const CALENDAR_CSS = `
.card{
  background:linear-gradient(150deg,#4C5BD4 0%,#2E1B6B 55%,#140C2E 100%);
  border-color:rgba(255,255,255,.16);
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
}
.card > .wash,.card > .rise{display:none}
.card > .gloss{z-index:1;opacity:.7}
.card > .zh,.card > .zb,.card > .zf{position:relative;z-index:2}

.card .zh .go{--mdc-icon-size:clamp(15px,calc(var(--u) * 0.3),20px)}

.c-list{display:flex;flex-direction:column;gap:clamp(5px,calc(var(--u) * 0.24),11px);
  min-height:0;overflow-y:auto;scrollbar-width:none}
.c-list::-webkit-scrollbar{display:none}

.c-day{display:flex;gap:clamp(7px,calc(var(--u) * 0.36),14px);align-items:stretch;min-width:0}
.c-day + .c-day{border-top:1px solid rgba(255,255,255,.10);padding-top:clamp(5px,calc(var(--u) * 0.24),11px)}
.c-day.week{border-top-color:rgba(255,255,255,.26)}

/* Datumsspalte */
.c-date{width:clamp(30px,calc(var(--u) * 1.56),52px);flex:none;text-align:center;
  display:flex;flex-direction:column;justify-content:center;line-height:1}
.c-wd{font-family:var(--p-mono);font-weight:700;font-size:clamp(7.5px,calc(var(--u) * 0.36),11px);
  letter-spacing:.08em;text-transform:uppercase;opacity:.6}
.c-dd{font-family:var(--p-mono);font-weight:700;font-size:clamp(15px,calc(var(--u) * 0.84),26px);
  letter-spacing:-.03em;margin:.1em 0}
.c-mo{font-family:var(--p-mono);font-weight:700;font-size:clamp(7px,calc(var(--u) * 0.336),10px);
  letter-spacing:.08em;text-transform:uppercase;opacity:.6}
.c-day.today .c-wd,.c-day.today .c-dd,.c-day.today .c-mo{color:#67E8F9;opacity:1}
.c-day.today .c-dd{text-shadow:0 0 16px rgba(103,232,249,.55)}
.c-day.weekend .c-wd,.c-day.weekend .c-mo{opacity:.42}

/* Termine */
.c-evts{flex:1;min-width:0;display:flex;flex-direction:column;gap:clamp(3px,calc(var(--u) * 0.168),7px);justify-content:center}
.c-ev{display:flex;gap:clamp(5px,calc(var(--u) * 0.264),10px);min-width:0;align-items:stretch}
.c-bar{width:2.5px;border-radius:999px;flex:none;background:var(--evc,#67E8F9);opacity:.9}
.c-body{min-width:0;flex:1}
.c-title{font-family:var(--p-display);font-weight:700;letter-spacing:-.01em;line-height:1.2;
  font-size:clamp(10.5px,calc(var(--u) * 0.504),15px);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.c-meta{display:flex;align-items:center;gap:.4em;margin-top:.18em;
  font-family:var(--p-mono);font-size:clamp(8.5px,calc(var(--u) * 0.384),11.5px);opacity:.7;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.c-meta ha-icon{--mdc-icon-size:1.15em;opacity:.85}
.c-ev.past{opacity:.42}
.c-more{font-family:var(--p-mono);font-size:clamp(8.5px,calc(var(--u) * 0.384),11.5px);opacity:.55;padding-left:calc(2.5px + clamp(5px,calc(var(--u) * 0.264),10px))}
.c-empty{margin:auto;font-size:clamp(10px,calc(var(--u) * 0.408),13px);opacity:.6;text-align:center}
`;

class PrismCalendarCard extends PrismCard {
  /* Vier Standard-Quadrate: doppelt so breit, dabei quadratisch */
  static gridOpts = { columns: 12, min_columns: 6, rows: "auto" };
  static defaults = { title: "Kalender", days_to_show: 7, max_days: 4, max_events_per_day: 3, show_time: true };
  static stub = { title: "Kalender", days_to_show: 7 };
  static css = CALENDAR_CSS;

  setConfig(config) {
    super.setConfig(config);
    this._events = null; this._fetchTs = 0; this._fetchKey = null;
  }
  onHass() { this._maybeFetch(); }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  _entities() {
    return toList(this._config.entities).map((e, i) => {
      const o = typeof e === "string" ? { entity: e } : Object.assign({}, e);
      o.color = toCssColor(o.color) || CAL_COLORS[i % CAL_COLORS.length];
      return o;
    }).filter((o) => o.entity);
  }

  async _maybeFetch() {
    const cfg = this._config, hass = this._hass;
    const ents = this._entities();
    if (!ents.length || !hass) return;
    const key = ents.map((e) => e.entity).join("|") + "#" + cfg.days_to_show;
    const now = Date.now();
    if (this._fetchKey === key && now - this._fetchTs < 5 * 60 * 1000) return;
    this._fetchKey = key; this._fetchTs = now;

    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + (parseInt(cfg.days_to_show) || 7));
    const q = `?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`;

    try {
      const lists = await Promise.all(ents.map(async (e) => {
        try {
          const res = await hass.callApi("GET", "calendars/" + e.entity + q);
          return (res || []).map((ev) => ({
            title: ev.summary || "Termin",
            location: ev.location || null,
            color: e.color,
            label: e.label || null,
            allDay: !!(ev.start && ev.start.date),
            start: new Date(ev.start.dateTime || ev.start.date + "T00:00:00"),
            end: new Date(ev.end && (ev.end.dateTime || ev.end.date) ? (ev.end.dateTime || ev.end.date + "T00:00:00") : ev.start.dateTime || ev.start.date),
          }));
        } catch (err) { return []; }
      }));
      this._events = [].concat(...lists).sort((a, b) => a.start - b.start);
      this._sig = null;
      this._render();
      /* Minütlich neu zeichnen, damit „vorbei" und „heute" stimmen */
      if (!this._timer) this._timer = setInterval(() => { this._sig = null; this._render(); }, 60000);
    } catch (e) { this._events = []; }
  }

  _byDay(cfg) {
    const days = [];
    const list = this._events || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const span = parseInt(cfg.days_to_show) || 7;
    for (let i = 0; i < span; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const evts = list.filter((e) => e.start < next && (e.end > d || (e.allDay && e.start >= d && e.start < next)));
      if (!evts.length && cfg.show_empty_days !== true) continue;
      days.push({ date: d, events: evts, today: i === 0 });
    }
    return days;
  }

  view(hass, cfg) {
    const ents = this._entities();
    const days = this._byDay(cfg);
    const maxDays = Math.max(1, parseInt(cfg.max_days) || 4);
    const maxEv = Math.max(1, parseInt(cfg.max_events_per_day) || 3);
    const shown = days.slice(0, maxDays);
    const total = days.reduce((n, d) => n + d.events.length, 0);
    const now = new Date();

    const fmtTime = (d) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

    const dayHtml = (day, i) => {
      const wd = day.date.getDay();
      const evts = day.events.slice(0, maxEv);
      const rest = day.events.length - evts.length;
      /* Wochenwechsel bekommt eine kräftigere Trennlinie */
      const week = i > 0 && wd === 1;
      return `<div class="c-day${day.today ? " today" : ""}${wd === 0 || wd === 6 ? " weekend" : ""}${week ? " week" : ""}">
        <div class="c-date">
          <span class="c-wd">${CAL_DAYS[wd]}</span>
          <span class="c-dd">${day.date.getDate()}</span>
          <span class="c-mo">${CAL_MONTHS[day.date.getMonth()]}</span>
        </div>
        <div class="c-evts">
          ${evts.map((e) => {
            const past = e.end < now;
            const time = e.allDay ? "Ganztägig"
              : (cfg.show_time === false ? "" : fmtTime(e.start) + (e.end && e.end - e.start > 60000 ? " – " + fmtTime(e.end) : ""));
            const loc = cfg.show_location === true && e.location ? String(e.location).split(",")[0] : null;
            return `<div class="c-ev${past ? " past" : ""}" style="--evc:${e.color}">
              <span class="c-bar"></span>
              <div class="c-body">
                <div class="c-title">${e.label ? esc(e.label) + " " : ""}${esc(e.title)}</div>
                ${time || loc ? `<div class="c-meta">
                  ${time ? `<ha-icon icon="${e.allDay ? "mdi:calendar-blank" : "mdi:clock-outline"}"></ha-icon>${esc(time)}` : ""}
                  ${loc ? `<ha-icon icon="mdi:map-marker-outline"></ha-icon>${esc(loc)}` : ""}
                </div>` : ""}
              </div>
            </div>`;
          }).join("")}
          ${rest > 0 ? `<div class="c-more">+ ${rest} ${rest === 1 ? "weiterer Termin" : "weitere Termine"}</div>` : ""}
        </div>
      </div>`;
    };

    const status = !ents.length ? "Keine Kalender gewählt"
      : this._events === null ? "wird geladen…"
      : total === 0 ? "Nichts geplant"
      : total + (total === 1 ? " Termin" : " Termine");

    return {
      tone: "night", ink: "#EAF4FF",
      fill: 0, quiet: false,
      sig: [(this._events || []).map((e) => e.title + e.start.getTime()), cfg, Math.floor(Date.now() / 60000)],
      head: this.head(cfg.icon || "mdi:calendar-month-outline", cfg.title, status, { go: true }),
      body: shown.length
        ? `<div class="c-list">${shown.map(dayHtml).join("")}</div>`
        : `<div class="c-list"><div class="c-empty">${
            this._events === null ? "Termine werden geladen…" : "Keine Termine in den nächsten " + (parseInt(cfg.days_to_show) || 7) + " Tagen"
          }</div></div>`,
      foot: "",
    };
  }

  wire() { this._wireHead(this._entities()[0] && this._entities()[0].entity); }
}

register("prism-calendar-card", PrismCalendarCard, {
  name: "Prism Calendar Card",
  description: "Quadrat. Termine mehrerer Kalender nach Tagen gruppiert, farbiger Balken je Kalender, heutiger Tag hervorgehoben.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "entities", selector: { entity: { multiple: true, filter: [{ domain: "calendar" }] } } },
  { name: "days_to_show", selector: { number: { min: 1, max: 31, mode: "box", unit_of_measurement: "Tage" } } },
  { name: "max_days", selector: { number: { min: 1, max: 14, mode: "box" } } },
  { name: "max_events_per_day", selector: { number: { min: 1, max: 8, mode: "box" } } },
  { name: "show_time", selector: { boolean: {} } },
  { name: "show_location", selector: { boolean: {} } },
  { name: "show_empty_days", selector: { boolean: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  title: "Titel",
  icon: "Icon",
  entities: "Kalender (Reihenfolge bestimmt die Farbe)",
  days_to_show: "Zeitraum, der abgefragt wird",
  max_days: "Wie viele Tage die Karte anzeigt",
  max_events_per_day: "Termine je Tag, Rest wird gezählt",
  show_time: "Uhrzeit anzeigen",
  show_location: "Ort anzeigen",
  show_empty_days: "Tage ohne Termine anzeigen",
  tap_action: "Aktion beim Klick auf den Kopf (z. B. Navigation)",
});

/* ══════════════════════════════════════════════════════════════
   15 — Clock Card  ·  Doppel-Quadrat
   ══════════════════════════════════════════════════════════════
   Sieben-Segment-Anzeige im Wecker-Look: Leuchtziffern mit
   abgeschatteten Segmenten dahinter, Rasterzeilen über der Fläche,
   der Doppelpunkt blinkt im Sekundentakt. Darunter das Datum.
   ══════════════════════════════════════════════════════════════ */

const CLOCK_WD = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const CLOCK_MO = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
  "September", "Oktober", "November", "Dezember"];

/* Farbwelten der Röhre: Verlauf, Rand, Leuchtfarbe */
const CLOCK_SKIN = {
  green: ["#0A1F1A", "#04100D", "#54F5B4", "rgba(84,245,180,.28)"],
  amber: ["#1F1405", "#0C0702", "#FFB74D", "rgba(255,183,77,.30)"],
  red:   ["#1F0A0A", "#0C0303", "#FF6B6B", "rgba(255,107,107,.30)"],
  ice:   ["#0A1826", "#040A12", "#7DD3FC", "rgba(125,211,252,.30)"],
  violet:["#150C26", "#07040F", "#C4B5FD", "rgba(196,181,253,.30)"],
};

const CLOCK_CSS = `
.card{
  background:linear-gradient(150deg,var(--k1),var(--k2));
  border-color:var(--kb);
  color:var(--kc);
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
}
.card > .wash,.card > .rise,.card > .gloss{display:none}
.card > .zh,.card > .zb,.card > .zf{position:relative;z-index:3}
/* Die Uhr braucht die ganze Breite — ohne diese Regel belegt die leere
   Detailspalte der Doppelkarte die rechte Hälfte. */
.card.dbl.k-full{
  grid-template-columns:minmax(0,1fr);
  grid-template-areas:"b";
  grid-template-rows:minmax(0,1fr);
}
.card.k-full > .zd{display:none}

/* Rasterzeilen und Randabschattung wie auf einer Röhre */
.k-scan{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:.22;
  background:repeating-linear-gradient(180deg,rgba(255,255,255,.12) 0 1px,transparent 1px 3px)}
.k-vig{position:absolute;inset:0;z-index:2;pointer-events:none;
  background:radial-gradient(120% 90% at 50% 45%,transparent 55%,rgba(0,0,0,.5))}

.k-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;
  height:100%;min-height:0;gap:clamp(2px,calc(var(--u) * 0.072),8px)}

/* Ziffern: die dunkle Acht liegt hinter der echten Zahl */
.k-time{position:relative;display:flex;align-items:center;justify-content:center;
  font-family:"Orbitron","DSEG7 Classic",var(--p-mono);font-weight:900;
  font-size:clamp(40px,calc(var(--u) * 2.88),110px);line-height:.9;letter-spacing:.02em;
  font-variant-numeric:tabular-nums}
.k-grp{position:relative;display:inline-block}
.k-ghost{position:absolute;inset:0;opacity:.10;pointer-events:none}
.k-lit{position:relative;text-shadow:0 0 .28em currentColor,0 0 .7em currentColor}
.k-sep{margin:0 .12em;opacity:.85;text-shadow:0 0 .28em currentColor}
.k-sep.off{opacity:.12;text-shadow:none}
.k-sec{font-size:.34em;margin-left:.28em;align-self:flex-start;margin-top:.35em;opacity:.75;
  text-shadow:0 0 .3em currentColor}

.k-date{font-family:"Orbitron",var(--p-mono);font-weight:600;
  font-size:clamp(10px,calc(var(--u) * 0.432),18px);letter-spacing:.24em;text-transform:uppercase;opacity:.7;
  margin-top:.6em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.k-extra{font-family:var(--p-mono);font-size:clamp(8px,calc(var(--u) * 0.312),13px);letter-spacing:.16em;
  text-transform:uppercase;opacity:.45}
/* ── Bauart „Klassisch": ruhige Monospace-Zahl, Datum darunter ── */
.card.k-plain{background:linear-gradient(150deg,var(--k1),var(--k2));color:var(--kc)}
.card.k-plain .k-scan,.card.k-plain .k-vig{display:none}
.card.k-plain > .gloss{display:block;z-index:2;opacity:.9}
.k-plain .k-time{font-family:var(--p-mono);font-weight:700;letter-spacing:-.05em;
  font-size:clamp(44px,calc(var(--u) * 3.12),120px)}
.k-plain .k-lit{text-shadow:none}
.k-plain .k-ghost{display:none}
.k-plain .k-sep{opacity:.55;text-shadow:none;margin:0 .04em}
.k-plain .k-sep.off{opacity:.18}
.k-plain .k-sec{opacity:.5;text-shadow:none;font-size:.32em}
.k-plain .k-date{font-family:var(--p-display);font-weight:700;letter-spacing:-.01em;
  text-transform:none;font-size:clamp(11px,calc(var(--u) * 0.48),20px);opacity:.8;margin-top:.5em}
.k-plain .k-extra{letter-spacing:.1em;opacity:.55}

/* ── Bauart „Fallblatt": Ziffern auf Blättern mit Trennfuge ── */
.card.k-flip{background:linear-gradient(150deg,var(--k1),var(--k2));color:var(--kc)}
.card.k-flip .k-scan{opacity:.10}
.k-flip .k-time{font-family:var(--p-mono);font-weight:700;letter-spacing:-.04em;
  font-size:clamp(38px,calc(var(--u) * 2.64),100px);gap:clamp(6px,calc(var(--u) * 0.288),16px)}
.k-flip .k-grp{
  background:linear-gradient(180deg,
    color-mix(in srgb, var(--kc) 14%, #222835),
    color-mix(in srgb, var(--k2) 82%, #10151F));
  border-radius:clamp(6px,calc(var(--u) * 0.192),14px);
  padding:.12em .18em;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10), 0 6px 16px -10px rgba(0,0,0,.9);
}
/* die Fuge in der Blattmitte */
.k-flip .k-grp::after{content:"";position:absolute;left:6%;right:6%;top:50%;
  height:1px;background:rgba(0,0,0,.55);z-index:2}
.k-flip .k-lit{text-shadow:none}
.k-flip .k-ghost{display:none}
.k-flip .k-sep{opacity:.45;text-shadow:none;font-size:.55em}
.k-flip .k-sec{opacity:.6;text-shadow:none}
.k-flip .k-date{font-family:var(--p-mono);letter-spacing:.14em;font-size:clamp(10px,calc(var(--u) * 0.384),16px);opacity:.6}

@media (prefers-reduced-motion: reduce){.k-sep.off{opacity:.85}}
`;

class PrismClockCard extends PrismCard {
  static defaults = { style: "segment", show_seconds: false, blink: true,
    date_format: "long", hour_format: "24" };
  static stub = { skin: "green" };
  static double = true;
  static css = CLOCK_CSS;

  setConfig(config) {
    super.setConfig(config);
    this._start();
  }
  connectedCallback() { this._start(); }
  _start() {
    if (this._timer) clearInterval(this._timer);
    /* Sekundentakt, weil der Doppelpunkt im Sekundenrhythmus blinkt */
    this._timer = setInterval(() => { this._sig = null; this._render(); }, 1000);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }
  /* Ohne hass rendern, die Uhr braucht keine Entität */
  set hass(hass) { this._hass = hass; this._render(); }

  _dateText(n, cfg) {
    const wd = CLOCK_WD[n.getDay()], d = n.getDate(), mo = CLOCK_MO[n.getMonth()], y = n.getFullYear();
    const p = (x) => String(x).padStart(2, "0");
    switch (cfg.date_format) {
      case "short":   return `${wd.slice(0, 2)} ${p(d)}.${p(n.getMonth() + 1)}.${y}`;
      case "numeric": return `${p(d)}.${p(n.getMonth() + 1)}.${y}`;
      case "day":     return `${wd}`;
      case "none":    return "";
      default:        return `${wd}, ${d}. ${mo} ${y}`;
    }
  }

  view(hass, cfg) {
    const n = new Date();
    const p = (x) => String(x).padStart(2, "0");
    let hh = n.getHours();
    let suffix = "";
    if (cfg.hour_format === "12") {
      suffix = hh >= 12 ? "PM" : "AM";
      hh = hh % 12 || 12;
    }
    const h = p(hh), m = p(n.getMinutes()), s = p(n.getSeconds());
    const on = cfg.blink === false || n.getSeconds() % 2 === 0;

    const style = cfg.style || "segment";
    /* Ohne ausdrücklich gewählte Farbe bekommt jede Bauart ihren eigenen Grund */
    const fallback = style === "plain" ? ["#A5B4FC", "#4338CA", "#0B1030", "rgba(255,255,255,.16)"]
      : style === "flip" ? ["#1F2937", "#0B0F19", "#F3F6FF", "rgba(255,255,255,.12)"]
      : CLOCK_SKIN.green;
    const skin = CLOCK_SKIN[cfg.skin] || fallback;
    /* Gruppe aus dunkler Acht und leuchtender Ziffer */
    const grp = (val) => `<span class="k-grp">${
      style === "segment" ? `<span class="k-ghost">88</span>` : ""}<span class="k-lit">${val}</span></span>`;

    const dateTxt = this._dateText(n, cfg);
    const extra = cfg.hour_format === "12" ? suffix
      : (cfg.extra_text || (cfg.show_week === true
          ? "KW " + Math.ceil(((n - new Date(n.getFullYear(), 0, 1)) / 86400000
              + new Date(n.getFullYear(), 0, 1).getDay() + 1) / 7) : ""));

    return {
      tone: "forest",
      fill: 0, quiet: false,
      skin,
      style,
      sig: [h, m, cfg.show_seconds ? s : "", on, dateTxt, extra, cfg.skin, style],
      layers: `<span class="k-scan"></span><span class="k-vig"></span>`,
      head: "", foot: "",
      body: `<div class="k-wrap">
               <div class="k-time">
                 ${grp(h)}<span class="k-sep${on ? "" : " off"}">:</span>${grp(m)}
                 ${cfg.show_seconds === true ? `<span class="k-sec">${s}</span>` : ""}
               </div>
               ${dateTxt ? `<div class="k-date">${esc(dateTxt)}</div>` : ""}
               ${extra ? `<div class="k-extra">${esc(extra)}</div>` : ""}
             </div>`,
    };
  }

  wire(view) {
    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;
    card.classList.add("k-full");
    if (view && view.style && view.style !== "segment") card.classList.add("k-" + view.style);
    if (!view || !view.skin) return;
    const [k1, k2, kc, kb] = view.skin;
    card.style.setProperty("--k1", k1);
    card.style.setProperty("--k2", k2);
    card.style.setProperty("--kc", kc);
    card.style.setProperty("--kb", kb);
    const cfg = this._config;
    if (cfg.tap_action && cfg.tap_action.action) {
      card.style.cursor = "pointer";
      card.addEventListener("click", () => this._act(cfg.entity || "sun.sun", cfg.tap_action, "none"));
    }
  }
}

register("prism-clock-card", PrismClockCard, {
  name: "Prism Clock Card",
  description: "Doppel-Quadrat. Uhr in drei Bauarten: Sieben-Segment, Fallblatt oder klassisch, jeweils mit Datum.",
}, [
  { name: "style", selector: { select: { mode: "dropdown", options: [
    { value: "segment", label: "Sieben-Segment (Leuchtziffern)" },
    { value: "flip", label: "Fallblatt (Bahnhofsanzeige)" },
    { value: "plain", label: "Klassisch (ruhige Ziffern)" },
  ] } } },
  { name: "skin", selector: { select: { mode: "dropdown", options: [
    { value: "green", label: "Grün" }, { value: "amber", label: "Bernstein" },
    { value: "red", label: "Rot" }, { value: "ice", label: "Eisblau" }, { value: "violet", label: "Violett" },
  ] } } },
  { name: "hour_format", selector: { select: { mode: "dropdown", options: [
    { value: "24", label: "24 Stunden" }, { value: "12", label: "12 Stunden mit AM/PM" },
  ] } } },
  { name: "show_seconds", selector: { boolean: {} } },
  { name: "blink", selector: { boolean: {} } },
  { name: "date_format", selector: { select: { mode: "dropdown", options: [
    { value: "long", label: "Mittwoch, 26. August 2026" },
    { value: "short", label: "MI 26.08.2026" },
    { value: "numeric", label: "26.08.2026" },
    { value: "day", label: "Nur Wochentag" },
    { value: "none", label: "Kein Datum" },
  ] } } },
  { name: "show_week", selector: { boolean: {} } },
  { name: "extra_text", selector: { text: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  style: "Bauart",
  skin: "Farbe (leer = passend zur Bauart)",
  hour_format: "Stundenformat",
  show_seconds: "Sekunden anzeigen",
  blink: "Doppelpunkt blinken lassen",
  date_format: "Datumsformat",
  show_week: "Kalenderwoche in der Zusatzzeile",
  extra_text: "Zusatzzeile: eigener Text (übersteuert die Kalenderwoche)",
  tap_action: "Aktion beim Antippen",
});

/* ══════════════════════════════════════════════════════════════
   16 — EV Card  ·  Doppel-Quadrat
   ══════════════════════════════════════════════════════════════
   Zwei Ansichten in einer Karte, umgeschaltet über einen Sensor:

   Am Ladepunkt (mode_entity ist "on")
     Links Ladeleistung groß, darunter Netz- und Akkubezug sowie der
     Hausakku. Rechts sechs Kacheln. Unten der Ladebalken — er atmet,
     solange geladen wird — und darunter die Modus-Pille von EVCC.

   Unterwegs (mode_entity ist "off")
     Links das Fahrzeugbild, rechts sechs Kacheln mit dem Klima-
     Schalter darunter, unten der Ladezustand mit Reichweite.
     Die Verriegelungs-Kachel färbt sich rot, wenn das Auto offen ist;
     Rahmen, Icon und Statuszeile ziehen mit.
   ══════════════════════════════════════════════════════════════ */

const EV_MODES = [["off", "Aus"], ["pv", "PV"], ["minpv", "Min+PV"], ["now", "Schnell"]];

/* Leistung immer in kW, egal ob der Sensor W oder kW liefert */
function evKw(hass, id) {
  const v = num(hass, id);
  if (v === null) return null;
  const u = String(uom(hass, id, "kW")).toLowerCase();
  return u === "w" ? v / 1000 : u === "mw" ? v * 1000 : v;
}
/* Sekunden oder Minuten als "1:12 h" bzw. "48 min" */
function evDuration(v, unit) {
  if (v === null || v === undefined || isNaN(v)) return null;
  let min = String(unit).toLowerCase() === "s" ? v / 60 : v;
  min = Math.max(0, Math.round(min));
  if (min < 60) return min + " min";
  return Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0") + " h";
}

const EV_CSS = `
.card{
  border:1px solid rgba(255,255,255,.14);
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
  gap:clamp(6px,calc(var(--u) * 0.216),13px);
}
.card > .wash,.card > .rise,.card > .gloss{display:none}
.card > .zh,.card > .zb,.card > .zf{position:relative;z-index:3}
/* Volle Breite statt zweier Spalten — die Karte teilt selbst auf */
.card.dbl.ev-full{
  grid-template-columns:minmax(0,1fr);
  grid-template-areas:"h" "b" "f";
  grid-template-rows:auto minmax(0,1fr) auto;
}
.card.ev-full > .zd{display:none}


.card.ev-charge{background:linear-gradient(160deg,#0E2A3C,#081A2A 58%,#040D18);
  border-color:rgba(31,214,95,.24);--ac:#1FD65F;--g1:#1FD65F;--g2:#38BDF8;--dim:#8B93B7}
.card.ev-car{background:linear-gradient(160deg,#2A3320,#161C10 58%,#0A0D07);
  border-color:rgba(183,212,106,.22);--ac:#B7D46A;--g1:#B7D46A;--g2:#5EEAD4;--dim:#9CA98A}
.card.ev-alert{border-color:rgba(251,113,133,.45)}
.card .state{color:var(--dim)}
.card.ev-alert .state{color:#FB7185}
.card .badge{background:rgba(255,255,255,.13)}
.card.ev-alert .badge{background:rgba(251,113,133,.22)}

.ev-mid{display:grid;grid-template-columns:1.15fr 1fr;gap:clamp(10px,calc(var(--u) * 0.36),22px);
  min-height:0;height:100%;overflow:hidden}
.ev-left{min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:center;
  gap:clamp(4px,calc(var(--u) * 0.144),9px)}
.ev-left .ev-img{flex:1 1 auto}
.ev-right{min-width:0;min-height:0;display:flex;flex-direction:column;justify-content:center;
  gap:clamp(4px,calc(var(--u) * 0.144),9px);border-left:1px solid rgba(255,255,255,.12);padding-left:clamp(10px,calc(var(--u) * 0.36),20px)}

/* Ladeansicht links */
.ev-pw{font-family:var(--p-display);font-weight:800;letter-spacing:-.04em;line-height:.92;color:var(--ac);
  font-size:clamp(24px,calc(var(--u) * 0.792),54px);display:flex;align-items:baseline;gap:.08em}
.ev-pw small{font-size:.3em;font-weight:600;opacity:.75}
.ev-sub{font-family:var(--p-display);font-weight:800;font-size:clamp(10px,calc(var(--u) * 0.222),17px);margin-top:.2em}
.ev-sub2{font-size:clamp(8.5px,calc(var(--u) * 0.162),12.5px);color:var(--dim);margin-top:.15em;display:flex;align-items:center;gap:.35em}
.ev-sub2 ha-icon{--mdc-icon-size:1.25em}

/* Fahrzeugbild */
.ev-img{position:relative;min-height:0;min-width:0;overflow:hidden;
  border-radius:calc(var(--p-radius) * .5);background:rgba(255,255,255,.04)}
.ev-img img{position:absolute;inset:0;width:100%;height:100%;
  object-fit:contain;object-position:center;padding:clamp(3px,calc(var(--u) * 0.144),10px);display:block}
.ev-img .ph{position:absolute;inset:0;display:grid;place-items:center;opacity:.3}
.ev-img .ph ha-icon{--mdc-icon-size:clamp(40px,calc(var(--u) * 2.16),110px)}

/* Kacheln */
.ev-tiles.three{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr))}
.ev-tiles{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,minmax(0,1fr));
  gap:clamp(3px,calc(var(--u) * 0.132),7px);min-height:0;flex:1 1 auto;overflow:hidden}
.ev-tile{background:rgba(255,255,255,.07);border-radius:10px;
  padding:clamp(3px,calc(var(--u) * 0.108),8px) clamp(5px,calc(var(--u) * 0.156),11px);
  /* senkrecht mittig, waagerecht linksbündig */
  display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:.45em;
  min-width:0;min-height:0;overflow:hidden;cursor:pointer;text-align:left}
.ev-tile ha-icon{--mdc-icon-size:clamp(13px,calc(var(--u) * 0.228),22px);opacity:.7;flex:none}
.ev-tile .v{font-family:var(--p-display);font-weight:500;font-size:clamp(11px,calc(var(--u) * 0.24),22px);
  line-height:1.1;letter-spacing:-.005em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ev-tile.lock-open{background:rgba(251,113,133,.24);box-shadow:inset 0 0 0 1px rgba(251,113,133,.5)}
.ev-tile.lock-open .v{color:#FFE4E9}
.ev-tile.lock-open ha-icon{opacity:1;color:#FFE4E9}
.ev-tile.lock-closed .v{color:var(--ac)}
.ev-tile.lock-open .v{font-weight:600}

/* Balken */
.ev-bar{position:relative;height:clamp(10px,calc(var(--u) * 0.204),18px);border-radius:9px;
  background:rgba(255,255,255,.09);overflow:hidden;cursor:pointer}
.ev-bar.slim{height:clamp(8px,calc(var(--u) * 0.156),14px)}
.ev-bar.tall{height:clamp(18px,calc(var(--u) * 0.336),30px)}
.ev-bar i{position:absolute;inset:0;width:var(--w,0%);border-radius:9px;
  background:linear-gradient(90deg,var(--g1),var(--g2));transition:width .6s cubic-bezier(.2,.8,.2,1)}
.ev-bar span.t{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--p-display);
  font-weight:800;font-size:clamp(8.5px,calc(var(--u) * 0.168),13px);color:#04230F}
.ev-bar .sheen{position:absolute;top:0;bottom:0;width:26%;left:-30%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent)}
.card.ev-charging .ev-bar i{animation:ev-breathe 2.4s ease-in-out infinite}
.card.ev-charging .ev-bar .sheen{animation:ev-sheen 2.6s linear infinite}
@keyframes ev-breathe{0%,100%{filter:brightness(1)}50%{filter:brightness(1.35)}}
@keyframes ev-sheen{to{left:110%}}
.ev-legs{display:flex;justify-content:space-between;gap:1em;
  font-size:clamp(7.5px,calc(var(--u) * 0.132),11.5px);color:var(--dim);margin-top:.22em}

/* Modus-Pille */
.ev-seg{display:flex;gap:2px;border:1px solid rgba(255,255,255,.20);border-radius:999px;padding:2px;
  margin-top:.35em}
.ev-seg b{flex:1;text-align:center;cursor:pointer;border-radius:999px;font-weight:700;
  font-size:clamp(8.5px,calc(var(--u) * 0.174),14px);padding:.45em .2em;opacity:.8;white-space:nowrap;
  transition:background .18s,opacity .18s}
.ev-seg b:hover{opacity:1}
.ev-seg b.on{background:#fff;color:#0B0F2E;opacity:1}

/* Klima-Schalter */
.ev-btn{display:flex;align-items:center;justify-content:center;gap:.45em;cursor:pointer;white-space:nowrap;
  font-size:clamp(8.5px,calc(var(--u) * 0.156),13px);font-weight:700;padding:.5em .9em;border-radius:12px;flex:none;
  background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);transition:background .18s}
.ev-btn ha-icon{--mdc-icon-size:1.3em}
.ev-btn:hover{background:rgba(255,255,255,.18)}
.ev-btn.on{background:var(--ac);border-color:transparent;color:#131A08}
@media (prefers-reduced-motion: reduce){.card.ev-charging .ev-bar i,.card.ev-charging .ev-bar .sheen{animation:none}
  .ev-bar i{transition:none}}
`;

class PrismEvCard extends PrismCard {
  static defaults = { name: "Wallbox", car_name: "Fahrzeug" };
  static stub = {};
  static double = true;
  static css = EV_CSS;

  onHass() {
    /* Ladedauer und Restzeit laufen weiter, ohne dass ein Sensor sich meldet */
    if (!this._tick) this._tick = setInterval(() => { this._sig = null; this._render(); }, 30000);
  }

  _picture(cfg) {
    if (cfg.image_url) return cfg.image_url;
    const st = cfg.image_entity ? this._hass.states[cfg.image_entity] : null;
    return st && st.attributes.entity_picture ? st.attributes.entity_picture : null;
  }
  /* Icon und Wert in einer Zeile — die Beschriftung entfällt, dafür
     ist der Wert deutlich größer. Der Name bleibt als Tooltip erhalten. */
  _tile(icon, k, v, cls, mi) {
    return `<div class="ev-tile ${cls || ""}"${mi ? ` data-mi="${mi}"` : ""} title="${esc(k)}">
      <ha-icon icon="${icon}"></ha-icon><span class="v">${esc(v)}</span></div>`;
  }

  /* ---------- Am Ladepunkt ---------- */
  _charge(hass, cfg) {
    const power = evKw(hass, cfg.charge_power);
    const grid = evKw(hass, cfg.grid_power);
    const batt = evKw(hass, cfg.battery_power);
    const house = num(hass, cfg.house_battery_soc);
    const soc = num(hass, cfg.vehicle_soc);
    const limit = num(hass, cfg.limit_soc);
    const energy = num(hass, cfg.charged_energy);
    const dur = evDuration(num(hass, cfg.charge_duration), uom(hass, cfg.charge_duration, "s"));
    const rest = evDuration(num(hass, cfg.remaining_duration), uom(hass, cfg.remaining_duration, "s"));
    const solar = num(hass, cfg.solar_percentage);
    const range = num(hass, cfg.vehicle_range);
    const mode = cfg.mode_select ? stateOf(hass, cfg.mode_select) : null;
    const charging = power !== null && power > 0.05;

    const flows = [];
    if (grid !== null) flows.push("Netz " + fmt(Math.abs(grid), 1) + " kW");
    if (batt !== null) flows.push("Akku " + fmt(Math.abs(batt), 1) + " kW");

    return {
      charging,
      status: charging ? "Lädt" + (mode ? " · " + this._modeLabel(mode) : "")
        : "Angesteckt" + (mode ? " · " + this._modeLabel(mode) : ""),
      icon: "mdi:ev-station",
      name: cfg.name,
      body: `<div class="ev-mid">
          <div class="ev-left">
            <div class="ev-pw">${fmt(power === null ? 0 : power, 1)}<small>kW</small></div>
            ${flows.length ? `<div class="ev-sub">${esc(flows.join(" · "))}</div>` : ""}
            ${house !== null ? `<div class="ev-sub2" data-mi="${esc(cfg.house_battery_soc || "")}">
              <ha-icon icon="mdi:home-battery"></ha-icon>Hausakku ${fmt0(house)} %</div>` : ""}
          </div>
          <div class="ev-right">
            <div class="ev-tiles three">
              ${this._tile("mdi:lightning-bolt", "Geladen", energy === null ? "–" : fmt(energy, 1) + " kWh", "", cfg.charged_energy)}
              ${this._tile("mdi:clock-outline", "Dauer", dur || "–", "", cfg.charge_duration)}
              ${this._tile("mdi:timer-sand", "Restzeit", rest || "–", "", cfg.remaining_duration)}
              ${this._tile("mdi:white-balance-sunny", "Sonne", solar === null ? "–" : fmt0(solar) + " %", "", cfg.solar_percentage)}
              ${this._tile("mdi:battery-70", "Fahrzeug", soc === null ? "–" : fmt0(soc) + " %", "", cfg.vehicle_soc)}
              ${this._tile("mdi:map-marker-distance", "Reichweite", range === null ? "–" : fmt0(range) + " km", "", cfg.vehicle_range)}
            </div>
          </div>
        </div>`,
      foot: `<div class="ev-bar slim" id="ev-bar">
            <i style="--w:${soc === null ? 0 : Math.max(0, Math.min(100, soc))}%"></i>
            <span class="sheen"></span>
          </div>
          <div class="ev-legs">
            <span>Fahrzeug ${soc === null ? "–" : fmt0(soc) + " %"}${limit ? " → " + fmt0(limit) + " %" : ""}</span>
            <span>${rest ? "noch " + rest : (charging ? "lädt" : "wartet")}</span>
          </div>
          ${cfg.mode_select ? `<div class="ev-seg" id="ev-seg">${EV_MODES.map(([k, l]) =>
            `<b data-mode="${k}" class="${mode === k ? "on" : ""}">${l}</b>`).join("")}</div>` : ""}`,
    };
  }
  _modeLabel(m) {
    const f = EV_MODES.find((x) => x[0] === m);
    return f ? f[1] : m;
  }

  /* ---------- Unterwegs ---------- */
  _car(hass, cfg) {
    const soc = num(hass, cfg.car_soc);
    const range = num(hass, cfg.car_range);
    const odo = num(hass, cfg.odometer);
    const temp = num(hass, cfg.outside_temp);
    const service = num(hass, cfg.service_days);
    const locSt = cfg.location ? hass.states[cfg.location] : null;
    const loc = locSt ? (locSt.state === "home" ? "Zuhause"
      : locSt.state === "not_home" ? "Unterwegs" : locSt.state) : "–";

    const lockSt = cfg.lock ? hass.states[cfg.lock] : null;
    const lockKnown = !!lockSt;
    const open = lockKnown && lockSt.state !== "locked";

    const climSt = cfg.climate ? hass.states[cfg.climate] : null;
    const climOn = climSt && !["off", "unavailable", "unknown"].includes(climSt.state);
    const picture = cfg.hide_image === true ? null : this._picture(cfg);

    return {
      open,
      status: open ? "Nicht verriegelt" : "Geparkt · verriegelt",
      icon: open ? "mdi:car-door" : "mdi:car-electric",
      name: cfg.car_name,
      /* Der Klima-Schalter sitzt unter dem Bild, nicht unter den Kacheln —
         sonst fehlt der rechten Spalte die Höhe für drei Kachelzeilen. */
      body: `<div class="ev-mid">
          <div class="ev-left">
            <div class="ev-img">
              ${picture
                ? `<img src="${esc(picture)}" alt="${esc(cfg.car_name)}">`
                : `<span class="ph"><ha-icon icon="mdi:car-electric"></ha-icon></span>`}
            </div>
            ${cfg.climate ? `<span class="ev-btn ${climOn ? "on" : ""}" id="ev-clim">
              <ha-icon icon="mdi:air-conditioner"></ha-icon>Klimaanlage${climOn ? " an" : ""}</span>` : ""}
          </div>
          <div class="ev-right">
            <div class="ev-tiles">
              ${this._tile("mdi:battery-90", "Ladestand", soc === null ? "–" : fmt0(soc) + " %", "", cfg.car_soc)}
              ${open
                ? this._tile("mdi:lock-open-variant", "Verriegelung", "Offen", "lock-open", cfg.lock)
                : this._tile("mdi:lock", "Verriegelung", lockKnown ? "Zu" : "–", "lock-closed", cfg.lock)}
              ${this._tile("mdi:counter", "Kilometerstand", odo === null ? "–" : fmt0(odo) + " km", "", cfg.odometer)}
              ${this._tile("mdi:map-marker", "Standort", loc, "", cfg.location)}
              ${this._tile("mdi:thermometer", "Außentemperatur", temp === null ? "–" : fmt1(temp) + " °C", "", cfg.outside_temp)}
              ${this._tile("mdi:wrench-clock", "Nächste Inspektion", service === null ? "–" : fmt0(service) + " Tage", "", cfg.service_days)}
            </div>
          </div>
        </div>`,
      foot: `<div class="ev-bar tall" id="ev-bar">
            <i style="--w:${soc === null ? 0 : Math.max(0, Math.min(100, soc))}%"></i>
            <span class="t">${soc === null ? "–" : fmt0(soc) + " %"}${range === null ? "" : " · " + fmt0(range) + " km"}</span>
          </div>`,
    };
  }

  view(hass, cfg) {
    const atCharger = cfg.mode_entity ? isReachable(hass, cfg.mode_entity) : false;
    const v = atCharger ? this._charge(hass, cfg) : this._car(hass, cfg);
    return {
      tone: atCharger ? "ocean" : "olive",
      ink: "#FFFFFF",
      fill: 0, quiet: false,
      atCharger, charging: !!v.charging, open: !!v.open,
      sig: [atCharger, v.status, v.body, v.foot],
      head: this.head(v.icon, v.name, v.status, { go: false }),
      body: v.body,
      foot: v.foot,
    };
  }

  wire(view) {
    const cfg = this._config;
    const card = this.shadowRoot.querySelector(".card");
    if (card) {
      card.classList.add("ev-full", view.atCharger ? "ev-charge" : "ev-car");
      if (view.charging) card.classList.add("ev-charging");
      if (view.open) card.classList.add("ev-alert");
    }
    /* Modus umschalten */
    this.shadowRoot.querySelectorAll("#ev-seg b").forEach((b) => {
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (!cfg.mode_select) return;
        this._hass.callService("select", "select_option", {
          entity_id: cfg.mode_select, option: b.getAttribute("data-mode"),
        });
      });
    });
    /* Klimaanlage */
    this._on("ev-clim", () => {
      if (!cfg.climate) return;
      if (cfg.climate_action && cfg.climate_action.action) this._act(cfg.climate, cfg.climate_action, "more-info");
      else this._moreInfo(cfg.climate);
    });
    this._on("ev-bar", () => this._moreInfo(view.atCharger ? cfg.vehicle_soc : cfg.car_soc));
    this._wireHead(cfg.mode_entity);
  }
}

register("prism-ev-card", PrismEvCard, {
  name: "Prism EV Card",
  description: "Doppel-Quadrat. Am Ladepunkt die EVCC-Werte mit Modus-Pille, sonst das Fahrzeug mit sechs Kacheln und Klima-Schalter.",
}, [
  { name: "mode_entity", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "name", selector: { text: {} } },
  { name: "car_name", selector: { text: {} } },
  /* Ladepunkt */
  { name: "charge_power", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "grid_power", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "battery_power", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "house_battery_soc", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "charged_energy", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "charge_duration", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "remaining_duration", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "solar_percentage", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "vehicle_soc", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "vehicle_range", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "limit_soc", selector: { entity: { filter: [{ domain: "sensor" }, { domain: "number" }] } } },
  { name: "mode_select", selector: { entity: { filter: [{ domain: "select" }] } } },
  /* Fahrzeug */
  { name: "image_entity", selector: { entity: { filter: [{ domain: "image" }, { domain: "camera" }] } } },
  { name: "image_url", selector: { text: {} } },
  { name: "hide_image", selector: { boolean: {} } },
  { name: "car_soc", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "car_range", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "odometer", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "location", selector: { entity: { filter: [{ domain: "device_tracker" }, { domain: "sensor" }] } } },
  { name: "outside_temp", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "service_days", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "lock", selector: { entity: { filter: [{ domain: "lock" }, { domain: "binary_sensor" }] } } },
  { name: "climate", selector: { entity: { filter: [{ domain: "climate" }, { domain: "switch" }] } } },
  { name: "climate_action", selector: { ui_action: {} } },
  { name: "tap_action", selector: { ui_action: {} } },
], {
  mode_entity: "Umschalter: ist dieser Sensor an, zeigt die Karte den Ladepunkt",
  name: "Titel am Ladepunkt",
  car_name: "Titel unterwegs",
  charge_power: "Ladeleistung",
  grid_power: "Netzbezug",
  battery_power: "Leistung des Hausakkus",
  house_battery_soc: "Ladestand des Hausakkus",
  charged_energy: "Geladene Energie der Sitzung",
  charge_duration: "Ladedauer",
  remaining_duration: "Restzeit",
  solar_percentage: "Solaranteil der Sitzung",
  vehicle_soc: "Fahrzeug-Ladestand über EVCC",
  vehicle_range: "Fahrzeug-Reichweite über EVCC",
  limit_soc: "Ladeziel",
  mode_select: "Modus-Auswahl von EVCC (Pille unter dem Balken)",
  image_entity: "Fahrzeugbild: Entität",
  image_url: "Fahrzeugbild: eigene URL (übersteuert die Entität, z. B. /local/auto.png)",
  hide_image: "Fahrzeugbild ausblenden",
  car_soc: "Ladestand des Fahrzeugs",
  car_range: "Reichweite des Fahrzeugs",
  odometer: "Kilometerstand",
  location: "Standort",
  outside_temp: "Außentemperatur",
  service_days: "Nächste Inspektion",
  lock: "Verriegelung (rot, wenn offen)",
  climate: "Klimaanlage",
  climate_action: "Aktion beim Klick auf Klima (Standard: Dialog öffnen)",
  tap_action: "Aktion beim Klick auf den Kopf",
});

/* ══════════════════════════════════════════════════════════════
   17 — Heizung Card  ·  Standard-Quadrat
   ══════════════════════════════════════════════════════════════
   Übernahme der Ember-Karte: Kesselring mit Skala, Brenner und
   Ladepumpe als Statuszeilen, vier Messwerte im Raster, unten der
   Gasverbrauch mit Verlaufslinie. Die Betriebsart sitzt als Chip
   im Kopf.

   Größen laufen über die Prism-Skala (--u), damit die Karte neben
   den übrigen gleich groß schreibt.
   ══════════════════════════════════════════════════════════════ */

const HZ_ARC = 197.9;           /* 270°-Bogen bei r = 42 */

const HEIZUNG_CSS = `
.card{
  color:#F3ECE7;
  border-color:rgba(243,236,231,.10);
  background-color:#1B1714;
  background-image:
    radial-gradient(120% 100% at 8% 0%, rgba(255,138,61,.22) 0%, transparent 62%),
    linear-gradient(160deg, rgba(243,236,231,.07) 0%, transparent 55%);
  padding:0;
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
  --hz-accent:var(--prism-hz-accent, #FF8A3D);
  --hz-glow:var(--prism-hz-glow, #FF6B4A);
  --hz-muted:var(--prism-hz-muted, #B0A49B);
  --hz-sub:var(--prism-hz-sub, #8A7D74);
  --hz-line:var(--prism-hz-line, rgba(243,236,231,.10));
  --hz-fill:var(--prism-hz-fill, rgba(243,236,231,.05));
  --hz-fill-strong:var(--prism-hz-fill-strong, rgba(243,236,231,.11));
  --hz-off:var(--prism-hz-off, #6B5F57);
}
/* Palette „theme“ — alles aus den Home-Assistant-Variablen */
.card.hz-theme{
  color:var(--primary-text-color);
  background-color:var(--card-background-color);
  --hz-accent:var(--prism-hz-accent, var(--primary-color));
  --hz-glow:var(--prism-hz-glow, var(--accent-color, var(--primary-color)));
  --hz-muted:var(--prism-hz-muted, var(--secondary-text-color));
  --hz-sub:var(--prism-hz-sub, var(--secondary-text-color));
  --hz-line:var(--prism-hz-line, rgba(255,255,255,.10));
  --hz-fill:var(--prism-hz-fill, rgba(255,255,255,.05));
  --hz-fill-strong:var(--prism-hz-fill-strong, rgba(255,255,255,.11));
  --hz-off:var(--prism-hz-off, var(--disabled-text-color));
}
.card > .wash,.card > .rise,.card > .gloss{display:none}
.card > .zb{position:relative;z-index:3;padding:0;overflow:hidden}

.hz{display:flex;flex-direction:column;height:100%;min-height:0}

/* Kopf mit Betriebsart-Chip */
.hz-head{flex:none;display:flex;align-items:center;gap:clamp(7px,calc(var(--u) * .168),12px);
  padding:calc(var(--p-pad) * .82) var(--p-pad);
  border-bottom:1px solid var(--hz-line);
  background:linear-gradient(100deg, rgba(255,138,61,.17) 0%, rgba(255,138,61,.05) 55%, transparent 100%)}
.hz-badge{flex:none;width:clamp(28px,calc(var(--u) * .66),42px);height:clamp(28px,calc(var(--u) * .66),42px);
  border-radius:calc(var(--p-radius) * .45);display:grid;place-items:center;color:var(--hz-accent);
  background:rgba(243,236,231,.09);border:1px solid rgba(243,236,231,.12)}
.hz-badge ha-icon{--mdc-icon-size:clamp(16px,calc(var(--u) * .36),24px)}
.hz-titles{min-width:0;display:flex;flex-direction:column}
.hz-title{font-family:var(--p-display);font-weight:800;letter-spacing:-.02em;line-height:1.12;
  font-size:var(--t-title);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hz-sub{font-family:var(--p-mono);font-weight:700;letter-spacing:.1em;line-height:1.2;margin-top:.25em;text-transform:uppercase;
  color:var(--hz-sub);font-size:var(--t-state);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hz-chip{flex:0 1 auto;margin-left:auto;cursor:pointer;font-family:var(--p-display);font-weight:600;
  font-size:clamp(7.5px,calc(var(--u) * .19),13px);
  padding:calc(var(--u) * .07) calc(var(--u) * .17);border-radius:999px;max-width:38%;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--hz-accent);
  background:rgba(255,138,61,.15);border:1px solid rgba(255,138,61,.34);transition:background .18s}
.hz-chip:hover{background:rgba(255,138,61,.26)}

.hz-body{flex:1;min-height:0;overflow:hidden;box-sizing:border-box;
  padding:calc(var(--p-pad) * .8) var(--p-pad) var(--p-pad);
  display:flex;flex-direction:column;gap:calc(var(--u) * .14)}

/* Ring und Statuszeilen */
/* Der Ring bemisst sich nach der verbleibenden Höhe, nicht nach der
   Kartenbreite — sonst wächst er in Kopf und Kacheln hinein. */
.hz-center{flex:1 1 auto;min-height:0;overflow:hidden;
  display:flex;align-items:center;gap:calc(var(--u) * .24)}
.hz-dial{position:relative;height:100%;aspect-ratio:1;width:auto;max-width:38%;
  flex:0 0 auto;min-width:0;min-height:0;
  /* eigener Messrahmen: die Beschriftung im Kern richtet sich nach dem
     Ring, nicht nach der Karte — sonst läuft sie bei kleinen Karten heraus */
  container-type:size}
.hz-dial svg{width:100%;height:100%;transform:rotate(135deg)}
.hz-track{fill:none;stroke:var(--hz-fill-strong);stroke-linecap:round}
.hz-arc{fill:none;stroke:var(--hz-accent);stroke-linecap:round;transition:stroke-dashoffset .6s ease}
.hz-dialtext{position:absolute;inset:14%;display:flex;flex-direction:column;
  align-items:center;justify-content:center;overflow:hidden;text-align:center}
.hz-big{font-family:var(--p-display);font-weight:700;line-height:1;letter-spacing:-.04em;
  font-size:34cqh;white-space:nowrap}
.hz-unit{font-family:var(--p-display);font-weight:600;color:var(--hz-muted);
  font-size:12cqh;line-height:1.1;white-space:nowrap}
.hz-cap{font-family:var(--p-mono);letter-spacing:.08em;color:var(--hz-sub);
  font-size:9cqh;line-height:1.1;margin-top:.25em;white-space:nowrap}

.hz-states{flex:1 1 auto;min-width:0;min-height:0;overflow:hidden;
  display:flex;flex-direction:column;justify-content:center;gap:calc(var(--u) * .18)}
/* Eine Zeile je Aggregat: Icon und Name. Ob es läuft, sagen Farbe und
   Bewegung des Icons — das spart die zweite Zeile. */
.hz-state{display:flex;align-items:center;gap:calc(var(--u) * .14);cursor:pointer;min-width:0}
.hz-state .ic{flex:none;display:grid;place-items:center}
.hz-state .ic ha-icon{--mdc-icon-size:clamp(15px,calc(var(--u) * .34),30px);color:var(--hz-off);
  transition:color .3s}
.hz-state .lbl{font-family:var(--p-display);font-weight:600;color:var(--hz-sub);
  font-size:clamp(9px,calc(var(--u) * .22),17px);line-height:1.2;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .3s}
.hz-state.on .lbl{color:inherit;font-weight:700}
.hz-state.unknown{opacity:.45}
.hz-state.on .flame ha-icon{color:var(--hz-glow)}
.hz-state.on .flame{animation:hz-glow 1.6s ease-in-out infinite}
.hz-state.on .pump ha-icon{color:var(--hz-accent)}
.hz-state.on .pump{animation:hz-spin 2.4s linear infinite}
@keyframes hz-glow{0%,100%{transform:scale(1)}50%{transform:scale(1.14);filter:drop-shadow(0 0 6px var(--hz-glow))}}
@keyframes hz-spin{to{transform:rotate(360deg)}}

/* Messwerte */
.hz-grid{flex:0 0 auto;display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--u) * .1)}
.hz-cell{display:flex;flex-direction:column;cursor:pointer;min-width:0;
  padding:calc(var(--u) * .09) calc(var(--u) * .16);border-radius:calc(var(--p-radius) * .55);
  background:var(--hz-fill);border:1px solid rgba(243,236,231,.08);transition:background .18s}
.hz-cell:hover{background:rgba(255,138,61,.12)}
.hz-cell .k{font-family:var(--p-mono);letter-spacing:.06em;color:var(--hz-sub);
  font-size:clamp(6px,calc(var(--u) * .15),10.5px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hz-cell .v{font-family:var(--p-display);font-weight:700;letter-spacing:-.01em;
  font-size:clamp(9px,calc(var(--u) * .26),19px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hz-off{color:var(--hz-off)}

/* Gaszeile */
.hz-foot{flex:0 0 auto;display:flex;align-items:center;gap:calc(var(--u) * .16);cursor:pointer;min-width:0}
.hz-foot .k{font-family:var(--p-mono);letter-spacing:.06em;color:var(--hz-sub);white-space:nowrap;
  font-size:clamp(6px,calc(var(--u) * .15),10.5px)}
.hz-foot .v{font-family:var(--p-display);font-weight:700;white-space:nowrap;
  font-size:clamp(8.5px,calc(var(--u) * .234),17px)}
.hz-foot svg{flex:1;min-width:0;height:clamp(14px,calc(var(--u) * .34),26px);display:block}
.hz-spark{fill:none;stroke:var(--hz-accent);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;
  vector-effect:non-scaling-stroke}
@media (prefers-reduced-motion: reduce){.hz-state.on .flame,.hz-state.on .pump{animation:none}
  .hz-arc{transition:none}}
`;

class PrismHeizungCard extends PrismCard {
  static defaults = {
    name: "Heizung", subtitle: "vitoconnect", palette: "ember",
    kessel_min: 20, kessel_max: 90, hours: 24,
  };
  static stub = { name: "Heizung", subtitle: "vitoconnect" };
  static css = HEIZUNG_CSS;

  setConfig(config) {
    super.setConfig(config);
    this._gas = null; this._gasTs = 0; this._gasKey = null;
  }
  onHass() { this._maybeGas(); }

  async _maybeGas() {
    const cfg = this._config, hass = this._hass;
    if (!cfg.gas || !hass) return;
    const now = Date.now();
    if (this._gasKey === cfg.gas && now - this._gasTs < 5 * 60 * 1000) return;
    this._gasKey = cfg.gas; this._gasTs = now;
    try {
      const res = await fetchHistory(hass, [cfg.gas], parseInt(cfg.hours) || 24);
      const pts = (res[cfg.gas] || []).map((p) => p.v).filter((v) => !isNaN(v));
      this._gas = pts.length > 1 ? pts : null;
      this._sig = null;
      this._render();
    } catch (e) { this._gas = null; }
  }

  /* Verlaufslinie aus den Punkten, auf 40 Stützstellen gedünnt */
  _spark() {
    const pts = this._gas;
    if (!pts || pts.length < 2) return "";
    const step = Math.max(1, Math.ceil(pts.length / 40));
    const s = pts.filter((_, i) => i % step === 0);
    const min = Math.min(...s), span = Math.max(...s) - min || 1;
    return s.map((v, i) => {
      const x = (i / (s.length - 1)) * 100;
      const y = 22 - ((v - min) / span) * 18;
      return (i ? "L" : "M") + x.toFixed(2) + "," + y.toFixed(2);
    }).join(" ");
  }

  view(hass, cfg) {
    const val = (id) => num(hass, id);
    const okState = (id) => {
      const st = id ? hass.states[id] : null;
      return st && !["unavailable", "unknown", ""].includes(String(st.state)) ? st : null;
    };
    const withUnit = (id, digits = 1) => {
      const v = val(id);
      if (v === null) return null;
      return fmt(v, digits) + " " + uom(hass, id, "°C");
    };

    const brennerSt = okState(cfg.brenner);
    const pumpeSt = okState(cfg.pumpe);
    const brennerOn = !!brennerSt && brennerSt.state === "on";
    const pumpeOn = !!pumpeSt && pumpeSt.state === "on";

    const kessel = val(cfg.kessel);
    const min = parseFloat(cfg.kessel_min), max = parseFloat(cfg.kessel_max);
    const frac = kessel === null ? 0
      : Math.min(1, Math.max(0, (kessel - min) / ((max - min) || 1)));

    const modus = okState(cfg.modus);
    const gasSt = okState(cfg.gas);
    const gasTxt = gasSt ? fmt(parseFloat(gasSt.state), 1) + " " + uom(hass, cfg.gas, "kWh") : "–";

    const cells = [
      ["VORLAUF", cfg.vorlauf], ["WARMWASSER", cfg.warmwasser],
      ["ABGAS", cfg.abgas], ["AUSSEN", cfg.aussen],
    ];

    return {
      tone: "ember", ink: "#F3ECE7",
      fill: 0, quiet: false,
      theme: cfg.palette === "theme",
      sig: [kessel, brennerOn, pumpeOn, modus && modus.state, gasTxt,
        cells.map(([, id]) => withUnit(id)).join("|"), (this._gas || []).length],
      head: "", foot: "",
      body: `<div class="hz">
        <div class="hz-head">
          <span class="hz-badge"><ha-icon icon="${cfg.icon || "mdi:radiator"}"></ha-icon></span>
          <span class="hz-titles">
            <span class="hz-title">${esc(cfg.name)}</span>
            <span class="hz-sub">${esc(cfg.subtitle)} · ${
              !brennerSt ? "keine daten" : brennerOn ? "brenner an" : "brenner aus"}</span>
          </span>
          <span class="hz-chip" id="hz-mode" style="${modus ? "" : "opacity:.5"}">${
            esc(modus ? modus.state : "–")}</span>
        </div>
        <div class="hz-body">
          <div class="hz-center">
            <div class="hz-dial" id="hz-kessel">
              <svg viewBox="0 0 100 100">
                <circle class="hz-track" cx="50" cy="50" r="42" stroke-width="8"
                  stroke-dasharray="${HZ_ARC} 263.9"></circle>
                <circle class="hz-arc" cx="50" cy="50" r="42" stroke-width="8"
                  stroke-dasharray="${HZ_ARC} 263.9" stroke-dashoffset="${(HZ_ARC * (1 - frac)).toFixed(1)}"></circle>
              </svg>
              <div class="hz-dialtext">
                <span class="hz-big">${kessel === null ? "–" : fmt0(kessel)}</span>
                <span class="hz-unit">°C</span>
                <span class="hz-cap">KESSEL</span>
              </div>
            </div>
            <div class="hz-states">
              <div class="hz-state ${brennerOn ? "on" : ""} ${brennerSt ? "" : "unknown"}"
                   id="hz-brenner" title="Brenner ${!brennerSt ? "unbekannt" : brennerOn ? "an" : "aus"}">
                <span class="ic flame"><ha-icon icon="mdi:fire"></ha-icon></span>
                <span class="lbl">Brenner</span>
              </div>
              <div class="hz-state ${pumpeOn ? "on" : ""} ${pumpeSt ? "" : "unknown"}"
                   id="hz-pumpe" title="Ladepumpe ${!pumpeSt ? "unbekannt" : pumpeOn ? "lädt Speicher" : "aus"}">
                <span class="ic pump"><ha-icon icon="mdi:pump"></ha-icon></span>
                <span class="lbl">Ladepumpe</span>
              </div>
            </div>
          </div>
          <div class="hz-grid">
            ${cells.map(([label, id]) => {
              const v = withUnit(id);
              return `<div class="hz-cell" data-mi="${esc(id || "")}">
                <span class="k">${label}</span>
                <span class="v ${v === null ? "hz-off" : ""}">${esc(v === null ? "–" : v)}</span></div>`;
            }).join("")}
          </div>
          ${cfg.gas ? `<div class="hz-foot" id="hz-gas">
            <span class="k">${esc(cfg.gas_label || "GAS HEUTE")}</span>
            <svg viewBox="0 0 100 26" preserveAspectRatio="none"><path class="hz-spark" d="${this._spark()}"></path></svg>
            <span class="v ${gasSt ? "" : "hz-off"}">${esc(gasTxt)}</span>
          </div>` : ""}
        </div>
      </div>`,
    };
  }

  wire(view) {
    const cfg = this._config;
    const card = this.shadowRoot.querySelector(".card");
    if (card && view.theme) card.classList.add("hz-theme");
    this._on("hz-mode", () => this._moreInfo(cfg.modus));
    this._on("hz-brenner", () => this._moreInfo(cfg.brenner));
    this._on("hz-pumpe", () => this._moreInfo(cfg.pumpe));
    this._on("hz-kessel", () => this._moreInfo(cfg.kessel));
    this._on("hz-gas", () => this._moreInfo(cfg.gas));
    this.shadowRoot.querySelectorAll(".hz-cell[data-mi]").forEach((el) => {
      const id = el.getAttribute("data-mi");
      if (id) el.addEventListener("click", () => this._moreInfo(id));
    });
  }
}

register("prism-heizung-card", PrismHeizungCard, {
  name: "Prism Heizung Card",
  description: "Quadrat. Kesselring, Brenner und Ladepumpe, vier Messwerte und der Gasverbrauch mit Verlauf.",
}, [
  { name: "name", selector: { text: {} } },
  { name: "subtitle", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "palette", selector: { select: { mode: "dropdown", options: [
    { value: "ember", label: "Ember (warm)" }, { value: "theme", label: "Aus dem Theme" },
  ] } } },
  { name: "kessel", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "kessel_min", selector: { number: { min: -20, max: 100, mode: "box", unit_of_measurement: "°C" } } },
  { name: "kessel_max", selector: { number: { min: 0, max: 150, mode: "box", unit_of_measurement: "°C" } } },
  { name: "brenner", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "pumpe", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "modus", selector: { entity: { filter: [{ domain: "select" }, { domain: "sensor" }] } } },
  { name: "vorlauf", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "warmwasser", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "abgas", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "aussen", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "gas", selector: { entity: { filter: [{ domain: "sensor" }] } } },
  { name: "gas_label", selector: { text: {} } },
  { name: "hours", selector: { number: { min: 1, max: 168, mode: "box", unit_of_measurement: "h" } } },
], {
  name: "Titel",
  subtitle: "Zusatz in der Statuszeile",
  icon: "Icon im Kopf",
  palette: "Farbwelt",
  kessel: "Kesseltemperatur (Ring)",
  kessel_min: "Ring: Anfang der Skala",
  kessel_max: "Ring: Ende der Skala",
  brenner: "Brenner",
  pumpe: "Speicherladepumpe",
  modus: "Betriebsart (Chip im Kopf)",
  vorlauf: "Vorlauftemperatur",
  warmwasser: "Warmwassertemperatur",
  abgas: "Abgastemperatur",
  aussen: "Außentemperatur",
  gas: "Gasverbrauch (leer = Zeile entfällt)",
  gas_label: "Beschriftung der Gaszeile",
  hours: "Verlauf: Zeitraum in Stunden",
});

/* ══════════════════════════════════════════════════════════════
   18 — Camera Card  ·  Doppel-Quadrat
   ══════════════════════════════════════════════════════════════
   Umsetzung der Spezifikation „Aussenbereich": links das Bild der
   Türklingel mit Verlauf und Beschriftung, rechts die scrollbare
   Ereignisliste, oben Titel und Status.

   Die Ereignisse entstehen aus der Zustandshistorie der gewählten
   Melder — jeder Wechsel auf „on" ist ein Ereignis. Dafür braucht es
   keine zusätzlichen Helfer in Home Assistant.
   ══════════════════════════════════════════════════════════════ */

/* Ereignistyp aus Entität und Name erraten */
function camEventKind(id, label) {
  const t = (id + " " + (label || "")).toLowerCase();
  if (/klingel|ring|besucher|doorbell|chime/.test(t)) return "ring";
  if (/person|vehicle|fahrzeug|visitor|face/.test(t)) return "person";
  if (/paket|package|delivery/.test(t)) return "package";
  if (/motion|bewegung|tier|pet|animal/.test(t)) return "motion";
  return "other";
}
const CAM_KIND = {
  ring:    { color: "oklch(0.72 0.16 45)",  word: "Klingel gedrückt" },
  person:  { color: "oklch(0.72 0.16 250)", word: "Person erkannt" },
  motion:  { color: "oklch(0.72 0.16 145)", word: "Bewegung erkannt" },
  package: { color: "oklch(0.72 0.16 320)", word: "Paket abgelegt" },
  other:   { color: "oklch(0.72 0.02 260)", word: "Ereignis" },
};

const CAMERA_CSS = `
.card{
  color:oklch(0.98 0.004 260);
  border-color:oklch(0.99 0.004 260 / 0.16);
  background:linear-gradient(115deg, oklch(0.30 0.14 285) 0%, oklch(0.22 0.10 300) 50%, oklch(0.26 0.13 330) 100%);
  padding:0;
  -webkit-mask-image:-webkit-radial-gradient(#fff,#000);
  mask-image:radial-gradient(#fff,#000);
}
.card > .wash,.card > .rise,.card > .gloss{display:none}
.card.dbl.cam-full{grid-template-columns:minmax(0,1fr);grid-template-areas:"b";grid-template-rows:minmax(0,1fr)}
.card.cam-full > .zd{display:none}
.card > .zb{position:relative;z-index:3;padding:0;overflow:hidden}

.cam{display:flex;flex-direction:column;height:100%;min-height:0}

/* Kopf — Maße wie bei allen Prism-Karten */
.cam-hd{flex:none;display:flex;align-items:center;gap:clamp(7px,calc(var(--u) * .168),12px);
  padding:var(--p-pad) var(--p-pad) calc(var(--p-pad) * .66)}
.cam-badge{flex:none;width:clamp(28px,calc(var(--u) * .66),42px);height:clamp(28px,calc(var(--u) * .66),42px);
  border-radius:calc(var(--p-radius) * .45);display:grid;place-items:center;
  background:oklch(0.99 0.004 260 / 0.10);border:1px solid oklch(0.99 0.004 260 / 0.16)}
.cam-badge ha-icon{--mdc-icon-size:clamp(16px,calc(var(--u) * .36),24px);color:oklch(0.97 0.004 260)}
.cam-titles{flex:1;min-width:0;display:flex;flex-direction:column}
.cam-title{font-family:var(--p-display);font-weight:800;letter-spacing:-.02em;line-height:1.12;
  font-size:var(--t-title);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cam-sub{font-family:var(--p-mono);font-weight:700;letter-spacing:.1em;text-transform:uppercase;
  color:oklch(0.82 0.05 310);line-height:1.2;margin-top:.25em;font-size:var(--t-state);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cam-pill{flex:none;white-space:nowrap;display:flex;align-items:center;gap:.5em;cursor:pointer;
  padding:calc(var(--u) * .12) calc(var(--u) * .24);border-radius:999px;
  background:oklch(0.99 0.004 260 / 0.10);border:1px solid oklch(0.99 0.004 260 / 0.16);
  font-family:var(--p-display);font-weight:600;font-size:clamp(9px,calc(var(--u) * .23),13px)}
.cam-pill i{width:clamp(5px,calc(var(--u) * .12),7px);aspect-ratio:1;border-radius:50%;
  background:oklch(0.85 0.14 145)}
.cam-pill.off i{background:oklch(0.65 0.02 260)}

/* Körper */
.cam-body{flex:1;min-height:0;display:grid;
  grid-template-columns:minmax(0,1fr) clamp(96px, 40%, 300px);
  gap:calc(var(--u) * .27);padding:0 var(--p-pad) var(--p-pad)}

/* Kamerabild */
.cam-shot{position:relative;min-height:0;border-radius:calc(var(--p-radius) * .7);overflow:hidden;
  border:1px solid oklch(0.99 0.004 260 / 0.16);cursor:pointer;
  background:repeating-linear-gradient(135deg, oklch(0.34 0.03 300) 0 9px, oklch(0.29 0.03 300) 9px 18px)}
.cam-shot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.cam-shot .scrim{position:absolute;inset:0;
  background:linear-gradient(to top, oklch(0.16 0.06 300 / 0.9), transparent 60%)}
.cam-shot .cap{position:absolute;left:calc(var(--u) * .3);bottom:calc(var(--u) * .27);right:calc(var(--u) * .3)}
.cam-shot .cap b{display:block;font-family:var(--p-display);font-weight:600;line-height:1.2;
  font-size:clamp(12px,calc(var(--u) * .36),21px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cam-shot .cap span{display:block;font-family:var(--p-mono);color:oklch(0.82 0.05 310);margin-top:.2em;
  font-size:clamp(8px,calc(var(--u) * .21),12px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cam-ring{position:absolute;top:calc(var(--u) * .22);right:calc(var(--u) * .22);
  padding:calc(var(--u) * .1) calc(var(--u) * .2);border-radius:999px;
  background:oklch(0.72 0.16 45);color:oklch(0.16 0.03 45);
  font-family:var(--p-display);font-weight:700;letter-spacing:.06em;
  font-size:clamp(8px,calc(var(--u) * .2),12px);animation:cam-ring 1.4s ease-in-out infinite}
@keyframes cam-ring{0%,100%{opacity:1}50%{opacity:.45}}

/* Ereignisliste */
.cam-list{display:flex;flex-direction:column;gap:calc(var(--u) * .15);min-height:0;
  overflow-y:auto;padding-right:4px;scrollbar-width:thin;
  scrollbar-color:oklch(0.99 0.004 260 / 0.35) transparent}
.cam-list::-webkit-scrollbar{width:6px}
.cam-list::-webkit-scrollbar-thumb{background:oklch(0.99 0.004 260 / 0.3);border-radius:3px}
.cam-ev{flex:none;display:flex;align-items:center;gap:calc(var(--u) * .21);cursor:pointer;
  height:clamp(38px,calc(var(--u) * 1.11),62px);padding:0 calc(var(--u) * .23);
  border-radius:calc(var(--p-radius) * .5);
  background:oklch(0.99 0.004 260 / 0.10);border:1px solid oklch(0.99 0.004 260 / 0.16);
  backdrop-filter:blur(8px)}
.cam-ev > i{width:4px;flex:none;align-self:stretch;margin:clamp(7px,calc(var(--u) * .21),13px) 0;
  border-radius:2px;background:var(--k)}
.cam-ev .txt{flex:1;min-width:0}
.cam-ev .txt b{display:block;font-family:var(--p-display);font-weight:600;line-height:1.25;
  font-size:clamp(9.5px,calc(var(--u) * .25),14px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cam-ev .txt span{display:block;font-family:var(--p-mono);color:oklch(0.82 0.05 310);
  font-size:clamp(7.5px,calc(var(--u) * .19),11px);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cam-ev time{flex:none;font-family:var(--p-mono);color:oklch(0.82 0.05 310);
  font-size:clamp(8px,calc(var(--u) * .21),12px)}
.cam-empty{margin:auto;text-align:center;color:oklch(0.82 0.05 310);
  font-size:clamp(9px,calc(var(--u) * .23),13px)}

/* Erst bei sehr schmalen Karten weicht die Liste. Eine Doppelkarte ist
   auf dem Handy oft nur rund 400 px breit — dort soll die Liste bleiben,
   nur schmaler werden. */
@container (max-width: 300px){
  .cam-body{grid-template-columns:minmax(0,1fr)}
  .cam-list{display:none}
}
/* Zwischenstufe: Liste ohne Uhrzeit, damit Titel und Kamera lesbar bleiben */
@container (max-width: 420px){
  .cam-ev{gap:calc(var(--u) * .16);padding:0 calc(var(--u) * .17)}
  .cam-ev time{display:none}
  .cam-ev .txt span{display:none}
}
@media (prefers-reduced-motion: reduce){.cam-ring{animation:none}}
`;

class PrismCameraCard extends PrismCard {
  static defaults = { title: "Aussenbereich", refresh_interval: 10, max: 20, hours: 24 };
  static stub = { title: "Aussenbereich" };
  static double = true;
  static css = CAMERA_CSS;

  setConfig(config) {
    if (!config || !config.camera) throw new Error("prism-camera-card: 'camera' ist Pflicht — die Kamera der Türklingel.");
    super.setConfig(config);
    this._events = null; this._evTs = 0; this._shotTick = 0;
    this._startShot();
  }
  connectedCallback() { this._startShot(); }
  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._shot) { clearInterval(this._shot); this._shot = null; }
  }
  _startShot() {
    if (this._shot) clearInterval(this._shot);
    const sec = Math.max(2, parseInt(this._config && this._config.refresh_interval) || 10);
    /* Neues Standbild anfordern, indem der Bild-URL ein Zeitstempel angehängt wird */
    this._shot = setInterval(() => { this._shotTick = Date.now(); this._sig = null; this._render(); }, sec * 1000);
  }
  onHass() { this._maybeEvents(); }

  /* Melder, aus denen Ereignisse entstehen */
  _sources() {
    const cfg = this._config;
    const out = [];
    toList(cfg.event_entities).forEach((e) => {
      const o = typeof e === "string" ? { entity: e } : Object.assign({}, e);
      if (o.entity) out.push(o);
    });
    return out;
  }

  async _maybeEvents() {
    const cfg = this._config, hass = this._hass;
    const src = this._sources();
    if (!src.length || !hass) return;
    const now = Date.now();
    if (now - this._evTs < 60 * 1000) return;
    this._evTs = now;
    const hours = Math.max(1, parseInt(cfg.hours) || 24);
    const start = new Date(now - hours * 3600 * 1000).toISOString();
    try {
      const res = await hass.callWS({
        type: "history/history_during_period",
        start_time: start,
        entity_ids: src.map((s) => s.entity),
        minimal_response: true,
        no_attributes: true,
      });
      const list = [];
      for (const s of src) {
        const rows = res[s.entity] || [];
        let prev = null;
        for (const r of rows) {
          const state = r.s !== undefined ? r.s : r.state;
          const ts = (r.lu !== undefined ? r.lu * 1000 : Date.parse(r.last_updated));
          /* Nur der Wechsel auf „on" ist ein Ereignis */
          if (state === "on" && prev !== "on") {
            list.push({
              t: ts,
              kind: s.type || camEventKind(s.entity, s.name),
              cam: s.name || friendly(hass, s.entity),
              entity: s.camera || s.entity,
            });
          }
          prev = state;
        }
      }
      list.sort((a, b) => b.t - a.t);
      this._events = list.slice(0, Math.max(1, parseInt(cfg.max) || 20));
      this._sig = null;
      this._render();
    } catch (e) { this._events = []; }
  }

  view(hass, cfg) {
    const camSt = hass.states[cfg.camera];
    let pic = camSt && camSt.attributes.entity_picture;
    if (pic && this._shotTick) pic += (pic.includes("?") ? "&" : "?") + "prism=" + this._shotTick;

    const ringing = cfg.ring_entity && stateOf(hass, cfg.ring_entity) === "on";
    const online = cfg.status_entity ? isReachable(hass, cfg.status_entity)
      : !!camSt && !["unavailable", "unknown"].includes(camSt.state);

    const evts = this._events || [];
    const last = evts[0];
    const fmtTime = (t) => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const fmtFull = (t) => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const sub = cfg.subtitle || [
      this._sources().length ? this._sources().length + " Melder" : null,
      cfg.ring_entity ? "Klingel" : null,
      online ? "LAN" : "getrennt",
    ].filter(Boolean).join(" · ");

    const meta = ringing ? "Es klingelt"
      : last ? (CAM_KIND[last.kind] || CAM_KIND.other).word + " · " + fmtFull(last.t)
      : (camSt ? "Bereit" : "Keine Verbindung");

    return {
      tone: "violet", ink: "#FFFFFF",
      fill: 0, quiet: false,
      sig: [pic, ringing, online, sub, meta, evts.map((e) => e.t + e.kind).join("|")],
      head: "", foot: "",
      body: `<div class="cam">
        <div class="cam-hd">
          <span class="cam-badge"><ha-icon icon="${cfg.icon || "mdi:cctv"}"></ha-icon></span>
          <span class="cam-titles">
            <span class="cam-title">${esc(cfg.title)}</span>
            <span class="cam-sub">${esc(sub)}</span>
          </span>
          <span class="cam-pill ${online ? "" : "off"}" id="cam-pill">
            <i></i>${online ? "Online" : "Offline"}</span>
        </div>
        <div class="cam-body">
          <div class="cam-shot" id="cam-shot">
            ${pic ? `<img src="${esc(pic)}" alt="${esc(cfg.name || cfg.title)}">` : ""}
            <span class="scrim"></span>
            ${ringing ? `<span class="cam-ring">ES KLINGELT</span>` : ""}
            <span class="cap">
              <b>${esc(cfg.name || friendly(hass, cfg.camera))}</b>
              <span>${esc(meta)}</span>
            </span>
          </div>
          <div class="cam-list">
            ${evts.length ? evts.map((e, i) => {
              const k = CAM_KIND[e.kind] || CAM_KIND.other;
              return `<div class="cam-ev" data-i="${i}" style="--k:${k.color}">
                <i></i>
                <span class="txt"><b>${esc(k.word)}</b><span>${esc(e.cam)}</span></span>
                <time>${esc(fmtTime(e.t))}</time>
              </div>`;
            }).join("")
            : `<div class="cam-empty">${this._events === null ? "Ereignisse werden geladen…"
                : "Keine Ereignisse in den letzten " + (parseInt(cfg.hours) || 24) + " Stunden"}</div>`}
          </div>
        </div>
      </div>`,
    };
  }

  wire() {
    const cfg = this._config;
    const card = this.shadowRoot.querySelector(".card");
    if (card) card.classList.add("cam-full");
    this._on("cam-shot", () => this._moreInfo(cfg.camera));
    this._on("cam-pill", () => this._moreInfo(cfg.status_entity || cfg.camera));
    const evts = this._events || [];
    this.shadowRoot.querySelectorAll(".cam-ev").forEach((el) => {
      el.addEventListener("click", () => {
        const e = evts[parseInt(el.getAttribute("data-i"))];
        this._moreInfo(e ? e.entity : cfg.camera);
      });
    });
  }
}

register("prism-camera-card", PrismCameraCard, {
  name: "Prism Camera Card",
  description: "Doppel-Quadrat. Türklingelbild mit Ereignisliste der Außenmelder.",
}, [
  { name: "title", selector: { text: {} } },
  { name: "subtitle", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "camera", selector: { entity: { filter: [{ domain: "camera" }] } } },
  { name: "name", selector: { text: {} } },
  { name: "ring_entity", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "status_entity", selector: { entity: { filter: [{ domain: "binary_sensor" }] } } },
  { name: "event_entities", selector: { entity: { multiple: true, filter: [{ domain: "binary_sensor" }] } } },
  { name: "max", selector: { number: { min: 1, max: 100, mode: "box" } } },
  { name: "hours", selector: { number: { min: 1, max: 168, mode: "box", unit_of_measurement: "h" } } },
  { name: "refresh_interval", selector: { number: { min: 2, max: 300, mode: "box", unit_of_measurement: "s" } } },
], {
  title: "Titel",
  subtitle: "Zusatzzeile (leer = wird erzeugt)",
  icon: "Icon im Kopf",
  camera: "Kamera der Türklingel (Pflicht)",
  name: "Beschriftung im Bild",
  ring_entity: "Klingeltaste — schaltet die Plakette „Es klingelt“",
  status_entity: "Erreichbarkeit für die Statuspille",
  event_entities: "Melder, aus denen die Ereignisliste entsteht",
  max: "Höchstzahl der Einträge",
  hours: "Zeitfenster der Liste",
  refresh_interval: "Wie oft ein neues Standbild geholt wird",
});

console.info(
  "%c PRISM-CARDS %c " + PRISM_VERSION + " · 10 Quadrate + 6 Doppel + 2 Mini ",
  "background:#0B0A14;color:#FFC24B;font-weight:700",
  "background:#FFC24B;color:#0B0A14"
);

})();
