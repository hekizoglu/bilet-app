"use client";

import { useEffect } from "react";

export default function DebugSentry() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Sentry Test</h1>
        <button
          onClick={() => {
            throw new Error("Sentry Frontend Test Error");
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl w-full"
        >
          Hata Fırlat (Throw Error)
        </button>
      </div>
    </div>
  );
}
