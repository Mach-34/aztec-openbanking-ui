import { JSX } from 'react';

type DataTableProps = {
  data: Record<string, string | JSX.Element>[];
  headers: string[];
  primaryAction?: {
    label: string;
    onClick: (index: number) => void;
  };
  secondaryAction?: {
    label: string;
    onClick: (row: number) => void;
  };
};

const DataTable: React.FC<DataTableProps> = ({
  data,
  headers,
  primaryAction,
  secondaryAction,
}) => {
  const allHeaders = [...headers, ''];
  return (
    <div className='overflow-hidden rounded-lg border border-[#913DE5] shadow-sm w-full'>
      <div className='overflow-x-auto'>
        <table className='w-full border-collapse'>
          <thead>
            <tr className='bg-[rgba(145,61,229,.4)] text-white'>
              {allHeaders.map((header, index) => (
                <th key={index} className='p-3 text-left font-semibold'>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`border-b border-[#913DE5]/50 ${
                  rowIndex === data.length - 1 ? 'last:border-b-0' : ''
                }`}
              >
                {headers.map((header, cellIndex) => (
                  <td key={cellIndex} className='p-3'>
                    {row[header.toLowerCase()]}
                  </td>
                ))}
                <td className='flex gap-2 justify-end p-3'>
                  {primaryAction && !row.disableAction && (
                    <button
                      className='px-3 py-1 text-sm'
                      onClick={() => primaryAction.onClick(rowIndex)}
                    >
                      {primaryAction.label}
                    </button>
                  )}
                  {secondaryAction && !row.disableAction && (
                    <button
                      className='px-3 py-1 text-sm'
                      onClick={() => secondaryAction.onClick(rowIndex)}
                    >
                      {secondaryAction.label}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
