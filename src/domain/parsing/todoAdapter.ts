import type { AdapterInput, AdapterOutput } from '../models';

export interface TodoExtractionAdapter {
  interpret(input: AdapterInput): Promise<AdapterOutput>;
}
