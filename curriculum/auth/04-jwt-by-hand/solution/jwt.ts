import { createHmac, timingSafeEqual } from "node:crypto";

export type JwtClaims = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  [claim: string]: unknown;
};

const ALGORITHM = "HS256";
const HMAC_HASH = "sha256";
const HEADER = { alg: ALGORITHM, typ: "JWT" };
const SEGMENT_SEPARATOR = ".";
const SEGMENT_COUNT = 3;
const ENCODING = "base64url";
const MIN_SECRET_BYTES = 32;
const MS_PER_SECOND = 1000;

function reject(reason: string): never {
  throw new Error(`Invalid token: ${reason}`);
}

const encodeSegment = (value: unknown) => Buffer.from(JSON.stringify(value)).toString(ENCODING);

const decodeSegment = (segment: string): unknown => JSON.parse(Buffer.from(segment, ENCODING).toString("utf8"));

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

const requireStrongSecret = (secret: string) => {
  if (Buffer.byteLength(secret) < MIN_SECRET_BYTES) reject(`secret must be at least ${MIN_SECRET_BYTES} bytes`);
};

const signatureOf = ({ signingInput, secret }: { signingInput: string; secret: string }) =>
  createHmac(HMAC_HASH, secret).update(signingInput).digest(ENCODING);

const isSameText = ({ first, second }: { first: string; second: string }) => {
  const firstBytes = Buffer.from(first);
  const secondBytes = Buffer.from(second);
  return firstBytes.length === secondBytes.length && timingSafeEqual(firstBytes, secondBytes);
};

export function signJwt({ claims, secret }: { claims: JwtClaims; secret: string }) {
  requireStrongSecret(secret);
  const signingInput = [encodeSegment(HEADER), encodeSegment(claims)].join(SEGMENT_SEPARATOR);
  return [signingInput, signatureOf({ signingInput, secret })].join(SEGMENT_SEPARATOR);
}

export function verifyJwt({
  token,
  secret,
  issuer,
  audience,
  now
}: {
  token: string;
  secret: string;
  issuer: string;
  audience: string;
  now: () => number;
}): JwtClaims {
  requireStrongSecret(secret);
  const segments = token.split(SEGMENT_SEPARATOR);
  if (segments.length !== SEGMENT_COUNT) reject("expected three segments");
  const [headerSegment, payloadSegment, signatureSegment] = segments;
  const header = decodeSegment(headerSegment);
  if (!isObject(header) || header.alg !== ALGORITHM) reject("algorithm is not HS256");
  const signingInput = [headerSegment, payloadSegment].join(SEGMENT_SEPARATOR);
  if (!isSameText({ first: signatureOf({ signingInput, secret }), second: signatureSegment })) reject("bad signature");
  const claims = decodeSegment(payloadSegment);
  if (!isObject(claims)) reject("payload is not an object");
  const nowSeconds = now() / MS_PER_SECOND;
  if (typeof claims.exp !== "number" || nowSeconds >= claims.exp) reject("expired or missing exp");
  if (typeof claims.nbf === "number" && nowSeconds < claims.nbf) reject("not valid yet");
  if (claims.iss !== issuer) reject("wrong issuer");
  if (![claims.aud].flat().includes(audience)) reject("wrong audience");
  return claims;
}
