import * as $protobuf from "protobufjs";
import Long = require("long");

/** Namespace fh. */
export namespace fh {

    /**
     * Properties of a ProtocolVersion.
     * @deprecated Use fh.ProtocolVersion.$Properties instead.
     */
    interface IProtocolVersion extends fh.ProtocolVersion.$Properties {
    }

    /** Represents a ProtocolVersion. */
    class ProtocolVersion {

        /**
         * Constructs a new ProtocolVersion.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.ProtocolVersion.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ProtocolVersion major. */
        major: number;

        /** ProtocolVersion minor. */
        minor: number;

        /** ProtocolVersion patch. */
        patch: number;

        /**
         * Creates a new ProtocolVersion instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ProtocolVersion instance
         */
        static create(properties: fh.ProtocolVersion.$Shape): fh.ProtocolVersion & fh.ProtocolVersion.$Shape;
        static create(properties?: fh.ProtocolVersion.$Properties): fh.ProtocolVersion;

        /**
         * Encodes the specified ProtocolVersion message. Does not implicitly {@link fh.ProtocolVersion.verify|verify} messages.
         * @param message ProtocolVersion message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.ProtocolVersion.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ProtocolVersion message, length delimited. Does not implicitly {@link fh.ProtocolVersion.verify|verify} messages.
         * @param message ProtocolVersion message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.ProtocolVersion.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ProtocolVersion message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.ProtocolVersion & fh.ProtocolVersion.$Shape} ProtocolVersion
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.ProtocolVersion & fh.ProtocolVersion.$Shape;

        /**
         * Decodes a ProtocolVersion message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.ProtocolVersion & fh.ProtocolVersion.$Shape} ProtocolVersion
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.ProtocolVersion & fh.ProtocolVersion.$Shape;

        /**
         * Verifies a ProtocolVersion message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ProtocolVersion message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ProtocolVersion
         */
        static fromObject(object: { [k: string]: any }): fh.ProtocolVersion;

        /**
         * Creates a plain object from a ProtocolVersion message. Also converts values to other types if specified.
         * @param message ProtocolVersion
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.ProtocolVersion, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ProtocolVersion to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ProtocolVersion
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ProtocolVersion {

        /** Properties of a ProtocolVersion. */
        interface $Properties {

            /** ProtocolVersion major */
            major?: (number|null);

            /** ProtocolVersion minor */
            minor?: (number|null);

            /** ProtocolVersion patch */
            patch?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a ProtocolVersion. */
        type $Shape = fh.ProtocolVersion.$Properties;
    }

    /**
     * Properties of an Envelope.
     * @deprecated Use fh.Envelope.$Properties instead.
     */
    interface IEnvelope extends fh.Envelope.$Properties {
    }

    /** Represents an Envelope. */
    class Envelope {

        /**
         * Constructs a new Envelope.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.Envelope.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** Envelope envelopeId. */
        envelopeId: Uint8Array;

        /** Envelope senderAccountId. */
        senderAccountId: Uint8Array;

        /** Envelope senderDeviceNumber. */
        senderDeviceNumber: number;

        /** Envelope recipientAccountId. */
        recipientAccountId: Uint8Array;

        /** Envelope recipientDeviceNumber. */
        recipientDeviceNumber: number;

        /** Envelope envelopeType. */
        envelopeType: fh.EnvelopeType;

        /** Envelope isPrekeyMessage. */
        isPrekeyMessage: boolean;

        /** Envelope ciphertext. */
        ciphertext: Uint8Array;

        /** Envelope clientTimestamp. */
        clientTimestamp: (number|Long);

        /** Envelope conversationId. */
        conversationId: Uint8Array;

        /** Envelope senderIsBot. */
        senderIsBot: boolean;

        /**
         * Creates a new Envelope instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Envelope instance
         */
        static create(properties: fh.Envelope.$Shape): fh.Envelope & fh.Envelope.$Shape;
        static create(properties?: fh.Envelope.$Properties): fh.Envelope;

        /**
         * Encodes the specified Envelope message. Does not implicitly {@link fh.Envelope.verify|verify} messages.
         * @param message Envelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.Envelope.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Envelope message, length delimited. Does not implicitly {@link fh.Envelope.verify|verify} messages.
         * @param message Envelope message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.Envelope.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an Envelope message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.Envelope & fh.Envelope.$Shape} Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.Envelope & fh.Envelope.$Shape;

        /**
         * Decodes an Envelope message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.Envelope & fh.Envelope.$Shape} Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.Envelope & fh.Envelope.$Shape;

        /**
         * Verifies an Envelope message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an Envelope message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Envelope
         */
        static fromObject(object: { [k: string]: any }): fh.Envelope;

        /**
         * Creates a plain object from an Envelope message. Also converts values to other types if specified.
         * @param message Envelope
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.Envelope, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Envelope to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Envelope
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Envelope {

        /** Properties of an Envelope. */
        interface $Properties {

            /** Envelope envelopeId */
            envelopeId?: (Uint8Array|null);

            /** Envelope senderAccountId */
            senderAccountId?: (Uint8Array|null);

            /** Envelope senderDeviceNumber */
            senderDeviceNumber?: (number|null);

            /** Envelope recipientAccountId */
            recipientAccountId?: (Uint8Array|null);

            /** Envelope recipientDeviceNumber */
            recipientDeviceNumber?: (number|null);

            /** Envelope envelopeType */
            envelopeType?: (fh.EnvelopeType|null);

            /** Envelope isPrekeyMessage */
            isPrekeyMessage?: (boolean|null);

            /** Envelope ciphertext */
            ciphertext?: (Uint8Array|null);

            /** Envelope clientTimestamp */
            clientTimestamp?: (number|Long|null);

            /** Envelope conversationId */
            conversationId?: (Uint8Array|null);

