import { createContext, useContext, type ReactNode } from "react";

export type SendMessageFn = (
  to: string,
  plaintext: string,
  selfDestructSeconds?: number
) => Promise<void>;

export type ResyncKeysFn = () => void;

interface MessagingContextValue {
  sendMessage: SendMessageFn;
  resyncFriendKeys: ResyncKeysFn;
}

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: MessagingContextValue;
}) {
  return (
    <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
  );
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) {
    throw new Error("useMessaging must be used within MessagingProvider");
  }
  return ctx;
}
