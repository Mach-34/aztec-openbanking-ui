import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

type DropdownProps = {
  className?: string;
  options: string[];
  onSelect: (option: string) => void;
  selectedOption: string;
  title: string;
};

export const Dropdown: React.FC<DropdownProps> = ({
  className,
  options,
  onSelect,
  selectedOption,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    return options.filter((option) => option !== selectedOption);
  }, [options, selectedOption]);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleSelect = (option: string) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <div className='text-[#913DE5] text-sm mb-1'>{title}</div>
      <div>
        <button
          type='button'
          className='inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-[#913DE5] bg-transparent border border-[#913DE5] rounded-md hover:bg-[#913DE5] hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#913DE5] transition-colors duration-200'
          id='options-menu'
          aria-haspopup='true'
          aria-expanded='true'
          onClick={handleToggle}
        >
          {selectedOption || 'Select an option'}
          <ChevronDown className='-mr-1 ml-2 h-5 w-5' aria-hidden='true' />
        </button>
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className='origin-top-right absolute right-0 mt-2 w-full rounded-md shadow-lg bg-white ring-1 ring-[#5C3185] ring-opacity-5'>
          <div
            role='menu'
            aria-orientation='vertical'
            aria-labelledby='options-menu'
          >
            {filteredOptions.map((option) => (
              <button
                key={option}
                className='block w-full text-left px-4 py-2 text-sm text-[#5C3185] hover:bg-[#F0E6F7] focus:bg-[#F0E6F7] focus:outline-none transition-colors duration-200'
                role='menuitem'
                onClick={() => handleSelect(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
