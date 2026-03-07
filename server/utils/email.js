import { Resend } from 'resend';

const hasEmailEnv = () => !!process.env.RESEND_API_KEY;

const getResendClient = () => {
  if (!hasEmailEnv()) {
    throw new Error('Email provider credentials are missing. Set RESEND_API_KEY.');
  }

  return new Resend(process.env.RESEND_API_KEY);
};

export const verifyEmailTransporter = async () => {
  try {
    if (!hasEmailEnv()) {
      console.warn('Email provider not configured: RESEND_API_KEY missing');
      return;
    }

    if (!process.env.EMAIL_FROM) {
      console.warn('Email sender not configured: EMAIL_FROM missing');
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('Resend email provider configured and ready');
    }
  } catch (err) {
    console.error('Email provider verification failed:', err.message);
    throw err;
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM is missing. Set EMAIL_FROM to a verified sender email.');
  }

  const resend = getResendClient();

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message || 'Unknown error'}`);
  }
};

export const sendOtpEmail = async ({ to, otp, purpose }) => {
  const subject = `${purpose} Verification Code`;
  const text = `Your verification code is ${otp}. It expires in 10 minutes.`;
  const html = `
    <p>Your verification code is <strong>${otp}</strong>.</p>
    <p>This code expires in 10 minutes.</p>
  `;

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${purpose} sent to ${to}: ${otp}`);
  }

  await sendEmail({ to, subject, text, html });
};
