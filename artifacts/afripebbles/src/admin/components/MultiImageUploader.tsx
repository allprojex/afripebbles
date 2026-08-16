import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadImage } from "../lib/adminApi";
import type { StorageBucket } from "../lib/buckets";

interface MultiImageUploaderProps {
  bucket: StorageBucket;
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
}

/**
 * Adding or removing an image only ever changes local form state here — it
 * never deletes a file from storage. That happens server-side, after the
 * content record is actually saved, so a removed image is never lost if the
 * admin cancels or the save fails validation.
 */
export function MultiImageUploader({ bucket, value, onChange, label = "Additional images" }: MultiImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFiles = async (files: FileList) => {
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        uploaded.push(await uploadImage(bucket, file));
      }
      onChange([...value, ...uploaded]);
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

  const handleRemove = (url: string) => {
    onChange(value.filter((u) => u !== url));
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((url) => (
            <div key={url} className="relative w-24 aspect-square rounded-lg overflow-hidden border border-border bg-muted">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-1 right-1 bg-background/90 hover:bg-background rounded-full p-0.5"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-label={label}
        onChange={(e) => {
          if (e.target.files) void handleFiles(e.target.files);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? "Uploading…" : "Add images"}
      </Button>
    </div>
  );
}
