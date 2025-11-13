'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ContentItem, ContentType } from '@/types';
import { contentAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/roles';
import { 
  TrashIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface ContentBuilderProps {
  contentType: string;
  contentId?: string;
}

export default function ContentBuilder({ contentType, contentId }: ContentBuilderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isViewer = user?.role?.toLowerCase() === 'viewer';
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isAuthor = user?.role?.toLowerCase() === UserRole.AUTHOR;
  const [contentTypeSchema, setContentTypeSchema] = useState<ContentType | null>(null);
  const [contentItem, setContentItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(true);
  const [isNewItem] = useState(!contentId);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm();

  useEffect(() => {
    // Redirect Viewer users away from create/edit pages
    if (isViewer) {
      router.push(`/content-manager/${contentType}`);
      return;
    }
    fetchData();
  }, [contentType, contentId, isViewer, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch content type schema
      const schema = await contentAPI.getContentType(contentType);
      console.log('schema..........................', schema);
      
      setContentTypeSchema(schema);
      
      // If editing existing item, fetch the item data
      if (contentId && contentId !== 'new') {
        console.log('contentId..........................',contentId);

        const item = await contentAPI.getContentItem(contentType, contentId);
        console.log('item response..........................', item);
        console.log('item.data..........................', item.data);
        
        // item.data is already the ContentItem object (not an array)
        // getContentItem returns: { data: ContentItem }
        const contentItemData = item.data;
        setContentItem(contentItemData);
        console.log('ContentItem set to:', contentItemData);

        // For author role, check ownership
        if (isAuthor && contentId) {
          try {
            const ownership = await contentAPI.checkContentOwnership(contentType, contentId);
            setCanEdit(ownership.canEdit);
            if (!ownership.canEdit) {
              setError('You can only edit your own content');
            }
          } catch (err) {
            console.error('Failed to check ownership:', err);
            setCanEdit(false);
          }
        }

        // Set form values (Strapi 5.x has flattened structure, fields are at root level)
        // Exclude system fields (id, documentId, createdAt, updatedAt, publishedAt)
        const systemFields = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt'];
        const formValues: Record<string, any> = {};
        
        // Only include fields that are in the content type schema
        if (schema?.attributes) {
          Object.keys(schema.attributes).forEach((fieldName) => {
            if (contentItemData[fieldName] !== undefined) {
              formValues[fieldName] = contentItemData[fieldName];
            }
          });
        } else {
          // Fallback: include all non-system fields
          Object.entries(contentItemData).forEach(([key, value]) => {
            if (!systemFields.includes(key)) {
              formValues[key] = value;
            }
          });
        }
        
        console.log('Form values to reset:', formValues);
        
        // Use reset() to properly initialize form with all values at once
        // This ensures the form fields show the pre-filled data
        reset(formValues);
      } else {
        // For new items, reset form to empty
        reset({});
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to fetch data';
      const statusCode = err?.statusCode || err?.response?.status;
      setError(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setSaving(true);
      setError('');

      // Filter data to only include fields that are in the content type schema
      // This ensures we only send the fields that are defined in the schema
      let filteredData: Record<string, any> = {};
      
      if (contentTypeSchema?.attributes) {
        Object.keys(contentTypeSchema.attributes).forEach((fieldName) => {
          if (data[fieldName] !== undefined && data[fieldName] !== null && data[fieldName] !== '') {
            filteredData[fieldName] = data[fieldName];
          }
        });
      } else {
        // Fallback: send all data if schema not available
        filteredData = data;
      }

      console.log('Submitting data:', filteredData);

      if (isNewItem) {
        const response = await contentAPI.createContentItem(contentType, filteredData);
        setContentItem(response.data);
        // Redirect to edit mode
        window.history.replaceState(null, '', `/content-builder/${contentType}/${response.data.id}`);
      } else {
        const response = await contentAPI.updateContentItem(contentType, contentId!, filteredData);
        setContentItem(response.data);
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to save content';
      const statusCode = err?.statusCode || err?.response?.status;
      setError(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
      console.error('Error saving content:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!contentItem || !confirm('Are you sure you want to delete this item?')) return;
    console.log('handleDelete..........................', contentItem);
    try {
      await contentAPI.deleteContentItem(contentType, contentItem.documentId.toString());
      // Redirect to content list
      window.location.href = `/content-manager/${contentType}`;
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to delete content';
      const statusCode = err?.statusCode || err?.response?.status;
      alert(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
      console.error('Error deleting item:', err);
    }
  };

  const renderField = (fieldName: string, fieldConfig: any) => {
    const fieldType = fieldConfig.type;
    const isRequired = fieldConfig.required;
    // Get current value from form state (will show default value after reset())
    const fieldValue = watch(fieldName);

    switch (fieldType) {
      case 'string':
      case 'uid':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              {...register(fieldName, { required: isRequired })}
              type="text"
              defaultValue={fieldValue || ''} // Show default value from form state
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={`Enter ${fieldName}`}
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );

      case 'text':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              {...register(fieldName, { required: isRequired })}
              rows={4}
              defaultValue={fieldValue || ''} // Show default value from form state
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={`Enter ${fieldName}`}
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );

      case 'richtext':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              {...register(fieldName, { required: isRequired })}
              rows={8}
              defaultValue={fieldValue || ''} // Show default value from form state
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={`Enter ${fieldName}`}
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );

      case 'number':
      case 'decimal':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              {...register(fieldName, { required: isRequired, valueAsNumber: true })}
              type="number"
              step={fieldType === 'decimal' ? '0.01' : '1'}
              defaultValue={fieldValue !== undefined && fieldValue !== null ? fieldValue : ''} // Show default value
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={`Enter ${fieldName}`}
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="flex items-center">
              <input
                {...register(fieldName)}
                type="checkbox"
                defaultChecked={fieldValue === true} // Show default checked state
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              </span>
            </label>
          </div>
        );

      case 'datetime':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              {...register(fieldName, { required: isRequired })}
              type="datetime-local"
              defaultValue={fieldValue ? new Date(fieldValue).toISOString().slice(0, 16) : ''} // Convert ISO to datetime-local format
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              {...register(fieldName, { required: isRequired })}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={`Enter ${fieldName}`}
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link
            href={`/content-manager/${contentType}`}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isNewItem ? 'Create New' : 'Edit'} {contentTypeSchema?.displayName || contentType}
            </h1>
            {contentItem && (
              <p className="text-sm text-gray-500">
                Last updated {formatDate(contentItem.updatedAt)}
              </p>
            )}
          </div>
        </div>
        
        {!isViewer && canEdit && (
          <div className="flex items-center space-x-2">
            {!isNewItem && contentItem && (
              <>
                {(isAdmin || (isAuthor && canEdit)) && (
                  <button
                    onClick={handleDelete}
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {!canEdit && !isNewItem && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md">
            You can only edit your own content. This content was created by another user.
          </div>
        )}
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6">
              {contentTypeSchema?.attributes && Object.entries(contentTypeSchema.attributes).map(([fieldName, fieldConfig]) => 
                renderField(fieldName, fieldConfig)
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!isViewer && (
          <div className="flex justify-end space-x-3">
            <Link
              href={`/content-manager/${contentType}`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {saving ? 'Saving...' : isNewItem ? 'Create' : 'Save'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

