// Chart.js Manager for AeroSense AI Analytics & Visualizations

class AQIChartsManager {
  constructor() {
    this.hourlyChart = null;
    this.tempAqiChart = null;
    this.humAqiChart = null;
    this.residualsChart = null;
    this.chartDefaults();
  }

  chartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(15, 23, 42, 0.95)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255, 255, 255, 0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 10;
  }

  // 1. Render 24-Hour Hourly Trajectory Chart
  renderHourlyChart(hourlyData) {
    const ctx = document.getElementById('chart-hourly');
    if (!ctx || !hourlyData) return;

    const labels = hourlyData.map(h => h.timeLabel);
    const officialAqi = hourlyData.map(h => h.official_aqi);
    const predictedAqi = hourlyData.map(h => h.predicted_aqi);
    const linearAqi = hourlyData.map(h => h.lr_aqi);

    if (this.hourlyChart) {
      this.hourlyChart.destroy();
    }

    this.hourlyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'ML Model Prediction (Random Forest)',
            data: predictedAqi,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'Official Ground Observation',
            data: officialAqi,
            borderColor: '#06b6d4',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 4],
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#06b6d4'
          },
          {
            label: 'Linear Baseline',
            data: linearAqi,
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderDash: [2, 2],
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
            hidden: true // Hidden by default, toggleable in legend
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.raw} AQI`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: { maxRotation: 0 }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.06)' },
            title: { display: true, text: 'AQI Level', color: '#64748b' }
          }
        }
      }
    });
  }

  // 2. Render Temperature vs AQI Curve
  renderTempAqiChart(testSamples) {
    const ctx = document.getElementById('chart-temp-aqi');
    if (!ctx) return;

    let points = [];
    if (testSamples && testSamples.length > 0) {
      points = testSamples.map(s => ({ x: s.temperature, y: s.actual_aqi, pred: s.pred_rf }));
    } else {
      for (let t = -5; t <= 45; t += 2) {
        const aqiSim = 40 + (t < 15 ? (15 - t) * 3 : 0) + (t > 30 ? (t - 30) * 2 : 0) + Math.sin(t) * 10;
        points.push({ x: t, y: Math.round(aqiSim) });
      }
    }

    if (this.tempAqiChart) {
      this.tempAqiChart.destroy();
    }

    this.tempAqiChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Environmental Observations',
            data: points,
            backgroundColor: 'rgba(6, 182, 212, 0.65)',
            borderColor: '#06b6d4',
            pointRadius: 4,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            callbacks: {
              label: (item) => `Temp: ${item.raw.x}°C → AQI: ${item.raw.y}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Temperature (°C)', color: '#64748b' },
            grid: { color: 'rgba(255, 255, 255, 0.04)' }
          },
          y: {
            title: { display: true, text: 'AQI', color: '#64748b' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' }
          }
        }
      }
    });
  }

  // 3. Render Humidity vs AQI Distribution
  renderHumAqiChart(testSamples) {
    const ctx = document.getElementById('chart-hum-aqi');
    if (!ctx) return;

    let points = [];
    if (testSamples && testSamples.length > 0) {
      points = testSamples.map(s => ({ x: s.humidity, y: s.actual_aqi }));
    } else {
      for (let h = 20; h <= 95; h += 3) {
        const aqiSim = 50 + (h > 70 ? (h - 70) * 1.5 : 0) + Math.sin(h / 5) * 12;
        points.push({ x: h, y: Math.round(aqiSim) });
      }
    }

    if (this.humAqiChart) {
      this.humAqiChart.destroy();
    }

    this.humAqiChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Relative Humidity vs AQI',
            data: points,
            backgroundColor: 'rgba(168, 85, 247, 0.65)',
            borderColor: '#a855f7',
            pointRadius: 4,
            pointHoverRadius: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            callbacks: {
              label: (item) => `Humidity: ${item.raw.x}% → AQI: ${item.raw.y}`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Relative Humidity (%)', color: '#64748b' },
            grid: { color: 'rgba(255, 255, 255, 0.04)' }
          },
          y: {
            title: { display: true, text: 'AQI', color: '#64748b' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' }
          }
        }
      }
    });
  }

  // 4. Render Actual vs Predicted Residuals (Test Set)
  renderResidualsChart(testSamples) {
    const ctx = document.getElementById('chart-residuals');
    if (!ctx || !testSamples || testSamples.length === 0) return;

    const points = testSamples.map(s => ({ x: s.actual_aqi, y: s.pred_rf }));
    const maxVal = Math.max(...points.map(p => Math.max(p.x, p.y)), 300);

    if (this.residualsChart) {
      this.residualsChart.destroy();
    }

    this.residualsChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Test Samples (RF Prediction)',
            data: points,
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: '#10b981',
            pointRadius: 4,
            pointHoverRadius: 7
          },
          {
            type: 'line',
            label: 'Ideal Parity Line (y = x)',
            data: [{ x: 0, y: 0 }, { x: maxVal, y: maxVal }],
            borderColor: 'rgba(255, 255, 255, 0.25)',
            borderDash: [6, 6],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', align: 'end' },
          tooltip: {
            callbacks: {
              label: (item) => `Actual: ${item.raw.x} | Predicted: ${item.raw.y} (RF)`
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'Actual Ground Station AQI', color: '#64748b' },
            grid: { color: 'rgba(255, 255, 255, 0.04)' }
          },
          y: {
            title: { display: true, text: 'ML Predicted AQI', color: '#64748b' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' }
          }
        }
      }
    });
  }
}

window.AQIChartsManager = AQIChartsManager;
