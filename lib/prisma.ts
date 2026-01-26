const prisma = new Proxy(
  {},
  {
    get() {
      throw new Error("Prisma client is not configured for this project.")
    },
  }
)

export { prisma }
