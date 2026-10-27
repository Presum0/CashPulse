"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const onboardingOrg = {
      fullName,
      email,
      companyName: companyName || "Harbourline Logistics",
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("cashpulse_onboarding_org", JSON.stringify(onboardingOrg));
    }

    // Direct redirect into the 4-step financial stack onboarding wizard
    setTimeout(() => {
      router.push("/onboarding");
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
          href="/login"
          className="font-['IBM_Plex_Mono'] text-[9px] uppercase tracking-[0.14em] text-[#7A7364] hover:text-[#17150F]"
        >
          Already registered? Sign In →
        </Link>
      </header>

      {/* Centered Signup Box */}
      <div className="relative z-10 mx-auto my-auto w-full max-w-[460px] border-[1.5px] border-[#17150F] bg-[#F6F2E8] p-[28px] sm:p-[34px] shadow-sm">
        <div className="border-b border-[#D6CEBC] pb-[14px]">
          <div className="flex items-center gap-[7px]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#C8F14E]" />
            <p className="font-['IBM_Plex_Mono'] text-[8.5px] uppercase tracking-[0.18em] text-[#7A7364]">
              Organization Provisioning
            </p>
          </div>
          <h1 className="mt-[8px] font-['Fraunces'] text-[28px] font-normal leading-[1.1] tracking-[-0.02em]">
            Deploy Your Treasury Desk
          </h1>
          <p className="mt-[6px] text-[12px] text-[#5E594D] leading-[1.4]">
            Start your 14-day free trial. Connect your bank accounts and ERP ledger in the next step.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="mt-[18px] space-y-[13px]">
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

          <div className="pt-[4px]">
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

        <div className="mt-[20px] pt-[14px] border-t border-[#D6CEBC] text-center">
          <p className="text-[11.5px] text-[#5E594D]">
            Already provisioned?{" "}
            <Link
              href="/login"
              className="font-medium text-[#17150F] underline decoration-[#17150F]/30 hover:decoration-[#17150F]"
            >
              Sign in to your desk →
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center font-['IBM_Plex_Mono'] text-[8px] uppercase tracking-[0.14em] text-[#8A8272] pt-[16px]">
        Encrypted TLS 1.3 · Read-Only Open Banking Architecture · Instant 14-Day Free Evaluation
      </footer>
    </div>
  );
}
