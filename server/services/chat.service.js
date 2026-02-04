import Chat from '../models/Chat.js';

export const upgradeChatToBooked = async ({ renterId, ownerId, chargerId, bookingId }) => {
  if (!renterId || !ownerId || !chargerId || !bookingId) return null;

  const chat = await Chat.findOne({ renterId, ownerId, chargerId });
  if (!chat) return null;

  if (String(chat.bookingId) === String(bookingId) && chat.chatType === 'BOOKED') {
    return chat;
  }

  chat.chatType = 'BOOKED';
  chat.bookingId = bookingId;
  await chat.save();
  return chat;
};
