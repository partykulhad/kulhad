"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Coffee,
} from "lucide-react";

export default function AdminPage() {
  const [selectedMachine, setSelectedMachine] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const requests = useQuery(api.adminrequests.getAllRequests);
  const machines = useQuery(api.adminrequests.getMachines);

  const createRequest = useMutation(api.adminrequests.createRequest);

  const checkCanisterLevel = async (machineId: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/proxy-canister-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          machineId,
          canisterLevel: 15,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error("Error checking canister level:", error);
      throw error;
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const machine = machines?.find((m) => m.id === selectedMachine);
    if (machine) {
      try {
        const canisterCheckResult = await checkCanisterLevel(machine.id);
        if (canisterCheckResult) {
          await createRequest({
            machineId: machine.id,
            dstAddress: `${machine.address.building}, ${machine.address.floor}, ${machine.address.area}, ${machine.address.district}, ${machine.address.state}`,
            dstLatitude: Number.parseFloat(machine.gisLatitude),
            dstLongitude: Number.parseFloat(machine.gisLongitude),
            dstContactName: machine.name,
            dstContactNumber: "",
          });
          setSelectedMachine("");
          toast.success("Request created successfully");
        } else {
          toast.error("Canister level check failed. Request not created.");
        }
      } catch (error) {
        console.error("Error creating request:", error);
        toast.error("Failed to create request. Please try again later.");
      }
    } else {
      toast.error(
        "No machine selected. Please select a machine and try again."
      );
    }
    setIsLoading(false);
  };

  const refreshData = () => {
    setIsRefreshing(true);
    // Simulate data refresh (replace with actual data fetching if needed)
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Data refreshed successfully");
    }, 1000);
  };

  useEffect(() => {
    // Add a class to the body for a gradient background
    document.body.classList.add(
      "bg-gradient-to-br",
      "from-purple-400",
      "to-blue-500",
      "min-h-screen"
    );

    return () => {
      document.body.classList.remove(
        "bg-gradient-to-br",
        "from-purple-400",
        "to-blue-500",
        "min-h-screen"
      );
    };
  }, []);

  return (
    <div className="container mx-auto p-4 font-sans">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold mb-8 text-white text-center"
      >
        Admin Request Management
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg shadow-lg p-6 mb-8"
      >
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Create New Request
        </h2>
        <form
          onSubmit={handleCreateRequest}
          className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4"
        >
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="w-full md:w-2/3 border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Machine</option>
            {machines?.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.name}
              </option>
            ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full md:w-1/3 bg-blue-500 text-white px-6 py-3 rounded-md flex items-center justify-center space-x-2 transition duration-300 ease-in-out hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="animate-spin" />
            ) : (
              <PlusCircle className="w-5 h-5" />
            )}
            <span>{isLoading ? "Creating..." : "Create Request"}</span>
          </motion.button>
        </form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-lg p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">Request List</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshData}
            className="bg-green-500 text-white px-4 py-2 rounded-md flex items-center space-x-2 transition duration-300 ease-in-out hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </motion.button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left text-gray-600">Request ID</th>
                <th className="p-3 text-left text-gray-600">Machine ID</th>
                <th className="p-3 text-left text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {useMemo(() => {
                  const sortedRequests = [...(requests || [])].sort((a, b) => {
                    // Extract the numeric part from the requestId
                    const aNum = Number.parseInt(
                      a.requestId.replace("REQ-", "")
                    );
                    const bNum = Number.parseInt(
                      b.requestId.replace("REQ-", "")
                    );
                    // Sort in descending order (latest first)
                    return bNum - aNum;
                  });
                  return sortedRequests.map((request) => (
                    <motion.tr
                      key={request.requestId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-gray-200 hover:bg-gray-50 transition duration-150 ease-in-out"
                    >
                      <td className="p-3">{request.requestId}</td>
                      <td className="p-3">{request.machineId}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            request.requestStatus === "OrderReady"
                              ? "bg-green-100 text-green-800"
                              : request.requestStatus === "Pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : request.requestStatus === "Completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {request.requestStatus === "OrderReady" && (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          {request.requestStatus === "Pending" && (
                            <Coffee className="w-4 h-4 mr-2" />
                          )}
                          {request.requestStatus === "Completed" && (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          {request.requestStatus !== "OrderReady" &&
                            request.requestStatus !== "Pending" &&
                            request.requestStatus !== "Completed" && (
                              <XCircle className="w-4 h-4 mr-2" />
                            )}
                          {request.requestStatus}
                        </span>
                      </td>
                    </motion.tr>
                  ));
                }, [requests])}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
