import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { useCrypto } from "../hooks/useCrypto";

export default function KeyQR() {
  const [show, setShow] = useState(false);
  const [keyData, setKeyData] = useState<string>("");
  const { getPublicKeyJWK } = useCrypto();

  useEffect(() => {
    if (!show) return;
    getPublicKeyJWK().then((jwk) => {
      if (jwk) setKeyData(JSON.stringify(jwk));
    });
  }, [show, getPublicKeyJWK]);

  return (
    <>
      <button
        onClick={() => setShow(!show)}
        className="p-2 rounded-lg text-gray-500 hover:text-gray-400 hover:bg-gray-800 transition-colors"
        title="Show public key QR"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
        </svg>
      </button>

      <AnimatePresence>
        {show && keyData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
            onClick={() => setShow(false)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-900 rounded-2xl p-6 max-w-sm"
            >
              <h3 className="text-lg font-medium text-white mb-1">
                Your Public Key
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Share this QR code to verify your identity
              </p>
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={keyData} size={256} level="M" />
              </div>
              <p className="text-[10px] text-gray-600 mt-3 font-mono break-all">
                {keyData.slice(0, 80)}...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
