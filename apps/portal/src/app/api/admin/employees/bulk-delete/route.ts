import { NextResponse } from 'next/server';

export async function DELETE() {
  return NextResponse.json(
    { error: 'Hard delete is disabled. Archive employee accounts instead.' },
    { status: 405 }
  );
}
