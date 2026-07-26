import React from 'react';

export const SoraLogo: React.FC<{ className?: string }> = ({ className = 'h-5 sm:h-6' }) => {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        viewBox="0 0 460 135"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto object-contain"
        aria-label="SORA"
      >
        {/* S */}
        <path
          d="M102 28H36C23 28 14 37 14 50V52C14 64 23 72 36 72H80C93 72 102 80 102 93V96C102 109 93 118 80 118H14"
          stroke="currentColor"
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400 hover:text-white transition-colors"
        />
        {/* O */}
        <rect
          x="128"
          y="28"
          width="92"
          height="90"
          rx="26"
          stroke="currentColor"
          strokeWidth="22"
          className="text-neutral-400 hover:text-white transition-colors"
        />
        {/* R */}
        <path
          d="M245 118V28H298C314 28 326 40 326 56V56C326 72 314 80 298 80H245M284 80L326 118"
          stroke="currentColor"
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400 hover:text-white transition-colors"
        />
        {/* A */}
        <path
          d="M342 118L385 28L428 118"
          stroke="currentColor"
          strokeWidth="22"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-neutral-400 hover:text-white transition-colors"
        />
        <circle
          cx="385"
          cy="92"
          r="10"
          fill="currentColor"
          className="text-neutral-400 hover:text-white transition-colors"
        />
      </svg>
    </div>
  );
};
