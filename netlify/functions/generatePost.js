const axios = require('axios');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { topic, brandVoice } = JSON.parse(event.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured.' }) };
        }

        // 1. Generate Text using Gemini
        const textPrompt = `Based on the following brand voice profile, write a compelling social media post about the topic provided. The post should be engaging and include relevant hashtags. Brand Voice Profile: ${brandVoice || 'Friendly, approachable, and professional.'} Topic: "${topic}"`;
        const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const textPayload = { contents: [{ role: "user", parts: [{ text: textPrompt }] }] };
        const textResponse = await axios.post(textApiUrl, textPayload);
        const generatedText = textResponse.data.candidates[0].content.parts[0].text;

        if (!generatedText) {
            throw new Error("AI did not return text content.");
        }

        // 2. Generate Images using Imagen
        const imagePrompt = `A visually appealing, high-quality image for a social media post about: ${generatedText}. Do not include any text in the image.`;
        const imageApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
        const imagePayload = { instances: [{ prompt: imagePrompt }], parameters: { "sampleCount": 4 } };
        const imageResponse = await axios.post(imageApiUrl, imagePayload);
        const imageUrls = imageResponse.data.predictions.map(pred => `data:image/png;base64,${pred.bytesBase64Encoded}`);

        if (!imageUrls || imageUrls.length === 0) {
            throw new Error("AI did not return any images.");
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, text: generatedText, images: imageUrls }),
        };

    } catch (error) {
        console.error("Error in generatePost function:", error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: "An internal error occurred while generating content." }),
        };
    }
};
