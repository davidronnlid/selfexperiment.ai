const fetch = require("node-fetch");

async function testRoadmapPost() {
  console.log("🧪 Testing roadmap post creation...");

  try {
    const response = await fetch("http://localhost:3000/api/roadmap/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Test Post from Script",
        description: "This is a test post to verify the API",
        tag: "Analytics",
        userId: "00000000-0000-0000-0000-000000000000", // Invalid UUID
      }),
    });

    const data = await response.json();

    console.log("Response status:", response.status);
    console.log("Response data:", JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log("✅ Post created successfully!");
    } else {
      console.log("❌ Failed to create post");
      console.log("Error:", data.error);
      console.log("Details:", data.details);
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
  }
}

testRoadmapPost();
