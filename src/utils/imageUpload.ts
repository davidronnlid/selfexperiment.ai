import { supabase } from "./supaBase";

export interface UploadedImage {
  id?: number;
  imagePath: string;
  imageUrl: string;
  originalFilename: string;
  fileSize: number;
  contentType: string;
}

export interface ImageUploadProgress {
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

/**
 * Uploads an image to Supabase storage and saves metadata to database
 */
export async function uploadNotesImage(
  file: File,
  userId: string,
  dataPointId?: number,
  onProgress?: (progress: ImageUploadProgress) => void
): Promise<UploadedImage> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('Image must be smaller than 10MB');
    }

    onProgress?.({ progress: 10, status: 'uploading' });

    // Generate unique filename
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}-${randomId}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    onProgress?.({ progress: 30, status: 'uploading' });

    // Upload to Supabase storage - try multiple bucket names
    let uploadError: any = null;
    let bucketName = 'notes-images';
    
    // First try to create the bucket if it doesn't exist
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.find(bucket => bucket.name === 'notes-images');
      
      if (!bucketExists) {
        console.log('Creating notes-images bucket...');
        const { error: createError } = await supabase.storage.createBucket('notes-images', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 10 * 1024 * 1024 // 10MB
        });
        
        if (createError) {
          console.warn('Could not create notes-images bucket:', createError);
          // Fall back to trying other common bucket names
          bucketName = 'images';
        }
      }
    } catch (error) {
      console.warn('Error checking/creating bucket:', error);
      bucketName = 'images';
    }
    
    // Try uploading to the bucket
    const { error: firstUploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (firstUploadError && bucketName === 'notes-images') {
      // Try fallback bucket
      bucketName = 'images';
      const { error: secondUploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      uploadError = secondUploadError;
    } else {
      uploadError = firstUploadError;
    }

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    onProgress?.({ progress: 70, status: 'uploading' });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    onProgress?.({ progress: 90, status: 'uploading' });

    // Save metadata to database
    const { data: imageData, error: dbError } = await supabase
      .from('notes_images')
      .insert({
        user_id: userId,
        data_point_id: dataPointId || null,
        image_path: filePath,
        image_url: urlData.publicUrl,
        original_filename: file.name,
        file_size: file.size,
        content_type: file.type
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file if database save fails
      await supabase.storage.from(bucketName).remove([filePath]);
      throw new Error(`Database error: ${dbError.message}`);
    }

    onProgress?.({ progress: 100, status: 'completed' });

    return {
      id: imageData.id,
      imagePath: filePath,
      imageUrl: urlData.publicUrl,
      originalFilename: file.name,
      fileSize: file.size,
      contentType: file.type
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed';
    onProgress?.({ progress: 0, status: 'error', error: errorMessage });
    throw error;
  }
}

/**
 * Delete an image from storage and database
 */
export async function deleteNotesImage(
  imageId: number,
  userId: string
): Promise<void> {
  try {
    // Get image path from database
    const { data: imageData, error: fetchError } = await supabase
      .from('notes_images')
      .select('image_path')
      .eq('id', imageId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !imageData) {
      throw new Error('Image not found or access denied');
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('notes-images')
      .remove([imageData.image_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database deletion even if storage fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('notes_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId);

    if (dbError) {
      throw new Error(`Database deletion error: ${dbError.message}`);
    }

  } catch (error) {
    console.error('Delete image error:', error);
    throw error;
  }
}

/**
 * Get images for a specific data point
 */
export async function getDataPointImages(
  dataPointId: number,
  userId: string
): Promise<UploadedImage[]> {
  try {
    const { data, error } = await supabase
      .from('notes_images')
      .select('*')
      .eq('data_point_id', dataPointId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch images: ${error.message}`);
    }

    return data.map(img => ({
      id: img.id,
      imagePath: img.image_path,
      imageUrl: img.image_url,
      originalFilename: img.original_filename,
      fileSize: img.file_size,
      contentType: img.content_type
    }));

  } catch (error) {
    console.error('Get images error:', error);
    throw error;
  }
}

/**
 * Update data point association for temporarily uploaded images
 */
export async function associateImagesWithDataPoint(
  imageIds: number[],
  dataPointId: number,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('notes_images')
      .update({ data_point_id: dataPointId })
      .in('id', imageIds)
      .eq('user_id', userId)
      .is('data_point_id', null);

    if (error) {
      throw new Error(`Failed to associate images: ${error.message}`);
    }
  } catch (error) {
    console.error('Associate images error:', error);
    throw error;
  }
}

/**
 * Compress image if needed (basic implementation)
 */
export function compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file); // Fallback to original
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
} 