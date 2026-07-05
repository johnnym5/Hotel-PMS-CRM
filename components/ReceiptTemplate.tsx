"use client";

import React from "react";

export function getReceiptHTML(guestName: string, roomNumber: string, checkIn: string, checkOut: string, amount: number) {
  const tax = amount * 0.1;
  const fees = 25;
  const total = amount + tax + fees;
  
  return `
    <html>
      <head>
        <title>Receipt - Innsphere</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #4f46e5; font-size: 28px; }
          .header p { color: #666; margin: 5px 0 0 0; }
          .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .details-block { background: #f9fafb; padding: 20px; border-radius: 8px; width: 45%; }
          .details-block h3 { margin-top: 0; font-size: 14px; text-transform: uppercase; color: #6b7280; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .table th { text-align: left; padding: 12px; background: #f3f4f6; color: #374151; font-weight: bold; border-bottom: 2px solid #e5e7eb; }
          .table td { padding: 12px; border-bottom: 1px solid #e5e7eb; color: #4b5563; }
          .table .amount { text-align: right; }
          .totals { width: 50%; margin-left: auto; }
          .total-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total-row.grand-total { font-weight: bold; font-size: 18px; border-bottom: none; border-top: 2px solid #333; margin-top: 10px; padding-top: 20px; color: #111; }
          .footer { text-align: center; margin-top: 60px; color: #9ca3af; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Innsphere Boutique</h1>
          <p>Official Stay Receipt</p>
        </div>
        
        <div class="details">
          <div class="details-block">
            <h3>Guest Information</h3>
            <p><strong>Name:</strong> ${guestName}</p>
          </div>
          <div class="details-block">
            <h3>Reservation Details</h3>
            <p><strong>Room:</strong> ${roomNumber || 'TBD'}</p>
            <p><strong>Check-in:</strong> ${checkIn}</p>
            <p><strong>Check-out:</strong> ${checkOut}</p>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Room Rate (Base)</td>
              <td class="amount">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Taxes (10%)</td>
              <td class="amount">$${tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Resort Fees</td>
              <td class="amount">$${fees.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row grand-total">
            <span>Total Paid</span>
            <span>$${total.toFixed(2)}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for choosing Innsphere Boutique.</p>
          <p>Please retain this receipt for your records.</p>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;
}
