<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->
# 목표
https://ai.google.dev/gemini-api/docs/image-generation?hl=ko#javascript_1
Gemini API를 통해서 이미지를 생성 할 수 있는 MCP 서버를 만들어 줘

## 요구 사항
요구 사항은 context를 통해서 이미지를 생성 하고, 지정한 폴더에 저장 할 수 있도록 해 줘.
model도 선택 할 수 있도록 해 줘, 기본값은 "gemini-2.0-flash-001"임. 

## Reference site
- [MCP typescript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP_서버_예제_구현](https://wikidocs.net/268823)
- [Gemini 이미지 생성](https://ai.google.dev/gemini-api/docs/image-generation?hl=ko#javascript_1)
- [Google Gen AI SDK for TypeScript and JavaScript](https://www.npmjs.com/package/@google/genai)

## 생성 코드
```js
import { GoogleGenAI, Modality } from "@google/genai";
import * as fs from "node:fs";

async function main() {

  const ai = new GoogleGenAI({ apiKey: "GEMINI_API_KEY" });

  const contents =
    "Hi, can you create a 3d rendered image of a pig " +
    "with wings and a top hat flying over a happy " +
    "futuristic scifi city with lots of greenery?";

  // Set responseModalities to include "Image" so the model can generate  an image
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-preview-image-generation",
    contents: contents,
    config: {
      responseModalities: [Modality.TEXT, Modality.IMAGE],
    },
  });
  for (const part of response.candidates[0].content.parts) {
    // Based on the part type, either show the text or save the image
    if (part.text) {
      console.log(part.text);
    } else if (part.inlineData) {
      const imageData = part.inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("gemini-native-image.png", buffer);
      console.log("Image saved as gemini-native-image.png");
    }
  }
}

main();
```

## Requirements
- use Context7 mcp
- use sequential-thinking mcp
- NPM Package and can be executed with NPX

## Please follow the instructions below
- Always respond in English
- Follow the user’s requirements carefully & to the letter.
- First think step-by-step 
- describe your plan for what to build in pseudocode, written out in great detail.
- Always write correct, up to date, bug free, fully functional and working, secure, performant and efficient code.
- Focus on readability over being performant.
- Fully implement all requested functionality.
- Leave NO todo’s, placeholders or missing pieces.
- Ensure code is complete! Verify thoroughly finalized.
- Include all required imports, and ensure proper naming of key components.
- Be concise. Minimize any other prose.


