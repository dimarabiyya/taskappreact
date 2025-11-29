-- AlterTable
ALTER TABLE "Task" ALTER COLUMN "createdAt" SET DEFAULT NOW();

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "username" TEXT;
