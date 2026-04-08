import { useEffect, useMemo } from "react";
import { useChatStore } from "./store/chatStore";
import LoginScreen from "./components/LoginScreen";
import UserList from "./components/UserList";
import ChatWindow from "./components/ChatWindow";
import { useSocket } from "./hooks/useSocket";
import {
  MessagingProvider,
  useMessaging,
} from "./context/MessagingContext";

function ChatShell() {
  const { resyncFriendKeys } = useMessaging();

  useEffect(() => {
    resyncFriendKeys();
  }, [resyncFriendKeys]);

  return (
    <div className="h-screen flex bg-gray-950">
      <UserList />
      <ChatWindow />
    </div>
  );
}

export default function App() {
  const username = useChatStore((s) => s.username);
  const hydrateFriends = useChatStore((s) => s.hydrateFriends);
  const { sendMessage, resyncFriendKeys } = useSocket();

  useEffect(() => {
    hydrateFriends();
  }, [hydrateFriends]);

  const messagingValue = useMemo(
    () => ({ sendMessage, resyncFriendKeys }),
    [sendMessage, resyncFriendKeys]
  );

  if (!username) return <LoginScreen />;

  return (
    <MessagingProvider value={messagingValue}>
      <ChatShell />
    </MessagingProvider>
  );
}
