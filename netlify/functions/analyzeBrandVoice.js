const axios = require('axios');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { text } = JSON.parse(event.body);
        if (!text) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Text is required.' }) };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
             return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured on the server.' }) };
        }

        const prompt = `Analyze the following text from a brand's 'About' page. Describe the brand's voice in 3-5 bullet points, focusing on the tone, style, and personality. This analysis will be used to generate social media posts. Text: "${text}"`;
        
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

        const aiResponse = await axios.post(apiUrl, payload);
        const brandVoice = aiResponse.data.candidates[0].content.parts[0].text;

        if (!brandVoice) {
            throw new Error("AI did not return a brand voice analysis.");
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, brandVoice: brandVoice }),
        };

    } catch (error) {
        console.error("Error in analyzeBrandVoice function:", error.response ? error.response.data : error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: "An internal error occurred." }),
        };
    }
};
