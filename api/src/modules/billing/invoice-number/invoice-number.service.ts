import { Injectable } from '@nestjs/common';

@Injectable()
export class InvoiceNumberService {
  generateInvoiceNumber(): string {
    return this.generate('INV');
  }

  generateReceiptNumber(): string {
    return this.generate('REC');
  }

  generateCreditNoteNumber(): string {
    return this.generate('CRN');
  }

  generateDebitNoteNumber(): string {
    return this.generate('DBN');
  }

  generateClaimNumber(): string {
    return this.generate('CLM');
  }

  private generate(prefix: string): string {
    const now = new Date();

    const year = now.getFullYear();

    const month = String(
      now.getMonth() + 1,
    ).padStart(2, '0');

    const day = String(
      now.getDate(),
    ).padStart(2, '0');

    const random = Math.floor(
      100000 + Math.random() * 900000,
    );

    return `${prefix}-${year}${month}${day}-${random}`;
  }
}