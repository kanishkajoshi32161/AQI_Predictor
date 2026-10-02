const express = require('express');
const cors = require('cors');
const path = require('path');
const mlEngine = require('./services/mlEngine');
const weatherService = require('./services/weatherService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- API Endpoints ---

// 1. Health check & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'AeroSense AI Backend & ML Inference Engine',
    version: '1.0.0',
    models_loaded: mlEngine.isLoaded,
    uptime_seconds: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 2. Fetch live environmental data for a city
app.get('/api/weather/:city', async (req, res) => {
  try {
    const city = req.params.city || 'Delhi';
    const data = await weatherService.fetchLiveCityData(city);
    res.json({ success: true, data });
  } catch (err) {
    console.error('[API /weather/:city Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Predict AQI from environmental features
app.post('/api/predict', (req, res) => {
  try {
    const features = req.body;
    const predictionResult = mlEngine.predict(features);
    res.json({ success: true, data: predictionResult });
  } catch (err) {
    console.error('[API /predict Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Combined City Pipeline: Fetch live data & run ML prediction
app.get('/api/city-predict/:city', async (req, res) => {
  try {
    const city = req.params.city || 'Delhi';
    const liveData = await weatherService.fetchLiveCityData(city);
    
    // Pass live environmental variables to ML model
    const predictionResult = mlEngine.predict(liveData.current_environmental);

    // Compute predictions for hourly series
    const hourlyWithPredictions = liveData.hourly_forecast.map(h => {
      const hFeatures = {
        temperature: h.temperature,
        humidity: h.humidity,
        hour: h.hour,
        month: liveData.current_environmental.month,
        wind_speed: h.wind_speed,
        pressure: liveData.current_environmental.pressure
      };
      const pred = mlEngine.predict(hFeatures);
      return {
        ...h,
        predicted_aqi: pred.predicted_aqi,
        predicted_category: pred.category,
        lr_aqi: pred.model_predictions.linear_regression.aqi,
        dt_aqi: pred.model_predictions.decision_tree.aqi,
        rf_aqi: pred.model_predictions.random_forest.aqi
      };
    });

    res.json({
      success: true,
      data: {
        location: liveData.location,
        current_environmental: liveData.current_environmental,
        live_measured_data: liveData.live_measured_data,
        ml_prediction: predictionResult,
        hourly_forecast: hourlyWithPredictions,
        is_live_api: liveData.is_live,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[API /city-predict/:city Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Evaluation metrics for all 3 trained models
app.get('/api/models/metrics', (req, res) => {
  try {
    const metrics = mlEngine.getMetrics();
    if (!metrics) {
      return res.status(503).json({ success: false, message: 'Models are still loading or need training.' });
    }
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Dataset summary & correlation matrix
app.get('/api/dataset/summary', (req, res) => {
  try {
    const summary = mlEngine.getDatasetSummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Test sample predictions (for Actual vs Predicted scatter/residual charts)
app.get('/api/dataset/test-samples', (req, res) => {
  try {
    const samples = mlEngine.getTestSamples();
    res.json({ success: true, data: samples });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 AeroSense AI Server running at: http://localhost:${PORT}`);
  console.log(`📊 ML Models: Linear Regression, Decision Tree, Random Forest`);
  console.log(`🌐 Live Environmental API: Open-Meteo with Smart Caching`);
  console.log('====================================================');
});
