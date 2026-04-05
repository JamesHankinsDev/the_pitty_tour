/**
 * Open-Meteo integration — free, no API key required.
 * Uses the geocoding API to resolve course names, then fetches a forecast
 * for the specific date. Caches results to minimize round-trips.
 */

export interface Forecast {
  date: string           // "2026-04-15"
  tempHigh: number       // °F
  tempLow: number        // °F
  precipProb: number     // 0-100
  windSpeed: number      // mph
  windDirection: number  // degrees
  weatherCode: number    // WMO code
  summary: string        // e.g. "Partly cloudy"
  emoji: string          // matching emoji
}

interface GeocodingResult {
  latitude: number
  longitude: number
  name: string
}

const geocodeCache = new Map<string, GeocodingResult | null>()
const forecastCache = new Map<string, Forecast | null>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const forecastTimestamps = new Map<string, number>()

// WMO Weather interpretation codes
function interpretWeatherCode(code: number): { summary: string; emoji: string } {
  if (code === 0) return { summary: 'Clear sky', emoji: '☀️' }
  if (code <= 2) return { summary: 'Mostly clear', emoji: '🌤️' }
  if (code === 3) return { summary: 'Overcast', emoji: '☁️' }
  if (code === 45 || code === 48) return { summary: 'Foggy', emoji: '🌫️' }
  if (code >= 51 && code <= 57) return { summary: 'Drizzle', emoji: '🌦️' }
  if (code >= 61 && code <= 67) return { summary: 'Rain', emoji: '🌧️' }
  if (code >= 71 && code <= 77) return { summary: 'Snow', emoji: '❄️' }
  if (code >= 80 && code <= 82) return { summary: 'Rain showers', emoji: '🌧️' }
  if (code >= 85 && code <= 86) return { summary: 'Snow showers', emoji: '🌨️' }
  if (code >= 95) return { summary: 'Thunderstorm', emoji: '⛈️' }
  return { summary: 'Mixed', emoji: '🌥️' }
}

/** Resolve a course/location name to lat/lng via Open-Meteo geocoding. */
async function geocode(query: string): Promise<GeocodingResult | null> {
  const key = query.toLowerCase().trim()
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
    const res = await fetch(url)
    if (!res.ok) {
      geocodeCache.set(key, null)
      return null
    }
    const data = await res.json()
    const first = data.results?.[0]
    if (!first) {
      geocodeCache.set(key, null)
      return null
    }
    const result: GeocodingResult = {
      latitude: first.latitude,
      longitude: first.longitude,
      name: first.name,
    }
    geocodeCache.set(key, result)
    return result
  } catch {
    geocodeCache.set(key, null)
    return null
  }
}

/**
 * Fetch a forecast for a given location and date.
 * @param query - course name or location string (e.g. "Bethpage Black" or "Farmingdale NY")
 * @param date - ISO date string "YYYY-MM-DD"
 * @returns forecast or null if unavailable
 */
export async function getForecast(query: string, date: string): Promise<Forecast | null> {
  const cacheKey = `${query.toLowerCase().trim()}|${date}`
  const ts = forecastTimestamps.get(cacheKey)
  if (ts && Date.now() - ts < CACHE_TTL) {
    return forecastCache.get(cacheKey) ?? null
  }

  // Open-Meteo only provides forecasts ~16 days out
  const daysOut = Math.floor((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (daysOut < 0 || daysOut > 16) {
    forecastCache.set(cacheKey, null)
    forecastTimestamps.set(cacheKey, Date.now())
    return null
  }

  try {
    const loc = await geocode(query)
    if (!loc) {
      forecastCache.set(cacheKey, null)
      forecastTimestamps.set(cacheKey, Date.now())
      return null
    }

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&start_date=${date}&end_date=${date}`

    const res = await fetch(url)
    if (!res.ok) {
      forecastCache.set(cacheKey, null)
      forecastTimestamps.set(cacheKey, Date.now())
      return null
    }

    const data = await res.json()
    const d = data.daily
    if (!d?.time?.[0]) {
      forecastCache.set(cacheKey, null)
      forecastTimestamps.set(cacheKey, Date.now())
      return null
    }

    const code = d.weather_code?.[0] ?? 0
    const interp = interpretWeatherCode(code)
    const forecast: Forecast = {
      date: d.time[0],
      tempHigh: Math.round(d.temperature_2m_max[0]),
      tempLow: Math.round(d.temperature_2m_min[0]),
      precipProb: Math.round(d.precipitation_probability_max?.[0] ?? 0),
      windSpeed: Math.round(d.wind_speed_10m_max?.[0] ?? 0),
      windDirection: Math.round(d.wind_direction_10m_dominant?.[0] ?? 0),
      weatherCode: code,
      summary: interp.summary,
      emoji: interp.emoji,
    }

    forecastCache.set(cacheKey, forecast)
    forecastTimestamps.set(cacheKey, Date.now())
    return forecast
  } catch {
    forecastCache.set(cacheKey, null)
    forecastTimestamps.set(cacheKey, Date.now())
    return null
  }
}

/** Convert wind direction in degrees to compass abbreviation. */
export function windCompass(degrees: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(degrees / 22.5) % 16]
}

/**
 * Search for cities/locations by name. Returns up to 5 matches from the
 * Open-Meteo geocoding API with full context (country, admin region).
 */
export interface LocationResult {
  id: number
  name: string
  latitude: number
  longitude: number
  country: string
  countryCode: string
  admin1?: string  // state/region
  timezone: string
}

export async function searchLocations(query: string): Promise<LocationResult[]> {
  if (query.trim().length < 2) return []
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country ?? '',
      countryCode: r.country_code ?? '',
      admin1: r.admin1,
      timezone: r.timezone,
    }))
  } catch {
    return []
  }
}

/**
 * Fetch a 7-day forecast for a specific lat/lng location.
 */
const multiDayCache = new Map<string, Forecast[]>()
const multiDayTimestamps = new Map<string, number>()

export async function getMultiDayForecast(
  latitude: number,
  longitude: number,
  days = 7
): Promise<Forecast[]> {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)},${days}`
  const ts = multiDayTimestamps.get(cacheKey)
  if (ts && Date.now() - ts < CACHE_TTL) {
    return multiDayCache.get(cacheKey) ?? []
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=${days}`
    const res = await fetch(url)
    if (!res.ok) return []

    const data = await res.json()
    const d = data.daily
    if (!d?.time) return []

    const forecasts: Forecast[] = d.time.map((date: string, i: number) => {
      const code = d.weather_code?.[i] ?? 0
      const interp = interpretWeatherCode(code)
      return {
        date,
        tempHigh: Math.round(d.temperature_2m_max[i]),
        tempLow: Math.round(d.temperature_2m_min[i]),
        precipProb: Math.round(d.precipitation_probability_max?.[i] ?? 0),
        windSpeed: Math.round(d.wind_speed_10m_max?.[i] ?? 0),
        windDirection: Math.round(d.wind_direction_10m_dominant?.[i] ?? 0),
        weatherCode: code,
        summary: interp.summary,
        emoji: interp.emoji,
      }
    })

    multiDayCache.set(cacheKey, forecasts)
    multiDayTimestamps.set(cacheKey, Date.now())
    return forecasts
  } catch {
    return []
  }
}