            /** Envelope senderIsBot */
            senderIsBot?: (boolean|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an Envelope. */
        type $Shape = fh.Envelope.$Properties;
    }

    /** EnvelopeType enum. */
    enum EnvelopeType {

        /** ENVELOPE_TYPE_UNSPECIFIED value */
        ENVELOPE_TYPE_UNSPECIFIED = 0,

        /** ENVELOPE_TYPE_MESSAGE value */
        ENVELOPE_TYPE_MESSAGE = 1,

        /** ENVELOPE_TYPE_SYNC value */
        ENVELOPE_TYPE_SYNC = 2,

        /** ENVELOPE_TYPE_SENDER_KEY value */
        ENVELOPE_TYPE_SENDER_KEY = 3,

        /** ENVELOPE_TYPE_EDIT value */
        ENVELOPE_TYPE_EDIT = 4,

        /** ENVELOPE_TYPE_DELETE value */
        ENVELOPE_TYPE_DELETE = 5,

        /** ENVELOPE_TYPE_REACTION value */
        ENVELOPE_TYPE_REACTION = 6,

        /** ENVELOPE_TYPE_READ_RECEIPT value */
        ENVELOPE_TYPE_READ_RECEIPT = 7,

        /** ENVELOPE_TYPE_TYPING value */
        ENVELOPE_TYPE_TYPING = 8,

        /** ENVELOPE_TYPE_ATTACHMENT_KEY value */
        ENVELOPE_TYPE_ATTACHMENT_KEY = 9,

        /** ENVELOPE_TYPE_CALL_OFFER value */
        ENVELOPE_TYPE_CALL_OFFER = 10,

        /** ENVELOPE_TYPE_CALL_ANSWER value */
        ENVELOPE_TYPE_CALL_ANSWER = 11,

        /** ENVELOPE_TYPE_CALL_ICE value */
        ENVELOPE_TYPE_CALL_ICE = 12,

        /** ENVELOPE_TYPE_CALL_HANGUP value */
        ENVELOPE_TYPE_CALL_HANGUP = 13,

        /** ENVELOPE_TYPE_CALL_REJECT value */
        ENVELOPE_TYPE_CALL_REJECT = 14,

        /** ENVELOPE_TYPE_BOT_MESSAGE value */
        ENVELOPE_TYPE_BOT_MESSAGE = 15,

        /** ENVELOPE_TYPE_PIN value */
        ENVELOPE_TYPE_PIN = 16,

        /** ENVELOPE_TYPE_UNPIN value */
        ENVELOPE_TYPE_UNPIN = 17
    }

    /**
     * Properties of a ClientFrame.
     * @deprecated Use fh.ClientFrame.$Properties instead.
     */
    interface IClientFrame extends fh.ClientFrame.$Properties {
    }

    /** Represents a ClientFrame. */
    class ClientFrame {

        /**
         * Constructs a new ClientFrame.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.ClientFrame.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ClientFrame hello. */
        hello?: (fh.ClientHello.$Properties|null);

        /** ClientFrame upload. */
        upload?: (fh.EnvelopeUpload.$Properties|null);

        /** ClientFrame ack. */
        ack?: (fh.EnvelopeAck.$Properties|null);

        /** ClientFrame ping. */
        ping?: (fh.Ping.$Properties|null);

        /** ClientFrame kind. */
        kind?: ("hello"|"upload"|"ack"|"ping");

        /**
         * Creates a new ClientFrame instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ClientFrame instance
         */
        static create(properties: fh.ClientFrame.$Shape): fh.ClientFrame & fh.ClientFrame.$Shape;
        static create(properties?: fh.ClientFrame.$Properties): fh.ClientFrame;

        /**
         * Encodes the specified ClientFrame message. Does not implicitly {@link fh.ClientFrame.verify|verify} messages.
         * @param message ClientFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.ClientFrame.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ClientFrame message, length delimited. Does not implicitly {@link fh.ClientFrame.verify|verify} messages.
         * @param message ClientFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.ClientFrame.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ClientFrame message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.ClientFrame & fh.ClientFrame.$Shape} ClientFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.ClientFrame & fh.ClientFrame.$Shape;

        /**
         * Decodes a ClientFrame message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.ClientFrame & fh.ClientFrame.$Shape} ClientFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.ClientFrame & fh.ClientFrame.$Shape;

        /**
         * Verifies a ClientFrame message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ClientFrame message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ClientFrame
         */
        static fromObject(object: { [k: string]: any }): fh.ClientFrame;

        /**
         * Creates a plain object from a ClientFrame message. Also converts values to other types if specified.
         * @param message ClientFrame
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.ClientFrame, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ClientFrame to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ClientFrame
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ClientFrame {

        /** Properties of a ClientFrame. */
        interface $Properties {

            /** ClientFrame hello */
            hello?: (fh.ClientHello.$Properties|null);

            /** ClientFrame upload */
            upload?: (fh.EnvelopeUpload.$Properties|null);

            /** ClientFrame ack */
            ack?: (fh.EnvelopeAck.$Properties|null);

            /** ClientFrame ping */
            ping?: (fh.Ping.$Properties|null);

            /** ClientFrame kind */
            kind?: ("hello"|"upload"|"ack"|"ping");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a ClientFrame. */
        type $Shape = {
          hello?: fh.ClientHello.$Shape|null;
          upload?: fh.EnvelopeUpload.$Shape|null;
          ack?: fh.EnvelopeAck.$Shape|null;
          ping?: fh.Ping.$Shape|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ kind?: undefined; hello?: null; upload?: null; ack?: null; ping?: null }|{ kind?: "hello"; hello: fh.ClientHello.$Shape; upload?: null; ack?: null; ping?: null }|{ kind?: "upload"; hello?: null; upload: fh.EnvelopeUpload.$Shape; ack?: null; ping?: null }|{ kind?: "ack"; hello?: null; upload?: null; ack: fh.EnvelopeAck.$Shape; ping?: null }|{ kind?: "ping"; hello?: null; upload?: null; ack?: null; ping: fh.Ping.$Shape })
        );
    }

