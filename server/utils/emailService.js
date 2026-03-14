const sendEmail = async ({ to, subject }) => {
  // Email delivery is disabled because OTP/resend mail system was removed.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL_DISABLED] Skipping email to ${to} (${subject})`);
  }
};

export const EMAIL_TYPES = {
  BOOKING_CONFIRMED_RENTER: 'BOOKING_CONFIRMED_RENTER',
  BOOKING_CONFIRMED_HOST: 'BOOKING_CONFIRMED_HOST',
  BOOKING_CANCELLED_BY_RENTER_RENTER: 'BOOKING_CANCELLED_BY_RENTER_RENTER',
  BOOKING_CANCELLED_BY_RENTER_HOST: 'BOOKING_CANCELLED_BY_RENTER_HOST',
  BOOKING_CANCELLED_BY_HOST_RENTER: 'BOOKING_CANCELLED_BY_HOST_RENTER',
  CHARGER_LISTED_HOST: 'CHARGER_LISTED_HOST',
  CHARGER_DISABLED_HOST: 'CHARGER_DISABLED_HOST',
  CHARGER_ENABLED_HOST: 'CHARGER_ENABLED_HOST',
};

const baseTemplate = ({ title, intro, rows = [], ctaLabel, ctaUrl, footer }) => {
  const rowHtml = rows
    .filter(Boolean)
    .map(([label, value]) => `<tr><td style="padding:4px 0;color:#4b5563;">${label}</td><td style="padding:4px 0;text-align:right;color:#111827;font-weight:600;">${value}</td></tr>`) // eslint-disable-line max-len
    .join('');

  const ctaHtml = ctaLabel && ctaUrl
    ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:16px;padding:12px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${ctaLabel}</a>`
    : '';

  return `
  <div style="font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;background:#f9fafb;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#111827;">${title}</h2>
      <p style="margin:0 0 16px;color:#374151;">${intro}</p>
      ${rows.length ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;">${rowHtml}</table>` : ''}
      ${ctaHtml}
    </div>
    <p style="max-width:640px;margin:16px auto 0;color:#9ca3af;font-size:12px;text-align:center;">${footer || 'Thank you for using our EV Charger platform.'}</p>
  </div>`;
};

const formatDateTime = (isoString) => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch (err) {
    return isoString;
  }
};

const buildTemplate = (type, payload = {}) => {
  const {
    bookingId,
    chargerTitle,
    location,
    startTime,
    endTime,
    price,
    renterName,
    hostName,
    refundAmount,
    status,
  } = payload;

  const dateRange = [formatDateTime(startTime), formatDateTime(endTime)].filter(Boolean).join(' — ');
  const rowsCommon = [
    ['Booking ID', bookingId],
    ['Charger', chargerTitle],
    ['Location', location],
    ['Date & Time', dateRange],
    ['Price', price != null ? `₹${Number(price).toFixed(2)}` : null],
  ].filter(([, v]) => Boolean(v));

  switch (type) {
    case EMAIL_TYPES.BOOKING_CONFIRMED_RENTER: {
      return {
        subject: `Booking confirmed: ${chargerTitle || 'Your charger'}`,
        html: baseTemplate({
          title: 'Your booking is confirmed',
          intro: `Hi ${renterName || 'there'}, your booking has been confirmed.`,
          rows: rowsCommon,
          footer: 'Need to change something? Open the app to manage your booking.',
        }),
      };
    }
    case EMAIL_TYPES.BOOKING_CONFIRMED_HOST: {
      return {
        subject: `New booking for ${chargerTitle || 'your charger'}`,
        html: baseTemplate({
          title: 'You have a new booking',
          intro: `Hi ${hostName || 'Host'}, a renter just booked your charger.`,
          rows: rowsCommon,
        }),
      };
    }
    case EMAIL_TYPES.BOOKING_CANCELLED_BY_RENTER_RENTER: {
      return {
        subject: `Booking cancelled: ${chargerTitle || bookingId}`,
        html: baseTemplate({
          title: 'Your booking was cancelled',
          intro: 'You cancelled this booking. Any eligible refund will be processed per policy.',
          rows: rowsCommon,
          footer: status ? `Refund status: ${status}` : undefined,
        }),
      };
    }
    case EMAIL_TYPES.BOOKING_CANCELLED_BY_RENTER_HOST: {
      return {
        subject: `Booking cancelled by renter: ${chargerTitle || bookingId}`,
        html: baseTemplate({
          title: 'A renter cancelled their booking',
          intro: `${renterName || 'The renter'} cancelled the booking.`,
          rows: rowsCommon,
        }),
      };
    }
    case EMAIL_TYPES.BOOKING_CANCELLED_BY_HOST_RENTER: {
      return {
        subject: `Booking cancelled by host: ${chargerTitle || bookingId}`,
        html: baseTemplate({
          title: 'The host cancelled your booking',
          intro: `${hostName || 'The host'} cancelled this booking. Refunds will be processed automatically.`,
          rows: rowsCommon.concat(
            refundAmount != null ? [['Refund Amount', `₹${Number(refundAmount).toFixed(2)}`]] : []
          ),
          footer: status ? `Refund status: ${status}` : undefined,
        }),
      };
    }
    case EMAIL_TYPES.CHARGER_LISTED_HOST: {
      return {
        subject: `Charger listed: ${chargerTitle || 'New charger'}`,
        html: baseTemplate({
          title: 'Your charger is live',
          intro: `Hi ${hostName || 'Host'}, your charger has been listed successfully.`,
          rows: [
            ['Charger', chargerTitle],
            ['Location', location],
            ['Status', status || 'Active'],
          ].filter(([, v]) => Boolean(v)),
        }),
      };
    }
    case EMAIL_TYPES.CHARGER_DISABLED_HOST: {
      return {
        subject: `Charger disabled: ${chargerTitle || 'Your charger'}`,
        html: baseTemplate({
          title: 'Your charger has been disabled',
          intro: `Hi ${hostName || 'Host'}, your charger is now disabled.`,
          rows: [
            ['Charger', chargerTitle],
            ['Reason', status || 'Disabled'],
          ].filter(([, v]) => Boolean(v)),
        }),
      };
    }
    case EMAIL_TYPES.CHARGER_ENABLED_HOST: {
      return {
        subject: `Charger enabled: ${chargerTitle || 'Your charger'}`,
        html: baseTemplate({
          title: 'Your charger is active again',
          intro: `Hi ${hostName || 'Host'}, your charger has been re-enabled and is accepting bookings.`,
          rows: [
            ['Charger', chargerTitle],
            ['Status', 'Active'],
          ].filter(([, v]) => Boolean(v)),
        }),
      };
    }
    default:
      return {
        subject: 'Notification',
        html: baseTemplate({ title: 'Notification', intro: 'You have a new update.' }),
      };
  }
};

export const sendNotificationEmail = async (to, type, payload = {}) => {
  if (!to) return;
  const { subject, html } = buildTemplate(type, payload);
  const text = `${subject}\n\n` + Object.entries(payload || {})
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  await sendEmail({ to, subject, text, html });
};
