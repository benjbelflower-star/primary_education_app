"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
      }
    }
  );

  // Also handle token in URL directly
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) setReady(true);
  });

  return () => subscription.unsubscribe();
}, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl mb-4">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-gray-500 text-sm mt-1">
            {ready ? "Choose a new password for your account." : "Verifying reset link..."}
          </p>
        </div>

        {!ready ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
            Waiting for verification... if this takes more than a few seconds,
            try clicking the reset link in your email again.
          </div>
        ) : (
          <form
            onSubmit={handleReset}
            className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col gap-4"
          >
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                className={inputClass}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cx(
                "w-full py-2.5 rounded-lg text-white text-sm font-bold transition-colors mt-1",
                isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
              )}
            >
              {isLoading ? "Saving..." : "Set Password"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
// Then you need to tell Supabase to send the reset link to this page instead of your home page. In your **Supabase dashboard → Authentication → URL Configuration**, set the **Site URL** to your Vercel URL and add this to **Redirect URLs**:
// https://your-vercel-url.vercel.app/auth/reset-password
// Also add the local version for development: http://localhost:3000/auth/reset-password