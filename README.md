# Freshsales <> Airtable sync

A [Freshsales custom app][_customapp] to sync an Airtable sheet with Freshsales leads.

# Install

These are step-by-step instructions for installing this app as a custom app in Freshsales.

## 1. Set up Freshsales

1. Create a [Freshsales account][_fs] if you don't have one already
2. Get your [Freshsales API Key][_fsapi]. You will need this for installation.

## 2. Set up Airtable

3. Create an Airtable base with the [schema][_schema] mentioned below
4. Get [Airtable API credentials][_airtableapi] for your base. To do this, login to Airtable, go to the [Airtable API][_airtableapi] page, and click the base you have created. You will need these three details:
    - `Airtable API Key`: Get your Airtable API key from the [Account Settings][_airtableaccount] page.
    - `Airtable Base ID`: The ID for your Airtable base. You will see this on the API docs page for your base
    - `Airtable Table name`: The name of the table you have created in the Airtable base

### Airtable schema

The Airtable sheet should contain these columns:

 - `ID` - Numeric. Primary field
 - `First Name` - Text
 - `Last Name` - Text
 - `Email` - Email address
 - `LinkedIn` - URL
 - `City` - Text
 - `Company` - Text
 - `Created At` - Create date/time
 - `Updated At` - Last updated date/time
 - `Delete` - Checkbox
 - `Synced` - Checkbox

Here is an [example Airtable base][_base] with this schema.

## 3. Set up the custom app

5. [Download the latest version][_release] of the app's packed `.zip` file
6. Upload the `.zip` file as a ["Custom App"][_customapp] in Freshsales
7. Install the credentials received from the previous steps in the "Install" screen

That's it. You are all set. Try creating a record in your Airtable base.

# License

Released under the [MIT](LICENSE) license.

[_fs]: https://freshsales.io
[_fsapi]: https://support.freshsales.io/support/solutions/articles/220099-how-to-find-my-api-key
[_schema]: #airtable-schema
[_airtableapi]: https://airtable.com/api
[_airtableaccount]: https://airtable.com/account
[_release]: https://github.com/kaustavdm/freshsales-airtable/releases/download/v0.1.0/freshsales-airtable.zip
[_customapp]: https://developer.freshsales.io/docs/custom-apps/
[_base]: https://airtable.com/shrScfEcJP2MEfc4s/tbl0awCqKktPtAMd3