import { requestJson } from './httpClient'

export function registerRequest(apiUrl, email, password) {
  return requestJson(`${apiUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}

export function loginRequest(apiUrl, email, password) {
  return requestJson(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
}
