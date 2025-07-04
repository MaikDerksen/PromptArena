
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/imagen-4.0-generate-preview-06-06', //gemini-2.0-flash
});
