'use strict'

/**
 * Functions common to more than two places.
 *
 * @name helper
 * @class
 */
module.exports = {

  /**
   * Parse a JSON response from a known HTTP response.
   *
   * @static
   * @param {Object} payload - HTTP response object
   * @returns {Object} - Parsed JSON as an `object`
   */
  parseRes (payload) {
    var res
    try {
      res = JSON.parse(payload.response)
    } catch (err) {
      console.error('Error parsing JSON', err.message)
      throw err
    }
    return res
  },

  /**
   * All good errors come here to be forgotten.
   *
   * @static
   * @param {Error} err - An `error` object
   */
  handleError (err) {
    console.error('Error: ' + (err.message || err.status))
    console.error('Error details', err)
  },

  /**
   * Produce an ISO date stamp string relative to current time.
   *
   * @static
   * @param {Number} addMs - Number of miliseconds to add to current time
   * @returns {String} - ISO Date time stamp
   */
  dateStamp (addMs) {
    return new Date((new Date()).getTime() + addMs).toISOString()
  }
}
