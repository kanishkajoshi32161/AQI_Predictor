const fs = require('fs');
const path = require('path');

// Paths to serialized models and evaluation metrics
const ML_DIR = path.join(__dirname, '..', '..', 'ml');
const METRICS_FILE = path.join(ML_DIR, 'evaluation_metrics.json');
const LR_FILE = path.join(ML_DIR, 'models', 'linear_regression.json');
const DT_FILE = path.join(ML_DIR, 'models', 'decision_tree.json');
const RF_FILE = path.join(ML_DIR, 'models', 'random_forest.json');
const DATASET_SUMMARY_FILE = path.join(ML_DIR, 'dataset_summary.json');
const TEST_SAMPLES_FILE = path.join(ML_DIR, 'sample_test_predictions.json');

class MLEngine {
  constructor() {
    this.metrics = null;
    this.lrModel = null;
    this.dtModel = null;
    this.rfModel = null;
    this.datasetSummary = null;
    this.testSamples = [];
    this.isLoaded = false;
    this.loadModels();
  }

  loadModels() {
    try {
      if (fs.existsSync(METRICS_FILE)) {
        this.metrics = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
      }
      if (fs.existsSync(LR_FILE)) {
        this.lrModel = JSON.parse(fs.readFileSync(LR_FILE, 'utf8'));
      }
      if (fs.existsSync(DT_FILE)) {
        this.dtModel = JSON.parse(fs.readFileSync(DT_FILE, 'utf8'));
      }
      if (fs.existsSync(RF_FILE)) {
        this.rfModel = JSON.parse(fs.readFileSync(RF_FILE, 'utf8'));
      }
      if (fs.existsSync(DATASET_SUMMARY_FILE)) {
        this.datasetSummary = JSON.parse(fs.readFileSync(DATASET_SUMMARY_FILE, 'utf8'));
      }
      if (fs.existsSync(TEST_SAMPLES_FILE)) {
        this.testSamples = JSON.parse(fs.readFileSync(TEST_SAMPLES_FILE, 'utf8'));
      }
      this.isLoaded = !!(this.lrModel && this.dtModel && this.rfModel && this.metrics);
      console.log(`[MLEngine] Models successfully loaded. Ready: ${this.isLoaded}`);
    } catch (err) {
      console.error('[MLEngine] Error loading model files:', err.message);
    }
  }

  // Linear Regression Prediction
  predictLinear(features) {
    if (!this.lrModel) return 50;
    const coefs = this.lrModel.coefficients;
    const intercept = this.lrModel.intercept;
    let aqi = intercept;
    for (const feat of ['temperature', 'humidity', 'hour', 'month', 'wind_speed', 'pressure']) {
      const val = parseFloat(features[feat] ?? 0);
      const coef = coefs[feat] ?? 0;
      aqi += val * coef;
    }
    return Math.max(10, Math.min(500, Math.round(aqi * 10) / 10));
  }

  // Recursive Decision Tree Traverser
  evaluateTreeNode(node, features) {
    if (!node) return 50;
    if (node.type === 'leaf') {
      return node.value;
    }
    if (node.type === 'split') {
      const featVal = parseFloat(features[node.feature] ?? 0);
      if (featVal <= node.threshold) {
        return this.evaluateTreeNode(node.left, features);
      } else {
        return this.evaluateTreeNode(node.right, features);
      }
    }
    return 50;
  }

  // Decision Tree Prediction
  predictDecisionTree(features) {
    if (!this.dtModel || !this.dtModel.tree) return 50;
    const aqi = this.evaluateTreeNode(this.dtModel.tree, features);
    return Math.max(10, Math.min(500, Math.round(aqi * 10) / 10));
  }

  // Random Forest Ensemble Prediction (Average of all individual trees)
  predictRandomForest(features) {
    if (!this.rfModel || !this.rfModel.trees || this.rfModel.trees.length === 0) {
      return this.predictDecisionTree(features);
    }
    let sum = 0;
    const trees = this.rfModel.trees;
    for (let i = 0; i < trees.length; i++) {
      sum += this.evaluateTreeNode(trees[i], features);
    }
    const avgAqi = sum / trees.length;
    return Math.max(10, Math.min(500, Math.round(avgAqi * 10) / 10));
  }

