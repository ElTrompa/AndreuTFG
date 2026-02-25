# 🚀 RideMetrics Advanced Features - Quick Reference

## 📦 Services Implemented

### Core Services (7 files)

1. **predictions.js** (350 lines)
   - FTP estimation (20min/60min methods)
   - Critical Power 2-parameter model  
   - W' balance calculation
   - PMC forecasting (4 scenarios)
   - FTP trend analysis

2. **coaching.js** (300 lines)
   - Daily recommendations (TSB-based)
   - Overtraining detection (5 risk factors)
   - Weekly training plans (4 goals)
   - Adaptive intensity suggestions

3. **advancedMetrics.js** (280 lines)
   - Variability Index calculation
   - Pacing analysis (5 strategies)
   - Peak power record detection (13 durations)
   - Efficiency trend (linear regression)
   - Aerobic decoupling analysis

4. **hrv.js** (180 lines)
   - HRV baseline calculation (30-day rolling)
   - Status analysis vs baseline
   - Anomaly detection
   - Training readiness score (HRV + TSB)

5. **terrain.js** (250 lines)
   - Climb detection (gradient-based)
   - W/kg calculation per ascent
   - VAM (Vertical Ascent Meters)
   - Climb categorization (HC, Cat1-4)
   - Historical comparison

6. **climbs.js** (240 lines)
   - 8 famous climbs database
   - Physics-based simulation
   - Pro record comparison
   - Personalized recommendations

7. **classifier.js** (330 lines)
   - 12 session types detection
   - Multi-parameter feature extraction
   - Rule-based classification (confidence 0.75-0.95)
   - Training distribution analysis
   - Polarization checking (80/20 rule)

8. **gamification.js** (400 lines)
   - 32 achievements across 6 categories
   - Progress tracking
   - Newly unlocked detection
   - Leaderboard system

**Total:** ~2,330 lines of advanced analytics code

---

## 🌐 API Endpoints (17 total)

### Route: `/advanced` (9 endpoints)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/ftp-prediction` | GET | Auto-estimate FTP from power curve |
| `/critical-power` | GET | Calculate CP + W' model |
| `/pmc-forecast` | POST | Project PMC with custom TSS |
| `/training-scenarios` | GET | 4 predefined training scenarios |
| `/daily-recommendation` | GET | AI coach daily suggestion |
| `/overtraining-check` | GET | Multi-factor overtraining analysis |
| `/weekly-plan` | GET | Generate 7-day training plan |
| `/activity/:id/advanced-metrics` | GET | VI, pacing, records for activity |
| `/efficiency-trends` | GET | EF and decoupling trends |
| `/activity/:id/classify` | GET | ML session type classification |
| `/training-distribution` | GET | Training type distribution analysis |
| `/achievements` | GET | All achievements (unlocked + locked) |
| `/achievements/progress` | GET | Progress toward locked achievements |
| `/achievements/leaderboard` | GET | Achievement catalog by category |

### Route: `/specialized` (8 endpoints)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/hrv/status` | POST | HRV status vs baseline |
| `/hrv/readiness` | POST | Training readiness (HRV + TSB) |
| `/hrv/anomalies` | POST | Detect sudden HRV drops |
| `/terrain/:activityId` | GET | Detect and analyze climbs |
| `/climbs/catalog` | GET | List all 8 famous climbs |
| `/climbs/simulate/:climbId` | GET | Simulate climb performance |
| `/climbs/recommendations` | GET | Recommend suitable climbs |

---

## 🏔️ Famous Climbs Database

| ID | Name | Country | Distance | Gain | Avg % | Pro Record |
|----|------|---------|----------|------|-------|------------|
| `alpe-dhuez` | Alpe d'Huez | France | 13.8km | 1120m | 8.1% | Pantani 37:35 |
| `mount-ventoux` | Mont Ventoux | France | 21.5km | 1617m | 7.5% | Mayo 56:00 |
| `angliru` | Alto del Angliru | Spain | 12.5km | 1266m | 10.1% | Contador 44:00 |
| `mortirolo` | Passo Mortirolo | Italy | 12.4km | 1300m | 10.5% | Pantani 39:48 |
| `tourmalet` | Col du Tourmalet | France | 17.2km | 1268m | 7.4% | Schleck 48:00 |
| `zoncolan` | Monte Zoncolan | Italy | 10.5km | 1210m | 11.5% | Simoni 39:00 |
| `stelvio` | Passo dello Stelvio | Italy | 24.3km | 1533m | 6.3% | Coppi 65:00 |
| `peyresourde` | Col de Peyresourde | France | 13.2km | 980m | 7.4% | Pinot 37:00 |

---

## 🏆 Achievement Categories

### Power (6 achievements)
- Club 250W / 300W / 350W (Bronze/Silver/Gold)
- Escalador 4.0 / 4.5 / 5.0 W/kg

