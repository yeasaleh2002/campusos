"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([
    { role: "bot", content: "Hi! I'm CampusBot. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { role: "user", content: input }]);
    setInput("");
    
    // Simulate bot reply
    setTimeout(() => {
      setMessages(prev => [...prev, { role: "bot", content: "I'm still learning! I'll be fully functional soon." }]);
    }, 1000);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-primary/50 transition-all z-50 flex items-center justify-center p-0"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[350px] shadow-2xl animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b bg-primary/5 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-2 rounded-full">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">CampusBot</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 h-[350px] overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {/* Quick Actions */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full bg-background" onClick={() => setInput("When is the next bus?")}>
                Next bus?
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs rounded-full bg-background" onClick={() => setInput("Exam schedule")}>
                Exam info
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="p-3 border-t">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            className="flex w-full items-center space-x-2"
          >
            <Input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 border-0 focus-visible:ring-0 shadow-none bg-muted/50"
            />
            <Button type="submit" size="icon" disabled={!input.trim()} className="h-8 w-8 shrink-0 rounded-full">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
