import React from 'react';
import { InputProps } from '../../types';

const Input: React.FC<InputProps> = ({ label, className, id, error, ...props }) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={inputId} className="text-sm font-semibold text-gray-600 mb-1">
        {label}
      </label>
      <input
        id={inputId}
        className={`border rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 placeholder-gray-400 bg-white transition-colors
          ${error 
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
            : 'border-gray-300 focus:ring-primary focus:border-transparent'
          }`}
        {...props}
      />
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  );
};

export default Input;