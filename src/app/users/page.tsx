'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/ui/Layout';
import { UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';
import { customAuthAPI } from '@/lib/customAuthApi';
import { User } from '@/types';
import { formatDate } from '@/lib/utils';
import { getRoleDisplayName, getRoleBadgeColor } from '@/types/roles';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await customAuthAPI.getAllUsers();
      if (response?.data && Array.isArray(response.data)) {
        setUsers(response.data);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to fetch users';
      const statusCode = err?.statusCode || err?.response?.status;
      setError(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        </div>

        {users.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id} className="hover:bg-gray-50">
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {(user.firstname?.[0] || user.username?.[0] || 'U').toUpperCase()}
                            {(user.lastname?.[0] || '').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstname && user.lastname 
                              ? `${user.firstname} ${user.lastname}`
                              : user.firstname || user.lastname || user.username || 'Unknown User'}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                            {getRoleDisplayName(user.role)}
                          </span>
                          {user.blocked && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Blocked
                            </span>
                          )}
                          {!user.confirmed && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Unconfirmed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400">@{user.username}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Created {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) }
      </div>
    </Layout>
  );
}

