
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/auth";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
   
      const user = await login(email.trim(), password);

      /*
       * Make sure we actually received a user.
       */
      if (!user) {
        throw new Error("Unable to retrieve user information.");
      }

      switch (user.role) {
        case "admin":
          router.replace("/admin");
          break;

        case "staff":
          router.replace("/staff");
          break;

        case "diner":
          router.replace("/restaurants");
          break;

        default:
          throw new Error(
            "Your account has an invalid user role."
          );
      }
    } catch (err: unknown) {
      console.error("Login error:", err);

      /*
       * Handle API errors as well as normal JavaScript errors.
       */
      const apiError = err as {
        response?: {
          data?: {
            message?: string;
          };
        };
        message?: string;
      };

      setError(
        apiError?.response?.data?.message ||
          apiError?.message ||
          "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fcf9f8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-[#ebe7e7] p-8">
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-14 w-14 rounded-xl bg-[#01261f] flex items-center justify-center">
              <span className="text-white text-2xl">
                🍽️
              </span>
            </div>

            <h1 className="text-3xl font-bold text-[#01261f]">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm text-[#717976]">
              Sign in to your DINEET account
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-lg bg-[#ffdad6] border border-[#ffb4ab] px-4 py-3 text-sm text-[#93000a]">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-[#1c1b1b] mb-2"
              >
                Email Address
              </label>

              <div className="relative">
                <FiMail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717976]"
                  size={18}
                />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-[#c1c8c4] bg-[#fcf9f8] py-3 pl-10 pr-4 text-sm text-[#1c1b1b] outline-none transition focus:border-[#01261f] focus:ring-2 focus:ring-[#c5eadf] disabled:opacity-60"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[#1c1b1b] mb-2"
              >
                Password
              </label>

              <div className="relative">
                <FiLock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#717976]"
                  size={18}
                />

                <input
                  id="password"
                  type={
                    showPassword ? "text" : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className="w-full rounded-lg border border-[#c1c8c4] bg-[#fcf9f8] py-3 pl-10 pr-12 text-sm text-[#1c1b1b] outline-none transition focus:border-[#01261f] focus:ring-2 focus:ring-[#c5eadf] disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#717976] hover:text-[#01261f] disabled:opacity-50"
                >
                  {showPassword ? (
                    <FiEyeOff size={18} />
                  ) : (
                    <FiEye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#01261f] py-3 text-sm font-bold text-white transition hover:bg-[#1a3c34] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Register */}
          <div className="mt-6 text-center text-sm text-[#717976]">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#934a2d] hover:underline"
            >
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

