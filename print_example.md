# Thermal Printer Receipt Sample

This is how a thermal printer receipt would look when printed by the dairy application:

```
     KANGSABOTI DAIRY
    LALGARA , BANKURA
================================
Customer: Abhijit Ghosh
Date: 15/03/2024 10:30 AM
Session: Morning
--------------------------------
Weight (KG):      5.250(biggher)
FAT:              4.5(bigger)
SNF:              8.5 (Bigger)
Rate:         Rs. 45.25(Bigger)
================================
            TOTAL: Rs. 238(bigger)
================================

        Thank You!

```

## Receipt Format Details:

**Header Section:**
- Centered "KANGSABOTI DAIRY" in large bold text
- Centered "LALGARA , BANKURA" subtitle
- Separator line (32 characters wide)

**Customer Information:**
- Customer name (left-aligned)
- Date and time in format: DD/MM/YYYY H:MM AM/PM
- Session: সকাল (Morning) or সন্ধ্যা (Evening)

**Transaction Details:**
- Weight in KG (3 decimal places)
- FAT percentage (1 decimal place)
- SNF percentage (1 decimal place)
- Rate per KG in rupees (2 decimal places)

**Total Section:**
- Large, bold total amount
- Formatted to align properly on 32-character wide paper

**Footer:**
- Centered "Thank You!" message
- Single feed line for spacing (no paper cut)

## Sample Data Used:
- Customer: John Dairy Farmer
- Weight: 15.500 KG
- FAT: 4.2%
- SNF: 8.6%
- Rate: ₹45.80 per KG
- Total: ₹709
- Session: Evening (সন্ধ্যা)

The receipt uses standard ESC/POS thermal printer commands for formatting, alignment, and text sizing. The printer will manually cut the paper after printing.
