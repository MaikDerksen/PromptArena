
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'download.png';

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  try {
    // Fetch the image from the Firebase URL on the server-side.
    // Server-to-server requests do not have CORS restrictions.
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    // Get the image data as a blob
    const blob = await imageResponse.blob();

    // Return the image data with appropriate headers to trigger a download in the browser.
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': blob.type,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Download proxy error:', error);
    return NextResponse.json({ error: `Failed to download image: ${error.message}` }, { status: 500 });
  }
}
