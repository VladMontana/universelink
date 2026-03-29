async function readJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const data = await readJsonSafe(response)
  return { response, data }
}
