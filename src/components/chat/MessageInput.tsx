"use client";

import { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { Send } from "lucide-react";

const MAX_CHARS = 2000;

interface MessageInputProps {
  input: string;
  handleInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
}

export function MessageInput({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
}: MessageInputProps) {
  const charCount = input.length;
  const isNearLimit = charCount > MAX_CHARS * 0.8;
  const isOverLimit = charCount > MAX_CHARS * 0.95;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative p-4 bg-white border-t border-neutral-200/60">
      <div className="relative max-w-4xl mx-auto">
        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Describe the React component you want to create..."
          disabled={isLoading}
          className="w-full min-h-[80px] max-h-[200px] pl-4 pr-14 py-3.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-neutral-900 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 focus:bg-white transition-all placeholder:text-neutral-400 text-[15px] font-normal shadow-sm"
          rows={3}
        />
        <button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="absolute right-3 bottom-3 p-2.5 rounded-lg transition-all hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent group"
        >
          <Send className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${isLoading || !input.trim() ? 'text-neutral-300' : 'text-blue-600'}`} />
        </button>
      </div>
      <p className={`text-xs text-right mt-1 tabular-nums ${
        isOverLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-neutral-400'
      }`}>
        {charCount} / {MAX_CHARS}
      </p>
    </form>
  );
}