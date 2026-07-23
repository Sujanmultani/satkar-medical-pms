import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { searchSuppliers } from '@/services/supplierService';
import { Building2 } from 'lucide-react';

export function SupplierAutocomplete({
  value = '',
  onChange,
  placeholder = 'e.g. Cipla Pharma Distributors',
  className = '',
  id,
  required = false,
}) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = async (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);

    if (val.trim()) {
      try {
        const res = await searchSuppliers(val);
        setSuggestions(res.data || []);
        setIsOpen(true);
      } catch (err) {
        console.error('Failed to search suppliers:', err);
      }
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  };

  const handleFocus = async () => {
    try {
      const res = await searchSuppliers(query);
      setSuggestions(res.data || []);
      setIsOpen(true);
    } catch (err) {
      console.error('Failed to fetch suppliers on focus:', err);
    }
  };

  const handleSelect = (supplierName) => {
    setQuery(supplierName);
    if (onChange) onChange(supplierName);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <Input
        id={id}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        className={className}
        autoComplete="off"
      />

      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-gray-100">
          {suggestions.map((sup) => (
            <div
              key={sup._id}
              onClick={() => handleSelect(sup.name)}
              className="p-2.5 hover:bg-teal-50 cursor-pointer flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-secondary" />
                <span className="font-semibold text-primary">{sup.name}</span>
              </div>
              {sup.phone && <span className="text-[10px] text-muted font-mono">{sup.phone}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SupplierAutocomplete;
