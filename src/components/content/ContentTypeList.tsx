'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentType } from '@/types';
import { contentAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import FieldBuilder from './FieldBuilder';
import {
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  CalendarIcon,
  CubeIcon,
  // PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function ContentTypeList() {
  const { user } = useAuth();
  const isViewer = user?.role?.toLowerCase() === 'viewer';
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    kind: 'collectionType' as 'collectionType' | 'singleType',
  });
  const [fields, setFields] = useState<any[]>([]);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchContentTypes();
  }, []);

  const fetchContentTypes = async () => {
    try {
      setLoading(true);
      // This now calls your custom backend API
      const contentTypes = await contentAPI.getContentTypes();
      setContentTypes(contentTypes);
      setLoading(false);
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to fetch content types';
      const statusCode = err?.statusCode || err?.response?.status;
      setError(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
      console.error('Error fetching content types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClick = () => {
    setShowModal(true);
    setFormData({ name: '', displayName: '', description: '', kind: 'collectionType' });
    setFields([]);
    setFormError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ name: '', displayName: '', description: '', kind: 'collectionType' });
    setFields([]);
    setFormError('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError('');
  };

  // Transform fields array to attributes object format expected by backend
  const transformFieldsToAttributes = (fieldsArray: any[]): Record<string, any> => {
    const attributes: Record<string, any> = {};

    fieldsArray.forEach((field) => {
      if (!field.name || !field.type) return;

      const attribute: any = {
        type: field.type,
      };

      // Add properties based on field configuration
      if (field.required !== undefined) attribute.required = field.required;
      if (field.unique !== undefined) attribute.unique = field.unique;
      if (field.default !== undefined) attribute.default = field.default;
      if (field.minLength !== undefined) attribute.minLength = field.minLength;
      if (field.maxLength !== undefined) attribute.maxLength = field.maxLength;
      if (field.min !== undefined) attribute.min = field.min;
      if (field.max !== undefined) attribute.max = field.max;
      if (field.enum) attribute.enum = field.enum;
      if (field.targetField) attribute.targetField = field.targetField;
      if (field.multiple !== undefined) attribute.multiple = field.multiple;
      if (field.repeatable !== undefined) attribute.repeatable = field.repeatable;
      if (field.relation) attribute.relation = field.relation;
      if (field.target) attribute.target = field.target;
      if (field.component) attribute.component = field.component;
      if (field.allowedTypes) attribute.allowedTypes = field.allowedTypes;

      attributes[field.name] = attribute;
    });

    return attributes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setCreating(true);

    // Validate form
    if (!formData.name.trim()) {
      setFormError('Content type name is required');
      setCreating(false);
      return;
    }
    if (!formData.displayName.trim()) {
      setFormError('Display name is required');
      setCreating(false);
      return;
    }

    // Validate name format (lowercase, alphanumeric, hyphens, underscores)
    const contentTypeNameRegex = /^[a-z0-9-_]+$/;
    if (!contentTypeNameRegex.test(formData.name.trim())) {
      setFormError('Name must be lowercase and contain only letters, numbers, hyphens, and underscores');
      setCreating(false);
      return;
    }

    // Validate field names
    const fieldNames = fields.map(f => f.name.trim().toLowerCase());
    const duplicateFields = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
    if (duplicateFields.length > 0) {
      setFormError(`Duplicate field names: ${duplicateFields.join(', ')}`);
      setCreating(false);
      return;
    }

    // Validate field names format (must start with letter)
    const fieldNameRegex = /^[a-z][a-z0-9-_]*$/;
    const invalidFields = fields.filter(f => f.name.trim() && !fieldNameRegex.test(f.name.trim().toLowerCase()));
    if (invalidFields.length > 0) {
      setFormError('Field names must start with a letter and contain only lowercase letters, numbers, hyphens, and underscores');
      setCreating(false);
      return;
    }

    try {
      const attributes = transformFieldsToAttributes(fields);

      await contentAPI.createContentType({
        name: formData.name.trim(),
        displayName: formData.displayName.trim(),
        description: formData.description.trim() || undefined,
        kind: formData.kind,
        attributes: attributes,
      });

      // Refresh the list
      await fetchContentTypes();

      // Close modal
      handleCloseModal();
    } catch (err: unknown) {
      console.error('Error creating content type:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String((err as { message?: string }).message)
        : err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Failed to create content type';
      const statusCode = err && typeof err === 'object' && 'statusCode' in err
        ? (err as { statusCode?: number }).statusCode
        : err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      setFormError(
        statusCode
          ? `Error ${statusCode}: ${errorMessage}`
          : errorMessage ?? 'Failed to create content type'
      );
    } finally {
      setCreating(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  const getContentTypeColor = (contentType: ContentType): string => {
    const colors = [
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-pink-500',
      'from-indigo-500 to-purple-500',
      'from-green-500 to-emerald-500',
      'from-orange-500 to-red-500',
      'from-teal-500 to-blue-500',
      'from-pink-500 to-rose-500',
      'from-yellow-500 to-orange-500',
    ];
    // Use content type ID to consistently assign a color
    const index = parseInt(contentType.id) % colors.length;
    return colors[index] || colors[0];
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Types</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and organize your content structure
          </p>
        </div>
        {/* {!isViewer && (
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Content Type
          </button>
        )} */}
      </div>

      {/* Statistics Bar */}
      {contentTypes.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <CubeIcon className="h-5 w-5 text-indigo-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">
                <span className="text-indigo-600">{contentTypes.length}</span> content type{contentTypes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">
                {contentTypes.filter(ct => ct.kind === 'collectionType').length} collection type{contentTypes.filter(ct => ct.kind === 'collectionType').length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content Types Grid */}
      {contentTypes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contentTypes.map((contentType) => (
            <div
              key={contentType.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              {/* Card Header with Gradient */}
              <div className={`bg-gradient-to-r ${getContentTypeColor(contentType)} px-6 py-6`}>
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 rounded-full flex items-center justify-center shadow-xl border-2 border-white border-opacity-40">
                    <DocumentTextIcon className="h-7 w-7 text-white drop-shadow-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {contentType.displayName}
                    </h3>
                    <p className="text-sm text-white text-opacity-90 truncate">
                      {contentType.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6">
                {contentType.description ? (
                  <p className="text-sm text-gray-600 mb-4" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {contentType.description}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-4">
                    No description provided
                  </p>
                )}

                {/* Type Badge */}
                {contentType.kind && (
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${contentType.kind === 'collectionType'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                      }`}>
                      <CubeIcon className="h-3 w-3 mr-1.5" />
                      {contentType.kind === 'collectionType' ? 'Collection Type' : 'Single Type'}
                    </span>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center text-xs text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    <span>Created {formatDate(contentType.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <Link
                  href={`/content-manager/${contentType.pluralName || contentType.name}`}
                  className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Content
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No content types</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Get started by creating your first content type to organize your content structure.
          </p>
          {!isViewer && (
            <div className="mt-6">
              <button
                onClick={handleCreateClick}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Content Type
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Content Type Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={handleCloseModal}>
          <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-gray-900">Create Content Type</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {formError}
                </div>
              )}

              {/* Basic Information */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Content Type Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g., blog-posts, products"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={creating}
                    />
                    <p className="mt-1 text-xs text-gray-500">Lowercase, alphanumeric, hyphens, and underscores only</p>
                  </div>

                  <div>
                    <label htmlFor="kind" className="block text-sm font-medium text-gray-700 mb-1">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="kind"
                      name="kind"
                      value={formData.kind}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                      disabled={creating}
                    >
                      <option value="collectionType">Collection Type (Multiple entries)</option>
                      <option value="singleType">Single Type (One entry)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {formData.kind === 'collectionType'
                        ? 'For content with multiple entries (e.g., Articles, Products)'
                        : 'For single entry content (e.g., Homepage, Settings)'}
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="e.g., Blog Posts"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                    disabled={creating}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Optional description for this content type"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={creating}
                  />
                </div>
              </div>

              {/* Fields Builder */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <FieldBuilder fields={fields} onFieldsChange={setFields} />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={creating}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Content Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

