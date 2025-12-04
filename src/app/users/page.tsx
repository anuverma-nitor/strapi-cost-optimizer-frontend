'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/ui/Layout';
import { customAuthAPI } from '@/lib/customAuthApi';
import { User } from '@/types';
import { formatDate } from '@/lib/utils';
import { getRoleDisplayName, getRoleBadgeColor } from '@/types/roles';
import { UserIcon, EnvelopeIcon, IdentificationIcon, CalendarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

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
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String((err as { message?: string }).message)
        : err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to fetch users'
        : 'Failed to fetch users';
      const statusCode = err && typeof err === 'object' && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
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

  const getUserInitials = (user: User): string => {
    if (user.firstname && user.lastname) {
      return `${user.firstname[0]}${user.lastname[0]}`.toUpperCase();
    }
    if (user.firstname) {
      return user.firstname[0].toUpperCase();
    }
    if (user.lastname) {
      return user.lastname[0].toUpperCase();
    }
    if (user.username) {
      return user.username[0].toUpperCase();
    }
    return 'U';
  };

  const getUserDisplayName = (user: User): string => {
    if (user.firstname && user.lastname) {
      return `${user.firstname} ${user.lastname}`;
    }
    if (user.firstname) {
      return user.firstname;
    }
    if (user.lastname) {
      return user.lastname;
    }
    return user.username || 'Unknown User';
  };

  const getAvatarColor = (user: User): string => {
    const colors = [
      'bg-indigo-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-teal-500',
    ];
    // Use user ID to consistently assign a color
    const index = parseInt(user.id) % colors.length;
    return colors[index] || colors[0];
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage and view all system users
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm">
              <span className="text-sm font-medium text-gray-700">
                Total: <span className="text-indigo-600">{users.length}</span> users
              </span>
            </div>
          </div>
        </div>

        {/* Users Grid */}
        {users.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                {/* Card Header with Avatar */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
                  <div className="flex items-center space-x-4">
                    <div className={`h-16 w-16 rounded-full ${getAvatarColor(user)} flex items-center justify-center shadow-lg`}>
                      <span className="text-2xl font-bold text-white">
                        {getUserInitials(user)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {getUserDisplayName(user)}
                      </h3>
                      <p className="text-sm text-indigo-100 truncate">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Role Badge */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      <ShieldCheckIcon className="h-3 w-3 mr-1.5" />
                      {getRoleDisplayName(user.role)}
                    </span>
                    {user.blocked && (
                      <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Blocked
                      </span>
                    )}
                    {!user.confirmed && (
                      <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Unconfirmed
                      </span>
                    )}
                  </div>

                  {/* User Details */}
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <IdentificationIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Username</p>
                        <p className="text-sm font-medium text-gray-900">
                          {user.username}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">Member Since</p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(user.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>User ID: {user.id}</span>
                    {user.updatedAt && (
                      <span>Updated {formatDate(user.updatedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <UserIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              There are no users in the system yet.
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

