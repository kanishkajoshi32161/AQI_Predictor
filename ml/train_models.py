"""
AeroSense AI - Machine Learning Training & Evaluation Pipeline
Trains Linear Regression, Decision Tree Regression, and Random Forest Regression
Computes real evaluation metrics (R2, MAE, RMSE) on test partition and exports models.
"""

import os
import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Set seed for reproducibility
np.random.seed(42)

def generate_environmental_aqi_dataset(n_samples=10000):
    """
    Generates a realistic atmospheric and environmental dataset based on
    established physical meteorology and urban air quality relationships.
    """
    # 1. Month of the year (1 to 12)
    month = np.random.randint(1, 13, size=n_samples)
    
    # 2. Hour of the day (0 to 23)
    hour = np.random.randint(0, 24, size=n_samples)
    
    # 3. Base Temperature (°C) influenced by month & hour
    # Winter months (11, 12, 1, 2) are colder, Summer months (5, 6, 7) are hotter
    seasonal_temp_offset = np.cos((month - 6) * 2 * np.pi / 12) * -12 + 22
    diurnal_temp_offset = np.sin((hour - 8) * 2 * np.pi / 24) * 6
    temperature = seasonal_temp_offset + diurnal_temp_offset + np.random.normal(0, 4, size=n_samples)
    temperature = np.clip(temperature, -5.0, 48.0)
    
    # 4. Relative Humidity (%) inversely correlated with temperature
    base_humidity = 85 - (temperature * 1.1) + np.sin((month - 8) * 2 * np.pi / 12) * 15
    humidity = base_humidity + np.random.normal(0, 10, size=n_samples)
    humidity = np.clip(humidity, 15.0, 98.0)
    
    # 5. Wind Speed (km/h) (Weibull distributed)
    wind_speed = np.random.weibull(1.8, size=n_samples) * 10.0 + 1.0
    wind_speed = np.clip(wind_speed, 1.0, 45.0)
    
    # 6. Surface Pressure (hPa)
    pressure = 1013.25 + (30 - temperature) * 0.4 + np.random.normal(0, 3, size=n_samples)
    pressure = np.clip(pressure, 990.0, 1035.0)
    
    # --- Physical AQI Modeling Factors ---
    # Winter inversion factor (Nov-Feb: severe boundary layer trapping)
    winter_factor = np.where((month >= 11) | (month <= 2), 70.0 + (13 - (month % 12 + 1)) * 5, 10.0)
    
    # Rush-hour emission spikes (7-10 AM & 18-22 PM)
    morning_rush = np.exp(-((hour - 8.5) ** 2) / 4.0) * 35.0
    evening_rush = np.exp(-((hour - 20.0) ** 2) / 6.0) * 45.0
    traffic_factor = morning_rush + evening_rush
    
    # Nocturnal cooling & inversion (night hours 23:00 - 06:00 trap ground pollutants)
    night_inversion = np.where((hour <= 6) | (hour >= 22), 25.0, 0.0)
    
    # Wind dispersion (strong non-linear cleaning effect)
    wind_dispersion = np.exp(-wind_speed / 7.0) * 80.0
    
    # Humidity effect (high humidity creates hygroscopic growth of aerosol particles + mist)
    humidity_effect = np.where(humidity > 70, (humidity - 70) * 0.9, 0.0)
    
    # Low temperature penalty (cold air is denser, preventing vertical atmospheric mixing)
    cold_penalty = np.where(temperature < 15, (15 - temperature) * 2.8, 0.0)
    
    # Base baseline pollution level
    base_aqi = 40.0
    
    # Realistic noise & stochastic perturbations
    noise = np.random.normal(0, 12, size=n_samples)
    
    # Combined target AQI
    aqi = (
        base_aqi +
        winter_factor +
        traffic_factor +
        night_inversion +
        wind_dispersion +
        humidity_effect +
        cold_penalty +
        noise
    )
    aqi = np.clip(np.round(aqi, 1), 15.0, 480.0)
    
    df = pd.DataFrame({
        'temperature': np.round(temperature, 1),
        'humidity': np.round(humidity, 1),
        'hour': hour,
        'month': month,
        'wind_speed': np.round(wind_speed, 1),
        'pressure': np.round(pressure, 1),
        'aqi': aqi
    })
    
    return df

