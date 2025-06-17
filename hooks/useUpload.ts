import { useState, useCallback } from "react";
import {
  audioService,
  TrackUploadData,
  UploadProgress,
} from "../services/AudioService";
import { Alert } from "react-native";

export interface UseUploadResult {
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  uploadTrack: (trackData: TrackUploadData) => Promise<boolean>;
  resetUpload: () => void;
}

export const useUpload = (): UseUploadResult => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadTrack = useCallback(
    async (trackData: TrackUploadData): Promise<boolean> => {
      try {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);

        await audioService.uploadTrack(
          trackData,
          (progress: UploadProgress) => {
            setUploadProgress(progress.progress);

            if (progress.status === "error") {
              setUploadError(progress.error || "Upload failed");
              setIsUploading(false);
            } else if (progress.status === "completed") {
              setIsUploading(false);
            }
          }
        );

        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        setUploadError(errorMessage);
        setIsUploading(false);
        return false;
      }
    },
    []
  );

  const resetUpload = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  return {
    isUploading,
    uploadProgress,
    uploadError,
    uploadTrack,
    resetUpload,
  };
};
