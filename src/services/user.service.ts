import { hash } from "bcrypt";
import { prisma } from "../db";
import { CustomError } from "../errors/custom.error";

export const UserService = {
  /**
   * Fetch user data by ID.
   */
  async fetchUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    if (!user) {
      throw new CustomError("User not found", "USER_NOT_FOUND", 404);
    }

    return user;
  },

  /**
   * Update user data.
   */
  async updateUser(
    userId: string,
    updates: { name?: string; email?: string; password?: string }
  ) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: updates.name || undefined,
        email: updates.email || undefined,
        password: updates.password
          ? await hash(updates.password, 10)
          : undefined,
      },
    });

    return updatedUser;
  },

  /**
   * Delete a user by ID.
   */
  async deleteUser(userId: string) {
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  },
};
