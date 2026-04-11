"use client";

import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReferenceImageUploadProps {
  onUpload: (storageId: string) => void;
  onPreviewChange?: (previewUrl: string | null) => void;
  storageId?: string;
}

export function ReferenceImageUpload({
  onUpload,
  onPreviewChange,
  storageId,
}: ReferenceImageUploadProps) {
  const generateUploadUrl = useMutation(api.aiGeneration.generateUploadUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      // Render an optimistic local preview so the drop target reacts
      // immediately, but remember it so we can roll it back if the upload
      // to Convex storage fails. Previously we left the preview in place
      // on failure and only logged — so the user thought a reference image
      // was attached when nothing had actually made it to storage.
      const localPreview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      setPreview(localPreview);
      onPreviewChange?.(localPreview);

      setUploading(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) {
          throw new Error(
            `Upload rejected (${result.status} ${result.statusText})`,
          );
        }
        const body = (await result.json()) as { storageId?: string };
        if (!body.storageId) {
          throw new Error("Upload response missing storageId");
        }
        onUpload(body.storageId);
      } catch (err) {
        console.error("Upload failed:", err);
        // Roll back optimistic state so the UI never claims an attachment
        // that doesn't exist in storage.
        setPreview(null);
        onPreviewChange?.(null);
        onUpload("");
        if (inputRef.current) inputRef.current.value = "";
        toast.error(
          err instanceof Error
            ? `Reference image upload failed: ${err.message}`
            : "Reference image upload failed",
        );
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, onPreviewChange, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onPreviewChange?.(null);
    onUpload("");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (preview || storageId) {
    return (
      <div className="relative group">
        {preview ? (
          <Image
            src={preview}
            alt="Reference"
            width={768}
            height={192}
            className="w-full h-24 object-cover rounded-lg border border-zinc-700"
            unoptimized
          />
        ) : (
          <div className="w-full h-24 rounded-lg border border-zinc-700 bg-accent flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 bg-card/80 hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleRemove}
        >
          <X className="w-3 h-3" />
        </Button>
        {uploading && (
          <div className="absolute inset-0 bg-card/60 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        w-full h-20 rounded-lg border-2 border-dashed cursor-pointer
        flex flex-col items-center justify-center gap-1 transition-colors
        ${
          dragOver
            ? "border-amber-500 bg-amber-500/5"
            : "border-zinc-700 hover:border-zinc-600 bg-zinc-800/30"
        }
      `}
    >
      <Upload className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        Drop reference image or click
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
