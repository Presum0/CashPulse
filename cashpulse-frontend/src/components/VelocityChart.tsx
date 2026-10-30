"use client";

import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { DailyForecast, ForecastSummary } from "@/lib/types";
import { formatCurrency, formatDateString } from "@/lib/utils";

interface WeeklyPoint {
  date: string;
  label: string;
  balance: number;
  actual: number | null;
  forecast: number | null;
  inflow: number;
  outflow: number;
  isDeficit: boolean;
  isLowWaterMark?: boolean;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeeklyPoint }>;
  label?: string;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="border border-[#17150F] bg-[#F6F2E8] p-[10px] shadow-sm font-['IBM_Plex_Mono'] text-[11px] min-w-[190px]">
        <div className="flex items-center justify-between border-b border-[#D6CEBC] pb-[5px] mb-[6px]">
          <span className="font-semibold uppercase tracking-[0.1em] text-[#17150F]">
            {data.label}
          </span>
          {data.balance < 0 ? (
            <span className="bg-[#B23428] text-[#F6F2E8] px-[4px] py-[1px] text-[8.5px] font-bold">
              DEFICIT
            </span>
          ) : (
            <span className="text-[#2F5D3A] text-[9px]">SOLVENT</span>
          )}
        </div>
        <div className="flex justify-between items-center text-[12px] my-[2px]">
          <span className="text-[#7A7364]">Balance:</span>
          <span
            className={`font-semibold ${
              data.balance < 0 ? "text-[#B23428]" : "text-[#17150F]"
            }`}
          >
            {formatCurrency(data.balance)}
          </span>
        </div>
        {data.inflow > 0 && (
          <div className="flex justify-between items-center text-[10px] text-[#2F5D3A] mt-[4px]">
            <span>Inflow:</span>
            <span>+{formatCurrency(data.inflow)}</span>
          </div>
        )}
        {data.outflow > 0 && (
          <div className="flex justify-between items-center text-[10px] text-[#B23428] mt-[2px]">
            <span>Outflow:</span>
            <span>−{formatCurrency(data.outflow)}</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

interface VelocityChartProps {
  projections?: DailyForecast[];
  summary?: ForecastSummary | null;
}

export function VelocityChart({ projections = [], summary }: VelocityChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  // Sample weekly points (every 7 days) if full 91-day list is provided, or display 13 weeks
  const chartData = React.useMemo(() => {
    if (!projections || projections.length === 0) {
      // Default fallback mock matching the reference
      const weeks = [
        { date: "2025-01-24", label: "24 Jan", actual: 482400, forecast: null, balance: 482400, isDeficit: false },
        { date: "2025-01-31", label: "31 Jan", actual: 450000, forecast: null, balance: 450000, isDeficit: false },
        { date: "2025-02-07", label: "7 Feb", actual: 410000, forecast: null, balance: 410000, isDeficit: false },
        { date: "2025-02-14", label: "14 Feb", actual: 360000, forecast: 360000, balance: 360000, isDeficit: false },
        { date: "2025-02-21", label: "21 Feb", actual: null, forecast: 290000, balance: 290000, isDeficit: false },
        { date: "2025-02-28", label: "28 Feb", actual: null, forecast: 230000, balance: 230000, isDeficit: false },
        { date: "2025-03-07", label: "7 Mar", actual: null, forecast: 160000, balance: 160000, isDeficit: false },
        { date: "2025-03-14", label: "14 Mar", actual: null, forecast: 90000, balance: 90000, isDeficit: false },
        { date: "2025-03-21", label: "21 Mar", actual: null, forecast: 20000, balance: 20000, isDeficit: false },
        { date: "2025-03-28", label: "28 Mar", actual: null, forecast: -38600, balance: -38600, isDeficit: true },
        { date: "2025-04-04", label: "4 Apr", actual: null, forecast: -28000, balance: -28000, isDeficit: true },
        { date: "2025-04-11", label: "11 Apr", actual: null, forecast: -19000, balance: -19000, isDeficit: true },
        { date: "2025-04-18", label: "18 Apr", actual: null, forecast: -18900, balance: -18900, isDeficit: true },
      ];
      return weeks;
    }

    // Pick 13 weekly points from the 91-day projections
    const weeklyPoints: WeeklyPoint[] = [];
    for (let i = 0; i < projections.length; i += 7) {
      const p = projections[i];
      const isPastOrToday = p.day_offset <= 0;
      weeklyPoints.push({
        date: p.date,
        label: formatDateString(p.date),
        balance: p.projected_balance,
        actual: isPastOrToday ? p.projected_balance : null,
        forecast: !isPastOrToday || i === 0 ? p.projected_balance : null,
        inflow: p.expected_inflow,
        outflow: p.expected_outflow,
        isDeficit: p.is_deficit || p.projected_balance < 0,
        isLowWaterMark: p.is_low_water_mark,
      });
    }

    // Ensure final 91st day is included
    const last = projections[projections.length - 1];
    if (weeklyPoints[weeklyPoints.length - 1]?.date !== last.date) {
      weeklyPoints.push({
        date: last.date,
        label: formatDateString(last.date),
        balance: last.projected_balance,
        actual: null,
        forecast: last.projected_balance,
        inflow: last.expected_inflow,
        outflow: last.expected_outflow,
        isDeficit: last.is_deficit || last.projected_balance < 0,
        isLowWaterMark: last.is_low_water_mark,
      });
    }

    return weeklyPoints;
  }, [projections]);

  const minBalance = summary?.min_cash_balance ?? -38600;
  const minDate = summary?.min_cash_date ? formatDateString(summary.min_cash_date) : "28 Mar";
  const policyFloor = summary?.policy_floor ?? 120000;

  return (
    <figure className="mt-[13px] flex flex-1 flex-col border border-[#17150F] bg-[#F6F2E8] px-[14px] pb-[9px] pt-[10px]">
      {/* Header of Chart */}
      <div className="flex shrink-0 items-baseline justify-between">
        <div className="flex items-baseline gap-[10px]">
          <p className="font-['IBM_Plex_Mono'] text-[9px] uppercase leading-none tracking-[0.18em]">
            13-week cash velocity
          </p>
          <p className="font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
            usd · weekly close
          </p>
        </div>
        <div className="flex items-center gap-[13px]">
          <span className="flex items-center gap-[5px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.12em] text-[#5E594D]">
            <span className="h-[2px] w-[13px] bg-[#2F5D3A]" />
            actual
          </span>
          <span className="flex items-center gap-[5px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.12em] text-[#5E594D]">
            <span className="h-0 w-[13px] border-t border-dashed border-[#17150F]" />
            forecast
          </span>
          <span className="flex items-center gap-[5px] font-['IBM_Plex_Mono'] text-[7.5px] uppercase leading-none tracking-[0.12em] text-[#B23428]">
            <span className="h-[7px] w-[12px] bg-[#B23428]/25" />
            deficit
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-[8px] h-[260px] w-full">
        {isMounted && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 15, right: 20, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="positiveFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#17150F" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#17150F" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="deficitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B23428" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#B23428" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: "#17150F", strokeWidth: 1.2 }}
                tick={{
                  fill: "#8A8272",
                  fontSize: 9,
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${Math.round(val / 1000)}k`}
                tick={{
                  fill: "#8A8272",
                  fontSize: 9,
                  fontFamily: "IBM Plex Mono, monospace",
                }}
              />

              <Tooltip content={<ChartTooltip />} />

              {/* Zero Line */}
              <ReferenceLine
                y={0}
                stroke="#17150F"
                strokeWidth={1.2}
                label={{
                  value: "$0",
                  position: "left",
                  fill: "#8A8272",
                  fontSize: 8.5,
                  fontFamily: "IBM Plex Mono",
                }}
              />

              {/* Policy Floor */}
              <ReferenceLine
                y={policyFloor}
                stroke="#8A8272"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `POLICY FLOOR $${Math.round(policyFloor / 1000)}k`,
                  position: "insideTopLeft",
                  fill: "#8A8272",
                  fontSize: 8,
                  letterSpacing: "0.08em",
                  fontFamily: "IBM Plex Mono",
                }}
              />

              {/* Area fill for positive cash balance */}
              <Area
                type="monotone"
                dataKey="balance"
                fill="url(#positiveFill)"
                stroke="transparent"
                isAnimationActive={false}
              />

              {/* Actual Line (solid green) */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#2F5D3A"
                strokeWidth={2.6}
                strokeLinecap="round"
                dot={{ r: 3, fill: "#2F5D3A" }}
                connectNulls={false}
                isAnimationActive={false}
              />

              {/* Forecast Projection Line (dashed dark ink) */}
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#17150F"
                strokeWidth={1.8}
                strokeDasharray="5 4"
                strokeOpacity={0.65}
                dot={{ r: 2.5, fill: "#17150F" }}
                connectNulls={true}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Footer Caption */}
      <p className="mt-[6px] shrink-0 font-['IBM_Plex_Mono'] text-[8px] uppercase leading-none tracking-[0.1em] text-[#8A8272]">
        Solid to 14 Feb · forecast thereafter · trough{" "}
        <span className="text-[#B23428] font-semibold">{formatCurrency(minBalance)}</span> on {minDate} · action drafts modelled
      </p>
    </figure>
  );
}
