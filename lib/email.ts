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

interface OtherReasonNotification {
  toEmail: string;
  visitorName: string;
  phone: string;
  reason: string;
  companyName: string;
  time: string;
}

export async function notifyOtherReason(data: OtherReasonNotification) {
  if (!resend) return;

  const fromAddress = process.env.EMAIL_FROM || "Visitor Log <noreply@resend.dev>";

  await resend.emails.send({
    from: fromAddress,
    to: data.toEmail,
    subject: `Visitor Check-In (Other): ${data.visitorName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px;">
        <h2 style="margin-bottom: 4px;">Visitor Check-In — ${data.companyName}</h2>
        <p><strong>${data.visitorName}</strong> has checked in with reason "Other".</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Phone</td><td>${data.phone}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Reason</td><td>${data.reason}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Time</td><td>${data.time}</td></tr>
        </table>
      </div>
    `,
  });
}

interface NonCitizenAlert {
  adminEmails: string[];
  visitorName: string;
  phone: string;
  reason: string;
  workerName: string | null;
  visitorCompany: string | null;
  time: string;
  companyName: string;
}

export async function notifyNonCitizen(data: NonCitizenAlert) {
  if (!resend || data.adminEmails.length === 0) return;

  const fromAddress = process.env.EMAIL_FROM || "Visitor Log <noreply@resend.dev>";
  const visiting = data.workerName || "General Visit";

  await resend.emails.send({
    from: fromAddress,
    to: data.adminEmails,
    subject: `⚠ ITAR ALERT: Non-US Citizen Visitor — ${data.visitorName}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px;">
        <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <h2 style="margin: 0 0 8px 0; color: #92400e;">⚠ Non-US Citizen Visitor Alert</h2>
          <p style="margin: 0; color: #92400e;">A non-US citizen has checked in. ITAR restrictions may apply. Please verify access permissions immediately.</p>
        </div>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px 4px 0; color: #666; font-weight: bold;">Visitor</td><td><strong>${data.visitorName}</strong></td></tr>
          ${data.visitorCompany ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">Company</td><td>${data.visitorCompany}</td></tr>` : ""}
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Visiting</td><td>${visiting}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Phone</td><td>${data.phone}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Reason</td><td>${data.reason}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Time</td><td>${data.time}</td></tr>
          <tr><td style="padding: 4px 12px 4px 0; color: #666;">Citizenship</td><td style="color: #dc2626; font-weight: bold;">Non-US Citizen</td></tr>
        </table>
      </div>
    `,
  });
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
