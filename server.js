
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Public Instagram profile status check
async function checkInstagram(username) {
  username = String(username || "")
    .trim()
    .replace(/^@/, "");

  if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
    return { username, status: "Unknown", message: "Invalid username" };
  }

  try {
    const response = await fetch(
      `https://www.instagram.com/${encodeURIComponent(username)}/`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
          "Accept": "text/html"
        },
        signal: AbortSignal.timeout(12000)
      }
    );

    if (response.status === 404) {
      return {
        username,
        status: "Unavailable",
        message: "Profile page returned 404"
      };
    }

    if (response.status === 200) {
      const html = await response.text();

      if (
        html.includes("og:title") ||
        html.includes("profilePage_") ||
        html.includes("Instagram")
      ) {
        return {
          username,
          status: "Active",
          message: "Public profile page responded"
        };
      }
    }

    return {
      username,
      status: "Unknown",
      message: `Instagram response: ${response.status}`
    };
  } catch (error) {
    return {
      username,
      status: "Unknown",
      message: "Could not verify profile"
    };
  }
}

app.post("/api/check", async (req, res) => {
  const username = req.body.username;

  if (!username) {
    return res.status(400).json({ error: "Username required" });
  }

  const result = await checkInstagram(username);
  res.json(result);
});

app.post("/api/check-all", async (req, res) => {
  const usernames = req.body.usernames;

  if (!Array.isArray(usernames) || usernames.length > 50) {
    return res.status(400).json({
      error: "Send a list of up to 50 usernames"
    });
  }

  const results = [];

  for (const username of usernames) {
    results.push(await checkInstagram(username));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  res.json({ results });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "Server running" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Surya Insta Monitor running on port ${PORT}`);
});
