Paste `Code.gs` into your Google Apps Script project and deploy it as a Web App.

Setup

1. Open your Apps Script project.
2. Replace the existing `Code.gs` content with `apps-script/Code.gs`.
3. In Apps Script, open `Project Settings`.
4. Add these Script Properties:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
5. Make sure your Google Sheet has tabs like:
   - `Employees`
   - `Attendance` or monthly tabs like `Jan`, `Feb`, `Mar`
6. The first row in each sheet must be headers.

Expected headers

Employees
- `Name`

Attendance
- `Name`
- `Date`
- `ClockIn`
- `ClockOut`
- `Duration`
- `Status`

Deploy

1. Click `Deploy` -> `New deployment`
2. Select `Web app`
3. Execute as: `Me`
4. Who has access: `Anyone`
5. Deploy and copy the Web App URL

Test URLs

- Employees: `WEB_APP_URL?tab=Employees`
- Attendance: `WEB_APP_URL?tab=Attendance`

POST payloads

Append row

```json
{
  "action": "append",
  "tab": "Attendance",
  "record": {
    "Name": "Aung Aung",
    "Date": "'21/04/2026",
    "ClockIn": "'09:03 AM",
    "ClockOut": "",
    "Duration": "",
    "Status": "Late"
  }
}
```

Update row by match

```json
{
  "action": "updateByMatch",
  "tab": "Attendance",
  "match": {
    "Name": "Aung Aung",
    "Date": "'21/04/2026"
  },
  "updateData": {
    "ClockOut": "'05:35 PM",
    "Duration": "'8h 32m"
  }
}
```

Send Telegram

```json
{
  "action": "sendTelegram",
  "message": "Test message"
}
```
