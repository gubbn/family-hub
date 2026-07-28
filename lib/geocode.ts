export async function getCoordinatesFromPostcode(
  postcode: string
) {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`
  )

  const data = await response.json()

  if (!data.result) {
    throw new Error('Postcode not found')
  }

  return {
    latitude: data.result.latitude,
    longitude: data.result.longitude,
  }
}