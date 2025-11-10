'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/ui/Layout';
import {
  DocumentTextIcon,
  UserGroupIcon,
  CogIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { dashboardAPI, DashboardStats, RecentActivity } from '@/lib/dashboardApi';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setStatsLoading(true);
      setActivityLoading(true);

      // Fetch stats independently
      dashboardAPI.getStats()
        .then((statsData) => {
          setStats(statsData);
          setStatsError(null);
        })
        .catch((err: any) => {
          console.error('Failed to fetch stats:', err);
          setStatsError(err.response?.data?.message || 'Failed to load statistics');
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
        .catch((err: any) => {
          console.error('Failed to fetch recent activity:', err);
          setActivityError(err.response?.data?.message || 'Failed to load recent activity');
          setRecentActivity([]);
        })
        .finally(() => {
          setActivityLoading(false);
        });
    };

    fetchDashboardData();
  }, []);

  // Update overall loading state when individual loading states change
  useEffect(() => {
    if (!statsLoading && !activityLoading) {
      setLoading(false);
    }
  }, [statsLoading, activityLoading]);

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  // Stats configuration with real data
  const statsConfig = stats ? [
    {
      name: 'Total Content Types',
      value: formatNumber(stats.contentTypes.value),
      icon: DocumentTextIcon,
      change: stats.contentTypes.change,
      changeType: stats.contentTypes.changeType,
      error: null,
    },
    {
      name: 'Total Entries',
      value: formatNumber(stats.entries.value),
      icon: ChartBarIcon,
      change: stats.entries.change,
      changeType: stats.entries.changeType,
      error: null,
    },
    {
      name: 'Users',
      value: formatNumber(stats.users.value),
      icon: UserGroupIcon,
      change: stats.users.change,
      changeType: stats.users.changeType,
      error: null,
    },
    {
      name: 'Plugins',
      value: '8',
      icon: CogIcon,
      change: '0',
      changeType: 'neutral' as const,
      error: null,
    },
  ] : statsError ? [
    {
      name: 'Total Content Types',
      value: 'N/A',
      icon: DocumentTextIcon,
      change: 'N/A',
      changeType: 'neutral' as const,
      error: statsError,
    },
    {
      name: 'Total Entries',
      value: 'N/A',
      icon: ChartBarIcon,
      change: 'N/A',
      changeType: 'neutral' as const,
      error: statsError,
    },
    {
      name: 'Users',
      value: 'N/A',
      icon: UserGroupIcon,
      change: 'N/A',
      changeType: 'neutral' as const,
      error: statsError,
    },
    {
      name: 'Plugins',
      value: '8',
      icon: CogIcon,
      change: '0',
      changeType: 'neutral' as const,
      error: null,
    },
  ] : [];


  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to your Strapi admin panel. Here's what's happening with your content.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            // Show loading skeletons
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg animate-pulse">
                <div className="p-5 h-20"></div>
              </div>
            ))
          ) : statsConfig.length > 0 ? (
            statsConfig.map((stat) => (
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  {stat.error ? (
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <stat.icon className="h-6 w-6 text-red-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {stat.name}
                          </dt>
                          <dd className="mt-1">
                            <div className="text-sm text-red-600">
                              {stat.error}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <stat.icon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {stat.name}
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {stat.value}
                            </div>
                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'positive' ? 'text-green-600' :
                                stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                              }`}>
                              {stat.change}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            // Show error state for all cards
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
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
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="flow-root">
                {activityLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                  </div>
                ) : activityError ? (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                    {activityError}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent activity</p>
                ) : (
                  <ul className="-mb-8">
                    {recentActivity.map((activity, activityIdx) => (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {activityIdx !== recentActivity.length - 1 ? (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${activity.type === 'content' ? 'bg-indigo-500' : 'bg-green-500'
                                }`}>
                                {activity.type === 'content' ? (
                                  <DocumentTextIcon className="h-4 w-4 text-white" />
                                ) : (
                                  <UserGroupIcon className="h-4 w-4 text-white" />
                                )}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  {activity.action} {activity.contentType && <span className="text-gray-600">({activity.contentType})</span>} <span className="font-medium text-gray-900">{activity.item}</span>
                                </p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                {activity.time}
                              </div>
                            </div>
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
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <a
                  href="/content-manager"
                  className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                  Manage Content
                </a>
                <a
                  href="/content-builder"
                  className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <CogIcon className="h-5 w-5 inline mr-2" />
                  Content Builder
                </a>
                <a
                  href="/users"
                  className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <UserGroupIcon className="h-5 w-5 inline mr-2" />
                  Manage Users
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

