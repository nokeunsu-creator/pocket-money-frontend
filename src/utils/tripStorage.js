import { DEFAULT_TRIP } from '../data/defaultTrip'

const STORAGE_KEY = 'pocket-money-trips'

export function getTrips() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    // 초기 데이터 로드
    const trips = [DEFAULT_TRIP]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
    return trips
  }
  return JSON.parse(raw)
}

export function getTrip(id) {
  return getTrips().find(t => t.id === id) || null
}

export function saveTrip(trip) {
  const trips = getTrips()
  const idx = trips.findIndex(t => t.id === trip.id)
  if (idx >= 0) {
    trips[idx] = trip
  } else {
    trips.push(trip)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
}

export function deleteTrip(id) {
  const trips = getTrips().filter(t => t.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
}

export function generateId() {
  return 'trip-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
}
