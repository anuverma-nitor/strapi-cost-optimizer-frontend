'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ContentItem } from '@/types';
import { contentAPI } from '@/lib/api';
import { formatDate, truncateText } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/roles';
import AccessDenied from '@/components/ui/AccessDenied';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  EyeIcon
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
  const [isForbidden, setIsForbidden] = useState(false);
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
      setIsForbidden(false);
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

      // Check if it's a 403 Forbidden error
      if (statusCode === 403) {
        setIsForbidden(true);
        setError('');
      } else {
        setError(statusCode ? `Error ${statusCode}: ${errorMessage}` : errorMessage);
        setIsForbidden(false);
      }
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

  // Show access denied page for 403 errors
  if (isForbidden) {
    return (
      <AccessDenied
        contentType={contentType}
        viewButtonHref="/content-manager"
        viewButtonText="View Content Manager"
      />
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
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 capitalize">
            {contentType.replace('-', ' ')} Content
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and organize your {contentType.replace('-', ' ')} content
          </p>
        </div>
        {!isViewer && (
          <Link
            href={`/content-builder/${contentType}/new`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create New
          </Link>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {contentItems && contentItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={contentItems.length > 0 && selectedItems.length === contentItems.length}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">
                {selectedItems.length > 0 ? (
                  <span className="text-indigo-600">{selectedItems.length}</span>
                ) : (
                  <span className="text-gray-500">{contentItems.length}</span>
                )}{' '}
                {selectedItems.length === 1 ? 'item' : 'items'}{' '}
                {selectedItems.length > 0 ? 'selected' : 'total'}
              </span>
            </div>
            {selectedItems.length > 0 && !isViewer && (
              <button
                onClick={handleDeleteSelected}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete Selected
              </button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {contentItems && contentItems.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-12 px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={contentItems.length > 0 && selectedItems.length === contentItems.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th> */}
                  {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th> */}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <EyeIcon className="h-4 w-4 inline-block mr-1" />
                    View
                  </th>
                  {!isViewer && (
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <PencilIcon className="h-4 w-4 inline-block mr-1" />
                      Edit
                    </th>
                  )}
                  {!isViewer && (
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contentItems.map((item) => {
                  const contentId = item.documentId || String(item.id);
                  const canEdit = !isAuthor || ownershipMap[contentId] === true;
                  const isSelected = selectedItems.includes(item.id);
                  const itemTitle = (item.name || item.title || `Item ${item.id}`) as string;
                  // const itemDescription = truncateText(
                  //   typeof item.content === 'string'
                  //     ? item.content
                  //     : typeof item.description === 'string'
                  //       ? item.description
                  //       : '',
                  //   100
                  // );

                  // Get createdBy information - could be createdBy, author, or user
                  // const createdBy = item.createdBy
                  //   ? (typeof item.createdBy === 'object'
                  //     ? (item.createdBy as { username?: string; email?: string; name?: string })?.username
                  //     || (item.createdBy as { username?: string; email?: string; name?: string })?.email
                  //     || (item.createdBy as { username?: string; email?: string; name?: string })?.name
                  //     || 'Unknown'
                  //     : String(item.createdBy))
                  //   : item.author
                  //     ? (typeof item.author === 'object'
                  //       ? (item.author as { username?: string; email?: string; name?: string })?.username
                  //       || (item.author as { username?: string; email?: string; name?: string })?.email
                  //       || (item.author as { username?: string; email?: string; name?: string })?.name
                  //       || 'Unknown'
                  //       : String(item.author))
                  //     : 'N/A';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectItem(item.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="text-sm font-medium text-gray-900">
                              {itemTitle}
                            </div>
                            {!item.publishedAt && (
                              <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      {/* <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-md">
                          {itemDescription || <span className="text-gray-400">No description</span>}
                        </div>
                      </td> */}

                      {/* Created By */}
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {createdBy}
                        </div>
                      </td> */}

                      {/* Created Date */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(item.createdAt)}
                        </div>
                        {/* {item.publishedAt && (
                          <div className="text-xs text-gray-500 mt-1">
                            Published: {formatDate(item.publishedAt)}
                          </div>
                        )} */}
                      </td>

                      {/* View Icon */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/content-builder/${contentType}/${contentId}`}
                          className="inline-flex items-center justify-center text-indigo-600 hover:text-indigo-900 transition-colors cursor-pointer"
                          title="View"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </Link>
                      </td>

                      {/* Edit Icon */}
                      {!isViewer && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {(() => {
                            if (isAuthor && !canEdit) {
                              return (
                                <span className="text-gray-300 cursor-not-allowed" title="You can only edit your own content">
                                  <PencilIcon className="h-5 w-5" />
                                </span>
                              );
                            }
                            return (
                              <Link
                                href={`/content-builder/${contentType}/${contentId}`}
                                className="inline-flex items-center justify-center text-gray-600 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </Link>
                            );
                          })()}
                        </td>
                      )}

                      {/* Delete Action */}
                      {!isViewer && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isAdmin || (isAuthor && canEdit) ? (
                            <button
                              onClick={() => handleDelete(contentId)}
                              className="inline-flex items-center justify-center text-red-600 hover:text-red-900 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          ) : (
                            <span className="text-gray-300">
                              <TrashIcon className="h-5 w-5" />
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!contentItems || contentItems.length === 0) && !loading && (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
          <DocumentTextIcon className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No content found</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Get started by creating your first {contentType.replace('-', ' ')} content item.
          </p>
          {!isViewer && (
            <div className="mt-6">
              <Link
                href={`/content-builder/${contentType}/new`}
                className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create New {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

