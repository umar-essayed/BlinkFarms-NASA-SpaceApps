import { NextResponse } from 'next/server';
import { buildSystemPrompt } from '@/lib/ai/systemPromptBuilder';
import { AGENT_TOOL_DEFINITIONS, executeAgentTool, ToolInvocationResult } from '@/lib/ai/agentTools';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

// Primary model: Flagship 120B with native function calling
const CANDIDATE_GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      message,
      lang = 'ar',
      context = {},
      history = [],
      centralMemory = [],
    } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 1. Build Language-Separated, Anti-Template System Prompt
    const systemPrompt = buildSystemPrompt({
      lang,
      context,
      centralMemory,
    });

    // 2. Build multi-turn messages array
    const messages: Array<any> = [
      { role: 'system', content: systemPrompt },
    ];

    if (Array.isArray(history) && history.length > 0) {
      // Keep last 8 turns for conversational context
      for (const h of history.slice(-8)) {
        if (h && (h.content || h.text)) {
          messages.push({
            role: h.sender === 'assistant' || h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content || h.text,
          });
        }
      }
    }

    // Append current user message
    messages.push({
      role: 'user',
      content: message,
    });

    let finalReplyText: string | null = null;
    let successfulModel = '';
    const invokedTools: ToolInvocationResult[] = [];

    // 3. Multi-Step Agentic Tool Calling Loop
    for (const modelName of CANDIDATE_GROQ_MODELS) {
      try {
        // First Pass: Provide tool schemas and prompt
        const firstPassRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
            'User-Agent': 'BlinkAI/1.0',
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            tools: AGENT_TOOL_DEFINITIONS,
            tool_choice: 'auto',
            temperature: 0.35, // Low temperature for factual precision
            max_tokens: 1400,
          }),
        });

        if (!firstPassRes.ok) {
          const errText = await firstPassRes.text();
          console.warn(`Groq ${modelName} initial call failed:`, errText);
          continue;
        }

        const firstPassData = await firstPassRes.json();
        const choiceMessage = firstPassData.choices?.[0]?.message;

        if (!choiceMessage) {
          continue;
        }

        // Check if the agent decided to invoke any tools
        if (choiceMessage.tool_calls && Array.isArray(choiceMessage.tool_calls) && choiceMessage.tool_calls.length > 0) {
          // Append the assistant's decision to call tools
          messages.push(choiceMessage);

          // Execute each tool call through our internal TypeScript engines
          for (const toolCall of choiceMessage.tool_calls) {
            const toolName = toolCall.function?.name;
            let toolArgs: any = {};
            try {
              toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
            } catch (parseErr) {
              console.warn('Failed to parse tool arguments:', parseErr);
            }

            // Real execution on BlinkFarms engines (FAO-56, TOPSIS, NASA Telemetry, Ithmar)
            const toolResult = await executeAgentTool(toolName, toolArgs, context);
            toolResult.id = toolCall.id;
            invokedTools.push(toolResult);

            // Append tool execution response to the conversation thread
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolName,
              content: JSON.stringify(toolResult.output),
            });
          }

          // Second Pass: Ask LLM to synthesize final user-facing response using the tool output
          const secondPassRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${GROQ_API_KEY}`,
              'Content-Type': 'application/json',
              'User-Agent': 'BlinkAI/1.0',
            },
            body: JSON.stringify({
              model: modelName,
              messages,
              temperature: 0.35,
              max_tokens: 1400,
            }),
          });

          if (secondPassRes.ok) {
            const secondPassData = await secondPassRes.json();
            finalReplyText = secondPassData.choices?.[0]?.message?.content || null;
            if (finalReplyText) {
              successfulModel = modelName;
              break;
            }
          }
        } else {
          // Direct response without tools (e.g. greetings, simple general talk)
          finalReplyText = choiceMessage.content || null;
          if (finalReplyText) {
            successfulModel = modelName;
            break;
          }
        }
      } catch (err: any) {
        console.warn(`Error during Groq ${modelName} execution:`, err.message);
      }
    }

    if (finalReplyText) {
      // 4. Extract and preserve any [MEMORY: key = value] tags
      const learnedMemory: string[] = [];
      const memoryRegex = /\[MEMORY:\s*([^\]]+)\]/g;
      let match: RegExpExecArray | null;
      while ((match = memoryRegex.exec(finalReplyText)) !== null) {
        if (match[1]) learnedMemory.push(match[1].trim());
      }

      // Clean the memory tags from the rendered text
      const cleanedReply = finalReplyText.replace(/\[MEMORY:[^\]]+\]/g, '').trim();

      return NextResponse.json({
        success: true,
        reply: cleanedReply,
        model: successfulModel,
        invokedTools,
        learnedMemory,
      });
    }

    // If both Groq candidate models failed, return graceful error
    const connectionErrorMsg = lang === 'ar'
      ? 'عذراً يا هندسة، حدث خطأ مؤقت في الاتصال بالخادم. يرجى التأكد من اتصال الإنترنت والمحاولة مرة أخرى.'
      : 'Sorry, a temporary connection error occurred. Please check your internet connection and try again.';

    return NextResponse.json(
      {
        success: false,
        error: 'Groq API connection error',
        reply: connectionErrorMsg,
      },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        reply: 'حدث خطأ في النظام الداخلي، يرجى إعادة المحاولة.',
      },
      { status: 500 }
    );
  }
}
