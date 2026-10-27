"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate auth session and redirect to dashboard
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("cashpulse_user", JSON.stringify({ email, role: "CFO" }));
      }
      router.push("/dashboard");
    }, 600);
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("••••••••••••");
    setIsLoading(true);
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("cashpulse_user", JSON.stringify({ email: demoEmail, role: "CFO" }));
      }
      router.push("/dashboard");
    }, 500);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#F1EDE3] text-[#17150F] antialiased flex flex-col justify-between p-[20px] sm:p-[32px]">
      {/* Paper texture overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.10] mix-blend-multiply bg-[url('/paper-grain.png')] bg-cover bg-repeat" />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between border-b-[2px] border-[#17150F] pb-[12px]">
        <Link href="/" className="flex items-baseline gap-[7px] group">
          <span className="font-['Fraunces'] text-[24px] font-semibold leading-none tracking-[-0.025em] text-[#17150F]">
            CashPulse
          </span>
          <span className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase leading-none tracking-[0.22em] text-[#8A8272] group-hover:text-[#17150F] transition-colors">
            desk
          </span>
        </Link>
        <Link
          href="/"
          className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[#7A7364] hover:text-[#17150F]"
        >
          ← Return to Public Dispatch
        </Link>
      </header>

      {/* Centered Login Box */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-[430px] border-[1.5px] border-[#17150F] bg-[#F6F2E8] p-[28px] sm:p-[32px] shadow-sm">
        <div className="border-b border-[#D6CEBC] pb-[14px]">
          <div className="flex items-center gap-[7px]">
            <span className="h-[6px] w-[6px] bg-[#B23428]" />
            <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.18em] text-[#7A7364]">
              Corporate Authentication
            </p>
          </div>
          <h1 className="mt-[8px] font-['Fraunces'] text-[28px] font-normal leading-[1.1] tracking-[-0.02em]">
            Sign in to CashPulse
          </h1>
          <p className="mt-[6px] text-[12px] text-[#5E594D] leading-[1.4]">
            Access your 13-week treasury forecasting desk and pending remediation drafts.
          </p>
        </div>

        {/* Demo Fast Login Strip */}
        <div className="mt-[16px] border border-[#D6CEBC] bg-[#F1EDE3] p-[10px]">
          <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.14em] text-[#7A7364] mb-[6px]">
            Quick Demo Access:
          </p>
          <div className="flex gap-[6px]">
            <button
              type="button"
              onClick={() => handleDemoLogin("cfo@harbourline.co")}
              className="flex-1 border border-[#17150F] bg-[#FFFDF7] py-[5px] text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-[0.1em] hover:bg-[#17150F] hover:text-[#F6F2E8] transition-colors"
            >
              Doyle Ltd (Deficit)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("treasury@rodriguez.tech")}
              className="flex-1 border border-[#BDB5A2] bg-[#FFFDF7] py-[5px] text-[10px] font-['IBM_Plex_Mono'] uppercase tracking-[0.1em] hover:bg-[#17150F] hover:text-[#F6F2E8] transition-colors text-[#57534A]"
            >
              Rodriguez (Surplus)
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="mt-[18px] space-y-[14px]">
          <div>
            <label className="block font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364] mb-[5px]">
              Corporate Work Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full border border-[#17150F] bg-[#FFFDF7] px-[12px] py-[8px] text-[12.5px] text-[#17150F] outline-none focus:ring-1 focus:ring-[#17150F]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-[5px]">
              <label className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364]">
                Password
              </label>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Password reset instructions dispatched to registered recovery domain.");
                }}
                className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.12em] text-[#8A8272] hover:text-[#17150F]"
              >
                Forgot key?
              </a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full border border-[#17150F] bg-[#FFFDF7] px-[12px] py-[8px] text-[12.5px] text-[#17150F] outline-none focus:ring-1 focus:ring-[#17150F]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-[6px] flex items-center justify-center gap-[8px] bg-[#17150F] py-[11px] text-[#F6F2E8] font-['IBM_Plex_Mono'] text-[10.5px] font-semibold uppercase tracking-[0.16em] hover:bg-[#26231C] transition-colors disabled:opacity-60"
          >
            <span>{isLoading ? "Authenticating..." : "Sign In to Desk"}</span>
            <span className="text-[#C8F14E]">→</span>
          </button>
        </form>

        <div className="mt-[20px] pt-[14px] border-t border-[#D6CEBC] text-center">
          <p className="text-[11.5px] text-[#5E594D]">
            New organization?{" "}
            <Link
              href="/signup"
              className="font-medium text-[#17150F] underline decoration-[#17150F]/30 hover:decoration-[#17150F]"
            >
              Start 14-day trial &amp; onboarding →
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.14em] text-[#8A8272] pt-[16px]">
        TLS 1.3 Certified · Bank-grade AES-256 Encryption · SOC2 Type II Certified
      </footer>
    </div>
  );
}
