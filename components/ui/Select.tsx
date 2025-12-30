import React from 'react';
import { SelectProps } from '../../types';

const Select: React.FC<SelectProps> = ({ label, options, className, id, ...props }) => {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={selectId} className="text-sm font-semibold text-gray-600 mb-1">
        {label}
      </label>
      <select
        id={selectId}
        className="border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white h-[42px]"
        {...props}
      >
        <option value="" disabled selected>Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;