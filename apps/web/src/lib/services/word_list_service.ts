import prisma from "@rosp/db";
import { CreateWordListInput, UpdateWordListInput } from "@rosp/shared";

export async function getUserWordLists(userId: string) {
  return prisma.wordList.findMany({
    where: { userId },
    include: {
      _count: {
        select: { items: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getWordListById(listId: string, userId: string) {
  return prisma.wordList.findFirst({
    where: { id: listId, userId },
    include: {
      items: {
        include: {
          vocabularyWord: true,
        },
      },
    },
  });
}

export async function createWordList(userId: string, data: CreateWordListInput) {
  return prisma.wordList.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
    },
  });
}

export async function updateWordList(
  listId: string,
  userId: string,
  data: UpdateWordListInput
) {
  return prisma.wordList.update({
    where: { id: listId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
}
