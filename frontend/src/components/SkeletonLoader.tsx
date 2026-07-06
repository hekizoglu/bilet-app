"use client";
import React from 'react';

export default function SkeletonLoader({ type = 'card' }: { type?: 'card' | 'text' | 'list' }) {
  if (type === 'card') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        <div className="h-48 bg-gray-200 w-full"></div>
        <div className="p-6">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-6"></div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse flex flex-col md:flex-row gap-4">
        <div className="flex-1 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="w-24 h-24 bg-gray-200 rounded-xl"></div>
      </div>
    );
  }

  return (
    <div className="animate-pulse flex space-x-4">
      <div className="flex-1 space-y-4 py-1">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}
