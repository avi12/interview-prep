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
const ENCODING = "base64url";
const MIN_SECRET_BYTES = 32;
const MS_PER_SECOND = 1000;

export function signJwt({ claims, secret }: { claims: JwtClaims; secret: string }) {
  return "";
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
  return {};
}
