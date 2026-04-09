import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getFeedback(artworkInfo: string, studentDescription: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `미술 작품 정보: ${artworkInfo}\n학생의 묘사: ${studentDescription}\n\n위 묘사를 분석하여 학생이 작품을 더 깊이 있게 감상하고 구체적으로 표현할 수 있도록 따뜻하고 격려하는 피드백을 제공해 주세요.`,
  });
  return response.text;
}

export async function generateAIImage(description: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: `미술 작품 스타일로 다음 묘사를 이미지로 생성해 주세요: ${description}`,
  });
  
  let imageUrl = "";
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }
  return imageUrl;
}
