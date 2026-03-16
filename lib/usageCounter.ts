// Shared in-memory request counter
// Note: resets on each Vercel cold start (serverless limitation)

let requestsToday = 0
let lastResetDate = ''

function checkReset() {
  const today = new Date().toDateString()
  if (today !== lastResetDate) {
    requestsToday = 0
    lastResetDate = today
  }
}

export function incrementUsage() {
  checkReset()
  requestsToday++
}

export function getUsage() {
  checkReset()
  return {
    today: requestsToday,
    lastReset: lastResetDate,
  }
}
