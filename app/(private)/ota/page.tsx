"use client";

import { useState, useEffect, useRef } from "react";
import { upload } from "@vercel/blob/client";
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
  Lock,
} from "lucide-react";

export default function OTAPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "mitron@123") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Invalid credentials");
      setPassword("");
    }
  };

  const fetchCurrentVersion = async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/ota-version");
      const data = await res.json();
      setCurrentVersion(data.version || "Unknown");
    } catch {
      setCurrentVersion("Unknown");
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCurrentVersion();
    }
  }, [isAuthenticated]);

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".deb")) {
      setUploadResult({ type: "error", message: "Only .deb files are allowed." });
      return;
    }
    setSelectedFile(file);
    setUploadResult(null);
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

    try {
      const filename = `urban-kettle_${newVersion.trim()}_all.deb`;
      const blob = await upload(filename, selectedFile, {
        access: "public",
        handleUploadUrl: "/api/ota-upload",
      });

      setUploadedUrl(blob.url);
      setUploadResult({
        type: "success",
        message: `File ${filename} uploaded successfully. Ready to deploy.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadResult({ type: "error", message: msg });
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
        setDeployResult({ type: "success", message: "Version deployed successfully. Kiosks will auto-update within 2 minutes." });
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
    { icon: FileArchive, title: "Build Package", desc: "./build_deb.sh <version>", color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Upload, title: "Upload", desc: "Select .deb artifact", color: "text-purple-600", bg: "bg-purple-50" },
    { icon: Cpu, title: "Deploy", desc: "Commit to production", color: "text-amber-600", bg: "bg-amber-50" },
    { icon: Wifi, title: "Auto-Update", desc: "Fleet syncs every 2m", color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full border border-slate-100"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-orange-50 rounded-full">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">Developer Access</h1>
          <p className="text-center text-slate-500 mb-8 text-sm">Enter the developer password to manage OTA deployments.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-slate-800"
                autoFocus
              />
            </div>
            {authError && (
              <p className="text-red-500 text-sm text-center font-medium">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
            >
              Authenticate
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
              <Package className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">OTA Pipeline Manager</h1>
              <p className="text-slate-500 text-sm">Kulhad Production Deployment Infrastructure</p>
            </div>
          </div>
          <button onClick={() => setIsAuthenticated(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
            Sign Out
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Status & Steps */}
          <div className="md:col-span-1 space-y-6">
            {/* Current Version */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
              className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <p className="text-slate-500 text-sm font-medium">Production Release</p>
                <button onClick={fetchCurrentVersion} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                  <RefreshCw className={`w-4 h-4 text-slate-400 ${isFetching ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="flex items-end gap-3 mb-4">
                {isFetching ? (
                  <div className="h-10 w-24 bg-slate-100 animate-pulse rounded-lg"></div>
                ) : (
                  <span className="text-4xl font-mono font-bold text-slate-800">v{currentVersion}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="font-medium">Fleet sync polling: 2m intervals</span>
              </div>
            </motion.div>

            {/* Workflow Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-slate-800 font-bold mb-4">Deployment Workflow</h2>
              <div className="space-y-4">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 relative">
                    <div className={`p-2.5 ${step.bg} rounded-xl shrink-0 border border-white/50`}>
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                    </div>
                    <div>
                      <p className="text-slate-800 text-sm font-bold">{step.title}</p>
                      <p className="text-slate-500 text-xs font-medium">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Actions */}
          <div className="md:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm"
            >
              <h2 className="text-slate-800 font-bold mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs">1</span> 
                Upload Build Artifact
              </h2>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? "border-orange-400 bg-orange-50"
                    : selectedFile
                    ? "border-orange-200 bg-orange-50/50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
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
                  <div className="flex items-center justify-center gap-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                      <FileArchive className="w-8 h-8 text-orange-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-slate-800 font-bold">{selectedFile.name}</p>
                      <p className="text-slate-500 text-sm font-medium">{formatSize(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setUploadedUrl(null); setUploadResult(null); }}
                      className="ml-auto p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-slate-700 font-bold">Select .deb package</p>
                    <p className="text-slate-500 text-sm mt-1 font-medium">Drag and drop or click to browse</p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className="mt-4">
                  <motion.button
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={handleUpload}
                    disabled={isUploading || !!uploadedUrl}
                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    {isUploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : uploadedUrl ? <CheckCircle className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                    {isUploading ? "Uploading Artifact..." : uploadedUrl ? "Artifact Uploaded" : "Upload to Storage"}
                  </motion.button>
                </div>
              )}

              <AnimatePresence>
                {uploadResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-4"
                  >
                    <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                      uploadResult.type === "success" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                    }`}>
                      {uploadResult.type === "success" ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm font-medium ${uploadResult.type === "success" ? "text-emerald-800" : "text-red-800"}`}>
                        {uploadResult.message}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Deploy Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className={`bg-white border border-slate-100 rounded-2xl p-6 shadow-sm transition-opacity ${!uploadedUrl ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <h2 className="text-slate-800 font-bold mb-6 flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs">2</span> 
                Push to Production
              </h2>

              <form onSubmit={handleDeploy} className="space-y-4">
                <div>
                  <label className="text-slate-600 text-sm font-bold block mb-2">Target Version</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold">v</span>
                      <input
                        type="text"
                        value={newVersion}
                        onChange={(e) => setNewVersion(e.target.value)}
                        placeholder="1.0.0"
                        pattern="\d+\.\d+\.\d+"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-slate-800 font-mono font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isDeploying || !newVersion.trim() || !uploadedUrl}
                      className="px-8 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-orange-500/20"
                    >
                      {isDeploying ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Cpu className="w-5 h-5" />}
                      {isDeploying ? "Deploying..." : "Execute Deploy"}
                    </motion.button>
                  </div>
                  <p className="text-slate-500 text-xs font-medium mt-2">Requires Semantic Versioning (Major.Minor.Patch). Ensure the uploaded artifact matches this version.</p>
                </div>
              </form>

              <AnimatePresence>
                {deployResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mt-6"
                  >
                    <div className={`p-4 rounded-xl flex items-start gap-3 border ${
                      deployResult.type === "success" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                    }`}>
                      {deployResult.type === "success" ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm font-medium ${deployResult.type === "success" ? "text-emerald-800" : "text-red-800"}`}>
                        {deployResult.message}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
