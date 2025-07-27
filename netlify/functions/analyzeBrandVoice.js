// Located at: netlify/functions/analyzeBrandVoice.js

const axios = require('axios');
const cheerio = require('cheerio');

// This is the main handler for our Netlify function.
exports.handler = async function(event, context) {
    // We only accept POST requests.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { url } = JSON.parse(event.body);
        if (!url) {
            return { statusCode: 400, body: JSON.stringify({ error: 'URL is required.' }) };
        }

        // --- 1. Scrape the text content from the provided URL ---
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        let scrapedText = "";
        $('p, h1, h2, h3, li, a').each((_idx, el) => {
            scrapedText += $(el).text() + " ";
        });

        if (!scrapedText) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Could not find any text on that page.' }) };
        }
        
        // Truncate for safety and to stay within API limits.
        scrapedText = scrapedText.substring(0, 4000);

        // --- 2. Prepare the prompt for the AI ---
        const prompt = `Analyze the following website text and describe the brand's voice in 3-5 bullet points. The tone should be helpful for generating social media posts. Text: "${scrapedText}"`;

        // --- 3. Call the Gemini AI ---
        // IMPORTANT: For this to work on Netlify, you must get a free API key from Google AI Studio
        // and add it as an environment variable in your Netlify site settings.
        // The variable name must be: GEMINI_API_KEY
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
             return { statusCode: 500, body: JSON.stringify({ error: 'API key is not configured on the server.' }) };
        }
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
        };

        const aiResponse = await axios.post(apiUrl, payload);
        const brandVoice = aiResponse.data.candidates[0].content.parts[0].text;

        if (!brandVoice) {
            throw new Error("AI did not return a brand voice analysis.");
        }

        // --- 4. Send the successful result back to our app ---
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, brandVoice: brandVoice }),
        };

    } catch (error) {
        console.error("Error in analyzeBrandVoice function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: "An internal error occurred. Please try again." }),
        };
    }
};
