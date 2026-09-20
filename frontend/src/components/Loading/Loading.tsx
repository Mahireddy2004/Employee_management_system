import React from 'react';

export const Loading: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[40vh] p-6 space-y-3.5 select-none"
    >
      <div
        className="w-9 h-9 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"
        aria-hidden="true"
      />
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 m-0">
        {message}
      </p>
      <span className="sr-only">{message}</span>
    </div>
  );
};

export default Loading;
