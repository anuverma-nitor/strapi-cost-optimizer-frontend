'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Layout from '@/components/ui/Layout';
import {
  DocumentTextIcon,
  UserGroupIcon,
  CogIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { dashboardAPI, DashboardStats, RecentActivity } from '@/lib/dashboardApi';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setStatsLoading(true);
      setActivityLoading(true);

      // Fetch stats independently
      dashboardAPI.getStats()
        .then((statsData) => {
          setStats(statsData);
          setStatsError(null);
        })
        .catch((err: unknown) => {
          console.error('Failed to fetch stats:', err);
          const errorMessage = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
          setStatsError(errorMessage || 'Failed to load statistics');
          setStats(null);
        })
        .finally(() => {
          setStatsLoading(false);
        });

      // Fetch recent activity independently
      dashboardAPI.getRecentActivity(10)
        .then((activityData) => {
          console.log('####activityData', activityData);
          setRecentActivity(activityData);
          setActivityError(null);
        })
        .catch((err: unknown) => {
          console.error('Failed to fetch recent activity:', err);
          const errorMessage = err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
          setActivityError(errorMessage || 'Failed to load recent activity');
          setRecentActivity([]);
        })
        .finally(() => {
          setActivityLoading(false);
        });
    };

    fetchDashboardData();
  }, []);

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Stats configuration with real data and colors
  const statsConfig = stats ? [
    {
      name: 'Total Content Types',
      value: formatNumber(stats.contentTypes.value),
      icon: DocumentTextIcon,
      change: stats.contentTypes.change,
      changeType: stats.contentTypes.changeType,
      error: null,
      gradient: 'from-blue-500 to-cyan-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      name: 'Total Entries',
      value: formatNumber(stats.entries.value),
      icon: ChartBarIcon,
      change: stats.entries.change,
      changeType: stats.entries.changeType,
      error: null,
      gradient: 'from-purple-500 to-pink-500',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      name: 'Users',
      value: formatNumber(stats.users.value),
      icon: UserGroupIcon,
      change: stats.users.change,
      changeType: stats.users.changeType,
      error: null,
      gradient: 'from-green-500 to-emerald-500',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      name: 'Plugins',
      value: '8',
      icon: CogIcon,
      change: '0',
      changeType: 'neutral' as const,
      error: null,
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ] : statsError ? [
    {
      name: 'Total Content Types',
      value: 'N/A',
      icon: DocumentTextIcon,
      change: 'N/A',
      changeType: 'neutral' as const,
      error: statsError,
      gradient: 'from-gray-400 to-gray-500',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
    {
      name: 'Total Entries',
      value: 'N/A',
      icon: ChartBarIcon,
      change: 'N/A',
      changeType: 'neutral' as const,
      error: statsError,
      gradient: 'from-gray-400 to-gray-500',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
    {
      name: 'Users',
      value: 'N/A',
      icon: UserGroupIcon,
      change: 'N/A',
      changeType: 'neutral' as const,
      error: statsError,
      gradient: 'from-gray-400 to-gray-500',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
    },
    {
      name: 'Plugins',
      value: '8',
      icon: CogIcon,
      change: '0',
      changeType: 'neutral' as const,
      error: null,
      gradient: 'from-orange-500 to-red-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
  ] : [];


  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            {/* <p className="mt-1 text-sm text-gray-500">
              Welcome to your admin panel. Here&apos;s what&apos;s happening with your content.
            </p> */}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            // Show loading skeletons
            [
              'bg-gradient-to-br from-blue-50 to-cyan-50',
              'bg-gradient-to-br from-purple-50 to-pink-50',
              'bg-gradient-to-br from-green-50 to-emerald-50',
              'bg-gradient-to-br from-orange-50 to-red-50'
            ].map((gradient, i) => (
              <div key={i} className={`overflow-hidden shadow-sm rounded-xl border border-gray-200 animate-pulse ${gradient}`}>
                <div className="h-1 bg-gray-200"></div>
                <div className="p-6 h-32"></div>
              </div>
            ))
          ) : statsConfig.length > 0 ? (
            statsConfig.map((stat) => {
              const gradientClass = stat.error
                ? 'bg-white'
                : stat.name === 'Total Content Types'
                  ? 'bg-gradient-to-br from-blue-50 to-cyan-50'
                  : stat.name === 'Total Entries'
                    ? 'bg-gradient-to-br from-purple-50 to-pink-50'
                    : stat.name === 'Users'
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50'
                      : 'bg-gradient-to-br from-orange-50 to-red-50';

              return (
                <div key={stat.name} className={`overflow-hidden shadow-sm rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 ${gradientClass}`}>
                  {!stat.error && (
                    <div className={`h-1 bg-gradient-to-r ${stat.gradient}`}></div>
                  )}
                  <div className="p-6">
                    {stat.error ? (
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`h-12 w-12 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                            <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="text-sm font-medium text-gray-500 truncate">
                            {stat.name}
                          </p>
                          <p className="mt-1 text-sm text-red-600">
                            {stat.error}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className={`h-14 w-14 rounded-xl ${stat.iconBg} flex items-center justify-center shadow-md`}>
                            <stat.icon className={`h-7 w-7 ${stat.iconColor}`} />
                          </div>
                          {stat.changeType !== 'neutral' && (
                            <div className={`flex items-center px-2 py-1 rounded-full text-xs font-semibold ${stat.changeType === 'positive'
                              ? 'bg-green-100 text-green-700'
                              : stat.changeType === 'negative'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                              }`}>
                              {stat.changeType === 'positive' ? (
                                <ArrowUpIcon className="h-3 w-3 mr-1" />
                              ) : stat.changeType === 'negative' ? (
                                <ArrowDownIcon className="h-3 w-3 mr-1" />
                              ) : null}
                              {stat.change}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600 mb-1">
                            {stat.name}
                          </p>
                          <p className="text-3xl font-bold text-gray-900">
                            {stat.value}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // Show error state for all cards
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200">
                <div className="p-6">
                  <div className="text-sm text-red-600">
                    {statsError || 'Failed to load'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center mr-3">
                  <ClockIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Recent Activity
                </h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flow-root">
                {activityLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : activityError ? (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {activityError}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">No recent activity</p>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {recentActivity.map((activity, activityIdx) => (
                      <li key={activity.id} className="relative">
                        {activityIdx !== recentActivity.length - 1 && (
                          <span
                            className="absolute left-6 top-14 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 to-purple-200"
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative flex items-start space-x-4 hover:bg-white hover:bg-opacity-50 rounded-lg p-2 -mx-2 transition-colors">
                          <div className="flex-shrink-0">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-md ${activity.type === 'content'
                              ? 'bg-gradient-to-br from-indigo-100 to-purple-100'
                              : 'bg-gradient-to-br from-green-100 to-emerald-100'
                              }`}>
                              {activity.type === 'content' ? (
                                <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                              ) : (
                                <UserGroupIcon className="h-6 w-6 text-green-600" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-900">
                                <span className="font-semibold">{activity.action}</span>
                                {activity.contentType && (
                                  <span className="text-gray-600"> in <span className="font-medium text-indigo-600">{activity.contentType}</span></span>
                                )}
                              </p>
                              <span className="text-xs text-gray-500 whitespace-nowrap ml-4 bg-gray-100 px-2 py-1 rounded-full">
                                {activity.time}
                              </span>
                            </div>
                            <p className="mt-1.5 text-sm text-gray-600 font-medium">
                              {activity.item}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 shadow-sm rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 bg-gradient-to-r from-yellow-500 to-orange-500">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-lg bg-white bg-opacity-20 backdrop-blur-sm flex items-center justify-center mr-3">
                  <BoltIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Quick Actions
                </h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 gap-3">
                <Link
                  href="/content-manager"
                  className="group flex items-center px-4 py-4 bg-white rounded-lg text-sm font-medium text-gray-700 hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-gray-200 hover:border-indigo-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-100 to-blue-100 group-hover:from-indigo-200 group-hover:to-blue-200 flex items-center justify-center mr-4 transition-all shadow-sm">
                    <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Manage Content</div>
                    <div className="text-xs text-gray-500 mt-0.5">View and manage content types</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
                {/* <Link
                  href="/content-builder"
                  className="group flex items-center px-4 py-4 bg-white rounded-lg text-sm font-medium text-gray-700 hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-gray-200 hover:border-purple-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 group-hover:from-purple-200 group-hover:to-pink-200 flex items-center justify-center mr-4 transition-all shadow-sm">
                    <CogIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">Content Builder</div>
                    <div className="text-xs text-gray-500 mt-0.5">Create and edit content items</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link> */}
                {/* <Link
                  href="/users"
                  className="group flex items-center px-4 py-4 bg-white rounded-lg text-sm font-medium text-gray-700 hover:shadow-md hover:scale-[1.02] transition-all duration-200 border border-gray-200 hover:border-green-300"
                >
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 group-hover:from-green-200 group-hover:to-emerald-200 flex items-center justify-center mr-4 transition-all shadow-sm">
                    <UserGroupIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">Manage Users</div>
                    <div className="text-xs text-gray-500 mt-0.5">View and manage system users</div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

