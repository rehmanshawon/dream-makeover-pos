import { useId, useMemo, useState, type JSX, type KeyboardEvent } from 'react';
import { Input, type InputProps } from '../Input';
import './SearchInput.css';

export interface SearchInputProps extends Omit<InputProps, 'value' | 'onChange' | 'onKeyDown'> {
  value: string;
  suggestions: readonly string[];
  onValueChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}

export function SearchInput({
  value,
  suggestions,
  onValueChange,
  onKeyDown,
  onFocus,
  onBlur,
  ...inputProps
}: SearchInputProps): JSX.Element {
  const listId = `search-suggestions-${useId()}`;
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = useMemo(() => {
    const query = value.trim().toLocaleLowerCase();
    if (!focused || !query) return [];

    const seen = new Set<string>();
    return suggestions
      .map((suggestion) => suggestion.trim())
      .filter((suggestion) => {
        const normalized = suggestion.toLocaleLowerCase();
        if (!suggestion || !normalized.includes(query) || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .slice(0, 8);
  }, [focused, suggestions, value]);

  const chooseSuggestion = (suggestion: string): void => {
    onValueChange(suggestion);
    setFocused(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === 'ArrowDown' && matches.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % matches.length);
    } else if (event.key === 'ArrowUp' && matches.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? matches.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      chooseSuggestion(matches[activeIndex]);
    } else if (event.key === 'Escape') {
      setFocused(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="search-input">
      <Input
        {...inputProps}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined}
        onChange={(event) => {
          onValueChange(event.target.value);
          setActiveIndex(-1);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          setFocused(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          setFocused(false);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
      />
      {matches.length > 0 && (
        <div className="search-input__suggestions" id={listId} role="listbox">
          {matches.map((suggestion, index) => (
            <button
              key={suggestion}
              id={`${listId}-option-${index}`}
              className="search-input__suggestion"
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
