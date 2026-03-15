import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercice } from './exercice.entity';
import { Account } from './account.entity';
import { JournalEntry } from './journal-entry.entity';
import { JournalEntryLine } from './journal-entry-line.entity';
import { OtherRevenue } from './other-revenue.entity';
import { Expense } from './expense.entity';
import { FeeService } from '../economat/fee-service.entity';
import { PaymentTransaction } from '../economat/payment-transaction.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exercice,
      Account,
      JournalEntry,
      JournalEntryLine,
      OtherRevenue,
      Expense,
      FeeService,
      PaymentTransaction,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
