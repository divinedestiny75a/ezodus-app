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
        let { url } = JSON.parse(event.body);
        if (!url) {
            return { statusCode: 400, body: JSON.stringify({ error: 'URL is required.' }) };
        }

        // --- NEW: Append '/about' to get the best content from YouTube channels ---
        if (url.includes('youtube.com/')) {
            url = url.endsWith('/about') ? url : url + '/about';
        }

        // --- 1. Scrape the text content from the provided URL ---
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        const { data } = await axios.get(url, { headers });
        const $ = cheerio.load(data);
        let scrapedText = "";

        // --- NEWER, Hyper-Targeted Scraping Logic ---
        // For YouTube, the best text is in the "About" tab description.
        // This is often found in specific meta tags or elements with specific IDs.
        const aboutDescription = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
        
        if (aboutDescription) {
            scrapedText += aboutDescription + " ";
        }

        // As a secondary source, grab video titles if they exist.
        $('a#video-title').each((_idx, el) => {
            scrapedText += $(el).attr('title') + " ";
        });
        
        // As a final fallback, grab paragraphs.
        if (!scrapedText) {
            $('p, h1, h2').each((_idx, el) => {
                scrapedText += $(el).text() + " ";
            });
        }

        if (!scrapedText) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Could not find any meaningful text on that page.' }) };
        }
        
        scrapedText = scrapedText.substring(0, 4000);

        // --- 2. Prepare a much smarter prompt for the AI ---
        const prompt = `
            Analyze the following text scraped from a social media page or website. 
            Your primary goal is to identify the unique brand voice of the creator or company.
            **You MUST ignore generic, platform-level text such as 'Copyright', 'Terms of Service', 'Privacy Policy', 'Test new features', 'Advertise', 'Developers', etc.**
            Focus ONLY on the text that reveals the brand's personality, tone, and style.
            Describe this unique brand voice in 3-5 helpful bullet points for generating social media posts.

            Scraped Text: "${scrapedText}"
        `;

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
