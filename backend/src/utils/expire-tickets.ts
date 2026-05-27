import { prisma } from "../lib/prisma";

export async function expireOverdueTickets(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.ticket.updateMany({
    where: {
      scheduledAt: { lte: cutoff },
      status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
    },
    data: { status: "EXPIRED" },
  });
  return result.count;
}
