/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      id="toast-notification"
      className={`fixed bottom-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-lg border animate-bounce ${
        type === "success"
          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
          : type === "error"
          ? "bg-rose-50 border-rose-200 text-rose-800"
          : "bg-indigo-50 border-indigo-200 text-indigo-800"
      }`}
    >
      {type === "success" && <CheckCircle className="w-5 h-5 shrink-0" />}
      {type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
      {type === "info" && <CheckCircle className="w-5 h-5 shrink-0 text-indigo-600" />}
      <span className="text-xs font-semibold">{message}</span>
      <button
        onClick={onClose}
        className="p-1 rounded-md hover:bg-slate-200/50 text-slate-400 hover:text-slate-700 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
