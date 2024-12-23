'use client';

import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useSWRConfig } from 'swr';

import { ChatHeader } from '@/components/chat-header';
import { PreviewMessage, ThinkingMessage } from '@/components/message';
import { useScrollToBottom } from '@/components/use-scroll-to-bottom';

import { MultimodalInput } from './multimodal-input';
import { Overview } from './overview';

export function Chat({
  id,
  initialMessages,
  selectedModelId,
}: {
  id: string;
  initialMessages: Array<Message>;
  selectedModelId: string;
}) {
  const { mutate } = useSWRConfig();

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    isLoading,
    stop,
  } = useChat({
    body: { id, modelId: selectedModelId },
    initialMessages,
    onFinish: () => {
      mutate('/api/history');
    },
  });

  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  return (
    <>
      <div className='flex flex-col min-w-0 h-dvh bg-background'>
        <ChatHeader selectedModelId={selectedModelId} />

        <div
          ref={messagesContainerRef}
          className='flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4'
        >
          {messages.length === 0 && <Overview />}

          {messages.map((message, index) => (
            <PreviewMessage
              key={message.id}
              message={message}
              isLoading={isLoading && messages.length - 1 === index}
            />
          ))}

          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'user' && (
              <ThinkingMessage />
            )}

          <div
            ref={messagesEndRef}
            className='shrink-0 min-w-[24px] min-h-[24px]'
          />
        </div>

        <form className='flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl'>
          <MultimodalInput
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            stop={stop}
            messages={messages}
            setMessages={setMessages}
          />
        </form>
      </div>
    </>
  );
}
