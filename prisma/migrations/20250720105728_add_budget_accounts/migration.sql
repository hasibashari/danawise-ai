-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('BANK', 'EWALLET', 'CASH', 'INVESTMENT', 'CREDIT_CARD');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "budgetAccountId" TEXT;

-- CreateTable
CREATE TABLE "BudgetAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "color" TEXT,
    "icon" TEXT,
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BudgetAccount_userId_name_key" ON "BudgetAccount"("userId", "name");

-- CreateIndex
CREATE INDEX "Transaction_userId_budgetAccountId_idx" ON "Transaction"("userId", "budgetAccountId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_budgetAccountId_fkey" FOREIGN KEY ("budgetAccountId") REFERENCES "BudgetAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAccount" ADD CONSTRAINT "BudgetAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
