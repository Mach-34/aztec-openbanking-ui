import { Check, CircleHelp } from 'lucide-react';
import Loader from './Loader';
import { Tooltip } from 'react-tooltip';

interface VerticalProgressChecklistProps {
  currentStep: number;
  steps: string[];
}

export default function VerticalProgressChecklist({
  currentStep,
  steps,
}: VerticalProgressChecklistProps) {
  return (
    <div className='max-w-sm mx-auto p-6'>
      <div className='relative'>
        {steps.map((step, index) => (
          <div key={index} className='flex items-center mb-8 last:mb-0'>
            <div className='relative'>
              <div
                className={`w-8 h-8 rounded-full border-4 flex items-center justify-center z-10 relative transition-colors ${
                  index === currentStep
                    ? 'bg-[#242424] border-[#904FD1]'
                    : index < currentStep
                    ? 'bg-[#904FD1] border-[#904FD1]'
                    : 'bg-white border-gray-300'
                }`}
              >
                {index < currentStep && (
                  <Check className='w-5 h-5 text-white' />
                )}
              </div>
              {index < steps.length - 1 && (
                <div className='absolute top-8 left-1/2 transform -translate-x-1/2 w-1 h-[calc(100%+1rem)] bg-gray-300'>
                  <div
                    className='bg-[#904FD1] w-full transition-all duration-300 ease-in-out'
                    style={{
                      height: index < currentStep ? '100%' : '0%',
                    }}
                  ></div>
                </div>
              )}
            </div>
            <div className='ml-4 flex flex-grow gap-2 items-center'>
              <span
                className={`text-sm font-medium ${
                  index <= currentStep ? 'text-[#904FD1]' : 'text-gray-500'
                }`}
              >
                {step}
              </span>
              {index === 0 && (
                <>
                  <CircleHelp data-tooltip-id='revolut-help' size={16} />
                  <Tooltip clickable id='revolut-help'>
                    Revolut sandbox setup{' '}
                    <a
                      href='https://youtu.be/8ecWLa5i7oQ'
                      rel='no-referrer'
                      target='_blank'
                    >
                      guide
                    </a>
                  </Tooltip>
                </>
              )}
            </div>
            {index === currentStep && <Loader size={16} />}
          </div>
        ))}
      </div>
    </div>
  );
}
