import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import { getSuppliers } from '@/services/supplierService';
import { Building2, ChevronDown } from 'lucide-react';

export function SupplierAutocomplete({
  value = '',
  onChange,
  placeholder = 'e.g. Cipla Pharma Distributors',
  className = '',
  id,
  required = false,
}) {
  const [query, setQuery] = useState(value);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial suppliers on focus or mount
  const loadSuppliers = async () => {
    try {
      const res = await getSuppliers({ limit: 50 });
      const list = res.data || [];
      setAllSuppliers(list);
      filterList(query, list);
    } catch (err) {
      console.error('Failed to fetch suppliers for combobox:', err);
    }
  };

  const filterList = (q, list = allSuppliers) => {
    if (!q || !q.trim()) {
      setFilteredSuppliers(list);
    } else {
      const lower = q.trim().toLowerCase();
      // Substring match on supplier name
      const matched = list.filter((s) => s.name && s.name.toLowerCase().includes(lower));
      setFilteredSuppliers(matched);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);
    filterList(val);
    setHighlightedIndex(0);
    setIsOpen(true);
  };

  const handleFocus = () => {
    loadSuppliers();
    setIsOpen(true);
  };

  const handleSelect = (supplierName) => {
    setQuery(supplierName);
    if (onChange) onChange(supplierName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredSuppliers.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredSuppliers.length - 1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredSuppliers[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredSuppliers[highlightedIndex].name);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative w-full">
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={`${className} pr-8`}
          autoComplete="off"
        />
        <ChevronDown 
          onClick={() => {
            if (!isOpen) handleFocus();
            setIsOpen(!isOpen);
          }}
          className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer hover:text-primary transition-colors" 
        />
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-gray-100 animate-fadeIn">
          {filteredSuppliers.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted">
              {query ? (
                <>
                  <p className="font-semibold text-primary">"{query}"</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">New supplier — will be created automatically on submit.</p>
                </>
              ) : (
                <p>No existing suppliers. Type a new supplier name.</p>
              )}
            </div>
          ) : (
            <>
              {filteredSuppliers.map((sup, idx) => (
                <div
                  key={sup._id || idx}
                  onClick={() => handleSelect(sup.name)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`p-2.5 cursor-pointer flex items-center justify-between text-xs transition-colors ${
                    idx === highlightedIndex ? 'bg-teal-50 text-primary font-bold' : 'hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                    <span>{sup.name}</span>
                  </div>
                  {sup.phone && <span className="text-[10px] font-mono text-muted">{sup.phone}</span>}
                </div>
              ))}
              {filteredSuppliers.length >= 50 && (
                <div className="p-2 text-center text-[10px] text-muted bg-gray-50 font-mono">
                  Keep typing to narrow down...
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SupplierAutocomplete;
