import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import {
  AnalyticsOverview,
  AnalyticsFunnel,
  TimeseriesPoint,
  AnalyticsTraffic,
} from '../types';
import {
  Users,
  Eye,
  UserCheck,
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Activity,
  AlertCircle,
  RefreshCw,
  Compass,
} from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [funnel, setFunnel] = useState<AnalyticsFunnel | null>(null);
  const [traffic, setTraffic] = useState<AnalyticsTraffic | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'page_views' | 'signups' | 'active_users' | 'visitors'>('page_views');
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);

  // Check role authorization
  const isAdmin = user?.role === 'admin';

  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [ovRes, fnRes, trRes, tsRes] = await Promise.all([
        api.getAdminAnalyticsOverview(days),
        api.getAdminAnalyticsFunnel(days),
        api.getAdminAnalyticsTraffic(days),
        api.getAdminAnalyticsTimeseries(days),
      ]);
      setOverview(ovRes);
      setFunnel(fnRes);
      setTraffic(trRes);
      setTimeseries(tsRes.points || []);
    } catch (err: any) {
      console.error('Failed to load admin analytics:', err);
      setError(err?.message || 'Failed to retrieve analytics telemetry');
    } finally {
      setLoading(false);
    }
  }, [days, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold font-serif text-foreground mb-2">
          Administrator Access Required
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          This protected analytics dashboard is restricted to authorized Dandiya +1 product administrators.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl btn-festive-primary text-white text-sm font-semibold cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const getMetricVal = (p: TimeseriesPoint) => {
    switch (selectedMetric) {
      case 'signups':
        return p.signups;
      case 'active_users':
        return p.activeUsers;
      case 'visitors':
        return p.visitors;
      default:
        return p.pageViews;
    }
  };

  // Calculate max value for timeseries chart
  const maxVal = Math.max(...timeseries.map(getMetricVal), 5);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 space-y-10">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-2 border border-primary/20">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Verified Admin Telemetry
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground">
            Product Analytics & Funnel
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-hand text-base">
            Real-time real-user conversion, engagement, and matchmaking performance. (Zero demo data included).
          </p>
        </div>

        {/* Controls: Range selector & refresh */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-xl bg-card border border-border p-1 text-xs font-medium">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  days === d
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-3">
            <span>Unique Visitors</span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {overview?.totalUniqueVisitors ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Distinct client sessions in last {days}d
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-3">
            <span>Total Page Views</span>
            <Eye className="w-4 h-4 text-[#D81B60]" />
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {overview?.totalPageViews ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Navigations across all routes
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-3">
            <span>Registered Users</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {overview?.registeredUsers ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {overview?.completedProfiles ?? 0} completed profiles
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-3">
            <span>Real Matches</span>
            <HeartHandshake className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {overview?.realMatchesCreated ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {overview?.realConversations ?? 0} active private chats
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-3">
            <span>Daily Active Users (DAU)</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {overview?.dailyActiveUsers ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active in current 24-hr window
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-3">
            <span>Weekly Active Users (WAU)</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {overview?.weeklyActiveUsers ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active in rolling 7-day period
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-3">
            <span>Returning Visitors</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {overview?.returningVisitors ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Sessions with prior visit history
            </p>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-card border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium mb-3">
            <span>Active Conversations</span>
            <MessageSquare className="w-4 h-4 text-teal-500" />
          </div>
          <div>
            <div className="text-3xl font-bold text-foreground tracking-tight">
              {overview?.realConversations ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              End-to-end encrypted chats
            </p>
          </div>
        </div>
      </div>

      {/* Conversion Funnel Section */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold font-display text-foreground">
              End-to-End Matchmaking Funnel
            </h2>
            <p className="text-xs text-muted-foreground">
              Conversion flow from initial visitor landing to encrypted message exchange.
            </p>
          </div>
          {funnel?.steps && funnel.steps.length > 0 && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              Top Step: {funnel.steps[0].count} Visitors → {funnel.steps[funnel.steps.length - 1].count} Converted ({funnel.steps[funnel.steps.length - 1].conversionRate.toFixed(1)}%)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {(funnel?.steps || []).map((step, idx) => (
            <div
              key={step.name}
              className="p-4 rounded-2xl bg-background border border-border flex flex-col justify-between relative group hover:border-primary/50 transition-colors"
            >
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {idx + 1}. {step.name}
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {step.count}
                </div>
                <div className="text-[11px] text-primary font-medium mt-1">
                  {step.conversionRate.toFixed(1)}% rate
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timeseries Graph & Metric Switcher */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold font-serif text-foreground">
              Trend Activity ({days} Days)
            </h2>
            <p className="text-xs text-muted-foreground">
              Daily aggregates partitioned by event signature.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-background border border-border p-1 text-xs">
            {[
              { id: 'page_views', label: 'Page Views' },
              { id: 'signups', label: 'Signups' },
              { id: 'active_users', label: 'Active Users' },
              { id: 'visitors', label: 'Visitors' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMetric(m.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  selectedMetric === m.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="h-64 flex items-end gap-1 sm:gap-2 pt-8 pb-4 border-b border-border overflow-x-auto">
          {timeseries.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              No events recorded for this metric in the selected period.
            </div>
          ) : (
            timeseries.map((pt, i) => {
              const val = getMetricVal(pt);
              const heightPct = Math.max(8, Math.round((val / maxVal) * 100));
              return (
                <div
                  key={i}
                  className="flex-1 min-w-[18px] sm:min-w-[24px] flex flex-col items-center gap-1.5 group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-9 bg-popover text-popover-foreground text-[10px] px-2 py-0.5 rounded shadow-md border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                    {pt.date}: <strong>{val}</strong>
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full rounded-t-md bg-gradient-to-t from-primary/70 to-primary group-hover:from-primary group-hover:to-[#D81B60] transition-all"
                  />
                  <span className="text-[9px] text-muted-foreground rotate-45 sm:rotate-0 mt-1 truncate max-w-full">
                    {pt.date.slice(5)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Traffic Sources & Top Routes Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Routes */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-serif text-foreground">
              Most Visited Routes
            </h3>
            <Compass className="w-4 h-4 text-primary" />
          </div>

          <div className="space-y-2">
            {!traffic?.topRoutes || traffic.topRoutes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No route telemetry logged yet.
              </p>
            ) : (
              traffic.topRoutes.map((r) => (
                <div
                  key={r.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border text-xs"
                >
                  <span className="font-mono text-foreground font-medium">{r.key}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{r.count}</span>
                    <span className="text-muted-foreground">views</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Traffic Acquisition Sources */}
        <div className="p-6 rounded-3xl bg-card border border-border shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold font-serif text-foreground">
              Acquisition Sources
            </h3>
            <Users className="w-4 h-4 text-[#D81B60]" />
          </div>

          <div className="space-y-2">
            {!traffic?.utmSources || traffic.utmSources.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                Direct / Organic visits logged.
              </p>
            ) : (
              traffic.utmSources.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-background border border-border text-xs"
                >
                  <span className="text-foreground capitalize font-medium">{s.key}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{s.count}</span>
                    <span className="text-muted-foreground">visits</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Privacy & Zero-Knowledge Architecture Assurance */}
      <div className="p-5 rounded-2xl bg-background border border-border text-xs text-muted-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>
            <strong>Zero-Knowledge Compliance:</strong> Telemetry records route navigations and conversion funnel events exclusively. No chat text, private cryptographic keys, or personal identity details are collected or retained.
          </span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
          UTC Timestamped • Dandiya +1 V1
        </span>
      </div>
    </div>
  );
};
