/**
 * @typedef {Object} Link
 * @property {number} id
 * @property {string} short_code
 * @property {string} original_url
 * @property {number} click_count
 * @property {number | null} max_clicks
 * @property {string | null} expires_at
 * @property {string} created_at
 */

/**
 * @typedef {Object} ClickRecord
 * @property {string} clicked_at
 * @property {string | null} ip_address
 * @property {string} user_agent
 */

/**
 * @typedef {Object} AnalyticsData
 * @property {number} total_clicks
 * @property {ClickRecord[]} clicks
 */

export const models = {}
