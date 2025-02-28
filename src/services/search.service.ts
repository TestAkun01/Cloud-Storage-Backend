import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { CustomError } from "../errors/custom.error";

export const SearchService = {
  /**
   * Search objects by tag.
   */
  async searchByTag(userId: string, tag: string) {
    const objects = await prisma.storageObject.findMany({
      where: {
        userId,
        objectTags: {
          some: {
            tag: {
              name: tag,
            },
          },
        },
      },
      include: {
        objectTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return objects;
  },

  /**
   * Search objects by date range.
   */
  async searchByDate(userId: string, startDate: string, endDate: string) {
    const objects = await prisma.storageObject.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    return objects;
  },

  /**
   * Search objects by keyword (name or description).
   */
  async searchByKeyword(userId: string, keyword: string) {
    const objects = await prisma.storageObject.findMany({
      where: {
        userId,
        OR: [
          { name: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
        ],
      },
    });

    return objects;
  },
};
