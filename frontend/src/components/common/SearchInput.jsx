import { useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

const SearchInput = ({ value: externalValue, onChange, placeholder = 'Search...', loading = false, className = '' }) => {
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const debouncedValue = useDebounce(internalValue, 300);

  const handleChange = (e) => {
    const val = e.target.value;
    setInternalValue(val);
    if (onChange) onChange(val);
  };

  const handleClear = () => {
    setInternalValue('');
    if (onChange) onChange('');
  };

  return (
    <div className={`search-input ${className}`}>
      <svg className="search-input__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        className="search-input__field"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {loading && <span className="search-input__spinner" aria-hidden="true" />}
      {internalValue && !loading && (
        <button className="search-input__clear" onClick={handleClear} aria-label="Clear search" type="button">
          ×
        </button>
      )}
    </div>
  );
};

export default SearchInput;
