"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"clerk" | "demo">("clerk");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const onboardingOrg = {
      fullName,
      email,
      companyName: companyName || "Harbourline Logistics",
      createdAt: new Date().toISOString(),
    };

    if (typeof document !== "undefined") {
      document.cookie = "cashpulse_demo_session=true; path=/; max-age=86400";
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("cashpulse_onboarding_org", JSON.stringify(onboardingOrg));
      localStorage.setItem(
        "cashpulse_user",
        JSON.stringify({
          email,
          role: "CFO",
          name: fullName,
          token: `demo_clerk_token_signup_${Date.now()}`,
        })
      );
    }

    // Direct redirect into the 4-step financial stack onboarding wizard
    setTimeout(() => {
      router.push("/onboarding?demo=true");
    }, 400);
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
          href="/login"
          className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[#7A7364] hover:text-[#17150F]"
        >
          Already registered? Sign In →
        </Link>
      </header>

      {/* Centered Signup Box */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-[490px] border-[1.5px] border-[#17150F] bg-[#F6F2E8] p-[28px] sm:p-[34px] shadow-sm">
        <div className="border-b border-[#D6CEBC] pb-[14px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[7px]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#C8F14E]" />
              <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.18em] text-[#7A7364]">
                Tenant Provisioning
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
                Clerk Sign Up
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
                Express Form
              </button>
            </div>
          </div>
          <h1 className="mt-[8px] font-['Fraunces'] text-[28px] font-normal leading-[1.1] tracking-[-0.02em]">
            Deploy Your Treasury Desk
          </h1>
          <p className="mt-[6px] text-[12px] text-[#5E594D] leading-[1.4]">
            Start your 14-day free trial. Connect your bank accounts and ERP ledger in the next step.
          </p>
        </div>

        {/* Clerk Sign Up Component */}
        {authMode === "clerk" ? (
          <div className="mt-[16px] clerk-embed-container">
            <SignUp
              routing="hash"
              signInUrl="/login"
              forceRedirectUrl="/onboarding"
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
          /* Form */
          <form onSubmit={handleDemoSignup} className="mt-[16px] space-y-[12px]">
            <div>
              <label className="block font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364] mb-[5px]">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dana Okafor"
                className="w-full border border-[#17150F] bg-[#FFFDF7] px-[12px] py-[8px] text-[12.5px] text-[#17150F] outline-none focus:ring-1 focus:ring-[#17150F]"
              />
            </div>

            <div>
              <label className="block font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364] mb-[5px]">
                Organization / Company Name
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Harbourline Logistics"
                className="w-full border border-[#17150F] bg-[#FFFDF7] px-[12px] py-[8px] text-[12.5px] text-[#17150F] outline-none focus:ring-1 focus:ring-[#17150F]"
              />
            </div>

            <div>
              <label className="block font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364] mb-[5px]">
                Corporate Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dana.okafor@harbourline.co"
                className="w-full border border-[#17150F] bg-[#FFFDF7] px-[12px] py-[8px] text-[12.5px] text-[#17150F] outline-none focus:ring-1 focus:ring-[#17150F]"
              />
            </div>

            <div>
              <label className="block font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.16em] text-[#7A7364] mb-[5px]">
                Security Key (Password)
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full border border-[#17150F] bg-[#FFFDF7] px-[12px] py-[8px] text-[12.5px] text-[#17150F] outline-none focus:ring-1 focus:ring-[#17150F]"
              />
            </div>

            <div className="pt-[2px]">
              <p className="text-[10px] text-[#7A7364] leading-[1.35]">
                By proceeding, you agree to our Master Treasury Services Agreement and acknowledge read-only financial data access.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-[4px] flex items-center justify-center gap-[8px] bg-[#17150F] py-[11px] text-[#F6F2E8] font-['IBM_Plex_Mono'] text-[10.5px] font-semibold uppercase tracking-[0.16em] hover:bg-[#26231C] transition-colors disabled:opacity-60"
            >
              <span>{isLoading ? "Setting Up Workspace..." : "Create Desk & Connect Feeds"}</span>
              <span className="text-[#C8F14E]">→</span>
            </button>
          </form>
        )}

        <div className="mt-[18px] pt-[12px] border-t border-[#D6CEBC] text-center">
          <p className="text-[11px] text-[#7A7364]">
            Already operating an organization desk?{" "}
            <Link
              href="/login"
              className="font-['IBM_Plex_Mono'] text-[10px] uppercase tracking-[0.12em] text-[#17150F] font-semibold underline hover:text-[#000]"
            >
              Sign In →
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
