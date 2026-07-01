"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Upload,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Wifi,
  ArrowRight,
  Clock,
} from "lucide-react";

export default function OTAPage() {
  const [currentVersion, setCurrentVersion] = useState<string>("...");
  const [newVersion, setNewVersion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchCurrentVersion = async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/ota-version");
      const version = await res.text();
      setCurrentVersion(version.trim());
    } catch {
      setCurrentVersion("Unknown");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCurrentVersion();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/ota-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: newVersion.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ type: "success", message: data.message });
        setCurrentVersion(newVersion.trim());
        setNewVersion("");
      } else {
        setResult({ type: "error", message: data.error });
      }
    } catch {
      setResult({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      icon: Package,
      title: "Build .deb",
      desc: "Run ./build_deb.sh 1.x.x on your machine",
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      icon: Upload,
      title: "Upload File",
      desc: "Drop the .deb file into kulhad/public/downloads/",
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      icon: Cpu,
      title: "Set Version",
      desc: "Enter the new version number below",
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      icon: Wifi,
      title: "Auto Deploy",
      desc: "All kiosks update within 5 minutes!",
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Package className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">OTA Update Manager</h1>
          </div>
          <p className="text-slate-400 ml-14">
            Push new software versions to all Urban Kettle kiosks worldwide.
          </p>
        </motion.div>

        {/* Current Version Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Live Version (All Kiosks)</p>
              <div className="flex items-center gap-3">
                {isFetching ? (
                  <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                ) : (
                  <span className="text-4xl font-mono font-bold text-white">
                    v{currentVersion}
                  </span>
                )}
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                  Live
                </span>
              </div>
            </div>
            <button
              onClick={fetchCurrentVersion}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-slate-400 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4 text-slate-500 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Kiosks check for updates every 5 minutes via crontab</span>
          </div>
        </motion.div>

        {/* How It Works Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-6"
        >
          <h2 className="text-white font-semibold mb-5">How to Deploy</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`p-2 ${step.bg} rounded-xl shrink-0`}>
                  <step.icon className={`w-4 h-4 ${step.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold">{step.title}</p>
                  <p className="text-slate-400 text-xs">{step.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Deploy Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6"
        >
          <h2 className="text-white font-semibold mb-5">Deploy New Version</h2>

          <form onSubmit={handleDeploy} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm block mb-2">
                New Version Number
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">
                    v
                  </span>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="1.3.0"
                    pattern="\d+\.\d+\.\d+"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isLoading || !newVersion.trim()}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isLoading ? "Deploying..." : "Deploy"}
                </motion.button>
              </div>
              <p className="text-slate-600 text-xs mt-2">
                Format: major.minor.patch — e.g., 1.3.0
              </p>
            </div>
          </form>

          {/* Result Banner */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
                  result.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                {result.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                )}
                <p
                  className={`text-sm ${
                    result.type === "success" ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  {result.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* File path hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-slate-600 text-xs mt-6"
        >
          Place your .deb file at:{" "}
          <code className="text-slate-400">
            kulhad/public/downloads/urban-kettle_1.x.x_all.deb
          </code>
        </motion.p>
      </div>
    </div>
  );
}