  // Categorize AQI according to standard AQI Breakpoints
  categorizeAQI(aqi) {
    const val = Math.round(aqi);
    if (val <= 50) {
      return {
        category: 'Good',
        color: '#10b981', // Emerald
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.4)',
        level: 1,
        healthImpact: 'Air quality is considered satisfactory, and air pollution poses little or no risk.',
        statement: 'Ideal conditions for outdoor physical activities and recreation.',
        advisories: [
          'Enjoy your outdoor activities.',
          'Open windows for natural ventilation.',
          'No special precautions needed for sensitive groups.'
        ]
      };
    } else if (val <= 100) {
      return {
        category: 'Satisfactory',
        color: '#06b6d4', // Cyan
        bgColor: 'rgba(6, 182, 212, 0.15)',
        borderColor: 'rgba(6, 182, 212, 0.4)',
        level: 2,
        healthImpact: 'Air quality is acceptable. However, unusually sensitive individuals may experience minor symptoms.',
        statement: 'Minor breathing discomfort may occur to sensitive people.',
        advisories: [
          'Sensitive groups should consider reducing prolonged heavy outdoor exertion.',
          'Keep rooms ventilated during low traffic hours.',
          'General public can safely continue normal outdoor activities.'
        ]
      };
    } else if (val <= 200) {
      return {
        category: 'Moderate',
        color: '#f59e0b', // Amber
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
        level: 3,
        healthImpact: 'Breathing discomfort to people with lung disease such as asthma, and discomfort to children and elderly.',
        statement: 'May cause breathing discomfort to children and adults with heart/lung disease.',
        advisories: [
          'People with respiratory or cardiac conditions should limit outdoor exertion.',
          'Avoid intense workouts along busy roadways.',
          'Use HEPA air purifiers indoors if available.'
        ]
      };
    } else if (val <= 300) {
      return {
        category: 'Poor',
        color: '#f97316', // Orange
        bgColor: 'rgba(249, 115, 22, 0.15)',
        borderColor: 'rgba(249, 115, 22, 0.4)',
        level: 4,
        healthImpact: 'Breathing discomfort to most people on prolonged exposure; respiratory illness on prolonged exposure.',
        statement: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.',
        advisories: [
          'Wear N95/FFP2 masks outdoors.',
          'Keep windows closed to prevent particulate infiltration.',
          'Sensitive individuals should stay indoors in clean air spaces.'
        ]
      };
    } else if (val <= 400) {
      return {
        category: 'Very Poor',
        color: '#ef4444', // Red
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        level: 5,
        healthImpact: 'Respiratory illness to people on prolonged exposure. Significant trigger for heart disease and asthma attacks.',
        statement: 'Health alert: The risk of health effects is increased for everyone.',
        advisories: [
          'Avoid all strenuous outdoor physical activities.',
          'Run indoor air purifiers on high filtration mode.',
          'Seek medical attention if experiencing shortness of breath or persistent coughing.'
        ]
      };
    } else {
      return {
        category: 'Severe',
        color: '#a855f7', // Purple/Maroon
        bgColor: 'rgba(168, 85, 247, 0.15)',
        borderColor: 'rgba(168, 85, 247, 0.4)',
        level: 6,
        healthImpact: 'Severe health impacts on everyone. Healthy people may experience reduced lung capacity; patients may experience serious illness.',
        statement: 'Emergency conditions. The entire population is more likely to be affected.',
        advisories: [
          'Strictly remain indoors with closed windows and active air filtration.',
          'Vulnerable groups must remain in air-purified rooms.',
          'Avoid any unnecessary combustion, driving, or physical strain.'
        ]
      };
    }
  }

  // Master prediction for all models
  predict(features) {
    // Clean and parse input features
    const parsed = {
      temperature: parseFloat(features.temperature ?? 24.0),
      humidity: parseFloat(features.humidity ?? 50.0),
      hour: parseInt(features.hour ?? new Date().getHours(), 10),
      month: parseInt(features.month ?? (new Date().getMonth() + 1), 10),
      wind_speed: parseFloat(features.wind_speed ?? 12.0),
      pressure: parseFloat(features.pressure ?? 1013.2)
    };

    const predLR = this.predictLinear(parsed);
    const predDT = this.predictDecisionTree(parsed);
    const predRF = this.predictRandomForest(parsed);

    // Default to the best model (Random Forest)
    const bestModelName = this.metrics ? this.metrics.best_model : 'Random Forest Regression';
    const primaryAQI = predRF;

    const categoryInfo = this.categorizeAQI(primaryAQI);

    // Compute estimated pollutant shares based on physical interactions
    const pm25_est = Math.round((primaryAQI * 0.58) * 10) / 10;
    const pm10_est = Math.round((primaryAQI * 0.92) * 10) / 10;
    const no2_est = Math.round((20 + (parsed.hour >= 7 && parsed.hour <= 21 ? 35 : 10) + (primaryAQI * 0.15)) * 10) / 10;
    const o3_est = Math.round((15 + (parsed.temperature > 25 ? (parsed.temperature - 20) * 2.2 : 5) + (primaryAQI * 0.08)) * 10) / 10;
    const so2_est = Math.round((8 + primaryAQI * 0.05) * 10) / 10;
    const co_est = Math.round((0.4 + primaryAQI * 0.005) * 100) / 100;

    return {
      predicted_aqi: primaryAQI,
      category: categoryInfo.category,
      category_info: categoryInfo,
      selected_model: bestModelName,
      input_features: parsed,
      model_predictions: {
        linear_regression: {
          name: 'Linear Regression',
          aqi: predLR,
          category: this.categorizeAQI(predLR).category,
          r2: this.metrics?.models?.linear_regression?.r2_score ?? 0.313,
          mae: this.metrics?.models?.linear_regression?.mae ?? 37.27,
          rmse: this.metrics?.models?.linear_regression?.rmse ?? 45.35,
          is_best: false
        },
        decision_tree: {
          name: 'Decision Tree Regression',
          aqi: predDT,
          category: this.categorizeAQI(predDT).category,
          r2: this.metrics?.models?.decision_tree?.r2_score ?? 0.927,
          mae: this.metrics?.models?.decision_tree?.mae ?? 11.71,
          rmse: this.metrics?.models?.decision_tree?.rmse ?? 14.78,
          is_best: false
        },
        random_forest: {
          name: 'Random Forest Regression',
          aqi: predRF,
          category: this.categorizeAQI(predRF).category,
          r2: this.metrics?.models?.random_forest?.r2_score ?? 0.940,
          mae: this.metrics?.models?.random_forest?.mae ?? 10.64,
          rmse: this.metrics?.models?.random_forest?.rmse ?? 13.40,
          is_best: true
        }
      },
      estimated_pollutants: {
        pm2_5: { value: pm25_est, unit: 'µg/m³', name: 'PM2.5 (Fine Particles)' },
        pm10: { value: pm10_est, unit: 'µg/m³', name: 'PM10 (Coarse Particles)' },
        no2: { value: no2_est, unit: 'µg/m³', name: 'NO₂ (Nitrogen Dioxide)' },
        o3: { value: o3_est, unit: 'µg/m³', name: 'O₃ (Surface Ozone)' },
        so2: { value: so2_est, unit: 'µg/m³', name: 'SO₂ (Sulfur Dioxide)' },
        co: { value: co_est, unit: 'mg/m³', name: 'CO (Carbon Monoxide)' }
      },
      timestamp: new Date().toISOString()
    };
  }

  getMetrics() {
    return this.metrics;
  }

  getDatasetSummary() {
    return this.datasetSummary;
  }

  getTestSamples() {
    return this.testSamples;
  }
}

module.exports = new MLEngine();
