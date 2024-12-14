import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  const { amount, cups, machineId } = await request.json();

  if (!amount || !cups || !machineId) {
    return NextResponse.json({ error: 'Amount, cups, and machineId are required' }, { status: 400 });
  }

  const qrData = JSON.stringify({ amount, cups, machineId });
  
  try {
    const qrCodeDataURL = await QRCode.toDataURL(qrData);
    return NextResponse.json({ qrCode: qrCodeDataURL });
  } catch (error) {
    console.error('Error generating QR code:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}