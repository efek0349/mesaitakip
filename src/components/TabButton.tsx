import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TabButtonProps<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  activeTab: T;
  setActiveTab: (tab: T) => void;
  variant?: 'horizontal' | 'vertical';
  className?: string;
  iconSize?: number;
  fontSize?: string;
  activeGradient?: string;
  roundedSize?: 'xl' | '2xl';
  shadowSize?: string;
  borderBottomColor?: string;
}

const roundedMap = {
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl'
} as const;

const TabButtonInner = <T extends string>({
  id,
  label,
  icon: Icon,
  activeTab,
  setActiveTab,
  variant = 'vertical',
  className = '',
  iconSize = 16,
  fontSize = 'text-[8px]',
  activeGradient = 'from-indigo-500 to-indigo-700',
  roundedSize = '2xl',
  shadowSize = 'shadow-[0_4px_8px_-2px_rgba(79,70,229,0.4),inset_0_2px_4px_rgba(255,255,255,0.3)]',
  borderBottomColor = 'border-indigo-800'
}: TabButtonProps<T>) => {
  const isActive = activeTab === id;
  const roundedClass = roundedMap[roundedSize];
  
  return (
    <button
      onClick={() => setActiveTab(id)}
      role="tab"
      aria-selected={isActive}
      className={`group relative flex items-center justify-center transition-all duration-300 active:scale-95 overflow-hidden outline-none ${
        variant === 'vertical' ? 'flex-col py-2 px-1 gap-1' : 'flex-row py-2 px-3 gap-2'
      } ${roundedClass} ${
        isActive 
          ? `bg-gradient-to-br ${activeGradient} text-white ${shadowSize} border-b-4 ${borderBottomColor} z-10` 
          : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 border-b-4 border-gray-200 dark:border-gray-950 hover:bg-white dark:hover:bg-gray-700'
      } ${className}`}
    >
      {isActive && <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />}
      <Icon size={iconSize} strokeWidth={isActive ? 3 : 2} className="relative z-10" />
      <span className={`${fontSize} font-black uppercase tracking-tighter relative z-10 transition-all ${
        isActive ? 'opacity-100' : 'opacity-60'
      }`}>
        {label}
      </span>
    </button>
  );
};

const MemoizedTabButton = React.memo(TabButtonInner);
MemoizedTabButton.displayName = 'TabButton';

export const TabButton = MemoizedTabButton as typeof TabButtonInner;
