"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ActivityIcon,
  TrendingUpIcon,
  SparklesIcon,
  WifiIcon,
  WifiOffIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { motion } from "framer-motion";

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface StatusDistributionProps {
  data: StatusData[];
}

export function StatusDistribution({ data }: StatusDistributionProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  // Enhanced colors with gradients
  const enhancedData = data.map((entry) => {
    switch (entry.name.toLowerCase()) {
      case "online":
        return {
          ...entry,
          color: "#10b981",
          gradientColor: "from-emerald-400 to-emerald-600",
          icon: CheckCircle2Icon,
          bgColor:
            "from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/30",
          textColor: "text-emerald-700 dark:text-emerald-300",
        };
      case "offline":
        return {
          ...entry,
          color: "#ef4444",
          gradientColor: "from-red-400 to-red-600",
          icon: WifiOffIcon,
          bgColor:
            "from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30",
          textColor: "text-red-700 dark:text-red-300",
        };
      case "maintenance":
        return {
          ...entry,
          color: "#f59e0b",
          gradientColor: "from-amber-400 to-orange-500",
          icon: AlertTriangleIcon,
          bgColor:
            "from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/30",
          textColor: "text-amber-700 dark:text-amber-300",
        };
      default:
        return {
          ...entry,
          gradientColor: "from-gray-400 to-gray-600",
          icon: ActivityIcon,
          bgColor:
            "from-gray-50 to-gray-100 dark:from-gray-800/20 dark:to-gray-700/30",
          textColor: "text-gray-700 dark:text-gray-300",
        };
    }
  });

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
      },
    },
  };

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay: 0.3,
      },
    },
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const IconComponent =
        enhancedData.find((item) => item.name === data.name)?.icon ||
        ActivityIcon;

      return (
        <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border border-white/20 dark:border-gray-700/50 rounded-2xl p-4 shadow-2xl shadow-black/20">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500">
              <IconComponent className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {data.name}
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {data.value} machines
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {total > 0 ? ((data.value / total) * 100).toFixed(1) : 0}% of
                total
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-white/95 to-gray-50/95 dark:from-gray-900/95 dark:to-gray-800/95 border border-white/20 dark:border-gray-700/50 shadow-2xl rounded-2xl">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-900/10 dark:via-purple-900/5 dark:to-pink-900/10" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />

      <CardHeader className="relative pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
            <ActivityIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
              Machine Status
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400 font-medium">
              Real-time distribution overview
            </CardDescription>
          </div>
        </div>

        {/* Total Count Badge */}
        <div className="flex items-center gap-2">
          <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700 font-semibold px-3 py-1 rounded-xl">
            <TrendingUpIcon className="h-3 w-3 mr-1" />
            {total} Total Machines
          </Badge>
          {total > 0 && (
            <SparklesIcon className="h-4 w-4 text-blue-500 animate-pulse" />
          )}
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-col lg:flex-row justify-between items-start gap-6 pb-6">
        {/* Legend Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3 flex-1"
        >
          {enhancedData.map((entry, index) => {
            const IconComponent = entry.icon;
            const percentage =
              total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";

            return (
              <motion.div
                key={entry.name}
                variants={itemVariants}
                className={`group relative overflow-hidden p-4 rounded-2xl bg-gradient-to-r ${entry.bgColor} border border-white/50 dark:border-gray-600/50 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-700/30 transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl bg-gradient-to-r ${entry.gradientColor} shadow-lg group-hover:scale-110 transition-transform duration-200`}
                    >
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className={`text-sm font-bold ${entry.textColor}`}>
                        {entry.name}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.value} machine{entry.value !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className={`text-lg font-black ${entry.textColor}`}>
                        {percentage}%
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`bg-white/80 dark:bg-gray-800/80 ${entry.textColor} border-current/20 font-bold px-2 py-1 rounded-lg text-xs shadow-sm`}
                    >
                      {entry.value}
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 w-full bg-white/50 dark:bg-gray-700/50 rounded-full h-1.5">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${entry.gradientColor} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  />
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Chart Section */}
        <motion.div
          variants={chartVariants}
          initial="hidden"
          animate="visible"
          className="relative flex-shrink-0"
        >
          <div className="relative">
            {/* Chart Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-2xl scale-110" />

            <div className="relative h-[240px] w-[240px] lg:h-[200px] lg:w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {enhancedData.map((entry, index) => (
                      <linearGradient
                        key={`gradient-${index}`}
                        id={`gradient-${entry.name}`}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={entry.color}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="100%"
                          stopColor={entry.color}
                          stopOpacity={1}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={enhancedData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="#ffffff"
                  >
                    {enhancedData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#gradient-${entry.name})`}
                        style={{
                          filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))",
                          transition: "all 0.3s ease",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Center Circle with Total */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full p-4 shadow-xl border border-white/50 dark:border-gray-700/50">
                <div className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {total}
                </div>
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Total
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </div>
  );
}
