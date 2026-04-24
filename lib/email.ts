import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface VisitorNotification {
  workerName: string;
  workerEmail: string;
  visitorName: string;
  phone: string;
  reason: string;
  time: string;
  companyName: string;
}

export async function notifyWorker(data: VisitorNotification) {
  if (!resend) return;

  const fromAddress = process.env.EMAIL_FROM || "Visitor Log <noreply@resend.dev>";

  await resend.emails.send({
    from: fromAddress,
    to: data.workerEmail,
    subject: `Visitor Arrival: ${data.visitorName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px;">
        <h2 style="margin-bottom: 4px;">Visitor Arrival — ${data.companyName}</h2>
        <p>Hi ${data.workerName},</p>
        <p><strong>${data.visitorName}</strong> has arrived to see you.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Phone</td><td>${data.phone}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Reason</td><td>${data.reason}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Time</td><td>${data.time}</td></tr>
        </table>
      </div>
    `,
  });
}

interface AdminNotification {
  adminEmails: string[];
  visitorName: string;
  phone: string;
  reason: string;
  workerName: string | null;
  time: string;
  companyName: string;
}

export async function notifyAdmins(data: AdminNotification) {
  if (!resend || data.adminEmails.length === 0) return;

  const fromAddress = process.env.EMAIL_FROM || "Visitor Log <noreply@resend.dev>";
  const visiting = data.workerName || "General Visit";

  await resend.emails.send({
    from: fromAddress,
    to: data.adminEmails,
    subject: `Visitor Check-In: ${data.visitorName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px;">
        <h2 style="margin-bottom: 4px;">New Visitor Check-In — ${data.companyName}</h2>
        <p><strong>${data.visitorName}</strong> has checked in at ${data.companyName}.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Visiting</td><td>${visiting}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Phone</td><td>${data.phone}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Reason</td><td>${data.reason}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Time</td><td>${data.time}</td></tr>
        </table>
      </div>
    `,
  });
}
