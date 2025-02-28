"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TemperatureData {
  time: string;
  temperature: number;
}

interface TemperatureMonitorProps {
  data: TemperatureData[];
  machineId: string;
  machineName: string;
}

export function TemperatureMonitor({
  data,
  machineId,
  machineName,
}: TemperatureMonitorProps) {
  const currentTemp = data[data.length - 1]?.temperature || 0;
  const isOptimal = currentTemp >= 65 && currentTemp <= 75;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Temperature Monitor</CardTitle>
            <CardDescription>{machineName}</CardDescription>
          </div>
          <Badge variant={isOptimal ? "success" : "destructive"}>
            {currentTemp}°C
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id="temperatureGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" className="text-sm" />
              <YAxis className="text-sm" domain={[60, 80]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Temperature
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {payload[0].value}°C
                          </span>
                          <span className="text-[0.70rem] text-muted-foreground">
                            {payload[0].payload.time}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke="#2563eb"
                fill="url(#temperatureGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
