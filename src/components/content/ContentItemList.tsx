'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentItem } from '@/types';
import { contentAPI } from '@/lib/api';
import { formatDate, truncateText } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/roles';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface ContentItemListProps {
  contentType: string;
}

export default function ContentItemList({ contentType }: ContentItemListProps) {
  const { user } = useAuth();
  const isViewer = user?.role?.toLowerCase() === 'viewer';
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const isAuthor = user?.role?.toLowerCase() === UserRole.AUTHOR;
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [ownershipMap, setOwnershipMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchContentItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType]);

  const fetchContentItems = async () => {
    try {
      setLoading(true);
      setError('');
      // This now calls your custom backend API
      const response = await contentAPI.getContentItems(contentType);
      console.log('getContentItems response..........................', response);

      // response is ApiResponse<ContentItem[]> which has { data: ContentItem[] }
      // Ensure response.data exists and is an array
      if (response?.data && Array.isArray(response.data)) {
        const items = response.data;
        setContentItems(items);
        console.log('Content items set:', items.length);

        // For author role, check ownership for each item
        if (isAuthor && items.length > 0) {
          const ownershipChecks = await Promise.all(
            items.map(async (item) => {
              try {
                const contentId = item.documentId || String(item.id);
                const ownership = await contentAPI.checkContentOwnership(contentType, contentId);
                return { contentId, isOwner: ownership.isOwner };
              } catch (err) {
                console.error(`Failed to check ownership for item ${item.id}:`, err);
                return { contentId: item.documentId || String(item.id), isOwner: false };
              }
            })
          );

          const ownershipMap: Record<string, boolean> = {};
          ownershipChecks.forEach(({ contentId, isOwner }) => {
            ownershipMap[contentId] = isOwner;
          });
          setOwnershipMap(ownershipMap);
        }
      } else {
        // If no data or invalid format, set empty array
        setContentItems([]);
        console.log('No content items found or invalid response format');
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to fetch content items';
      const statusCode = err?.statusCode || err?.response?.status;
      setError(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
      console.error('Error fetching content items:', err);
      setContentItems([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    // Only select all if contentItems is not empty
    if (contentItems.length === 0) return;

    setSelectedItems(
      selectedItems.length === contentItems.length
        ? []
        : contentItems.map(item => item.id)
    );
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await contentAPI.deleteContentItem(contentType, id);
        setContentItems(prev => prev.filter(item => item.documentId !== id));
        // Remove from selected items if it was selected
        setSelectedItems(prev => prev.filter(itemId => {
          const item = contentItems.find(ci => ci.documentId === id);
          return item ? itemId !== item.id : true;
        }));
      } catch (err: any) {
        const errorMessage = err?.message || err?.response?.data?.message || 'Failed to delete content';
        const statusCode = err?.statusCode || err?.response?.status;
        alert(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
        console.error('Error deleting item:', err);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;

    const count = selectedItems.length;
    if (!confirm(`Are you sure you want to delete ${count} item${count > 1 ? 's' : ''}?`)) {
      return;
    }

    try {
      // Get the items to delete
      const itemsToDelete = contentItems.filter(item => selectedItems.includes(item.id));

      // For author role, check ownership before deleting
      if (isAuthor) {
        const itemsToCheck = itemsToDelete.map(item => ({
          item,
          contentId: item.documentId || String(item.id),
        }));

        // Check ownership for all items
        const ownershipChecks = await Promise.all(
          itemsToCheck.map(async ({ contentId }) => {
            try {
              const ownership = await contentAPI.checkContentOwnership(contentType, contentId);
              return ownership.isOwner;
            } catch (err) {
              console.error(`Failed to check ownership for ${contentId}:`, err);
              return false;
            }
          })
        );

        // Filter out items that author doesn't own
        const deletableItems = itemsToCheck.filter((_, index) => ownershipChecks[index]);

        if (deletableItems.length === 0) {
          alert('You can only delete your own content. None of the selected items belong to you.');
          return;
        }

        if (deletableItems.length < itemsToCheck.length) {
          const notOwnedCount = itemsToCheck.length - deletableItems.length;
          if (!confirm(`${notOwnedCount} of the selected items don't belong to you and will be skipped. Continue deleting ${deletableItems.length} item${deletableItems.length > 1 ? 's' : ''}?`)) {
            return;
          }
        }

        // Delete only items owned by author
        const deletePromises = deletableItems.map(({ contentId }) =>
          contentAPI.deleteContentItem(contentType, contentId).catch(err => {
            console.error(`Failed to delete ${contentId}:`, err);
            return { error: true, contentId };
          })
        );

        await Promise.all(deletePromises);

        // Update state - remove deleted items
        const deletedContentIds = deletableItems.map(({ contentId }) => contentId);
        setContentItems(prev => prev.filter(item => !deletedContentIds.includes(item.documentId || String(item.id))));
        setSelectedItems([]);
      } else {
        // For admin/editor, delete all selected items
        const deletePromises = itemsToDelete.map(item => {
          const contentId = item.documentId || String(item.id);
          return contentAPI.deleteContentItem(contentType, contentId).catch(err => {
            console.error(`Failed to delete ${contentId}:`, err);
            return { error: true, contentId };
          });
        });

        const results = await Promise.all(deletePromises);

        // Check if any deletions failed
        const failedDeletions = results.filter(r => r && typeof r === 'object' && 'error' in r);
        if (failedDeletions.length > 0) {
          console.warn(`${failedDeletions.length} item(s) failed to delete`);
        }

        // Update state - remove successfully deleted items
        const deletedContentIds = itemsToDelete.map(item => item.documentId || String(item.id));
        setContentItems(prev => prev.filter(item => !deletedContentIds.includes(item.documentId || String(item.id))));
        setSelectedItems([]);
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to delete selected items';
      const statusCode = err?.statusCode || err?.response?.status;
      alert(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
      console.error('Error deleting selected items:', err);
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 capitalize">
          {contentType.replace('-', ' ')} Content
        </h1>
        {!isViewer && (
          <Link
            href={`/content-builder/${contentType}/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New
          </Link>
        )}
      </div>

      {contentItems && contentItems.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={contentItems.length > 0 && selectedItems.length === contentItems.length}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">
                {selectedItems.length} of {contentItems.length} selected
              </span>
              {selectedItems.length > 0 && !isViewer && (
                <div className="ml-4 flex space-x-2">
                  <button
                    onClick={handleDeleteSelected}
                    className="text-sm text-red-600 hover:text-red-900 font-medium"
                  >
                    Delete Selected ({selectedItems.length})
                  </button>
                </div>
              )}
            </div>
          </div>

          <ul className="divide-y divide-gray-200">
            {contentItems.map((item) => (
              <li key={item.id} className="hover:bg-gray-50">
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-gray-900">
                          {(item.name || item.title || `Item ${item.id}`) as React.ReactNode}
                        </h3>
                        {!item.publishedAt && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Draft
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {truncateText(
                          typeof item.content === 'string'
                            ? item.content
                            : typeof item.description === 'string'
                            ? item.description
                            : '',
                          100
                        )}
                      </p>
                      <div className="mt-1 text-xs text-gray-400">
                        Updated {formatDate(item.updatedAt)}
                        {item.publishedAt && (
                          <span className="ml-2">• Published {formatDate(item.publishedAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!isViewer && (() => {
                      const contentId = item.documentId || String(item.id);
                      const canEdit = !isAuthor || ownershipMap[contentId] === true;

                      if (isAuthor && !canEdit) {
                        return null; // Author can't edit others' content
                      }

                      return (
                        <>
                          <Link
                            href={`/content-builder/${contentType}/${item.documentId}`}
                            className="text-gray-400 hover:text-gray-600"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          {(isAdmin || (isAuthor && canEdit)) && (
                            <button
                              onClick={() => handleDelete(item.documentId)}
                              className="text-gray-400 hover:text-red-600"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!contentItems || contentItems.length === 0) && !loading && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No content found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new {contentType}.</p>
          {!isViewer && (
            <div className="mt-6">
              <Link
                href={`/content-builder/${contentType}/new`}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create New {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

