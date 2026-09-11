"use client";

import Link from "next/link";
import { ArrowLeft, MessageCircle, Send, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api";

type Participant = {
  userId: string;
  user?: {
    id: string;
    email?: string | null;
    person?: {
      firstName?: string | null;
      lastName?: string | null;
      preferredName?: string | null;
    } | null;
  } | null;
};

type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
  status?: string;
  sender?: {
    person?: {
      firstName?: string | null;
      lastName?: string | null;
      preferredName?: string | null;
    } | null;
  } | null;
};

type Conversation = {
  id: string;
  title?: string | null;
  isGroup: boolean;
  lastMessageAt?: string | null;
  participants: Participant[];
  messages?: Message[];
};

type ConversationResponse = { data: Conversation[] } | Conversation[];

function unwrap<T>(value: any): T {
  return value?.data ?? value;
}

function displayName(participant?: Participant) {
  const person = participant?.user?.person;
  const preferred = person?.preferredName?.trim();
  const full = [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return preferred || full || participant?.user?.email || "Care team";
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return;

    const loadConversations = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get<ConversationResponse>("/conversations", {
          params: { participantId: user.id, page: 1, limit: 50 },
        });
        const data = unwrap<ConversationResponse>(response.data);
        setConversations(Array.isArray(data) ? data : data.data ?? []);
      } catch (requestError) {
        console.error("Failed to load patient conversations:", requestError);
        setError("We could not load your messages right now.");
      } finally {
        setLoading(false);
      }
    };

    void loadConversations();
  }, [user?.id]);

  const otherParticipant = useMemo(() => {
    if (!selected || !user?.id) return undefined;
    return selected.participants.find((participant) => participant.userId !== user.id);
  }, [selected, user?.id]);

  const openConversation = async (conversationId: string) => {
    setSelectedId(conversationId);
    setLoadingConversation(true);
    setError("");
    try {
      const response = await api.get(`/conversations/${conversationId}`);
      setSelected(unwrap<Conversation>(response.data));
    } catch (requestError) {
      console.error("Failed to load conversation:", requestError);
      setError("We could not open this conversation.");
    } finally {
      setLoadingConversation(false);
    }
  };

  const sendMessage = async (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || !selected || !user?.id || sending) return;

    setSending(true);
    setError("");
    try {
      const response = await api.post("/messages", {
        conversationId: selected.id,
        senderId: user.id,
        content,
      });
      const message = unwrap<Message>(response.data);
      setSelected((current) => current ? { ...current, messages: [...(current.messages ?? []), message] } : current);
      setConversations((current) => current.map((conversation) => conversation.id === selected.id
        ? { ...conversation, lastMessageAt: message.sentAt, messages: [message] }
        : conversation));
      setText("");
    } catch (requestError) {
      console.error("Failed to send patient message:", requestError);
      setError("Your message could not be sent. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-[#f5f8fb] text-slate-800">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
          <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-[#0b2d54] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]">
            <ArrowLeft className="h-4 w-4" />
            Back to My Health
          </Link>

          <div className="mt-4 overflow-hidden rounded-[30px] bg-white shadow-[0_18px_55px_rgba(11,45,84,0.10)] ring-1 ring-slate-200">
            <header className="bg-gradient-to-br from-[#0b2d54] to-[#24c1c4] p-5 text-white sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">Patient care</p>
                  <h1 className="text-2xl font-black">Messages</h1>
                  <p className="mt-1 text-xs font-semibold text-white/80">Message people already connected to your care.</p>
                </div>
              </div>
            </header>

            {error && <div role="alert" className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:mx-6">{error}</div>}

            <div className="grid min-h-[560px] lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
                <div className="border-b border-slate-200 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Your conversations</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Your care team conversations appear here.</p>
                </div>

                {loading ? (
                  <div className="p-5 text-sm font-semibold text-slate-500">Loading messages…</div>
                ) : conversations.length === 0 ? (
                  <div className="p-5">
                    <div className="rounded-2xl bg-slate-50 p-5 text-center">
                      <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
                      <p className="mt-3 text-sm font-black text-[#0b2d54]">No conversations yet</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">When a care conversation is created for you, it will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-2">
                    {conversations.map((conversation) => {
                      const participant = conversation.participants.find((item) => item.userId !== user?.id);
                      const last = conversation.messages?.[0];
                      const name = conversation.isGroup ? conversation.title || "Care team" : displayName(participant);
                      return (
                        <button
                          key={conversation.id}
                          type="button"
                          onClick={() => void openConversation(conversation.id)}
                          className={`w-full rounded-2xl px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4] ${selectedId === conversation.id ? "bg-[#24c1c4]/10" : "hover:bg-slate-50"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0b2d54]/10 text-[#0b2d54]"><UserRound className="h-5 w-5" /></div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-black text-[#0b2d54]">{name}</p>
                                <span className="shrink-0 text-[9px] font-semibold text-slate-400">{formatDate(conversation.lastMessageAt)}</span>
                              </div>
                              <p className="mt-1 truncate text-xs font-medium text-slate-500">{last?.content || "No messages yet"}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              <section className="flex min-h-[560px] flex-col">
                {!selected ? (
                  <div className="flex flex-1 items-center justify-center p-8 text-center">
                    <div className="max-w-sm">
                      <MessageCircle className="mx-auto h-10 w-10 text-slate-300" />
                      <h2 className="mt-4 text-lg font-black text-[#0b2d54]">Select a conversation</h2>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Choose a conversation to read and send messages securely.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Conversation</p>
                      <h2 className="mt-1 text-lg font-black text-[#0b2d54]">{selected.isGroup ? selected.title || "Care team" : displayName(otherParticipant)}</h2>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 sm:p-6">
                      {loadingConversation ? (
                        <p className="text-center text-sm font-semibold text-slate-500">Loading conversation…</p>
                      ) : (selected.messages ?? []).length === 0 ? (
                        <div className="flex h-full items-center justify-center text-center">
                          <p className="max-w-sm text-sm font-semibold leading-6 text-slate-500">No messages in this conversation yet. You can send the first message below.</p>
                        </div>
                      ) : (
                        [...(selected.messages ?? [])].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()).map((message) => {
                          const mine = message.senderId === user?.id;
                          return (
                            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${mine ? "rounded-br-md bg-[#0b2d54] text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200"}`}>
                                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                                <p className={`mt-1.5 text-[9px] font-semibold ${mine ? "text-white/60" : "text-slate-400"}`}>{formatDate(message.sentAt)}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={sendMessage} className="border-t border-slate-200 bg-white p-3 sm:p-4">
                      <div className="flex items-end gap-2">
                        <textarea
                          value={text}
                          onChange={(event) => setText(event.target.value)}
                          rows={2}
                          maxLength={4000}
                          placeholder="Write a message…"
                          className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-[#0b2d54] outline-none transition focus:border-[#24c1c4] focus:bg-white focus:ring-2 focus:ring-[#24c1c4]/15"
                        />
                        <button
                          type="submit"
                          disabled={!text.trim() || sending}
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0b2d54] text-white shadow-sm transition hover:bg-[#071f3a] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24c1c4]"
                          aria-label="Send message"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}
