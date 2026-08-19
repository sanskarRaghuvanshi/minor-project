import 'dotenv/config';
import nodemailer from 'nodemailer';
import logger from './logger.js';

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM,
} = process.env;

const hasSmtpConfig = EMAIL_HOST && EMAIL_PORT && EMAIL_USER && EMAIL_PASS;

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT),
      secure: Number(EMAIL_PORT) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS.replace(/\s/g, ''),
      },
    })
  : null;

if (!hasSmtpConfig) {
  logger.warn('SMTP not configured. Email operations will fall back to console logging.');
}

export const isEmailConfigured = () => Boolean(transporter);

export const getTransporter = () => transporter;

export const getFromAddress = () => EMAIL_FROM || 'Smart Attendance <noreply@example.com>';

export default transporter;