    /**
     * Properties of a ClientHello.
     * @deprecated Use fh.ClientHello.$Properties instead.
     */
    interface IClientHello extends fh.ClientHello.$Properties {
    }

    /** Represents a ClientHello. */
    class ClientHello {

        /**
         * Constructs a new ClientHello.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.ClientHello.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ClientHello sessionToken. */
        sessionToken: string;

        /** ClientHello deviceNumber. */
        deviceNumber: number;

        /** ClientHello protocolMajor. */
        protocolMajor: number;

        /** ClientHello protocolMinor. */
        protocolMinor: number;

        /** ClientHello protocolPatch. */
        protocolPatch: number;

        /** ClientHello clientName. */
        clientName: string;

        /** ClientHello clientVersion. */
        clientVersion: string;

        /**
         * Creates a new ClientHello instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ClientHello instance
         */
        static create(properties: fh.ClientHello.$Shape): fh.ClientHello & fh.ClientHello.$Shape;
        static create(properties?: fh.ClientHello.$Properties): fh.ClientHello;

        /**
         * Encodes the specified ClientHello message. Does not implicitly {@link fh.ClientHello.verify|verify} messages.
         * @param message ClientHello message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.ClientHello.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ClientHello message, length delimited. Does not implicitly {@link fh.ClientHello.verify|verify} messages.
         * @param message ClientHello message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.ClientHello.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ClientHello message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.ClientHello & fh.ClientHello.$Shape} ClientHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.ClientHello & fh.ClientHello.$Shape;

        /**
         * Decodes a ClientHello message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.ClientHello & fh.ClientHello.$Shape} ClientHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.ClientHello & fh.ClientHello.$Shape;

        /**
         * Verifies a ClientHello message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ClientHello message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ClientHello
         */
        static fromObject(object: { [k: string]: any }): fh.ClientHello;

        /**
         * Creates a plain object from a ClientHello message. Also converts values to other types if specified.
         * @param message ClientHello
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.ClientHello, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ClientHello to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ClientHello
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ClientHello {

        /** Properties of a ClientHello. */
        interface $Properties {

            /** ClientHello sessionToken */
            sessionToken?: (string|null);

            /** ClientHello deviceNumber */
            deviceNumber?: (number|null);

            /** ClientHello protocolMajor */
            protocolMajor?: (number|null);

            /** ClientHello protocolMinor */
            protocolMinor?: (number|null);

            /** ClientHello protocolPatch */
            protocolPatch?: (number|null);

            /** ClientHello clientName */
            clientName?: (string|null);

            /** ClientHello clientVersion */
            clientVersion?: (string|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a ClientHello. */
        type $Shape = fh.ClientHello.$Properties;
    }

    /**
     * Properties of an EnvelopeUpload.
     * @deprecated Use fh.EnvelopeUpload.$Properties instead.
     */
    interface IEnvelopeUpload extends fh.EnvelopeUpload.$Properties {
    }

    /** Represents an EnvelopeUpload. */
    class EnvelopeUpload {

        /**
         * Constructs a new EnvelopeUpload.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.EnvelopeUpload.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** EnvelopeUpload envelopes. */
        envelopes: fh.Envelope.$Properties[];

        /**
         * Creates a new EnvelopeUpload instance using the specified properties.
         * @param [properties] Properties to set
         * @returns EnvelopeUpload instance
         */
        static create(properties: fh.EnvelopeUpload.$Shape): fh.EnvelopeUpload & fh.EnvelopeUpload.$Shape;
        static create(properties?: fh.EnvelopeUpload.$Properties): fh.EnvelopeUpload;

        /**
         * Encodes the specified EnvelopeUpload message. Does not implicitly {@link fh.EnvelopeUpload.verify|verify} messages.
         * @param message EnvelopeUpload message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.EnvelopeUpload.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified EnvelopeUpload message, length delimited. Does not implicitly {@link fh.EnvelopeUpload.verify|verify} messages.
         * @param message EnvelopeUpload message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.EnvelopeUpload.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an EnvelopeUpload message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.EnvelopeUpload & fh.EnvelopeUpload.$Shape} EnvelopeUpload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.EnvelopeUpload & fh.EnvelopeUpload.$Shape;

        /**
         * Decodes an EnvelopeUpload message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.EnvelopeUpload & fh.EnvelopeUpload.$Shape} EnvelopeUpload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.EnvelopeUpload & fh.EnvelopeUpload.$Shape;

        /**
         * Verifies an EnvelopeUpload message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an EnvelopeUpload message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns EnvelopeUpload
         */
        static fromObject(object: { [k: string]: any }): fh.EnvelopeUpload;

        /**
         * Creates a plain object from an EnvelopeUpload message. Also converts values to other types if specified.
         * @param message EnvelopeUpload
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.EnvelopeUpload, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this EnvelopeUpload to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for EnvelopeUpload
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace EnvelopeUpload {

        /** Properties of an EnvelopeUpload. */
        interface $Properties {

