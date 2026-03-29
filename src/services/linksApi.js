import { requestJson } from './httpClient'

export function fetchLinksRequest(apiUrl, token, signal) {
  return requestJson(`${apiUrl}/links`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
}

export function createLinkRequest(apiUrl, token, body) {
  return requestJson(`${apiUrl}/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

export function updateLinkRequest(apiUrl, token, shortCode, body) {
  return requestJson(`${apiUrl}/links/${shortCode}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

export function deleteLinkRequest(apiUrl, token, shortCode) {
  return requestJson(`${apiUrl}/links/${shortCode}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}
