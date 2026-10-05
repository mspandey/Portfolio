import React, { useState, useEffect, useCallback } from 'react';
import { fetchAdminAnalyticsOverview } from '../../../api/client';

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetchAdminAnalyticsOverview(period);
      if (res && res.data) {
        setAnalyticsData(res.data);
      } else {
        setAnalyticsData(null);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err.message || 'Failed to load analytics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = analyticsData?.summary || {};
  const recruiter = analyticsData?.recruiter_signals || {};
  const chart = analyticsData?.chart || [];
  const sources = analyticsData?.traffic_sources || [];
  const devices = analyticsData?.device_breakdown || { desktop: { count: 0, percent: 0 }, mobile: { count: 0, percent: 0 }, tablet: { count: 0, percent: 0 } };
  const countries = analyticsData?.countries || [];
  const projects = analyticsData?.top_projects || [];

  // Calculate SVG chart dimensions & coordinates
  const chartHeight = 180;
  const chartWidth = 720;
  const paddingX = 40;
  const paddingY = 30;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;

  const maxVal = Math.max(
    5,
    ...chart.map((c) => Math.max(c.visitors || 0, c.views || 0))
  );

  const points = chart.map((c, i) => {
    const x = chart.length > 1
      ? paddingX + (i / (chart.length - 1)) * plotWidth
      : paddingX + plotWidth / 2;
    const yVisitors = chartHeight - paddingY - ((c.visitors || 0) / maxVal) * plotHeight;
    const yViews = chartHeight - paddingY - ((c.views || 0) / maxVal) * plotHeight;
    return { ...c, x, yVisitors, yViews };
  });

  const visitorPath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yVisitors.toFixed(1)}`).join(' ')
    : '';

  const viewsPath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.yViews.toFixed(1)}`).join(' ')
    : '';

  const visitorArea = points.length > 0
    ? `${visitorPath} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight - paddingY} L ${points[0].x.toFixed(1)} ${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="admin-panel admin-analytics-panel">
      {/* Panel Header */}
      <div className="admin-panel-header admin-analytics-header">
        <div>
          <h2 className="admin-panel-title">Portfolio Analytics</h2>
          <p className="admin-panel-subtitle">Real visitor engagement, traffic sources, and intent signals</p>
        </div>

        <div className="admin-analytics-controls">
          {/* Date Filter Tabs */}
          <div className="admin-period-selector" role="group" aria-label="Date range">
            {[
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7 Days' },
              { id: '30d', label: '30 Days' },
              { id: '90d', label: '90 Days' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-period-btn ${period === tab.id ? 'is-active' : ''}`}
                onClick={() => setPeriod(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm admin-refresh-btn"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            title="Refresh analytics data"
          >
            <span className={`refresh-icon ${refreshing ? 'is-spinning' : ''}`} aria-hidden="true">↻</span>
            <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Admin Exclusion Notice */}
      <div className="admin-analytics-notice">
        <span className="notice-badge" aria-hidden="true">🛡️</span>
        <span className="notice-text">
          <strong>Admin Sessions Excluded:</strong> Your visits and interactions from this browser and admin session are strictly excluded from all public metrics.
        </span>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading && !refreshing ? (
        <div className="admin-loading">Loading real analytics data…</div>
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 1. TOP METRICS GRID (10 CARDS)                                 */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="analytics-metrics-grid">
            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">Unique Visitors</span>
                <span className="metric-icon" aria-hidden="true">👥</span>
              </div>
              <div className="metric-value">{summary.unique_visitors ?? 0}</div>
              <div className="metric-subtext">Distinct people in this period</div>
            </div>

            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">Total Portfolio Views</span>
                <span className="metric-icon" aria-hidden="true">👁</span>
              </div>
              <div className="metric-value">{summary.total_views ?? 0}</div>
              <div className="metric-subtext">Total page impressions</div>
            </div>

            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">Visitors Today</span>
                <span className="metric-icon" aria-hidden="true">⚡</span>
              </div>
              <div className="metric-value">{summary.visitors_today ?? 0}</div>
              <div className="metric-subtext">Active visitors today</div>
            </div>

            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">Visitors This Week</span>
                <span className="metric-icon" aria-hidden="true">📅</span>
              </div>
              <div className="metric-value">{summary.visitors_this_week ?? 0}</div>
              <div className="metric-subtext">Active last 7 days</div>
            </div>

            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">Visitors This Month</span>
                <span className="metric-icon" aria-hidden="true">🗓</span>
              </div>
              <div className="metric-value">{summary.visitors_this_month ?? 0}</div>
              <div className="metric-subtext">Active last 30 days</div>
            </div>

            <div className="analytics-card metric-card metric-card--highlight">
              <div className="metric-header">
                <span className="metric-label">Resume Downloads</span>
                <span className="metric-icon" aria-hidden="true">📄</span>
              </div>
              <div className="metric-value">{summary.resume_downloads ?? 0}</div>
              <div className="metric-subtext">Recruiter intent indicator</div>
            </div>

            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">LinkedIn Clicks</span>
                <span className="metric-icon" aria-hidden="true">🔗</span>
              </div>
              <div className="metric-value">{summary.linkedin_clicks ?? 0}</div>
              <div className="metric-subtext">Profile click-throughs</div>
            </div>

            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">GitHub Clicks</span>
                <span className="metric-icon" aria-hidden="true">⌥</span>
              </div>
              <div className="metric-value">{summary.github_clicks ?? 0}</div>
              <div className="metric-subtext">Repository investigations</div>
            </div>

            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">Contact Submissions</span>
                <span className="metric-icon" aria-hidden="true">✉</span>
              </div>
              <div className="metric-value">{summary.contact_submissions ?? 0}</div>
              <div className="metric-subtext">Direct form messages sent</div>
            </div>

            <div className="analytics-card metric-card">
              <div className="metric-header">
                <span className="metric-label">Project Views</span>
                <span className="metric-icon" aria-hidden="true">⬢</span>
              </div>
              <div className="metric-value">{summary.project_views ?? 0}</div>
              <div className="metric-subtext">Total project interactions</div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 2. VISITOR GRAPH                                              */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="analytics-card chart-container-card">
            <div className="chart-header">
              <div>
                <h3 className="chart-title">Visitors Over Time</h3>
                <span className="chart-subtitle">Real daily unique visitors and total page impressions</span>
              </div>
              <div className="chart-legend">
                <span className="legend-item">
                  <span className="legend-dot legend-dot--visitors" /> Unique Visitors
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot--views" /> Page Views
                </span>
              </div>
            </div>

            <div className="chart-svg-wrap">
              {chart.length === 0 ? (
                <div className="chart-empty">No visitor activity in this period yet.</div>
              ) : (
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="analytics-svg"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="visitorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent, #e5a98a)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--accent, #e5a98a)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {[0, 0.5, 1].map((ratio) => {
                    const y = chartHeight - paddingY - ratio * plotHeight;
                    const val = Math.round(ratio * maxVal);
                    return (
                      <g key={ratio}>
                        <line
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="rgba(255, 255, 255, 0.07)"
                          strokeDasharray="4 4"
                        />
                        <text
                          x={paddingX - 8}
                          y={y + 4}
                          fill="rgba(255, 255, 255, 0.35)"
                          fontSize="10"
                          textAnchor="end"
                          fontFamily="monospace"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Shaded Area for Visitors */}
                  {visitorArea && (
                    <path d={visitorArea} fill="url(#visitorGradient)" />
                  )}

                  {/* Page Views Line (subtle) */}
                  {viewsPath && (
                    <path
                      d={viewsPath}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Visitors Line (accent) */}
                  {visitorPath && (
                    <path
                      d={visitorPath}
                      fill="none"
                      stroke="var(--accent, #e5a98a)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Data Points */}
                  {points.map((p, i) => (
                    <g key={i} className="chart-point-group">
                      <circle
                        cx={p.x}
                        cy={p.yVisitors}
                        r="4"
                        fill="var(--accent, #e5a98a)"
                        stroke="#181513"
                        strokeWidth="2"
                      />
                      <title>{`${p.label} (${p.date}): ${p.visitors} visitors, ${p.views} views`}</title>
                    </g>
                  ))}

                  {/* X-Axis labels */}
                  {points.map((p, i) => {
                    // Show a subset of labels to prevent crowding
                    const step = points.length > 14 ? Math.ceil(points.length / 7) : 1;
                    if (i % step !== 0 && i !== points.length - 1) return null;
                    return (
                      <text
                        key={i}
                        x={p.x}
                        y={chartHeight - 8}
                        fill="rgba(255, 255, 255, 0.45)"
                        fontSize="10"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {p.label}
                      </text>
                    );
                  })}
                </svg>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 3. RECRUITER / ENGAGEMENT SIGNALS                             */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="analytics-card recruiter-signals-card">
            <div className="signals-header">
              <div>
                <h3 className="signals-title">Recruiter / Engagement Signals</h3>
                <p className="signals-subtitle">
                  High-intent indicators: visitors taking tangible actions demonstrating professional interest
                </p>
              </div>
              <span className="signals-badge">PROSPECT SIGNALS</span>
            </div>

            <div className="signals-grid">
              <div className="signal-item">
                <span className="signal-icon">📄</span>
                <div className="signal-info">
                  <div className="signal-value">{recruiter.resume_downloads ?? 0}</div>
                  <div className="signal-name">Resume Downloads</div>
                </div>
              </div>

              <div className="signal-item">
                <span className="signal-icon">🔗</span>
                <div className="signal-info">
                  <div className="signal-value">{recruiter.linkedin_clicks ?? 0}</div>
                  <div className="signal-name">LinkedIn Clicks</div>
                </div>
              </div>

              <div className="signal-item">
                <span className="signal-icon">⌥</span>
                <div className="signal-info">
                  <div className="signal-value">{recruiter.github_clicks ?? 0}</div>
                  <div className="signal-name">GitHub Clicks</div>
                </div>
              </div>

              <div className="signal-item">
                <span className="signal-icon">⬢</span>
                <div className="signal-info">
                  <div className="signal-value">{recruiter.project_interactions ?? 0}</div>
                  <div className="signal-name">Project Interactions</div>
                </div>
              </div>

              <div className="signal-item">
                <span className="signal-icon">✉</span>
                <div className="signal-info">
                  <div className="signal-value">{recruiter.contact_submissions ?? 0}</div>
                  <div className="signal-name">Contact Submissions</div>
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 4. BREAKDOWNS (PROJECTS, TRAFFIC, DEVICES, COUNTRIES)          */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div className="analytics-breakdowns-grid">
            {/* Top Projects */}
            <div className="analytics-card breakdown-card">
              <div className="breakdown-header">
                <h4 className="breakdown-title">Most Viewed Projects</h4>
                <span className="breakdown-tag">Triggered on open</span>
              </div>
              {projects.length === 0 ? (
                <div className="breakdown-empty">No project views recorded yet</div>
              ) : (
                <ul className="ranked-list">
                  {projects.map((p, idx) => (
                    <li key={p.title || idx} className="ranked-item">
                      <span className="rank-num">#{idx + 1}</span>
                      <span className="rank-title" title={p.title}>{p.title}</span>
                      <span className="rank-metric">{p.views} views</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Traffic Sources */}
            <div className="analytics-card breakdown-card">
              <div className="breakdown-header">
                <h4 className="breakdown-title">Top Traffic Sources</h4>
                <span className="breakdown-tag">Real referrers</span>
              </div>
              {sources.length === 0 ? (
                <div className="breakdown-empty">No referrer data recorded yet</div>
              ) : (
                <ul className="ranked-list">
                  {sources.map((s, idx) => (
                    <li key={s.source} className="ranked-item">
                      <span className="rank-num">#{idx + 1}</span>
                      <span className="rank-title">{s.source}</span>
                      <span className="rank-metric">{s.count} visits</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Device Breakdown */}
            <div className="analytics-card breakdown-card">
              <div className="breakdown-header">
                <h4 className="breakdown-title">Device Breakdown</h4>
                <span className="breakdown-tag">Screen & UA</span>
              </div>
              <div className="device-list">
                <div className="device-row">
                  <div className="device-meta">
                    <span className="device-name">💻 Desktop</span>
                    <span className="device-stat">{devices.desktop.percent}% ({devices.desktop.count})</span>
                  </div>
                  <div className="device-bar-track">
                    <div
                      className="device-bar-fill"
                      style={{ width: `${devices.desktop.percent}%` }}
                    />
                  </div>
                </div>

                <div className="device-row">
                  <div className="device-meta">
                    <span className="device-name">📱 Mobile</span>
                    <span className="device-stat">{devices.mobile.percent}% ({devices.mobile.count})</span>
                  </div>
                  <div className="device-bar-track">
                    <div
                      className="device-bar-fill"
                      style={{ width: `${devices.mobile.percent}%` }}
                    />
                  </div>
                </div>

                <div className="device-row">
                  <div className="device-meta">
                    <span className="device-name">📟 Tablet</span>
                    <span className="device-stat">{devices.tablet.percent}% ({devices.tablet.count})</span>
                  </div>
                  <div className="device-bar-track">
                    <div
                      className="device-bar-fill"
                      style={{ width: `${devices.tablet.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Country Breakdown */}
            <div className="analytics-card breakdown-card">
              <div className="breakdown-header">
                <h4 className="breakdown-title">Location (Country-Level)</h4>
                <span className="breakdown-tag">Privacy conscious</span>
              </div>
              {countries.length === 0 ? (
                <div className="breakdown-empty">No country data captured yet</div>
              ) : (
                <ul className="ranked-list">
                  {countries.map((c, idx) => (
                    <li key={c.country} className="ranked-item">
                      <span className="rank-num">#{idx + 1}</span>
                      <span className="rank-title">{c.country}</span>
                      <span className="rank-metric">{c.count} visitors</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
