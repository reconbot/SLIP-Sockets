import { z } from 'zod'

const OpenEventSchema = z.object({
  type: z.literal('OPEN'),
  connectionId: z.string(),
})

const AcceptEventSchema = z.object({
  type: z.literal('ACCEPT'),
  connectionId: z.string(),
})

const SetMetadataEventSchema = z.object({
  type: z.literal('SET_METADATA'),
  connectionId: z.string(),
  metadata: z.unknown(), // JsonObject | null
})

export type SetMetaDataEvent = z.infer<typeof SetMetadataEventSchema>

const CloseEventSchema = z.object({
  type: z.literal('CLOSE'),
  connectionId: z.string(),
})

const CloseChannelEventSchema = z.object({
  type: z.literal('CLOSE_CHANNEL'),
  channelId: z.string(),
})

const TextEventSchema = z.object({
  type: z.literal('TEXT'),
  connectionId: z.string(),
  data: z.string(),
})

const PublishTextEventSchema = z.object({
  type: z.literal('PUBLISH_TEXT'),
  channelId: z.string(),
  data: z.string(),
})

const SubscribeEventSchema = z.object({
  type: z.literal('SUBSCRIBE'),
  connectionId: z.string(),
  channel: z.string(),
})

const UnsubscribeEventSchema = z.object({
  type: z.literal('UNSUBSCRIBE'),
  connectionId: z.string(),
  channel: z.string(),
})

const PollForConnectionEventSchema = z.object({
  type: z.literal('POLL_FOR_CONNECTION'),
  connectionId: z.string(),
  timeout: z.number(),
})

// CONNECTION EVENTS
const FromSlipServerSchema = z.discriminatedUnion('type', [OpenEventSchema, CloseEventSchema, TextEventSchema])
export type FromSlipServer = z.infer<typeof FromSlipServerSchema>

const WebSocketOpenEventResponseSchema = z.discriminatedUnion('type', [AcceptEventSchema, SetMetadataEventSchema])
export type WebSocketOpenEventResponse = z.infer<typeof WebSocketOpenEventResponseSchema>

export const EventRequestDataSchema = z.object({
  connectionId: z.string(),
  metadata: z.nullable(z.unknown()),
  events: z.array(FromSlipServerSchema),
})

export type EventRequestData = z.infer<typeof EventRequestDataSchema>

export const EventResponseDataSchema = z.object({
  events: z.array(z.discriminatedUnion('type', [
    // Connection Events
    AcceptEventSchema,
    CloseEventSchema,
    TextEventSchema,
    SubscribeEventSchema,
    UnsubscribeEventSchema,
    SetMetadataEventSchema,
    // Channel Events
    PublishTextEventSchema,
    CloseChannelEventSchema,
  ])),
})

export type EventResponseData = z.infer<typeof EventResponseDataSchema>

export type EventResponseEvent = EventResponseData['events'][0]

// CONTROL EVENTS
const ControlEventSchema = z.discriminatedUnion('type', [
  // Connection Events without Accept but with PollForConnection
  PollForConnectionEventSchema,
  CloseEventSchema,
  TextEventSchema,
  SubscribeEventSchema,
  UnsubscribeEventSchema,
  SetMetadataEventSchema,
  // Channel Events
  PublishTextEventSchema,
  CloseChannelEventSchema,
])

export type ControlEvent = z.infer<typeof ControlEventSchema>

export const ControlEventRequestDataSchema = z.object({
  events: z.array(ControlEventSchema),
})

/**
Stolen from (type-fest)[https://github.com/sindresorhus/type-fest]

Matches a JSON object.

This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. Don't use this as a direct return type as the user would have to double-cast it: `jsonObject as unknown as CustomResponse`. Instead, you could extend your CustomResponse type from it to ensure your type only uses JSON-compatible types: `interface CustomResponse extends JsonObject { … }`.
*/
export type JsonObject = { [Key in string]: JsonValue } & { [Key in string]?: JsonValue | undefined };
export type JsonArray = JsonValue[] | readonly JsonValue[];
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
