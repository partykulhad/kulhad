"use client";

import { useEffect, useRef } from "react";
import { Clock, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Chart, registerables } from "chart.js";

// Register Chart.js components
Chart.register(...registerables);

interface RequestStatusChartProps {
  pending: number;
  orderReady: number;
  completed: number;
  canceled: number;
}

export function RequestStatusChart({
  pending,
  orderReady,
  completed,
  canceled,
}: RequestStatusChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Create new chart
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Pending", "Order Ready", "Completed", "Canceled"],
        datasets: [
          {
            data: [pending, orderReady, completed, canceled],
            backgroundColor: [
              "rgba(255, 159, 64, 0.7)", // Orange for Pending
              "rgba(54, 162, 235, 0.7)", // Blue for Order Ready
              "rgba(75, 192, 192, 0.7)", // Green for Completed
              "rgba(255, 99, 132, 0.7)", // Red for Canceled
            ],
            borderColor: [
              "rgb(255, 159, 64)",
              "rgb(54, 162, 235)",
              "rgb(75, 192, 192)",
              "rgb(255, 99, 132)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || "";
                const value = context.raw as number;
                const total = (context.dataset.data as number[]).reduce(
                  (a, b) => (a as number) + (b as number),
                  0
                ) as number;
                const percentage =
                  total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [pending, orderReady, completed, canceled]);

  if (pending + orderReady + completed + canceled === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Loader2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No request data available</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <canvas ref={chartRef} />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-orange-500 mr-2" />
          <span className="text-sm">Pending: {pending}</span>
        </div>
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 text-blue-500 mr-2" />
          <span className="text-sm">Order Ready: {orderReady}</span>
        </div>
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
          <span className="text-sm">Completed: {completed}</span>
        </div>
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 text-red-500 mr-2" />
          <span className="text-sm">Canceled: {canceled}</span>
        </div>
      </div>
    </div>
  );
}
