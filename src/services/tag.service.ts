import { prisma } from "../db";
import { CustomError } from "../errors/custom.error";

export const TagService = {
  /**
   * Fetch all tags.
   */
  async fetchTags() {
    const tags = await prisma.tag.findMany();
    return tags;
  },

  /**
   * Create a new tag.
   */
  async createTag(name: string) {
    const tag = await prisma.tag.create({ data: { name } });
    return tag;
  },

  /**
   * Delete a tag by ID.
   */
  async deleteTag(id: string) {
    await prisma.tag.delete({ where: { id } });
    return { success: true };
  },
};
