/**
 * Sendbird Adapter — PRIMARY messaging provider
 *
 * To activate:
 *   1. npm install @sendbird/chat
 *   2. Add NEXT_PUBLIC_SENDBIRD_APP_ID=your_app_id to .env.local
 *   3. Follow the "Real implementation" comments in each method below.
 *
 * Until those steps are done, all calls log their intent and return
 * safe placeholder values so the rest of the app continues to work.
 */

const SENDBIRD_APP_ID = process.env.NEXT_PUBLIC_SENDBIRD_APP_ID;
const IS_ENABLED = Boolean(SENDBIRD_APP_ID);

// ─── Types ────────────────────────────────────────────────────────────────────

export type SendbirdMessage = {
  messageId: number;
  senderId: string;
  senderName: string;
  message: string;
  createdAt: number; // Unix ms
  channelUrl: string;
};

export type SendbirdChannelParams = {
  /** Supabase thread id — used to make the channel URL deterministic */
  threadId: string;
  name: string;
  /** Supabase user/tutor/guardian ids to invite */
  userIds: string[];
};

// Placeholder for the real SendbirdChat singleton
let _sb: unknown = null;

// ─── Adapter ──────────────────────────────────────────────────────────────────

export const sendbirdProvider = {
  /** True only when NEXT_PUBLIC_SENDBIRD_APP_ID is set */
  isEnabled: () => IS_ENABLED,

  /**
   * Initialize the Sendbird SDK and connect a user.
   *
   * Call once at app mount (e.g. in ClientLayout) after the user is
   * authenticated.  In placeholder mode this is a no-op.
   *
   * @param userId  Supabase auth user id (used as the Sendbird userId)
   * @param nickname Display name shown in Sendbird
   * @param accessToken Optional Sendbird user token (generate server-side for production)
   */
  async connect(userId: string, nickname: string, accessToken?: string): Promise<void> {
    if (!IS_ENABLED) {
      console.log("[Sendbird placeholder] connect —", { userId, nickname });
      return;
    }

    // ── Real implementation ──────────────────────────────────────────────────
    // import SendbirdChat from "@sendbird/chat";
    // import { GroupChannelModule } from "@sendbird/chat/groupChannel";
    //
    // _sb = SendbirdChat.init({
    //   appId: SENDBIRD_APP_ID!,
    //   modules: [new GroupChannelModule()],
    // });
    //
    // const sb = _sb as SendbirdChat;
    // const user = await sb.connect(userId, accessToken);
    // await sb.updateCurrentUserInfo({ nickname });
    // console.log("[Sendbird] connected:", user.userId);
    // ────────────────────────────────────────────────────────────────────────
  },

  /** Disconnect when the user signs out */
  async disconnect(): Promise<void> {
    if (!IS_ENABLED) {
      console.log("[Sendbird placeholder] disconnect");
      return;
    }

    // ── Real implementation ──────────────────────────────────────────────────
    // const sb = _sb as SendbirdChat;
    // await sb.disconnect();
    // _sb = null;
    // ────────────────────────────────────────────────────────────────────────
  },

  /**
   * Create a GroupChannel for a new thread.
   * Returns the channel URL to be stored in message_threads.sendbird_channel_url.
   */
  async createChannel(params: SendbirdChannelParams): Promise<string> {
    if (!IS_ENABLED) {
      const url = `placeholder-channel-${params.threadId}`;
      console.log("[Sendbird placeholder] createChannel →", url, params);
      return url;
    }

    // ── Real implementation ──────────────────────────────────────────────────
    // import { GroupChannelCreateParams } from "@sendbird/chat/groupChannel";
    //
    // const sb = _sb as SendbirdChat;
    // const channelParams = new GroupChannelCreateParams();
    // channelParams.name = params.name;
    // channelParams.invitedUserIds = params.userIds;
    // channelParams.isDistinct = false;
    // channelParams.channelUrl = `thread-${params.threadId}`; // deterministic URL
    //
    // const channel = await (sb as any).groupChannel.createChannel(channelParams);
    // return channel.url;
    // ────────────────────────────────────────────────────────────────────────

    return "";
  },

  /**
   * Send a message to a channel.
   * Returns the sent message (shaped as SendbirdMessage).
   */
  async sendMessage(
    channelUrl: string,
    senderId: string,
    senderName: string,
    body: string
  ): Promise<SendbirdMessage | null> {
    if (!IS_ENABLED) {
      console.log("[Sendbird placeholder] sendMessage →", { channelUrl, senderName, body });
      return {
        messageId: Date.now(),
        senderId,
        senderName,
        message: body,
        createdAt: Date.now(),
        channelUrl,
      };
    }

    // ── Real implementation ──────────────────────────────────────────────────
    // const sb = _sb as SendbirdChat;
    // const channel = await (sb as any).groupChannel.getChannel(channelUrl);
    //
    // const params = new UserMessageCreateParams();
    // params.message = body;
    //
    // const sentMsg: UserMessage = await new Promise((resolve, reject) => {
    //   channel.sendUserMessage(params)
    //     .onSucceeded(resolve)
    //     .onFailed(reject);
    // });
    //
    // return {
    //   messageId: sentMsg.messageId,
    //   senderId: sentMsg.sender.userId,
    //   senderName: sentMsg.sender.nickname,
    //   message: sentMsg.message,
    //   createdAt: sentMsg.createdAt,
    //   channelUrl,
    // };
    // ────────────────────────────────────────────────────────────────────────

    return null;
  },

  /**
   * Fetch message history for a channel (newest-first).
   * The app falls back to Supabase when Sendbird is disabled.
   */
  async getMessages(
    channelUrl: string,
    options?: { limit?: number; beforeTimestamp?: number }
  ): Promise<SendbirdMessage[]> {
    if (!IS_ENABLED) {
      console.log("[Sendbird placeholder] getMessages →", channelUrl, options);
      return [];
    }

    // ── Real implementation ──────────────────────────────────────────────────
    // import { MessageListParams } from "@sendbird/chat/message";
    //
    // const sb = _sb as SendbirdChat;
    // const channel = await (sb as any).groupChannel.getChannel(channelUrl);
    //
    // const params = new MessageListParams();
    // params.nextResultSize = options?.limit ?? 50;
    // params.isInclusive = true;
    //
    // const msgs = await channel.getMessagesByTimestamp(
    //   options?.beforeTimestamp ?? Date.now(),
    //   params
    // );
    //
    // return msgs.map((m: UserMessage) => ({
    //   messageId: m.messageId,
    //   senderId: m.sender.userId,
    //   senderName: m.sender.nickname,
    //   message: m.message,
    //   createdAt: m.createdAt,
    //   channelUrl,
    // }));
    // ────────────────────────────────────────────────────────────────────────

    return [];
  },

  /**
   * Mark all messages in a channel as read for the current user.
   */
  async markAsRead(channelUrl: string): Promise<void> {
    if (!IS_ENABLED) {
      console.log("[Sendbird placeholder] markAsRead →", channelUrl);
      return;
    }

    // ── Real implementation ──────────────────────────────────────────────────
    // const sb = _sb as SendbirdChat;
    // const channel = await (sb as any).groupChannel.getChannel(channelUrl);
    // await channel.markAsRead();
    // ────────────────────────────────────────────────────────────────────────
  },

  /**
   * Subscribe to real-time messages on a channel.
   * Returns an unsubscribe function to call on component unmount.
   *
   * When Sendbird is disabled the component falls back to manual refresh.
   */
  subscribe(
    channelUrl: string,
    onMessage: (msg: SendbirdMessage) => void
  ): () => void {
    if (!IS_ENABLED) {
      console.log("[Sendbird placeholder] subscribe (no-op) →", channelUrl);
      return () => {};
    }

    // ── Real implementation ──────────────────────────────────────────────────
    // const sb = _sb as SendbirdChat;
    // const handlerId = `thread-${channelUrl}`;
    //
    // (sb as any).groupChannel.addGroupChannelHandler(
    //   handlerId,
    //   new GroupChannelHandler({
    //     onMessageReceived(channel, message) {
    //       if (channel.url !== channelUrl) return;
    //       onMessage({
    //         messageId: (message as UserMessage).messageId,
    //         senderId: (message as UserMessage).sender.userId,
    //         senderName: (message as UserMessage).sender.nickname,
    //         message: (message as UserMessage).message,
    //         createdAt: message.createdAt,
    //         channelUrl,
    //       });
    //     },
    //   })
    // );
    //
    // return () => (sb as any).groupChannel.removeGroupChannelHandler(handlerId);
    // ────────────────────────────────────────────────────────────────────────

    return () => {};
  },
};
