const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendPush(to, { title, body, data }) {
  if (!to) {
    throw new Error("Missing Expo push token.");
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to,
      title,
      body,
      data,
      sound: "default"
    })
  });

  if (!response.ok) {
    throw new Error(`Expo push request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const ticket = Array.isArray(payload.data) ? payload.data[0] : payload.data;

  if (ticket?.status === "error") {
    throw new Error(ticket.message || "Expo push ticket returned an error.");
  }

  return payload;
}
