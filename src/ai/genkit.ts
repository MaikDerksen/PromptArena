
import {genkit} from 'genkit';
import {vertexAI} from '@genkit-ai/vertexai';

export const ai = genkit({
  plugins: [vertexAI({location: 'us-central1', apiVersion: 'v1'})],
  model: 'vertexai/imagen-3.0-generate-002',
});
