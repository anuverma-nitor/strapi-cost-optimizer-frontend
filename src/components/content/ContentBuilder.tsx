'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { ContentItem, ContentType } from '@/types';
import { contentAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/roles';
import {
  TrashIcon,
  ArrowLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Bold,
  Italic,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered
} from 'lucide-react';

// --- Tiptap & Strapi Blocks Logic ---
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';

// Strapi upload URL
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';

// Interface for uploaded media file
interface UploadedMedia {
  id: number;
  documentId?: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  formats?: {
    thumbnail?: { url: string };
    small?: { url: string };
    medium?: { url: string };
    large?: { url: string };
  };
}

// Types for Strapi Blocks
type BlockNode = {
  type: 'paragraph' | 'heading' | 'list' | 'link' | 'list-item' | 'text';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  format?: 'unordered' | 'ordered';
  children?: BlockNode[];
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  url?: string;
};

// 1. Strapi JSON -> Tiptap Content (HTML/JSON)
// We'll map Strapi JSON to Tiptap compatible HTML string for initial loading
const strapiToTiptap = (blocks: BlockNode[]): string => {
  if (!blocks || !Array.isArray(blocks)) return '<p></p>';

  const renderNode = (node: BlockNode): string => {
    // Helper to render children
    const renderChildren = () => (node.children || []).map(renderChild).join('');

    switch (node.type) {
      case 'paragraph':
        return `<p>${renderChildren()}</p>`;
      case 'heading':
        return `<h${node.level}>${renderChildren()}</h${node.level}>`;
      case 'list':
        const tag = node.format === 'ordered' ? 'ol' : 'ul';
        // Recursively render list items (which are 'list-item' nodes)
        // Note: Strapi list-item children are text/links. Tiptap expects <li><p>...</p></li> or <li>...</li>
        // We render direct children. Tiptap parser handles <li>Text</li> well.
        return `<${tag}>${(node.children || []).map(listItem => `<li>${(listItem.children || []).map(renderChild).join('')}</li>`).join('')}</${tag}>`;

      case 'link':
        // Strapi Link Node -> HTML Anchor
        // Tiptap will parse this as text with Link mark
        return `<a href="${node.url}">${renderChildren()}</a>`;

      default:
        return '';
    }
  };

  const renderChild = (child: BlockNode): string => {
    if (child.type === 'text') {
      let text = child.text || '';
      // Escape HTML entities if needed, but innerHTML usually handles it. 
      // safer to basic escape if raw text contains <>
      text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      if (child.code) text = `<code>${text}</code>`;
      if (child.bold) text = `<strong>${text}</strong>`;
      if (child.italic) text = `<em>${text}</em>`;
      if (child.underline) text = `<u>${text}</u>`;
      if (child.strikethrough) text = `<s>${text}</s>`;
      return text;
    }

    // Nesting (e.g. link inside paragraph context, though Strapi usually separates them)
    // If we encounter a link node here (Strapi v5 structure: Paragraph -> [Text, Link, Text])
    if (child.type === 'link') {
      return renderNode(child);
    }

    return '';
  };

  return blocks.map(renderNode).join('');
};


// 2. Tiptap JSON -> Strapi JSON
// Tiptap stores Links as MARKS on text nodes. Strapi stores Links as NODES wrapping text.
const tiptapToStrapi = (tiptapJson: any): BlockNode[] => {
  if (!tiptapJson || !tiptapJson.content) return [];

  const transformNode = (node: any): BlockNode | BlockNode[] | null => {
    // Handle Text and Marks
    if (node.type === 'text') {
      const strapiText: BlockNode = { type: 'text', text: node.text };

      let linkData: { url: string } | null = null;

      if (node.marks) {
        node.marks.forEach((mark: any) => {
          if (mark.type === 'bold') strapiText.bold = true;
          if (mark.type === 'italic') strapiText.italic = true;
          if (mark.type === 'strike') strapiText.strikethrough = true;
          if (mark.type === 'code') strapiText.code = true;
          if (mark.type === 'link') {
            linkData = { url: mark.attrs.href };
          }
        });
      }

      // If it's a link, we return a special objects to be processed by parent
      // because we need to merge adjacent links.
      // For simplicity here: we return the wrapper directly. 
      // Ideally we should merge adjacent links with same URL, but distinct nodes are valid too.
      if (linkData) {
        return {
          type: 'link',
          url: (linkData as any).url,
          children: [strapiText]
        };
      }
      return strapiText;
    }

    // Recursive transform of children
    const children = (node.content || [])
      .map(transformNode)
      .flat() // Flatten because transformNode might return array (though currently it doesn't really)
      .filter(Boolean) as BlockNode[];

    // Merge logic could go here: combine adjacent 'link' nodes if needed.
    // Strapi accepts multiple link nodes next to each other.

    if (node.type === 'paragraph') {
      return { type: 'paragraph', children };
    }

    if (node.type === 'heading') {
      return { type: 'heading', level: node.attrs.level, children };
    }

    if (node.type === 'bulletList') {
      return { type: 'list', format: 'unordered', children };
    }

    if (node.type === 'orderedList') {
      return { type: 'list', format: 'ordered', children };
    }

    if (node.type === 'listItem') {
      // Strapi list-item children should be inline nodes (text/link), NOT paragraphs.
      // Tiptap list-item children are usually paragraphs.
      // We must flatten: listItem -> paragraph -> [text]  ==>  list-item -> [text]

      const flattenedChildren: BlockNode[] = [];

      children.forEach(child => {
        if (child.type === 'paragraph' && child.children) {
          flattenedChildren.push(...child.children);
        } else {
          // If it's directly text or something else (unlikely in default Tiptap schema)
          flattenedChildren.push(child);
        }
      });

      return { type: 'list-item', children: flattenedChildren };
    }

    return null;
  };

  return (tiptapJson.content || []).map(transformNode).filter(Boolean) as BlockNode[];
};


const BlocksEditor = ({ value, onChange, disabled }: { value: any, onChange: (val: any) => void, disabled?: boolean }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        code: false, // User requested NO code logic in plan? Or just no code formatter in toolbar?
        // Safe to leave code extension off if they said "do not need code"
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 hover:text-indigo-800 underline cursor-pointer',
        }
      }),
    ],
    content: strapiToTiptap(value),
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      const strapiJson = tiptapToStrapi(json);
      onChange(strapiJson);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 text-left ',
      },
    },
    immediatelyRender: false, // Fix SSR hydration mismatch
  });

  // Sync external value changes ONLY if significantly different (to avoid loop)
  // With Tiptap we rely on editor state mostly, but if parent forces new value (e.g. reset)
  useEffect(() => {
    if (editor && value) {
      // Very basic check to see if we should reset content
      // If editor is empty but value has something, sync it.
      if (editor.isEmpty && value && value.length > 0) {
        editor.commands.setContent(strapiToTiptap(value));
      }
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    if (previousUrl) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className={`border border-gray-300 rounded-md overflow-hidden bg-white ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      {!disabled && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200 text-indigo-600' : 'text-gray-700'}`}
            title="Bold"
          >
            <Bold size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200 text-indigo-600' : 'text-gray-700'}`}
            title="Italic"
          >
            <Italic size={18} />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-indigo-600' : 'text-gray-700'}`}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-indigo-600' : 'text-gray-700'}`}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 text-indigo-600' : 'text-gray-700'}`}
            title="Heading 3"
          >
            <Heading3 size={18} />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200 text-indigo-600' : 'text-gray-700'}`}
            title="Bullet List"
          >
            <List size={18} />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200 text-indigo-600' : 'text-gray-700'}`}
            title="Ordered List"
          >
            <ListOrdered size={18} />
          </button>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          <button
            type="button"
            onClick={toggleLink}
            className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-200 text-indigo-600' : 'text-gray-700'}`}
            title="Link"
          >
            <LinkIcon size={18} />
          </button>
        </div>
      )}
      <EditorContent editor={editor} className="text-left" />
    </div>
  );
};


