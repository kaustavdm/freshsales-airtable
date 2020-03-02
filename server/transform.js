var transforms = [
  {
    from: 'freshsales',
    to: 'airtable',
    fn: function (values) {
      return {
        id: values.ID,
        first_name: values['First Name'],
        last_name: values['Last Name'],
        email: values.Email,
        company: {
          name: values.Company
        },
        linkedin: values.LinkedIn,
        created_at: values['Created At']
      }
    }
  },
  {
    from: 'airtable',
    to: 'freshsales',
    fn: function (values) {
      return {
        recordId: null,
        fields: {
          ID: values.id,
          'First Name': values.first_name,
          'Last Name': values.last_name,
          Company: values.company.name,
          Email: values.email,
          LinkedIn: values.linkedin,
          'Created At': values.created_at
        }
      }
    }
  }
]

module.exports = function transform (from, to, values) {
  var t = transforms.filter(function (elem) {
    return elem.from === from && elem.to === to
  })
  if (t[0] && typeof t[0].fn === 'function') {
    return t[0].fn.apply({}, [values])
  } else {
    throw new Error('Transformer not found for ' + from + ' to ' + to)
  }
}
