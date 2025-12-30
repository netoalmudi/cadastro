import React from 'react';

interface SectionHeaderProps {
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => {
  return (
    <div className="flex items-center mb-6 mt-8">
      <div className="w-1.5 h-6 bg-primary mr-3"></div>
      <h2 className="text-xl font-bold text-gray-700">{title}</h2>
    </div>
  );
};

export default SectionHeader;