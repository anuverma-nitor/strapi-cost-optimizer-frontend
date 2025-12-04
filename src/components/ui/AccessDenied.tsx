'use client';

import Link from 'next/link';
import { EyeSlashIcon } from '@heroicons/react/24/outline';

interface AccessDeniedProps {
    contentType?: string;
    message?: string;
    showViewButton?: boolean;
    viewButtonHref?: string;
    viewButtonText?: string;
}

export default function AccessDenied({
    contentType,
    message = "You don't have the permissions to access that content",
    showViewButton = true,
    viewButtonHref = '/content-manager',
    viewButtonText = 'View Content Manager'
}: AccessDeniedProps) {
    return (
        <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        {/* Eye icon with crossed line */}
                        <svg
                            className="w-24 h-24 text-purple-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {/* Eye shape */}
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                            {/* Diagonal line crossing the eye */}
                            <line
                                x1="4"
                                y1="4"
                                x2="20"
                                y2="20"
                                stroke="currentColor"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                            />
                            {/* Decorative dashed lines around the icon */}
                            <circle
                                cx="12"
                                cy="12"
                                r="14"
                                stroke="currentColor"
                                strokeWidth={1}
                                strokeDasharray="2 2"
                                fill="none"
                                opacity="0.3"
                            />
                        </svg>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-lg font-medium text-gray-800 mb-2">
                    {message}
                </h2>
                {/* 
                {contentType && (
                    <p className="text-sm text-gray-500 mb-6">
                        You don&apos;t have permission to access the <span className="font-medium capitalize">{contentType.replace('-', ' ')}</span> content type.
                    </p>
                )} */}

                {/* View Button */}
                {showViewButton && (
                    <div className="mt-6">
                        <Link
                            href={viewButtonHref}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            <EyeSlashIcon className="h-4 w-4 mr-2" />
                            {viewButtonText}
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

