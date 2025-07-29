exports.handler = async (event) => {
  const { topic, brandVoice } = JSON.parse(event.body || '{}');

  if (!topic || !brandVoice) {
    return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Missing input' }) };
  }

  const exampleText = `Here's an engaging post about "${topic}" in the tone of ${brandVoice}. Stay tuned!`;
  const placeholderImages = [
    "https://via.placeholder.com/300?text=AI+1",
    "https://via.placeholder.com/300?text=AI+2",
    "https://via.placeholder.com/300?text=AI+3"
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, text: exampleText, images: placeholderImages })
  };
};
