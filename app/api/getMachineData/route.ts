import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "../../../convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const machineId = searchParams.get("machineId")

    if (!machineId) {
      return NextResponse.json({ success: false, error: "Missing required parameter: machineId" }, { status: 400 })
    }

    // Call the Convex query
    const result = await convex.query(api.machines.getMachineData, { machineId })

    if (!result) {
      return NextResponse.json({ success: false, error: "Machine not found" }, { status: 404 })
    }

    // The kiosk hits this endpoint every 60s regardless of state — use it as a
    // heartbeat for live-status detection, and piggyback remote-monitoring
    // telemetry (current page, Pi system health) on the same call rather than
    // a separate polling cycle. Fire-and-forget: never block or fail this
    // response if the heartbeat write has a hiccup.
    const currentPage = searchParams.get("currentPage") || undefined
    const cpuPercent = searchParams.has("cpu_percent") ? Number(searchParams.get("cpu_percent")) : undefined
    const memPercent = searchParams.has("mem_percent") ? Number(searchParams.get("mem_percent")) : undefined
    const diskPercent = searchParams.has("disk_percent") ? Number(searchParams.get("disk_percent")) : undefined
    const latencyMs = searchParams.has("latency_ms") ? Number(searchParams.get("latency_ms")) : undefined
    const heatingIssue = searchParams.get("heating_issue") === "true" ? true : (searchParams.get("heating_issue") === "false" ? false : undefined)
    const appVersion = searchParams.get("app_version") || undefined

    const mutationArgs: any = { machineId };
    if (currentPage !== undefined) mutationArgs.currentPage = currentPage;
    if (cpuPercent !== undefined && !isNaN(cpuPercent)) mutationArgs.cpuPercent = cpuPercent;
    if (memPercent !== undefined && !isNaN(memPercent)) mutationArgs.memPercent = memPercent;
    if (diskPercent !== undefined && !isNaN(diskPercent)) mutationArgs.diskPercent = diskPercent;
    if (latencyMs !== undefined && !isNaN(latencyMs)) mutationArgs.latencyMs = latencyMs;
    if (heatingIssue !== undefined) mutationArgs.heatingIssue = heatingIssue;
    if (appVersion !== undefined) mutationArgs.appVersion = appVersion;

    await convex.mutation(api.machines.touchLastSeen, mutationArgs).catch((err) => {
      console.error("Failed to update lastSeenAt:", err)
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          machineId: result.machineId,
          price: result.price || "N/A",
          status: result.status,
          startTime: result.startTime,
          endTime: result.endTime,
          flushTimeMinutes: result.flushTimeMinutes || "N/A",
          mlToDispense: result.mlToDispense || "N/A",
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Failed to get machine data:", error)
    return NextResponse.json({ success: false, error: "Failed to get machine data" }, { status: 500 })
  }
}