interface ContentBuilderProps {
  contentType: string;
  contentId?: string;
}

export default function ContentBuilder({ contentType, contentId }: ContentBuilderProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Use useSession hook instead of getSession() to avoid multiple API calls
  const { data: session } = useSession();

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

  // Media upload state
  const [uploadedMedia, setUploadedMedia] = useState<Record<string, UploadedMedia | UploadedMedia[]>>({});
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Relation field state
  const [relationOptions, setRelationOptions] = useState<Record<string, any[]>>({});
  const [relationLoading, setRelationLoading] = useState<Record<string, boolean>>({});
  const [relationErrors, setRelationErrors] = useState<Record<string, string>>({});

  const { register, handleSubmit, formState: { errors }, watch, reset, setValue } = useForm();

  useEffect(() => {
    // Redirect Viewer users away from create pages (they can only view existing content)
    if (isViewer && (!contentId || contentId === 'new')) {
      router.push(`/content-manager/${contentType}`);
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType, contentId, isViewer, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch content type schema
      const schema = await contentAPI.getContentType(contentType);

      setContentTypeSchema(schema);

      // If editing existing item, fetch the item data
      if (contentId && contentId !== 'new') {

        const item = await contentAPI.getContentItem(contentType, contentId);

        // item.data is already the ContentItem object (not an array)
        // getContentItem returns: { data: ContentItem }
        const contentItemData = item.data;
        setContentItem(contentItemData);

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
              const fieldConfig = schema.attributes[fieldName] as { type: string };
              // Stringify JSON fields for display in textarea
              if (fieldConfig.type === 'json' && typeof contentItemData[fieldName] === 'object' && contentItemData[fieldName] !== null) {
                formValues[fieldName] = JSON.stringify(contentItemData[fieldName], null, 2);
              } else {
                formValues[fieldName] = contentItemData[fieldName];
              }
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

        // Use reset() to properly initialize form with all values at once
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
    // Prevent submission for viewers
    if (isViewer) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      // Filter data to only include fields that are in the content type schema
      let filteredData: Record<string, any> = {};

      if (contentTypeSchema?.attributes) {
        Object.keys(contentTypeSchema.attributes).forEach((fieldName) => {
          const fieldConfig = contentTypeSchema.attributes[fieldName] as { type: string };

          // For media fields, send the full media object (not just ID)
          if (fieldConfig?.type === 'media') {
            const uploadedFile = uploadedMedia[fieldName];

            if (uploadedFile) {
              if (Array.isArray(uploadedFile)) {
                // Multiple files - send array of full media objects
                filteredData[fieldName] = uploadedFile.map((file: UploadedMedia) => file.id);
              } else {
                // Single file - send full media object
                filteredData[fieldName] = uploadedFile.id;
              }
            }
          } else if (data[fieldName] !== undefined && data[fieldName] !== null && data[fieldName] !== '') {
            // Parse JSON fields back to object before sending
            if (fieldConfig.type === 'json' && typeof data[fieldName] === 'string') {
              try {
                filteredData[fieldName] = JSON.parse(data[fieldName]);
              } catch (e) {
                // If parse fails, send as string or handle error (validation should catch this though)
                filteredData[fieldName] = data[fieldName];
              }
            } else {
              filteredData[fieldName] = data[fieldName];
            }
          }
        });
      } else {
        // Fallback: send all data if schema not available
        filteredData = data;
      }

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

  // Handle media file upload to Strapi
  const handleMediaUpload = async (fieldName: string, files: FileList | null, isMultiple: boolean) => {
    if (!files || files.length === 0) return;

    setUploadingFields(prev => ({ ...prev, [fieldName]: true }));
    setUploadErrors(prev => ({ ...prev, [fieldName]: '' }));

    try {
      const uploadedFiles: UploadedMedia[] = [];

      for (let i = 0; i < files.length; i++) {
        const fileObject = files[i];
        const formData = new FormData();
        formData.append('file', fileObject);

        // Use session from useSession() hook - no additional API call!
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${session?.backendJwt}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error?.message || `Upload failed with status ${response.status}`);
        }

        const responseData = await response.json();

        // Handle different response formats from backend
        let mediaItems: UploadedMedia[] = [];

        if (Array.isArray(responseData)) {
          // Response is an array: [{ id, name, url, ... }]
          mediaItems = responseData;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          // Response is wrapped: { data: [{ id, name, url, ... }] }
          mediaItems = responseData.data;
        }

        if (mediaItems.length > 0) {
          uploadedFiles.push(...mediaItems);
        }
      }

      // Update state with uploaded files
      if (uploadedFiles.length > 0) {
        if (isMultiple) {
          setUploadedMedia(prev => {
            const updated = {
              ...prev,
              [fieldName]: [...(Array.isArray(prev[fieldName]) ? prev[fieldName] as UploadedMedia[] : []), ...uploadedFiles]
            };
            return updated;
          });
        } else {
          setUploadedMedia(prev => {
            const updated = {
              ...prev,
              [fieldName]: uploadedFiles[0]
            };
            return updated;
          });
        }
      }

    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadErrors(prev => ({
        ...prev,
        [fieldName]: err?.message || 'Failed to upload file'
      }));
    } finally {
      setUploadingFields(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // Remove uploaded media
  const handleRemoveMedia = (fieldName: string, mediaId?: number) => {
    setUploadedMedia(prev => {
      const current = prev[fieldName];
      if (Array.isArray(current) && mediaId !== undefined) {
        // Remove specific file from array
        return {
          ...prev,
          [fieldName]: current.filter(m => m.id !== mediaId)
        };
      } else {
        // Remove single file
        const newState = { ...prev };
        delete newState[fieldName];
        return newState;
      }
    });
  };

  // Fetch relation options from API
  const fetchRelationOptions = async (fieldName: string) => {
    if (!contentTypeSchema?.id) {
      return;
    }

    // Check if already loaded
    if (relationOptions[fieldName]?.length > 0) {
      return;
    }

    setRelationLoading(prev => ({ ...prev, [fieldName]: true }));
    setRelationErrors(prev => ({ ...prev, [fieldName]: '' }));

    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/getRelation?id=${contentTypeSchema.id}&relationContentType=${fieldName}`;

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.backendJwt}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch relation data: ${response.status}`);
      }

      const data = await response.json();

      // Handle different response formats
      let options = [];
      if (Array.isArray(data)) {
        options = data;
      } else if (data?.data && Array.isArray(data.data)) {
        options = data.data;
      } else if (data?.results && Array.isArray(data.results)) {
        options = data.results;
      }

      setRelationOptions(prev => ({
        ...prev,
        [fieldName]: options
      }));
    } catch (err: any) {
      console.error(`Error fetching relation options for "${fieldName}":`, err);
      setRelationErrors(prev => ({
        ...prev,
        [fieldName]: err?.message || 'Failed to load options'
      }));
    } finally {
      setRelationLoading(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  const renderField = (fieldName: string, fieldConfig: any) => {
    // Permission Logic
    const isRead = fieldConfig.isRead !== false; // Default true
    const isCreate = fieldConfig.isCreate !== false; // Default true
    const isUpdate = fieldConfig.isUpdate !== false; // Default true

    // Only hide if:
    // 1. It is explicitly unreadable (isRead=false)
    // 2. AND we are creating a new item
    // 3. AND we don't have permission to create it
    if (!isRead && isNewItem && !isCreate) return null;

    const isDisabled = isViewer || (isNewItem ? !isCreate : !isUpdate);

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
              disabled={isDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
              disabled={isDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
              disabled={isDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
              disabled={isDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                disabled={isDisabled}
                className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              </span>
            </label>
          </div>
        );

      case 'blocks':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <BlocksEditor
              value={fieldValue}
              onChange={(val) => setValue(fieldName, val, { shouldDirty: true })}
              disabled={isDisabled}
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );

      case 'json':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="relative">
              <textarea
                {...register(fieldName, {
                  required: isRequired,
                  validate: (value) => {
                    if (!value) return true;
                    try {
                      JSON.parse(value);
                      return true;
                    } catch (e) {
                      return "Invalid JSON format";
                    }
                  }
                })}
                rows={10}
                defaultValue={
                  fieldValue
                    ? (typeof fieldValue === 'object' ? JSON.stringify(fieldValue, null, 2) : fieldValue)
                    : ''
                }
                disabled={isDisabled}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-900 text-green-400'}`}
                placeholder={`{\n  "key": "value"\n}`}
                spellCheck={false}
              />
            </div>
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
            <p className="text-xs text-gray-500">Enter valid JSON object.</p>
          </div>
        );

      case 'date':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              {...register(fieldName, { required: isRequired })}
              type="date"
              defaultValue={fieldValue ? new Date(fieldValue).toISOString().split('T')[0] : ''} // YYYY-MM-DD for input
              disabled={isDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
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
              disabled={isDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );

      case 'media':
        // Build accept string based on allowedTypes
        const allowedTypes: string[] = fieldConfig.allowedTypes || ['images', 'files', 'videos', 'audios'];
        const acceptMap: Record<string, string> = {
          images: 'image/*',
          files: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar',
          videos: 'video/*',
          audios: 'audio/*',
        };
        const acceptString = allowedTypes.map((type: string) => acceptMap[type] || '').filter(Boolean).join(',');
        const isMultiple = fieldConfig.multiple || false;
        const isUploading = uploadingFields[fieldName] || false;
        const uploadError = uploadErrors[fieldName];
        const currentUploadedMedia = uploadedMedia[fieldName];

        // Helper to render media preview
        const renderMediaPreview = (media: UploadedMedia, showRemove: boolean = true) => {
          const imageUrl = media.url.startsWith('http') ? media.url : `${STRAPI_URL}${media.url}`;
          const isImage = media.mime?.startsWith('image/');

          return (
            <div key={media.id} className="relative group flex items-center space-x-3 p-2 bg-white rounded-lg border border-gray-200">
              {isImage ? (
                <img
                  src={imageUrl}
                  alt={media.name || 'Preview'}
                  className="h-16 w-16 object-cover rounded-md"
                />
              ) : (
                <div className="h-16 w-16 flex items-center justify-center bg-gray-100 rounded-md">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {media.name}
                </p>
                <p className="text-xs text-gray-500">
                  {media.mime} • {(media.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {showRemove && !isDisabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(fieldName, media.id)}
                  className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        };

        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Allowed types info */}
            <div className="flex flex-wrap gap-1 mb-2">
              {allowedTypes.map((type: string) => (
                <span
                  key={type}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  {type}
                </span>
              ))}
              {isMultiple && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Multiple files allowed
                </span>
              )}
            </div>

            {/* Show uploaded media preview */}
            {currentUploadedMedia && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Uploaded files:</p>
                <div className={`grid gap-2 ${isMultiple ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                  {Array.isArray(currentUploadedMedia)
                    ? currentUploadedMedia.map(media => renderMediaPreview(media))
                    : renderMediaPreview(currentUploadedMedia)
                  }
                </div>
              </div>
            )}

            {/* File input with drag & drop styling */}
            {(!currentUploadedMedia || isMultiple) && (
              <div className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${isDisabled ? 'border-gray-200 bg-gray-50' :
                isUploading ? 'border-indigo-300 bg-indigo-50' :
                  'border-gray-300 hover:border-indigo-400 bg-white'
                }`}>
                <input
                  type="file"
                  accept={acceptString}
                  multiple={isMultiple}
                  disabled={isDisabled || isUploading}
                  onChange={(e) => handleMediaUpload(fieldName, e.target.files, isMultiple)}
                  className={`absolute inset-0 w-full h-full opacity-0 ${isDisabled || isUploading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                />
                <div className="text-center">
                  {isUploading ? (
                    <>
                      <div className="mx-auto h-12 w-12 flex items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      <p className="mt-2 text-sm text-indigo-600 font-medium">Uploading to Strapi...</p>
                    </>
                  ) : (
                    <>
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium text-indigo-600 hover:text-indigo-500">
                            Click to upload
                          </span>
                          {' '}or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {allowedTypes.join(', ').toUpperCase()}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Show existing media from content item (when editing) */}
            {fieldValue && !currentUploadedMedia && (
              <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">Current file (from server):</p>
                {typeof fieldValue === 'object' && fieldValue?.url ? (
                  <div className="flex items-center space-x-3">
                    {fieldValue.mime?.startsWith('image/') ? (
                      <img
                        src={fieldValue.url.startsWith('http') ? fieldValue.url : `${STRAPI_URL}${fieldValue.url}`}
                        alt={fieldValue.name || 'Preview'}
                        className="h-16 w-16 object-cover rounded-md"
                      />
                    ) : (
                      <div className="h-16 w-16 flex items-center justify-center bg-gray-200 rounded-md">
                        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fieldValue.name || 'File'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {fieldValue.mime || 'Unknown type'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">{String(fieldValue)}</p>
                )}
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <p className="text-sm text-red-600">{uploadError}</p>
            )}

            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );


      case 'relation':
        const relationFieldOptions = relationOptions[fieldName] || [];
        const isRelationLoading = relationLoading[fieldName] || false;
        const relationError = relationErrors[fieldName];
        const relationType = fieldConfig.relation; // oneToOne, oneToMany, manyToOne, manyToMany
        const isMultipleRelation = relationType === 'oneToMany' || relationType === 'manyToMany';

        // Fetch options when field is rendered (if not already loaded)
        if (!relationFieldOptions.length && !isRelationLoading && !relationError) {
          fetchRelationOptions(fieldName);
        }

        // Get display field - try common field names
        const getDisplayValue = (item: any) => {
          return item?.name || item?.title || item?.label || item?.displayName ||
            item?.username || item?.email || item?.id || 'Unknown';
        };

        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>

            {/* Relation type badge */}
            {relationType && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                {relationType}
              </span>
            )}

            {isRelationLoading ? (
              <div className="flex items-center space-x-2 py-2">
                <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-500">Loading options...</span>
              </div>
            ) : relationError ? (
              <div className="text-sm text-red-600 py-2">
                {relationError}
                <button
                  type="button"
                  onClick={() => fetchRelationOptions(fieldName)}
                  className="ml-2 text-indigo-600 hover:text-indigo-500 underline"
                >
                  Retry
                </button>
              </div>
            ) : isMultipleRelation ? (
              // Multiple selection (checkboxes or multi-select)
              <div className="border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                {relationFieldOptions.length === 0 ? (
                  <p className="p-3 text-sm text-gray-500">No options available</p>
                ) : (
                  <div className="p-2 space-y-1">
                    {relationFieldOptions.map((option: any) => (
                      <label key={option.id || option.documentId} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          value={option.id || option.documentId}
                          {...register(fieldName)}
                          disabled={isDisabled}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {getDisplayValue(option)}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Single selection (dropdown)
              <select
                {...register(fieldName, { required: isRequired })}
                disabled={isDisabled}
                defaultValue={fieldValue?.id || fieldValue?.documentId || fieldValue || ''}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">Select {fieldName}...</option>
                {relationFieldOptions.map((option: any) => (
                  <option key={option.id || option.documentId} value={option.id || option.documentId}>
                    {getDisplayValue(option)}
                  </option>
                ))}
              </select>
            )}

            {/* Show current value if editing */}
            {fieldValue && typeof fieldValue === 'object' && (
              <div className="mt-1 text-xs text-gray-500">
                Current: {getDisplayValue(fieldValue)}
              </div>
            )}

            {errors[fieldName] && (
              <p className="text-sm text-red-600">{String(errors[fieldName]?.message || '')}</p>
            )}
          </div>
        );
      case 'enumeration':
        return (
          <div key={fieldName} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}
              {isRequired && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              {...register(fieldName, { required: isRequired })}
              disabled={isDisabled}
              defaultValue={fieldValue || ''}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            >
              <option value="">Select {fieldName}...</option>
              {fieldConfig.enum?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
              disabled={isDisabled}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
              {isNewItem ? 'Create New' : isViewer ? 'View' : 'Edit'} {contentTypeSchema?.displayName || contentType}
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
        {isViewer && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-md">
            You are viewing this content in read-only mode. All fields are disabled.
          </div>
        )}
        {!canEdit && !isNewItem && !isViewer && (
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
