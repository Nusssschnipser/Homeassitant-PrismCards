# Prism Cards

> Deutsche Fassung. English version: [README.md](README.md).

Eine Sammlung von 18 Lovelace-Karten für Home Assistant. Gemeinsame Formensprache, eine gemeinsame Größenskala, keine Abhängigkeiten und kein Build-Schritt — eine einzige JavaScript-Datei.

![Version](https://img.shields.io/badge/version-v52-blue) ![HACS](https://img.shields.io/badge/HACS-custom-orange) ![Lizenz](https://img.shields.io/badge/Lizenz-MIT-green)

---

## Installation

### Über HACS

1. HACS öffnen, oben rechts das Dreipunktmenü, **Benutzerdefinierte Repositories**.
2. Adresse dieses Repositoriums eintragen, Kategorie **Lovelace**.
3. „Prism Cards" suchen und installieren.
4. Home Assistant neu laden.

### Von Hand

1. `dist/prism-cards.js` nach `/config/www/prism-cards.js` kopieren.
2. **Einstellungen → Dashboards → Ressourcen → Ressource hinzufügen**:
   - URL: `/local/prism-cards.js?v=52`
   - Typ: JavaScript-Modul
3. Seite mit Strg+Umschalt+R neu laden.

> Der Parameter `?v=44` zwingt den Browser zum Neuladen. Zähl ihn bei jeder
> Aktualisierung hoch — sonst zeigt der Cache die alte Fassung.

**Version prüfen:** In der Browser-Konsole erscheint beim Laden eine Zeile wie
`PRISM-CARDS v52 · 15 Quadrate + 11 Doppel + 2 Mini`. Alternativ in der Konsole
`PRISM_VERSION` eingeben.

---

## Die Karten

### Standard-Quadrat — `grid_columns: 6`

| Karte | Zweck |
|---|---|
| `prism-light-card` | Übersicht aller Lichter, Räume als Zeilen, Anteil eingeschalteter Lampen |
| `prism-security-card` | Offene Fenster per Label, Haustür, Garage, Alarm |
| `prism-room-card` | Raumkachel: Licht, Fenster, Präsenz, Temperatur — Bereich liefert alles |
| `prism-temperature-card` | Innentemperatur mit Verlauf, wärmster und kältester Raum |
| `prism-weather-card` | Animierter Wetterhintergrund, Vier-Tage-Vorhersage, Mondphase |
| `prism-media-card` | Cover als Hintergrund, Steuerung, wählt den aktiven Player |
| `prism-network-card` | Online-Puls, Download und Upload mit Verlauf |
| `prism-system-card` | Terminal-Optik: Batterien, Zigbee-Ausfälle, offene Updates |
| `prism-heizung-card` | Kesselring, Brenner, Ladepumpe, vier Messwerte, Gasverbrauch |
| `prism-calendar-card` | Termine mehrerer Kalender (belegt vier Quadrate, `columns: 12`) |

### Doppel-Quadrat — `grid_columns: 12`

| Karte | Zweck |
|---|---|
| `prism-energy-card` | Spiegelgraph aus PV-Erzeugung und Verbrauch, Akku als Röhre |
| `prism-vehicle-card` | Fahrzeugbild, Ladestand, Verriegelung, Standort |
| `prism-ev-card` | Am Ladepunkt EVCC-Werte mit Modus-Pille, sonst die Fahrzeugansicht |
| `prism-printer-card` | Bambu Lab: Vorschaubild, Fortschritt, AMS-Fächer, Ein-/Ausschalter |
| `prism-clock-card` | Uhr in drei Bauarten: Sieben-Segment, Fallblatt, klassisch |
| `prism-camera-card` | Türklingelbild mit Ereignisliste der Außenmelder |

### Viertel-Quadrat — `grid_columns: 3`

| Karte | Zweck |
|---|---|
| `prism-mini-card` | Wert, Zustand, Navigation oder Gerät mit Restzeit |
| `prism-vacuum-card` | Ein Saugroboter je Karte, Icon und Farbe folgen dem Zustand |

Vier Viertel-Quadrate ergeben ein Standard-Quadrat, zwei Standard-Quadrate ein Doppel-Quadrat.

---

## Beispiele

```yaml
# Wetter
type: custom:prism-weather-card
weather: weather.home
moon_phase: sensor.moon_phase
outside_temp: sensor.aussentemperatur

# Energie und PV
type: custom:prism-energy-card
pv_power: sensor.pv_leistung
consumption_power: sensor.hausverbrauch
battery_soc: sensor.hausakku_soc
battery_charge: sensor.hausakku_ladung
battery_capacity: 5

# Saugroboter
type: custom:prism-vacuum-card
entity: vacuum.erdgeschoss
battery: sensor.erdgeschoss_battery_level
last_clean: sensor.erdgeschoss_cleaning_history
```

Ersetze die Entitäten durch deine eigenen — die Namen oben sind Beispiele.

Jede Karte hat einen grafischen Editor — Karte hinzufügen, „Prism" eintippen,
Entitäten auswählen. Die YAML-Beispiele sind nur die Kurzform.

---

## Gestaltung anpassen

Alle Karten teilen sich eine Skala. Grundlage ist `--u`, die Breite einer
Rasterspalte des Dashboards. Dadurch schreibt eine dreispaltige Mini-Karte
genauso groß wie eine zwölfspaltige Doppelkarte.

```css
--t-title    Kartentitel
--t-state    Statuszeile
--t-hero     die eine große Zahl
--t-value    Werte in Kacheln und Zeilen
--t-label    Beschriftungen in Versalien
```

Im Theme lassen sich Farben und Maße überschreiben:

```yaml
# themes.yaml
mein-theme:
  prism-radius: 24px
  prism-grid-gap: 8px        # Rasterabstand des Dashboards
  prism-ink: "#0B0A14"
  prism-hz-accent: "#FF8A3D" # Akzent der Heizungskarte
```

`prism-grid-gap` sorgt dafür, dass Doppelkarten exakt so hoch sind wie die
Quadrate daneben. Steht dein Dashboard auf einem anderen Abstand, hier setzen.

---

## Anforderungen

- Home Assistant 2024.2 oder neuer (Sections-Dashboard mit `grid_options`)
- Ein moderner Browser: die Karten nutzen Container-Abfragen
- Für Verlaufsgrafiken muss der Recorder die jeweiligen Entitäten aufzeichnen

---

## Mitwirken

Fehler und Wünsche gern als Issue. Bei Darstellungsproblemen hilft ein
Screenshot samt Angabe der Kartenbreite — die meisten Fehler in dieser Sammlung
waren Höhen- und Skalierungsfragen, und die lassen sich ohne Bild kaum finden.

## Lizenz

MIT — siehe [LICENSE](LICENSE).
