import {
  type Message,
  StreamData,
  convertToCoreMessages,
  streamText,
} from 'ai';

import { auth } from '@/app/(auth)/auth';
import { customModel } from '@/lib/ai';
import { models } from '@/lib/ai/models';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { generateUUID, getMostRecentUserMessage } from '@/lib/utils';

import { generateTitleFromUserMessage } from '../../actions';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

// https://sdk.vercel.ai/docs/getting-started/nextjs-app-router
export async function POST(request: Request) {
  const {
    id,
    messages,
    modelId,
  }: { id: string; messages: Array<Message>; modelId: string } =
    await request.json();

  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const model = models.find((model) => model.id === modelId);

  if (!model) {
    return new Response('Model not found', { status: 404 });
  }

  const coreMessages = convertToCoreMessages(messages);
  const userMessage = getMostRecentUserMessage(coreMessages);

  if (!userMessage) {
    return new Response('No user message found', { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [
      { ...userMessage, id: generateUUID(), createdAt: new Date(), chatId: id },
    ],
  });

  //https://sdk.vercel.ai/docs/reference/ai-sdk-ui/stream-data#streamdata
  const streamingData = new StreamData();

  //https://sdk.vercel.ai/docs/reference/ai-sdk-core/stream-text#streamtext
  const result = await streamText({
    model: customModel(model.apiIdentifier),
    system: systemPrompt, //The system prompt to use that specifies the behavior of the model.
    messages: coreMessages,
    onFinish: async ({ responseMessages }) => {
      if (session.user?.id) {
        try {
          await saveMessages({
            messages: responseMessages.map((message) => {
              const messageId = generateUUID();

              if (message.role === 'assistant') {
                streamingData.appendMessageAnnotation({
                  messageIdFromServer: messageId,
                });
              }

              return {
                id: messageId,
                chatId: id,
                role: message.role,
                content: message.content,
                createdAt: new Date(),
              };
            }),
          });
        } catch (error) {
          console.error('Failed to save chat');
        }
      }

      streamingData.close();
    },
  });

  return result.toDataStreamResponse({
    data: streamingData,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
