import { GoogleGenAI, Modality } from "@google/genai";

// Custom error types for better error handling
export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

// Utility to convert a data URL to a gemini-compatible part
const fileToGenerativePart = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL format. Expected 'data:mime/type;base64,data'.");
  }
  const mimeType = match[1];
  const data = match[2];
  return {
    inlineData: {
      data,
      mimeType,
    },
  };
};

// Utility function to wait for a specified amount of time
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Utility function to parse retry delay from error response
const parseRetryDelay = (error: any): number => {
  try {
    if (error?.details) {
      for (const detail of error.details) {
        if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo' && detail.retryDelay) {
          const retryDelay = detail.retryDelay;
          if (typeof retryDelay === 'string' && retryDelay.endsWith('s')) {
            return parseInt(retryDelay.slice(0, -1)) * 1000; // Convert seconds to milliseconds
          }
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse retry delay from error:', e);
  }
  return 0;
};

// Check if error is a rate limit error
const isRateLimitError = (error: any): boolean => {
  return error?.code === 429 || 
         error?.status === 'RESOURCE_EXHAUSTED' ||
         (error?.message && error.message.includes('quota')) ||
         (error?.message && error.message.includes('rate limit'));
};

// Retry function with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // If it's not a rate limit error, don't retry
      if (!isRateLimitError(error)) {
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        if (error?.code === 429) {
          throw new QuotaExceededError(
            "You've exceeded your API quota limits. Please wait before trying again or upgrade your plan for higher limits."
          );
        }
        throw error;
      }
      
      // Calculate delay: use server-suggested delay or exponential backoff
      const serverSuggestedDelay = parseRetryDelay(error);
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const delay = serverSuggestedDelay > 0 ? serverSuggestedDelay : exponentialDelay;
      
      console.log(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries + 1})`);
      await sleep(delay);
    }
  }
  
  throw lastError;
};

export const performVirtualTryOn = async (
  customerImageDataUrl: string,
  garmentImageDataUrl: string,
  adjustments?: { opacity?: number; lighting?: string }
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const customerImagePart = fileToGenerativePart(customerImageDataUrl);
  const garmentImagePart = fileToGenerativePart(garmentImageDataUrl);
  
  let instructionPrompt = `
### TASK: VIRTUAL TRY-ON
You will receive two images. Your task is to take the garment from the second image and place it on the person from the first image, preserving the original background and adding a watermark.

### IMAGE ROLES:
- **IMAGE_1 (PERSON):** This is the primary image. The final output **MUST** use this person's head, hands, pants, shoes, and original background.
- **IMAGE_2 (GARMENT):** This image is **ONLY** a source for the upper-body clothing item (the kurta/shirt).

### NON-NEGOTIABLE RULES:
1.  **START with IMAGE_1.**
2.  **IDENTIFY and COMPLETELY REMOVE** the person's original shirt. It must be 100% gone. No ghosting or transparency.
3.  **TAKE ONLY the garment** from IMAGE_2.
4.  **DISCARD EVERYTHING ELSE** from IMAGE_2, especially the mannequin. The mannequin must not appear in the final image in any form (no mannequin hands, body, or head).
5.  **PLACE the new garment onto the person** from IMAGE_1.
6.  **PRESERVE THE BACKGROUND.** The original background from IMAGE_1 must be kept intact in the final output. Do not alter or replace it.
7.  **ADD WATERMARK.** Place a small, semi-transparent watermark with the text "Drivi.AI" in the bottom-right corner of the final image. The watermark should be subtle and not obscure the person or clothing.
8.  **FINAL CHECK (MANDATORY):**
    - The person's original hands from IMAGE_1 **MUST** be visible and correctly placed over the new garment.
    - The final image must be a single, complete, photorealistic person.
    - The original background from IMAGE_1 is preserved.
    - The "Drivi.AI" watermark is present in the bottom-right corner.

Produce a single image file as the output. Do not output text.
`;

  const adjustmentInstructions: string[] = [];
  if (adjustments) {
      if (adjustments.opacity && adjustments.opacity < 1) {
          adjustmentInstructions.push(`- **Opacity:** The placed garment should have an opacity of about ${Math.round(adjustments.opacity * 100)}%, making it appear semi-transparent.`);
      }
      if (adjustments.lighting && adjustments.lighting !== 'original') {
          adjustmentInstructions.push(`- **Lighting:** The overall lighting of the final composed image should be made noticeably ${adjustments.lighting}.`);
      }
  }

  if (adjustmentInstructions.length > 0) {
      instructionPrompt += `\n### ADDITIONAL ADJUSTMENT RULES:\n${adjustmentInstructions.join('\n')}`;
  }


  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          { text: "IMAGE_1 (PERSON):" },
          customerImagePart,
          { text: "IMAGE_2 (GARMENT):" },
          garmentImagePart,
          { text: `\n\n**INSTRUCTIONS:**\n${instructionPrompt}` },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
        // Force deterministic output for consistency
        temperature: 0,
        seed: 42,
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes = part.inlineData.data;
        if (base64ImageBytes && base64ImageBytes.length > 500) { // Basic check for non-empty image
            return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
        }
      }
    }
    
    // Check if there's text, which might be a refusal or error from the model
    const textResponse = response.text?.trim();
    if (textResponse) {
        console.warn("AI returned text instead of an image:", textResponse);
        throw new Error("The AI was unable to process this request due to its safety policy. Please try different images.");
    }

    throw new Error("The AI failed to generate a valid image. The result was empty or incomplete.");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && (error.message.includes("safety policy") || error.message.includes("valid image"))) {
        throw error;
    }
    throw new Error("A failure occurred while communicating with the AI. Please check your network connection and try again.");
  }
};