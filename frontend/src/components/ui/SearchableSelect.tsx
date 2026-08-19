import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seçiniz...',
  className = '',
  disabled = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div 
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg flex items-center justify-between cursor-pointer bg-white transition-shadow ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'focus-within:ring-2 focus-within:ring-indigo-500 hover:border-gray-400'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
      >
        <span className={`truncate ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <div 
              className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearchQuery('');
              }}
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              className="w-full text-sm outline-none bg-transparent"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-60 overflow-y-auto overscroll-contain">
            <div 
              className="px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => { onChange(''); setIsOpen(false); setSearchQuery(''); }}
            >
              -- Temizle --
            </div>
            {filteredOptions.map(opt => (
              <div
                key={opt.value}
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${opt.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-gray-50 text-gray-700'}`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
              >
                {opt.label}
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-4 py-4 text-sm text-gray-500 text-center italic">Sonuç bulunamadı</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
