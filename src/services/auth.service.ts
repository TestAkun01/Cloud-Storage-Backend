import bcrypt from "bcrypt";
import zxcvbn from "zxcvbn";
import { prisma } from "../lib/prisma";
import { CustomError } from "../errors/custom.error";
import JwtPlugin from "../plugins/jwt.plugin";

type AccessJwtType = (typeof JwtPlugin)["decorator"]["accessJwt"];
type RefreshJwtType = (typeof JwtPlugin)["decorator"]["refreshJwt"];

export const registerUser = async (email: string, password: string) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new CustomError("Email already exists", "EMAIL_EXISTS", 400);
  }

  if (zxcvbn(password).score < 2) {
    throw new CustomError("Weak password", "WEAK_PASSWORD", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(email, hashedPassword);

  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  return user;
};

export const loginUser = async (
  email: string,
  password: string,
  accessJwt: AccessJwtType,
  refreshJwt: RefreshJwtType
) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new CustomError("Invalid credentials", "INVALID_CREDENTIALS", 401);
  }

  const accessToken = await accessJwt.sign({
    id: user.id,
    email: user.email,
  });

  const refreshToken = await refreshJwt.sign({ id: user.id });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 864e5),
    },
  });

  return { accessToken, refreshToken };
};

export const refreshAccessToken = async (
  refreshToken: string,
  refreshJwt: RefreshJwtType,
  accessJwt: AccessJwtType
) => {
  const decoded = await refreshJwt.verify(refreshToken);
  if (!decoded) {
    throw new CustomError("Invalid refresh token", "TOKEN_INVALID", 401);
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  });

  if (!storedToken) {
    throw new CustomError("Token not found", "TOKEN_NOT_FOUND", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id?.toString() },
  });

  if (!user) {
    throw new CustomError("User not found", "USER_NOT_FOUND", 404);
  }

  const newAccessToken = await accessJwt.sign({
    id: user.id,
    email: user.email,
  });

  const newRefreshToken = await refreshJwt.sign({ id: user.id });

  await prisma.refreshToken.update({
    where: { token: refreshToken },
    data: {
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 864e5),
    },
  });

  return { newAccessToken, newRefreshToken };
};

export const logoutUser = async (refreshToken: string) => {
  const deleted = await prisma.refreshToken.deleteMany({
    where: { token: refreshToken },
  });

  if (deleted.count === 0) {
    throw new CustomError("Invalid refresh token", "TOKEN_NOT_FOUND", 400);
  }
};
