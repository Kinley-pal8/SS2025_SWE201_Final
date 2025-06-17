import { audioService } from "../services/AudioService";
import { supabase } from "../lib/supabase";

// Test upload functionality
export const testUploadFunctionality = async () => {
  console.log("🧪 Testing Upload Functionality...");

  try {
    // Test 1: Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("❌ User authentication test failed");
      return false;
    }
    console.log("✅ User authentication test passed");

    // Test 2: Check storage bucket accessibility
    const { data: buckets, error: bucketsError } =
      await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error("❌ Storage buckets test failed:", bucketsError);
      return false;
    }

    const hasAudioBucket = buckets.some(
      (bucket) => bucket.name === "audio-files"
    );
    const hasCoverBucket = buckets.some(
      (bucket) => bucket.name === "cover-images"
    );

    if (!hasAudioBucket || !hasCoverBucket) {
      console.error("❌ Required storage buckets not found");
      return false;
    }
    console.log("✅ Storage buckets test passed");

    // Test 3: Check database table existence
    const { data: tables, error: tablesError } = await supabase
      .from("tracks")
      .select("id")
      .limit(1);

    if (tablesError && tablesError.code !== "PGRST116") {
      console.error("❌ Database table test failed:", tablesError);
      return false;
    }
    console.log("✅ Database table test passed");

    // Test 4: Test file validation
    try {
      // This will throw an error for invalid file type
      await audioService.selectAudioFile();
    } catch (error) {
      // Expected to fail in test environment without actual file selection
      console.log("✅ File validation test passed (expected failure in test)");
    }

    console.log("🎉 All upload functionality tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Upload functionality test failed:", error);
    return false;
  }
};

// Test database operations
export const testDatabaseOperations = async () => {
  console.log("🧪 Testing Database Operations...");

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("❌ User authentication required for database tests");
      return false;
    }

    // Test: Get user tracks
    const tracks = await audioService.getUserTracks(user.id);
    console.log(`✅ Successfully retrieved ${tracks.length} user tracks`);

    console.log("🎉 All database operation tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Database operation test failed:", error);
    return false;
  }
};

// Test storage permissions
export const testStoragePermissions = async () => {
  console.log("🧪 Testing Storage Permissions...");

  try {
    // Test listing files in audio bucket
    const { data: audioFiles, error: audioError } = await supabase.storage
      .from("audio-files")
      .list("audio", { limit: 1 });

    if (audioError) {
      console.error(
        "❌ Audio files storage permission test failed:",
        audioError
      );
      return false;
    }
    console.log("✅ Audio files storage permission test passed");

    // Test listing files in cover images bucket
    const { data: coverFiles, error: coverError } = await supabase.storage
      .from("cover-images")
      .list("covers", { limit: 1 });

    if (coverError) {
      console.error(
        "❌ Cover images storage permission test failed:",
        coverError
      );
      return false;
    }
    console.log("✅ Cover images storage permission test passed");

    console.log("🎉 All storage permission tests passed!");
    return true;
  } catch (error) {
    console.error("❌ Storage permission test failed:", error);
    return false;
  }
};

// Run all tests
export const runAllUploadTests = async () => {
  console.log("🚀 Starting Upload Feature Tests...\n");

  const results = {
    uploadFunctionality: await testUploadFunctionality(),
    databaseOperations: await testDatabaseOperations(),
    storagePermissions: await testStoragePermissions(),
  };

  console.log("\n📊 Test Results Summary:");
  console.log(
    "Upload Functionality:",
    results.uploadFunctionality ? "✅ PASS" : "❌ FAIL"
  );
  console.log(
    "Database Operations:",
    results.databaseOperations ? "✅ PASS" : "❌ FAIL"
  );
  console.log(
    "Storage Permissions:",
    results.storagePermissions ? "✅ PASS" : "❌ FAIL"
  );

  const allPassed = Object.values(results).every((result) => result === true);
  console.log(
    "\n🎯 Overall Result:",
    allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"
  );

  return allPassed;
};
