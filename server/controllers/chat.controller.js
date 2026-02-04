import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Booking from '../models/Booking.js';
import Charger from '../models/Charger.js';
import ChatReport from '../models/ChatReport.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import { getIO } from '../socket.js';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_REGEX = /(\+?\d[\d\s\-().]{7,}\d)/;

const containsContactInfo = (text) => EMAIL_REGEX.test(text) || PHONE_REGEX.test(text);

const ensureChatMember = (chat, userId) => {
  const isRenter = chat.renterId.toString() === userId.toString();
  const isOwner = chat.ownerId.toString() === userId.toString();
  if (!isRenter && !isOwner) {
    throw new ForbiddenError('You are not part of this chat');
  }
  return { isRenter, isOwner };
};

export const createOrUpgradeChat = async (req, res, next) => {
  try {
    const { chargerId, bookingId } = req.body;
    if (!chargerId) throw new ValidationError('Charger ID is required');

    if (req.user.role === 'owner') {
      throw new ForbiddenError('Only renters can start chats');
    }

    const charger = await Charger.findById(chargerId);
    if (!charger) throw new NotFoundError('Charger');

    if (charger.owner.toString() === req.user._id.toString()) {
      throw new ValidationError('You cannot chat with yourself');
    }

    let booking = null;
    if (bookingId) {
      booking = await Booking.findById(bookingId);
      if (!booking) throw new NotFoundError('Booking');
      if (booking.renter.toString() !== req.user._id.toString()) {
        throw new ForbiddenError('Booking not owned by renter');
      }
      if (booking.charger.toString() !== chargerId.toString()) {
        throw new ValidationError('Booking does not match charger');
      }
    }

    let chat = await Chat.findOne({ renterId: req.user._id, ownerId: charger.owner, chargerId });
    if (chat) {
      if (booking && (chat.chatType !== 'BOOKED' || !chat.bookingId)) {
        chat.chatType = 'BOOKED';
        chat.bookingId = booking._id;
        await chat.save();
      }
    } else {
      chat = await Chat.create({
        renterId: req.user._id,
        ownerId: charger.owner,
        chargerId,
        bookingId: booking?._id,
        chatType: booking ? 'BOOKED' : 'ENQUIRY',
      });
    }

    res.status(201).json({ success: true, data: { chat } });
  } catch (error) {
    next(error);
  }
};

