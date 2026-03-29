import { requestJson } from './httpClient'

export function fetchLinkStatsRequest(apiUrl, token, shortCode, signal) {
  return requestJson(`${apiUrl}/links/${shortCode}/stats`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
}
