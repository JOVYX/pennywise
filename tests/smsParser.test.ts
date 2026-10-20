import { describe, it, expect } from 'vitest';
import { parseIndianSms } from '../src/utils/smsParser';

describe('Indian Bank & UPI SMS Parser', () => {
  it('parses standard HDFC Bank debit SMS with UPI to Swiggy', () => {
    const sms = 'Rs. 280.00 debited from A/C **1234 on 20-Oct-26 by UPI to SWIGGY. Ref 123456789. Avail Bal INR 4,200.00';
    const parsed = parseIndianSms(sms);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('expense');
    expect(parsed?.amountPaise).toBe(28000);
    expect(parsed?.merchant).toBe('Swiggy');
    expect(parsed?.paymentMethod).toBe('upi');
    expect(parsed?.categoryId).toBe('food-mess');
    expect(parsed?.accountHint).toBe('A/c ending 1234');
  });

  it('parses SBI SMS with compact date and transfer to Tapri Chai', () => {
    const sms = 'Dear SBI User, your A/c ending with 4567 debited by Rs 40.00 on 20Oct26 transfer to Tapri Chai UPI Ref 34912048';
    const parsed = parseIndianSms(sms);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('expense');
    expect(parsed?.amountPaise).toBe(4000);
    expect(parsed?.merchant).toBe('Tapri Chai');
    expect(parsed?.paymentMethod).toBe('upi');
    expect(parsed?.categoryId).toBe('food-mess');
  });

  it('parses Blinkit grocery purchase via ICICI Credit Card', () => {
    const sms = 'INR 542.50 spent on your ICICI Bank Credit Card ending 9012 on 19-10-2026 at BLINKIT GURGAON. Avail Limit: INR 45,000.';
    const parsed = parseIndianSms(sms);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('expense');
    expect(parsed?.amountPaise).toBe(54250);
    expect(parsed?.merchant).toContain('Blinkit');
    expect(parsed?.paymentMethod).toBe('card');
    expect(parsed?.categoryId).toBe('food-groceries');
  });

  it('parses PhonePe / GPay INR transfer with symbol', () => {
    const sms = 'Paid ₹120 to Uber India via Google Pay. UPI transaction ID: 9876543210.';
    const parsed = parseIndianSms(sms);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('expense');
    expect(parsed?.amountPaise).toBe(12000);
    expect(parsed?.merchant).toBe('Uber India');
    expect(parsed?.paymentMethod).toBe('upi');
    expect(parsed?.categoryId).toBe('transport-metro');
  });

  it('parses income credit SMS from parent / allowance', () => {
    const sms = 'Credited INR 5,000.00 to your A/C ...8899 on 20-10-2026 by UPI from PAPA POCKET MONEY. Ref 998877';
    const parsed = parseIndianSms(sms);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('income');
    expect(parsed?.amountPaise).toBe(500000); // ₹5,000 = 500000 paise
    expect(parsed?.categoryId).toBe('income-allowance');
  });

  it('parses stipend credit correctly', () => {
    const sms = 'A/c 3210 credited with Rs 15000.00 on 01-10-2026 by NEFT- TECH INTERNSHIP STIPEND OCT';
    const parsed = parseIndianSms(sms);

    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('income');
    expect(parsed?.amountPaise).toBe(1500000);
    expect(parsed?.categoryId).toBe('income-stipend');
  });

  it('returns null gracefully for non-transactional text', () => {
    expect(parseIndianSms('')).toBeNull();
    expect(parseIndianSms('Your OTP for Aadhaar verification is 543219. Do not share.')).toBeNull();
    expect(parseIndianSms('Get flat 50% discount on Myntra sale today!')).toBeNull();
  });
});
