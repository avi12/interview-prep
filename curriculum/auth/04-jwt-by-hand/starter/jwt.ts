export type JwtClaims = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  [claim: string]: unknown;
};

export const ALGORITHM = "HS256";
export const HMAC_HASH = "sha256";
export const HEADER = {
  alg: ALGORITHM,
  typ: "JWT"
};
export const SEGMENT_SEPARATOR = ".";
export const ENCODING = "base64url";
export const MIN_SECRET_BYTES = 32;
export const MS_PER_SECOND = 1000;

export function signJwt(_input: {
  claims: JwtClaims;
  secret: string;
}) {
  return "";
}

export function verifyJwt(_input: {
  token: string;
  secret: string;
  issuer: string;
  audience: string;
  now: () => number;
}): JwtClaims {
  return {};
}
