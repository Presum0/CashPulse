"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"clerk" | "demo">("clerk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoLogin = (demoEmail: string, orgId: number = 2) => {
    setIsLoading(true);
    if (typeof document !== "undefined") {
      document.cookie = "cashpulse_demo_session=true; path=/; max-age=86400";
    }
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "cashpulse_user",
        JSON.stringify({
          email: demoEmail,
          role: "CFO",
          organizationId: orgId,
          token: `demo_clerk_token_org_${orgId}`,
        })
      );
    }
    setTimeout(() => {
      router.push(`/dashboard?orgId=${orgId}&demo=true`);
    }, 400);
  };

  const handleCustomDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleDemoLogin(email || "cfo@harbourline.co", 2);
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
      <div className="relative z-10 mx-auto my-auto w-full max-w-[480px] border-[1.5px] border-[#17150F] bg-[#F6F2E8] p-[28px] sm:p-[32px] shadow-sm">
        <div className="border-b border-[#D6CEBC] pb-[14px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[7px]">
              <span className="h-[6px] w-[6px] bg-[#B23428]" />
              <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.18em] text-[#7A7364]">
                Institutional SSO & Identity
              </p>
            </div>
            {/* Mode switch pills */}
            <div className="flex border border-[#17150F] bg-[#FFFDF7] p-[2px]">
              <button
                type="button"
                onClick={() => setAuthMode("clerk")}
                className={`px-[8px] py-[2px] font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.12em] transition-colors ${
                  authMode === "clerk"
                    ? "bg-[#17150F] text-[#F6F2E8]"
                    : "text-[#7A7364] hover:text-[#17150F]"
                }`}
              >
                Clerk Auth
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("demo")}
                className={`px-[8px] py-[2px] font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.12em] transition-colors ${
                  authMode === "demo"
                    ? "bg-[#17150F] text-[#F6F2E8]"
                    : "text-[#7A7364] hover:text-[#17150F]"
                }`}
              >
                Fast Demo
              </button>
            </div>
          </div>
          <h1 className="mt-[8px] font-['Fraunces'] text-[28px] font-normal leading-[1.1] tracking-[-0.02em]">
            Sign in to CashPulse
          </h1>
          <p className="mt-[6px] text-[12px] text-[#5E594D] leading-[1.4]">
            Access your 13-week treasury forecasting desk and pending remediation drafts.
          </p>
        </div>

        {/* Demo Quick Access Strip */}
        <div className="mt-[14px] border border-[#D6CEBC] bg-[#F1EDE3] p-[10px]">
          <p className="font-['IBM_Plex_Mono'] text-[7.5px] uppercase tracking-[0.14em] text-[#7A7364] mb-[6px]">
            Instant Multi-Tenant Demo Desks:
          </p>
          <div className="flex gap-[6px]">
            <button
              type="button"
              onClick={() => handleDemoLogin("cfo@doyle.com", 2)}
              className="flex-1 border border-[#17150F] bg-[#FFFDF7] py-[5px] text-[9.5px] font-['IBM_Plex_Mono'] uppercase tracking-[0.1em] hover:bg-[#17150F] hover:text-[#F6F2E8] transition-colors"
            >
              Doyle Ltd (Org #2)
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin("treasury@rodriguez.tech", 1)}
              className="flex-1 border border-[#BDB5A2] bg-[#FFFDF7] py-[5px] text-[9.5px] font-['IBM_Plex_Mono'] uppercase tracking-[0.1em] hover:bg-[#17150F] hover:text-[#F6F2E8] transition-colors text-[#57534A]"
            >
              Rodriguez (Org #1)
            </button>
          </div>
        </div>

        {/* Clerk Sign In Component */}
        {authMode === "clerk" ? (
          <div className="mt-[16px] clerk-embed-container">
            <SignIn
              routing="hash"
              signUpUrl="/signup"
              forceRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "w-full border-0 bg-transparent shadow-none p-0",
                  header: "hidden",
                  formButtonPrimary:
                    "w-full bg-[#17150F] hover:bg-[#26231C] text-[#F6F2E8] font-['IBM_Plex_Mono'] text-[10.5px] uppercase tracking-[0.16em] py-[11px] rounded-none transition-colors border-0",
                  formFieldInput:
                    "border border-[#17150F] bg-[#FFFDF7] rounded-none px-[12px] py-[8px] text-[12.5px] text-[#17150F] focus:ring-1 focus:ring-[#17150F]",
                  formFieldLabel:
                    "font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364]",
                  footerActionLink:
                    "font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.12em] text-[#17150F] hover:underline",
                  dividerLine: "bg-[#D6CEBC]",
                  dividerText:
                    "font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.14em] text-[#7A7364] bg-[#F6F2E8]",
                  socialButtonsBlockButton:
                    "border border-[#17150F] bg-[#FFFDF7] rounded-none font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.1em] hover:bg-[#17150F] hover:text-[#F6F2E8]",
                },
                variables: {
                  colorPrimary: "#17150F",
                  colorForeground: "#17150F",
                  colorBackground: "#F6F2E8",
                  borderRadius: "0px",
                },
              }}
            />
          </div>
        ) : (
          /* Fast Form for direct demo login */
          <form onSubmit={handleCustomDemoSubmit} className="mt-[16px] space-y-[13px]">
            <div>
              <label className="block font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364] mb-[5px]">
                Corporate Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cfo@company.com"
                className="w-full border border-[#17150F] bg-[#FFFDF7] px-[12px] py-[8px] text-[12.5px] text-[#17150F] outline-none focus:ring-1 focus:ring-[#17150F]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-[5px]">
                <label className="font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364]">
                  Password
                </label>
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
        )}

        <div className="mt-[18px] pt-[12px] border-t border-[#D6CEBC] text-center">
          <p className="text-[11px] text-[#7A7364]">
            Don&apos;t have an organization desk?{" "}
            <Link
              href="/signup"
              className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.12em] text-[#17150F] font-semibold underline hover:text-[#000]"
            >
              Register Organization →
            </Link>
          </p>
        </div>
      </div>

      {/* Footer System Notice */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-[8px] border-t border-[#D6CEBC] pt-[12px] text-[10px] text-[#7A7364] font-['IBM_Plex_Mono'] uppercase tracking-[0.1em]">
        <span>Strict Multi-Tenant Isolation Enforced</span>
        <span>Clerk Authentication Provider Active</span>
      </footer>
    </div>
  );
}
