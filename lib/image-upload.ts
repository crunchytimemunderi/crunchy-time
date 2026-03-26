import { supabase } from "./supabase";
import { logger } from "./logger";

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param folder - Optional folder path within the bucket (default: 'menu-items')
 * @returns The public URL of the uploaded image or null if failed
 */
export async function uploadImage(
  file: File,
  folder: string = "menu-items",
): Promise<string | null> {
  try {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("File must be an image");
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new Error("Image size must be less than 2MB");
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("menu-images")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      logger.error("Upload error:", error);
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("menu-images").getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    logger.error("Error uploading image:", error);
    return null;
  }
}

/**
 * Delete an image from Supabase Storage
 * @param imageUrl - The full public URL of the image
 * @returns true if successful, false otherwise
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract filename from URL
    const urlParts = imageUrl.split("/menu-images/");
    if (urlParts.length < 2) {
      logger.error("Invalid image URL format");
      return false;
    }

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from("menu-images")
      .remove([filePath]);

    if (error) {
      logger.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error deleting image:", error);
    return false;
  }
}

/**
 * Compress and resize an image before upload
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 800px)
 * @param maxHeight - Maximum height (default: 800px)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Compressed image file
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error("Canvas to Blob conversion failed"));
            }
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Image load failed"));
    };
    reader.onerror = () => reject(new Error("File read failed"));
  });
}
