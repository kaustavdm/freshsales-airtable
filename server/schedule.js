'use strict'

/* global $schedule */

module.exports = {
  name: 'freshsales-airtable-sync',

  create (payload) {
    var opts = {
      name: this.name,
      data: payload,
      schedule_at: new Date((new Date()).getTime() + 60000).toISOString(), // 1 mins from now
      repeat: {
        time_unit: 'minutes',
        frequency: 1
      }
    }
    return $schedule.create(opts)
      .fail(function (err) {
        console.error('Cannot schedule sync\n', err.message)
      })
  },

  delete () {
    return $schedule.delete({
      name: this.name
    })
  }
}
