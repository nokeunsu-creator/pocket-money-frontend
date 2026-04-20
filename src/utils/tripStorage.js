import { DEFAULT_TRIP } from '../data/defaultTrip'
import {
  getTripsApi, getTripApi, createTripApi, updateTripApi, deleteTripApi,
} from '../api/api'

const LEGACY_STORAGE_KEY = 'pocket-money-trips'
const LEGACY_VERSION_KEY = 'pocket-money-trips-version'
const MIGRATED_KEY = 'pocket-money-trips-server-migrated'

let migrationPromise = null

async function runMigration() {
  if (localStorage.getItem(MIGRATED_KEY)) return
  try {
    const serverTrips = await getTripsApi()
    if (serverTrips.length === 0) {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
      let migrated = false
      if (raw) {
        try {
          const trips = JSON.parse(raw)
          for (const trip of trips) {
            const { id, ...rest } = trip
            try { await createTripApi(rest); migrated = true } catch (_) { /* skip */ }
          }
        } catch (_) { /* ignore parse error */ }
      }
      if (!migrated) {
        const { id, ...rest } = DEFAULT_TRIP
        try { await createTripApi(rest) } catch (_) { /* skip */ }
      }
    }
  } finally {
    localStorage.setItem(MIGRATED_KEY, '1')
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    localStorage.removeItem(LEGACY_VERSION_KEY)
  }
}

function ensureMigrated() {
  if (!migrationPromise) migrationPromise = runMigration()
  return migrationPromise
}

export async function getTrips() {
  await ensureMigrated()
  return getTripsApi()
}

export async function getTrip(id) {
  await ensureMigrated()
  if (id == null) return null
  try {
    return await getTripApi(id)
  } catch (_) {
    return null
  }
}

export async function saveTrip(trip) {
  if (trip.id != null) {
    const { id, ...rest } = trip
    return updateTripApi(id, rest)
  }
  const { id, ...rest } = trip
  return createTripApi(rest)
}

export async function deleteTrip(id) {
  return deleteTripApi(id)
}
