'use client'

import { useEffect, useState } from 'react'
import { getSetting } from '../lib/settings'

export default function DogWalkSuggestion() {
  const [bestTime, setBestTime] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function loadWeather() {
      try {
        const homePostcode = await getSetting('home_postcode')

        if (!homePostcode) {
          throw new Error('Home postcode not set')
        }

        const postcodeResponse = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(
            homePostcode
          )}`
        )

        const postcodeData = await postcodeResponse.json()

        if (!postcodeData.result) {
          throw new Error('Postcode not found')
        }

        const { latitude, longitude } = postcodeData.result

        const weatherResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=precipitation_probability&forecast_days=1&timezone=auto`
        )

        const weatherData = await weatherResponse.json()
        const now = new Date()

        const bestHour = weatherData.hourly.time.find(
          (time: string, index: number) => {
            const hourDate = new Date(time)
            const rainChance =
              weatherData.hourly.precipitation_probability[index]

            return hourDate > now && rainChance <= 30
          }
        )

        if (bestHour) {
          setBestTime(
            new Date(bestHour).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
            })
          )
        } else {
          setBestTime(null)
        }
      } catch (error) {
        console.error('Dog walk suggestion failed:', error)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadWeather()
  }, [])

  if (loading) {
    return <span>🐶 Checking best walk time...</span>
  }

  if (error) {
    return <span>🐶 Dog walk weather unavailable</span>
  }

  if (!bestTime) {
    return <span>🐶 Rain expected today - take waterproofs</span>
  }

  return <span>🐶 Best dog walk from {bestTime}</span>
}