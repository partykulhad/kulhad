"use client";

import { useEffect, useRef } from "react";
import { Coffee } from "lucide-react";
import { Chart, registerables } from "chart.js";

// Register Chart.js components
Chart.register(...registerables);

interface Request {
  _id: any;
  _creationTime: number;
  requestId: string;
  machineId: string;
  requestDateTime: string;
  requestStatus: string;
  teaType?: string;
  quantity?: number;
}

interface TeaQuantityChartProps {
  requests: Request[];
}

export function TeaQuantityChart({ requests }: TeaQuantityChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destroy existing chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Process data - group by tea type
    const teaTypes: Record<string, number> = requests.reduce(
      (acc: Record<string, number>, request) => {
        const teaType = request.teaType || "Unknown";
        const quantity = request.quantity || 0;

        if (!acc[teaType]) {
          acc[teaType] = 0;
        }

        acc[teaType] += quantity;
        return acc;
      },
      {} as Record<string, number>
    );

    // Sort by quantity
    const sortedEntries = Object.entries(teaTypes).sort((a, b) => b[1] - a[1]);

    // Prepare chart data
    const labels = sortedEntries.map(([type]) => type);
    const data = sortedEntries.map(([, quantity]) => quantity);

    // Generate colors
    const generateColors = (count: number) => {
      const baseColors = [
        "rgba(255, 99, 132, 0.7)", // Red
        "rgba(54, 162, 235, 0.7)", // Blue
        "rgba(255, 206, 86, 0.7)", // Yellow
        "rgba(75, 192, 192, 0.7)", // Green
        "rgba(153, 102, 255, 0.7)", // Purple
        "rgba(255, 159, 64, 0.7)", // Orange
      ];

      return Array.from(
        { length: count },
        (_, i) => baseColors[i % baseColors.length]
      );
    };

    const backgroundColor = generateColors(labels.length);
    const borderColor = backgroundColor.map((color) =>
      color.replace("0.7", "1")
    );

    // Create new chart
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Quantity",
            data,
            backgroundColor,
            borderColor,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || "";
                const value = context.raw as number;
                return `${label}: ${value} units`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Quantity (units)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Tea Type",
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
  }, [requests]);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Coffee className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No tea quantity data available</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <canvas ref={chartRef} />
    </div>
  );
}
