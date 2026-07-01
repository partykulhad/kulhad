"use client";

import { useState, useEffect, useRef } from "react";
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
  FileArchive,
  X,
} from "lucide-react";

export default function OTAPage() {
  const [currentVersion, setCurrentVersion] = useState<string>("...");
  const [newVersion, setNewVersion] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [deployResult, setDeployResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Auto-fill version from filename
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".deb")) {
      setUploadResult({ type: "error", message: "Only .deb files are allowed." });
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
    // Try to extract version from filename like urban-kettle_1.3.0_all.deb
    const match = file.name.match(/(\d+\.\d+\.\d+)/);
    if (match) setNewVersion(match[1]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !newVersion.trim()) return;
    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("version", newVersion.trim());

    try {
      const res = await fetch("/api/ota-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadedUrl(data.url);
        setUploadResult({ type: "success", message: `✅ ${data.filename} uploaded! Now click Deploy below.` });
      } else {
        setUploadResult({ type: "error", message: data.error });
      }
    } catch {
      setUploadResult({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersion.trim()) return;
    setIsDeploying(true);
    setDeployResult(null);

    try {
      const res = await fetch("/api/ota-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: newVersion.trim(),
          debUrl: uploadedUrl ?? undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setDeployResult({ type: "success", message: data.message });
        setCurrentVersion(newVersion.trim());
        setNewVersion("");
        setSelectedFile(null);
        setUploadedUrl(null);
      } else {
        setDeployResult({ type: "error", message: data.error });
      }
    } catch {
      setDeployResult({ type: "error", message: "Network error. Please try again." });
    } finally {
      setIsDeploying(false);
    }
  };

  const steps = [
    { icon: FileArchive, title: "Build .deb", desc: "Run ./build_deb.sh 1.x.x", color: "text-blue-500", bg: "bg-blue-50" },
    { icon: Upload, title: "Upload Here", desc: "Drag & drop your .deb file", color: "text-purple-500", bg: "bg-purple-50" },
    { icon: Cpu, title: "Deploy", desc: "Click Deploy to go live", color: "text-amber-500", bg: "bg-amber-50" },
    { icon: Wifi, title: "Auto Update", desc: "All kiosks update at 2 AM!", color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Package className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">OTA Update Manager</h1>
          </div>
          <p className="text-slate-400 ml-14">Upload and deploy software to all Urban Kettle kiosks worldwide.</p>
        </motion.div>

        {/* Current Version */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Live Version (All Kiosks)</p>
              <div className="flex items-center gap-3">
                {isFetching ? (
                  <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                ) : (
                  <span className="text-4xl font-mono font-bold text-white">v{currentVersion}</span>
                )}
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">Live</span>
              </div>
            </div>
            <button onClick={fetchCurrentVersion} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
              <RefreshCw className={`w-5 h-5 text-slate-400 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-slate-500 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Kiosks check for updates every night at 2:00 AM</span>
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5"
        >
          <h2 className="text-white font-semibold mb-4">How to Deploy</h2>
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
                {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-slate-600 shrink-0 hidden sm:block" />}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 space-y-4"
        >
          <h2 className="text-white font-semibold">Step 1 — Upload .deb File</h2>

          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? "border-emerald-400 bg-emerald-500/10"
                : selectedFile
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-white/10 hover:border-white/30 hover:bg-white/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".deb"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileArchive className="w-8 h-8 text-emerald-400" />
                <div className="text-left">
                  <p className="text-white font-medium">{selectedFile.name}</p>
                  <p className="text-slate-400 text-sm">{formatSize(selectedFile.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setUploadedUrl(null); setUploadResult(null); }}
                  className="ml-auto p-1 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-300 font-medium">Drop your .deb file here</p>
                <p className="text-slate-500 text-sm mt-1">or click to browse</p>
              </div>
            )}
          </div>

          {selectedFile && (
            <motion.button
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              onClick={handleUpload}
              disabled={isUploading || !!uploadedUrl}
              className="w-full py-3 bg-purple-500 hover:bg-purple-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : uploadedUrl ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              {isUploading ? "Uploading..." : uploadedUrl ? "Uploaded to Vercel Blob ✓" : "Upload to Vercel Blob"}
            </motion.button>
          )}

          <AnimatePresence>
            {uploadResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-xl flex items-start gap-3 ${
                  uploadResult.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                {uploadResult.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <p className={`text-sm ${uploadResult.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
                  {uploadResult.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Deploy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 space-y-4"
        >
          <h2 className="text-white font-semibold">Step 2 — Deploy Version</h2>

          <form onSubmit={handleDeploy} className="space-y-4">
            <div>
              <label className="text-slate-400 text-sm block mb-2">Version Number</label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono">v</span>
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
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isDeploying || !newVersion.trim()}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-xl flex items-center gap-2 transition-colors"
                >
                  {isDeploying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                  {isDeploying ? "Deploying..." : "Deploy"}
                </motion.button>
              </div>
              <p className="text-slate-600 text-xs mt-2">Auto-filled from filename. Format: major.minor.patch</p>
            </div>
          </form>

          <AnimatePresence>
            {deployResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-xl flex items-start gap-3 ${
                  deployResult.type === "success" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-red-500/10 border border-red-500/20"
                }`}
              >
                {deployResult.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                )}
                <p className={`text-sm ${deployResult.type === "success" ? "text-emerald-300" : "text-red-300"}`}>
                  {deployResult.message}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </div>
    </div>
  );
}
