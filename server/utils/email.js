import nodemailer from 'nodemailer';

const hasEmailEnv = () => !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const getTransporter = () => {
  if (!hasEmailEnv()) {
    throw new Error('Email credentials are missing. Set EMAIL_USER and EMAIL_PASS.');
  }

  // return nodemailer.createTransport({
  //   service: 'gmail',
  //   auth: {
  //     user: process.env.EMAIL_USER,
  //     pass: process.env.EMAIL_PASS,
  //   },
  // });
  return nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
});
};

export const verifyEmailTransporter = async () => {
  try {
    if (!hasEmailEnv()) {
      console.warn('Email transporter not configured: EMAIL_USER/EMAIL_PASS missing');
      return;
    }

    const transporter = getTransporter();
    await transporter.verify();
    if (process.env.NODE_ENV !== 'production') {
      console.log('Email transporter verified and ready');
    }
  } catch (err) {
    console.error('Email transporter verification failed:', err.message);
    throw err;
  }
};

export const sendEmail = async ({ to, subject, text, html }) => {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const transporter = getTransporter();

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
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
