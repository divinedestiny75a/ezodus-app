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
        // We need to pretend to be a real browser to get the content from some sites.
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        const { data } = await axios.get(url, { headers });
        const $ = cheerio.load(data);
        let scrapedText = "";

        // --- NEW: Intelligent Scraping Logic ---
        // We will look for specific, high-value content instead of everything.
        // For YouTube, the description is often in a meta tag.
        const youtubeDescription = $('meta[property="og:description"]').attr('content');
        if (youtubeDescription) {
            scrapedText += youtubeDescription + " ";
        }

        // Let's also grab video titles, which are often in 'a#video-title' links.
        $('a#video-title').each((_idx, el) => {
            scrapedText += $(el).attr('title') + " ";
        });
        
        // As a fallback, grab paragraphs if the specific selectors fail.
        if (!scrapedText) {
            $('p, h1, h2, h3').each((_idx, el) => {
                scrapedText += $(el).text() + " ";
            });
        }

        if (!scrapedText) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Could not find any meaningful text on that page.' }) };
        }
        
        // Truncate for safety and to stay within API limits.
        scrapedText = scrapedText.substring(0, 4000);

        // --- 2. Prepare the prompt for the AI ---
        const prompt = `Analyze the following text from a social media page. Ignore any generic legal text like "copyright" or "terms of service". Describe the brand's voice in 3-5 bullet points, focusing on the tone, style, and personality. This analysis will be used to generate social media posts. Text: "${scrapedText}"`;

        // --- 3. Call the Gemini AI ---
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