            /** EnvelopeUpload envelopes */
            envelopes?: (fh.Envelope.$Properties[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an EnvelopeUpload. */
        type $Shape = fh.EnvelopeUpload.$Properties;
    }

    /**
     * Properties of an EnvelopeAck.
     * @deprecated Use fh.EnvelopeAck.$Properties instead.
     */
    interface IEnvelopeAck extends fh.EnvelopeAck.$Properties {
    }

    /** Represents an EnvelopeAck. */
    class EnvelopeAck {

        /**
         * Constructs a new EnvelopeAck.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.EnvelopeAck.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** EnvelopeAck envelopeIds. */
        envelopeIds: Uint8Array[];

        /**
         * Creates a new EnvelopeAck instance using the specified properties.
         * @param [properties] Properties to set
         * @returns EnvelopeAck instance
         */
        static create(properties: fh.EnvelopeAck.$Shape): fh.EnvelopeAck & fh.EnvelopeAck.$Shape;
        static create(properties?: fh.EnvelopeAck.$Properties): fh.EnvelopeAck;

        /**
         * Encodes the specified EnvelopeAck message. Does not implicitly {@link fh.EnvelopeAck.verify|verify} messages.
         * @param message EnvelopeAck message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.EnvelopeAck.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified EnvelopeAck message, length delimited. Does not implicitly {@link fh.EnvelopeAck.verify|verify} messages.
         * @param message EnvelopeAck message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.EnvelopeAck.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an EnvelopeAck message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.EnvelopeAck & fh.EnvelopeAck.$Shape} EnvelopeAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.EnvelopeAck & fh.EnvelopeAck.$Shape;

        /**
         * Decodes an EnvelopeAck message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.EnvelopeAck & fh.EnvelopeAck.$Shape} EnvelopeAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.EnvelopeAck & fh.EnvelopeAck.$Shape;

        /**
         * Verifies an EnvelopeAck message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an EnvelopeAck message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns EnvelopeAck
         */
        static fromObject(object: { [k: string]: any }): fh.EnvelopeAck;

        /**
         * Creates a plain object from an EnvelopeAck message. Also converts values to other types if specified.
         * @param message EnvelopeAck
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.EnvelopeAck, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this EnvelopeAck to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for EnvelopeAck
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace EnvelopeAck {

        /** Properties of an EnvelopeAck. */
        interface $Properties {

            /** EnvelopeAck envelopeIds */
            envelopeIds?: (Uint8Array[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an EnvelopeAck. */
        type $Shape = fh.EnvelopeAck.$Properties;
    }

    /**
     * Properties of a Ping.
     * @deprecated Use fh.Ping.$Properties instead.
     */
    interface IPing extends fh.Ping.$Properties {
    }

    /** Represents a Ping. */
    class Ping {

        /**
         * Constructs a new Ping.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.Ping.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** Ping clientTimestamp. */
        clientTimestamp: (number|Long);

        /**
         * Creates a new Ping instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Ping instance
         */
        static create(properties: fh.Ping.$Shape): fh.Ping & fh.Ping.$Shape;
        static create(properties?: fh.Ping.$Properties): fh.Ping;

        /**
         * Encodes the specified Ping message. Does not implicitly {@link fh.Ping.verify|verify} messages.
         * @param message Ping message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.Ping.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Ping message, length delimited. Does not implicitly {@link fh.Ping.verify|verify} messages.
         * @param message Ping message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.Ping.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Ping message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.Ping & fh.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.Ping & fh.Ping.$Shape;

        /**
         * Decodes a Ping message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.Ping & fh.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.Ping & fh.Ping.$Shape;

        /**
         * Verifies a Ping message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Ping message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Ping
         */
        static fromObject(object: { [k: string]: any }): fh.Ping;

        /**
         * Creates a plain object from a Ping message. Also converts values to other types if specified.
         * @param message Ping
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.Ping, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Ping to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Ping
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Ping {

        /** Properties of a Ping. */
        interface $Properties {

            /** Ping clientTimestamp */
            clientTimestamp?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a Ping. */
        type $Shape = fh.Ping.$Properties;
    }

    /**
     * Properties of a ServerFrame.
     * @deprecated Use fh.ServerFrame.$Properties instead.
     */
    interface IServerFrame extends fh.ServerFrame.$Properties {
    }

    /** Represents a ServerFrame. */
    class ServerFrame {

        /**
         * Constructs a new ServerFrame.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.ServerFrame.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ServerFrame hello. */
        hello?: (fh.ServerHello.$Properties|null);

        /** ServerFrame delivery. */
        delivery?: (fh.EnvelopeDelivery.$Properties|null);

        /** ServerFrame receipt. */
        receipt?: (fh.EnvelopeAck.$Properties|null);

        /** ServerFrame pong. */
        pong?: (fh.Pong.$Properties|null);

        /** ServerFrame error. */
        error?: (fh.ErrorFrame.$Properties|null);

        /** ServerFrame presence. */
        presence?: (fh.PresenceUpdate.$Properties|null);

        /** ServerFrame botMessage. */
        botMessage?: (fh.BotMessageDelivery.$Properties|null);

        /** ServerFrame channelPost. */
        channelPost?: (fh.ChannelPostDelivery.$Properties|null);

        /** ServerFrame kind. */
        kind?: ("hello"|"delivery"|"receipt"|"pong"|"error"|"presence"|"botMessage"|"channelPost");

        /**
         * Creates a new ServerFrame instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ServerFrame instance
         */
        static create(properties: fh.ServerFrame.$Shape): fh.ServerFrame & fh.ServerFrame.$Shape;
        static create(properties?: fh.ServerFrame.$Properties): fh.ServerFrame;

        /**
         * Encodes the specified ServerFrame message. Does not implicitly {@link fh.ServerFrame.verify|verify} messages.
         * @param message ServerFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.ServerFrame.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ServerFrame message, length delimited. Does not implicitly {@link fh.ServerFrame.verify|verify} messages.
         * @param message ServerFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.ServerFrame.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ServerFrame message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.ServerFrame & fh.ServerFrame.$Shape} ServerFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.ServerFrame & fh.ServerFrame.$Shape;

        /**
         * Decodes a ServerFrame message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.ServerFrame & fh.ServerFrame.$Shape} ServerFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.ServerFrame & fh.ServerFrame.$Shape;

        /**
         * Verifies a ServerFrame message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ServerFrame message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ServerFrame
         */
        static fromObject(object: { [k: string]: any }): fh.ServerFrame;

        /**
         * Creates a plain object from a ServerFrame message. Also converts values to other types if specified.
         * @param message ServerFrame
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.ServerFrame, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ServerFrame to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ServerFrame
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ServerFrame {

        /** Properties of a ServerFrame. */
        interface $Properties {

            /** ServerFrame hello */
            hello?: (fh.ServerHello.$Properties|null);

            /** ServerFrame delivery */
            delivery?: (fh.EnvelopeDelivery.$Properties|null);

            /** ServerFrame receipt */
            receipt?: (fh.EnvelopeAck.$Properties|null);

            /** ServerFrame pong */
            pong?: (fh.Pong.$Properties|null);

            /** ServerFrame error */
            error?: (fh.ErrorFrame.$Properties|null);

            /** ServerFrame presence */
            presence?: (fh.PresenceUpdate.$Properties|null);

            /** ServerFrame botMessage */
            botMessage?: (fh.BotMessageDelivery.$Properties|null);

            /** ServerFrame channelPost */
            channelPost?: (fh.ChannelPostDelivery.$Properties|null);

            /** ServerFrame kind */
            kind?: ("hello"|"delivery"|"receipt"|"pong"|"error"|"presence"|"botMessage"|"channelPost");

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Narrowed shape of a ServerFrame. */
        type $Shape = {
          hello?: fh.ServerHello.$Shape|null;
          delivery?: fh.EnvelopeDelivery.$Shape|null;
          receipt?: fh.EnvelopeAck.$Shape|null;
          pong?: fh.Pong.$Shape|null;
          error?: fh.ErrorFrame.$Shape|null;
          presence?: fh.PresenceUpdate.$Shape|null;
          botMessage?: fh.BotMessageDelivery.$Shape|null;
          channelPost?: fh.ChannelPostDelivery.$Shape|null;
          $unknowns?: Uint8Array[];
        } & (
          ({ kind?: undefined; hello?: null; delivery?: null; receipt?: null; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "hello"; hello: fh.ServerHello.$Shape; delivery?: null; receipt?: null; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "delivery"; hello?: null; delivery: fh.EnvelopeDelivery.$Shape; receipt?: null; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "receipt"; hello?: null; delivery?: null; receipt: fh.EnvelopeAck.$Shape; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "pong"; hello?: null; delivery?: null; receipt?: null; pong: fh.Pong.$Shape; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "error"; hello?: null; delivery?: null; receipt?: null; pong?: null; error: fh.ErrorFrame.$Shape; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "presence"; hello?: null; delivery?: null; receipt?: null; pong?: null; error?: null; presence: fh.PresenceUpdate.$Shape; botMessage?: null; channelPost?: null }|{ kind?: "botMessage"; hello?: null; delivery?: null; receipt?: null; pong?: null; error?: null; presence?: null; botMessage: fh.BotMessageDelivery.$Shape; channelPost?: null }|{ kind?: "channelPost"; hello?: null; delivery?: null; receipt?: null; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost: fh.ChannelPostDelivery.$Shape })
        );
    }

    /**
     * Properties of a ServerHello.
     * @deprecated Use fh.ServerHello.$Properties instead.
     */
    interface IServerHello extends fh.ServerHello.$Properties {
    }

    /** Represents a ServerHello. */
    class ServerHello {

        /**
         * Constructs a new ServerHello.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.ServerHello.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ServerHello sessionId. */
        sessionId: string;

        /** ServerHello accountId. */
        accountId: Uint8Array;

        /** ServerHello deviceNumber. */
        deviceNumber: number;

        /** ServerHello serverTimestamp. */
        serverTimestamp: (number|Long);

        /** ServerHello protocolMajor. */
        protocolMajor: number;

        /** ServerHello protocolMinor. */
        protocolMinor: number;

        /** ServerHello protocolPatch. */
        protocolPatch: number;

        /**
         * Creates a new ServerHello instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ServerHello instance
         */
        static create(properties: fh.ServerHello.$Shape): fh.ServerHello & fh.ServerHello.$Shape;
        static create(properties?: fh.ServerHello.$Properties): fh.ServerHello;

        /**
         * Encodes the specified ServerHello message. Does not implicitly {@link fh.ServerHello.verify|verify} messages.
         * @param message ServerHello message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.ServerHello.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ServerHello message, length delimited. Does not implicitly {@link fh.ServerHello.verify|verify} messages.
         * @param message ServerHello message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.ServerHello.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ServerHello message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.ServerHello & fh.ServerHello.$Shape} ServerHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.ServerHello & fh.ServerHello.$Shape;

        /**
         * Decodes a ServerHello message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.ServerHello & fh.ServerHello.$Shape} ServerHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.ServerHello & fh.ServerHello.$Shape;

        /**
         * Verifies a ServerHello message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ServerHello message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ServerHello
         */
        static fromObject(object: { [k: string]: any }): fh.ServerHello;

        /**
         * Creates a plain object from a ServerHello message. Also converts values to other types if specified.
         * @param message ServerHello
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.ServerHello, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ServerHello to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ServerHello
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ServerHello {

        /** Properties of a ServerHello. */
        interface $Properties {

            /** ServerHello sessionId */
            sessionId?: (string|null);

            /** ServerHello accountId */
            accountId?: (Uint8Array|null);

            /** ServerHello deviceNumber */
            deviceNumber?: (number|null);

            /** ServerHello serverTimestamp */
            serverTimestamp?: (number|Long|null);

            /** ServerHello protocolMajor */
            protocolMajor?: (number|null);

            /** ServerHello protocolMinor */
            protocolMinor?: (number|null);

            /** ServerHello protocolPatch */
            protocolPatch?: (number|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a ServerHello. */
        type $Shape = fh.ServerHello.$Properties;
    }

    /**
     * Properties of an EnvelopeDelivery.
     * @deprecated Use fh.EnvelopeDelivery.$Properties instead.
     */
    interface IEnvelopeDelivery extends fh.EnvelopeDelivery.$Properties {
    }

    /** Represents an EnvelopeDelivery. */
    class EnvelopeDelivery {

        /**
         * Constructs a new EnvelopeDelivery.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.EnvelopeDelivery.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** EnvelopeDelivery envelopes. */
        envelopes: fh.Envelope.$Properties[];

        /**
         * Creates a new EnvelopeDelivery instance using the specified properties.
         * @param [properties] Properties to set
         * @returns EnvelopeDelivery instance
         */
        static create(properties: fh.EnvelopeDelivery.$Shape): fh.EnvelopeDelivery & fh.EnvelopeDelivery.$Shape;
        static create(properties?: fh.EnvelopeDelivery.$Properties): fh.EnvelopeDelivery;

        /**
         * Encodes the specified EnvelopeDelivery message. Does not implicitly {@link fh.EnvelopeDelivery.verify|verify} messages.
         * @param message EnvelopeDelivery message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.EnvelopeDelivery.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified EnvelopeDelivery message, length delimited. Does not implicitly {@link fh.EnvelopeDelivery.verify|verify} messages.
         * @param message EnvelopeDelivery message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.EnvelopeDelivery.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an EnvelopeDelivery message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.EnvelopeDelivery & fh.EnvelopeDelivery.$Shape} EnvelopeDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.EnvelopeDelivery & fh.EnvelopeDelivery.$Shape;

        /**
         * Decodes an EnvelopeDelivery message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.EnvelopeDelivery & fh.EnvelopeDelivery.$Shape} EnvelopeDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.EnvelopeDelivery & fh.EnvelopeDelivery.$Shape;

        /**
         * Verifies an EnvelopeDelivery message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an EnvelopeDelivery message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns EnvelopeDelivery
         */
        static fromObject(object: { [k: string]: any }): fh.EnvelopeDelivery;

        /**
         * Creates a plain object from an EnvelopeDelivery message. Also converts values to other types if specified.
         * @param message EnvelopeDelivery
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.EnvelopeDelivery, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this EnvelopeDelivery to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for EnvelopeDelivery
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace EnvelopeDelivery {

        /** Properties of an EnvelopeDelivery. */
        interface $Properties {

            /** EnvelopeDelivery envelopes */
            envelopes?: (fh.Envelope.$Properties[]|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an EnvelopeDelivery. */
        type $Shape = fh.EnvelopeDelivery.$Properties;
    }

    /**
     * Properties of a Pong.
     * @deprecated Use fh.Pong.$Properties instead.
     */
    interface IPong extends fh.Pong.$Properties {
    }

    /** Represents a Pong. */
    class Pong {

        /**
         * Constructs a new Pong.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.Pong.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** Pong clientTimestamp. */
        clientTimestamp: (number|Long);

        /** Pong serverTimestamp. */
        serverTimestamp: (number|Long);

        /**
         * Creates a new Pong instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Pong instance
         */
        static create(properties: fh.Pong.$Shape): fh.Pong & fh.Pong.$Shape;
        static create(properties?: fh.Pong.$Properties): fh.Pong;

        /**
         * Encodes the specified Pong message. Does not implicitly {@link fh.Pong.verify|verify} messages.
         * @param message Pong message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.Pong.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Pong message, length delimited. Does not implicitly {@link fh.Pong.verify|verify} messages.
         * @param message Pong message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.Pong.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Pong message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.Pong & fh.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.Pong & fh.Pong.$Shape;

        /**
         * Decodes a Pong message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.Pong & fh.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.Pong & fh.Pong.$Shape;

        /**
         * Verifies a Pong message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Pong message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Pong
         */
        static fromObject(object: { [k: string]: any }): fh.Pong;

        /**
         * Creates a plain object from a Pong message. Also converts values to other types if specified.
         * @param message Pong
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.Pong, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Pong to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for Pong
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace Pong {

        /** Properties of a Pong. */
        interface $Properties {

            /** Pong clientTimestamp */
            clientTimestamp?: (number|Long|null);

            /** Pong serverTimestamp */
            serverTimestamp?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a Pong. */
        type $Shape = fh.Pong.$Properties;
    }

    /**
     * Properties of an ErrorFrame.
     * @deprecated Use fh.ErrorFrame.$Properties instead.
     */
    interface IErrorFrame extends fh.ErrorFrame.$Properties {
    }

    /** Represents an ErrorFrame. */
    class ErrorFrame {

        /**
         * Constructs a new ErrorFrame.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.ErrorFrame.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ErrorFrame code. */
        code: string;

        /** ErrorFrame message. */
        message: string;

        /** ErrorFrame fatal. */
        fatal: boolean;

        /**
         * Creates a new ErrorFrame instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ErrorFrame instance
         */
        static create(properties: fh.ErrorFrame.$Shape): fh.ErrorFrame & fh.ErrorFrame.$Shape;
        static create(properties?: fh.ErrorFrame.$Properties): fh.ErrorFrame;

        /**
         * Encodes the specified ErrorFrame message. Does not implicitly {@link fh.ErrorFrame.verify|verify} messages.
         * @param message ErrorFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.ErrorFrame.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ErrorFrame message, length delimited. Does not implicitly {@link fh.ErrorFrame.verify|verify} messages.
         * @param message ErrorFrame message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.ErrorFrame.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an ErrorFrame message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.ErrorFrame & fh.ErrorFrame.$Shape} ErrorFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.ErrorFrame & fh.ErrorFrame.$Shape;

        /**
         * Decodes an ErrorFrame message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.ErrorFrame & fh.ErrorFrame.$Shape} ErrorFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.ErrorFrame & fh.ErrorFrame.$Shape;

        /**
         * Verifies an ErrorFrame message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an ErrorFrame message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ErrorFrame
         */
        static fromObject(object: { [k: string]: any }): fh.ErrorFrame;

        /**
         * Creates a plain object from an ErrorFrame message. Also converts values to other types if specified.
         * @param message ErrorFrame
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.ErrorFrame, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ErrorFrame to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ErrorFrame
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ErrorFrame {

        /** Properties of an ErrorFrame. */
        interface $Properties {

            /** ErrorFrame code */
            code?: (string|null);

            /** ErrorFrame message */
            message?: (string|null);

            /** ErrorFrame fatal */
            fatal?: (boolean|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of an ErrorFrame. */
        type $Shape = fh.ErrorFrame.$Properties;
    }

    /**
     * Properties of a PresenceUpdate.
     * @deprecated Use fh.PresenceUpdate.$Properties instead.
     */
    interface IPresenceUpdate extends fh.PresenceUpdate.$Properties {
    }

    /** Represents a PresenceUpdate. */
    class PresenceUpdate {

        /**
         * Constructs a new PresenceUpdate.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.PresenceUpdate.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** PresenceUpdate accountId. */
        accountId: Uint8Array;

        /** PresenceUpdate isOnline. */
        isOnline: boolean;

        /** PresenceUpdate lastSeen. */
        lastSeen?: (number|Long|null);

        /** PresenceUpdate customStatusText. */
        customStatusText?: (string|null);

        /** PresenceUpdate customStatusEmoji. */
        customStatusEmoji?: (string|null);

        /** PresenceUpdate customStatusExpiresAt. */
        customStatusExpiresAt?: (number|Long|null);

        /**
         * Creates a new PresenceUpdate instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PresenceUpdate instance
         */
        static create(properties: fh.PresenceUpdate.$Shape): fh.PresenceUpdate & fh.PresenceUpdate.$Shape;
        static create(properties?: fh.PresenceUpdate.$Properties): fh.PresenceUpdate;

        /**
         * Encodes the specified PresenceUpdate message. Does not implicitly {@link fh.PresenceUpdate.verify|verify} messages.
         * @param message PresenceUpdate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.PresenceUpdate.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PresenceUpdate message, length delimited. Does not implicitly {@link fh.PresenceUpdate.verify|verify} messages.
         * @param message PresenceUpdate message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.PresenceUpdate.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PresenceUpdate message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.PresenceUpdate & fh.PresenceUpdate.$Shape} PresenceUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.PresenceUpdate & fh.PresenceUpdate.$Shape;

        /**
         * Decodes a PresenceUpdate message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.PresenceUpdate & fh.PresenceUpdate.$Shape} PresenceUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.PresenceUpdate & fh.PresenceUpdate.$Shape;

        /**
         * Verifies a PresenceUpdate message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PresenceUpdate message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PresenceUpdate
         */
        static fromObject(object: { [k: string]: any }): fh.PresenceUpdate;

        /**
         * Creates a plain object from a PresenceUpdate message. Also converts values to other types if specified.
         * @param message PresenceUpdate
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.PresenceUpdate, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PresenceUpdate to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for PresenceUpdate
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace PresenceUpdate {

        /** Properties of a PresenceUpdate. */
        interface $Properties {

            /** PresenceUpdate accountId */
            accountId?: (Uint8Array|null);

            /** PresenceUpdate isOnline */
            isOnline?: (boolean|null);

            /** PresenceUpdate lastSeen */
            lastSeen?: (number|Long|null);

            /** PresenceUpdate customStatusText */
            customStatusText?: (string|null);

            /** PresenceUpdate customStatusEmoji */
            customStatusEmoji?: (string|null);

            /** PresenceUpdate customStatusExpiresAt */
            customStatusExpiresAt?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a PresenceUpdate. */
        type $Shape = fh.PresenceUpdate.$Properties;
    }

    /**
     * Properties of a BotMessageDelivery.
     * @deprecated Use fh.BotMessageDelivery.$Properties instead.
     */
    interface IBotMessageDelivery extends fh.BotMessageDelivery.$Properties {
    }

    /** Represents a BotMessageDelivery. */
    class BotMessageDelivery {

        /**
         * Constructs a new BotMessageDelivery.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.BotMessageDelivery.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** BotMessageDelivery messageId. */
        messageId: string;

        /** BotMessageDelivery botId. */
        botId: Uint8Array;

        /** BotMessageDelivery accountId. */
        accountId: Uint8Array;

        /** BotMessageDelivery text. */
        text: string;

        /** BotMessageDelivery replyToMessageId. */
        replyToMessageId?: (string|null);

        /** BotMessageDelivery createdAt. */
        createdAt: (number|Long);

        /**
         * Creates a new BotMessageDelivery instance using the specified properties.
         * @param [properties] Properties to set
         * @returns BotMessageDelivery instance
         */
        static create(properties: fh.BotMessageDelivery.$Shape): fh.BotMessageDelivery & fh.BotMessageDelivery.$Shape;
        static create(properties?: fh.BotMessageDelivery.$Properties): fh.BotMessageDelivery;

        /**
         * Encodes the specified BotMessageDelivery message. Does not implicitly {@link fh.BotMessageDelivery.verify|verify} messages.
         * @param message BotMessageDelivery message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.BotMessageDelivery.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified BotMessageDelivery message, length delimited. Does not implicitly {@link fh.BotMessageDelivery.verify|verify} messages.
         * @param message BotMessageDelivery message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.BotMessageDelivery.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a BotMessageDelivery message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.BotMessageDelivery & fh.BotMessageDelivery.$Shape} BotMessageDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.BotMessageDelivery & fh.BotMessageDelivery.$Shape;

        /**
         * Decodes a BotMessageDelivery message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.BotMessageDelivery & fh.BotMessageDelivery.$Shape} BotMessageDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.BotMessageDelivery & fh.BotMessageDelivery.$Shape;

        /**
         * Verifies a BotMessageDelivery message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a BotMessageDelivery message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns BotMessageDelivery
         */
        static fromObject(object: { [k: string]: any }): fh.BotMessageDelivery;

        /**
         * Creates a plain object from a BotMessageDelivery message. Also converts values to other types if specified.
         * @param message BotMessageDelivery
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.BotMessageDelivery, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this BotMessageDelivery to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for BotMessageDelivery
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace BotMessageDelivery {

        /** Properties of a BotMessageDelivery. */
        interface $Properties {

            /** BotMessageDelivery messageId */
            messageId?: (string|null);

            /** BotMessageDelivery botId */
            botId?: (Uint8Array|null);

            /** BotMessageDelivery accountId */
            accountId?: (Uint8Array|null);

            /** BotMessageDelivery text */
            text?: (string|null);

            /** BotMessageDelivery replyToMessageId */
            replyToMessageId?: (string|null);

            /** BotMessageDelivery createdAt */
            createdAt?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a BotMessageDelivery. */
        type $Shape = fh.BotMessageDelivery.$Properties;
    }

    /**
     * Properties of a ChannelPostDelivery.
     * @deprecated Use fh.ChannelPostDelivery.$Properties instead.
     */
    interface IChannelPostDelivery extends fh.ChannelPostDelivery.$Properties {
    }

    /** Represents a ChannelPostDelivery. */
    class ChannelPostDelivery {

        /**
         * Constructs a new ChannelPostDelivery.
         * @param [properties] Properties to set
         */
        constructor(properties?: fh.ChannelPostDelivery.$Properties);

        /** Unknown fields preserved while decoding when enabled */
        $unknowns?: Uint8Array[];

        /** ChannelPostDelivery postId. */
        postId: string;

        /** ChannelPostDelivery channelId. */
        channelId: Uint8Array;

        /** ChannelPostDelivery authorType. */
        authorType: string;

        /** ChannelPostDelivery authorId. */
        authorId: Uint8Array;

        /** ChannelPostDelivery text. */
        text: string;

        /** ChannelPostDelivery attachmentIds. */
        attachmentIds: string[];

        /** ChannelPostDelivery replyToPostId. */
        replyToPostId?: (string|null);

        /** ChannelPostDelivery createdAt. */
        createdAt: (number|Long);

        /**
         * Creates a new ChannelPostDelivery instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ChannelPostDelivery instance
         */
        static create(properties: fh.ChannelPostDelivery.$Shape): fh.ChannelPostDelivery & fh.ChannelPostDelivery.$Shape;
        static create(properties?: fh.ChannelPostDelivery.$Properties): fh.ChannelPostDelivery;

        /**
         * Encodes the specified ChannelPostDelivery message. Does not implicitly {@link fh.ChannelPostDelivery.verify|verify} messages.
         * @param message ChannelPostDelivery message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encode(message: fh.ChannelPostDelivery.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ChannelPostDelivery message, length delimited. Does not implicitly {@link fh.ChannelPostDelivery.verify|verify} messages.
         * @param message ChannelPostDelivery message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        static encodeDelimited(message: fh.ChannelPostDelivery.$Properties, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ChannelPostDelivery message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns {fh.ChannelPostDelivery & fh.ChannelPostDelivery.$Shape} ChannelPostDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): fh.ChannelPostDelivery & fh.ChannelPostDelivery.$Shape;

        /**
         * Decodes a ChannelPostDelivery message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns {fh.ChannelPostDelivery & fh.ChannelPostDelivery.$Shape} ChannelPostDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): fh.ChannelPostDelivery & fh.ChannelPostDelivery.$Shape;

        /**
         * Verifies a ChannelPostDelivery message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ChannelPostDelivery message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ChannelPostDelivery
         */
        static fromObject(object: { [k: string]: any }): fh.ChannelPostDelivery;

        /**
         * Creates a plain object from a ChannelPostDelivery message. Also converts values to other types if specified.
         * @param message ChannelPostDelivery
         * @param [options] Conversion options
         * @returns Plain object
         */
        static toObject(message: fh.ChannelPostDelivery, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ChannelPostDelivery to JSON.
         * @returns JSON object
         */
        toJSON(): { [k: string]: any };

        /**
         * Gets the type url for ChannelPostDelivery
         * @param [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns The type url
         */
        static getTypeUrl(prefix?: string): string;
    }

    namespace ChannelPostDelivery {

        /** Properties of a ChannelPostDelivery. */
        interface $Properties {

            /** ChannelPostDelivery postId */
            postId?: (string|null);

            /** ChannelPostDelivery channelId */
            channelId?: (Uint8Array|null);

            /** ChannelPostDelivery authorType */
            authorType?: (string|null);

            /** ChannelPostDelivery authorId */
            authorId?: (Uint8Array|null);

            /** ChannelPostDelivery text */
            text?: (string|null);

            /** ChannelPostDelivery attachmentIds */
            attachmentIds?: (string[]|null);

            /** ChannelPostDelivery replyToPostId */
            replyToPostId?: (string|null);

            /** ChannelPostDelivery createdAt */
            createdAt?: (number|Long|null);

            /** Unknown fields preserved while decoding when enabled */
            $unknowns?: Uint8Array[];
        }

        /** Shape of a ChannelPostDelivery. */
        type $Shape = fh.ChannelPostDelivery.$Properties;
    }
}
