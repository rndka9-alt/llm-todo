export const todoExtractionResponseSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['blockId', 'hasActionableTodo', 'todos'],
    properties: {
      blockId: {
        type: 'string',
      },
      hasActionableTodo: {
        type: 'boolean',
      },
      todos: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'sourceQuotes', 'depth', 'metadata'],
          properties: {
            title: {
              type: 'string',
            },
            sourceQuotes: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            depth: {
              type: 'number',
            },
            metadata: {
              type: 'object',
              additionalProperties: false,
              required: ['priority', 'dueAt', 'tags', 'effort', 'ambiguities'],
              properties: {
                priority: {
                  type: ['string', 'null'],
                  enum: ['low', 'medium', 'high', null],
                },
                dueAt: {
                  type: ['string', 'null'],
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
                effort: {
                  type: ['string', 'null'],
                  enum: ['low', 'medium', 'high', null],
                },
                ambiguities: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;
