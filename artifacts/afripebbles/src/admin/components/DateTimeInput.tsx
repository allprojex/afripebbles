import { Input } from "@/components/ui/input";
import { toDatetimeLocalValue, fromDatetimeLocalValue } from "../lib/datetime";

export function DateTimeInput({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <Input type="datetime-local" value={toDatetimeLocalValue(value)} onChange={(e) => onChange(fromDatetimeLocalValue(e.target.value))} />
  );
}
