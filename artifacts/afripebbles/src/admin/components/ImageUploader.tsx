import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { uploadImage, deleteImage } from "../lib/adminApi";
import type { StorageBucket } from "../lib/buckets";

interface ImageUploaderProps {
  bucket: StorageBucket;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

export function ImageUploader({ bucket, value, onChange, label = "Image" }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadImage(bucket, file);
      const previous = value;
      onChange(url);
      if (previous) void deleteImage(previous);
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

  const handleRemove = () => {
    if (value) void deleteImage(value);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {value ? (
        <div className="relative w-40 aspect-square rounded-lg overflow-hidden border border-border bg-muted">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-1 right-1 bg-background/90 hover:bg-background rounded-full p-1"
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="w-40 aspect-square rounded-lg border border-dashed border-border flex items-center justify-center text-foreground/40 text-xs text-center px-2">
          No image
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        aria-label={label}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
      </Button>
    </div>
  );
}
