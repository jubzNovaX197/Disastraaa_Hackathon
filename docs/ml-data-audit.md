# Disastraaa Stage 7: ML Data Audit & Historical Data Readiness Report

**System Version:** Disastraaa Stage 7  
**Role:** Senior ML Engineer, Disaster-Risk Scientist & MLOps Specialist  
**Evaluation Scope:** Odisha State / Kalahandi Basin Focus Corridor  
**Date:** October 2026

---

## 1. Executive Summary & Audit Methodology

Before designing or training any machine learning models for the Disastraaa platform, an exhaustive audit of the repository, active database tables, object storage archives, and external provider feeds was performed. 

The primary objective of this audit is to answer the fundamental data-engineering questions:
1. **What data genuinely exists in the platform today?**
2. **Are there trustworthy, verified outcome target labels, or only model predictions and proxy estimates?**
3. **What is the real risk of data leakage (especially future observations leaking into historical feature vectors)?**
4. **Is the dataset mature enough for supervised machine learning, or should an exploratory baseline / data-readiness report be established first?**

### Audit Findings Summary
* **Demo Data Isolation Confirmed:** `src/data/demo/historicalEvents.ts` contains simulated prototype events clearly marked `⚠️ PROTOTYPE / SIMULATED DATA ONLY`. These records are **strictly barred** from ML training.
* **Real Operational Telemetry in Neon:** Neon PostgreSQL 18.6 currently hosts live weather observations, 25 OpenStreetMap road segments, 4 registered relief shelter amenities, and 2 IMD CAP alert broadcast records.
* **Tier 3 Analytical Benchmarks in Object Store:** Stage 6 successfully established two curated historical benchmark datasets in Tier 3 object storage (`analytics/`) with manifests recorded in Neon `dataset_manifests`:
  1. `ml-kalahandi-flood-benchmark` (v1.0.0): Real target labels based on CWC official Kesinga Danger Stage (170.05 m MSL) across 2018–2024 monsoon seasons.
  2. `ml-odisha-cyclone-impact-benchmark` (v1.0.0): Real damage classifications based on documented OSDMA disaster loss records (1999–2021).
* **Deterministic Risk Engine Baseline:** The platform already contains calibrated deterministic flood and cyclone risk engines (`src/lib/risk/flood`, `src/lib/risk/cyclone`), providing an existing scientific baseline against which any proposed ML model can be compared.

---

## 2. Complete Dataset Inventory & Quality Analysis

### Dataset 1: Central Water Commission (CWC) Kesinga River Gauge Telemetry & Flood Stages
* **Source & Provider:** Central Water Commission (India-WRIS / NWIC), Ministry of Jal Shakti.
* **Storage Location:** 
  * Operational: `src/lib/hydrology/cwcWrisClient.ts`, `src/lib/hydrology/riverService.ts`
  * Benchmark Dataset: `.storage/analytics/ml-kalahandi-flood-benchmark/v1.0.0/`
  * Manifest: Neon table `dataset_manifests` (`manifest_ml_kalahandi_flood_v1`)
* **Spatial & Temporal Scope:** Kesinga Gauge (Station 022-MDBURLA) on Tel River, Kalahandi District, Odisha. Longitude 83.22°E, Latitude 20.20°N. Covered period: 2018 to 2024 monsoon seasons (July–September).
* **Target Label:** `target_exceeded_danger_stage` (Binary: `1` if water level $\ge 170.05\text{ m MSL}$ [Danger Stage], `0` if below).
  * *Verification:* Verified against official CWC river warning stages: Warning Level = $169.00\text{ m}$, Danger Level = $170.05\text{ m}$, Historical High Flood Level (HFL) = $171.25\text{ m}$.
* **Features Available:**
  * Antecedent rainfall: `rain_24h_mm`, `rain_48h_mm`, `rain_72h_mm` (Open-Meteo / IMD gridded observations)
  * Soil moisture: `catchment_soil_moisture_pct` (0–100%)
  * Upstream flow: `upstream_discharge_cumec` (GloFAS / gauge discharge in $\text{m}^3/\text{s}$)
  * Prior gauge stage: `gauge_stage_prior_m` ($T - 6\text{h}$)
* **Missingness & Measurement Limits:**
  * Real-time India-WRIS portal frequently experiences intermittent connectivity and latency; historical monsoon values require offline calibration.
  * Zero precipitation during non-monsoon months creates class imbalance (floods occur almost exclusively July–September).
