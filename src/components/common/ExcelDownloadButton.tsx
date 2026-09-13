import React from 'react';
import { Download } from 'lucide-react';
import { exportAgentDataToExcel, ExportData } from '../../utils/excelExporter';

interface ExcelDownloadButtonProps {
  agentId: string;
  agentName: string;
  data: ExportData;
  className?: string;
}

export const ExcelDownloadButton: React.FC<ExcelDownloadButtonProps> = ({
  agentId,
  agentName,
  data,
  className = '',
}) => {
  const handleDownload = () => {
    exportAgentDataToExcel(agentId, agentName, data);
  };

  return (
    <button
      onClick={handleDownload}
      className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold ${className}`}
      title="Download all your data as Excel file"
    >
      <Download className="w-4 h-4" />
      Download Excel
    </button>
  );
};
