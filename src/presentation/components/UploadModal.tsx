import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

// Import your stores
import { useAuthStore } from "../../persistence/stores/authStore";
import { useTracksStore } from "../../persistence/stores/tracksStore";

const { width, height } = Dimensions.get("window");

interface UploadModalProps {
  visible: boolean;
  onClose: () => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ visible, onClose }) => {
  // Get user and tracks store
  const { user } = useAuthStore();
  const { createTrack, loading: storeLoading } = useTracksStore();

  const [uploadData, setUploadData] = useState({
    title: "",
    artist: "",
    album: "",
    genre: "",
    description: "",
    audioFile: null as DocumentPicker.DocumentPickerResult | null,
    coverImage: null as ImagePicker.ImagePickerResult | null,
    isUploading: false,
    uploadProgress: 0,
    statusMessage: "",
    uploadAbortController: null as AbortController | null,
  });

  // Animation refs
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/mp3", "audio/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];

        // Validate file type (MP3)
        const isValidType =
          file.mimeType?.includes("audio") ||
          file.name?.toLowerCase().endsWith(".mp3") ||
          file.name?.toLowerCase().endsWith(".wav") ||
          file.name?.toLowerCase().endsWith(".flac");

        if (!isValidType) {
          Alert.alert(
            "Invalid File",
            "Please select an MP3, WAV, or FLAC audio file"
          );
          return;
        }

        // Validate file size (max 50MB, warn at 20MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        const warnSize = 20 * 1024 * 1024; // 20MB

        if (file.size && file.size > maxSize) {
          Alert.alert(
            "File Too Large",
            "Please select a file smaller than 50MB"
          );
          return;
        }

        if (file.size && file.size > warnSize) {
          Alert.alert(
            "Large File Warning",
            `This file is ${(file.size / 1024 / 1024).toFixed(
              2
            )} MB. Large files may take longer to upload. Continue?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Continue",
                onPress: () => {
                  console.log("📁 Large file approved by user:", {
                    name: file.name,
                    size: file.size,
                    type: file.mimeType,
                    uri: file.uri,
                  });

                  setUploadData((prev) => ({ ...prev, audioFile: result }));

                  Alert.alert(
                    "File Selected",
                    `Selected: ${file.name} (${
                      file.size
                        ? (file.size / 1024 / 1024).toFixed(2)
                        : "Unknown"
                    } MB)`
                  );
                },
              },
            ]
          );
          return;
        }

        console.log("📁 Valid audio file selected:", {
          name: file.name,
          size: file.size,
          type: file.mimeType,
          uri: file.uri,
        });

        setUploadData((prev) => ({ ...prev, audioFile: result }));

        Alert.alert(
          "File Selected",
          `Selected: ${file.name} (${
            file.size ? (file.size / 1024 / 1024).toFixed(2) : "Unknown"
          } MB)`
        );
      }
    } catch (error) {
      console.error("❌ Error selecting audio file:", error);
      Alert.alert("Error", "Failed to select audio file. Please try again.");
    }
  };

  const handleCoverSelect = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log("🖼️ Cover image selected:", result.assets[0].fileName);
        setUploadData((prev) => ({ ...prev, coverImage: result }));
      }
    } catch (error) {
      console.error("❌ Error selecting cover image:", error);
      Alert.alert("Error", "Failed to select cover image. Please try again.");
    }
  };

  const handleUpload = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to upload tracks");
      return;
    }

    if (!uploadData.title.trim()) {
      Alert.alert("Missing Information", "Please provide a track title");
      return;
    }

    if (!uploadData.audioFile) {
      Alert.alert("Missing File", "Please select an audio file to upload");
      return;
    }

    setUploadData((prev) => ({
      ...prev,
      isUploading: true,
      uploadProgress: 0,
      statusMessage: "Preparing upload...",
    }));

    try {
      console.log("🔄 Starting upload:", uploadData.title);

      // Validate audio file exists and has assets
      if (!uploadData.audioFile?.assets?.[0]) {
        throw new Error("No valid audio file selected");
      }

      const audioFile = uploadData.audioFile.assets[0];
      console.log("📁 File details:", {
        name: audioFile.name,
        size: audioFile.size,
        type: audioFile.mimeType,
        uri: audioFile.uri,
      });

      // Prepare track data for your tracksStore
      const trackData = {
        title: uploadData.title.trim(),
        genre: uploadData.genre.trim() || null,
        album: uploadData.album.trim() || null,
        description: uploadData.description.trim() || null,
        audioFile: audioFile, // Get the actual file
      };

      // Progressive status updates with timeouts
      const updateProgress = (progress: number, message: string) => {
        console.log(`📊 Upload progress: ${progress}% - ${message}`);
        setUploadData((prev) => ({
          ...prev,
          uploadProgress: progress,
          statusMessage: message,
        }));
      };

      // Step 1: Validate file
      updateProgress(10, "Validating audio file...");
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Start upload
      updateProgress(20, "Starting file upload...");
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 3: Upload file with better progress tracking
      updateProgress(30, "Uploading to storage...");

      // Determine timeout based on file size (very generous for large files)
      const fileSizeMB = (audioFile.size || 0) / (1024 * 1024);
      const baseTimeout = 180000; // 3 minutes base (increased from 2)
      const sizeMultiplier = Math.min(fileSizeMB * 20000, 900000); // Up to 15 more minutes for large files (increased from 8)
      const uploadTimeout = baseTimeout + sizeMultiplier;

      console.log(
        `⏰ Starting createTrack with ${Math.round(
          uploadTimeout / 1000
        )}s timeout for ${fileSizeMB.toFixed(2)}MB file`
      );
      console.log("📋 Track data being sent:", {
        ...trackData,
        audioFile: `${audioFile.name} (${audioFile.size || "Unknown"} bytes)`,
      });

      // Create upload promise with progress simulation
      const uploadPromise = (async () => {
        const progressInterval = setInterval(() => {
          setUploadData((prev) => {
            if (prev.uploadProgress < 85) {
              const increment = Math.random() * 5 + 2; // Random increment between 2-7%
              const newProgress = Math.min(prev.uploadProgress + increment, 85);
              return {
                ...prev,
                uploadProgress: newProgress,
                statusMessage:
                  newProgress < 50
                    ? "Uploading file..."
                    : newProgress < 75
                    ? "Processing audio..."
                    : "Saving to database...",
              };
            }
            return prev;
          });
        }, 2000); // Update every 2 seconds

        try {
          const result = await createTrack(user.id, trackData);
          clearInterval(progressInterval);
          return result;
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }
      })();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Upload timeout after ${Math.round(
                  uploadTimeout / 1000
                )} seconds. Please try with a smaller file or check your internet connection.`
              )
            ),
          uploadTimeout
        )
      );

      // Race between upload and timeout
      const success = await Promise.race([uploadPromise, timeoutPromise]);

      console.log("✅ Upload result:", success);
      console.log(
        "✅ Upload completed successfully at:",
        new Date().toISOString()
      );

      if (success) {
        updateProgress(90, "Finalizing upload...");
        await new Promise((resolve) => setTimeout(resolve, 500));

        updateProgress(100, "Upload complete!");

        setTimeout(() => {
          Alert.alert(
            "🎉 Upload Successful!",
            `"${uploadData.title}" has been uploaded successfully!`,
            [
              {
                text: "Great!",
                onPress: () => {
                  handleClose();
                },
              },
            ]
          );
        }, 500);
      } else {
        throw new Error("Upload failed - createTrack returned false");
      }
    } catch (error) {
      console.error("❌ Upload error:", error);
      console.error(
        "❌ Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      const isTimeout = errorMessage.includes("timeout");
      const isNetworkError =
        errorMessage.includes("fetch") || errorMessage.includes("network");
      const isFileSizeError =
        errorMessage.includes("too large") || errorMessage.includes("Payload");

      // Get file size for error message
      const currentFile = uploadData.audioFile?.assets?.[0];
      const currentFileSizeMB = (currentFile?.size || 0) / (1024 * 1024);

      let alertTitle = "Upload Failed";
      let alertMessage = `Failed to upload track: ${errorMessage}`;

      if (isTimeout) {
        alertTitle = "Upload Taking Too Long";
        alertMessage = `The upload timed out. For large files (${currentFileSizeMB.toFixed(
          1
        )}MB), try:\n\n• Use a smaller file (under 20MB recommended)\n• Check your internet connection\n• Retry during off-peak hours`;
      } else if (isFileSizeError) {
        alertTitle = "File Too Large";
        alertMessage =
          "The file is too large for upload. Please use a file smaller than 50MB or compress your audio file.";
      } else if (isNetworkError) {
        alertTitle = "Network Error";
        alertMessage =
          "Network connection issue. Please check your internet connection and try again.";
      }

      Alert.alert(alertTitle, alertMessage, [
        {
          text:
            isTimeout || isFileSizeError ? "Choose Different File" : "Retry",
          onPress: () => {
            if (isTimeout || isFileSizeError) {
              // Reset file selection for timeout/size errors
              setUploadData((prev) => ({
                ...prev,
                title: "",
                genre: "",
                album: "",
                description: "",
                audioFile: null,
                isUploading: false,
                uploadProgress: 0,
                statusMessage: "",
              }));
            } else {
              // Just reset upload state for other errors
              setUploadData((prev) => ({
                ...prev,
                isUploading: false,
                uploadProgress: 0,
                statusMessage: "",
              }));
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            resetForm();
          },
        },
      ]);
    }
  };

  const handleClose = () => {
    if (uploadData.isUploading) {
      Alert.alert(
        "Upload in Progress",
        "Are you sure you want to cancel the upload?",
        [
          { text: "Continue Uploading", style: "cancel" },
          {
            text: "Cancel Upload",
            style: "destructive",
            onPress: () => {
              resetForm();
              onClose();
            },
          },
        ]
      );
      return;
    }

    resetForm();
    onClose();
  };

  const resetForm = () => {
    setUploadData({
      title: "",
      artist: "",
      album: "",
      genre: "",
      description: "",
      audioFile: null,
      coverImage: null,
      isUploading: false,
      uploadProgress: 0,
      statusMessage: "",
      uploadAbortController: null,
    });
  };

  // Check if upload can be enabled
  const canUpload =
    uploadData.title.trim() &&
    uploadData.audioFile &&
    !uploadData.isUploading &&
    !storeLoading;

  // Common genres for quick selection
  const commonGenres = [
    "Hip-Hop",
    "Electronic",
    "Pop",
    "Rock",
    "Jazz",
    "Classical",
    "R&B",
    "Country",
    "Reggae",
    "Blues",
    "Folk",
    "Indie",
  ];

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" />
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <LinearGradient
            colors={["#1A0A1A", "#0A0A0A"]}
            style={styles.modalGradient}
          >
            {/* Handle Bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={handleClose}
                disabled={uploadData.isUploading}
                style={styles.headerButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={uploadData.isUploading ? "#666" : "#FFFFFF"}
                />
              </TouchableOpacity>

              <View style={styles.headerTitleContainer}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color="#8B5CF6"
                />
                <Text style={styles.modalTitle}>Upload Track</Text>
              </View>

              <TouchableOpacity
                onPress={handleUpload}
                disabled={!canUpload}
                style={[
                  styles.headerButton,
                  !canUpload && styles.headerButtonDisabled,
                ]}
              >
                {uploadData.isUploading || storeLoading ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <LinearGradient
                    colors={
                      canUpload ? ["#8B5CF6", "#A855F7"] : ["#666", "#666"]
                    }
                    style={styles.uploadButtonGradient}
                  >
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Track Title Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Track Title <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="musical-note-outline"
                    size={20}
                    color="#8B5CF6"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your track title"
                    placeholderTextColor="#666"
                    value={uploadData.title}
                    onChangeText={(text) =>
                      setUploadData((prev) => ({ ...prev, title: text }))
                    }
                    editable={!uploadData.isUploading}
                  />
                </View>
              </View>

              {/* Genre Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Genre</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="radio-outline"
                    size={20}
                    color="#8B5CF6"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Pop, Rock, Hip-Hop"
                    placeholderTextColor="#666"
                    value={uploadData.genre}
                    onChangeText={(text) =>
                      setUploadData((prev) => ({ ...prev, genre: text }))
                    }
                    editable={!uploadData.isUploading}
                  />
                </View>
                {/* Quick Genre Selection */}
                <View style={styles.genreChips}>
                  {commonGenres.map((genreOption) => (
                    <TouchableOpacity
                      key={genreOption}
                      style={[
                        styles.genreChip,
                        uploadData.genre === genreOption &&
                          styles.genreChipSelected,
                      ]}
                      onPress={() =>
                        setUploadData((prev) => ({
                          ...prev,
                          genre: genreOption,
                        }))
                      }
                      disabled={uploadData.isUploading}
                    >
                      <Text
                        style={[
                          styles.genreChipText,
                          uploadData.genre === genreOption &&
                            styles.genreChipTextSelected,
                        ]}
                      >
                        {genreOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Album Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Album</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="albums-outline"
                    size={20}
                    color="#8B5CF6"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Album name (optional)"
                    placeholderTextColor="#666"
                    value={uploadData.album}
                    onChangeText={(text) =>
                      setUploadData((prev) => ({ ...prev, album: text }))
                    }
                    editable={!uploadData.isUploading}
                  />
                </View>
              </View>

              {/* Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#8B5CF6"
                    style={[styles.inputIcon, styles.textAreaIcon]}
                  />
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Describe your track... (optional)"
                    placeholderTextColor="#666"
                    value={uploadData.description}
                    onChangeText={(text) =>
                      setUploadData((prev) => ({ ...prev, description: text }))
                    }
                    editable={!uploadData.isUploading}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Audio File Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Audio File <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.filePicker,
                    uploadData.isUploading && styles.filePickerDisabled,
                    uploadData.audioFile && styles.filePickerSelected,
                  ]}
                  onPress={handleFileSelect}
                  disabled={uploadData.isUploading}
                >
                  <LinearGradient
                    colors={
                      uploadData.audioFile
                        ? ["rgba(139, 92, 246, 0.2)", "rgba(168, 85, 247, 0.1)"]
                        : [
                            "rgba(255, 255, 255, 0.05)",
                            "rgba(255, 255, 255, 0.02)",
                          ]
                    }
                    style={styles.filePickerGradient}
                  >
                    <View style={styles.filePickerIcon}>
                      <Ionicons
                        name={
                          uploadData.audioFile
                            ? "musical-notes"
                            : "cloud-upload-outline"
                        }
                        size={32}
                        color={uploadData.audioFile ? "#8B5CF6" : "#666"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.filePickerText,
                        uploadData.audioFile && styles.filePickerTextSelected,
                      ]}
                    >
                      {uploadData.audioFile?.assets?.[0]?.name ||
                        "Tap to select MP3 audio file"}
                    </Text>
                    <Text style={styles.filePickerSubtext}>
                      MP3, WAV, FLAC • Max 50MB • Recommended: Under 20MB for
                      faster upload
                      {uploadData.audioFile?.assets?.[0]?.size &&
                        ` • ${(
                          uploadData.audioFile.assets[0].size /
                          1024 /
                          1024
                        ).toFixed(2)} MB`}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Big Upload Button (Additional) */}
              {canUpload && !uploadData.isUploading && (
                <TouchableOpacity
                  style={styles.bigUploadButton}
                  onPress={handleUpload}
                >
                  <LinearGradient
                    colors={["#8B5CF6", "#A855F7"]}
                    style={styles.bigUploadButtonGradient}
                  >
                    <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
                    <Text style={styles.bigUploadButtonText}>Upload Track</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Upload Progress */}
              {uploadData.isUploading && (
                <View style={styles.uploadProgress}>
                  <LinearGradient
                    colors={[
                      "rgba(139, 92, 246, 0.1)",
                      "rgba(168, 85, 247, 0.05)",
                    ]}
                    style={styles.uploadProgressGradient}
                  >
                    <View style={styles.uploadProgressHeader}>
                      <Ionicons name="cloud-upload" size={24} color="#8B5CF6" />
                      <Text style={styles.uploadProgressText}>
                        Uploading your track... {uploadData.uploadProgress}%
                      </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBar}>
                        <LinearGradient
                          colors={["#8B5CF6", "#A855F7"]}
                          style={[
                            styles.progressFill,
                            { width: `${uploadData.uploadProgress}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <Text style={styles.uploadStatusText}>
                      {uploadData.statusMessage ||
                        "Processing audio and saving to database..."}
                    </Text>

                    {/* Cancel Upload Button */}
                    <TouchableOpacity
                      style={styles.cancelUploadButton}
                      onPress={() => {
                        Alert.alert(
                          "Cancel Upload",
                          "Are you sure you want to cancel the upload?",
                          [
                            { text: "Continue", style: "cancel" },
                            {
                              text: "Cancel Upload",
                              style: "destructive",
                              onPress: () => {
                                console.log("🚫 User cancelled upload");
                                resetForm();
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.cancelUploadText}>Cancel Upload</Text>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              )}

              {/* Debug Information (only show during upload) */}
              {uploadData.isUploading && (
                <View style={styles.debugContainer}>
                  <LinearGradient
                    colors={["rgba(75, 85, 99, 0.1)", "rgba(75, 85, 99, 0.05)"]}
                    style={styles.debugGradient}
                  >
                    <View style={styles.debugHeader}>
                      <Ionicons name="bug-outline" size={16} color="#9CA3AF" />
                      <Text style={styles.debugTitle}>Debug Info</Text>
                    </View>
                    <Text style={styles.debugText}>
                      File: {uploadData.audioFile?.assets?.[0]?.name || "None"}
                    </Text>
                    <Text style={styles.debugText}>
                      Size:{" "}
                      {uploadData.audioFile?.assets?.[0]?.size
                        ? `${(
                            uploadData.audioFile.assets[0].size /
                            (1024 * 1024)
                          ).toFixed(2)} MB`
                        : "Unknown"}
                    </Text>
                    <Text style={styles.debugText}>
                      Status: {uploadData.statusMessage || "Starting..."}
                    </Text>
                    <Text style={styles.debugText}>
                      Progress: {uploadData.uploadProgress}%
                    </Text>
                  </LinearGradient>
                </View>
              )}

              {/* Upload Guidelines */}
              <View style={styles.guidelinesContainer}>
                <LinearGradient
                  colors={[
                    "rgba(139, 92, 246, 0.1)",
                    "rgba(168, 85, 247, 0.05)",
                  ]}
                  style={styles.guidelinesGradient}
                >
                  <View style={styles.guidelinesHeader}>
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color="#8B5CF6"
                    />
                    <Text style={styles.guidelinesTitle}>
                      Upload Guidelines
                    </Text>
                  </View>

                  <View style={styles.guidelinesList}>
                    <View style={styles.guidelineItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.guidelineText}>
                        Supported formats: MP3, WAV, FLAC
                      </Text>
                    </View>
                    <View style={styles.guidelineItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.guidelineText}>
                        Maximum file size: 50MB
                      </Text>
                    </View>
                    <View style={styles.guidelineItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.guidelineText}>
                        Track title and audio file are required
                      </Text>
                    </View>
                    <View style={styles.guidelineItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#8B5CF6"
                      />
                      <Text style={styles.guidelineText}>
                        Ensure you own all rights to the music
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.bottomSpacing} />
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: height * 0.9,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalGradient: {
    flex: 1,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 92, 246, 0.1)",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  uploadButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 8,
    fontWeight: "600",
  },
  required: {
    color: "#8B5CF6",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
    paddingHorizontal: 16,
  },
  textAreaContainer: {
    alignItems: "flex-start",
    paddingVertical: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  textAreaIcon: {
    marginTop: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    paddingVertical: 16,
    fontWeight: "500",
  },
  textArea: {
    height: 80,
    paddingVertical: 8,
  },
  genreChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  genreChip: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  genreChipSelected: {
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    borderColor: "#8B5CF6",
  },
  genreChipText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  genreChipTextSelected: {
    color: "#8B5CF6",
  },
  filePicker: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(139, 92, 246, 0.2)",
    borderStyle: "dashed",
  },
  filePickerDisabled: {
    opacity: 0.5,
  },
  filePickerSelected: {
    borderColor: "rgba(139, 92, 246, 0.5)",
    borderStyle: "solid",
  },
  filePickerGradient: {
    padding: 24,
    alignItems: "center",
    minHeight: 120,
    justifyContent: "center",
  },
  filePickerIcon: {
    marginBottom: 12,
  },
  filePickerText: {
    fontSize: 16,
    color: "#B3B3B3",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 4,
  },
  filePickerTextSelected: {
    color: "#8B5CF6",
  },
  filePickerSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  bigUploadButton: {
    marginVertical: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bigUploadButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  bigUploadButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  uploadProgress: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  uploadProgressGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  uploadProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  uploadProgressText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  uploadStatusText: {
    fontSize: 14,
    color: "#B3B3B3",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
  },
  cancelUploadButton: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  cancelUploadText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
  },
  debugContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  debugGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.2)",
  },
  debugHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  debugTitle: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "600",
    marginLeft: 6,
  },
  debugText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
    fontFamily: "monospace",
  },
  guidelinesContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: "hidden",
  },
  guidelinesGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.2)",
  },
  guidelinesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  guidelinesTitle: {
    fontSize: 18,
    color: "#8B5CF6",
    fontWeight: "700",
    marginLeft: 8,
  },
  guidelinesList: {
    gap: 12,
  },
  guidelineItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  guidelineText: {
    fontSize: 14,
    color: "#E5E5E5",
    marginLeft: 12,
    fontWeight: "500",
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default UploadModal;