* **Leakage Risks & Safeguards:**
  * *Risk:* Using rainfall or discharge observed after prediction time $T$.
  * *Safeguard:* Strict feature cutoff $T_{obs} \le T_{target} - 6\text{h}$. Feature vector is strictly fixed at $T - 6\text{h}$ to predict whether the danger stage will be exceeded at $T$.
* **Suitability:** **HIGH (SUITABLE FOR SUPERVISED BASELINE)**. Real physical target, verifiable ground truth, well-defined binary classification task.

---

### Dataset 2: Open-Meteo & ECMWF/GFS Historical Weather Telemetry
* **Source & Provider:** Open-Meteo GmbH / ECMWF ERA5 & GFS numerical analysis.
* **Storage Location:** Neon `weather_telemetry`, Neon `telemetry_daily_aggregates`, Tier 2 raw archives.
* **Spatial & Temporal Scope:** Odisha districts (Kalahandi, Khordha, Cuttack, Puri). Hourly observations and 24h rolling records.
* **Target Label:** None natively (features only: temperature, precipitation, wind speed, relative humidity, surface pressure).
* **Missingness & Quality Concerns:**
  * Station coverage varies by district; Kalahandi depends on interpolated numerical blend (~2.5km grid resolution).
  * Extreme precipitation peaks can be smoothed out if daily averages are used without preserving 1-hour and 3-hour maximums.
* **Leakage Risks:** Forecast arrays from Open-Meteo extend up to +7 days. Using future forecast precipitation as an "observed" historical feature would induce massive target leakage.
* **Suitability:** **FEATURE PROVIDER ONLY**. Must be coupled with river gauges or disaster outcome targets.

---

### Dataset 3: Odisha Historical Disaster Chronology & Damage Outcomes
* **Source & Provider:** Odisha State Disaster Management Authority (OSDMA) Official Reports, Census of India 2011, Disastraaa curated benchmark.
* **Storage Location:** `.storage/analytics/ml-odisha-cyclone-impact-benchmark/v1.0.0/`, Neon `historical_disaster_records`, Neon `dataset_manifests`.
* **Spatial & Temporal Scope:** 30 Odisha Districts, covering major events from 1999 to 2021:
  * 1999 Odisha Super Cyclone (Category 5, 260 km/h)
  * Cyclone Phailin 2013 (Very Severe, 215 km/h)
  * Cyclone Hudhud 2014 (Very Severe, 185 km/h)
  * Cyclone Titli 2018 (Very Severe, 175 km/h)
  * Cyclone Fani 2019 (Extremely Severe, 215 km/h)
  * Cyclone Yaas 2021 (Very Severe, 140 km/h)
