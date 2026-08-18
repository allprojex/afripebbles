import { useRef, useState } from "react";
import { X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadDigitalFile } from "../lib/adminApi";

interface DigitalFileUploaderProps {
  value: string | null;
  onChange: (path: string | null) => void;
  label?: string;
}

/**
 * Uploads into the private digital-downloads bucket. Unlike ImageUploader,
 * there is nothing to preview — value is an opaque storage path, never a
 * public URL, and it's never fetchable directly from the browser.
 */
export function DigitalFileUploader({ value, onChange, label = "Digital file" }: DigitalFileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const path = await uploadDigitalFile(file);
      onChange(path);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {value ? (
        <div className="flex items-center gap-3 border border-border rounded-lg p-3 max-w-sm">
          <FileText size={18} className="text-primary shrink-0" />
          <span className="text-sm truncate flex-1" title={value}>
            {value}
          </span>
          <button type="button" onClick={() => onChange(null)} aria-label="Remove file" className="text-foreground/50 hover:text-destructive">
            <X size={14} />
          </button>
        </div>
      ) : (
        <p className="text-sm text-foreground/40">No file uploaded</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,application/zip,application/epub+zip,.pdf,.zip,.epub"
        className="hidden"
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? "Uploading…" : value ? "Replace file" : "Upload file"}
      </Button>
      <p className="text-xs text-foreground/50">PDF, ZIP, or EPUB — up to 50MB. Never exposed publicly; only a paid order can generate a download link.</p>
    </div>
  );
}
