import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { getTodoExtractionEnvWarnings } from './src/config/todoExtractionEnvWarnings';

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    const env = loadEnv(mode, '.', '');
    const warnings = getTodoExtractionEnvWarnings(env);

    if (warnings.length > 0) {
      console.warn('\n[llm-todo] TODO extraction env warning');
      warnings.forEach((warning) => {
        console.warn(`[llm-todo] ${warning}`);
      });
      console.warn('[llm-todo] 필요한 값은 .env.sample 을 참고하세요.\n');
    }
  }

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      globals: true,
    },
  };
});