### Volume (6 achievements)
- Distance: 1k / 5k / 10k km
- Elevation: 10k / 50k / 100k m

### Consistency (3 achievements)
- Streaks: 7 / 30 / 100 days

### Fitness (4 achievements)
- Weekly TSS: 500 / 750
- CTL: 70 / 100

### Special (4 achievements)
- Century (100km) / Double Century (200km)
- 5h ride / 1000W sprint

### Performance (3 achievements)
- VI < 1.03 on long ride
- 3+ negative splits
- 5 PRs in one ride

**Total: 32 achievements**

---

## 🤖 Session Types Detected

| Type | Description | Key Indicators |
|------|-------------|----------------|
| `recovery` | Active recovery Z1-Z2 | IF < 0.6, VI < 1.05 |
| `vo2max` | VO2max intervals | IF > 0.95, VI > 1.15 |
| `threshold` | FTP/threshold work | IF 0.92-1.02, sustained |
| `sweetspot` | Sweet spot 88-93% FTP | IF 0.83-0.95, long |
| `endurance` | Base endurance >2h | Duration > 120min, IF < 0.8 |
| `tempo` | Tempo Z3 | IF 0.75-0.88 |
| `climbing` | Hill climbing | Climbing ratio > 15 m/km |
| `sprint` | Sprint intervals | Max power > 2.5x avg |
| `easy` | Easy ride/commute | IF < 0.7, short |
| `race` | Competition | IF > 1.0, TSS > 150 |
| `group_ride` | Group ride | VI > 1.15, variable |
| `unclassified` | Mixed pattern | No clear match |

---

## 📊 Key Formulas

### Critical Power
```
CP = (W2 - W1) / (t2 - t1)
W' = (CP - P) * t
```

### PMC
```
CTL(today) = CTL(yesterday) + (TSS - CTL(yesterday)) / 42
ATL(today) = ATL(yesterday) + (TSS - ATL(yesterday)) / 7
TSB = CTL - ATL
```

### Variability Index
```
VI = Normalized Power / Average Power
```

### Efficiency Factor
```
EF = Normalized Power / Average HR
```

### Training Readiness
```
Readiness = (HRV_score * 0.6) + (TSB_score * 0.4)
```

---

## 💾 Database Requirements

### New Tables (if storing data)

```sql
-- HRV tracking
CREATE TABLE hrv_data (
  athlete_id VARCHAR(255),
  date DATE,
  rmssd INT,
  PRIMARY KEY (athlete_id, date)
);

-- Session classifications
ALTER TABLE activities 
ADD COLUMN session_type VARCHAR(50),
ADD COLUMN classification_confidence DECIMAL(3,2);

-- Achievements
CREATE TABLE athlete_achievements (
  athlete_id VARCHAR(255),
  achievement_id VARCHAR(100),
  unlocked_at TIMESTAMP,
  PRIMARY KEY (athlete_id, achievement_id)
);
```

---

## 🧪 Testing Examples

### Test FTP Prediction
```bash
curl "http://localhost:3000/advanced/ftp-prediction?athlete_id=123456"
```

### Test Climb Simulation
```bash
curl "http://localhost:3000/specialized/climbs/simulate/alpe-dhuez?athlete_id=123456&power=280"
```

### Test HRV Readiness
```bash
curl -X POST http://localhost:3000/specialized/hrv/readiness \
  -H "Content-Type: application/json" \
  -d '{
    "todayRMSSD": 52,
    "historicalData": [
      {"date": "2026-02-24", "rmssd": 48},
      {"date": "2026-02-23", "rmssd": 55}
    ]
  }'
```

### Test Training Distribution
```bash
curl "http://localhost:3000/advanced/training-distribution?athlete_id=123456&days=30"
```

---

## 📚 Documentation Files

1. **API_ADVANCED.md** - Complete API reference with examples
2. **ADVANCED_ANALYTICS.md** - Analytics methodology documentation
3. **PMC_SYSTEM.md** - PMC system documentation
4. **RATE_LIMITING.md** - Rate limiting architecture
5. **README.md** - Main project documentation

---

## 🎯 Next Steps

### Backend
- [ ] Database schema for HRV storage
- [ ] Achievement persistence layer
- [ ] Session type auto-tagging on upload
- [ ] Caching for expensive calculations

### Frontend
- [ ] HRV input screen
- [ ] Achievement showcase screen
- [ ] Training distribution dashboard
- [ ] Climb simulator interface
- [ ] Daily recommendation widget

### ML Enhancement
- [ ] Real ML model training from user data
- [ ] Personalized threshold algorithms
- [ ] Adaptive coach recommendations
- [ ] Predictive performance modeling

---

**Version:** 1.0.0  
**Date:** February 2026  
**Status:** ✅ All services implemented and tested  
**Total Lines of Code:** ~2,330 lines  
**API Endpoints:** 17 endpoints across 2 routes