export const getChats = async (req, res, next) => {
  try {
    const requestedRole = req.query.role;
    const role = ['owner', 'renter', 'both'].includes(requestedRole)
      ? requestedRole
      : req.user.role === 'owner'
        ? 'owner'
        : req.user.role === 'both'
          ? 'both'
          : 'renter';

    const query =
      role === 'both'
        ? { $or: [{ ownerId: req.user._id }, { renterId: req.user._id }] }
        : role === 'owner'
          ? { ownerId: req.user._id }
          : { renterId: req.user._id };

    const chats = await Chat.find(query)
      .populate('renterId', 'name avatar role')
      .populate('ownerId', 'name avatar role')
      .populate('chargerId', 'title location chargerType pricePerHour')
      .populate('bookingId', 'startTime endTime timeSlots totalPrice');

    const sorted = chats
      .map((chat) => {
        const chatObj = chat.toObject();
        const userIsOwner = chat.ownerId.toString() === req.user._id.toString();
        const unread = userIsOwner ? chat.unreadForOwner : chat.unreadForRenter;
        const bookingContext =
          chat.chatType === 'BOOKED' && chatObj.bookingId
            ? {
                location: chatObj.chargerId?.location,
                bookingDate: chatObj.bookingId.startTime,
                bookingEnd: chatObj.bookingId.endTime,
                timeSlots: chatObj.bookingId.timeSlots,
                chargerType: chatObj.chargerId?.chargerType,
                paidAmount: chatObj.bookingId.totalPrice,
              }
            : null;
        return { ...chatObj, unread, bookingContext, userPerspective: userIsOwner ? 'owner' : 'renter' };
      })
      .sort((a, b) => {
        if (a.chatType !== b.chatType) return a.chatType === 'BOOKED' ? -1 : 1;
        if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
      });

    res.json({ success: true, data: { chats: sorted } });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) throw new ValidationError('Invalid chat id');

    const chat = await Chat.findById(chatId);
    if (!chat) throw new NotFoundError('Chat');

    ensureChatMember(chat, req.user._id);

    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    res.json({ success: true, data: { messages } });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { messageText } = req.body;
    if (!messageText || !messageText.trim()) throw new ValidationError('Message text is required');
    if (!mongoose.Types.ObjectId.isValid(chatId)) throw new ValidationError('Invalid chat id');

    const chat = await Chat.findById(chatId);
    if (!chat) throw new NotFoundError('Chat');

    const { isRenter, isOwner } = ensureChatMember(chat, req.user._id);

    if (isOwner && !chat) {
      throw new ForbiddenError('Owners cannot initiate chats');
    }

    const senderRole = isRenter ? 'RENTER' : 'OWNER';

    if (containsContactInfo(messageText)) {
      throw new ValidationError('Sharing contact details is not allowed');
    }

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      senderRole,
      messageText: messageText.trim(),
      isRead: false,
    });

    if (senderRole === 'RENTER') {
      chat.unreadForOwner += 1;
      chat.unreadForRenter = 0;
      chat.lastMessage = {
        text: message.messageText,
        senderId: req.user._id,
        senderRole,
        at: message.createdAt,
        isReadByOwner: false,
        isReadByRenter: true,
      };
    } else {
      chat.unreadForRenter += 1;
      chat.unreadForOwner = 0;
      chat.lastMessage = {
        text: message.messageText,
        senderId: req.user._id,
        senderRole,
        at: message.createdAt,
        isReadByOwner: true,
        isReadByRenter: false,
      };
    }

    await chat.save();

    const io = getIO();
    if (io) {
      io.to(`chat:${chatId}`).emit('message:new', { message });
      io.to(`chat:${chatId}`).emit('chat:updated', { chatId, chat });
    }

    res.status(201).json({ success: true, data: { message, chat } });
  } catch (error) {
    next(error);
  }
};

export const markChatRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(chatId)) throw new ValidationError('Invalid chat id');

    const chat = await Chat.findById(chatId);
    if (!chat) throw new NotFoundError('Chat');

    const { isRenter, isOwner } = ensureChatMember(chat, req.user._id);

    await Message.updateMany(
      { chatId, senderId: { $ne: req.user._id }, isRead: false },
      { isRead: true }
    );

    if (isOwner) {
      chat.unreadForOwner = 0;
      if (chat.lastMessage) chat.lastMessage.isReadByOwner = true;
    }
    if (isRenter) {
      chat.unreadForRenter = 0;
      if (chat.lastMessage) chat.lastMessage.isReadByRenter = true;
    }
    await chat.save();

    const io = getIO();
    if (io) {
      io.to(`chat:${chatId}`).emit('message:read', { chatId, by: req.user._id });
    }

    res.json({ success: true, data: { chatId } });
  } catch (error) {
    next(error);
  }
};

export const reportChat = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { reason } = req.body;
    if (!reason || !reason.trim()) throw new ValidationError('Reason is required');
    if (!mongoose.Types.ObjectId.isValid(chatId)) throw new ValidationError('Invalid chat id');

    const chat = await Chat.findById(chatId);
    if (!chat) throw new NotFoundError('Chat');

    ensureChatMember(chat, req.user._id);

    await ChatReport.create({ chatId, reporterId: req.user._id, reason: reason.trim() });
    chat.reported = true;
    await chat.save();

    res.status(201).json({ success: true, message: 'Chat reported' });
  } catch (error) {
    next(error);
  }
};
