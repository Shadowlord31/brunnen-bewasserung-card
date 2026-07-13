# Brunnen Bewässerung Card

Custom Lovelace Card für die [brunnen_bewasserung](https://github.com/Shadowlord31/brunnen_sprinkler) Home Assistant Integration.

Eine Karte, mehrere Ansichten – der Kartentyp wird über einen Dropdown im Karten-Editor gewählt (kein manuelles Eintragen von Entity-IDs nötig, die Karte findet ihre Entities selbst über das ausgewählte Gerät).

## Installation über HACS

1. HACS → Frontend → Menü (⋮) → Benutzerdefinierte Repositories
2. Repository-URL: `https://github.com/Shadowlord31/brunnen-bewasserung-card`, Kategorie: Dashboard
3. "Brunnen Bewässerung Card" installieren
4. Home Assistant neu laden (Browser-Cache leeren falls nötig)

## Verwendung

Karte hinzufügen → "Brunnen Bewässerung Card" auswählen → im Editor:

- **Kartentyp**: `garten` / `automatik` / `manuell` / `zone_einstellungen` / `garten_einstellungen` / `aktivitaet` / `logbuch`
- **Gerät(e)**: das/die zugehörige(n) Gerät(e) aus der Integration auswählen

| Kartentyp | Zeigt |
|---|---|
| `garten` | Bewässerung-aktiv-Status, Automatik/Manuell-Übersicht, Brunnenzähler, Brunnenpause-Restzeit |
| `automatik` | Zonen-Status, Etappe, Restzeit, Start/Stop, Automatik/Wind-Toggle |
| `manuell` | Ventil auf/zu, Aktiv-/Brunnenpause-Status |
| `zone_einstellungen` | Alle number/time-Einstellungen der Zone |
| `garten_einstellungen` | Alle number/time-Einstellungen des Gartens |
| `aktivitaet` | Status-Übersicht über mehrere Geräte (Garten + Zonen) |
| `logbuch` | Live mitscrollender Verlauf (natives `ha-logbook`) über mehrere Geräte |

Bei `aktivitaet` und `logbuch` können mehrere Geräte ausgewählt werden.

## Beispiel-YAML

```yaml
type: custom:brunnen-bewasserung-card
card_type: garten
devices:
  - <device_id des Garten-Geräts>
```

```yaml
type: custom:brunnen-bewasserung-card
card_type: aktivitaet
devices:
  - <device_id Garten>
  - <device_id Beet>
  - <device_id Rabatte>
```
