const axios = require("axios");

exports.handler = async function (event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { topic, brandVoice } = JSON.parse(event.body);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key not configured." }),
      };
    }

    // Step 1: Create a prompt for Gemini
    const textPrompt = `
      Write a high-quality, engaging social media post based on the following topic and tone.
      - Topic: ${topic}
      - Tone: ${brandVoice || "Friendly, modern, and bold"}
      - Style: Use hashtags, emojis, and a short call to action
    `;

    // Step 2: Call Gemini API (text generation)
    const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;

    const textPayload = {
      contents: [{ role: "user", parts: [{ text: textPrompt }] }],
    };

    const textResponse = await axios.post(textApiUrl, textPayload);
    const generatedText =
      textResponse.data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error("No text generated.");
    }

    // Optional: Generate images (disabled unless you enable image API access)
    // const imagePrompt = `A vivid and eye-catching image that represents: "${topic}"`;
    // const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    // const imagePayload = {
    //   instances: [{ prompt: imagePrompt }],
    //   parameters: { sampleCount: 1 }
    // };
    // const imageResponse = await axios.post(imageApiUrl, imagePayload);
    // const imageUrls = imageResponse.data.predictions.map(
    //   (img) => `data:image/png;base64,${img.bytesBase64Encoded}`
    // );

    // Return the final content
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        text: generatedText,
        // images: imageUrls,
      }),
    };
  } catch (error) {
    console.error("Error:", JSON.stringify(error?.response?.data || error.message));
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error?.response?.data?.error?.message || error.message,
      }),
    };
  }
};
