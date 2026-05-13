"use client";

interface LocaleDateProps {
  date: Date | string;
  className?: string;
}

export function LocaleDate({ date, className }: LocaleDateProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  return <span className={className}>{d.toLocaleString()}</span>;
}

export function LocaleDatetime({ date, className }: LocaleDateProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  return <time className={className}>{d.toLocaleString()}</time>;
}
