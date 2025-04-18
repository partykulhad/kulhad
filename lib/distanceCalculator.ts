/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in km
  return Number.parseFloat(distance.toFixed(2))
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Calculates the total trip distance for a delivery agent
 * @param agentLat Agent's current latitude
 * @param agentLon Agent's current longitude
 * @param kitchenLat Kitchen's latitude
 * @param kitchenLon Kitchen's longitude
 * @param destinationLat Destination's latitude
 * @param destinationLon Destination's longitude
 * @returns Total distance in kilometers
 */
export function calculateTotalTripDistance(
  agentLat: number,
  agentLon: number,
  kitchenLat: number,
  kitchenLon: number,
  destinationLat: number,
  destinationLon: number,
): number {
  // Calculate distance from agent to kitchen
  const distanceAgentToKitchen = calculateDistance(agentLat, agentLon, kitchenLat, kitchenLon)

  // Calculate distance from kitchen to destination
  const distanceKitchenToDestination = calculateDistance(kitchenLat, kitchenLon, destinationLat, destinationLon)

  // Calculate distance from destination back to kitchen
  const distanceDestinationToKitchen = calculateDistance(destinationLat, destinationLon, kitchenLat, kitchenLon)

  // Calculate total distance
  const totalDistance = distanceAgentToKitchen + distanceKitchenToDestination + distanceDestinationToKitchen

  return Number.parseFloat(totalDistance.toFixed(2))
}
