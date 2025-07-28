const axios = require("axios");

exports.handler = async function (event, context) {
  // Restrict to POST method
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse and validate request body
  let data;
  try {
    data = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON in request body." }),
    };
  }

  const topic = data.topic ? data.topic.trim() : null;
  const brandVoice = data.brandVoice ? data.brandVoice.trim() : null;

  if (!topic) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Topic is required." }),
    };
  }

  // Retrieve API key from environment variables
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Gemini API key is not configured in the environment variables." }),
    };
  }

  try {
    // Log input for debugging
    console.log(`Generating content for topic: "${topic}", brandVoice: "${brandVoice || "default"}"`);

    // Construct prompt for text generation
    const textPrompt = `
      Write a high-quality, engaging social media post based on the following topic and tone.
      - Topic: ${topic}
      - Tone: ${brandVoice || "Friendly, modern, and bold"}
      - Style: Use hashtags, emojis, and a short call to action
    `;

    // Make API request to Gemini API
    const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
    const textPayload = {
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
    };
    const textResponse = await axios.post(textApiUrl, textPayload, { timeout: 10000 }); // 10-second timeout

    // Validate and extract generated text
    if (!textResponse.data.candidates || textResponse.data.candidates.length === 0) {
      throw new Error("No candidates returned from the Gemini API.");
    }
    const generatedText = textResponse.data.candidates[0].content.parts[0].text;
    if (!generatedText) {
      throw new Error("Generated text is empty.");
    }

    // Log success
    console.log("Content generated successfully.");

    // Return successful response
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        text: generatedText,
      }),
    };
  } catch (error) {
    // Enhanced error handling
    let errorMessage = "An unexpected error occurred.";
    if (error.response) {
      errorMessage = error.response.data?.error?.message || "Gemini API returned an error.";
    } else if (error.request) {
      errorMessage = "No response received from the Gemini API.";
    } else {
      errorMessage = error.message;
    }
    console.error("Error:", errorMessage);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        error: errorMessage,
      }),
    };
  }
};