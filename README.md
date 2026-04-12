# llm-todo

메모 본문에서 TODO를 추출해 왼쪽 리스트로 투영하는 Vite + React 실험 프로젝트입니다.

## LLM provider 설정

`.env.sample`을 복사해서 `.env`를 만든 뒤 `VITE_TODO_EXTRACTION_PROVIDER`를 골라 설정합니다.

### Ollama

```env
VITE_TODO_EXTRACTION_PROVIDER=ollama
VITE_OLLAMA_BASE_URL=http://127.0.0.1:11434
VITE_OLLAMA_MODEL=gemma4:e2b
VITE_OLLAMA_TIMEOUT_MS=600000
```

### Gemini

```env
VITE_TODO_EXTRACTION_PROVIDER=gemini
VITE_GEMINI_API_KEY=your-api-key
VITE_GEMINI_MODEL=gemini-3.1-flash-lite-preview
VITE_GEMINI_TIMEOUT_MS=600000
```

### ArliAI

ArliAI는 OpenAI-compatible chat completions endpoint를 사용하고, structured output 유도를 위해 `guided_json`을 함께 보냅니다.

```env
VITE_TODO_EXTRACTION_PROVIDER=arliai
VITE_ARLIAI_API_KEY=your-api-key
VITE_ARLIAI_BASE_URL=https://api.arliai.com/v1
VITE_ARLIAI_MODEL=Mistral-Small-3.1-24B-Instruct-2503
VITE_ARLIAI_TIMEOUT_MS=600000
```
