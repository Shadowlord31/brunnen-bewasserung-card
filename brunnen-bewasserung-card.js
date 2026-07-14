// Brunnen Bewässerung Card
// https://github.com/Shadowlord31/brunnen-bewasserung-card
//
// Custom Lovelace Card für die "Brunnen Bewässerung" Integration
// (https://github.com/Shadowlord31/brunnen_sprinkler).
//
// Ein Kartentyp (card_type) pro Ansicht: garten, garten_einstellungen,
// automatik, manuell, zone_einstellungen, aktivitaet, logbuch.
// Entities werden automatisch über das/die ausgewählte(n) Gerät(e)
// (jeder Garten/jede Zone ist ein eigenes HA-Gerät) + original_name
// aufgelöst - kein manuelles Eintragen von entity_ids nötig.

(() => {
  const LitElementBase =
    customElements.get("hui-masonry-view") ||
    customElements.get("hui-view") ||
    customElements.get("hc-lovelace");
  const LitElement = Object.getPrototypeOf(LitElementBase);
  const html = LitElement.prototype.html;
  const css = LitElement.prototype.css;

  // ---------------------------------------------------------------------
  // Entity-Auflösung über device_id + original_name
  // ---------------------------------------------------------------------

  function entitiesForDevice(hass, deviceId) {
    if (!hass || !hass.entities || !deviceId) return [];
    return Object.values(hass.entities).filter(
      (e) => e.device_id === deviceId
    );
  }

  function findEntity(hass, deviceId, domain, name) {
    const ents = entitiesForDevice(hass, deviceId);
    const match = ents.find(
      (e) =>
        e.entity_id.startsWith(domain + ".") &&
        (e.original_name === name || e.name === name)
    );
    return match ? match.entity_id : null;
  }

  function isManuellDevice(hass, deviceId) {
    return !!findEntity(hass, deviceId, "switch", "Ventil");
  }

  function isGartenDevice(hass, deviceId) {
    return !!findEntity(hass, deviceId, "sensor", "Brunnen Zähler");
  }

  function deviceName(hass, deviceId) {
    if (hass.devices && hass.devices[deviceId]) {
      return hass.devices[deviceId].name_by_user || hass.devices[deviceId].name || deviceId;
    }
    return deviceId;
  }

  function resolveGarten(hass, deviceId) {
    return {
      aktiv: findEntity(hass, deviceId, "binary_sensor", "Bewässerung aktiv"),
      automatik_aktiv: findEntity(hass, deviceId, "binary_sensor", "Automatik aktiv"),
      brunnen_zahler: findEntity(hass, deviceId, "sensor", "Brunnen Zähler"),
      manuell_offen: findEntity(hass, deviceId, "sensor", "Manuell offen"),
      brunnenpause_restzeit: findEntity(hass, deviceId, "sensor", "Brunnenpause Restzeit"),
      auto_pump_off: findEntity(hass, deviceId, "switch", "Pumpe automatisch ausschalten"),
      fruehestzeit: findEntity(hass, deviceId, "time", "Frühestzeit Start"),
      liter_bis_pause: findEntity(hass, deviceId, "number", "Liter bis Brunnenpause"),
      reset_timeout: findEntity(hass, deviceId, "number", "Brunnen-Reset Timeout"),
      block_dauer: findEntity(hass, deviceId, "number", "Block-Dauer"),
      pause_dauer: findEntity(hass, deviceId, "number", "Pause-Dauer"),
      min_laufzeit: findEntity(hass, deviceId, "number", "Minimale Laufzeit"),
      max_laufzeit: findEntity(hass, deviceId, "number", "Maximale Laufzeit"),
      solar_schwelle: findEntity(hass, deviceId, "number", "Solar-Schwellwert"),
      wind_geschw: findEntity(hass, deviceId, "number", "Max. Windgeschwindigkeit"),
      wind_boe: findEntity(hass, deviceId, "number", "Max. Windböe"),
    };
  }

  function resolveZone(hass, deviceId) {
    return {
      status: findEntity(hass, deviceId, "sensor", "Status"),
      restzeit: findEntity(hass, deviceId, "sensor", "Restzeit"),
      next_start: findEntity(hass, deviceId, "sensor", "Nächster Start"),
      etappe: findEntity(hass, deviceId, "sensor", "Aktuelle Etappe"),
      aktiv: findEntity(hass, deviceId, "binary_sensor", "Bewässerung aktiv"),
      pause_aktiv: findEntity(hass, deviceId, "binary_sensor", "Pause aktiv"),
      wind_pause_aktiv: findEntity(hass, deviceId, "binary_sensor", "Wind-Pause aktiv"),
      automatik: findEntity(hass, deviceId, "switch", "Automatik"),
      wind_ignorieren: findEntity(hass, deviceId, "switch", "Windpause ignorieren"),
      start: findEntity(hass, deviceId, "button", "Start"),
      stop: findEntity(hass, deviceId, "button", "Stop"),
      reset: findEntity(hass, deviceId, "button", "Heute zurücksetzen"),
      startzeit: findEntity(hass, deviceId, "time", "Startzeit"),
      ziel_feuchte: findEntity(hass, deviceId, "number", "Ziel-Bodenfeuchte"),
      sek_pro_prozent: findEntity(hass, deviceId, "number", "Sekunden pro Prozent"),
      feste_laufzeit: findEntity(hass, deviceId, "number", "Feste Laufzeit"),
    };
  }

  function resolveManuell(hass, deviceId) {
    return {
      ventil: findEntity(hass, deviceId, "switch", "Ventil"),
      aktiv: findEntity(hass, deviceId, "binary_sensor", "Aktiv"),
      brunnenpause: findEntity(hass, deviceId, "binary_sensor", "Brunnenpause"),
    };
  }

  const STATUS_LABELS = {
    idle: "Bereit",
    watering: "Läuft",
    pausing: "Pause",
    waiting_water: "Brunnenpause",
    wind_hold: "Wind-Pause",
    waiting_zone: "Wartet auf Zone",
  };

  const STATUS_ICON = {
    idle: "✅",
    watering: "💧",
    pausing: "⏸️",
    waiting_water: "⏳",
    wind_hold: "💨",
    waiting_zone: "🕓",
  };

  const STATUS_COLOR_VAR = {
    idle: "var(--success-color, #4caf50)",
    watering: "var(--info-color, #2196f3)",
    pausing: "var(--warning-color, #ff9800)",
    waiting_water: "var(--warning-color, #ff9800)",
    wind_hold: "var(--error-color, #f44336)",
    waiting_zone: "var(--disabled-text-color, #9e9e9e)",
  };

  function fmtMinSec(seconds) {
    const s = Math.max(0, Math.round(seconds || 0));
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${m}:${String(rest).padStart(2, "0")} min`;
  }

  // ---------------------------------------------------------------------
  // Card
  // ---------------------------------------------------------------------

  class BrunnenBewasserungCard extends LitElement {
    static get properties() {
      return { hass: {}, _config: {} };
    }

    constructor() {
      super();
      // Merkt sich pro Geraet die hoechste beobachtete Restzeit eines Laufs,
      // um den Fortschrittsbalken (Restzeit) korrekt von 100% auf 0% ablaufen
      // zu lassen. "Etappe" und "Restzeit" sind beides Restzeiten und daher
      // fuer eine direkte Verhaeltnisbildung ungeeignet.
      this._peakRestzeit = {};
    }

    setConfig(config) {
      if (!config.card_type) {
        throw new Error("card_type ist erforderlich (z.B. 'garten').");
      }
      this._config = config;
    }

    getCardSize() {
      return this._config && this._config.card_type === "logbuch" ? 6 : 3;
    }

    static get styles() {
      return css`
        ha-card {
          padding: 16px;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.15em;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.85em;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--secondary-background-color);
        }
        .settings-badge {
          margin-left: auto;
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
          color: var(--secondary-text-color);
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }
        .muted {
          color: var(--secondary-text-color);
          font-size: 0.9em;
        }
        .bar-bg {
          background: var(--divider-color);
          border-radius: 6px;
          height: 8px;
          overflow: hidden;
          margin: 8px 0;
          position: relative;
        }
        .bar-fill {
          height: 100%;
          transition: width 0.6s ease;
        }
        .bar-bg.big-bar {
          height: 28px;
          border-radius: 8px;
        }
        .bar-bg.big-bar .bar-fill {
          position: absolute;
          top: 0;
          left: 0;
        }
        .bar-bg.big-bar .bar-label {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85em;
          font-weight: 600;
          color: var(--primary-text-color);
          text-shadow: 0 0 4px var(--card-background-color, white);
        }
        .buttons {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          flex-wrap: wrap;
        }
        .buttons ha-control-button {
          flex: 1 1 auto;
          min-width: 90px;
        }
        .toggles {
          display: flex;
          gap: 16px;
          margin-top: 10px;
        }
        .toggle-item {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }
        .settings-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--divider-color);
        }
        .settings-row:last-child {
          border-bottom: none;
        }
        .settings-row ha-selector {
          width: 120px;
        }
        .act-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--divider-color);
          cursor: pointer;
        }
        .act-row:last-of-type {
          border-bottom: none;
        }
        .act-name {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
        .missing {
          color: var(--error-color);
          padding: 8px 0;
        }
        .section-title {
          font-weight: 600;
          margin: 12px 0 4px 0;
          color: var(--secondary-text-color);
          font-size: 0.85em;
          text-transform: uppercase;
        }
        ha-logbook {
          --logbook-max-height: 420px;
        }
      `;
    }

    _st(id) {
      return id ? this.hass.states[id] : undefined;
    }

    _val(id) {
      const s = this._st(id);
      return s ? s.state : undefined;
    }

    _num(id, fallback = 0) {
      const v = parseFloat(this._val(id));
      return Number.isNaN(v) ? fallback : v;
    }

    _friendly(id, fallback) {
      const s = this._st(id);
      return s ? s.attributes.friendly_name || fallback : fallback;
    }

    _call(id, service, data = {}) {
      if (!id) return;
      const domain = id.split(".")[0];
      this.hass.callService(domain, service, { entity_id: id, ...data });
    }

    _toggle(id) {
      this._call(id, "toggle");
    }

    _press(id) {
      this._call(id, "press");
    }

    _setNumber(id, value) {
      this._call(id, "set_value", { value });
    }

    _setTime(id, value) {
      this._call(id, "set_value", { time: value });
    }

    // ha-textfield/ha-time-input werden von HA nicht in jeder Ansicht
    // vorab geladen und bleiben dann leer/nicht interaktiv. ha-selector
    // ist immer verfügbar, daher nutzen wir number/time-Selector.
    _numberField(id, unit) {
      const s = this._st(id);
      const attrs = s ? s.attributes : {};
      return html`
        <ha-selector
          .hass=${this.hass}
          .selector=${{
            number: {
              min: attrs.min ?? 0,
              max: attrs.max ?? 1000,
              step: attrs.step ?? 1,
              mode: "box",
              unit_of_measurement: unit,
            },
          }}
          .value=${this._num(id)}
          @value-changed=${(ev) => this._setNumber(id, ev.detail.value)}
        ></ha-selector>
      `;
    }

    _timeField(id) {
      return html`
        <ha-selector
          .hass=${this.hass}
          .selector=${{ time: {} }}
          .value=${this._val(id)}
          @value-changed=${(ev) => this._setTime(id, ev.detail.value)}
        ></ha-selector>
      `;
    }

    // ---------------------------------------------------------------------
    // Optionales Einstellungen-Badge (Navigation zu Seite oder More-Info-Popup)
    // ---------------------------------------------------------------------
    _navigate(path) {
      history.pushState(null, "", path);
      const event = new Event("location-changed", { bubbles: true, composed: true });
      event.detail = { replace: false };
      window.dispatchEvent(event);
    }

    _showMoreInfo(entityId) {
      const event = new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      });
      this.dispatchEvent(event);
    }

    _settingsBadge() {
      const path = this._config.settings_navigate;
      const entity = this._config.settings_entity;
      if (!path && !entity) return "";
      return html`
        <ha-icon-button
          class="settings-badge"
          @click=${(ev) => {
            ev.stopPropagation();
            if (path) this._navigate(path);
            else this._showMoreInfo(entity);
          }}
        >
          <ha-icon icon="mdi:cog"></ha-icon>
        </ha-icon-button>
      `;
    }

    _missing(label) {
      return html`<ha-card
        ><div class="missing">
          ⚠️ ${label}: Gerät nicht gefunden oder keine passenden Entities.
          Prüfe die Geräte-Auswahl im Karten-Editor.
        </div></ha-card
      >`;
    }

    render() {
      if (!this.hass || !this._config) return html``;
      switch (this._config.card_type) {
        case "garten":
          return this._renderGarten();
        case "garten_einstellungen":
          return this._renderGartenEinstellungen();
        case "automatik":
          return this._renderAutomatik();
        case "manuell":
          return this._renderManuell();
        case "zone_einstellungen":
          return this._renderZoneEinstellungen();
        case "aktivitaet":
          return this._renderAktivitaet();
        case "logbuch":
          return this._renderLogbuch();
        default:
          return html`<ha-card
            ><div class="missing">
              Unbekannter card_type: ${this._config.card_type}
            </div></ha-card
          >`;
      }
    }

    // ---------------- GARTEN ----------------

    _renderGarten() {
      const deviceId = (this._config.devices || [])[0];
      const e = resolveGarten(this.hass, deviceId);
      if (!e.aktiv) return this._missing("Garten");

      const aktiv = this._val(e.aktiv) === "on";
      const automatikAktiv = this._val(e.automatik_aktiv) === "on";
      const manuellOffen = this._val(e.manuell_offen) || "0";
      const zahler = this._num(e.brunnen_zahler);
      const literBisPause = this._num(e.liter_bis_pause, 200);
      const pauseRestzeit = this._num(e.brunnenpause_restzeit);
      const pct = literBisPause > 0 ? Math.min(100, (zahler / literBisPause) * 100) : 0;
      const name = deviceName(this.hass, deviceId);

      return html`
        <ha-card>
          <div class="header">
            <ha-icon icon="mdi:sprinkler-variant"></ha-icon>
            ${name}
            <span
              class="status-pill"
              style="background:${aktiv ? "var(--info-color, #2196f3)" : "var(--secondary-background-color)"}; color:${aktiv ? "white" : "inherit"}"
              >${aktiv ? "💧 Aktiv" : "Inaktiv"}</span
            >
            ${this._settingsBadge()}
          </div>
          <div class="row">
            <span>🤖 Automatik</span>
            <span>${automatikAktiv ? "Ja" : "Nein"}</span>
          </div>
          <div class="row">
            <span>🚰 Manuell offen</span>
            <span>${manuellOffen} Zone(n)</span>
          </div>
          <div class="section-title">Brunnenzähler</div>
          <div class="bar-bg big-bar">
            <div
              class="bar-fill"
              style="width:${pct}%; background:${pct > 85 ? "var(--warning-color,#ff9800)" : "var(--info-color,#2196f3)"}"
            ></div>
            <div class="bar-label">${zahler.toFixed(0)} / ${literBisPause.toFixed(0)} L</div>
          </div>
          ${pauseRestzeit > 0
            ? html`<div class="row">
                <span>⏳ Brunnenpause Restzeit</span>
                <span>${pauseRestzeit} min</span>
              </div>`
            : ""}
        </ha-card>
      `;
    }

    // ---------------- AUTOMATIK ZONE ----------------

    _renderAutomatik() {
      const deviceId = (this._config.devices || [])[0];
      const e = resolveZone(this.hass, deviceId);
      if (!e.status) return this._missing("Automatik-Zone");
      const name = deviceName(this.hass, deviceId);

      const status = this._val(e.status) || "idle";
      const label = STATUS_LABELS[status] || status;
      const icon = STATUS_ICON[status] || "•";
      const color = STATUS_COLOR_VAR[status] || "grey";

      const restzeitMin = this._num(e.restzeit);
      const etappeS = this._num(e.etappe);
      const nextStart = this._val(e.next_start) || "–";
      const automatikOn = this._val(e.automatik) === "on";
      const windIgnorieren = this._val(e.wind_ignorieren) === "on";

      // "Restzeit" und "Etappe" zaehlen beide nur runter (Etappe = Restzeit
      // des aktuellen Blocks), daher kein brauchbares Elapsed/Total-Verhaeltnis
      // direkt aus den Sensoren ableitbar. Stattdessen merken wir uns die
      // hoechste beobachtete Restzeit seit Laufbeginn als "Gesamtdauer" und
      // lassen den Balken von 100% auf 0% ablaufen.
      if (restzeitMin <= 0) {
        delete this._peakRestzeit[deviceId];
      } else if (
        !this._peakRestzeit[deviceId] ||
        restzeitMin > this._peakRestzeit[deviceId]
      ) {
        this._peakRestzeit[deviceId] = restzeitMin;
      }
      const peakRestzeit = this._peakRestzeit[deviceId] || restzeitMin || 1;
      const barPct = peakRestzeit > 0 ? Math.min(100, (restzeitMin / peakRestzeit) * 100) : 0;

      return html`
        <ha-card>
          <div class="header">
            <ha-icon icon="mdi:sprout"></ha-icon>
            ${name}
            <span class="status-pill" style="background:${color}; color:white;"
              >${icon} ${label}</span
            >
            ${this._settingsBadge()}
          </div>
          <div class="row">
            <span class="muted">Restzeit</span>
            <span>${restzeitMin} min</span>
          </div>
          <div class="bar-bg big-bar">
            <div class="bar-fill" style="width:${barPct}%; background:${color}"></div>
            <div class="bar-label">${fmtMinSec(etappeS)}</div>
          </div>
          <div class="row">
            <span class="muted">Nächster Start</span>
            <span>${nextStart}</span>
          </div>

          ${e.automatik || e.wind_ignorieren
            ? html`
                <div class="toggles">
                  ${e.automatik
                    ? html`
                        <div class="toggle-item">
                          <ha-switch
                            .checked=${automatikOn}
                            @change=${() => this._toggle(e.automatik)}
                          ></ha-switch>
                          <span>🤖 Automatik</span>
                        </div>
                      `
                    : ""}
                  ${e.wind_ignorieren
                    ? html`
                        <div class="toggle-item">
                          <ha-switch
                            .checked=${windIgnorieren}
                            @change=${() => this._toggle(e.wind_ignorieren)}
                          ></ha-switch>
                          <span>💨 Wind ignor.</span>
                        </div>
                      `
                    : ""}
                </div>
              `
            : ""}

          <div class="buttons">
            ${e.start
              ? html`<ha-control-button @click=${() => this._press(e.start)}
                  ><ha-icon icon="mdi:play"></ha-icon> Start</ha-control-button
                >`
              : ""}
            ${e.stop
              ? html`<ha-control-button @click=${() => this._press(e.stop)}
                  ><ha-icon icon="mdi:stop"></ha-icon> Stop</ha-control-button
                >`
              : ""}
            ${e.reset
              ? html`<ha-control-button @click=${() => this._press(e.reset)}
                  ><ha-icon icon="mdi:calendar-refresh"></ha-icon
                  >Heute zurücksetzen</ha-control-button
                >`
              : ""}
          </div>
        </ha-card>
      `;
    }

    // ---------------- MANUELL ZONE ----------------

    _renderManuell() {
      const deviceId = (this._config.devices || [])[0];
      const e = resolveManuell(this.hass, deviceId);
      if (!e.ventil) return this._missing("Manuelle Zone");
      const name = deviceName(this.hass, deviceId);

      const offen = this._val(e.ventil) === "on";
      const brunnenpause = this._val(e.brunnenpause) === "on";
      const label = brunnenpause ? "Brunnenpause" : offen ? "Offen" : "Zu";
      const color = brunnenpause
        ? "var(--warning-color, #ff9800)"
        : offen
        ? "var(--info-color, #2196f3)"
        : "var(--disabled-text-color, #9e9e9e)";

      return html`
        <ha-card>
          <div class="header">
            <ha-icon icon="mdi:valve"></ha-icon>
            ${name}
            <span class="status-pill" style="background:${color}; color:white;"
              >${brunnenpause ? "⏳" : offen ? "💧" : "○"} ${label}</span
            >
          </div>
          <div class="buttons">
            <ha-control-button @click=${() => this._toggle(e.ventil)}>
              <ha-icon icon=${offen ? "mdi:valve-open" : "mdi:valve-closed"}></ha-icon>
              Ventil ${offen ? "schließen" : "öffnen"}
            </ha-control-button>
          </div>
        </ha-card>
      `;
    }

    // ---------------- GARTEN EINSTELLUNGEN ----------------

    _renderGartenEinstellungen() {
      const deviceId = (this._config.devices || [])[0];
      const e = resolveGarten(this.hass, deviceId);
      if (!e.liter_bis_pause) return this._missing("Garten-Einstellungen");
      const name = deviceName(this.hass, deviceId);

      const rows = [
        ["mdi:water-sync", "Liter bis Brunnenpause", e.liter_bis_pause, "L"],
        ["mdi:pause-circle-outline", "Pause-Dauer", e.pause_dauer, "min"],
        ["mdi:clock-outline", "Block-Dauer", e.block_dauer, "min"],
        ["mdi:timer-refresh", "Brunnen-Reset Timeout", e.reset_timeout, "min"],
        ["mdi:timer-minus", "Minimale Laufzeit", e.min_laufzeit, "min"],
        ["mdi:timer-plus", "Maximale Laufzeit", e.max_laufzeit, "min"],
        ["mdi:weather-sunny", "Solar-Schwellwert", e.solar_schwelle, "W/m²"],
        ["mdi:weather-windy", "Max. Windgeschwindigkeit", e.wind_geschw, "km/h"],
        ["mdi:weather-windy-variant", "Max. Windböe", e.wind_boe, "km/h"],
      ];

      return html`
        <ha-card>
          <div class="header">
            <ha-icon icon="mdi:cog"></ha-icon>
            ${name} – Einstellungen
          </div>
          ${rows.map(([icon, label, id, unit]) =>
            id
              ? html`
                  <div class="settings-row">
                    <span
                      ><ha-icon icon=${icon} style="margin-right:8px;"></ha-icon
                      >${label}</span
                    >
                    ${this._numberField(id, unit)}
                  </div>
                `
              : ""
          )}
          ${e.fruehestzeit
            ? html`
                <div class="settings-row">
                  <span
                    ><ha-icon icon="mdi:clock-start" style="margin-right:8px;"></ha-icon
                    >Frühestzeit Start</span
                  >
                  ${this._timeField(e.fruehestzeit)}
                </div>
              `
            : ""}
        </ha-card>
      `;
    }

    // ---------------- ZONE EINSTELLUNGEN ----------------

    _renderZoneEinstellungen() {
      const deviceId = (this._config.devices || [])[0];
      const e = resolveZone(this.hass, deviceId);
      if (!e.startzeit && !e.ziel_feuchte && !e.feste_laufzeit)
        return this._missing("Zonen-Einstellungen");
      const name = deviceName(this.hass, deviceId);

      return html`
        <ha-card>
          <div class="header">
            <ha-icon icon="mdi:cog"></ha-icon>
            ${name} – Einstellungen
          </div>
          ${e.startzeit
            ? html`
                <div class="settings-row">
                  <span
                    ><ha-icon icon="mdi:clock-start" style="margin-right:8px;"></ha-icon
                    >Startzeit</span
                  >
                  ${this._timeField(e.startzeit)}
                </div>
              `
            : ""}
          ${e.ziel_feuchte
            ? html`
                <div class="settings-row">
                  <span
                    ><ha-icon icon="mdi:water-percent" style="margin-right:8px;"></ha-icon
                    >Ziel-Bodenfeuchte</span
                  >
                  ${this._numberField(e.ziel_feuchte, "%")}
                </div>
              `
            : ""}
          ${e.sek_pro_prozent
            ? html`
                <div class="settings-row">
                  <span
                    ><ha-icon icon="mdi:timer" style="margin-right:8px;"></ha-icon>Sekunden
                    pro Prozent</span
                  >
                  ${this._numberField(e.sek_pro_prozent, "s/%")}
                </div>
              `
            : ""}
          ${e.feste_laufzeit
            ? html`
                <div class="settings-row">
                  <span
                    ><ha-icon icon="mdi:timer" style="margin-right:8px;"></ha-icon>Feste
                    Laufzeit</span
                  >
                  ${this._numberField(e.feste_laufzeit, "min")}
                </div>
              `
            : ""}
        </ha-card>
      `;
    }

    // ---------------- AKTIVITÄT ----------------

    _renderAktivitaet() {
      const deviceIds = this._config.devices || [];
      if (!deviceIds.length) return this._missing("Aktivität");

      const rows = deviceIds.map((deviceId) => {
        const name = deviceName(this.hass, deviceId);
        if (isGartenDevice(this.hass, deviceId)) {
          const e = resolveGarten(this.hass, deviceId);
          const aktiv = this._val(e.aktiv) === "on";
          const pauseRestzeit = this._num(e.brunnenpause_restzeit);
          const detail =
            pauseRestzeit > 0
              ? `Brunnenpause: ${pauseRestzeit} min`
              : aktiv
              ? "Bewässerung aktiv"
              : "Inaktiv";
          return {
            name,
            icon: "💧",
            color: aktiv ? "var(--info-color,#2196f3)" : "var(--disabled-text-color,#9e9e9e)",
            detail,
            entity: e.aktiv,
          };
        }
        if (isManuellDevice(this.hass, deviceId)) {
          const e = resolveManuell(this.hass, deviceId);
          const offen = this._val(e.ventil) === "on";
          const pause = this._val(e.brunnenpause) === "on";
          return {
            name,
            icon: "🚰",
            color: pause
              ? "var(--warning-color,#ff9800)"
              : offen
              ? "var(--info-color,#2196f3)"
              : "var(--disabled-text-color,#9e9e9e)",
            detail: pause ? "Brunnenpause" : offen ? "Offen" : "Zu",
            entity: e.ventil,
          };
        }
        const e = resolveZone(this.hass, deviceId);
        const status = this._val(e.status) || "idle";
        const restzeit = this._num(e.restzeit);
        return {
          name,
          icon: STATUS_ICON[status] || "🌱",
          color: STATUS_COLOR_VAR[status] || "grey",
          detail: `${STATUS_LABELS[status] || status}${
            restzeit > 0 ? " · " + restzeit + " min" : ""
          }`,
          entity: e.status,
        };
      });

      return html`
        <ha-card>
          <div class="header"><ha-icon icon="mdi:clipboard-list"></ha-icon> Aktivität</div>
          ${rows.map(
            (r) => html`
              <div class="act-row" @click=${() => this._openMoreInfo(r.entity)}>
                <span class="act-name">${r.icon} ${r.name}</span>
                <span class="muted" style="color:${r.color}">${r.detail}</span>
              </div>
            `
          )}
        </ha-card>
      `;
    }

    _openMoreInfo(entityId) {
      if (!entityId) return;
      const event = new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }

    // ---------------- LOGBUCH ----------------

    _renderLogbuch() {
      const deviceIds = this._config.devices || [];
      if (!deviceIds.length) return this._missing("Logbuch");

      const entityIds = [];
      deviceIds.forEach((id) => {
        Object.values(this.hass.entities || {})
          .filter((e) => e.device_id === id)
          .forEach((e) => entityIds.push(e.entity_id));
      });

      return html`
        <ha-card>
          <div class="header"><ha-icon icon="mdi:history"></ha-icon> Verlauf</div>
          <ha-logbook
            .hass=${this.hass}
            .entityIds=${entityIds}
            .time=${{ recent: 86400 }}
            narrow
            virtualize
          ></ha-logbook>
        </ha-card>
      `;
    }
  }

  // ---------------------------------------------------------------------
  // Config Editor (ein gemeinsames Formular für alle card_types)
  // ---------------------------------------------------------------------

  const CARD_TYPES = [
    { value: "garten", label: "Garten – Übersicht" },
    { value: "garten_einstellungen", label: "Garten – Einstellungen" },
    { value: "automatik", label: "Zone – Automatik" },
    { value: "manuell", label: "Zone – Manuell" },
    { value: "zone_einstellungen", label: "Zone – Einstellungen" },
    { value: "aktivitaet", label: "Aktivität (mehrere Geräte)" },
    { value: "logbuch", label: "Logbuch (mehrere Geräte)" },
  ];

  const MULTI_DEVICE_TYPES = ["aktivitaet", "logbuch"];
  const SETTINGS_BADGE_TYPES = ["garten", "automatik"];

  class BrunnenBewasserungCardEditor extends LitElement {
    static get properties() {
      return { hass: {}, _config: {} };
    }

    setConfig(config) {
      this._config = config;
    }

    static get styles() {
      return css`
        .form-row {
          margin-bottom: 16px;
        }
        ha-select,
        ha-selector {
          width: 100%;
        }
      `;
    }

    _typeChanged(ev) {
      const card_type = ev.detail.value;
      const isMulti = MULTI_DEVICE_TYPES.includes(card_type);
      const wasMulti = MULTI_DEVICE_TYPES.includes(this._config.card_type);
      let devices = this._config.devices || [];
      // Beim Wechsel zwischen Einzel- und Mehrfachauswahl die Geräteliste
      // sinnvoll kappen, damit kein ungültiger Zustand entsteht.
      if (!isMulti && wasMulti) devices = devices.slice(0, 1);
      this._config = { ...this._config, card_type, devices };
      this._fireChanged();
    }

    _devicesChanged(ev) {
      const value = ev.detail.value;
      const devices = Array.isArray(value) ? value : value ? [value] : [];
      this._config = { ...this._config, devices };
      this._fireChanged();
    }

    _settingsNavigateChanged(ev) {
      const settings_navigate = ev.detail.value || undefined;
      this._config = { ...this._config, settings_navigate };
      this._fireChanged();
    }

    _settingsEntityChanged(ev) {
      const settings_entity = ev.detail.value || undefined;
      this._config = { ...this._config, settings_entity };
      this._fireChanged();
    }

    _fireChanged() {
      const event = new CustomEvent("config-changed", {
        detail: { config: this._config },
        bubbles: true,
        composed: true,
      });
      this.dispatchEvent(event);
    }

    render() {
      if (!this.hass || !this._config) return html``;
      const isMulti = MULTI_DEVICE_TYPES.includes(this._config.card_type);
      const deviceValue = isMulti
        ? this._config.devices || []
        : (this._config.devices || [])[0];

      return html`
        <div class="form-row">
          <ha-selector
            .hass=${this.hass}
            .selector=${{
              select: {
                mode: "dropdown",
                options: CARD_TYPES.map((t) => ({ value: t.value, label: t.label })),
              },
            }}
            .value=${this._config.card_type || ""}
            .label=${"Kartentyp"}
            @value-changed=${this._typeChanged}
          ></ha-selector>
        </div>
        <div class="form-row">
          <ha-selector
            .hass=${this.hass}
            .selector=${{
              device: { integration: "brunnen_bewasserung", multiple: isMulti },
            }}
            .value=${deviceValue}
            .label=${isMulti ? "Geräte (Garten + Zonen)" : "Gerät"}
            @value-changed=${this._devicesChanged}
          ></ha-selector>
        </div>
        ${SETTINGS_BADGE_TYPES.includes(this._config.card_type)
          ? html`
              <div class="form-row">
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ text: {} }}
                  .value=${this._config.settings_navigate || ""}
                  .label=${"Einstellungen-Badge: Navigations-Pfad (optional, z.B. /lovelace-garten/einstellungen)"}
                  @value-changed=${this._settingsNavigateChanged}
                ></ha-selector>
              </div>
              <div class="form-row">
                <ha-selector
                  .hass=${this.hass}
                  .selector=${{ entity: {} }}
                  .value=${this._config.settings_entity || ""}
                  .label=${"Einstellungen-Badge: Popup-Entity (optional, wird ignoriert falls Pfad gesetzt ist)"}
                  @value-changed=${this._settingsEntityChanged}
                ></ha-selector>
              </div>
            `
          : ""}
      `;
    }
  }

  customElements.define("brunnen-bewasserung-card", BrunnenBewasserungCard);
  customElements.define(
    "brunnen-bewasserung-card-editor",
    BrunnenBewasserungCardEditor
  );

  BrunnenBewasserungCard.getConfigElement = () =>
    document.createElement("brunnen-bewasserung-card-editor");

  BrunnenBewasserungCard.getStubConfig = () => ({
    card_type: "garten",
    devices: [],
  });

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "brunnen-bewasserung-card",
    name: "Brunnen Bewässerung Card",
    description:
      "Karte für die Brunnen Bewässerung Integration - Garten, Zonen (Automatik/Manuell), Einstellungen, Aktivität und Logbuch.",
    preview: false,
  });
})();
