import { supabase } from "../src/services/api/supabaseClient";

async function testDatabaseConnection() {
  console.log("🔍 Testing database connection...");

  try {
    // Test 1: Check if we can connect to Supabase
    console.log("\n1️⃣ Testing Supabase connection...");
    const { data: connectionTest, error: connectionError } = await supabase
      .from("users")
      .select("count(*)", { count: "exact" });

    if (connectionError) {
      console.error("❌ Connection failed:", connectionError);
      return;
    }

    console.log("✅ Connection successful!");

    // Test 2: Check authentication first
    console.log("\n2️⃣ Checking authentication...");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("❌ Auth check failed:", authError);
    } else if (user) {
      console.log("✅ User authenticated:", user.email);
    } else {
      console.log("⚠️ No user currently authenticated - some tests may fail due to RLS policies");
    }

    // Test 3: Check users table
    console.log("\n3️⃣ Checking users table...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, email, artist_name, is_artist")
      .limit(5);

    if (usersError) {
      console.error("❌ Users query failed:", usersError);
    } else {
      console.log("✅ Users found:", users?.length || 0);
      users?.forEach((user) => {
        console.log(
          `   - ${user.email} (${
            user.artist_name || "No artist name"
          }) - Artist: ${user.is_artist}`
        );
      });
    }

    // Test 4: Check tracks table
    console.log("\n4️⃣ Checking tracks table...");
    const { data: tracks, error: tracksError } = await supabase
      .from("tracks")
      .select(
        `
        id,
        title,
        genre,
        album,
        play_count,
        created_at,
        users:artist_id (
          display_name,
          artist_name
        )
      `
      )
      .limit(10);

    if (tracksError) {
      console.error("❌ Tracks query failed:", tracksError);
      console.log("💡 This might be due to RLS policies requiring authentication");
    } else {
      console.log("✅ Tracks found:", tracks?.length || 0);
      tracks?.forEach((track) => {
        console.log(
          `   - "${track.title}" by ${
            track.users?.artist_name || track.users?.display_name || "Unknown"
          } (${track.genre || "No genre"})`
        );
      });
    }

    console.log("\n🎉 Database test completed!");
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

// Run the test
testDatabaseConnection();