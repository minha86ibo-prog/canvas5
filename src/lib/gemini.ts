import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiModel = "gemini-3-flash-preview";
export const imageModel = "gemini-2.5-flash-image";

export async function generateImageFromDescription(description: string, originalArtworkUrl: string) {
  try {
    // Using gemini-2.5-flash-image as the default reliable image generation model
    const response = await ai.models.generateContent({
      model: imageModel,
      contents: {
        parts: [
          {
            text: `An artistic recreation based on this description: "${description}". The style should be inspired by the original artwork.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    // Find the image part in the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Error generating image with Gemini Image:", error);
    // Fallback to a high-quality placeholder for demo/prototype purposes
    return `https://picsum.photos/seed/${encodeURIComponent(description)}/1024/1024`;
  }
}

export async function getAIFeedback(description: string, originalArtworkUrl: string) {
  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: {
        parts: [
          { text: `Compare this student's description: "${description}" with the original artwork. Provide constructive feedback on how they can observe and describe the artwork more deeply and accurately. Keep it encouraging and educational for a student. Response should be in Korean.` },
          { inlineData: { data: await fetchImageAsBase64(originalArtworkUrl), mimeType: "image/jpeg" } }
        ]
      }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting AI feedback:", error);
    return "피드백을 생성하는 중 오류가 발생했습니다.";
  }
}

export async function performOCR(imageBase64: string) {
  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: {
        parts: [
          { text: "Extract all the handwritten text from this image. Return only the extracted text." },
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
        ]
      }
    });
    return response.text;
  } catch (error) {
    console.error("OCR error:", error);
    return null;
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(",")[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
