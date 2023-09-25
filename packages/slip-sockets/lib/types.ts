import { infer as zInfer, literal as zLiteral, object as zObject, string as zString, unknown as zUnknown, discriminatedUnion, array as zArray, nullable as zNullable, number as zNumber } from 'zod'

const OpenEventSchema = zObject({
  type: zLiteral('OPEN'),
  connectionId: zString(),
})

const AcceptEventSchema = zObject({
  type: zLiteral('ACCEPT'),
  connectionId: zString(),
})

const SetMetadataEventSchema = zObject({
  type: zLiteral('SET_METADATA'),
  connectionId: zString(),
  metadata: zUnknown(), // JsonObject | null
})

export type SetMetaDataEvent = zInfer<typeof SetMetadataEventSchema>

const CloseEventSchema = zObject({
  type: zLiteral('CLOSE'),
  connectionId: zString(),
})

const CloseChannelEventSchema = zObject({
  type: zLiteral('CLOSE_CHANNEL'),
  channelId: zString(),
})

const TextEventSchema = zObject({
  type: zLiteral('TEXT'),
  connectionId: zString(),
  data: zString(),
})

const PublishTextEventSchema = zObject({
  type: zLiteral('PUBLISH_TEXT'),
  channelId: zString(),
  data: zString(),
})

const SubscribeEventSchema = zObject({
  type: zLiteral('SUBSCRIBE'),
  connectionId: zString(),
  channel: zString(),
})

const UnsubscribeEventSchema = zObject({
  type: zLiteral('UNSUBSCRIBE'),
  connectionId: zString(),
  channel: zString(),
})

const PollForConnectionEventSchema = zObject({
  type: zLiteral('POLL_FOR_CONNECTION'),
  connectionId: zString(),
  timeout: zNumber(),
})

// CONNECTION EVENTS
const FromSlipServerSchema = discriminatedUnion('type', [OpenEventSchema, CloseEventSchema, TextEventSchema])
export type FromSlipServer = zInfer<typeof FromSlipServerSchema>

const WebSocketOpenEventResponseSchema = discriminatedUnion('type', [AcceptEventSchema, SetMetadataEventSchema])
export type WebSocketOpenEventResponse = zInfer<typeof WebSocketOpenEventResponseSchema>

export const EventRequestDataSchema = zObject({
  connectionId: zString(),
  metadata: zNullable(zUnknown()),
  events: zArray(FromSlipServerSchema),
})

export type EventRequestData = zInfer<typeof EventRequestDataSchema>

export const EventResponseDataSchema = zObject({
  events: zArray(discriminatedUnion('type', [
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

export type EventResponseData = zInfer<typeof EventResponseDataSchema>

export type EventResponseEvent = EventResponseData['events'][0]

// CONTROL EVENTS
const ControlEventSchema = discriminatedUnion('type', [
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

export type ControlEvent = zInfer<typeof ControlEventSchema>

export const ControlEventRequestDataSchema = zObject({
  events: zArray(ControlEventSchema),
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
