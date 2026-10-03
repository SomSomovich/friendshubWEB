/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-mixed-operators, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, default-case, jsdoc/require-param*/
import $protobuf from "protobufjs/minimal.js";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;
const $Object = $util.global.Object, $undefined = $util.global.undefined, $Error = $util.global.Error, $RangeError = $util.global.RangeError, $TypeError = $util.global.TypeError, $Number = $util.global.Number, $Boolean = $util.global.Boolean, $parseInt = $util.global.parseInt, $String = $util.global.String, $Array = $util.global.Array, $BigInt = $util.global.BigInt;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const fh = $root.fh = (() => {

    /**
     * Namespace fh.
     * @exports fh
     * @namespace
     */
    const fh = {};

    fh.ProtocolVersion = (function() {

        /**
         * Properties of a ProtocolVersion.
         * @typedef {Object} fh.ProtocolVersion.$Properties
         * @property {number|null} [major] ProtocolVersion major
         * @property {number|null} [minor] ProtocolVersion minor
         * @property {number|null} [patch] ProtocolVersion patch
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ProtocolVersion.
         * @memberof fh
         * @interface IProtocolVersion
         * @augments fh.ProtocolVersion.$Properties
         * @deprecated Use fh.ProtocolVersion.$Properties instead.
         */

        /**
         * Shape of a ProtocolVersion.
         * @typedef {fh.ProtocolVersion.$Properties} fh.ProtocolVersion.$Shape
         */

        /**
         * Constructs a new ProtocolVersion.
         * @memberof fh
         * @classdesc Represents a ProtocolVersion.
         * @constructor
         * @param {fh.ProtocolVersion.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ProtocolVersion = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ProtocolVersion major.
         * @member {number} major
         * @memberof fh.ProtocolVersion
         * @instance
         */
        ProtocolVersion.prototype.major = 0;

        /**
         * ProtocolVersion minor.
         * @member {number} minor
         * @memberof fh.ProtocolVersion
         * @instance
         */
        ProtocolVersion.prototype.minor = 0;

        /**
         * ProtocolVersion patch.
         * @member {number} patch
         * @memberof fh.ProtocolVersion
         * @instance
         */
        ProtocolVersion.prototype.patch = 0;

        /**
         * Creates a new ProtocolVersion instance using the specified properties.
         * @function create
         * @memberof fh.ProtocolVersion
         * @static
         * @param {fh.ProtocolVersion.$Properties=} [properties] Properties to set
         * @returns {fh.ProtocolVersion} ProtocolVersion instance
         * @type {{
         *   (properties: fh.ProtocolVersion.$Shape): fh.ProtocolVersion & fh.ProtocolVersion.$Shape;
         *   (properties?: fh.ProtocolVersion.$Properties): fh.ProtocolVersion;
         * }}
         */
        ProtocolVersion.create = function(properties) {
            return new ProtocolVersion(properties);
        };

        /**
         * Encodes the specified ProtocolVersion message. Does not implicitly {@link fh.ProtocolVersion.verify|verify} messages.
         * @function encode
         * @memberof fh.ProtocolVersion
         * @static
         * @param {fh.ProtocolVersion.$Properties} message ProtocolVersion message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolVersion.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.major != null && $Object.hasOwnProperty.call(message, "major") && message.major !== 0)
                writer.uint32(/* id 1, wireType 0 =*/8).uint32(message.major);
            if (message.minor != null && $Object.hasOwnProperty.call(message, "minor") && message.minor !== 0)
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.minor);
            if (message.patch != null && $Object.hasOwnProperty.call(message, "patch") && message.patch !== 0)
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.patch);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ProtocolVersion message, length delimited. Does not implicitly {@link fh.ProtocolVersion.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.ProtocolVersion
         * @static
         * @param {fh.ProtocolVersion.$Properties} message ProtocolVersion message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ProtocolVersion.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ProtocolVersion message from the specified reader or buffer.
         * @function decode
         * @memberof fh.ProtocolVersion
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.ProtocolVersion & fh.ProtocolVersion.$Shape} ProtocolVersion
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolVersion.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.ProtocolVersion();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.major = value;
                        else
                            delete message.major;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.minor = value;
                        else
                            delete message.minor;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.patch = value;
                        else
                            delete message.patch;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ProtocolVersion message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.ProtocolVersion
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.ProtocolVersion & fh.ProtocolVersion.$Shape} ProtocolVersion
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ProtocolVersion.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ProtocolVersion message.
         * @function verify
         * @memberof fh.ProtocolVersion
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ProtocolVersion.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.major != null && $Object.hasOwnProperty.call(message, "major"))
                if (!$util.isInteger(message.major))
                    return "major: integer expected";
            if (message.minor != null && $Object.hasOwnProperty.call(message, "minor"))
                if (!$util.isInteger(message.minor))
                    return "minor: integer expected";
            if (message.patch != null && $Object.hasOwnProperty.call(message, "patch"))
                if (!$util.isInteger(message.patch))
                    return "patch: integer expected";
            return null;
        };

        /**
         * Creates a ProtocolVersion message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.ProtocolVersion
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.ProtocolVersion} ProtocolVersion
         */
        ProtocolVersion.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.ProtocolVersion)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.ProtocolVersion: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.ProtocolVersion();
            if (object.major != null)
                if ($Number(object.major) !== 0)
                    message.major = object.major >>> 0;
            if (object.minor != null)
                if ($Number(object.minor) !== 0)
                    message.minor = object.minor >>> 0;
            if (object.patch != null)
                if ($Number(object.patch) !== 0)
                    message.patch = object.patch >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a ProtocolVersion message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.ProtocolVersion
         * @static
         * @param {fh.ProtocolVersion} message ProtocolVersion
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ProtocolVersion.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.major = 0;
                object.minor = 0;
                object.patch = 0;
            }
            if (message.major != null && $Object.hasOwnProperty.call(message, "major"))
                object.major = message.major;
            if (message.minor != null && $Object.hasOwnProperty.call(message, "minor"))
                object.minor = message.minor;
            if (message.patch != null && $Object.hasOwnProperty.call(message, "patch"))
                object.patch = message.patch;
            return object;
        };

        /**
         * Converts this ProtocolVersion to JSON.
         * @function toJSON
         * @memberof fh.ProtocolVersion
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ProtocolVersion.prototype.toJSON = function() {
            return ProtocolVersion.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ProtocolVersion
         * @function getTypeUrl
         * @memberof fh.ProtocolVersion
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ProtocolVersion.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.ProtocolVersion";
        };

        return ProtocolVersion;
    })();

    fh.Envelope = (function() {

        /**
         * Properties of an Envelope.
         * @typedef {Object} fh.Envelope.$Properties
         * @property {Uint8Array|null} [envelopeId] Envelope envelopeId
         * @property {Uint8Array|null} [senderAccountId] Envelope senderAccountId
         * @property {number|null} [senderDeviceNumber] Envelope senderDeviceNumber
         * @property {Uint8Array|null} [recipientAccountId] Envelope recipientAccountId
         * @property {number|null} [recipientDeviceNumber] Envelope recipientDeviceNumber
         * @property {fh.EnvelopeType|null} [envelopeType] Envelope envelopeType
         * @property {boolean|null} [isPrekeyMessage] Envelope isPrekeyMessage
         * @property {Uint8Array|null} [ciphertext] Envelope ciphertext
         * @property {number|Long|null} [clientTimestamp] Envelope clientTimestamp
         * @property {Uint8Array|null} [conversationId] Envelope conversationId
         * @property {boolean|null} [senderIsBot] Envelope senderIsBot
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an Envelope.
         * @memberof fh
         * @interface IEnvelope
         * @augments fh.Envelope.$Properties
         * @deprecated Use fh.Envelope.$Properties instead.
         */

        /**
         * Shape of an Envelope.
         * @typedef {fh.Envelope.$Properties} fh.Envelope.$Shape
         */

        /**
         * Constructs a new Envelope.
         * @memberof fh
         * @classdesc Represents an Envelope.
         * @constructor
         * @param {fh.Envelope.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Envelope = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Envelope envelopeId.
         * @member {Uint8Array} envelopeId
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.envelopeId = $util.newBuffer([]);

        /**
         * Envelope senderAccountId.
         * @member {Uint8Array} senderAccountId
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.senderAccountId = $util.newBuffer([]);

        /**
         * Envelope senderDeviceNumber.
         * @member {number} senderDeviceNumber
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.senderDeviceNumber = 0;

        /**
         * Envelope recipientAccountId.
         * @member {Uint8Array} recipientAccountId
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.recipientAccountId = $util.newBuffer([]);

        /**
         * Envelope recipientDeviceNumber.
         * @member {number} recipientDeviceNumber
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.recipientDeviceNumber = 0;

        /**
         * Envelope envelopeType.
         * @member {fh.EnvelopeType} envelopeType
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.envelopeType = 0;

        /**
         * Envelope isPrekeyMessage.
         * @member {boolean} isPrekeyMessage
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.isPrekeyMessage = false;

        /**
         * Envelope ciphertext.
         * @member {Uint8Array} ciphertext
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.ciphertext = $util.newBuffer([]);

        /**
         * Envelope clientTimestamp.
         * @member {number|Long} clientTimestamp
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.clientTimestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Envelope conversationId.
         * @member {Uint8Array} conversationId
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.conversationId = $util.newBuffer([]);

        /**
         * Envelope senderIsBot.
         * @member {boolean} senderIsBot
         * @memberof fh.Envelope
         * @instance
         */
        Envelope.prototype.senderIsBot = false;

        /**
         * Creates a new Envelope instance using the specified properties.
         * @function create
         * @memberof fh.Envelope
         * @static
         * @param {fh.Envelope.$Properties=} [properties] Properties to set
         * @returns {fh.Envelope} Envelope instance
         * @type {{
         *   (properties: fh.Envelope.$Shape): fh.Envelope & fh.Envelope.$Shape;
         *   (properties?: fh.Envelope.$Properties): fh.Envelope;
         * }}
         */
        Envelope.create = function(properties) {
            return new Envelope(properties);
        };

        /**
         * Encodes the specified Envelope message. Does not implicitly {@link fh.Envelope.verify|verify} messages.
         * @function encode
         * @memberof fh.Envelope
         * @static
         * @param {fh.Envelope.$Properties} message Envelope message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Envelope.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.envelopeId != null && $Object.hasOwnProperty.call(message, "envelopeId") && message.envelopeId.length)
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.envelopeId);
            if (message.senderAccountId != null && $Object.hasOwnProperty.call(message, "senderAccountId") && message.senderAccountId.length)
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.senderAccountId);
            if (message.senderDeviceNumber != null && $Object.hasOwnProperty.call(message, "senderDeviceNumber") && message.senderDeviceNumber !== 0)
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.senderDeviceNumber);
            if (message.recipientAccountId != null && $Object.hasOwnProperty.call(message, "recipientAccountId") && message.recipientAccountId.length)
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.recipientAccountId);
            if (message.recipientDeviceNumber != null && $Object.hasOwnProperty.call(message, "recipientDeviceNumber") && message.recipientDeviceNumber !== 0)
                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.recipientDeviceNumber);
            if (message.envelopeType != null && $Object.hasOwnProperty.call(message, "envelopeType") && message.envelopeType !== 0)
                writer.uint32(/* id 6, wireType 0 =*/48).int32(message.envelopeType);
            if (message.isPrekeyMessage != null && $Object.hasOwnProperty.call(message, "isPrekeyMessage") && message.isPrekeyMessage !== false)
                writer.uint32(/* id 7, wireType 0 =*/56).bool(message.isPrekeyMessage);
            if (message.ciphertext != null && $Object.hasOwnProperty.call(message, "ciphertext") && message.ciphertext.length)
                writer.uint32(/* id 8, wireType 2 =*/66).bytes(message.ciphertext);
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp") && (typeof message.clientTimestamp === "object" ? message.clientTimestamp.low || message.clientTimestamp.high : message.clientTimestamp !== 0))
                writer.uint32(/* id 9, wireType 0 =*/72).int64(message.clientTimestamp);
            if (message.conversationId != null && $Object.hasOwnProperty.call(message, "conversationId") && message.conversationId.length)
                writer.uint32(/* id 10, wireType 2 =*/82).bytes(message.conversationId);
            if (message.senderIsBot != null && $Object.hasOwnProperty.call(message, "senderIsBot") && message.senderIsBot !== false)
                writer.uint32(/* id 11, wireType 0 =*/88).bool(message.senderIsBot);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Envelope message, length delimited. Does not implicitly {@link fh.Envelope.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.Envelope
         * @static
         * @param {fh.Envelope.$Properties} message Envelope message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Envelope.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes an Envelope message from the specified reader or buffer.
         * @function decode
         * @memberof fh.Envelope
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.Envelope & fh.Envelope.$Shape} Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Envelope.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.Envelope();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.envelopeId = value;
                        else
                            delete message.envelopeId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.senderAccountId = value;
                        else
                            delete message.senderAccountId;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.senderDeviceNumber = value;
                        else
                            delete message.senderDeviceNumber;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.recipientAccountId = value;
                        else
                            delete message.recipientAccountId;
                        continue;
                    }
                case 5: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.recipientDeviceNumber = value;
                        else
                            delete message.recipientDeviceNumber;
                        continue;
                    }
                case 6: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.int32())
                            message.envelopeType = value;
                        else
                            delete message.envelopeType;
                        continue;
                    }
                case 7: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.isPrekeyMessage = value;
                        else
                            delete message.isPrekeyMessage;
                        continue;
                    }
                case 8: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.ciphertext = value;
                        else
                            delete message.ciphertext;
                        continue;
                    }
                case 9: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.clientTimestamp = value;
                        else
                            delete message.clientTimestamp;
                        continue;
                    }
                case 10: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.conversationId = value;
                        else
                            delete message.conversationId;
                        continue;
                    }
                case 11: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.senderIsBot = value;
                        else
                            delete message.senderIsBot;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an Envelope message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.Envelope
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.Envelope & fh.Envelope.$Shape} Envelope
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Envelope.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Envelope message.
         * @function verify
         * @memberof fh.Envelope
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Envelope.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.envelopeId != null && $Object.hasOwnProperty.call(message, "envelopeId"))
                if (!(message.envelopeId && typeof message.envelopeId.length === "number" || $util.isString(message.envelopeId)))
                    return "envelopeId: buffer expected";
            if (message.senderAccountId != null && $Object.hasOwnProperty.call(message, "senderAccountId"))
                if (!(message.senderAccountId && typeof message.senderAccountId.length === "number" || $util.isString(message.senderAccountId)))
                    return "senderAccountId: buffer expected";
            if (message.senderDeviceNumber != null && $Object.hasOwnProperty.call(message, "senderDeviceNumber"))
                if (!$util.isInteger(message.senderDeviceNumber))
                    return "senderDeviceNumber: integer expected";
            if (message.recipientAccountId != null && $Object.hasOwnProperty.call(message, "recipientAccountId"))
                if (!(message.recipientAccountId && typeof message.recipientAccountId.length === "number" || $util.isString(message.recipientAccountId)))
                    return "recipientAccountId: buffer expected";
            if (message.recipientDeviceNumber != null && $Object.hasOwnProperty.call(message, "recipientDeviceNumber"))
                if (!$util.isInteger(message.recipientDeviceNumber))
                    return "recipientDeviceNumber: integer expected";
            if (message.envelopeType != null && $Object.hasOwnProperty.call(message, "envelopeType"))
                if (typeof message.envelopeType !== "number" || (message.envelopeType | 0) !== message.envelopeType)
                    return "envelopeType: enum value expected";
            if (message.isPrekeyMessage != null && $Object.hasOwnProperty.call(message, "isPrekeyMessage"))
                if (typeof message.isPrekeyMessage !== "boolean")
                    return "isPrekeyMessage: boolean expected";
            if (message.ciphertext != null && $Object.hasOwnProperty.call(message, "ciphertext"))
                if (!(message.ciphertext && typeof message.ciphertext.length === "number" || $util.isString(message.ciphertext)))
                    return "ciphertext: buffer expected";
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp"))
                if (!$util.isInteger(message.clientTimestamp) && !(message.clientTimestamp && $util.isInteger(message.clientTimestamp.low) && $util.isInteger(message.clientTimestamp.high)))
                    return "clientTimestamp: integer|Long expected";
            if (message.conversationId != null && $Object.hasOwnProperty.call(message, "conversationId"))
                if (!(message.conversationId && typeof message.conversationId.length === "number" || $util.isString(message.conversationId)))
                    return "conversationId: buffer expected";
            if (message.senderIsBot != null && $Object.hasOwnProperty.call(message, "senderIsBot"))
                if (typeof message.senderIsBot !== "boolean")
                    return "senderIsBot: boolean expected";
            return null;
        };

        /**
         * Creates an Envelope message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.Envelope
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.Envelope} Envelope
         */
        Envelope.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.Envelope)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.Envelope: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.Envelope();
            if (object.envelopeId != null)
                if (object.envelopeId.length)
                    if (typeof object.envelopeId === "string")
                        $util.base64.decode(object.envelopeId, message.envelopeId = $util.newBuffer($util.base64.length(object.envelopeId)), 0);
                    else if (object.envelopeId.length >= 0)
                        message.envelopeId = object.envelopeId;
            if (object.senderAccountId != null)
                if (object.senderAccountId.length)
                    if (typeof object.senderAccountId === "string")
                        $util.base64.decode(object.senderAccountId, message.senderAccountId = $util.newBuffer($util.base64.length(object.senderAccountId)), 0);
                    else if (object.senderAccountId.length >= 0)
                        message.senderAccountId = object.senderAccountId;
            if (object.senderDeviceNumber != null)
                if ($Number(object.senderDeviceNumber) !== 0)
                    message.senderDeviceNumber = object.senderDeviceNumber >>> 0;
            if (object.recipientAccountId != null)
                if (object.recipientAccountId.length)
                    if (typeof object.recipientAccountId === "string")
                        $util.base64.decode(object.recipientAccountId, message.recipientAccountId = $util.newBuffer($util.base64.length(object.recipientAccountId)), 0);
                    else if (object.recipientAccountId.length >= 0)
                        message.recipientAccountId = object.recipientAccountId;
            if (object.recipientDeviceNumber != null)
                if ($Number(object.recipientDeviceNumber) !== 0)
                    message.recipientDeviceNumber = object.recipientDeviceNumber >>> 0;
            if (object.envelopeType !== 0 && (typeof object.envelopeType !== "string" || $root.fh.EnvelopeType[object.envelopeType] !== 0))
                switch (object.envelopeType) {
                case "ENVELOPE_TYPE_UNSPECIFIED":
                case 0:
                    message.envelopeType = 0;
                    break;
                case "ENVELOPE_TYPE_MESSAGE":
                case 1:
                    message.envelopeType = 1;
                    break;
                case "ENVELOPE_TYPE_SYNC":
                case 2:
                    message.envelopeType = 2;
                    break;
                case "ENVELOPE_TYPE_SENDER_KEY":
                case 3:
                    message.envelopeType = 3;
                    break;
                case "ENVELOPE_TYPE_EDIT":
                case 4:
                    message.envelopeType = 4;
                    break;
                case "ENVELOPE_TYPE_DELETE":
                case 5:
                    message.envelopeType = 5;
                    break;
                case "ENVELOPE_TYPE_REACTION":
                case 6:
                    message.envelopeType = 6;
                    break;
                case "ENVELOPE_TYPE_READ_RECEIPT":
                case 7:
                    message.envelopeType = 7;
                    break;
                case "ENVELOPE_TYPE_TYPING":
                case 8:
                    message.envelopeType = 8;
                    break;
                case "ENVELOPE_TYPE_ATTACHMENT_KEY":
                case 9:
                    message.envelopeType = 9;
                    break;
                case "ENVELOPE_TYPE_CALL_OFFER":
                case 10:
                    message.envelopeType = 10;
                    break;
                case "ENVELOPE_TYPE_CALL_ANSWER":
                case 11:
                    message.envelopeType = 11;
                    break;
                case "ENVELOPE_TYPE_CALL_ICE":
                case 12:
                    message.envelopeType = 12;
                    break;
                case "ENVELOPE_TYPE_CALL_HANGUP":
                case 13:
                    message.envelopeType = 13;
                    break;
                case "ENVELOPE_TYPE_CALL_REJECT":
                case 14:
                    message.envelopeType = 14;
                    break;
                case "ENVELOPE_TYPE_BOT_MESSAGE":
                case 15:
                    message.envelopeType = 15;
                    break;
                case "ENVELOPE_TYPE_PIN":
                case 16:
                    message.envelopeType = 16;
                    break;
                case "ENVELOPE_TYPE_UNPIN":
                case 17:
                    message.envelopeType = 17;
                    break;
                default:
                    if (typeof object.envelopeType === "number" && (object.envelopeType | 0) === object.envelopeType)
                        message.envelopeType = object.envelopeType;
                }
            if (object.isPrekeyMessage != null)
                if (object.isPrekeyMessage)
                    message.isPrekeyMessage = $Boolean(object.isPrekeyMessage);
            if (object.ciphertext != null)
                if (object.ciphertext.length)
                    if (typeof object.ciphertext === "string")
                        $util.base64.decode(object.ciphertext, message.ciphertext = $util.newBuffer($util.base64.length(object.ciphertext)), 0);
                    else if (object.ciphertext.length >= 0)
                        message.ciphertext = object.ciphertext;
            if (object.clientTimestamp != null)
                if (typeof object.clientTimestamp === "object" ? object.clientTimestamp.low || object.clientTimestamp.high : $Number(object.clientTimestamp) !== 0)
                    if ($util.Long)
                        message.clientTimestamp = $util.Long.fromValue(object.clientTimestamp, false);
                    else if (typeof object.clientTimestamp === "string")
                        message.clientTimestamp = $parseInt(object.clientTimestamp, 10);
                    else if (typeof object.clientTimestamp === "number")
                        message.clientTimestamp = object.clientTimestamp;
                    else if (typeof object.clientTimestamp === "object")
                        message.clientTimestamp = new $util.LongBits(object.clientTimestamp.low >>> 0, object.clientTimestamp.high >>> 0).toNumber();
            if (object.conversationId != null)
                if (object.conversationId.length)
                    if (typeof object.conversationId === "string")
                        $util.base64.decode(object.conversationId, message.conversationId = $util.newBuffer($util.base64.length(object.conversationId)), 0);
                    else if (object.conversationId.length >= 0)
                        message.conversationId = object.conversationId;
            if (object.senderIsBot != null)
                if (object.senderIsBot)
                    message.senderIsBot = $Boolean(object.senderIsBot);
            return message;
        };

        /**
         * Creates a plain object from an Envelope message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.Envelope
         * @static
         * @param {fh.Envelope} message Envelope
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Envelope.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if (options.bytes === $String)
                    object.envelopeId = "";
                else {
                    object.envelopeId = [];
                    if (options.bytes !== $Array)
                        object.envelopeId = $util.newBuffer(object.envelopeId);
                }
                if (options.bytes === $String)
                    object.senderAccountId = "";
                else {
                    object.senderAccountId = [];
                    if (options.bytes !== $Array)
                        object.senderAccountId = $util.newBuffer(object.senderAccountId);
                }
                object.senderDeviceNumber = 0;
                if (options.bytes === $String)
                    object.recipientAccountId = "";
                else {
                    object.recipientAccountId = [];
                    if (options.bytes !== $Array)
                        object.recipientAccountId = $util.newBuffer(object.recipientAccountId);
                }
                object.recipientDeviceNumber = 0;
                object.envelopeType = options.enums === $String ? "ENVELOPE_TYPE_UNSPECIFIED" : 0;
                object.isPrekeyMessage = false;
                if (options.bytes === $String)
                    object.ciphertext = "";
                else {
                    object.ciphertext = [];
                    if (options.bytes !== $Array)
                        object.ciphertext = $util.newBuffer(object.ciphertext);
                }
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.clientTimestamp = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.clientTimestamp = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                if (options.bytes === $String)
                    object.conversationId = "";
                else {
                    object.conversationId = [];
                    if (options.bytes !== $Array)
                        object.conversationId = $util.newBuffer(object.conversationId);
                }
                object.senderIsBot = false;
            }
            if (message.envelopeId != null && $Object.hasOwnProperty.call(message, "envelopeId"))
                object.envelopeId = options.bytes === $String ? $util.base64.encode(message.envelopeId, 0, message.envelopeId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.envelopeId) : message.envelopeId;
            if (message.senderAccountId != null && $Object.hasOwnProperty.call(message, "senderAccountId"))
                object.senderAccountId = options.bytes === $String ? $util.base64.encode(message.senderAccountId, 0, message.senderAccountId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.senderAccountId) : message.senderAccountId;
            if (message.senderDeviceNumber != null && $Object.hasOwnProperty.call(message, "senderDeviceNumber"))
                object.senderDeviceNumber = message.senderDeviceNumber;
            if (message.recipientAccountId != null && $Object.hasOwnProperty.call(message, "recipientAccountId"))
                object.recipientAccountId = options.bytes === $String ? $util.base64.encode(message.recipientAccountId, 0, message.recipientAccountId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.recipientAccountId) : message.recipientAccountId;
            if (message.recipientDeviceNumber != null && $Object.hasOwnProperty.call(message, "recipientDeviceNumber"))
                object.recipientDeviceNumber = message.recipientDeviceNumber;
            if (message.envelopeType != null && $Object.hasOwnProperty.call(message, "envelopeType"))
                object.envelopeType = options.enums === $String ? $root.fh.EnvelopeType[message.envelopeType] === $undefined ? message.envelopeType : $root.fh.EnvelopeType[message.envelopeType] : message.envelopeType;
            if (message.isPrekeyMessage != null && $Object.hasOwnProperty.call(message, "isPrekeyMessage"))
                object.isPrekeyMessage = message.isPrekeyMessage;
            if (message.ciphertext != null && $Object.hasOwnProperty.call(message, "ciphertext"))
                object.ciphertext = options.bytes === $String ? $util.base64.encode(message.ciphertext, 0, message.ciphertext.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.ciphertext) : message.ciphertext;
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.clientTimestamp = typeof message.clientTimestamp === "number" ? $BigInt(message.clientTimestamp) : $util.Long.fromBits(message.clientTimestamp.low >>> 0, message.clientTimestamp.high >>> 0, false).toBigInt();
                else if (typeof message.clientTimestamp === "number")
                    object.clientTimestamp = options.longs === $String ? $String(message.clientTimestamp) : message.clientTimestamp;
                else
                    object.clientTimestamp = options.longs === $String ? $util.Long.prototype.toString.call(message.clientTimestamp) : options.longs === $Number ? new $util.LongBits(message.clientTimestamp.low >>> 0, message.clientTimestamp.high >>> 0).toNumber() : message.clientTimestamp;
            if (message.conversationId != null && $Object.hasOwnProperty.call(message, "conversationId"))
                object.conversationId = options.bytes === $String ? $util.base64.encode(message.conversationId, 0, message.conversationId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.conversationId) : message.conversationId;
            if (message.senderIsBot != null && $Object.hasOwnProperty.call(message, "senderIsBot"))
                object.senderIsBot = message.senderIsBot;
            return object;
        };

        /**
         * Converts this Envelope to JSON.
         * @function toJSON
         * @memberof fh.Envelope
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Envelope.prototype.toJSON = function() {
            return Envelope.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Envelope
         * @function getTypeUrl
         * @memberof fh.Envelope
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Envelope.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.Envelope";
        };

        return Envelope;
    })();

    /**
     * EnvelopeType enum.
     * @name fh.EnvelopeType
     * @enum {number}
     * @property {number} ENVELOPE_TYPE_UNSPECIFIED=0 ENVELOPE_TYPE_UNSPECIFIED value
     * @property {number} ENVELOPE_TYPE_MESSAGE=1 ENVELOPE_TYPE_MESSAGE value
     * @property {number} ENVELOPE_TYPE_SYNC=2 ENVELOPE_TYPE_SYNC value
     * @property {number} ENVELOPE_TYPE_SENDER_KEY=3 ENVELOPE_TYPE_SENDER_KEY value
     * @property {number} ENVELOPE_TYPE_EDIT=4 ENVELOPE_TYPE_EDIT value
     * @property {number} ENVELOPE_TYPE_DELETE=5 ENVELOPE_TYPE_DELETE value
     * @property {number} ENVELOPE_TYPE_REACTION=6 ENVELOPE_TYPE_REACTION value
     * @property {number} ENVELOPE_TYPE_READ_RECEIPT=7 ENVELOPE_TYPE_READ_RECEIPT value
     * @property {number} ENVELOPE_TYPE_TYPING=8 ENVELOPE_TYPE_TYPING value
     * @property {number} ENVELOPE_TYPE_ATTACHMENT_KEY=9 ENVELOPE_TYPE_ATTACHMENT_KEY value
     * @property {number} ENVELOPE_TYPE_CALL_OFFER=10 ENVELOPE_TYPE_CALL_OFFER value
     * @property {number} ENVELOPE_TYPE_CALL_ANSWER=11 ENVELOPE_TYPE_CALL_ANSWER value
     * @property {number} ENVELOPE_TYPE_CALL_ICE=12 ENVELOPE_TYPE_CALL_ICE value
     * @property {number} ENVELOPE_TYPE_CALL_HANGUP=13 ENVELOPE_TYPE_CALL_HANGUP value
     * @property {number} ENVELOPE_TYPE_CALL_REJECT=14 ENVELOPE_TYPE_CALL_REJECT value
     * @property {number} ENVELOPE_TYPE_BOT_MESSAGE=15 ENVELOPE_TYPE_BOT_MESSAGE value
     * @property {number} ENVELOPE_TYPE_PIN=16 ENVELOPE_TYPE_PIN value
     * @property {number} ENVELOPE_TYPE_UNPIN=17 ENVELOPE_TYPE_UNPIN value
     */
    fh.EnvelopeType = (function() {
        const valuesById = $Object.create(null), values = $Object.create(valuesById);
        values[valuesById[0] = "ENVELOPE_TYPE_UNSPECIFIED"] = 0;
        values[valuesById[1] = "ENVELOPE_TYPE_MESSAGE"] = 1;
        values[valuesById[2] = "ENVELOPE_TYPE_SYNC"] = 2;
        values[valuesById[3] = "ENVELOPE_TYPE_SENDER_KEY"] = 3;
        values[valuesById[4] = "ENVELOPE_TYPE_EDIT"] = 4;
        values[valuesById[5] = "ENVELOPE_TYPE_DELETE"] = 5;
        values[valuesById[6] = "ENVELOPE_TYPE_REACTION"] = 6;
        values[valuesById[7] = "ENVELOPE_TYPE_READ_RECEIPT"] = 7;
        values[valuesById[8] = "ENVELOPE_TYPE_TYPING"] = 8;
        values[valuesById[9] = "ENVELOPE_TYPE_ATTACHMENT_KEY"] = 9;
        values[valuesById[10] = "ENVELOPE_TYPE_CALL_OFFER"] = 10;
        values[valuesById[11] = "ENVELOPE_TYPE_CALL_ANSWER"] = 11;
        values[valuesById[12] = "ENVELOPE_TYPE_CALL_ICE"] = 12;
        values[valuesById[13] = "ENVELOPE_TYPE_CALL_HANGUP"] = 13;
        values[valuesById[14] = "ENVELOPE_TYPE_CALL_REJECT"] = 14;
        values[valuesById[15] = "ENVELOPE_TYPE_BOT_MESSAGE"] = 15;
        values[valuesById[16] = "ENVELOPE_TYPE_PIN"] = 16;
        values[valuesById[17] = "ENVELOPE_TYPE_UNPIN"] = 17;
        return values;
    })();

    fh.ClientFrame = (function() {

        /**
         * Properties of a ClientFrame.
         * @typedef {Object} fh.ClientFrame.$Properties
         * @property {fh.ClientHello.$Properties|null} [hello] ClientFrame hello
         * @property {fh.EnvelopeUpload.$Properties|null} [upload] ClientFrame upload
         * @property {fh.EnvelopeAck.$Properties|null} [ack] ClientFrame ack
         * @property {fh.Ping.$Properties|null} [ping] ClientFrame ping
         * @property {"hello"|"upload"|"ack"|"ping"} [kind] ClientFrame kind
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ClientFrame.
         * @memberof fh
         * @interface IClientFrame
         * @augments fh.ClientFrame.$Properties
         * @deprecated Use fh.ClientFrame.$Properties instead.
         */

        /**
         * Narrowed shape of a ClientFrame.
         * @typedef {{
         *   hello?: fh.ClientHello.$Shape|null;
         *   upload?: fh.EnvelopeUpload.$Shape|null;
         *   ack?: fh.EnvelopeAck.$Shape|null;
         *   ping?: fh.Ping.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ kind?: undefined; hello?: null; upload?: null; ack?: null; ping?: null }|{ kind?: "hello"; hello: fh.ClientHello.$Shape; upload?: null; ack?: null; ping?: null }|{ kind?: "upload"; hello?: null; upload: fh.EnvelopeUpload.$Shape; ack?: null; ping?: null }|{ kind?: "ack"; hello?: null; upload?: null; ack: fh.EnvelopeAck.$Shape; ping?: null }|{ kind?: "ping"; hello?: null; upload?: null; ack?: null; ping: fh.Ping.$Shape })
         * )} fh.ClientFrame.$Shape
         */

        /**
         * Constructs a new ClientFrame.
         * @memberof fh
         * @classdesc Represents a ClientFrame.
         * @constructor
         * @param {fh.ClientFrame.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ClientFrame = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ClientFrame hello.
         * @member {fh.ClientHello.$Properties|null|undefined} hello
         * @memberof fh.ClientFrame
         * @instance
         */
        ClientFrame.prototype.hello = null;

        /**
         * ClientFrame upload.
         * @member {fh.EnvelopeUpload.$Properties|null|undefined} upload
         * @memberof fh.ClientFrame
         * @instance
         */
        ClientFrame.prototype.upload = null;

        /**
         * ClientFrame ack.
         * @member {fh.EnvelopeAck.$Properties|null|undefined} ack
         * @memberof fh.ClientFrame
         * @instance
         */
        ClientFrame.prototype.ack = null;

        /**
         * ClientFrame ping.
         * @member {fh.Ping.$Properties|null|undefined} ping
         * @memberof fh.ClientFrame
         * @instance
         */
        ClientFrame.prototype.ping = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ClientFrame kind.
         * @member {"hello"|"upload"|"ack"|"ping"|undefined} kind
         * @memberof fh.ClientFrame
         * @instance
         */
        $Object.defineProperty(ClientFrame.prototype, "kind", {
            get: $util.oneOfGetter($oneOfFields = ["hello", "upload", "ack", "ping"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ClientFrame instance using the specified properties.
         * @function create
         * @memberof fh.ClientFrame
         * @static
         * @param {fh.ClientFrame.$Properties=} [properties] Properties to set
         * @returns {fh.ClientFrame} ClientFrame instance
         * @type {{
         *   (properties: fh.ClientFrame.$Shape): fh.ClientFrame & fh.ClientFrame.$Shape;
         *   (properties?: fh.ClientFrame.$Properties): fh.ClientFrame;
         * }}
         */
        ClientFrame.create = function(properties) {
            return new ClientFrame(properties);
        };

        /**
         * Encodes the specified ClientFrame message. Does not implicitly {@link fh.ClientFrame.verify|verify} messages.
         * @function encode
         * @memberof fh.ClientFrame
         * @static
         * @param {fh.ClientFrame.$Properties} message ClientFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientFrame.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.hello != null && $Object.hasOwnProperty.call(message, "hello"))
                $root.fh.ClientHello.encode(message.hello, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.upload != null && $Object.hasOwnProperty.call(message, "upload"))
                $root.fh.EnvelopeUpload.encode(message.upload, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.ack != null && $Object.hasOwnProperty.call(message, "ack"))
                $root.fh.EnvelopeAck.encode(message.ack, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping"))
                $root.fh.Ping.encode(message.ping, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ClientFrame message, length delimited. Does not implicitly {@link fh.ClientFrame.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.ClientFrame
         * @static
         * @param {fh.ClientFrame.$Properties} message ClientFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientFrame.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ClientFrame message from the specified reader or buffer.
         * @function decode
         * @memberof fh.ClientFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.ClientFrame & fh.ClientFrame.$Shape} ClientFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientFrame.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.ClientFrame();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.hello = $root.fh.ClientHello.decode(reader, reader.uint32(), $undefined, _depth + 1, message.hello);
                        message.kind = "hello";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.upload = $root.fh.EnvelopeUpload.decode(reader, reader.uint32(), $undefined, _depth + 1, message.upload);
                        message.kind = "upload";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.ack = $root.fh.EnvelopeAck.decode(reader, reader.uint32(), $undefined, _depth + 1, message.ack);
                        message.kind = "ack";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.ping = $root.fh.Ping.decode(reader, reader.uint32(), $undefined, _depth + 1, message.ping);
                        message.kind = "ping";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ClientFrame message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.ClientFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.ClientFrame & fh.ClientFrame.$Shape} ClientFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientFrame.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ClientFrame message.
         * @function verify
         * @memberof fh.ClientFrame
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ClientFrame.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.hello != null && $Object.hasOwnProperty.call(message, "hello")) {
                properties.kind = 1;
                {
                    let error = $root.fh.ClientHello.verify(message.hello, _depth + 1);
                    if (error)
                        return "hello." + error;
                }
            }
            if (message.upload != null && $Object.hasOwnProperty.call(message, "upload")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.EnvelopeUpload.verify(message.upload, _depth + 1);
                    if (error)
                        return "upload." + error;
                }
            }
            if (message.ack != null && $Object.hasOwnProperty.call(message, "ack")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.EnvelopeAck.verify(message.ack, _depth + 1);
                    if (error)
                        return "ack." + error;
                }
            }
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.Ping.verify(message.ping, _depth + 1);
                    if (error)
                        return "ping." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ClientFrame message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.ClientFrame
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.ClientFrame} ClientFrame
         */
        ClientFrame.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.ClientFrame)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.ClientFrame: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.ClientFrame();
            if (object.hello != null) {
                if (!$util.isObject(object.hello))
                    throw $TypeError(".fh.ClientFrame.hello: object expected");
                message.hello = $root.fh.ClientHello.fromObject(object.hello, _depth + 1);
            }
            if (object.upload != null) {
                if (!$util.isObject(object.upload))
                    throw $TypeError(".fh.ClientFrame.upload: object expected");
                message.upload = $root.fh.EnvelopeUpload.fromObject(object.upload, _depth + 1);
            }
            if (object.ack != null) {
                if (!$util.isObject(object.ack))
                    throw $TypeError(".fh.ClientFrame.ack: object expected");
                message.ack = $root.fh.EnvelopeAck.fromObject(object.ack, _depth + 1);
            }
            if (object.ping != null) {
                if (!$util.isObject(object.ping))
                    throw $TypeError(".fh.ClientFrame.ping: object expected");
                message.ping = $root.fh.Ping.fromObject(object.ping, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a ClientFrame message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.ClientFrame
         * @static
         * @param {fh.ClientFrame} message ClientFrame
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ClientFrame.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.hello != null && $Object.hasOwnProperty.call(message, "hello")) {
                object.hello = $root.fh.ClientHello.toObject(message.hello, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "hello";
            }
            if (message.upload != null && $Object.hasOwnProperty.call(message, "upload")) {
                object.upload = $root.fh.EnvelopeUpload.toObject(message.upload, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "upload";
            }
            if (message.ack != null && $Object.hasOwnProperty.call(message, "ack")) {
                object.ack = $root.fh.EnvelopeAck.toObject(message.ack, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "ack";
            }
            if (message.ping != null && $Object.hasOwnProperty.call(message, "ping")) {
                object.ping = $root.fh.Ping.toObject(message.ping, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "ping";
            }
            return object;
        };

        /**
         * Converts this ClientFrame to JSON.
         * @function toJSON
         * @memberof fh.ClientFrame
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ClientFrame.prototype.toJSON = function() {
            return ClientFrame.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ClientFrame
         * @function getTypeUrl
         * @memberof fh.ClientFrame
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ClientFrame.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.ClientFrame";
        };

        return ClientFrame;
    })();

    fh.ClientHello = (function() {

        /**
         * Properties of a ClientHello.
         * @typedef {Object} fh.ClientHello.$Properties
         * @property {string|null} [sessionToken] ClientHello sessionToken
         * @property {number|null} [deviceNumber] ClientHello deviceNumber
         * @property {number|null} [protocolMajor] ClientHello protocolMajor
         * @property {number|null} [protocolMinor] ClientHello protocolMinor
         * @property {number|null} [protocolPatch] ClientHello protocolPatch
         * @property {string|null} [clientName] ClientHello clientName
         * @property {string|null} [clientVersion] ClientHello clientVersion
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ClientHello.
         * @memberof fh
         * @interface IClientHello
         * @augments fh.ClientHello.$Properties
         * @deprecated Use fh.ClientHello.$Properties instead.
         */

        /**
         * Shape of a ClientHello.
         * @typedef {fh.ClientHello.$Properties} fh.ClientHello.$Shape
         */

        /**
         * Constructs a new ClientHello.
         * @memberof fh
         * @classdesc Represents a ClientHello.
         * @constructor
         * @param {fh.ClientHello.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ClientHello = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ClientHello sessionToken.
         * @member {string} sessionToken
         * @memberof fh.ClientHello
         * @instance
         */
        ClientHello.prototype.sessionToken = "";

        /**
         * ClientHello deviceNumber.
         * @member {number} deviceNumber
         * @memberof fh.ClientHello
         * @instance
         */
        ClientHello.prototype.deviceNumber = 0;

        /**
         * ClientHello protocolMajor.
         * @member {number} protocolMajor
         * @memberof fh.ClientHello
         * @instance
         */
        ClientHello.prototype.protocolMajor = 0;

        /**
         * ClientHello protocolMinor.
         * @member {number} protocolMinor
         * @memberof fh.ClientHello
         * @instance
         */
        ClientHello.prototype.protocolMinor = 0;

        /**
         * ClientHello protocolPatch.
         * @member {number} protocolPatch
         * @memberof fh.ClientHello
         * @instance
         */
        ClientHello.prototype.protocolPatch = 0;

        /**
         * ClientHello clientName.
         * @member {string} clientName
         * @memberof fh.ClientHello
         * @instance
         */
        ClientHello.prototype.clientName = "";

        /**
         * ClientHello clientVersion.
         * @member {string} clientVersion
         * @memberof fh.ClientHello
         * @instance
         */
        ClientHello.prototype.clientVersion = "";

        /**
         * Creates a new ClientHello instance using the specified properties.
         * @function create
         * @memberof fh.ClientHello
         * @static
         * @param {fh.ClientHello.$Properties=} [properties] Properties to set
         * @returns {fh.ClientHello} ClientHello instance
         * @type {{
         *   (properties: fh.ClientHello.$Shape): fh.ClientHello & fh.ClientHello.$Shape;
         *   (properties?: fh.ClientHello.$Properties): fh.ClientHello;
         * }}
         */
        ClientHello.create = function(properties) {
            return new ClientHello(properties);
        };

        /**
         * Encodes the specified ClientHello message. Does not implicitly {@link fh.ClientHello.verify|verify} messages.
         * @function encode
         * @memberof fh.ClientHello
         * @static
         * @param {fh.ClientHello.$Properties} message ClientHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientHello.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.sessionToken != null && $Object.hasOwnProperty.call(message, "sessionToken") && message.sessionToken !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionToken);
            if (message.deviceNumber != null && $Object.hasOwnProperty.call(message, "deviceNumber") && message.deviceNumber !== 0)
                writer.uint32(/* id 2, wireType 0 =*/16).uint32(message.deviceNumber);
            if (message.protocolMajor != null && $Object.hasOwnProperty.call(message, "protocolMajor") && message.protocolMajor !== 0)
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.protocolMajor);
            if (message.protocolMinor != null && $Object.hasOwnProperty.call(message, "protocolMinor") && message.protocolMinor !== 0)
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.protocolMinor);
            if (message.protocolPatch != null && $Object.hasOwnProperty.call(message, "protocolPatch") && message.protocolPatch !== 0)
                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.protocolPatch);
            if (message.clientName != null && $Object.hasOwnProperty.call(message, "clientName") && message.clientName !== "")
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.clientName);
            if (message.clientVersion != null && $Object.hasOwnProperty.call(message, "clientVersion") && message.clientVersion !== "")
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.clientVersion);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ClientHello message, length delimited. Does not implicitly {@link fh.ClientHello.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.ClientHello
         * @static
         * @param {fh.ClientHello.$Properties} message ClientHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ClientHello.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ClientHello message from the specified reader or buffer.
         * @function decode
         * @memberof fh.ClientHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.ClientHello & fh.ClientHello.$Shape} ClientHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientHello.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.ClientHello();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.sessionToken = value;
                        else
                            delete message.sessionToken;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.deviceNumber = value;
                        else
                            delete message.deviceNumber;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.protocolMajor = value;
                        else
                            delete message.protocolMajor;
                        continue;
                    }
                case 4: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.protocolMinor = value;
                        else
                            delete message.protocolMinor;
                        continue;
                    }
                case 5: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.protocolPatch = value;
                        else
                            delete message.protocolPatch;
                        continue;
                    }
                case 6: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.clientName = value;
                        else
                            delete message.clientName;
                        continue;
                    }
                case 7: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.clientVersion = value;
                        else
                            delete message.clientVersion;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ClientHello message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.ClientHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.ClientHello & fh.ClientHello.$Shape} ClientHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ClientHello.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ClientHello message.
         * @function verify
         * @memberof fh.ClientHello
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ClientHello.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.sessionToken != null && $Object.hasOwnProperty.call(message, "sessionToken"))
                if (!$util.isString(message.sessionToken))
                    return "sessionToken: string expected";
            if (message.deviceNumber != null && $Object.hasOwnProperty.call(message, "deviceNumber"))
                if (!$util.isInteger(message.deviceNumber))
                    return "deviceNumber: integer expected";
            if (message.protocolMajor != null && $Object.hasOwnProperty.call(message, "protocolMajor"))
                if (!$util.isInteger(message.protocolMajor))
                    return "protocolMajor: integer expected";
            if (message.protocolMinor != null && $Object.hasOwnProperty.call(message, "protocolMinor"))
                if (!$util.isInteger(message.protocolMinor))
                    return "protocolMinor: integer expected";
            if (message.protocolPatch != null && $Object.hasOwnProperty.call(message, "protocolPatch"))
                if (!$util.isInteger(message.protocolPatch))
                    return "protocolPatch: integer expected";
            if (message.clientName != null && $Object.hasOwnProperty.call(message, "clientName"))
                if (!$util.isString(message.clientName))
                    return "clientName: string expected";
            if (message.clientVersion != null && $Object.hasOwnProperty.call(message, "clientVersion"))
                if (!$util.isString(message.clientVersion))
                    return "clientVersion: string expected";
            return null;
        };

        /**
         * Creates a ClientHello message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.ClientHello
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.ClientHello} ClientHello
         */
        ClientHello.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.ClientHello)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.ClientHello: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.ClientHello();
            if (object.sessionToken != null)
                if (typeof object.sessionToken !== "string" || object.sessionToken.length)
                    message.sessionToken = $String(object.sessionToken);
            if (object.deviceNumber != null)
                if ($Number(object.deviceNumber) !== 0)
                    message.deviceNumber = object.deviceNumber >>> 0;
            if (object.protocolMajor != null)
                if ($Number(object.protocolMajor) !== 0)
                    message.protocolMajor = object.protocolMajor >>> 0;
            if (object.protocolMinor != null)
                if ($Number(object.protocolMinor) !== 0)
                    message.protocolMinor = object.protocolMinor >>> 0;
            if (object.protocolPatch != null)
                if ($Number(object.protocolPatch) !== 0)
                    message.protocolPatch = object.protocolPatch >>> 0;
            if (object.clientName != null)
                if (typeof object.clientName !== "string" || object.clientName.length)
                    message.clientName = $String(object.clientName);
            if (object.clientVersion != null)
                if (typeof object.clientVersion !== "string" || object.clientVersion.length)
                    message.clientVersion = $String(object.clientVersion);
            return message;
        };

        /**
         * Creates a plain object from a ClientHello message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.ClientHello
         * @static
         * @param {fh.ClientHello} message ClientHello
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ClientHello.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.sessionToken = "";
                object.deviceNumber = 0;
                object.protocolMajor = 0;
                object.protocolMinor = 0;
                object.protocolPatch = 0;
                object.clientName = "";
                object.clientVersion = "";
            }
            if (message.sessionToken != null && $Object.hasOwnProperty.call(message, "sessionToken"))
                object.sessionToken = message.sessionToken;
            if (message.deviceNumber != null && $Object.hasOwnProperty.call(message, "deviceNumber"))
                object.deviceNumber = message.deviceNumber;
            if (message.protocolMajor != null && $Object.hasOwnProperty.call(message, "protocolMajor"))
                object.protocolMajor = message.protocolMajor;
            if (message.protocolMinor != null && $Object.hasOwnProperty.call(message, "protocolMinor"))
                object.protocolMinor = message.protocolMinor;
            if (message.protocolPatch != null && $Object.hasOwnProperty.call(message, "protocolPatch"))
                object.protocolPatch = message.protocolPatch;
            if (message.clientName != null && $Object.hasOwnProperty.call(message, "clientName"))
                object.clientName = message.clientName;
            if (message.clientVersion != null && $Object.hasOwnProperty.call(message, "clientVersion"))
                object.clientVersion = message.clientVersion;
            return object;
        };

        /**
         * Converts this ClientHello to JSON.
         * @function toJSON
         * @memberof fh.ClientHello
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ClientHello.prototype.toJSON = function() {
            return ClientHello.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ClientHello
         * @function getTypeUrl
         * @memberof fh.ClientHello
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ClientHello.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.ClientHello";
        };

        return ClientHello;
    })();

    fh.EnvelopeUpload = (function() {

        /**
         * Properties of an EnvelopeUpload.
         * @typedef {Object} fh.EnvelopeUpload.$Properties
         * @property {Array.<fh.Envelope.$Properties>|null} [envelopes] EnvelopeUpload envelopes
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an EnvelopeUpload.
         * @memberof fh
         * @interface IEnvelopeUpload
         * @augments fh.EnvelopeUpload.$Properties
         * @deprecated Use fh.EnvelopeUpload.$Properties instead.
         */

        /**
         * Shape of an EnvelopeUpload.
         * @typedef {fh.EnvelopeUpload.$Properties} fh.EnvelopeUpload.$Shape
         */

        /**
         * Constructs a new EnvelopeUpload.
         * @memberof fh
         * @classdesc Represents an EnvelopeUpload.
         * @constructor
         * @param {fh.EnvelopeUpload.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const EnvelopeUpload = function (properties) {
            this.envelopes = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * EnvelopeUpload envelopes.
         * @member {Array.<fh.Envelope.$Properties>} envelopes
         * @memberof fh.EnvelopeUpload
         * @instance
         */
        EnvelopeUpload.prototype.envelopes = $util.emptyArray;

        /**
         * Creates a new EnvelopeUpload instance using the specified properties.
         * @function create
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {fh.EnvelopeUpload.$Properties=} [properties] Properties to set
         * @returns {fh.EnvelopeUpload} EnvelopeUpload instance
         * @type {{
         *   (properties: fh.EnvelopeUpload.$Shape): fh.EnvelopeUpload & fh.EnvelopeUpload.$Shape;
         *   (properties?: fh.EnvelopeUpload.$Properties): fh.EnvelopeUpload;
         * }}
         */
        EnvelopeUpload.create = function(properties) {
            return new EnvelopeUpload(properties);
        };

        /**
         * Encodes the specified EnvelopeUpload message. Does not implicitly {@link fh.EnvelopeUpload.verify|verify} messages.
         * @function encode
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {fh.EnvelopeUpload.$Properties} message EnvelopeUpload message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EnvelopeUpload.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.envelopes != null && message.envelopes.length)
                for (let i = 0; i < message.envelopes.length; ++i)
                    $root.fh.Envelope.encode(message.envelopes[i], writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified EnvelopeUpload message, length delimited. Does not implicitly {@link fh.EnvelopeUpload.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {fh.EnvelopeUpload.$Properties} message EnvelopeUpload message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EnvelopeUpload.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes an EnvelopeUpload message from the specified reader or buffer.
         * @function decode
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.EnvelopeUpload & fh.EnvelopeUpload.$Shape} EnvelopeUpload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EnvelopeUpload.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.EnvelopeUpload();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if (!(message.envelopes && message.envelopes.length))
                            message.envelopes = [];
                        message.envelopes.push($root.fh.Envelope.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an EnvelopeUpload message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.EnvelopeUpload & fh.EnvelopeUpload.$Shape} EnvelopeUpload
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EnvelopeUpload.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an EnvelopeUpload message.
         * @function verify
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        EnvelopeUpload.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.envelopes != null && $Object.hasOwnProperty.call(message, "envelopes")) {
                if (!$Array.isArray(message.envelopes))
                    return "envelopes: array expected";
                for (let i = 0; i < message.envelopes.length; ++i) {
                    let error = $root.fh.Envelope.verify(message.envelopes[i], _depth + 1);
                    if (error)
                        return "envelopes." + error;
                }
            }
            return null;
        };

        /**
         * Creates an EnvelopeUpload message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.EnvelopeUpload} EnvelopeUpload
         */
        EnvelopeUpload.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.EnvelopeUpload)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.EnvelopeUpload: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.EnvelopeUpload();
            if (object.envelopes) {
                if (!$Array.isArray(object.envelopes))
                    throw $TypeError(".fh.EnvelopeUpload.envelopes: array expected");
                message.envelopes = $Array(object.envelopes.length);
                for (let i = 0; i < object.envelopes.length; ++i) {
                    if (!$util.isObject(object.envelopes[i]))
                        throw $TypeError(".fh.EnvelopeUpload.envelopes: object expected");
                    message.envelopes[i] = $root.fh.Envelope.fromObject(object.envelopes[i], _depth + 1);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from an EnvelopeUpload message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {fh.EnvelopeUpload} message EnvelopeUpload
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EnvelopeUpload.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.envelopes = [];
            if (message.envelopes && message.envelopes.length) {
                object.envelopes = $Array(message.envelopes.length);
                for (let j = 0; j < message.envelopes.length; ++j)
                    object.envelopes[j] = $root.fh.Envelope.toObject(message.envelopes[j], options, _depth + 1);
            }
            return object;
        };

        /**
         * Converts this EnvelopeUpload to JSON.
         * @function toJSON
         * @memberof fh.EnvelopeUpload
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EnvelopeUpload.prototype.toJSON = function() {
            return EnvelopeUpload.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for EnvelopeUpload
         * @function getTypeUrl
         * @memberof fh.EnvelopeUpload
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        EnvelopeUpload.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.EnvelopeUpload";
        };

        return EnvelopeUpload;
    })();

    fh.EnvelopeAck = (function() {

        /**
         * Properties of an EnvelopeAck.
         * @typedef {Object} fh.EnvelopeAck.$Properties
         * @property {Array.<Uint8Array>|null} [envelopeIds] EnvelopeAck envelopeIds
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an EnvelopeAck.
         * @memberof fh
         * @interface IEnvelopeAck
         * @augments fh.EnvelopeAck.$Properties
         * @deprecated Use fh.EnvelopeAck.$Properties instead.
         */

        /**
         * Shape of an EnvelopeAck.
         * @typedef {fh.EnvelopeAck.$Properties} fh.EnvelopeAck.$Shape
         */

        /**
         * Constructs a new EnvelopeAck.
         * @memberof fh
         * @classdesc Represents an EnvelopeAck.
         * @constructor
         * @param {fh.EnvelopeAck.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const EnvelopeAck = function (properties) {
            this.envelopeIds = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * EnvelopeAck envelopeIds.
         * @member {Array.<Uint8Array>} envelopeIds
         * @memberof fh.EnvelopeAck
         * @instance
         */
        EnvelopeAck.prototype.envelopeIds = $util.emptyArray;

        /**
         * Creates a new EnvelopeAck instance using the specified properties.
         * @function create
         * @memberof fh.EnvelopeAck
         * @static
         * @param {fh.EnvelopeAck.$Properties=} [properties] Properties to set
         * @returns {fh.EnvelopeAck} EnvelopeAck instance
         * @type {{
         *   (properties: fh.EnvelopeAck.$Shape): fh.EnvelopeAck & fh.EnvelopeAck.$Shape;
         *   (properties?: fh.EnvelopeAck.$Properties): fh.EnvelopeAck;
         * }}
         */
        EnvelopeAck.create = function(properties) {
            return new EnvelopeAck(properties);
        };

        /**
         * Encodes the specified EnvelopeAck message. Does not implicitly {@link fh.EnvelopeAck.verify|verify} messages.
         * @function encode
         * @memberof fh.EnvelopeAck
         * @static
         * @param {fh.EnvelopeAck.$Properties} message EnvelopeAck message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EnvelopeAck.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.envelopeIds != null && message.envelopeIds.length)
                for (let i = 0; i < message.envelopeIds.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.envelopeIds[i]);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified EnvelopeAck message, length delimited. Does not implicitly {@link fh.EnvelopeAck.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.EnvelopeAck
         * @static
         * @param {fh.EnvelopeAck.$Properties} message EnvelopeAck message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EnvelopeAck.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes an EnvelopeAck message from the specified reader or buffer.
         * @function decode
         * @memberof fh.EnvelopeAck
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.EnvelopeAck & fh.EnvelopeAck.$Shape} EnvelopeAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EnvelopeAck.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.EnvelopeAck();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if (!(message.envelopeIds && message.envelopeIds.length))
                            message.envelopeIds = [];
                        message.envelopeIds.push(reader.bytes());
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an EnvelopeAck message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.EnvelopeAck
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.EnvelopeAck & fh.EnvelopeAck.$Shape} EnvelopeAck
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EnvelopeAck.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an EnvelopeAck message.
         * @function verify
         * @memberof fh.EnvelopeAck
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        EnvelopeAck.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.envelopeIds != null && $Object.hasOwnProperty.call(message, "envelopeIds")) {
                if (!$Array.isArray(message.envelopeIds))
                    return "envelopeIds: array expected";
                for (let i = 0; i < message.envelopeIds.length; ++i)
                    if (!(message.envelopeIds[i] && typeof message.envelopeIds[i].length === "number" || $util.isString(message.envelopeIds[i])))
                        return "envelopeIds: buffer[] expected";
            }
            return null;
        };

        /**
         * Creates an EnvelopeAck message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.EnvelopeAck
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.EnvelopeAck} EnvelopeAck
         */
        EnvelopeAck.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.EnvelopeAck)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.EnvelopeAck: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.EnvelopeAck();
            if (object.envelopeIds) {
                if (!$Array.isArray(object.envelopeIds))
                    throw $TypeError(".fh.EnvelopeAck.envelopeIds: array expected");
                message.envelopeIds = $Array(object.envelopeIds.length);
                for (let i = 0; i < object.envelopeIds.length; ++i)
                    if (typeof object.envelopeIds[i] === "string")
                        $util.base64.decode(object.envelopeIds[i], message.envelopeIds[i] = $util.newBuffer($util.base64.length(object.envelopeIds[i])), 0);
                    else if (object.envelopeIds[i].length >= 0)
                        message.envelopeIds[i] = object.envelopeIds[i];
            }
            return message;
        };

        /**
         * Creates a plain object from an EnvelopeAck message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.EnvelopeAck
         * @static
         * @param {fh.EnvelopeAck} message EnvelopeAck
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EnvelopeAck.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.envelopeIds = [];
            if (message.envelopeIds && message.envelopeIds.length) {
                object.envelopeIds = $Array(message.envelopeIds.length);
                for (let j = 0; j < message.envelopeIds.length; ++j)
                    object.envelopeIds[j] = options.bytes === $String ? $util.base64.encode(message.envelopeIds[j], 0, message.envelopeIds[j].length) : options.bytes === $Array ? $Array.prototype.slice.call(message.envelopeIds[j]) : message.envelopeIds[j];
            }
            return object;
        };

        /**
         * Converts this EnvelopeAck to JSON.
         * @function toJSON
         * @memberof fh.EnvelopeAck
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EnvelopeAck.prototype.toJSON = function() {
            return EnvelopeAck.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for EnvelopeAck
         * @function getTypeUrl
         * @memberof fh.EnvelopeAck
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        EnvelopeAck.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.EnvelopeAck";
        };

        return EnvelopeAck;
    })();

    fh.Ping = (function() {

        /**
         * Properties of a Ping.
         * @typedef {Object} fh.Ping.$Properties
         * @property {number|Long|null} [clientTimestamp] Ping clientTimestamp
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Ping.
         * @memberof fh
         * @interface IPing
         * @augments fh.Ping.$Properties
         * @deprecated Use fh.Ping.$Properties instead.
         */

        /**
         * Shape of a Ping.
         * @typedef {fh.Ping.$Properties} fh.Ping.$Shape
         */

        /**
         * Constructs a new Ping.
         * @memberof fh
         * @classdesc Represents a Ping.
         * @constructor
         * @param {fh.Ping.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Ping = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Ping clientTimestamp.
         * @member {number|Long} clientTimestamp
         * @memberof fh.Ping
         * @instance
         */
        Ping.prototype.clientTimestamp = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Creates a new Ping instance using the specified properties.
         * @function create
         * @memberof fh.Ping
         * @static
         * @param {fh.Ping.$Properties=} [properties] Properties to set
         * @returns {fh.Ping} Ping instance
         * @type {{
         *   (properties: fh.Ping.$Shape): fh.Ping & fh.Ping.$Shape;
         *   (properties?: fh.Ping.$Properties): fh.Ping;
         * }}
         */
        Ping.create = function(properties) {
            return new Ping(properties);
        };

        /**
         * Encodes the specified Ping message. Does not implicitly {@link fh.Ping.verify|verify} messages.
         * @function encode
         * @memberof fh.Ping
         * @static
         * @param {fh.Ping.$Properties} message Ping message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Ping.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp") && (typeof message.clientTimestamp === "object" ? message.clientTimestamp.low || message.clientTimestamp.high : message.clientTimestamp !== 0))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.clientTimestamp);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Ping message, length delimited. Does not implicitly {@link fh.Ping.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.Ping
         * @static
         * @param {fh.Ping.$Properties} message Ping message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Ping.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a Ping message from the specified reader or buffer.
         * @function decode
         * @memberof fh.Ping
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.Ping & fh.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Ping.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.Ping();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.uint64()) === "object" ? value.low || value.high : value !== 0)
                            message.clientTimestamp = value;
                        else
                            delete message.clientTimestamp;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Ping message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.Ping
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.Ping & fh.Ping.$Shape} Ping
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Ping.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Ping message.
         * @function verify
         * @memberof fh.Ping
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Ping.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp"))
                if (!$util.isInteger(message.clientTimestamp) && !(message.clientTimestamp && $util.isInteger(message.clientTimestamp.low) && $util.isInteger(message.clientTimestamp.high)))
                    return "clientTimestamp: integer|Long expected";
            return null;
        };

        /**
         * Creates a Ping message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.Ping
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.Ping} Ping
         */
        Ping.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.Ping)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.Ping: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.Ping();
            if (object.clientTimestamp != null)
                if (typeof object.clientTimestamp === "object" ? object.clientTimestamp.low || object.clientTimestamp.high : $Number(object.clientTimestamp) !== 0)
                    if ($util.Long)
                        message.clientTimestamp = $util.Long.fromValue(object.clientTimestamp, true);
                    else if (typeof object.clientTimestamp === "string")
                        message.clientTimestamp = $parseInt(object.clientTimestamp, 10);
                    else if (typeof object.clientTimestamp === "number")
                        message.clientTimestamp = object.clientTimestamp;
                    else if (typeof object.clientTimestamp === "object")
                        message.clientTimestamp = new $util.LongBits(object.clientTimestamp.low >>> 0, object.clientTimestamp.high >>> 0).toNumber(true);
            return message;
        };

        /**
         * Creates a plain object from a Ping message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.Ping
         * @static
         * @param {fh.Ping} message Ping
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Ping.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults)
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.clientTimestamp = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.clientTimestamp = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.clientTimestamp = typeof message.clientTimestamp === "number" ? $BigInt(message.clientTimestamp) : $util.Long.fromBits(message.clientTimestamp.low >>> 0, message.clientTimestamp.high >>> 0, true).toBigInt();
                else if (typeof message.clientTimestamp === "number")
                    object.clientTimestamp = options.longs === $String ? $String(message.clientTimestamp) : message.clientTimestamp;
                else
                    object.clientTimestamp = options.longs === $String ? $util.Long.prototype.toString.call(message.clientTimestamp) : options.longs === $Number ? new $util.LongBits(message.clientTimestamp.low >>> 0, message.clientTimestamp.high >>> 0).toNumber(true) : message.clientTimestamp;
            return object;
        };

        /**
         * Converts this Ping to JSON.
         * @function toJSON
         * @memberof fh.Ping
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Ping.prototype.toJSON = function() {
            return Ping.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Ping
         * @function getTypeUrl
         * @memberof fh.Ping
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Ping.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.Ping";
        };

        return Ping;
    })();

    fh.ServerFrame = (function() {

        /**
         * Properties of a ServerFrame.
         * @typedef {Object} fh.ServerFrame.$Properties
         * @property {fh.ServerHello.$Properties|null} [hello] ServerFrame hello
         * @property {fh.EnvelopeDelivery.$Properties|null} [delivery] ServerFrame delivery
         * @property {fh.EnvelopeAck.$Properties|null} [receipt] ServerFrame receipt
         * @property {fh.Pong.$Properties|null} [pong] ServerFrame pong
         * @property {fh.ErrorFrame.$Properties|null} [error] ServerFrame error
         * @property {fh.PresenceUpdate.$Properties|null} [presence] ServerFrame presence
         * @property {fh.BotMessageDelivery.$Properties|null} [botMessage] ServerFrame botMessage
         * @property {fh.ChannelPostDelivery.$Properties|null} [channelPost] ServerFrame channelPost
         * @property {"hello"|"delivery"|"receipt"|"pong"|"error"|"presence"|"botMessage"|"channelPost"} [kind] ServerFrame kind
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ServerFrame.
         * @memberof fh
         * @interface IServerFrame
         * @augments fh.ServerFrame.$Properties
         * @deprecated Use fh.ServerFrame.$Properties instead.
         */

        /**
         * Narrowed shape of a ServerFrame.
         * @typedef {{
         *   hello?: fh.ServerHello.$Shape|null;
         *   delivery?: fh.EnvelopeDelivery.$Shape|null;
         *   receipt?: fh.EnvelopeAck.$Shape|null;
         *   pong?: fh.Pong.$Shape|null;
         *   error?: fh.ErrorFrame.$Shape|null;
         *   presence?: fh.PresenceUpdate.$Shape|null;
         *   botMessage?: fh.BotMessageDelivery.$Shape|null;
         *   channelPost?: fh.ChannelPostDelivery.$Shape|null;
         *   $unknowns?: Array.<Uint8Array>;
         * } & (
         *   ({ kind?: undefined; hello?: null; delivery?: null; receipt?: null; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "hello"; hello: fh.ServerHello.$Shape; delivery?: null; receipt?: null; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "delivery"; hello?: null; delivery: fh.EnvelopeDelivery.$Shape; receipt?: null; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "receipt"; hello?: null; delivery?: null; receipt: fh.EnvelopeAck.$Shape; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "pong"; hello?: null; delivery?: null; receipt?: null; pong: fh.Pong.$Shape; error?: null; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "error"; hello?: null; delivery?: null; receipt?: null; pong?: null; error: fh.ErrorFrame.$Shape; presence?: null; botMessage?: null; channelPost?: null }|{ kind?: "presence"; hello?: null; delivery?: null; receipt?: null; pong?: null; error?: null; presence: fh.PresenceUpdate.$Shape; botMessage?: null; channelPost?: null }|{ kind?: "botMessage"; hello?: null; delivery?: null; receipt?: null; pong?: null; error?: null; presence?: null; botMessage: fh.BotMessageDelivery.$Shape; channelPost?: null }|{ kind?: "channelPost"; hello?: null; delivery?: null; receipt?: null; pong?: null; error?: null; presence?: null; botMessage?: null; channelPost: fh.ChannelPostDelivery.$Shape })
         * )} fh.ServerFrame.$Shape
         */

        /**
         * Constructs a new ServerFrame.
         * @memberof fh
         * @classdesc Represents a ServerFrame.
         * @constructor
         * @param {fh.ServerFrame.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ServerFrame = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ServerFrame hello.
         * @member {fh.ServerHello.$Properties|null|undefined} hello
         * @memberof fh.ServerFrame
         * @instance
         */
        ServerFrame.prototype.hello = null;

        /**
         * ServerFrame delivery.
         * @member {fh.EnvelopeDelivery.$Properties|null|undefined} delivery
         * @memberof fh.ServerFrame
         * @instance
         */
        ServerFrame.prototype.delivery = null;

        /**
         * ServerFrame receipt.
         * @member {fh.EnvelopeAck.$Properties|null|undefined} receipt
         * @memberof fh.ServerFrame
         * @instance
         */
        ServerFrame.prototype.receipt = null;

        /**
         * ServerFrame pong.
         * @member {fh.Pong.$Properties|null|undefined} pong
         * @memberof fh.ServerFrame
         * @instance
         */
        ServerFrame.prototype.pong = null;

        /**
         * ServerFrame error.
         * @member {fh.ErrorFrame.$Properties|null|undefined} error
         * @memberof fh.ServerFrame
         * @instance
         */
        ServerFrame.prototype.error = null;

        /**
         * ServerFrame presence.
         * @member {fh.PresenceUpdate.$Properties|null|undefined} presence
         * @memberof fh.ServerFrame
         * @instance
         */
        ServerFrame.prototype.presence = null;

        /**
         * ServerFrame botMessage.
         * @member {fh.BotMessageDelivery.$Properties|null|undefined} botMessage
         * @memberof fh.ServerFrame
         * @instance
         */
        ServerFrame.prototype.botMessage = null;

        /**
         * ServerFrame channelPost.
         * @member {fh.ChannelPostDelivery.$Properties|null|undefined} channelPost
         * @memberof fh.ServerFrame
         * @instance
         */
        ServerFrame.prototype.channelPost = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        /**
         * ServerFrame kind.
         * @member {"hello"|"delivery"|"receipt"|"pong"|"error"|"presence"|"botMessage"|"channelPost"|undefined} kind
         * @memberof fh.ServerFrame
         * @instance
         */
        $Object.defineProperty(ServerFrame.prototype, "kind", {
            get: $util.oneOfGetter($oneOfFields = ["hello", "delivery", "receipt", "pong", "error", "presence", "botMessage", "channelPost"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ServerFrame instance using the specified properties.
         * @function create
         * @memberof fh.ServerFrame
         * @static
         * @param {fh.ServerFrame.$Properties=} [properties] Properties to set
         * @returns {fh.ServerFrame} ServerFrame instance
         * @type {{
         *   (properties: fh.ServerFrame.$Shape): fh.ServerFrame & fh.ServerFrame.$Shape;
         *   (properties?: fh.ServerFrame.$Properties): fh.ServerFrame;
         * }}
         */
        ServerFrame.create = function(properties) {
            return new ServerFrame(properties);
        };

        /**
         * Encodes the specified ServerFrame message. Does not implicitly {@link fh.ServerFrame.verify|verify} messages.
         * @function encode
         * @memberof fh.ServerFrame
         * @static
         * @param {fh.ServerFrame.$Properties} message ServerFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerFrame.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.hello != null && $Object.hasOwnProperty.call(message, "hello"))
                $root.fh.ServerHello.encode(message.hello, writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.delivery != null && $Object.hasOwnProperty.call(message, "delivery"))
                $root.fh.EnvelopeDelivery.encode(message.delivery, writer.uint32(/* id 2, wireType 2 =*/18).fork(), _depth + 1).ldelim();
            if (message.receipt != null && $Object.hasOwnProperty.call(message, "receipt"))
                $root.fh.EnvelopeAck.encode(message.receipt, writer.uint32(/* id 3, wireType 2 =*/26).fork(), _depth + 1).ldelim();
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong"))
                $root.fh.Pong.encode(message.pong, writer.uint32(/* id 4, wireType 2 =*/34).fork(), _depth + 1).ldelim();
            if (message.error != null && $Object.hasOwnProperty.call(message, "error"))
                $root.fh.ErrorFrame.encode(message.error, writer.uint32(/* id 5, wireType 2 =*/42).fork(), _depth + 1).ldelim();
            if (message.presence != null && $Object.hasOwnProperty.call(message, "presence"))
                $root.fh.PresenceUpdate.encode(message.presence, writer.uint32(/* id 6, wireType 2 =*/50).fork(), _depth + 1).ldelim();
            if (message.botMessage != null && $Object.hasOwnProperty.call(message, "botMessage"))
                $root.fh.BotMessageDelivery.encode(message.botMessage, writer.uint32(/* id 7, wireType 2 =*/58).fork(), _depth + 1).ldelim();
            if (message.channelPost != null && $Object.hasOwnProperty.call(message, "channelPost"))
                $root.fh.ChannelPostDelivery.encode(message.channelPost, writer.uint32(/* id 8, wireType 2 =*/66).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ServerFrame message, length delimited. Does not implicitly {@link fh.ServerFrame.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.ServerFrame
         * @static
         * @param {fh.ServerFrame.$Properties} message ServerFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerFrame.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ServerFrame message from the specified reader or buffer.
         * @function decode
         * @memberof fh.ServerFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.ServerFrame & fh.ServerFrame.$Shape} ServerFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerFrame.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.ServerFrame();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        message.hello = $root.fh.ServerHello.decode(reader, reader.uint32(), $undefined, _depth + 1, message.hello);
                        message.kind = "hello";
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        message.delivery = $root.fh.EnvelopeDelivery.decode(reader, reader.uint32(), $undefined, _depth + 1, message.delivery);
                        message.kind = "delivery";
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        message.receipt = $root.fh.EnvelopeAck.decode(reader, reader.uint32(), $undefined, _depth + 1, message.receipt);
                        message.kind = "receipt";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.pong = $root.fh.Pong.decode(reader, reader.uint32(), $undefined, _depth + 1, message.pong);
                        message.kind = "pong";
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.error = $root.fh.ErrorFrame.decode(reader, reader.uint32(), $undefined, _depth + 1, message.error);
                        message.kind = "error";
                        continue;
                    }
                case 6: {
                        if (wireType !== 2)
                            break;
                        message.presence = $root.fh.PresenceUpdate.decode(reader, reader.uint32(), $undefined, _depth + 1, message.presence);
                        message.kind = "presence";
                        continue;
                    }
                case 7: {
                        if (wireType !== 2)
                            break;
                        message.botMessage = $root.fh.BotMessageDelivery.decode(reader, reader.uint32(), $undefined, _depth + 1, message.botMessage);
                        message.kind = "botMessage";
                        continue;
                    }
                case 8: {
                        if (wireType !== 2)
                            break;
                        message.channelPost = $root.fh.ChannelPostDelivery.decode(reader, reader.uint32(), $undefined, _depth + 1, message.channelPost);
                        message.kind = "channelPost";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ServerFrame message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.ServerFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.ServerFrame & fh.ServerFrame.$Shape} ServerFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerFrame.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ServerFrame message.
         * @function verify
         * @memberof fh.ServerFrame
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ServerFrame.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.hello != null && $Object.hasOwnProperty.call(message, "hello")) {
                properties.kind = 1;
                {
                    let error = $root.fh.ServerHello.verify(message.hello, _depth + 1);
                    if (error)
                        return "hello." + error;
                }
            }
            if (message.delivery != null && $Object.hasOwnProperty.call(message, "delivery")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.EnvelopeDelivery.verify(message.delivery, _depth + 1);
                    if (error)
                        return "delivery." + error;
                }
            }
            if (message.receipt != null && $Object.hasOwnProperty.call(message, "receipt")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.EnvelopeAck.verify(message.receipt, _depth + 1);
                    if (error)
                        return "receipt." + error;
                }
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.Pong.verify(message.pong, _depth + 1);
                    if (error)
                        return "pong." + error;
                }
            }
            if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.ErrorFrame.verify(message.error, _depth + 1);
                    if (error)
                        return "error." + error;
                }
            }
            if (message.presence != null && $Object.hasOwnProperty.call(message, "presence")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.PresenceUpdate.verify(message.presence, _depth + 1);
                    if (error)
                        return "presence." + error;
                }
            }
            if (message.botMessage != null && $Object.hasOwnProperty.call(message, "botMessage")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.BotMessageDelivery.verify(message.botMessage, _depth + 1);
                    if (error)
                        return "botMessage." + error;
                }
            }
            if (message.channelPost != null && $Object.hasOwnProperty.call(message, "channelPost")) {
                if (properties.kind === 1)
                    return "kind: multiple values";
                properties.kind = 1;
                {
                    let error = $root.fh.ChannelPostDelivery.verify(message.channelPost, _depth + 1);
                    if (error)
                        return "channelPost." + error;
                }
            }
            return null;
        };

        /**
         * Creates a ServerFrame message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.ServerFrame
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.ServerFrame} ServerFrame
         */
        ServerFrame.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.ServerFrame)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.ServerFrame: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.ServerFrame();
            if (object.hello != null) {
                if (!$util.isObject(object.hello))
                    throw $TypeError(".fh.ServerFrame.hello: object expected");
                message.hello = $root.fh.ServerHello.fromObject(object.hello, _depth + 1);
            }
            if (object.delivery != null) {
                if (!$util.isObject(object.delivery))
                    throw $TypeError(".fh.ServerFrame.delivery: object expected");
                message.delivery = $root.fh.EnvelopeDelivery.fromObject(object.delivery, _depth + 1);
            }
            if (object.receipt != null) {
                if (!$util.isObject(object.receipt))
                    throw $TypeError(".fh.ServerFrame.receipt: object expected");
                message.receipt = $root.fh.EnvelopeAck.fromObject(object.receipt, _depth + 1);
            }
            if (object.pong != null) {
                if (!$util.isObject(object.pong))
                    throw $TypeError(".fh.ServerFrame.pong: object expected");
                message.pong = $root.fh.Pong.fromObject(object.pong, _depth + 1);
            }
            if (object.error != null) {
                if (!$util.isObject(object.error))
                    throw $TypeError(".fh.ServerFrame.error: object expected");
                message.error = $root.fh.ErrorFrame.fromObject(object.error, _depth + 1);
            }
            if (object.presence != null) {
                if (!$util.isObject(object.presence))
                    throw $TypeError(".fh.ServerFrame.presence: object expected");
                message.presence = $root.fh.PresenceUpdate.fromObject(object.presence, _depth + 1);
            }
            if (object.botMessage != null) {
                if (!$util.isObject(object.botMessage))
                    throw $TypeError(".fh.ServerFrame.botMessage: object expected");
                message.botMessage = $root.fh.BotMessageDelivery.fromObject(object.botMessage, _depth + 1);
            }
            if (object.channelPost != null) {
                if (!$util.isObject(object.channelPost))
                    throw $TypeError(".fh.ServerFrame.channelPost: object expected");
                message.channelPost = $root.fh.ChannelPostDelivery.fromObject(object.channelPost, _depth + 1);
            }
            return message;
        };

        /**
         * Creates a plain object from a ServerFrame message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.ServerFrame
         * @static
         * @param {fh.ServerFrame} message ServerFrame
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ServerFrame.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (message.hello != null && $Object.hasOwnProperty.call(message, "hello")) {
                object.hello = $root.fh.ServerHello.toObject(message.hello, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "hello";
            }
            if (message.delivery != null && $Object.hasOwnProperty.call(message, "delivery")) {
                object.delivery = $root.fh.EnvelopeDelivery.toObject(message.delivery, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "delivery";
            }
            if (message.receipt != null && $Object.hasOwnProperty.call(message, "receipt")) {
                object.receipt = $root.fh.EnvelopeAck.toObject(message.receipt, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "receipt";
            }
            if (message.pong != null && $Object.hasOwnProperty.call(message, "pong")) {
                object.pong = $root.fh.Pong.toObject(message.pong, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "pong";
            }
            if (message.error != null && $Object.hasOwnProperty.call(message, "error")) {
                object.error = $root.fh.ErrorFrame.toObject(message.error, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "error";
            }
            if (message.presence != null && $Object.hasOwnProperty.call(message, "presence")) {
                object.presence = $root.fh.PresenceUpdate.toObject(message.presence, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "presence";
            }
            if (message.botMessage != null && $Object.hasOwnProperty.call(message, "botMessage")) {
                object.botMessage = $root.fh.BotMessageDelivery.toObject(message.botMessage, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "botMessage";
            }
            if (message.channelPost != null && $Object.hasOwnProperty.call(message, "channelPost")) {
                object.channelPost = $root.fh.ChannelPostDelivery.toObject(message.channelPost, options, _depth + 1);
                if (options.oneofs)
                    object.kind = "channelPost";
            }
            return object;
        };

        /**
         * Converts this ServerFrame to JSON.
         * @function toJSON
         * @memberof fh.ServerFrame
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ServerFrame.prototype.toJSON = function() {
            return ServerFrame.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ServerFrame
         * @function getTypeUrl
         * @memberof fh.ServerFrame
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ServerFrame.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.ServerFrame";
        };

        return ServerFrame;
    })();

    fh.ServerHello = (function() {

        /**
         * Properties of a ServerHello.
         * @typedef {Object} fh.ServerHello.$Properties
         * @property {string|null} [sessionId] ServerHello sessionId
         * @property {Uint8Array|null} [accountId] ServerHello accountId
         * @property {number|null} [deviceNumber] ServerHello deviceNumber
         * @property {number|Long|null} [serverTimestamp] ServerHello serverTimestamp
         * @property {number|null} [protocolMajor] ServerHello protocolMajor
         * @property {number|null} [protocolMinor] ServerHello protocolMinor
         * @property {number|null} [protocolPatch] ServerHello protocolPatch
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ServerHello.
         * @memberof fh
         * @interface IServerHello
         * @augments fh.ServerHello.$Properties
         * @deprecated Use fh.ServerHello.$Properties instead.
         */

        /**
         * Shape of a ServerHello.
         * @typedef {fh.ServerHello.$Properties} fh.ServerHello.$Shape
         */

        /**
         * Constructs a new ServerHello.
         * @memberof fh
         * @classdesc Represents a ServerHello.
         * @constructor
         * @param {fh.ServerHello.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ServerHello = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ServerHello sessionId.
         * @member {string} sessionId
         * @memberof fh.ServerHello
         * @instance
         */
        ServerHello.prototype.sessionId = "";

        /**
         * ServerHello accountId.
         * @member {Uint8Array} accountId
         * @memberof fh.ServerHello
         * @instance
         */
        ServerHello.prototype.accountId = $util.newBuffer([]);

        /**
         * ServerHello deviceNumber.
         * @member {number} deviceNumber
         * @memberof fh.ServerHello
         * @instance
         */
        ServerHello.prototype.deviceNumber = 0;

        /**
         * ServerHello serverTimestamp.
         * @member {number|Long} serverTimestamp
         * @memberof fh.ServerHello
         * @instance
         */
        ServerHello.prototype.serverTimestamp = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * ServerHello protocolMajor.
         * @member {number} protocolMajor
         * @memberof fh.ServerHello
         * @instance
         */
        ServerHello.prototype.protocolMajor = 0;

        /**
         * ServerHello protocolMinor.
         * @member {number} protocolMinor
         * @memberof fh.ServerHello
         * @instance
         */
        ServerHello.prototype.protocolMinor = 0;

        /**
         * ServerHello protocolPatch.
         * @member {number} protocolPatch
         * @memberof fh.ServerHello
         * @instance
         */
        ServerHello.prototype.protocolPatch = 0;

        /**
         * Creates a new ServerHello instance using the specified properties.
         * @function create
         * @memberof fh.ServerHello
         * @static
         * @param {fh.ServerHello.$Properties=} [properties] Properties to set
         * @returns {fh.ServerHello} ServerHello instance
         * @type {{
         *   (properties: fh.ServerHello.$Shape): fh.ServerHello & fh.ServerHello.$Shape;
         *   (properties?: fh.ServerHello.$Properties): fh.ServerHello;
         * }}
         */
        ServerHello.create = function(properties) {
            return new ServerHello(properties);
        };

        /**
         * Encodes the specified ServerHello message. Does not implicitly {@link fh.ServerHello.verify|verify} messages.
         * @function encode
         * @memberof fh.ServerHello
         * @static
         * @param {fh.ServerHello.$Properties} message ServerHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerHello.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId") && message.sessionId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.sessionId);
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId") && message.accountId.length)
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.accountId);
            if (message.deviceNumber != null && $Object.hasOwnProperty.call(message, "deviceNumber") && message.deviceNumber !== 0)
                writer.uint32(/* id 3, wireType 0 =*/24).uint32(message.deviceNumber);
            if (message.serverTimestamp != null && $Object.hasOwnProperty.call(message, "serverTimestamp") && (typeof message.serverTimestamp === "object" ? message.serverTimestamp.low || message.serverTimestamp.high : message.serverTimestamp !== 0))
                writer.uint32(/* id 4, wireType 0 =*/32).uint64(message.serverTimestamp);
            if (message.protocolMajor != null && $Object.hasOwnProperty.call(message, "protocolMajor") && message.protocolMajor !== 0)
                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.protocolMajor);
            if (message.protocolMinor != null && $Object.hasOwnProperty.call(message, "protocolMinor") && message.protocolMinor !== 0)
                writer.uint32(/* id 6, wireType 0 =*/48).uint32(message.protocolMinor);
            if (message.protocolPatch != null && $Object.hasOwnProperty.call(message, "protocolPatch") && message.protocolPatch !== 0)
                writer.uint32(/* id 7, wireType 0 =*/56).uint32(message.protocolPatch);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ServerHello message, length delimited. Does not implicitly {@link fh.ServerHello.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.ServerHello
         * @static
         * @param {fh.ServerHello.$Properties} message ServerHello message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ServerHello.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ServerHello message from the specified reader or buffer.
         * @function decode
         * @memberof fh.ServerHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.ServerHello & fh.ServerHello.$Shape} ServerHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerHello.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.ServerHello();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.sessionId = value;
                        else
                            delete message.sessionId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.accountId = value;
                        else
                            delete message.accountId;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.deviceNumber = value;
                        else
                            delete message.deviceNumber;
                        continue;
                    }
                case 4: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.uint64()) === "object" ? value.low || value.high : value !== 0)
                            message.serverTimestamp = value;
                        else
                            delete message.serverTimestamp;
                        continue;
                    }
                case 5: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.protocolMajor = value;
                        else
                            delete message.protocolMajor;
                        continue;
                    }
                case 6: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.protocolMinor = value;
                        else
                            delete message.protocolMinor;
                        continue;
                    }
                case 7: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.uint32())
                            message.protocolPatch = value;
                        else
                            delete message.protocolPatch;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ServerHello message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.ServerHello
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.ServerHello & fh.ServerHello.$Shape} ServerHello
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ServerHello.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ServerHello message.
         * @function verify
         * @memberof fh.ServerHello
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ServerHello.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                if (!$util.isString(message.sessionId))
                    return "sessionId: string expected";
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId"))
                if (!(message.accountId && typeof message.accountId.length === "number" || $util.isString(message.accountId)))
                    return "accountId: buffer expected";
            if (message.deviceNumber != null && $Object.hasOwnProperty.call(message, "deviceNumber"))
                if (!$util.isInteger(message.deviceNumber))
                    return "deviceNumber: integer expected";
            if (message.serverTimestamp != null && $Object.hasOwnProperty.call(message, "serverTimestamp"))
                if (!$util.isInteger(message.serverTimestamp) && !(message.serverTimestamp && $util.isInteger(message.serverTimestamp.low) && $util.isInteger(message.serverTimestamp.high)))
                    return "serverTimestamp: integer|Long expected";
            if (message.protocolMajor != null && $Object.hasOwnProperty.call(message, "protocolMajor"))
                if (!$util.isInteger(message.protocolMajor))
                    return "protocolMajor: integer expected";
            if (message.protocolMinor != null && $Object.hasOwnProperty.call(message, "protocolMinor"))
                if (!$util.isInteger(message.protocolMinor))
                    return "protocolMinor: integer expected";
            if (message.protocolPatch != null && $Object.hasOwnProperty.call(message, "protocolPatch"))
                if (!$util.isInteger(message.protocolPatch))
                    return "protocolPatch: integer expected";
            return null;
        };

        /**
         * Creates a ServerHello message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.ServerHello
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.ServerHello} ServerHello
         */
        ServerHello.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.ServerHello)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.ServerHello: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.ServerHello();
            if (object.sessionId != null)
                if (typeof object.sessionId !== "string" || object.sessionId.length)
                    message.sessionId = $String(object.sessionId);
            if (object.accountId != null)
                if (object.accountId.length)
                    if (typeof object.accountId === "string")
                        $util.base64.decode(object.accountId, message.accountId = $util.newBuffer($util.base64.length(object.accountId)), 0);
                    else if (object.accountId.length >= 0)
                        message.accountId = object.accountId;
            if (object.deviceNumber != null)
                if ($Number(object.deviceNumber) !== 0)
                    message.deviceNumber = object.deviceNumber >>> 0;
            if (object.serverTimestamp != null)
                if (typeof object.serverTimestamp === "object" ? object.serverTimestamp.low || object.serverTimestamp.high : $Number(object.serverTimestamp) !== 0)
                    if ($util.Long)
                        message.serverTimestamp = $util.Long.fromValue(object.serverTimestamp, true);
                    else if (typeof object.serverTimestamp === "string")
                        message.serverTimestamp = $parseInt(object.serverTimestamp, 10);
                    else if (typeof object.serverTimestamp === "number")
                        message.serverTimestamp = object.serverTimestamp;
                    else if (typeof object.serverTimestamp === "object")
                        message.serverTimestamp = new $util.LongBits(object.serverTimestamp.low >>> 0, object.serverTimestamp.high >>> 0).toNumber(true);
            if (object.protocolMajor != null)
                if ($Number(object.protocolMajor) !== 0)
                    message.protocolMajor = object.protocolMajor >>> 0;
            if (object.protocolMinor != null)
                if ($Number(object.protocolMinor) !== 0)
                    message.protocolMinor = object.protocolMinor >>> 0;
            if (object.protocolPatch != null)
                if ($Number(object.protocolPatch) !== 0)
                    message.protocolPatch = object.protocolPatch >>> 0;
            return message;
        };

        /**
         * Creates a plain object from a ServerHello message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.ServerHello
         * @static
         * @param {fh.ServerHello} message ServerHello
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ServerHello.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.sessionId = "";
                if (options.bytes === $String)
                    object.accountId = "";
                else {
                    object.accountId = [];
                    if (options.bytes !== $Array)
                        object.accountId = $util.newBuffer(object.accountId);
                }
                object.deviceNumber = 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.serverTimestamp = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.serverTimestamp = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                object.protocolMajor = 0;
                object.protocolMinor = 0;
                object.protocolPatch = 0;
            }
            if (message.sessionId != null && $Object.hasOwnProperty.call(message, "sessionId"))
                object.sessionId = message.sessionId;
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId"))
                object.accountId = options.bytes === $String ? $util.base64.encode(message.accountId, 0, message.accountId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.accountId) : message.accountId;
            if (message.deviceNumber != null && $Object.hasOwnProperty.call(message, "deviceNumber"))
                object.deviceNumber = message.deviceNumber;
            if (message.serverTimestamp != null && $Object.hasOwnProperty.call(message, "serverTimestamp"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.serverTimestamp = typeof message.serverTimestamp === "number" ? $BigInt(message.serverTimestamp) : $util.Long.fromBits(message.serverTimestamp.low >>> 0, message.serverTimestamp.high >>> 0, true).toBigInt();
                else if (typeof message.serverTimestamp === "number")
                    object.serverTimestamp = options.longs === $String ? $String(message.serverTimestamp) : message.serverTimestamp;
                else
                    object.serverTimestamp = options.longs === $String ? $util.Long.prototype.toString.call(message.serverTimestamp) : options.longs === $Number ? new $util.LongBits(message.serverTimestamp.low >>> 0, message.serverTimestamp.high >>> 0).toNumber(true) : message.serverTimestamp;
            if (message.protocolMajor != null && $Object.hasOwnProperty.call(message, "protocolMajor"))
                object.protocolMajor = message.protocolMajor;
            if (message.protocolMinor != null && $Object.hasOwnProperty.call(message, "protocolMinor"))
                object.protocolMinor = message.protocolMinor;
            if (message.protocolPatch != null && $Object.hasOwnProperty.call(message, "protocolPatch"))
                object.protocolPatch = message.protocolPatch;
            return object;
        };

        /**
         * Converts this ServerHello to JSON.
         * @function toJSON
         * @memberof fh.ServerHello
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ServerHello.prototype.toJSON = function() {
            return ServerHello.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ServerHello
         * @function getTypeUrl
         * @memberof fh.ServerHello
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ServerHello.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.ServerHello";
        };

        return ServerHello;
    })();

    fh.EnvelopeDelivery = (function() {

        /**
         * Properties of an EnvelopeDelivery.
         * @typedef {Object} fh.EnvelopeDelivery.$Properties
         * @property {Array.<fh.Envelope.$Properties>|null} [envelopes] EnvelopeDelivery envelopes
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an EnvelopeDelivery.
         * @memberof fh
         * @interface IEnvelopeDelivery
         * @augments fh.EnvelopeDelivery.$Properties
         * @deprecated Use fh.EnvelopeDelivery.$Properties instead.
         */

        /**
         * Shape of an EnvelopeDelivery.
         * @typedef {fh.EnvelopeDelivery.$Properties} fh.EnvelopeDelivery.$Shape
         */

        /**
         * Constructs a new EnvelopeDelivery.
         * @memberof fh
         * @classdesc Represents an EnvelopeDelivery.
         * @constructor
         * @param {fh.EnvelopeDelivery.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const EnvelopeDelivery = function (properties) {
            this.envelopes = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * EnvelopeDelivery envelopes.
         * @member {Array.<fh.Envelope.$Properties>} envelopes
         * @memberof fh.EnvelopeDelivery
         * @instance
         */
        EnvelopeDelivery.prototype.envelopes = $util.emptyArray;

        /**
         * Creates a new EnvelopeDelivery instance using the specified properties.
         * @function create
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {fh.EnvelopeDelivery.$Properties=} [properties] Properties to set
         * @returns {fh.EnvelopeDelivery} EnvelopeDelivery instance
         * @type {{
         *   (properties: fh.EnvelopeDelivery.$Shape): fh.EnvelopeDelivery & fh.EnvelopeDelivery.$Shape;
         *   (properties?: fh.EnvelopeDelivery.$Properties): fh.EnvelopeDelivery;
         * }}
         */
        EnvelopeDelivery.create = function(properties) {
            return new EnvelopeDelivery(properties);
        };

        /**
         * Encodes the specified EnvelopeDelivery message. Does not implicitly {@link fh.EnvelopeDelivery.verify|verify} messages.
         * @function encode
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {fh.EnvelopeDelivery.$Properties} message EnvelopeDelivery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EnvelopeDelivery.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.envelopes != null && message.envelopes.length)
                for (let i = 0; i < message.envelopes.length; ++i)
                    $root.fh.Envelope.encode(message.envelopes[i], writer.uint32(/* id 1, wireType 2 =*/10).fork(), _depth + 1).ldelim();
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified EnvelopeDelivery message, length delimited. Does not implicitly {@link fh.EnvelopeDelivery.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {fh.EnvelopeDelivery.$Properties} message EnvelopeDelivery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        EnvelopeDelivery.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes an EnvelopeDelivery message from the specified reader or buffer.
         * @function decode
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.EnvelopeDelivery & fh.EnvelopeDelivery.$Shape} EnvelopeDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EnvelopeDelivery.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.EnvelopeDelivery();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if (!(message.envelopes && message.envelopes.length))
                            message.envelopes = [];
                        message.envelopes.push($root.fh.Envelope.decode(reader, reader.uint32(), $undefined, _depth + 1));
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an EnvelopeDelivery message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.EnvelopeDelivery & fh.EnvelopeDelivery.$Shape} EnvelopeDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        EnvelopeDelivery.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an EnvelopeDelivery message.
         * @function verify
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        EnvelopeDelivery.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.envelopes != null && $Object.hasOwnProperty.call(message, "envelopes")) {
                if (!$Array.isArray(message.envelopes))
                    return "envelopes: array expected";
                for (let i = 0; i < message.envelopes.length; ++i) {
                    let error = $root.fh.Envelope.verify(message.envelopes[i], _depth + 1);
                    if (error)
                        return "envelopes." + error;
                }
            }
            return null;
        };

        /**
         * Creates an EnvelopeDelivery message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.EnvelopeDelivery} EnvelopeDelivery
         */
        EnvelopeDelivery.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.EnvelopeDelivery)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.EnvelopeDelivery: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.EnvelopeDelivery();
            if (object.envelopes) {
                if (!$Array.isArray(object.envelopes))
                    throw $TypeError(".fh.EnvelopeDelivery.envelopes: array expected");
                message.envelopes = $Array(object.envelopes.length);
                for (let i = 0; i < object.envelopes.length; ++i) {
                    if (!$util.isObject(object.envelopes[i]))
                        throw $TypeError(".fh.EnvelopeDelivery.envelopes: object expected");
                    message.envelopes[i] = $root.fh.Envelope.fromObject(object.envelopes[i], _depth + 1);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from an EnvelopeDelivery message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {fh.EnvelopeDelivery} message EnvelopeDelivery
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        EnvelopeDelivery.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.envelopes = [];
            if (message.envelopes && message.envelopes.length) {
                object.envelopes = $Array(message.envelopes.length);
                for (let j = 0; j < message.envelopes.length; ++j)
                    object.envelopes[j] = $root.fh.Envelope.toObject(message.envelopes[j], options, _depth + 1);
            }
            return object;
        };

        /**
         * Converts this EnvelopeDelivery to JSON.
         * @function toJSON
         * @memberof fh.EnvelopeDelivery
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        EnvelopeDelivery.prototype.toJSON = function() {
            return EnvelopeDelivery.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for EnvelopeDelivery
         * @function getTypeUrl
         * @memberof fh.EnvelopeDelivery
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        EnvelopeDelivery.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.EnvelopeDelivery";
        };

        return EnvelopeDelivery;
    })();

    fh.Pong = (function() {

        /**
         * Properties of a Pong.
         * @typedef {Object} fh.Pong.$Properties
         * @property {number|Long|null} [clientTimestamp] Pong clientTimestamp
         * @property {number|Long|null} [serverTimestamp] Pong serverTimestamp
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a Pong.
         * @memberof fh
         * @interface IPong
         * @augments fh.Pong.$Properties
         * @deprecated Use fh.Pong.$Properties instead.
         */

        /**
         * Shape of a Pong.
         * @typedef {fh.Pong.$Properties} fh.Pong.$Shape
         */

        /**
         * Constructs a new Pong.
         * @memberof fh
         * @classdesc Represents a Pong.
         * @constructor
         * @param {fh.Pong.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const Pong = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * Pong clientTimestamp.
         * @member {number|Long} clientTimestamp
         * @memberof fh.Pong
         * @instance
         */
        Pong.prototype.clientTimestamp = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Pong serverTimestamp.
         * @member {number|Long} serverTimestamp
         * @memberof fh.Pong
         * @instance
         */
        Pong.prototype.serverTimestamp = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

        /**
         * Creates a new Pong instance using the specified properties.
         * @function create
         * @memberof fh.Pong
         * @static
         * @param {fh.Pong.$Properties=} [properties] Properties to set
         * @returns {fh.Pong} Pong instance
         * @type {{
         *   (properties: fh.Pong.$Shape): fh.Pong & fh.Pong.$Shape;
         *   (properties?: fh.Pong.$Properties): fh.Pong;
         * }}
         */
        Pong.create = function(properties) {
            return new Pong(properties);
        };

        /**
         * Encodes the specified Pong message. Does not implicitly {@link fh.Pong.verify|verify} messages.
         * @function encode
         * @memberof fh.Pong
         * @static
         * @param {fh.Pong.$Properties} message Pong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Pong.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp") && (typeof message.clientTimestamp === "object" ? message.clientTimestamp.low || message.clientTimestamp.high : message.clientTimestamp !== 0))
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.clientTimestamp);
            if (message.serverTimestamp != null && $Object.hasOwnProperty.call(message, "serverTimestamp") && (typeof message.serverTimestamp === "object" ? message.serverTimestamp.low || message.serverTimestamp.high : message.serverTimestamp !== 0))
                writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.serverTimestamp);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified Pong message, length delimited. Does not implicitly {@link fh.Pong.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.Pong
         * @static
         * @param {fh.Pong.$Properties} message Pong message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Pong.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a Pong message from the specified reader or buffer.
         * @function decode
         * @memberof fh.Pong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.Pong & fh.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Pong.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.Pong();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.uint64()) === "object" ? value.low || value.high : value !== 0)
                            message.clientTimestamp = value;
                        else
                            delete message.clientTimestamp;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.uint64()) === "object" ? value.low || value.high : value !== 0)
                            message.serverTimestamp = value;
                        else
                            delete message.serverTimestamp;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a Pong message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.Pong
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.Pong & fh.Pong.$Shape} Pong
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Pong.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Pong message.
         * @function verify
         * @memberof fh.Pong
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Pong.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp"))
                if (!$util.isInteger(message.clientTimestamp) && !(message.clientTimestamp && $util.isInteger(message.clientTimestamp.low) && $util.isInteger(message.clientTimestamp.high)))
                    return "clientTimestamp: integer|Long expected";
            if (message.serverTimestamp != null && $Object.hasOwnProperty.call(message, "serverTimestamp"))
                if (!$util.isInteger(message.serverTimestamp) && !(message.serverTimestamp && $util.isInteger(message.serverTimestamp.low) && $util.isInteger(message.serverTimestamp.high)))
                    return "serverTimestamp: integer|Long expected";
            return null;
        };

        /**
         * Creates a Pong message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.Pong
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.Pong} Pong
         */
        Pong.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.Pong)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.Pong: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.Pong();
            if (object.clientTimestamp != null)
                if (typeof object.clientTimestamp === "object" ? object.clientTimestamp.low || object.clientTimestamp.high : $Number(object.clientTimestamp) !== 0)
                    if ($util.Long)
                        message.clientTimestamp = $util.Long.fromValue(object.clientTimestamp, true);
                    else if (typeof object.clientTimestamp === "string")
                        message.clientTimestamp = $parseInt(object.clientTimestamp, 10);
                    else if (typeof object.clientTimestamp === "number")
                        message.clientTimestamp = object.clientTimestamp;
                    else if (typeof object.clientTimestamp === "object")
                        message.clientTimestamp = new $util.LongBits(object.clientTimestamp.low >>> 0, object.clientTimestamp.high >>> 0).toNumber(true);
            if (object.serverTimestamp != null)
                if (typeof object.serverTimestamp === "object" ? object.serverTimestamp.low || object.serverTimestamp.high : $Number(object.serverTimestamp) !== 0)
                    if ($util.Long)
                        message.serverTimestamp = $util.Long.fromValue(object.serverTimestamp, true);
                    else if (typeof object.serverTimestamp === "string")
                        message.serverTimestamp = $parseInt(object.serverTimestamp, 10);
                    else if (typeof object.serverTimestamp === "number")
                        message.serverTimestamp = object.serverTimestamp;
                    else if (typeof object.serverTimestamp === "object")
                        message.serverTimestamp = new $util.LongBits(object.serverTimestamp.low >>> 0, object.serverTimestamp.high >>> 0).toNumber(true);
            return message;
        };

        /**
         * Creates a plain object from a Pong message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.Pong
         * @static
         * @param {fh.Pong} message Pong
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Pong.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.clientTimestamp = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.clientTimestamp = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
                if ($util.Long) {
                    let long = new $util.Long(0, 0, true);
                    object.serverTimestamp = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.serverTimestamp = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
            }
            if (message.clientTimestamp != null && $Object.hasOwnProperty.call(message, "clientTimestamp"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.clientTimestamp = typeof message.clientTimestamp === "number" ? $BigInt(message.clientTimestamp) : $util.Long.fromBits(message.clientTimestamp.low >>> 0, message.clientTimestamp.high >>> 0, true).toBigInt();
                else if (typeof message.clientTimestamp === "number")
                    object.clientTimestamp = options.longs === $String ? $String(message.clientTimestamp) : message.clientTimestamp;
                else
                    object.clientTimestamp = options.longs === $String ? $util.Long.prototype.toString.call(message.clientTimestamp) : options.longs === $Number ? new $util.LongBits(message.clientTimestamp.low >>> 0, message.clientTimestamp.high >>> 0).toNumber(true) : message.clientTimestamp;
            if (message.serverTimestamp != null && $Object.hasOwnProperty.call(message, "serverTimestamp"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.serverTimestamp = typeof message.serverTimestamp === "number" ? $BigInt(message.serverTimestamp) : $util.Long.fromBits(message.serverTimestamp.low >>> 0, message.serverTimestamp.high >>> 0, true).toBigInt();
                else if (typeof message.serverTimestamp === "number")
                    object.serverTimestamp = options.longs === $String ? $String(message.serverTimestamp) : message.serverTimestamp;
                else
                    object.serverTimestamp = options.longs === $String ? $util.Long.prototype.toString.call(message.serverTimestamp) : options.longs === $Number ? new $util.LongBits(message.serverTimestamp.low >>> 0, message.serverTimestamp.high >>> 0).toNumber(true) : message.serverTimestamp;
            return object;
        };

        /**
         * Converts this Pong to JSON.
         * @function toJSON
         * @memberof fh.Pong
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Pong.prototype.toJSON = function() {
            return Pong.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for Pong
         * @function getTypeUrl
         * @memberof fh.Pong
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        Pong.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.Pong";
        };

        return Pong;
    })();

    fh.ErrorFrame = (function() {

        /**
         * Properties of an ErrorFrame.
         * @typedef {Object} fh.ErrorFrame.$Properties
         * @property {string|null} [code] ErrorFrame code
         * @property {string|null} [message] ErrorFrame message
         * @property {boolean|null} [fatal] ErrorFrame fatal
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of an ErrorFrame.
         * @memberof fh
         * @interface IErrorFrame
         * @augments fh.ErrorFrame.$Properties
         * @deprecated Use fh.ErrorFrame.$Properties instead.
         */

        /**
         * Shape of an ErrorFrame.
         * @typedef {fh.ErrorFrame.$Properties} fh.ErrorFrame.$Shape
         */

        /**
         * Constructs a new ErrorFrame.
         * @memberof fh
         * @classdesc Represents an ErrorFrame.
         * @constructor
         * @param {fh.ErrorFrame.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ErrorFrame = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ErrorFrame code.
         * @member {string} code
         * @memberof fh.ErrorFrame
         * @instance
         */
        ErrorFrame.prototype.code = "";

        /**
         * ErrorFrame message.
         * @member {string} message
         * @memberof fh.ErrorFrame
         * @instance
         */
        ErrorFrame.prototype.message = "";

        /**
         * ErrorFrame fatal.
         * @member {boolean} fatal
         * @memberof fh.ErrorFrame
         * @instance
         */
        ErrorFrame.prototype.fatal = false;

        /**
         * Creates a new ErrorFrame instance using the specified properties.
         * @function create
         * @memberof fh.ErrorFrame
         * @static
         * @param {fh.ErrorFrame.$Properties=} [properties] Properties to set
         * @returns {fh.ErrorFrame} ErrorFrame instance
         * @type {{
         *   (properties: fh.ErrorFrame.$Shape): fh.ErrorFrame & fh.ErrorFrame.$Shape;
         *   (properties?: fh.ErrorFrame.$Properties): fh.ErrorFrame;
         * }}
         */
        ErrorFrame.create = function(properties) {
            return new ErrorFrame(properties);
        };

        /**
         * Encodes the specified ErrorFrame message. Does not implicitly {@link fh.ErrorFrame.verify|verify} messages.
         * @function encode
         * @memberof fh.ErrorFrame
         * @static
         * @param {fh.ErrorFrame.$Properties} message ErrorFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorFrame.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.code != null && $Object.hasOwnProperty.call(message, "code") && message.code !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.code);
            if (message.message != null && $Object.hasOwnProperty.call(message, "message") && message.message !== "")
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.message);
            if (message.fatal != null && $Object.hasOwnProperty.call(message, "fatal") && message.fatal !== false)
                writer.uint32(/* id 3, wireType 0 =*/24).bool(message.fatal);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ErrorFrame message, length delimited. Does not implicitly {@link fh.ErrorFrame.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.ErrorFrame
         * @static
         * @param {fh.ErrorFrame.$Properties} message ErrorFrame message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ErrorFrame.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes an ErrorFrame message from the specified reader or buffer.
         * @function decode
         * @memberof fh.ErrorFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.ErrorFrame & fh.ErrorFrame.$Shape} ErrorFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorFrame.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.ErrorFrame();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.code = value;
                        else
                            delete message.code;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.message = value;
                        else
                            delete message.message;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.fatal = value;
                        else
                            delete message.fatal;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes an ErrorFrame message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.ErrorFrame
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.ErrorFrame & fh.ErrorFrame.$Shape} ErrorFrame
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ErrorFrame.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an ErrorFrame message.
         * @function verify
         * @memberof fh.ErrorFrame
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ErrorFrame.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            if (message.code != null && $Object.hasOwnProperty.call(message, "code"))
                if (!$util.isString(message.code))
                    return "code: string expected";
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                if (!$util.isString(message.message))
                    return "message: string expected";
            if (message.fatal != null && $Object.hasOwnProperty.call(message, "fatal"))
                if (typeof message.fatal !== "boolean")
                    return "fatal: boolean expected";
            return null;
        };

        /**
         * Creates an ErrorFrame message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.ErrorFrame
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.ErrorFrame} ErrorFrame
         */
        ErrorFrame.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.ErrorFrame)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.ErrorFrame: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.ErrorFrame();
            if (object.code != null)
                if (typeof object.code !== "string" || object.code.length)
                    message.code = $String(object.code);
            if (object.message != null)
                if (typeof object.message !== "string" || object.message.length)
                    message.message = $String(object.message);
            if (object.fatal != null)
                if (object.fatal)
                    message.fatal = $Boolean(object.fatal);
            return message;
        };

        /**
         * Creates a plain object from an ErrorFrame message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.ErrorFrame
         * @static
         * @param {fh.ErrorFrame} message ErrorFrame
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ErrorFrame.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.code = "";
                object.message = "";
                object.fatal = false;
            }
            if (message.code != null && $Object.hasOwnProperty.call(message, "code"))
                object.code = message.code;
            if (message.message != null && $Object.hasOwnProperty.call(message, "message"))
                object.message = message.message;
            if (message.fatal != null && $Object.hasOwnProperty.call(message, "fatal"))
                object.fatal = message.fatal;
            return object;
        };

        /**
         * Converts this ErrorFrame to JSON.
         * @function toJSON
         * @memberof fh.ErrorFrame
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ErrorFrame.prototype.toJSON = function() {
            return ErrorFrame.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ErrorFrame
         * @function getTypeUrl
         * @memberof fh.ErrorFrame
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ErrorFrame.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.ErrorFrame";
        };

        return ErrorFrame;
    })();

    fh.PresenceUpdate = (function() {

        /**
         * Properties of a PresenceUpdate.
         * @typedef {Object} fh.PresenceUpdate.$Properties
         * @property {Uint8Array|null} [accountId] PresenceUpdate accountId
         * @property {boolean|null} [isOnline] PresenceUpdate isOnline
         * @property {number|Long|null} [lastSeen] PresenceUpdate lastSeen
         * @property {string|null} [customStatusText] PresenceUpdate customStatusText
         * @property {string|null} [customStatusEmoji] PresenceUpdate customStatusEmoji
         * @property {number|Long|null} [customStatusExpiresAt] PresenceUpdate customStatusExpiresAt
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a PresenceUpdate.
         * @memberof fh
         * @interface IPresenceUpdate
         * @augments fh.PresenceUpdate.$Properties
         * @deprecated Use fh.PresenceUpdate.$Properties instead.
         */

        /**
         * Shape of a PresenceUpdate.
         * @typedef {fh.PresenceUpdate.$Properties} fh.PresenceUpdate.$Shape
         */

        /**
         * Constructs a new PresenceUpdate.
         * @memberof fh
         * @classdesc Represents a PresenceUpdate.
         * @constructor
         * @param {fh.PresenceUpdate.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const PresenceUpdate = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * PresenceUpdate accountId.
         * @member {Uint8Array} accountId
         * @memberof fh.PresenceUpdate
         * @instance
         */
        PresenceUpdate.prototype.accountId = $util.newBuffer([]);

        /**
         * PresenceUpdate isOnline.
         * @member {boolean} isOnline
         * @memberof fh.PresenceUpdate
         * @instance
         */
        PresenceUpdate.prototype.isOnline = false;

        /**
         * PresenceUpdate lastSeen.
         * @member {number|Long|null|undefined} lastSeen
         * @memberof fh.PresenceUpdate
         * @instance
         */
        PresenceUpdate.prototype.lastSeen = null;

        /**
         * PresenceUpdate customStatusText.
         * @member {string|null|undefined} customStatusText
         * @memberof fh.PresenceUpdate
         * @instance
         */
        PresenceUpdate.prototype.customStatusText = null;

        /**
         * PresenceUpdate customStatusEmoji.
         * @member {string|null|undefined} customStatusEmoji
         * @memberof fh.PresenceUpdate
         * @instance
         */
        PresenceUpdate.prototype.customStatusEmoji = null;

        /**
         * PresenceUpdate customStatusExpiresAt.
         * @member {number|Long|null|undefined} customStatusExpiresAt
         * @memberof fh.PresenceUpdate
         * @instance
         */
        PresenceUpdate.prototype.customStatusExpiresAt = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(PresenceUpdate.prototype, "_lastSeen", {
            get: $util.oneOfGetter($oneOfFields = ["lastSeen"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(PresenceUpdate.prototype, "_customStatusText", {
            get: $util.oneOfGetter($oneOfFields = ["customStatusText"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(PresenceUpdate.prototype, "_customStatusEmoji", {
            get: $util.oneOfGetter($oneOfFields = ["customStatusEmoji"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(PresenceUpdate.prototype, "_customStatusExpiresAt", {
            get: $util.oneOfGetter($oneOfFields = ["customStatusExpiresAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new PresenceUpdate instance using the specified properties.
         * @function create
         * @memberof fh.PresenceUpdate
         * @static
         * @param {fh.PresenceUpdate.$Properties=} [properties] Properties to set
         * @returns {fh.PresenceUpdate} PresenceUpdate instance
         * @type {{
         *   (properties: fh.PresenceUpdate.$Shape): fh.PresenceUpdate & fh.PresenceUpdate.$Shape;
         *   (properties?: fh.PresenceUpdate.$Properties): fh.PresenceUpdate;
         * }}
         */
        PresenceUpdate.create = function(properties) {
            return new PresenceUpdate(properties);
        };

        /**
         * Encodes the specified PresenceUpdate message. Does not implicitly {@link fh.PresenceUpdate.verify|verify} messages.
         * @function encode
         * @memberof fh.PresenceUpdate
         * @static
         * @param {fh.PresenceUpdate.$Properties} message PresenceUpdate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PresenceUpdate.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId") && message.accountId.length)
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.accountId);
            if (message.isOnline != null && $Object.hasOwnProperty.call(message, "isOnline") && message.isOnline !== false)
                writer.uint32(/* id 2, wireType 0 =*/16).bool(message.isOnline);
            if (message.lastSeen != null && $Object.hasOwnProperty.call(message, "lastSeen"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.lastSeen);
            if (message.customStatusText != null && $Object.hasOwnProperty.call(message, "customStatusText"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.customStatusText);
            if (message.customStatusEmoji != null && $Object.hasOwnProperty.call(message, "customStatusEmoji"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.customStatusEmoji);
            if (message.customStatusExpiresAt != null && $Object.hasOwnProperty.call(message, "customStatusExpiresAt"))
                writer.uint32(/* id 6, wireType 0 =*/48).int64(message.customStatusExpiresAt);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified PresenceUpdate message, length delimited. Does not implicitly {@link fh.PresenceUpdate.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.PresenceUpdate
         * @static
         * @param {fh.PresenceUpdate.$Properties} message PresenceUpdate message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PresenceUpdate.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a PresenceUpdate message from the specified reader or buffer.
         * @function decode
         * @memberof fh.PresenceUpdate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.PresenceUpdate & fh.PresenceUpdate.$Shape} PresenceUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PresenceUpdate.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.PresenceUpdate();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.accountId = value;
                        else
                            delete message.accountId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 0)
                            break;
                        if (value = reader.bool())
                            message.isOnline = value;
                        else
                            delete message.isOnline;
                        continue;
                    }
                case 3: {
                        if (wireType !== 0)
                            break;
                        message.lastSeen = reader.int64();
                        message._lastSeen = "lastSeen";
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        message.customStatusText = reader.stringVerify();
                        message._customStatusText = "customStatusText";
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.customStatusEmoji = reader.stringVerify();
                        message._customStatusEmoji = "customStatusEmoji";
                        continue;
                    }
                case 6: {
                        if (wireType !== 0)
                            break;
                        message.customStatusExpiresAt = reader.int64();
                        message._customStatusExpiresAt = "customStatusExpiresAt";
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a PresenceUpdate message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.PresenceUpdate
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.PresenceUpdate & fh.PresenceUpdate.$Shape} PresenceUpdate
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PresenceUpdate.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PresenceUpdate message.
         * @function verify
         * @memberof fh.PresenceUpdate
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PresenceUpdate.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId"))
                if (!(message.accountId && typeof message.accountId.length === "number" || $util.isString(message.accountId)))
                    return "accountId: buffer expected";
            if (message.isOnline != null && $Object.hasOwnProperty.call(message, "isOnline"))
                if (typeof message.isOnline !== "boolean")
                    return "isOnline: boolean expected";
            if (message.lastSeen != null && $Object.hasOwnProperty.call(message, "lastSeen")) {
                properties._lastSeen = 1;
                if (!$util.isInteger(message.lastSeen) && !(message.lastSeen && $util.isInteger(message.lastSeen.low) && $util.isInteger(message.lastSeen.high)))
                    return "lastSeen: integer|Long expected";
            }
            if (message.customStatusText != null && $Object.hasOwnProperty.call(message, "customStatusText")) {
                properties._customStatusText = 1;
                if (!$util.isString(message.customStatusText))
                    return "customStatusText: string expected";
            }
            if (message.customStatusEmoji != null && $Object.hasOwnProperty.call(message, "customStatusEmoji")) {
                properties._customStatusEmoji = 1;
                if (!$util.isString(message.customStatusEmoji))
                    return "customStatusEmoji: string expected";
            }
            if (message.customStatusExpiresAt != null && $Object.hasOwnProperty.call(message, "customStatusExpiresAt")) {
                properties._customStatusExpiresAt = 1;
                if (!$util.isInteger(message.customStatusExpiresAt) && !(message.customStatusExpiresAt && $util.isInteger(message.customStatusExpiresAt.low) && $util.isInteger(message.customStatusExpiresAt.high)))
                    return "customStatusExpiresAt: integer|Long expected";
            }
            return null;
        };

        /**
         * Creates a PresenceUpdate message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.PresenceUpdate
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.PresenceUpdate} PresenceUpdate
         */
        PresenceUpdate.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.PresenceUpdate)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.PresenceUpdate: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.PresenceUpdate();
            if (object.accountId != null)
                if (object.accountId.length)
                    if (typeof object.accountId === "string")
                        $util.base64.decode(object.accountId, message.accountId = $util.newBuffer($util.base64.length(object.accountId)), 0);
                    else if (object.accountId.length >= 0)
                        message.accountId = object.accountId;
            if (object.isOnline != null)
                if (object.isOnline)
                    message.isOnline = $Boolean(object.isOnline);
            if (object.lastSeen != null)
                if ($util.Long)
                    message.lastSeen = $util.Long.fromValue(object.lastSeen, false);
                else if (typeof object.lastSeen === "string")
                    message.lastSeen = $parseInt(object.lastSeen, 10);
                else if (typeof object.lastSeen === "number")
                    message.lastSeen = object.lastSeen;
                else if (typeof object.lastSeen === "object")
                    message.lastSeen = new $util.LongBits(object.lastSeen.low >>> 0, object.lastSeen.high >>> 0).toNumber();
            if (object.customStatusText != null)
                message.customStatusText = $String(object.customStatusText);
            if (object.customStatusEmoji != null)
                message.customStatusEmoji = $String(object.customStatusEmoji);
            if (object.customStatusExpiresAt != null)
                if ($util.Long)
                    message.customStatusExpiresAt = $util.Long.fromValue(object.customStatusExpiresAt, false);
                else if (typeof object.customStatusExpiresAt === "string")
                    message.customStatusExpiresAt = $parseInt(object.customStatusExpiresAt, 10);
                else if (typeof object.customStatusExpiresAt === "number")
                    message.customStatusExpiresAt = object.customStatusExpiresAt;
                else if (typeof object.customStatusExpiresAt === "object")
                    message.customStatusExpiresAt = new $util.LongBits(object.customStatusExpiresAt.low >>> 0, object.customStatusExpiresAt.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a PresenceUpdate message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.PresenceUpdate
         * @static
         * @param {fh.PresenceUpdate} message PresenceUpdate
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PresenceUpdate.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                if (options.bytes === $String)
                    object.accountId = "";
                else {
                    object.accountId = [];
                    if (options.bytes !== $Array)
                        object.accountId = $util.newBuffer(object.accountId);
                }
                object.isOnline = false;
            }
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId"))
                object.accountId = options.bytes === $String ? $util.base64.encode(message.accountId, 0, message.accountId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.accountId) : message.accountId;
            if (message.isOnline != null && $Object.hasOwnProperty.call(message, "isOnline"))
                object.isOnline = message.isOnline;
            if (message.lastSeen != null && $Object.hasOwnProperty.call(message, "lastSeen"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.lastSeen = typeof message.lastSeen === "number" ? $BigInt(message.lastSeen) : $util.Long.fromBits(message.lastSeen.low >>> 0, message.lastSeen.high >>> 0, false).toBigInt();
                else if (typeof message.lastSeen === "number")
                    object.lastSeen = options.longs === $String ? $String(message.lastSeen) : message.lastSeen;
                else
                    object.lastSeen = options.longs === $String ? $util.Long.prototype.toString.call(message.lastSeen) : options.longs === $Number ? new $util.LongBits(message.lastSeen.low >>> 0, message.lastSeen.high >>> 0).toNumber() : message.lastSeen;
            if (message.customStatusText != null && $Object.hasOwnProperty.call(message, "customStatusText"))
                object.customStatusText = message.customStatusText;
            if (message.customStatusEmoji != null && $Object.hasOwnProperty.call(message, "customStatusEmoji"))
                object.customStatusEmoji = message.customStatusEmoji;
            if (message.customStatusExpiresAt != null && $Object.hasOwnProperty.call(message, "customStatusExpiresAt"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.customStatusExpiresAt = typeof message.customStatusExpiresAt === "number" ? $BigInt(message.customStatusExpiresAt) : $util.Long.fromBits(message.customStatusExpiresAt.low >>> 0, message.customStatusExpiresAt.high >>> 0, false).toBigInt();
                else if (typeof message.customStatusExpiresAt === "number")
                    object.customStatusExpiresAt = options.longs === $String ? $String(message.customStatusExpiresAt) : message.customStatusExpiresAt;
                else
                    object.customStatusExpiresAt = options.longs === $String ? $util.Long.prototype.toString.call(message.customStatusExpiresAt) : options.longs === $Number ? new $util.LongBits(message.customStatusExpiresAt.low >>> 0, message.customStatusExpiresAt.high >>> 0).toNumber() : message.customStatusExpiresAt;
            return object;
        };

        /**
         * Converts this PresenceUpdate to JSON.
         * @function toJSON
         * @memberof fh.PresenceUpdate
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PresenceUpdate.prototype.toJSON = function() {
            return PresenceUpdate.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for PresenceUpdate
         * @function getTypeUrl
         * @memberof fh.PresenceUpdate
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        PresenceUpdate.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.PresenceUpdate";
        };

        return PresenceUpdate;
    })();

    fh.BotMessageDelivery = (function() {

        /**
         * Properties of a BotMessageDelivery.
         * @typedef {Object} fh.BotMessageDelivery.$Properties
         * @property {string|null} [messageId] BotMessageDelivery messageId
         * @property {Uint8Array|null} [botId] BotMessageDelivery botId
         * @property {Uint8Array|null} [accountId] BotMessageDelivery accountId
         * @property {string|null} [text] BotMessageDelivery text
         * @property {string|null} [replyToMessageId] BotMessageDelivery replyToMessageId
         * @property {number|Long|null} [createdAt] BotMessageDelivery createdAt
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a BotMessageDelivery.
         * @memberof fh
         * @interface IBotMessageDelivery
         * @augments fh.BotMessageDelivery.$Properties
         * @deprecated Use fh.BotMessageDelivery.$Properties instead.
         */

        /**
         * Shape of a BotMessageDelivery.
         * @typedef {fh.BotMessageDelivery.$Properties} fh.BotMessageDelivery.$Shape
         */

        /**
         * Constructs a new BotMessageDelivery.
         * @memberof fh
         * @classdesc Represents a BotMessageDelivery.
         * @constructor
         * @param {fh.BotMessageDelivery.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const BotMessageDelivery = function (properties) {
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * BotMessageDelivery messageId.
         * @member {string} messageId
         * @memberof fh.BotMessageDelivery
         * @instance
         */
        BotMessageDelivery.prototype.messageId = "";

        /**
         * BotMessageDelivery botId.
         * @member {Uint8Array} botId
         * @memberof fh.BotMessageDelivery
         * @instance
         */
        BotMessageDelivery.prototype.botId = $util.newBuffer([]);

        /**
         * BotMessageDelivery accountId.
         * @member {Uint8Array} accountId
         * @memberof fh.BotMessageDelivery
         * @instance
         */
        BotMessageDelivery.prototype.accountId = $util.newBuffer([]);

        /**
         * BotMessageDelivery text.
         * @member {string} text
         * @memberof fh.BotMessageDelivery
         * @instance
         */
        BotMessageDelivery.prototype.text = "";

        /**
         * BotMessageDelivery replyToMessageId.
         * @member {string|null|undefined} replyToMessageId
         * @memberof fh.BotMessageDelivery
         * @instance
         */
        BotMessageDelivery.prototype.replyToMessageId = null;

        /**
         * BotMessageDelivery createdAt.
         * @member {number|Long} createdAt
         * @memberof fh.BotMessageDelivery
         * @instance
         */
        BotMessageDelivery.prototype.createdAt = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(BotMessageDelivery.prototype, "_replyToMessageId", {
            get: $util.oneOfGetter($oneOfFields = ["replyToMessageId"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new BotMessageDelivery instance using the specified properties.
         * @function create
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {fh.BotMessageDelivery.$Properties=} [properties] Properties to set
         * @returns {fh.BotMessageDelivery} BotMessageDelivery instance
         * @type {{
         *   (properties: fh.BotMessageDelivery.$Shape): fh.BotMessageDelivery & fh.BotMessageDelivery.$Shape;
         *   (properties?: fh.BotMessageDelivery.$Properties): fh.BotMessageDelivery;
         * }}
         */
        BotMessageDelivery.create = function(properties) {
            return new BotMessageDelivery(properties);
        };

        /**
         * Encodes the specified BotMessageDelivery message. Does not implicitly {@link fh.BotMessageDelivery.verify|verify} messages.
         * @function encode
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {fh.BotMessageDelivery.$Properties} message BotMessageDelivery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BotMessageDelivery.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId") && message.messageId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.messageId);
            if (message.botId != null && $Object.hasOwnProperty.call(message, "botId") && message.botId.length)
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.botId);
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId") && message.accountId.length)
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.accountId);
            if (message.text != null && $Object.hasOwnProperty.call(message, "text") && message.text !== "")
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.text);
            if (message.replyToMessageId != null && $Object.hasOwnProperty.call(message, "replyToMessageId"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.replyToMessageId);
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt") && (typeof message.createdAt === "object" ? message.createdAt.low || message.createdAt.high : message.createdAt !== 0))
                writer.uint32(/* id 6, wireType 0 =*/48).int64(message.createdAt);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified BotMessageDelivery message, length delimited. Does not implicitly {@link fh.BotMessageDelivery.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {fh.BotMessageDelivery.$Properties} message BotMessageDelivery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BotMessageDelivery.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a BotMessageDelivery message from the specified reader or buffer.
         * @function decode
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.BotMessageDelivery & fh.BotMessageDelivery.$Shape} BotMessageDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BotMessageDelivery.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.BotMessageDelivery();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.messageId = value;
                        else
                            delete message.messageId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.botId = value;
                        else
                            delete message.botId;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.accountId = value;
                        else
                            delete message.accountId;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.text = value;
                        else
                            delete message.text;
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        message.replyToMessageId = reader.stringVerify();
                        message._replyToMessageId = "replyToMessageId";
                        continue;
                    }
                case 6: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.createdAt = value;
                        else
                            delete message.createdAt;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a BotMessageDelivery message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.BotMessageDelivery & fh.BotMessageDelivery.$Shape} BotMessageDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BotMessageDelivery.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BotMessageDelivery message.
         * @function verify
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BotMessageDelivery.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId"))
                if (!$util.isString(message.messageId))
                    return "messageId: string expected";
            if (message.botId != null && $Object.hasOwnProperty.call(message, "botId"))
                if (!(message.botId && typeof message.botId.length === "number" || $util.isString(message.botId)))
                    return "botId: buffer expected";
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId"))
                if (!(message.accountId && typeof message.accountId.length === "number" || $util.isString(message.accountId)))
                    return "accountId: buffer expected";
            if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                if (!$util.isString(message.text))
                    return "text: string expected";
            if (message.replyToMessageId != null && $Object.hasOwnProperty.call(message, "replyToMessageId")) {
                properties._replyToMessageId = 1;
                if (!$util.isString(message.replyToMessageId))
                    return "replyToMessageId: string expected";
            }
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt"))
                if (!$util.isInteger(message.createdAt) && !(message.createdAt && $util.isInteger(message.createdAt.low) && $util.isInteger(message.createdAt.high)))
                    return "createdAt: integer|Long expected";
            return null;
        };

        /**
         * Creates a BotMessageDelivery message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.BotMessageDelivery} BotMessageDelivery
         */
        BotMessageDelivery.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.BotMessageDelivery)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.BotMessageDelivery: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.BotMessageDelivery();
            if (object.messageId != null)
                if (typeof object.messageId !== "string" || object.messageId.length)
                    message.messageId = $String(object.messageId);
            if (object.botId != null)
                if (object.botId.length)
                    if (typeof object.botId === "string")
                        $util.base64.decode(object.botId, message.botId = $util.newBuffer($util.base64.length(object.botId)), 0);
                    else if (object.botId.length >= 0)
                        message.botId = object.botId;
            if (object.accountId != null)
                if (object.accountId.length)
                    if (typeof object.accountId === "string")
                        $util.base64.decode(object.accountId, message.accountId = $util.newBuffer($util.base64.length(object.accountId)), 0);
                    else if (object.accountId.length >= 0)
                        message.accountId = object.accountId;
            if (object.text != null)
                if (typeof object.text !== "string" || object.text.length)
                    message.text = $String(object.text);
            if (object.replyToMessageId != null)
                message.replyToMessageId = $String(object.replyToMessageId);
            if (object.createdAt != null)
                if (typeof object.createdAt === "object" ? object.createdAt.low || object.createdAt.high : $Number(object.createdAt) !== 0)
                    if ($util.Long)
                        message.createdAt = $util.Long.fromValue(object.createdAt, false);
                    else if (typeof object.createdAt === "string")
                        message.createdAt = $parseInt(object.createdAt, 10);
                    else if (typeof object.createdAt === "number")
                        message.createdAt = object.createdAt;
                    else if (typeof object.createdAt === "object")
                        message.createdAt = new $util.LongBits(object.createdAt.low >>> 0, object.createdAt.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a BotMessageDelivery message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {fh.BotMessageDelivery} message BotMessageDelivery
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BotMessageDelivery.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.defaults) {
                object.messageId = "";
                if (options.bytes === $String)
                    object.botId = "";
                else {
                    object.botId = [];
                    if (options.bytes !== $Array)
                        object.botId = $util.newBuffer(object.botId);
                }
                if (options.bytes === $String)
                    object.accountId = "";
                else {
                    object.accountId = [];
                    if (options.bytes !== $Array)
                        object.accountId = $util.newBuffer(object.accountId);
                }
                object.text = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.createdAt = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.createdAt = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
            }
            if (message.messageId != null && $Object.hasOwnProperty.call(message, "messageId"))
                object.messageId = message.messageId;
            if (message.botId != null && $Object.hasOwnProperty.call(message, "botId"))
                object.botId = options.bytes === $String ? $util.base64.encode(message.botId, 0, message.botId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.botId) : message.botId;
            if (message.accountId != null && $Object.hasOwnProperty.call(message, "accountId"))
                object.accountId = options.bytes === $String ? $util.base64.encode(message.accountId, 0, message.accountId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.accountId) : message.accountId;
            if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                object.text = message.text;
            if (message.replyToMessageId != null && $Object.hasOwnProperty.call(message, "replyToMessageId"))
                object.replyToMessageId = message.replyToMessageId;
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.createdAt = typeof message.createdAt === "number" ? $BigInt(message.createdAt) : $util.Long.fromBits(message.createdAt.low >>> 0, message.createdAt.high >>> 0, false).toBigInt();
                else if (typeof message.createdAt === "number")
                    object.createdAt = options.longs === $String ? $String(message.createdAt) : message.createdAt;
                else
                    object.createdAt = options.longs === $String ? $util.Long.prototype.toString.call(message.createdAt) : options.longs === $Number ? new $util.LongBits(message.createdAt.low >>> 0, message.createdAt.high >>> 0).toNumber() : message.createdAt;
            return object;
        };

        /**
         * Converts this BotMessageDelivery to JSON.
         * @function toJSON
         * @memberof fh.BotMessageDelivery
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BotMessageDelivery.prototype.toJSON = function() {
            return BotMessageDelivery.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for BotMessageDelivery
         * @function getTypeUrl
         * @memberof fh.BotMessageDelivery
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        BotMessageDelivery.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.BotMessageDelivery";
        };

        return BotMessageDelivery;
    })();

    fh.ChannelPostDelivery = (function() {

        /**
         * Properties of a ChannelPostDelivery.
         * @typedef {Object} fh.ChannelPostDelivery.$Properties
         * @property {string|null} [postId] ChannelPostDelivery postId
         * @property {Uint8Array|null} [channelId] ChannelPostDelivery channelId
         * @property {string|null} [authorType] ChannelPostDelivery authorType
         * @property {Uint8Array|null} [authorId] ChannelPostDelivery authorId
         * @property {string|null} [text] ChannelPostDelivery text
         * @property {Array.<string>|null} [attachmentIds] ChannelPostDelivery attachmentIds
         * @property {string|null} [replyToPostId] ChannelPostDelivery replyToPostId
         * @property {number|Long|null} [createdAt] ChannelPostDelivery createdAt
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */

        /**
         * Properties of a ChannelPostDelivery.
         * @memberof fh
         * @interface IChannelPostDelivery
         * @augments fh.ChannelPostDelivery.$Properties
         * @deprecated Use fh.ChannelPostDelivery.$Properties instead.
         */

        /**
         * Shape of a ChannelPostDelivery.
         * @typedef {fh.ChannelPostDelivery.$Properties} fh.ChannelPostDelivery.$Shape
         */

        /**
         * Constructs a new ChannelPostDelivery.
         * @memberof fh
         * @classdesc Represents a ChannelPostDelivery.
         * @constructor
         * @param {fh.ChannelPostDelivery.$Properties=} [properties] Properties to set
         * @property {Array.<Uint8Array>} [$unknowns] Unknown fields preserved while decoding when enabled
         */
        const ChannelPostDelivery = function (properties) {
            this.attachmentIds = [];
            if (properties)
                for (let keys = $Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null && keys[i] !== "__proto__")
                        this[keys[i]] = properties[keys[i]];
        };

        /**
         * ChannelPostDelivery postId.
         * @member {string} postId
         * @memberof fh.ChannelPostDelivery
         * @instance
         */
        ChannelPostDelivery.prototype.postId = "";

        /**
         * ChannelPostDelivery channelId.
         * @member {Uint8Array} channelId
         * @memberof fh.ChannelPostDelivery
         * @instance
         */
        ChannelPostDelivery.prototype.channelId = $util.newBuffer([]);

        /**
         * ChannelPostDelivery authorType.
         * @member {string} authorType
         * @memberof fh.ChannelPostDelivery
         * @instance
         */
        ChannelPostDelivery.prototype.authorType = "";

        /**
         * ChannelPostDelivery authorId.
         * @member {Uint8Array} authorId
         * @memberof fh.ChannelPostDelivery
         * @instance
         */
        ChannelPostDelivery.prototype.authorId = $util.newBuffer([]);

        /**
         * ChannelPostDelivery text.
         * @member {string} text
         * @memberof fh.ChannelPostDelivery
         * @instance
         */
        ChannelPostDelivery.prototype.text = "";

        /**
         * ChannelPostDelivery attachmentIds.
         * @member {Array.<string>} attachmentIds
         * @memberof fh.ChannelPostDelivery
         * @instance
         */
        ChannelPostDelivery.prototype.attachmentIds = $util.emptyArray;

        /**
         * ChannelPostDelivery replyToPostId.
         * @member {string|null|undefined} replyToPostId
         * @memberof fh.ChannelPostDelivery
         * @instance
         */
        ChannelPostDelivery.prototype.replyToPostId = null;

        /**
         * ChannelPostDelivery createdAt.
         * @member {number|Long} createdAt
         * @memberof fh.ChannelPostDelivery
         * @instance
         */
        ChannelPostDelivery.prototype.createdAt = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        $Object.defineProperty(ChannelPostDelivery.prototype, "_replyToPostId", {
            get: $util.oneOfGetter($oneOfFields = ["replyToPostId"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new ChannelPostDelivery instance using the specified properties.
         * @function create
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {fh.ChannelPostDelivery.$Properties=} [properties] Properties to set
         * @returns {fh.ChannelPostDelivery} ChannelPostDelivery instance
         * @type {{
         *   (properties: fh.ChannelPostDelivery.$Shape): fh.ChannelPostDelivery & fh.ChannelPostDelivery.$Shape;
         *   (properties?: fh.ChannelPostDelivery.$Properties): fh.ChannelPostDelivery;
         * }}
         */
        ChannelPostDelivery.create = function(properties) {
            return new ChannelPostDelivery(properties);
        };

        /**
         * Encodes the specified ChannelPostDelivery message. Does not implicitly {@link fh.ChannelPostDelivery.verify|verify} messages.
         * @function encode
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {fh.ChannelPostDelivery.$Properties} message ChannelPostDelivery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChannelPostDelivery.encode = function (message, writer, _depth) {
            if (!writer)
                writer = $Writer.create();
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            if (message.postId != null && $Object.hasOwnProperty.call(message, "postId") && message.postId !== "")
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.postId);
            if (message.channelId != null && $Object.hasOwnProperty.call(message, "channelId") && message.channelId.length)
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.channelId);
            if (message.authorType != null && $Object.hasOwnProperty.call(message, "authorType") && message.authorType !== "")
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.authorType);
            if (message.authorId != null && $Object.hasOwnProperty.call(message, "authorId") && message.authorId.length)
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.authorId);
            if (message.text != null && $Object.hasOwnProperty.call(message, "text") && message.text !== "")
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.text);
            if (message.attachmentIds != null && message.attachmentIds.length)
                for (let i = 0; i < message.attachmentIds.length; ++i)
                    writer.uint32(/* id 6, wireType 2 =*/50).string(message.attachmentIds[i]);
            if (message.replyToPostId != null && $Object.hasOwnProperty.call(message, "replyToPostId"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.replyToPostId);
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt") && (typeof message.createdAt === "object" ? message.createdAt.low || message.createdAt.high : message.createdAt !== 0))
                writer.uint32(/* id 8, wireType 0 =*/64).int64(message.createdAt);
            if (message.$unknowns != null && $Object.hasOwnProperty.call(message, "$unknowns"))
                for (let i = 0; i < message.$unknowns.length; ++i)
                    writer.raw(message.$unknowns[i]);
            return writer;
        };

        /**
         * Encodes the specified ChannelPostDelivery message, length delimited. Does not implicitly {@link fh.ChannelPostDelivery.verify|verify} messages.
         * @function encodeDelimited
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {fh.ChannelPostDelivery.$Properties} message ChannelPostDelivery message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChannelPostDelivery.encodeDelimited = function(message, writer) {
            return this.encode(message, (writer || $Writer.create()).fork()).ldelim();
        };

        /**
         * Decodes a ChannelPostDelivery message from the specified reader or buffer.
         * @function decode
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {fh.ChannelPostDelivery & fh.ChannelPostDelivery.$Shape} ChannelPostDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChannelPostDelivery.decode = function (reader, length, _end, _depth, _target) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $Reader.recursionLimit)
                throw $Error("max depth exceeded");
            let end, message, value;
            if (length === $undefined)
                end = reader.len;
            else {
                end = reader.pos + length;
                if (end > reader.len)
                    throw $RangeError("index out of range");
                length = reader.len;
                reader.len = end;
            }
            message = _target || new $root.fh.ChannelPostDelivery();
            while (reader.pos < end) {
                let start = reader.pos;
                let tag = reader.tag();
                if (tag === _end) {
                    _end = $undefined;
                    break;
                }
                let wireType = tag & 7;
                switch (tag >>>= 3) {
                case 1: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.postId = value;
                        else
                            delete message.postId;
                        continue;
                    }
                case 2: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.channelId = value;
                        else
                            delete message.channelId;
                        continue;
                    }
                case 3: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.authorType = value;
                        else
                            delete message.authorType;
                        continue;
                    }
                case 4: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.bytes()).length)
                            message.authorId = value;
                        else
                            delete message.authorId;
                        continue;
                    }
                case 5: {
                        if (wireType !== 2)
                            break;
                        if ((value = reader.stringVerify()).length)
                            message.text = value;
                        else
                            delete message.text;
                        continue;
                    }
                case 6: {
                        if (wireType !== 2)
                            break;
                        if (!(message.attachmentIds && message.attachmentIds.length))
                            message.attachmentIds = [];
                        message.attachmentIds.push(reader.stringVerify());
                        continue;
                    }
                case 7: {
                        if (wireType !== 2)
                            break;
                        message.replyToPostId = reader.stringVerify();
                        message._replyToPostId = "replyToPostId";
                        continue;
                    }
                case 8: {
                        if (wireType !== 0)
                            break;
                        if (typeof (value = reader.int64()) === "object" ? value.low || value.high : value !== 0)
                            message.createdAt = value;
                        else
                            delete message.createdAt;
                        continue;
                    }
                }
                reader.skipType(wireType, _depth, tag);
                if (!reader.discardUnknown) {
                    $util.makeProp(message, "$unknowns", false);
                    (message.$unknowns || (message.$unknowns = [])).push(reader.raw(start, reader.pos));
                }
            }
            if (length !== $undefined) {
                if (reader.pos !== end)
                    throw $RangeError("index out of range");
                reader.len = length;
            }
            if (_end !== $undefined)
                throw $Error("missing end group");
            return message;
        };

        /**
         * Decodes a ChannelPostDelivery message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {fh.ChannelPostDelivery & fh.ChannelPostDelivery.$Shape} ChannelPostDelivery
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChannelPostDelivery.decodeDelimited = function(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ChannelPostDelivery message.
         * @function verify
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ChannelPostDelivery.verify = function (message, _depth) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                return "max depth exceeded";
            let properties = {};
            if (message.postId != null && $Object.hasOwnProperty.call(message, "postId"))
                if (!$util.isString(message.postId))
                    return "postId: string expected";
            if (message.channelId != null && $Object.hasOwnProperty.call(message, "channelId"))
                if (!(message.channelId && typeof message.channelId.length === "number" || $util.isString(message.channelId)))
                    return "channelId: buffer expected";
            if (message.authorType != null && $Object.hasOwnProperty.call(message, "authorType"))
                if (!$util.isString(message.authorType))
                    return "authorType: string expected";
            if (message.authorId != null && $Object.hasOwnProperty.call(message, "authorId"))
                if (!(message.authorId && typeof message.authorId.length === "number" || $util.isString(message.authorId)))
                    return "authorId: buffer expected";
            if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                if (!$util.isString(message.text))
                    return "text: string expected";
            if (message.attachmentIds != null && $Object.hasOwnProperty.call(message, "attachmentIds")) {
                if (!$Array.isArray(message.attachmentIds))
                    return "attachmentIds: array expected";
                for (let i = 0; i < message.attachmentIds.length; ++i)
                    if (!$util.isString(message.attachmentIds[i]))
                        return "attachmentIds: string[] expected";
            }
            if (message.replyToPostId != null && $Object.hasOwnProperty.call(message, "replyToPostId")) {
                properties._replyToPostId = 1;
                if (!$util.isString(message.replyToPostId))
                    return "replyToPostId: string expected";
            }
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt"))
                if (!$util.isInteger(message.createdAt) && !(message.createdAt && $util.isInteger(message.createdAt.low) && $util.isInteger(message.createdAt.high)))
                    return "createdAt: integer|Long expected";
            return null;
        };

        /**
         * Creates a ChannelPostDelivery message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {fh.ChannelPostDelivery} ChannelPostDelivery
         */
        ChannelPostDelivery.fromObject = function (object, _depth) {
            if (object instanceof $root.fh.ChannelPostDelivery)
                return object;
            if (!$util.isObject(object))
                throw $TypeError(".fh.ChannelPostDelivery: object expected");
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let message = new $root.fh.ChannelPostDelivery();
            if (object.postId != null)
                if (typeof object.postId !== "string" || object.postId.length)
                    message.postId = $String(object.postId);
            if (object.channelId != null)
                if (object.channelId.length)
                    if (typeof object.channelId === "string")
                        $util.base64.decode(object.channelId, message.channelId = $util.newBuffer($util.base64.length(object.channelId)), 0);
                    else if (object.channelId.length >= 0)
                        message.channelId = object.channelId;
            if (object.authorType != null)
                if (typeof object.authorType !== "string" || object.authorType.length)
                    message.authorType = $String(object.authorType);
            if (object.authorId != null)
                if (object.authorId.length)
                    if (typeof object.authorId === "string")
                        $util.base64.decode(object.authorId, message.authorId = $util.newBuffer($util.base64.length(object.authorId)), 0);
                    else if (object.authorId.length >= 0)
                        message.authorId = object.authorId;
            if (object.text != null)
                if (typeof object.text !== "string" || object.text.length)
                    message.text = $String(object.text);
            if (object.attachmentIds) {
                if (!$Array.isArray(object.attachmentIds))
                    throw $TypeError(".fh.ChannelPostDelivery.attachmentIds: array expected");
                message.attachmentIds = $Array(object.attachmentIds.length);
                for (let i = 0; i < object.attachmentIds.length; ++i)
                    message.attachmentIds[i] = $String(object.attachmentIds[i]);
            }
            if (object.replyToPostId != null)
                message.replyToPostId = $String(object.replyToPostId);
            if (object.createdAt != null)
                if (typeof object.createdAt === "object" ? object.createdAt.low || object.createdAt.high : $Number(object.createdAt) !== 0)
                    if ($util.Long)
                        message.createdAt = $util.Long.fromValue(object.createdAt, false);
                    else if (typeof object.createdAt === "string")
                        message.createdAt = $parseInt(object.createdAt, 10);
                    else if (typeof object.createdAt === "number")
                        message.createdAt = object.createdAt;
                    else if (typeof object.createdAt === "object")
                        message.createdAt = new $util.LongBits(object.createdAt.low >>> 0, object.createdAt.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a ChannelPostDelivery message. Also converts values to other types if specified.
         * @function toObject
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {fh.ChannelPostDelivery} message ChannelPostDelivery
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ChannelPostDelivery.toObject = function (message, options, _depth) {
            if (!options)
                options = {};
            if (_depth === $undefined)
                _depth = 0;
            if (_depth > $util.recursionLimit)
                throw $Error("max depth exceeded");
            let object = {};
            if (options.arrays || options.defaults)
                object.attachmentIds = [];
            if (options.defaults) {
                object.postId = "";
                if (options.bytes === $String)
                    object.channelId = "";
                else {
                    object.channelId = [];
                    if (options.bytes !== $Array)
                        object.channelId = $util.newBuffer(object.channelId);
                }
                object.authorType = "";
                if (options.bytes === $String)
                    object.authorId = "";
                else {
                    object.authorId = [];
                    if (options.bytes !== $Array)
                        object.authorId = $util.newBuffer(object.authorId);
                }
                object.text = "";
                if ($util.Long) {
                    let long = new $util.Long(0, 0, false);
                    object.createdAt = options.longs === $String ? long.toString() : options.longs === $Number ? long.toNumber() : typeof $BigInt !== "undefined" && options.longs === $BigInt ? long.toBigInt() : long;
                } else
                    object.createdAt = options.longs === $String ? "0" : typeof $BigInt !== "undefined" && options.longs === $BigInt ? $BigInt("0") : 0;
            }
            if (message.postId != null && $Object.hasOwnProperty.call(message, "postId"))
                object.postId = message.postId;
            if (message.channelId != null && $Object.hasOwnProperty.call(message, "channelId"))
                object.channelId = options.bytes === $String ? $util.base64.encode(message.channelId, 0, message.channelId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.channelId) : message.channelId;
            if (message.authorType != null && $Object.hasOwnProperty.call(message, "authorType"))
                object.authorType = message.authorType;
            if (message.authorId != null && $Object.hasOwnProperty.call(message, "authorId"))
                object.authorId = options.bytes === $String ? $util.base64.encode(message.authorId, 0, message.authorId.length) : options.bytes === $Array ? $Array.prototype.slice.call(message.authorId) : message.authorId;
            if (message.text != null && $Object.hasOwnProperty.call(message, "text"))
                object.text = message.text;
            if (message.attachmentIds && message.attachmentIds.length) {
                object.attachmentIds = $Array(message.attachmentIds.length);
                for (let j = 0; j < message.attachmentIds.length; ++j)
                    object.attachmentIds[j] = message.attachmentIds[j];
            }
            if (message.replyToPostId != null && $Object.hasOwnProperty.call(message, "replyToPostId"))
                object.replyToPostId = message.replyToPostId;
            if (message.createdAt != null && $Object.hasOwnProperty.call(message, "createdAt"))
                if (typeof $BigInt !== "undefined" && options.longs === $BigInt)
                    object.createdAt = typeof message.createdAt === "number" ? $BigInt(message.createdAt) : $util.Long.fromBits(message.createdAt.low >>> 0, message.createdAt.high >>> 0, false).toBigInt();
                else if (typeof message.createdAt === "number")
                    object.createdAt = options.longs === $String ? $String(message.createdAt) : message.createdAt;
                else
                    object.createdAt = options.longs === $String ? $util.Long.prototype.toString.call(message.createdAt) : options.longs === $Number ? new $util.LongBits(message.createdAt.low >>> 0, message.createdAt.high >>> 0).toNumber() : message.createdAt;
            return object;
        };

        /**
         * Converts this ChannelPostDelivery to JSON.
         * @function toJSON
         * @memberof fh.ChannelPostDelivery
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ChannelPostDelivery.prototype.toJSON = function() {
            return ChannelPostDelivery.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the type url for ChannelPostDelivery
         * @function getTypeUrl
         * @memberof fh.ChannelPostDelivery
         * @static
         * @param {string} [prefix] Custom type url prefix, defaults to `"type.googleapis.com"`
         * @returns {string} The type url
         */
        ChannelPostDelivery.getTypeUrl = function(prefix) {
            if (prefix === $undefined)
                prefix = "type.googleapis.com";
            return prefix + "/fh.ChannelPostDelivery";
        };

        return ChannelPostDelivery;
    })();

    return fh;
})();

export {
  $root as default
};
