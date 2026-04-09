"use client";

import Image from "next/image";
import { useState, useCallback, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Upload, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReferenceImageUploadProps {
  onUpload: (storageId: string) => void;
  storageId?: string;
}

export function ReferenceImageUpload({
  onUpload,
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

      // Show local preview immediately
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setUploading(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId: id } = await result.json();
        onUpload(id);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setUploading(false);
      }
    },
    [generateUploadUrl, onUpload]
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
          <div className="w-full h-24 rounded-lg border border-zinc-700 bg-zinc-800/50 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-zinc-500" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 bg-zinc-900/80 hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleRemove}
        >
          <X className="w-3 h-3" />
        </Button>
        {uploading && (
          <div className="absolute inset-0 bg-zinc-900/60 rounded-lg flex items-center justify-center">
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
      <Upload className="w-4 h-4 text-zinc-500" />
      <span className="text-xs text-zinc-500">
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
