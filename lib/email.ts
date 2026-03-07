import nodemailer from "nodemailer";

type AccountInviteEmailInput = {
  toEmail: string;
  inviteUrl: string;
  expiresAt: Date;
};

type OperatorPasswordResetEmailInput = {
  toEmail: string;
  username: string;
  inviteUrl: string;
  expiresAt: Date;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function parseSmtpPort(raw: string): number {
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error("SMTP_PORT is invalid");
  }

  return parsed;
}

function parseSmtpSecure(raw: string | undefined, port: number): boolean {
  if (!raw) {
    return port === 465;
  }

  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is missing`);
  }

  return value.trim();
}

function getSmtpConfig(): SmtpConfig {
  const host = getRequiredEnv("SMTP_HOST");
  const port = parseSmtpPort(getRequiredEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = getRequiredEnv("SMTP_FROM");
  const secure = parseSmtpSecure(process.env.SMTP_SECURE, port);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from
  };
}

export async function sendAccountInviteEmail(input: AccountInviteEmailInput): Promise<void> {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });

  const expiresAtIso = input.expiresAt.toISOString();
  const subject = "Complete your account setup";
  const text = [
    "An account invitation was created for this email.",
    "",
    "Use the link below to set your username and password:",
    input.inviteUrl,
    "",
    `This link expires at: ${expiresAtIso} (UTC).`,
    "If you did not expect this email, you can ignore it."
  ].join("\n");

  const html = [
    "<p>An account invitation was created for this email.</p>",
    "<p>Use the link below to set your username and password:</p>",
    `<p><a href="${input.inviteUrl}">${input.inviteUrl}</a></p>`,
    `<p>This link expires at: <strong>${expiresAtIso}</strong> (UTC).</p>`,
    "<p>If you did not expect this email, you can ignore it.</p>"
  ].join("");

  await transporter.sendMail({
    from: smtp.from,
    to: input.toEmail,
    subject,
    text,
    html
  });
}

export async function sendOperatorPasswordResetEmail(input: OperatorPasswordResetEmailInput): Promise<void> {
  const smtp = getSmtpConfig();
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });

  const expiresAtIso = input.expiresAt.toISOString();
  const subject = "Reset your account password";
  const text = [
    `A password reset was requested for username: ${input.username}.`,
    "",
    "Use the link below to set a new password:",
    input.inviteUrl,
    "",
    "On the setup page, enter your existing username and new password.",
    `This link expires at: ${expiresAtIso} (UTC).`,
    "If you did not expect this email, please contact your administrator."
  ].join("\n");

  const html = [
    `<p>A password reset was requested for username: <strong>${input.username}</strong>.</p>`,
    "<p>Use the link below to set a new password:</p>",
    `<p><a href="${input.inviteUrl}">${input.inviteUrl}</a></p>`,
    "<p>On the setup page, enter your existing username and new password.</p>",
    `<p>This link expires at: <strong>${expiresAtIso}</strong> (UTC).</p>`,
    "<p>If you did not expect this email, please contact your administrator.</p>"
  ].join("");

  await transporter.sendMail({
    from: smtp.from,
    to: input.toEmail,
    subject,
    text,
    html
  });
}
