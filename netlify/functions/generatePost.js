const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { topic, brandVoice } = JSON.parse(event.body);
        const projectId = 'ezodusapp'; 

        // --- NEW: Check for Environment Variables ---
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;

        if (!clientEmail || !privateKey) {
            console.error("Service account credentials (GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY) are not set in Netlify environment variables.");
            return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Server configuration error: Missing credentials.' }) };
        }

        // --- Authenticate using the Service Account ---
        const auth = new GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: privateKey.replace(/\\n/g, '\n'),
            },
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });
        const client = await auth.getClient();
        const accessToken = (await client.getAccessToken()).token;
        
        const headers = { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        // --- Step 1: Generate Text using Gemini ---
        const textPrompt = `Based on the following brand voice profile, write a compelling social media post about the topic provided. The post should be engaging and include relevant hashtags. Brand Voice Profile: ${brandVoice || 'Friendly, approachable, and professional.'} Topic: "${topic}"`;
        const textApiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/gemini-1.5-flash-001:generateContent`;
        const textPayload = { contents: [{ parts: [{ text: textPrompt }] }] };
        
        const textResponse = await axios.post(textApiUrl, textPayload, { headers });
        const generatedText = textResponse.data.candidates[0].content.parts[0].text;

        if (!generatedText) {
            throw new Error("AI did not return text content.");
        }

        // --- Step 2: Generate Images using Imagen ---
        const imagePrompt = `A visually appealing, high-quality photograph for a social media post about: ${generatedText}. Do not include any text, words, or letters in the image.`;
        const imageApiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-002:predict`;
        const imagePayload = { instances: [{ prompt: imagePrompt }], parameters: { "sampleCount": 4 } };

        const imageResponse = await axios.post(imageApiUrl, imagePayload, { headers });
        
        const imageUrls = imageResponse.data.predictions.map(pred => `data:image/png;base64,${pred.bytesBase64Encoded}`);

        if (!imageUrls || imageUrls.length === 0) {
            throw new Error("AI did not return any images.");
        }

        // --- Step 3: Return Success ---
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, text: generatedText, images: imageUrls }),
        };

    } catch (error) {
        console.error("Full Error in generatePost function:", error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: "An internal error occurred while generating content." }),
        };
    }
};
