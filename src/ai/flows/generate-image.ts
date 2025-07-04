
'use server';

/**
 * @fileOverview Generates an image from a text prompt.
 *
 * - generateImage - A function that handles the image generation process.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate an image from.'),
  model: z.string().optional().describe('The image generation model to use.'),
});

export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z.string().describe('The URL of the generated image.'),
});

export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async input => {
    const model =
      input.model || 'gemini-2.0-flash-preview-image-generation';
    let response;

    if (model === 'gemini-2.0-flash-preview-image-generation') {
      response = await ai.generate({
        model: `googleai/${model}`,
        prompt: input.prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });
    } else {
      // For other models like Imagen
      response = await ai.generate({
        model,
        prompt: input.prompt,
        output: {format: 'media'},
      });
    }

    const media = response.media;

    if (!media || !media.url) {
      throw new Error('Image generation failed or no image URL was returned.');
    }

    return {imageUrl: media.url};
  }
);
