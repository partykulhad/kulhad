"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function AdminPage() {
  const [selectedMachine, setSelectedMachine] = useState("");
  const [selectedKitchen, setSelectedKitchen] = useState("");
  const [selectedRefiller, setSelectedRefiller] = useState("");

  const requests = useQuery(api.adminrequests.getAllRequests);
  const machines = useQuery(api.adminrequests.getMachines);
  const kitchens = useQuery(api.adminrequests.getKitchens);
  const deliveryAgents = useQuery(api.adminrequests.getDeliveryAgents);

  const createRequest = useMutation(api.adminrequests.createRequest);
  const assignKitchen = useMutation(api.adminrequests.assignKitchen);
  const assignRefiller = useMutation(api.adminrequests.assignRefiller);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const machine = machines?.find((m) => m.id === selectedMachine);
    if (machine) {
      await createRequest({
        machineId: machine.id,
        dstAddress: `${machine.address.building}, ${machine.address.floor}, ${machine.address.area}, ${machine.address.district}, ${machine.address.state}`,
        dstLatitude: parseFloat(machine.gisLatitude),
        dstLongitude: parseFloat(machine.gisLongitude),
        dstContactName: machine.name,
        dstContactNumber: "",
      });
      setSelectedMachine("");
    }
  };

  const handleAssignKitchen = async (requestId: string) => {
    if (selectedKitchen) {
      await assignKitchen({ requestId, kitchenUserId: selectedKitchen });
      setSelectedKitchen("");
    }
  };

  const handleAssignRefiller = async (requestId: string) => {
    if (selectedRefiller) {
      await assignRefiller({ requestId, agentUserId: selectedRefiller });
      setSelectedRefiller("");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Request Management</h1>

      <form onSubmit={handleCreateRequest} className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Create New Request</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedMachine}
            onChange={(e) => setSelectedMachine(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select Machine</option>
            {machines?.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Create Request
          </button>
        </div>
      </form>

      <h2 className="text-xl font-semibold mb-2">Request List</h2>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Request ID</th>
            <th className="border p-2">Machine ID</th>
            <th className="border p-2">Status</th>
            {/* <th className="border p-2">Kitchen Status</th>
            <th className="border p-2">Agent Status</th> */}
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests?.map((request) => (
            <tr key={request.requestId}>
              <td className="border p-2">{request.requestId}</td>
              <td className="border p-2">{request.machineId}</td>
              <td className="border p-2">{request.requestStatus}</td>
              {/* <td className="border p-2">
                {request.kitchenStatus || "Not Assigned"}
              </td>
              <td className="border p-2">
                {request.agentStatus || "Not Assigned"}
              </td> */}
              <td className="border p-2">
                {!request.kitchenUserId && (
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedKitchen}
                      onChange={(e) => setSelectedKitchen(e.target.value)}
                      className="border p-1 rounded"
                    >
                      <option value="">Select Kitchen</option>
                      {kitchens?.map((kitchen) => (
                        <option key={kitchen.userId} value={kitchen.userId}>
                          {kitchen.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignKitchen(request.requestId)}
                      className="bg-green-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Assign Kitchen
                    </button>
                  </div>
                )}
                {request.requestStatus === "OrderReady" &&
                  !request.agentUserId && (
                    <div className="flex items-center space-x-2 mt-2">
                      <select
                        value={selectedRefiller}
                        onChange={(e) => setSelectedRefiller(e.target.value)}
                        className="border p-1 rounded"
                      >
                        <option value="">Select Refiller</option>
                        {deliveryAgents?.map((agent) => (
                          <option key={agent.userId} value={agent.userId}>
                            {agent.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignRefiller(request.requestId)}
                        className="bg-purple-500 text-white px-2 py-1 rounded text-sm"
                      >
                        Assign Refiller
                      </button>
                    </div>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
