// api/gemini-analyze.js — Gemini يحلل البيانات ويولّد اقتراحات

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt, imageBase64, imageBase64B, imageBase64C, mode } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  try {
    const parts = [];

    // نضيف الصور لو موجودة
    if (imageBase64) {
      const b64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
    }
    if (imageBase64B) {
      const b64 = imageBase64B.replace(/^data:image\/\w+;base64,/, "");
      parts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
    }
    if (imageBase64C) {
      const b64 = imageBase64C.replace(/^data:image\/\w+;base64,/, "");
      parts.push({ inline_data: { mime_type: "image/jpeg", data: b64 } });
    }

    parts.push({ text: prompt });

    // نختار النموذج حسب الوضع
    const model = mode === "image"
      ? "gemini-2.0-flash-exp-image-generation"
      : "gemini-1.5-flash";

    const genConfig = mode === "image"
      ? { responseModalities: ["IMAGE", "TEXT"] }
      : { maxOutputTokens: 2000, temperature: 0.7 };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: genConfig,
        }),
      }
    );

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const candidate = data.candidates?.[0];
    const textPart  = candidate?.content?.parts?.find(p => p.text);
    const imagePart = candidate?.content?.parts?.find(p => p.inline_data);

    const result = {
      text: textPart?.text ?? null,
      image: imagePart ? `data:${imagePart.inline_data.mime_type};base64,${imagePart.inline_data.data}` : null,
    };

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
