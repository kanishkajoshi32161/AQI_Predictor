// Interactive "What-If" Machine Learning Sandbox Simulator

class MLSimulator {
  constructor() {
    this.sliders = {
      temp: document.getElementById('sim-temp'),
      humidity: document.getElementById('sim-humidity'),
      hour: document.getElementById('sim-hour'),
      month: document.getElementById('sim-month'),
      wind: document.getElementById('sim-wind'),
      pressure: document.getElementById('sim-pressure')
    };

    this.displays = {
      temp: document.getElementById('sim-temp-display'),
      humidity: document.getElementById('sim-humidity-display'),
      hour: document.getElementById('sim-hour-display'),
      month: document.getElementById('sim-month-display'),
      wind: document.getElementById('sim-wind-display'),
      pressure: document.getElementById('sim-pressure-display')
    };

    this.results = {
      rfAqi: document.getElementById('sim-rf-aqi'),
      rfCat: document.getElementById('sim-rf-cat'),
      dtAqi: document.getElementById('sim-dt-aqi'),
      dtCat: document.getElementById('sim-dt-cat'),
      lrAqi: document.getElementById('sim-lr-aqi'),
      lrCat: document.getElementById('sim-lr-cat'),
      insightText: document.getElementById('sim-insight-text')
    };

    this.presets = {
      winter_inversion: {
        temp: 7.5,
        humidity: 88,
        hour: 22,
        month: 12,
        wind: 1.5,
        pressure: 1024,
        insight: '⚠️ Winter Thermal Inversion: Cold dense air near the ground and negligible wind (1.5 km/h) trap vehicular and combustion emissions under a thermal ceiling, causing severe pollutant spikes.'
      },
      summer_heat: {
        temp: 41.5,
        humidity: 32,
        hour: 15,
        month: 6,
        wind: 14.0,
        pressure: 1004,
        insight: '☀️ High Summer Photochemical Ozone: Intense solar radiation and high temperatures accelerate ground-level Ozone (O₃) generation via NOx and VOC oxidation reactions.'
      },
      monsoon_rain: {
        temp: 26.0,
        humidity: 94,
        hour: 12,
        month: 8,
        wind: 26.0,
        pressure: 1007,
        insight: '🌧️ Monsoon Wet Deposition: High wind velocities (26 km/h) and precipitation wash out particulate matter, yielding remarkably clean, low-AQI atmospheric conditions.'
      },
      rush_hour: {
        temp: 21.0,
        humidity: 62,
        hour: 19,
        month: 11,
        wind: 3.5,
        pressure: 1016,
        insight: '🚗 Evening Peak Commute: Heavy vehicular traffic spikes NO₂ and PM2.5, amplified by cooling ground temperatures after sunset.'
      },
      clean_coastal: {
        temp: 20.5,
        humidity: 58,
        hour: 11,
        month: 4,
        wind: 32.0,
        pressure: 1015,
        insight: '🍃 Strong Aerodynamic Dispersion: Vigorous wind currents dilute airborne particulate matter rapidly, maintaining satisfactory to good air quality.'
      }
    };

    this.initListeners();
    this.runInference();
  }

