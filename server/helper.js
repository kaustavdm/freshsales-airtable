'use strict'

/**
 * Functions common to more than two places.
 *
 * @name helper
 * @class
 */
exports = {

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
      console.log(payload)
    } catch (err) {
      console.error('Error parsing JSON', err.message)
      this.handleError(err)
    }
    return res
  },

  /**
   * All good errors come here to be forgotten.
   *
   * @todo Improve error handling
   * @static
   * @param {Error} err - An `error` object
   */
  handleError (err) {
    if (/^[1-5][0-9][0-9]$/.test(err.status)) {
      console.log('Status: ' + err.status + ' Message: ' + err.message)
    }
    else {
      console.error('Error: ' + err.status + ': ' + err.message)
    }
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
