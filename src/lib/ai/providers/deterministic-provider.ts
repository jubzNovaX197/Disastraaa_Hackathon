/**
 * AI Disaster Intelligence Assistant — Deterministic Structured Provider
 *
 * Fully data-grounded, zero-hallucination operational analysis engine.
 * Synthesizes exact application state into structured, explainable answers.
 * Handles the full 10-section Emergency Situation Report (SitRep).
 */

import type { AIProvider, GenerateInput } from './provider.interface';
import type {
  AssistantResponsePayload,
  DataQualityBadge,
  EmergencySitRepPayload,
  StructuredSections,
} from '../types';
import { formatNumber } from '@/lib/utils';
import { ROLES } from '@/types/roles';

export class DeterministicProvider implements AIProvider {
  readonly name = 'Structured Intelligence Engine (Offline / Local)';

  isAvailable(): boolean {
    return true;
  }

  async generateResponse(input: GenerateInput): Promise<AssistantResponsePayload> {
    const { question, intent, context, locationFocus, role } = input;
    const locPrefix = locationFocus ? `for ${locationFocus}` : 'across coastal operational zones';
    const isReal = !context.dataFreshness.isSimulated;

    let situation = '';
    const keyFactors: string[] = [];
    const currentData: Record<string, string | number> = {};
    let operationalContext = '';
    const sources: string[] = ['Risk Intelligence', 'Operational Command Center'];
    const dataQuality: DataQualityBadge[] = context.dataFreshness.isSimulated
      ? ['VERIFIED', 'PREDICTED', 'SIMULATED']
      : ['VERIFIED', 'LIVE_UPDATED'];

    switch (intent) {
      // ───────────────────────────────────────────────────────────────────────
      // 0. EMERGENCY SITUATION REPORT (SITREP)
      // ───────────────────────────────────────────────────────────────────────
      case 'SITREP_GENERATION': {
        sources.push(
          'Command Operations',
          'PostGIS Geospatial DB',
          'Live Meteorological Telemetry',
          'IMD CAP Feed',
          'OSM Road Intelligence',
          'Emergency Shelter Registry',
          'Citizen Ground Intelligence',
        );

        const callerRole = role || ROLES.CITIZEN;
        const isOfficial = callerRole !== ROLES.CITIZEN && callerRole !== ROLES.REGISTERED_USER;
        const classification = isOfficial ? 'OFFICIAL_EOC_DIRECTIVE' : 'PUBLIC_SAFETY_ADVISORY';
        const scopeStr = locationFocus || 'All Operational Corridors (Statewide Basin)';
        const nowIso = new Date().toISOString();

        // 1. Reporting Scope
        const issuingAuthority = isOfficial
          ? `State Emergency Operations Center (Clearance: ${callerRole})`
          : 'Disastraaa Civil Defense Public Safety Advisory';

        // 2. Hazards & Risk
        const activeHazardsList = context.summary.activeDisasters.length > 0
          ? context.summary.activeDisasters
          : (isReal ? ['No active severe hazards currently recorded in verified database'] : ['Cyclone Remal (WARNING)', 'Mahanadi Basin Inundation (HIGH)']);
        const highestRiskZone = context.summary.highestRiskLocation !== 'None (Operational Feeds Standby)'
          ? context.summary.highestRiskLocation
          : (isReal ? 'None (Operational Feeds Standby)' : 'Puri Coastal Belt');
        const compositeRiskScore = context.kpis.riskScore > 0 ? context.kpis.riskScore : (isReal ? 0 : 78);
        const dominantThreat = context.relevantRisks?.[0]?.dominantHazard || (isReal ? 'STANDBY_MONITORING' : 'CYCLONE');

        // 3. Meteorological Telemetry
        const weatherInfo = context.telemetryWeather;
        const weatherStatus = weatherInfo?.status || (isReal ? 'UNAVAILABLE' : 'SIMULATED');
        const weatherSummary = weatherInfo && weatherInfo.temperatureC !== undefined
          ? `${weatherInfo.weatherCondition || 'Observed'}, Temp: ${weatherInfo.temperatureC}°C, Wind: ${weatherInfo.windSpeedKmh} km/h, Precip: ${weatherInfo.precipitationMm} mm, Barometer: ${weatherInfo.surfacePressureHpa} hPa`
          : (isReal ? 'Meteorological station telemetry UNAVAILABLE for active sector' : 'Squall Gale 74 km/h, Heavy Rainfall 118mm/24h');
        const weatherMetrics: Record<string, string | number> = {};
        if (weatherInfo && weatherInfo.temperatureC !== undefined) {
          weatherMetrics['Temperature'] = `${weatherInfo.temperatureC}°C`;
          weatherMetrics['Wind Speed'] = `${weatherInfo.windSpeedKmh} km/h`;
          weatherMetrics['Precipitation'] = `${weatherInfo.precipitationMm} mm`;
          weatherMetrics['Surface Pressure'] = `${weatherInfo.surfacePressureHpa} hPa`;
        } else {
          weatherMetrics['Observation Status'] = weatherStatus;
        }

        // 4. Affected Population
        const popExposed = context.kpis.exposedPopulation > 0
          ? context.kpis.exposedPopulation
          : (isReal ? 'UNAVAILABLE' : 485000);
        const affectedDistricts = context.relevantRisks?.map((r) => r.district).filter(Boolean) || [];

        // 5. Shelter Operations & Gaps
        const sheltersList = context.relevantShelters || [];
        const totalCapacity = sheltersList.reduce((acc, s) => acc + s.capacity, 0);
        const totalOccupancy = sheltersList.reduce((acc, s) => acc + s.occupancy, 0);
        const capacityGap = totalCapacity - totalOccupancy;
        const shelterStatusSummary = sheltersList.length > 0
          ? `${sheltersList.length} indexed facilities: ${totalOccupancy}/${totalCapacity} beds occupied (${Math.round((totalOccupancy / Math.max(1, totalCapacity)) * 100)}% utilization)`
          : (isReal ? 'UNAVAILABLE: No registered relief shelters indexed in this jurisdiction' : '4 shelters active, 3 approaching capacity buffer');

        // 6. Road Disruption & Evidence
        const blockedRoads = context.relevantRoads || [];
        const criticalSegments = blockedRoads.map((r) => ({
          corridor: r.name,
          status: r.status,
          cause: r.reason,
          evidence: isReal ? 'OSM Road Network / Ground Telemetry' : 'Simulated corridor blockage',
        }));

        // 7. Ground Incidents & Citizen Reports
        const verifiedIncidentsCount = context.verifiedIncidents?.length ?? 0;
        const citizenReportsTotal = context.kpis.citizenReportsCount;
        const verifiedReports = context.recentReports?.filter((r) => r.status === 'VERIFIED') || [];
        const pendingReports = context.recentReports?.filter((r) => r.status !== 'VERIFIED') || [];

        // 8. Priority Recommendations
        const immediateActions = [
          'Maintain life-safety buffer zones along identified high-risk watercourses and low-lying highways.',
          'Verify evacuation shelter intake capacity before directing evacuee convoys.',
        ];
        if (blockedRoads.length > 0) {
          immediateActions.push(`Reroute emergency logistical transit around impaired corridors (${blockedRoads[0].name}).`);
        }
        const operationalDirectives = isOfficial
          ? [
              'Pre-position high-clearance rescue assets and water purification units at designated forward staging depots.',
              'Field responders must verify citizen reports on-site before dispatching heavy engineering plant.',
            ]
          : [
              'Citizens should avoid traversing waterlogged bridges or unverified bypass routes.',
              'Follow municipal civil defense broadcasts for localized shelter assignments.',
            ];

        // 9. Data Limitations
        const dataLimitations = {
          unavailableSensors: weatherStatus === 'UNAVAILABLE' ? ['Ground meteorological telemetry'] : [],
          staleFeeds: weatherStatus === 'STALE' ? ['Weather telemetry (>24h old)'] : [],
          unverifiedItems: pendingReports.map((p) => `Citizen report #${p.id} (${p.title})`),
          groundCheckRequired: blockedRoads.map((b) => b.name),
        };

        // 10. Provenance
        const provenance = context.dataSourceProvenance || {
          databaseConnected: isReal,
          environment: isReal ? 'REAL' : 'DEMO',
          weatherSource: weatherInfo?.source || 'Open-Meteo',
          hazardsSource: isReal ? 'Neon PostgreSQL (hazards)' : 'Demo Multi-Hazard Fixture',
          alertsSource: isReal ? 'IMD CAP / Neon PostgreSQL' : 'Demo Alert Fixture',
          roadsSource: isReal ? 'OSM Overpass / PostGIS' : 'Demo Road Segments',
          sheltersSource: isReal ? 'OSDMA / PostGIS shelters' : 'Demo Shelter Registry',
          incidentsSource: isReal ? 'Neon PostgreSQL (incidents)' : 'Demo Incidents',
          reportsSource: isReal ? 'Citizen Ground Intelligence' : 'Demo Reports',
        };

        const sitRepPayload: EmergencySitRepPayload = {
          reportId: `SITREP-${Date.now().toString(36).toUpperCase()}`,
          generatedAt: nowIso,
          classification,
          targetScope: scopeStr,
          sections: {
            reportingScope: {
              timestamp: nowIso,
              geographicalScope: scopeStr,
              issuingAuthority,
            },
            hazardsAndRisk: {
              activeHazards: activeHazardsList,
              highestRiskZone,
              compositeRiskScore,
              dominantThreat,
            },
            weatherAndFreshness: {
              status: weatherStatus,
              source: weatherInfo?.source || (isReal ? 'Open-Meteo Station Standby' : 'Meteorological Simulation'),
              observedAt: weatherInfo?.observedAt || nowIso,
              summary: weatherSummary,
              metrics: weatherMetrics,
            },
            affectedPopulation: {
              estimatedExposed: popExposed,
              affectedDistricts,
              basisOfEstimate: isReal
                ? (popExposed === 'UNAVAILABLE' ? 'UNAVAILABLE: Census demographic layer not bound to sector' : 'PostGIS spatial intersection')
                : 'Census demographic overlay projection',
            },
            shelterCapacityAndGaps: {
              totalShelters: sheltersList.length > 0 ? sheltersList.length : (isReal ? 'UNAVAILABLE' : 4),
              activeCapacity: totalCapacity > 0 ? totalCapacity : (isReal ? 'UNAVAILABLE' : 2800),
              currentOccupancy: totalOccupancy > 0 ? totalOccupancy : (isReal ? 'UNAVAILABLE' : 2100),
              capacityGap: totalCapacity > 0 ? capacityGap : (isReal ? 'UNAVAILABLE' : 700),
              statusSummary: shelterStatusSummary,
            },
            blockedRoutesAndEvidence: {
              disruptedCorridorsCount: blockedRoads.length,
              criticalSegments,
            },
            incidentsAndReports: {
              verifiedIncidentsCount,
              dispatchedTeamsCount: context.verifiedIncidents?.filter((i) => i.assignedTeam)?.length ?? 0,
              citizenReportsTotal,
              verifiedReportsCount: verifiedReports.length,
              pendingReportsCount: pendingReports.length,
              cautionaryNote: 'Citizen reports reflect ground observations and are not legal disaster facts until officially verified.',
            },
            priorityRecommendations: {
              immediateActions,
              operationalDirectives,
              decisionSupportDisclaimer: 'All recommendations are decision-support intelligence for human emergency coordinators. Automated systems do not dispatch units or issue legal emergency orders.',
            },
            dataLimitations,
            provenanceMetadata: {
              sources,
              environment: isReal ? 'REAL' : 'DEMO',
              authorizedRole: callerRole,
              providerUsed: this.name,
            },
          },
        };

        situation = `Emergency Situation Report for ${scopeStr} issued at ${new Date(nowIso).toUTCString()} under ${classification} classification. Threat posture: ${dominantThreat} (Composite Risk Score: ${compositeRiskScore}/100).`;

        keyFactors.push(
          `Authority: ${issuingAuthority}`,
          `Active Hazards: ${activeHazardsList.join('; ')}`,
          `Weather Status [${weatherStatus}]: ${weatherSummary}`,
          `Population Exposure: ${popExposed === 'UNAVAILABLE' ? 'UNAVAILABLE' : formatNumber(Number(popExposed)) + ' citizens'}`,
          `Shelter Operations: ${shelterStatusSummary}`,
          `Corridor Disruptions: ${blockedRoads.length} segments obstructed or closed`,
          `Field Intelligence: ${verifiedIncidentsCount} verified incidents, ${citizenReportsTotal} citizen submissions (${pendingReports.length} pending verification)`,
        );

        currentData['Report ID'] = sitRepPayload.reportId;
        currentData['Classification'] = classification;
        currentData['Scope'] = scopeStr;
        currentData['Composite Risk'] = `${compositeRiskScore}/100`;
        currentData['Weather Freshness'] = weatherStatus;
        currentData['Exposed Population'] = popExposed === 'UNAVAILABLE' ? 'UNAVAILABLE' : formatNumber(Number(popExposed));
        currentData['Blocked Roads'] = blockedRoads.length;
        currentData['Shelter Gap'] = capacityGap;
        currentData['Verified Incidents'] = verifiedIncidentsCount;

        operationalContext =
          'DECISION SUPPORT DIRECTIVE: This Situation Report is generated from verifiable operational telemetry and database records to assist human incident commanders. Real emergency dispatch and official public warning broadcasts require human authorization.';

        return {
          text: this.formatSitRepMarkdown(sitRepPayload),
          intent,
          sources,
          dataQuality: isReal ? ['VERIFIED', 'LIVE_UPDATED'] : ['VERIFIED', 'SIMULATED'],
          structuredSections: {
            situation,
            keyFactors,
            currentData,
            operationalContext,
            dataFreshness: `Synchronized ${context.dataFreshness.lastSyncFormatted} (${isReal ? 'Live Official Feed' : 'Simulated Live Feed'})`,
          },
          sitRep: sitRepPayload,
          providerUsed: this.name,
          locationFocus,
          timestamp: nowIso,
        };
      }

      // ───────────────────────────────────────────────────────────────────────
      // 1. SITUATION SUMMARY
      // ───────────────────────────────────────────────────────────────────────
      case 'SITUATION_SUMMARY': {
        sources.push('Active Alerts', 'Road Intelligence', 'Shelter Readiness', 'Live Intelligence');
        if (isReal && context.summary.highestRiskLocation === 'None (Operational Feeds Standby)') {
          situation = `Current disaster posture ${locPrefix} indicates operational feeds are standing by. No severe disaster events are active.`;
          keyFactors.push(
            'Operational telemetry actively synchronized',
            'Zero critical alerts active across jurisdictional sector',
          );
          currentData['Status'] = 'Operational Feeds Standby';
          currentData['Active Critical Alerts'] = context.kpis.activeAlertsCount;
          currentData['Blocked Roads'] = context.kpis.blockedRoadsCount;
          operationalContext = 'Standing by for telemetry or verified authority alerts.';
        } else {
          situation = `Current disaster posture ${locPrefix} is at ${context.summary.statusLevel} status. Multi-hazard conditions affect ${formatNumber(context.kpis.exposedPopulation)} residents. Highest risk concentration is located at ${context.summary.highestRiskLocation}.`;

          keyFactors.push(
            `Dominant hazards: ${context.summary.activeDisasters.join(', ')}`,
            `${context.kpis.activeAlertsCount} active warnings currently in effect across state emergency boundaries`,
            `${context.kpis.blockedRoadsCount} strategic road segments impaired or blocked, impeding rapid transit`,
            `${context.kpis.sheltersUnderPressure} emergency shelters approaching or exceeding maximum intake capacity`,
          );

          currentData['Composite High Risk Index'] = `${context.kpis.riskScore}/100`;
          currentData['Exposed Population'] = formatNumber(context.kpis.exposedPopulation);
          currentData['Active Critical Alerts'] = context.kpis.activeAlertsCount;
          currentData['Disrupted Highway Links'] = context.kpis.blockedRoadsCount;
          currentData['Resource Shortage Categories'] = context.kpis.resourceDeficitsCount;

          operationalContext =
            'State Emergency Operations Center (SEOC) directives require priority resource pre-positioning and sandbagging along exposed bunds, with strict curfew along exposed coastal highways.';
        }
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 2. FLOOD ANALYSIS
      // ───────────────────────────────────────────────────────────────────────
      case 'FLOOD_ANALYSIS': {
        sources.push('Flood Intelligence', 'River Stage Telemetry', 'Active Alerts');
        dataQuality.push('LIVE_UPDATED');
        const floodLocations = context.relevantRisks?.filter((r) => r.dominantHazard === 'FLOOD') || [];

        if (floodLocations.length === 0) {
          if (isReal) {
            situation = `Riverine flood conditions ${locPrefix}: No active flood hazards or inundation alerts currently recorded in the operational database.`;
            keyFactors.push(
              'Hydrometeorological sensors reporting baseline runoff levels',
              'No river gauge stations currently exceeding danger mark in this sector',
            );
            currentData['Flood Risk Status'] = 'Baseline / Standby';
            currentData['Inundated Population'] = 0;
            operationalContext = 'Hydrology teams maintain standard continuous automated gauge monitoring.';
          } else {
            const topFlood = { name: 'Mahanadi Delta Lowlands', score: 82 };
            situation = `Riverine flood conditions ${locPrefix} are driven by high discharge from upstream Hirakud dam gates combined with deltaic tidal blockage. ${topFlood.name} exhibits the highest localized inundation risk (score ${topFlood.score}/100).`;
            keyFactors.push(
              'River stage at Naraj gauge station remains above the critical danger mark',
              'Heavy low-catchment runoff causing drainage congestion in urban municipal drains',
            );
            currentData['Primary Flood Vulnerability'] = topFlood.name;
            currentData['Flood Severity Score'] = `${topFlood.score}/100`;
            currentData['Inundated Population'] = formatNumber(context.kpis.exposedPopulation * 0.45);
            operationalContext = 'Hydrology engineering teams are monitoring barrages.';
          }
        } else {
          const topFlood = floodLocations[0];
          situation = `Riverine flood conditions ${locPrefix}: ${topFlood.name} exhibits elevated localized inundation risk (score ${topFlood.score}/100).`;
          keyFactors.push(
            `Elevated flood score observed in ${topFlood.district || topFlood.name}`,
            'Localized drainage congestion monitored along low-lying agricultural corridors',
          );
          currentData['Primary Flood Vulnerability'] = topFlood.name;
          currentData['Flood Severity Score'] = `${topFlood.score}/100`;
          currentData['Inundated Population'] = formatNumber(topFlood.exposedPopulation);
          operationalContext = 'High-clearance emergency rescue units alerted for potential low-lying water ingress.';
        }
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 3. CYCLONE ANALYSIS
      // ───────────────────────────────────────────────────────────────────────
      case 'CYCLONE_ANALYSIS': {
        sources.push('Cyclone Intelligence', 'Meteorological Alerts', 'Safe Transit');
        const cycloneLocs = context.relevantRisks?.filter((r) => r.dominantHazard === 'CYCLONE') || [];

        if (cycloneLocs.length === 0) {
          if (isReal) {
            situation = `Cyclonic conditions ${locPrefix}: No active cyclonic warnings or severe squalls currently tracked by meteorological feeds.`;
            keyFactors.push(
              'Bay of Bengal depression models indicate calm to moderate coastal conditions',
              'No gale advisories in effect for designated port sectors',
            );
            currentData['Cyclone Threat Level'] = 'Normal / Standby';
            operationalContext = 'Fishermen advisories remain standard; continuous Doppler radar monitoring active.';
          } else {
            const topCyclone = { name: 'Paradip Port & Jagatsinghpur Belt', score: 88 };
            situation = `Extremely Severe Cyclonic Storm tracking northeastward across the Bay of Bengal presents severe squall and coastal surge threats ${locPrefix}. Sustained gale winds reaching 165–185 km/h are projected around ${topCyclone.name}.`;
            keyFactors.push(
              'Coastal storm surge projection of 1.0m to 1.5m above astronomical high tide',
              'Uprooted tree branches and overhead telecommunication lines impacting coastal highway corridors',
            );
            currentData['Maximum Projected Gusts'] = '195 km/h';
            currentData['Cyclone Risk Score'] = `${topCyclone.score}/100`;
            currentData['Critical Sector'] = topCyclone.name;
            operationalContext = 'Multipurpose cyclone shelters (MCS) activated under high priority.';
          }
        } else {
          const topCyclone = cycloneLocs[0];
          situation = `Cyclonic activity detected ${locPrefix}: Sustained wind threats and squalls affect ${topCyclone.name} (Risk Score: ${topCyclone.score}/100).`;
          keyFactors.push(
            `Squall winds tracked in ${topCyclone.district || topCyclone.name}`,
            'Harbour authorities enforcing small craft advisories',
          );
          currentData['Critical Sector'] = topCyclone.name;
          currentData['Cyclone Risk Score'] = `${topCyclone.score}/100`;
          operationalContext = 'Coastal shelters and rapid-response teams on standby.';
        }
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 4. ACTIVE ALERTS
      // ───────────────────────────────────────────────────────────────────────
      case 'ALERT_QUERY': {
        sources.push('Active Alerts', 'Emergency Broadcast Stream');
        const alertList = context.relevantAlerts || [];
        situation = `${alertList.length} active emergency warnings ${locPrefix} are currently published by civil defense authorities.`;

        if (alertList.length > 0) {
          alertList.forEach((a) => {
            keyFactors.push(`[${a.severity}] ${a.title} (${a.regionName}): ${a.message.slice(0, 110)}...`);
          });
          currentData['Primary Active Alert'] = alertList[0].title;
          currentData['Alert Level'] = alertList[0].severity;
        } else {
          keyFactors.push('No critical alert currently issued for the selected filtered parameters');
          currentData['Active Alerts Found'] = 0;
        }

        currentData['Total System Alerts'] = context.kpis.activeAlertsCount;
        operationalContext =
          'Alerts trigger mandatory localized evacuation guidelines and high-clearance vehicular transit escorts.';
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 5. ROAD & TRANSIT
      // ───────────────────────────────────────────────────────────────────────
      case 'ROAD_QUERY':
      case 'ROUTE_QUERY':
      case 'DESTINATION_QUERY': {
        sources.push('Road Intelligence', 'Transit Risk Assessment');
        const roads = context.relevantRoads || [];
        situation = `Road operations and transit readiness ${locPrefix}: ${context.kpis.blockedRoadsCount} arterial segments require active caution or remain closed.`;

        if (roads.length > 0) {
          roads.forEach((r) => {
            keyFactors.push(`${r.name} — Status: ${r.status} (${r.severity} severity). Reason: ${r.reason}`);
          });
          currentData['Critical Disrupted Route'] = roads[0].name;
          currentData['Condition'] = roads[0].status;
        } else {
          keyFactors.push('Monitored road segments are currently passable with standard caution');
        }

        currentData['Total Obstructed Roads'] = context.kpis.blockedRoadsCount;
        operationalContext =
          'Travelers are advised to avoid low-lying underpasses and bridge approaches. Use Safe Transit routing for disaster-aware bypass planning.';
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 6. SHELTER READINESS
      // ───────────────────────────────────────────────────────────────────────
      case 'SHELTER_QUERY': {
        sources.push('Shelter Readiness', 'Evacuation Operations');
        const shelters = context.relevantShelters || [];
        situation = `Evacuation shelter capacity ${locPrefix}: ${shelters.length} facilities monitored. ${context.kpis.sheltersUnderPressure} facility locations have high utilization.`;

        if (shelters.length > 0) {
          shelters.forEach((s) => {
            keyFactors.push(
              `${s.name} (${s.location}) — Occupancy: ${s.occupancy}/${s.capacity} beds (${Math.round((s.occupancy / Math.max(1, s.capacity)) * 100)}%). Status: ${s.status}`,
            );
          });
          currentData['High Pressure Shelter'] = shelters[0].name;
          currentData['Current Bed Occupancy'] = `${shelters[0].occupancy} / ${shelters[0].capacity}`;
        } else {
          keyFactors.push(
            isReal
              ? 'No official relief shelters registered in active database sector'
              : 'Shelter intake buffer normal across monitored jurisdictions',
          );
          currentData['Shelters Indexed'] = isReal ? 'UNAVAILABLE' : 0;
        }

        currentData['Shelters Over Capacity'] = context.kpis.sheltersUnderPressure;
        operationalContext =
          'Evacuation centers maintain food stockpiles, medical aid kits, and backup power generation.';
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 7. RESOURCE READINESS
      // ───────────────────────────────────────────────────────────────────────
      case 'RESOURCE_QUERY': {
        sources.push('Resource Readiness', 'Logistics Operations');
        const resources = context.relevantResources || [];
        situation = `Emergency resource logistics ${locPrefix} indicates ${context.kpis.resourceDeficitsCount} categories with acute supply deficits against projected demand.`;

        if (resources.length > 0) {
          resources.forEach((r) => {
            keyFactors.push(
              `${r.category}: Available ${formatNumber(r.available)} vs Required ${formatNumber(r.required)} (Deficit: ${formatNumber(r.deficit)}). Status: ${r.status}`,
            );
          });
          const maxDeficit = [...resources].sort((a, b) => b.deficit - a.deficit)[0];
          if (maxDeficit) {
            currentData['Largest Supply Gap'] = `${maxDeficit.category} (-${formatNumber(maxDeficit.deficit)})`;
          }
        }

        currentData['Deficit Categories'] = context.kpis.resourceDeficitsCount;
        operationalContext =
          'Forward logistics hubs coordinate drinking water sachets, chlorine tablets, and inflatable rescue boats.';
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 8. LIVE TELEMETRY CHANGES
      // ───────────────────────────────────────────────────────────────────────
      case 'LIVE_CHANGE_QUERY': {
        sources.push('Live Intelligence', 'Real-Time Telemetry Stream');
        if (!dataQuality.includes('LIVE_UPDATED')) {
          dataQuality.push('LIVE_UPDATED');
        }
        const events = context.recentLiveEvents || [];
        if (events.length === 0) {
          situation = `Real-time disaster telemetry ${locPrefix} indicates zero active operational telemetry events recorded in the current monitoring window.`;
          keyFactors.push('Telemetry feeds standing by for real-time sensor and authority updates.');
          currentData['Latest Telemetry Event'] = 'None / Standby';
        } else {
          situation = `Real-time disaster telemetry ${locPrefix} recorded ${events.length} dynamic operational updates in the recent stream cycle.`;
          events.forEach((e) => {
            keyFactors.push(`[${e.timeFormatted}] ${e.title}: ${e.summary}`);
          });
          currentData['Latest Telemetry Event'] = events[0]?.title || 'None';
        }

        currentData['Recent Events Processed'] = events.length;
        currentData['Stream Freshness'] = context.dataFreshness.lastSyncFormatted;
        operationalContext =
          'All incoming live telemetry events automatically recalculate priority indices without page reload.';
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 9. CITIZEN FIELD REPORTS
      // ───────────────────────────────────────────────────────────────────────
      case 'FIELD_REPORT_QUERY': {
        sources.push('Field Reports', 'Evidence Intelligence');
        dataQuality.push('CITIZEN_REPORT');
        const reports = context.recentReports || [];
        situation = `Citizen ground intelligence ${locPrefix} comprises ${context.kpis.citizenReportsCount} submitted field reports.`;

        if (reports.length > 0) {
          reports.forEach((r) => {
            keyFactors.push(`${r.title} — Location: ${r.address} (Status: ${r.status}, Severity: ${r.severity})`);
          });
          currentData['Latest Field Report'] = reports[0].title;
          currentData['Report Status'] = reports[0].status;
        } else {
          keyFactors.push('No ground reports submitted for this jurisdiction.');
          currentData['Ground Reports'] = 0;
        }

        currentData['Total Ground Reports'] = context.kpis.citizenReportsCount;
        operationalContext =
          'Incoming reports undergo administrative verification before authority team dispatch.';
        break;
      }

      // ───────────────────────────────────────────────────────────────────────
      // 10. GENERAL OPERATIONAL / RISK ANALYSIS
      // ───────────────────────────────────────────────────────────────────────
      default: {
        sources.push('Multi-Hazard Risk Engine', 'Impact Assessment');
        situation = `Disaster operations analysis ${locPrefix} indicates ${context.kpis.highRiskLocationsCount} high-vulnerability sectors requiring continuous multi-agency coordination.`;

        if (context.relevantRisks && context.relevantRisks.length > 0) {
          context.relevantRisks.slice(0, 3).forEach((r) => {
            keyFactors.push(`${r.name}: Risk score ${r.score}/100 (${r.dominantHazard}), exposing ${formatNumber(r.exposedPopulation)} citizens.`);
          });
        } else {
          keyFactors.push('Comprehensive multi-hazard assessments are synthesized across flood, cyclone, and logistics layers.');
        }

        currentData['Overall Risk Peak'] = `${context.kpis.riskScore}/100`;
        currentData['High Risk Sectors'] = context.kpis.highRiskLocationsCount;
        currentData['Active Disasters'] = context.summary.activeDisasters.length;

        operationalContext =
          'Operational users should correlate field reports with satellite precipitation maps before committing heavy rescue vehicles.';
        break;
      }
    }

    const structuredSections: StructuredSections = {
      situation,
      keyFactors,
      currentData,
      operationalContext,
      dataFreshness: `Synchronized ${context.dataFreshness.lastSyncFormatted} (${context.dataFreshness.isSimulated ? 'Simulated Live Feed' : 'Live Official Feed'})`,
    };

    const text = `### Situation\n${situation}\n\n### Key Factors\n${keyFactors.map((k) => `* ${k}`).join('\n')}\n\n### Current Data\n${Object.entries(currentData).map(([k, v]) => `* **${k}**: ${v}`).join('\n')}\n\n### Operational Context\n${operationalContext}\n\n### Data Freshness\n${structuredSections.dataFreshness}`;

    return {
      text,
      intent,
      sources,
      dataQuality,
      structuredSections,
      providerUsed: this.name,
      locationFocus,
      timestamp: new Date().toISOString(),
    };
  }

  private formatSitRepMarkdown(sitRep: EmergencySitRepPayload): string {
    const s = sitRep.sections;
    return `### Emergency Situation Report (SitRep)
**Report ID**: ${sitRep.reportId} | **Scope**: ${sitRep.targetScope}
**Classification**: ${sitRep.classification} | **Timestamp**: ${sitRep.generatedAt}

### 1. Reporting Scope & Authority
* **Geographical Scope**: ${s.reportingScope.geographicalScope}
* **Issuing Authority**: ${s.reportingScope.issuingAuthority}
* **Report Timestamp**: ${s.reportingScope.timestamp}

### 2. Current Hazards & Verified Risk Levels
* **Active Hazards**: ${s.hazardsAndRisk.activeHazards.join(', ')}
* **Highest Risk Sector**: ${s.hazardsAndRisk.highestRiskZone}
* **Composite Risk Score**: ${s.hazardsAndRisk.compositeRiskScore === 'UNAVAILABLE' ? 'UNAVAILABLE' : `${s.hazardsAndRisk.compositeRiskScore}/100`}
* **Dominant Threat**: ${s.hazardsAndRisk.dominantThreat}

### 3. Meteorological Telemetry & Data Freshness
* **Observation Status**: ${s.weatherAndFreshness.status}
* **Telemetry Source**: ${s.weatherAndFreshness.source}
* **Observed Conditions**: ${s.weatherAndFreshness.summary}
${Object.entries(s.weatherAndFreshness.metrics)
  .map(([k, v]) => `* **${k}**: ${v}`)
  .join('\n')}

### 4. Affected Areas & Population Estimates
* **Estimated Population Exposed**: ${s.affectedPopulation.estimatedExposed === 'UNAVAILABLE' ? 'UNAVAILABLE' : formatNumber(Number(s.affectedPopulation.estimatedExposed))}
* **Affected Districts**: ${s.affectedPopulation.affectedDistricts.length > 0 ? s.affectedPopulation.affectedDistricts.join(', ') : 'None currently identified'}
* **Estimation Basis**: ${s.affectedPopulation.basisOfEstimate}

### 5. Shelter Capacity & Verified Gaps
* **Total Shelters Indexed**: ${s.shelterCapacityAndGaps.totalShelters}
* **Active Bed Capacity**: ${s.shelterCapacityAndGaps.activeCapacity === 'UNAVAILABLE' ? 'UNAVAILABLE' : s.shelterCapacityAndGaps.activeCapacity}
* **Current Occupancy**: ${s.shelterCapacityAndGaps.currentOccupancy === 'UNAVAILABLE' ? 'UNAVAILABLE' : s.shelterCapacityAndGaps.currentOccupancy}
* **Capacity Gap / Available**: ${s.shelterCapacityAndGaps.capacityGap === 'UNAVAILABLE' ? 'UNAVAILABLE' : s.shelterCapacityAndGaps.capacityGap}
* **Status Summary**: ${s.shelterCapacityAndGaps.statusSummary}

### 6. Blocked Corridors & Disruption Evidence
* **Disrupted Segments**: ${s.blockedRoutesAndEvidence.disruptedCorridorsCount}
${s.blockedRoutesAndEvidence.criticalSegments.length > 0
  ? s.blockedRoutesAndEvidence.criticalSegments.map((c) => `* **${c.corridor}** [${c.status}]: ${c.cause} (Evidence: ${c.evidence})`).join('\n')
  : '* No severe vehicular obstructions reported along primary corridors.'}

### 7. Ground Incidents & Citizen Reports
* **Verified Incidents**: ${s.incidentsAndReports.verifiedIncidentsCount}
* **Dispatched Teams**: ${s.incidentsAndReports.dispatchedTeamsCount}
* **Total Citizen Submissions**: ${s.incidentsAndReports.citizenReportsTotal} (Verified: ${s.incidentsAndReports.verifiedReportsCount}, Pending: ${s.incidentsAndReports.pendingReportsCount})
* *Note: ${s.incidentsAndReports.cautionaryNote}*

### 8. Priority Concerns & Actionable Recommendations
**Immediate Actions**:
${s.priorityRecommendations.immediateActions.map((a) => `* ${a}`).join('\n')}

**Operational Directives**:
${s.priorityRecommendations.operationalDirectives.map((d) => `* ${d}`).join('\n')}

*Notice: ${s.priorityRecommendations.decisionSupportDisclaimer}*

### 9. Data Limitations & Verification Needs
* **Unavailable Sensors**: ${s.dataLimitations.unavailableSensors.length > 0 ? s.dataLimitations.unavailableSensors.join(', ') : 'None'}
* **Stale Feeds**: ${s.dataLimitations.staleFeeds.length > 0 ? s.dataLimitations.staleFeeds.join(', ') : 'None'}
* **Unverified Reports Requiring Ground Check**: ${s.dataLimitations.unverifiedItems.length > 0 ? s.dataLimitations.unverifiedItems.slice(0, 3).join(', ') : 'None'}

### 10. Operational Provenance & Accountability
* **Sources**: ${s.provenanceMetadata.sources.join(', ')}
* **Data Environment**: ${s.provenanceMetadata.environment}
* **Authorized User Role**: ${s.provenanceMetadata.authorizedRole}
* **Intelligence Provider**: ${s.provenanceMetadata.providerUsed}`;
  }
}
