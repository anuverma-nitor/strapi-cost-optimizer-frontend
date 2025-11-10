'use client';

import { useState } from 'react';
import { 
  TrashIcon, 
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

interface Field {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  default?: any;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
  targetField?: string;
  multiple?: boolean;
  repeatable?: boolean;
  allowedTypes?: string[];
  relation?: string;
  target?: string;
  component?: string;
}

interface FieldBuilderProps {
  fields: Field[];
  onFieldsChange: (fields: Field[]) => void;
}

const FIELD_TYPES = [
  { value: 'string', label: 'Text (Short)' },
  { value: 'text', label: 'Text (Long)' },
  { value: 'richtext', label: 'Rich Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'enumeration', label: 'Enumeration' },
  { value: 'date', label: 'Date' },
  { value: 'time', label: 'Time' },
  { value: 'datetime', label: 'Date & Time' },
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'integer', label: 'Integer' },
  { value: 'biginteger', label: 'Big Integer' },
  { value: 'float', label: 'Float' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'json', label: 'JSON' },
  { value: 'media', label: 'Media' },
  { value: 'uid', label: 'UID' },
  { value: 'relation', label: 'Relation' },
  { value: 'component', label: 'Component' },
  { value: 'dynamiczone', label: 'Dynamic Zone' },
];

export default function FieldBuilder({ fields, onFieldsChange }: FieldBuilderProps) {
  const [expandedField, setExpandedField] = useState<number | null>(null);

  const addField = () => {
    const newField: Field = {
      name: `field_${fields.length + 1}`,
      type: 'string',
      required: false,
    };
    onFieldsChange([...fields, newField]);
    setExpandedField(fields.length);
  };

  const removeField = (index: number) => {
    const newFields = fields.filter((_, i) => i !== index);
    onFieldsChange(newFields);
    if (expandedField === index) {
      setExpandedField(null);
    } else if (expandedField !== null && expandedField > index) {
      setExpandedField(expandedField - 1);
    }
  };

  const updateField = (index: number, updates: Partial<Field>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    onFieldsChange(newFields);
  };

  const toggleExpand = (index: number) => {
    setExpandedField(expandedField === index ? null : index);
  };

  const renderFieldProperties = (field: Field, index: number) => {
    const fieldType = field.type;

    return (
      <div className="space-y-4 pt-4 border-t border-gray-200">
        {/* Common Properties */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Required
            </label>
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={(e) => updateField(index, { required: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Unique
            </label>
            <input
              type="checkbox"
              checked={field.unique || false}
              onChange={(e) => updateField(index, { unique: e.target.checked })}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
          </div>
        </div>

        {/* Default Value */}
        {(fieldType === 'string' || fieldType === 'text' || fieldType === 'integer' || 
          fieldType === 'float' || fieldType === 'decimal' || fieldType === 'boolean') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Default Value
            </label>
            <input
              type={fieldType === 'boolean' ? 'checkbox' : fieldType.includes('integer') || fieldType === 'float' || fieldType === 'decimal' ? 'number' : 'text'}
              value={field.default !== undefined ? String(field.default) : ''}
              onChange={(e) => {
                let value: any = e.target.value;
                if (fieldType === 'boolean') {
                  value = e.target.checked;
                } else if (fieldType === 'integer' || fieldType === 'biginteger') {
                  value = value ? parseInt(value) : undefined;
                } else if (fieldType === 'float' || fieldType === 'decimal') {
                  value = value ? parseFloat(value) : undefined;
                }
                updateField(index, { default: value || undefined });
              }}
              checked={fieldType === 'boolean' ? field.default === true : undefined}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Default value (optional)"
            />
          </div>
        )}

        {/* String/Text specific */}
        {(fieldType === 'string' || fieldType === 'text' || fieldType === 'richtext') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Min Length
              </label>
              <input
                type="number"
                value={field.minLength || ''}
                onChange={(e) => updateField(index, { minLength: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Min"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Length
              </label>
              <input
                type="number"
                value={field.maxLength || ''}
                onChange={(e) => updateField(index, { maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Max"
              />
            </div>
          </div>
        )}

        {/* Number specific */}
        {(fieldType === 'integer' || fieldType === 'biginteger' || fieldType === 'float' || fieldType === 'decimal') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Min
              </label>
              <input
                type="number"
                value={field.min !== undefined ? field.min : ''}
                onChange={(e) => updateField(index, { min: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Min"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max
              </label>
              <input
                type="number"
                value={field.max !== undefined ? field.max : ''}
                onChange={(e) => updateField(index, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Max"
              />
            </div>
          </div>
        )}

        {/* Enumeration */}
        {fieldType === 'enumeration' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Enum Values (comma-separated)
            </label>
            <input
              type="text"
              value={field.enum ? field.enum.join(', ') : ''}
              onChange={(e) => {
                const enumValues = e.target.value.split(',').map(v => v.trim()).filter(v => v);
                updateField(index, { enum: enumValues.length > 0 ? enumValues : undefined });
              }}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., option1, option2, option3"
            />
          </div>
        )}

        {/* UID */}
        {fieldType === 'uid' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Target Field
            </label>
            <input
              type="text"
              value={field.targetField || ''}
              onChange={(e) => updateField(index, { targetField: e.target.value || undefined })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="e.g., title"
            />
          </div>
        )}

        {/* Media */}
        {fieldType === 'media' && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Multiple
              </label>
              <input
                type="checkbox"
                checked={field.multiple || false}
                onChange={(e) => updateField(index, { multiple: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </div>
          </div>
        )}

        {/* Component */}
        {fieldType === 'component' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Component Name
            </label>
            <input
              type="text"
              value={field.component || ''}
              onChange={(e) => updateField(index, { component: e.target.value || undefined })}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Component name"
            />
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Repeatable
              </label>
              <input
                type="checkbox"
                checked={field.repeatable || false}
                onChange={(e) => updateField(index, { repeatable: e.target.checked })}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </div>
          </div>
        )}

        {/* Relation */}
        {fieldType === 'relation' && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Relation Type
              </label>
              <select
                value={field.relation || ''}
                onChange={(e) => updateField(index, { relation: e.target.value || undefined })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select relation</option>
                <option value="oneToOne">One to One</option>
                <option value="oneToMany">One to Many</option>
                <option value="manyToOne">Many to One</option>
                <option value="manyToMany">Many to Many</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Target Content Type
              </label>
              <input
                type="text"
                value={field.target || ''}
                onChange={(e) => updateField(index, { target: e.target.value || undefined })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., api::article.article"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-900">Fields</h3>
        <button
          type="button"
          onClick={addField}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-3 w-3 mr-1" />
          Add Field
        </button>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-sm text-gray-500">No fields added yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Field" to get started</p>
        </div>
      )}

      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={index} className="border border-gray-200 rounded-lg bg-white">
            <div className="flex items-center justify-between p-3">
              <div className="flex-1 flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => toggleExpand(index)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {expandedField === index ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(index, { name: e.target.value })}
                  placeholder="Field name"
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(index, { type: e.target.value })}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {FIELD_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {field.required && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded">
                    Required
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeField(index)}
                className="ml-2 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>

            {expandedField === index && (
              <div className="px-3 pb-3">
                {renderFieldProperties(field, index)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

