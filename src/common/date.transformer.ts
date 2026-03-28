import { ValueTransformer } from 'typeorm';

function formatDate(value: Date | string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export const dateTransformer: ValueTransformer = {
  to: (value: Date) => value,          // store as-is (PostgreSQL timestamp)
  from: (value: Date) => formatDate(value), // format on read
};
