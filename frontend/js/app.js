// Main Application Controller for AeroSense AI

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[AeroSense AI] Initializing production web application...');

  // Instantiate Sub-Systems
  const gauge = new AQIGauge();
  const chartsManager = new AQIChartsManager();
  const simulator = new MLSimulator();

  let currentCityData = null;
  let activeSelectedModel = 'random_forest'; // 'random_forest', 'decision_tree', 'linear_regression'
  let evaluationMetrics = null;
  let testSamples = [];

  // DOM Elements
  const searchInput = document.getElementById('city-search-input');
  const btnPredict = document.getElementById('btn-predict');
  const btnGeo = document.getElementById('btn-geolocation');
  const cityChips = document.querySelectorAll('.chip');
  const displayLocation = document.getElementById('display-location');
  const displayCoords = document.getElementById('display-coords');
  const dataSourceTag = document.getElementById('data-source-tag');
  const displayTimestamp = document.getElementById('display-timestamp');
  const activeModelPill = document.getElementById('active-model-pill');
  const activeModelName = document.getElementById('active-model-name');

  // Live vs ML elements
  const liveOfficialAqi = document.getElementById('live-official-aqi');
  const liveOfficialCat = document.getElementById('live-official-category');
  const mlPredictedAqi = document.getElementById('ml-predicted-aqi');
  const mlPredictedCat = document.getElementById('ml-predicted-category');
  const deltaValue = document.getElementById('delta-value');
  const deltaArrow = document.getElementById('delta-arrow');

  // Environmental elements
  const envTemp = document.getElementById('env-temp');
  const envHumidity = document.getElementById('env-humidity');
  const envHour = document.getElementById('env-hour');
  const envMonth = document.getElementById('env-month');
  const envWind = document.getElementById('env-wind');
  const envPressure = document.getElementById('env-pressure');

  // Pollutant elements
  const valPm25 = document.getElementById('val-pm25');
  const valPm10 = document.getElementById('val-pm10');
  const valNo2 = document.getElementById('val-no2');
  const valO3 = document.getElementById('val-o3');
  const valSo2 = document.getElementById('val-so2');
  const valCo = document.getElementById('val-co');

  const barPm25 = document.getElementById('bar-pm25');
  const barPm10 = document.getElementById('bar-pm10');
  const barNo2 = document.getElementById('bar-no2');
  const barO3 = document.getElementById('bar-o3');
  const barSo2 = document.getElementById('bar-so2');
  const barCo = document.getElementById('bar-co');

  // 1. Fetch Evaluation Metrics & Test Samples for Benchmark Section & Charts
  async function loadModelMetricsAndDatasets() {
    try {
      const [metricsRes, samplesRes] = await Promise.all([
        fetch('/api/models/metrics').then(r => r.json()),
        fetch('/api/dataset/test-samples').then(r => r.json())
      ]);

      if (metricsRes.success && metricsRes.data) {
        evaluationMetrics = metricsRes.data;
        renderBenchmarkTable(evaluationMetrics);
        renderFeatureImportance(evaluationMetrics);
        renderFormulaCoefficients(evaluationMetrics);
      }

      if (samplesRes.success && samplesRes.data) {
        testSamples = samplesRes.data;
        chartsManager.renderTempAqiChart(testSamples);
        chartsManager.renderHumAqiChart(testSamples);
        chartsManager.renderResidualsChart(testSamples);
      }
    } catch (err) {
      console.warn('[AeroSense] Error loading evaluation metrics:', err);
    }
  }

  // 2. Fetch and Render City Prediction Data
  async function fetchCityPrediction(city) {
    if (!city || !city.trim()) return;

    btnPredict.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Analyzing...</span>';
    btnPredict.disabled = true;

    try {
      const res = await fetch(`/api/city-predict/${encodeURIComponent(city.trim())}`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();

      if (json.success && json.data) {
        currentCityData = json.data;
        updateDashboardUI(currentCityData);
      }
    } catch (err) {
      console.error('[AeroSense] Fetch error for city:', city, err);
      alert(`Unable to fetch real-time data for "${city}". Loading offline calibrated baseline.`);
    } finally {
      btnPredict.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>Predict AQI</span>';
      btnPredict.disabled = false;
    }
  }

  // 3. Update Dashboard UI with City Data
  function updateDashboardUI(data) {
    const loc = data.location;
    const env = data.current_environmental;
    const live = data.live_measured_data;
    const ml = data.ml_prediction;

    // Header & Meta
    displayLocation.textContent = `${loc.city}, ${loc.country || ''}`;
    displayCoords.innerHTML = `Lat: ${loc.lat.toFixed(2)}°, Lon: ${loc.lon.toFixed(2)}° • <span class="source-tag">${loc.source}</span>`;
    displayTimestamp.textContent = `Updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // Environmental Parameters
    envTemp.textContent = `${env.temperature.toFixed(1)} °C`;
    envHumidity.textContent = `${Math.round(env.humidity)} %`;
    envHour.textContent = `${env.hour.toString().padStart(2, '0')}:00`;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    envMonth.textContent = `${monthNames[env.month - 1]} (${env.month})`;
    envWind.textContent = `${env.wind_speed.toFixed(1)} km/h`;
    envPressure.textContent = `${Math.round(env.pressure)} hPa`;

    // Live Official vs ML Model
    const officialAqi = live.official_aqi;
    liveOfficialAqi.textContent = officialAqi;
    liveOfficialCat.textContent = gauge.getCategoryInfo(officialAqi).category;

    // Update according to selected model
    renderActiveModelView();

    // Pollutants Breakdown
    const p = live.pollutants;
    if (valPm25) valPm25.textContent = p.pm2_5.value;
    if (valPm10) valPm10.textContent = p.pm10.value;
    if (valNo2) valNo2.textContent = p.no2.value;
    if (valO3) valO3.textContent = p.o3.value;
    if (valSo2) valSo2.textContent = p.so2.value;
    if (valCo) valCo.textContent = p.co.value;

    if (barPm25) barPm25.style.width = `${Math.min(100, (p.pm2_5.value / 150) * 100)}%`;
    if (barPm10) barPm10.style.width = `${Math.min(100, (p.pm10.value / 250) * 100)}%`;
    if (barNo2) barNo2.style.width = `${Math.min(100, (p.no2.value / 100) * 100)}%`;
    if (barO3) barO3.style.width = `${Math.min(100, (p.o3.value / 180) * 100)}%`;
    if (barSo2) barSo2.style.width = `${Math.min(100, (p.so2.value / 80) * 100)}%`;
    if (barCo) barCo.style.width = `${Math.min(100, (p.co.value / 4.0) * 100)}%`;

    // Render 24-Hour Trend Chart
    if (data.hourly_forecast) {
      chartsManager.renderHourlyChart(data.hourly_forecast);
    }
  }

  // 4. Render Active Selected Model Output (Switchable between RF, DT, LR)
  function renderActiveModelView() {
    if (!currentCityData) return;
    const ml = currentCityData.ml_prediction;
    const modelInfo = ml.model_predictions[activeSelectedModel];
    if (!modelInfo) return;

    // Update Main Gauge
    gauge.update(modelInfo.aqi, modelInfo.category);

    // Update ML Box
    mlPredictedAqi.textContent = Math.round(modelInfo.aqi);
    mlPredictedCat.textContent = `${modelInfo.name} (${modelInfo.category})`;

    // Delta Indicator
    const officialAqi = currentCityData.live_measured_data.official_aqi;
    const diff = Math.round(modelInfo.aqi - officialAqi);
    const diffPct = officialAqi > 0 ? Math.round((Math.abs(diff) / officialAqi) * 100) : 0;
    
    deltaValue.textContent = `${diff >= 0 ? '+' : ''}${diff} (${diffPct}%)`;
    deltaValue.style.color = Math.abs(diffPct) < 15 ? '#10b981' : Math.abs(diffPct) < 30 ? '#06b6d4' : '#f59e0b';
    
    if (diff > 0) {
      deltaArrow.innerHTML = '<i class="fa-solid fa-arrow-up text-amber"></i>';
    } else if (diff < 0) {
      deltaArrow.innerHTML = '<i class="fa-solid fa-arrow-down text-cyan"></i>';
    } else {
      deltaArrow.innerHTML = '<i class="fa-solid fa-check text-emerald"></i>';
    }

    // Active Model Top Pill
    activeModelName.textContent = modelInfo.name;
    activeModelPill.innerHTML = `<i class="fa-solid fa-award"></i> Active Model: <span class="model-name-highlight">${modelInfo.name}</span> (R²: ${modelInfo.r2.toFixed(3)})`;
  }

  // 5. Benchmark Table Renderer
  function renderBenchmarkTable(metrics) {
    const tbody = document.getElementById('benchmark-table-body');
    if (!tbody || !metrics.models) return;

    const models = [
      { key: 'random_forest', data: metrics.models.random_forest, badge: '<span class="badge badge-best"><i class="fa-solid fa-crown"></i> Selected Best</span>', hyper: 'n_est=25, max_depth=10' },
      { key: 'decision_tree', data: metrics.models.decision_tree, badge: '<span class="badge badge-ml">Non-Linear Tree</span>', hyper: 'max_depth=8, min_split=10' },
      { key: 'linear_regression', data: metrics.models.linear_regression, badge: '<span class="badge badge-baseline">Linear Baseline</span>', hyper: 'OLS, 6 Parameters' }
    ];

    tbody.innerHTML = models.map(m => {
      const d = m.data;
      const isBest = m.key === 'random_forest' ? 'best-row' : '';
      return `
        <tr class="${isBest}">
          <td><strong>${d.model_name}</strong></td>
          <td>${d.type}</td>
          <td><strong class="${m.key === 'random_forest' ? 'text-emerald' : ''}">${d.r2_score.toFixed(4)}</strong></td>
          <td>${d.mae.toFixed(2)} AQI</td>
          <td>${d.rmse.toFixed(2)} AQI</td>
          <td>${d.training_samples.toLocaleString()} records</td>
          <td><code>${m.hyper}</code></td>
          <td>${m.badge}</td>
        </tr>
      `;
    }).join('');

    // Update Highlight Cards
    const valTotalRecords = document.getElementById('val-total-records');
    const valBestR2 = document.getElementById('val-best-r2');
    const valBestMae = document.getElementById('val-best-mae');
    const valBestRmse = document.getElementById('val-best-rmse');

    if (valTotalRecords) valTotalRecords.textContent = metrics.dataset_info.total_records.toLocaleString();
    if (valBestR2) valBestR2.textContent = metrics.models.random_forest.r2_score.toFixed(4);
    if (valBestMae) valBestMae.textContent = metrics.models.random_forest.mae.toFixed(2);
    if (valBestRmse) valBestRmse.textContent = metrics.models.random_forest.rmse.toFixed(2);
  }

  // 6. Feature Importance Bar Graph Renderer
  function renderFeatureImportance(metrics) {
    const container = document.getElementById('feature-bars-container');
    if (!container || !metrics.models?.random_forest?.feature_importances) return;

    const importances = metrics.models.random_forest.feature_importances;
    const sorted = Object.entries(importances).sort((a, b) => b[1] - a[1]);

    const featureLabels = {
      'month': 'Month / Season (Thermal Inversion)',
      'wind_speed': 'Wind Speed (Atmospheric Dispersion)',
      'hour': 'Hour of Day (Traffic & Diurnal Cycle)',
      'temperature': 'Air Temperature (Mixing Height)',
      'humidity': 'Relative Humidity (Hygroscopic Aerosol)',
      'pressure': 'Barometric Pressure (Air Density)'
    };

    container.innerHTML = sorted.map(([feat, imp]) => {
      const pct = (imp * 100).toFixed(1);
      const label = featureLabels[feat] || feat;
      return `
        <div class="feature-bar-item">
          <div class="feature-bar-label">
            <span><strong>${label}</strong></span>
            <span>${pct}% (weight: ${imp.toFixed(4)})</span>
          </div>
          <div class="feature-bar-track">
            <div class="feature-bar-progress" style="width: ${Math.max(4, pct)}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 7. Formula Coefficients Renderer
  function renderFormulaCoefficients(metrics) {
    const container = document.getElementById('coef-pills-container');
    if (!container || !metrics.models?.linear_regression?.coefficients) return;

    const coefs = metrics.models.linear_regression.coefficients;
    const intercept = metrics.models.linear_regression.intercept;

    let html = `<div class="coef-pill">β₀ (Intercept) = <strong>${intercept.toFixed(2)}</strong></div>`;
    for (const [k, v] of Object.entries(coefs)) {
      html += `<div class="coef-pill">β_${k} = <strong>${v > 0 ? '+' : ''}${v.toFixed(3)}</strong></div>`;
    }
    container.innerHTML = html;
  }

  // --- EVENT LISTENERS ---

  // Search input & button
  btnPredict.addEventListener('click', () => {
    fetchCityPrediction(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      fetchCityPrediction(searchInput.value);
    }
  });

  // Quick City Chips
  cityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      cityChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const city = chip.dataset.city;
      searchInput.value = city;
      fetchCityPrediction(city);
    });
  });

  // Geolocation Button
  btnGeo.addEventListener('click', () => {
    if ('geolocation' in navigator) {
      btnGeo.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          btnGeo.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          searchInput.value = `GPS (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
          fetchCityPrediction(`${lat},${lon}`);
        },
        (error) => {
          btnGeo.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
          alert('GPS location access denied or unavailable. Using default city.');
        },
        { timeout: 5000 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  });

  // Model Switcher Tabs inside Gauge Card
  const modelPills = document.querySelectorAll('.model-pill');
  modelPills.forEach(pill => {
    pill.addEventListener('click', () => {
      modelPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeSelectedModel = pill.dataset.model;
      renderActiveModelView();
    });
  });

  // Smooth Navigation Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Initial Load: Metrics & Default City (Delhi)
  await loadModelMetricsAndDatasets();
  await fetchCityPrediction('Delhi');
});