def tree_to_dict(tree, feature_names):
    """Recursively serializes a scikit-learn DecisionTree to a clean JSON structure."""
    tree_ = tree.tree_
    def recurse(node):
        if tree_.feature[node] != -2: # Not a leaf
            feat = feature_names[tree_.feature[node]]
            thresh = float(tree_.threshold[node])
            left = recurse(tree_.children_left[node])
            right = recurse(tree_.children_right[node])
            return {
                'type': 'split',
                'feature': feat,
                'threshold': round(thresh, 4),
                'left': left,
                'right': right
            }
        else: # Leaf
            val = float(tree_.value[node][0][0])
            return {
                'type': 'leaf',
                'value': round(val, 2),
                'samples': int(tree_.n_node_samples[node])
            }
    return recurse(0)

def main():
    print("=" * 60)
    print("AeroSense AI - Training & Evaluation Pipeline")
    print("=" * 60)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # 1. Generate / Load dataset
    print("[1/5] Generating atmospheric environmental AQI dataset (10,000 samples)...")
    df = generate_environmental_aqi_dataset(n_samples=10000)
    csv_path = os.path.join(base_dir, "air_quality_dataset.csv")
    df.to_csv(csv_path, index=False)
    print(f"      Saved dataset to {csv_path}")
    
    feature_cols = ['temperature', 'humidity', 'hour', 'month', 'wind_speed', 'pressure']
    X = df[feature_cols]
    y = df['aqi']
    
    # 2. Train-Test Split (80% Train, 20% Test)
    print("[2/5] Splitting data into 80% Train / 20% Test...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.20, random_state=42)
    print(f"      Training records: {len(X_train)} | Test records: {len(X_test)}")
    
    # 3. Model 1: Linear Regression (Baseline)
    print("[3/5] Training Model 1: Linear Regression (Baseline)...")
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    y_pred_lr = lr.predict(X_test)
    
    lr_metrics = {
        'model_name': 'Linear Regression',
        'type': 'Linear Baseline',
        'mae': round(float(mean_absolute_error(y_test, y_pred_lr)), 2),
        'mse': round(float(mean_squared_error(y_test, y_pred_lr)), 2),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred_lr))), 2),
        'r2_score': round(float(r2_score(y_test, y_pred_lr)), 4),
        'training_samples': int(len(X_train)),
        'test_samples': int(len(X_test)),
        'coefficients': {feat: round(float(coef), 4) for feat, coef in zip(feature_cols, lr.coef_)},
        'intercept': round(float(lr.intercept_), 4)
    }
    
    # 4. Model 2: Decision Tree Regression
    print("[4/5] Training Model 2: Decision Tree Regression...")
    dt = DecisionTreeRegressor(max_depth=8, min_samples_split=10, random_state=42)
    dt.fit(X_train, y_train)
    y_pred_dt = dt.predict(X_test)
    
    dt_metrics = {
        'model_name': 'Decision Tree Regression',
        'type': 'Non-linear Tree',
        'mae': round(float(mean_absolute_error(y_test, y_pred_dt)), 2),
        'mse': round(float(mean_squared_error(y_test, y_pred_dt)), 2),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred_dt))), 2),
        'r2_score': round(float(r2_score(y_test, y_pred_dt)), 4),
        'training_samples': int(len(X_train)),
        'test_samples': int(len(X_test)),
        'max_depth': 8,
        'feature_importances': {feat: round(float(imp), 4) for feat, imp in zip(feature_cols, dt.feature_importances_)}
    }
    
    # 5. Model 3: Random Forest Regression (Ensemble)
    print("[5/5] Training Model 3: Random Forest Regression (Ensemble)...")
    rf = RandomForestRegressor(n_estimators=25, max_depth=10, min_samples_split=6, random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    
    rf_metrics = {
        'model_name': 'Random Forest Regression',
        'type': 'Ensemble (Bagging)',
        'mae': round(float(mean_absolute_error(y_test, y_pred_rf)), 2),
        'mse': round(float(mean_squared_error(y_test, y_pred_rf)), 2),
        'rmse': round(float(np.sqrt(mean_squared_error(y_test, y_pred_rf))), 2),
        'r2_score': round(float(r2_score(y_test, y_pred_rf)), 4),
        'training_samples': int(len(X_train)),
        'test_samples': int(len(X_test)),
        'n_estimators': 25,
        'max_depth': 10,
        'feature_importances': {feat: round(float(imp), 4) for feat, imp in zip(feature_cols, rf.feature_importances_)}
    }
    
    # Determine best model
    all_models = [lr_metrics, dt_metrics, rf_metrics]
    best_model = max(all_models, key=lambda m: m['r2_score'])
    
    print("\n" + "=" * 60)
    print("TRAINING & EVALUATION BENCHMARK RESULTS")
    print("=" * 60)
    print(f"{'Model':<28} | {'MAE':<8} | {'RMSE':<8} | {'R² Score':<8}")
    print("-" * 60)
    for m in all_models:
        is_best = " [BEST]" if m['model_name'] == best_model['model_name'] else ""
        print(f"{m['model_name']:<28} | {m['mae']:<8.2f} | {m['rmse']:<8.2f} | {m['r2_score']:<8.4f}{is_best}")
    print("=" * 60)
    
    # Save evaluation metrics
    metrics_export = {
        'generated_at': pd.Timestamp.now().isoformat(),
        'dataset_info': {
            'total_records': len(df),
            'train_records': len(X_train),
            'test_records': len(X_test),
            'features': feature_cols,
            'target': 'aqi'
        },
        'best_model': best_model['model_name'],
        'models': {
            'linear_regression': lr_metrics,
            'decision_tree': dt_metrics,
            'random_forest': rf_metrics
        }
    }
    
    metrics_path = os.path.join(base_dir, "evaluation_metrics.json")
    with open(metrics_path, 'w') as f:
        json.dump(metrics_export, f, indent=2)
    print(f"Exported metrics to {metrics_path}")
    
    # Export Linear Regression model structure
    lr_export = {
        'model_name': 'Linear Regression',
        'features': feature_cols,
        'coefficients': lr_metrics['coefficients'],
        'intercept': lr_metrics['intercept'],
        'metrics': lr_metrics
    }
    with open(os.path.join(models_dir, "linear_regression.json"), 'w') as f:
        json.dump(lr_export, f, indent=2)
        
    # Export Decision Tree model structure
    dt_export = {
        'model_name': 'Decision Tree Regression',
        'features': feature_cols,
        'tree': tree_to_dict(dt, feature_cols),
        'metrics': dt_metrics
    }
    with open(os.path.join(models_dir, "decision_tree.json"), 'w') as f:
        json.dump(dt_export, f, indent=2)
        
    # Export Random Forest ensemble structure (25 trees)
    rf_trees = [tree_to_dict(estimator, feature_cols) for estimator in rf.estimators_]
    rf_export = {
        'model_name': 'Random Forest Regression',
        'features': feature_cols,
        'n_estimators': len(rf_trees),
        'trees': rf_trees,
        'metrics': rf_metrics
    }
    with open(os.path.join(models_dir, "random_forest.json"), 'w') as f:
        json.dump(rf_export, f, indent=2)
    print(f"Exported serialized models to {models_dir}")
    
    # Export test sample predictions for analytics charts (first 60 test points)
    sample_indices = np.random.choice(len(y_test), size=min(80, len(y_test)), replace=False)
    test_samples = []
    for idx in sample_indices:
        test_samples.append({
            'temperature': float(X_test.iloc[idx]['temperature']),
            'humidity': float(X_test.iloc[idx]['humidity']),
            'hour': int(X_test.iloc[idx]['hour']),
            'month': int(X_test.iloc[idx]['month']),
            'wind_speed': float(X_test.iloc[idx]['wind_speed']),
            'pressure': float(X_test.iloc[idx]['pressure']),
            'actual_aqi': round(float(y_test.iloc[idx]), 1),
            'pred_lr': round(float(y_pred_lr[idx]), 1),
            'pred_dt': round(float(y_pred_dt[idx]), 1),
            'pred_rf': round(float(y_pred_rf[idx]), 1)
        })
    with open(os.path.join(base_dir, "sample_test_predictions.json"), 'w') as f:
        json.dump(test_samples, f, indent=2)
        
    # Dataset statistics
    stats = {}
    for col in feature_cols + ['aqi']:
        stats[col] = {
            'min': round(float(df[col].min()), 2),
            'max': round(float(df[col].max()), 2),
            'mean': round(float(df[col].mean()), 2),
            'std': round(float(df[col].std()), 2)
        }
    
    # Correlation matrix
    corr = df[feature_cols + ['aqi']].corr().to_dict()
    corr_clean = {k: {k2: round(float(v2), 4) for k2, v2 in v.items()} for k, v in corr.items()}
    
    with open(os.path.join(base_dir, "dataset_summary.json"), 'w') as f:
        json.dump({'statistics': stats, 'correlation_matrix': corr_clean}, f, indent=2)
    print("Exported dataset summary & correlation matrix.")
    print("ML Pipeline execution completed successfully!")

if __name__ == '__main__':
    main()
