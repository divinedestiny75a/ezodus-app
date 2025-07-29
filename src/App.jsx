import React, { useState } from 'react';

export default function App() {
  const [post, setPost] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function generateContent() {
    setLoading(true);
    const res = await fetch('/.netlify/functions/generatePost', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: 'AI tools', brandVoice: 'Friendly and helpful' })
    });
    const data = await res.json();
    setPost(data.text);
    setImages(data.images);
    setLoading(false);
  }

  return (
    <div style={{ padding: 40, color: 'white', fontFamily: 'sans-serif', backgroundColor: '#111', minHeight: '100vh' }}>
      <h1>EZODUS - Free MVP</h1>
      <button onClick={generateContent} disabled={loading}>
        {loading ? 'Generating...' : 'Generate Post'}
      </button>
      {post && <div style={{ marginTop: 20 }}><strong>Post:</strong><p>{post}</p></div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {images.map((src, i) => <img key={i} src={src} width="150" />)}
      </div>
    </div>
  );
}
