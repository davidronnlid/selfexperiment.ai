import React, { ReactNode } from "react";

interface TooltipProps {
  text: string;
  children: ReactNode;
}

const Tooltip = ({ text, children }: TooltipProps) => (
  <span className="relative group cursor-help">
    {children}
    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap shadow-lg transition-opacity duration-200 opacity-90">
      {text}
    </span>
  </span>
);

export default Tooltip;
