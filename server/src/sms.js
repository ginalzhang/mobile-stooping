import twilio from 'twilio';

let client;

function twilioClient() {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
}

export async function sendSMS(to, body) {
  return twilioClient().messages.create({
    from: process.env.TWILIO_FROM,
    to,
    body
  });
}

function findWord(count) {
  return count === 1 ? 'find' : 'finds';
}

export const MSG = {
  fridayConfirm: (reservation, count) =>
    `Stooping Club: keep your ${count} reserved ${findWord(count)} for Sunday 2-3 PM pickup? ` +
    `Reply YES by 5 PM today or they go back up for someone else. Pass ${reservation.pass_code}.`,
  sundayReminder: (reservation) =>
    `Stooping Club: pickup today 2-3 PM at Security Public Storage, 1711 Eastshore Blvd, El Cerrito. ` +
    `Show pass ${reservation.pass_code}.`,
  relisted: (_reservation, count) =>
    `Stooping Club: we did not hear back, so your held ${findWord(count)} ${count === 1 ? 'was' : 'were'} relisted for other neighbors. ` +
    `No charge. Browse again anytime.`,
  confirmAck: (reservation) =>
    `You are confirmed. See you Sunday 2-3 PM. Pass ${reservation.pass_code}.`
};
