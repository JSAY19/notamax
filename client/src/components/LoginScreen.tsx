import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../store/chatStore";
import { useCrypto } from "../hooks/useCrypto";
import {
  generateRecoveryKey,
  sealIdentity,
  saveIdentity,
  loadStoredIdentity,
  openIdentity,
  importIdentityKeyPair,
  clearStoredIdentity,
} from "../crypto/identity";
import { generateKeyPair } from "../crypto/ecdh";
import { disconnectSocket } from "../lib/socket";

export default function LoginScreen() {
  const stored = loadStoredIdentity();
  const [mode, setMode] = useState<"restore" | "create">(
    stored ? "restore" : "create"
  );
  const [usernameInput, setUsernameInput] = useState(stored?.username ?? "");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryKeyShown, setRecoveryKeyShown] = useState<string | null>(null);
  const [savedConfirm, setSavedConfirm] = useState(false);

  const setUsername = useChatStore((s) => s.setUsername);
  const { loadKeyPair } = useCrypto();

  const finishUnlock = (name: string) => {
    setUsername(name);
    setError("");
  };

  const handleRestore = async () => {
    if (!stored) return;
    setBusy(true);
    setError("");
    try {
      const { username: u, privateJwk, publicJwk } = await openIdentity(
        stored,
        recoveryInput.trim()
      );
      if (u !== stored.username) {
        setError("Неверные данные.");
        setBusy(false);
        return;
      }
      const pair = await importIdentityKeyPair(privateJwk, publicJwk);
      loadKeyPair(pair);
      finishUnlock(u);
    } catch {
      setError("Неверный ключ восстановления.");
    }
    setBusy(false);
  };

  const handleCreate = async () => {
    const name = usernameInput.trim();
    if (!name) return;
    setBusy(true);
    setError("");
    try {
      const pair = await generateKeyPair();
      const recovery = generateRecoveryKey();
      const sealed = await sealIdentity(name, pair, recovery);
      saveIdentity(sealed);
      loadKeyPair(pair);
      setRecoveryKeyShown(recovery);
      setSavedConfirm(false);
    } catch {
      setError("Не удалось создать аккаунт.");
    }
    setBusy(false);
  };

  const handleConfirmRecoverySaved = () => {
    if (!savedConfirm || !recoveryKeyShown) return;
    finishUnlock(usernameInput.trim());
    setRecoveryKeyShown(null);
  };

  const startFresh = () => {
    clearStoredIdentity();
    disconnectSocket();
    setMode("create");
    setUsernameInput("");
    setRecoveryInput("");
    setRecoveryKeyShown(null);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">notamax</h1>
          <p className="text-gray-500 mt-2 text-sm">
            E2E шифрование · ключ восстановления показывается один раз
          </p>
        </div>

        <AnimatePresence mode="wait">
          {recoveryKeyShown ? (
            <motion.div
              key="recovery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 bg-gray-900/80 border border-amber-500/30 rounded-2xl p-6"
            >
              <p className="text-amber-200 text-sm font-medium">
                Сохраните ключ восстановления — он больше не будет показан.
              </p>
              <p className="text-gray-400 text-xs">
                С его помощью вы войдёте снова на этом устройстве. Сервер ключ не
                знает.
              </p>
              <div className="p-3 rounded-xl bg-gray-950 font-mono text-xs text-emerald-300 break-all select-all border border-gray-800">
                {recoveryKeyShown}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={savedConfirm}
                  onChange={(e) => setSavedConfirm(e.target.checked)}
                  className="rounded border-gray-600"
                />
                Я сохранил ключ в надёжном месте
              </label>
              <button
                type="button"
                onClick={handleConfirmRecoverySaved}
                disabled={!savedConfirm}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium rounded-xl"
              >
                Продолжить
              </button>
            </motion.div>
          ) : mode === "restore" && stored ? (
            <motion.div
              key="restore"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs text-gray-500">Имя</label>
                <input
                  readOnly
                  value={stored.username}
                  className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Ключ восстановления
                </label>
                <input
                  type="password"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRestore()}
                  placeholder="Вставьте сохранённый ключ"
                  className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                />
              </div>
              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
              <button
                type="button"
                onClick={handleRestore}
                disabled={busy || !recoveryInput.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium rounded-xl"
              >
                {busy ? "…" : "Войти"}
              </button>
              <button
                type="button"
                onClick={startFresh}
                className="w-full text-xs text-gray-600 hover:text-gray-400 py-2"
              >
                Создать новый аккаунт (удалит локальный профиль)
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Имя пользователя"
                maxLength={20}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="button"
                onClick={handleCreate}
                disabled={busy || !usernameInput.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium rounded-xl"
              >
                {busy ? "…" : "Создать аккаунт"}
              </button>
              {stored && (
                <button
                  type="button"
                  onClick={() => setMode("restore")}
                  className="w-full text-xs text-gray-500 hover:text-gray-400 py-2"
                >
                  У меня уже есть профиль на этом устройстве
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-gray-700 text-xs mt-6">
          История чатов только в памяти (Spy Mode). Друзья сохраняются локально.
        </p>
      </motion.div>
    </div>
  );
}
