"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InventoryData {
  name: string;
  level: number;
  threshold: number;
}

interface InventoryLevelsProps {
  data: InventoryData[];
}

export function InventoryLevels({ data }: InventoryLevelsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Levels</CardTitle>
        <CardDescription>
          Current canister levels across machines
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" className="text-sm" />
              <YAxis className="text-sm" />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">{data.name}</span>
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            Current Level
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {data.level}%
                          </span>
                          <span className="text-[0.70rem] uppercase text-muted-foreground mt-1">
                            Threshold
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {data.threshold}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="level" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
