// Circular Animated SVG Gauge Component for AeroSense AI

class AQIGauge {
  constructor() {
    this.gaugeCircle = document.getElementById('gauge-fill-circle');
    this.valueDisplay = document.getElementById('gauge-value');
    this.categoryDisplay = document.getElementById('gauge-category');
    this.healthBox = document.getElementById('health-box');
    this.healthTitle = document.getElementById('health-title');
    this.healthDesc = document.getElementById('health-description');
    this.healthIcon = document.getElementById('health-icon');
    this.advisoryList = document.getElementById('advisory-list');

    this.radius = 92;
    this.circumference = 2 * Math.PI * this.radius; // ~578.05
    this.currentValue = 0;
    this.initGauge();
  }

  initGauge() {
    if (this.gaugeCircle) {
      this.gaugeCircle.style.strokeDasharray = `${this.circumference}`;
      this.gaugeCircle.style.strokeDashoffset = `${this.circumference}`;
    }
  }

  getCategoryInfo(aqi) {
    const val = Math.round(aqi);
    if (val <= 50) {
      return {
        category: 'Good',
        color: '#10b981',
        glow: 'rgba(16, 185, 129, 0.4)',
        bgBadge: 'rgba(16, 185, 129, 0.2)',
        borderBadge: 'rgba(16, 185, 129, 0.5)',
        icon: 'fa-solid fa-face-smile',
        statement: 'Air quality is ideal for all outdoor activities.',
        desc: 'Air pollution poses little or no risk to any demographic.',
        advisories: [
          'Perfect weather for outdoor physical exercise.',
          'Open windows for natural room ventilation.',
          'No respiratory precautions required.'
        ]
      };
    } else if (val <= 100) {
      return {
        category: 'Satisfactory',
        color: '#06b6d4',
        glow: 'rgba(6, 182, 212, 0.4)',
        bgBadge: 'rgba(6, 182, 212, 0.2)',
        borderBadge: 'rgba(6, 182, 212, 0.5)',
        icon: 'fa-solid fa-face-smile-beam',
        statement: 'Air quality is acceptable for the general public.',
        desc: 'Unusually sensitive individuals may experience slight respiratory irritation.',
        advisories: [
          'Sensitive groups should consider moderating prolonged heavy exertion.',
          'General population can safely engage in outdoor work.',
          'Ventilate rooms during non-peak traffic hours.'
        ]
      };
    } else if (val <= 200) {
      return {
        category: 'Moderate',
        color: '#f59e0b',
        glow: 'rgba(245, 158, 11, 0.4)',
        bgBadge: 'rgba(245, 158, 11, 0.2)',
        borderBadge: 'rgba(245, 158, 11, 0.5)',
        icon: 'fa-solid fa-face-meh',
        statement: 'May cause breathing discomfort to sensitive individuals.',
        desc: 'Elevated particulate matter can trigger asthma or lung symptoms in children and elderly.',
        advisories: [
          'People with asthma or heart conditions should limit strenuous outdoors.',
          'Avoid intense workouts along busy traffic corridors.',
          'Run indoor air purifiers if available.'
        ]
      };
    } else if (val <= 300) {
      return {
        category: 'Poor',
        color: '#f97316',
        glow: 'rgba(249, 115, 22, 0.4)',
        bgBadge: 'rgba(249, 115, 22, 0.2)',
        borderBadge: 'rgba(249, 115, 22, 0.5)',
        icon: 'fa-solid fa-face-frown',
        statement: 'Health alert: Breathing discomfort for most people.',
        desc: 'Prolonged exposure increases respiratory illness risk across all age groups.',
        advisories: [
          'Wear certified N95 / FFP2 masks during outdoor commutes.',
          'Keep windows closed to minimize particle ingress.',
          'Vulnerable individuals should remain in purified indoor spaces.'
        ]
      };
    } else if (val <= 400) {
      return {
        category: 'Very Poor',
        color: '#ef4444',
        glow: 'rgba(239, 68, 68, 0.4)',
        bgBadge: 'rgba(239, 68, 68, 0.2)',
        borderBadge: 'rgba(239, 68, 68, 0.5)',
        icon: 'fa-solid fa-triangle-exclamation',
        statement: 'High Alert: Severe respiratory irritation expected.',
        desc: 'Significant risk of chronic respiratory illness and heart strain upon prolonged exposure.',
        advisories: [
          'Avoid all outdoor strenuous exercises and jogging.',
          'Run HEPA air purifiers continuously indoors.',
          'Seek medical attention if suffering chest tightness or wheezing.'
        ]
      };
    } else {
      return {
        category: 'Severe',
        color: '#a855f7',
        glow: 'rgba(168, 85, 247, 0.4)',
        bgBadge: 'rgba(168, 85, 247, 0.2)',
        borderBadge: 'rgba(168, 85, 247, 0.5)',
        icon: 'fa-solid fa-skull-crossbones',
        statement: 'Emergency Conditions: Serious health impact on entire population.',
        desc: 'Hazardous air quality. Healthy adults may experience reduced lung capacity and throat inflammation.',
        advisories: [
          'Strictly remain indoors with closed windows and active air filtration.',
          'Elderly, children, and patients must avoid any exposure.',
          'Avoid all vehicular travel and physical exertion.'
        ]
      };
    }
  }

  update(aqiValue, customCategory = null) {
    const targetVal = Math.max(1, Math.min(500, Math.round(aqiValue)));
    const cat = this.getCategoryInfo(targetVal);

    // Calculate arc fill percentage (0 to 500 max scale)
    const percentage = Math.min(1, Math.max(0, targetVal / 500));
    const offset = this.circumference * (1 - percentage);

    // Update Circle Arc
    if (this.gaugeCircle) {
      this.gaugeCircle.style.stroke = cat.color;
      this.gaugeCircle.style.filter = `drop-shadow(0 0 12px ${cat.glow})`;
      this.gaugeCircle.style.strokeDashoffset = `${offset}`;
    }

    // Animate Number
    this.animateNumber(this.currentValue, targetVal);
    this.currentValue = targetVal;

    // Update Category Badge
    if (this.categoryDisplay) {
      this.categoryDisplay.textContent = customCategory || cat.category;
      this.categoryDisplay.style.color = cat.color;
      this.categoryDisplay.style.background = cat.bgBadge;
      this.categoryDisplay.style.borderColor = cat.borderBadge;
    }

    // Update Health Impact Box
    if (this.healthBox && this.healthTitle && this.healthDesc) {
      this.healthTitle.textContent = `${cat.category} Air Quality: ${cat.statement}`;
      this.healthDesc.textContent = cat.desc;
      if (this.healthIcon) {
        this.healthIcon.className = cat.icon;
        this.healthIcon.style.color = cat.color;
      }
      if (this.advisoryList) {
        this.advisoryList.innerHTML = cat.advisories
          .map(adv => `<div class="advisory-item"><i class="fa-solid fa-circle-check"></i> <span>${adv}</span></div>`)
          .join('');
      }
    }
  }

  animateNumber(start, end) {
    const duration = 1000;
    const startTime = performance.now();
    const isIncrease = end > start;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (end - start) * ease);

      if (this.valueDisplay) {
        this.valueDisplay.textContent = current;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (this.valueDisplay) this.valueDisplay.textContent = end;
      }
    };

    requestAnimationFrame(animate);
  }
}

window.AQIGauge = AQIGauge;
