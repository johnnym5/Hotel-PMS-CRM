import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || 'dummy_key_for_build') as string, {
  apiVersion: '2025-01-27.acacia' as any,
});

export async function POST(req: Request) {
  try {
    const { price, roomNumber, clientName } = await req.json();

    if (!price || !roomNumber) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ngn',
            product_data: {
              name: `Room ${roomNumber} Reservation`,
              description: `Booking for ${clientName || 'Guest'}`,
            },
            unit_amount: price * 100, // Stripe expects amounts in cents/kobo
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/?payment_success=true&room=${roomNumber}`,
      cancel_url: `${baseUrl}/?payment_cancel=true`,
      metadata: {
        roomNumber,
        clientName,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe session creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
