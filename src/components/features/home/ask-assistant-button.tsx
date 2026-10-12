"use client";

import { MessageCircleQuestion } from "lucide-react";
import { openChatbot } from "@/components/shared/chatbot/chatbot-launcher";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Opens the floating assistant (optionally with a question). */
export function AskAssistantButton({ question, children, ...props }: ButtonProps & { question?: string }) {
  return (
    <Button {...props} onClick={() => openChatbot(question)}>
      {children ?? (
        <>
          <MessageCircleQuestion /> Ask the assistant
        </>
      )}
    </Button>
  );
}
