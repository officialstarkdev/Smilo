/**
 * Email stub. In production swap sendMail for nodemailer / Resend / SES.
 * Everything the clinic would email is logged so the flow is visible in dev.
 */
export async function sendMail({ to, subject, text }) {
  console.log('\n--- MAIL (dev stub) -------------------------');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(text);
  console.log('---------------------------------------------\n');
}

const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
export const manageUrl = (token) => `${clientUrl()}/manage/${token}`;

const when = (a) => {
  const d = new Date(`${a.date}T${a.start}:00`);
  return d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export function mailConfirmed(appt, dentistName) {
  return sendMail({
    to: appt.patient.email,
    subject: `You're booked: ${appt.treatmentName}, ${when(appt)}`,
    text:
      `Hi ${appt.patient.name.split(' ')[0]},\n\n` +
      `${appt.treatmentName} with ${dentistName}\n${when(appt)} (about ${appt.duration} minutes)\n\n` +
      `Need to move or cancel? ${manageUrl(appt.manageToken)}\n` +
      `Or use code ${appt.manageCode} with this email at smilo.clinic/manage.\n\n` +
      `See you soon,\nSmilo`,
  });
}

export function mailRescheduled(appt, dentistName) {
  return sendMail({
    to: appt.patient.email,
    subject: `Moved: ${appt.treatmentName} is now ${when(appt)}`,
    text:
      `Hi ${appt.patient.name.split(' ')[0]},\n\nYour appointment has moved.\n` +
      `${appt.treatmentName} with ${dentistName}\n${when(appt)}\n\nManage it here: ${manageUrl(appt.manageToken)}\n\nSmilo`,
  });
}

export function mailCancelled(appt) {
  const byStaff = appt.cancelledBy === 'staff';
  return sendMail({
    to: appt.patient.email,
    subject: `Cancelled: ${appt.treatmentName} on ${appt.date}`,
    text:
      `Hi ${appt.patient.name.split(' ')[0]},\n\n` +
      (byStaff
        ? `We're sorry, we had to cancel your ${appt.treatmentName} on ${when(appt)}.`
        : `Your ${appt.treatmentName} on ${when(appt)} is cancelled.`) +
      (appt.cancelReason ? `\nReason: ${appt.cancelReason}` : '') +
      `\n\nWhenever you're ready, you can book again at ${clientUrl()}/book.\n\nSmilo`,
  });
}
