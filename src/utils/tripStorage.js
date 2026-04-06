import { DEFAULT_TRIP } from '../data/defaultTrip'

const STORAGE_KEY = 'pocket-money-trips'
const TRIP_VERSION_KEY = 'pocket-money-trips-version'
const CURRENT_VERSION = 2 // 버전 올리면 기본 데이터 교체

export function getTrips() {
  const ver = localStorage.getItem(TRIP_VERSION_KEY)
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw || Number(ver) < CURRENT_VERSION) {
    // 초기 데이터 로드 또는 기본 데이터 갱신
    const existing = raw ? JSON.parse(raw) : []
    // 이전 기본 여행 제거, 새 기본 여행 추가
    const userTrips = existing.filter(t => !t.id.startsWith('trip-hadong') && !t.id.startsWith('trip-geoje-2026'))
    const trips = [DEFAULT_TRIP, ...userTrips]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips))
    localStorage.setItem(TRIP_VERSION_KEY, String(CURRENT_VERSION))
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