  initListeners() {
    // Sliders input events
    Object.keys(this.sliders).forEach(key => {
      const slider = this.sliders[key];
      if (slider) {
        slider.addEventListener('input', () => {
          this.updateDisplay(key);
          this.runInference();
        });
      }
    });

    // Preset scenario buttons
    document.querySelectorAll('.btn-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const presetKey = btn.dataset.preset;
        this.loadPreset(presetKey);
      });
    });
  }

  updateDisplay(key) {
    const val = parseFloat(this.sliders[key].value);
    const months = ['Jan (1)', 'Feb (2)', 'Mar (3)', 'Apr (4)', 'May (5)', 'Jun (6)', 'Jul (7)', 'Aug (8)', 'Sep (9)', 'Oct (10)', 'Nov (11)', 'Dec (12)'];

    if (key === 'temp') this.displays.temp.textContent = `${val.toFixed(1)} °C`;
    if (key === 'humidity') this.displays.humidity.textContent = `${Math.round(val)} %`;
    if (key === 'hour') {
      const ampm = val >= 12 ? 'PM' : 'AM';
      const formatted = `${val.toString().padStart(2, '0')}:00 (${val % 12 || 12} ${ampm})`;
      this.displays.hour.textContent = formatted;
    }
    if (key === 'month') this.displays.month.textContent = months[Math.round(val) - 1];
    if (key === 'wind') this.displays.wind.textContent = `${val.toFixed(1)} km/h`;
    if (key === 'pressure') this.displays.pressure.textContent = `${Math.round(val)} hPa`;
  }

  loadPreset(presetKey) {
    const p = this.presets[presetKey];
    if (!p) return;

    if (this.sliders.temp) this.sliders.temp.value = p.temp;
    if (this.sliders.humidity) this.sliders.humidity.value = p.humidity;
    if (this.sliders.hour) this.sliders.hour.value = p.hour;
    if (this.sliders.month) this.sliders.month.value = p.month;
    if (this.sliders.wind) this.sliders.wind.value = p.wind;
    if (this.sliders.pressure) this.sliders.pressure.value = p.pressure;

    Object.keys(this.sliders).forEach(k => this.updateDisplay(k));

    if (this.results.insightText && p.insight) {
      this.results.insightText.textContent = p.insight;
    }

    this.runInference();
  }

  async runInference() {
    const features = {
      temperature: parseFloat(this.sliders.temp.value),
      humidity: parseFloat(this.sliders.humidity.value),
      hour: parseInt(this.sliders.hour.value, 10),
      month: parseInt(this.sliders.month.value, 10),
      wind_speed: parseFloat(this.sliders.wind.value),
      pressure: parseFloat(this.sliders.pressure.value)
    };

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(features)
      });

      if (!res.ok) throw new Error('Inference API call failed');
      const json = await res.json();
      if (json.success && json.data) {
        this.renderResults(json.data);
      }
    } catch (err) {
      console.warn('[MLSimulator] Prediction error:', err.message);
    }
  }

  renderResults(data) {
    const rf = data.model_predictions.random_forest;
    const dt = data.model_predictions.decision_tree;
    const lr = data.model_predictions.linear_regression;

    const setCardBadge = (badgeEl, cat) => {
      badgeEl.textContent = cat;
      badgeEl.className = 'sim-cat-badge';
      if (cat === 'Good') badgeEl.style.background = 'rgba(16, 185, 129, 0.2)', badgeEl.style.color = '#10b981';
      else if (cat === 'Satisfactory') badgeEl.style.background = 'rgba(6, 182, 212, 0.2)', badgeEl.style.color = '#06b6d4';
      else if (cat === 'Moderate') badgeEl.style.background = 'rgba(245, 158, 11, 0.2)', badgeEl.style.color = '#f59e0b';
      else if (cat === 'Poor') badgeEl.style.background = 'rgba(249, 115, 22, 0.2)', badgeEl.style.color = '#f97316';
      else if (cat === 'Very Poor') badgeEl.style.background = 'rgba(239, 68, 68, 0.2)', badgeEl.style.color = '#ef4444';
      else badgeEl.style.background = 'rgba(168, 85, 247, 0.2)', badgeEl.style.color = '#a855f7';
    };

    if (this.results.rfAqi) this.results.rfAqi.textContent = Math.round(rf.aqi);
    if (this.results.rfCat) setCardBadge(this.results.rfCat, rf.category);

    if (this.results.dtAqi) this.results.dtAqi.textContent = Math.round(dt.aqi);
    if (this.results.dtCat) setCardBadge(this.results.dtCat, dt.category);

    if (this.results.lrAqi) this.results.lrAqi.textContent = Math.round(lr.aqi);
    if (this.results.lrCat) setCardBadge(this.results.lrCat, lr.category);
  }
}

window.MLSimulator = MLSimulator;