* **Target Label:** `target_damage_level` (Categorical: `LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
  * *Verification:* Grounded in official post-disaster loss assessments (structures damaged, evacuation scale, power grid collapse).
* **Features Available:**
  * Central pressure deficit ($\Delta P$ in hPa)
  * Peak sustained wind speed ($\text{km/h}$)
  * Distance to coast ($\text{km}$)
  * Storm rainfall accumulation ($\text{mm}$)
  * District population density ($\text{people}/\text{km}^2$)
  * Pucca housing ratio (proportion of reinforced concrete structures)
* **Missingness & Measurement Limits:** Small sample size ($N \approx 5\text{--}15$ major cyclone disaster occurrences in modern satellite era). Extreme class imbalance towards non-cyclone days.
* **Suitability:** **SUITABLE FOR BENCHMARK COMPARISON / EVENT-LEVEL EVALUATION ONLY**. Too few historical events for deep learning; ideal for decision-tree rules and risk weight calibration.

---

### Dataset 4: OpenStreetMap Road Infrastructure & Relief Shelters
* **Source & Provider:** OpenStreetMap Contributors via Overpass API.
* **Storage Location:** Neon `road_segments` (25 monitored PostGIS LineStrings) and `shelters` (4 PostGIS Points).
* **Target Label:** Current road blockage / passability.
* **Quality & Gaps:** No continuous historical time-series of flood inundation depth per road segment exists. Dynamic road flood status is currently derived deterministically from hazard intersection.
* **Suitability:** **STATIC GEOSPATIAL REFERENCE ONLY**. Unsuitable for standalone supervised training without historical sensor telemetry along each road segment.

---

### Dataset 5: Simulated / Prototype Historical Events (`demoHistoricalEvents`)
* **Source:** `src/data/demo/historicalEvents.ts`.
* **Storage Location:** TypeScript constant in codebase.
* **Status:** **FICTIONAL PROTOTYPE DATA**.
* **Audit Determination:** **EXCLUDED FROM ML PIPELINE**.
  * Fictional impact statistics must never be used to train models or claim real-world prediction accuracy.

---

## 3. Candidate ML Tasks & Formal Problem Formulation

Based on the audit, only tasks with verified outcome labels and defensible temporal boundaries are viable:

### Selected Primary Task: 6-Hour River Threshold Exceedance Classification
* **Prediction Unit:** Single hydrometric station (Kesinga Gauge, Tel River Basin, Kalahandi, Odisha).
* **Prediction Timestamp ($T_0$):** Real-time inference evaluation time (e.g., 06:00 UTC).
* **Forecast Horizon ($\Delta t$):** +6 Hours ($T = T_0 + 6\text{h}$).
* **Target Formulation:**
  $$y = \begin{cases} 1 & \text{if } \text{Gauge Level}(T_0 + 6\text{h}) \ge 170.05\text{ m MSL (Danger Stage)} \\ 0 & \text{otherwise} \end{cases}$$
* **Feature Vector $X(T_0)$ (Strictly available at $T_0$):**
  1. $X_1$: `rain_24h_mm` (Accumulated precipitation past 24 hours up to $T_0$)
  2. $X_2$: `rain_48h_mm` (Accumulated precipitation past 48 hours up to $T_0$)
  3. $X_3$: `rain_72h_mm` (Accumulated precipitation past 72 hours up to $T_0$)
  4. $X_4$: `catchment_soil_moisture_pct` (Catchment wetness index at $T_0$)
  5. $X_5$: `upstream_discharge_cumec` (Hydrological discharge at $T_0$ in $\text{m}^3/\text{s}$)
  6. $X_6$: `gauge_stage_prior_m` (Current water level at $T_0$ in m MSL)
  7. $X_7$: `threshold_distance_m` ($170.05 - \text{gauge\_stage\_prior\_m}$)
* **Intended User & Decision Supported:**
  * District Disaster Management Authority (DDMA) Kalahandi and Block Development Officers.
  * Early evacuation trigger for low-lying settlements along the Tel River (Kesinga town and Junagarh agricultural basin) 6 hours before riverbanks breach.

---

## 4. Leakage Prevention Protocol

To guarantee scientific validity, the following leakage rules are enforced:
1. **Strict Chronological Splitting:**
   * **Train Split:** 2018–2021 historical seasons (pre-event historical calibration).
   * **Validation Split:** 2022 season (hyperparameter tuning and decision threshold calibration).
   * **Test Split:** 2023–2024 seasons (untouched holdout evaluation).
   * *Zero random shuffling* across time.
2. **Feature Standardization Isolated to Training Data:**
   * Mean $\mu_{train}$ and standard deviation $\sigma_{train}$ are computed **only** on the training split and applied unchanged to validation and test splits.
3. **Causal Precedence Verification:**
   * Every example satisfies $\max(\text{Timestamp}(X)) \le \text{Timestamp}(y) - 6\text{h}$.

---

## 5. Comparison Baseline: Deterministic Flood Engine

The platform’s existing deterministic risk engine (`calculateFloodRisk` in `src/lib/risk/flood`) computes a risk score in $[0, 100]$ using weighted physics-based rules:
* Water level relative to warning/danger stages (weight 0.40)
* Rainfall accumulation (weight 0.22)
* Upstream river discharge (weight 0.15)
* Soil saturation (weight 0.15)
* Historical frequency (weight 0.08)

A flood warning is deterministically triggered when the risk score $\ge 65$. This deterministic decision rule serves as **Baseline 2 (Domain Heuristic)** to benchmark ML classifiers against.

---

## 6. Audit Conclusion & Next Steps

1. **Supervised ML Readiness:** The project **IS READY** for a rigorous, lightweight supervised classification baseline on the CWC Kesinga River Threshold Exceedance task.
2. **Model Choice:** Simple, defensible baselines (Majority Class, Logistic Regression, Decision Tree / Random Forest) will be trained and evaluated. Deep learning is unjustified given dataset dimensionality ($N < 1000$).
3. **Deployment Safety:** The resulting ML model must operate in offline experiment mode first, and if exposed to the API, must be presented alongside input quality metadata and the deterministic risk score without replacing authoritative government warnings.
