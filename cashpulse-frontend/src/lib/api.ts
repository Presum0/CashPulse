import {
  ForecastResponse,
  CopilotAnalysisResponse,
  ActionDraft,
  ActionExecutionResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getForecast(
  organizationId: number = 1,
  asOfDate?: string
): Promise<ForecastResponse> {
  const url = new URL(`${API_BASE_URL}/api/v1/forecast/${organizationId}`);
  if (asOfDate) {
    url.searchParams.append("as_of_date", asOfDate);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch forecast: ${res.statusText}`);
  }

  return res.json();
}

export async function runCopilotAnalysis(
  organizationId: number = 1,
  asOfDate?: string
): Promise<CopilotAnalysisResponse> {
  const url = new URL(
    `${API_BASE_URL}/api/v1/copilot/analyze/${organizationId}`
  );
  if (asOfDate) {
    url.searchParams.append("as_of_date", asOfDate);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Failed to run copilot analysis: ${res.statusText}`);
  }

  return res.json();
}

export async function getActionDrafts(
  organizationId: number = 1,
  status?: string
): Promise<ActionDraft[]> {
  const url = new URL(
    `${API_BASE_URL}/api/v1/copilot/actions/${organizationId}`
  );
  if (status) {
    url.searchParams.append("status", status);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch action drafts: ${res.statusText}`);
  }

  return res.json();
}

export async function executeActionDraft(
  actionId: number,
  decision: "APPROVE" | "REJECT",
  notes?: string
): Promise<ActionExecutionResponse> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/copilot/actions/${actionId}/execute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to execute action draft: ${res.statusText}`);
  }

  return res.json();
}

export async function seedDatabase(seed: number = 42): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/seed?seed=${seed}`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to seed database: ${res.statusText}`);
  }
  return res.json();
}
