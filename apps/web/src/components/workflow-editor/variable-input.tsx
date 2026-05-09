"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface VariableOption {
  expr: string;
  desc: string;
  category: string;
}

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  variables: VariableOption[];
  multiline?: boolean;
}

export function VariableInput({
  value,
  onChange,
  placeholder,
  className,
  variables,
  multiline = false,
}: VariableInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!filter) return variables;
    const q = filter.toLowerCase();
    return variables.filter(
      (v) =>
        v.expr.toLowerCase().includes(q) ||
        v.desc.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q),
    );
  }, [variables, filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, VariableOption[]> = {};
    for (const v of filtered) {
      if (!groups[v.category]) groups[v.category] = [];
      groups[v.category].push(v);
    }
    return groups;
  }, [filtered]);

  const flatFiltered = useMemo(() => filtered, [filtered]);

  const checkTrigger = useCallback(
    (text: string, pos: number) => {
      const before = text.slice(0, pos);
      const match = before.match(/\{\{([^}]*)$/);
      if (match) {
        setFilter(match[1]);
        setShowDropdown(true);
        setSelectedIndex(0);
      } else {
        setShowDropdown(false);
        setFilter("");
      }
    },
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const pos = e.target.selectionStart || 0;
      setCursorPos(pos);
      onChange(newValue);
      checkTrigger(newValue, pos);
    },
    [onChange, checkTrigger],
  );

  const handleSelect = useCallback(
    (variable: VariableOption) => {
      const el = inputRef.current;
      if (!el) return;

      const before = value.slice(0, cursorPos);
      const after = value.slice(cursorPos);
      const triggerStart = before.lastIndexOf("{{");

      if (triggerStart === -1) return;

      const newValue =
        before.slice(0, triggerStart) + variable.expr + after;
      onChange(newValue);
      setShowDropdown(false);
      setFilter("");

      requestAnimationFrame(() => {
        const newPos = triggerStart + variable.expr.length;
        el.focus();
        el.setSelectionRange(newPos, newPos);
      });
    },
    [value, cursorPos, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || flatFiltered.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % flatFiltered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + flatFiltered.length) % flatFiltered.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelect(flatFiltered[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [showDropdown, flatFiltered, selectedIndex, handleSelect],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const pos = (e.target as HTMLInputElement).selectionStart || 0;
      setCursorPos(pos);
      checkTrigger(value, pos);
    },
    [value, checkTrigger],
  );

  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown || !dropdownRef.current) return;
    const selected = dropdownRef.current.querySelector("[data-selected=true]");
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, showDropdown]);

  const sharedProps = {
    value,
    onChange: handleChange as React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>,
    onKeyDown: handleKeyDown,
    onClick: handleClick,
    placeholder,
  };

  let flatIndex = 0;

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          {...sharedProps}
          className={cn(
            "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y",
            className,
          )}
        />
      ) : (
        <Input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          {...sharedProps}
          className={cn("h-9", className)}
        />
      )}

      {showDropdown && flatFiltered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg"
        >
          {Object.entries(grouped).map(([category, vars]) => (
            <div key={category}>
              <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 sticky top-0 bg-popover">
                {category}
              </div>
              {vars.map((v) => {
                const idx = flatIndex++;
                return (
                  <button
                    key={v.expr}
                    type="button"
                    data-selected={idx === selectedIndex}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-muted/50 cursor-pointer",
                      idx === selectedIndex && "bg-muted",
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(v);
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <code className="text-[11px] font-mono text-primary/80 bg-primary/5 px-1 rounded shrink-0">
                      {v.expr}
                    </code>
                    <span className="text-xs text-muted-foreground truncate">
                      {v.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
