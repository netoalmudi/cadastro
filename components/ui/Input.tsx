import React from 'react';
import { InputProps } from '../../types';

const Input: React.FC<InputProps> = ({ label, className, id, ...props }) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={inputId} className="text-sm font-semibold text-gray-600 mb-1">
        {label}
      </label>
      <input
        id={inputId}
        className="border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder-gray-400 bg-white"
        {...props}
      />
    </div>
  );
};

export default Input;