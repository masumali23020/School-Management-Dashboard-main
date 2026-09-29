// components/results/MarkInputCell.tsx
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

interface MarkInputCellProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  maxMarks?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MarkInputCell({ 
  value, 
  onChange, 
  maxMarks = 100, 
  placeholder = "-",
  className = "",
  disabled = false
}: MarkInputCellProps) {
  const [inputValue, setInputValue] = useState<string>(value?.toString() || "");

  useEffect(() => {
    setInputValue(value?.toString() || "");
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (newValue === "") {
      onChange(undefined);
      return;
    }
    
    const numValue = parseInt(newValue);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= maxMarks) {
      onChange(numValue);
    }
  };

  const handleBlur = () => {
    if (inputValue === "") return;
    
    const numValue = parseInt(inputValue);
    if (isNaN(numValue) || numValue < 0) {
      setInputValue("");
      onChange(undefined);
    } else if (numValue > maxMarks) {
      setInputValue(maxMarks.toString());
      onChange(maxMarks);
    }
  };

  return (
    <Input
      type="number"
      min="0"
      max={maxMarks}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-20 mx-auto text-center transition-all duration-200 
        ${value ? 'border-green-400 bg-green-50' : 'border-gray-200'} 
        hover:border-purple-400 focus:ring-2 focus:ring-purple-400
        ${className}`}
    />
  );
}